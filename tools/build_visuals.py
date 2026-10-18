"""Build local item and codex icons from this game's executable and WoW assets.

Requires mpyq and Pillow. Usage: python tools/build_visuals.py C:/WoW/Surv
The Classic item index is used only to resolve the tier set's WoW icon names;
the generated site has no runtime dependency on that index or the image host.
"""

import io
import json
import math
import re
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

import mpyq
from PIL import Image
from game_data import build_metadata, locales


ROOT = Path(__file__).resolve().parents[1]
DATA_REVISION = "8339771805564c6de7850ff9428be8e841f69622"
DATA_URL = f"https://raw.githubusercontent.com/nexus-devs/wow-classic-items/{DATA_REVISION}/data/json/data.json"
ICON_URL = "https://wow.zamimg.com/images/wow/icons/large/{}.jpg"
SLOTS = ("Head", "Shoulder", "Chest", "Waist", "Legs", "Feet", "Wrist", "Hands")
SET_NAMES = {
    "1": ("Recruit's", "Valor", "Might", "Wrath", "Dreadnaught"),
    "2": ("Squire's", "Lightforge", "Lawbringer", "Judgement", "Redemption"),
    "3": ("Tracker's", "Beaststalker's", "Giantstalker's", "Dragonstalker's", "Cryptstalker"),
    "4": ("Footpad's", "Shadowcraft", "Nightslayer", "Bloodfang", "Bonescythe"),
    "5": ("Acolyte's", "Devout", "Prophecy", "Transcendence", "Faith"),
    "7": ("Primal", "Elements", "Earthfury", "Ten Storms", "Earthshatter"),
    "8": ("Apprentice's", "Magister's", "Arcanist", "Netherwind", "Frostfire"),
    "9": ("Novice's", "Dreadmist", "Felheart", "Nemesis", "Plagueheart"),
    "11": ("Thicket", "Wildheart", "Cenarion", "Stormrage", "Dreamwalker"),
}
WEAPONS = {
    "1": ("Worn Claymore", "Bastard Sword of Valor", "Blackhand Doomsaw", "Ravager's Greatblade", "Sulfuras, Hand of Ragnaros"),
    "2": ("Wooden Maul", "Hammer of the Squire", "Hammer of the Lightforge", "Lightforged Hammer", "Ashbringer"),
    "3": ("Short Bow", "Hunting Bow of the Wilds", "Bow of the Dragonflight", "Ahn'Qiraj Rifle", "Rhok'delar, Longbow of the Ancient Keepers"),
    "4": ("Assassin's Blade", "Shadowcraft Dirk", "Blackwing Shiv", "Thunderfury, Blessed Blade of the Windseeker", "Kingsfall"),
    "5": ("Acolyte's Staff", "Staff of the Devout", "Staff of Prophecy", "Benediction", "Anathema"),
    "7": ("Spiked Club", "Mace of the Elements", "Earthfury Hammer", "Blackwing Mace", "Doomhammer"),
    "8": ("Apprentice's Staff", "Magister's Staff", "Arcanist's Staff", "Staff of Dominance", "Atiesh, Greatstaff of the Guardian"),
    "9": ("Novice's Staff", "Dreadmist Staff", "Felheart Staff", "Staff of the Shadow Flame", "Staff of the Shadow Flame"),
    "11": ("Gnarled Staff", "Wildheart Staff", "Cenarion Staff", "Staff of the Moon", "Staff of the Moon"),
}
OFFHANDS = {
    "4": ("Rusty Shiv", "Thief's Blade", "Nightslayer Kris", "Fang of the Faceless", "Kingsfall"),
    "7": ("Round Buckler", "Crested Shield", "Totem Shield", "Aegis of the Ten Storms", "Shield of the Earthshatter"),
}
WEAPON_OVERRIDES = {"Ashbringer": "inv_sword_48"}
ABILITY_ICON_OVERRIDES = {
    "auto_shot": "inv_weapon_bow_01", "blast_wave": "spell_holy_excorcism_02",
    "bloodthirst": "spell_nature_bloodlust", "faerie_fire": "spell_nature_faeriefire",
    "flame_shock": "spell_fire_flameshock", "flamestrike": "spell_fire_selfdestruct",
    "gouge": "ability_gouge", "holy_fire": "spell_holy_searinglight",
    "holy_light": "spell_holy_holybolt", "immolate": "spell_fire_immolation",
    "judgement": "spell_holy_righteousfury", "lightwell": "spell_holy_summonlightwell",
    "magma_totem": "spell_fire_sealoffire", "moonfire": "spell_nature_starfall",
    "redemption": "spell_holy_resurrection", "soul_fire": "spell_fire_fireball02",
}
ICON_START = re.compile(rb"(?:INV|Spell|Ability|Racial)_[A-Za-z0-9_]+")


def read_index():
    cache = Path(tempfile.gettempdir()) / f"wow-classic-items-{DATA_REVISION}.json"
    if not cache.exists():
        urllib.request.urlretrieve(DATA_URL, cache)
    return json.loads(cache.read_text(encoding="utf-8"))


def item_icon(rows, name, slot=None):
    if slot is None and name in WEAPON_OVERRIDES:
        return WEAPON_OVERRIDES[name]
    if slot is None:
        exact = next((row for row in rows if row["name"].casefold() == name.casefold()), None)
        return exact["icon"] if exact else None
    suffix = f" of {name}".casefold()
    prefix = f"{name} ".casefold()
    matches = [row for row in rows if row.get("slot") == slot and row.get("class") == "Armor"
               and row["itemId"] <= 25000 and
               (row["name"].casefold().startswith(prefix) or row["name"].casefold().endswith(suffix))]
    matches.sort(key=lambda row: (not row["name"].casefold().startswith(prefix), row["itemId"]))
    return matches[0]["icon"] if matches else None


def gear_icons(rows):
    result = {}
    for class_id, sets in SET_NAMES.items():
        class_sets = []
        for set_index, set_name in enumerate(sets):
            source_set = sets[1] if set_index == 0 else set_name
            icons = [item_icon(rows, source_set, slot) for slot in SLOTS]
            icons.append(item_icon(rows, WEAPONS[class_id][set_index]) or
                         item_icon(rows, WEAPONS[class_id][1]))
            if class_id in OFFHANDS:
                icons.append(item_icon(rows, OFFHANDS[class_id][set_index]) or
                             item_icon(rows, OFFHANDS[class_id][1]))
            class_sets.append(icons)
        for icons in class_sets:
            for slot, name in enumerate(icons):
                if name is None:
                    icons[slot] = next((other[slot] for other in class_sets if other[slot]), None)
        # PvP exists in this game version, but the save does not identify its
        # faction-specific appearance. Reuse the class's epic slot icons.
        class_sets.append(class_sets[3].copy())
        result[class_id] = class_sets
    return result


def binary_codex_icons(exe, catalog):
    result = {}
    ordinary = [key for key in catalog["codex"] if not key.startswith("legendary:")]
    jewelry = exe[exe.index(b"accuriaBand of Accuria"):exe.index(b"fire_lordChoker of the Fire Lord") + 180]
    positions = sorted((jewelry.find(key.encode()), key) for key in ordinary)
    for index, (start, key) in enumerate(positions):
        if start < 0:
            continue
        end = positions[index + 1][0] if index + 1 < len(positions) else len(jewelry)
        match = ICON_START.search(jewelry[start:end])
        if match:
            raw = match.group().decode()
            numbered = re.match(r"^.+?_\d+(?:Naxxramas)?", raw)
            result[key] = numbered.group() if numbered else raw

    english = exe.index(b'"ability.shred.name": "Shred"')
    names = {match.group(1).decode(): match.group(2).decode()
             for match in re.finditer(rb'"ability\.([a-z0-9_]+)\.name": "([^"\\]+)"',
                                      exe[english - 12000:english + 8000])}
    spells = exe[exe.index(b"WhirlwindAbility_Whirlwind") - 1000:exe.index(b"ShredSpell_Shadow_VampiricAura") + 600]
    for key in catalog["codex"]:
        if not key.startswith("legendary:"):
            continue
        ability = key.split(":", 1)[1]
        name = names.get(ability, "").encode()
        if not name:
            continue
        longer_names = [other.encode() for other in names.values()
                        if len(other.encode()) > len(name) and other.encode().endswith(name)]
        for match in re.finditer(re.escape(name), spells):
            if any(spells[match.end() - len(other):match.end()] == other for other in longer_names):
                continue
            tail = spells[match.end():]
            icon = ICON_START.match(tail)
            if icon:
                raw = icon.group().decode()
                next_icon = re.search(r"(?:INV|Spell|Ability|Racial)_", raw[1:])
                if next_icon:
                    raw = raw[:next_icon.start() + 1]
                result[key] = raw
                break
    for ability, icon in ABILITY_ICON_OVERRIDES.items():
        result.setdefault(f"legendary:{ability}", icon)
    result["legendary:bloodrage"] = "ability_racial_bloodrage"
    return result


def icon_bytes(archive, name, allow_remote=True):
    payload = archive.read_file(f"Interface\\Icons\\{name}.blp")
    if payload:
        try:
            if payload.startswith(b"LP2"):
                payload = b"B" + payload
            with Image.open(io.BytesIO(payload)) as image:
                return image.convert("RGB")
        except OSError:
            pass
    if not allow_remote:
        return None
    try:
        with urllib.request.urlopen(ICON_URL.format(name.lower()), timeout=12) as response:
            with Image.open(io.BytesIO(response.read())) as image:
                return image.convert("RGB")
    except (urllib.error.HTTPError, urllib.error.URLError, OSError):
        return None


def main():
    game = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("C:/WoW/Surv")
    catalog = json.loads((ROOT / "data/catalog.json").read_text(encoding="utf-8"))
    rows = read_index()
    exe = (game / "AzerothSurvivors.exe").read_bytes()
    archive = mpyq.MPQArchive(str(game / "Data/patch.MPQ"))
    gear = gear_icons(rows)
    codex = binary_codex_icons(exe, catalog)
    metadata = build_metadata(exe, catalog)
    for key in catalog["codex"]:
        if key not in codex and not key.startswith("legendary:"):
            name = key.replace("_", " ")
            icon = item_icon(rows, name)
            if icon:
                codex[key] = icon
    raw_names = {name for sets in gear.values() for icons in sets for name in icons if name}
    raw_names.update(codex.values())
    english, _ = locales(exe)
    abilities = [(english[f"ability.{ability}.name"], codex.get(f"legendary:{ability}"))
                 for abilities in metadata["codexClasses"].values()
                 for ability in (entry.split(":", 1)[1] for entry in abilities)]
    def matching_ability_icon(title):
        matches = [(len(name), icon) for name, icon in abilities
                   if icon and len(name) > 3 and name.casefold() in title.casefold()]
        return max(matches)[1] if matches else None

    for trees in metadata["talents"].values():
        for tree in trees:
            raw_names.add(tree["icon"])
            for talent in tree["talents"]:
                if not talent["icon"]:
                    talent["icon"] = matching_ability_icon(talent["name"][0])
                if talent["icon"]:
                    raw_names.add(talent["icon"])
    raw_names.update(entry["icon"] for entry in metadata["achievements"].values() if entry["icon"])
    raw_names.discard(None)
    output = ROOT / "assets/icons/game"
    output.mkdir(parents=True, exist_ok=True)
    existing = {path.stem for path in output.glob("*.png")}
    image_cache = {}
    resolved = {}
    for raw in sorted(raw_names):
        known = [name for name in existing if raw.lower() == name or
                 (raw.lower().startswith(name) and len(raw) > len(name) and raw[len(name)].isupper())]
        if known:
            resolved[raw] = max(known, key=len)
            continue
        # Adjacent Rust string literals are concatenated in the executable.
        # Find the longest prefix that is a real MPQ or WoW icon filename.
        for length in range(len(raw), max(8, len(raw) - 18), -1):
            name = raw[:length]
            if name in image_cache:
                image = image_cache[name]
            else:
                image = icon_bytes(archive, name, allow_remote=length == len(raw))
                image_cache[name] = image
            if image is not None:
                target = output / f"{name.lower()}.png"
                if not target.exists():
                    image.save(target, optimize=True)
                    existing.add(name.lower())
                resolved[raw] = name.lower()
                break
        else:
            resolved[raw] = None

    def mapped(name):
        value = resolved.get(name) if name else None
        return value if isinstance(value, str) else None

    visual = {
        "gear": {key: [[mapped(name) for name in icons] for icons in sets] for key, sets in gear.items()},
        "codex": {key: mapped(name) for key, name in codex.items() if mapped(name)},
    }
    for trees in metadata["talents"].values():
        for tree in trees:
            tree_icon = mapped(tree["icon"])
            mapped_talents = [mapped(talent["icon"]) or mapped(matching_ability_icon(talent["name"][0]))
                              for talent in tree["talents"]]
            tree["icon"] = tree_icon or next((name for name in mapped_talents if name), None)
            for talent, name in zip(tree["talents"], mapped_talents):
                talent["icon"] = name or tree["icon"]
    for entry in metadata["achievements"].values():
        entry["icon"] = mapped(entry["icon"])
    (ROOT / "data/game.json").write_text(json.dumps(metadata, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    names = sorted({name for sets in visual["gear"].values() for icons in sets for name in icons if name}
                   | set(visual["codex"].values())
                   | {tree["icon"] for trees in metadata["talents"].values() for tree in trees if tree["icon"]}
                   | {entry["icon"] for trees in metadata["talents"].values() for tree in trees
                      for entry in tree["talents"] if entry["icon"]}
                   | {entry["icon"] for entry in metadata["achievements"].values() if entry["icon"]})
    columns = 16
    rows = math.ceil(len(names) / columns)
    atlas = Image.new("RGBA", (columns * 64, rows * 64))
    for index, name in enumerate(names):
        with Image.open(output / f"{name}.png") as source:
            tile = source.convert("RGBA").resize((64, 64), Image.Resampling.LANCZOS)
        atlas.paste(tile, (index % columns * 64, index // columns * 64))
    atlas.save(ROOT / "assets/icons/game-atlas.png", optimize=True)
    visual["atlas"] = {"columns": columns, "rows": rows,
                       "index": {name: index for index, name in enumerate(names)}}
    (ROOT / "data/visuals.json").write_text(json.dumps(visual, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    found_gear = sum(bool(name) for sets in visual["gear"].values() for icons in sets for name in icons)
    print(f"Gear icons: {found_gear}; codex icons: {len(visual['codex'])}; unique files: {len(list(output.glob('*.png')))}")


if __name__ == "__main__":
    main()

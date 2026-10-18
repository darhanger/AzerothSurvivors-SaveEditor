"""Extract editor metadata from the installed Azeroth Survivors executable."""

import json
import re


CLASS_TREES = {
    "1": ("Warrior", (("Arms", "Arms"), ("Fury", "Fury"), ("Protection", "Protection"))),
    "2": ("Paladin", (("Holy", "Holy"), ("Protection", "Protection"), ("Retribution", "Combat"))),
    "3": ("Hunter", (("Beast Mastery", "BeastMastery"), ("Marksmanship", "Marksmanship"), ("Survival", "Survival"))),
    "4": ("Rogue", (("Assassination", "Assassination"), ("Combat", "Combat"), ("Subtlety", "Subtlety"))),
    "5": ("Priest", (("Discipline", "Discipline"), ("Holy", "Holy"), ("Shadow", "Shadow"))),
    "7": ("Shaman", (("Elemental", "ElementalCombat"), ("Enhancement", "Enhancement"), ("Restoration", "Restoration"))),
    "8": ("Mage", (("Arcane", "Arcane"), ("Fire", "Fire"), ("Frost", "Frost"))),
    "9": ("Warlock", (("Affliction", "Curses"), ("Demonology", "Summoning"), ("Destruction", "Destruction"))),
    "11": ("Druid", (("Balance", "Balance"), ("Feral Combat", "FeralCombat"), ("Restoration", "Restoration"))),
}

SHARED_TALENT_NAMES = {
    "deflection_hunter": "Deflection", "shield_spec_shaman": "Shield Specialization",
    "anticipation_shaman": "Anticipation", "flurry_shaman": "Flurry",
    "lightning_reflexes_rogue": "Lightning Reflexes",
    "dual_wield_rogue": "Dual Wield Specialization", "sword_spec_rogue": "Sword Specialization",
    "deflection_pal": "Deflection", "ferocity_druid": "Ferocity",
}

# The executable stores these achievement titles, descriptions and icon paths
# alongside the achievement definitions. Some definitions reuse another icon.
ACHIEVEMENTS = {
    "talents:1": ("Fully Talented", "Earn all {n} talent points with one class.", "INV_Misc_Book_07", "collection"),
    "talents:9": ("Master of All", "Earn all {n} talent points with every class.", "INV_Misc_Book_07", "collection"),
    "pieces:25": ("Collector", "Collect {n} pieces of gear, of any class.", "INV_Chest_Chain", "collection"),
    "pieces:100": ("Hoarder", "Collect {n} pieces of gear, of any class.", "INV_Chest_Plate16", "collection"),
    "pieces:250": ("Curator", "Collect {n} pieces of gear, of any class.", "INV_Helmet_08", "collection"),
    "pieces:all": ("The Whole Armory", "Collect every piece of gear of every class.", "INV_Helmet_74", "collection"),
    "legendaryset": ("Legendary", "Collect every legendary piece of one class.", "INV_Sword_39", "collection"),
    "codex:50": ("Jeweler's Eye", "See half of the codex's rings, trinkets and amulets.", "INV_Jewelry_Ring_15", "collection"),
    "codex:100": ("Every Bauble", "See every ring, trinket and amulet in the codex.", "INV_Jewelry_Necklace_AhnQiraj_02", "collection"),
    "feat:kills2500": ("Slaughterhouse", "Slay 2,500 enemies in one run.", "Ability_Whirlwind", "challenges"),
    "feat:kills6000": ("Carnage", "Slay 6,000 enemies in one run.", "Spell_Shadow_DeathScream", "challenges"),
    "feat:lairs": ("Lair Breaker", "Slay four guardians before 8:00 in one run.", "Ability_Hunter_Pet_Bear", "challenges"),
    "feat:endless25": ("Overtime", "Survive to 25:00 in endless mode.", "INV_Misc_PocketWatch_01", "challenges"),
    "feat:endless30": ("Unending", "Survive to 30:00 in endless mode.", "INV_Misc_PocketWatch_02", "challenges"),
    "feat:endless40": ("Deathless Hour", "Survive to 40:00 in endless mode.", "INV_Misc_PocketWatch_02", "challenges"),
    "feat:bare": ("Bare Knuckles", "Win a run wearing no gear.", "INV_Shirt_White_01", "challenges"),
    "feat:thrifty": ("Thrifty", "Win a run without buying a cache.", "INV_Box_01", "challenges"),
    "feat:odds": ("Against the Odds", "Win a run with the Run Options at their full reward.", "Spell_Holy_DivineIntervention", "challenges"),
    "count:kills10k": ("Exterminator", "Slay 10,000 enemies.", "INV_Sword_04", "counts"),
    "count:kills100k": ("Scourge of Azeroth", "Slay 100,000 enemies.", "INV_Sword_04", "counts"),
    "count:kills1m": ("A Million Dead", "Slay 1,000,000 enemies.", "Spell_Shadow_RaiseDead", "counts"),
    "count:gold5k": ("Pocket Change", "Collect 5,000 gold.", "INV_Misc_Coin_01", "counts"),
    "count:gold50k": ("Treasure Hunter", "Collect 50,000 gold.", "INV_Misc_Coin_01", "counts"),
    "count:guardians100": ("Lair Raider", "Slay 100 guardians.", "Ability_Hunter_Pet_Wolf", "counts"),
    "count:guardians500": ("Warden's Bane", "Slay 500 guardians.", "Ability_Hunter_Pet_Gorilla", "counts"),
    "count:bosses100": ("Boss Hunter", "Slay 100 bosses.", "INV_Misc_Head_Dragon_01", "counts"),
    "count:caches100": ("Cache Cracker", "Buy 100 caches.", "INV_Box_02", "counts"),
    "count:runs10": ("Regular", "Play 10 runs.", "INV_Misc_Note_01", "counts"),
    "count:runs100": ("Veteran", "Play 100 runs.", "INV_Misc_Note_01", "counts"),
    "count:wins50": ("Conqueror", "Win 50 runs.", "INV_BannerPVP_01", "counts"),
}

ICON_START = re.compile(rb"(?:INV|Spell|Ability|Racial)_[A-Za-z0-9_]+")


def locales(exe):
    marker = b'{\n  "game.title": "Azeroth Survivors"'
    en_start = exe.index(marker)
    ru_tag = b"ru\xd0\xa0\xd1\x83\xd1\x81\xd1\x81\xd0\xba\xd0\xb8\xd0\xb9"
    ru_start = exe.index(marker, exe.index(ru_tag))
    return (json.loads(exe[en_start:exe.index(b"\n}", en_start) + 2]),
            json.loads(exe[ru_start:exe.index(b"\n}", ru_start) + 2]))


def build_metadata(exe, catalog):
    en, ru = locales(exe)
    title_keys = sorted((key.encode(), key) for key in en if key and "." not in key and "{" not in key)
    title_keys.sort(key=lambda pair: -len(pair[0]))
    literal_ids = [talent_id for ids in catalog["talents"].values() for talent_id in ids]
    literal_ids.extend(key[len("ability."):-len(".name")] for key in en
                       if key.startswith("ability.") and key.endswith(".name"))

    def icon_name(match):
        if not match:
            return None
        raw = match.group().decode()
        boundary = min((raw.find(literal_id, 10) for literal_id in literal_ids
                        if raw.find(literal_id, 10) >= 0), default=len(raw))
        return raw[:boundary]
    descriptions = sorted((key.encode(), key) for key in en if len(key) > 12 and ("." in key or "{v}" in key))
    descriptions.sort(key=lambda pair: -len(pair[0]))
    class_starts = {class_id: exe.index((class_name + trees[0][1]).encode(), 110000000)
                    for class_id, (class_name, trees) in CLASS_TREES.items()}
    order = list(CLASS_TREES)
    class_ends = {class_id: class_starts[order[index + 1]] if index + 1 < len(order) else class_starts[class_id] + 14000
                  for index, class_id in enumerate(order)}
    talents = {}
    for class_id, (class_name, tree_definitions) in CLASS_TREES.items():
        start = class_starts[class_id]
        end = class_ends[class_id]
        boundaries = [exe.index((class_name + slug).encode(), start, end)
                      for _, slug in tree_definitions] + [end]
        positions = {talent_id: exe.index(talent_id.encode(), start, end)
                     for talent_id in catalog["talents"][class_id]}
        trees = []
        for tree_index, (tree_name, slug) in enumerate(tree_definitions):
            header_end = boundaries[tree_index] + len(class_name + slug)
            tree_icon = ICON_START.match(exe[header_end:header_end + 120])
            entries = []
            tree_ids = [talent_id for talent_id in catalog["talents"][class_id]
                        if boundaries[tree_index] < positions[talent_id] < boundaries[tree_index + 1]]
            for entry_index, talent_id in enumerate(tree_ids):
                position = positions[talent_id]
                next_position = positions[tree_ids[entry_index + 1]] if entry_index + 1 < len(tree_ids) else boundaries[tree_index + 1]
                tail = exe[position + len(talent_id):position + len(talent_id) + 180]
                title = SHARED_TALENT_NAMES.get(talent_id)
                if title is None:
                    title = next((text for raw, text in title_keys if tail.startswith(raw)), None)
                if title is None:
                    raise ValueError(f"Could not identify talent {talent_id}")
                icon_tail = tail[len(title):] if tail.startswith(title.encode()) else tail
                icon = ICON_START.match(icon_tail)
                span = exe[position:next_position]
                description = next((text for raw, text in descriptions if span.endswith(raw)), None)
                if description is None:
                    keys = list(en)
                    title_at = keys.index(title)
                    candidate = keys[title_at + 1] if title_at + 1 < len(keys) else ""
                    if candidate and (candidate.endswith(".") or "{v}" in candidate) and title not in ("Flurry", "Deflection"):
                        description = candidate
                entries.append({"id": talent_id, "name": [title, ru.get(title, title)],
                                "description": [description, ru.get(description, description)] if description else None,
                                "icon": icon_name(icon)})
            trees.append({"name": [tree_name, ru.get(tree_name, tree_name)],
                          "icon": icon_name(tree_icon),
                          "talents": entries})
        talents[class_id] = trees

    abilities = [key[len("ability."):-len(".name")] for key in en
                 if key.startswith("ability.") and key.endswith(".name")][:102]
    codex_classes = {}
    offset = 0
    for class_id, count in zip(order, (11, 11, 11, 11, 11, 11, 13, 11, 12)):
        codex_classes[class_id] = [f"legendary:{ability}" for ability in abilities[offset:offset + count]]
        offset += count
    assert set(sum(codex_classes.values(), [])) == {key for key in catalog["codex"] if key.startswith("legendary:")}

    zones = {key: value for key, value in catalog["zones"]}
    achievements = {}
    for achievement_id in catalog["achievements"]:
        if achievement_id in ACHIEVEMENTS:
            name, description, icon, category = ACHIEVEMENTS[achievement_id]
            number = {"pieces:25": "25", "pieces:100": "100", "pieces:250": "250",
                      "talents:1": "51", "talents:9": "51"}.get(achievement_id)
            names = [name, ru.get(name, name)]
            descriptions_localized = [description, ru.get(description, description)]
            if number:
                descriptions_localized = [value.replace("{n}", number) for value in descriptions_localized]
        elif achievement_id.startswith("class:"):
            class_slug = achievement_id.split(":", 1)[1]
            class_en = en[f"class.{class_slug}.name"]
            class_ru = ru.get(f"class.{class_slug}.name", class_en)
            names = [en["{class} Victorious"].replace("{class}", class_en),
                     ru["{class} Victorious"].replace("{class}", class_ru)]
            template = "Win a run with a {class}."
            descriptions_localized = [template.replace("{class}", class_en),
                                      ru.get(template, template).replace("{class}", class_ru)]
            icon, category = None, "classes"
        else:
            prefix, zone_id = achievement_id.split(":", 1)
            zone_en = zones[zone_id]
            zone_ru = ru.get(f"zone.{zone_id}.name", zone_en)
            if prefix == "zone9":
                template = "Champion of {zone}"
                names = [en[template].replace("{zone}", zone_en),
                         ru.get(template, template).replace("{zone}", zone_ru)]
                description = "Defeat {boss} in {zone} with all nine classes."
            else:
                names = [zone_en, zone_ru]
                description = "Defeat {boss} in {zone} with any class."
            descriptions_localized = [description.replace("{boss}", "the final boss").replace("{zone}", zone_en),
                                      ru.get(description, description).replace("{boss}", "последнего босса").replace("{zone}", zone_ru)]
            icon, category = "INV_Misc_Map_01", "zones"
        achievements[achievement_id] = {"name": names, "description": descriptions_localized,
                                        "icon": icon, "category": category}

    sets = {}
    for class_id, (class_name, _) in CLASS_TREES.items():
        class_slug = class_name.lower()
        sets[class_id] = [[en[f"set.{class_slug}.{index}"], ru.get(f"set.{class_slug}.{index}", en[f"set.{class_slug}.{index}"])]
                          for index in range(5)]
    return {"talents": talents, "achievements": achievements,
            "codexClasses": codex_classes, "sets": sets}

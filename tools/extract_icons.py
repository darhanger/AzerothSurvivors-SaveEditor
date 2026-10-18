"""Extract the editor's small icon set from the installed game's MPQ archive.

Requires mpyq and Pillow. Usage: python tools/extract_icons.py C:/WoW/Surv/Data
"""

import io
import sys
from pathlib import Path

import mpyq
from PIL import Image


ICONS = {
    "class-warrior": "Ability_Warrior_SavageBlow",
    "class-paladin": "Spell_Holy_HolyBolt",
    "class-hunter": "Ability_Hunter_Quickshot",
    "class-rogue": "Ability_Rogue_Ambush",
    "class-priest": "Spell_Holy_Heal",
    "class-shaman": "Spell_Nature_Lightning",
    "class-mage": "Spell_Fire_Fireball",
    "class-warlock": "Spell_Shadow_Curse",
    "class-druid": "Spell_Nature_StarFall",
    "slot-head": "INV_Helmet_74",
    "slot-shoulder": "INV_Shoulder_10",
    "slot-chest": "INV_Chest_Cloth_01",
    "slot-waist": "INV_Belt_12",
    "slot-legs": "INV_Pants_06",
    "slot-feet": "INV_Boots_Plate_09",
    "slot-wrist": "INV_Bracer_14",
    "slot-hands": "INV_Gauntlets_10",
    "slot-main-hand": "INV_Sword_17",
    "slot-off-hand": "INV_Shield_12",
    "codex-amulets": "INV_Jewelry_Necklace_16",
    "codex-legendary": "INV_Jewelry_Necklace_AhnQiraj_02",
    "codex-other": "INV_Jewelry_Ring_38",
    "pvp": "INV_BannerPVP_01",
}


def main():
    data_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("C:/WoW/Surv/Data")
    archive = mpyq.MPQArchive(str(data_dir / "patch.MPQ"))
    output = Path(__file__).resolve().parents[1] / "assets" / "icons"
    output.mkdir(parents=True, exist_ok=True)
    for stem, game_name in ICONS.items():
        payload = archive.read_file(f"Interface\\Icons\\{game_name}.blp")
        if not payload:
            raise FileNotFoundError(f"{game_name}.blp in {data_dir / 'patch.MPQ'}")
        # mpyq drops the initial B from these uncompressed BLP2 MPQ entries.
        if payload.startswith(b"LP2"):
            payload = b"B" + payload
        with Image.open(io.BytesIO(payload)) as image:
            image.convert("RGBA").save(output / f"{stem}.png", optimize=True)
    print(f"Extracted {len(ICONS)} icons to {output}")


if __name__ == "__main__":
    main()

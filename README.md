English | [Русский](README_RU.md)

# Azeroth Survivors Save Editor

A browser based editor for **Azeroth Survivors** saves. Open an exported `.sav` file or paste an `RSE1:` string, change your progress, and export a new file or string for the game. Processing happens in your browser; the site has no upload endpoint.

**[Open the editor](https://darhanger.github.io/AzerothSurvivors-SaveEditor/)**

## Features

- Import signed RSE1 saves and verify their signatures, or edit save plaintext directly.
- Edit unlocked and cleared zones, talent experience and ranks, accessory codex entries, achievements, item collection, equipment, stats, perks, and pets.
- Unlock the Druid's **Shred** legendary amulet. Its `legendary:shred=4` entry has been confirmed to appear in game after import.
- Browse item IDs with class, set, and equipment slot labels. The editor also lists the newly available PvP sets for every class, unchecked by default.
- Use icons extracted from the installed game's MPQ archive for class, slot, and codex categories.
- Switch between English (default) and Russian. The preference is stored locally in your browser.
- Export a newly signed `.sav` file or copy the RSE1 string. Unknown save lines are preserved when using the form controls.

## Usage

1. Open the [editor](https://darhanger.github.io/AzerothSurvivors-SaveEditor/).
2. Drop a `.sav` or `.txt` file onto the page, choose a file, or paste an `RSE1:` string.
3. Edit the relevant section. The **Plaintext** tab gives direct access to all save lines.
4. Download the edited `.sav` or copy its RSE1 string, then import it in the game.

**Keep a backup of the original save.** Importing a save in the game replaces the current account progress. The editor does not modify the original file on your device.

## Data coverage and limits

| Area | Source | Notes |
| --- | --- | --- |
| RSE1 container | Analyzed Windows executable | Signature verification and export use the current game's format. |
| Classes and zones | Game data and verified IDs | Names are available in English and Russian. |
| Talents | 354 IDs extracted from the executable | The game still enforces talent rank and point limits. |
| Codex | Provided save and game data | Includes 141 entries and the confirmed Shred amulet. |
| Collected gear | Provided save | Item labels describe class, set, and slot; they are not the game's full item titles. |
| PvP gear | IDs inferred from the existing item ID pattern | Shown as available and unchecked. Verify an edited PvP item in game before making broader changes. |

The editor targets the **original standalone Azeroth Survivors Windows build** analyzed on 18 October 2026. It is not a World of Warcraft addon. A future game update may change save fields, signatures, or valid item IDs. See [the format notes](docs/format.md) for technical details.

## Run locally

From the repository root:

```powershell
python -m http.server 8000
```

Open `http://localhost:8000/`. Opening `index.html` through `file://` will not load `data/catalog.json` in browsers that block local fetches. No build step is required.

## Deployment

The [GitHub Pages workflow](.github/workflows/pages.yml) publishes `index.html`, `styles.css`, `src/`, `data/`, and `assets/` after a push to `main`. The repository's Pages source must be **GitHub Actions**. Save files are excluded by `.gitignore` and are never deployed.

The 23 PNG icons in `assets/icons/` were extracted from the local game's `patch.MPQ`. To regenerate them, install `mpyq` and `Pillow`, then run `python tools/extract_icons.py C:/WoW/Surv/Data`. The website uses the committed PNGs and does not need access to the game files.

## Support

For bugs and suggestions, open a [GitHub issue](https://github.com/darhanger/AzerothSurvivors-SaveEditor/issues). Include the game version, what you changed, and what happened after import. Do not post a private save unless you are comfortable sharing its account progress.

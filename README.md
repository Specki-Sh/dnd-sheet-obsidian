# D&D 5.5e Character Sheet for Obsidian 🎲⚔️

An authentic, interactive **D&D 5.5e (2024 Player's Handbook revision)** character sheet renderer for [Obsidian](https://obsidian.md).

Easily create beautiful, responsive, and printable D&D 5.5e character sheets inside your Obsidian vault using clean, human-readable YAML.

---

## ✨ Features

* **Authentic 5.5e (2024 PHB) Layout:**
  * **Embedded Saving Throws:** In the 2024 revision, saving throws live directly inside each ability card.
  * **Heroic Inspiration:** Quick toggle button (★/☆).
  * **Weapon Mastery:** Support for 5.5e weapon mastery properties (*Slow, Vex, Push, Nick, Sap, Topple*).
  * **3-Column Grid:** Balanced distribution between stats/skills, combat/HP, and features/magic/equipment.
* **Interactive Dice Rolling:**
  * Click on any ability check, saving throw, skill check, initiative, weapon attack, or damage to instantly roll dice with full breakdown notifications (e.g. `🎲 Attack: (16) + 4 = 20!`).
* **Interactive Resource Trackers:**
  * Clickable pips for spell slots, hit dice, death saves (`◯ ◯ ◯`), and feature charges that toggle on and off directly in the sheet.
* **Pure YAML (No HTML soup):**
  * Keep your markdown notes 100% clean and future-proof.
* **Printer & PDF Ready (A4 B&W):**
  * Built-in `@media print` styles ensure high-contrast, ink-saving printing with crisp black outlines and zero dark backgrounds when using `Cmd + P` -> "Export to PDF".

---

## 🚀 Installation

### Via Obsidian Community Plugins (Recommended once approved)
1. Open **Settings** > **Community plugins**.
2. Turn off **Restricted mode**.
3. Click **Browse** and search for `D&D 5.5e Character Sheet`.
4. Click **Install**, then **Enable**.

### Via BRAT (Beta Reviewers Auto-update Tester)
1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat).
2. In BRAT settings, click **Add Beta plugin**.
3. Enter `Specki-Sh/dnd-sheet-obsidian`.

### Manual Installation
1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/Specki-Sh/dnd-sheet-obsidian/releases).
2. Create a folder named `dnd-55e-sheet` under your vault's `.obsidian/plugins/` directory.
3. Place the downloaded files into that folder.
4. Reload Obsidian and enable the plugin in Settings.

---

## 📖 Usage

Create a code block with the language identifier `dnd-55e` (or `dnd-sheet`) in any note:

````markdown
```dnd-55e
name: Grizz
class: Fighter 2
species: Goblin
background: Soldier
alignment: Chaotic Neutral
xp: 300 XP
player: John
inspiration: true
pb: 2
size: Small
speed: 30
ac: 17
initiative: 2
hp: 20
max_hp: 20
hit_dice: 2d10
hit_dice_count: 2
abilities:
  str: 14
  dex: 15
  con: 14
  int: 8
  wis: 12
  cha: 8
saves:
  - str
  - con
skills:
  athletics: prof
  stealth: prof
  survival: prof
  intimidation: prof
languages: Goblin, Common
proficiencies: All armor, shields, simple & martial weapons
attacks:
  - name: Scimitar
    bonus: +4
    damage: 1d6+4
    range: 5 ft.
    mastery: Slow
  - name: Javelin
    bonus: +4
    damage: 1d6+4
    range: 30/120 ft.
    mastery: Topple
bonus_actions: Nimble Escape (Disengage or Hide), Second Wind
reactions: —
features:
  - name: Nimble Escape
    desc: Bonus action to Disengage or Hide on each turn.
  - name: Second Wind
    uses: Short Rest
    count: 2
    desc: Regain 1d10 + 2 hit points as a bonus action.
  - name: Action Surge
    uses: Short Rest
    count: 1
    desc: Take one additional action on your turn.
coins:
  cp: 4
  sp: 0
  ep: 0
  gp: 0
  pp: 0
equipment: Chain shirt, shield, scimitar, 3 javelins, rope (50 ft.), tinderbox.
personality:
  trait: Always wears an old copper bucket on his head.
  ideal: Might makes right.
  bond: A scimitar stolen from a sleeping ogre.
  flaw: Goes berserk if someone taps a spoon on his helmet.
secret_goal: Sneak into the blacksmith's tent and steal the heavy blade!
```
````

---

## 🛠 YAML Field Reference

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | string | Character name displayed in the top banner |
| `class` | string | Class and level (e.g. `Fighter 2`) |
| `species` | string | Species / Race (e.g. `Goblin`, `Elf`) |
| `background` | string | Character background (e.g. `Soldier`, `Criminal`) |
| `alignment` | string | Alignment (e.g. `Chaotic Neutral`) |
| `pb` | number | Proficiency Bonus (defaults to `2`) |
| `inspiration` | boolean | Starting Heroic Inspiration state (`true` / `false`) |
| `abilities` | object | `str`, `dex`, `con`, `int`, `wis`, `cha` scores |
| `saves` | list | List of proficient saving throws (`str`, `dex`, `con`, etc.) |
| `skills` | object | Key-value mapping of skills to `prof` or `expert` |
| `ac`, `hp`, `speed` | number | Core combat vitals |
| `attacks` | list | List of attack objects (`name`, `bonus`, `damage`, `range`, `mastery`) |
| `spells` | list | Spell list with descriptions (for spellcasters) |
| `spell_save_dc` | number | Spell save difficulty class |
| `spell_slots_1` | number | Number of 1st-level spell slot bubbles to track |
| `features` | list | Features and traits (`name`, `desc`, optional `uses` & `count`) |
| `coins` | object | Currency counts (`cp`, `sp`, `ep`, `gp`, `pp`) |
| `personality` | object | `trait`, `ideal`, `bond`, `flaw` |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

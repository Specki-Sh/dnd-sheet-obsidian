const { Plugin, parseYaml, Notice } = require("obsidian");

module.exports = class DnD55eSheetPlugin extends Plugin {
  async onload() {
    this.registerMarkdownCodeBlockProcessor("dnd-55e", (source, el, ctx) => {
      this.renderSheet(source, el, ctx);
    });

    this.registerMarkdownCodeBlockProcessor("dnd-sheet", (source, el, ctx) => {
      this.renderSheet(source, el, ctx);
    });
  }

  calcMod(score) {
    return Math.floor(((score || 10) - 10) / 2);
  }

  fmtMod(mod) {
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }

  fmtBonus(b) {
    if (b === undefined || b === null) return "+0";
    if (typeof b === "number") return b >= 0 ? `+${b}` : `${b}`;
    let str = String(b).trim();
    if (str.startsWith("+") || str.startsWith("-")) return str;
    const num = parseInt(str, 10);
    if (!isNaN(num) && String(num) === str) return num >= 0 ? `+${num}` : `${num}`;
    return str;
  }

  rollDice(formula, label = "Бросок") {
    if (!formula || typeof formula !== "string") return;
    formula = formula.trim();

    if (/^сл\s*\d+/i.test(formula) || !/\d+d\d+/i.test(formula)) {
      new Notice(`🎯 ${label}: ${formula}`);
      return;
    }

    const match = formula.match(/(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/i);
    if (!match) {
      new Notice(`🎲 ${label}: ${formula}`);
      return;
    }
    const count = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);
    const sign = match[3] || "+";
    const mod = match[4] ? parseInt(match[4], 10) : 0;

    let rolls = [];
    let sum = 0;
    for (let i = 0; i < count; i++) {
      const r = Math.floor(Math.random() * sides) + 1;
      rolls.push(r);
      sum += r;
    }
    const total = sign === "+" ? sum + mod : sum - mod;
    const breakdown = rolls.length > 1 ? `(${rolls.join(" + ")})` : `${rolls[0]}`;
    const modStr = mod !== 0 ? ` ${sign} ${mod}` : "";
    
    let crit = "";
    if (count === 1 && sides === 20) {
      if (rolls[0] === 20) crit = " 🌟 КРИТ УСПЕХ!";
      if (rolls[0] === 1) crit = " 💀 КРИТ ПРОВАЛ!";
    }

    new Notice(`🎲 ${label}: ${breakdown}${modStr} = ${total}${crit}`, 4000);
  }

  renderSheet(source, el, ctx) {
    let data;
    try {
      data = parseYaml(source);
    } catch (e) {
      const errBox = el.createDiv({ cls: "dnd55-error" });
      errBox.createEl("h4", { text: "⚠️ Ошибка разбора YAML в карточке персонажа" });
      errBox.createEl("p", { text: e.message });
      errBox.createEl("small", { text: "Подсказка: если в строке есть двоеточия (например, 'Свойство: Значение') или знак плюс ('+2'), возьмите строку в двойные кавычки: \"...\"" });
      return;
    }

    if (!data || typeof data !== "object") {
      el.createEl("div", { text: "Ошибка: данные чарлиста пусты.", cls: "dnd55-error" });
      return;
    }

    const pb = data.pb || 2;
    const abilities = data.abilities || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    const strMod = this.calcMod(abilities.str);
    const dexMod = this.calcMod(abilities.dex);
    const conMod = this.calcMod(abilities.con);
    const intMod = this.calcMod(abilities.int);
    const wisMod = this.calcMod(abilities.wis);
    const chaMod = this.calcMod(abilities.cha);

    const mods = { str: strMod, dex: dexMod, con: conMod, int: intMod, wis: wisMod, cha: chaMod };
    const savesList = Array.isArray(data.saves) ? data.saves.map(s => String(s).toLowerCase()) : [];

    const sheet = el.createDiv({ cls: "dnd55-sheet" });

    // ------------------------------------------------------------------------
    // TOP TOOLBAR: FULLSCREEN, SCROLL MODES & BADGE
    // ------------------------------------------------------------------------
    const topBar = sheet.createDiv({ cls: "dnd55-topbar" });
    topBar.createDiv({ cls: "dnd55-badge-edition", text: "D&D 5.5e (2024)" });

    const toolbar = topBar.createDiv({ cls: "dnd55-toolbar" });

    // Mode: 3 Columns with Scroll
    const scrollBtn = toolbar.createEl("button", { cls: "dnd55-tool-btn", text: "↔ 3 колонки (скролл)" });
    scrollBtn.onclick = () => {
      sheet.toggleClass("dnd55-force-scroll", !sheet.hasClass("dnd55-force-scroll"));
      const isScroll = sheet.hasClass("dnd55-force-scroll");
      scrollBtn.setText(isScroll ? "⊞ Адаптивный вид" : "↔ 3 колонки (скролл)");
      scrollBtn.toggleClass("active", isScroll);
    };

    // Mode: Fullscreen Overlay
    const fsBtn = toolbar.createEl("button", { cls: "dnd55-tool-btn", text: "⛶ Во весь экран" });
    let escListener = null;
    fsBtn.onclick = () => {
      sheet.toggleClass("dnd55-fullscreen", !sheet.hasClass("dnd55-fullscreen"));
      const isFs = sheet.hasClass("dnd55-fullscreen");
      fsBtn.setText(isFs ? "✕ Свернуть (Esc)" : "⛶ Во весь экран");
      fsBtn.toggleClass("active", isFs);

      if (isFs) {
        escListener = (e) => {
          if (e.key === "Escape") {
            sheet.removeClass("dnd55-fullscreen");
            fsBtn.setText("⛶ Во весь экран");
            fsBtn.removeClass("active");
            document.removeEventListener("keydown", escListener);
          }
        };
        document.addEventListener("keydown", escListener);
      } else if (escListener) {
        document.removeEventListener("keydown", escListener);
      }
    };

    // ------------------------------------------------------------------------
    // HEADER BANNER (5.5e 2024 Character Details)
    // ------------------------------------------------------------------------
    const header = sheet.createDiv({ cls: "dnd55-header" });
    const nameBox = header.createDiv({ cls: "dnd55-name-box" });
    nameBox.createDiv({ cls: "dnd55-name-title", text: data.name || "Безымянный герой" });
    nameBox.createDiv({ cls: "dnd55-name-sub", text: `${data.species || "Гоблин"} • ${data.class || "Воин 2"}` });

    const metaGrid = header.createDiv({ cls: "dnd55-meta-grid" });
    const metaFields = [
      { label: "Класс / Уровень", val: data.class || "—" },
      { label: "Предыстория", val: data.background || "—" },
      { label: "Вид (Species)", val: data.species || "Гоблин" },
      { label: "Мировоззрение", val: data.alignment || "Нейтральный" },
      { label: "Опыт (XP)", val: data.xp || "300 XP" },
      { label: "Игрок", val: data.player || "—" }
    ];
    metaFields.forEach(f => {
      const item = metaGrid.createDiv({ cls: "dnd55-meta-item" });
      item.createDiv({ cls: "dnd55-meta-label", text: f.label });
      item.createDiv({ cls: "dnd55-meta-val", text: String(f.val) });
    });

    // ------------------------------------------------------------------------
    // NAVIGATION PILLS (Quick Jump to Columns)
    // ------------------------------------------------------------------------
    const navTabs = sheet.createDiv({ cls: "dnd55-nav-tabs" });
    const tab1 = navTabs.createEl("button", { cls: "dnd55-nav-tab", text: "📊 1. Параметры и навыки" });
    const tab2 = navTabs.createEl("button", { cls: "dnd55-nav-tab", text: "⚔️ 2. Бой и здоровье" });
    const tab3 = navTabs.createEl("button", { cls: "dnd55-nav-tab", text: "🔮 3. Магия и особенности" });

    // ------------------------------------------------------------------------
    // GRID
    // ------------------------------------------------------------------------
    const grid = sheet.createDiv({ cls: "dnd55-grid" });

    // ========================================================================
    // COLUMN 1: ABILITIES, SAVES, SKILLS, SENSES
    // ========================================================================
    const col1 = grid.createDiv({ cls: "dnd55-col" });
    tab1.onclick = () => col1.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });

    // Heroic Inspiration & Proficiency Bonus
    const inspProf = col1.createDiv({ cls: "dnd55-inspiration-prof" });
    const inspBox = inspProf.createDiv({ cls: "dnd55-badge-box" });
    inspBox.createDiv({ cls: "dnd55-badge-label", text: "Вдохновение" });
    const inspVal = inspBox.createDiv({ cls: "dnd55-badge-val", text: data.inspiration ? "★ ДА" : "☆ НЕТ" });
    inspBox.onclick = () => {
      data.inspiration = !data.inspiration;
      inspVal.setText(data.inspiration ? "★ ДА" : "☆ НЕТ");
      inspBox.toggleClass("active", data.inspiration);
    };
    if (data.inspiration) inspBox.addClass("active");

    const pbBox = inspProf.createDiv({ cls: "dnd55-badge-box" });
    pbBox.createDiv({ cls: "dnd55-badge-label", text: "Мастерство" });
    pbBox.createDiv({ cls: "dnd55-badge-val", text: `+${pb}` });

    // 6 Ability Cards with embedded 5.5e Saving Throws
    const abList = col1.createDiv({ cls: "dnd55-abilities-list" });
    const abilityDefs = [
      { key: "str", name: "СИЛ", full: "Сила", score: abilities.str || 10 },
      { key: "dex", name: "ЛОВ", full: "Ловкость", score: abilities.dex || 10 },
      { key: "con", name: "ТЕЛ", full: "Телосложение", score: abilities.con || 10 },
      { key: "int", name: "ИНТ", full: "Интеллект", score: abilities.int || 10 },
      { key: "wis", name: "МДР", full: "Мудрость", score: abilities.wis || 10 },
      { key: "cha", name: "ХАР", full: "Харизма", score: abilities.cha || 10 }
    ];

    abilityDefs.forEach(ab => {
      const card = abList.createDiv({ cls: "dnd55-ability-card" });
      const left = card.createDiv({ cls: "dnd55-ability-left" });
      left.createDiv({ cls: "dnd55-ability-name", text: ab.name });
      
      const mod = mods[ab.key];
      const modEl = left.createDiv({ cls: "dnd55-ability-mod", text: this.fmtMod(mod) });
      modEl.onclick = () => this.rollDice(`1d20${this.fmtMod(mod)}`, `Проверка: ${ab.full}`);

      left.createDiv({ cls: "dnd55-ability-score", text: String(ab.score) });

      // Embedded Save (5.5e feature)
      const isProf = savesList.includes(ab.key);
      const saveBonus = isProf ? mod + pb : mod;
      const saveEl = card.createDiv({ cls: `dnd55-ability-save ${isProf ? "proficient" : ""}` });
      saveEl.setText(`${isProf ? "●" : "○"} Спас ${this.fmtMod(saveBonus)}`);
      saveEl.onclick = () => this.rollDice(`1d20${this.fmtMod(saveBonus)}`, `Спасбросок: ${ab.full}`);
    });

    // Skills Panel
    const skillsPanel = col1.createDiv({ cls: "dnd55-panel" });
    skillsPanel.createDiv({ cls: "dnd55-panel-title", text: "Навыки (Skills)" });

    const standardSkills = [
      { name: "Акробатика", attr: "dex" },
      { name: "Анализ", attr: "int" },
      { name: "Атлетика", attr: "str" },
      { name: "Внимательность", attr: "wis" },
      { name: "Выживание", attr: "wis" },
      { name: "Выступление", attr: "cha" },
      { name: "Запугивание", attr: "cha" },
      { name: "История", attr: "int" },
      { name: "Ловкость рук", attr: "dex" },
      { name: "Магия", attr: "int" },
      { name: "Медицина", attr: "wis" },
      { name: "Обман", attr: "cha" },
      { name: "Природа", attr: "int" },
      { name: "Проницательность", attr: "wis" },
      { name: "Религия", attr: "int" },
      { name: "Скрытность", attr: "dex" },
      { name: "Убеждение", attr: "cha" },
      { name: "Уход за животными", attr: "wis" }
    ];

    const profSkills = data.skills || {};

    standardSkills.forEach(s => {
      const pStatus = profSkills[s.name.toLowerCase()] || profSkills[s.name] || (Array.isArray(data.prof_skills) && data.prof_skills.includes(s.name) ? "prof" : "none");
      let bonus = mods[s.attr];
      let dot = "○";
      let isExpert = pStatus === "expert" || pStatus === 2;
      let isProf = pStatus === "prof" || pStatus === 1 || isExpert;

      if (isExpert) {
        bonus += pb * 2;
        dot = "●●";
      } else if (isProf) {
        bonus += pb;
        dot = "●";
      }

      const row = skillsPanel.createDiv({ cls: "dnd55-skill-row" });
      row.setAttribute("title", `${s.name} (${s.attr.toUpperCase()}): ${this.fmtMod(bonus)}`);
      
      const sLeft = row.createDiv({ cls: "dnd55-skill-left" });
      sLeft.createDiv({ cls: `dnd55-dot ${isProf ? "prof" : ""}`, text: dot });
      sLeft.createSpan({ text: s.name, cls: "dnd55-skill-name" });
      sLeft.createSpan({ cls: "dnd55-skill-attr", text: `(${s.attr.toUpperCase()})` });

      row.createDiv({ cls: "dnd55-skill-bonus", text: this.fmtMod(bonus) });
      row.onclick = () => this.rollDice(`1d20${this.fmtMod(bonus)}`, `Навык: ${s.name}`);
    });

    // Passive Senses & Proficiencies
    const sensesPanel = col1.createDiv({ cls: "dnd55-panel" });
    sensesPanel.createDiv({ cls: "dnd55-panel-title", text: "Чувства и Владения" });
    const percBonus = (profSkills["внимательность"] ? pb : 0) + wisMod;
    sensesPanel.createDiv({ cls: "dnd55-sense-item", text: `👁 Пассивное Восприятие: ${10 + percBonus}` });
    if (data.languages) sensesPanel.createDiv({ cls: "dnd55-sense-item", text: `🗣 Языки: ${data.languages}` });
    if (data.proficiencies) sensesPanel.createDiv({ cls: "dnd55-sense-item", text: `🛡 Владение: ${data.proficiencies}` });

    // ========================================================================
    // COLUMN 2: COMBAT VITALS, HP, WEAPON MASTERY
    // ========================================================================
    const col2 = grid.createDiv({ cls: "dnd55-col" });
    tab2.onclick = () => col2.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });

    // Vitals Row: AC, Initiative, Speed, Size
    const vitals = col2.createDiv({ cls: "dnd55-vitals-row" });
    
    const acBox = vitals.createDiv({ cls: "dnd55-vital-badge ac" });
    acBox.createDiv({ cls: "dnd55-vital-title", text: "КД" });
    acBox.createDiv({ cls: "dnd55-vital-val", text: String(data.ac || 10 + dexMod) });

    const initBonus = data.initiative !== undefined ? data.initiative : dexMod;
    const initBox = vitals.createDiv({ cls: "dnd55-vital-badge" });
    initBox.createDiv({ cls: "dnd55-vital-title", text: "Инициатива" });
    initBox.createDiv({ cls: "dnd55-vital-val", text: this.fmtMod(initBonus) });
    initBox.onclick = () => this.rollDice(`1d20${this.fmtMod(initBonus)}`, "Инициатива");

    const speedBox = vitals.createDiv({ cls: "dnd55-vital-badge" });
    speedBox.createDiv({ cls: "dnd55-vital-title", text: "Скорость" });
    speedBox.createDiv({ cls: "dnd55-vital-val", text: `${data.speed || 30} фт.` });

    const sizeBox = vitals.createDiv({ cls: "dnd55-vital-badge" });
    sizeBox.createDiv({ cls: "dnd55-vital-title", text: "Размер" });
    const sizeStr = String(data.size || "Малый");
    const isSizeLong = sizeStr.length > 4;
    sizeBox.createDiv({ cls: `dnd55-vital-val ${isSizeLong ? "dnd55-vital-text" : ""}`, text: sizeStr });

    // Hit Points Card
    const hpCard = col2.createDiv({ cls: "dnd55-hp-card" });
    const hpTop = hpCard.createDiv({ cls: "dnd55-hp-top" });
    hpTop.createDiv({ cls: "dnd55-hp-cur", text: String(data.hp || 20) });
    hpTop.createDiv({ cls: "dnd55-hp-max", text: `МАКС: ${data.max_hp || data.hp || 20}` });
    if (data.temp_hp) hpTop.createDiv({ cls: "dnd55-hp-temp", text: `ВРЕМ: +${data.temp_hp}` });

    // Hit Dice & Interactive Death Saves (Responsive)
    const hdDeath = hpCard.createDiv({ cls: "dnd55-hitdice-death" });
    
    // Hit dice
    const hdBox = hdDeath.createDiv({ cls: "dnd55-hd-col" });
    hdBox.createDiv({ cls: "dnd55-badge-label", text: `Кости хитов (${data.hit_dice || "2d10"})` });
    const hdCount = data.hit_dice_count || 2;
    const hdPips = hdBox.createDiv({ cls: "dnd55-pip-group" });
    for (let i = 0; i < hdCount; i++) {
      const pip = hdPips.createSpan({ cls: "dnd55-pip checked-slot" });
      pip.onclick = () => pip.toggleClass("checked-slot");
    }

    // Death Saves
    const dsBox = hdDeath.createDiv({ cls: "dnd55-death-col" });
    dsBox.createDiv({ cls: "dnd55-badge-label", text: "Спасброски от смерти" });
    
    const dsRows = dsBox.createDiv({ cls: "dnd55-death-rows" });
    const succGroup = dsRows.createDiv({ cls: "dnd55-pip-group" });
    succGroup.createSpan({ text: "Усп: ", cls: "dnd55-pip-sublabel" });
    for (let i = 0; i < 3; i++) {
      const p = succGroup.createSpan({ cls: "dnd55-pip" });
      p.onclick = () => p.toggleClass("checked-success");
    }

    const failGroup = dsRows.createDiv({ cls: "dnd55-pip-group" });
    failGroup.createSpan({ text: "Пров: ", cls: "dnd55-pip-sublabel" });
    for (let i = 0; i < 3; i++) {
      const p = failGroup.createSpan({ cls: "dnd55-pip" });
      p.onclick = () => p.toggleClass("checked-fail");
    }

    // 5.5e Attacks & Weapon Mastery Table
    const atkPanel = col2.createDiv({ cls: "dnd55-panel" });
    atkPanel.createDiv({ cls: "dnd55-panel-title", text: "Атаки и Мастерство оружия (Weapon Mastery)" });

    const attacks = data.attacks || [];
    if (attacks.length > 0) {
      const tableWrap = atkPanel.createDiv({ cls: "dnd55-table-wrap" });
      const table = tableWrap.createEl("table", { cls: "dnd55-attacks-table" });
      const thead = table.createEl("thead");
      const trh = thead.createEl("tr");
      trh.createEl("th", { text: "Оружие" });
      trh.createEl("th", { text: "Атака", cls: "dnd55-th-center" });
      trh.createEl("th", { text: "Урон", cls: "dnd55-th-center" });
      trh.createEl("th", { text: "Мастерство", cls: "dnd55-th-center" });

      const tbody = table.createEl("tbody");
      attacks.forEach(atk => {
        const tr = tbody.createEl("tr");
        const tdName = tr.createEl("td", { cls: "dnd55-td-name" });
        tdName.createSpan({ text: atk.name, cls: "dnd55-attack-name" });
        if (atk.range) tdName.createEl("span", { text: ` (${atk.range})`, cls: "dnd55-attack-range" });

        // Attack roll button
        const tdAtk = tr.createEl("td", { cls: "dnd55-td-center" });
        const bStr = this.fmtBonus(atk.bonus);
        const atkBtn = tdAtk.createSpan({ cls: "dnd55-clickable-roll", text: bStr });
        atkBtn.onclick = () => {
          if (bStr.startsWith("+") || bStr.startsWith("-")) {
            this.rollDice(`1d20${bStr}`, `Атака: ${atk.name}`);
          } else {
            this.rollDice(bStr, `Сложность: ${atk.name}`);
          }
        };

        // Damage roll button
        const tdDmg = tr.createEl("td", { cls: "dnd55-td-center" });
        const dmgStr = String(atk.damage || "1d6+4");
        const dmgBtn = tdDmg.createSpan({ cls: "dnd55-clickable-roll", text: dmgStr });
        dmgBtn.onclick = () => this.rollDice(dmgStr, `Урон: ${atk.name}`);

        // 5.5e Weapon Mastery Tag
        const tdMast = tr.createEl("td", { cls: "dnd55-td-center" });
        if (atk.mastery) {
          tdMast.createSpan({ cls: "dnd55-mastery-tag", text: String(atk.mastery) });
        } else {
          tdMast.createSpan({ text: "—", cls: "dnd55-skill-attr" });
        }
      });
    }

    // Bonus Actions & Reactions
    if (data.bonus_actions || data.reactions) {
      const actPanel = col2.createDiv({ cls: "dnd55-panel" });
      actPanel.createDiv({ cls: "dnd55-panel-title", text: "Бонусные действия и Реакции" });
      if (data.bonus_actions) {
        const ba = actPanel.createDiv({ cls: "dnd55-action-item" });
        ba.createSpan({ cls: "dnd55-action-label", text: "⚡ Бонусное действие: " });
        ba.createSpan({ text: String(data.bonus_actions) });
      }
      if (data.reactions) {
        const rx = actPanel.createDiv({ cls: "dnd55-action-item" });
        rx.createSpan({ cls: "dnd55-action-label", text: "🛡 Реакция: " });
        rx.createSpan({ text: String(data.reactions) });
      }
    }

    // ========================================================================
    // COLUMN 3: FEATURES, SPELLS, EQUIPMENT, ROLEPLAY
    // ========================================================================
    const col3 = grid.createDiv({ cls: "dnd55-col" });
    tab3.onclick = () => col3.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });

    // Spells Section (if caster)
    if (data.spells || data.spell_save_dc) {
      const spellPanel = col3.createDiv({ cls: "dnd55-panel" });
      spellPanel.createDiv({ cls: "dnd55-panel-title", text: "Заклинания и Магия" });
      
      const spVitals = spellPanel.createDiv({ cls: "dnd55-vitals-row dnd55-vitals-2" });
      const dcBox = spVitals.createDiv({ cls: "dnd55-vital-badge" });
      dcBox.createDiv({ cls: "dnd55-vital-title", text: "Сл спаса" });
      dcBox.createDiv({ cls: "dnd55-vital-val", text: String(data.spell_save_dc || 13) });

      const spAtkBox = spVitals.createDiv({ cls: "dnd55-vital-badge" });
      spAtkBox.createDiv({ cls: "dnd55-vital-title", text: "Атака" });
      spAtkBox.createDiv({ cls: "dnd55-vital-val", text: this.fmtBonus(data.spell_attack || "+5") });

      // Spell Slots pips
      if (data.spell_slots_1) {
        const slotsRow = spellPanel.createDiv({ cls: "dnd55-spell-slots-row" });
        slotsRow.createSpan({ text: "Ячейки 1 круга: ", cls: "dnd55-badge-label" });
        const pipsRow = slotsRow.createSpan({ cls: "dnd55-pip-group" });
        for (let i = 0; i < (data.spell_slots_1 || 3); i++) {
          const p = pipsRow.createSpan({ cls: "dnd55-pip checked-slot" });
          p.onclick = () => p.toggleClass("checked-slot");
        }
      }

      if (Array.isArray(data.spells)) {
        data.spells.forEach(sp => {
          const item = spellPanel.createDiv({ cls: "dnd55-feature-item" });
          item.createDiv({ cls: "dnd55-feature-title", text: `✨ ${sp.name || sp}` });
          if (sp.desc) item.createDiv({ cls: "dnd55-feature-desc", text: String(sp.desc) });
        });
      }
    }

    // Class & Species Features
    const featPanel = col3.createDiv({ cls: "dnd55-panel" });
    featPanel.createDiv({ cls: "dnd55-panel-title", text: "Умения и Особенности" });

    const features = data.features || [];
    features.forEach(f => {
      const item = featPanel.createDiv({ cls: "dnd55-feature-item" });
      const fHead = item.createDiv({ cls: "dnd55-feature-header" });
      fHead.createDiv({ cls: "dnd55-feature-title", text: String(f.name) });
      if (f.uses) {
        const uGroup = fHead.createDiv({ cls: "dnd55-pip-group" });
        uGroup.createSpan({ text: `${f.uses}: `, cls: "dnd55-feature-uses" });
        const count = f.count || 1;
        for (let i = 0; i < count; i++) {
          const p = uGroup.createSpan({ cls: "dnd55-pip checked-slot" });
          p.onclick = () => p.toggleClass("checked-slot");
        }
      }
      if (f.desc) item.createDiv({ cls: "dnd55-feature-desc", text: String(f.desc) });
    });

    // Equipment & Coins
    const eqPanel = col3.createDiv({ cls: "dnd55-panel" });
    eqPanel.createDiv({ cls: "dnd55-panel-title", text: "Снаряжение и Монеты" });
    
    const coinsGrid = eqPanel.createDiv({ cls: "dnd55-coins-grid" });
    const coins = data.coins || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
    [
      { label: "ММ", val: coins.cp || 0 },
      { label: "СМ", val: coins.sp || 0 },
      { label: "ЭМ", val: coins.ep || 0 },
      { label: "ЗМ", val: coins.gp || 0 },
      { label: "ПМ", val: coins.pp || 0 }
    ].forEach(c => {
      const cell = coinsGrid.createDiv({ cls: "dnd55-coin-cell" });
      cell.createDiv({ cls: "dnd55-coin-label", text: c.label });
      cell.createDiv({ cls: "dnd55-coin-val", text: String(c.val) });
    });

    if (data.equipment) {
      eqPanel.createDiv({ text: String(data.equipment), cls: "dnd55-feature-desc dnd55-eq-text" });
    }

    // Roleplay (5.5e Personality)
    if (data.personality || data.secret_goal) {
      const rpPanel = col3.createDiv({ cls: "dnd55-panel" });
      rpPanel.createDiv({ cls: "dnd55-panel-title", text: "Отыгрыш и Цели" });
      
      const addRpItem = (label, val, icon = "•") => {
        if (!val) return;
        const div = rpPanel.createDiv({ cls: "dnd55-rp-item" });
        div.createSpan({ cls: "dnd55-rp-label", text: `${icon} ${label}: ` });
        div.createSpan({ cls: "dnd55-rp-val", text: String(val) });
      };

      if (data.personality) {
        addRpItem("Черта", data.personality.trait);
        addRpItem("Идеал", data.personality.ideal);
        addRpItem("Привязанность", data.personality.bond);
        addRpItem("Слабость", data.personality.flaw);
      }
      if (data.secret_goal) {
        addRpItem("Секретная цель", data.secret_goal, "🎯");
      }
    }
  }
};

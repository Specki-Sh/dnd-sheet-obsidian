const { Plugin, parseYaml, Notice, Modal } = require("obsidian");

// ============================================================================
// CHARACTER EDITOR MODAL (Fully Adaptive In-Interface Editor 2024 PHB)
// ============================================================================
class CharacterEditorModal extends Modal {
  constructor(app, plugin, data, ctx, originalSource, onSaveCallback) {
    super(app);
    this.plugin = plugin;
    this.data = JSON.parse(JSON.stringify(data));
    this.ctx = ctx;
    this.originalSource = originalSource;
    this.onSaveCallback = onSaveCallback;
    this.activeTab = "main";
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("dnd55-modal-container");

    const mHead = contentEl.createDiv({ cls: "dnd55-m-header" });
    mHead.createEl("h3", { text: `✏️ Редактирование: ${this.data.name || "Персонаж"}` });
    mHead.createEl("small", { text: "D&D 5.5e (2024 Player's Handbook) • Автосохранение в заметку без ошибок YAML" });

    const tabsBar = contentEl.createDiv({ cls: "dnd55-m-tabs" });
    const tabDefs = [
      { id: "main", label: "📋 Основное" },
      { id: "stats", label: "💪 Характеристики" },
      { id: "combat", label: "⚔️ Бой и Хиты" },
      { id: "skills", label: "🎯 Навыки 2024" },
      { id: "attacks", label: "🗡️ Оружие и Мастерство" },
      { id: "spells", label: "✨ Магия и Умения" },
      { id: "equipment", label: "🎒 Снаряжение и Цели" }
    ];

    const tabButtons = {};
    const panelsContainer = contentEl.createDiv({ cls: "dnd55-m-panels" });
    const panels = {};

    tabDefs.forEach(t => {
      const btn = tabsBar.createEl("button", { cls: `dnd55-m-tab-btn ${t.id === this.activeTab ? "active" : ""}`, text: t.label });
      tabButtons[t.id] = btn;
      
      const panel = panelsContainer.createDiv({ cls: `dnd55-m-panel ${t.id === this.activeTab ? "active" : ""}` });
      panels[t.id] = panel;

      btn.onclick = () => {
        Object.values(tabButtons).forEach(b => b.removeClass("active"));
        Object.values(panels).forEach(p => p.removeClass("active"));
        btn.addClass("active");
        panel.addClass("active");
        this.activeTab = t.id;
      };
    });

    const createField = (parent, label, val, onChange, type = "text", placeholder = "") => {
      const group = parent.createDiv({ cls: "dnd55-m-group" });
      if (label) group.createEl("label", { text: label, cls: "dnd55-m-label" });
      const input = group.createEl(type === "textarea" ? "textarea" : "input", { cls: "dnd55-m-input" });
      if (type !== "textarea") input.type = type;
      input.value = val !== undefined && val !== null ? String(val) : "";
      if (placeholder) input.placeholder = placeholder;
      input.oninput = () => onChange(type === "number" ? (input.value === "" ? 0 : Number(input.value)) : input.value);
      return input;
    };

    // PANEL 1: MAIN
    const pMain = panels["main"];
    const gridMain = pMain.createDiv({ cls: "dnd55-m-grid-2" });
    createField(gridMain, "Имя персонажа", this.data.name, v => this.data.name = v, "text", "Гриз");
    createField(gridMain, "Класс и уровень", this.data.class, v => this.data.class = v, "text", "Воин 2 уровня");
    createField(gridMain, "Вид / Народ (Species)", this.data.species, v => this.data.species = v, "text", "Гоблин");
    createField(gridMain, "Предыстория", this.data.background, v => this.data.background = v, "text", "Солдат");
    createField(gridMain, "Мировоззрение", this.data.alignment, v => this.data.alignment = v, "text", "Хаотично-нейтральный");
    createField(gridMain, "Опыт (XP)", this.data.xp, v => this.data.xp = v, "text", "300 XP");
    createField(gridMain, "Игрок", this.data.player, v => this.data.player = v, "text", "Имя игрока");
    createField(gridMain, "Портрет (URL или [[файл.png]])", this.data.portrait || this.data.image, v => {
      this.data.portrait = v;
      this.data.image = v;
    }, "text", "[[portrait.png]] или https://...");

    // PANEL 2: STATS
    const pStats = panels["stats"];
    pStats.createEl("h4", { text: "Базовые характеристики D&D 2024", cls: "dnd55-m-section-title" });
    
    const abGrid = pStats.createDiv({ cls: "dnd55-m-abilities-grid" });
    if (!this.data.abilities) this.data.abilities = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    if (!Array.isArray(this.data.saves)) this.data.saves = [];

    const abDefs = [
      { k: "str", name: "СИЛА" },
      { k: "dex", name: "ЛОВКОСТЬ" },
      { k: "con", name: "ТЕЛОСЛОЖЕНИЕ" },
      { k: "int", name: "ИНТЕЛЛЕКТ" },
      { k: "wis", name: "МУДРОСТЬ" },
      { k: "cha", name: "ХАРИЗМА" }
    ];

    abDefs.forEach(ab => {
      const card = abGrid.createDiv({ cls: "dnd55-m-stat-card" });
      card.createDiv({ cls: "dnd55-m-stat-name", text: ab.name });
      
      const input = card.createEl("input", { cls: "dnd55-m-input dnd55-m-stat-input" });
      input.type = "number";
      input.value = String(this.data.abilities[ab.k] || 10);
      
      const modPreview = card.createDiv({ cls: "dnd55-m-stat-mod" });
      const updateMod = (score) => {
        const m = Math.floor((score - 10) / 2);
        modPreview.setText(m >= 0 ? `+${m}` : `${m}`);
      };
      updateMod(Number(input.value));

      input.oninput = () => {
        const val = Number(input.value) || 10;
        this.data.abilities[ab.k] = val;
        updateMod(val);
      };

      const saveCheck = card.createDiv({ cls: "dnd55-m-check-row" });
      const cb = saveCheck.createEl("input");
      cb.type = "checkbox";
      cb.checked = this.data.saves.includes(ab.k);
      saveCheck.createSpan({ text: " Спас" });
      cb.onchange = () => {
        if (cb.checked) {
          if (!this.data.saves.includes(ab.k)) this.data.saves.push(ab.k);
        } else {
          this.data.saves = this.data.saves.filter(s => s !== ab.k);
        }
      };
    });

    const metaRow = pStats.createDiv({ cls: "dnd55-m-grid-2", style: "margin-top: 14px;" });
    createField(metaRow, "Бонус мастерства (PB)", this.data.pb !== undefined ? this.data.pb : 2, v => this.data.pb = v, "number");
    
    const inspGroup = metaRow.createDiv({ cls: "dnd55-m-group" });
    inspGroup.createEl("label", { text: "Героическое вдохновение (2024)", cls: "dnd55-m-label" });
    const inspLabelRow = inspGroup.createDiv({ cls: "dnd55-m-check-row", style: "margin-top: 6px;" });
    const inspCb = inspLabelRow.createEl("input");
    inspCb.type = "checkbox";
    inspCb.checked = !!this.data.inspiration;
    inspLabelRow.createSpan({ text: " Есть вдохновение (★)" });
    inspCb.onchange = () => this.data.inspiration = inspCb.checked;

    createField(pStats, "Языки", this.data.languages, v => this.data.languages = v, "text", "Гоблинский, Общий");
    createField(pStats, "Владение доспехами, оружием и инструментами", this.data.proficiencies, v => this.data.proficiencies = v, "text", "Все доспехи, щиты, воинское оружие");

    // PANEL 3: COMBAT & HP
    const pCombat = panels["combat"];
    pCombat.createEl("h4", { text: "Боевые показатели и Здоровье", cls: "dnd55-m-section-title" });

    const gridCombat = pCombat.createDiv({ cls: "dnd55-m-grid-4" });
    createField(gridCombat, "КД (Броня)", this.data.ac, v => this.data.ac = v, "number", "15");
    createField(gridCombat, "Инициатива", this.data.initiative, v => this.data.initiative = v, "number", "3");
    createField(gridCombat, "Скорость (фт.)", this.data.speed, v => this.data.speed = v, "number", "30");
    createField(gridCombat, "Размер", this.data.size, v => this.data.size = v, "text", "Маленький");

    const hpSection = pCombat.createDiv({ cls: "dnd55-m-grid-3", style: "margin-top: 12px;" });
    createField(hpSection, "Текущие HP", this.data.hp, v => this.data.hp = v, "number", "20");
    createField(hpSection, "Максимум HP", this.data.max_hp, v => this.data.max_hp = v, "number", "20");
    createField(hpSection, "Временные HP", this.data.temp_hp, v => this.data.temp_hp = v, "number", "0");

    const hdSection = pCombat.createDiv({ cls: "dnd55-m-grid-3", style: "margin-top: 12px;" });
    createField(hdSection, "Тип кости хитов", this.data.hit_dice, v => this.data.hit_dice = v, "text", "1d10");
    createField(hdSection, "Количество костей хитов", this.data.hit_dice_count, v => this.data.hit_dice_count = v, "number", "2");
    createField(hdSection, "Настройка на предметы (0-3)", this.data.attunement !== undefined ? this.data.attunement : 0, v => this.data.attunement = v, "number", "0");

    createField(pCombat, "Бонусное действие (Quick Reference)", this.data.bonus_actions, v => this.data.bonus_actions = v, "text", "Второе дыхание (хит 1d10+2)");
    createField(pCombat, "Реакция (Quick Reference)", this.data.reactions, v => this.data.reactions = v, "text", "Провоцированная атака");

    // PANEL 4: SKILLS 2024 (Grouped by Ability)
    const pSkills = panels["skills"];
    pSkills.createEl("h4", { text: "Навыки (сгруппированы по характеристикам D&D 2024)", cls: "dnd55-m-section-title" });
    if (!this.data.skills) this.data.skills = {};

    const abilitySkillGroups = [
      {
        title: "СИЛА (STR)",
        skills: [{ id: "атлетика", name: "Атлетика" }]
      },
      {
        title: "ЛОВКОСТЬ (DEX)",
        skills: [
          { id: "акробатика", name: "Акробатика" },
          { id: "ловкость рук", name: "Ловкость рук" },
          { id: "скрытность", name: "Скрытность" }
        ]
      },
      {
        title: "ИНТЕЛЛЕКТ (INT)",
        skills: [
          { id: "анализ", name: "Анализ" },
          { id: "история", name: "История" },
          { id: "магия", name: "Магия" },
          { id: "природа", name: "Природа" },
          { id: "религия", name: "Религия" }
        ]
      },
      {
        title: "МУДРОСТЬ (WIS)",
        skills: [
          { id: "внимательность", name: "Внимательность" },
          { id: "выживание", name: "Выживание" },
          { id: "медицина", name: "Медицина" },
          { id: "проницательность", name: "Проницательность" },
          { id: "уход за животными", name: "Уход за животными" }
        ]
      },
      {
        title: "ХАРИЗМА (CHA)",
        skills: [
          { id: "выступление", name: "Выступление" },
          { id: "запугивание", name: "Запугивание" },
          { id: "обман", name: "Обман" },
          { id: "убеждение", name: "Убеждение" }
        ]
      }
    ];

    const sGroupsWrap = pSkills.createDiv({ cls: "dnd55-m-skill-groups" });
    abilitySkillGroups.forEach(grp => {
      const gBox = sGroupsWrap.createDiv({ cls: "dnd55-m-skill-group-box" });
      gBox.createEl("div", { text: grp.title, cls: "dnd55-m-skill-group-title" });
      
      const sGrid = gBox.createDiv({ cls: "dnd55-m-skills-grid" });
      grp.skills.forEach(s => {
        const row = sGrid.createDiv({ cls: "dnd55-m-skill-row" });
        row.createDiv({ cls: "dnd55-m-skill-name", text: s.name });
        
        const select = row.createEl("select", { cls: "dnd55-m-select" });
        [
          { val: "none", text: "— Нет" },
          { val: "prof", text: "● Владение" },
          { val: "expert", text: "✪ Экспертиза" }
        ].forEach(opt => {
          const el = select.createEl("option", { value: opt.val, text: opt.text });
          const curStatus = this.data.skills[s.id] || "none";
          if (curStatus === opt.val) el.selected = true;
        });

        select.onchange = () => {
          if (select.value === "none") {
            delete this.data.skills[s.id];
          } else {
            this.data.skills[s.id] = select.value;
          }
        };
      });
    });

    // PANEL 5: ATTACKS & WEAPON MASTERY
    const pAttacks = panels["attacks"];
    pAttacks.createEl("h4", { text: "Оружие и Свойства Мастерства (Weapon Mastery 2024)", cls: "dnd55-m-section-title" });
    if (!Array.isArray(this.data.attacks)) this.data.attacks = [];

    const atkContainer = pAttacks.createDiv({ cls: "dnd55-m-attacks-list" });

    const renderAttacks = () => {
      atkContainer.empty();
      this.data.attacks.forEach((atk, idx) => {
        const row = atkContainer.createDiv({ cls: "dnd55-m-atk-card" });
        const rHead = row.createDiv({ cls: "dnd55-m-atk-head" });
        rHead.createEl("strong", { text: `⚔️ Оружие #${idx + 1}` });
        
        const delBtn = rHead.createEl("button", { cls: "dnd55-m-btn-del", text: "🗑 Удалить" });
        delBtn.onclick = () => {
          this.data.attacks.splice(idx, 1);
          renderAttacks();
        };

        const grid = row.createDiv({ cls: "dnd55-m-grid-4" });
        createField(grid, "Название оружия", atk.name, v => atk.name = v, "text", "Короткий меч");
        createField(grid, "Бонус атаки", atk.bonus, v => atk.bonus = v, "text", "+5");
        createField(grid, "Урон и тип", atk.damage, v => atk.damage = v, "text", "1d6+3 колющий");
        createField(grid, "Дистанция", atk.range, v => atk.range = v, "text", "5 фт.");
        
        const mGroup = row.createDiv({ cls: "dnd55-m-group", style: "margin-top: 6px;" });
        mGroup.createEl("label", { text: "Свойство Мастерства 5.5e (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex)", cls: "dnd55-m-label" });
        createField(mGroup, "", atk.mastery, v => atk.mastery = v, "text", "Задевание (Graze) или Опрокидывание (Topple)");
      });
    };
    renderAttacks();

    const addAtkBtn = pAttacks.createEl("button", { cls: "dnd55-tool-btn", text: "+ Добавить оружие / атаку", style: "margin-top: 10px;" });
    addAtkBtn.onclick = () => {
      this.data.attacks.push({ name: "Новое оружие", bonus: "+4", damage: "1d6+2", range: "5 фт.", mastery: "" });
      renderAttacks();
    };

    // PANEL 6: SPELLS & FEATURES
    const pSpells = panels["spells"];
    pSpells.createEl("h4", { text: "Заклинания и Магия (Spellcasting)", cls: "dnd55-m-section-title" });
    const spGrid = pSpells.createDiv({ cls: "dnd55-m-grid-3" });
    createField(spGrid, "Сл спасброска магии", this.data.spell_save_dc, v => this.data.spell_save_dc = v, "number", "13");
    createField(spGrid, "Бонус атаки магии", this.data.spell_attack, v => this.data.spell_attack = v, "text", "+5");
    createField(spGrid, "Ячейки 1 круга", this.data.spell_slots_1, v => this.data.spell_slots_1 = v, "number", "3");

    pSpells.createEl("h4", { text: "Умения и Особенности (Features)", cls: "dnd55-m-section-title", style: "margin-top: 16px;" });
    if (!Array.isArray(this.data.features)) this.data.features = [];

    const featContainer = pSpells.createDiv({ cls: "dnd55-m-features-list" });
    const renderFeatures = () => {
      featContainer.empty();
      this.data.features.forEach((f, idx) => {
        const fCard = featContainer.createDiv({ cls: "dnd55-m-feat-card" });
        const fHead = fCard.createDiv({ cls: "dnd55-m-atk-head" });
        fHead.createEl("strong", { text: `✨ Умение #${idx + 1}` });
        
        const delBtn = fHead.createEl("button", { cls: "dnd55-m-btn-del", text: "🗑 Удалить" });
        delBtn.onclick = () => {
          this.data.features.splice(idx, 1);
          renderFeatures();
        };

        const fGrid = fCard.createDiv({ cls: "dnd55-m-grid-3" });
        createField(fGrid, "Название", f.name, v => f.name = v, "text", "Второе дыхание");
        createField(fGrid, "Перезарядка", f.uses, v => f.uses = v, "text", "Короткий отдых");
        createField(fGrid, "Количество", f.count || 1, v => f.count = v, "number", "1");
        
        createField(fCard, "Описание", f.desc, v => f.desc = v, "textarea", "Текст способности");
      });
    };
    renderFeatures();

    const addFeatBtn = pSpells.createEl("button", { cls: "dnd55-tool-btn", text: "+ Добавить умение", style: "margin-top: 10px;" });
    addFeatBtn.onclick = () => {
      this.data.features.push({ name: "Новое умение", uses: "", count: 1, desc: "" });
      renderFeatures();
    };

    // PANEL 7: EQUIPMENT & ROLEPLAY
    const pEq = panels["equipment"];
    pEq.createEl("h4", { text: "Монеты и Сокровища", cls: "dnd55-m-section-title" });
    if (!this.data.coins) this.data.coins = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
    const coinsGrid = pEq.createDiv({ cls: "dnd55-m-grid-5" });
    createField(coinsGrid, "ММ (Медь)", this.data.coins.cp, v => this.data.coins.cp = v, "number");
    createField(coinsGrid, "СМ (Серебро)", this.data.coins.sp, v => this.data.coins.sp = v, "number");
    createField(coinsGrid, "ЭМ (Электрум)", this.data.coins.ep, v => this.data.coins.ep = v, "number");
    createField(coinsGrid, "ЗМ (Золото)", this.data.coins.gp, v => this.data.coins.gp = v, "number");
    createField(coinsGrid, "ПМ (Платина)", this.data.coins.pp, v => this.data.coins.pp = v, "number");

    createField(pEq, "Снаряжение и Инвентарь", this.data.equipment, v => this.data.equipment = v, "textarea", "Список снаряжения...");

    pEq.createEl("h4", { text: "Отыгрыш и Личность", cls: "dnd55-m-section-title", style: "margin-top: 14px;" });
    if (!this.data.personality) this.data.personality = {};
    createField(pEq, "Черта характера", this.data.personality.trait, v => this.data.personality.trait = v, "text");
    createField(pEq, "Идеал", this.data.personality.ideal, v => this.data.personality.ideal = v, "text");
    createField(pEq, "Привязанность", this.data.personality.bond, v => this.data.personality.bond = v, "text");
    createField(pEq, "Слабость", this.data.personality.flaw, v => this.data.personality.flaw = v, "text");
    createField(pEq, "🎯 Секретная цель", this.data.secret_goal, v => this.data.secret_goal = v, "text");

    // FOOTER
    const mFoot = contentEl.createDiv({ cls: "dnd55-m-footer" });
    const cancelBtn = mFoot.createEl("button", { cls: "dnd55-tool-btn", text: "✕ Отмена" });
    cancelBtn.onclick = () => this.close();

    const saveBtn = mFoot.createEl("button", { cls: "dnd55-tool-btn dnd55-btn-save", text: "💾 Сохранить в заметку" });
    saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      saveBtn.setText("⏳ Сохранение...");
      const ok = await this.plugin.saveCharacterData(this.data, this.ctx, this.originalSource);
      if (ok) {
        if (this.onSaveCallback) this.onSaveCallback(this.data);
        this.close();
      } else {
        saveBtn.disabled = false;
        saveBtn.setText("💾 Сохранить в заметку");
      }
    };
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ============================================================================
// HP QUICK PROMPT MODAL
// ============================================================================
class HpPromptModal extends Modal {
  constructor(app, currentHp, maxHp, onConfirm) {
    super(app);
    this.currentHp = currentHp;
    this.maxHp = maxHp;
    this.onConfirm = onConfirm;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("dnd55-modal-container");
    contentEl.style.maxWidth = "400px";

    contentEl.createEl("h3", { text: "❤️ Изменение очков здоровья" });
    contentEl.createEl("p", { 
      text: `Текущие хиты: ${this.currentHp} / ${this.maxHp}. Введите урон (-7), лечение (+5) или новое значение (14):`,
      style: "font-size: 0.85em; color: var(--text-muted); margin-bottom: 12px;"
    });

    const input = contentEl.createEl("input", { cls: "dnd55-m-input" });
    input.type = "text";
    input.placeholder = "-7 или +5 или 14";
    input.style.fontSize = "1.25em";
    input.style.textAlign = "center";
    input.style.marginBottom = "14px";
    input.focus();

    const btnRow = contentEl.createDiv({ cls: "dnd55-m-footer" });
    const cancelBtn = btnRow.createEl("button", { cls: "dnd55-tool-btn", text: "Отмена" });
    cancelBtn.onclick = () => this.close();

    const applyBtn = btnRow.createEl("button", { cls: "dnd55-tool-btn dnd55-btn-save", text: "Применить" });
    
    const submit = () => {
      const val = input.value.trim();
      if (!val) return;
      let newHp = this.currentHp;
      if (val.startsWith("+")) {
        const delta = parseInt(val.slice(1), 10) || 0;
        newHp = Math.min(this.maxHp, this.currentHp + delta);
      } else if (val.startsWith("-")) {
        const delta = parseInt(val.slice(1), 10) || 0;
        newHp = Math.max(0, this.currentHp - delta);
      } else {
        const num = parseInt(val, 10);
        if (!isNaN(num)) newHp = Math.max(0, num);
      }
      this.onConfirm(newHp);
      this.close();
    };

    applyBtn.onclick = submit;
    input.onkeydown = (e) => {
      if (e.key === "Enter") submit();
    };
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ============================================================================
// MAIN PLUGIN CLASS (Authentic D&D 2024 Layout & Native Obsidian Theming)
// ============================================================================
module.exports = class DnD55eSheetPlugin extends Plugin {
  async onload() {
    this.registerMarkdownCodeBlockProcessor("dnd-55e", (source, el, ctx) => {
      this.renderSheet(source, el, ctx);
    });

    this.registerMarkdownCodeBlockProcessor("dnd-sheet", (source, el, ctx) => {
      this.renderSheet(source, el, ctx);
    });
  }

  resolveImageUrl(imageRef) {
    if (!imageRef) return null;
    let ref = String(imageRef).trim();
    if (ref.startsWith("[[") && ref.endsWith("]]")) {
      ref = ref.slice(2, -2).trim();
    }
    if (ref.startsWith("http://") || ref.startsWith("https://") || ref.startsWith("data:")) {
      return ref;
    }
    try {
      if (this.app && this.app.metadataCache && this.app.vault) {
        const file = this.app.metadataCache.getFirstLinkpathDest(ref, "") || this.app.vault.getAbstractFileByPath(ref);
        if (file) {
          return this.app.vault.getResourcePath(file);
        }
      }
    } catch (e) {
      // fallback
    }
    return ref;
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

  serializeYaml(data) {
    const lines = [];
    const quote = (s) => JSON.stringify(String(s !== undefined && s !== null ? s : ""));

    lines.push(`name: ${quote(data.name || "")}`);
    lines.push(`class: ${quote(data.class || "")}`);
    lines.push(`species: ${quote(data.species || "Гоблин")}`);
    lines.push(`background: ${quote(data.background || "")}`);
    lines.push(`alignment: ${quote(data.alignment || "")}`);
    lines.push(`xp: ${quote(data.xp || "300 XP")}`);
    lines.push(`player: ${quote(data.player || "—")}`);
    if (data.portrait || data.image) {
      lines.push(`portrait: ${quote(data.portrait || data.image)}`);
    }
    lines.push(`inspiration: ${data.inspiration ? "true" : "false"}`);
    lines.push(`pb: ${data.pb !== undefined ? data.pb : 2}`);
    lines.push(`size: ${quote(data.size || "Маленький")}`);
    lines.push(`speed: ${data.speed !== undefined ? data.speed : 30}`);
    lines.push(`ac: ${data.ac !== undefined ? data.ac : 10}`);
    lines.push(`initiative: ${data.initiative !== undefined ? data.initiative : 0}`);
    lines.push(`hp: ${data.hp !== undefined ? data.hp : 10}`);
    lines.push(`max_hp: ${data.max_hp !== undefined ? data.max_hp : (data.hp || 10)}`);
    if (data.temp_hp) lines.push(`temp_hp: ${data.temp_hp}`);
    lines.push(`hit_dice: ${quote(data.hit_dice || "1d10")}`);
    lines.push(`hit_dice_count: ${data.hit_dice_count !== undefined ? data.hit_dice_count : 1}`);
    if (data.attunement !== undefined) lines.push(`attunement: ${data.attunement}`);

    lines.push(`abilities:`);
    const ab = data.abilities || {};
    lines.push(`  str: ${ab.str !== undefined ? ab.str : 10}`);
    lines.push(`  dex: ${ab.dex !== undefined ? ab.dex : 10}`);
    lines.push(`  con: ${ab.con !== undefined ? ab.con : 10}`);
    lines.push(`  int: ${ab.int !== undefined ? ab.int : 10}`);
    lines.push(`  wis: ${ab.wis !== undefined ? ab.wis : 10}`);
    lines.push(`  cha: ${ab.cha !== undefined ? ab.cha : 10}`);

    if (Array.isArray(data.saves) && data.saves.length > 0) {
      lines.push(`saves:`);
      data.saves.forEach(s => lines.push(`  - ${s}`));
    }

    if (data.skills && Object.keys(data.skills).length > 0) {
      lines.push(`skills:`);
      for (const [k, v] of Object.entries(data.skills)) {
        lines.push(`  ${quote(k)}: ${v}`);
      }
    }

    if (data.languages) lines.push(`languages: ${quote(data.languages)}`);
    if (data.proficiencies) lines.push(`proficiencies: ${quote(data.proficiencies)}`);

    if (Array.isArray(data.attacks) && data.attacks.length > 0) {
      lines.push(`attacks:`);
      data.attacks.forEach(atk => {
        lines.push(`  - name: ${quote(atk.name || "")}`);
        lines.push(`    bonus: ${quote(atk.bonus || "+0")}`);
        lines.push(`    damage: ${quote(atk.damage || "1d6")}`);
        if (atk.range) lines.push(`    range: ${quote(atk.range)}`);
        if (atk.mastery) lines.push(`    mastery: ${quote(atk.mastery)}`);
      });
    }

    if (data.bonus_actions) lines.push(`bonus_actions: ${quote(data.bonus_actions)}`);
    if (data.reactions) lines.push(`reactions: ${quote(data.reactions)}`);

    if (data.spell_save_dc) lines.push(`spell_save_dc: ${data.spell_save_dc}`);
    if (data.spell_attack) lines.push(`spell_attack: ${quote(data.spell_attack)}`);
    if (data.spell_slots_1) lines.push(`spell_slots_1: ${data.spell_slots_1}`);
    if (Array.isArray(data.spells) && data.spells.length > 0) {
      lines.push(`spells:`);
      data.spells.forEach(sp => {
        lines.push(`  - name: ${quote(sp.name || "")}`);
        if (sp.desc) lines.push(`    desc: ${quote(sp.desc)}`);
      });
    }

    if (Array.isArray(data.features) && data.features.length > 0) {
      lines.push(`features:`);
      data.features.forEach(f => {
        lines.push(`  - name: ${quote(f.name || "")}`);
        if (f.uses) lines.push(`    uses: ${quote(f.uses)}`);
        if (f.count) lines.push(`    count: ${f.count}`);
        if (f.desc) lines.push(`    desc: ${quote(f.desc)}`);
      });
    }

    const c = data.coins || {};
    lines.push(`coins:`);
    lines.push(`  cp: ${c.cp || 0}`);
    lines.push(`  sp: ${c.sp || 0}`);
    lines.push(`  ep: ${c.ep || 0}`);
    lines.push(`  gp: ${c.gp || 0}`);
    lines.push(`  pp: ${c.pp || 0}`);

    if (data.equipment) lines.push(`equipment: ${quote(data.equipment)}`);

    if (data.personality) {
      lines.push(`personality:`);
      if (data.personality.trait) lines.push(`  trait: ${quote(data.personality.trait)}`);
      if (data.personality.ideal) lines.push(`  ideal: ${quote(data.personality.ideal)}`);
      if (data.personality.bond) lines.push(`  bond: ${quote(data.personality.bond)}`);
      if (data.personality.flaw) lines.push(`  flaw: ${quote(data.personality.flaw)}`);
    }
    if (data.secret_goal) lines.push(`secret_goal: ${quote(data.secret_goal)}`);

    return lines.join("\n");
  }

  async saveCharacterData(updatedData, ctx, originalSource) {
    let file = null;
    if (ctx && ctx.sourcePath) {
      file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
    }
    if (!file) {
      file = this.app.workspace.getActiveFile();
    }
    if (!file) {
      new Notice("❌ Не удалось найти файл заметки для сохранения.");
      return false;
    }

    try {
      const content = await this.app.vault.read(file);
      const newYaml = this.serializeYaml(updatedData);
      let replaced = false;

      if (originalSource && content.includes(originalSource.trim())) {
        const newFileContent = content.replace(originalSource.trim(), newYaml.trim());
        await this.app.vault.modify(file, newFileContent);
        replaced = true;
      } else {
        const regex = /(```(?:dnd-55e|dnd-sheet)\n)([\s\S]*?)(\n```)/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
          const blockContent = match[2];
          if (blockContent.includes(`"${updatedData.name}"`) || blockContent.includes(updatedData.name) || !replaced) {
            const fullMatch = match[0];
            const newBlock = `${match[1]}${newYaml.trim()}${match[3]}`;
            const newFileContent = content.substring(0, match.index) + newBlock + content.substring(match.index + fullMatch.length);
            await this.app.vault.modify(file, newFileContent);
            replaced = true;
            break;
          }
        }
      }

      if (replaced) {
        new Notice(`✅ Лист «${updatedData.name}» сохранён!`, 2000);
        return true;
      } else {
        new Notice("⚠️ Не удалось найти блок листа в тексте заметки.", 3500);
        return false;
      }
    } catch (e) {
      new Notice(`❌ Ошибка сохранения: ${e.message}`, 4000);
      return false;
    }
  }

  updateHpColor(el, cur, max) {
    const ratio = cur / (max || 1);
    if (ratio > 0.5) {
      el.style.color = "var(--text-success, #2ecc71)";
    } else if (ratio > 0.25) {
      el.style.color = "var(--text-warning, #f39c12)";
    } else {
      el.style.color = "var(--text-error, #e74c3c)";
    }
  }

  openFullscreen(data, ctx, source) {
    const existing = document.querySelector(".dnd55-fs-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.className = "dnd55-fs-overlay";

    const topbar = overlay.createDiv({ cls: "dnd55-fs-topbar" });
    
    const titleBox = topbar.createDiv({ cls: "dnd55-fs-title-box" });
    titleBox.createSpan({ text: data.name || "Безымянный герой", cls: "dnd55-fs-title-name" });
    titleBox.createSpan({ text: ` • ${data.species || "Гоблин"} • ${data.class || ""}`, cls: "dnd55-fs-title-sub" });

    const actions = topbar.createDiv({ cls: "dnd55-fs-actions" });

    const editBtn = actions.createEl("button", { cls: "dnd55-tool-btn dnd55-btn-edit", text: "✏️ Заполнить / Редактировать" });
    editBtn.onclick = () => {
      new CharacterEditorModal(this.app, this, data, ctx, source, (updated) => {
        data = updated;
        bodyWrap.empty();
        this.renderSheetContent(data, bodyWrap, ctx, source, true);
      }).open();
    };

    const closeBtn = actions.createEl("button", { cls: "dnd55-tool-btn dnd55-btn-close", text: "✕ Закрыть (Esc)" });

    const closeOverlay = () => {
      document.removeEventListener("keydown", escHandler);
      overlay.remove();
    };

    const escHandler = (e) => {
      if (e.key === "Escape") closeOverlay();
    };
    document.addEventListener("keydown", escHandler);
    closeBtn.onclick = closeOverlay;

    const scrollContainer = overlay.createDiv({ cls: "dnd55-fs-scroll-container" });
    const bodyWrap = scrollContainer.createDiv({ cls: "dnd55-fs-body dnd55-sheet" });
    
    this.renderSheetContent(data, bodyWrap, ctx, source, true);

    document.body.appendChild(overlay);
  }

  renderSheet(source, el, ctx) {
    let data;
    try {
      data = parseYaml(source);
    } catch (e) {
      const errBox = el.createDiv({ cls: "dnd55-error" });
      errBox.createEl("h4", { text: "⚠️ Ошибка разбора карточки персонажа" });
      errBox.createEl("p", { text: e.message });
      errBox.createEl("small", { text: "Подсказка: используйте кнопку «✏️ Редактировать» для заполнения без ошибок синтаксиса." });
      return;
    }

    if (!data || typeof data !== "object") {
      el.createEl("div", { text: "Ошибка: данные чарлиста пусты.", cls: "dnd55-error" });
      return;
    }

    el.empty();
    const sheet = el.createDiv({ cls: "dnd55-sheet" });

    // Top Toolbar in Normal Mode
    const topBar = sheet.createDiv({ cls: "dnd55-topbar" });
    topBar.createDiv({ cls: "dnd55-badge-edition", text: "D&D 5.5e (2024 PHB)" });

    const toolbar = topBar.createDiv({ cls: "dnd55-toolbar" });

    const editBtn = toolbar.createEl("button", { cls: "dnd55-tool-btn dnd55-btn-edit", text: "✏️ Редактировать" });
    editBtn.onclick = () => {
      new CharacterEditorModal(this.app, this, data, ctx, source, (updated) => {
        data = updated;
        sheet.empty();
        this.renderSheet(this.serializeYaml(data), el, ctx);
      }).open();
    };

    const scrollBtn = toolbar.createEl("button", { cls: "dnd55-tool-btn", text: "↔ 3 колонки" });
    scrollBtn.onclick = () => {
      sheet.toggleClass("dnd55-force-scroll", !sheet.hasClass("dnd55-force-scroll"));
      const isScroll = sheet.hasClass("dnd55-force-scroll");
      scrollBtn.setText(isScroll ? "⊞ Адаптивный вид" : "↔ 3 колонки");
      scrollBtn.toggleClass("active", isScroll);
    };

    const fsBtn = toolbar.createEl("button", { cls: "dnd55-tool-btn", text: "⛶ Во весь экран" });
    fsBtn.onclick = () => {
      this.openFullscreen(data, ctx, source);
    };

    this.renderSheetContent(data, sheet, ctx, source, false);
  }

  renderSheetContent(data, container, ctx, source, isFullscreen) {
    const pb = data.pb !== undefined ? data.pb : 2;
    const abilities = data.abilities || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    const strMod = this.calcMod(abilities.str);
    const dexMod = this.calcMod(abilities.dex);
    const conMod = this.calcMod(abilities.con);
    const intMod = this.calcMod(abilities.int);
    const wisMod = this.calcMod(abilities.wis);
    const chaMod = this.calcMod(abilities.cha);

    const mods = { str: strMod, dex: dexMod, con: conMod, int: intMod, wis: wisMod, cha: chaMod };
    const savesList = Array.isArray(data.saves) ? data.saves.map(s => String(s).toLowerCase()) : [];
    const profSkills = data.skills || {};

    // ========================================================================
    // HEADER BANNER (Authentic D&D 2024 Header Layout with Portrait Frame)
    // ========================================================================
    const header = container.createDiv({ cls: "dnd55-header" });
    
    // 1. Character Portrait Frame (Official D&D Appearance Box)
    const portraitFrame = header.createDiv({ cls: "dnd55-portrait-frame" });
    const portraitUrl = this.resolveImageUrl(data.portrait || data.image);

    if (portraitUrl) {
      const img = portraitFrame.createEl("img", { cls: "dnd55-portrait-img" });
      img.src = portraitUrl;
      img.alt = data.name || "Портрет";
    } else {
      const placeholder = portraitFrame.createDiv({ cls: "dnd55-portrait-placeholder" });
      placeholder.innerHTML = `
        <svg class="dnd55-avatar-svg" viewBox="0 0 100 120" preserveAspectRatio="xMidYMid meet">
          <circle cx="50" cy="38" r="22" class="dnd55-avatar-head" />
          <path d="M 14,105 C 14,75 32,68 50,68 C 68,68 86,75 86,105 Z" class="dnd55-avatar-body" />
        </svg>
        <span class="dnd55-portrait-text">+ Портрет</span>
      `;
    }
    portraitFrame.title = "Кликните для редактирования персонажа или портрета";
    portraitFrame.onclick = () => {
      new CharacterEditorModal(this.app, this, data, ctx, source, (updated) => {
        data = updated;
        if (isFullscreen) {
          container.empty();
          this.renderSheetContent(data, container, ctx, source, true);
        } else {
          const parentSheet = container.closest(".dnd55-sheet");
          if (parentSheet && parentSheet.parentElement) {
            parentSheet.empty();
            this.renderSheet(this.serializeYaml(data), parentSheet.parentElement, ctx);
          }
        }
      }).open();
    };

    const headerRight = header.createDiv({ cls: "dnd55-header-right" });

    const nameBox = headerRight.createDiv({ cls: "dnd55-name-box" });
    nameBox.createDiv({ cls: "dnd55-name-title", text: data.name || "Безымянный герой" });
    nameBox.createDiv({ cls: "dnd55-name-sub", text: `${data.species || "Гоблин"} • ${data.class || "Воин 2"}` });

    const metaGrid = headerRight.createDiv({ cls: "dnd55-meta-grid" });
    const metaFields = [
      { label: "Класс и уровень", val: data.class || "—" },
      { label: "Предыстория", val: data.background || "—" },
      { label: "Вид / Народ", val: data.species || "Гоблин" },
      { label: "Мировоззрение", val: data.alignment || "Нейтральный" },
      { label: "Опыт (XP)", val: data.xp || "300 XP" },
      { label: "Игрок", val: data.player || "—" }
    ];
    metaFields.forEach(f => {
      const item = metaGrid.createDiv({ cls: "dnd55-meta-item" });
      item.createDiv({ cls: "dnd55-meta-label", text: f.label });
      item.createDiv({ cls: "dnd55-meta-val", text: String(f.val) });
    });

    // ========================================================================
    // READINESS / COMBAT VITALS BAR (Authentic D&D Shields & Plaques)
    // ========================================================================
    const readinessBar = container.createDiv({ cls: "dnd55-readiness-bar" });

    // 1. Heroic Inspiration (Ribbon Banner)
    const inspBox = readinessBar.createDiv({ cls: `dnd55-vital-box dnd55-insp-box dnd55-ribbon-box ${data.inspiration ? "active" : ""}` });
    inspBox.innerHTML = `
      <svg class="dnd55-ribbon-svg" viewBox="0 0 120 70" preserveAspectRatio="none">
        <path class="dnd55-ribbon-outer" d="M 12,6 L 108,6 L 118,35 L 108,64 L 12,64 L 2,35 Z" />
        <path class="dnd55-ribbon-inner" d="M 17,11 L 103,11 L 111,35 L 103,59 L 17,59 L 9,35 Z" />
      </svg>
      <div class="dnd55-ribbon-body">
        <div class="dnd55-vital-label">Вдохновение</div>
        <div class="dnd55-vital-val">${data.inspiration ? "★ ДА" : "☆ НЕТ"}</div>
      </div>
    `;
    inspBox.title = "Кликните для переключения героического вдохновения (2024 PHB)";
    inspBox.onclick = async () => {
      data.inspiration = !data.inspiration;
      const valEl = inspBox.querySelector(".dnd55-vital-val");
      if (valEl) valEl.textContent = data.inspiration ? "★ ДА" : "☆ НЕТ";
      inspBox.toggleClass("active", data.inspiration);
      await this.saveCharacterData(data, ctx, source);
    };

    // 2. Proficiency Bonus (Medallion)
    const pbBox = readinessBar.createDiv({ cls: "dnd55-vital-box dnd55-pb-box dnd55-circle-box" });
    pbBox.innerHTML = `
      <svg class="dnd55-circle-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <circle class="dnd55-circle-outer" cx="50" cy="50" r="46" />
        <circle class="dnd55-circle-inner" cx="50" cy="50" r="40" />
      </svg>
      <div class="dnd55-circle-body">
        <div class="dnd55-vital-label">Мастерство</div>
        <div class="dnd55-vital-val">+${pb}</div>
      </div>
    `;

    // 3. Armor Class (Official Heraldic Shield Shape)
    const acBox = readinessBar.createDiv({ cls: "dnd55-vital-box dnd55-ac-box dnd55-ac-shield" });
    acBox.innerHTML = `
      <svg class="dnd55-shield-svg" viewBox="0 0 100 120" preserveAspectRatio="none">
        <path class="dnd55-shield-outer" d="M 6,6 L 94,6 Q 94,62 50,114 Q 6,62 6,6 Z" />
        <path class="dnd55-shield-inner" d="M 12,12 L 88,12 Q 88,60 50,106 Q 12,60 12,12 Z" />
      </svg>
      <div class="dnd55-shield-body">
        <div class="dnd55-shield-title">КЛАСС ДОСПЕХА</div>
        <div class="dnd55-shield-val">${data.ac !== undefined ? data.ac : 10 + dexMod}</div>
        <div class="dnd55-shield-sub">КД (AC)</div>
      </div>
    `;
    acBox.title = "Класс доспеха (Armor Class)";

    // 4. Initiative (Beveled Plaque)
    const initBonus = data.initiative !== undefined ? data.initiative : dexMod;
    const initBox = readinessBar.createDiv({ cls: "dnd55-vital-box dnd55-plaque-box dnd55-init-box" });
    initBox.innerHTML = `
      <svg class="dnd55-plaque-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon class="dnd55-plaque-outer" points="14,4 86,4 96,14 96,86 86,96 14,96 4,86 4,14" />
        <polygon class="dnd55-plaque-inner" points="18,10 82,10 90,18 90,82 82,90 18,90 10,82 10,18" />
      </svg>
      <div class="dnd55-plaque-body">
        <div class="dnd55-vital-label">Инициатива</div>
        <div class="dnd55-vital-val">${this.fmtMod(initBonus)}</div>
      </div>
    `;

    // 5. Speed (Beveled Plaque)
    const speedBox = readinessBar.createDiv({ cls: "dnd55-vital-box dnd55-plaque-box dnd55-speed-box" });
    speedBox.innerHTML = `
      <svg class="dnd55-plaque-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon class="dnd55-plaque-outer" points="14,4 86,4 96,14 96,86 86,96 14,96 4,86 4,14" />
        <polygon class="dnd55-plaque-inner" points="18,10 82,10 90,18 90,82 82,90 18,90 10,82 10,18" />
      </svg>
      <div class="dnd55-plaque-body">
        <div class="dnd55-vital-label">Скорость</div>
        <div class="dnd55-vital-val">${data.speed || 30}<span class="dnd55-unit"> фт</span></div>
      </div>
    `;

    // 6. Size (Beveled Plaque)
    const sizeStr = String(data.size || "Малый");
    const sizeBox = readinessBar.createDiv({ cls: "dnd55-vital-box dnd55-plaque-box dnd55-size-box" });
    sizeBox.innerHTML = `
      <svg class="dnd55-plaque-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon class="dnd55-plaque-outer" points="14,4 86,4 96,14 96,86 86,96 14,96 4,86 4,14" />
        <polygon class="dnd55-plaque-inner" points="18,10 82,10 90,18 90,82 82,90 18,90 10,82 10,18" />
      </svg>
      <div class="dnd55-plaque-body">
        <div class="dnd55-vital-label">Размер</div>
        <div class="dnd55-vital-val ${sizeStr.length > 5 ? "dnd55-vital-text" : ""}">${sizeStr}</div>
      </div>
    `;

    // 7. Passive Perception (Plaque)
    const percProf = profSkills["внимательность"] || (Array.isArray(data.prof_skills) && data.prof_skills.includes("Внимательность") ? "prof" : "none");
    const percBonus = (percProf === "expert" || percProf === 2 ? pb * 2 : (percProf === "prof" || percProf === 1 ? pb : 0)) + wisMod;
    const percBox = readinessBar.createDiv({ cls: "dnd55-vital-box dnd55-perc-box dnd55-plaque-box" });
    percBox.innerHTML = `
      <svg class="dnd55-plaque-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon class="dnd55-plaque-outer" points="14,4 86,4 96,14 96,86 86,96 14,96 4,86 4,14" />
        <polygon class="dnd55-plaque-inner" points="18,10 82,10 90,18 90,82 82,90 18,90 10,82 10,18" />
      </svg>
      <div class="dnd55-plaque-body">
        <div class="dnd55-vital-label">Пасс. воспр.</div>
        <div class="dnd55-vital-val">${10 + percBonus}</div>
      </div>
    `;

    // NAVIGATION PILLS (For quick jump on narrow displays)
    const navTabs = container.createDiv({ cls: "dnd55-nav-tabs" });
    const tab1 = navTabs.createEl("button", { cls: "dnd55-nav-tab", text: "📊 1. Характеристики и навыки 2024" });
    const tab2 = navTabs.createEl("button", { cls: "dnd55-nav-tab", text: "⚔️ 2. Бой и здоровье" });
    const tab3 = navTabs.createEl("button", { cls: "dnd55-nav-tab", text: "🔮 3. Магия и умения" });

    // GRID LAYOUT
    const grid = container.createDiv({ cls: "dnd55-grid" });

    // ========================================================================
    // COLUMN 1: OFFICIAL D&D 2024 ABILITY & SKILL BLOCKS
    // Skills and Saving Throws are grouped directly under their base ability!
    // ========================================================================
    const col1 = grid.createDiv({ cls: "dnd55-col" });
    tab1.onclick = () => col1.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });

    const abPanel = col1.createDiv({ cls: "dnd55-panel" });
    abPanel.createDiv({ cls: "dnd55-panel-title", text: "Характеристики и Навыки (D&D 2024 PHB)" });

    const ability2024Defs = [
      {
        key: "str",
        name: "СИЛА (STR)",
        score: abilities.str !== undefined ? abilities.str : 10,
        skills: [
          { id: "атлетика", name: "Атлетика" }
        ]
      },
      {
        key: "dex",
        name: "ЛОВКОСТЬ (DEX)",
        score: abilities.dex !== undefined ? abilities.dex : 10,
        skills: [
          { id: "акробатика", name: "Акробатика" },
          { id: "ловкость рук", name: "Ловкость рук" },
          { id: "скрытность", name: "Скрытность" }
        ]
      },
      {
        key: "con",
        name: "ТЕЛОСЛОЖЕНИЕ (CON)",
        score: abilities.con !== undefined ? abilities.con : 10,
        skills: []
      },
      {
        key: "int",
        name: "ИНТЕЛЛЕКТ (INT)",
        score: abilities.int !== undefined ? abilities.int : 10,
        skills: [
          { id: "анализ", name: "Анализ" },
          { id: "история", name: "История" },
          { id: "магия", name: "Магия" },
          { id: "природа", name: "Природа" },
          { id: "религия", name: "Религия" }
        ]
      },
      {
        key: "wis",
        name: "МУДРОСТЬ (WIS)",
        score: abilities.wis !== undefined ? abilities.wis : 10,
        skills: [
          { id: "внимательность", name: "Внимательность" },
          { id: "выживание", name: "Выживание" },
          { id: "медицина", name: "Медицина" },
          { id: "проницательность", name: "Проницательность" },
          { id: "уход за животными", name: "Уход за животными" }
        ]
      },
      {
        key: "cha",
        name: "ХАРИЗМА (CHA)",
        score: abilities.cha !== undefined ? abilities.cha : 10,
        skills: [
          { id: "выступление", name: "Выступление" },
          { id: "запугивание", name: "Запугивание" },
          { id: "обман", name: "Обман" },
          { id: "убеждение", name: "Убеждение" }
        ]
      }
    ];

    const abGrid = abPanel.createDiv({ cls: "dnd55-2024-grid" });

    ability2024Defs.forEach(ab => {
      const card = abGrid.createDiv({ cls: "dnd55-2024-card" });
      
      // Header: Name, Mod, Score
      const head = card.createDiv({ cls: "dnd55-2024-card-head" });
      head.createDiv({ cls: "dnd55-2024-card-name", text: ab.name });
      const mod = mods[ab.key];
      head.createDiv({ cls: "dnd55-2024-card-mod", text: this.fmtMod(mod) });
      head.createDiv({ cls: "dnd55-2024-card-score", text: String(ab.score) });

      // Body with Saves and Skills
      const body = card.createDiv({ cls: "dnd55-2024-card-body" });

      // Saving Throw row
      const isSaveProf = savesList.includes(ab.key);
      const saveBonus = isSaveProf ? mod + pb : mod;
      const saveRow = body.createDiv({ cls: `dnd55-2024-row dnd55-2024-save-row ${isSaveProf ? "is-prof" : ""}` });
      saveRow.createDiv({ cls: `dnd55-dot ${isSaveProf ? "prof" : ""}`, text: isSaveProf ? "●" : "○" });
      saveRow.createSpan({ text: "Спасбросок", cls: "dnd55-2024-row-label save" });
      saveRow.createDiv({ cls: "dnd55-2024-row-bonus", text: this.fmtMod(saveBonus) });

      // Skills rows
      if (ab.skills.length > 0) {
        ab.skills.forEach(s => {
          const pStatus = profSkills[s.id] || profSkills[s.name.toLowerCase()] || (Array.isArray(data.prof_skills) && data.prof_skills.includes(s.name) ? "prof" : "none");
          let bonus = mod;
          let dot = "○";
          let isExpert = pStatus === "expert" || pStatus === 2;
          let isProf = pStatus === "prof" || pStatus === 1 || isExpert;

          if (isExpert) {
            bonus += pb * 2;
            dot = "✪";
          } else if (isProf) {
            bonus += pb;
            dot = "●";
          }

          const sRow = body.createDiv({ cls: `dnd55-2024-row dnd55-2024-skill-row ${isProf ? "is-prof" : ""}` });
          sRow.createDiv({ cls: `dnd55-dot ${isProf ? "prof" : ""}`, text: dot });
          sRow.createSpan({ text: s.name, cls: "dnd55-2024-row-label" });
          sRow.createDiv({ cls: "dnd55-2024-row-bonus", text: this.fmtMod(bonus) });
        });
      } else {
        body.createDiv({ cls: "dnd55-2024-empty-note", text: "Спасброски от концентрации и стойкости" });
      }
    });

    // Training & Proficiencies (Armor, Weapons, Tools, Languages)
    const trainPanel = col1.createDiv({ cls: "dnd55-panel" });
    trainPanel.createDiv({ cls: "dnd55-panel-title", text: "Владения и Обучение (Training)" });
    if (data.proficiencies) trainPanel.createDiv({ cls: "dnd55-sense-item", text: `🛡️ Владение: ${data.proficiencies}` });
    if (data.languages) trainPanel.createDiv({ cls: "dnd55-sense-item", text: `🗣️ Языки: ${data.languages}` });

    // ========================================================================
    // COLUMN 2: HIT POINTS, WEAPONS & WEAPON MASTERY 5.5e, ATTUNEMENT
    // ========================================================================
    const col2 = grid.createDiv({ cls: "dnd55-col" });
    tab2.onclick = () => col2.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });

    // Hit Points Card
    const hpCard = col2.createDiv({ cls: "dnd55-panel dnd55-hp-card" });
    const hpHeader = hpCard.createDiv({ cls: "dnd55-hp-header" });
    hpHeader.createDiv({ cls: "dnd55-hp-label", text: "❤️ Очки Здоровья (HP)" });
    
    const curHpVal = Number(data.hp) !== undefined && !isNaN(Number(data.hp)) ? Number(data.hp) : 20;
    const maxHpVal = Number(data.max_hp) || curHpVal;
    hpHeader.createDiv({ cls: "dnd55-hp-max", text: `МАКСИМУМ: ${maxHpVal}` });

    const hpMain = hpCard.createDiv({ cls: "dnd55-hp-main" });
    const minusBtn = hpMain.createEl("button", { cls: "dnd55-hp-btn minus", text: "−" });
    minusBtn.title = "Получить урон (-1 / с зажатым Shift: -5)";

    const hpCurEl = hpMain.createDiv({ cls: "dnd55-hp-cur", text: String(curHpVal) });
    hpCurEl.title = "Кликните для быстрого ввода урона (-X), лечения (+X) или значения HP";
    this.updateHpColor(hpCurEl, curHpVal, maxHpVal);

    const plusBtn = hpMain.createEl("button", { cls: "dnd55-hp-btn plus", text: "+" });
    plusBtn.title = "Восстановить здоровье (+1 / с зажатым Shift: +5)";

    minusBtn.onclick = async (e) => {
      e.stopPropagation();
      const delta = e.shiftKey ? 5 : 1;
      data.hp = Math.max(0, (Number(data.hp) || 0) - delta);
      hpCurEl.setText(String(data.hp));
      this.updateHpColor(hpCurEl, data.hp, maxHpVal);
      await this.saveCharacterData(data, ctx, source);
    };

    plusBtn.onclick = async (e) => {
      e.stopPropagation();
      const delta = e.shiftKey ? 5 : 1;
      data.hp = Math.min(maxHpVal, (Number(data.hp) || 0) + delta);
      hpCurEl.setText(String(data.hp));
      this.updateHpColor(hpCurEl, data.hp, maxHpVal);
      await this.saveCharacterData(data, ctx, source);
    };

    hpCurEl.onclick = (e) => {
      e.stopPropagation();
      new HpPromptModal(this.app, Number(data.hp) || 0, maxHpVal, async (newHp) => {
        data.hp = newHp;
        hpCurEl.setText(String(newHp));
        this.updateHpColor(hpCurEl, newHp, maxHpVal);
        await this.saveCharacterData(data, ctx, source);
      }).open();
    };

    if (data.temp_hp) {
      const tempBox = hpCard.createDiv({ cls: "dnd55-hp-temp-row" });
      tempBox.createSpan({ text: `🛡️ Временные хиты: +${data.temp_hp}` });
    }

    // Hit Dice & Interactive Death Saves
    const hdDeath = hpCard.createDiv({ cls: "dnd55-hitdice-death" });
    
    const hdBox = hdDeath.createDiv({ cls: "dnd55-hd-col" });
    hdBox.createDiv({ cls: "dnd55-badge-label", text: `Кости хитов (${data.hit_dice || "2d10"})` });
    const hdCount = data.hit_dice_count || 2;
    const hdPips = hdBox.createDiv({ cls: "dnd55-pip-group" });
    for (let i = 0; i < hdCount; i++) {
      const pip = hdPips.createSpan({ cls: "dnd55-pip checked-slot" });
      pip.title = "Клик: потратить/восстановить кость хитов";
      pip.onclick = () => pip.toggleClass("checked-slot");
    }

    const dsBox = hdDeath.createDiv({ cls: "dnd55-death-col" });
    dsBox.createDiv({ cls: "dnd55-badge-label", text: "Спасброски от смерти" });
    
    const dsRows = dsBox.createDiv({ cls: "dnd55-death-rows" });
    
    // Successes with connected line
    const succTrack = dsRows.createDiv({ cls: "dnd55-death-track" });
    succTrack.createSpan({ text: "УСПЕХИ", cls: "dnd55-death-label" });
    const succLineWrap = succTrack.createDiv({ cls: "dnd55-death-pips-line" });
    succLineWrap.createSpan({ cls: "dnd55-death-line-connector" });
    for (let i = 0; i < 3; i++) {
      const p = succLineWrap.createSpan({ cls: "dnd55-pip dnd55-death-pip" });
      p.onclick = () => p.toggleClass("checked-success");
    }

    // Failures with connected line
    const failTrack = dsRows.createDiv({ cls: "dnd55-death-track" });
    failTrack.createSpan({ text: "ПРОВАЛЫ", cls: "dnd55-death-label" });
    const failLineWrap = failTrack.createDiv({ cls: "dnd55-death-pips-line" });
    failLineWrap.createSpan({ cls: "dnd55-death-line-connector" });
    for (let i = 0; i < 3; i++) {
      const p = failLineWrap.createSpan({ cls: "dnd55-pip dnd55-death-pip" });
      p.onclick = () => p.toggleClass("checked-fail");
    }

    // 5.5e Attacks & Weapon Mastery Table
    const atkPanel = col2.createDiv({ cls: "dnd55-panel" });
    atkPanel.createDiv({ cls: "dnd55-panel-title", text: "Атаки и Оружие (Weapon Mastery 2024)" });

    const attacks = data.attacks || [];
    if (attacks.length > 0) {
      const tableWrap = atkPanel.createDiv({ cls: "dnd55-table-wrap" });
      const table = tableWrap.createEl("table", { cls: "dnd55-attacks-table" });
      const thead = table.createEl("thead");
      const trh = thead.createEl("tr");
      trh.createEl("th", { text: "Оружие" });
      trh.createEl("th", { text: "Атака", cls: "dnd55-th-center" });
      trh.createEl("th", { text: "Урон", cls: "dnd55-th-center" });
      trh.createEl("th", { text: "Мастерство 5.5e", cls: "dnd55-th-center" });

      const tbody = table.createEl("tbody");
      attacks.forEach(atk => {
        const tr = tbody.createEl("tr");
        const tdName = tr.createEl("td", { cls: "dnd55-td-name" });
        tdName.createSpan({ text: atk.name, cls: "dnd55-attack-name" });
        if (atk.range) tdName.createEl("span", { text: ` (${atk.range})`, cls: "dnd55-attack-range" });

        const tdAtk = tr.createEl("td", { cls: "dnd55-td-center" });
        const bStr = this.fmtBonus(atk.bonus);
        tdAtk.createSpan({ cls: "dnd55-stat-badge dnd55-atk-badge", text: bStr });

        const tdDmg = tr.createEl("td", { cls: "dnd55-td-center" });
        const dmgStr = String(atk.damage || "1d6+4");
        tdDmg.createSpan({ cls: "dnd55-stat-badge dnd55-dmg-badge", text: dmgStr });

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

    // Attunement Slots (D&D 2024 Magic Items)
    const attPanel = col2.createDiv({ cls: "dnd55-panel" });
    attPanel.createDiv({ cls: "dnd55-panel-title", text: "Настройка на предметы (Attunement 2024)" });
    const attRow = attPanel.createDiv({ cls: "dnd55-attunement-row" });
    attRow.createSpan({ text: "Слоты настройки (макс. 3): ", cls: "dnd55-badge-label" });
    const attPips = attRow.createSpan({ cls: "dnd55-pip-group" });
    let curAtt = Number(data.attunement) || 0;
    for (let i = 1; i <= 3; i++) {
      const isAtt = i <= curAtt;
      const p = attPips.createSpan({ cls: `dnd55-pip ${isAtt ? "checked-slot" : ""}` });
      p.title = `Слот настройки #${i}: кликните для переключения`;
      p.onclick = async () => {
        curAtt = (isAtt && curAtt === i) ? i - 1 : i;
        data.attunement = curAtt;
        await this.saveCharacterData(data, ctx, source);
        const pips = attPips.querySelectorAll(".dnd55-pip");
        pips.forEach((pipEl, idx) => {
          pipEl.toggleClass("checked-slot", idx < curAtt);
        });
      };
    }

    // ========================================================================
    // COLUMN 3: FEATURES, SPELLS, EQUIPMENT, ROLEPLAY
    // ========================================================================
    const col3 = grid.createDiv({ cls: "dnd55-col" });
    tab3.onclick = () => col3.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });

    // Spells Section
    if (data.spells || data.spell_save_dc) {
      const spellPanel = col3.createDiv({ cls: "dnd55-panel" });
      spellPanel.createDiv({ cls: "dnd55-panel-title", text: "Заклинания и Магия (Spellcasting)" });
      
      const spVitals = spellPanel.createDiv({ cls: "dnd55-vitals-row dnd55-vitals-2" });
      const dcBox = spVitals.createDiv({ cls: "dnd55-vital-box" });
      dcBox.createDiv({ cls: "dnd55-vital-label", text: "Сл спаса" });
      dcBox.createDiv({ cls: "dnd55-vital-val", text: String(data.spell_save_dc || 13) });

      const spAtkBox = spVitals.createDiv({ cls: "dnd55-vital-box" });
      spAtkBox.createDiv({ cls: "dnd55-vital-label", text: "Атака" });
      spAtkBox.createDiv({ cls: "dnd55-vital-val", text: this.fmtBonus(data.spell_attack || "+5") });

      if (data.spell_slots_1) {
        const slotsRow = spellPanel.createDiv({ cls: "dnd55-spell-slots-row" });
        slotsRow.createSpan({ text: "Ячейки 1 круга: ", cls: "dnd55-badge-label" });
        const pipsRow = slotsRow.createSpan({ cls: "dnd55-pip-group" });
        for (let i = 0; i < (data.spell_slots_1 || 3); i++) {
          const p = pipsRow.createSpan({ cls: "dnd55-pip checked-slot" });
          p.title = "Клик: потратить/восстановить ячейку заклинания";
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

    // Features
    const featPanel = col3.createDiv({ cls: "dnd55-panel" });
    featPanel.createDiv({ cls: "dnd55-panel-title", text: "Умения и Особенности (Features)" });

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
          p.title = "Клик: отметить использование способности";
          p.onclick = () => p.toggleClass("checked-slot");
        }
      }
      if (f.desc) item.createDiv({ cls: "dnd55-feature-desc", text: String(f.desc) });
    });

    // Equipment & Currency
    const eqPanel = col3.createDiv({ cls: "dnd55-panel" });
    eqPanel.createDiv({ cls: "dnd55-panel-title", text: "Монеты и Снаряжение" });
    
    const coinsGrid = eqPanel.createDiv({ cls: "dnd55-coins-grid" });
    const coins = data.coins || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
    [
      { label: "ММ", val: coins.cp || 0, name: "Медь" },
      { label: "СМ", val: coins.sp || 0, name: "Серебро" },
      { label: "ЭМ", val: coins.ep || 0, name: "Электрум" },
      { label: "ЗМ", val: coins.gp || 0, name: "Золото" },
      { label: "ПМ", val: coins.pp || 0, name: "Платина" }
    ].forEach(c => {
      const cell = coinsGrid.createDiv({ cls: "dnd55-coin-cell" });
      cell.setAttribute("title", c.name);
      cell.createDiv({ cls: "dnd55-coin-label", text: c.label });
      cell.createDiv({ cls: "dnd55-coin-val", text: String(c.val) });
    });

    if (data.equipment) {
      eqPanel.createDiv({ text: String(data.equipment), cls: "dnd55-feature-desc dnd55-eq-text" });
    }

    // Roleplay
    if (data.personality || data.secret_goal) {
      const rpPanel = col3.createDiv({ cls: "dnd55-panel" });
      rpPanel.createDiv({ cls: "dnd55-panel-title", text: "Отыгрыш и Личность" });
      
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

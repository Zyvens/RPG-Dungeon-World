(() => {
  "use strict";

  const DEFAULT_ASSETS = {
    portrait: "assets/kael-portrait.webp",
    weaponImg: "assets/weapon-presa-de-lofurin.webp",
    shieldImg: "assets/shield-lobo-branco.webp",
    armorImg: "assets/armor-escamas.webp",
    background: "assets/bg-winterfell.jpg",
  };

  const IMG_TARGETS = {
    portrait: ["portraitImg"],
    weaponImg: ["weaponImg", "weaponImg2"],
    shieldImg: ["shieldImg"],
    armorImg: ["armorImg"],
  };

  const RACE_LABELS = { anao: "Anão", elfo: "Elfo", halfling: "Halfling", humano: "Humano" };
  const ALIGN_LABELS = { bom: "Bom", neutro: "Neutro", mau: "Mau" };
  const ALIGNMENT_DESC = {
    bom: "Defender aqueles mais fracos que você.",
    neutro: "Derrotar um adversário à sua altura.",
    mau: "Matar um inimigo indefeso ou cercado.",
  };
  const RACE_DESC = {
    anao: "Quando compartilhar uma bebida com alguém, você pode negociar com aquela pessoa usando CON no lugar de CAR.",
    elfo: "Escolha uma arma: você trata armas daquele tipo como se sempre possuíssem o rótulo precisa.",
    halfling: "Quando desafiar o perigo e usar seu tamanho diminuto em sua vantagem, receba +1.",
    humano: "Uma vez por batalha, você pode rolar novamente um rolamento de dano (seu ou de outra pessoa).",
  };

  const DEFAULT_EQUIPMENT = [
    { id: "presa-lofurin", name: "Presa de Lofurin", description: "Machado de guerra favorito de Kael.", weight: 2, quantity: 1 },
    { id: "armadura-campeao", name: "Armadura do Campeão", description: "Armadura de escamas, armadura 2.", weight: 3, quantity: 1 },
    { id: "escudo-lobo-branco", name: "Escudo do Lobo Branco", description: "Escudo, +1 armadura.", weight: 2, quantity: 1 },
    { id: "racoes", name: "Rações de masmorra", description: "5 usos.", weight: 1, quantity: 1 },
  ];

  const DEFAULT_CHARACTERS = [
    { id: "sigrid", name: "Sigrid Frostweaver", role: "Profecia", description: "Sacerdotisa de Lofurin e intérprete dos sinais." },
    { id: "darius", name: "Darius Valerius", role: "Conflito", description: "Leão Dourado de Solari, rival e possível aliado." },
  ];

  const DEFAULT_STATE = {
    fields: {
      firstName: "Kael",
      lastName: "Frostborn",
      tagline: "“O gelo conserva aquilo que merece sobreviver.”",
      charName: "Kael Frostborn",
      apparenceEyes: "duros",
      apparenceHair: "bagunçado",
      apparenceSkin: "cicatrizada",
      apparenceBody: "forma",
      apparenceDetail: "e longo",
      strength: 16,
      dexterity: 12,
      constitution: 13,
      intelligence: 8,
      wisdom: 12,
      charisma: 10,
      debility_strength: false,
      debility_dexterity: false,
      debility_constitution: false,
      debility_intelligence: false,
      debility_wisdom: false,
      debility_charisma: false,
      damage: "d10",
      armor: 3,
      hpCurrent: 23,
      hpMax: 23,
      level: 1,
      xp: 0,
      alignment: "bom",
      race: "humano",
      weaponName: "Presa de Lofurin",
      weaponDesc: "machado",
      weaponDist: "corpo",
      weaponUpg: ["serrilhado", "afiada"],
      weaponUpgCreature: "",
      weaponLook: "ornada",
      bond1: "",
      bond2: "a pessoa escolhida para herdar o trono de Winterfell",
      bond3: "",
      bond4: "",
      campaignNotes: "Proteger a pessoa escolhida para herdar o trono de Winterfell.",
      defenses: "escamas",
      gearChoice: ["escudo", "pocao"],
      loadCurrent: 8,
      adv_implacavel: false, adv_reliquia: false, adv_maestriaArmadura: false,
      adv_armaMelhorada: false, adv_visaoRubra: false, adv_inquisidor: false,
      adv_cheiroSangue: false, adv_amadorMulti: false, adv_peleFerro: false,
      adv_ferreiro: false, adv_sedeSangue: false, adv_perfeicaoArmadura: false,
      adv_mauOlhado: false, adv_gostoSangue: false, adv_iniciadoMulti: false,
      adv_peleAco: false, adv_olhosMorte: false, adv_focoArmamento: false,
      adv_guerreiroSuperior: false,
      advancedMovesNotes: "",
      story1: "Kael foi encontrado recém-nascido além da Grande Muralha, protegido por um lobo branco colossal. Ragnar o acolheu como filho de Winterfell.",
      story2: "Treinado em combate, disciplina e dever, tornou-se um campeão cuja força existe para proteger os vulneráveis.",
      story3: "Ao salvar uma patrulha durante uma incursão além da Grande Muralha, recebeu a Presa de Lofurin e passou de guerreiro a figura profética.",
      story4: "Seu maior medo não é morrer, mas falhar com Winterfell e com a pessoa que jurou proteger.",
    },
    images: { portrait: null, weaponImg: null, shieldImg: null, armorImg: null, background: null },
    equipment: DEFAULT_EQUIPMENT,
    characters: DEFAULT_CHARACTERS,
    gameNotes: "",
  };

  const DB_NAME = "kael-app-db";
  const STORE = "kv";
  function openDB() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) return reject(new Error("no-idb"));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbGet(key) {
    try {
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const r = tx.objectStore(STORE).get(key);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    } catch (e) {
      const raw = localStorage.getItem("kael-app:" + key);
      return raw ? JSON.parse(raw) : undefined;
    }
  }
  async function idbSet(key, value) {
    try {
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      localStorage.setItem("kael-app:" + key, JSON.stringify(value));
    }
  }

  const deepClone = (o) => JSON.parse(JSON.stringify(o));
  let state = deepClone(DEFAULT_STATE);
  let editing = false;
  let notesSaveTimer = null;
  let currentImgTarget = null;
  let resetArmed = false;
  let resetTimer;

  function modifier(score) {
    const n = Number(score);
    if (Number.isNaN(n)) return 0;
    if (n <= 3) return -3;
    if (n <= 5) return -2;
    if (n <= 8) return -1;
    if (n <= 12) return 0;
    if (n <= 15) return 1;
    if (n <= 17) return 2;
    return 3;
  }
  function fmtMod(n) { return n >= 0 ? `+${n}` : `−${Math.abs(n)}`; }
  function loadMax() { return 12 + modifier(state.fields.strength); }
  function equipmentLoad(list = state.equipment) {
    return list.reduce((sum, item) => sum + (Math.max(0, Number(item.weight) || 0) * Math.max(0, Number(item.quantity) || 0)), 0);
  }
  function makeId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
  function esc(value) {
    return String(value ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  const body = document.body;
  const editToggle = document.getElementById("editToggle");
  const saveBtn = document.getElementById("saveBtn");
  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const importFile = document.getElementById("importFile");
  const resetBtn = document.getElementById("resetBtn");
  const saveStatus = document.getElementById("saveStatus");
  const bgLayer = document.getElementById("bgLayer");
  const bgEditBtn = document.getElementById("bgEditBtn");
  const imgModal = document.getElementById("imgPickerModal");
  const imgPickerInput = document.getElementById("imgPickerInput");
  const imgPickerCancel = document.getElementById("imgPickerCancel");
  const imgPickerRemove = document.getElementById("imgPickerRemove");

  function flashStatus(msg, isError = false) {
    if (!saveStatus) return;
    saveStatus.textContent = msg;
    saveStatus.style.color = isError ? "var(--danger)" : "var(--ok)";
    setTimeout(() => { saveStatus.textContent = ""; }, 3200);
  }

  async function persist() { await idbSet("state", state); }

  function injectEnhancementStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .inventory-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:18px 0 10px}
      .inventory-head .btn{white-space:nowrap}
      .inventory-list{display:grid;gap:10px}
      .inventory-row{display:grid;grid-template-columns:minmax(150px,1.1fr) minmax(220px,2fr) 90px 90px 48px;gap:10px;align-items:start;padding:12px;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:rgba(4,13,22,.55)}
      .inventory-row .field-input{width:100%}
      .inventory-row textarea{min-height:48px;resize:vertical}
      .inventory-labels{display:grid;grid-template-columns:minmax(150px,1.1fr) minmax(220px,2fr) 90px 90px 48px;gap:10px;padding:0 12px;color:var(--muted);font-size:.72rem;text-transform:uppercase;letter-spacing:.08em}
      .icon-danger{min-height:44px;border:1px solid rgba(255,100,100,.28);border-radius:10px;background:rgba(120,20,20,.16);color:var(--danger);cursor:pointer}
      .load-meter{margin-top:12px;height:9px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden}
      .load-meter>span{display:block;height:100%;width:0;background:linear-gradient(90deg,#82b7d6,#d7edf7);transition:width .2s ease}
      .load-meter.over>span{background:#ff6b6b}
      .load-summary{display:flex;justify-content:space-between;gap:12px;margin-top:8px;font-size:.86rem;color:var(--muted)}
      .people-grid.dynamic-people .person{position:relative}
      .person-fields{display:grid;gap:8px}
      .person-remove{position:absolute;right:10px;top:10px}
      .character-actions{display:flex;justify-content:flex-end;margin-top:12px}
      .notes-card textarea{width:100%;min-height:58vh;resize:vertical;line-height:1.6;font-size:1rem}
      .notes-status{font-size:.78rem;color:var(--muted);margin-top:8px;min-height:1.2em}
      body:not(.editing) .edit-only-dynamic{display:none!important}
      @media(max-width:760px){
        .inventory-labels{display:none}
        .inventory-row{grid-template-columns:1fr 74px 74px 44px}
        .inventory-row .inv-desc{grid-column:1/-1;grid-row:2}
        .inventory-row .inv-name{grid-column:1/-1}
        .inventory-row .inv-weight{grid-column:2;grid-row:1}
        .inventory-row .inv-qty{grid-column:3;grid-row:1}
        .inventory-row .inv-remove{grid-column:4;grid-row:1}
        .notes-card textarea{min-height:64vh}
      }
    `;
    document.head.appendChild(style);
  }

  function installNotesTab() {
    const nav = document.querySelector(".tabnav");
    const shell = document.querySelector("main.shell");
    if (!nav || !shell || document.querySelector('[data-tab="anotacoes"]')) return;
    const btn = document.createElement("button");
    btn.className = "tab-btn";
    btn.type = "button";
    btn.dataset.tab = "anotacoes";
    btn.textContent = "Anotações";
    nav.appendChild(btn);

    const section = document.createElement("section");
    section.id = "tab-anotacoes";
    section.className = "tab-panel";
    section.innerHTML = `
      <div class="card notes-card">
        <div class="card-head">
          <span class="card-icon-badge"><svg class="card-icon"><use href="#icon-scroll"></use></svg></span>
          <div class="card-head-text"><h2>Anotações do jogo</h2><p class="hint">Área sempre editável. O texto é salvo automaticamente neste dispositivo.</p></div>
        </div>
        <textarea id="gameNotes" class="field-input textarea" placeholder="Sessão, NPCs, pistas, missões, decisões, itens, perguntas para o mestre..."></textarea>
        <p id="notesStatus" class="notes-status" aria-live="polite"></p>
      </div>`;
    shell.appendChild(section);

    const notes = section.querySelector("#gameNotes");
    notes.addEventListener("input", () => {
      state.gameNotes = notes.value;
      const status = document.getElementById("notesStatus");
      if (status) status.textContent = "Salvando…";
      clearTimeout(notesSaveTimer);
      notesSaveTimer = setTimeout(async () => {
        await persist();
        if (status) status.textContent = "Salvo automaticamente.";
        setTimeout(() => { if (status && status.textContent === "Salvo automaticamente.") status.textContent = ""; }, 1800);
      }, 350);
    });
  }

  function installInventoryUI() {
    const equipmentPanel = document.getElementById("tab-equipamento");
    if (!equipmentPanel || document.getElementById("dynamicInventoryCard")) return;
    const firstCard = equipmentPanel.querySelector(".card");
    if (!firstCard) return;

    const oldLoadInput = firstCard.querySelector('input[data-field="loadCurrent"]');
    if (oldLoadInput) {
      oldLoadInput.setAttribute("readonly", "readonly");
      oldLoadInput.disabled = true;
      oldLoadInput.title = "Calculado automaticamente pela lista de equipamentos";
    }

    const wrap = document.createElement("div");
    wrap.id = "dynamicInventoryCard";
    wrap.className = "card";
    wrap.innerHTML = `
      <div class="card-head">
        <span class="card-icon-badge"><svg class="card-icon"><use href="#icon-backpack"></use></svg></span>
        <div class="card-head-text"><h2>Inventário & carga</h2><p class="hint">O peso total é calculado por peso × quantidade. Itens que ultrapassem a carga máxima não podem ser adicionados.</p></div>
      </div>
      <div class="inventory-head"><span class="field-label">Lista de equipamentos</span><button id="addEquipmentBtn" class="btn edit-only-dynamic" type="button">+ Adicionar equipamento</button></div>
      <div class="inventory-labels"><span>Nome</span><span>Descrição</span><span>Peso</span><span>Qtd.</span><span></span></div>
      <div id="inventoryList" class="inventory-list"></div>
      <div id="loadMeter" class="load-meter"><span></span></div>
      <div class="load-summary"><strong id="inventoryLoadText">Carga: 0 / 14</strong><span id="inventoryRemainingText">Restante: 14</span></div>`;
    firstCard.insertAdjacentElement("afterend", wrap);

    wrap.querySelector("#addEquipmentBtn").addEventListener("click", async () => {
      if (!editing) return;
      state.equipment.push({ id: makeId("item"), name: "Novo equipamento", description: "", weight: 0, quantity: 1 });
      renderInventory();
      await persist();
    });
  }

  function installCharactersUI() {
    const historyPanel = document.getElementById("tab-historia");
    if (!historyPanel) return;
    const headings = Array.from(historyPanel.querySelectorAll("h2"));
    const heading = headings.find((h) => h.textContent.trim().toLowerCase().includes("personagens do background"));
    const card = heading?.closest(".card");
    if (!card) return;
    const grid = card.querySelector(".people-grid");
    if (!grid) return;
    grid.id = "dynamicPeopleGrid";
    grid.classList.add("dynamic-people");
    grid.innerHTML = "";
    if (!card.querySelector("#addCharacterBtn")) {
      const actions = document.createElement("div");
      actions.className = "character-actions";
      actions.innerHTML = '<button id="addCharacterBtn" class="btn edit-only-dynamic" type="button">+ Adicionar personagem</button>';
      grid.insertAdjacentElement("afterend", actions);
      actions.querySelector("button").addEventListener("click", async () => {
        if (!editing) return;
        state.characters.push({ id: makeId("person"), name: "Novo personagem", role: "Relação", description: "" });
        renderCharacters();
        await persist();
      });
    }
  }

  function migrateState(stored) {
    const merged = {
      fields: { ...DEFAULT_STATE.fields, ...(stored?.fields || {}) },
      images: { ...DEFAULT_STATE.images, ...(stored?.images || {}) },
      equipment: Array.isArray(stored?.equipment) ? stored.equipment : deepClone(DEFAULT_EQUIPMENT),
      characters: Array.isArray(stored?.characters) ? stored.characters : deepClone(DEFAULT_CHARACTERS),
      gameNotes: typeof stored?.gameNotes === "string" ? stored.gameNotes : "",
    };
    merged.characters = merged.characters.filter((p) => String(p.name || "").trim().toLowerCase() !== "eira");
    if (String(merged.fields.bond1 || "").trim().toLowerCase() === "eira") merged.fields.bond1 = "";
    if (/Eira/i.test(merged.fields.story3 || "")) merged.fields.story3 = DEFAULT_STATE.fields.story3;
    merged.fields.loadCurrent = equipmentLoad(merged.equipment);
    return merged;
  }

  function setDesc(key, map) {
    const el = document.querySelector(`[data-desc-for="${key}"]`);
    if (el) el.textContent = map[state.fields[key]] || "";
  }

  function renderInventory() {
    const list = document.getElementById("inventoryList");
    if (!list) return;
    list.innerHTML = state.equipment.map((item) => `
      <div class="inventory-row" data-item-id="${esc(item.id)}">
        <input class="field-input inv-name" type="text" data-inv-key="name" value="${esc(item.name)}" ${editing ? "" : "disabled"} aria-label="Nome do equipamento" />
        <textarea class="field-input inv-desc" data-inv-key="description" ${editing ? "" : "disabled"} aria-label="Descrição do equipamento">${esc(item.description)}</textarea>
        <input class="field-input inv-weight" type="number" min="0" step="0.1" data-inv-key="weight" value="${Number(item.weight) || 0}" ${editing ? "" : "disabled"} aria-label="Peso" />
        <input class="field-input inv-qty" type="number" min="0" step="1" data-inv-key="quantity" value="${Math.max(0, Number(item.quantity) || 0)}" ${editing ? "" : "disabled"} aria-label="Quantidade" />
        <button class="icon-danger inv-remove edit-only-dynamic" type="button" title="Remover equipamento" aria-label="Remover equipamento">×</button>
      </div>`).join("");

    list.querySelectorAll(".inventory-row").forEach((row) => {
      const item = state.equipment.find((x) => x.id === row.dataset.itemId);
      if (!item) return;
      row.querySelectorAll("[data-inv-key]").forEach((input) => {
        input.addEventListener("change", async () => {
          const key = input.dataset.invKey;
          const old = item[key];
          let next = input.value;
          if (key === "weight" || key === "quantity") next = Math.max(0, Number(next) || 0);
          if (key === "quantity") next = Math.floor(next);
          item[key] = next;
          if (equipmentLoad() > loadMax()) {
            item[key] = old;
            input.value = old;
            flashStatus(`Carga máxima excedida. O limite atual é ${loadMax()}.`, true);
            renderLoad();
            return;
          }
          state.fields.loadCurrent = equipmentLoad();
          renderLoad();
          await persist();
        });
      });
      row.querySelector(".inv-remove")?.addEventListener("click", async () => {
        if (!editing) return;
        state.equipment = state.equipment.filter((x) => x.id !== item.id);
        state.fields.loadCurrent = equipmentLoad();
        renderInventory();
        renderLoad();
        await persist();
      });
    });
    renderLoad();
  }

  function renderLoad() {
    const current = equipmentLoad();
    const max = loadMax();
    state.fields.loadCurrent = current;
    const oldLoadInput = document.querySelector('input[data-field="loadCurrent"]');
    if (oldLoadInput) oldLoadInput.value = current;
    const maxOut = document.getElementById("loadMaxOut");
    if (maxOut) maxOut.textContent = String(max);
    const txt = document.getElementById("inventoryLoadText");
    const rem = document.getElementById("inventoryRemainingText");
    const meter = document.getElementById("loadMeter");
    if (txt) txt.textContent = `Carga: ${current} / ${max}`;
    if (rem) rem.textContent = `Restante: ${Math.max(0, max - current)}`;
    if (meter) {
      const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
      meter.classList.toggle("over", current > max);
      const bar = meter.querySelector("span");
      if (bar) bar.style.width = `${pct}%`;
    }
  }

  function renderCharacters() {
    const grid = document.getElementById("dynamicPeopleGrid");
    if (!grid) return;
    grid.innerHTML = state.characters.map((person) => `
      <div class="person" data-person-id="${esc(person.id)}">
        <button class="icon-danger person-remove edit-only-dynamic" type="button" aria-label="Remover personagem" title="Remover personagem">×</button>
        <div class="person-fields">
          <input class="field-input" data-person-key="name" type="text" value="${esc(person.name)}" ${editing ? "" : "disabled"} aria-label="Nome do personagem" />
          <input class="field-input" data-person-key="role" type="text" value="${esc(person.role)}" ${editing ? "" : "disabled"} aria-label="Papel do personagem" />
          <textarea class="field-input textarea" data-person-key="description" rows="3" ${editing ? "" : "disabled"} aria-label="Descrição do personagem">${esc(person.description)}</textarea>
        </div>
      </div>`).join("");
    grid.querySelectorAll(".person").forEach((card) => {
      const person = state.characters.find((x) => x.id === card.dataset.personId);
      if (!person) return;
      card.querySelectorAll("[data-person-key]").forEach((input) => {
        input.addEventListener("change", async () => {
          person[input.dataset.personKey] = input.value;
          await persist();
        });
      });
      card.querySelector(".person-remove")?.addEventListener("click", async () => {
        if (!editing) return;
        state.characters = state.characters.filter((x) => x.id !== person.id);
        renderCharacters();
        await persist();
      });
    });
  }

  function render() {
    document.querySelectorAll("input[data-field], textarea[data-field]").forEach((el) => {
      if (el.type === "radio" || el.type === "checkbox") return;
      const key = el.dataset.field;
      if (key in state.fields) el.value = state.fields[key];
    });
    document.querySelectorAll("select[data-field]").forEach((el) => {
      const key = el.dataset.field;
      if (key in state.fields) el.value = state.fields[key];
    });
    document.querySelectorAll("[data-field][contenteditable]").forEach((el) => {
      const key = el.dataset.field;
      if (key in state.fields) el.textContent = state.fields[key];
    });
    document.querySelectorAll('input[type="radio"][data-field]').forEach((el) => {
      el.checked = state.fields[el.dataset.field] === el.value;
    });
    document.querySelectorAll('input[type="checkbox"][data-field]').forEach((el) => {
      const key = el.dataset.field;
      if (Array.isArray(state.fields[key])) el.checked = state.fields[key].includes(el.value);
      else if (key in state.fields) el.checked = !!state.fields[key];
    });
    document.querySelectorAll("[data-mod-for]").forEach((label) => {
      label.textContent = fmtMod(modifier(state.fields[label.dataset.modFor]));
    });
    const xpGoalOut = document.getElementById("xpGoalOut");
    if (xpGoalOut) xpGoalOut.textContent = String((Number(state.fields.level) || 1) + 7);
    setDesc("alignment", ALIGNMENT_DESC);
    setDesc("race", RACE_DESC);
    const tagRace = document.querySelector('[data-echo="race"]');
    if (tagRace) tagRace.textContent = RACE_LABELS[state.fields.race] || "—";
    const tagAlign = document.querySelector('[data-echo="alignment"]');
    if (tagAlign) tagAlign.textContent = ALIGN_LABELS[state.fields.alignment] || "—";
    Object.keys(IMG_TARGETS).forEach((key) => {
      const src = state.images[key] || DEFAULT_ASSETS[key];
      IMG_TARGETS[key].forEach((id) => { const img = document.getElementById(id); if (img) img.src = src; });
    });
    const bgSrc = state.images.background || DEFAULT_ASSETS.background;
    if (bgLayer) bgLayer.style.setProperty("--bg-image", `url("${bgSrc}")`);
    const notes = document.getElementById("gameNotes");
    if (notes && document.activeElement !== notes) notes.value = state.gameNotes || "";
    document.title = `${state.fields.firstName} ${state.fields.lastName} — Ficha do Guerreiro`;
    renderInventory();
    renderCharacters();
    renderLoad();
  }

  function collectFromDOM() {
    document.querySelectorAll("input[data-field], textarea[data-field]").forEach((el) => {
      const key = el.dataset.field;
      if (key === "loadCurrent") return;
      if (el.type === "radio") { if (el.checked) state.fields[key] = el.value; }
      else if (el.type === "checkbox") { /* handled below */ }
      else state.fields[key] = el.type === "number" ? Number(el.value) : el.value;
    });
    document.querySelectorAll("select[data-field]").forEach((el) => { state.fields[el.dataset.field] = el.value; });
    document.querySelectorAll('.choice-group[data-group]').forEach((group) => {
      const boxes = group.querySelectorAll('input[type="checkbox"]');
      if (!boxes.length) return;
      const key = boxes[0].dataset.field;
      if (Array.isArray(state.fields[key])) state.fields[key] = Array.from(boxes).filter((b) => b.checked).map((b) => b.value);
    });
    document.querySelectorAll('input[type="checkbox"][data-field]').forEach((el) => {
      const key = el.dataset.field;
      if (typeof DEFAULT_STATE.fields[key] === "boolean") state.fields[key] = el.checked;
    });
    document.querySelectorAll("[data-field][contenteditable]").forEach((el) => { state.fields[el.dataset.field] = el.textContent.trim(); });
    state.fields.loadCurrent = equipmentLoad();
  }

  function setEditing(active) {
    editing = active;
    body.classList.toggle("editing", active);
    editToggle?.classList.toggle("on", active);
    document.querySelectorAll("input[data-field], textarea[data-field], select[data-field]").forEach((el) => {
      if (el.dataset.field === "loadCurrent") { el.disabled = true; return; }
      el.disabled = !active;
    });
    document.querySelectorAll("[data-field][contenteditable]").forEach((el) => el.setAttribute("contenteditable", active ? "true" : "false"));
    renderInventory();
    renderCharacters();
  }

  function bindTabs() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      if (btn.dataset.boundTab) return;
      btn.dataset.boundTab = "1";
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(`tab-${btn.dataset.tab}`)?.classList.add("active");
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }

  function resizeImageFile(file, maxDim = 1400, quality = 0.86) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
            else { width = Math.round((width * maxDim) / height); height = maxDim; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/webp", quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function bindEvents() {
    editToggle?.addEventListener("click", () => {
      if (!editing) setEditing(true);
      else { collectFromDOM(); render(); setEditing(false); }
    });
    saveBtn?.addEventListener("click", async () => {
      collectFromDOM(); render(); await persist(); setEditing(false); flashStatus("Ficha salva neste dispositivo.");
    });

    document.querySelectorAll(".choice-group[data-max]").forEach((group) => {
      const max = Number(group.dataset.max);
      group.addEventListener("change", (e) => {
        if (e.target.type !== "checkbox") return;
        if (group.querySelectorAll('input[type="checkbox"]:checked').length > max) {
          e.target.checked = false;
          flashStatus(`Escolha no máximo ${max} opções.`, true);
        }
      });
    });

    resetBtn?.addEventListener("click", async () => {
      if (!resetArmed) {
        resetArmed = true;
        resetBtn.textContent = "Confirmar restauração";
        flashStatus("Clique novamente para restaurar a ficha original de Kael.");
        resetTimer = setTimeout(() => { resetArmed = false; resetBtn.textContent = "Restaurar ficha original"; }, 5000);
        return;
      }
      clearTimeout(resetTimer);
      state = deepClone(DEFAULT_STATE);
      await persist(); render(); setEditing(false);
      resetArmed = false; resetBtn.textContent = "Restaurar ficha original";
      flashStatus("Ficha original restaurada.");
    });

    exportBtn?.addEventListener("click", () => {
      collectFromDOM();
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `kael-frostborn-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      flashStatus("Backup exportado.");
    });
    importBtn?.addEventListener("click", () => importFile?.click());
    importFile?.addEventListener("change", async () => {
      const file = importFile.files[0]; if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        if (!parsed.fields) throw new Error("formato inválido");
        state = migrateState(parsed);
        if (equipmentLoad() > loadMax()) throw new Error("carga acima do limite");
        await persist(); render(); flashStatus("Backup importado com sucesso.");
      } catch (e) { flashStatus("Não foi possível importar esse arquivo ou a carga excede o limite.", true); }
      finally { importFile.value = ""; }
    });

    document.querySelectorAll("[data-img-target]").forEach((btn) => btn.addEventListener("click", () => {
      currentImgTarget = btn.dataset.imgTarget; imgPickerInput.value = ""; imgModal.classList.remove("hidden");
    }));
    bgEditBtn?.addEventListener("click", () => { currentImgTarget = "background"; imgPickerInput.value = ""; imgModal.classList.remove("hidden"); });
    imgPickerCancel?.addEventListener("click", () => { imgModal.classList.add("hidden"); currentImgTarget = null; });
    imgPickerRemove?.addEventListener("click", async () => {
      if (currentImgTarget) { state.images[currentImgTarget] = null; render(); await persist(); flashStatus("Imagem original restaurada."); }
      imgModal.classList.add("hidden"); currentImgTarget = null;
    });
    imgPickerInput?.addEventListener("change", async () => {
      const file = imgPickerInput.files[0]; if (!file || !currentImgTarget) return;
      try {
        state.images[currentImgTarget] = await resizeImageFile(file, currentImgTarget === "background" ? 1920 : 1400);
        render(); await persist(); flashStatus("Imagem atualizada e salva.");
      } catch (e) { flashStatus("Não foi possível carregar essa imagem.", true); }
      imgModal.classList.add("hidden"); currentImgTarget = null;
    });

    document.addEventListener("input", (e) => {
      if (!e.target.matches("input[data-field], textarea[data-field], [data-field][contenteditable]")) return;
      if (e.target.dataset.field === "loadCurrent") return;
      collectFromDOM();
      document.querySelectorAll("[data-mod-for]").forEach((label) => { label.textContent = fmtMod(modifier(state.fields[label.dataset.modFor])); });
      const xpGoalOut = document.getElementById("xpGoalOut");
      if (xpGoalOut) xpGoalOut.textContent = String((Number(state.fields.level) || 1) + 7);
      renderLoad();
    });
    document.addEventListener("change", (e) => {
      if (e.target.matches('input[type="radio"][data-field], select[data-field]')) { collectFromDOM(); render(); }
    });
  }

  async function init() {
    injectEnhancementStyles();
    installNotesTab();
    installInventoryUI();
    installCharactersUI();
    bindTabs();
    bindEvents();
    const stored = await idbGet("state");
    state = migrateState(stored);
    if (equipmentLoad() > loadMax()) {
      state.equipment = deepClone(DEFAULT_EQUIPMENT);
      state.fields.loadCurrent = equipmentLoad();
    }
    render();
    setEditing(false);
    await persist();

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
    }
  }

  init();
})();
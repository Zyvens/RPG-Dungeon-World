(() => {
  "use strict";

  /* ============================= Default data ============================= */
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
  const DEFENSES_DESC = {
    malha: "Cota de malha (armadura 1, peso 1) e equipamento de aventureiro (peso 1).",
    escamas: "Armadura de escamas (armadura 2, peso 3).",
  };

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
      weaponUpg: ["serrilhado", "brilha"],
      weaponUpgCreature: "",
      weaponLook: "ornada",

      bond1: "",
      bond2: "a pessoa escolhida para herdar o trono de Winterfell",
      bond3: "Eira",
      bond4: "",
      campaignNotes: "Proteger a pessoa escolhida para herdar o trono de Winterfell.",

      defenses: "escamas",
      gearChoice: ["escudo", "moedas"],

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
      story3: "Ao salvar uma patrulha e resgatar Eira, recebeu a Presa de Lofurin e passou de guerreiro a figura profética.",
      story4: "Seu maior medo não é morrer, mas falhar com Winterfell e com a pessoa que jurou proteger.",
    },
    images: { portrait: null, weaponImg: null, shieldImg: null, armorImg: null, background: null },
  };

  /* ============================= Tiny IndexedDB KV ============================= */
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
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      localStorage.setItem("kael-app:" + key, JSON.stringify(value));
    }
  }
  async function idbDelete(key) {
    try {
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      localStorage.removeItem("kael-app:" + key);
    }
  }

  /* ============================= State ============================= */
  let state = deepClone(DEFAULT_STATE);

  function deepClone(o) {
    return JSON.parse(JSON.stringify(o));
  }

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
  function fmtMod(n) {
    return n >= 0 ? `+${n}` : `−${Math.abs(n)}`;
  }
  function setDesc(key, map) {
    const el = document.querySelector(`[data-desc-for="${key}"]`);
    if (el) el.textContent = map[state.fields[key]] || "";
  }

  /* ============================= DOM refs ============================= */
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
  let currentImgTarget = null;

  /* ============================= Render ============================= */
  function render() {
    // text inputs / numbers / textareas (non radio/checkbox)
    document.querySelectorAll("input[data-field], textarea[data-field]").forEach((el) => {
      if (el.type === "radio" || el.type === "checkbox") return;
      const key = el.dataset.field;
      if (key in state.fields) el.value = state.fields[key];
    });

    // comboboxes (single-choice fields)
    document.querySelectorAll("select[data-field]").forEach((el) => {
      const key = el.dataset.field;
      if (key in state.fields) el.value = state.fields[key];
    });

    // contenteditable text fields
    document.querySelectorAll("[data-field][contenteditable]").forEach((el) => {
      const key = el.dataset.field;
      if (key in state.fields) el.textContent = state.fields[key];
    });

    // radios
    document.querySelectorAll('input[type="radio"][data-field]').forEach((el) => {
      const key = el.dataset.field;
      el.checked = state.fields[key] === el.value;
    });

    // checkbox groups (array-valued)
    document.querySelectorAll('input[type="checkbox"][data-field]').forEach((el) => {
      const key = el.dataset.field;
      if (Array.isArray(state.fields[key])) {
        el.checked = state.fields[key].includes(el.value);
      } else if (key in state.fields) {
        el.checked = !!state.fields[key];
      }
    });

    // modifiers
    document.querySelectorAll("[data-mod-for]").forEach((label) => {
      const key = label.dataset.modFor;
      label.textContent = fmtMod(modifier(state.fields[key]));
    });

    // computed outputs
    const xpGoalOut = document.getElementById("xpGoalOut");
    if (xpGoalOut) xpGoalOut.textContent = String((Number(state.fields.level) || 1) + 7);
    const loadMaxOut = document.getElementById("loadMaxOut");
    if (loadMaxOut) loadMaxOut.textContent = String(12 + modifier(state.fields.strength));

    // echo tags
    const tagRace = document.querySelector('[data-echo="race"]');
    if (tagRace) tagRace.textContent = RACE_LABELS[state.fields.race] || "—";
    const tagAlign = document.querySelector('[data-echo="alignment"]');
    if (tagAlign) tagAlign.textContent = ALIGN_LABELS[state.fields.alignment] || "—";

    // rule-text echoes under comboboxes
    setDesc("alignment", ALIGNMENT_DESC);
    setDesc("race", RACE_DESC);
    setDesc("defenses", DEFENSES_DESC);

    // images
    Object.keys(IMG_TARGETS).forEach((key) => {
      const src = state.images[key] || DEFAULT_ASSETS[key];
      IMG_TARGETS[key].forEach((id) => {
        const img = document.getElementById(id);
        if (img) img.src = src;
      });
    });

    // background
    const bgSrc = state.images.background || DEFAULT_ASSETS.background;
    bgLayer.style.setProperty("--bg-image", `url("${bgSrc}")`);

    document.title = `${state.fields.firstName} ${state.fields.lastName} — Ficha do Guerreiro`;
  }

  function collectFromDOM() {
    document.querySelectorAll("input[data-field], textarea[data-field]").forEach((el) => {
      const key = el.dataset.field;
      if (el.type === "radio") {
        if (el.checked) state.fields[key] = el.value;
      } else if (el.type === "checkbox") {
        if (!Array.isArray(state.fields[key])) return; // boolean checkboxes handled separately below
      } else {
        state.fields[key] = el.type === "number" ? Number(el.value) : el.value;
      }
    });
    document.querySelectorAll("select[data-field]").forEach((el) => {
      state.fields[el.dataset.field] = el.value;
    });
    // array-valued checkbox groups
    document.querySelectorAll('.choice-group[data-group]').forEach((group) => {
      const boxes = group.querySelectorAll('input[type="checkbox"]');
      if (!boxes.length) return;
      const key = boxes[0].dataset.field;
      if (Array.isArray(state.fields[key])) {
        state.fields[key] = Array.from(boxes).filter((b) => b.checked).map((b) => b.value);
      }
    });
    // boolean checkboxes (advanced moves)
    document.querySelectorAll('input[type="checkbox"][data-field]').forEach((el) => {
      const key = el.dataset.field;
      if (typeof DEFAULT_STATE.fields[key] === "boolean") {
        state.fields[key] = el.checked;
      }
    });
    // contenteditable
    document.querySelectorAll("[data-field][contenteditable]").forEach((el) => {
      state.fields[el.dataset.field] = el.textContent.trim();
    });
  }

  /* ============================= Persistence ============================= */
  async function loadState() {
    const stored = await idbGet("state");
    if (stored && stored.fields) {
      state = {
        fields: { ...DEFAULT_STATE.fields, ...stored.fields },
        images: { ...DEFAULT_STATE.images, ...(stored.images || {}) },
      };
    }
    render();
  }

  async function persist() {
    await idbSet("state", state);
  }

  function flashStatus(msg, isError) {
    saveStatus.textContent = msg;
    saveStatus.style.color = isError ? "var(--danger)" : "var(--ok)";
    setTimeout(() => { saveStatus.textContent = ""; }, 3200);
  }

  /* ============================= Edit mode ============================= */
  let editing = false;
  function setEditing(active) {
    editing = active;
    body.classList.toggle("editing", active);
    editToggle.classList.toggle("on", active);

    document.querySelectorAll("input[data-field], textarea[data-field], select[data-field]").forEach((el) => {
      el.disabled = !active;
    });
    document.querySelectorAll("[data-field][contenteditable]").forEach((el) => {
      el.setAttribute("contenteditable", active ? "true" : "false");
    });
  }

  editToggle.addEventListener("click", () => {
    if (!editing) {
      setEditing(true);
    } else {
      collectFromDOM();
      render();
      setEditing(false);
    }
  });

  saveBtn.addEventListener("click", async () => {
    collectFromDOM();
    render();
    await persist();
    setEditing(false);
    flashStatus("Ficha salva neste dispositivo.");
  });

  /* Cap checkbox groups at data-max */
  document.querySelectorAll(".choice-group[data-max]").forEach((group) => {
    const max = Number(group.dataset.max);
    group.addEventListener("change", (e) => {
      if (e.target.type !== "checkbox") return;
      const checked = group.querySelectorAll('input[type="checkbox"]:checked');
      if (checked.length > max) {
        e.target.checked = false;
        flashStatus(`Escolha no máximo ${max} opções.`, true);
      }
    });
  });

  /* ============================= Reset ============================= */
  let resetArmed = false;
  let resetTimer;
  resetBtn.addEventListener("click", async () => {
    if (!resetArmed) {
      resetArmed = true;
      resetBtn.textContent = "Confirmar restauração";
      flashStatus("Clique novamente para restaurar a ficha original de Kael.");
      resetTimer = setTimeout(() => {
        resetArmed = false;
        resetBtn.textContent = "Restaurar ficha original";
      }, 5000);
      return;
    }
    clearTimeout(resetTimer);
    state = deepClone(DEFAULT_STATE);
    await persist();
    render();
    setEditing(false);
    resetArmed = false;
    resetBtn.textContent = "Restaurar ficha original";
    flashStatus("Ficha original restaurada.");
  });

  /* ============================= Export / Import ============================= */
  exportBtn.addEventListener("click", () => {
    collectFromDOM();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kael-frostborn-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    flashStatus("Backup exportado.");
  });

  importBtn.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", async () => {
    const file = importFile.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.fields) throw new Error("formato inválido");
      state = {
        fields: { ...DEFAULT_STATE.fields, ...parsed.fields },
        images: { ...DEFAULT_STATE.images, ...(parsed.images || {}) },
      };
      await persist();
      render();
      flashStatus("Backup importado com sucesso.");
    } catch (e) {
      flashStatus("Não foi possível importar esse arquivo.", true);
    } finally {
      importFile.value = "";
    }
  });

  /* ============================= Image editing ============================= */
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
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/webp", quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  document.querySelectorAll("[data-img-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentImgTarget = btn.dataset.imgTarget;
      imgPickerInput.value = "";
      imgModal.classList.remove("hidden");
    });
  });
  bgEditBtn.addEventListener("click", () => {
    currentImgTarget = "background";
    imgPickerInput.value = "";
    imgModal.classList.remove("hidden");
  });
  imgPickerCancel.addEventListener("click", () => {
    imgModal.classList.add("hidden");
    currentImgTarget = null;
  });
  imgPickerRemove.addEventListener("click", async () => {
    if (currentImgTarget) {
      state.images[currentImgTarget] = null;
      render();
      await persist();
      flashStatus("Imagem original restaurada.");
    }
    imgModal.classList.add("hidden");
    currentImgTarget = null;
  });
  imgPickerInput.addEventListener("change", async () => {
    const file = imgPickerInput.files[0];
    if (!file || !currentImgTarget) return;
    try {
      const dataUrl = await resizeImageFile(file, currentImgTarget === "background" ? 1920 : 1400);
      state.images[currentImgTarget] = dataUrl;
      render();
      await persist();
      flashStatus("Imagem atualizada e salva.");
    } catch (e) {
      flashStatus("Não foi possível carregar essa imagem.", true);
    }
    imgModal.classList.add("hidden");
    currentImgTarget = null;
  });

  /* ============================= Tabs ============================= */
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  /* ============================= Live recompute on input ============================= */
  document.addEventListener("input", (e) => {
    if (e.target.matches("input[data-field], textarea[data-field], [data-field][contenteditable]")) {
      collectFromDOM();
      // Re-render only computed bits to avoid fighting the caret in contenteditable/text inputs
      document.querySelectorAll("[data-mod-for]").forEach((label) => {
        const key = label.dataset.modFor;
        label.textContent = fmtMod(modifier(state.fields[key]));
      });
      const xpGoalOut = document.getElementById("xpGoalOut");
      if (xpGoalOut) xpGoalOut.textContent = String((Number(state.fields.level) || 1) + 7);
      const loadMaxOut = document.getElementById("loadMaxOut");
      if (loadMaxOut) loadMaxOut.textContent = String(12 + modifier(state.fields.strength));
    }
  });
  document.addEventListener("change", (e) => {
    if (e.target.matches('input[type="radio"][data-field], select[data-field]')) {
      collectFromDOM();
      render();
    }
  });

  /* ============================= Service worker ============================= */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

  /* ============================= Init ============================= */
  loadState();
})();

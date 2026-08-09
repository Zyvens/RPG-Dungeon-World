(() => {
  'use strict';

  const KEY = 'kael-gameplay-maps-v1';
  const ACTIVE = 'kael-gameplay-active-v1';
  let dragging = null;
  let pointerId = null;

  function readState() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { return null; }
  }
  function writeState(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
  }
  function activeMap(state) {
    if (!state || !Array.isArray(state.maps)) return null;
    const id = localStorage.getItem(ACTIVE) || state.activeId;
    return state.maps.find(m => m.id === id) || state.maps[0] || null;
  }

  function installStyle() {
    if (document.getElementById('turns-basic-v22-style')) return;
    const s = document.createElement('style');
    s.id = 'turns-basic-v22-style';
    s.textContent = `
      .gp-turn-handle{display:none;align-items:center;justify-content:center;width:30px;height:30px;margin-right:5px;border:1px solid rgba(193,154,91,.55);border-radius:7px;color:var(--gold2);background:rgba(9,20,31,.92);font-weight:900;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}
      body.editing #gpPinList .gp-turn-handle{display:inline-flex}
      body.editing #gpPinList .gp-pin-editor{cursor:default}
      #gpPinList .gp-pin-editor.turn-dragging{opacity:.62;border-color:var(--gold)!important;box-shadow:0 8px 24px rgba(0,0,0,.32)}
      #gpPinList .gp-turn-number{display:flex;align-items:center;justify-content:flex-start;gap:4px}
    `;
    document.head.appendChild(s);
  }

  function decorateRows() {
    const root = document.getElementById('gpPinList');
    if (!root) return;
    root.querySelectorAll('.gp-pin-editor').forEach(row => {
      const cell = row.querySelector('.gp-turn-number');
      if (!cell || cell.querySelector('.gp-turn-handle')) return;
      const h = document.createElement('span');
      h.className = 'gp-turn-handle';
      h.textContent = '☰';
      h.title = 'Arraste para mudar a ordem do turno';
      h.setAttribute('aria-label','Arraste para mudar a ordem do turno');
      cell.prepend(h);
    });
  }

  function persistOrder() {
    const root = document.getElementById('gpPinList');
    const state = readState();
    const map = activeMap(state);
    if (!root || !map) return;
    const rows = [...root.querySelectorAll('.gp-pin-editor')];
    rows.forEach((row, i) => {
      const pin = map.pins.find(p => p.id === row.dataset.pinEditor);
      if (pin) pin.turn = i + 1;
      const n = row.querySelector('.gp-turn-number');
      if (n) {
        [...n.childNodes].forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) node.remove();
        });
        let label = n.querySelector('.gp-turn-label');
        if (!label) {
          label = document.createElement('span');
          label.className = 'gp-turn-label';
          n.appendChild(label);
        }
        label.textContent = String(i + 1);
      }
    });
    writeState(state);
  }

  function moveDrag(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    e.preventDefault();
    const root = document.getElementById('gpPinList');
    if (!root) return;
    const others = [...root.querySelectorAll('.gp-pin-editor')].filter(r => r !== dragging);
    const target = others.find(r => {
      const b = r.getBoundingClientRect();
      return e.clientY < b.top + b.height / 2;
    });
    if (target) root.insertBefore(dragging, target);
    else root.appendChild(dragging);
  }

  function endDrag(e) {
    if (!dragging) return;
    if (e && e.pointerId !== pointerId) return;
    dragging.classList.remove('turn-dragging');
    dragging = null;
    pointerId = null;
    document.removeEventListener('pointermove', moveDrag);
    document.removeEventListener('pointerup', endDrag);
    document.removeEventListener('pointercancel', endDrag);
    persistOrder();
  }

  document.addEventListener('pointerdown', e => {
    const handle = e.target.closest('.gp-turn-handle');
    if (!handle || !document.body.classList.contains('editing')) return;
    const row = handle.closest('.gp-pin-editor');
    if (!row) return;
    e.preventDefault();
    e.stopPropagation();
    dragging = row;
    pointerId = e.pointerId;
    row.classList.add('turn-dragging');
    document.addEventListener('pointermove', moveDrag, { passive:false });
    document.addEventListener('pointerup', endDrag, { passive:false });
    document.addEventListener('pointercancel', endDrag, { passive:false });
  });

  document.addEventListener('click', e => {
    if (e.target.closest('[data-tab="gameplay"],#editBtn,#saveBtn,#gpAddPin,#gpDeleteMap,#gpTurnToggle,#gpNextTurn')) {
      setTimeout(decorateRows, 0);
    }
  });
  document.addEventListener('change', e => {
    if (e.target.closest('#gpMapSelect,#gpSize,[data-type],[data-status]')) setTimeout(decorateRows, 0);
  });

  installStyle();
  setTimeout(decorateRows, 0);
})();
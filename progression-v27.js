(() => {
  'use strict';

  const KEY = 'kael-progression-v1';
  const ATTRS = [
    ['strength','FOR','Força'],['dexterity','DES','Destreza'],['constitution','CON','Constituição'],
    ['intelligence','INT','Inteligência'],['wisdom','SAB','Sabedoria'],['charisma','CAR','Carisma']
  ];
  let message = '';

  const q = (sel) => document.querySelector(sel);
  const field = (name) => q(`[data-field="${name}"]`);
  const num = (name) => Number(field(name)?.value || 0);
  const moveChecks = () => [...document.querySelectorAll('#tab-avancados input[type="checkbox"][data-field^="adv_"]')];

  function readMeta() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { return null; }
  }
  function writeMeta(m) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (_) {} }

  function ensureMeta() {
    let m = readMeta();
    if (m?.baseScores && Number.isFinite(m.baseLevel)) return m;
    const level = Math.max(1, Math.min(10, num('level') || 1));
    const baseScores = {};
    ATTRS.forEach(([key]) => baseScores[key] = Math.max(3, Math.min(18, num(key) || 3)));
    m = { baseLevel: level, baseScores, baseMoveCount: moveChecks().filter(x => x.checked).length, createdAt: new Date().toISOString() };
    writeMeta(m);
    return m;
  }

  function entitlement(meta) {
    return Math.max(0, (num('level') || 1) - meta.baseLevel);
  }
  function spentAttributes(meta) {
    return ATTRS.reduce((sum,[key]) => sum + Math.max(0, num(key) - Number(meta.baseScores[key] || 0)), 0);
  }
  function chosenMoves(meta) {
    return Math.max(0, moveChecks().filter(x => x.checked).length - Number(meta.baseMoveCount || 0));
  }
  function status(meta) {
    const earned = entitlement(meta);
    const attrSpent = spentAttributes(meta);
    const moveSpent = chosenMoves(meta);
    return {
      earned,
      attrSpent,
      moveSpent,
      pendingAttr: Math.max(0, earned - attrSpent),
      pendingMoves: Math.max(0, earned - moveSpent),
      overAttr: Math.max(0, attrSpent - earned),
      overMoves: Math.max(0, moveSpent - earned)
    };
  }

  function fire(el) {
    el.dispatchEvent(new Event('input', { bubbles:true }));
    el.dispatchEvent(new Event('change', { bubbles:true }));
  }

  function styles() {
    if (document.getElementById('dw-progression-styles')) return;
    const s = document.createElement('style');
    s.id = 'dw-progression-styles';
    s.textContent = `
      .dw-progression{margin:14px 0 4px;padding:14px;border:1px solid rgba(193,154,91,.32);border-radius:13px;background:linear-gradient(135deg,rgba(193,154,91,.08),rgba(7,17,27,.55));display:grid;gap:12px}
      .dw-progression-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}.dw-progression-head h3{margin:0;font-size:1rem;color:var(--gold2)}.dw-progression-head p{margin:3px 0 0;color:var(--muted);font-size:.78rem;line-height:1.4}
      .dw-progression-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.dw-kpi{padding:10px;border:1px solid var(--line);border-radius:10px;background:rgba(7,17,27,.55)}.dw-kpi b{display:block;font-size:1.18rem;color:var(--ice)}.dw-kpi span{font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.055em}
      .dw-attrs-unlocked{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}.dw-attr-up{min-height:52px;padding:6px;border:1px solid var(--line);border-radius:9px;background:rgba(9,20,31,.78);color:var(--white);font:inherit;cursor:pointer;display:grid;place-items:center;gap:2px}.dw-attr-up b{font-size:.76rem}.dw-attr-up small{color:var(--muted)}.dw-attr-up:not(:disabled):hover{border-color:var(--gold)}.dw-attr-up:disabled{opacity:.45;cursor:default}.dw-attr-up .plus{color:var(--gold2);font-weight:900}
      .dw-progression-actions{display:flex;flex-wrap:wrap;gap:7px;align-items:center}.dw-prog-btn{min-height:36px;border:1px solid var(--line);border-radius:9px;background:rgba(16,31,45,.9);color:var(--white);padding:0 11px;font-weight:750;cursor:pointer}.dw-prog-btn.primary{border-color:rgba(193,154,91,.55);color:var(--gold2)}.dw-prog-btn:disabled{opacity:.38;cursor:default}.dw-prog-msg{min-height:1.2em;margin:0;color:var(--muted);font-size:.76rem;line-height:1.4}.dw-prog-msg.warn{color:#ffc08b}.dw-prog-msg.ok{color:#9fe2bb}
      .dw-level-mini{display:none;gap:4px;margin-top:5px}.editing .dw-level-mini{display:flex}.dw-level-mini button{width:31px;height:29px;padding:0;border:1px solid var(--line);border-radius:7px;background:rgba(16,31,45,.9);color:var(--white);font-weight:900;cursor:pointer}.dw-level-mini button:last-child{color:var(--gold2)}
      @media(max-width:760px){.dw-progression-kpis{grid-template-columns:1fr 1fr}.dw-progression-kpis .dw-kpi:last-child{grid-column:1/-1}.dw-attrs-unlocked{grid-template-columns:repeat(3,1fr)}}
    `;
    document.head.appendChild(s);
  }

  function tierText(level) {
    if (level <= 1) return 'Nível 1 — movimentos iniciais';
    if (level <= 5) return 'Movimentos avançados de níveis 2–5';
    if (level <= 10) return 'Movimentos de níveis 6–10 e também os de 2–5';
    return 'Além do 10º nível';
  }

  function installLevelButtons() {
    const level = field('level');
    if (!level || document.getElementById('dwLevelMini')) return;
    const box = document.createElement('div');
    box.id = 'dwLevelMini'; box.className = 'dw-level-mini';
    box.innerHTML = '<button type="button" data-level-down title="Reduzir nível manualmente">−</button><button type="button" data-level-up title="Avançar de nível usando XP">+</button>';
    level.insertAdjacentElement('afterend', box);
    box.querySelector('[data-level-down]').onclick = () => adjustDown();
    box.querySelector('[data-level-up]').onclick = () => advanceByRules();
  }

  function installPanel() {
    const stats = q('#tab-ficha .stats-grid');
    if (!stats || document.getElementById('dwProgressionPanel')) return false;
    const panel = document.createElement('div');
    panel.id = 'dwProgressionPanel'; panel.className = 'dw-progression';
    stats.insertAdjacentElement('afterend', panel);
    return true;
  }

  function render() {
    styles(); installLevelButtons(); installPanel();
    const panel = document.getElementById('dwProgressionPanel');
    if (!panel) return;
    const meta = ensureMeta();
    const st = status(meta);
    const level = Math.max(1, Math.min(10, num('level') || 1));
    const xp = Math.max(0, num('xp') || 0);
    const xpCost = level + 7;
    const canAdvance = level < 10 && xp >= xpCost;
    const editing = document.body.classList.contains('editing');
    const atMax = ATTRS.every(([k]) => num(k) >= 18);
    const msgClass = st.overAttr || st.overMoves ? 'warn' : (message ? 'ok' : '');
    const special10 = level === 10 ? '<p class="dw-prog-msg warn"><b>Nível 10:</b> o próximo marco não é nível 11 normal. Ao reunir XP suficiente, Dungeon World manda escolher entre aposentar-se, receber um aprendiz ou adotar uma nova classe.</p>' : '';

    panel.innerHTML = `
      <div class="dw-progression-head"><div><h3>Progressão de nível</h3><p>Cada nível conquistado libera 1 aumento de +1 em uma habilidade e 1 movimento avançado.</p></div><div><b>${xp} / ${xpCost} XP</b><p>${level < 10 ? (canAdvance ? 'XP suficiente para avançar' : `Faltam ${Math.max(0,xpCost-xp)} XP`) : 'Nível máximo da progressão normal'}</p></div></div>
      <div class="dw-progression-kpis">
        <div class="dw-kpi"><b>${st.pendingAttr}</b><span>Pontos à distribuir</span></div>
        <div class="dw-kpi"><b>${st.pendingMoves}</b><span>Movimentos a escolher</span></div>
        <div class="dw-kpi"><b>${level}</b><span>${tierText(level)}</span></div>
      </div>
      <div><p class="field-label" style="margin:0 0 6px">Atributos disponíveis para +1</p><div class="dw-attrs-unlocked">${ATTRS.map(([key,abbr,label]) => {
        const score = num(key); const disabled = !editing || st.pendingAttr < 1 || score >= 18;
        return `<button type="button" class="dw-attr-up" data-attr-up="${key}" ${disabled?'disabled':''} title="${label}: ${score}${score>=18?' — máximo 18':''}"><b>${abbr}</b><small>${score}</small><span class="plus">+1</span></button>`;
      }).join('')}</div></div>
      <div class="dw-progression-actions">
        <button type="button" class="dw-prog-btn primary" data-official-up ${(!editing || !canAdvance)?'disabled':''}>↑ Avançar com XP (${xpCost})</button>
        <button type="button" class="dw-prog-btn" data-open-moves ${st.pendingMoves<1?'disabled':''}>Escolher movimento avançado</button>
      </div>
      ${special10}
      <p class="dw-prog-msg ${msgClass}">${message || (st.overAttr ? `Atenção: há ${st.overAttr} aumento(s) de atributo acima do total liberado pelo nível registrado.` : st.overMoves ? `Atenção: há ${st.overMoves} movimento(s) marcado(s) acima do total liberado.` : atMax && st.pendingAttr ? 'Todos os atributos já chegaram ao máximo 18.' : 'Alterar o nível manualmente funciona como correção de ficha; somente “Avançar com XP” desconta experiência automaticamente.')}</p>`;

    panel.querySelectorAll('[data-attr-up]').forEach(btn => btn.onclick = () => spendPoint(btn.dataset.attrUp));
    panel.querySelector('[data-official-up]')?.addEventListener('click', advanceByRules);
    panel.querySelector('[data-open-moves]')?.addEventListener('click', () => q('.tab-btn[data-tab="avancados"]')?.click());
  }

  function advanceByRules() {
    if (!document.body.classList.contains('editing')) return;
    const levelEl = field('level'), xpEl = field('xp');
    if (!levelEl || !xpEl) return;
    const level = Math.max(1, Math.min(10, Number(levelEl.value)||1));
    if (level >= 10) { message = 'No nível 10, o próximo avanço usa as opções “Além do 10º nível”, não um nível 11 normal.'; render(); return; }
    const cost = level + 7;
    const xp = Math.max(0, Number(xpEl.value)||0);
    if (xp < cost) { message = `XP insuficiente: são necessários ${cost} XP para avançar do nível ${level}.`; render(); return; }
    xpEl.value = String(xp - cost);
    levelEl.value = String(level + 1);
    fire(xpEl); fire(levelEl);
    message = `Nível ${level + 1} alcançado. ${cost} XP foram gastos; distribua +1 em uma habilidade e escolha 1 movimento avançado.`;
    setTimeout(render, 0);
  }

  function adjustDown() {
    if (!document.body.classList.contains('editing')) return;
    const el = field('level'); if (!el) return;
    const level = Math.max(1, Number(el.value)||1);
    if (level <= 1) return;
    el.value = String(level - 1); fire(el);
    message = 'Nível reduzido como correção manual. XP, atributos e movimentos já escolhidos não foram revertidos automaticamente.';
    setTimeout(render, 0);
  }

  function spendPoint(key) {
    if (!document.body.classList.contains('editing')) return;
    const meta = ensureMeta(); const st = status(meta);
    if (st.pendingAttr < 1) return;
    const el = field(key); if (!el) return;
    const before = Number(el.value)||0;
    if (before >= 18) { message = 'Esse atributo já atingiu o máximo 18.'; render(); return; }
    el.value = String(before + 1);
    fire(el);
    if (key === 'constitution') {
      const hpMax = field('hpMax'), hpCurrent = field('hpCurrent');
      if (hpMax) { hpMax.value = String((Number(hpMax.value)||0) + 1); fire(hpMax); }
      if (hpCurrent) { hpCurrent.value = String((Number(hpCurrent.value)||0) + 1); fire(hpCurrent); }
    }
    const name = ATTRS.find(x=>x[0]===key)?.[2] || key;
    message = `${name} aumentou de ${before} para ${before+1}.` + (key==='constitution' ? ' PV máximo e atual também aumentaram em 1.' : '');
    setTimeout(render, 0);
  }

  function boot() {
    styles();
    if (!installPanel()) { setTimeout(boot, 300); return; }
    installLevelButtons(); ensureMeta(); render();

    document.addEventListener('input', e => {
      if (e.target.matches('[data-field="level"],[data-field="xp"],[data-field="strength"],[data-field="dexterity"],[data-field="constitution"],[data-field="intelligence"],[data-field="wisdom"],[data-field="charisma"]')) setTimeout(render,0);
    });
    document.addEventListener('change', e => {
      if (e.target.matches('#tab-avancados input[type="checkbox"][data-field^="adv_"],[data-field="level"]')) setTimeout(render,0);
    });
    q('#editToggle')?.addEventListener('click', () => setTimeout(render,0));
    q('#saveBtn')?.addEventListener('click', () => setTimeout(render,0));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot,150), {once:true});
  else setTimeout(boot,150);
})();

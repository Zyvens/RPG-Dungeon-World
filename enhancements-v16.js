(() => {
  'use strict';

  const RACE_MOVES = {
    anao: ['Anão — Negociador resistente', 'Quando compartilhar uma bebida com alguém, você pode negociar com aquela pessoa usando CON no lugar de CAR.'],
    elfo: ['Elfo — Familiaridade com armas', 'Escolha uma arma: você trata armas daquele tipo como se sempre possuíssem o rótulo precisa.'],
    halfling: ['Halfling — Tamanho diminuto', 'Quando desafiar o perigo e usar seu tamanho diminuto em sua vantagem, receba +1.'],
    humano: ['Humano — Rerrolagem de dano', 'Uma vez por batalha, você pode rolar novamente um rolamento de dano (seu ou de outra pessoa).']
  };

  function installRaceMove() {
    const select = document.querySelector('select[data-field="race"]');
    const list = document.querySelector('#tab-ficha .moves-list');
    if (!select || !list) return;
    let move = document.getElementById('humanRerollMove') || list.querySelector('[data-race-move]');
    if (!move) {
      move = document.createElement('div');
      move.className = 'move';
      list.appendChild(move);
    }
    move.id = 'racialMove';
    move.dataset.raceMove = '1';
    const update = () => {
      const [title, text] = RACE_MOVES[select.value] || RACE_MOVES.humano;
      if (move.dataset.raceValue === select.value) return;
      move.dataset.raceValue = select.value;
      let b = move.querySelector('b');
      let span = move.querySelector('span');
      if (!b) { b = document.createElement('b'); move.appendChild(b); }
      if (!span) { span = document.createElement('span'); move.appendChild(span); }
      b.textContent = title;
      span.textContent = text;
    };
    update();
    if (!select.dataset.safeRaceMoveBound) {
      select.dataset.safeRaceMoveBound = '1';
      select.addEventListener('change', () => setTimeout(update, 0));
    }
  }

  function installInventoryStyles() {
    if (document.getElementById('dual-weight-styles')) return;
    const style = document.createElement('style');
    style.id = 'dual-weight-styles';
    style.textContent = `
      .inventory-row{grid-template-columns:minmax(150px,1.05fr) minmax(210px,1.7fr) 92px 92px 78px 48px!important}
      .inventory-labels{grid-template-columns:minmax(150px,1.05fr) minmax(210px,1.7fr) 92px 92px 78px 48px!important}
      .inv-total-weight{width:100%}
      @media(max-width:760px){
        .inventory-row{grid-template-columns:1fr 72px 72px 66px 42px!important}
        .inventory-row .inv-name{grid-column:1/-1!important;grid-row:1!important}
        .inventory-row .inv-desc{grid-column:1/-1!important;grid-row:2!important}
        .inventory-row .inv-weight{grid-column:2!important;grid-row:3!important}
        .inventory-row .inv-total-weight{grid-column:3!important;grid-row:3!important}
        .inventory-row .inv-qty{grid-column:4!important;grid-row:3!important}
        .inventory-row .inv-remove{grid-column:5!important;grid-row:3!important}
      }
    `;
    document.head.appendChild(style);
  }

  const num = v => Math.max(0, Number(v) || 0);
  const roundWeight = v => Math.round((num(v) + Number.EPSILON) * 1000) / 1000;

  function enhanceInventoryLabels() {
    const labels = document.querySelector('.inventory-labels');
    if (!labels || labels.dataset.dualWeight === '1') return;
    labels.dataset.dualWeight = '1';
    labels.innerHTML = '<span>Nome</span><span>Descrição</span><span>Peso unit.</span><span>Peso total</span><span>Qtd.</span><span></span>';
  }

  function enhanceInventoryRows() {
    document.querySelectorAll('#inventoryList .inventory-row').forEach(row => {
      if (row.dataset.dualWeight === '1') return;
      const unit = row.querySelector('.inv-weight');
      const qty = row.querySelector('.inv-qty');
      if (!unit || !qty) return;

      const total = document.createElement('input');
      total.className = 'field-input inv-total-weight';
      total.type = 'number';
      total.min = '0';
      total.step = '0.1';
      total.setAttribute('aria-label', 'Peso total do equipamento');
      total.title = 'Peso total = peso unitário × quantidade';
      total.disabled = unit.disabled;
      qty.insertAdjacentElement('beforebegin', total);

      const syncFromUnit = () => {
        total.disabled = unit.disabled;
        total.value = String(roundWeight(num(unit.value) * num(qty.value)));
      };

      const syncFromTotal = () => {
        let q = Math.floor(num(qty.value));
        const desiredTotal = num(total.value);
        if (q < 1 && desiredTotal > 0) {
          q = 1;
          qty.value = '1';
          qty.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const nextUnit = q > 0 ? roundWeight(desiredTotal / q) : 0;
        unit.value = String(nextUnit);
        unit.dispatchEvent(new Event('change', { bubbles: true }));
        setTimeout(syncFromUnit, 0);
      };

      unit.addEventListener('input', syncFromUnit);
      qty.addEventListener('input', syncFromUnit);
      unit.addEventListener('change', () => setTimeout(syncFromUnit, 0));
      qty.addEventListener('change', () => setTimeout(syncFromUnit, 0));
      total.addEventListener('change', syncFromTotal);
      total.addEventListener('blur', syncFromTotal);
      row.dataset.dualWeight = '1';
      syncFromUnit();
    });
  }

  function enhanceInventory() {
    installInventoryStyles();
    enhanceInventoryLabels();
    enhanceInventoryRows();
  }

  function init() {
    installRaceMove();
    enhanceInventory();
    const observer = new MutationObserver(() => {
      enhanceInventoryLabels();
      enhanceInventoryRows();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
(() => {
  'use strict';

  const TARGET_SELECTOR = [
    '.hero-portrait',
    '.weapon-showcase',
    '.gear-visual',
    '#dynamicPeopleGrid .person'
  ].join(',');

  function style() {
    if (document.getElementById('character-ui-fix-v31')) return;
    const s = document.createElement('style');
    s.id = 'character-ui-fix-v31';
    s.textContent = `
      /* Imagens: o card inteiro é o controle. Nenhum botão deve cobrir a arte. */
      body.editing .hero-portrait,
      body.editing .weapon-showcase,
      body.editing .gear-visual,
      body.editing #dynamicPeopleGrid .person {
        cursor: pointer;
      }

      /* Os botões antigos continuam no DOM só para preservar a lógica existente,
         mas nunca ficam sobre a imagem. */
      body.editing .hero-portrait > .img-edit-btn,
      body.editing .weapon-showcase > .img-edit-btn,
      body.editing .gear-visual > .img-edit-btn,
      body.editing #dynamicPeopleGrid .person .img-edit-btn {
        display: none !important;
      }

      /* Se um slot estiver realmente vazio, mostramos somente uma indicação discreta. */
      .image-slot-empty {
        position: relative;
      }
      .image-slot-empty::after {
        content: 'Clique para trocar a imagem';
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        max-width: calc(100% - 28px);
        padding: 8px 12px;
        border: 1px solid rgba(217, 237, 245, .28);
        border-radius: 999px;
        background: rgba(7, 17, 27, .78);
        color: #d7edf7;
        font-size: .72rem;
        font-weight: 700;
        line-height: 1.2;
        text-align: center;
        pointer-events: none;
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        z-index: 4;
      }

      /* Personagens dinâmicos: fora da edição, foto e conteúdo ficam legíveis,
         enquanto controles de gestão permanecem ocultos. */
      body:not(.editing) #dynamicPeopleGrid .person button,
      body:not(.editing) #dynamicPeopleGrid .person [role='button'],
      body:not(.editing) #dynamicPeopleGrid .person input[type='file'] {
        display: none !important;
      }
      body:not(.editing) #dynamicPeopleGrid .person input,
      body:not(.editing) #dynamicPeopleGrid .person textarea {
        pointer-events: none;
      }
    `;
    document.head.appendChild(s);
  }

  function imageOf(slot) {
    return slot.querySelector('img');
  }

  function hasUsableImage(slot) {
    const img = imageOf(slot);
    if (!img) return false;
    const src = (img.getAttribute('src') || '').trim();
    return Boolean(src) && !img.classList.contains('image-missing') && img.naturalWidth !== 0;
  }

  function markSlots() {
    document.querySelectorAll(TARGET_SELECTOR).forEach(slot => {
      const img = imageOf(slot);
      const empty = !img || !hasUsableImage(slot);
      slot.classList.toggle('image-slot-empty', empty);
      if (img && !img.dataset.imageUiBound) {
        img.dataset.imageUiBound = '1';
        img.addEventListener('load', markSlots);
        img.addEventListener('error', () => {
          img.classList.add('image-missing');
          markSlots();
        });
      }
    });
  }

  function findTarget(slot) {
    const button = slot.querySelector('[data-img-target]');
    return button?.dataset.imgTarget || null;
  }

  function openPicker(target) {
    if (!target) return;
    const button = document.querySelector(`[data-img-target="${CSS.escape(target)}"]`);
    if (button) button.click();
  }

  function bindSlots() {
    document.querySelectorAll(TARGET_SELECTOR).forEach(slot => {
      if (slot.dataset.imageUiBound) return;
      const target = findTarget(slot);
      if (!target) return;
      slot.dataset.imageUiBound = '1';
      slot.setAttribute('role', 'button');
      slot.tabIndex = 0;
      slot.setAttribute('aria-label', 'Trocar imagem');
      slot.addEventListener('click', e => {
        if (!document.body.classList.contains('editing')) return;
        if (e.target.closest('button, input, textarea, select, a, label')) return;
        openPicker(target);
      });
      slot.addEventListener('keydown', e => {
        if (!document.body.classList.contains('editing')) return;
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        openPicker(target);
      });
    });
  }

  function refresh() {
    style();
    bindSlots();
    markSlots();
  }

  const obs = new MutationObserver(() => refresh());
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      refresh();
      obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'class'] });
    }, { once: true });
  } else {
    refresh();
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'class'] });
  }
})();

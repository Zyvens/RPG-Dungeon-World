(() => {
  'use strict';

  const PREFIX = 'kael-character-image:';
  let activePersonId = null;

  function escAttr(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function imageKey(id) { return PREFIX + id; }
  function getImage(id) { try { return localStorage.getItem(imageKey(id)) || ''; } catch (_) { return ''; } }
  function setImage(id, value) {
    try {
      if (value) localStorage.setItem(imageKey(id), value);
      else localStorage.removeItem(imageKey(id));
    } catch (_) {}
  }

  function resizeImage(file, maxDim = 900, quality = .84) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/webp', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function styles() {
    if (document.getElementById('character-image-styles-v29')) return;
    const s = document.createElement('style');
    s.id = 'character-image-styles-v29';
    s.textContent = `
      .dynamic-people .person{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:start}
      .character-photo-wrap{width:92px;min-width:92px;display:grid;gap:7px;align-content:start}
      .character-photo{width:92px;aspect-ratio:1/1;border:1px solid rgba(217,237,245,.17);border-radius:11px;background:rgba(7,17,27,.62);overflow:hidden;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:.68rem;text-align:center}
      .character-photo img{width:100%;height:100%;object-fit:cover;display:block}
      .character-photo-actions{display:flex;gap:5px;flex-wrap:wrap}
      .character-photo-btn{min-height:30px;flex:1 1 auto;padding:0 7px;border:1px solid var(--line);border-radius:7px;background:rgba(16,31,45,.9);color:var(--white);font-size:.68rem;font-weight:700;cursor:pointer}
      .character-photo-btn.remove{color:#ffaaaa;border-color:rgba(255,105,105,.25)}
      body:not(.editing) .character-photo-actions{display:none!important}
      body:not(.editing) .character-photo-wrap.no-photo{display:none}
      @media(max-width:640px){.dynamic-people .person{grid-template-columns:72px minmax(0,1fr);gap:10px}.character-photo-wrap,.character-photo{width:72px;min-width:72px}}
    `;
    document.head.appendChild(s);
  }

  function ensurePicker() {
    if (document.getElementById('characterPhotoInput')) return;
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.hidden = true; input.id = 'characterPhotoInput';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file || !activePersonId) { input.value = ''; return; }
      try {
        const data = await resizeImage(file);
        setImage(activePersonId, data);
        enhanceCharacters();
        document.dispatchEvent(new CustomEvent('kael:character-photo-changed', { detail:{ personId: activePersonId } }));
      } catch (e) { console.error('[Kael character photo]', e); }
      input.value = ''; activePersonId = null;
    });
  }

  function enhanceCharacters() {
    styles(); ensurePicker();
    const grid = document.getElementById('dynamicPeopleGrid');
    if (!grid) return;
    grid.querySelectorAll('.person[data-person-id]').forEach(card => {
      const id = card.dataset.personId;
      const old = card.querySelector('.character-photo-wrap');
      if (old) old.remove();
      const image = getImage(id);
      const wrap = document.createElement('div');
      wrap.className = 'character-photo-wrap' + (image ? '' : ' no-photo');
      wrap.innerHTML = `
        <div class="character-photo">${image ? `<img src="${escAttr(image)}" alt="Foto do personagem">` : '<span>Sem foto</span>'}</div>
        <div class="character-photo-actions">
          <button type="button" class="character-photo-btn" data-character-photo>${image ? 'Trocar foto' : 'Adicionar foto'}</button>
          ${image ? '<button type="button" class="character-photo-btn remove" data-character-photo-remove>Remover</button>' : ''}
        </div>`;
      const fields = card.querySelector('.person-fields');
      if (fields) card.insertBefore(wrap, fields); else card.prepend(wrap);
      wrap.querySelector('[data-character-photo]')?.addEventListener('click', () => {
        if (!document.body.classList.contains('editing')) return;
        activePersonId = id;
        document.getElementById('characterPhotoInput')?.click();
      });
      wrap.querySelector('[data-character-photo-remove]')?.addEventListener('click', () => {
        if (!document.body.classList.contains('editing')) return;
        setImage(id, '');
        enhanceCharacters();
        document.dispatchEvent(new CustomEvent('kael:character-photo-changed', { detail:{ personId:id } }));
      });
    });
  }

  function schedule() { setTimeout(enhanceCharacters, 40); }

  function boot() {
    styles(); ensurePicker(); schedule();
    document.querySelector('.tab-btn[data-tab="historia"]')?.addEventListener('click', schedule);
    document.getElementById('editToggle')?.addEventListener('click', schedule);
    document.getElementById('saveBtn')?.addEventListener('click', schedule);
    document.getElementById('addCharacterBtn')?.addEventListener('click', schedule);
    document.addEventListener('click', e => {
      if (e.target.closest('#addCharacterBtn,.person-remove')) schedule();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 200), { once:true });
  else setTimeout(boot, 200);
})();

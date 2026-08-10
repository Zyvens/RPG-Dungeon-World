(() => {
  'use strict';
  const style = document.createElement('style');
  style.id = 'mobile-hud-v30';
  style.textContent = `
    @media (max-width: 720px) {
      /* HUD mobile: preserva a hierarquia 2 + 3 sem esmagar títulos. */
      .hud-strip { gap: 8px; }
      .hud-row { gap: 8px; }
      .hud-row-primary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .hud-row-secondary { grid-template-columns: repeat(3, minmax(0, 1fr)); }

      .hud-item {
        min-width: 0;
        gap: 7px;
        padding: 10px 9px;
        border-radius: 14px;
      }
      .hud-icon { width: 20px; height: 20px; }
      .hud-body { min-width: 0; gap: 2px; }
      .hud-body .field-label {
        font-size: clamp(.56rem, 2.55vw, .68rem);
        letter-spacing: .045em;
        line-height: 1.15;
        white-space: normal;
        overflow-wrap: anywhere;
      }
      .hud-input {
        min-width: 0;
        width: 100%;
        font-size: clamp(.92rem, 4.2vw, 1.08rem);
        padding: 3px 2px;
      }
      .hud-pair { min-width: 0; gap: 3px; }
      .hud-pair .hud-input { width: min(2.65em, 38%); padding-inline: 1px; }
      .hud-sep { flex: 0 0 auto; }

      /* A linha de PV precisa de um pouco mais de largura que Armadura/Dano. */
      .hud-row-secondary { grid-template-columns: minmax(0, 1.28fr) minmax(0, .86fr) minmax(0, .86fr); }

      /* Card principal mais eficiente em telas estreitas. */
      #tab-ficha > .card { padding: 16px 12px; }
      .rule-note { font-size: .72rem; line-height: 1.45; }
    }

    @media (max-width: 390px) {
      .hud-row-secondary { grid-template-columns: minmax(0, 1.35fr) minmax(0, .82fr) minmax(0, .83fr); }
      .hud-item { padding-inline: 7px; gap: 5px; }
      .hud-icon { width: 18px; height: 18px; }
      .hud-body .field-label { font-size: .54rem; letter-spacing: .025em; }
    }
  `;
  document.head.appendChild(style);
})();

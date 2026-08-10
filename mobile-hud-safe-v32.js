(() => {
  'use strict';
  if (document.getElementById('mobile-hud-safe-v32')) return;
  const s=document.createElement('style');
  s.id='mobile-hud-safe-v32';
  s.textContent=`
  @media(max-width:720px){
    #tab-ficha .hud-row-primary{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px}
    #tab-ficha .hud-row-secondary{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px}
    #tab-ficha .hud-row-secondary .hud-item:first-child{grid-column:1/-1}
    #tab-ficha .hud-item{min-width:0;padding:10px 11px;gap:8px;overflow:hidden}
    #tab-ficha .hud-body{min-width:0}
    #tab-ficha .hud-body .field-label{font-size:.63rem;line-height:1.15;letter-spacing:.04em;white-space:normal;overflow-wrap:normal;word-break:normal}
    #tab-ficha .hud-input{font-size:1rem;min-width:0;padding:3px 2px}
    #tab-ficha .hud-pair{min-width:0;gap:4px;flex-wrap:nowrap}
    #tab-ficha .hud-pair .hud-input{width:3em;max-width:42%;min-width:0}
    #tab-ficha .hud-icon{width:20px;height:20px;flex:0 0 20px}
  }
  @media(max-width:390px){
    #tab-ficha .hud-item{padding:9px 8px;gap:6px}
    #tab-ficha .hud-body .field-label{font-size:.58rem;letter-spacing:.025em}
    #tab-ficha .hud-input{font-size:.94rem}
    #tab-ficha .hud-icon{width:18px;height:18px;flex-basis:18px}
  }`;
  document.head.appendChild(s);
})();
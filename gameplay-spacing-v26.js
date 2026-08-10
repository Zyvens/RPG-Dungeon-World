(() => {
  'use strict';
  const style = document.createElement('style');
  style.id = 'gameplay-spacing-v26';
  style.textContent = `
    /* Pequeno respiro visual entre as linhas de configuração dos pins. */
    #gpPinList { display: grid; gap: 3px; }
    #gpPinList .gp-pin-editor { margin: 0; }
  `;
  document.head.appendChild(style);
})();

(() => {
  'use strict';
  const style = document.createElement('style');
  style.id = 'character-ui-fix-v31';
  style.textContent = `
    /* Mantém apenas o sistema original de foto/personagem.
       Fora da edição: foto e conteúdo visíveis, controles de gestão ocultos. */
    body:not(.editing) #dynamicPeopleGrid .person button,
    body:not(.editing) #dynamicPeopleGrid .person [role="button"],
    body:not(.editing) #dynamicPeopleGrid .person input[type="file"] {
      display: none !important;
    }

    /* Os campos continuam legíveis fora da edição sem aparência de formulário ativo. */
    body:not(.editing) #dynamicPeopleGrid .person input,
    body:not(.editing) #dynamicPeopleGrid .person textarea {
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
})();

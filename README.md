# Kael Frostborn — App da Ficha (PWA)

App instalável no tablet Android com a ficha completa de Kael Frostborn, guerreiro
de Dungeon World, fiel à estrutura das páginas 11 e 12 do Manual de Classes —
com edição total de textos, imagens e fundo, direto pelo aparelho.

## Como acessar do tablet

O tablet e o computador precisam estar **na mesma rede Wi-Fi**.

1. No PC, dentro desta pasta (`kael-app`), dê duplo clique em **`iniciar-servidor.bat`**.
   Uma janela preta vai abrir mostrando um ou mais endereços, por exemplo:
   `http://192.168.0.42:4173`
2. No tablet, abra o **Chrome** e digite esse endereço na barra de busca.
3. A ficha deve carregar. Toque no menu do Chrome (⋮) e escolha **"Instalar app"**
   ou **"Adicionar à tela inicial"**. Isso cria um ícone próprio — o app abre em
   tela cheia, sem a barra do navegador.
4. Depois da primeira visita bem-sucedida, o app funciona **offline** (o service
   worker guarda tudo em cache), mesmo que o PC esteja desligado depois.
5. Mantenha a janela do `iniciar-servidor.bat` aberta enquanto usa o app pela
   primeira vez em cada aparelho. Depois de instalado, não é mais necessário
   (a não ser que você queira reinstalar em outro dispositivo).

> Se o Windows perguntar sobre permissão de rede para o Python na primeira vez,
> permita o acesso em "Rede Privada".

## Acesso remoto (de qualquer lugar, sem precisar do PC ligado)

Além da versão local acima, existe uma segunda versão publicada como página
web, para abrir do celular/tablet fora de casa:

**https://claude.ai/code/artifact/bf4c924e-8926-4355-9f10-c4109828db1b**

- Não precisa do PC ligado nem da mesma rede Wi-Fi — funciona com qualquer internet.
- Abra o link no Chrome do celular e use "Adicionar à tela inicial" para ter
  um ícone de atalho (abre como aba do navegador, não em tela cheia como a
  versão local instalada).
- Tem o mesmo modo de edição, mas guarda os dados **separadamente** da versão
  local (são duas "instâncias" independentes do app, em endereços diferentes).
  Use **Exportar backup** numa versão e **Importar backup** na outra para
  levar as mesmas edições de um lado para o outro.
- Esse link é privado (só abre quem tiver o endereço). Para gerar uma nova
  versão depois de editar os arquivos em `kael-app/`, rode
  `python _build_artifact.py` (gera `kael-app-remoto.html`) e publique-o de novo.

## Modo de edição

Toque no ícone de engrenagem (⚙, canto superior direito) para entrar no **modo
de edição**. Com ele ativo você pode:

- Reescrever qualquer texto (nome, tagline, história, notas, vínculos...)
- Trocar o retrato principal, a arma, o escudo e a armadura por fotos do tablet
- Trocar o fundo do app inteiro (botão "Trocar fundo do app" no topo)
- Marcar/desmarcar atributos, alinhamento, raça, melhorias da arma, equipamento
  e movimentos avançados conforme Kael evolui

Toque em **"Salvar e sair da edição"** para gravar tudo no dispositivo (fica
guardado localmente, mesmo sem internet). **"Restaurar ficha original"** volta
tudo aos dados originais de Kael (pede confirmação dupla).

### Backup

Dentro do modo de edição:

- **Exportar backup** baixa um arquivo `.json` com toda a ficha e imagens.
- **Importar backup** lê esse arquivo de volta — útil ao trocar de tablet ou
  reinstalar o app.

Vale exportar um backup de vez em quando: os dados ficam guardados só no
navegador daquele aparelho, e limpar os dados do Chrome apagaria as edições.

## Estrutura do projeto

```
kael-app/
  index.html        estrutura da ficha (hero, ficha, equipamento, avançados, história)
  styles.css         identidade visual (fundo escuro, dourado, serifada) — inspirada no site original de Kael
  app.js             estado, persistência (IndexedDB), modo de edição, upload de imagens
  manifest.webmanifest  metadados do PWA (ícone, nome, tela cheia)
  sw.js               service worker (cache offline)
  assets/             retrato, fundo e imagens de equipamento (comprimidas)
  icons/              ícones do app em vários tamanhos
  iniciar-servidor.bat  atalho para servir a pasta na rede local
```

Todo o conteúdo da ficha (atributos, alinhamento, raça, movimentos iniciais,
arma favorita, vínculos, equipamento e os 19 movimentos avançados) segue o
texto oficial do Manual de Classes, páginas 11–12, já preenchido com as
escolhas de Kael descritas no dossiê do personagem.

# Prancheta Manager

Jogo de gestão de futebol para celular, em um único arquivo HTML. Você funda um clube na Série B e acumula os papéis de técnico, presidente e olheiro.

## Como jogar

- **No celular Android (app):** baixe o APK gerado pelo GitHub Actions (aba *Actions* › workflow *App Android* › artefato `prancheta-android-apk`), descompacte e instale o `app-debug.apk`. O Android pede para permitir a instalação de fontes desconhecidas.
- **Como PWA (Android e iPhone):** publique a pasta `www/` em qualquer hospedagem com HTTPS e abra no navegador. No Android, use *Instalar app*; no iPhone, *Compartilhar › Adicionar à Tela de Início*. Depois da primeira visita funciona sem internet.
- **No navegador:** abra `index.html`. O progresso é salvo no próprio aparelho a cada semana.

## O que tem no jogo

- **Elenco**: 12 posições específicas (GOL, ZAG, LD, LE, VOL, MC, MEI, MD, ME, PD, PE, CA), três atributos por jogador (Defesa, Criação, Ataque; goleiros têm o seu), potencial, idade, energia, moral, características especiais, contrato e salário. Fora da posição de origem o nível cai: 7% numa posição vizinha, 14% no mesmo setor e 24% em outro setor. Listas agrupadas por setor, com os titulares marcados.
- **Tática**: quadro com ímãs; tocar abre o menu do jogador, pressionar e arrastar muda a posição (o lugar no campo define a posição específica), 7 formações predefinidas, 5 estilos com vantagem cíclica (pressão > posse > retranca > contra-ataque > pressão), postura e entrosamento.
- **Partida ao vivo em 3D**: campo, bonecos, bola, câmera, efeitos e som herdados do Prancheta original (three.js). O motor por setores decide os lances (o meio-campo define quem cria chances; ataque contra defesa define o gol) e uma direção de cena os anima com jogadores de velocidade e aceleração limitadas e bola com física simples (no pé, rolando, no ar, parada). Há substituições, mudança de postura e conversa no intervalo. Sem WebGL, a partida cai para uma versão 2D.
- **Treino**: foco e intensidade semanais, evolução por idade e declínio depois dos 30.
- **Mercado**: janelas de transferência, negociação com indicador de chance de aceite, jogadores sem clube, lista de observação, anúncio com preço pedido (propostas mais frequentes quanto mais perto do valor), venda rápida, histórico de transferências, olheiros com informação incompleta e categorias de base.
- **Clube**: bilheteria com preço do ingresso, patrocínio, cota de TV, premiações e 6 estruturas para ampliar.
- **Carreira**: metas da diretoria, confiança, reputação, Série A e B com acesso e rebaixamento, Copa Nacional em mata-mata.

## Som e app

- Efeitos sonoros sintetizados na hora (sem arquivos de áudio): torcida, apito, chute, trave e gol na partida; toques, abas, ímãs, compra, venda, propostas, vitória, derrota, fim de temporada e demissão na interface. Liga, desliga e volume em *Clube › Carreira › Som e vibração*.
- No app Android: vibração nativa, botão Voltar fecha janelas e volta ao início, a partida pausa ao sair do app, tela em retrato, ícone e abertura próprios.

## Código

- `src/engine.js`: regras do jogo, sem DOM.
- `src/gl.js`: partida em 3D (cena, direção dos lances e som).
- `src/ui.js`: telas e interação.
- `src/style.css`: visual.
- `src/sfx.js`: sons sintetizados (partida e interface).
- `src/app.js`: integração com o celular (vibração, botão Voltar, pausa, PWA).
- `build.js`: gera `index.html` (arquivo único, usa CDN) e `www/` (app offline com three.js, fontes, ícones, manifesto e service worker). Rode `npm install` antes.
- `android/`: projeto Android do Capacitor. `npm run android` atualiza o projeto; `npm run apk` compila com o Android SDK instalado.
- `assets/`: ícones do app. `tools/make-icons.js` gera ícones e telas de abertura (precisa do Playwright).
- `.github/workflows/android.yml`: compila o APK no GitHub a cada envio.
- `docs/mecanicas-jogos-gestao-futebol.md`: pesquisa de mecânicas que serviu de base.

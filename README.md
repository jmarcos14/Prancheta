# Prancheta Manager

Jogo de gestão de futebol para celular, em um único arquivo HTML. Você funda um clube na Série B e acumula os papéis de técnico, presidente e olheiro.

## Como jogar

Abra `index.html` no navegador. O progresso é salvo no próprio navegador a cada semana.

## O que tem no jogo

- **Elenco**: 12 posições específicas (GOL, ZAG, LD, LE, VOL, MC, MEI, MD, ME, PD, PE, CA), três atributos por jogador (Defesa, Criação, Ataque; goleiros têm o seu), potencial, idade, energia, moral, características especiais, contrato e salário. Fora da posição de origem o nível cai: 7% numa posição vizinha, 14% no mesmo setor e 24% em outro setor. Listas agrupadas por setor, com os titulares marcados.
- **Tática**: quadro com ímãs; tocar abre o menu do jogador, pressionar e arrastar muda a posição (o lugar no campo define a posição específica), 7 formações predefinidas, 5 estilos com vantagem cíclica (pressão > posse > retranca > contra-ataque > pressão), postura e entrosamento.
- **Partida ao vivo em 3D**: campo, bonecos, bola, câmera, efeitos e som herdados do Prancheta original (three.js). O motor por setores decide os lances (o meio-campo define quem cria chances; ataque contra defesa define o gol) e uma direção de cena os anima com jogadores de velocidade e aceleração limitadas e bola com física simples (no pé, rolando, no ar, parada). Há substituições, mudança de postura e conversa no intervalo. Sem WebGL, a partida cai para uma versão 2D.
- **Treino**: foco e intensidade semanais, evolução por idade e declínio depois dos 30.
- **Mercado**: janelas de transferência, negociação com indicador de chance de aceite, jogadores sem clube, lista de observação, anúncio com preço pedido (propostas mais frequentes quanto mais perto do valor), venda rápida, histórico de transferências, olheiros com informação incompleta e categorias de base.
- **Clube**: bilheteria com preço do ingresso, patrocínio, cota de TV, premiações e 6 estruturas para ampliar.
- **Carreira**: metas da diretoria, confiança, reputação, Série A e B com acesso e rebaixamento, Copa Nacional em mata-mata.

## Código

- `src/engine.js`: regras do jogo, sem DOM.
- `src/gl.js`: partida em 3D (cena, direção dos lances e som).
- `src/ui.js`: telas e interação.
- `src/style.css`: visual.
- `build.js`: junta tudo em `index.html` (`node build.js`).
- `docs/mecanicas-jogos-gestao-futebol.md`: pesquisa de mecânicas que serviu de base.

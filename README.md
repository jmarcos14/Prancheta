# Prancheta Manager

Jogo de gestão de futebol para celular, em um único arquivo HTML. Você funda um clube na Série B e acumula os papéis de técnico, presidente e olheiro.

## Como jogar

Abra `index.html` no navegador. O progresso é salvo no próprio navegador a cada semana.

## O que tem no jogo

- **Elenco**: três atributos por jogador (Defesa, Criação, Ataque; goleiros têm o seu), potencial, idade, energia, moral, características especiais, contrato e salário.
- **Tática**: 7 formações, 5 estilos com vantagem cíclica (pressão > posse > retranca > contra-ataque > pressão), postura e entrosamento.
- **Partida ao vivo**: motor por setores (o meio-campo define quem cria chances; ataque contra defesa define o gol), substituições, mudança de postura e conversa no intervalo.
- **Treino**: foco e intensidade semanais, evolução por idade e declínio depois dos 30.
- **Mercado**: janelas de transferência, negociação com clube e jogador, jogadores sem clube, vendas, olheiros com informação incompleta e categorias de base.
- **Clube**: bilheteria com preço do ingresso, patrocínio, cota de TV, premiações e 6 estruturas para ampliar.
- **Carreira**: metas da diretoria, confiança, reputação, Série A e B com acesso e rebaixamento, Copa Nacional em mata-mata.

## Código

- `src/engine.js`: regras do jogo, sem DOM.
- `src/ui.js`: telas e interação.
- `src/style.css`: visual.
- `build.js`: junta tudo em `index.html` (`node build.js`).
- `docs/mecanicas-jogos-gestao-futebol.md`: pesquisa de mecânicas que serviu de base.

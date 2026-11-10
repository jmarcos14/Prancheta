# Mecânicas de jogos de gestão de futebol

Levantamento das mecânicas mais comuns em jogos de técnico/gestão de futebol, com exemplos
de onde aparecem e notas de implementação. Referências: Football Manager (FM), Championship
Manager, Elifoot, Brasfoot, Hattrick, Top Eleven, Online Soccer Manager (OSM), FIFA Manager,
Anstoss, Club Football Manager.

> Os números citados como "exemplo" são sugestões de design, não valores oficiais de nenhum jogo.

---

## 1. Jogadores

### 1.1 Atributos
| Modelo | Como funciona | Exemplo |
|---|---|---|
| **Força única** | Um número (ex.: 1–99) resume o jogador | Elifoot, Brasfoot |
| **Poucos atributos por setor** | Goleiro, defesa, armação, ataque, passe, bola parada... | Hattrick (escala nominal: "fraco", "razoável", "excelente"...) |
| **Muitos atributos** | ~35–50 atributos de 1 a 20, em grupos técnicos, mentais e físicos | Football Manager |
| **Atributos ocultos** | Consistência, profissionalismo, jogos importantes, propensão a lesão, adaptabilidade, ambição | FM |

- **Habilidade Atual (CA) x Potencial (PA):** o jogador evolui de CA em direção ao PA. O PA pode
  ser fixo ou uma faixa aleatória ("-8" = entre 140 e 170 no FM), gerando incerteza para "wonderkids".
- **Overall por posição:** o mesmo jogador tem notas diferentes em cada posição, calculadas por
  pesos de atributos (ex.: zagueiro = marcação 30%, desarme 25%, cabeceio 20%, posicionamento 25%).
- **Familiaridade de posição:** natural / competente / improvisado → penalidade no rendimento.
- **Pé preferido, altura, peso, idade, nacionalidade.**
- **Traços/características:** "chuta de longe", "cai pelas pontas", "tenta dribles". Afetam
  *decisões* na simulação, não a habilidade bruta.
- **Especialidades (Hattrick):** técnico, rápido, cabeceador, imprevisível, poderoso → disparam
  eventos especiais na partida.

### 1.2 Estado do jogador (varia semana a semana)
- **Condição física / energia:** cai ao jogar, recupera com descanso. Escalar cansado aumenta
  risco de lesão e reduz rendimento.
- **Ritmo de jogo (match fitness):** só sobe jogando; jogador parado fica "enferrujado".
- **Forma:** média das últimas notas. No Hattrick, a forma atual tende a uma "forma de fundo"
  oculta que muda aleatoriamente.
- **Moral:** influenciada por tempo de jogo, resultados, promessas cumpridas, contrato, conversas.
- **Lesões:** tipo, duração, chance de recaída; "pode jogar com dor" (risco de agravar).
- **Cartões e suspensões:** acúmulo de amarelos, vermelho direto.
- **Fadiga de longo prazo / "jaded":** excesso de jogos na temporada.

### 1.3 Evolução e envelhecimento
- Curva por idade: crescimento rápido até ~23, pico 24–29, declínio a partir de ~30–32
  (físicos caem primeiro; mentais podem continuar subindo).
- Fatores de evolução: minutos jogados, nível da competição, qualidade do treino/instalações,
  treinadores, profissionalismo (oculto), tutoria por veteranos.
- Aposentadoria probabilística por idade + queda de nível.

### 1.4 Personalidade e relações
- Personalidade derivada de atributos ocultos ("profissional modelo", "temperamental", "líder").
- **Hierarquia do elenco:** líderes influentes, grupos sociais, panelinhas por nacionalidade.
- **Promessas:** "vai ser titular", "vamos contratar reforços" — quebrar gera insatisfação.
- **Interações:** elogiar, criticar, multar, conversa de equipe (preleção/intervalo).

---

## 2. Tática

- **Formação:** 4-4-2, 4-3-3, 3-5-2... com posições em grade (ex.: 5 colunas × 6 linhas).
- **Funções e tarefas (FM):** "volante destruidor – defender", "ponta invertido – atacar".
- **Mentalidade/estilo:** retranca, equilibrado, ofensivo, tudo ao ataque.
- **Instruções de equipe:** linha defensiva alta/baixa, pressão, largura, ritmo, passe
  curto/longo, contra-ataque, marcação por zona/individual, perder tempo, impedimento.
- **Instruções individuais:** marcar jogador X, ficar mais aberto, arriscar passes.
- **Bola parada:** cobradores (pênalti, falta, escanteio), rotinas de escanteio.
- **Familiaridade tática:** a equipe rende mais com o tempo de treino na mesma tática.
- **Táticas Hattrick:** pressão, contra-ataque, ataque pelo meio, ataque pelas pontas,
  jogo criativo, chutes de longe — cada uma com "nível tático" e contra-táticas.
- **Pedra-papel-tesoura:** estilos que neutralizam outros (pressão vs. posse, contra-ataque vs.
  linha alta) dão profundidade sem precisar de motor complexo.
- **Substituições e mudanças no intervalo**, inclusive substituições automáticas condicionais
  ("se perdendo aos 70', entra atacante").

---

## 3. Motor de partida (simulação)

Do mais simples ao mais complexo:

1. **Resultado direto:** probabilidade de gols com base na diferença de força
   (ex.: gols ~ Poisson(λ), λ = f(ataque_A / defesa_B, mando, moral)). Rápido; ideal para
   simular jogos de outras ligas em lote.
2. **Por eventos/minutos (Elifoot/Brasfoot):** a cada minuto sorteia-se se há lance; o time com
   meio-campo mais forte tem mais posse/chances; ataque x defesa decide se vira gol. Exibe
   narração em texto.
3. **Por setores (Hattrick):** notas de meio-campo (posse), ataques (esq./centro/dir.) e
   defesas (esq./centro/dir.). O meio decide quantas chances cada time tem; cada chance é um
   duelo ataque do setor x defesa do setor oposto. Eventos especiais vêm das especialidades.
4. **Simulação 2D/3D por agentes (FM):** cada jogador decide uma ação em pequenos intervalos
   ("fatias" de ~0,25 s) e a chance de sucesso vem dos atributos. Muito mais caro de
   implementar e balancear.

Elementos comuns ao motor:
- Vantagem de mando de campo, clima, gramado, torcida.
- Árbitro (rigor → cartões, pênaltis).
- Variância/"zebra" controlada — sem ela o jogo fica previsível; com muita, parece injusto.
- Notas individuais (0–10) e estatísticas: chutes, posse, xG, passes, desarmes.
- Destaque da partida, gols, assistências, lesões durante o jogo.
- Narração textual, lances destacados ou partida completa em 2D.

---

## 4. Treinamento

- **Foco do treino:** físico, tático, técnico, bola parada, finalização, defesa; por equipe ou
  individual (treino de posição, de atributo, de nova função).
- **Intensidade:** mais intensidade = mais evolução e mais risco de lesão/cansaço. No Hattrick,
  baixar a intensidade dá um bônus pontual no espírito de equipe.
- **Treino de resistência x forma (Hattrick):** fração do treino gasta em resistência reduz o
  ganho em habilidades e afeta a forma atual.
- **Quem treina:** no Hattrick só quem jogou na posição treinada recebe o treino completo —
  isso cria um dilema real entre ganhar jogos e desenvolver jogadores.
- **Calendário semanal:** recuperação pós-jogo, preparação para o adversário.
- **Pré-temporada:** amistosos, ganho de condição física.

---

## 5. Mercado de transferências

- **Janelas de transferência** (início de temporada e meio do ano) ou mercado contínuo.
- **Valor de mercado:** f(nível, idade, potencial, contrato restante, posição, reputação).
- **Negociação em etapas:** proposta ao clube (valor, parcelas, percentual de revenda, bônus por
  jogos/gols, troca de jogador) → negociação do contrato com o atleta (salário, luvas, duração,
  cláusula de rescisão, bônus, papel no elenco) → comissão do empresário.
- **Leilão (Hattrick/OSM):** jogadores listados com prazo; maior lance leva.
- **Empréstimos:** com/sem opção de compra, divisão de salário, exigência de minutos.
- **Agente livre / fim de contrato (Bosman):** pré-contrato nos últimos 6 meses.
- **IA dos outros clubes:** precisa de necessidades por posição e orçamento para o mercado ser crível.
- **Regras de inscrição:** limite de estrangeiros, jogadores formados no clube, lista de inscritos.
- **Reputação do clube/técnico:** limita quem aceita vir.
- **Prazo final ("deadline day")** como evento dramático.

---

## 6. Olheiros e informação incompleta

- **Neblina de guerra:** atributos de jogadores de fora aparecem como faixas ou estrelas até
  serem observados.
- **Rede de olheiros:** cada olheiro tem região/especialidade; designações por país, competição
  ou perfil ("lateral esquerdo sub-21 até R$ X").
- **Relatórios:** nota de habilidade e potencial em estrelas, prós e contras, recomendação.
- **Conhecimento por região:** melhora com tempo de observação.

---

## 7. Finanças

| Receitas | Despesas |
|---|---|
| Bilheteria (preço do ingresso x público) | Salários (maior peso) |
| Sócio-torcedor / ingresso de temporada | Compras e comissões |
| Direitos de TV (fixos + por colocação) | Manutenção do estádio e instalações |
| Patrocínio master e de material | Bônus por resultados |
| Premiações de competições | Juros de empréstimos |
| Venda de jogadores | Equipe técnica e base |
| Loja / produtos | |

- **Orçamento separado:** verba de transferências x teto salarial; transferir saldo entre eles.
- **Preço do ingresso:** público = f(preço, fase do time, rival, importância do jogo, tamanho da
  torcida). Preço alto demais esvazia o estádio (mecânica clássica do Elifoot/Brasfoot).
- **Fair play financeiro / limite de gastos.**
- **Dívida e empréstimos bancários**; falência → rebaixamento/punição/demissão.
- **Investimento do presidente ou de um novo dono.**

---

## 8. Clube e infraestrutura

- **Estádio:** capacidade, expansões (custam dinheiro e tempo), setores com preços diferentes.
- **Centro de treinamento:** acelera evolução.
- **Categorias de base:** qualidade da base + recrutamento juvenil → leva anual de jovens
  ("intake"); time sub-20/B.
- **Departamento médico:** reduz tempo e chance de lesões.
- **Funcionários:** auxiliar técnico, preparador físico, treinador de goleiros, fisioterapeuta,
  olheiro, analista de desempenho, diretor de futebol (cada um com atributos próprios).
- **Reputação do clube** (local, nacional, continental) e **tamanho da torcida**.

---

## 9. Diretoria, torcida e imprensa

- **Expectativa da diretoria:** meta de temporada (título, G4, meio de tabela, evitar
  rebaixamento) + metas de longo prazo (usar jovens, estilo de jogo, finanças).
- **Confiança da diretoria / torcida:** barra que cai com maus resultados → demissão
  ("chicotada psicológica" do Elifoot).
- **Pedidos à diretoria:** mais verba, melhorar instalações, ampliar estádio.
- **Coletivas de imprensa e entrevistas:** respostas afetam moral do elenco e relação com
  rivais/torcida.
- **Notícias e boatos:** clubes interessados em seus jogadores, rumores de demissão.
- **Rivalidades e clássicos:** peso maior na moral e na torcida.

---

## 10. Competições e calendário

- **Ligas com divisões**, acesso e rebaixamento; o Elifoot começa na última divisão.
- **Copas mata-mata** (ida e volta, gols fora, pênaltis, prorrogação).
- **Continentais** com classificação pela tabela.
- **Estaduais** e calendário apertado (tema bem brasileiro).
- **Seleções:** convocações, data FIFA desfalcando clubes, carreira como técnico de seleção.
- **Critérios de desempate** configuráveis.
- **Geração de tabela:** algoritmo round-robin (método do círculo), turno e returno.
- **Simulação do "mundo":** outras ligas rodando em segundo plano com motor simplificado.

---

## 11. Carreira do técnico

- **Atributos do técnico:** reputação, licença de treinador, estilo preferido, motivação.
- **Propostas de outros clubes** e demissão; troca de clube no meio do jogo.
- **Histórico de carreira**, títulos, prêmios (técnico do mês/ano).
- **Modo "criar clube"** ou começar desempregado.

---

## 12. Progressão, metajogo e retenção

- **Hall da fama, recordes, estatísticas históricas** — muito valorizados no gênero.
- **Conquistas/achievements.**
- **Editor de banco de dados** e patches da comunidade (força do Brasfoot).
- **Multiplayer:** ligas privadas entre amigos (Top Eleven, OSM), mercado entre humanos,
  partidas em horários fixos (Hattrick: 1 jogo por semana real).
- **Mobile/F2P:** energia, moedas premium para acelerar treino/recuperação, eventos
  temporários. Cuidado com pay-to-win, a crítica mais comum ao Top Eleven.

---

## 13. Fluxo e interface

- **Loop principal:** preparar → escalar/táticas → jogar → ver resultado → gerenciar
  (mercado, treino, finanças) → avançar dia/semana.
- **Caixa de entrada:** notícias e decisões pendentes.
- **Botão "continuar"** com bloqueios quando há pendências (escalação inválida, proposta expirando).
- **Velocidade de simulação:** só resultado / melhores momentos / partida completa.
- **Comparador de jogadores, filtros e buscas salvas.**
- **Assistente que escala/negocia sozinho** para quem quer jogar rápido.

---

## 14. Sugestão de escopo por fases (para o Prancheta)

**MVP (estilo Elifoot/Brasfoot):**
1. Times com jogadores de força única + posição + idade + energia.
2. Liga com divisões, tabela turno/returno, acesso/rebaixamento.
3. Escalação (11 + reservas) e formação.
4. Motor por minutos com narração em texto e substituições.
5. Finanças simples: ingresso, salários, compra/venda de jogadores.
6. Demissão pela diretoria.

**Fase 2 (estilo Hattrick):**
- Atributos por setor e motor por setores (meio/ataque/defesa).
- Treino semanal, forma, moral, lesões, cartões.
- Estilos táticos com relação de pedra-papel-tesoura.
- Base/juvenis e evolução por idade.

**Fase 3 (estilo FM):**
- Atributos detalhados + ocultos, funções e instruções.
- Olheiros com informação incompleta, negociação em etapas, empresários.
- Imprensa, promessas, hierarquia do elenco.
- Partida em 2D.

### Fórmulas iniciais de exemplo
```text
força_setor   = média ponderada dos jogadores no setor × (energia/100) × fator_moral
posse_A       = meio_A^k / (meio_A^k + meio_B^k)        (k ≈ 2 a 3)
chances_A     ≈ total_chances × posse_A
p_gol(chance) = ataque_A^k / (ataque_A^k + defesa_B^k) × fator_conversão
público       = capacidade × min(1, demanda(reputação, fase, rival) / preço^elasticidade)
evolução/sem. = taxa_base(idade) × qualidade_treino × minutos_jogados × (1 - CA/PA)
```

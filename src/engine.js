'use strict';
// =====================================================================
// PRANCHETA — motor do jogo (sem DOM): dados, partida, semana, temporada
// =====================================================================
const R = Math.random;
const rnd = (a, b) => a + R() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(R() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sum = (a, f) => a.reduce((t, x) => t + f(x), 0);
const avg = (a, f, d = 0) => (a.length ? sum(a, f) / a.length : d);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function wpick(arr, w) {
  let s = 0; const ws = arr.map(x => { const v = Math.max(0, w(x)); s += v; return v; });
  let r = R() * s;
  for (let i = 0; i < arr.length; i++) { r -= ws[i]; if (r <= 0) return arr[i]; }
  return arr[arr.length - 1];
}
const round5 = v => Math.max(5, Math.round(v / 5) * 5);

// ---------- Tabelas de regras ----------
const POS = ['GOL', 'DEF', 'MEI', 'ATA'];
const POS_N = ['Goleiro', 'Defensor', 'Meia', 'Atacante'];
const KEY = ['g', 'd', 'm', 'a'];
const ATTR_N = { g: 'Goleiro', d: 'Defesa', m: 'Criação', a: 'Ataque' };
const OVW = [null, { d: 0.7, m: 0.2, a: 0.1 }, { d: 0.25, m: 0.5, a: 0.25 }, { d: 0.1, m: 0.2, a: 0.7 }];
// Formação livre: cada titular tem um ímã (x, y em % do quadro; y 0 = ataque, 100 = próprio gol).
// A faixa onde o ímã está define a função; a quantidade em cada faixa define o bônus do setor.
const PRESETS = ['4-4-2', '4-3-3', '4-5-1', '3-5-2', '3-4-3', '5-3-2', '5-4-1'];
const DEFM = [0.6, 0.72, 0.84, 0.93, 1, 1.08, 1.13, 1.16, 1.18, 1.19, 1.2];
const MIDM = [0.6, 0.74, 0.86, 0.94, 1, 1.07, 1.12, 1.15, 1.17, 1.18, 1.19];
const ATKM = [0.72, 0.9, 1, 1.07, 1.12, 1.15, 1.17, 1.18, 1.19, 1.2, 1.2];
const ZONE = { dm: 56, ma: 30 };
function presetSpots(name) {
  const n = [1, ...name.split('-').map(Number)], ys = [90, 67, 43, 17], out = [];
  for (let r = 0; r < 4; r++) for (let i = 0; i < n[r]; i++) {
    const x = 50 + ((i + 1) / (n[r] + 1) * 100 - 50) * (n[r] >= 4 ? 1.16 : 1.05);
    const y = ys[r] + (n[r] >= 5 ? (i % 2 ? 3.4 : -3.4) : n[r] === 4 ? (i === 0 || i === 3 ? -2.6 : 2.6) : 0);
    out.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  }
  return out;
}
const roleAtY = y => (y >= ZONE.dm ? 1 : y >= ZONE.ma ? 2 : 3);
const rolesOf = c => c.spots.map((sp, i) => (i === 0 ? 0 : roleAtY(sp.y)));
const countsOf = roles => [1, 2, 3].map(r => roles.filter(x => x === r).length);
const formName = c => countsOf(rolesOf(c)).join('-');
// entrosamento efetivo: cada jogador que mudou de linha desde o último jogo custa 8 pontos
function famNow(c) { const n = countsOf(rolesOf(c)), l = c.lastCnt || n; return Math.max(0, c.fam - 4 * (Math.abs(n[0] - l[0]) + Math.abs(n[1] - l[1]) + Math.abs(n[2] - l[2]))); }
const STYLES = {
  eq: { n: 'Equilibrado', d: 'Sem bônus e sem ponto fraco. Nenhum estilo leva vantagem sobre ele.', def: 1, mid: 1, atk: 1, drain: 1, beats: '' },
  pr: { n: 'Pressão alta', d: 'Sufoca a saída de bola. Ganha o meio, mas cansa muito.', def: 0.97, mid: 1.07, atk: 1.01, drain: 1.3, beats: 'po' },
  po: { n: 'Posse de bola', d: 'Passes curtos e paciência. Domina o meio, finaliza menos.', def: 1, mid: 1.08, atk: 0.96, drain: 0.95, beats: 're' },
  re: { n: 'Retranca', d: 'Linhas baixas e compactas. Defesa forte, ataque tímido.', def: 1.1, mid: 0.96, atk: 0.91, drain: 0.9, beats: 'ca' },
  ca: { n: 'Contra-ataque', d: 'Entrega a bola e sai em velocidade. Ataque afiado.', def: 1.02, mid: 0.93, atk: 1.09, drain: 1, beats: 'pr' }
};
const MENT = {
  def: { n: 'Fechado', d: 'Defesa +8%, ataque −8%', def: 1.08, atk: 0.92 },
  eq: { n: 'Normal', d: 'Sem ajuste', def: 1, atk: 1 },
  of: { n: 'Pra cima', d: 'Ataque +8%, defesa −8%', def: 0.92, atk: 1.08 }
};
const TRAITS = {
  matador: { n: 'Matador', d: 'Finaliza com frieza: +20% de chance de gol quando chuta.' },
  paredao: { n: 'Paredão', d: 'Fecha o gol: −15% de chance de gol em cada chute contra.' },
  pulmao: { n: 'Pulmão', d: 'Cansa 40% menos durante as partidas.' },
  promessa: { n: 'Promessa', d: 'Evolui 50% mais rápido nos treinos.' },
  lider: { n: 'Líder', d: 'Em campo, derrotas pesam metade no moral do elenco.' },
  batedor: { n: 'Batedor', d: 'Cobra pênaltis e faltas com muita precisão.' },
  coringa: { n: 'Coringa', d: 'Joga em qualquer setor de linha sem perder rendimento.' },
  vidraca: { n: 'Vidraça', d: 'Machuca com o dobro de frequência.' },
  pavio: { n: 'Pavio curto', d: 'Leva cartão com o dobro de frequência.' }
};
const TRAIN = {
  eq: { n: 'Equilibrado', d: 'Cada um evolui no que já faz de melhor.', k: '', g: 1, rec: 0, fam: 2 },
  a: { n: 'Finalização', d: 'Metade da evolução vai para o Ataque.', k: 'a', g: 1, rec: 0, fam: 2 },
  m: { n: 'Criação', d: 'Metade da evolução vai para a Criação.', k: 'm', g: 1, rec: 0, fam: 2 },
  d: { n: 'Marcação', d: 'Metade da evolução vai para a Defesa.', k: 'd', g: 1, rec: 0, fam: 2 },
  fis: { n: 'Físico', d: 'Recupera +14 de energia. Evolução pela metade.', k: '', g: 0.5, rec: 14, fam: 2 },
  tat: { n: 'Tático', d: 'Entrosamento sobe bem mais rápido. Evolução pela metade.', k: '', g: 0.5, rec: 0, fam: 10 }
};
const INTENS = [
  { n: 'Leve', d: 'Evolui menos, descansa mais, quase sem lesões.', g: 0.6, rec: 8, inj: 0.4 },
  { n: 'Normal', d: 'Ritmo padrão.', g: 1, rec: 0, inj: 1 },
  { n: 'Forte', d: 'Evolui mais, cansa e machuca mais.', g: 1.4, rec: -9, inj: 2.2 }
];
const FAC = [
  { id: 'est', n: 'Estádio', cost: [800, 2000, 4500, 9000], d: l => `${STAD[l].toLocaleString('pt-BR')} lugares` },
  { id: 'ct', n: 'Centro de treinamento', cost: [400, 1000, 2200, 4500], d: l => (l ? `Evolução dos jogadores +${l * 20}%` : 'Evolução padrão') },
  { id: 'base', n: 'Categorias de base', cost: [300, 800, 1800, 3600], d: l => (l ? `Garotos chegam +${l * 2} de nível e +${l * 3} de potencial` : 'Revela 3 garotos por ano') },
  { id: 'med', n: 'Departamento médico', cost: [300, 700, 1500, 3000], d: l => (l ? `Lesões ${l * 12}% mais curtas, +${l * 3} de energia por semana` : 'Recuperação padrão') },
  { id: 'olh', n: 'Olheiros', cost: [250, 600, 1300, 2600], d: l => `Margem de erro de ${10 - l * 2} pontos, ${1 + l} observação(ões) por semana` },
  { id: 'com', n: 'Comercial', cost: [350, 900, 2000, 4000], d: l => (l ? `Patrocínio +${l * 15}%` : 'Patrocínio padrão') }
];
const STAD = [8000, 14000, 22000, 34000, 50000];
const TV = [80, 20];
const PRIZE = [[3000, 2000, 1500, 1200, 1000, 900, 800, 700, 600, 500], [800, 600, 400, 350, 300, 260, 230, 200, 170, 150]];
const CUP_PRIZE = [100, 200, 400, 1000];
const CUP_N = ['Oitavas de final', 'Quartas de final', 'Semifinal', 'Final'];
const DIV_N = ['Série A', 'Série B'];
const SQUAD_MAX = 26, SQUAD_MIN = 16;

const FIRST = ['Caio', 'Teo', 'Davi', 'Ravi', 'Enzo', 'Igor', 'Luan', 'Rafa', 'Joca', 'Biel', 'Duda', 'Tito', 'Nando', 'Bento', 'Kauã', 'Iago', 'Otto', 'Vini', 'Juca', 'Léo', 'Dudu', 'Zeca', 'Beto', 'Chico', 'Fael', 'Guga', 'Heitor', 'Ivo', 'Jonas', 'Lipe', 'Mauro', 'Nilo', 'Pablo', 'Quico', 'Rômulo', 'Samuel', 'Tales', 'Ueslei', 'Vitor', 'Wagner', 'Yuri', 'André', 'Breno', 'Cauê', 'Diego', 'Edu', 'Fábio', 'Gil'];
const LAST = ['Soares', 'Brito', 'Lacerda', 'Moura', 'Teixeira', 'Paixão', 'Bastos', 'Rocha', 'Prado', 'Viana', 'Farias', 'Macedo', 'Assis', 'Correia', 'Dantas', 'Esteves', 'Fontes', 'Galvão', 'Honorato', 'Inácio', 'Jardim', 'Leal', 'Matos', 'Neves', 'Ouro', 'Pacheco', 'Queiroz', 'Ramos', 'Sales', 'Toledo', 'Uchoa', 'Valente', 'Xavier', 'Zanetti', 'Amaral', 'Barreto', 'Cunha', 'Duarte', 'Falcão', 'Guedes', 'Lins', 'Mourão', 'Nóbrega', 'Pimenta', 'Rangel', 'Sampaio', 'Tavares', 'Vidal', 'Bezerra', 'Caldas', 'Diniz', 'Feitosa'];
// clubes fictícios herdados do Prancheta original
const CLUBS = [
  ['Tropical FC', 'TRO', '#1fa34a', '#f2d43a'], ['Araucária EC', 'ARA', '#0f5132', '#ffffff'], ['Jequitibá FC', 'JEQ', '#7a1e3a', '#ffffff'],
  ['Maré Alta SC', 'MAR', '#1f6fd1', '#ffffff'], ['Cangaço FC', 'CAN', '#c7a24a', '#2a1a0a'], ['Pampa Gaúcho', 'PAM', '#e8433a', '#1b3a8a'],
  ['Serra Azul EC', 'SER', '#2a5fd6', '#f2f2f2'], ['Mangue Beat FC', 'MAN', '#111111', '#e8433a'], ['Sertão Atlético', 'SAT', '#ff7a1a', '#111111'],
  ['Ipê Amarelo FC', 'IPE', '#f2d43a', '#14381f'], ['Real Cerrado', 'CER', '#8a3df0', '#ffffff'], ['Imperial da Baixada', 'IMP', '#ffffff', '#111111'],
  ['Boto Rosa EC', 'BOT', '#e05cff', '#1b1b2a'], ['Carcará FC', 'CAR', '#5b3a22', '#f2d9a0'], ['Sociedade Canarinho', 'SCA', '#ffd400', '#0a7a3b'],
  ['EC Pantanal', 'PAN', '#0e8a6a', '#f4f0d8'], ['Coqueiral FC', 'COQ', '#16b3b3', '#0f2630'], ['Ferroviário do Sertão', 'FER', '#b3122e', '#f2f2f2'],
  ['Atlético Mineração', 'MIN', '#3a3a3a', '#ffcf4a'], ['Náutico da Lagoa', 'NAU', '#0b1a3a', '#e8433a']
];
const BASES = [[76, 75, 74, 73, 72, 71, 70, 69, 68, 67], [66, 65, 64, 63, 62, 61, 60, 59, 58]];

// ---------- Estado ----------
let G = null;
const PMAP = new Map();
function reindex() {
  for (const c of G.clubs) if (!c.spots) { c.spots = presetSpots(PRESETS.includes(c.form) ? c.form : '4-4-2'); c.form = formName(c); c.lastCnt = countsOf(rolesOf(c)); }
  PMAP.clear();
  for (const c of G.clubs) for (const p of c.players) PMAP.set(p.id, p);
  for (const p of G.free) PMAP.set(p.id, p);
  for (const p of G.youth) PMAP.set(p.id, p);
}
const pl = id => PMAP.get(id);
const me = () => G.clubs[0];
const clubOf = pid => G.clubs.find(c => c.players.some(p => p.id === pid)) || null;
const isMine = p => me().players.includes(p);

// ---------- Jogadores ----------
function ovrIn(p, role) {
  if (role === 0) return p.g;
  if (p.tr === 'coringa' && p.pos > 0) role = p.pos;
  const w = OVW[role];
  return p.d * w.d + p.m * w.m + p.a * w.a;
}
const ovr = p => Math.round(ovrIn(p, p.pos));
function shape(pos, T) {
  if (pos === 0) return { g: T, d: T - 32, m: T - 28, a: T - 42 };
  if (pos === 1) return { g: 14, d: T + 5, m: T - 8, a: T - 18 };
  if (pos === 2) return { g: 14, d: T - 6, m: T + 5, a: T - 4 };
  return { g: 14, d: T - 22, m: T - 7, a: T + 5 };
}
// atributos efetivos numa função (o Coringa se molda ao setor)
function attrsIn(p, role) {
  if (p.tr === 'coringa' && p.pos > 0 && role > 0 && role !== p.pos) return shape(role, ovrIn(p, p.pos));
  return p;
}
const baseVal = o => 40 * Math.pow(1.13, o - 50);
const wageOf = p => Math.max(1, Math.round(baseVal(ovr(p)) * 0.02));
function valueOf(p) {
  const o = ovr(p);
  const af = p.age <= 21 ? 1.3 : p.age <= 25 ? 1.2 : p.age <= 28 ? 1 : p.age <= 30 ? 0.8 : p.age <= 32 ? 0.5 : 0.28;
  const pf = p.age <= 24 ? 1 + Math.max(0, p.pot - o) * 0.035 : 1;
  return Math.max(5, Math.round(baseVal(o) * af * pf));
}
const formOf = p => (p.h.length ? avg(p.h, x => x) : 0);
const avail = p => !p.inj && !p.sus;
function traitFor(pos, age) {
  const t = ['pulmao', 'vidraca', 'pavio'];
  if (pos === 0) t.push('paredao', 'paredao'); else t.push('batedor', 'coringa');
  if (pos >= 2) t.push('matador', 'matador');
  if (age <= 21) t.push('promessa', 'promessa');
  if (age >= 27) t.push('lider', 'lider');
  return pick(t);
}
function mkPlayer(pos, T, age, opt = {}) {
  T = clamp(T, 30, 94);
  const s = shape(pos, T), j = () => rnd(-3, 3);
  const fix = v => Math.round(clamp(v, 5, 99));
  const p = {
    id: G.uid++, n: pick(FIRST) + ' ' + pick(LAST), pos, age,
    g: fix(pos === 0 ? s.g + j() * 0.3 : 10 + R() * 12), d: fix(s.d + j()), m: fix(s.m + j()), a: fix(s.a + j()),
    pot: 0, en: 100, mo: 62, h: [], inj: 0, sus: 0, yc: 0, ctr: ri(1, 3), tr: '', gl: 0, as: 0, ap: 0, xp: 0, w: 1
  };
  if (pos === 0) p.g = fix(T + j() * 0.3);
  const o = ovr(p);
  p.pot = Math.min(96, opt.pot || (age <= 20 ? o + ri(6, 20) : age <= 23 ? o + ri(3, 12) : age <= 27 ? o + ri(0, 4) : o));
  if (R() < (opt.trait != null ? opt.trait : 0.3)) p.tr = traitFor(pos, age);
  p.w = wageOf(p);
  return p;
}
function mkSquad(base, n = [2, 6, 7, 5]) {
  const out = [];
  const starters = [1, 4, 4, 2];
  for (let pos = 0; pos < 4; pos++) for (let i = 0; i < n[pos]; i++) {
    const st = i < starters[pos];
    const age = st ? ri(22, 32) : R() < 0.45 ? ri(17, 21) : ri(22, 34);
    out.push(mkPlayer(pos, base + (st ? rnd(-3, 5) : rnd(-10, -2)), age));
  }
  return out;
}
function grow(p, rate, focus) {
  p.xp += rate;
  while (p.xp >= 1) {
    p.xp -= 1;
    if (ovr(p) >= p.pot) { p.xp = 0; break; }
    const k = p.pos === 0 ? 'g' : (focus && R() < 0.5 ? focus : KEY[p.pos]);
    if (p[k] < 99) p[k]++;
  }
  while (p.xp <= -1) { p.xp += 1; const k = KEY[p.pos]; if (p[k] > 20) p[k]--; }
}
const growBase = age => (age <= 19 ? 0.6 : age <= 21 ? 0.5 : age <= 23 ? 0.38 : age <= 26 ? 0.22 : age <= 29 ? 0.1 : 0);
const decline = age => (age >= 31 ? 0.07 * (age - 30) : 0);

// ---------- Escalação ----------
function ensureSquad(c) {
  let guard = 0;
  while (guard++ < 12) {
    const av = c.players.filter(avail);
    const needGk = !av.some(p => p.pos === 0);
    if (av.length >= 13 && !needGk) break;
    const lvl = (c.base || power(c)) - 16;
    const p = mkPlayer(needGk ? 0 : ri(1, 3), lvl, ri(17, 19), { trait: 0 });
    p.ctr = 1; p.jr = 1; c.players.push(p); PMAP.set(p.id, p);
  }
}
function autoLineup(c) {
  ensureSquad(c);
  const roles = rolesOf(c), need = [1, ...countsOf(roles)], got = [[], [], [], []], used = new Set(), pairs = [];
  for (const p of c.players) if (avail(p)) for (let r = 0; r < 4; r++) {
    pairs.push([p, r, ovrIn(p, r) * (0.8 + 0.2 * p.en / 100) - (r !== p.pos && p.tr !== 'coringa' ? 2 : 0)]);
  }
  pairs.sort((x, y) => y[2] - x[2]);
  for (const [p, r] of pairs) { if (used.has(p.id) || got[r].length >= need[r]) continue; used.add(p.id); got[r].push(p.id); }
  c.lineup = roles.map(r => got[r].shift() || 0);
  return c.lineup;
}
function fixLineup(c) {
  ensureSquad(c);
  if (!c.lineup || c.lineup.length !== 11) return autoLineup(c);
  const roles = rolesOf(c), keep = new Set();
  const ok = c.lineup.map(id => { const p = c.players.find(x => x.id === id); if (p && avail(p) && !keep.has(id)) { keep.add(id); return true; } return false; });
  for (let i = 0; i < 11; i++) if (!ok[i]) {
    const cand = c.players.filter(p => avail(p) && !keep.has(p.id)).sort((x, y) => ovrIn(y, roles[i]) - ovrIn(x, roles[i]))[0];
    c.lineup[i] = cand ? cand.id : 0; if (cand) keep.add(cand.id);
  }
  return c.lineup;
}
function setFormation(c, f) { c.spots = presetSpots(f); c.form = f; autoLineup(c); }
function moveSpot(c, i, x, y) {
  const sp = c.spots[i];
  if (i === 0) { sp.x = clamp(x, 36, 64); sp.y = clamp(y, 85, 96); }
  else { sp.x = clamp(x, 6, 94); sp.y = clamp(y, 5, 81); }
  c.form = formName(c);
}
function setStyle(c, s) { if (c.style === s) return; c.style = s; c.fam = Math.round(c.fam * 0.78); }
// força "no papel" (elenco titular descansado, sem tática)
function power(c) {
  const roles = rolesOf(c);
  const ids = c.lineup && c.lineup.length === 11 ? c.lineup : null;
  if (!ids) { const best = c.players.slice().sort((a, b) => ovr(b) - ovr(a)).slice(0, 11); return avg(best, ovr, 50); }
  return avg(ids.map((id, i) => [c.players.find(p => p.id === id), roles[i]]).filter(x => x[0]), x => ovrIn(x[0], x[1]), 50);
}

// =====================================================================
// PARTIDA
// =====================================================================
const TXT = {
  jog: ['{p} recebe de {q}, bate cruzado e marca!', 'Tabela bonita com {q}, {p} sai na cara do gol e não perdoa.', '{q} acha {p} livre na área. Bola na rede!', '{p} domina, gira em cima do zagueiro e manda no canto.'],
  contra: ['Contra-ataque fulminante! {p} dispara e toca na saída do goleiro.', 'Roubada de bola, {q} lança e {p} voa para marcar.'],
  longe: ['{p} arrisca de fora da área e acerta o ângulo!', 'Que pancada de {p}! A bola morre no fundo da rede.'],
  esc: ['Escanteio na área, {p} sobe mais que todo mundo e testa pro gol.', 'Bola levantada, {p} desvia de cabeça e marca.'],
  falta: ['{p} cobra a falta por cima da barreira. Golaço!', 'Falta na entrada da área: {p} coloca na gaveta.'],
  pen: ['Pênalti! {p} bate com categoria e converte.', 'Pênalti marcado. {p} desloca o goleiro e faz.'],
  penx: ['Pênalti! {p} bate e {k} pega!', 'Pênalti desperdiçado: {p} isola a cobrança.'],
  def: ['{p} finaliza, {k} espalma para escanteio.', '{k} voa e segura o chute de {p}.', 'Chute forte de {p}, defesaça de {k}.', '{p} cabeceia firme, {k} salva em cima da linha.'],
  fora: ['{p} chuta por cima do gol.', '{p} bate cruzado e a bola passa raspando.', '{p} pega mal na bola e manda pela linha de fundo.', 'A zaga trava o chute de {p}.'],
  trave: ['Na trave! {p} quase marca.', 'O chute de {p} explode no travessão.'],
  ya: ['Cartão amarelo para {p} por falta dura.', '{p} reclama demais e leva o amarelo.', '{p} mata o contra-ataque e é advertido.'],
  red2: ['{p} leva o segundo amarelo e está expulso!'],
  red: ['Vermelho direto para {p} depois de uma entrada violenta!'],
  inj: ['{p} sente a coxa e não tem condições de continuar.', '{p} cai no gramado com dores no tornozelo.', '{p} leva uma pancada e sai de maca.']
};
const say = (k, o) => pick(TXT[k]).replace('{p}', o.p || '').replace('{q}', o.q || 'um companheiro').replace('{k}', o.k || 'o goleiro');
const last = n => n.split(' ').slice(-1)[0];

function mkSide(c, home, user) {
  if (user) fixLineup(c); else autoLineup(c);
  const roles = rolesOf(c);
  return {
    c, home, user, form: c.form, cnt: countsOf(roles), style: c.style, ment: c.ment || 'eq', fam: famNow(c),
    on: c.lineup.map((id, i) => ({ p: c.players.find(p => p.id === id), role: roles[i], i, en: 0, r: 6, g: 0, a: 0, yc: 0, out: false, t0: 0, t1: 90 })).filter(o => o.p),
    served: c.players.filter(p => p.sus > 0), usedIds: new Set(c.lineup),
    subs: 0, g: 0, sh: 0, sot: 0, pos: 0, boost: 1, s: null
  };
}
function newMatch(hc, ac, o = {}) {
  const M = { h: null, a: null, comp: o.comp || 'L', cup: o.comp === 'C', min: 0, ev: [], done: false, ht: false, auto: !o.user, pend: null, silent: !!o.silent, pso: null, dirty: true, att: 0, inc: 0 };
  M.h = mkSide(hc, true, o.user && hc.id === 0);
  M.a = mkSide(ac, false, o.user && ac.id === 0);
  for (const S of [M.h, M.a]) for (const e of S.on) e.en = e.p.en;
  // IA escolhe a postura pelo equilíbrio de forças
  const d = power(hc) - power(ac) + 2;
  if (!M.h.user) M.h.ment = d > 4 ? 'of' : d < -5 ? 'def' : 'eq';
  if (!M.a.user) M.a.ment = d < -4 ? 'of' : d > 5 ? 'def' : 'eq';
  calcSectors(M);
  return M;
}
function sectorsOf(S, O) {
  const n = S.cnt, st = STYLES[S.style], mt = MENT[S.ment];
  const act = S.on.filter(o => !o.out);
  const e = (o, k) => attrsIn(o.p, o.role)[k] * (0.72 + 0.28 * o.en / 100) * (0.95 + 0.1 * o.p.mo / 100);
  const A = (r, k) => { const l = act.filter(o => o.role === r); const miss = Math.max(0, n[r - 1] - l.length); return l.length ? sum(l, o => e(o, k)) / (l.length + 0.5 * miss) : 25; };
  const gk = act.find(o => o.role === 0);
  const k = (0.94 + 0.08 * S.fam / 100) * (S.home ? 1.04 : 1) * S.boost * (st.beats && st.beats === O.style ? 1.06 : 1);
  return {
    def: (0.75 * A(1, 'd') + 0.25 * A(2, 'd')) * DEFM[n[0]] * st.def * mt.def * k,
    mid: (0.15 * A(1, 'm') + 0.7 * A(2, 'm') + 0.15 * A(3, 'm')) * MIDM[n[1]] * st.mid * k,
    atk: (0.25 * A(2, 'a') + 0.75 * A(3, 'a')) * ATKM[n[2]] * st.atk * mt.atk * k,
    gk: gk ? e(gk, 'g') * (gk.p.tr === 'paredao' ? 1 : 1) : 18
  };
}
function calcSectors(M) { M.h.s = sectorsOf(M.h, M.a); M.a.s = sectorsOf(M.a, M.h); M.dirty = false; }
const possOf = M => { const a = Math.pow(M.h.s.mid, 1.8), b = Math.pow(M.a.s.mid, 1.8); return a / (a + b); };
const goalProb = (att, dfn) => clamp(0.255 * Math.pow(att.s.atk / (0.7 * dfn.s.def + 0.3 * dfn.s.gk), 1.7), 0.05, 0.6);
// previsão antes do jogo para a tela de preparação
function preview(hc, ac) {
  const M = newMatch(hc, ac, { silent: true, user: true });
  return { h: M.h.s, a: M.a.s, poss: possOf(M), M };
}
function benchOf(S) { return S.c.players.filter(p => avail(p) && !S.usedIds.has(p.id)); }
function push(M, t, side, x, extra) { const e = Object.assign({ m: M.min, t, s: side, x }, extra || {}); M.ev.push(e); return e; }
function doSub(M, S, outE, pIn, why) {
  if (S.subs >= 5 || !pIn || outE.out) return false;
  outE.out = true; outE.t1 = M.min;
  S.on.push({ p: pIn, role: outE.role, i: outE.i, en: pIn.en, r: 6, g: 0, a: 0, yc: 0, out: false, t0: M.min, t1: 90 });
  S.usedIds.add(pIn.id); S.subs++; M.dirty = true;
  if (!M.silent) push(M, 'sub', S.home ? 'h' : 'a', `${why ? why + ' ' : ''}Sai ${last(outE.p.n)}, entra ${last(pIn.n)}.`, { out: outE.p.id, inn: pIn.id });
  return true;
}
const bestSub = (S, role) => benchOf(S).sort((x, y) => ovrIn(y, role) * (0.8 + 0.2 * y.en / 100) - ovrIn(x, role) * (0.8 + 0.2 * x.en / 100))[0];
function aiTurn(M, S, O) {
  const m = M.min;
  if (m === 60 || m === 70 || m === 80) {
    const tired = S.on.filter(o => !o.out && o.role > 0).sort((x, y) => x.en - y.en)[0];
    if (tired && tired.en < 62) { const b = bestSub(S, tired.role); if (b && ovrIn(b, tired.role) * (0.8 + 0.2 * b.en / 100) > ovrIn(tired.p, tired.role) * (0.72 + 0.28 * tired.en / 100) - 2) doSub(M, S, tired, b); }
  }
  if (m === 70 || m === 80) {
    const d = S.g - O.g, was = S.ment;
    S.ment = d < 0 ? 'of' : d === 1 ? 'def' : S.ment;
    if (was !== S.ment) M.dirty = true;
  }
}
function chance(M, A, D) {
  const as = A.home ? 'h' : 'a';
  const act = A.on.filter(o => !o.out);
  const r0 = R();
  const type = r0 < 0.025 ? 'pen' : r0 < 0.085 ? 'falta' : r0 < 0.2 ? 'esc' : r0 < 0.32 ? 'longe' : r0 < (A.style === 'ca' ? 0.6 : 0.4) ? 'contra' : 'jog';
  const wRole = type === 'esc' ? [0, 1.3, 1, 2.4] : [0, 0.35, 1.4, 3.2];
  let sh = wpick(act, o => wRole[o.role] * Math.pow(attrsIn(o.p, o.role).a / 60, 2) * (o.p.tr === 'matador' ? 1.3 : 1));
  if (type === 'pen' || type === 'falta') { const b = act.find(o => o.p.tr === 'batedor' && o.role > 0); if (b) sh = b; }
  const as2 = R() < 0.65 && type !== 'pen' && type !== 'falta' ? wpick(act.filter(o => o !== sh && o.role > 0), o => attrsIn(o.p, o.role).m) : null;
  const gk = D.on.find(o => !o.out && o.role === 0);
  let p = goalProb(A, D) * (type === 'longe' ? 0.6 : type === 'contra' ? 1.15 : type === 'falta' ? 0.55 : 1);
  if (type === 'pen') p = 0.76;
  if (type === 'pen' || type === 'falta') p *= sh.p.tr === 'batedor' ? 1.2 : 1;
  if (sh.p.tr === 'matador') p *= 1.2;
  if (gk && gk.p.tr === 'paredao') p *= 0.85;
  A.sh++;
  const names = { p: last(sh.p.n), q: as2 ? last(as2.p.n) : '', k: gk ? last(gk.p.n) : 'o goleiro' };
  const r = R();
  if (r < p) {
    A.g++; A.sot++; sh.g++; sh.r += 1.1; if (as2) { as2.a++; as2.r += 0.6; }
    for (const o of D.on) if (!o.out) o.r -= o.role === 0 ? 0.35 : o.role === 1 ? 0.18 : 0.06;
    push(M, 'gol', as, M.silent ? '' : say(type, names), { k: type, pid: sh.p.id, aid: as2 ? as2.p.id : 0, n: sh.p.n });
    M.dirty = true;
  } else if (type === 'pen') {
    sh.r -= 0.5; if (gk) gk.r += 0.6; A.sot++;
    push(M, 'def', as, M.silent ? '' : say('penx', names), { k: type, pid: sh.p.id, aid: 0 });
  } else if (r < p + (1 - p) * 0.42) {
    A.sot++; sh.r += 0.1; if (gk) gk.r += 0.28;
    push(M, 'def', as, M.silent ? '' : say('def', names), { k: type, pid: sh.p.id, aid: as2 ? as2.p.id : 0 });
  } else if (r < p + (1 - p) * 0.5) {
    sh.r += 0.05; push(M, 'trave', as, M.silent ? '' : say('trave', names), { k: type, pid: sh.p.id, aid: as2 ? as2.p.id : 0 });
  } else { sh.r -= 0.05; push(M, 'fora', as, M.silent ? '' : say('fora', names), { k: type, pid: sh.p.id, aid: as2 ? as2.p.id : 0 }); }
}
function card(M) {
  const S = R() < 0.5 * (M.h.style === 'pr' ? 1.2 : 1) / (0.5 * (M.h.style === 'pr' ? 1.2 : 1) + 0.5 * (M.a.style === 'pr' ? 1.2 : 1)) ? M.h : M.a;
  const o = wpick(S.on.filter(x => !x.out), x => [0.1, 1.3, 1, 0.6][x.role] * (x.p.tr === 'pavio' ? 2 : 1));
  if (!o) return;
  const side = S.home ? 'h' : 'a', nm = { p: last(o.p.n) };
  if (R() < 0.035) { o.out = true; o.red = true; o.t1 = M.min; o.r -= 1.6; M.dirty = true; push(M, 'red', side, M.silent ? '' : say('red', nm), { pid: o.p.id }); return; }
  o.yc++; o.r -= 0.3;
  if (o.yc >= 2) { o.out = true; o.red = true; o.t1 = M.min; o.r -= 1.2; M.dirty = true; push(M, 'red', side, M.silent ? '' : say('red2', nm), { pid: o.p.id }); }
  else push(M, 'ya', side, M.silent ? '' : say('ya', nm), { pid: o.p.id });
}
function injury(M) {
  const S = R() < 0.5 ? M.h : M.a;
  const o = wpick(S.on.filter(x => !x.out), x => (1.7 - x.en / 100) * (x.p.tr === 'vidraca' ? 2 : 1));
  if (!o) return;
  const med = S.c.id === 0 ? G.fac.med : 1;
  const w = wpick([[1, 35], [2, 25], [3, 15], [4, 10], [6, 10], [10, 5]], x => x[1])[0];
  o.p.inj = Math.max(1, Math.round(w * (1 - 0.12 * med)));
  o.hurt = true; M.dirty = true;
  push(M, 'inj', S.home ? 'h' : 'a', M.silent ? '' : say('inj', { p: last(o.p.n) }), { pid: o.p.id });
  if (S.user && !M.auto && S.subs < 5 && benchOf(S).length) M.pend = { S, o };
  else { const b = bestSub(S, o.role); if (!doSub(M, S, o, b)) { o.out = true; o.t1 = M.min; } }
}
function stepMinute(M) {
  if (M.done || M.pend) return;
  M.min++;
  for (const S of [M.h, M.a]) {
    const st = STYLES[S.style];
    for (const o of S.on) if (!o.out) o.en = Math.max(5, o.en - 0.37 * st.drain * (o.p.age >= 31 ? 1.15 : 1) * (o.p.tr === 'pulmao' ? 0.6 : 1) * (S.ment === 'of' ? 1.06 : 1));
  }
  if (M.dirty || M.min % 5 === 0) calcSectors(M);
  const ph = possOf(M);
  M.h.pos += ph; M.a.pos += 1 - ph;
  if (R() < 0.105) { if (R() < ph) chance(M, M.h, M.a); else chance(M, M.a, M.h); }
  if (R() < 0.042) card(M);
  if (R() < 0.0022) injury(M);
  for (const [S, O] of [[M.h, M.a], [M.a, M.h]]) if (!S.user || M.auto) aiTurn(M, S, O);
  if (M.min === 45 && !M.ht) { M.ht = true; push(M, 'ht', '', 'Fim do primeiro tempo.'); }
  if (M.min >= 90) {
    M.done = true;
    push(M, 'ft', '', 'Apita o árbitro: fim de jogo.');
    if (M.cup && M.h.g === M.a.g) shootout(M);
  }
}
function shootout(M) {
  const sc = [0, 0], kicks = [[], []];
  const conv = S => { const O = S === M.h ? M.a : M.h; const gk = O.on.find(o => !o.out && o.role === 0); return 0.76 * (gk && gk.p.tr === 'paredao' ? 0.88 : 1); };
  let i = 0;
  while (true) {
    for (const k of [0, 1]) {
      const S = k ? M.a : M.h, ok = R() < conv(S);
      if (ok) sc[k]++; kicks[k].push(ok);
      if (i < 5) { const left = [5 - kicks[0].length, 5 - kicks[1].length]; if (sc[0] > sc[1] + left[1] || sc[1] > sc[0] + left[0]) { M.pso = { sc, kicks }; return; } }
    }
    i++;
    if (i >= 5 && sc[0] !== sc[1]) break;
    if (i > 30) { sc[R() < 0.5 ? 0 : 1]++; break; }
  }
  M.pso = { sc, kicks };
}
function talk(M, S, kind) {
  const O = S === M.h ? M.a : M.h, d = S.g - O.g;
  let b = 1, msg;
  if (kind === 'elogio') { b = d > 0 ? 1.03 : d < 0 ? 0.98 : 1.005; msg = d > 0 ? 'O time volta confiante.' : d < 0 ? 'O elogio soou falso com o placar contra.' : 'Clima leve no vestiário.'; }
  else if (kind === 'cobrar') {
    if (d < 0) { const ok = R() < 0.62; b = ok ? 1.05 : 0.98; msg = ok ? 'A bronca funcionou: o time volta ligado.' : 'A bronca pesou. Time nervoso.'; }
    else if (d === 0) { const ok = R() < 0.5; b = ok ? 1.03 : 0.99; msg = ok ? 'O time entendeu o recado.' : 'Ninguém gostou muito do tom.'; }
    else { b = 0.985; msg = 'Cobrar ganhando? O grupo estranhou.'; }
  } else { b = 1.012; for (const o of S.on) if (!o.out) o.en = Math.min(100, o.en + 4); msg = 'Cabeça no lugar e pernas descansadas.'; }
  S.boost = b; M.dirty = true;
  return msg;
}
// encerra a partida: notas, estatísticas, tabela
function finishMatch(M) {
  const win = M.h.g > M.a.g ? M.h : M.h.g < M.a.g ? M.a : M.pso ? (M.pso.sc[0] > M.pso.sc[1] ? M.h : M.a) : null;
  const ph = M.h.pos / Math.max(1, M.h.pos + M.a.pos);
  for (const S of [M.h, M.a]) {
    const O = S === M.h ? M.a : M.h, res = S.g > O.g ? 1 : S.g < O.g ? -1 : 0, mine = S.c.id === 0;
    const dom = (S === M.h ? ph : 1 - ph) - 0.5;
    const lider = S.on.some(o => o.p.tr === 'lider' && o.t1 - o.t0 > 30);
    for (const p of S.served) p.sus = Math.max(0, p.sus - 1);
    for (const o of S.on) {
      const p = o.p, mins = Math.max(1, o.t1 - o.t0), f = Math.min(1, mins / 60);
      let r = o.r + (res * 0.35 + dom * 2 * (o.role === 2 ? 1 : 0.4) + (O.g === 0 && o.role <= 1 ? 0.5 : 0) + rnd(-0.5, 0.6)) * f;
      o.note = clamp(Math.round(r * 10) / 10, 3, 10);
      p.ap++; p.gl += o.g; p.as += o.a; p.h.push(o.note); if (p.h.length > 5) p.h.shift();
      p.en = Math.round(o.en);
      p.yc += o.red ? 0 : o.yc;
      if (o.red) p.sus = 1; else if (p.yc >= 3) { p.yc -= 3; p.sus = 1; }
      if (mine) { p.mo = clamp(p.mo + (res > 0 ? 5 : res < 0 ? (lider ? -2.5 : -5) : 0.5) + (o.note >= 7.5 ? 2 : 0), 5, 100); if (p.prom) { p.prom = 0; p.mo = clamp(p.mo + 4, 5, 100); } }
    }
    if (mine) for (const p of S.c.players) if (!S.usedIds.has(p.id)) p.mo = clamp(p.mo + res * 2, 5, 100);
    S.c.hist.push(M.cup && win ? (win === S ? 'V' : 'D') : res > 0 ? 'V' : res < 0 ? 'D' : 'E'); if (S.c.hist.length > 5) S.c.hist.shift();
    S.c.fam = Math.min(100, S.fam + 4); S.c.lastCnt = S.cnt.slice();
    if (M.comp === 'L') { const t = S.c.t; t.j++; t.gp += S.g; t.gc += O.g; if (res > 0) { t.v++; t.pts += 3; } else if (res < 0) t.d++; else { t.e++; t.pts++; } }
  }
  M.res = { h: M.h.c.id, a: M.a.c.id, gh: M.h.g, ga: M.a.g, pso: M.pso ? M.pso.sc : null, w: win ? win.c.id : -1 };
  return M.res;
}
function simMatch(hc, ac, comp) {
  const M = newMatch(hc, ac, { comp, silent: true });
  while (!M.done) stepMinute(M);
  finishMatch(M);
  return M;
}

// =====================================================================
// COMPETIÇÕES
// =====================================================================
function roundRobin(ids) {
  const a = ids.slice(), n = a.length, out = [];
  for (let r = 0; r < n - 1; r++) {
    const rd = [];
    for (let i = 0; i < n / 2; i++) rd.push(r % 2 ? [a[n - 1 - i], a[i]] : [a[i], a[n - 1 - i]]);
    out.push(rd); a.splice(1, 0, a.pop());
  }
  return out;
}
function standings(div) {
  return G.clubs.filter(c => c.div === div).sort((x, y) => y.t.pts - x.t.pts || y.t.v - x.t.v || (y.t.gp - y.t.gc) - (x.t.gp - x.t.gc) || y.t.gp - x.t.gp || x.id - y.id);
}
const posOf = c => standings(c.div).indexOf(c) + 1;
const lgRound = () => G.lg[0].res.length;
const windowOpen = () => { const r = lgRound(); return r < 4 || (r >= 9 && r < 12); };
function fixturesOf(e) {
  if (e.t === 'L') return [...G.lg[0].sched[e.r], ...G.lg[1].sched[e.r]];
  return G.cup.rounds[e.r] ? G.cup.rounds[e.r].map(t => [t.h, t.a]) : [];
}
function myFixture() {
  const e = G.cal[G.ci]; if (!e) return null;
  const f = fixturesOf(e).find(x => x[0] === 0 || x[1] === 0); if (!f) return null;
  return { e, h: f[0], a: f[1], home: f[0] === 0, opp: G.clubs[f[0] === 0 ? f[1] : f[0]], comp: e.t };
}
function entryLabel(e) { return e.t === 'L' ? `${DIV_N[me().div]} · Rodada ${e.r + 1} de 18` : `Copa Nacional · ${CUP_N[e.r]}`; }
function record(e, res) {
  if (e.t === 'L') { const d = G.clubs[res.h].div; (G.lg[d].res[e.r] = G.lg[d].res[e.r] || []).push([res.h, res.a, res.gh, res.ga]); }
  else { const t = G.cup.rounds[e.r].find(x => x.h === res.h && x.a === res.a); t.gh = res.gh; t.ga = res.ga; t.pso = res.pso; t.w = res.w; }
}
// joga todos os outros jogos da data e fecha a rodada
function playEntry(e, userRes) {
  if (e.t === 'L') { G.lg[0].res[e.r] = G.lg[0].res[e.r] || []; G.lg[1].res[e.r] = G.lg[1].res[e.r] || []; }
  for (const [h, a] of fixturesOf(e)) {
    if (h === 0 || a === 0) { if (userRes) record(e, userRes); continue; }
    record(e, simMatch(G.clubs[h], G.clubs[a], e.t).res);
  }
  if (e.t === 'C') {
    const ws = G.cup.rounds[e.r].map(t => t.w);
    if (ws.length === 1) G.cup.champ = ws[0];
    else { const nx = []; for (let i = 0; i < ws.length; i += 2) nx.push(R() < 0.5 ? { h: ws[i], a: ws[i + 1] } : { h: ws[i + 1], a: ws[i] }); G.cup.rounds[e.r + 1] = nx; }
    G.cup.r = e.r + 1;
  }
}
const cupAlive = id => { const r = G.cup.rounds[G.cup.r]; return !!(r && r.some(t => t.h === id || t.a === id)); };

// =====================================================================
// CARREIRA
// =====================================================================
function earn(cat, v) { v = Math.round(v); G.money += v; G.fin.in[cat] = (G.fin.in[cat] || 0) + v; G.wk.in += v; }
function spend(cat, v) { v = Math.round(v); G.money -= v; G.fin.out[cat] = (G.fin.out[cat] || 0) + v; G.wk.out += v; }
function note(ic, t, x) { G.inbox.unshift({ id: G.uid++, wk: G.week, ic, t, x }); if (G.inbox.length > 40) G.inbox.length = 40; }
function ask(ic, t, x, o, ev, data) { G.inbox.unshift({ id: G.uid++, wk: G.week, ic, t, x, o, ev, data }); }
const pending = () => G.inbox.filter(i => i.o && !i.done);
const wageBill = () => sum(me().players, p => p.w);
const upkeep = () => 3 * sum(FAC, f => G.fac[f.id]);
function ticketInfo(price, cup) {
  const c = me(), pts = sum(c.hist, h => (h === 'V' ? 3 : h === 'E' ? 1 : 0));
  const demand = clamp(0.3 + c.rep / 160 + (c.hist.length ? pts / (c.hist.length * 3) : 0.4) * 0.25 + (c.div === 0 ? 0.08 : 0) + (cup ? 0.08 : 0), 0.2, 1.3);
  const ref = 18 + c.rep * 0.55, cap = STAD[G.fac.est];
  const fill = Math.min(1, demand * Math.pow(ref / price, 1.5));
  const att = Math.round(cap * fill / 10) * 10;
  return { att, cap, rev: Math.round(att * price / 1000), fill };
}
function objective() {
  const c = me(), rank = G.clubs.filter(x => x.div === c.div).sort((a, b) => power(b) - power(a)).indexOf(c) + 1;
  if (c.div === 1) return rank <= 2 ? { pos: 2, t: 'Conquistar o acesso' } : rank <= 4 ? { pos: 4, t: 'Brigar pelo acesso' } : rank <= 7 ? { pos: 7, t: 'Fazer campanha segura' } : { pos: 9, t: 'Não ser o lanterna' };
  return rank <= 1 ? { pos: 1, t: 'Ser campeão' } : rank <= 4 ? { pos: 4, t: 'Terminar no G4' } : rank <= 6 ? { pos: 6, t: 'Ficar no meio da tabela' } : { pos: 8, t: 'Escapar do rebaixamento' };
}
function mkClub(id, info, div, base) {
  const c = { id, name: info[0], abbr: info[1], c1: info[2], c2: info[3], crest: ri(0, 3), pat: ri(0, 3), div, base, rep: clamp(Math.round((base - 50) * 2.6 + 10), 12, 95), form: pick(PRESETS), style: pick(Object.keys(STYLES)), ment: 'eq', fam: ri(70, 95), players: [], lineup: [], hist: [], t: null };
  c.spots = presetSpots(c.form); c.lastCnt = countsOf(rolesOf(c));
  c.players = mkSquad(base);
  return c;
}
function newGame(o) {
  G = {
    v: 1, uid: 1, season: 1, year: 2026, week: 1, ci: 0, cal: [], clubs: [], free: [], youth: [], market: [], known: {}, tries: {}, scoutQ: [],
    money: 1500, price: 30, train: { f: 'eq', i: 1 }, fac: { est: 0, ct: 0, base: 0, med: 0, olh: 0, com: 0 },
    board: { conf: 65, obj: null, warned: false }, inbox: [], lg: null, cup: null, fin: { in: {}, out: {} }, wk: { in: 0, out: 0 },
    hist: [], trophies: [], flags: {}, over: null, review: null, tip: 0, last: null, lastWk: null
  };
  const u = { id: 0, name: o.name, abbr: o.abbr, c1: o.c1, c2: o.c2, crest: o.crest, pat: o.pat, div: 1, base: 0, rep: 34, form: '4-4-2', style: 'eq', ment: 'eq', fam: 60, players: [], lineup: [], hist: [], t: null };
  u.spots = presetSpots(u.form); u.lastCnt = countsOf(rolesOf(u));
  u.players = mkSquad(60);
  for (const p of u.players) p.ctr = ri(2, 4);
  // um veterano de respeito e duas joias para o enredo começar
  const vet = mkPlayer(2, 66, 33, { trait: 0 }); vet.tr = 'lider'; vet.ctr = 1; vet.w = wageOf(vet);
  const j1 = mkPlayer(3, 53, 18, { pot: 82, trait: 0 }); j1.tr = 'promessa';
  const j2 = mkPlayer(1, 52, 17, { pot: 80, trait: 0 });
  u.players.push(vet, j1, j2);
  G.clubs.push(u);
  const pool = shuffle(CLUBS.slice());
  let k = 0;
  for (const b of BASES[0]) G.clubs.push(mkClub(G.clubs.length, pool[k++], 0, b));
  for (const b of BASES[1]) G.clubs.push(mkClub(G.clubs.length, pool[k++], 1, b));
  reindex();
  for (const c of G.clubs) autoLineup(c);
  setupSeason();
  note('📋', 'Bem-vindo à prancheta', `Você assumiu o ${u.name} na Série B. A diretoria quer: ${G.board.obj.t.toLowerCase()} (até ${G.board.obj.pos}º lugar).`);
  return G;
}
function setupSeason() {
  for (const c of G.clubs) {
    c.t = { j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0 }; c.hist = [];
    for (const p of c.players) { p.gl = 0; p.as = 0; p.ap = 0; p.yc = 0; p.sus = 0; p.en = 100; delete p.ask; }
  }
  G.lg = [0, 1].map(d => { const ids = shuffle(G.clubs.filter(c => c.div === d).map(c => c.id)); const t = shuffle(roundRobin(ids)); return { ids, sched: [...t, ...t.map(rd => rd.map(([a, b]) => [b, a]))], res: [] }; });
  const b = G.clubs.filter(c => c.div === 1 && c.id !== 0).sort((x, y) => y.rep - x.rep);
  const ids = G.clubs.filter(c => c.div === 0).map(c => c.id);
  if (!ids.includes(0)) ids.push(0);
  for (const c of b) if (ids.length < 16) ids.push(c.id);
  shuffle(ids);
  const r0 = []; for (let i = 0; i < 16; i += 2) { const x = G.clubs[ids[i]], y = G.clubs[ids[i + 1]]; r0.push(x.div > y.div || (x.div === y.div && R() < 0.5) ? { h: x.id, a: y.id } : { h: y.id, a: x.id }); }
  G.cup = { rounds: [r0], r: 0, champ: -1 };
  G.cal = []; const cupAfter = { 3: 0, 7: 1, 11: 2, 15: 3 };
  for (let r = 0; r < 18; r++) { G.cal.push({ t: 'L', r }); if (cupAfter[r] != null) G.cal.push({ t: 'C', r: cupAfter[r] }); }
  G.ci = 0; G.fin = { in: {}, out: {} }; G.wk = { in: 0, out: 0 }; G.flags = {}; G.tries = {};
  G.board.obj = objective(); G.board.warned = false;
  const spon = Math.round((250 + me().rep * 10) * (1 + 0.15 * G.fac.com));
  earn('Patrocínio', spon);
  note('🤝', 'Patrocínio fechado', `O patrocinador master paga ${money(spon)} pela temporada ${G.year}.`);
  G.youth = [0, 1, 2].map(() => { const p = mkPlayer(wpick([0, 1, 2, 3], x => [0.12, 0.3, 0.3, 0.28][x]), rnd(44, 52) + G.fac.base * 2, ri(16, 18), { trait: 0.35 }); p.pot = Math.min(95, ovr(p) + ri(12, 26) + G.fac.base * 3); p.w = 1; p.ctr = 3; return p; });
  note('🌱', 'Peneira da base', `${G.youth.length} garotos se destacaram nos juniores. Veja em Mercado › Base.`);
  G.free = []; for (let i = 0; i < 10; i++) addFree();
  G.market = []; refreshMarket(true);
  reindex();
}
function addFree() {
  const lvl = power(me());
  const p = mkPlayer(wpick([0, 1, 2, 3], x => [0.12, 0.3, 0.3, 0.28][x]), lvl + rnd(-10, 4), ri(19, 34));
  p.ctr = 0; G.free.push(p); PMAP.set(p.id, p);
}
function refreshMarket(full) {
  G.market = full ? [] : G.market.filter(id => pl(id) && clubOf(id) && clubOf(id).id !== 0 && R() > 0.3);
  let guard = 0;
  while (G.market.length < 14 && guard++ < 200) {
    const c = pick(G.clubs.slice(1)); if (c.players.length < 18) continue;
    const s = c.players.slice().sort((a, b) => ovr(b) - ovr(a));
    const p = R() < 0.8 ? pick(s.slice(12)) : pick(s.slice(0, 12));
    if (p && !G.market.includes(p.id) && !p.jr) G.market.push(p.id);
  }
}
const money = v => { const n = v < 0 ? '−' : '', a = Math.abs(Math.round(v)); return a >= 1000 ? `${n}R$ ${(a / 1000).toFixed(a >= 10000 ? 1 : 2).replace('.', ',')} mi` : `${n}R$ ${a} mil`; };

// ---------- Olheiros: informação incompleta ----------
const knows = p => isMine(p) || !!G.known[p.id] || G.youth.includes(p);
function ovrRange(p) {
  const o = ovr(p); if (knows(p)) return [o, o];
  const e = 10 - 2 * G.fac.olh, off = (p.id * 7 + 3) % (e + 1);
  return [o - off, o + e - off];
}
const estOvr = p => { const r = ovrRange(p); return (r[0] + r[1]) / 2; };
function scout(p) {
  if (knows(p) || G.scoutQ.includes(p.id)) return 'Já observado.';
  if (G.scoutQ.length >= 1 + G.fac.olh) return 'Seus olheiros já estão ocupados esta semana.';
  G.scoutQ.push(p.id); return '';
}

// ---------- Mercado ----------
const repPremium = p => 1 + Math.max(0, ovr(p) - (52 + me().rep * 0.4)) * 0.04;
const willJoin = p => ovr(p) <= 60 + me().rep * 0.4;
function prepAsk(p) {
  if (p.ask != null) return;
  const c = clubOf(p.id), listed = G.market.includes(p.id);
  p.wask = Math.max(1, Math.round(wageOf(p) * (c ? 1.08 : 1.15) * repPremium(p)));
  p.ask = c ? round5(valueOf(p) * (listed ? rnd(1, 1.15) : rnd(1.5, 1.85))) : p.wask * 6;
  p.thr = c ? rnd(0.86, 1) : 1; p.wthr = rnd(0.9, 1);
}
function bid(p, fee, wage, yrs) {
  prepAsk(p);
  const c = clubOf(p.id), m = me();
  if (c && !windowOpen()) return { ok: false, msg: 'A janela de transferências está fechada. Só dá para contratar jogadores sem clube.' };
  if (m.players.length >= SQUAD_MAX) return { ok: false, msg: `Elenco cheio (${SQUAD_MAX}). Venda ou dispense alguém antes.` };
  if (!willJoin(p)) return { ok: false, msg: `${p.n} não vê o clube à altura da carreira dele. Suba a reputação.` };
  if ((G.tries[p.id] || 0) >= 3) return { ok: false, msg: 'A negociação esfriou. Tente de novo na semana que vem.' };
  if (!c) fee = p.ask;
  if (fee > G.money) return { ok: false, msg: 'Não há caixa para essa proposta.' };
  G.tries[p.id] = (G.tries[p.id] || 0) + 1;
  const feeOk = !c || fee >= p.ask * p.thr, wageOk = wage >= p.wask * p.wthr;
  if (feeOk && wageOk) {
    if (c) { c.players = c.players.filter(x => x !== p); if (c.players.length < 18) { const y = mkPlayer(p.pos, c.base - 6 + rnd(-3, 3), ri(18, 21)); c.players.push(y); PMAP.set(y.id, y); } autoLineup(c); }
    else G.free = G.free.filter(x => x !== p);
    G.market = G.market.filter(id => id !== p.id);
    p.w = wage; p.ctr = yrs; p.mo = 68; p.list = false; delete p.ask; G.known[p.id] = 1;
    m.players.push(p);
    spend(c ? 'Contratações' : 'Luvas', fee);
    note('✍️', 'Reforço confirmado', `${p.n} (${POS[p.pos]}, ${ovr(p)}) assinou por ${yrs} ano${yrs > 1 ? 's' : ''}${c ? `. O ${c.name} recebeu ${money(fee)}.` : '.'}`);
    return { ok: true, msg: `${p.n} é do ${m.name}!` };
  }
  const cf = feeOk ? fee : round5(Math.ceil(p.ask * (p.thr + (1 - p.thr) * 0.5) / 5) * 5);
  const cw = wageOk ? wage : Math.ceil(p.wask * (p.wthr + (1 - p.wthr) * 0.5));
  const left = 3 - G.tries[p.id];
  return { ok: false, counter: { fee: cf, wage: cw }, feeOk, wageOk, msg: `${!feeOk ? `O ${c.name} quer ${money(cf)}. ` : ''}${!wageOk ? `${last(p.n)} pede ${money(cw)} por semana. ` : ''}${left ? `Resta${left > 1 ? 'm' : ''} ${left} tentativa${left > 1 ? 's' : ''} esta semana.` : 'Era a última tentativa da semana.'}` };
}
function sellTo(p, cid, fee) {
  const m = me(), c = G.clubs[cid];
  m.players = m.players.filter(x => x !== p); m.lineup = m.lineup.map(id => (id === p.id ? 0 : id));
  p.list = false; p.mo = 62; delete p.ask; c.players.push(p);
  if (c.players.length > 22) { const worst = c.players.slice().sort((a, b) => ovr(a) - ovr(b))[0]; c.players = c.players.filter(x => x !== worst); PMAP.delete(worst.id); G.market = G.market.filter(id => id !== worst.id); }
  earn('Vendas', fee); fixLineup(m);
}
function release(p) {
  const m = me(), cost = p.w * 6;
  if (m.players.length <= SQUAD_MIN) return `O elenco não pode ter menos de ${SQUAD_MIN} jogadores.`;
  m.players = m.players.filter(x => x !== p); m.lineup = m.lineup.map(id => (id === p.id ? 0 : id));
  spend('Rescisões', cost); p.ctr = 0; p.list = false; G.free.push(p); fixLineup(m);
  return '';
}
const renewAsk = p => Math.max(p.w, Math.round(wageOf(p) * (1.06 + (formOf(p) > 7 ? 0.1 : 0) + (p.age > 31 ? -0.12 : 0))));
function renew(p, yrs) {
  if (p.mo < 35) return `${p.n} está insatisfeito e não quer conversar sobre renovação agora.`;
  p.w = renewAsk(p); p.ctr = yrs + 1; p.mo = clamp(p.mo + 6, 5, 100); return '';
}
function promote(p) {
  if (me().players.length >= SQUAD_MAX) return `Elenco cheio (${SQUAD_MAX}).`;
  G.youth = G.youth.filter(x => x !== p); me().players.push(p); p.mo = 75; return '';
}
function buyerFor(p) { const o = ovr(p); const c = G.clubs.slice(1).filter(x => o >= x.base - 7 && o <= x.base + 9); return c.length ? pick(c) : null; }
function offerFor(p, mult) {
  const c = buyerFor(p); if (!c) return false;
  const fee = round5(valueOf(p) * mult);
  ask('💰', `Proposta por ${p.n}`, `O ${c.name} oferece ${money(fee)} por ${p.n} (${POS[p.pos]}, ${ovr(p)}). Valor de mercado: ${money(valueOf(p))}.`, ['Aceitar', 'Pedir mais', 'Recusar'], 'offer', { pid: p.id, cid: c.id, fee });
  return true;
}

// ---------- Eventos com decisão ----------
const EVENTS = {
  offer: {
    act(i, d) {
      const p = pl(d.pid), c = G.clubs[d.cid];
      if (!p || !isMine(p)) return 'O jogador já não está mais no clube.';
      if (i === 2) return `Proposta recusada. ${p.n} fica.`;
      if (me().players.length <= SQUAD_MIN) return `Venda cancelada: o elenco não pode ter menos de ${SQUAD_MIN} jogadores.`;
      let fee = d.fee;
      if (i === 1) { const r = R(); if (r < 0.3) return `O ${c.name} não gostou da pedida e desistiu do negócio.`; if (r < 0.9) fee = round5(fee * rnd(1.08, 1.18)); }
      sellTo(p, d.cid, fee);
      return `${p.n} foi vendido ao ${c.name} por ${money(fee)}.`;
    }
  },
  coletiva: {
    make() { const f = myFixture(); if (!f) return null; return { ic: '🎙️', t: 'Coletiva de imprensa', x: `Um repórter pergunta o que você espera do jogo contra o ${f.opp.name}.`, o: ['Prometer a vitória', 'Elogiar o adversário', 'Sem comentários'], data: {} }; },
    act(i) {
      if (i === 0) { for (const p of me().players) p.mo = clamp(p.mo + 5, 5, 100); G.flags.promise = 1; return 'O elenco gostou da confiança (+5 de moral). Se não vencer, a diretoria vai cobrar.'; }
      if (i === 1) { G.board.conf = clamp(G.board.conf + 1, 0, 100); return 'A diretoria aprovou o tom respeitoso.'; }
      return 'Você saiu pela tangente. Nada mudou.';
    }
  },
  reserva: {
    make() { const m = me(), cut = power(m) - 4; const p = m.players.filter(x => !m.lineup.includes(x.id) && avail(x) && ovr(x) >= cut && x.pos > 0)[0]; if (!p) return null; return { ic: '😤', t: `${p.n} quer jogar`, x: `${p.n} (${POS[p.pos]}, ${ovr(p)}) bateu na sua porta: está cansado do banco.`, o: ['Prometer titularidade', 'Pedir paciência', 'Colocar à venda'], data: { pid: p.id } }; },
    act(i, d) {
      const p = pl(d.pid); if (!p || !isMine(p)) return 'Assunto encerrado.';
      if (i === 0) { p.mo = clamp(p.mo + 14, 5, 100); p.prom = 2; return `${p.n} saiu animado. Escale-o em até 2 jogos, ou o moral dele despenca.`; }
      if (i === 1) { const ok = R() < 0.5; p.mo = clamp(p.mo + (ok ? 6 : -8), 5, 100); return ok ? `${p.n} entendeu e segue trabalhando.` : `${p.n} saiu da sala contrariado.`; }
      p.list = true; p.mo = clamp(p.mo - 5, 5, 100); return `${p.n} foi para a lista de vendas.`;
    }
  },
  churrasco: {
    make() { return { ic: '🍖', t: 'Churrasco do elenco', x: 'Os jogadores pedem um churrasco para unir o grupo.', o: ['Bancar (R$ 15 mil)', 'Fica para a próxima'], data: {} }; },
    act(i) { if (i === 0) { spend('Eventos', 15); for (const p of me().players) p.mo = clamp(p.mo + 7, 5, 100); return 'Grupo fechado. Moral +7 para todo mundo.'; } for (const p of me().players) p.mo = clamp(p.mo - 1, 5, 100); return 'O grupo ficou um pouco frustrado.'; }
  },
  amistoso: {
    make() { const v = round5(50 + me().rep * 2.5); return { ic: '🚌', t: 'Convite para amistoso', x: `Um promotor paga ${money(v)} por um amistoso no meio da semana. O time chega mais cansado ao próximo jogo.`, o: [`Aceitar (${money(v)})`, 'Recusar'], data: { v } }; },
    act(i, d) { if (i === 0) { earn('Amistosos', d.v); for (const p of me().players) p.en = clamp(p.en - 12, 5, 100); return `${money(d.v)} no caixa. Elenco com −12 de energia.`; } return 'Semana livre para treinar.'; }
  },
  noitada: {
    make() { const p = pick(me().players.filter(avail)); if (!p) return null; return { ic: '🌙', t: 'Flagra na noitada', x: `${p.n} foi visto numa festa na véspera do treino.`, o: ['Multar', 'Relevar'], data: { pid: p.id } }; },
    act(i, d) {
      const p = pl(d.pid); if (!p || !isMine(p)) return 'Assunto encerrado.';
      if (i === 0) { p.mo = clamp(p.mo - 10, 5, 100); earn('Multas', p.w); for (const x of me().players) if (x !== p) x.mo = clamp(x.mo + 1, 5, 100); return `${p.n} pagou a multa e ficou emburrado. O resto do grupo aprovou.`; }
      p.en = clamp(p.en - 20, 5, 100); return `${p.n} agradeceu, mas chegou acabado: −20 de energia.`;
    }
  },
  joia: {
    make() { return { ic: '🔭', t: 'Dica de olheiro', x: 'Um olheiro amigo jura ter achado um garoto diferenciado no interior. Quer R$ 25 mil pelo contato.', o: ['Pagar R$ 25 mil', 'Dispensar'], data: {} }; },
    act(i) {
      if (i) return 'Você preferiu não arriscar.';
      spend('Olheiros', 25);
      const p = mkPlayer(ri(1, 3), power(me()) - rnd(7, 11), ri(17, 19), { trait: 0 }); p.pot = Math.min(94, ovr(p) + ri(16, 26)); p.tr = 'promessa'; p.ctr = 0; G.free.push(p); PMAP.set(p.id, p); G.known[p.id] = 1;
      return `Relatório entregue: ${p.n}, ${p.age} anos, ${POS[p.pos]} ${ovr(p)} com potencial ${p.pot}. Está sem clube, em Mercado › Contratar.`;
    }
  },
  torcida: {
    make() { return { ic: '📣', t: 'Pedido da torcida', x: 'A organizada pede ingresso mais barato nos próximos 2 jogos em casa.', o: ['Baixar 40% por 2 jogos', 'Manter o preço'], data: {} }; },
    act(i) { if (i === 0) { G.flags.promo = 2; me().rep += 1.5; G.board.conf = clamp(G.board.conf + 2, 0, 100); return 'Festa na arquibancada. Reputação e confiança sobem.'; } me().rep = Math.max(5, me().rep - 0.5); return 'A torcida reclamou nas redes.'; }
  },
  tutor: {
    make() { const m = me(), v = m.players.find(p => p.age >= 30), y = m.players.filter(p => p.age <= 21).sort((a, b) => b.pot - a.pot)[0]; if (!v || !y) return null; return { ic: '🧑‍🏫', t: 'Tutoria no vestiário', x: `${v.n} se ofereceu para orientar ${y.n} depois dos treinos.`, o: ['Aprovar', 'Agora não'], data: { v: v.id, y: y.id } }; },
    act(i, d) { const v = pl(d.v), y = pl(d.y); if (i || !v || !y) return 'Cada um seguiu a própria rotina.'; grow(y, 3, ''); v.mo = clamp(v.mo + 5, 5, 100); return `${y.n} evoluiu com as dicas de ${v.n}.`; }
  },
  bonus: {
    make() { return { ic: '🏷️', t: 'Ação de patrocínio', x: 'Uma marca de chuteiras quer aparecer no uniforme no próximo jogo.', o: ['R$ 40 mil garantidos', 'R$ 110 mil se vencer'], data: {} }; },
    act(i) { if (i === 0) { earn('Patrocínio', 40); return 'Contrato assinado: R$ 40 mil no caixa.'; } G.flags.bonusWin = 110; return 'Combinado: R$ 110 mil se vencer a próxima partida.'; }
  },
  virose: {
    make() { const m = me(), p = pick(m.players.filter(x => m.lineup.includes(x.id) && avail(x))); if (!p) return null; return { ic: '🤒', t: 'Virose no elenco', x: `${p.n} amanheceu com febre.`, o: ['Tratamento intensivo (R$ 20 mil)', 'Deixar de repouso'], data: { pid: p.id } }; },
    act(i, d) { const p = pl(d.pid); if (!p) return 'Tudo certo.'; if (i === 0) { spend('Departamento médico', 20); return `${p.n} se recuperou a tempo.`; } p.inj = 1; fixLineup(me()); return `${p.n} fica fora do próximo jogo.`; }
  }
};
function resolve(item, i) {
  if (!item || item.done) return;
  item.done = EVENTS[item.ev].act(i, item.data || {}) || 'Feito.';
  item.pick = item.o[i];
}

// ---------- Depois do jogo do usuário ----------
function afterUserMatch(M) {
  const f = myFixture(), e = f.e, S = M.h.c.id === 0 ? M.h : M.a, O = S === M.h ? M.a : M.h;
  const res = finishMatch(M), d = S.g - O.g;
  const out = d > 0 || (M.pso && res.w === 0) ? 1 : d < 0 || (M.pso && res.w !== 0) ? -1 : 0;
  let gate = null;
  if (f.home) {
    const pr = G.flags.promo ? Math.round(G.price * 0.6) : G.price;
    gate = ticketInfo(pr, e.t === 'C'); earn('Bilheteria', gate.rev);
    if (G.flags.promo) G.flags.promo--;
  }
  const gap = power(O.c) - power(S.c);
  let dc = out > 0 ? 3 + (gap > 2 ? 1 : 0) : out < 0 ? -2.5 + (gap > 4 ? 1.5 : gap < -3 ? -1 : 0) : gap > 3 ? 1 : gap < -3 ? -1 : 0;
  if (G.flags.promise) { dc += out > 0 ? 3 : -3; delete G.flags.promise; }
  if (G.flags.bonusWin) { if (out > 0) earn('Patrocínio', G.flags.bonusWin); delete G.flags.bonusWin; }
  if (e.t === 'C') { if (out > 0) { earn('Premiação', CUP_PRIZE[e.r]); dc += 2; } else dc -= 2; }
  G.board.conf = clamp(G.board.conf + dc, 0, 100);
  me().rep = clamp(me().rep + (out > 0 ? 0.4 : out < 0 ? -0.3 : 0), 5, 99);
  playEntry(e, res);
  G.last = { e, res, out, gate, dc, mine: S.on.map(o => ({ id: o.p.id, n: o.p.n, pos: o.role, note: o.note, g: o.g, a: o.a, yc: o.yc, red: !!o.red, hurt: !!o.hurt })), opp: O.c.id, home: f.home, st: { sh: [M.h.sh, M.a.sh], sot: [M.h.sot, M.a.sot], pos: Math.round(100 * M.h.pos / (M.h.pos + M.a.pos)) }, goals: M.ev.filter(x => x.t === 'gol').map(x => ({ m: x.m, s: x.s, n: x.n })) };
  return G.last;
}

// ---------- Virada de semana ----------
function endWeek() {
  const m = me(), T = TRAIN[G.train.f], I = INTENS[G.train.i];
  // recuperação e lesões
  for (const c of G.clubs) for (const p of c.players) {
    const mine = c.id === 0;
    p.en = clamp(p.en + 34 + (mine ? G.fac.med * 3 + T.rec + I.rec : 4), 5, 100);
    if (p.inj > 0) { p.inj--; if (!p.inj && mine) note('🩹', 'De volta', `${p.n} está recuperado e à disposição.`); }
  }
  // treino
  const played = new Set(G.last ? G.last.mine.map(x => x.id) : []);
  for (const p of m.players) {
    if (p.inj) continue;
    const before = ovr(p);
    grow(p, growBase(p.age) * (1 + 0.2 * G.fac.ct) * (played.has(p.id) ? 1.25 : 0.85) * T.g * I.g * (p.tr === 'promessa' ? 1.5 : 1) - decline(p.age), T.k);
    if (ovr(p) > before && before % 5 === 4) note('📈', 'Evolução', `${p.n} chegou a ${ovr(p)} de nível.`);
    if (R() < 0.006 * I.inj * (p.tr === 'vidraca' ? 2 : 1)) { p.inj = Math.max(1, Math.round(ri(1, 3) * (1 - 0.12 * G.fac.med))); note('🚑', 'Lesão no treino', `${p.n} se machucou e fica fora por ${p.inj} semana${p.inj > 1 ? 's' : ''}.`); }
  }
  m.fam = Math.min(100, m.fam + T.fam);
  // moral
  const cut = m.players.map(ovr).sort((a, b) => b - a)[10] || 0;
  for (const p of m.players) {
    if (!played.has(p.id) && avail(p)) { if (ovr(p) >= cut) p.mo = clamp(p.mo - 3, 5, 100); else if (p.mo > 55) p.mo -= 1; }
    if (p.prom) { p.prom--; if (!p.prom) { p.mo = clamp(p.mo - 20, 5, 100); note('💢', 'Promessa quebrada', `${p.n} não foi escalado como combinado. O moral dele despencou.`); } }
  }
  // contas
  spend('Salários', wageBill()); if (upkeep()) spend('Manutenção', upkeep()); earn('Cota de TV', TV[m.div]);
  if (G.money < 0) { G.board.conf = clamp(G.board.conf - 3, 0, 100); if (!G.flags.debt) { G.flags.debt = 1; note('🏦', 'Caixa no vermelho', 'O clube está devendo. A confiança da diretoria cai toda semana até o saldo voltar ao azul.'); } } else delete G.flags.debt;
  G.lastWk = G.wk; G.wk = { in: 0, out: 0 };
  // olheiros
  for (const id of G.scoutQ) { const p = pl(id); if (p) { G.known[id] = 1; note('🔭', 'Relatório do olheiro', `${p.n} (${POS[p.pos]}, ${p.age} anos): nível ${ovr(p)}, potencial ${p.pot}${p.tr ? ', ' + TRAITS[p.tr].n.toLowerCase() : ''}.`); } }
  G.scoutQ = [];
  // mercado
  G.tries = {};
  refreshMarket(false);
  if (R() < 0.4 && G.free.length > 6) { const x = pick(G.free); if (!G.known[x.id]) { G.free = G.free.filter(p => p !== x); PMAP.delete(x.id); } }
  if (G.free.length < 12 && R() < 0.7) addFree();
  // decisões que ninguém respondeu expiram
  for (const it of G.inbox) if (it.o && !it.done) { it.done = it.ev === 'offer' ? 'A proposta expirou.' : 'Você deixou passar.'; }
  G.week++;
  advance();
  if (G.review || G.over) return;
  if (windowOpen()) {
    for (const p of m.players) if (p.list && R() < 0.4) offerFor(p, rnd(0.8, 1.15));
    if (R() < 0.1) { const star = m.players.filter(p => !p.list && formOf(p) >= 6.8).sort((a, b) => valueOf(b) - valueOf(a))[ri(0, 2)]; if (star) offerFor(star, rnd(1.15, 1.5)); }
  }
  if (R() < 0.5) { const keys = Object.keys(EVENTS).filter(k => k !== 'offer'); for (let t = 0; t < 4; t++) { const k = pick(keys); if (G.flags.lastEv === k) continue; const it = EVENTS[k].make(); if (it) { ask(it.ic, it.t, it.x, it.o, k, it.data); G.flags.lastEv = k; break; } } }
  // avisos
  if (lgRound() === 12) { const ex = m.players.filter(p => p.ctr <= 1); if (ex.length) note('📄', 'Contratos no fim', `${ex.length} jogador${ex.length > 1 ? 'es' : ''} fica${ex.length > 1 ? 'm' : ''} sem contrato ao fim da temporada: ${ex.slice(0, 5).map(p => last(p.n)).join(', ')}${ex.length > 5 ? '…' : ''}. Renove pela ficha de cada um.`); }
  const lr = lgRound(); if (lr === 4) note('🔒', 'Janela fechada', 'Só jogadores sem clube podem ser contratados até a rodada 10.'); if (lr === 9) note('🔓', 'Janela aberta', 'O mercado reabre por 3 rodadas.');
  if (lr >= 8 && posOf(m) > G.board.obj.pos + 2) G.board.conf = clamp(G.board.conf - 1, 0, 100);
  if (G.board.conf < 22 && !G.board.warned) { G.board.warned = true; note('⚠️', 'Ultimato da diretoria', 'A paciência acabou. Mais alguns tropeços e você será demitido.'); }
  if (G.board.conf >= 35) G.board.warned = false;
  if (G.board.conf <= 0) { G.over = { why: 'A diretoria perdeu a confiança no seu trabalho.' }; return; }
  fixLineup(m);
}
function advance() {
  G.ci++;
  while (G.ci < G.cal.length) { const e = G.cal[G.ci]; if (e.t === 'C' && !fixturesOf(e).some(f => f[0] === 0 || f[1] === 0)) { playEntry(e, null); G.ci++; } else break; }
  if (G.ci >= G.cal.length) seasonEnd();
}

// ---------- Fim de temporada ----------
function seasonEnd() {
  const m = me(), div = m.div, tb = [standings(0), standings(1)], pos = tb[div].indexOf(m) + 1, obj = G.board.obj;
  const prize = PRIZE[div][pos - 1]; earn('Premiação', prize);
  const up = tb[1].slice(0, 2), down = tb[0].slice(8);
  const champA = tb[0][0], cupCh = G.cup.champ;
  const trophies = [];
  if (pos === 1) trophies.push(`${DIV_N[div]} ${G.year}`);
  if (cupCh === 0) { trophies.push(`Copa Nacional ${G.year}`); }
  G.trophies.push(...trophies);
  let dc = pos <= obj.pos ? (pos <= obj.pos - 2 ? 22 : 15) : -Math.min(30, 8 * (pos - obj.pos));
  if (cupCh === 0) dc += 10;
  let dr = (obj.pos - pos) * 1.2 + (pos === 1 ? (div === 0 ? 8 : 5) : 0) + (cupCh === 0 ? 6 : 0);
  const promoted = up.includes(m), relegated = down.includes(m);
  if (promoted) dr += 6; if (relegated) { dr -= 6; dc -= 10; }
  G.board.conf = clamp(G.board.conf + dc, 0, 100); m.rep = clamp(m.rep + dr, 5, 99);
  const all = G.clubs.flatMap(c => c.players.map(p => [p, c]));
  const top = all.filter(x => x[1].div === div).sort((a, b) => b[0].gl - a[0].gl)[0];
  const best = m.players.slice().sort((a, b) => b.gl - a.gl)[0];
  G.review = { year: G.year, div, pos, obj, met: pos <= obj.pos, prize, promoted, relegated, champA: champA.name, cup: cupCh >= 0 ? G.clubs[cupCh].name : '—', trophies, top: top ? `${top[0].n} (${top[1].abbr}), ${top[0].gl} gols` : '—', best: best ? `${best.n}, ${best.gl} gols` : '—', up: up.map(c => c.name), down: down.map(c => c.name), dc, rec: { v: m.t.v, e: m.t.e, d: m.t.d, gp: m.t.gp, gc: m.t.gc, pts: m.t.pts }, fin: { in: sum(Object.values(G.fin.in), x => x), out: sum(Object.values(G.fin.out), x => x) }, left: [], retired: [] };
  G.hist.push({ year: G.year, div, pos, pts: m.t.pts, cup: cupCh === 0 });
  if (G.board.conf <= 0) G.over = { why: 'A campanha ficou muito abaixo do combinado e a diretoria decidiu trocar o comando.' };
}
function nextSeason() {
  const rv = G.review, m = me();
  const tb = [standings(0), standings(1)];
  for (const c of tb[1].slice(0, 2)) { c.div = 0; if (c.id) c.base += 3; }
  for (const c of tb[0].slice(8)) { c.div = 1; if (c.id) c.base -= 2; }
  for (const c of G.clubs) {
    const mine = c.id === 0;
    for (const p of c.players.slice()) {
      p.age++; p.ctr--; delete p.jr;
      if (!mine) { grow(p, growBase(p.age) * 20 - decline(p.age) * 20, ''); p.mo = 62; p.w = wageOf(p); if (p.ctr <= 0) p.ctr = ri(1, 3); }
      const retire = p.age >= 36 || (p.age >= 34 && R() < 0.5);
      if (retire || (mine && p.ctr <= 0)) {
        c.players = c.players.filter(x => x !== p); PMAP.delete(p.id);
        if (mine) { (retire ? rv.retired : rv.left).push(p.n); }
      }
    }
    if (!mine) {
      c.base = clamp(c.base + rnd(-1, 1), 54, 84);
      const n = [0, 1, 2, 3].map(r => c.players.filter(p => p.pos === r).length), want = [2, 6, 7, 5];
      for (let r = 0; r < 4; r++) for (let i = n[r]; i < want[r]; i++) c.players.push(mkPlayer(r, c.base + rnd(-7, 2), ri(17, 22)));
      let guard = 0; autoLineup(c);
      while (power(c) < c.base - 1 && guard++ < 60) { const p = pl2(c, pick(c.lineup)); if (p) { const k = KEY[p.pos]; p[k] = Math.min(99, p[k] + 2); p.pot = Math.max(p.pot, ovr(p)); } }
      guard = 0;
      while (power(c) > c.base + 3 && guard++ < 60) { const p = pl2(c, pick(c.lineup)); if (p) { const k = KEY[p.pos]; p[k] = Math.max(25, p[k] - 2); } }
      for (const p of c.players) p.w = wageOf(p);
      c.rep = clamp(Math.round((c.base - 50) * 2.6 + 10), 12, 95);
      c.fam = ri(70, 95);
    }
  }
  reindex();
  // socorro da diretoria se o elenco ficou curto
  let helped = 0;
  while (m.players.length < SQUAD_MIN || !m.players.some(p => p.pos === 0)) { const pos = !m.players.some(p => p.pos === 0) ? 0 : ri(1, 3); const p = mkPlayer(pos, power(m) - 8, ri(20, 28), { trait: 0 }); p.ctr = 1; m.players.push(p); helped++; }
  G.season++; G.year++; G.review = null; G.last = null;
  for (const it of G.inbox) if (it.o && !it.done) it.done = 'Expirou.';
  reindex();
  setupSeason();
  if (helped) note('🆘', 'Reforços de emergência', `O elenco ficou curto e a diretoria trouxe ${helped} jogador${helped > 1 ? 'es' : ''} por um ano.`);
  note('🎯', `Meta de ${G.year}`, `${DIV_N[m.div]}: ${G.board.obj.t.toLowerCase()} (até ${G.board.obj.pos}º lugar).`);
  fixLineup(m);
}
const pl2 = (c, id) => c.players.find(p => p.id === id);

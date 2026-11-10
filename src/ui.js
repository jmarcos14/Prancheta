// =====================================================================
// PRANCHETA — interface
// =====================================================================
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SAVE = 'prancheta2.save';
const U = { tab: 'home', sub: { time: 'esc', merc: 'buy', clube: 'fin', tab: 'liga' }, filt: -1, div: 1, view: '', M: null, speed: 2, paused: false, timer: 0, seen: 0, sheet: false, neg: null, subOut: null, cr: null };
const store = {
  get() { try { const v = localStorage.getItem(SAVE); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(v) { try { localStorage.setItem(SAVE, JSON.stringify(v)); } catch (e) { /* sem armazenamento: joga sem salvar */ } },
  del() { try { localStorage.removeItem(SAVE); } catch (e) { /* idem */ } }
};
const save = () => { if (G) store.set(G); };
const TEMA_KEY = 'prancheta2.tema';
function setTema(v) { U.tema = v === 'claro' || v === 'escuro' ? v : ''; if (U.tema) document.documentElement.dataset.tema = U.tema; else delete document.documentElement.dataset.tema; }
try { setTema(localStorage.getItem(TEMA_KEY)); } catch (e) { setTema(''); }
let tT = 0;
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(tT); tT = setTimeout(() => el.classList.remove('on'), 2600); }

// ---------- peças visuais ----------
let CID = 0;
const SHAPES = ['M4 3h28v15c0 9-6 14-14 17C10 32 4 27 4 18z', 'M18 2a16 16 0 1 0 0 32a16 16 0 1 0 0-32z', 'M18 1l15 8v16l-15 10L3 25V9z', 'M4 3h28v22l-14 10L4 25z'];
function crest(c, s = 34) {
  const id = 'k' + (++CID), d = SHAPES[c.crest % 4];
  const pat = [`<rect y="13" width="36" height="9" fill="${c.c2}"/>`, `<rect x="6" width="6" height="36" fill="${c.c2}"/><rect x="18" width="6" height="36" fill="${c.c2}"/><rect x="30" width="6" height="36" fill="${c.c2}"/>`, `<rect x="18" width="18" height="36" fill="${c.c2}"/>`, `<path d="M-2 16L38 2v10L-2 26z" fill="${c.c2}"/>`][c.pat % 4];
  return `<svg width="${s}" height="${s}" viewBox="0 0 36 36" aria-hidden="true" style="flex:none"><defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs><g clip-path="url(#${id})"><rect width="36" height="36" fill="${c.c1}"/>${pat}</g><path d="${d}" fill="none" stroke="#fff" stroke-width="2.6"/><path d="${d}" fill="none" stroke="rgba(0,0,0,.6)" stroke-width="1"/></svg>`;
}
const mag = (role, txt, cls = '') => `<span class="mag p${role} ${cls}">${txt}</span>`;
function pmag(p, cls = '') { const r = ovrRange(p); return r[0] === r[1] ? mag(p.pos, r[0], cls) : mag(p.pos, `${r[0]}–${r[1]}`, 'rg ' + cls); }
const enCls = v => (v < 50 ? 'low' : v < 72 ? 'mid' : '');
const bar = (v, cls = '') => `<div class="bar ${cls}"><i style="width:${clamp(v, 0, 100)}%"></i></div>`;
const stars = pot => `<span class="stars" style="--v:${clamp(Math.round((pot - 45) / 5) / 2, 0.5, 5)}" role="img" aria-label="Potencial ${pot}">★★★★★</span>`;
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
function tags(p) {
  let t = '';
  if (p.inj) t += ` <span class="tag red">Lesão ${p.inj} sem</span>`;
  if (p.sus) t += ' <span class="tag red">Suspenso</span>';
  if (p.list) t += ' <span class="tag blue">À venda</span>';
  if (p.prom) t += ' <span class="tag yel">Prometido</span>';
  if (p.jr) t += ' <span class="tag">Júnior</span>';
  return t;
}
function prow(p, o = {}) {
  const sub = o.sub || `${POS[p.pos]} · ${p.age} anos${p.tr && knows(p) ? ' · ' + TRAITS[p.tr].n : ''}`;
  const r = o.r != null ? o.r : `<span class="mini"><span>${Math.round(p.en)}</span>${bar(p.en, enCls(p.en))}</span>`;
  return `<button class="prow ${o.off ? 'off' : ''}" data-a="${o.a || 'player'}" data-id="${p.id}" ${o.x || ''}>${o.m || pmag(p)}<span class="grow"><b>${esc(p.n)}${tags(p)}</b><small>${sub}</small></span>${r}</button>`;
}
const seg = (k, opts, cls = '') => `<div class="seg ${cls}">${opts.map(([v, l]) => `<button class="${U.sub[k] === v ? 'on' : ''}" data-a="sub" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
const kv = (k, v, cls = '') => `<div class="kv"><span>${k}</span><b class="${cls}">${v}</b></div>`;
const ctrEnd = p => G.year + p.ctr - 1;
const LINES_V = '<svg class="lines" viewBox="0 0 100 114" preserveAspectRatio="none"><path d="M0 57h100M28 0v15h44V0M28 114v-15h44v15M40 0v6h20V0M40 114v-6h20v6"/><ellipse cx="50" cy="57" rx="11" ry="10"/></svg>';
const LINES_H = '<svg class="lines" viewBox="0 0 160 94" preserveAspectRatio="none"><path d="M80 0v94M0 25h22v44H0M160 25h-22v44h22M0 37h8v20H0M160 37h-8v20h8"/><ellipse cx="80" cy="47" rx="13" ry="14"/></svg>';

// ---------- render principal ----------
const TABS = [['home', 'Início', '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6"/>'], ['time', 'Time', '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 12h16"/><circle cx="12" cy="12" r="2.5"/>'], ['merc', 'Mercado', '<path d="M4 8h13l-3-3M20 16H7l3 3"/>'], ['clube', 'Clube', '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>'], ['tab', 'Tabelas', '<path d="M5 6h14M5 12h14M5 18h9"/>']];
function render() {
  if (!G) return;
  const m = me(), main = $('#main'), view = U.tab + ':' + (U.sub[U.tab] || ''), keep = view === U.view ? main.scrollTop : 0;
  $('#top').innerHTML = `<div class="top-l">${crest(m, 38)}<div style="min-width:0"><b>${esc(m.name)}</b><small>${DIV_N[m.div]} · ${posOf(m)}º lugar · ${G.year}</small></div></div><div class="cash num ${G.money < 0 ? 'neg' : ''}">${money(G.money)}<small>em caixa</small></div>`;
  main.innerHTML = VIEW[U.tab]();
  main.scrollTop = keep;
  if (view !== U.view) { main.classList.remove('enter'); void main.offsetWidth; main.classList.add('enter'); }
  U.view = view;
  const pend = pending().length;
  $('#tabs').innerHTML = TABS.map(([k, l, ic]) => `<button class="${U.tab === k ? 'on' : ''}" data-a="go" data-t="${k}" aria-label="${l}"><svg viewBox="0 0 24 24">${ic}</svg>${l}${k === 'home' && pend ? `<span class="badge">${pend}</span>` : ''}${k === 'merc' && G.youth.length && lgRound() < 2 ? '<span class="badge">!</span>' : ''}</button>`).join('');
}
const VIEW = {};

// ---------- Início ----------
function duel(lbl, a, b) { return `<div class="duel"><span>${lbl}</span><b class="num">${Math.round(a)}</b><div class="track"><i style="width:${clamp(50 + (a - b) * 2.4, 8, 92)}%"></i></div><b class="num">${Math.round(b)}</b></div>`; }
const formDots = c => (c.hist.length ? `<span class="dots">${c.hist.map(h => `<i class="${h}"></i>`).join('')}</span>` : '');
function matchup(mine, theirs) {
  if (STYLES[mine].beats === theirs) return `<p class="hand ok">Seu estilo leva vantagem sobre ${STYLES[theirs].n.toLowerCase()}: +6% em tudo.</p>`;
  if (STYLES[theirs].beats === mine) return `<p class="hand red">Cuidado: ${STYLES[theirs].n.toLowerCase()} leva vantagem sobre o seu estilo.</p>`;
  return '';
}
VIEW.home = () => {
  const m = me(), f = myFixture(), pend = pending();
  let h = '';
  if (!G.tip) h += `<div class="card stack"><p class="hand">Monte o time em Time, reforce em Mercado e volte aqui para jogar. Cada jogo vale uma semana.</p><button class="btn ghost sm" data-a="tipOk">Entendi</button></div>`;
  if (f) {
    const pv = preview(G.clubs[f.h], G.clubs[f.a]), my = f.home ? pv.h : pv.a, op = f.home ? pv.a : pv.h, o = f.opp;
    h += `<div class="card hero stack"><div class="eyebrow">${entryLabel(f.e)} · ${f.home ? 'em casa' : 'fora'}</div>
      <div class="vs"><div class="t">${crest(m, 58)}<b>${esc(m.name)}</b><small>${m.form} · ${STYLES[m.style].n}</small></div><div class="x">vs</div><button class="t" data-a="club" data-id="${o.id}">${crest(o, 58)}<b>${esc(o.name)}</b><small>${o.form} · ${STYLES[o.style].n}</small><span>${formDots(o)}</span></button></div>
      <div class="duels">${duel('Ataque', my.atk, 0.7 * op.def + 0.3 * op.gk)}${duel('Meio', my.mid, op.mid)}${duel('Defesa', 0.7 * my.def + 0.3 * my.gk, op.atk)}</div>
      ${matchup(m.style, o.style)}
      ${pend.length ? `<button class="btn cta wait" data-a="toPend">Responda ${plural(pend.length, 'pendência', 'pendências')}</button>` : '<button class="btn cta" data-a="play">Jogar</button>'}</div>`;
  }
  h += pend.map(it => `<div class="postit" id="pend${it.id}"><div class="hand">${esc(it.t)}</div><p>${esc(it.x)}</p><div class="btns">${it.o.map((l, i) => `<button class="btn sm" data-a="res" data-id="${it.id}" data-i="${i}">${esc(l)}</button>`).join('')}</div></div>`).join('');
  const inj = m.players.filter(p => p.inj).length, sus = m.players.filter(p => p.sus).length, tired = m.lineup.map(pl).filter(p => p && p.en < 60).length, exp = m.players.filter(p => p.ctr <= 1).length;
  const al = [];
  if (windowOpen()) al.push('<button class="chip ok" data-a="go" data-t="merc">Janela aberta</button>');
  if (G.money < 0) al.push('<button class="chip warn" data-a="go" data-t="clube">Caixa no vermelho</button>');
  if (inj) al.push(`<button class="chip warn" data-a="go" data-t="time">${plural(inj, 'lesionado', 'lesionados')}</button>`);
  if (sus) al.push(`<button class="chip warn" data-a="go" data-t="time">${plural(sus, 'suspenso', 'suspensos')}</button>`);
  if (tired) al.push(`<button class="chip info" data-a="go" data-t="time">${plural(tired, 'titular cansado', 'titulares cansados')}</button>`);
  if (exp && lgRound() >= 9) al.push(`<button class="chip info" data-a="go" data-t="merc" data-s="sell">${plural(exp, 'contrato acabando', 'contratos acabando')}</button>`);
  if (G.youth.length) al.push(`<button class="chip info" data-a="go" data-t="merc" data-s="base">${plural(G.youth.length, 'garoto na base', 'garotos na base')}</button>`);
  if (al.length) h += `<div class="chips">${al.join('')}</div>`;
  const c = G.board.conf;
  h += `<button class="card rowx" data-a="go" data-t="clube" data-s="dir" style="text-align:left"><div class="grow"><h3>Meta da diretoria</h3><b>${G.board.obj.t} · até ${G.board.obj.pos}º</b><div class="meter ${c < 30 ? 'low' : c >= 70 ? 'good' : ''}" style="margin-top:8px"><i style="width:${c}%"></i></div></div><div class="right"><div class="big num" style="font-size:32px">${Math.round(c)}%</div><small class="muted">confiança</small></div></button>`;
  const notes = G.inbox.filter(i => !i.o || i.done), show = U.more ? notes.slice(0, 20) : notes.slice(0, 4);
  h += `<div class="card flat"><div class="head pad"><h2><span>Notícias</span></h2><small>semana ${G.week}</small></div>${show.map(n => `<div class="note"><b>${esc(n.t)}</b><p>${esc(n.o ? n.done : n.x)}</p></div>`).join('') || '<p class="muted pad">Nada por aqui ainda.</p>'}${notes.length > 4 ? `<button class="more" data-a="more">${U.more ? 'Mostrar menos' : 'Ver mais'}</button>` : ''}</div>`;
  return h;
};

// ---------- Time ----------
function pitchV(c) {
  const roles = rolesOf(c);
  let h = '';
  c.lineup.forEach((id, k) => {
    const p = pl(id); if (!p) return;
    const r = roles[k], sp = c.spots[k], odd = r !== p.pos && p.tr !== 'coringa';
    h += `<button class="slot" style="left:${sp.x}%;top:${sp.y}%" data-a="slot" data-k="${k}" aria-label="${esc(p.n)}, ${POS_N[r]}">${mag(r, Math.round(ovrIn(p, r)))}${odd ? '<span class="wr" title="Fora de posição">!</span>' : ''}<span class="nm">${esc(last(p.n))}</span><span class="en ${enCls(p.en)}"><i style="width:${p.en}%"></i></span></button>`;
  });
  return `<div class="pitch v" id="board">${LINES_V}<i class="zone" style="top:${ZONE.ma}%"><em>Meio</em></i><i class="zone" style="top:${ZONE.dm}%"><em>Defesa</em></i><i class="zone first"><em>Ataque</em></i>${h}</div>`;
}
VIEW.time = () => {
  const m = me(), s = U.sub.time, f = myFixture();
  fixLineup(m);
  let h = seg('time', [['esc', 'Escalação'], ['tat', 'Estilo'], ['tre', 'Treino']]);
  if (s === 'esc') {
    const pv = f ? preview(G.clubs[f.h], G.clubs[f.a]) : null, my = pv ? (f.home ? pv.h : pv.a) : null;
    const rest = m.players.filter(p => !m.lineup.includes(p.id)), ok = rest.filter(avail).sort((a, b) => ovr(b) - ovr(a)), out = rest.filter(p => !avail(p));
    const fam = famNow(m), custom = !PRESETS.includes(m.form);
    h += pitchV(m);
    h += `<div class="chips scroll">${PRESETS.map(k => `<button class="chip board ${m.form === k ? 'on' : ''}" data-a="form" data-v="${k}">${k}</button>`).join('')}${custom ? `<span class="chip on">${m.form}</span>` : ''}</div>`;
    h += `<div class="strip">${my ? `<div><b class="num">${Math.round(0.7 * my.def + 0.3 * my.gk)}</b><small>Defesa</small></div><div><b class="num">${Math.round(my.mid)}</b><small>Meio</small></div><div><b class="num">${Math.round(my.atk)}</b><small>Ataque</small></div>` : ''}<div><b class="num">${Math.round(fam)}%</b><small>Entrosamento</small></div><button class="btn sm yel" data-a="auto">Melhor time</button></div>`;
    h += `<p class="hint">Arraste os ímãs para ajustar o desenho. Toque num ímã para trocar o jogador.${fam < m.fam ? ` Mudar de linha custa entrosamento: ${Math.round(m.fam)}% vira ${Math.round(fam)}% neste jogo.` : ''}</p>`;
    h += `<div class="card flat"><div class="head pad"><h2><span>Reservas</span></h2><small>${m.players.length} no elenco</small></div>${ok.map(p => prow(p)).join('') || '<p class="muted pad">Sem reservas disponíveis.</p>'}</div>`;
    if (out.length) h += `<div class="card flat"><div class="head pad"><h2><span>Fora de combate</span></h2></div>${out.map(p => prow(p, { off: 1 })).join('')}</div>`;
  } else if (s === 'tat') {
    const o = f && f.opp, fam = famNow(m);
    h += `<div class="card stack"><div class="head"><h2><span>Entrosamento</span></h2><b class="num">${Math.round(fam)}%</b></div><div class="meter ${fam < 45 ? 'low' : fam >= 80 ? 'good' : ''}"><i style="width:${fam}%"></i></div><p class="muted">Vale de −6% a +2% em todos os setores. Sobe a cada jogo e com treino tático. Cada jogador que muda de linha custa 8 pontos; trocar o estilo custa 22%.</p>${o ? `<p class="hand">O ${esc(o.name)} joga no ${o.form}, ${STYLES[o.style].n.toLowerCase()}.</p>` : ''}</div>`;
    h += `<div class="card stack"><div class="head"><h2><span>Estilo de jogo</span></h2></div>${Object.keys(STYLES).map(k => { const S = STYLES[k], lose = Object.keys(STYLES).find(x => STYLES[x].beats === k); return `<button class="opt ${m.style === k ? 'on' : ''}" data-a="style" data-v="${k}"><b>${S.n}${o && S.beats === o.style ? ' <span class="tag ok">bom contra o próximo rival</span>' : ''}${o && STYLES[o.style].beats === k ? ' <span class="tag red">ruim contra o próximo rival</span>' : ''}</b><small>${S.d}</small>${S.beats ? `<small>Leva vantagem sobre ${STYLES[S.beats].n.toLowerCase()}, perde para ${STYLES[lose].n.toLowerCase()}.</small>` : ''}</button>`; }).join('')}</div>`;
    h += `<div class="card stack"><div class="head"><h2><span>Postura inicial</span></h2><small>dá para mudar durante o jogo</small></div><div class="seg inpaper">${Object.keys(MENT).map(k => `<button class="${m.ment === k ? 'on' : ''}" data-a="ment" data-v="${k}">${MENT[k].n}</button>`).join('')}</div><p class="muted">${MENT[m.ment].d}.</p></div>`;
  } else {
    const T = TRAIN[G.train.f], I = INTENS[G.train.i], rec = 34 + G.fac.med * 3 + T.rec + I.rec;
    h += `<div class="card stack"><div class="head"><h2><span>Foco da semana</span></h2></div>${Object.keys(TRAIN).map(k => `<button class="opt ${G.train.f === k ? 'on' : ''}" data-a="train" data-v="${k}"><b>${TRAIN[k].n}</b><small>${TRAIN[k].d}</small></button>`).join('')}</div>`;
    h += `<div class="card stack"><div class="head"><h2><span>Intensidade</span></h2></div><div class="seg inpaper">${INTENS.map((x, i) => `<button class="${G.train.i === i ? 'on' : ''}" data-a="intens" data-v="${i}">${x.n}</button>`).join('')}</div><p class="muted">${I.d}</p><div>${kv('Energia recuperada por semana', '+' + rec)}${kv('Um jogo inteiro gasta', 'cerca de 33')}${kv('Ritmo de evolução', '×' + (T.g * I.g * (1 + 0.2 * G.fac.ct)).toFixed(2).replace('.', ','))}${kv('Risco de lesão no treino', ['baixo', 'normal', 'alto'][G.train.i])}${kv('Entrosamento por semana', '+' + (T.fam + 4))}</div><p class="muted">Jovens evoluem rápido até o potencial; depois dos 30 o nível cai. Quem joga evolui mais.</p></div>`;
  }
  return h;
};

// ---------- Mercado ----------
VIEW.merc = () => {
  const m = me(), s = U.sub.merc, open = windowOpen();
  let h = seg('merc', [['buy', 'Contratar'], ['sell', 'Meu elenco'], ['base', 'Base']]);
  if (s === 'buy') {
    h += `<div class="chips">${open ? '<span class="chip ok">Janela aberta</span>' : '<span class="chip warn">Janela fechada: só jogadores sem clube</span>'}<span class="chip board">Olheiros em campo: ${G.scoutQ.length}/${1 + G.fac.olh}</span><span class="chip board">Elenco ${m.players.length}/${SQUAD_MAX}</span></div>`;
    h += `<div class="chips">${[[-1, 'Todos'], [0, 'GOL'], [1, 'DEF'], [2, 'MEI'], [3, 'ATA']].map(([v, l]) => `<button class="chip ${U.filt === v ? 'on' : ''}" data-a="filt" data-v="${v}">${l}</button>`).join('')}</div>`;
    const list = [...G.free.map(p => [p, null]), ...G.market.map(id => [pl(id), clubOf(id)]).filter(x => x[0] && x[1] && x[1].id)].filter(x => U.filt < 0 || x[0].pos === U.filt).sort((a, b) => estOvr(b[0]) - estOvr(a[0]));
    h += `<div class="card flat">${list.map(([p, c]) => { prepAsk(p); return prow(p, { off: c && !open, sub: `${POS[p.pos]} · ${p.age} anos · ${c ? esc(c.name) : 'sem clube'}`, r: `<span class="right"><span class="val num">${money(p.ask)}</span><small class="muted" style="display:block">${c ? 'pedida' : 'luvas'}</small></span>` }); }).join('') || '<p class="muted pad">Ninguém nessa posição agora.</p>'}</div>`;
    h += '<p class="hint">Faixas como 58–66 são estimativas: mande um olheiro para ver o nível exato. Em Tabelas dá para abrir qualquer clube e propor por quem não está à venda.</p>';
  } else if (s === 'sell') {
    const list = m.players.slice().sort((a, b) => valueOf(b) - valueOf(a));
    h += `<div class="card"><div>${kv('Folha salarial', money(wageBill()) + ' por semana')}${kv('Contratos que acabam este ano', m.players.filter(p => p.ctr <= 1).length)}</div><p class="muted" style="margin-top:6px">Abra a ficha para renovar, pôr à venda ou dispensar.</p></div>`;
    h += `<div class="card flat">${list.map(p => prow(p, { sub: `${POS[p.pos]} · ${p.age} anos · ${money(p.w)}/sem · até ${ctrEnd(p)}${p.ctr <= 1 ? ' <span class="tag yel">acaba</span>' : ''}`, r: `<span class="val num">${money(valueOf(p))}</span>` })).join('')}</div>`;
  } else {
    h += '<p class="hint">A peneira revela 3 garotos por temporada. Quem não for promovido vai embora no fim do ano.</p>';
    h += G.youth.map(p => `<div class="card stack"><div class="rowx">${pmag(p)}<div class="grow"><b>${esc(p.n)}</b><div class="muted">${POS_N[p.pos]} · ${p.age} anos${p.tr ? ' · ' + TRAITS[p.tr].n : ''}</div></div><div class="right">${stars(p.pot)}<div class="muted">potencial ${p.pot}</div></div></div><div class="btns"><button class="btn sm" data-a="promote" data-id="${p.id}">Promover (R$ 1 mil/sem)</button><button class="btn ghost sm" data-a="player" data-id="${p.id}">Ficha</button><button class="btn ghost sm" data-a="dismiss" data-id="${p.id}">Dispensar</button></div></div>`).join('') || '<div class="card"><p class="hand">Ninguém na base agora. A próxima peneira é no começo da temporada.</p></div>';
  }
  return h;
};

// ---------- Clube ----------
VIEW.clube = () => {
  const m = me(), s = U.sub.clube;
  let h = seg('clube', [['fin', 'Finanças'], ['est', 'Estrutura'], ['dir', 'Carreira']]);
  if (s === 'fin') {
    const t = ticketInfo(G.price, false), wk = G.lastWk;
    const ledger = (o, cls) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => kv(k, money(v), cls)).join('') || '<p class="muted">Nada ainda.</p>';
    h += `<div class="card stack"><div class="head"><h2><span>Caixa</span></h2>${wk ? `<small>semana passada: ${money(wk.in - wk.out)}</small>` : ''}</div><div class="big num ${G.money < 0 ? 'neg' : ''}">${money(G.money)}</div><div>${kv('Salários', '−' + money(wageBill()).slice(0) + ' por semana', 'neg')}${kv('Manutenção da estrutura', '−' + money(upkeep()) + ' por semana', 'neg')}${kv('Cota de TV', '+' + money(TV[m.div]) + ' por semana', 'pos')}${kv('Bilheteria (jogo em casa)', '+' + money(t.rev), 'pos')}</div></div>`;
    h += `<div class="card stack"><div class="head"><h2><span>Ingresso</span></h2><small>estádio: ${STAD[G.fac.est].toLocaleString('pt-BR')} lugares</small></div><div class="stepper"><button data-a="price" data-v="-5" aria-label="Baixar preço">−</button><b class="num">R$ ${G.price}</b><button data-a="price" data-v="5" aria-label="Subir preço">+</button></div><div class="meter ${t.fill < 0.5 ? 'low' : t.fill >= 0.98 ? 'good' : ''}"><i style="width:${t.fill * 100}%"></i></div><p>Previsão: <b>${t.att.toLocaleString('pt-BR')}</b> torcedores e <b>${money(t.rev)}</b> de renda por jogo.</p><p class="muted">O melhor preço costuma ser o mais alto que ainda lota o estádio.</p>${G.flags.promo ? `<p class="hand">Promoção da torcida: −40% por mais ${plural(G.flags.promo, 'jogo', 'jogos')}.</p>` : ''}</div>`;
    h += `<div class="card"><div class="head"><h2><span>Temporada ${G.year}</span></h2></div><h3>Entradas</h3>${ledger(G.fin.in, 'pos')}<h3 style="margin-top:12px">Saídas</h3>${ledger(G.fin.out, 'neg')}</div>`;
  } else if (s === 'est') {
    h += FAC.map(f => { const l = G.fac[f.id], mx = l >= 4; return `<div class="card stack"><div class="head" style="margin:0"><h2><span>${f.n}</span></h2><span class="pips" role="img" aria-label="Nível ${l + 1} de 5">${[0, 1, 2, 3, 4].map(i => `<i class="${i <= l ? 'on' : ''}"></i>`).join('')}</span></div><p>${f.d(l)}</p>${mx ? '<p class="muted">Nível máximo.</p>' : `<p class="muted">Próximo nível: ${f.d(l + 1)}</p><button class="btn" data-a="fac" data-id="${f.id}" ${G.money < f.cost[l] ? 'disabled' : ''}>Ampliar por ${money(f.cost[l])}</button>`}</div>`; }).join('');
    h += '<p class="hint">Cada nível acima do primeiro custa R$ 3 mil por semana de manutenção.</p>';
  } else {
    const c = G.board.conf;
    h += `<div class="card stack"><div class="head"><h2><span>Diretoria</span></h2><small>meta: até ${G.board.obj.pos}º</small></div><b>${G.board.obj.t}</b><div class="meter ${c < 30 ? 'low' : c >= 70 ? 'good' : ''}"><i style="width:${c}%"></i></div><div>${kv('Confiança', Math.round(c) + '%')}${kv('Reputação do clube', Math.round(m.rep) + ' de 100')}${kv('Temporada', G.season + 'ª')}</div><p class="muted">Reputação atrai patrocínio, público e jogadores melhores.</p></div>`;
    h += `<div class="card"><div class="head"><h2><span>Sala de troféus</span></h2></div>${G.trophies.length ? G.trophies.map(t => `<p class="hand">★ ${esc(t)}</p>`).join('') : '<p class="muted">Vazia por enquanto.</p>'}</div>`;
    h += `<div class="card flat"><div class="head pad"><h2><span>Histórico</span></h2></div>${G.hist.length ? `<table><tr><th class="l" style="padding-left:14px">Ano</th><th>Divisão</th><th>Posição</th><th>Pontos</th></tr>${G.hist.map(x => `<tr><td class="l" style="padding-left:14px">${x.year}</td><td>${DIV_N[x.div]}</td><td>${x.pos}º</td><td>${x.pts}</td></tr>`).join('')}</table>` : '<p class="muted pad">A primeira temporada ainda está em andamento.</p>'}</div>`;
    h += `<div class="card stack"><div class="head"><h2><span>Aparência</span></h2></div><div class="seg inpaper">${[['', 'Automático'], ['claro', 'Claro'], ['escuro', 'Escuro']].map(([v, l]) => `<button class="${U.tema === v ? 'on' : ''}" data-a="tema" data-v="${v}">${l}</button>`).join('')}</div><p class="muted">Automático segue o tema do seu aparelho.</p></div>`;
    h += '<button class="btn ghost" style="color:var(--chalk);box-shadow:inset 0 0 0 1.5px var(--chalk-2)" data-a="wipe">Encerrar carreira e começar outra</button><p class="hint">O jogo salva sozinho neste navegador a cada semana.</p>';
  }
  return h;
};

// ---------- Tabelas ----------
function myGames() {
  const m = me();
  return G.cal.map((e, i) => {
    if (e.t === 'L') return { e, i, f: G.lg[m.div].sched[e.r].find(x => x[0] === 0 || x[1] === 0), r: (G.lg[m.div].res[e.r] || []).find(x => x[0] === 0 || x[1] === 0) };
    const t = (G.cup.rounds[e.r] || []).find(x => x.h === 0 || x.a === 0);
    return { e, i, f: t ? [t.h, t.a] : null, r: t && t.w != null ? [t.h, t.a, t.gh, t.ga, t.pso] : null };
  });
}
const cn = id => esc(G.clubs[id].name);
function fxRow(h, a, r, pso) {
  const sc = r ? `${r[0]}–${r[1]}${pso ? ` <small>(${pso[0]}–${pso[1]} pên.)</small>` : ''}` : '×';
  const w = r ? (pso ? (pso[0] > pso[1] ? 0 : 1) : r[0] > r[1] ? 0 : r[0] < r[1] ? 1 : -1) : -1;
  return `<div class="fx ${h === 0 || a === 0 ? 'me' : ''}"><span class="${w === 0 ? 'w' : ''}">${cn(h)}</span><b>${sc}</b><span class="${w === 1 ? 'w' : ''}">${cn(a)}</span></div>`;
}
VIEW.tab = () => {
  const m = me(), s = U.sub.tab;
  let h = seg('tab', [['liga', 'Liga'], ['copa', 'Copa'], ['art', 'Artilharia'], ['jogos', 'Meus jogos']]);
  const divSeg = `<div class="seg">${[0, 1].map(d => `<button class="${U.div === d ? 'on' : ''}" data-a="div" data-v="${d}">${DIV_N[d]}</button>`).join('')}</div>`;
  if (s === 'liga') {
    const t = standings(U.div);
    h += divSeg + `<div class="card flat"><table><tr><th></th><th class="l">Clube</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th>PTS</th></tr>${t.map((c, i) => `<tr class="${c.id === 0 ? 'me' : ''} ${U.div === 0 ? (i === 0 ? 'ch' : i >= 8 ? 'dn' : '') : i < 2 ? 'up' : ''}" data-a="club" data-id="${c.id}"><td class="z">${i + 1}</td><td class="l"><div class="tclub">${crest(c, 22)}<span>${esc(c.name)}</span></div></td><td>${c.t.j}</td><td>${c.t.v}</td><td>${c.t.e}</td><td>${c.t.d}</td><td>${c.t.gp - c.t.gc > 0 ? '+' : ''}${c.t.gp - c.t.gc}</td><td class="pts">${c.t.pts}</td></tr>`).join('')}</table></div>`;
    h += `<p class="hint">${U.div === 0 ? 'Dourado: campeão. Vermelho: os 2 últimos caem.' : 'Verde: os 2 primeiros sobem.'} Toque num clube para ver o elenco.</p>`;
    const rd = G.lg[U.div].res.length - 1;
    if (rd >= 0) h += `<div class="card flat"><div class="head pad"><h2><span>Rodada ${rd + 1}</span></h2></div>${G.lg[U.div].res[rd].map(r => fxRow(r[0], r[1], [r[2], r[3]])).join('')}</div>`;
  } else if (s === 'copa') {
    h += `<div class="card"><p class="muted">16 clubes, jogo único, empate decide nos pênaltis. Vale prêmio a cada fase e troféu no fim.</p>${G.cup.champ >= 0 ? `<p class="hand ok">Campeão: ${cn(G.cup.champ)}</p>` : ''}</div>`;
    h += CUP_N.map((n, r) => `<div class="card flat"><div class="head pad"><h2><span>${n}</span></h2></div>${G.cup.rounds[r] ? G.cup.rounds[r].map(t => fxRow(t.h, t.a, t.w != null ? [t.gh, t.ga] : null, t.pso)).join('') : '<p class="muted pad">A definir.</p>'}</div>`).join('');
  } else if (s === 'art') {
    const top = G.clubs.filter(c => c.div === U.div).flatMap(c => c.players.map(p => [p, c])).filter(x => x[0].gl > 0).sort((a, b) => b[0].gl - a[0].gl || a[0].ap - b[0].ap).slice(0, 15);
    h += divSeg + `<div class="card flat">${top.map(([p, c], i) => prow(p, { m: `<span class="mag rank">${i + 1}º</span>`, sub: `${esc(c.name)} · ${POS[p.pos]}`, r: `<span class="val num">${p.gl}</span>` })).join('') || '<p class="muted pad">Ainda sem gols na temporada.</p>'}</div>`;
  } else {
    h += `<div class="card flat">${myGames().map(g => { if (!g.f) return `<div class="fx"><span class="muted">${g.e.t === 'C' ? CUP_N[g.e.r] : ''}</span><b>—</b><span class="muted">${g.i < G.ci ? 'eliminado' : 'se avançar'}</span></div>`; return `<div style="${g.i === G.ci ? 'box-shadow:inset 5px 0 0 var(--magnet)' : ''}"><div class="muted" style="padding:8px 14px 0;font-size:11.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase">${g.e.t === 'L' ? 'Rodada ' + (g.e.r + 1) : 'Copa · ' + CUP_N[g.e.r]}</div>${fxRow(g.f[0], g.f[1], g.r ? [g.r[2], g.r[3]] : null, g.r && g.r[4]).replace('class="fx me"', 'class="fx" style="border:0;padding-top:2px"')}</div>`; }).join('')}</div>`;
  }
  return h;
};

// ---------- folhas ----------
function openSheet(html) { $('#sheetBox').innerHTML = '<button class="x" data-a="close" aria-label="Fechar">×</button>' + html; $('#sheet').classList.add('on'); $('#sheetBox').scrollTop = 0; U.sheet = true; }
function closeSheet() {
  $('#sheet').classList.remove('on'); U.sheet = false; U.neg = null; U.subOut = null;
  const M = U.M;
  if (M && !M.done) {
    if (M.pend) { const { S, o } = M.pend; if (!doSub(M, S, o, bestSub(S, o.role))) { o.out = true; o.t1 = M.min; } M.pend = null; if (!U.gl) drawDots(); }
    if (U.gl) GL.resume(); else if (!U.paused) schedule(350);
  }
}
function playerSheet(p) {
  const mine = isMine(p), youth = G.youth.includes(p), c = clubOf(p.id), k = knows(p), m = me();
  const keys = p.pos === 0 ? ['g'] : ['d', 'm', 'a'];
  let h = `<div class="rowx" style="margin-bottom:12px;padding-right:36px">${pmag(p, 'big')}<div class="grow"><h2>${esc(p.n)}</h2><div class="muted">${POS_N[p.pos]} · ${p.age} anos · ${mine ? esc(m.name) : youth ? 'base' : c ? esc(c.name) : 'sem clube'}</div>${k ? `<div>${stars(p.pot)} <span class="muted">potencial ${p.pot}</span></div>` : ''}</div></div><div class="stack">`;
  if (k) h += `<div class="stack" style="gap:6px">${keys.map(x => `<div class="attr"><span>${ATTR_N[x]}</span>${bar(p[x])}<b>${p[x]}</b></div>`).join('')}</div>`;
  else h += `<p class="hand">Nível estimado entre ${ovrRange(p).join(' e ')}. Atributos e potencial só com relatório de olheiro.</p>`;
  if (p.tr && k) h += `<p><span class="tag yel">${TRAITS[p.tr].n}</span> <span class="muted">${TRAITS[p.tr].d}</span></p>`;
  if (mine) h += `<div class="stat3"><div><b class="num">${Math.round(p.en)}</b><small>Energia</small></div><div><b class="num">${Math.round(p.mo)}</b><small>Moral</small></div><div><b class="num">${p.h.length ? formOf(p).toFixed(1).replace('.', ',') : '—'}</b><small>Nota média</small></div></div>`;
  h += `<div>${kv('Temporada', `${plural(p.ap, 'jogo', 'jogos')} · ${plural(p.gl, 'gol', 'gols')} · ${p.as} assist.`)}${kv('Valor de mercado', k ? money(valueOf(p)) : 'a avaliar')}${mine || c ? kv('Salário', money(p.w) + ' por semana') : ''}${mine ? kv('Contrato', 'até o fim de ' + ctrEnd(p)) : ''}</div>`;
  if (p.inj) h += `<p class="hand red">Lesionado: volta em ${plural(p.inj, 'semana', 'semanas')}.</p>`;
  if (p.sus) h += '<p class="hand red">Suspenso no próximo jogo.</p>';
  if (mine) h += `<div class="btns"><button class="btn" data-a="renewSheet" data-id="${p.id}">Renovar</button><button class="btn ghost" data-a="list" data-id="${p.id}">${p.list ? 'Tirar da lista de vendas' : 'Pôr à venda'}</button><button class="btn ghost" data-a="release" data-id="${p.id}">Dispensar</button></div>`;
  else if (youth) h += `<div class="btns"><button class="btn" data-a="promote" data-id="${p.id}">Promover ao elenco</button><button class="btn ghost" data-a="dismiss" data-id="${p.id}">Dispensar</button></div>`;
  else h += `<div class="btns">${k ? '' : `<button class="btn ghost" data-a="scout" data-id="${p.id}" ${G.scoutQ.includes(p.id) ? 'disabled' : ''}>${G.scoutQ.includes(p.id) ? 'Olheiro a caminho' : 'Mandar olheiro'}</button>`}<button class="btn" data-a="neg" data-id="${p.id}">Negociar</button></div>`;
  openSheet(h + '</div>');
}
function negSheet() {
  const N = U.neg, p = pl(N.pid), c = clubOf(p.id);
  prepAsk(p);
  const fmin = round5(p.ask * 0.6), fmax = round5(p.ask * 1.3), wmin = Math.max(1, Math.floor(p.wask * 0.6)), wmax = Math.ceil(p.wask * 1.5) + 1;
  openSheet(`<div class="rowx" style="margin-bottom:12px;padding-right:36px">${pmag(p, 'big')}<div class="grow"><h2>${esc(p.n)}</h2><div class="muted">${POS_N[p.pos]} · ${p.age} anos · ${c ? esc(c.name) : 'sem clube'}</div></div></div><div class="stack">
    ${c ? `<div><label for="negFee">Oferta ao clube</label><div class="rowx"><input type="range" id="negFee" min="${fmin}" max="${fmax}" step="5" value="${N.fee}"><b class="num" id="negFeeV" style="min-width:96px;text-align:right">${money(N.fee)}</b></div><div class="muted">Pedida: ${money(p.ask)}. Eles podem aceitar um pouco menos.</div></div>` : `<div>${kv('Luvas na assinatura', money(p.ask))}</div>`}
    <div><label for="negWage">Salário por semana</label><div class="rowx"><input type="range" id="negWage" min="${wmin}" max="${wmax}" step="1" value="${N.wage}"><b class="num" id="negWageV" style="min-width:96px;text-align:right">${money(N.wage)}</b></div><div class="muted">Ele pede ${money(p.wask)}. Sua folha hoje: ${money(wageBill())}.</div></div>
    <div><label>Contrato</label><div class="seg inpaper">${[1, 2, 3, 4].map(y => `<button class="${N.yrs === y ? 'on' : ''}" data-a="negY" data-v="${y}">${plural(y, 'ano', 'anos')}</button>`).join('')}</div></div>
    ${N.msg ? `<p class="hand ${N.ok ? 'ok' : 'red'}">${esc(N.msg)}</p>` : ''}
    <button class="btn wide" data-a="negSend">Enviar proposta</button><div class="muted">Em caixa: ${money(G.money)}.</div></div>`);
}
function clubSheet(c) {
  const list = c.players.slice().sort((a, b) => estOvr(b) - estOvr(a));
  openSheet(`<div class="rowx" style="margin-bottom:10px;padding-right:36px">${crest(c, 52)}<div class="grow"><h2>${esc(c.name)}</h2><div class="muted">${DIV_N[c.div]} · ${posOf(c)}º · ${c.form} · ${STYLES[c.style].n}</div><div>${formDots(c)}</div></div></div><div class="card flat" style="box-shadow:none;background:var(--raise)">${list.map(p => prow(p, { r: c.id ? '' : undefined })).join('')}</div>`);
}
function pickSheet(k) {
  const m = me(), role = rolesOf(m)[k], cur = pl(m.lineup[k]);
  const sc = p => ovrIn(p, role) * (0.8 + 0.2 * p.en / 100);
  const list = m.players.filter(p => p !== cur).sort((a, b) => avail(b) - avail(a) || sc(b) - sc(a));
  openSheet(`<h2 style="padding-right:36px">${POS_N[role]}</h2><p class="muted" style="margin:4px 0 10px">O número mostra o nível do jogador nesta função.</p>${cur ? `<div class="card flat" style="box-shadow:none;background:var(--hl);margin-bottom:10px">${prow(cur, { m: mag(role, Math.round(ovrIn(cur, role))), sub: `Titular agora · natural: ${POS[cur.pos]} · toque para ver a ficha` })}</div>` : ''}<div class="card flat" style="box-shadow:none;background:var(--raise)">${list.map(p => { const j = m.lineup.indexOf(p.id); return prow(p, { a: avail(p) ? 'put' : 'none', x: `data-k="${k}"`, off: !avail(p), m: mag(role, Math.round(ovrIn(p, role))), sub: `${POS[p.pos]}${p.pos !== role && p.tr !== 'coringa' ? ' (improvisado)' : ''} · ${p.age} anos · ${j >= 0 ? 'titular, troca de lugar' : 'reserva'}` }); }).join('')}</div>`);
}
function confirmSheet(title, text, act, v, label, cls = '') { openSheet(`<h2 style="padding-right:36px">${title}</h2><p style="margin:10px 0 14px">${text}</p><div class="btns"><button class="btn ${cls}" data-a="${act}" data-v="${v}">${label}</button><button class="btn ghost" data-a="close">Cancelar</button></div>`); }

// =====================================================================
// PARTIDA AO VIVO
// =====================================================================
function colDist(a, b) { const h = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)); const [p, q] = [h(a), h(b)]; return Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]); }
const SND = on => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/>${on ? '<path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>' : '<path d="M17 9l5 6M22 9l-5 6"/>'}</svg>`;
const CAM = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="3.5"/></svg>';
function barHTML() {
  $('#mbar').innerHTML = `<div class="gseg">${[1, 2, 4].map(v => `<button class="gb ${U.speed === v ? 'on' : ''}" data-a="gSpeed" data-v="${v}">${v}×</button>`).join('')}</div><button class="gb ${GL.V.camNear ? '' : 'on'}" data-a="gCam" aria-label="Alternar câmera">${CAM}</button><button class="gb" data-a="gSnd" aria-label="${SFX.enabled ? 'Desligar som' : 'Ligar som'}">${SND(SFX.enabled)}</button><button class="gb main" data-a="mBoard">Prancheta</button><button class="gb" data-a="mSkip">Pular</button>`;
}
function startMatch() {
  const f = myFixture(); if (!f) return;
  if (pending().length) return ACT.toPend();
  const M = newMatch(G.clubs[f.h], G.clubs[f.a], { user: true, comp: f.comp });
  Object.assign(U, { M, my: f.home ? M.h : M.a, op: f.home ? M.a : M.h, seen: 0, paused: false, htDone: false, fx: f, gl: false });
  const m = me(), o = f.opp;
  if (GL.init()) {
    U.gl = true;
    $('#hMe').innerHTML = `<span>${esc(m.abbr)}</span>${crest(m, 28)}`; $('#hOp').innerHTML = `${crest(o, 28)}<span>${esc(o.abbr)}</span>`;
    $('#hComp').textContent = `${entryLabel(f.e)} · ${f.home ? 'em casa' : 'fora'}`;
    hideOv(); $('#stage').classList.add('on'); barHTML();
    GL.start(M, U.my, U.op, { alt: colDist(m.c1, o.c1) < 150, speed: U.speed, label: `${m.name} × ${o.name}` });
    return;
  }
  U.cols = [m.c1, colDist(m.c1, o.c1) < 150 ? o.c2 : o.c1];
  $('#ov').innerHTML = `<div class="ovin"><div class="sb"><div class="t">${crest(m, 36)}<span>${esc(m.abbr)}</span></div><div class="sc"><b class="num" id="mScore">0–0</b><small id="mClock">0'</small></div><div class="t"><span>${esc(o.abbr)}</span>${crest(o, 36)}</div></div>
    <div class="mwrap"><div class="pitch h" id="mPitch">${LINES_H}<div id="mDots"></div><i class="ball" id="mBall" style="left:50%;top:50%"></i><div class="goalfx" id="mFx"></div></div></div>
    <div class="possbar"><span id="mPossL">50%</span><div class="track"><i id="mPoss" style="width:50%"></i></div><span id="mPossR">50%</span></div>
    <ol class="feed" id="mFeed"><li class="sys"><b>0'</b><span>${entryLabel(f.e)}. Bola rolando ${f.home ? 'em casa' : 'no campo do ' + esc(o.name)}. Você ataca para a direita.</span></li></ol>
    <div class="ovfoot"><div class="mctl" id="mCtl"><button class="btn" data-a="mPause" id="mPauseB" aria-label="Pausar">❚❚</button><button class="btn" data-a="mSpeed" id="mSpeedB" aria-label="Velocidade">${U.speed}×</button><button class="btn main" data-a="mBoard">Prancheta</button><button class="btn" data-a="mSkip">Pular</button></div></div></div>`;
  $('#ov').classList.add('on');
  drawDots(); schedule(700);
}
function schedule(ms) { clearTimeout(U.timer); U.timer = setTimeout(tick, ms); }
function drawDots() {
  const M = U.M; if (!M) return;
  let h = '';
  [[U.my, [5, 20, 38, 58], U.cols[0]], [U.op, [95, 80, 62, 42], U.cols[1]]].forEach(([S, xs, col]) => {
    for (let r = 0; r < 4; r++) { const l = S.on.filter(o => !o.out && o.role === r); l.forEach((o, i) => { h += `<i class="mdot" style="left:${xs[r]}%;top:${(i + 1) / (l.length + 1) * 100}%;background:${col}"></i>`; }); }
  });
  $('#mDots').innerHTML = h;
}
const AMB = ['{t} troca passes no meio-campo.', '{t} pressiona a saída de bola.', '{t} roda a bola de um lado para o outro.', 'Jogo truncado, muita disputa no meio.', '{t} tenta pelos lados, a zaga afasta.', '{t} ganha a segunda bola e recomeça a jogada.'];
const EV_IC = { gol: '⚽ ', ya: '🟨 ', red: '🟥 ', sub: '🔁 ', inj: '🚑 ' };
function paintMatch(news) {
  const M = U.M, my = U.my, op = U.op, feed = $('#mFeed'), ball = $('#mBall');
  $('#mScore').textContent = `${my.g}–${op.g}`; $('#mClock').textContent = M.min + "'";
  const ps = Math.round(100 * my.pos / Math.max(1, my.pos + op.pos));
  $('#mPoss').style.width = ps + '%'; $('#mPossL').textContent = `Posse ${ps}%`; $('#mPossR').textContent = (100 - ps) + '%';
  let moved = false, dots = false;
  for (const e of news) {
    const mine = e.s ? (e.s === 'h') === my.home : false;
    const li = document.createElement('li');
    li.className = `${e.t} ${e.s ? (mine ? 'mine' : 'them') : 'sys'}`;
    li.innerHTML = `<b>${e.m}'</b><span>${e.s ? `<span class="tag">${esc((mine ? my : op).c.abbr)}</span> ` : ''}${EV_IC[e.t] || ''}${esc(e.x)}</span>`;
    feed.prepend(li);
    if (['gol', 'def', 'fora', 'trave'].includes(e.t)) { ball.style.left = (mine ? (e.t === 'gol' ? 98 : rnd(84, 92)) : (e.t === 'gol' ? 2 : rnd(8, 16))) + '%'; ball.style.top = rnd(36, 64) + '%'; moved = true; }
    if (e.t === 'gol') { const fx = $('#mFx'); fx.textContent = mine ? 'GOL!' : 'Gol do ' + op.c.abbr; fx.className = 'goalfx ' + (mine ? '' : 'them'); void fx.offsetWidth; fx.classList.add('go'); try { if (navigator.vibrate) navigator.vibrate(mine ? [60, 40, 120] : 80); } catch (x) { /* sem vibração */ } }
    if (e.t === 'sub' || e.t === 'red' || e.t === 'inj') dots = true;
  }
  if (dots) drawDots();
  if (!moved) { ball.style.left = clamp(50 + (possOf(M) * (my.home ? 1 : -1) + (my.home ? -0.5 : 0.5)) * 90 + rnd(-16, 16), 14, 86) + '%'; ball.style.top = rnd(18, 82) + '%'; }
}
function tick() {
  const M = U.M; if (!M || U.paused || U.sheet || M.done) return;
  if (M.pend) return injSheet();
  stepMinute(M);
  const news = M.ev.slice(U.seen); U.seen = M.ev.length;
  paintMatch(news);
  if (M.done) return endMatchUI();
  if (!news.length && M.min % 7 === 3) { let a = pick(AMB); if (a === U.amb) a = AMB[(AMB.indexOf(a) + 1) % AMB.length]; U.amb = a; const li = document.createElement('li'); li.className = 'sys'; li.innerHTML = `<b>${M.min}'</b><span>${esc(a.replace('{t}', (R() < possOf(M) ? M.h : M.a).c.name))}</span>`; $('#mFeed').prepend(li); }
  if (M.pend) return schedule(900);
  if (M.min === 45 && !U.htDone) { U.htDone = true; return setTimeout(halfSheet, 500); }
  const k = U.speed === 4 ? 2.8 : U.speed === 2 ? 1.5 : 1, big = news.some(e => e.t === 'gol');
  schedule((big ? 1700 : news.length ? 620 : 0) / k + { 1: 420, 2: 190, 4: 70 }[U.speed]);
}
function endMatchUI() {
  const M = U.M;
  if (U.gl) { $('#mbar').innerHTML = '<button class="btn cta" data-a="mEnd" style="max-width:440px">Ver resumo</button>'; return; }
  if (M.pso) { const s = U.my.home ? M.pso.sc : [M.pso.sc[1], M.pso.sc[0]]; const li = document.createElement('li'); li.className = 'gol ' + (s[0] > s[1] ? '' : 'them'); li.innerHTML = `<b>pên</b><span>Decisão por pênaltis: ${s[0]}–${s[1]}. ${s[0] > s[1] ? 'Classificado!' : 'Eliminado.'}</span>`; $('#mFeed').prepend(li); }
  $('#mCtl').style.display = 'block'; $('#mCtl').innerHTML = '<button class="btn cta" data-a="mEnd">Ver resumo</button>';
}
function statsHTML(M) { const my = U.my, op = U.op, ps = Math.round(100 * my.pos / Math.max(1, my.pos + op.pos)); return `<div>${kv('Finalizações', `${my.sh} × ${op.sh}`)}${kv('No gol', `${my.sot} × ${op.sot}`)}${kv('Posse de bola', `${ps}% × ${100 - ps}%`)}</div>`; }
function halfSheet() {
  const M = U.M; if (!M || M.done) return;
  openSheet(`<h2><span>Intervalo</span> · ${U.my.g}–${U.op.g}</h2><div class="stack" style="margin-top:10px">${statsHTML(M)}<h3>Conversa no vestiário</h3>
    <button class="opt" data-a="talk" data-v="elogio"><b>Elogiar</b><small>Bom quando está ganhando. Soa falso se o placar é contra.</small></button>
    <button class="opt" data-a="talk" data-v="cobrar"><b>Cobrar</b><small>Arriscado: pode acordar o time quando perde ou empata, ou deixar todo mundo nervoso.</small></button>
    <button class="opt" data-a="talk" data-v="calma"><b>Acalmar</b><small>Seguro: pequeno ganho e um pouco de fôlego de volta.</small></button></div>`);
}
function boardSheet() {
  const M = U.M, S = U.my, act = S.on.map((o, i) => [o, i]).filter(x => !x[0].out), left = 5 - S.subs;
  let h = `<h2 style="padding-right:36px"><span>Prancheta</span> · ${M.min}'</h2><div class="stack" style="margin-top:10px"><div><label>Postura</label><div class="seg inpaper">${Object.keys(MENT).map(k => `<button class="${S.ment === k ? 'on' : ''}" data-a="mMent" data-v="${k}">${MENT[k].n}</button>`).join('')}</div><p class="muted" style="margin-top:4px">${MENT[S.ment].d}.</p></div>`;
  if (U.subOut != null) {
    const o = S.on[U.subOut], b = benchOf(S).sort((x, y) => ovrIn(y, o.role) - ovrIn(x, o.role));
    h += `<h3>Quem entra no lugar de ${esc(last(o.p.n))}?</h3><div class="card flat" style="box-shadow:none;background:var(--raise)">${b.map(p => prow(p, { a: 'mIn', m: mag(o.role, Math.round(ovrIn(p, o.role))), sub: `${POS[p.pos]} · ${p.age} anos` })).join('') || '<p class="muted pad">Banco vazio.</p>'}</div><button class="btn ghost" data-a="mOut" data-i="-1">Voltar</button>`;
  } else {
    h += `<h3>Substituições: restam ${left}</h3><div class="card flat" style="box-shadow:none;background:var(--raise)">${act.map(([o, i]) => prow(o.p, { a: left ? 'mOut' : 'none', x: `data-i="${i}"`, m: mag(o.role, Math.round(ovrIn(o.p, o.role))), sub: `${POS[o.role]}${o.yc ? ' · 🟨' : ''}${o.g ? ' · ⚽'.repeat(1) + (o.g > 1 ? '×' + o.g : '') : ''}`, r: `<span class="mini"><span>${Math.round(o.en)}</span>${bar(o.en, enCls(o.en))}</span>` })).join('')}</div><p class="muted">Toque em quem sai. Jogador cansado rende menos e machuca mais.</p>`;
  }
  openSheet(h + '<button class="btn wide" data-a="close">Voltar ao jogo</button></div>');
}
function injSheet() {
  const M = U.M, { S, o } = M.pend, b = benchOf(S).sort((x, y) => ovrIn(y, o.role) - ovrIn(x, o.role));
  openSheet(`<h2 style="padding-right:36px"><span>Lesão</span></h2><p class="hand red" style="margin:8px 0">${esc(o.p.n)} não volta. Fora por ${plural(o.p.inj, 'semana', 'semanas')}.</p><h3>Quem entra?</h3><div class="card flat" style="box-shadow:none;background:var(--raise);margin-top:8px">${b.map(p => prow(p, { a: 'injIn', m: mag(o.role, Math.round(ovrIn(p, o.role))), sub: `${POS[p.pos]} · ${p.age} anos` })).join('')}</div>`);
}

// ---------- pós-jogo, temporada, demissão ----------
function showOv(html, foot) { $('#ov').innerHTML = `<div class="ovin"><div class="ovscroll">${html}</div>${foot ? `<div class="ovfoot">${foot}</div>` : ''}</div>`; $('#ov').classList.add('on'); }
const hideOv = () => { $('#ov').classList.remove('on'); $('#ov').innerHTML = ''; };
function showPost() {
  const L = G.last, m = me(), o = G.clubs[L.opp], r = L.res, mh = L.home;
  const gm = mh ? r.gh : r.ga, go = mh ? r.ga : r.gh, ps = mh ? L.st.pos : 100 - L.st.pos, ix = mh ? 0 : 1;
  const pen = r.pso ? ` <small style="font-size:18px">(${mh ? r.pso[0] : r.pso[1]}–${mh ? r.pso[1] : r.pso[0]} pên.)</small>` : '';
  const goals = L.goals.map(g => `<div class="kv"><span>${g.m}' ${esc(g.n)}</span><b>${(g.s === 'h') === mh ? esc(m.abbr) : esc(o.abbr)}</b></div>`).join('');
  const rows = L.mine.slice().sort((a, b) => b.note - a.note).map(x => `<div class="prow">${mag(x.pos, x.note.toFixed(1).replace('.', ','), 'rg')}<span class="grow"><b>${esc(x.n)}</b><small>${POS[x.pos]}${x.g ? ' · ' + plural(x.g, 'gol', 'gols') : ''}${x.a ? ' · ' + x.a + ' assist.' : ''}${x.yc ? ' · amarelo' : ''}${x.red ? ' · expulso' : ''}${x.hurt ? ' · lesionado' : ''}</small></span></div>`).join('');
  const others = L.e.t === 'L' ? G.lg[m.div].res[L.e.r].map(x => fxRow(x[0], x[1], [x[2], x[3]])).join('') : G.cup.rounds[L.e.r].map(t => fxRow(t.h, t.a, [t.gh, t.ga], t.pso)).join('');
  showOv(`<div class="card stack" style="text-align:center"><div class="muted">${entryLabel(L.e)}</div><div class="vs"><div class="t">${crest(m, 52)}<b>${esc(m.name)}</b></div><div class="big num">${gm}–${go}${pen}</div><div class="t">${crest(o, 52)}<b>${esc(o.name)}</b></div></div><div><span class="stamp ${L.out > 0 ? 'V' : L.out < 0 ? 'D' : ''}">${L.out > 0 ? 'Vitória' : L.out < 0 ? 'Derrota' : 'Empate'}</span></div></div>
    ${goals ? `<div class="card"><div class="head"><h2><span>Gols</span></h2></div>${goals}</div>` : ''}
    <div class="card"><div class="head"><h2><span>Números</span></h2></div>${kv('Finalizações', `${L.st.sh[ix]} × ${L.st.sh[1 - ix]}`)}${kv('No gol', `${L.st.sot[ix]} × ${L.st.sot[1 - ix]}`)}${kv('Posse de bola', `${ps}% × ${100 - ps}%`)}${L.gate ? kv('Público', `${L.gate.att.toLocaleString('pt-BR')} de ${L.gate.cap.toLocaleString('pt-BR')}`) + kv('Renda', '+' + money(L.gate.rev), 'pos') : ''}${kv('Confiança da diretoria', (L.dc >= 0 ? '+' : '−') + Math.abs(L.dc).toString().replace('.', ','), L.dc >= 0 ? 'pos' : 'neg')}</div>
    <div class="card flat"><div class="head pad"><h2><span>Notas do seu time</span></h2></div>${rows}</div>
    <div class="card flat"><div class="head pad"><h2><span>${L.e.t === 'L' ? 'Rodada' : 'Copa'}</span></h2>${L.e.t === 'L' ? `<small>você está em ${posOf(m)}º</small>` : ''}</div>${others}</div>`,
  '<button class="btn cta" data-a="week">Avançar a semana</button>');
}
function showReview() {
  const v = G.review, m = me(), exp = m.players.filter(p => p.ctr <= 1).sort((a, b) => ovr(b) - ovr(a));
  showOv(`<div class="clipboard stack" style="transform:none"><div class="hand">Fim da temporada ${v.year}</div><div class="big">${v.pos}º lugar</div><div class="muted">${DIV_N[v.div]} · ${v.rec.pts} pontos · ${v.rec.v}V ${v.rec.e}E ${v.rec.d}D · ${v.rec.gp} gols pró, ${v.rec.gc} contra</div>
      <div><span class="stamp ${v.met ? 'V' : 'D'}">${v.met ? 'Meta cumprida' : 'Meta não cumprida'}</span></div>
      ${v.promoted ? '<p class="hand ok">Subimos para a Série A!</p>' : ''}${v.relegated ? '<p class="hand red">Rebaixados para a Série B.</p>' : ''}${v.trophies.map(t => `<p class="hand ok">★ Campeão: ${esc(t)}</p>`).join('')}</div>
    <div class="card">${kv('Meta da diretoria', `${v.obj.t} (até ${v.obj.pos}º)`)}${kv('Confiança', (v.dc >= 0 ? '+' : '−') + Math.abs(v.dc), v.dc >= 0 ? 'pos' : 'neg')}${kv('Premiação pela posição', '+' + money(v.prize), 'pos')}${kv('Balanço do ano', money(v.fin.in - v.fin.out), v.fin.in >= v.fin.out ? 'pos' : 'neg')}${kv('Seu artilheiro', esc(v.best))}</div>
    <div class="card">${kv('Campeão da Série A', esc(v.champA))}${kv('Campeão da Copa', esc(v.cup))}${kv('Artilheiro da divisão', esc(v.top))}${kv('Sobem', v.up.map(esc).join(', '))}${kv('Caem', v.down.map(esc).join(', '))}</div>
    <div class="card flat"><div class="head pad"><h2><span>Contratos no fim</span></h2><small>${exp.length ? 'quem não renovar vai embora' : ''}</small></div>${exp.map(p => prow(p, { a: 'none', sub: `${POS[p.pos]} · ${p.age} anos · pede ${money(renewAsk(p))}/sem`, r: `<span class="btn sm" data-a="rvRenew" data-id="${p.id}" role="button" tabindex="0">Renovar 2 anos</span>` })).join('') || '<p class="muted pad">Ninguém em fim de contrato.</p>'}</div>
    <p class="hint">Na virada do ano todo mundo fica um ano mais velho, veteranos podem se aposentar e a base revela novos garotos.</p>`,
  `<button class="btn cta" data-a="season">Começar ${v.year + 1}</button>`);
}
function showOver() {
  const best = G.hist.slice().sort((a, b) => a.div - b.div || a.pos - b.pos)[0];
  showOv(`<div class="title"><div class="clipboard stack"><div class="hand red">Carta da diretoria</div><div class="big">Demitido</div><p>${esc(G.over.why)}</p><div>${kv('Temporadas no comando', G.season)}${kv('Melhor campanha', best ? `${best.pos}º na ${DIV_N[best.div]} (${best.year})` : '—')}${kv('Troféus', G.trophies.length ? G.trophies.map(esc).join(', ') : 'nenhum')}</div><button class="btn cta" data-a="newCareer">Nova carreira</button></div></div>`);
}
function showTitle() {
  const sv = store.get(), has = sv && sv.v === 1 && sv.clubs;
  showOv(`<div class="title"><div class="clipboard stack"><div class="hand">técnico, presidente e olheiro</div><div class="wordmark">Pran<br>che<i>ta</i></div><p>Monte o time, defina a tática, cuide do caixa e leve seu clube da Série B ao título.</p>${has ? `<button class="btn cta" data-a="cont">Continuar</button><button class="btn ghost" data-a="newCareer">Nova carreira</button>` : '<button class="btn cta" data-a="newCareer">Nova carreira</button>'}</div><p style="color:var(--chalk-2);font-size:13px;text-align:center">${has ? `${esc(sv.clubs[0].name)} · temporada ${sv.year} · semana ${sv.week}` : 'O progresso fica salvo neste navegador.'}</p></div>`);
}
const SW = ['#e8433a', '#b3122e', '#ff7a1a', '#f2d43a', '#1fa34a', '#0f5132', '#16b3b3', '#1f6fd1', '#0b1a3a', '#8a3df0', '#e05cff', '#111111', '#ffffff', '#c7a24a'];
function showCreate() {
  const c = U.cr;
  const sw = k => `<div class="swatches">${SW.map(x => `<button class="${c[k] === x ? 'on' : ''}" style="background:${x}" data-a="crSet" data-k="${k}" data-v="${x}" aria-label="Cor ${x}"></button>`).join('')}</div>`;
  showOv(`<div class="card stack"><div class="head"><h2><span>Funde seu clube</span></h2><button class="btn ghost sm" data-a="crRand">Sortear</button></div>
    <div class="rowx"><span id="crPrev">${crest(c, 76)}</span><div class="grow stack" style="gap:8px"><div><label for="crName">Nome do clube</label><input type="text" id="crName" maxlength="22" value="${esc(c.name)}" placeholder="Ex.: Aurora FC" autocomplete="off"></div><div><label for="crAbbr">Sigla (3 letras)</label><input type="text" id="crAbbr" maxlength="3" value="${esc(c.abbr)}" style="text-transform:uppercase" autocomplete="off"></div></div></div>
    <div><label>Cor principal</label>${sw('c1')}</div><div><label>Segunda cor</label>${sw('c2')}</div>
    <div><label>Escudo</label><div class="grid4">${[0, 1, 2, 3].map(i => `<button class="fbtn ${c.crest === i ? 'on' : ''}" data-a="crSet" data-k="crest" data-v="${i}">${crest(Object.assign({}, c, { crest: i }), 38)}</button>`).join('')}</div></div>
    <div><label>Desenho</label><div class="grid4">${[0, 1, 2, 3].map(i => `<button class="fbtn ${c.pat === i ? 'on' : ''}" data-a="crSet" data-k="pat" data-v="${i}">${crest(Object.assign({}, c, { pat: i }), 38)}</button>`).join('')}</div></div></div>
    <div class="card"><p class="hand">Você começa na Série B com R$ 1,5 mi, um veterano líder e duas promessas. Os 2 primeiros sobem.</p></div>`,
  '<button class="btn cta" data-a="crGo">Começar carreira</button>');
}
const abbrOf = n => { const w = n.toUpperCase().replace(/[^A-ZÀ-Ü ]/g, '').split(/\s+/).filter(x => x && !['FC', 'EC', 'SC', 'AC', 'DE', 'DO', 'DA'].includes(x)); return ((w.length >= 3 ? w[0][0] + w[1][0] + w[2][0] : w.length === 2 ? w[0].slice(0, 2) + w[1][0] : (w[0] || 'PRA').slice(0, 3)) + 'XXX').slice(0, 3); };

// =====================================================================
// AÇÕES
// =====================================================================
const done = msg => { if (msg) toast(msg); save(); render(); };
const ACT = {
  none() {},
  go(d) { U.tab = d.t; if (d.s) U.sub[d.t] = d.s; render(); },
  sub(d) { U.sub[d.k] = d.v; render(); },
  close() { closeSheet(); },
  tipOk() { G.tip = 1; done(); },
  toPend() { const it = pending()[0]; if (!it) return; if (U.tab !== 'home') { U.tab = 'home'; render(); } const el = $('#pend' + it.id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('Responda as pendências antes de jogar.'); },
  res(d) { const it = G.inbox.find(i => i.id === +d.id); resolve(it, +d.i); done(it.done); },
  play() { startMatch(); },
  // time
  slot(d) { if (Date.now() - (U.dragT || 0) < 400) return; pickSheet(+d.k); },
  put(d) { const m = me(), k = +d.k, id = +d.id, j = m.lineup.indexOf(id); if (j >= 0) m.lineup[j] = m.lineup[k]; m.lineup[k] = id; closeSheet(); done(); },
  auto() { autoLineup(me()); done('Melhor time escalado.'); },
  form(d) { setFormation(me(), d.v); done(); },
  more() { U.more = !U.more; render(); },
  style(d) { const m = me(); if (m.style === d.v) return; confirmSheet('Jogar em ' + STYLES[d.v].n.toLowerCase() + '?', `O entrosamento cai de ${Math.round(m.fam)}% para ${Math.round(m.fam * 0.78)}%.`, 'styleOk', d.v, 'Mudar estilo'); },
  styleOk(d) { setStyle(me(), d.v); closeSheet(); done(STYLES[d.v].n + '.'); },
  ment(d) { me().ment = d.v; done(); },
  train(d) { G.train.f = d.v; done(); },
  intens(d) { G.train.i = +d.v; done(); },
  // fichas
  player(d) { const p = pl(+d.id); if (p) playerSheet(p); },
  club(d) { clubSheet(G.clubs[+d.id]); },
  filt(d) { U.filt = +d.v; render(); },
  div(d) { U.div = +d.v; render(); },
  scout(d) { const p = pl(+d.id), e = scout(p); if (e) return toast(e); save(); playerSheet(p); render(); toast('Olheiro enviado. O relatório chega na semana que vem.'); },
  neg(d) { const p = pl(+d.id); prepAsk(p); U.neg = { pid: p.id, fee: clubOf(p.id) ? round5(p.ask * 0.9) : p.ask, wage: p.wask, yrs: 2, msg: '' }; negSheet(); },
  negY(d) { U.neg.yrs = +d.v; negSheet(); },
  negSend() { const N = U.neg, p = pl(N.pid), r = bid(p, N.fee, N.wage, N.yrs); if (r.ok) { closeSheet(); return done(r.msg); } if (r.counter) { N.fee = r.counter.fee; N.wage = r.counter.wage; } N.msg = r.msg; save(); negSheet(); },
  list(d) { const p = pl(+d.id); p.list = !p.list; save(); render(); playerSheet(p); toast(p.list ? 'Na lista de vendas.' : 'Fora da lista de vendas.'); },
  release(d) { const p = pl(+d.id); confirmSheet('Dispensar ' + esc(p.n) + '?', `A rescisão custa ${money(p.w * 6)}. Ele fica sem clube.`, 'releaseOk', p.id, 'Dispensar', 'red'); },
  releaseOk(d) { const p = pl(+d.v), e = release(p); closeSheet(); done(e || p.n + ' foi dispensado.'); },
  renewSheet(d) { const p = pl(+d.id), w = renewAsk(p); openSheet(`<h2 style="padding-right:36px">Renovar com ${esc(last(p.n))}</h2><div class="stack" style="margin-top:10px"><div>${kv('Salário atual', money(p.w) + ' por semana')}${kv('Ele pede', money(w) + ' por semana')}${kv('Contrato atual', 'até ' + ctrEnd(p))}</div><div class="btns">${[1, 2, 3].map(y => `<button class="btn" data-a="renew" data-id="${p.id}" data-y="${y}">Até ${G.year + y}</button>`).join('')}</div></div>`); },
  renew(d) { const p = pl(+d.id), e = renew(p, +d.y); closeSheet(); done(e || `${p.n} renovou até ${ctrEnd(p)}.`); },
  promote(d) { const p = pl(+d.id), e = promote(p); closeSheet(); done(e || p.n + ' subiu para o elenco.'); },
  dismiss(d) { const p = pl(+d.id); G.youth = G.youth.filter(x => x !== p); closeSheet(); done(p.n + ' deixou a base.'); },
  // clube
  price(d) { G.price = clamp(G.price + +d.v, 10, 200); done(); },
  fac(d) { const f = FAC.find(x => x.id === d.id), l = G.fac[f.id]; if (l >= 4 || G.money < f.cost[l]) return; spend('Obras', f.cost[l]); G.fac[f.id]++; done(f.n + ' ampliado.'); },
  tema(d) { setTema(d.v); try { if (U.tema) localStorage.setItem(TEMA_KEY, U.tema); else localStorage.removeItem(TEMA_KEY); } catch (e) { /* vale só nesta visita */ } render(); },
  wipe() { confirmSheet('Encerrar esta carreira?', 'O jogo salvo será apagado. Não dá para desfazer.', 'wipeOk', 1, 'Apagar e recomeçar', 'red'); },
  wipeOk() { closeSheet(); store.del(); G = null; ACT.newCareer(); },
  // partida
  mPause() { U.paused = !U.paused; $('#mPauseB').textContent = U.paused ? '▶' : '❚❚'; $('#mPauseB').setAttribute('aria-label', U.paused ? 'Continuar' : 'Pausar'); if (!U.paused) schedule(200); },
  mSpeed() { U.speed = U.speed === 1 ? 2 : U.speed === 2 ? 4 : 1; $('#mSpeedB').textContent = U.speed + '×'; },
  mBoard() { if (U.M && !U.M.done) { clearTimeout(U.timer); if (U.sheet) { U.subOut = null; } boardSheet(); } },
  gSpeed(d) { U.speed = +d.v; GL.setSpeed(U.speed); barHTML(); },
  gCam() { GL.toggleCam(); barHTML(); },
  gSnd() { SFX.init(); SFX.setEnabled(!SFX.enabled); barHTML(); },
  mSkip() { const M = U.M; if (!M || M.done) return; if (U.gl) return GL.skip(); clearTimeout(U.timer); M.auto = true; while (!M.done) stepMinute(M); const news = M.ev.slice(U.seen); U.seen = M.ev.length; paintMatch(news); drawDots(); endMatchUI(); },
  mMent(d) { U.my.ment = d.v; U.M.dirty = true; boardSheet(); },
  mOut(d) { U.subOut = +d.i < 0 ? null : +d.i; boardSheet(); },
  mIn(d) { const S = U.my; doSub(U.M, S, S.on[U.subOut], pl(+d.id)); U.subOut = null; if (U.gl) GL.sync(); else drawDots(); boardSheet(); },
  injIn(d) { const M = U.M, { S, o } = M.pend; doSub(M, S, o, pl(+d.id), ''); M.pend = null; if (!U.gl) drawDots(); closeSheet(); },
  talk(d) { const msg = talk(U.M, U.my, d.v); openSheet(`<h2><span>Intervalo</span></h2><p class="hand" style="margin:12px 0">${msg}</p><div class="btns"><button class="btn ghost" data-a="mBoard">Mexer no time</button><button class="btn" data-a="close">Voltar ao jogo</button></div>`); },
  mEnd() { const M = U.M; if (!M) return; if (U.gl) { GL.stop(); $('#stage').classList.remove('on'); } U.M = null; afterUserMatch(M); G.stage = 'post'; save(); showPost(); },
  week() { endWeek(); G.stage = ''; save(); if (G.over) return showOver(); if (G.review) return showReview(); hideOv(); U.tab = 'home'; U.view = ''; render(); },
  rvRenew(d) { const p = pl(+d.id), e = renew(p, 2); save(); if (e) toast(e); else toast(`${p.n} renovou até ${ctrEnd(p)}.`); showReview(); },
  season() { nextSeason(); save(); hideOv(); U.tab = 'home'; U.view = ''; U.div = me().div; render(); },
  // título e criação
  cont() { const sv = store.get(); if (!sv) return showTitle(); G = sv; reindex(); enter(); },
  newCareer() { const k = pick(SW.slice(0, 11)); U.cr = { name: '', abbr: '', c1: k, c2: pick(['#ffffff', '#111111', '#f2d43a'].filter(x => x !== k)), crest: ri(0, 3), pat: ri(0, 3), auto: true }; showCreate(); },
  crSet(d) { U.cr[d.k] = d.k === 'crest' || d.k === 'pat' ? +d.v : d.v; showCreate(); },
  crRand() { const c = U.cr, n = pick(['Aurora', 'Estrela', 'União', 'Guarani', 'Operário', 'Vila Nova', 'Bandeirante', 'Farol', 'Jangada', 'Trovão', 'Cruzeiro do Sul', 'Laranjal']) + ' ' + pick(['FC', 'EC', 'SC', 'Atlético', 'Esporte']); Object.assign(c, { name: n, abbr: abbrOf(n), c1: pick(SW), crest: ri(0, 3), pat: ri(0, 3), auto: true }); c.c2 = pick(SW.filter(x => colDist(x, c.c1) > 200)); showCreate(); },
  crGo() { const c = U.cr, name = (c.name || '').trim() || 'Prancheta FC'; newGame({ name, abbr: (c.abbr || abbrOf(name)).toUpperCase(), c1: c.c1, c2: c.c2, crest: c.crest, pat: c.pat }); save(); enter(); }
};
function enter() {
  U.tab = 'home'; U.view = ''; U.div = me().div;
  render();
  if (G.over) showOver(); else if (G.review) showReview(); else if (G.stage === 'post' && G.last) showPost(); else hideOv();
}
document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; const fn = ACT[b.dataset.a]; if (fn) { e.preventDefault(); fn(b.dataset, b); } });
let DR = null;
document.addEventListener('pointerdown', e => {
  SFX.init();
  const el = e.target.closest('#board .slot'); if (!el || !G) return;
  DR = { el, k: +el.dataset.k, x0: e.clientX, y0: e.clientY, moved: false, bd: $('#board').getBoundingClientRect(), id: e.pointerId };
  try { el.setPointerCapture(e.pointerId); } catch (x) { /* sem captura */ }
}, true);
document.addEventListener('pointermove', e => {
  if (!DR || e.pointerId !== DR.id) return;
  if (!DR.moved && Math.hypot(e.clientX - DR.x0, e.clientY - DR.y0) < 7) return;
  DR.moved = true; e.preventDefault();
  const m = me(), p = pl(m.lineup[DR.k]);
  moveSpot(m, DR.k, (e.clientX - DR.bd.left) / DR.bd.width * 100, (e.clientY - DR.bd.top) / DR.bd.height * 100);
  const sp = m.spots[DR.k], r = rolesOf(m)[DR.k], mg = DR.el.querySelector('.mag');
  DR.el.style.left = sp.x + '%'; DR.el.style.top = sp.y + '%'; DR.el.classList.add('drag'); $('#board').classList.add('dragging');
  mg.className = 'mag p' + r; mg.textContent = Math.round(ovrIn(p, r));
});
function dropMagnet(e) { if (!DR || e.pointerId !== DR.id) return; const d = DR; DR = null; if (d.moved) { U.dragT = Date.now(); save(); render(); } }
document.addEventListener('pointerup', dropMagnet);
document.addEventListener('pointercancel', dropMagnet);
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'negFee') { U.neg.fee = +t.value; $('#negFeeV').textContent = money(U.neg.fee); }
  if (t.id === 'negWage') { U.neg.wage = +t.value; $('#negWageV').textContent = money(U.neg.wage); }
  if (t.id === 'crName') { U.cr.name = t.value; if (U.cr.auto) { U.cr.abbr = abbrOf(t.value); $('#crAbbr').value = U.cr.abbr; } }
  if (t.id === 'crAbbr') { U.cr.abbr = t.value.toUpperCase(); U.cr.auto = false; }
});
function start(d) {
  if (d && d.G && d.G.v === 1) { G = d.G; reindex(); enter(); }
  else showTitle();
}
try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => (G && !U.M ? { G } : {})); } catch (e) { /* fora do visualizador */ }
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(start); else start((window.claude && window.claude.hot && window.claude.hot.data) || {});

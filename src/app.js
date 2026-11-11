// =====================================================================
// APP — integração com o celular
// No Android (Capacitor) usa vibração nativa e o botão Voltar; no navegador
// funciona como PWA (instalável, offline). Fora desses casos não faz nada.
// =====================================================================
const NATIVE = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
const NAT = {};
if (NATIVE && typeof window.Capacitor.registerPlugin === 'function') {
  try { NAT.App = window.Capacitor.registerPlugin('App'); NAT.Haptics = window.Capacitor.registerPlugin('Haptics'); } catch (e) { /* sem plugins nativos */ }
}
// vibração: nativa no app, navigator.vibrate no navegador (o iPhone não vibra pela web)
const HAP = (() => {
  let on = (() => { try { return localStorage.getItem('prancheta2.vib') !== '0'; } catch (e) { return true; } })();
  const vib = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* sem vibração */ } };
  const call = (fn, fallback) => {
    if (!on) return;
    if (NAT.Haptics) { try { Promise.resolve(fn(NAT.Haptics)).catch(() => {}); } catch (e) { /* plugin indisponível */ } } else vib(fallback);
  };
  return {
    get on() { return on; },
    get can() { return !!NAT.Haptics || 'vibrate' in navigator; },
    set(v) { on = v; try { localStorage.setItem('prancheta2.vib', v ? '1' : '0'); } catch (e) { /* só nesta visita */ } if (v) call(h => h.impact({ style: 'MEDIUM' }), 20); },
    tap: () => call(h => h.impact({ style: 'LIGHT' }), 8),
    med: () => call(h => h.impact({ style: 'MEDIUM' }), 16),
    ok: () => call(h => h.notification({ type: 'SUCCESS' }), [12, 50, 20]),
    err: () => call(h => h.notification({ type: 'ERROR' }), [30, 40, 30]),
    goal: mine => call(h => (mine ? h.notification({ type: 'SUCCESS' }).then(() => h.impact({ style: 'HEAVY' })) : h.impact({ style: 'MEDIUM' })), mine ? [30, 40, 60] : 40)
  };
})();
// botão Voltar do Android: fecha o que estiver aberto antes de sair
function appBack() {
  if (U.sheet) return closeSheet();
  if (U.M && !U.M.done) return ACT.mBoard();
  if (U.M) return;
  if ($('#ov').classList.contains('on')) {
    if ($('#ov [data-a="crGo"]')) return showTitle();
    if ($('#ov .wordmark') && NAT.App) return NAT.App.minimizeApp();
    return;
  }
  if (U.tab !== 'home') return ACT.go({ t: 'home' });
  if (NAT.App) NAT.App.minimizeApp();
}
if (NAT.App) { try { NAT.App.addListener('backButton', appBack); } catch (e) { /* sem botão Voltar */ } }
// ao sair do app: salva, pausa a partida e silencia; ao voltar, retoma o som
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (typeof G !== 'undefined' && G) save();
    if (U.M && !U.M.done && !U.sheet) ACT.mBoard();
    SFX.pause();
  } else SFX.resume();
});
addEventListener('pagehide', () => { if (typeof G !== 'undefined' && G) save(); });
// PWA: funciona offline e pode ser instalado pelo navegador
const INSTALL = { evt: null };
addEventListener('beforeinstallprompt', e => { e.preventDefault(); INSTALL.evt = e; });
if (!NATIVE && 'serviceWorker' in navigator && document.querySelector('link[rel="manifest"]') && /^https?:$/.test(location.protocol)) {
  addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* sem modo offline */ }); });
}

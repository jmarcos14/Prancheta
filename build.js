// Gera as duas versões do jogo a partir de src/:
//   index.html  arquivo único (artefato do Claude): three.js e fontes vêm da internet
//   www/        app para celular (Capacitor e PWA): tudo local, funciona offline
// Uso: node build.js
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = __dirname, r = f => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
const nm = (...p) => path.join(ROOT, 'node_modules', ...p);
const JS = ['engine.js', 'sfx.js', 'gl.js', 'app.js', 'ui.js'].map(r).join('\n');
const page = (viewport, head, libs) => r('index.template.html')
  .replace('/*__VIEWPORT__*/', viewport).replace('<!--__HEAD__-->', () => head).replace('<!--__LIBS__-->', () => libs)
  .replace('/*__CSS__*/', () => r('style.css')).replace('/*__JS__*/', () => JS);

// ---------- 1) arquivo único ----------
const single = page('width=device-width, initial-scale=1, viewport-fit=cover',
  `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Sofia+Sans:wght@400;600;700;800&family=Sofia+Sans+Extra+Condensed:wght@700;800;900&display=swap" rel="stylesheet">`,
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>');
fs.writeFileSync(path.join(ROOT, 'index.html'), single);
console.log('index.html', (single.length / 1024).toFixed(1) + ' KB');

// ---------- 2) app ----------
if (!fs.existsSync(nm('three'))) { console.log('www/ não gerada: rode npm install antes'); process.exit(0); }
const WWW = path.join(ROOT, 'www');
fs.rmSync(WWW, { recursive: true, force: true });
for (const d of ['', 'fonts', 'icons']) fs.mkdirSync(path.join(WWW, d), { recursive: true });
const copy = (from, to) => fs.copyFileSync(from, path.join(WWW, to));
copy(nm('three/build/three.min.js'), 'three.min.js');
copy(nm('@capacitor/core/dist/capacitor.js'), 'capacitor.js');
for (const f of fs.readdirSync(path.join(ROOT, 'assets/icons'))) copy(path.join(ROOT, 'assets/icons', f), 'icons/' + f);
// fontes: só os pesos usados, alfabetos latino e latino estendido
const FONTS = { 'sofia-sans': [400, 600, 700, 800], 'sofia-sans-extra-condensed': [700, 800, 900], caveat: [600, 700] };
let fontCss = '';
for (const [pkg, weights] of Object.entries(FONTS)) for (const w of weights) {
  const css = fs.readFileSync(nm('@fontsource', pkg, w + '.css'), 'utf8');
  for (const block of css.split('/* ').slice(1)) {
    const sub = block.slice(0, block.indexOf(' */')).trim();
    if (!/-(latin|latin-ext)-\d+-normal$/.test(sub)) continue;
    const face = block.slice(block.indexOf('@font-face'));
    const file = /url\(\.\/files\/([^)]+\.woff2)\)/.exec(face)[1];
    copy(nm('@fontsource', pkg, 'files', file), 'fonts/' + file);
    fontCss += face.replace(/src:[^;]+;/, `src: url(fonts/${file}) format('woff2');`).replace(/\s+/g, ' ').trim() + '\n';
  }
}
const app = page('width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no',
  `<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/favicon-64.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Prancheta">
<style>
${fontCss}</style>`,
  '<script src="capacitor.js"></script>\n<script src="three.min.js"></script>');
fs.writeFileSync(path.join(WWW, 'index.html'), app);
fs.writeFileSync(path.join(WWW, 'manifest.webmanifest'), JSON.stringify({
  name: 'Prancheta Manager', short_name: 'Prancheta', description: 'Jogo de gestão de futebol: monte o time, negocie e leve seu clube ao título.',
  lang: 'pt-BR', start_url: './', scope: './', display: 'standalone', orientation: 'portrait',
  background_color: '#0a2b1f', theme_color: '#0a2b1f', categories: ['games', 'sports'],
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
}, null, 2));
// service worker: guarda todos os arquivos na primeira visita; a versão muda quando o conteúdo muda
const files = [];
(function walk(d, rel) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f), q = rel ? rel + '/' + f : f; if (fs.statSync(p).isDirectory()) walk(p, q); else files.push(q); } })(WWW, '');
const hash = crypto.createHash('sha1'); for (const f of files.sort()) hash.update(f).update(fs.readFileSync(path.join(WWW, f)));
const ver = hash.digest('hex').slice(0, 10);
fs.writeFileSync(path.join(WWW, 'sw.js'), `// gerado por build.js
const CACHE = 'prancheta-${ver}';
const FILES = ${JSON.stringify(['./', ...files])};
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
`);
const size = files.reduce((t, f) => t + fs.statSync(path.join(WWW, f)).size, 0);
console.log('www/', files.length + 1, 'arquivos,', (size / 1024 / 1024).toFixed(2) + ' MB, versão ' + ver);

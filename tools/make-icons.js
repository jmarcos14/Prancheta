// Gera os ícones do app (PWA e Android) a partir do desenho abaixo.
// Uso: node tools/make-icons.js   (precisa do Playwright instalado)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
// shape: 'square' (sem cantos, para máscara), 'rounded', 'circle', 'fg' (só o primeiro plano, fundo transparente)
function svg(shape) {
  const clip = shape === 'circle' ? '<circle cx="512" cy="512" r="512"/>' : shape === 'rounded' ? '<rect width="1024" height="1024" rx="224"/>' : '<rect width="1024" height="1024"/>';
  const bg = shape === 'fg' ? '' : `
    <g clip-path="url(#c)">
      <rect width="1024" height="1024" fill="#0e3a2a"/>
      ${[0, 2, 4, 6].map(i => `<rect y="${i * 128}" width="1024" height="128" fill="#0d3626"/>`).join('')}
      <rect width="1024" height="1024" fill="url(#v)"/>
    </g>`;
  // tudo que importa fica dentro do círculo central de 66% (zona segura dos ícones adaptativos)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <clipPath id="c">${clip}</clipPath>
    <radialGradient id="v" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#1f6b49" stop-opacity=".55"/><stop offset="1" stop-color="#03110b" stop-opacity=".6"/></radialGradient>
    <radialGradient id="gl" cx="34%" cy="28%" r="60%"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <filter id="sh" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#000" flood-opacity=".5"/></filter>
  </defs>
  ${bg}
  <g fill="none" stroke="#eef4ea" stroke-opacity=".55" stroke-width="12" stroke-linecap="round">
    <circle cx="512" cy="540" r="232"/>
    <path d="M268 540h488"/>
    <path d="M392 296Q510 170 606 252" stroke-dasharray="2 30" stroke-width="16"/>
    <path d="M572 248l40 10 -8 -40" stroke-width="14" stroke-linejoin="round"/>
  </g>
  <g filter="url(#sh)">
    <circle cx="352" cy="374" r="74" fill="#4f8cff"/><circle cx="352" cy="374" r="74" fill="url(#gl)"/>
    <circle cx="684" cy="330" r="74" fill="#ff5b4f"/><circle cx="684" cy="330" r="74" fill="url(#gl)"/>
    <circle cx="512" cy="566" r="190" fill="#ffd23f"/><circle cx="512" cy="566" r="190" fill="url(#gl)"/>
    <circle cx="512" cy="566" r="190" fill="none" stroke="#000" stroke-opacity=".14" stroke-width="10"/>
  </g>
  <text x="512" y="664" text-anchor="middle" font-family="SSXC" font-weight="900" font-size="290" fill="#2b2100">P</text>
</svg>`;
}
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const ff = fs.readFileSync(path.join(ROOT, 'node_modules/@fontsource/sofia-sans-extra-condensed/files/sofia-sans-extra-condensed-latin-900-normal.woff2')).toString('base64');
  const css = `@font-face{font-family:SSXC;font-weight:900;src:url(data:font/woff2;base64,${ff}) format('woff2')}body{margin:0;background:transparent}`;
  const shot = async (shape, size, out) => {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<style>${css}</style><div style="width:${size}px;height:${size}px">${svg(shape).replace('width="1024" height="1024">', `width="${size}" height="${size}">`)}</div>`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: out, omitBackground: true });
  };
  fs.mkdirSync(path.join(ROOT, 'assets/icons'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'assets/icon.svg'), svg('rounded'));
  // PWA e iOS
  for (const s of [192, 512]) { await shot('rounded', s, path.join(ROOT, `assets/icons/icon-${s}.png`)); await shot('square', s, path.join(ROOT, `assets/icons/maskable-${s}.png`)); }
  await shot('square', 180, path.join(ROOT, 'assets/icons/apple-touch-icon.png'));
  await shot('rounded', 64, path.join(ROOT, 'assets/icons/favicon-64.png'));
  // Android (mipmaps): legado, redondo e primeiro plano do ícone adaptativo (108dp)
  const res = path.join(ROOT, 'android/app/src/main/res');
  if (fs.existsSync(res)) {
    const D = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
    for (const [k, m] of Object.entries(D)) {
      const dir = path.join(res, 'mipmap-' + k);
      fs.mkdirSync(dir, { recursive: true });
      await shot('rounded', 48 * m, path.join(dir, 'ic_launcher.png'));
      await shot('circle', 48 * m, path.join(dir, 'ic_launcher_round.png'));
      await shot('fg', 108 * m, path.join(dir, 'ic_launcher_foreground.png'));
    }
  }
  if (fs.existsSync(res)) {
    const icon = fs.readFileSync(path.join(ROOT, 'assets/icons/icon-512.png')).toString('base64');
    const splash = async (w, h, out) => {
      await p.setViewportSize({ width: w, height: h });
      const s = Math.round(Math.min(w, h) * 0.42);
      await p.setContent(`<style>${css}body{background:#0a2b1f;display:grid;place-items:center;height:${h}px;margin:0}</style><img src="data:image/png;base64,${icon}" width="${s}" height="${s}">`);
      await p.screenshot({ path: out });
    };
    for (const d of fs.readdirSync(res).filter(d => d.startsWith('drawable'))) {
      const f = path.join(res, d, 'splash.png'); if (!fs.existsSync(f)) continue;
      const b = fs.readFileSync(f); await splash(b.readUInt32BE(16), b.readUInt32BE(20), f);
    }
  }
  await b.close();
  console.log('ícones gerados');
})();

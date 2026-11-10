// Junta src/ num único index.html (sem dependências): node build.js
const fs = require('fs'), path = require('path');
const r = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const html = r('index.template.html').replace('/*__CSS__*/', () => r('style.css')).replace('/*__JS__*/', () => r('engine.js') + '\n' + r('gl.js') + '\n' + r('ui.js'));
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log('index.html', (html.length / 1024).toFixed(1) + ' KB');

// =====================================================================
// PARTIDA EM 3D — visual herdado do Prancheta original (three.js):
// campo, bonecos, bola, partículas, câmera e som sintetizado.
// Uma "direção de cena" anima os lances que o motor de regras decide.
// =====================================================================
const GL = (() => {
  const TAU = Math.PI * 2, lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FONT = '"Sofia Sans Extra Condensed", "Arial Narrow", Impact, sans-serif';
  const SKINS = ['#f1d0b0', '#e2b48c', '#c98e62', '#a8714a', '#7a4e33', '#5a3825'];
  const HAIRS = ['#1b1410', '#2e1f16', '#5b3a22', '#8a5a2b', '#c99a4b', '#e8d29a', '#3a3a3a', '#b8452d'];
  const BOOTS = ['#111', '#fff', '#ff3d6e', '#1fe0ff', '#c6ff3d', '#ff9a1a'];
  const MIN = 0.72; // segundos de cena (em 1×) por minuto de jogo
  let THREE, ready = false, failed = false, renderer, scene, camera, canvas, fx, dust, DUSTC, confMesh, dummy, FG, ballV, lastT = 0, T0 = 0, confI = 0, ringI = 0;
  const TX = {}, goals = {}, conf = [], rings = [], MATC = {}, floats = [], FIELD = { cur: null, boards: [], decal: null };
  const cam = { cD: 260, cx: 0, cz: 0, ctilt: 0 };
  const V = { on: false, M: null, my: null, op: null, acts: new Map(), ball: null, q: [], wait: 0, block: false, ended: false, scene: false, poss: null, want: null, zoneY: null, minAcc: 0, speed: 2, camNear: true, shake: 0, seen: 0, shown: [0, 0], half: false, mood: 0, home: true };

  const W = (x, y) => [x, -y];
  const planeG = (w, h) => new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2);
  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
  function tex(c) { const t = new THREE.CanvasTexture(c); t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t; }
  function shade(h, k) { const c = new THREE.Color(h); if (k > 0) c.lerp(new THREE.Color('#fff'), k); else c.lerp(new THREE.Color('#000'), -k); return '#' + c.getHexString(); }
  function lum(h) { const c = new THREE.Color(h); return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; }

  // ---------- montagem da cena (uma vez) ----------
  function init() {
    if (ready) return true;
    if (failed || !window.THREE) return false;
    try { THREE = window.THREE; build(); ready = true; } catch (e) { failed = true; return false; }
    return true;
  }
  function build() {
    canvas = $('#gl');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(30, 1, 5, 3000);
    camera.up.set(0, 0, -1);
    scene.add(new THREE.HemisphereLight(0xeafff2, 0x0a2017, 0.85));
    const sun = new THREE.DirectionalLight(0xfff0d8, 0.95); sun.position.set(-30, 80, 20); scene.add(sun);
    let [c, g] = cv(128, 128);
    let gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); TX.glow = tex(c);
    [c, g] = cv(128, 128);
    gr = g.createRadialGradient(64, 64, 6, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.5, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); TX.blob = tex(c);
    makeField(); goals.top = makeGoal(-1); goals.bot = makeGoal(1);
    makeParticles(); makeFigGeo(); makeBall();
    addEventListener('resize', () => { if (V.on) resize(); });
  }
  function makeField() {
    const k = 13, Wc = 84 * k, Hc = 124 * k;
    const [c, g] = cv(Wc, Hc);
    const X = x => (x + 42) * k, Z = z => (z + 62) * k;
    g.fillStyle = '#071a13'; g.fillRect(0, 0, Wc, Hc);
    g.save(); g.beginPath(); g.rect(X(-38.5), Z(-58), 77 * k, 116 * k); g.clip();
    for (let i = -8; i < 8; i++) { g.fillStyle = (i & 1) ? '#227346' : '#1c663d'; g.fillRect(X(-40), Z(i * 7.5), 80 * k, 7.5 * k + 1); }
    for (let i = -6; i < 6; i++) { g.fillStyle = (i & 1) ? 'rgba(255,255,255,.02)' : 'rgba(0,0,0,.035)'; g.fillRect(X(i * 6.8), Z(-60), 6.8 * k, 120 * k); }
    for (let i = 0; i < 30000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.06)'; g.fillRect(Math.random() * Wc, Math.random() * Hc, 2, 2 + Math.random() * 3); }
    g.restore();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 6; g.strokeRect(X(-38.5), Z(-58), 77 * k, 116 * k);
    g.fillStyle = '#0d2a20'; g.fillRect(X(-41), Z(-60.5), 82 * k, 1.6 * k); g.fillRect(X(-41), Z(58.9), 82 * k, 1.6 * k);
    g.globalCompositeOperation = 'lighter';
    for (const [x, z] of [[-48, -68], [48, -68], [-48, 68], [48, 68]]) {
      const gr = g.createRadialGradient(X(x), Z(z), 0, X(x), Z(z), 95 * k);
      gr.addColorStop(0, 'rgba(255,236,190,.16)'); gr.addColorStop(0.5, 'rgba(255,236,190,.05)'); gr.addColorStop(1, 'rgba(255,236,190,0)');
      g.fillStyle = gr; g.fillRect(0, 0, Wc, Hc);
    }
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = 'rgba(244,250,238,.88)'; g.fillStyle = 'rgba(244,250,238,.9)'; g.lineWidth = 0.12 * k * 1.4; g.lineCap = 'round';
    g.strokeRect(X(-34), Z(-52.5), 68 * k, 105 * k);
    g.beginPath(); g.moveTo(X(-34), Z(0)); g.lineTo(X(34), Z(0)); g.stroke();
    g.beginPath(); g.arc(X(0), Z(0), 9.15 * k, 0, TAU); g.stroke();
    g.beginPath(); g.arc(X(0), Z(0), 0.3 * k, 0, TAU); g.fill();
    for (const s of [-1, 1]) {
      const gl = 52.5 * s;
      g.strokeRect(X(-20.16), Z(s < 0 ? -52.5 : 52.5 - 16.5), 40.32 * k, 16.5 * k);
      g.strokeRect(X(-9.16), Z(s < 0 ? -52.5 : 52.5 - 5.5), 18.32 * k, 5.5 * k);
      const ps = gl - 11 * s;
      g.beginPath(); g.arc(X(0), Z(ps), 0.25 * k, 0, TAU); g.fill();
      g.beginPath();
      if (s < 0) g.arc(X(0), Z(ps), 9.15 * k, 0.6435, Math.PI - 0.6435); else g.arc(X(0), Z(ps), 9.15 * k, Math.PI + 0.6435, TAU - 0.6435);
      g.stroke();
    }
    for (const [x, z, a0] of [[-34, -52.5, 0], [34, -52.5, Math.PI / 2], [34, 52.5, Math.PI], [-34, 52.5, -Math.PI / 2]]) { g.beginPath(); g.arc(X(x), Z(z), 1 * k, a0, a0 + Math.PI / 2); g.stroke(); }
    const vg = g.createRadialGradient(Wc / 2, Hc / 2, Hc * 0.28, Wc / 2, Hc / 2, Hc * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,8,4,.5)');
    g.fillStyle = vg; g.fillRect(0, 0, Wc, Hc);
    scene.add(new THREE.Mesh(planeG(84, 124), new THREE.MeshBasicMaterial({ map: tex(c) })));
    for (const [x, z] of [[-46, -66], [46, -66], [-46, 66], [46, 66]]) {
      const f = new THREE.Mesh(planeG(46, 46), new THREE.MeshBasicMaterial({ map: TX.glow, color: 0xffe6b0, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
      f.position.set(x, 0.3, z); scene.add(f);
    }
    for (const [x, z] of [[-34, -52.5], [34, -52.5], [-34, 52.5], [34, 52.5]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 6), new THREE.MeshStandardMaterial({ color: 0xffffff }));
      pole.position.set(x, 0.75, z); scene.add(pole);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), new THREE.MeshBasicMaterial({ color: 0xffd23f, side: THREE.DoubleSide }));
      fl.position.set(x + 0.35 * Math.sign(-x), 1.3, z); fl.rotation.x = -0.6; scene.add(fl);
    }
  }
  function makeGoal(s) {
    const grp = new THREE.Group();
    const [c, g] = cv(256, 96);
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.6;
    for (let x = 0; x <= 256; x += 10) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 96); g.stroke(); }
    for (let y = 0; y <= 96; y += 10) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
    const net = new THREE.Mesh(planeG(7.32, 2.2), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, opacity: 0.85, depthWrite: false }));
    net.position.set(0, 1.4, s * (52.5 + 1.1)); grp.add(net);
    const white = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.4 });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.14, 0.14), white); bar.position.set(0, 2.44, s * 52.5); grp.add(bar);
    for (const x of [-3.73, 3.73]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.44, 8), white); post.position.set(x, 1.22, s * 52.5); grp.add(post);
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 2.2), new THREE.MeshBasicMaterial({ color: 0xdfe7e0, transparent: true, opacity: 0.6 }));
      side.position.set(x, 2.3, s * (52.5 + 1.1)); grp.add(side);
    }
    const flash = new THREE.Mesh(planeG(30, 18), new THREE.MeshBasicMaterial({ map: TX.glow, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    flash.position.set(0, 0.6, s * 52); grp.add(flash);
    scene.add(grp);
    return { net, flash, flashT: 0, netKick: 0 };
  }

  // ---------- partículas, confete, anéis ----------
  class PSys {
    constructor(n) {
      this.n = n; this.i = 0;
      this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.size = new Float32Array(n); this.alpha = new Float32Array(n);
      this.v = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n); this.s0 = new Float32Array(n);
      this.drag = new Float32Array(n); this.grav = new Float32Array(n);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
      this.mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uPx: { value: 800 } },
        vertexShader: 'attribute vec3 aColor; attribute float aSize; attribute float aAlpha; uniform float uPx; varying vec3 vC; varying float vA; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=aSize*uPx/-mv.z; gl_Position=projectionMatrix*mv; vC=aColor; vA=aAlpha; }',
        fragmentShader: 'varying vec3 vC; varying float vA; void main(){ vec2 p=gl_PointCoord-0.5; float d=length(p); float a=smoothstep(0.5,0.0,d); a*=a; float core=smoothstep(0.18,0.0,d); gl_FragColor=vec4(mix(vC,vec3(1.0),core*0.6),a*vA); }'
      });
      this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = 6; scene.add(this.pts); this.g = g;
    }
    emit(x, y, z, vx, vy, vz, life, size, c, drag = 2.5, grav = 0) {
      const i = this.i; this.i = (i + 1) % this.n;
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      this.v[i * 3] = vx; this.v[i * 3 + 1] = vy; this.v[i * 3 + 2] = vz;
      this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
      this.life[i] = this.max[i] = life; this.s0[i] = size; this.drag[i] = drag; this.grav[i] = grav;
    }
    update(dt) {
      for (let i = 0; i < this.n; i++) {
        if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
        this.life[i] -= dt;
        const t = Math.max(0, this.life[i] / this.max[i]), dk = Math.exp(-this.drag[i] * dt), j = i * 3;
        this.v[j] *= dk; this.v[j + 1] = this.v[j + 1] * dk - this.grav[i] * dt; this.v[j + 2] *= dk;
        this.pos[j] += this.v[j] * dt; this.pos[j + 1] += this.v[j + 1] * dt; this.pos[j + 2] += this.v[j + 2] * dt;
        if (this.pos[j + 1] < 0.1) { this.pos[j + 1] = 0.1; this.v[j + 1] *= -0.35; }
        this.alpha[i] = Math.min(1, t * 2.5) * Math.min(1, (1 - t) * 12 + 0.2);
        this.size[i] = this.s0[i] * (0.35 + 0.65 * t);
      }
      for (const k of ['position', 'aColor', 'aSize', 'aAlpha']) this.g.attributes[k].needsUpdate = true;
    }
  }
  function makeParticles() {
    fx = new PSys(1600); dust = new PSys(100); DUSTC = new THREE.Color(0x6e6650);
    for (let i = 0; i < 100; i++) dust.emit(rnd(-40, 40), rnd(2, 14), rnd(-60, 60), 0, 0, 0, rnd(1, 12), rnd(0.35, 0.8), DUSTC, 0, 0);
    confMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.55, 1.05), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), 260);
    confMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); confMesh.frustumCulled = false; scene.add(confMesh);
    dummy = new THREE.Object3D();
    for (let i = 0; i < 260; i++) {
      conf.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), ax: new THREE.Vector3(1, 0, 0), ang: 0, av: 0, life: 0 });
      confMesh.setColorAt(i, new THREE.Color(1, 1, 1)); dummy.scale.setScalar(0); dummy.updateMatrix(); confMesh.setMatrixAt(i, dummy.matrix);
    }
    const ringGeo = new THREE.RingGeometry(0.86, 1, 72).rotateX(-Math.PI / 2);
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.position.y = 0.2; m.renderOrder = 5; scene.add(m); rings.push({ m, t: 1, d: 1, s0: 1, s1: 2 });
    }
  }
  function burst(x, y, colors, n, spd, size, life, up = 0.6, grav = 18, h = 0.8) {
    const cs = colors.map(c => new THREE.Color(c)); const [wx, wz] = W(x, y);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = spd * (0.25 + Math.random() * 0.75);
      fx.emit(wx, h, wz, Math.cos(a) * s, (0.3 + Math.random()) * spd * up, Math.sin(a) * s, life * (0.5 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.8), cs[i % cs.length], 2.2, grav);
    }
  }
  function confetti(x, y, colors, n, spd = 26) {
    const [wx, wz] = W(x, y);
    for (let k = 0; k < n; k++) {
      const c = conf[confI]; confMesh.setColorAt(confI, new THREE.Color(pick(colors))); confI = (confI + 1) % 260;
      const a = Math.random() * TAU, s = spd * (0.3 + Math.random() * 0.7);
      c.p.set(wx + rnd(-2, 2), 1, wz + rnd(-2, 2)); c.v.set(Math.cos(a) * s, rnd(14, 30), Math.sin(a) * s);
      c.ax.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize(); c.ang = rnd(0, TAU); c.av = rnd(6, 16); c.life = rnd(2.4, 3.6);
    }
    confMesh.instanceColor.needsUpdate = true;
  }
  function updateConfetti(dt) {
    for (let i = 0; i < 260; i++) {
      const c = conf[i]; if (c.life <= 0) continue;
      c.life -= dt; c.v.y -= 30 * dt; c.v.x *= Math.exp(-1.6 * dt); c.v.z *= Math.exp(-1.6 * dt);
      c.p.addScaledVector(c.v, dt);
      if (c.p.y < 0.12) { c.p.y = 0.12; c.v.set(c.v.x * 0.3, 0, c.v.z * 0.3); c.av *= 0.9; }
      c.ang += c.av * dt;
      dummy.position.copy(c.p); dummy.quaternion.setFromAxisAngle(c.ax, c.ang); dummy.scale.setScalar(c.life <= 0 ? 0 : Math.min(1, c.life / 0.6));
      dummy.updateMatrix(); confMesh.setMatrixAt(i, dummy.matrix);
    }
    confMesh.instanceMatrix.needsUpdate = true;
  }
  function ring(x, y, color, s0, s1, d, delay = 0) {
    const r = rings[ringI]; ringI = (ringI + 1) % rings.length;
    const [wx, wz] = W(x, y); r.m.position.x = wx; r.m.position.z = wz; r.m.material.color.set(color);
    r.s0 = s0; r.s1 = s1; r.d = d; r.t = -delay;
  }
  function updateRings(dt) {
    for (const r of rings) {
      if (r.t >= r.d) { r.m.material.opacity = 0; continue; }
      r.t += dt; if (r.t < 0) { r.m.material.opacity = 0; continue; }
      const k = Math.min(1, r.t / r.d); r.m.scale.setScalar(lerp(r.s0, r.s1, easeOut(k))); r.m.material.opacity = (1 - k) * 0.9;
    }
  }

  // ---------- bonecos ----------
  function makeFigGeo() {
    FG = {
      torso: new THREE.SphereGeometry(1, 16, 12), head: new THREE.SphereGeometry(0.125, 14, 10),
      cap: new THREE.SphereGeometry(0.133, 14, 8, 0, TAU, 0, Math.PI * 0.52), afro: new THREE.SphereGeometry(0.175, 12, 10), bun: new THREE.SphereGeometry(0.07, 8, 6),
      arm: new THREE.CylinderGeometry(0.058, 0.045, 0.6, 8).translate(0, -0.3, 0), thigh: new THREE.CylinderGeometry(0.095, 0.075, 0.44, 8).translate(0, -0.22, 0),
      shin: new THREE.CylinderGeometry(0.062, 0.05, 0.48, 8).translate(0, -0.24, 0), boot: new THREE.BoxGeometry(0.25, 0.08, 0.11).translate(0.05, -0.04, 0),
      num: new THREE.PlaneGeometry(0.34, 0.24).rotateX(-Math.PI / 2).rotateY(-Math.PI / 2), ring: new THREE.RingGeometry(0.62, 0.74, 48).rotateX(-Math.PI / 2),
      shadow: planeG(1.9, 1.9)
    };
  }
  function mat(color) { return MATC[color] || (MATC[color] = new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.02 })); }
  function kitMat(kit) {
    const pat = kit.pattern;
    if (pat === 'liso') return mat(kit.shirt);
    const k = 'kit' + kit.shirt + kit.second + pat;
    if (MATC[k]) return MATC[k];
    const [c, g] = cv(256, 128);
    g.fillStyle = kit.shirt; g.fillRect(0, 0, 256, 128); g.fillStyle = kit.second;
    if (pat === 'listras') for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 16, 128);
    if (pat === 'faixa') { g.beginPath(); g.moveTo(0, 20); g.lineTo(40, 0); g.lineTo(256, 108); g.lineTo(216, 128); g.closePath(); g.fill(); g.beginPath(); g.moveTo(128, 0); g.lineTo(168, 0); g.lineTo(256, 44); g.lineTo(256, 64); g.closePath(); g.fill(); }
    if (pat === 'meio') g.fillRect(0, 0, 128, 128);
    if (pat === 'aros') for (let y = 20; y < 128; y += 26) g.fillRect(0, y, 256, 12);
    const t = tex(c); t.wrapS = THREE.RepeatWrapping;
    return (MATC[k] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.62, metalness: 0.02 }));
  }
  function numTexture(num, shirt, second) {
    const [c, g] = cv(128, 104);
    g.font = '900 92px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
    const ink = lum(shirt) > 0.55 ? '#111' : (lum(second) > 0.35 ? second : '#fff');
    g.lineWidth = 8; g.strokeStyle = lum(ink) > 0.5 ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.35)'; g.strokeText(String(num), 64, 56);
    g.fillStyle = ink; g.fillText(String(num), 64, 56);
    return tex(c);
  }
  function lookOf(p) { const h = p.id * 2654435761 >>> 0; return { skin: SKINS[h % 6], hair: HAIRS[(h >>> 3) % 8], hs: (h >>> 7) % 5, h: 0.93 + ((h >>> 11) % 16) / 100, boot: BOOTS[(h >>> 16) % 6] }; }
  function kitFor(c, alt) {
    const shirt = alt ? c.c2 : c.c1, second = alt ? c.c1 : c.c2, h = new THREE.Color(shirt).getHSL({});
    return { shirt, second, pattern: ['liso', 'listras', 'meio', 'faixa'][c.pat % 4], gk: (h.h > 0.05 && h.h < 0.14 && h.s > 0.5) ? '#9b5cff' : (h.h > 0.25 && h.h < 0.45 && h.s > 0.4) ? '#ff9a1a' : '#2fd27a' };
  }
  class Fig {
    constructor(p, kit, gk, num) {
      const shirt = gk ? kit.gk : kit.shirt;
      this.root = new THREE.Group(); scene.add(this.root);
      this.shadow = new THREE.Mesh(FG.shadow, new THREE.MeshBasicMaterial({ map: TX.blob, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
      this.shadow.position.y = 0.03; this.shadow.renderOrder = 1; this.root.add(this.shadow);
      this.ringM = new THREE.Mesh(FG.ring, new THREE.MeshBasicMaterial({ color: shirt, transparent: true, opacity: 0.9, depthWrite: false }));
      this.ringM.position.y = 0.08; this.ringM.renderOrder = 2; this.root.add(this.ringM);
      this.body = new THREE.Group(); this.root.add(this.body);
      const lk = lookOf(p);
      const mShirt = mat(shirt), mShorts = mat(kit.second), mSocks = mat(gk ? shade(shirt, -0.3) : kit.shirt), mSkin = mat(lk.skin), mHair = mat(lk.hair), mBoot = mat(lk.boot);
      const torso = new THREE.Mesh(FG.torso, gk ? mShirt : kitMat(kit)); torso.scale.set(0.16, 0.31, 0.25); torso.position.y = 1.33; this.body.add(torso);
      this.numMat = new THREE.MeshBasicMaterial({ map: numTexture(num, shirt, kit.second), transparent: true, depthWrite: false });
      const nm = new THREE.Mesh(FG.num, this.numMat); nm.position.set(-0.13, 1.62, 0); this.body.add(nm);
      const head = new THREE.Mesh(FG.head, mSkin); head.position.y = 1.79; this.body.add(head);
      if (lk.hs === 0 || lk.hs === 4) { const h = new THREE.Mesh(FG.cap, mHair); h.position.set(-0.01, 1.81, 0); this.body.add(h); }
      if (lk.hs === 1) { const h = new THREE.Mesh(FG.cap, mHair); h.scale.set(1, 0.55, 1); h.position.set(0, 1.8, 0); this.body.add(h); }
      if (lk.hs === 2) { const h = new THREE.Mesh(FG.afro, mHair); h.position.set(-0.03, 1.85, 0); this.body.add(h); }
      if (lk.hs === 4) { const h = new THREE.Mesh(FG.bun, mHair); h.position.set(-0.16, 1.82, 0); this.body.add(h); }
      const mkLeg = z => { const g = new THREE.Group(); g.position.set(0, 1.0, z); g.add(new THREE.Mesh(FG.thigh, mShorts)); const s = new THREE.Mesh(FG.shin, mSocks); s.position.y = -0.44; g.add(s); const b = new THREE.Mesh(FG.boot, mBoot); b.position.y = -0.92; g.add(b); this.body.add(g); return g; };
      this.legL = mkLeg(0.11); this.legR = mkLeg(-0.11);
      const mkArm = z => { const g = new THREE.Group(); g.position.set(0, 1.56, z); g.add(new THREE.Mesh(FG.arm, gk ? mShirt : mSkin)); const sl = new THREE.Mesh(FG.thigh, mShirt); sl.scale.set(0.75, 0.5, 0.75); g.add(sl); this.body.add(g); return g; };
      this.armL = mkArm(0.29); this.armR = mkArm(-0.29);
      this.body.scale.set(1, lk.h, 1);
      this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.face = 0; this.phase = Math.random() * 6; this.sc = 0; this.scT = 2; this.visible = true;
    }
    setRing(color, op) { this.ringM.material.color.set(color); this.ringM.material.opacity = op; }
    update(dt, t, st) {
      const k = 1 - Math.exp(-22 * dt);
      const nx = this.x + (st.x - this.x) * k, ny = this.y + (st.y - this.y) * k;
      this.vx = lerp(this.vx, (nx - this.x) / Math.max(dt, 1e-3), 1 - Math.exp(-10 * dt)); this.vy = lerp(this.vy, (ny - this.y) / Math.max(dt, 1e-3), 1 - Math.exp(-10 * dt));
      this.x = nx; this.y = ny;
      let d = st.face - this.face; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; this.face += d * (1 - Math.exp(-12 * dt));
      this.sc += (this.scT - this.sc) * (1 - Math.exp(-8 * dt));
      const [wx, wz] = W(this.x, this.y);
      this.root.position.set(wx, 0, wz); this.root.scale.setScalar(this.sc); this.root.visible = this.visible;
      this.body.rotation.set(0, this.face, 0);
      const sp = Math.hypot(this.vx, this.vy);
      this.phase += sp * dt * 1.15;
      const amp = clamp(sp / 6.5, 0, 1) * 0.8, sw = Math.sin(this.phase * 2.2) * amp;
      let lL = sw, lR = -sw, aL = -sw * 0.9, aR = sw * 0.9, bx = 0, bz = 0, by = Math.abs(Math.sin(this.phase * 2.2)) * 0.05 * amp, armXL = 0, armXR = 0;
      if (st.jump > 0) { by += Math.sin(Math.min(1, st.jump / 0.55) * Math.PI) * 0.45; armXL = 2.4; armXR = -2.4; }
      if (st.kick > 0) { const q = 1 - st.kick / 0.3; lR = Math.sin(q * Math.PI) * 1.4 - 0.25; aL = -0.6; }
      if (st.slide > 0) { const f = Math.min(1, st.slide / 0.2); bz = -1.2 * f; by -= 0.55 * f; lL = 1.1 * f; lR = 0.9 * f; }
      if (st.dive > 0 || st.diveExt > 0.05) { const f = Math.min(1, (st.diveExt || 0) / 1.2 + (st.dive > 0 ? 0.3 : 0)); const side = (st.diveDir || 1) * (Math.sin(this.face) >= 0 ? 1 : -1); bx = side * 1.35 * f; by -= 0.5 * f; armXL = side * 2.6 * f; armXR = side * 2.6 * f; aL = aR = 0; }
      if (st.cele > 0) { armXL = 2.7 + Math.sin(t * 14) * 0.2; armXR = -2.7 - Math.sin(t * 14) * 0.2; aL = aR = 0; by += Math.abs(Math.sin(t * 9)) * 0.25; }
      this.legL.rotation.z = lL; this.legR.rotation.z = lR;
      this.armL.rotation.set(armXL, 0, aL); this.armR.rotation.set(armXR, 0, aR);
      this.body.rotation.x = bx; this.body.rotation.z = bz; this.body.position.y = by;
    }
    dispose() { scene.remove(this.root); this.numMat.map.dispose(); this.numMat.dispose(); this.shadow.material.dispose(); this.ringM.material.dispose(); }
  }

  // ---------- bola ----------
  function makeBall() {
    ballV = { x: 0, y: 0, z: 0, vis: 0, trail: [], n: 22 };
    const [c, g] = cv(128, 64);
    g.fillStyle = '#f7f7f2'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#1d2722';
    for (const [x, y] of [[20, 16], [64, 32], [108, 16], [42, 52], [86, 52], [0, 48], [128, 48]]) { g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill(); }
    ballV.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), new THREE.MeshStandardMaterial({ map: tex(c), roughness: 0.45, emissive: 0xffffff, emissiveIntensity: 0.25 }));
    ballV.shadow = new THREE.Mesh(planeG(1.1, 1.1), new THREE.MeshBasicMaterial({ map: TX.blob, color: 0x000000, transparent: true, opacity: 0.6, depthWrite: false }));
    ballV.glow = new THREE.Mesh(planeG(2.6, 2.6), new THREE.MeshBasicMaterial({ map: TX.glow, color: 0xfff6dd, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    ballV.shadow.renderOrder = 7; ballV.glow.renderOrder = 8;
    scene.add(ballV.mesh, ballV.shadow, ballV.glow);
    const n = ballV.n, tg = new THREE.BufferGeometry();
    ballV.tp = new Float32Array(n * 3); ballV.tc = new Float32Array(n * 3); ballV.ts = new Float32Array(n); ballV.ta = new Float32Array(n);
    tg.setAttribute('position', new THREE.BufferAttribute(ballV.tp, 3)); tg.setAttribute('aColor', new THREE.BufferAttribute(ballV.tc, 3));
    tg.setAttribute('aSize', new THREE.BufferAttribute(ballV.ts, 1)); tg.setAttribute('aAlpha', new THREE.BufferAttribute(ballV.ta, 1));
    ballV.tg = tg; const pts = new THREE.Points(tg, fx.mat); pts.frustumCulled = false; pts.renderOrder = 6; scene.add(pts);
  }
  function updateBallVis(dt, b) {
    if (b.pop) { b.pop = false; ballV.vis = 0; ballV.x = b.x; ballV.y = b.y; ballV.z = 0; ballV.trail.length = 0; }
    ballV.vis += (1 - ballV.vis) * (1 - Math.exp(-6 * dt));
    const d = Math.hypot(b.x - ballV.x, b.y - ballV.y), k = d > 6 ? 1 : 1 - Math.exp(-40 * dt);
    ballV.x += (b.x - ballV.x) * k; ballV.y += (b.y - ballV.y) * k; ballV.z += (b.z - ballV.z) * k;
    ballV.mesh.rotation.x = b.rot; ballV.mesh.rotation.z = b.rot * 0.6;
    const [wx, wz] = W(ballV.x, ballV.y), s = ballV.vis, h = ballV.z;
    ballV.mesh.position.set(wx, 0.3 + h, wz); ballV.mesh.scale.setScalar(s * (1 + h * 0.04));
    ballV.shadow.position.set(wx + h * 0.4 + 0.1, 0.05, wz + h * 0.4 + 0.1); ballV.shadow.scale.setScalar(s * (1 + h * 0.1)); ballV.shadow.material.opacity = 0.6 / (1 + h * 0.25) * s;
    ballV.glow.position.set(wx, 0.3 + h, wz); ballV.glow.material.opacity = 0.45 * s;
    const fast = !b.owner && Math.hypot(b.vx, b.vy) > 9;
    ballV.trail.unshift([wx, 0.3 + h, wz]); if (ballV.trail.length > ballV.n) ballV.trail.pop();
    for (let i = 0; i < ballV.n; i++) {
      const p = ballV.trail[i] || [wx, 0.3, wz], q = 1 - i / ballV.n;
      ballV.tp[i * 3] = p[0]; ballV.tp[i * 3 + 1] = p[1]; ballV.tp[i * 3 + 2] = p[2];
      ballV.tc[i * 3] = 1; ballV.tc[i * 3 + 1] = 0.85 + 0.15 * q; ballV.tc[i * 3 + 2] = 0.6 + 0.4 * q;
      ballV.ts[i] = 0.8 * q; ballV.ta[i] = (fast ? 0.75 : 0) * q * s;
    }
    for (const a of ['position', 'aColor', 'aSize', 'aAlpha']) ballV.tg.attributes[a].needsUpdate = true;
  }

  // ---------- textos sobre o campo ----------
  const vtmp = { v: null };
  function toScreen(x, y, h = 1) { const [wx, wz] = W(x, y); if (!vtmp.v) vtmp.v = new THREE.Vector3(); vtmp.v.set(wx, h, wz).project(camera); return [(vtmp.v.x + 1) / 2 * canvas.clientWidth, (1 - vtmp.v.y) / 2 * canvas.clientHeight]; }
  function flt(x, y, text, cls = '') { const d = document.createElement('div'); d.className = 'flt ' + cls; d.textContent = text; $('#labels').appendChild(d); floats.push({ d, x, y, t: 0 }); }
  function updateFloats(dt) {
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i]; f.t += dt;
      const [sx, sy] = toScreen(f.x, f.y, 3), k = f.t / 1.35;
      f.d.style.transform = `translate(${sx}px,${sy - 18 - easeOut(Math.min(1, k)) * 26}px) translate(-50%,-100%) scale(${k < 0.12 ? 0.6 + k / 0.12 * 0.4 : 1})`;
      f.d.style.opacity = k < 0.1 ? k / 0.1 : k > 0.75 ? Math.max(0, (1 - k) / 0.25) : 1;
      if (k >= 1) { f.d.remove(); floats.splice(i, 1); }
    }
  }
  function big(h, p, color, soft) {
    const el = $('#gtoastIn');
    $('#gtoastH').textContent = h; $('#gtoastP').textContent = p || ''; $('#gtoastH').style.color = color || '#fff';
    el.className = 't' + (soft ? ' soft' : ''); void el.offsetWidth; el.className = 't on' + (soft ? ' soft' : '');
  }
  function tick(min, text) {
    const el = $('#ticker'), d = document.createElement('div');
    d.innerHTML = (min ? `<b>${min}'</b>` : '') + esc(text); el.appendChild(d);
    while (el.children.length > 3) el.firstChild.remove();
    setTimeout(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 700); }, 6500);
  }
  function hud() {
    $('#hSm').textContent = V.shown[0]; $('#hSo').textContent = V.shown[1];
    $('#hClock').textContent = V.ended ? 'Fim' : V.M.min === 45 && V.block ? 'Int.' : V.M.min + "'";
  }
  function pop(id) { const el = $(id); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }

  // ---------- câmera e tamanho ----------
  function fieldFit() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const T = $('#mhud').getBoundingClientRect().bottom - 6, B = h - $('#mbar').getBoundingClientRect().top + 4;
    const aw = w - 10, ah = Math.max(140, h - T - B), s = Math.max(73 / aw, 113 / ah);
    return { D: s * h / (2 * Math.tan(camera.fov * Math.PI / 360)), z: -((T + ah / 2) - h / 2) * s };
  }
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    const px = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360));
    fx.mat.uniforms.uPx.value = px; dust.mat.uniforms.uPx.value = px;
  }
  function star(g, x, y, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
  function setFieldTheme(mode) {
    if (FIELD.cur === mode) return;
    FIELD.cur = mode;
    const th = mode === 'C' ? { bg: '#0b1430', ink: '#e3b04b', ink2: '#f4e2b0', words: ['COPA NACIONAL', 'MATA-MATA'] } : { bg: '#0d4d2b', ink: '#ffd23f', ink2: '#ffffff', words: [mode === 'A' ? 'SÉRIE A' : 'SÉRIE B', 'PRANCHETA'] };
    const [c, g] = cv(2048, 40);
    g.fillStyle = th.bg; g.fillRect(0, 0, 2048, 40);
    g.font = '800 27px ' + FONT; g.textBaseline = 'middle';
    let x = 14, k = 0;
    while (x < 2048) { const w = th.words[k % 2]; g.fillStyle = k % 2 ? th.ink2 : th.ink; g.fillText(w, x, 21); x += g.measureText(w).width + 46; g.fillStyle = th.ink; g.beginPath(); g.arc(x - 23, 20, 3, 0, TAU); g.fill(); k++; }
    const t = tex(c);
    if (!FIELD.boards.length) for (const z of [-59.7, 59.7]) { const m = new THREE.Mesh(planeG(82, 1.6), new THREE.MeshBasicMaterial({ map: t })); m.position.set(0, 0.06, z); scene.add(m); FIELD.boards.push(m); }
    else for (const m of FIELD.boards) { m.material.map = t; m.material.needsUpdate = true; }
    const [c2, g2] = cv(512, 512);
    g2.translate(256, 256);
    g2.strokeStyle = th.ink; g2.lineWidth = 10; g2.beginPath(); g2.arc(0, 0, 236, 0, TAU); g2.stroke();
    g2.lineWidth = 3; g2.beginPath(); g2.arc(0, 0, 200, 0, TAU); g2.stroke();
    g2.font = '900 48px ' + FONT; g2.fillStyle = th.ink; g2.textAlign = 'center'; g2.textBaseline = 'middle';
    const word = th.words[0], step = (Math.PI * 1.05) / word.length;
    for (let i = 0; i < word.length; i++) { const a = -Math.PI / 2 - (Math.PI * 1.05) / 2 + step * (i + 0.5); g2.save(); g2.rotate(a + Math.PI / 2); g2.fillText(word[i], 0, -218); g2.restore(); }
    g2.beginPath(); g2.moveTo(0, -80); g2.lineTo(70, -54); g2.lineTo(64, 20); g2.quadraticCurveTo(46, 70, 0, 90); g2.quadraticCurveTo(-46, 70, -64, 20); g2.lineTo(-70, -54); g2.closePath(); g2.fill();
    g2.fillStyle = th.bg; star(g2, 0, 4, 34);
    g2.fillStyle = th.ink; g2.font = '900 42px ' + FONT; g2.fillText(th.words[1], 0, 150);
    if (!FIELD.decal) { FIELD.decal = new THREE.Mesh(planeG(17, 17), new THREE.MeshBasicMaterial({ map: tex(c2), transparent: true, opacity: 0.2, depthWrite: false })); FIELD.decal.position.y = 0.035; scene.add(FIELD.decal); }
    else { FIELD.decal.material.map = tex(c2); FIELD.decal.material.needsUpdate = true; }
  }

  // =====================================================================
  // DIREÇÃO DE CENA
  // O motor de regras decide os lances; aqui eles viram movimento.
  // Jogadores têm velocidade e aceleração limitadas; a bola tem quatro
  // estados (no pé, rolando, no ar, parada) e nunca muda de lugar sozinha.
  // Os roteiros esperam condições ("até o jogador dominar") em vez de
  // tempos fixos, para que o lance não atropele a física.
  // =====================================================================
  const SPD = { walk: 2, jog: 4.4, run: 6.4, sprint: 8 }, ACC = 10, GOALY = 52.5;
  const dirOf = S => (S === V.my ? 1 : -1);
  const other = S => (S === V.my ? V.op : V.my);
  const sideOf = s => (s === 'h' ? V.M.h : V.M.a);
  const team = S => { const out = []; for (const a of V.acts.values()) if (a.S === S && !a.gone && !a.leaving) out.push(a); return out; };
  const field = S => team(S).filter(a => a.o.role > 0);
  const keeper = S => team(S).find(a => a.o.role === 0);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const near = (list, p) => { let best = null, bd = 1e9; for (const a of list) { const d = dist(a, p); if (d < bd) { bd = d; best = a; } } return best; };
  const live = id => { const a = V.acts.get(id); return a && !a.gone && !a.leaving ? a : null; };
  const owns = S => V.ball.mode === 'held' && V.ball.owner && V.ball.owner.S === S;
  const step = (fn, after = 0) => ({ fn, after });
  const until = (cond, max, fn, after = 0, extra) => Object.assign({ until: cond, max, fn, after }, extra);
  const inBox = (a, b) => a.o.role === 0 && Math.abs(b.x) < 20 && b.y * a.dir < -36;

  function homeOf(a) {
    const sp = a.S.c.spots[a.o.i] || { x: 50, y: 50 };
    return { x: (sp.x - 50) * 0.62 * a.dir, y: (22 - sp.y * 0.78) * a.dir };
  }
  function addActor(S, o, enter) {
    const a = { o, S, dir: dirOf(S), x: 0, y: 0, vx: 0, vy: 0, face: 0, kick: 0, jump: 0, dive: 0, diveExt: 0, diveDir: 1, slide: 0, cele: 0, gone: false, leaving: false, go: null, recv: null, holdT: 1 };
    const h = homeOf(a); a.bx = h.x; a.by = h.y;
    if (enter) { a.x = -36; a.y = rnd(-4, 4); } else { a.x = a.bx; a.y = a.by; }
    a.face = a.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    a.fig = new Fig(o.p, V.kits[S === V.my ? 0 : 1], o.role === 0, o.role === 0 ? 1 : S.on.indexOf(o) + 1);
    a.fig.x = a.x; a.fig.y = a.y; a.fig.face = a.face; a.fig.sc = enter ? 2 : 3.1;
    V.acts.set(o.p.id, a);
    if (enter) ring(a.x, a.y, '#ffffff', 2, 6, 0.5);
    return a;
  }
  function leave(a, spd) {
    a.leaving = true; a.recv = null; a.go = { x: a.x < 0 ? -37 : 37, y: a.y, spd };
    if (V.ball.owner === a) loose(0, 0);
  }
  function syncActors() {
    for (const S of [V.my, V.op]) for (const o of S.on) {
      const a = V.acts.get(o.p.id);
      if (!a && !o.out) addActor(S, o, true);
      else if (a && o.out && !a.leaving && !a.gone) leave(a, o.red || o.hurt ? SPD.walk : SPD.jog);
    }
  }

  // ---------- bola ----------
  function give(a) { const b = V.ball; b.owner = a; b.mode = 'held'; b.done = null; b.intended = null; V.poss = a.S; a.recv = null; a.holdT = rnd(0.7, 1.6); if (V.want === a.S) V.want = null; }
  function loose(vx, vy) { const b = V.ball; b.owner = null; b.mode = 'roll'; b.done = null; b.vx = vx; b.vy = vy; }
  function dead() { const b = V.ball; b.owner = null; b.mode = 'dead'; b.done = null; b.vx = b.vy = 0; }
  function place(x, y) { const b = V.ball; dead(); if (Math.hypot(b.x - x, b.y - y) > 0.5) b.pop = true; b.x = x; b.y = y; b.z = 0; }
  function fly(tx, ty, T, h, done, z0 = 0, z1 = 0, keep = 0.35) {
    const b = V.ball; b.owner = null; b.mode = 'air'; b.sx = b.x; b.sy = b.y; b.ex = tx; b.ey = ty; b.T = Math.max(0.08, T); b.t = 0; b.h = h; b.z0 = z0; b.z1 = z1; b.keep = keep; b.done = done || null;
    b.vx = (tx - b.x) / b.T; b.vy = (ty - b.y) / b.T;
  }
  function strike(a, power, tx, ty) { a.kick = 0.3; a.face = Math.atan2(ty - a.y, tx - a.x); V.ball.kicker = a; V.ball.kickT = 0.35; SFX.kick(power); }
  function pass(o, to, opt = {}) {
    const b = V.ball;
    let tx = opt.x != null ? opt.x : to.x + to.vx * 0.55, ty = opt.y != null ? opt.y : to.y + to.vy * 0.55;
    const far = Math.hypot(tx - to.x, ty - to.y);
    if (far > 16) { tx = to.x + (tx - to.x) * 16 / far; ty = to.y + (ty - to.y) * 16 / far; }
    tx = clamp(tx, -33, 33); ty = clamp(ty, -51, 51);
    const L = Math.hypot(tx - b.x, ty - b.y), lofted = opt.h != null ? opt.h > 1 : L > 27;
    // a bola chega quando o receptor chega: passe mais lento se ele estiver longe do ponto
    const spd = opt.spd || (Math.hypot(tx - to.x, ty - to.y) > 6 ? SPD.sprint : SPD.run);
    const eta = Math.hypot(tx - to.x, ty - to.y) / spd + 0.15;
    const T = clamp(Math.max(L / (lofted ? 20 : 16), eta), 0.3, 2.8);
    strike(o, Math.min(1, L / 30), tx, ty);
    to.recv = { x: tx, y: ty, spd }; b.intended = to;
    fly(tx, ty, T, opt.h != null ? opt.h : lofted ? clamp(L / 7, 2.5, 7) : 0.1, () => {
      to.recv = null;
      if (!to.gone && !to.leaving && dist(to, V.ball) < 2.8) give(to);
    }, 0, 0, 0.3);
    if (lofted && opt.h == null) b.h = clamp(T * T * 1.2, 1.5, 7);
  }
  function choosePass(o) {
    const d = o.dir, opp = field(other(o.S));
    return wpick(field(o.S).filter(a => a !== o), a => {
      const L = dist(a, o); if (L < 6 || L > 38) return 0.01;
      const fwd = (a.y - o.y) * d, free = opp.length ? Math.min(...opp.map(p => dist(p, a))) : 9;
      return (a.y * d > 28 ? 0.15 : 1) * (fwd > 0 ? 1.6 : fwd > -8 ? 1 : 0.45) * clamp(free / 6, 0.25, 1.4) / (1 + Math.abs(L - 15) / 12);
    });
  }
  function tackle(t) {
    const b = V.ball;
    t.slide = 0.45; burst(b.x, b.y, ['#ffd27a', '#ffffff'], 12, 9, 0.45, 0.35, 0.4);
    if (R() < 0.35) flt(t.x, t.y, 'Desarme', t.S === V.my ? 'amber' : '');
    give(t);
  }
  function forceGive(A) {
    const b = V.ball, m = near(field(A), b); if (!m) return;
    if (b.mode === 'held' && b.owner && b.owner.S !== A) {
      if (dist(m, b) < 4) return tackle(m);
      // passe errado do adversário, que sobra para quem estava por perto
      const o = b.owner, L = dist(m, b); strike(o, 0.5, m.x, m.y); b.intended = m;
      fly(m.x + m.vx * 0.3, m.y + m.vy * 0.3, clamp(L / 16, 0.3, 1.6), L > 25 ? 3 : 0.15, () => { if (dist(m, V.ball) < 2.8) give(m); });
    } else if (b.mode !== 'air') give(m);
  }
  function updBall(dt) {
    const b = V.ball;
    b.kickT = Math.max(0, (b.kickT || 0) - dt);
    if (b.mode === 'held') {
      const o = b.owner;
      if (!o || o.gone || o.leaving) { loose(0, 0); return; }
      const fx = o.x + Math.cos(o.face) * 0.75, fy = o.y + Math.sin(o.face) * 0.75, px = b.x, py = b.y;
      const dx = fx - b.x, dy = fy - b.y, dd = Math.hypot(dx, dy);
      if (dd > 2.5) { const s = Math.min(dd, 22 * dt) / dd; b.x += dx * s; b.y += dy * s; }
      else { const k = 1 - Math.exp(-16 * dt); b.x += dx * k; b.y += dy * k; }
      b.z = Math.max(0, b.z - 8 * dt);
      b.vx = (b.x - px) / dt; b.vy = (b.y - py) / dt; b.rot += Math.hypot(b.x - px, b.y - py) * 3.3;
    } else if (b.mode === 'air') {
      b.t += dt; const k = Math.min(1, b.t / b.T);
      b.x = lerp(b.sx, b.ex, k); b.y = lerp(b.sy, b.ey, k); b.z = b.h * 4 * k * (1 - k) + lerp(b.z0, b.z1, k);
      b.vx = (b.ex - b.sx) / b.T; b.vy = (b.ey - b.sy) / b.T; b.rot += 12 * dt;
      if (k >= 1) { const f = b.done; loose(b.vx * b.keep, b.vy * b.keep); if (f) f(); }
    } else if (b.mode === 'roll') {
      const fr = Math.exp(-1.7 * dt); b.vx *= fr; b.vy *= fr;
      b.x += b.vx * dt; b.y += b.vy * dt; b.z = Math.max(0, b.z - 9 * dt); b.rot += Math.hypot(b.vx, b.vy) * dt * 3.3;
      if (Math.abs(b.x) > 33.8) { b.x = Math.sign(b.x) * 33.8; b.vx *= -0.3; }
      if (Math.abs(b.y) > 51.8) { b.y = Math.sign(b.y) * 51.8; b.vy *= -0.3; }
    } else { b.vx = 0; b.vy = 0; b.z = Math.max(0, b.z - 9 * dt); }
  }

  // ---------- jogadores ----------
  function targetOf(a) {
    const b = V.ball, d = a.dir;
    if (a.go) return a.go.follow ? { x: a.go.follow.x, y: a.go.follow.y, spd: a.go.spd } : a.go;
    if (a.recv) return a.recv;
    if (a.o.role === 0) {
      if (b.owner === a) return { x: a.x, y: a.y, spd: SPD.walk };
      const t = clamp((b.y * d + GOALY) / 105, 0, 1);
      return { x: clamp(b.x * 0.15, -3, 3), y: (-GOALY + 1.2 + t * 5.5) * d, spd: SPD.jog };
    }
    const att = V.poss === a.S, by = V.zoneY != null ? V.zoneY : clamp(b.y, -42, 42);
    const x = a.bx * (att ? 1.08 : 0.8) + (b.x - a.bx) * (att ? 0.1 : 0.26);
    let y = a.by + by * 0.55 + (att ? 5 : -5) * d;
    if (a.o.role === 1) y = d > 0 ? Math.min(y, 14) : Math.max(y, -14);
    if (a.o.role === 3) y = d > 0 ? Math.max(y, -30) : Math.min(y, 30);
    if (!att && a.o.role === 1 && (y - b.y) * d > -3) y = b.y - 3 * d;
    return { x: clamp(x, -32, 32), y: clamp(y, -50, 50), spd: att ? SPD.jog : SPD.run };
  }
  function dribble(a) {
    const d = a.dir, cap = V.scene ? 44 : 24;
    let y = a.y + 6 * d; if (y * d > cap) y = cap * d;
    return { x: a.x * 0.96, y, spd: SPD.jog * 0.9 };
  }
  function press(a) {
    const b = V.ball;
    if (V.want === a.S) return { x: b.x, y: b.y, spd: SPD.sprint };
    return { x: b.x * 0.92, y: b.y - 2.6 * a.dir, spd: SPD.run };
  }
  function steer(a, t, dt) {
    const dx = t.x - a.x, dy = t.y - a.y, d = Math.hypot(dx, dy);
    const want = Math.min(t.spd || SPD.jog, d * 1.6), acc = a.dive > 0 ? 40 : ACC;
    const wx = d > 0.02 ? dx / d * want : 0, wy = d > 0.02 ? dy / d * want : 0;
    const ex = wx - a.vx, ey = wy - a.vy, e = Math.hypot(ex, ey), k = e > 1e-6 ? Math.min(1, acc * dt / e) : 0;
    a.vx += ex * k; a.vy += ey * k;
    a.x += a.vx * dt; a.y += a.vy * dt;
    const sp = Math.hypot(a.vx, a.vy), b = V.ball;
    let f = null;
    if (a.kick > 0 || a.dive > 0) f = null;
    else if (sp > 0.9) f = Math.atan2(a.vy, a.vx);
    else if (b.owner === a) f = a.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    else f = Math.atan2(b.y - a.y, b.x - a.x);
    if (f != null) { let df = f - a.face; while (df > Math.PI) df -= TAU; while (df < -Math.PI) df += TAU; a.face += df * Math.min(1, dt * 9); }
  }
  function separate(list) {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], c = list[j], dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy);
      if (d > 0.001 && d < 1.15) { const p = (1.15 - d) / 2 / d; a.x -= dx * p; a.y -= dy * p; c.x += dx * p; c.y += dy * p; }
    }
  }
  function carrierAI(o, dt) {
    if (o.go) return;
    o.holdT -= dt; if (o.holdT > 0) return;
    const t = o.o.role === 0 ? wpick(field(o.S), a => (a.o.role === 1 ? 2 : a.o.role === 2 ? 1.2 : 0.3) / (1 + dist(a, o) / 30)) : choosePass(o);
    if (t) pass(o, t); else o.holdT = 0.6;
  }
  function simulate(dt) {
    const b = V.ball, acts = [];
    for (const a of V.acts.values()) if (!a.gone) acts.push(a);
    let presser = null; const chasers = [];
    if (b.mode === 'held' && b.owner) presser = near(field(other(b.owner.S)).filter(a => !a.go && !a.recv), b);
    else if (b.mode === 'roll') for (const S of [V.my, V.op]) {
      const it = b.intended && b.intended.S === S && !b.intended.gone && !b.intended.leaving ? b.intended : null;
      if (V.att && S !== V.att) continue;
      const c = it || near(team(S).filter(a => !a.go && (a.o.role > 0 || inBox(a, b))), b); if (c) chasers.push(c);
    }
    for (const a of acts) {
      let t = targetOf(a);
      if (b.mode === 'roll' && a === b.intended) t = { x: b.x + b.vx * 0.25, y: b.y + b.vy * 0.25, spd: SPD.sprint };
      else if (!a.go && !a.recv) {
        if (b.owner === a && a.o.role > 0) t = dribble(a);
        else if (a === presser) t = press(a);
        else if (chasers.includes(a)) t = { x: b.x + b.vx * 0.25, y: b.y + b.vy * 0.25, spd: a.S === V.poss || a.S === V.want ? SPD.sprint : SPD.run };
      }
      steer(a, t, dt);
      a.kick = Math.max(0, a.kick - dt); a.jump = Math.max(0, a.jump - dt); a.slide = Math.max(0, a.slide - dt);
      if (a.dive > 0) { a.dive -= dt; a.diveExt = Math.min(1.2, a.diveExt + dt * 4.5); } else a.diveExt = Math.max(0, a.diveExt - dt * 1.5);
      if (a.cele > 0) a.cele = Math.max(0, a.cele - dt);
      if (a.go && a.go.tmp && dist(a, a.go) < 0.6) a.go = null;
      if (a.leaving && Math.abs(a.x) > 35.5) { a.gone = true; a.fig.visible = false; }
    }
    separate(acts.filter(a => !a.leaving && a.dive <= 0));
    if (presser && V.want === presser.S && b.owner && dist(presser, b.owner) < 1.45) tackle(presser);
    if (b.mode === 'roll' && b.z < 1) {
      let best = null, bd = 1.3;
      for (const a of acts) { if (a.leaving || (a === b.kicker && b.kickT > 0) || (V.att && a.S !== V.att)) continue; const d = dist(a, b); if (d < bd) { bd = d; best = a; } }
      if (best) give(best);
    }
    if (b.mode === 'held' && b.owner && !V.scene) carrierAI(b.owner, dt);
    updBall(dt);
  }

  // ---------- roteiros ----------
  function endScene() { V.scene = false; V.zoneY = null; V.att = null; for (const a of V.acts.values()) if (!a.leaving) a.go = null; }
  function kickTaker(S) { const l = field(S); return near(l.filter(a => a.o.role === 3), { x: 0, y: 0 }) || near(l, { x: 0, y: 0 }); }
  function kickoff(S) {
    const d = dirOf(S);
    return [
      step(() => {
        V.scene = true; V.want = null; V.poss = S; V.zoneY = 0;
        for (const a of V.acts.values()) if (!a.gone && !a.leaving) { const y = a.o.role === 0 ? a.by : a.dir > 0 ? Math.min(a.by, -1.5) : Math.max(a.by, 1.5); a.go = { x: a.bx, y, spd: clamp(Math.hypot(a.bx - a.x, y - a.y) / 3.5, SPD.run, SPD.sprint) }; a.recv = null; }
        const tk = kickTaker(S); if (tk) tk.go = { x: 0, y: -0.8 * d, spd: SPD.jog };
        place(0, 0);
      }),
      until(() => { for (const a of V.acts.values()) if (!a.gone && !a.leaving && a.go && dist(a, a.go) > 2.5) return false; return true; }, 6, null, 0.5, { soft: 1 }),
      step(() => {
        SFX.whistle(1); ring(0, 0, '#ffffff', 2, 10, 0.6);
        const tk = kickTaker(S); endScene();
        if (!tk) return;
        give(tk); const m = near(field(S).filter(a => a !== tk && a.o.role === 2), { x: 0, y: -10 * d });
        if (m) pass(tk, m);
      })
    ];
  }
  function goalKick(D) {
    const d = dirOf(D), g = keeper(D), x = rnd(-6, 6), y = (-GOALY + 5.5) * d;
    return [
      step(() => { place(x, y); V.scene = true; V.poss = D; if (g) g.go = { x, y: y - 1.1 * d, spd: SPD.jog }; }),
      until(() => !g || dist(g, { x, y: y - 1.1 * d }) < 1.2, 3.5, null, 0.4),
      step(() => {
        endScene(); if (!g) return;
        give(g); const t = wpick(field(D), a => (a.o.role >= 2 ? 1 : 0.35));
        if (t) pass(g, t, { h: 6 });
      })
    ];
  }
  function goalFX(e, A, tx, dir) {
    const my = A === V.my, col = V.kits[my ? 0 : 1].shirt, gy = GOALY * dir, g = dir > 0 ? goals.top : goals.bot;
    V.shown[my ? 0 : 1]++; hud(); pop(my ? '#hSm' : '#hSo');
    g.flash.material.color.set(col); g.flashT = 1; g.netKick = 1;
    burst(tx, gy, [col, '#ffffff', '#ffd23f'], 170, 30, 1.2, 1.1, 0.9);
    for (let i = 0; i < 3; i++) ring(tx, gy, i === 1 ? '#ffffff' : col, 2, 22 + i * 7, 0.9 + i * 0.15, i * 0.12);
    if (my) confetti(tx, gy - 2 * dir, [col, '#ffffff', '#ffd23f', '#3ee8d0'], 170, 28);
    V.shake = Math.max(V.shake, reduceMotion ? 0.3 : 1.2); V.mood = 3;
    HAP.goal(my);
    big('Gol!', `${e.n}, ${e.m}'`, my ? '#ffffff' : col);
    tick(e.m, '⚽ ' + e.x);
    SFX.goal(my, V.home);
    for (const a of team(A)) a.cele = 2.8;
  }
  function celebrate(sh, A, D, d) {
    const cx = (sh.x >= 0 ? 1 : -1) * 27, cy = (GOALY - 5) * d;
    sh.go = { x: cx, y: cy, spd: SPD.sprint };
    for (const a of field(A)) if (a !== sh) a.go = a.y * d > 5 ? { x: cx * 0.85 + rnd(-4, 4), y: cy - rnd(3, 9) * d, spd: SPD.run } : { x: a.x, y: a.y + 5 * d, spd: SPD.walk };
    for (const a of team(D)) a.go = { x: a.bx, y: a.by, spd: SPD.walk };
  }
  function shoot(e, sh, A, D, d, hz) {
    const b = V.ball, gy = GOALY * d, gk = keeper(D), side = R() < 0.5 ? -1 : 1, mine = A === V.my, st = [];
    if (!hz && b.mode !== 'dead' && b.owner !== sh && dist(sh, b) < 4) give(sh);
    if (hz) { sh.jump = 0.55; SFX.kick(0.6); } else strike(sh, 1, 0, gy);
    sh.go = { x: sh.x + sh.vx * 0.4, y: sh.y + sh.vy * 0.4, spd: SPD.walk };
    const L = Math.hypot(b.x, gy - b.y), T = clamp(L / 27, 0.22, 0.8), z0 = hz ? Math.max(b.z, 1.6) : 0;
    const dive = (s, x) => { if (!gk) return; gk.dive = 0.8; gk.diveDir = s; gk.go = { x, y: gy - 1 * d, spd: 9 }; };
    if (e.t === 'gol') {
      const tx = side * rnd(0.7, 3.2), ds = R() < 0.55 ? -side : side;
      dive(ds, ds * rnd(1.2, 2.4));
      fly(tx, gy + 1.4 * d, T, hz ? 0.3 : rnd(0.1, 0.9), () => { dead(); goalFX(e, A, tx, d); }, z0, rnd(0.2, 1.7));
      st.push(until(() => V.ball.mode === 'dead', 2, null, 0.5));
      st.push(step(() => celebrate(sh, A, D, d), 3.3));
      st.push(step(() => { V.q.unshift(...kickoff(D)); }));
    } else if (e.t === 'def') {
      const tx = side * rnd(0.3, 2.7), catchIt = R() < 0.65 || e.k === 'pen';
      dive(side, tx * 0.95);
      fly(tx, gy - 0.9 * d, T, hz ? 0.3 : rnd(0.1, 0.7), () => {
        const bb = V.ball;
        ring(bb.x, bb.y, '#cfe6ff', 1, 5, 0.45); burst(bb.x, bb.y, ['#9fd1ff', '#ffffff'], 22, 12, 0.6, 0.45, 0.5);
        flt(bb.x, bb.y, catchIt ? 'Defesa!' : 'Espalmou!', mine ? 'cool' : 'amber'); V.shake = Math.max(V.shake, 0.3); V.mood = 1;
        if (mine === V.home) SFX.ooh(1); else SFX.cheer(0.4);
        tick(e.m, e.x);
        if (catchIt && gk) { give(gk); gk.holdT = 1.8; } else loose(side * rnd(5, 9), -d * rnd(2, 6));
      }, z0, rnd(0.3, 1.4));
      st.push(until(() => V.ball.mode !== 'air', 2, null, 1.1));
    } else if (e.t === 'trave') {
      dive(side, side * 1.8);
      fly(side * 3.66, gy, T, rnd(0.1, 0.6), () => {
        const bb = V.ball;
        burst(bb.x, bb.y, ['#ffffff', '#ffd27a'], 26, 14, 0.6, 0.5, 0.6, 18, 1.5); flt(bb.x, bb.y, 'Na trave!', 'amber'); V.shake = Math.max(V.shake, 0.4); V.mood = 1;
        SFX.post(); SFX.ooh(1); tick(e.m, e.x);
        loose(-side * rnd(2, 6), -d * rnd(8, 13));
      }, z0, rnd(0.6, 2.3));
      st.push(until(() => V.ball.mode !== 'air', 2, null, 1.2));
    } else {
      const blk = !hz && e.k !== 'pen' && e.k !== 'falta' && R() < 0.3 ? near(field(D), { x: b.x * 0.7, y: b.y + (gy - b.y) * 0.3 }) : null;
      if (blk) {
        const lx = lerp(b.x, 0, 0.25), ly = b.y + (gy - b.y) * 0.22;
        blk.go = { x: lx, y: ly, spd: SPD.sprint, tmp: 1 }; blk.slide = 0.5;
        fly(lx, ly, T * 0.35, 0.15, () => { flt(lx, ly, 'Bloqueio', ''); burst(lx, ly, ['#ffd27a', '#ffffff'], 12, 9, 0.45, 0.35, 0.4); tick(e.m, e.x); loose(side * rnd(5, 10), -d * rnd(2, 6)); });
        st.push(until(() => V.ball.mode !== 'air', 1.5, null, 1.0));
      } else {
        dive(side, side * 1.4);
        fly(side * rnd(4.6, 9), (GOALY + 2.5) * d, T * 1.15, hz ? 0.4 : rnd(0.2, 1.4), () => { dead(); if (mine === V.home) SFX.ooh(0.6); tick(e.m, e.x); }, z0, rnd(0.6, 4.5));
        st.push(until(() => V.ball.mode === 'dead', 2, null, 1.0));
        st.push(step(() => { V.q.unshift(...goalKick(D)); }));
      }
    }
    return st;
  }
  function chanceScene(e) {
    const A = sideOf(e.s), D = other(A), d = dirOf(A), k = e.k, mine = A === V.my, fw = field(A);
    const sh = live(e.pid) || fw.slice().sort((p, q) => (q.y - p.y) * d)[0];
    if (!sh) return [step(() => { tick(e.m, e.x); if (e.t === 'gol') { V.shown[mine ? 0 : 1]++; hud(); } })];
    let as = live(e.aid);
    if (!as || as === sh || as.o.role === 0) as = fw.filter(a => a !== sh && a.o.role >= 2).sort((p, q) => dist(p, sh) - dist(q, sh))[0] || null;
    const side = R() < 0.5 ? -1 : 1, st = [];
    let hz = 0;
    // 1) o time do lance precisa estar com a bola: desarme, sobra ou domínio
    st.push(step(() => { V.scene = true; V.mood = Math.max(V.mood, 0.6); if (!owns(A)) V.want = A; }));
    st.push(until(() => owns(A), 4, () => { if (!owns(A)) forceGive(A); V.want = null; }, 0, { soft: 1 }));
    st.push(until(() => owns(A), 2.5, () => { V.att = A; if (!owns(A) && V.ball.mode !== 'air') forceGive(A); }));
    // passe para quem está chegando, esperando o domínio
    const relay = (recv, opt) => {
      st.push(until(() => V.ball.mode !== 'air', 2.5, () => {
        if (recv.gone || V.ball.owner === recv) return;
        if (!owns(A)) forceGive(A);
        const o = V.ball.owner; if (o && o !== recv) pass(o, recv, typeof opt === 'function' ? opt() : opt || {});
      }));
      st.push(until(() => V.ball.owner === recv || recv.gone || recv.leaving, 4.5, () => { if (V.ball.owner !== recv && V.ball.mode !== 'air' && !recv.gone) give(recv); }, 0, { info: () => `mode=${V.ball.mode} own=${V.ball.owner ? (V.ball.owner.S === A ? 'A' : 'D') + V.ball.owner.o.code : '-'} d=${Math.round(dist(recv, V.ball))} go=${!!recv.go} int=${V.ball.intended === recv}` }));
    };
    if (k === 'pen') {
      const sx = side * rnd(2, 9), spot = { x: sx, y: 40 * d };
      st.push(step(() => { V.zoneY = 26 * d; const o = V.ball.owner; if (o) o.go = { x: sx, y: 40 * d, spd: SPD.run }; const f = near(field(D), spot); if (f) { f.go = { follow: o || sh, spd: SPD.sprint }; V.fouler = f; } }));
      st.push(until(() => { const o = V.ball.owner; return !o || (o.y * d > 36 && V.fouler && dist(o, V.fouler) < 1.8); }, 3.2, () => {
        const o = V.ball.owner, f = V.fouler; V.fouler = null;
        if (f) { f.slide = 0.55; f.go = null; } if (o) { o.slide = 0.8; o.go = null; }
        dead(); SFX.whistle(1, true); setTimeout(() => SFX.ooh(0.8), 300); big('Pênalti!', mine ? 'A favor' : 'Contra', '#ffd23f', true);
      }, 1.5, { soft: 1 }));
      st.push(step(() => {
        place(0, (GOALY - 11) * d);
        for (const a of [...field(A), ...field(D)]) if (a !== sh) a.go = { x: clamp(a.x, -26, 26), y: rnd(29, 34) * d, spd: SPD.jog };
        sh.go = { x: -side * 0.7, y: (GOALY - 13.6) * d, spd: SPD.run };
        const g = keeper(D); if (g) g.go = { x: 0, y: (GOALY - 0.5) * d, spd: SPD.jog };
      }));
      st.push(until(() => !sh.go || dist(sh, sh.go) < 0.8, 6, null, 1.0));
      st.push(step(() => { sh.go = { x: 0, y: (GOALY - 11.7) * d, spd: SPD.jog }; }));
      st.push(until(() => dist(sh, V.ball) < 1.1, 2, null));
    } else if (k === 'falta') {
      const px = side * rnd(3, 14), py = rnd(24, 29) * d, spot = { x: px, y: py };
      st.push(step(() => { V.zoneY = 18 * d; const o = V.ball.owner; if (o) o.go = { x: px, y: py, spd: SPD.run }; const f = near(field(D), spot); if (f) { f.go = { follow: o || sh, spd: SPD.sprint }; V.fouler = f; } }));
      st.push(until(() => { const o = V.ball.owner; return !o || (dist(o, spot) < 3 && V.fouler && dist(o, V.fouler) < 1.8); }, 3, () => {
        const o = V.ball.owner, f = V.fouler; V.fouler = null;
        if (f) { f.slide = 0.5; f.go = null; } if (o) { o.slide = 0.7; o.go = null; }
        dead(); SFX.whistle(1); ring(V.ball.x, V.ball.y, '#ffffff', 1, 4, 0.4); flt(V.ball.x, V.ball.y, 'Falta', '');
      }, 1.2, { soft: 1 }));
      st.push(step(() => {
        const bb = V.ball, fx_ = clamp(bb.x, -16, 16), fy = d > 0 ? clamp(bb.y, 22, 32) : clamp(bb.y, -32, -22);
        place(fx_, fy); V.fk = { x: fx_, y: fy };
        const gy = GOALY * d, L = Math.hypot(fx_, gy - fy), wx = fx_ - fx_ * 9.15 / L, wy = fy + (gy - fy) * 9.15 / L;
        field(D).sort((p, q) => Math.hypot(p.x - wx, p.y - wy) - Math.hypot(q.x - wx, q.y - wy)).slice(0, 3).forEach((a, i) => { a.go = { x: wx + (i - 1) * 0.9, y: wy, spd: SPD.run }; });
        sh.go = { x: fx_ - side * 0.5, y: fy - 2.8 * d, spd: SPD.run };
        flt(fx_, fy, 'Falta perigosa', 'amber');
      }));
      st.push(until(() => !sh.go || dist(sh, sh.go) < 0.8, 6, null, 0.8));
      st.push(step(() => { sh.go = { x: V.fk.x, y: V.fk.y - 0.8 * d, spd: SPD.jog }; }));
      st.push(until(() => dist(sh, V.ball) < 1.1, 2, null));
    } else if (k === 'esc') {
      const cx = 33.6 * side, cy = (GOALY - 0.3) * d, hx = rnd(-5, 5), hy = (GOALY - rnd(6, 10)) * d;
      const taker = near(fw.filter(a => a !== sh), { x: cx, y: cy }) || sh;
      hz = 1.9;
      st.push(step(() => { V.zoneY = 30 * d; const o = V.ball.owner; if (o) o.go = { x: side * 22, y: 37 * d, spd: SPD.run }; }));
      st.push(until(() => { const o = V.ball.owner; return !o || o.y * d > 31; }, 4, () => {
        const o = V.ball.owner, blk = near(field(D), V.ball);
        if (blk) { blk.slide = 0.45; blk.go = { x: V.ball.x, y: V.ball.y + 1.5 * d, spd: SPD.sprint, tmp: 1 }; }
        if (o) { strike(o, 0.6, side * 30, GOALY * d); o.go = null; }
        fly(side * rnd(14, 26), (GOALY + 2.5) * d, 0.6, 0.8, () => dead(), 0, 0, 0);
      }, 0, { soft: 1 }));
      st.push(until(() => V.ball.mode === 'dead', 2, () => {
        SFX.whistle(1); flt(cx * 0.9, cy * 0.94, 'Escanteio', ''); SFX.ooh(0.35);
        taker.go = { x: cx - side * 0.9, y: cy - 1.3 * d, spd: SPD.sprint };
        sh.go = { x: hx + side * rnd(3, 6), y: hy - 5 * d, spd: SPD.jog };
        fw.filter(a => a !== taker && a !== sh && a.o.role >= 2).slice(0, 3).forEach(a => { a.go = { x: rnd(-9, 9), y: (GOALY - rnd(6, 15)) * d, spd: SPD.jog }; });
        field(D).sort((p, q) => (q.y - p.y) * d).slice(0, 6).forEach(a => { a.go = { x: rnd(-9, 9), y: (GOALY - rnd(3, 12)) * d, spd: SPD.jog }; });
        const g = keeper(D); if (g) g.go = { x: 0, y: (GOALY - 0.8) * d, spd: SPD.jog };
      }, 0.5));
      st.push(step(() => place(cx, cy)));
      st.push(until(() => !taker.go || dist(taker, taker.go) < 1, 6, null, 0.6));
      st.push(step(() => { sh.go = { x: hx, y: hy, spd: SPD.sprint }; give(taker); strike(taker, 0.8, hx, hy); fly(hx, hy, 0.95, 5.5, null, 0, 1.9, 0); }));
      st.push(until(() => V.ball.mode !== 'air', 1.5, null));
    } else {
      const far = k === 'longe', fast = k === 'contra';
      const tx = side * rnd(far ? 0 : 3, far ? 10 : 10), ty = (far ? rnd(21, 26) : fast ? rnd(26, 31) : rnd(36, 42)) * d;
      if (fast) {
        st.push(step(() => { V.zoneY = 0; sh.go = { x: tx, y: ty, spd: SPD.sprint }; }, 0.3));
        relay(sh, () => ({ x: tx, y: ty, h: 3.5 }));
        st.push(step(() => { sh.go = { x: tx * 0.5, y: rnd(37, 41) * d, spd: SPD.sprint }; }));
        st.push(until(() => sh.y * d > 35, 1.8, null, 0, { soft: 1 }));
      } else {
        const ax = as ? lerp(as.x, side * rnd(8, 18), 0.5) : side * rnd(8, 18), ay = (as ? clamp(as.y * d + 9, 14, 25) : rnd(17, 25)) * d;
        st.push(step(() => { V.zoneY = (far ? 16 : 24) * d; if (as) as.go = { x: ax, y: ay, spd: SPD.run }; sh.go = { x: tx * 0.6, y: ty - (far ? 3 : 9) * d, spd: SPD.run }; }));
        if (as) { st.push(until(() => dist(as, { x: ax, y: ay }) < 9, 3, null, 0, { soft: 1 })); relay(as, { x: ax, y: ay }); }
        st.push(step(() => { sh.go = { x: tx, y: ty, spd: far ? SPD.run : SPD.sprint }; }, 0.3));
        relay(sh, () => ({ x: tx, y: ty }));
        st.push(step(() => { sh.go = { x: tx * 0.85, y: ty + 2 * d, spd: SPD.jog }; }, far ? 0.4 : 0.25));
      }
    }
    st.push(step(() => { V.q.unshift(...shoot(e, sh, A, D, d, hz)); }));
    return st;
  }
  function cardScene(e) {
    const a = live(e.pid), red = e.t === 'red';
    if (!a) return [step(() => { tick(e.m, (red ? '🟥 ' : '🟨 ') + e.x); syncActors(); })];
    const b = V.ball, vict = b.owner && b.owner.S !== a.S && dist(a, b.owner) < 18 ? b.owner : near(field(other(a.S)), a);
    return [
      step(() => { V.scene = true; if (vict) a.go = { follow: vict, spd: SPD.sprint }; }),
      until(() => !vict || dist(a, vict) < 1.5, 3.2, () => {
        V.dbg.card = (V.dbg.card || 0) + 1;
        a.go = { x: a.x, y: a.y, spd: SPD.walk }; a.slide = 0.5; if (vict) { vict.slide = 0.7; vict.go = { x: vict.x, y: vict.y, spd: SPD.walk }; }
        SFX.whistle(1); ring(a.x, a.y, '#ffffff', 1, 4, 0.4); flt(a.x, a.y, red ? 'Expulso!' : 'Amarelo', red ? '' : 'amber'); tick(e.m, (red ? '🟥 ' : '🟨 ') + e.x);
        if ((a.S === V.my) === V.home) SFX.boo(); else if (red) SFX.cheer(0.6);
        if (red) big('Vermelho', last(a.o.p.n), '#ff6f66', true);
        if (V.ball.mode !== 'air') dead();
      }, 1.4, { soft: 1 }),
      step(() => {
        if (red) leave(a, SPD.walk);
        const v = vict && !vict.gone && !vict.leaving ? vict : near(field(other(a.S)), V.ball);
        endScene(); if (v) { give(v); v.holdT = 0.6; }
      })
    ];
  }
  function injScene(e) {
    const a = live(e.pid);
    return [
      step(() => { V.scene = true; if (a) { a.slide = 2.2; a.go = { x: a.x, y: a.y, spd: 0.2 }; flt(a.x, a.y, 'Lesão', ''); if (V.ball.owner === a) dead(); } tick(e.m, '🩹 ' + e.x); }, 1.7),
      step(() => { if (V.M.pend) { V.block = true; injSheet(); } else syncActors(); })
    ];
  }
  function handle(e) {
    const lazy = f => V.q.push(step(() => { V.q.unshift(...f(e)); }));
    if (e.t === 'gol' || e.t === 'def' || e.t === 'fora' || e.t === 'trave') lazy(chanceScene);
    else if (e.t === 'ya' || e.t === 'red') lazy(cardScene);
    else if (e.t === 'inj') lazy(injScene);
    else if (e.t === 'sub') V.q.push(step(() => { tick(e.m, '🔁 ' + e.x); syncActors(); }, 0.4));
    else if (e.t === 'ht') V.q.push(step(() => {
      SFX.whistle(2, true); big('Intervalo', `${V.shown[0]} × ${V.shown[1]}`, '#fff', true); tick(null, 'Fim do primeiro tempo');
      if (V.ball.mode !== 'air') dead(); V.scene = true;
      for (const a of V.acts.values()) if (!a.gone && !a.leaving) a.go = { x: a.x * 0.9, y: a.y * 0.9, spd: SPD.walk };
    }, 1.8), step(() => { V.block = true; V.half = true; hud(); halfSheet(); }));
    else if (e.t === 'ft') V.q.push(step(() => {
      SFX.whistle(3, true); const p = V.M.pso; V.ended = true; hud(); V.scene = true; if (V.ball.mode !== 'air') dead();
      for (const a of V.acts.values()) if (!a.gone && !a.leaving) a.go = { x: a.x, y: a.y, spd: SPD.walk };
      big(p ? 'Pênaltis' : 'Fim de jogo', p ? `${V.my.home ? p.sc[0] : p.sc[1]} × ${V.my.home ? p.sc[1] : p.sc[0]}` : `${V.shown[0]} × ${V.shown[1]}`, '#fff', true);
    }, 2.1), step(() => endMatchUI()));
  }
  function engineStep() {
    const M = V.M;
    if (M.pend) { V.block = true; injSheet(); return; }
    stepMinute(M);
    const news = M.ev.slice(V.seen); V.seen = M.ev.length;
    hud();
    for (const e of news) handle(e);
    if (!V.q.length && M.min % 4 === 0) { const want = R() < possOf(M) ? M.h : M.a; if (!owns(want)) V.want = want; }
  }
  function direct(dt) {
    if (V.wait > 0) V.wait -= dt;
    while (!V.block && V.q.length && V.wait <= 0) {
      const s = V.q[0];
      if (s.until && !s.until()) { s.tw = (s.tw || 0) + dt; if (s.tw < s.max) break; if (!s.soft) { V.dbg.to++; (V.dbg.l = V.dbg.l || []).push(String(s.until).slice(0, 60) + (s.info ? ' | ' + s.info() : '')); } }
      V.q.shift(); V.wait += s.after || 0; if (s.fn) s.fn();
    }
    if (V.q.length || V.wait > 0 || V.block || V.ended) return;
    if (V.scene) endScene();
    if (V.ball.mode === 'dead') { const m = near(field(V.poss || V.my), V.ball); if (m) give(m); }
    V.minAcc += dt;
    if (V.minAcc >= MIN) { V.minAcc -= MIN; engineStep(); }
  }
  function drawMini() {
    const el = $('#mini'), mg = el.getContext('2d'), w = 124, h = 192;
    mg.fillStyle = '#1c663d'; mg.fillRect(0, 0, w, h);
    mg.strokeStyle = 'rgba(255,255,255,.55)'; mg.lineWidth = 1.2;
    mg.strokeRect(3, 3, w - 6, h - 6); mg.beginPath(); mg.moveTo(3, h / 2); mg.lineTo(w - 3, h / 2); mg.stroke();
    mg.beginPath(); mg.arc(w / 2, h / 2, 16, 0, TAU); mg.stroke();
    mg.strokeRect(w / 2 - 37, 3, 74, 30); mg.strokeRect(w / 2 - 37, h - 33, 74, 30);
    const X = x => 3 + (x + 34) / 68 * (w - 6), Y = y => 3 + (52.5 - y) / 105 * (h - 6);
    for (const a of V.acts.values()) { if (a.gone) continue; mg.fillStyle = V.kits[a.S === V.my ? 0 : 1].shirt; mg.strokeStyle = 'rgba(0,0,0,.5)'; mg.lineWidth = 1; mg.beginPath(); mg.arc(X(a.x), Y(a.y), 3.8, 0, TAU); mg.fill(); mg.stroke(); }
    mg.fillStyle = '#fff'; mg.strokeStyle = '#000'; mg.beginPath(); mg.arc(X(V.ball.x), Y(V.ball.y), 3, 0, TAU); mg.fill(); mg.stroke();
  }
  function frame(now) {
    if (!V.on) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; T0 += dt;
    const paused = U.sheet || V.paused, sdt = paused ? 0 : dt * V.speed, b = V.ball;
    if (sdt) { let r = sdt; while (r > 1e-6) { const h = Math.min(r, 1 / 40); direct(h); simulate(h); r -= h; } }
    for (const a of V.acts.values()) {
      if (a.gone) continue;
      const carrier = b.owner === a;
      a.fig.setRing(carrier ? '#ffd23f' : (a.S === V.my ? '#9fc0ff' : shade(V.kits[1].shirt, 0.3)), carrier ? 0.95 : 0.5);
      a.fig.update(dt, T0, a);
    }
    updateBallVis(dt, b);
    // torcida
    V.mood = Math.max(0, V.mood - dt);
    let lvl = 0.25 + clamp(1 - (52.5 - Math.abs(b.y)) / 28, 0, 1) * 0.45;
    if (V.mood > 1.5) lvl = 1; else if (V.scene) lvl = Math.max(lvl, 0.62);
    SFX.update(dt, Math.min(1, lvl), !V.ended && !V.block && !paused, V.block ? 0.2 : 0.55);
    drawMini();
    const pdt = paused ? 0 : dt * Math.min(V.speed, 2);
    fx.update(pdt); dust.update(dt);
    for (let i = 0; i < dust.n; i++) if (dust.life[i] <= 0.05) { dust.i = i; dust.emit(rnd(-40, 40), rnd(2, 14), rnd(-60, 60), rnd(-0.6, 0.6), rnd(-0.2, 0.2), rnd(-0.6, 0.6), rnd(6, 12), rnd(0.35, 0.8), DUSTC, 0, 0); }
    updateConfetti(pdt); updateRings(pdt); updateFloats(dt);
    for (const g of [goals.top, goals.bot]) {
      if (g.flashT > 0) { g.flashT = Math.max(0, g.flashT - dt * 0.9); g.flash.material.opacity = g.flashT * 0.95; }
      if (g.netKick > 0) { g.netKick = Math.max(0, g.netKick - dt * 2); g.net.scale.set(1 + g.netKick * 0.1, 1, 1 + g.netKick * 0.6); }
    }
    // câmera: de perto segue a bola; de longe mostra o campo todo
    let tD, tx, tz, tt;
    if (V.camNear) {
      const asp = camera.aspect, k = 2 * Math.tan(camera.fov * Math.PI / 360);
      tD = Math.max(36 / (k * asp), 44 / k);
      const halfW = tD * k * asp / 2, halfH = tD * k / 2;
      tx = halfW > 38 ? 0 : clamp(ballV.x + b.vx * 0.12, -38 + halfW, 38 - halfW);
      tz = -clamp(ballV.y + b.vy * 0.18, -58 + halfH * 0.8, 58 - halfH * 0.8); tt = 0.32;
    } else { const f = fieldFit(); tD = f.D * 1.02; tx = 0; tz = f.z; tt = 0.16; }
    const ck = 1 - Math.exp(-3.2 * dt);
    cam.cD += (tD - cam.cD) * ck; cam.cx += (tx - cam.cx) * ck; cam.cz += (tz - cam.cz) * ck; cam.ctilt += (tt - cam.ctilt) * ck;
    V.shake = Math.max(0, V.shake - dt * 2.2);
    const sh = V.shake * V.shake * 1.2, sx = (Math.random() - 0.5) * sh, sz = (Math.random() - 0.5) * sh;
    camera.position.set(cam.cx + sx, cam.cD * Math.cos(cam.ctilt), cam.cz + sz + cam.cD * Math.sin(cam.ctilt));
    camera.lookAt(cam.cx + sx, 0, cam.cz + sz);
    renderer.render(scene, camera);
  }

  // ---------- API ----------
  return {
    init, V,
    start(M, my, op, o) {
      for (const a of V.acts.values()) a.fig.dispose();
      V.acts.clear(); floats.splice(0).forEach(f => f.d.remove()); $('#ticker').innerHTML = '';
      const alt = o.alt;
      Object.assign(V, { dbg: { to: 0 }, on: true, M, my, op, q: [], wait: 0, block: false, ended: false, scene: false, zoneY: null, minAcc: 0, want: null, poss: null, shake: 0, seen: 0, shown: [0, 0], half: false, mood: 0, paused: false, home: my.home, speed: o.speed, kits: [kitFor(my.c, false), kitFor(op.c, alt)] });
      V.ball = { x: 0, y: 0, z: 0, vx: 0, vy: 0, rot: 0, owner: null, mode: 'dead', done: null, kicker: null, kickT: 0, pop: false };
      setFieldTheme(M.cup ? 'C' : my.c.div === 0 ? 'A' : 'B');
      for (const S of [my, op]) for (const e of S.on) if (!e.out) addActor(S, e, false);
      ballV.x = 0; ballV.y = 0; ballV.z = 0; ballV.vis = 0;
      resize(); hud();
      const f = fieldFit(); cam.cD = f.D * 1.1; cam.cx = 0; cam.cz = f.z; cam.ctilt = 0.1;
      big('Bola rolando', o.label, '#fff', true);
      V.q.push(...kickoff(my.home ? my : op));
      lastT = performance.now(); requestAnimationFrame(frame);
    },
    stop() { V.on = false; SFX.update(0.1, 0, false, 0); },
    resume() {
      if (!V.on) return;
      syncActors(); V.block = false;
      if (V.half) { V.half = false; V.q.unshift(...kickoff(V.my.home ? V.op : V.my)); }
    },
    sync: () => { if (V.on) syncActors(); },
    setSpeed(s) { V.speed = s; },
    toggleCam() { V.camNear = !V.camNear; return V.camNear; },
    skip() {
      const M = V.M; if (!M || V.ended) return;
      V.q = []; V.wait = 0; V.block = false; M.auto = true;
      if (M.pend) { const { S, o } = M.pend; if (!doSub(M, S, o, bestSub(S, o.role))) { o.out = true; o.t1 = M.min; } M.pend = null; }
      while (!M.done) stepMinute(M);
      V.seen = M.ev.length; V.shown = [V.my.g, V.op.g]; V.ended = true; endScene(); syncActors(); hud();
      const p = M.pso; big(p ? 'Pênaltis' : 'Fim de jogo', p ? `${V.my.home ? p.sc[0] : p.sc[1]} × ${V.my.home ? p.sc[1] : p.sc[0]}` : `${V.shown[0]} × ${V.shown[1]}`, '#fff', true);
      SFX.whistle(3, true); endMatchUI();
    }
  };
})();

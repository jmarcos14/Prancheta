// =====================================================================
// SOM — tudo sintetizado com Web Audio (torcida, apito, chute e interface)
// =====================================================================
const SFX = (() => {
  let ctx = null, master = null, crowdGain = null, crowdBand = null, chantGain = null, drumBus = null, noiseBuf = null, brownBuf = null;
  const get = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
  let enabled = get('prancheta2.som', '1') !== '0', vol = +get('prancheta2.vol', '0.8');
  const gainOf = () => (enabled ? 0.85 * vol : 0);
  let level = 0.3, drums = 0, nextBeat = 0, beat = 0, lastKick = 0;
  const now = () => ctx.currentTime;
  function makeNoise(brown) {
    const len = ctx.sampleRate * 3, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); let l = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (brown) { l = (l + 0.02 * w) / 1.02; d[i] = l * 3.5; } else d[i] = w; } }
    return buf;
  }
  function init() {
    if (ctx) { if (ctx.state === 'suspended' && !document.hidden) ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    // iPhone: toca mesmo com a chave de silêncio (sessão de reprodução)
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* sem sessão de áudio */ }
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    master = ctx.createGain(); master.gain.value = gainOf();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = makeNoise(false); brownBuf = makeNoise(true);
    const src = ctx.createBufferSource(); src.buffer = brownBuf; src.loop = true;
    crowdBand = ctx.createBiquadFilter(); crowdBand.type = 'bandpass'; crowdBand.frequency.value = 650; crowdBand.Q.value = 0.55;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    crowdGain = ctx.createGain(); crowdGain.gain.value = 0;
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.11; lfoG.gain.value = 140; lfo.connect(lfoG); lfoG.connect(crowdBand.frequency); lfo.start();
    src.connect(crowdBand); crowdBand.connect(lp); lp.connect(crowdGain); crowdGain.connect(master); src.start();
    const src2 = ctx.createBufferSource(); src2.buffer = noiseBuf; src2.loop = true;
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 520; f1.Q.value = 6;
    const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 900; f2.Q.value = 7;
    chantGain = ctx.createGain(); chantGain.gain.value = 0;
    const lfo2 = ctx.createOscillator(), lg2 = ctx.createGain(); lfo2.frequency.value = 1.85; lg2.gain.value = 0.5;
    const chantAmp = ctx.createGain(); chantAmp.gain.value = 0.5; lfo2.connect(lg2); lg2.connect(chantAmp.gain); lfo2.start();
    src2.connect(f1); src2.connect(f2); f1.connect(chantAmp); f2.connect(chantAmp); chantAmp.connect(chantGain); chantGain.connect(master); src2.start();
    drumBus = ctx.createGain(); drumBus.gain.value = 0; drumBus.connect(master);
    nextBeat = now() + 0.1;
  }
  function env(g, t, a, peak, hold, rel) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel); }
  function noiseHit(t, type, freq, q, peak, a, hold, rel, dest) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); env(g, t, a, peak, hold, rel);
    s.connect(f); f.connect(g); g.connect(dest || master); s.start(t, Math.random() * 2); s.stop(t + a + hold + rel + 0.05);
    return f;
  }
  function tone(t, type, f0, f1, peak, a, hold, rel, dest) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + a + hold + rel);
    const g = ctx.createGain(); env(g, t, a, peak, hold, rel);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + a + hold + rel + 0.05);
  }
  const ok = () => !!ctx && enabled && ctx.state === 'running';
  function scheduleDrums() {
    const spb = 60 / 116 / 4;
    while (nextBeat < now() + 0.25) {
      const t = nextBeat, s = beat % 16;
      if (drums > 0.03) {
        if (s === 0 || s === 8) tone(t, 'sine', 95, 52, 0.55, 0.004, 0.02, 0.28, drumBus);
        if (s === 6 || s === 14) tone(t, 'sine', 80, 48, 0.35, 0.004, 0.02, 0.22, drumBus);
        if (s % 2 === 0 || Math.random() < 0.3) noiseHit(t, 'highpass', 1800, 0.7, s % 4 === 2 ? 0.22 : 0.09, 0.002, 0.01, 0.06, drumBus);
        if ([3, 6, 10, 13].includes(s)) tone(t, 'square', 1180, 0, 0.05, 0.002, 0.01, 0.05, drumBus);
      }
      nextBeat += spb; beat++;
    }
  }
  const api = {
    init,
    get enabled() { return enabled; },
    setEnabled(v) { enabled = v; try { localStorage.setItem('prancheta2.som', v ? '1' : '0'); } catch (e) { /* só nesta visita */ } if (master) master.gain.setTargetAtTime(gainOf(), now(), 0.05); },
    get volume() { return vol; },
    setVolume(v) { vol = clamp(v, 0, 1); try { localStorage.setItem('prancheta2.vol', String(vol)); } catch (e) { /* só nesta visita */ } if (master) master.gain.setTargetAtTime(gainOf(), now(), 0.05); },
    pause() { if (ctx && ctx.state === 'running') ctx.suspend(); },
    resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); },
    update(dt, lvl, playing, drumLvl) {
      if (!ctx) return;
      level += (lvl - level) * Math.min(1, dt * 1.6); drums += ((drumLvl || 0) - drums) * Math.min(1, dt * 1.2);
      crowdGain.gain.setTargetAtTime(playing ? 0.05 + level * 0.32 : 0.0001, now(), 0.25);
      crowdBand.frequency.setTargetAtTime(560 + level * 500, now(), 0.4);
      chantGain.gain.setTargetAtTime(playing ? 0.02 + drums * 0.05 : 0, now(), 0.5);
      drumBus.gain.setTargetAtTime(playing ? drums * 0.5 : 0, now(), 0.4);
      scheduleDrums();
    },
    whistle(n = 1, long = false) {
      if (!ctx) return;
      let t = now() + 0.02;
      for (let k = 0; k < n; k++) {
        const dur = long && k === n - 1 ? 0.75 : long ? 0.32 : 0.24;
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 2950;
        const fm = ctx.createOscillator(), fg = ctx.createGain(); fm.frequency.value = 31; fg.gain.value = 140; fm.connect(fg); fg.connect(o.frequency);
        const g = ctx.createGain(); env(g, t, 0.012, 0.16, dur, 0.06);
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2950; bp.Q.value = 2;
        o.connect(bp); bp.connect(g); g.connect(master); o.start(t); fm.start(t); o.stop(t + dur + 0.12); fm.stop(t + dur + 0.12);
        t += dur + 0.14;
      }
    },
    kick(power) { if (!ctx || now() - lastKick < 0.05) return; lastKick = now(); const p = Math.max(0.15, Math.min(1, power)), t = now(); tone(t, 'sine', 160 + p * 60, 48, 0.18 + p * 0.3, 0.003, 0.01, 0.09); noiseHit(t, 'highpass', 2200, 0.8, 0.05 + p * 0.08, 0.001, 0.005, 0.03); },
    post() { if (!ctx) return; const t = now(); [520, 1335, 2390, 3110].forEach((f, i) => tone(t, 'sine', f, 0, 0.12 / (i + 1), 0.002, 0.01, 0.9 - i * 0.15)); },
    roar(strength = 1, dur = 2.2) { if (!ctx) return; const t = now(); noiseHit(t, 'bandpass', 750, 0.45, 0.55 * strength, 0.25, dur, 1.6); noiseHit(t + 0.05, 'bandpass', 1900, 0.9, 0.2 * strength, 0.3, dur * 0.8, 1.4); noiseHit(t, 'lowpass', 300, 0.7, 0.3 * strength, 0.3, dur, 1.5); },
    ooh(strength = 1) { if (!ctx) return; const t = now(); const f = noiseHit(t, 'bandpass', 320, 4, 0.32 * strength, 0.25, 0.5, 0.9); f.frequency.setValueAtTime(320, t); f.frequency.linearRampToValueAtTime(820, t + 0.45); f.frequency.linearRampToValueAtTime(480, t + 1.4); noiseHit(t, 'bandpass', 700, 0.6, 0.12 * strength, 0.2, 0.5, 0.8); },
    groan() { if (!ctx) return; const t = now(); const f = noiseHit(t, 'bandpass', 520, 3, 0.25, 0.1, 0.4, 1.1); f.frequency.setValueAtTime(520, t); f.frequency.exponentialRampToValueAtTime(220, t + 1.4); },
    boo() { if (!ctx) return; const t = now(); noiseHit(t, 'bandpass', 240, 3.5, 0.22, 0.2, 0.9, 0.7); tone(t, 'sawtooth', 118, 105, 0.03, 0.2, 0.9, 0.6); },
    horn() { if (!ctx) return; [0, 0.75].forEach(d => { const t = now() + d; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1900; lp.connect(master); [233, 294, 349].forEach(f => tone(t, 'sawtooth', f, 0, 0.06, 0.03, 0.5, 0.15, lp)); }); },
    cheer(s = 0.5) { if (ctx) api.roar(s, 0.5); },

    // ---------- sons da interface ----------
    // todos sintetizados na hora: nenhum arquivo de áudio, funciona offline
    tap() { if (!ok()) return; const t = now(); tone(t, 'triangle', 1150, 820, 0.05, 0.002, 0.004, 0.045); },
    tab() { if (!ok()) return; const t = now(); tone(t, 'sine', 660, 0, 0.06, 0.002, 0.02, 0.05); tone(t + 0.045, 'sine', 990, 0, 0.06, 0.002, 0.02, 0.07); },
    select() { if (!ok()) return; tone(now(), 'sine', 820, 1240, 0.06, 0.003, 0.02, 0.06); },
    open() { if (!ok()) return; const f = noiseHit(now(), 'bandpass', 500, 1.2, 0.05, 0.03, 0.06, 0.09); f.frequency.setValueAtTime(500, now()); f.frequency.exponentialRampToValueAtTime(1800, now() + 0.16); },
    close() { if (!ok()) return; const f = noiseHit(now(), 'bandpass', 1600, 1.2, 0.04, 0.02, 0.04, 0.08); f.frequency.setValueAtTime(1600, now()); f.frequency.exponentialRampToValueAtTime(450, now() + 0.13); },
    pick() { if (!ok()) return; const t = now(); tone(t, 'sine', 280, 720, 0.12, 0.004, 0.03, 0.07); },
    drop() { if (!ok()) return; const t = now(); tone(t, 'sine', 190, 85, 0.3, 0.002, 0.01, 0.1); noiseHit(t, 'highpass', 2600, 0.8, 0.09, 0.001, 0.004, 0.03); },
    coin() { if (!ok()) return; const t = now(); [[1318, 0], [1760, 0.07]].forEach(([f, d]) => { tone(t + d, 'square', f, 0, 0.035, 0.002, 0.03, 0.26); tone(t + d, 'sine', f * 2, 0, 0.03, 0.002, 0.02, 0.2); }); },
    pay() { if (!ok()) return; const t = now(); tone(t, 'triangle', 784, 0, 0.07, 0.003, 0.04, 0.08); tone(t + 0.08, 'triangle', 523, 0, 0.07, 0.003, 0.05, 0.16); },
    ok() { if (!ok()) return; const t = now(); [523, 659, 784].forEach((f, i) => tone(t + i * 0.07, 'triangle', f, 0, 0.08, 0.004, 0.03, i === 2 ? 0.3 : 0.08)); },
    err() { if (!ok()) return; const t = now(); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200; lp.connect(master); tone(t, 'square', 196, 0, 0.06, 0.004, 0.06, 0.04, lp); tone(t + 0.13, 'square', 185, 0, 0.06, 0.004, 0.09, 0.06, lp); },
    notify() { if (!ok()) return; const t = now(); tone(t, 'sine', 988, 0, 0.07, 0.003, 0.02, 0.6); tone(t, 'sine', 1976, 0, 0.025, 0.003, 0.02, 0.4); tone(t + 0.12, 'sine', 1319, 0, 0.06, 0.003, 0.02, 0.7); },
    win() {
      if (!ok()) return; const t = now();
      [523, 659, 784, 1047].forEach((f, i) => { tone(t + i * 0.11, 'triangle', f, 0, 0.08, 0.004, i === 3 ? 0.28 : 0.05, i === 3 ? 0.5 : 0.08); tone(t + i * 0.11, 'sine', f / 2, 0, 0.05, 0.004, 0.05, 0.1); });
      api.roar(0.25, 0.6);
    },
    draw() { if (!ok()) return; const t = now(); tone(t, 'triangle', 587, 0, 0.07, 0.004, 0.08, 0.1); tone(t + 0.16, 'triangle', 523, 0, 0.07, 0.004, 0.12, 0.3); },
    lose() {
      if (!ok()) return; const t = now(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(master);
      [392, 349, 330, 294].forEach((f, i) => tone(t + i * 0.17, 'sawtooth', f, 0, 0.05, 0.01, i === 3 ? 0.3 : 0.08, i === 3 ? 0.5 : 0.08, lp));
    },
    fanfare() {
      if (!ok()) return; const t = now(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; lp.connect(master);
      [[392, 0, 0.07], [392, 0.13, 0.07], [392, 0.26, 0.07], [523, 0.4, 0.22], [659, 0.68, 0.1], [784, 0.84, 0.6]].forEach(([f, d, h]) => { tone(t + d, 'sawtooth', f, 0, 0.05, 0.01, h, 0.18, lp); tone(t + d, 'sawtooth', f * 1.5, 0, 0.025, 0.01, h, 0.18, lp); });
      api.roar(0.5, 1.4);
    },
    fired() {
      if (!ok()) return; const t = now(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800; lp.connect(master);
      [[392, 370], [370, 349], [349, 330]].forEach(([a, b], i) => tone(t + i * 0.36, 'sawtooth', a, b, 0.07, 0.02, 0.24, 0.06, lp));
      const o = ctx.createOscillator(), g = ctx.createGain(), v = ctx.createOscillator(), vg = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = 311; v.frequency.value = 6; vg.gain.value = 9; v.connect(vg); vg.connect(o.frequency);
      env(g, t + 1.08, 0.02, 0.07, 0.9, 0.3); o.connect(g); g.connect(lp); o.start(t + 1.08); v.start(t + 1.08); o.stop(t + 2.4); v.stop(t + 2.4);
    },
    goal(mine, home) { if (!ctx) return; if (mine) { api.roar(home ? 1 : 0.55, 2.8); if (home) api.horn(); drums = 1; } else if (home) api.groan(); else { api.roar(0.9, 2.4); api.horn(); } }
  };
  return api;
})();

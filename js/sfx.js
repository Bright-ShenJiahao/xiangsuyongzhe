// 11/24 音效：WebAudio 现场合成（先顶上，以后可换正式素材）。SFX.play('hit') 等；同一种声音 40ms 内只响一次，免得怪多时炸耳朵
(() => {
  let AC = null, on = localStorage.getItem('xsyz-sfx') !== '0'; const last = {}, VOL = .8;
  const ac = () => { if (!AC) try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } if (AC.state === 'suspended') AC.resume(); return AC; };
  addEventListener('pointerdown', ac, { once: true }); addEventListener('keydown', ac, { once: true });
  function tone(f0, f1, dur, type = 'square', vol = .15, delay = 0) { const a = AC; if (!a) return; const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); g.gain.setValueAtTime(vol * VOL, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .02); }
  const NB = {}; function noise(dur, vol = .2, hp = 800, delay = 0) { const a = AC; if (!a) return; const t = a.currentTime + delay, key = Math.round(dur * 100);
    let b = NB[key]; if (!b) { b = NB[key] = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); }
    const n = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); n.buffer = b; f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol * VOL; n.connect(f).connect(g).connect(a.destination); n.start(t); }
  const S = {
    swing: () => noise(.12, .1, 2500), arrow: () => tone(900, 300, .08, 'triangle', .08), magic: () => { noise(.2, .12, 3000); tone(1200, 200, .2, 'sawtooth', .05); },
    hit: () => { noise(.08, .18, 600); tone(180, 60, .1, 'square', .08); }, crit: () => { noise(.12, .24, 400); tone(520, 120, .18, 'sawtooth', .1); },
    die: () => { noise(.18, .14, 300); tone(140, 40, .2, 'square', .07); }, hurt: () => { noise(.15, .2, 200); tone(220, 90, .2, 'square', .1); },
    coin: () => tone(1300 + Math.random() * 300, 1900, .07, 'square', .05), pick: () => [880, 1320].forEach((f, i) => tone(f, f, .1, 'square', .07, i * .06)),
    lv: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, f, .14, 'square', .08, i * .07)), tick: () => tone(700, 700, .03, 'square', .04),
    win: () => [659, 784, 988].forEach((f, i) => tone(f, f, .16, 'triangle', .1, i * .08)), jackpot: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, f * 1.01, .22, 'triangle', .12, i * .09)) };
  window.SFX = { play(k) { if (!on || !AC || !S[k]) return; const n = performance.now(); if (n - (last[k] || 0) < 40) return; last[k] = n; try { S[k](); } catch (e) {} }, get on() { return on; }, set on(v) { on = !!v; localStorage.setItem('xsyz-sfx', on ? '1' : '0'); } };
})();

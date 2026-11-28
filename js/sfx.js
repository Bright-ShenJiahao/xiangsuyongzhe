// 11/24 音效：WebAudio 现场合成（先顶上，以后可换正式素材）。SFX.play('hit') 等；同一种声音 40ms 内只响一次，免得怪多时炸耳朵
(() => {
  let AC = null, on = localStorage.getItem('xsyz-sfx') !== '0', VOL = (() => { const v = parseFloat(localStorage.getItem('xsyz-sfxVol')); return isNaN(v) ? (on ? .8 : 0) : Math.max(0, Math.min(1, v)); })(); const last = {};
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
    fall: () => { for (let i = 0; i < 9; i++) { const f = 1700 - i * 120, g = 700 - i * 40; tone(f, g, .085, 'triangle', .07, i * .1); tone(f * .75, g * .75, .1, 'sine', .028, i * .1 + .17); tone(f * .6, g * .6, .12, 'sine', .014, i * .1 + .34); } },   /* 11/25 加回声：每个音后面跟两次更低更轻的回响 */   /* 11/25 动漫掉落：jujujuju */
    thud: () => { tone(95, 26, .6, 'sine', .55); tone(52, 24, .65, 'triangle', .32); tone(190, 60, .12, 'sine', .14); noise(.14, .13, 90); tone(70, 28, .5, 'sine', .14, .22); },   /* 11/25 从高塔掉到大地图：重重的闷响 */
    pon: () => { tone(150, 38, .34, 'sine', .34); tone(78, 32, .4, 'triangle', .2); tone(300, 90, .08, 'sine', .08); noise(.07, .1, 120); tone(110, 40, .3, 'sine', .08, .16); },   /* 11/25 落地：闷响（低频，不清脆）+ 一点回响 */
    /* 11/25 首次召唤专用：升光 / 成形 / 感叹号 / 三种说话音 / 开门 / 进门 / 脚步 */
    sumRise: () => { for (let i = 0; i < 12; i++) tone(420 + i * 120, 480 + i * 130, .14, 'triangle', .05, i * .12); }, sumPop: () => { tone(300, 80, .2, 'sine', .2); [784, 1046, 1318, 1568].forEach((f, i) => tone(f, f, .22, 'triangle', .07, .03 + i * .05)); noise(.1, .1, 2000); },
    excl: () => { tone(1568, 1568, .1, 'square', .07); tone(2093, 2093, .12, 'square', .06, .07); }, blipP: () => tone(960 + Math.random() * 140, 900, .045, 'square', .045), blipH: () => tone(520 + Math.random() * 60, 480, .05, 'square', .045), blipN: () => tone(300 + Math.random() * 50, 280, .055, 'square', .05),
    door: () => { tone(90, 150, .6, 'sawtooth', .08); tone(180, 300, .6, 'sine', .08); noise(.5, .07, 250); }, whoosh: () => { noise(.55, .14, 500); tone(260, 1700, .55, 'sine', .08); }, step: () => { noise(.04, .08, 900); tone(130, 70, .05, 'triangle', .06); },
    win: () => [659, 784, 988].forEach((f, i) => tone(f, f, .16, 'triangle', .1, i * .08)), jackpot: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, f * 1.01, .22, 'triangle', .12, i * .09)) };
  window.SFX = { play(k) { if (!on || VOL <= 0 || !AC || !S[k]) return; const n = performance.now(); if (n - (last[k] || 0) < 40) return; last[k] = n; try { S[k](); } catch (e) {} }, get on() { return on && VOL > 0; }, set on(v) { on = !!v; if (on && VOL <= 0) VOL = .8; localStorage.setItem('xsyz-sfx', on ? '1' : '0'); localStorage.setItem('xsyz-sfxVol', VOL); }, get vol() { return on ? VOL : 0; }, set vol(v) { VOL = Math.max(0, Math.min(1, v)); on = VOL > 0; localStorage.setItem('xsyz-sfx', on ? '1' : '0'); localStorage.setItem('xsyz-sfxVol', VOL); } };
})();

/* 11/25 老电视开关机转场（局外先对比，以后可用在：进入游戏=开机、退回主界面=关机）。
   TV.on(mid, done)：黑屏→白线横向展开→竖向撑满→雪花噪点+扫描线+抖动偏色→稳定；mid 在整屏全白时调用（此时换画面）。
   TV.off(done)：上下黑边合拢→剩一条白线→缩成亮点→熄灭（停在黑屏，done 里换画面）；TV.clear() 去掉黑屏。
   声音全部 WebAudio 合成，受 xsyz-sfx 开关控制。 */
(() => {
  let cv, g, W, H, raf = 0, AC = null;
  const sfxOn = () => localStorage.getItem('xsyz-sfx') !== '0';
  const ac = () => { if (!AC) try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } if (AC.state === 'suspended') AC.resume(); return AC; };
  function tone(f0, f1, dur, type, vol, delay) { vol *= .5; const a = ac(); if (!a || !sfxOn()) return; const t = a.currentTime + (delay || 0), o = a.createOscillator(), v = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(vol, t + Math.min(.03, dur / 4)); v.gain.exponentialRampToValueAtTime(.0008, t + dur); o.connect(v).connect(a.destination); o.start(t); o.stop(t + dur + .05); }
  function hiss(dur, vol, hp, delay, ramp) { vol *= .5; const a = ac(); if (!a || !sfxOn()) return; const t = a.currentTime + (delay || 0), b = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (ramp ? Math.min(1, i / d.length * 3) * (1 - i / d.length) : 1 - i / d.length); const n = a.createBufferSource(), f = a.createBiquadFilter(), v = a.createGain(); n.buffer = b; f.type = 'highpass'; f.frequency.value = hp; v.gain.value = vol; n.connect(f).connect(v).connect(a.destination); n.start(t); }
  const snd = {
    on() { tone(55, 50, 1.3, 'sawtooth', .05, .1); tone(110, 100, 1.1, 'sine', .05, .1); tone(300, 3200, .4, 'sine', .035, .12); hiss(.9, .12, 1800, .45, true); tone(15734, 15734, .6, 'sine', .006, .5); tone(120, 50, .16, 'square', .08, .62); },
    off() { tone(3000, 70, .38, 'sine', .06, 0); hiss(.3, .1, 3500, 0); tone(900, 900, .02, 'square', .05, .4); tone(70, 40, .22, 'sine', .08, .38); } };
  function mk() { if (cv) return; cv = document.createElement('canvas'); cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:99999;image-rendering:pixelated;pointer-events:all'; document.body.appendChild(cv); g = cv.getContext('2d'); }
  function size() { const s = Math.max(2, Math.round(Math.min(innerWidth, innerHeight) / 220)); W = Math.ceil(innerWidth / s); H = Math.ceil(innerHeight / s); cv.width = W; cv.height = H; }
  const E_ = t => t < 0 ? 0 : t > 1 ? 1 : t, ease = t => 1 - Math.pow(1 - E_(t), 3);
  function noise(a) { const id = g.createImageData(W, H), d = id.data; for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255, r = Math.random(); d[i] = v * (1 + .15 * (r - .5)); d[i + 1] = v; d[i + 2] = v * (1 + .2 * (.5 - r)); d[i + 3] = a * 255; } g.putImageData(id, 0, 0); }
  function scan(a) { g.fillStyle = `rgba(0,0,0,${a * .45})`; for (let y = 0; y < H; y += 2) g.fillRect(0, y, W, 1); }
  function run(frame, T, end) { cancelAnimationFrame(raf); const t0 = performance.now(); const step = n => { const t = (n - t0) / 1000; frame(t); if (t < T) raf = requestAnimationFrame(step); else end && end(); }; raf = requestAnimationFrame(step); }
  window.TV = {
    on(mid, done) { mk(); size(); snd.on(); let did = 0;
      run(t => { g.clearRect(0, 0, W, H);
        if (t < .75) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); const w = t < .08 ? 2 : ease((t - .08) / .27) * W, h = t < .35 ? 1 : 1 + ease((t - .35) / .4) * H; g.fillStyle = '#fff'; g.shadowColor = '#bfe8ff'; g.shadowBlur = 6; g.fillRect((W - w) / 2, (H - h) / 2, w, h); g.shadowBlur = 0; }
        else { if (!did) { did = 1; mid && mid(); } const k = (t - .75) / .8, a = 1 - ease(k);   /* 白 → 雪花 → 透明 */
          const fl = (Math.floor(t * 18) % 4 === 0 && k < .6) ? .35 : 0, jx = (Math.random() - .5) * 6 * (1 - k);
          g.save(); g.translate(jx, 0); noise(Math.min(1, a + fl)); scan(a); g.restore();
          if (k < .25) { g.fillStyle = `rgba(255,255,255,${1 - k * 4})`; g.fillRect(0, 0, W, H); }
          if (k < .7) { const y = (k * 1.6 * H) % H; g.fillStyle = `rgba(255,255,255,${.18 * (1 - k)})`; g.fillRect(0, y, W, 4); }   /* 滚动的亮带 */
          g.fillStyle = `rgba(255,40,80,${.05 * a})`; g.fillRect(0, 0, W, H); } }, 1.55, () => { if (!did) mid && mid(); cv.remove(); cv = null; done && done(); }); },
    off(done) { mk(); size(); snd.off();
      run(t => { g.clearRect(0, 0, W, H);
        const k1 = ease(t / .26), hh = Math.max(1, (1 - k1) * H);   /* 上下黑边合拢，只剩一条中间带 */
        g.fillStyle = '#000'; g.fillRect(0, 0, W, (H - hh) / 2); g.fillRect(0, (H + hh) / 2, W, (H - hh) / 2);
        if (t > .12) { const k = ease((t - .12) / .2); g.fillStyle = `rgba(255,255,255,${k})`; g.fillRect(0, (H - hh) / 2, W, hh); }
        if (t > .3) { const k = ease((t - .3) / .22), w = (1 - k) * W; g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.shadowColor = '#bfe8ff'; g.shadowBlur = 6; g.fillRect((W - w) / 2, H / 2 - 1, Math.max(3, w), 2); g.shadowBlur = 0; }
        if (t > .52) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); const a = 1 - E_((t - .52) / .3); g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.arc(W / 2, H / 2, 2 + 2 * a, 0, 7); g.fill(); }
      }, .85, () => { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); done && done(); }); },
    clear() { cancelAnimationFrame(raf); if (cv) { cv.remove(); cv = null; } } };
})();

// 11/22 主界面光影（叠在 art13 上的 canvas）：① 月光呼吸 ③ 火把闪烁 ④ 宝珠 / 水晶发光 ⑤ 萤火虫光尘
// 坐标是原图 1672×941 上的像素位置；按 .tart 的 background-size / position 换算到屏幕，换尺寸自动对齐。
(() => {
  const IW = 1672, IH = 941;
  const P = { moon: [663, 124, 150], torch: [[140, 167], [383, 222]], gem: [351, 355], crystal: [636, 303] };
  const flies = Array.from({ length: 14 }, () => ({ x: Math.random() * IW * .62, y: 560 + Math.random() * 360, p: Math.random() * 7, s: .4 + Math.random() * .8, r: 1 + Math.random() * 1.6 }));
  let cv, g, run = false, t0 = 0; const bgImg = new Image(); bgImg.onload = () => { t0 = performance.now(); }; bgImg.src = 'art/title/art13.webp';   // 11/22 主图先出来，光影等主图加载完再 1 秒淡入
  function rect() {   // 背景图在屏幕上的位置和缩放
    const el = cv.parentElement, W = el.clientWidth, H = el.clientHeight, cs = getComputedStyle(el), sz = cs.backgroundSize, [bx, by] = cs.backgroundPosition.split(' ').map(v => parseFloat(v) / 100);
    let s; if (sz.startsWith('auto')) s = parseFloat(sz.split(' ')[1]) / 100 * H / IH; else s = Math.max(W / IW, H / IH);
    return { s, ox: (W - IW * s) * bx, oy: (H - IH * s) * by, W, H };
  }
  function glow(x, y, r, c, a) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${c},${a})`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  function frame(t) {
    if (!run) return; requestAnimationFrame(frame);
    const dpr = Math.min(2, devicePixelRatio || 1), R = rect(); if (cv.width !== Math.round(R.W * dpr)) { cv.width = Math.round(R.W * dpr); cv.height = Math.round(R.H * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, R.W, R.H); if (!t0) return; g.globalAlpha = Math.min(1, (performance.now() - t0) / 1000 - .3);  if (g.globalAlpha <= 0) return; g.globalCompositeOperation = 'lighter'; t /= 1000;
    const X = x => R.ox + x * R.s, Y = y => R.oy + y * R.s, S = v => v * R.s, [mx, my, mr] = P.moon;
    glow(X(mx), Y(my), S(mr * 1.9), '170,205,255', .32 + .12 * Math.sin(t * .9));                       // ① 月光
    P.torch.forEach(([x, y], i) => { const f = .5 + .25 * Math.sin(t * 9 + i * 3) + .15 * Math.sin(t * 23 + i); glow(X(x), Y(y), S(40 + 8 * f), '255,140,50', .4 + .25 * f); });   // ③ 火把
    const gp = .5 + .5 * Math.sin(t * 2.2); glow(X(P.gem[0]), Y(P.gem[1]), S(28 + 8 * gp), '90,150,255', .5 + .35 * gp);                                          // ④ 宝珠
    const cp = .5 + .5 * Math.sin(t * 1.6 + 1); glow(X(P.crystal[0]), Y(P.crystal[1]), S(24 + 7 * cp), '160,220,255', .45 + .35 * cp);                          // ④ 水晶
    if ((t % 4.2) < .35) { const k = 1 - (t % 4.2) / .35, x = X(P.gem[0]), y = Y(P.gem[1]), l = S(20) * k; g.strokeStyle = `rgba(220,240,255,${.8 * k})`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - l, y); g.lineTo(x + l, y); g.moveTo(x, y - l); g.lineTo(x, y + l); g.stroke(); }
    for (const f of flies) { const x = f.x + Math.sin(t * f.s + f.p) * 30, y = f.y + Math.cos(t * f.s * .7 + f.p) * 18 - (t * 4 * f.s) % 60, a = .35 + .35 * Math.sin(t * 2 * f.s + f.p);   // ⑤ 萤火
      glow(X(x), Y(y), S(f.r * 5), '200,255,150', a * .6); g.fillStyle = `rgba(245,255,215,${Math.min(1, a * 1.6)})`; g.fillRect(X(x) - 1.5, Y(y) - 1.5, 3, 3); }
    g.globalCompositeOperation = 'source-over';
  }
  function init() { const el = document.querySelector('#title .tart'); if (!el || cv) return; cv = document.createElement('canvas'); cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none'; el.appendChild(cv); g = cv.getContext('2d');
    const tick = () => { const on = document.getElementById('title').classList.contains('on'); if (on && !run) { run = true; requestAnimationFrame(frame); } else if (!on) run = false; }; setInterval(tick, 300); tick(); }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', init); else init();
})();

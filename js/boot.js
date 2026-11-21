// 加载动画：照搬《异世界幸存者》（11/21 用户要求直接拿来）。
// 卧室里打游戏 → 屏幕爆光 → 房间碎成方块掉落、露出森林草地 → 哥布林冒出、主角跑路。
// 素材在 art/boot/（卧室、森林三层、主角坐 / 跑、四种哥布林走路）。点画面可以跳过等待。
// 游戏素材载完后由 ui.js 调 BOOT.done()：至少播够 BOOT_MIN 毫秒再淡出。
(function () {
  var b = document.getElementById('boot'); if (!b) return;
  var P = 'art/boot/', K = innerHeight >= 900 ? 3 : 2, W = innerWidth, H = innerHeight, hb = Math.round(H * .27), hx = Math.round(W * (W < 700 ? .7 : .62)), cx0 = Math.round(W * .5);
  var seen = false; try { seen = !!localStorage.getItem('xsyz-bootSeen'); localStorage.setItem('xsyz-bootSeen', '1'); } catch (e) {}
  document.addEventListener('pointerdown', function () { window.BOOT_MIN = 0; }, { once: true });   // 点画面跳过
  var SKIP = seen ? 4.1 : 0; window.BOOT_MIN = seen ? 1500 : 3500;
  var kinds = ['goblin', 'gob_blade', 'gob_shield', 'gob_archer', 'goblin'], L = [], lane = [-26, 18, -8, 30, 0, -30, 14, 24, -14, 4];
  function fr(dir, pre, from, to) { var a = []; for (var j = from; j <= to; j++) { var im = new Image(); im.src = P + dir + '/' + pre + j + '.png'; a.push(im.src); } return a; }
  function mk(f, bot, z, x, v, ph, fps) { var el = document.createElement('img'); el.className = 'sd'; el.style.bottom = bot + 'px'; el.style.zIndex = z; b.appendChild(el); return { el: el, f: f, x: x, v: v, ph: ph, fps: fps, bot: bot }; }
  var sit = fr('hero', 'sit', 0, 2), run = fr('hero', 'w', 2, 7);
  var hero = mk(sit, hb, 1000 - hb, cx0, 0, 0, 85);
  for (var i = 0; i < 10; i++) { var bt = hb + lane[i] * K / 2; var g = mk(fr('enemies/' + kinds[i >> 1], 'walk', 0, 5), bt, 1000 - bt, hx - (110 + (i >> 1) * 70 + (i & 1) * 38) * K / 2, 0, i, 95); g.el.style.display = 'none'; L.push(g); }
  // 卧室画在画布上，碎裂时按方块掉落
  var cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.style.cssText = 'position:absolute;inset:0;z-index:1;pointer-events:none;image-rendering:pixelated'; b.insertBefore(cv, b.firstChild); var cx = cv.getContext('2d');
  var room = document.createElement('canvas'); room.width = W; room.height = H; var rimg = new Image(); rimg.onload = function () { var s = Math.max(W / rimg.width, H / rimg.height), w = rimg.width * s, h = rimg.height * s, r = room.getContext('2d'); r.drawImage(rimg, (W - w) / 2, Math.min(0, (H - h) * .75), w, h); }; rimg.src = P + 'bedroom.jpg';
  var LY = {}; ['far', 'mid', 'ground'].forEach(function (k) { var im = new Image(); im.src = P + 'forest_' + k + (k === 'far' ? '.jpg' : '.png'); LY[k] = im; });
  var fg = document.createElement('canvas'); fg.width = W; fg.height = H; fg.style.cssText = 'position:absolute;inset:0;z-index:1500;pointer-events:none'; b.appendChild(fg); var fx = fg.getContext('2d');
  var GY = H - hb;
  function strip(c, im, sc, y, h) { if (!im.width) return; var w = im.width * h / im.height; for (var x = -((sc % w) + w) % w; x < W; x += w) c.drawImage(im, Math.floor(x), Math.round(y), Math.ceil(w) + 1, Math.round(h)); }
  function scene(sc) { cx.fillStyle = '#4a6a3a'; cx.fillRect(0, 0, W, H); strip(cx, LY.far, sc * .15, 0, GY * .9); var mh = GY + 6 * K; strip(cx, LY.mid, sc * .45, 0, mh); var top = GY - 14 * K, gh = (H - top) * 1.15; strip(cx, LY.ground, sc, top, gh); fx.clearRect(0, 0, W, H); }
  var BS = Math.round(28 * K / 2), blocks = [], px = cx0, py = H - hb - 14 * K;
  for (var y = 0; y < H; y += BS) for (var x = 0; x < W; x += BS) { var d = Math.hypot(x + BS / 2 - px, y + BS / 2 - py) / Math.hypot(W, H); blocks.push({ x: x, y: y, d: d * .85 + Math.random() * .08, r: (Math.random() - .5) * 4, vx: (x + BS / 2 - px) / W * 120 }); }
  var q = document.createElement('div'); q.textContent = '？'; q.style.cssText = 'position:absolute;z-index:2300;font:900 ' + (18 * K) + 'px sans-serif;color:#fff;text-shadow:0 3px #000;opacity:0;transition:opacity .2s;left:' + (cx0 - 6 * K) + 'px;bottom:' + (hb + 46 * K) + 'px'; b.appendChild(q);
  var tp = document.getElementById('bx'), tt = document.getElementById('bxt'), T1 = '再打一局就睡……', T2 = '我刚才不是在家里打游戏吗！？', t0 = performance.now() - SKIP * 1000, shown = '';
  var av = new Image(); av.onload = function () { var c = document.getElementById('bxa').getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(av, 0, 0, 33, 31, 2, 2, 33, 31); }; av.src = P + 'hero/w0.png';
  var bw = Math.min(440, W * .9); function place(x) { var bl = Math.max(12, Math.min(x - bw / 2, W - bw - 12)); tp.style.left = bl + 'px'; tp.style.bottom = (hb + 50 * K + 26) + 'px'; tp.style.setProperty('--tail', (x - bl) + 'px'); }
  function say(s, t) { if (shown !== s) { shown = s; tt.textContent = ''; } tp.className = 'on'; tt.textContent = s.slice(0, Math.min(s.length, Math.floor(t / .075))); }
  var last = t0, scroll = 0, hxNow = cx0;
  function tick(n) {
    if (!document.getElementById('boot')) return; var t = Math.max(0, (n - t0) / 1000), dt = Math.min(.05, (n - last) / 1000); last = n;
    cx.clearRect(0, 0, W, H);
    if (t < 2.3) { cx.drawImage(room, 0, 0); var gl = .35 + .15 * Math.sin(t * 9); if (t > 1.8) gl = .4 + (t - 1.8) * 1.6; var gr = cx.createRadialGradient(px, py, 0, px, py, (t > 1.8 ? 60 + (t - 1.8) * 500 : 60) * K / 2); gr.addColorStop(0, t > 1.8 ? 'rgba(190,120,255,' + Math.min(.9, gl) + ')' : 'rgba(150,255,170,' + gl * .5 + ')'); gr.addColorStop(1, 'rgba(120,60,255,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, W, H); }
    else if (t < 3.6) { scene(0); var k0 = t - 2.3; for (var i = 0; i < blocks.length; i++) { var o = blocks[i], k = (k0 - o.d) / .5; if (k >= 1) continue; if (k < 0) { cx.drawImage(room, o.x, o.y, BS, BS, o.x, o.y, BS, BS); continue; }
        var s = 1 - k * .7; cx.save(); cx.globalAlpha = 1 - k * k; cx.translate(o.x + BS / 2 + o.vx * k, o.y + BS / 2 + 260 * k * k); cx.rotate(o.r * k); cx.scale(s, s); cx.drawImage(room, o.x, o.y, BS, BS, -BS / 2, -BS / 2, BS, BS); cx.strokeStyle = 'rgba(0,0,0,.45)'; cx.strokeRect(-BS / 2, -BS / 2, BS, BS); cx.restore(); } }
    if (t >= 3.6) scene(scroll); else fx.clearRect(0, 0, W, H);
    if (t < 4.1) { var f = t < 1.8 ? Math.floor(t * 3) % 2 : t < 3.6 ? 2 : 0; hero.el.src = sit[f]; hero.el.style.transform = 'translateX(' + (cx0 - 13 * K) + 'px) scale(' + K + ')'; q.style.opacity = t > 3.6 ? 1 : 0; }
    else { q.style.opacity = 0; hxNow += (hx - hxNow) * Math.min(1, dt * 3); hero.el.src = run[Math.floor(n / 85) % 6]; hero.el.style.transform = 'translateX(' + (hxNow - 18 * K) + 'px) scale(' + K + ')'; scroll += dt * 180 * K / 2; }
    for (var i = 0; i < L.length; i++) { var o = L[i]; if (t < 4.1) { o.el.style.display = 'none'; continue; } o.el.style.display = ''; var ent = Math.min(1, (t - 4.1 - i * .06) / .7), sx = -160 * K + (o.x + Math.sin(t * 2.1 + i * 1.7) * 16 * K / 2 + 160 * K) * Math.max(0, ent); o.el.src = o.f[Math.floor(n / o.fps + i) % 6]; o.el.style.transform = 'translateX(' + Math.round(sx - 17 * K) + 'px) scale(' + K + ')'; }
    if (t < 1.6 && t > .3) { place(cx0); say(T1, t - .3); } else if (t < 4.4) tp.className = ''; else { place(hxNow); say(T2, t - 4.4); }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  window.BOOT = {
    progress: function (p) { var e = document.getElementById('bootbar'); if (e) e.style.width = Math.round(p * 100) + '%'; },
    done: function (cb) { var go = function () { if (performance.now() < (window.BOOT_MIN == null ? 2300 : window.BOOT_MIN)) { setTimeout(go, 100); return; } b.style.opacity = '0'; if (cb) cb(); setTimeout(function () { b.remove(); }, 500); }; go(); },
    fail: function (msg) { var t = document.getElementById('bootx'); if (t) { t.textContent = msg + '（点一下重试）'; t.style.color = '#ffb4a0'; b.addEventListener('click', function () { location.reload(); }); } },
  };
})();

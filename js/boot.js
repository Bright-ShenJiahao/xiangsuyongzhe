// 加载页：深夜卧室，小孩坐在地上打游戏机，屏幕一闪一闪（11/21 用户定：只留这一幕，不要碎裂和森林追逐）。
// 素材在 art/boot/（卧室图、主角坐姿 3 帧）。游戏素材载完后由 ui.js 调 BOOT.done()：
// 至少显示 BOOT_MIN 毫秒 → 游戏机的光一下子铺满屏幕（被吸进去）→ 淡出到主界面。点画面可以跳过等待。
(function () {
  var b = document.getElementById('boot'); if (!b) return;
  var P = 'art/boot/', K = innerHeight >= 900 ? 3 : 2, W = innerWidth, H = innerHeight, hb = Math.round(H * .27), cx0 = Math.round(W * .5);
  var seen = false; try { seen = !!localStorage.getItem('xsyz-bootSeen'); localStorage.setItem('xsyz-bootSeen', '1'); } catch (e) {}
  window.BOOT_MIN = seen ? 900 : 2200;
  document.addEventListener('pointerdown', function () { window.BOOT_MIN = 0; }, { once: true });   // 点画面跳过
  var sit = [0, 1, 2].map(function (j) { var im = new Image(); im.src = P + 'hero/sit' + j + '.png'; return im.src; });
  var hero = document.createElement('img'); hero.className = 'sd'; hero.style.bottom = hb + 'px'; hero.style.zIndex = 1000; b.appendChild(hero);
  var cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.style.cssText = 'position:absolute;inset:0;z-index:1;pointer-events:none'; b.insertBefore(cv, b.firstChild); var cx = cv.getContext('2d');
  var room = document.createElement('canvas'); room.width = W; room.height = H; var rimg = new Image(); rimg.onload = function () { var s = Math.max(W / rimg.width, H / rimg.height), w = rimg.width * s, h = rimg.height * s; room.getContext('2d').drawImage(rimg, (W - w) / 2, Math.min(0, (H - h) * .75), w, h); }; rimg.src = P + 'bedroom.jpg';
  var px = cx0, py = H - hb - 14 * K;
  var tp = document.getElementById('bx'), tt = document.getElementById('bxt'), T1 = '再打一局就睡……';
  var av = new Image(); av.onload = function () { var c = document.getElementById('bxa').getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(av, 0, 0, 33, 31, 2, 2, 33, 31); }; av.src = P + 'hero/w0.png';
  var bw = Math.min(440, W * .9), bl = Math.max(12, Math.min(cx0 - bw / 2, W - bw - 12)); tp.style.left = bl + 'px'; tp.style.bottom = (hb + 50 * K + 26) + 'px'; tp.style.setProperty('--tail', (cx0 - bl) + 'px');
  var t0 = performance.now(), flash = null;   // flash：结束时光铺满屏幕的开始时间
  function tick(n) {
    if (!document.getElementById('boot')) return; var t = Math.max(0, (n - t0) / 1000);
    cx.drawImage(room, 0, 0);
    var f = flash == null ? 0 : Math.min(1, (n - flash) / 450), gl = .35 + .15 * Math.sin(t * 9) + f * .6, r = (60 + f * f * Math.hypot(W, H) * 1.2 / K) * K / 2;
    var gr = cx.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, f ? 'rgba(200,150,255,' + Math.min(.95, gl) + ')' : 'rgba(150,255,170,' + gl * .5 + ')'); gr.addColorStop(1, 'rgba(120,60,255,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, W, H);
    hero.src = sit[f ? 2 : Math.floor(t * 3) % 2]; hero.style.transform = 'translateX(' + (cx0 - 13 * K) + 'px) scale(' + K + ')';
    if (t > .3 && !f) { tp.className = 'on'; tt.textContent = T1.slice(0, Math.floor((t - .3) / .075)); } else if (f) tp.className = '';
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  window.BOOT = {
    progress: function (p) { var e = document.getElementById('bootbar'); if (e) e.style.width = Math.round(p * 100) + '%'; },
    done: function (cb) { var go = function () { if (performance.now() - t0 < (window.BOOT_MIN || 0)) { setTimeout(go, 100); return; }
      flash = performance.now(); setTimeout(function () { b.style.opacity = '0'; if (cb) cb(); setTimeout(function () { b.remove(); }, 500); }, 420); }; go(); },
    fail: function (msg) { var t = document.getElementById('bootx'); if (t) { t.textContent = msg + '（点一下重试）'; t.style.color = '#ffb4a0'; b.addEventListener('click', function () { location.reload(); }); } },
  };
})();

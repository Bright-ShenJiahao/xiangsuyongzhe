// 像素勇者 · 精灵图：载入勇者图集和哥布林各帧，统一做三件事——
// 1. 纯黑描边换深褐（在暖色地图上不扎眼）；2. 按地图给人物调色；3. 小兵分三种人群色（原色 / 深一点 / 偏黄旧一点）。
// 不用 canvas 的 filter（iPhone Safari 不支持），自己按像素算颜色矩阵。
(() => {
  const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
  const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => no(src); i.src = src; });   // 试玩网址（raw.githack）的图片算跨域：要带 crossOrigin，不然改不了颜色
  const loadJSON = src => fetch(src).then(r => r.json());

  // ---------- 颜色矩阵（和 CSS 滤镜同一套公式）----------
  const I3 = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
  function mat(op, v) {
    if (op === 'saturate') return [.213 + .787 * v, .715 - .715 * v, .072 - .072 * v, 0, .213 - .213 * v, .715 + .285 * v, .072 - .072 * v, 0, .213 - .213 * v, .715 - .715 * v, .072 + .928 * v, 0];
    if (op === 'brightness') return [v, 0, 0, 0, 0, v, 0, 0, 0, 0, v, 0];
    if (op === 'sepia') { const a = 1 - v; return [.393 + .607 * a, .769 - .769 * a, .189 - .189 * a, 0, .349 - .349 * a, .686 + .314 * a, .168 - .168 * a, 0, .272 - .272 * a, .534 - .534 * a, .131 + .869 * a, 0]; }
    return I3();
  }
  const mul = (b, a) => { const o = []; for (let r = 0; r < 3; r++) { for (let c = 0; c < 3; c++) o.push(b[r * 4] * a[c] + b[r * 4 + 1] * a[4 + c] + b[r * 4 + 2] * a[8 + c]); o.push(b[r * 4] * a[3] + b[r * 4 + 1] * a[7] + b[r * 4 + 2] * a[11] + b[r * 4 + 3]); } return o; };
  const chain = list => (list || []).reduce((m, [op, v]) => mul(mat(op, v), m), I3());
  const VAR = [[], [['brightness', .86]], [['sepia', .25], ['saturate', .9]]];

  // 画质：默认像素（11/22 用户看过高清后定：还是像素好）；localStorage xsyz-hd = 1 时用高清（调试面板切换，切完刷新）
  // 11/22 新画风试用（HD 像素 2.5 头身）：localStorage xsyz-style = new 时男主拿剑、普通哥布林换新图
  const HF = false;   // 11/22 用户定：保持原人物帧，新帧停用（art/hero31m、hero31f 留着）   // 11/22 按立绘重出的人物剑帧
  const NEW = false;   // 11/22 用户定：保持像素画风，新画风停用（素材留在 art/heroN、art/goblin_n）
  const HD = false;   // 11/22 用户定像素；高清图只做了几种，开着会让其余怪物消失，停用
  // 一张「原图集」：base 画布 + 帧表 { 名字: [{x,y,w,h,ax,ay}, …] }
  const SETS = {};
  function brown(c) {   // 纯黑描边 → 深褐
    const x = c.getContext('2d', { willReadFrequently: true }); let d; try { d = x.getImageData(0, 0, c.width, c.height); } catch (e) { return; }   // 万一读不了像素，就不换描边，照样能玩
    const p = d.data;
    for (let i = 0; i < p.length; i += 4) if (p[i + 3] && p[i] < 56 && p[i + 1] < 50 && p[i + 2] < 50) { p[i] = 58; p[i + 1] = 34; p[i + 2] = 24; }
    x.putImageData(d, 0, 0);
  }

  function brownEdge(c) {   // 只把最外圈的黑描边换深褐（女主黑头发不能跟着变褐）
    const x = c.getContext('2d', { willReadFrequently: true }); let d; try { d = x.getImageData(0, 0, c.width, c.height); } catch (e) { return; }
    const p = d.data, W = c.width, H = c.height, A = i => (i < 0 || i >= W * H) ? 0 : p[i * 4 + 3];
    const out = [];
    for (let y = 0; y < H; y++) for (let X = 0; X < W; X++) { const i = y * W + X, k = i * 4; if (!p[k + 3] || !(p[k] < 56 && p[k + 1] < 50 && p[k + 2] < 50)) continue;
      if ((X > 0 && !A(i - 1)) || (X < W - 1 && !A(i + 1)) || !A(i - W) || !A(i + W) || (X > 1 && !A(i - 2)) || (X < W - 2 && !A(i + 2)) || !A(i - 2 * W) || !A(i + 2 * W)) out.push(k); }
    for (const k of out) { p[k] = 58; p[k + 1] = 34; p[k + 2] = 24; }
    x.putImageData(d, 0, 0);
  }
  async function load() {
    // 勇者：帝国精进图集（tools/pixel/build_atlas.py 生成）
    const [hi, hj] = await Promise.all([loadImg('art/hero/atlas.png'), loadJSON('art/hero/atlas.json')]);
    const hc = mkc(hi.width, hi.height); hc.getContext('2d').drawImage(hi, 0, 0); brown(hc);
    const hf = {}; for (const k in hj.f) if (k.startsWith('hero:')) hf[k.slice(5)] = hj.f[k].map(([x, y, w, h, ax, ay]) => ({ x, y, w, h, ax, ay }));
    SETS.hero = { base: hc, f: hf };
    // 女主（11/22，tools/pixel/build_heroine.py）：帧名和男主一样，出招帧通用
    try { const [fi, fj] = await Promise.all([loadImg('art/heroF/atlas.png'), loadJSON('art/heroF/atlas.json')]); const fc = mkc(fi.width, fi.height); fc.getContext('2d').drawImage(fi, 0, 0); brownEdge(fc);
      const ff = {}; for (const k in fj.f) if (k.startsWith('hero:')) ff[k.slice(5)] = fj.f[k].map(([x, y, w, h, ax, ay]) => ({ x, y, w, h, ax, ay })); SETS.heroF = { base: fc, f: ff }; } catch (e) { console.warn('heroF', e); }
    // 高清勇者（11/22，tools/pixel/build_hd.py：原图清晰度，sk = 1/r 换算回像素格）。画质选「像素」时不载入
    if (HD) try { const [i2, j2] = await Promise.all([loadImg('art/herohd/atlas.webp'), loadJSON('art/herohd/atlas.json')]); const c2 = mkc(i2.width, i2.height); c2.getContext('2d').drawImage(i2, 0, 0); brown(c2);
      const f2 = {}; for (const k in j2.f) if (k.startsWith('hero:')) f2[k.slice(5)] = j2.f[k].map(([x, y, w, h, ax, ay]) => ({ x, y, w, h, ax, ay })); SETS.herohd = { base: c2, f: f2, sk: 1 / j2.r, hd: true }; } catch (e) { console.warn('herohd', e); }
    // 哥布林：每种一个文件夹，一帧一张图；载入后拼成一条横图集
    // 高清时用 art/goblin_hd（同样的帧名，锚点已按 r 放大），像素小图留在 SETS['px:兵种'] 给图鉴头像用
    let gj = await loadJSON('art/goblin/frames.json'), dir = 'art/goblin';
    if (HD) try { gj = await loadJSON('art/goblin_hd/frames.json'); dir = 'art/goblin_hd'; } catch (e) { console.warn('goblin_hd', e); }
    await Promise.all(Object.keys(gj).map(async k => {
      const r = gj[k]._r || 1; delete gj[k]._r;
      const names = Object.keys(gj[k]), ims = await Promise.all(names.map(n => loadImg(`${dir}/${k}/${n}.png`)));
      const W = ims.reduce((s, i) => s + i.width + 2, 0), H = Math.max(...ims.map(i => i.height)), c = mkc(W, H), g = c.getContext('2d'); let x = 0; const f = {};
      ims.forEach((im, i) => { g.drawImage(im, x, 0); const [ax, ay] = gj[k][names[i]]; f[names[i]] = [{ x, y: 0, w: im.width, h: im.height, ax, ay }]; x += im.width + 2; });
      brown(c); SETS[k] = { base: c, f, sk: 1 / r, hd: r > 1 };
    }));
    if (HF) try { for (const k of ['hero31m', 'hero31f']) { const [im, js] = await Promise.all([loadImg(`art/${k}/atlas.png`), loadJSON(`art/${k}/atlas.json`)]); const c = mkc(im.width, im.height); c.getContext('2d').drawImage(im, 0, 0);
      const f = {}; for (const n in js.f) f[n.slice(5)] = js.f[n].map(([x, y, w, h, ax, ay]) => ({ x, y, w, h, ax, ay })); SETS[k] = { base: c, f }; } } catch (e) { console.warn('hero31', e); }
    if (NEW) try {   // 新画风：哥布林、男主剑
      const nj = await loadJSON('art/goblin_n/frames.json');
      for (const k in nj) { const names = Object.keys(nj[k]), ims = await Promise.all(names.map(n => loadImg(`art/goblin_n/${k}/${n}.png`)));
        const W = ims.reduce((s, i) => s + i.width + 2, 0), H = Math.max(...ims.map(i => i.height)), c = mkc(W, H), g = c.getContext('2d'), f = {}; let x = 0;
        names.forEach((n, i) => { g.drawImage(ims[i], x, 0); f[n] = [{ x, y: 0, w: ims[i].width, h: ims[i].height, ax: nj[k][n][0], ay: nj[k][n][1] }]; x += ims[i].width + 2; }); SETS[k] = { base: c, f }; }
      const [ni, njs] = await Promise.all([loadImg('art/heroN/atlas.png'), loadJSON('art/heroN/atlas.json')]); const hc2 = mkc(ni.width, ni.height); hc2.getContext('2d').drawImage(ni, 0, 0);
      const hf2 = {}; for (const k in njs.f) hf2[k.slice(5)] = njs.f[k].map(([x, y, w, h, ax, ay]) => ({ x, y, w, h, ax, ay })); SETS.heroN = { base: hc2, f: hf2 };
    } catch (e) { console.warn('newstyle', e); }
  }

  // 调好色的图集（当前地图 × 人群色），用到才做，换地图时清空
  let CG = {}, grade = [];
  function setGrade(g) { grade = g || []; CG = {}; }
  function sheet(set, v) {
    const key = set + '|' + (v || 0); if (CG[key]) return CG[key];
    const S = SETS[set], m = chain([...(VAR[v || 0] || []), ...grade]);
    const c = mkc(S.base.width, S.base.height), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(S.base, 0, 0);
    let d = null; try { d = x.getImageData(0, 0, c.width, c.height); } catch (e) {}
    if (d) { const p = d.data;
    for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; const r = p[i], g = p[i + 1], b = p[i + 2];
      p[i] = m[0] * r + m[1] * g + m[2] * b + m[3]; p[i + 1] = m[4] * r + m[5] * g + m[6] * b + m[7]; p[i + 2] = m[8] * r + m[9] * g + m[10] * b + m[11]; }
    x.putImageData(d, 0, 0); }
    const flip = s => { const o = mkc(s.width, s.height), g = o.getContext('2d'); g.translate(s.width, 0); g.scale(-1, 1); g.drawImage(s, 0, 0); return o; };
    const white = s => { const o = mkc(s.width, s.height), g = o.getContext('2d'); g.drawImage(s, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#fff8e8'; g.fillRect(0, 0, o.width, o.height); return o; };
    const fl = flip(c);
    return (CG[key] = { at: c, fl, wat: white(c), wfl: white(fl), W: c.width });
  }

  // 帧：frame('hero', 'run', 1)；哥布林没有分组，名字就是帧名（walk3、strike…）
  const frame = (set, name, i) => { const L = SETS[set] && SETS[set].f[name]; return L ? L[Math.max(0, Math.min(L.length - 1, i || 0))] : null; };
  const count = (set, name) => (SETS[set] && SETS[set].f[name] || []).length;

  // 画一帧：脚底中点对准屏幕 (X, Y)；u = 一个精灵像素占几个屏幕像素；k = 额外体型系数
  function draw(ctx, set, name, i, X, Y, flip, u, o = {}) {
    const f = frame(set, name, i); if (!f) return;
    const S = sheet(set, o.v), k = u * (o.k || 1) * (SETS[set].sk || 1), dw = Math.round(f.w * k), dh = Math.round(f.h * k);
    const dx = Math.round(X - (flip ? f.w - f.ax : f.ax) * k), dy = Math.round(Y - f.ay * k), sx = flip ? S.W - f.x - f.w : f.x;
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const hd = SETS[set].hd && !ctx.imageSmoothingEnabled; if (hd) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; }
    ctx.drawImage(flip ? S.fl : S.at, sx, f.y, f.w, f.h, dx, dy, dw, dh);
    if (o.white) { ctx.globalAlpha = (o.alpha == null ? 1 : o.alpha) * o.white; ctx.drawImage(flip ? S.wfl : S.wat, sx, f.y, f.w, f.h, dx, dy, dw, dh); }
    ctx.globalAlpha = 1; if (hd) ctx.imageSmoothingEnabled = false;
  }
  // 单独切一帧出来（武器选择页的小人、头像）
  function crop(set, name, i) { const f = frame(set, name, i), S = SETS[set]; if (!f) return null; const k = S.sk || 1, w = Math.max(1, Math.round(f.w * k)), h = Math.max(1, Math.round(f.h * k)), c = mkc(w, h), g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(S.base, f.x, f.y, f.w, f.h, 0, 0, w, h); return { c, f: k === 1 ? f : { ...f, w, h, ax: f.ax * k, ay: f.ay * k } }; }

  // 现在用哪套勇者：默认旧的（11/21 用户定）；localStorage xsyz-hero = new 时用新的（对比用）。k = 换算到旧勇者的身高（旧的 40 像素格）
  const heroSet = (c, w) => HF && (!w || w === 'sword') && SETS.hero31m ? (c === 'f' ? 'hero31f' : 'hero31m') : c !== 'f' && SETS.heroN && (!w || w === 'sword') ? 'heroN' : c === 'f' && SETS.heroF ? 'heroF' : SETS.herohd ? 'herohd' : 'hero';   // c = 'm' 男主 / 'f' 女主（女主暂时没有高清版）
  const heroK = () => 1;
  // 勇者拿哪种武器：o.w = sword / spear / bow / staff（11/21 四套武器图，key 是 hero:<武器>.<动作>）；没有这套就用剑
  function drawHero(ctx, n, i, X, Y, flip, u, o = {}) { const s = heroSet(o.c, o.w); if (o.w && SETS[s].f[o.w + '.' + n]) n = o.w + '.' + n; draw(ctx, s, n, i, X, Y, flip, u, o); }
  window.SPR = { HD, load, setGrade, frame, count, draw, crop, sets: SETS, heroSet, heroK, drawHero };
})();

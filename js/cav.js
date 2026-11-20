// 像素勇者 · 骑兵世界（沙盒对比用）：素材和无尽地图来自《骑兵幸存者》（art/cav/）。
// 三种玩法：feel = 'foot' 骑兵画风重画的步行勇者（art/cav/herofoot/，玩法同勇者）；feel = 'horse' 原版骑兵（转向惯性、越快越痛、满速撞飞、4 名亲卫）；feel = 'hero' 勇者玩法（指哪走哪，用选好的武器自动出手）。
// 世界坐标 = 骑兵原版的像素单位；2.5D：地面竖向压扁 SQ。
(() => {
  const SQ = .6, TAU = Math.PI * 2, PI = Math.PI, R = (a, b) => a + Math.random() * (b - a), rd = Math.round, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const HP = { maxSpeed: 280, accel: 190, brake: 550, coast: 80, turnRate: 3.4, turnSpeedFx: .72 };   // 原版马的手感参数
  const F = 1.5;   // 勇者武器的距离（像素格）换成这里的世界单位
  let cv, ctx, W = 0, H = 0, z = 1, dpr = 1, cam = { x: 0, y: 0 };
  let G = null, MAP, opt, hero, foes, guards, shots, fx, parts, nums, tele, pend;
  const keys = {}, joy = { on: false, id: null, sx: 0, sy: 0, x: 0, y: 0 };
  const hsh = (i, j, k) => { let n = (i * 73856093) ^ (j * 19349663) ^ ((k || 0) * 83492791); n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const LD = { n: 0, done: 0, bad: [], wait: [] };   // 载入进度：骑兵素材约 300 张小图，试玩网址上要等一会儿
  const img = src => { const i = new Image(); i.crossOrigin = 'anonymous'; LD.n++; const fin = ok => { LD.done++; if (!ok) LD.bad.push(src); if (LD.done >= LD.n) LD.wait.splice(0).forEach(f => f()); }; i.onload = () => fin(true); i.onerror = () => fin(false); i.src = src; return i; };
  const ready = i => i && i.complete && i.naturalWidth;

  // ---------- 素材 ----------
  const SECT = [['E', 1], ['SE', 1], ['S', 1], ['SE', -1], ['E', -1], ['NE', -1], ['N', 1], ['NE', 1]];   // 8 个朝向 = 5 张图 + 左边镜像
  const IM = {}, GT = {};
  function loadArt() {
    for (const nm of Object.keys(window.COMBO || {})) for (const d of COMBO[nm].dirs) for (let i = 0; i < 8; i++) IM[nm + d + i] = img(`art/cav/${nm}/${d}${i}.png`);
    for (const nm of Object.keys(window.FOOT || {})) { for (const d of FOOT[nm].dirs) for (let i = 0; i < 6; i++) IM[nm + d + i] = img(`art/cav/${nm}/${d}${i}.png`); IM[nm + 'fly'] = img(`art/cav/${nm}/fly.png`); }
    for (const k of ['tuft1', 'tuft2', 'tuft3', 'tuft4', 'bushS', 'bushM', 'rubble', 'flat', 'rockM', 'wreck', 'dec1', 'dec2', 'dec3', 'fence', 'fenceC']) IM['p_' + k] = img(`art/cav/props/${k}.png`);   // 只载用得到的摆件
    for (const k of ['grass', 'dirt', 'trod']) GT[k] = img(`art/cav/ground/${k}.jpg`);
    if (window.HEROFOOT) { for (const d of HEROFOOT.dirs) { for (let i = 0; i < 6; i++) hfImg(d + i); hfImg('idle' + d); hfImg('atk' + d); } hfImg('hurt'); hfImg('down'); }
    FIMG.crossOrigin = 'anonymous'; FIMG.src = DATA.maps[0].img; LD.n++; FIMG.onload = FIMG.onerror = () => { LD.done++; if (LD.done >= LD.n) LD.wait.splice(0).forEach(f => f()); };
  }

  // ---------- 无尽地面：按 512 分块生成，每块缓存成画布；同一位置每次都一样 ----------
  const TILE_W = 420, CHUNK = 512, chunks = new Map();
  function gpat(c, k) { const im = GT[k]; if (!ready(im)) return null; const p = c.createPattern(im, 'repeat'), s = TILE_W / im.naturalWidth; p.setTransform(new DOMMatrix([s, 0, 0, s, 0, 0])); return p; }
  const BT = document.createElement('canvas'), bt = BT.getContext('2d');
  function blob(c, x0, y0, k, x, y, r, alpha, core) {   // 一团柔边的黄土 / 踩踏地
    const p = gpat(c, k); if (!p) return; const S2 = Math.ceil(r * 2) + 4; if (BT.width < S2) BT.width = BT.height = S2;
    bt.setTransform(1, 0, 0, 1, 0, 0); bt.globalCompositeOperation = 'source-over'; bt.clearRect(0, 0, S2, S2);
    bt.save(); bt.translate(-(x - r), -(y - r)); bt.fillStyle = p; bt.fillRect(x - r, y - r, S2, S2); bt.restore();
    bt.globalCompositeOperation = 'destination-in'; const g = bt.createRadialGradient(r, r, r * core, r, r, r); g.addColorStop(0, `rgba(0,0,0,${alpha})`); g.addColorStop(1, 'rgba(0,0,0,0)'); bt.fillStyle = g; bt.fillRect(0, 0, S2, S2);
    c.drawImage(BT, 0, 0, S2, S2, x - r - x0, y - r - y0, S2, S2);
  }
  function buildChunk(ci, cj) {
    const c2 = document.createElement('canvas'); c2.width = c2.height = CHUNK; const c = c2.getContext('2d'), x0 = ci * CHUNK, y0 = cj * CHUNK;
    c.save(); c.translate(-x0, -y0); c.fillStyle = gpat(c, 'grass'); c.fillRect(x0, y0, CHUNK, CHUNK); c.restore();
    const BC = 700;
    for (let i = Math.floor((x0 - 500) / BC); i <= Math.floor((x0 + CHUNK + 500) / BC); i++) for (let j = Math.floor((y0 - 500) / BC); j <= Math.floor((y0 + CHUNK + 500) / BC); j++) {
      const n = Math.floor(hsh(i, j, 101) * 3);
      for (let q = 0; q < n; q++) { const x = i * BC + hsh(i, j, 110 + q) * BC, y = j * BC + hsh(i, j, 120 + q) * BC, r = 140 + hsh(i, j, 130 + q) * 300; if (x + r < x0 || x - r > x0 + CHUNK || y + r < y0 || y - r > y0 + CHUNK) continue; blob(c, x0, y0, hsh(i, j, 140 + q) < .45 ? 'dirt' : 'trod', x, y, r, .9, .35); }
    }
    return c2;
  }
  // 摆件：按 600 的格子撒（草丛、灌木、残骸、木栅栏）；栅栏和残骸能撞碎
  const PROP_CELL = 600, propCache = new Map(), broken = new Set();
  const FLAT = new Set(['tuft1', 'tuft2', 'tuft3', 'tuft4', 'rubble', 'flat', 'dec1', 'dec2', 'dec3']), PSCALE = { fence: .5, fenceC: .5, wreck: .5, dec1: .55, dec2: .5, dec3: .52 }, BRK = new Set(['fence', 'fenceC', 'wreck', 'bushS', 'bushM']);
  function propsIn(i, j) {
    const key = i + ',' + j; let v = propCache.get(key); if (v) return v; v = [];
    const x0 = i * PROP_CELL, y0 = j * PROP_CELL, Rr = k => hsh(i, j, 100 + k), add = (k, x, y, n) => { if (Math.hypot(x, y) > 260) v.push({ id: key + n, k, x, y, flat: FLAT.has(k) }); };
    const nt = Math.floor(Rr(0) * 4); for (let q = 0; q < nt; q++) add('tuft' + (1 + Math.floor(Rr(10 + q) * 4)), x0 + Rr(20 + q) * PROP_CELL, y0 + Rr(30 + q) * PROP_CELL, 't' + q);
    if (Rr(1) < .22) add(Rr(2) < .6 ? 'bushS' : 'bushM', x0 + Rr(3) * PROP_CELL, y0 + Rr(4) * PROP_CELL, 'b');
    if (Rr(5) < .12) add(['wreck', 'dec1', 'dec2', 'dec3', 'rubble', 'rockM'][Math.floor(Rr(6) * 6)], x0 + 100 + Rr(7) * 400, y0 + 100 + Rr(8) * 400, 'w');
    if (Rr(9) < .07) { const n = 2 + Math.floor(Rr(40) * 3), fx0 = x0 + 80 + Rr(41) * 260, fy = y0 + 100 + Rr(42) * 400; for (let q = 0; q < n; q++) add(q === n - 1 && Rr(43) < .4 ? 'fenceC' : 'fence', fx0 + q * 46, fy, 'f' + q); }
    propCache.set(key, v); return v;
  }
  function visibleProps() {
    const rx = W / z / 2 + 200, ry = H / (z * SQ) / 2 + 200, out = [];
    for (let i = Math.floor((cam.x - rx) / PROP_CELL); i <= Math.floor((cam.x + rx) / PROP_CELL); i++) for (let j = Math.floor((cam.y - ry) / PROP_CELL); j <= Math.floor((cam.y + ry) / PROP_CELL); j++) for (const p of propsIn(i, j)) if (!broken.has(p.id)) out.push(p);
    return out;
  }

  // ---------- 背景二选一：无尽草原 / 打谷场（只在能切换的板块） ----------
  const FIMG = new Image();
  const bgPref = () => { try { return localStorage.getItem('xsyz-bg') || 'inf'; } catch (e) { return 'inf'; } };
  function setBg(v) { try { localStorage.setItem('xsyz-bg', v); } catch (e) {} }
  function fieldRect() {   // 打谷场在世界里摆多大：和勇者板块一样，主角身高约是地图宽度的 1/16
    const w = heroH() * 16.4, h = w * 941 / 1672 / SQ; return { x: -w / 2, y: -h / 2, w, h };
  }
  function fieldClamp(o, pad = 0) {   // 只能在打谷场的地面上走（地面范围和勇者板块同一份）
    const f = fieldRect(), g = DATA.maps[0].ground; let gy = (o.y - f.y) / f.h; gy = clamp(gy, g.y0, g.y1); o.y = f.y + gy * f.h;
    const t = (gy - g.y0) / (g.y1 - g.y0), l = f.x + (g.l0 + (g.l1 - g.l0) * t) * f.w, r = f.x + (g.r0 + (g.r1 - g.r0) * t) * f.w; o.x = clamp(o.x, l + pad, r - pad);
  }

  // ---------- 画面 ----------
  const heroH = () => G && G.foot ? 32 : 46;   // 主角在世界里有多高：人马约 46，步行勇者约 32（和波斯步兵差不多）
  function fit() { dpr = Math.min(3, window.devicePixelRatio || 1); W = cv.width; H = cv.height; z = H / (heroH() * (H > W ? 10 : 8.5)); }   // 镜头距离：主角约占屏幕高度的八九分之一，竖屏拉远一点   // 镜头距离：主角（人马约 46 高）约占屏幕高度的九分之一，竖屏拉远一点，和勇者那边差不多
  const PX = x => (x - cam.x) * z + W / 2, PY = (y, h = 0) => ((y - cam.y) * SQ - h) * z + H / 2;

  // ---------- 开局 ----------
  function start(o) {
    opt = o; MAP = DATA.maps.concat(DATA.sandbox || []).find(m => m.id === o.map); fit(); preload();
    const horse = MAP.feel === 'horse';
    G = { foot: MAP.feel === 'foot', bg: MAP.bgSwitch ? bgPref() : 'inf', atkT: 0, t: 0, kills: 0, spawn: 1, over: null, paused: false, xp: 0, lv: 1, god: false, banner: null, shake: 0, horse, bossOut: false, boss: null };
    hero = { x: 0, y: 0, a: 0, v: 0, anim: 0, hp: 100, maxHp: 100, inv: 0, cd: .5, dashCd: 0, dash: 0, dead: false, flash: 0,
      m: { dmg: 1, cd: 1, area: 1, move: 1, multi: 0, ram: 1, reach: 1 }, taken: {} };
    foes = []; shots = []; fx = []; parts = []; nums = []; tele = []; pend = []; guards = [];
    if (horse) for (let i = 0; i < 4; i++) addGuard();
    fit(); if (G.bg === 'field') { const f = fieldRect(); hero.y = f.y + f.h * .55; }
    cam.x = hero.x; cam.y = hero.y; banner(horse ? '冲锋！' : '敌军来了！', 1.6);
  }
  const SLOTS = [[-55, -42], [-55, 42], [-105, -84], [-105, 84], [-150, -40], [-150, 40], [-150, -120], [-150, 120]];
  function addGuard() { const s = SLOTS[guards.length]; if (!s) return false; guards.push({ x: hero.x + s[0], y: hero.y + s[1], a: 0, v: 0, anim: R(0, 6), slot: s }); return true; }
  const banner = (t, T) => { G.banner = { t, left: T }; };

  // ---------- 输入 ----------
  const running = () => G && !G.over && !G.paused;
  function bindInput() {
    addEventListener('keydown', e => { keys[e.code] = 1; if (!G || G.over) return; if (e.code === 'Space') { dash(); e.preventDefault(); } if (e.code === 'KeyP' || e.code === 'Escape') UI.togglePause(); });
    addEventListener('keyup', e => { keys[e.code] = 0; });
    cv.addEventListener('pointerdown', e => { if (!running()) return; joy.on = true; joy.id = e.pointerId; joy.sx = joy.x = e.clientX; joy.sy = joy.y = e.clientY; });
    addEventListener('pointermove', e => { if (joy.on && e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; } });
    const up = e => { if (e.pointerId === joy.id) joy.on = false; }; addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }
  function input() {   // 屏幕上的方向 → 世界里的方向（地面竖向压扁，所以竖向要除以 SQ）
    let dx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), dy = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
    if (joy.on) { const jx = joy.x - joy.sx, jy = joy.y - joy.sy, d = Math.hypot(jx, jy); if (d > 6) { const k = Math.min(1, d / 40); dx = jx / d * k; dy = jy / d * k; } else { dx = dy = 0; } }
    const m = Math.hypot(dx, dy); return m > .1 ? { a: Math.atan2(dy / SQ, dx), k: Math.min(1, m) } : null;
  }
  function dash() {   // 骑兵：冲锋（瞬间提到满速）；勇者玩法：翻滚
    if (!running() || hero.dead || hero.dashCd > 0) return;
    if (G.horse) { hero.v = HP.maxSpeed * 1.15; hero.dashCd = 3; hero.inv = Math.max(hero.inv, .35); banner('', 0); }
    else { const i = input(); if (i) hero.a = i.a; hero.dash = .3; hero.dashCd = .9; hero.inv = Math.max(hero.inv, .4); }
  }
  const ratio = () => clamp(hero.v / HP.maxSpeed, 0, 1.2);

  // ---------- 敌人 ----------
  const ET = {
    spara: { name: '波斯步兵', hp: 10, spd: 62, r: 10, dmg: 6, xp: 1, foot: 1, sc: 1 },
    immortal: { name: '不死军', hp: 24, spd: 54, r: 11, dmg: 9, xp: 2, foot: 1, sc: 1 },
    pcav8: { name: '敌骑', hp: 40, spd: 230, r: 16, dmg: 12, xp: 3, sc: 1 },
    boss: { name: '敌将', hp: 620, spd: 250, r: 24, dmg: 18, xp: 0, sc: 1.5, boss: 1, art: 'pcav8' },
  };
  function spawn(type) {
    const T = ET[type], d = Math.hypot(W, H / SQ) / z / 2 + 60, a = R(0, TAU); let sx = hero.x + Math.cos(a) * d, sy = hero.y + Math.sin(a) * d;
    if (G.bg === 'field') { const f = fieldRect(), g = DATA.maps[0].ground, side = Math.random() * 3 | 0; sy = f.y + (side === 0 ? g.y0 : side === 1 ? g.y1 : R(g.y0, g.y1)) * f.h; sx = side < 2 ? R(f.x, f.x + f.w) : Math.random() < .5 ? f.x : f.x + f.w; const p = { x: sx, y: sy }; fieldClamp(p); sx = p.x; sy = p.y; }   // 打谷场：从栅栏、石阶、两边进来
    const e = { type, T, art: T.art || type, x: sx, y: sy, hp: T.hp * (T.boss ? 1 : 1 + G.t / 150), a: a + PI, v: 0, wk: R(0, 6), cd: R(.5, 1.5), st: 'run', flash: 0, kx: 0, ky: 0 };
    e.maxHp = e.hp; foes.push(e); return e;
  }
  function hurt(e, d, from, kb = 120, fly = false) {
    if (e.dead) return; const crit = Math.random() < .15; if (crit) d *= 1.8; d = Math.max(1, rd(d));
    e.hp -= d; e.flash = .12; nums.push({ x: e.x, y: e.y, h: (e.T.foot ? 40 : 60) * e.T.sc, v: d, t: 0, col: crit ? '#ffd84a' : '#fff', big: crit });
    const a = from ? Math.atan2(e.y - from.y, e.x - from.x) : R(0, TAU); if (!e.T.boss) { e.kx = Math.cos(a) * kb; e.ky = Math.sin(a) * kb; }
    if (e.hp <= 0) kill(e, a, fly);
  }
  function kill(e, a, fly) {
    e.dead = true; e.deadT = 0; G.kills++;
    if (e.T.foot) { const s = fly ? R(260, 380) : R(90, 150); e.fvx = Math.cos(a) * s; e.fvy = Math.sin(a) * s; e.vz = fly ? R(260, 360) : R(120, 180); e.z = 0; e.rot = 0; e.face = Math.cos(a) < 0 ? -1 : 1; }
    for (let i = 0; i < 6; i++) parts.push({ x: e.x, y: e.y, h: 20, vx: R(-80, 80), vy: R(-80, 80), vh: R(60, 160), t: 0, T: R(.4, .7), col: ['#c8a066', '#e8e0c8', '#8a6a3a'][i % 3] });
    if (e.T.boss) { banner('击败 敌将！', 3); G.shake = .5; G.winT = 2.2; for (const o of foes) if (!o.dead && o !== e) kill(o, R(0, TAU), true); return; }
    if (G.winT == null) { G.xp += e.T.xp; const need = 4 + G.lv * 3; if (G.xp >= need && !hero.dead) { G.xp -= need; G.lv++; levelUp(); } }
  }
  const UPS_HORSE = [{ id: 'dmg', name: '枪术', desc: '骑枪伤害 +25%' }, { id: 'reach', name: '长枪', desc: '骑枪更长 +20%' }, { id: 'ram', name: '冲击', desc: '撞人伤害 +40%' }, { id: 'guard', name: '亲卫', desc: '多一名亲卫骑兵', max: 4 }, { id: 'spd', name: '敏捷', desc: '出枪速度 +20%' }, { id: 'hp', name: '体魄', desc: '最大生命 +20，并回复 20' }, { id: 'heal', name: '烤肉', desc: '回复 40% 生命' }];
  function levelUp() {
    const src = G.horse ? UPS_HORSE : DATA.upgrades, L = src.filter(o => !(o.max && (hero.taken[o.id] || 0) >= o.max) && !(o.id === 'heal' && hero.hp >= hero.maxHp));
    for (let i = L.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [L[i], L[j]] = [L[j], L[i]]; }
    const pick = L.slice(0, 3).map(o => ({ id: o.id, name: o.name, desc: typeof o.desc === 'string' ? o.desc : o.desc[opt.weapon] }));
    G.paused = true; UI.levelUp(pick, id => { applyUp(id); G.paused = false; });
  }
  function applyUp(id) {
    const m = hero.m; hero.taken[id] = (hero.taken[id] || 0) + 1;
    if (id === 'dmg') m.dmg *= 1.25; if (id === 'spd') m.cd /= 1.2; if (id === 'area') m.area *= 1.2; if (id === 'move') m.move *= 1.12; if (id === 'multi') m.multi++;
    if (id === 'reach') m.reach *= 1.2; if (id === 'ram') m.ram *= 1.4; if (id === 'guard') addGuard();
    if (id === 'hp') { hero.maxHp += 20; hero.hp = Math.min(hero.maxHp, hero.hp + 20); } if (id === 'heal') hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * .4);
  }
  function damageHero(d) {
    if (hero.inv > 0 || hero.dead || G.over || G.god) return;
    hero.hp -= d; hero.inv = .7; hero.flash = .2; G.shake = Math.max(G.shake, .15); nums.push({ x: hero.x, y: hero.y, h: 60, v: rd(d), t: 0, col: '#ff6a5a' });
    if (hero.hp <= 0) { hero.hp = 0; hero.dead = true; banner('倒下了……', 99); G.loseT = 1.6; }
  }
  function foeAI(e, dt) {
    const dx = hero.x - e.x, dy = hero.y - e.y, d = Math.hypot(dx, dy) || 1, T = e.T; e.cd -= dt;
    if (T.foot) {
      if (e.st === 'wind') { e.t2 += dt; if (e.t2 > .45) { e.st = 'run'; e.cd = R(1, 1.6); if (d < T.r + 30) damageHero(T.dmg); fx.push({ k: 'poke', x: e.x, y: e.y, a: Math.atan2(dy, dx), t: 0, T: .15 }); } return; }
      e.a = Math.atan2(dy, dx); if (d < T.r + 22 && e.cd <= 0) { e.st = 'wind'; e.t2 = 0; return; }
      if (d > T.r + 14) { e.x += dx / d * T.spd * dt; e.y += dy / d * T.spd * dt; e.wk += T.spd * dt / 9; }
      return;
    }
    // 骑兵：有惯性地冲向勇者，冲过头再兜回来
    const ta = Math.atan2(dy, dx); let da = ((ta - e.a + PI * 3) % TAU) - PI; const tr = 2.2 * (1 - .6 * e.v / T.spd);
    e.a += clamp(da, -tr * dt, tr * dt); e.v = Math.min(T.spd, e.v + 160 * dt) * (Math.abs(da) > 1.6 ? .985 : 1);
    e.x += Math.cos(e.a) * e.v * dt; e.y += Math.sin(e.a) * e.v * dt; e.anim = (e.anim || 0) + e.v * dt / 22;
    if (d < T.r + 22 && e.cd <= 0 && e.v > 90) { damageHero(T.dmg); e.cd = 1.2; }
  }

  // ---------- 勇者的攻击 ----------
  function nearest(maxD, arc) { let b = null, bd = maxD; for (const e of foes) if (!e.dead) { const d = Math.hypot(e.x - hero.x, e.y - hero.y); if (d >= bd) continue; if (arc != null) { const da = Math.abs(((Math.atan2(e.y - hero.y, e.x - hero.x) - hero.a + PI * 3) % TAU) - PI); if (da > arc) continue; } bd = d; b = e; } return b; }
  function attack(dt) {
    hero.cd -= dt; for (let i = pend.length - 1; i >= 0; i--) { pend[i].t -= dt; if (pend[i].t <= 0) { pend[i].fn(); pend.splice(i, 1); } }
    if (hero.dead) return; const m = hero.m;
    if (G.horse) {
      // 撞：满速以上撞到步兵直接撞飞
      const r = ratio();
      if (r >= .7) for (const e of foes) if (!e.dead && Math.hypot(e.x - hero.x, e.y - hero.y) < e.T.r + 22) { if (e.T.foot) hurt(e, 25 * m.ram * (.5 + 1.5 * r), hero, 240, true); else if (!e.ramT || e.ramT < G.t) { e.ramT = G.t + .6; hurt(e, 18 * m.ram * r, hero, 60); } }
      for (const g of guards) if (g.v > 150) for (const e of foes) if (!e.dead && e.T.foot && Math.hypot(e.x - g.x, e.y - g.y) < e.T.r + 18) hurt(e, 14 * m.ram, g, 200, true);
      // 骑枪：前方约 100° 里有人就刺，永远朝马头方向
      if (hero.cd > 0) return; const reach = (70 + 40 * r) * m.reach, t = nearest(reach, .9); if (!t) { hero.cd = .06; return; }
      hero.cd = .55 * m.cd; fx.push({ k: 'thrust', x: hero.x, y: hero.y, a: hero.a, L: reach, t: 0, T: .16 });
      for (const e of foes) if (!e.dead) { const d = Math.hypot(e.x - hero.x, e.y - hero.y), da = Math.abs(((Math.atan2(e.y - hero.y, e.x - hero.x) - hero.a + PI * 3) % TAU) - PI); if (d < reach + e.T.r && Math.sin(da) * d < 16 + e.T.r && Math.cos(da) > 0) hurt(e, 12 * m.dmg * (.5 + 1.5 * r), hero, 160, r > .8); }
      return;
    }
    if (hero.cd > 0 || hero.dash > 0) return;
    const WP = DATA.weapons[opt.weapon], dmg = WP.dmg * m.dmg * 1.6, area = m.area, cd0 = hero.cd;
    if (opt.weapon === 'sword') {
      const t = nearest(WP.range * F * area * 1.1); if (!t) { hero.cd = .1; return; } const a = Math.atan2(t.y - hero.y, t.x - hero.x); hero.a = a; hero.cd = WP.cd * m.cd;
      const slash = (aa, dl) => pend.push({ t: dl, fn: () => { const r = WP.range * F * area; fx.push({ k: 'slash', x: hero.x, y: hero.y, a: aa, r, t: 0, T: .2 }); for (const e of foes) if (!e.dead) { const da = Math.abs(((Math.atan2(e.y - hero.y, e.x - hero.x) - aa + PI * 3) % TAU) - PI); if (Math.hypot(e.x - hero.x, e.y - hero.y) < r + e.T.r && da < WP.arc) hurt(e, dmg, hero, 150); } } });
      swung(); slash(a, .08); [a + PI, a + PI / 2, a - PI / 2].slice(0, m.multi).forEach((aa, i) => slash(aa, .22 + i * .13));
    } else if (opt.weapon === 'axe') {
      const t = nearest(WP.range * F * area * 1.3); if (!t) { hero.cd = .1; return; } const a = Math.atan2(t.y - hero.y, t.x - hero.x); hero.cd = WP.cd * m.cd; hero.a = a; swung();
      const n = 1 + m.multi; for (let i = 0; i < n; i++) shots.push({ k: 'axe', a: a + (i - (n - 1) / 2) * .45, d: 0, out: true, t: 0, hit: new Set(), L: WP.range * F * area, r: WP.size * F * area, dmg, x: hero.x, y: hero.y });
    } else {
      const R2 = WP.boom * F * area, cand = foes.filter(e => !e.dead && Math.hypot(e.x - hero.x, e.y - hero.y) < WP.range * F * area * 1.1); if (!cand.length) { hero.cd = .1; return; }
      const sc = e => foes.reduce((n, o) => n + (!o.dead && Math.hypot(o.x - e.x, o.y - e.y) < R2 ? 1 : 0), 0); cand.sort((p, q) => sc(q) - sc(p)); hero.cd = WP.cd * m.cd; hero.a = Math.atan2(cand[0].y - hero.y, cand[0].x - hero.x); swung();
      for (let i = 0; i < 1 + m.multi; i++) { const e = cand[i % cand.length], j = i >= cand.length ? 40 : 0; shots.push({ k: 'fire', x: e.x + R(-j, j), y: e.y + R(-j, j), t: 0, T: .5, r: R2, dmg }); }
    }
  }
  function swung() { G.atkT = .28; }
  function shotTick(dt) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const o = shots[i]; o.t += dt;
      if (o.k === 'axe') {
        const sp = o.out ? 420 : 500;
        if (o.out) { o.d += sp * dt; if (o.d >= o.L) { o.out = false; o.hit.clear(); } o.x = hero.x + Math.cos(o.a) * o.d; o.y = hero.y + Math.sin(o.a) * o.d; }
        else { const dx = hero.x - o.x, dy = hero.y - o.y, d = Math.hypot(dx, dy); if (d < sp * dt) { shots.splice(i, 1); continue; } o.x += dx / d * sp * dt; o.y += dy / d * sp * dt; }
        for (const e of foes) if (!e.dead && !o.hit.has(e) && Math.hypot(e.x - o.x, e.y - o.y) < o.r + e.T.r) { o.hit.add(e); hurt(e, o.dmg, o, 120); }
      } else if (o.k === 'fire' && o.t >= o.T) {
        shots.splice(i, 1); G.shake = Math.max(G.shake, .1); fx.push({ k: 'boom', x: o.x, y: o.y, r: o.r, t: 0, T: .4 });
        for (const e of foes) if (!e.dead && Math.hypot(e.x - o.x, e.y - o.y) < o.r + e.T.r) hurt(e, o.dmg, o, 200, true);
        for (let j = 0; j < 14; j++) parts.push({ x: o.x, y: o.y, h: 5, vx: R(-120, 120), vy: R(-120, 120), vh: R(80, 220), t: 0, T: R(.3, .6), col: ['#fff2a0', '#ffb040', '#ff6020', '#a03010'][j % 4] });
      }
    }
  }

  // ---------- 每帧 ----------
  function update(dt) {
    G.t += dt; if (G.banner && (G.banner.left -= dt) <= 0) G.banner = null; G.shake = Math.max(0, G.shake - dt);
    if (G.winT != null && (G.winT -= dt) <= 0 && !G.over) { G.over = 'win'; return end(); }
    if (hero.dead) { if ((G.loseT -= dt) <= 0 && !G.over) { G.over = 'lose'; return end(); } }
    else {
      hero.inv -= dt; hero.flash -= dt; hero.dashCd -= dt; G.atkT -= dt; const inp = input();
      if (G.horse) {
        if (inp) { let da = ((inp.a - hero.a + PI * 3) % TAU) - PI; const tr = HP.turnRate * (1 - HP.turnSpeedFx * ratio()); hero.a += clamp(da, -tr * dt, tr * dt);
          if (Math.abs(da) > 2.2) hero.v = Math.max(0, hero.v - HP.brake * dt); else if (hero.v < HP.maxSpeed * inp.k) hero.v = Math.min(HP.maxSpeed * inp.k, hero.v + HP.accel * dt); else hero.v = Math.max(HP.maxSpeed * inp.k, hero.v - HP.coast * dt); }
        else hero.v = Math.max(0, hero.v - HP.coast * dt);
      } else if (hero.dash > 0) { hero.dash -= dt; hero.v = 420; }
      else if (inp) { if (G.atkT <= 0) hero.a = inp.a; hero.mvA = inp.a; hero.v = (G.foot ? 120 : 150) * inp.k * hero.m.move; } else hero.v = 0;
      const ma = !G.horse && hero.dash <= 0 && hero.mvA != null ? hero.mvA : hero.a; hero.x += Math.cos(ma) * hero.v * dt; hero.y += Math.sin(ma) * hero.v * dt; hero.anim += hero.v * dt / (G.foot ? 14 : 22);
      if (G.bg === 'field') fieldClamp(hero, 6);
      if (G.horse && ratio() > .5) for (const p of visibleProps()) if (BRK.has(p.k) && !broken.has(p.id) && Math.hypot(p.x - hero.x, p.y - hero.y) < 26) { broken.add(p.id); for (let i = 0; i < 8; i++) parts.push({ x: p.x, y: p.y, h: 10, vx: Math.cos(hero.a) * R(60, 200) + R(-50, 50), vy: Math.sin(hero.a) * R(60, 200) + R(-50, 50), vh: R(80, 200), t: 0, T: R(.4, .8), col: p.k.startsWith('bush') ? '#5a8a3a' : '#7a5530' }); }
      attack(dt);
    }
    // 亲卫：楔形跟在身后，跑起来也会撞人
    for (const g of guards) { const ca = Math.cos(hero.a), sa = Math.sin(hero.a), tx = hero.x + ca * g.slot[0] - sa * g.slot[1], ty = hero.y + sa * g.slot[0] + ca * g.slot[1], dx = tx - g.x, dy = ty - g.y, d = Math.hypot(dx, dy);
      const want = Math.min(330, hero.v + d * 2.2); g.v += clamp(want - g.v, -500 * dt, 300 * dt); if (d > 2) { const ta = Math.atan2(dy, dx); g.a = d > 20 ? ta : g.a + clamp(((hero.a - g.a + PI * 3) % TAU) - PI, -3 * dt, 3 * dt); g.x += dx / d * Math.min(d, g.v * dt); g.y += dy / d * Math.min(d, g.v * dt); } else g.v = hero.v; g.anim += g.v * dt / 22; }
    // 刷兵
    if (G.winT == null) { G.spawn -= dt; const alive = foes.filter(e => !e.dead && !e.T.boss).length, want = G.bossOut ? 14 : Math.min(70, 10 + G.t * .5);
      if (G.spawn <= 0 && alive < want) { const n = G.t < 15 ? 3 : 5; for (let i = 0; i < n; i++) spawn(G.t > 60 && Math.random() < .15 ? 'pcav8' : G.t > 30 && Math.random() < .3 ? 'immortal' : 'spara'); G.spawn = Math.max(.35, .9 - G.t * .005) * (G.bossOut ? 2 : 1); }
      if (!G.bossOut && G.t >= MAP.time) { G.bossOut = true; G.boss = spawn('boss'); banner('敌将 出阵！', 2.4); G.shake = .3; } }
    for (const e of foes) {
      if (e.dead) { e.deadT += dt; if (e.T.foot) { e.x += e.fvx * dt; e.y += e.fvy * dt; e.vz -= 700 * dt; e.z = Math.max(0, e.z + e.vz * dt); e.rot += dt * 9; if (!e.z) { e.fvx *= .85; e.fvy *= .85; } } continue; }
      e.flash -= dt; foeAI(e, dt); e.x += e.kx * dt; e.y += e.ky * dt; e.kx *= .86; e.ky *= .86; if (G.bg === 'field') fieldClamp(e, 3);
      if (G.bg !== 'field' && Math.hypot(e.x - hero.x, e.y - hero.y) > 1800 && !e.T.boss) { const a = R(0, TAU), d = Math.hypot(W, H / SQ) / z / 2 + 60; e.x = hero.x + Math.cos(a) * d; e.y = hero.y + Math.sin(a) * d; }   // 被甩太远的绕到前面去
    }
    const L = foes.filter(e => !e.dead && e.T.foot);
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.T.r + b.T.r; if (d > 0 && d < m) { const p = (m - d) / 2 / d; a.x -= dx * p; a.y -= dy * p; b.x += dx * p; b.y += dy * p; } }
    for (let i = foes.length - 1; i >= 0; i--) if (foes[i].dead && foes[i].deadT > (foes[i].T.foot ? 1.1 : 1.4)) foes.splice(i, 1);
    shotTick(dt);
    for (const a of [fx, parts, nums]) for (let i = a.length - 1; i >= 0; i--) { const o = a[i]; o.t += dt; if (o.vx != null) { o.x += o.vx * dt; o.y += o.vy * dt; o.h = Math.max(0, o.h + o.vh * dt); o.vh -= 500 * dt; } if (o.t >= (o.T || .75)) a.splice(i, 1); }
    // 镜头：跟着勇者，骑马时往前看一点
    const look = G.horse ? .35 : 0, tx = hero.x + Math.cos(hero.a) * hero.v * look, ty = hero.y + Math.sin(hero.a) * hero.v * look;
    cam.x += (tx - cam.x) * Math.min(1, dt * 4); cam.y += (ty - cam.y) * Math.min(1, dt * 4);
    if (G.bg === 'field') { const f = fieldRect(), vw = W / z, vh = H / (z * SQ); cam.x = vw >= f.w ? f.x + f.w / 2 : clamp(cam.x, f.x + vw / 2, f.x + f.w - vw / 2); cam.y = vh >= f.h ? f.y + f.h / 2 : clamp(cam.y, f.y + vh / 2, f.y + f.h - vh / 2); }   // 镜头不出打谷场
  }
  function end() { UI.result({ win: G.over === 'win', kills: G.kills, time: G.t, lv: G.lv, weapon: opt.weapon, wname: G.horse ? '骑枪' : null, map: opt.map }); }

  // ---------- 绘制 ----------
  function shadow(x, y, rx, ry) { ctx.fillStyle = 'rgba(30,24,10,.28)'; ctx.beginPath(); ctx.ellipse(PX(x), PY(y), rx * z, ry * z, 0, 0, TAU); ctx.fill(); }
  function combo(o, nm, sc = 1, alpha = 1, white = 0) {
    const C = window.COMBO && COMBO[nm]; if (!C) return; const sx = Math.cos(o.a), sy = Math.sin(o.a) * SQ, sec = ((Math.round(Math.atan2(sy, sx) / (PI / 4)) % 8) + 8) % 8, [dn, flip] = SECT[sec], di = C.dirs.indexOf(dn);
    const fi = o.v < 15 ? Math.floor(G.t * 1.6) % 2 : 2 + Math.floor(o.anim || 0) % 6, im = IM[nm + dn + fi], Fm = C.frames[di][fi]; if (!ready(im)) return;
    shadow(o.x, o.y, (dn === 'S' || dn === 'N' ? 12 : 24) * sc, 9 * sc);
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(rd(PX(o.x)), rd(PY(o.y) - Fm.up * z * sc)); if (flip < 0) ctx.scale(-1, 1);
    ctx.drawImage(im, -Fm.ax * z * sc, -Fm.h * z * sc, Fm.w * z * sc, Fm.h * z * sc);
    if (white > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * white; ctx.drawImage(im, -Fm.ax * z * sc, -Fm.h * z * sc, Fm.w * z * sc, Fm.h * z * sc); }
    ctx.restore();
  }
  function foot(e) {
    const C = window.FOOT && FOOT[e.art]; if (!C) return;
    if (e.dead) { const im = IM[e.art + 'fly']; if (!ready(im)) return; const w = C.fly.w * z, h = C.fly.h * z; shadow(e.x, e.y, e.T.r, e.T.r * .5); ctx.save(); ctx.globalAlpha = clamp((1.1 - e.deadT) * 3, 0, 1); ctx.translate(PX(e.x), PY(e.y, e.z) - h / 2); ctx.rotate(e.rot * .3); if (e.face < 0) ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); return; }
    const sx = Math.cos(e.a), sy = Math.sin(e.a) * SQ, sec = ((Math.round(Math.atan2(sy, sx) / (PI / 4)) % 8) + 8) % 8, [dn, flip] = SECT[sec], di = C.dirs.indexOf(dn);
    const fi = e.st === 'wind' ? 0 : Math.floor(e.wk) % 6, im = IM[e.art + dn + fi], Fm = C.frames[di][fi]; if (!ready(im)) return;
    shadow(e.x, e.y, e.T.r * 1.1, e.T.r * .6);
    ctx.save(); ctx.translate(rd(PX(e.x) + (e.st === 'wind' ? Math.cos(e.a) * 3 * z : 0)), rd(PY(e.y) - Fm.up * z)); if (flip < 0) ctx.scale(-1, 1);
    ctx.drawImage(im, -Fm.ax * z, -Fm.h * z, Fm.w * z, Fm.h * z); if (e.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .6; ctx.drawImage(im, -Fm.ax * z, -Fm.h * z, Fm.w * z, Fm.h * z); } ctx.restore();
  }
  // 骑兵画风的步行勇者：5 张方向图 + 左边镜像；走路 6 帧、待机、挥剑、受击、倒地
  const HFI = {};
  function hfImg(n) { return HFI[n] || (HFI[n] = img(`art/cav/herofoot/${n}.png`)); }
  function footHero() {
    const M = window.HEROFOOT; if (!M) return; const k = 32 / 145 * z;   // 原图里人约 145 像素高 → 世界里 32
    let name, Fm, flip = 1;
    const sx = Math.cos(hero.a), sy = Math.sin(hero.a) * SQ, sec = ((Math.round(Math.atan2(sy, sx) / (PI / 4)) % 8) + 8) % 8, [dn, fl] = SECT[sec], di = M.dirs.indexOf(dn);
    if (hero.dead) { name = 'down'; Fm = M.down; flip = Math.cos(hero.a) < 0 ? -1 : 1; }
    else if (hero.flash > 0) { name = 'hurt'; Fm = M.hurt; flip = Math.cos(hero.a) < 0 ? -1 : 1; }
    else if (G.atkT > 0) { name = 'atk' + dn; Fm = M.atk[di]; flip = fl; }
    else if (hero.v > 5 || hero.dash > 0) { const i = Math.floor(hero.anim) % 6; name = dn + i; Fm = M.walk[di][i]; flip = fl; }
    else { name = 'idle' + dn; Fm = M.idle[di]; flip = fl; }
    const im = hfImg(name); if (!ready(im)) return;
    shadow(hero.x, hero.y, 12, 6);
    ctx.save(); ctx.imageSmoothingEnabled = false; if (hero.dash > 0) ctx.globalAlpha = .7; ctx.translate(rd(PX(hero.x)), rd(PY(hero.y))); if (flip < 0) ctx.scale(-1, 1);
    ctx.drawImage(im, -Fm.ax * k, -Fm.ay * k, Fm.w * k, Fm.h * k);
    if (hero.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .45; ctx.drawImage(im, -Fm.ax * k, -Fm.ay * k, Fm.w * k, Fm.h * k); }
    ctx.restore();
    if (hero.dash > 0) { ctx.save(); ctx.globalAlpha = .25; ctx.translate(rd(PX(hero.x - Math.cos(hero.a) * 14)), rd(PY(hero.y - Math.sin(hero.a) * 14))); if (flip < 0) ctx.scale(-1, 1); ctx.drawImage(im, -Fm.ax * k, -Fm.ay * k, Fm.w * k, Fm.h * k); ctx.restore(); }   // 翻滚：拖一道残影
  }
  function prop(p) {
    const M = PROPS[p.k], im = IM['p_' + p.k]; if (!M || !ready(im)) return; const s = (PSCALE[p.k] || 1) * z, w = M.w * s, h = M.h * s;
    if (p.flat) ctx.drawImage(im, PX(p.x) - w / 2, PY(p.y) - h / 2, w, h); else ctx.drawImage(im, PX(p.x) - M.ax * s, PY(p.y) - M.ay * s, w, h);
  }
  function draw() {
    if (!G) return; fit();
    const sh = G.shake > 0 ? R(-3, 3) * dpr : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#8a7444'; ctx.fillRect(0, 0, W, H);
    // 地面分块
    ctx.setTransform(z, 0, 0, z * SQ, W / 2 - cam.x * z + sh, H / 2 - cam.y * SQ * z); ctx.imageSmoothingEnabled = true;
    const vw = W / z, vh = H / (z * SQ), x0 = cam.x - vw / 2, y0 = cam.y - vh / 2; let budget = 3;
    if (G.bg === 'field') { ctx.setTransform(1, 0, 0, 1, sh, 0); const f = fieldRect(); if (ready(FIMG)) ctx.drawImage(FIMG, PX(f.x), PY(f.y), f.w * z, f.h * SQ * z); }
    else if (ready(GT.grass) && ready(GT.dirt) && ready(GT.trod)) for (let ci = Math.floor(x0 / CHUNK); ci <= Math.floor((x0 + vw) / CHUNK); ci++) for (let cj = Math.floor(y0 / CHUNK); cj <= Math.floor((y0 + vh) / CHUNK); cj++) {
      const k = ci + ',' + cj; let ch = chunks.get(k); if (!ch && budget-- > 0) { ch = buildChunk(ci, cj); chunks.set(k, ch); if (chunks.size > 90) chunks.delete(chunks.keys().next().value); }
      if (ch) ctx.drawImage(ch, ci * CHUNK, cj * CHUNK, CHUNK + .5, CHUNK + .5);
    }
    ctx.setTransform(1, 0, 0, 1, sh, 0);
    const props = G.bg === 'field' ? [] : visibleProps(); for (const p of props) if (p.flat) prop(p);
    for (const t of tele) {}
    for (const o of shots) if (o.k === 'fire') { const p = o.t / o.T; ctx.fillStyle = `rgba(255,90,30,${.15 + .2 * p})`; ctx.beginPath(); ctx.ellipse(PX(o.x), PY(o.y), o.r * z * (.3 + .7 * p), o.r * z * SQ * (.3 + .7 * p), 0, 0, TAU); ctx.fill(); }
    const list = [...props.filter(p => !p.flat).map(p => ({ y: p.y, p })), ...foes.map(e => ({ y: e.y, e })), ...guards.map(g => ({ y: g.y, g })), { y: hero.y, h: 1 }]; list.sort((a, b) => a.y - b.y);
    for (const o of list) {
      if (o.p) prop(o.p);
      else if (o.g) combo(o.g, 'comp8');
      else if (o.h) { if (hero.inv > 0 && !hero.dead && hero.flash <= 0 && Math.floor(G.t * 20) % 2 && hero.dash <= 0) continue; if (G.foot) footHero(); else combo(hero, 'hero8', 1, hero.dead ? .5 : 1, hero.flash > 0 ? .5 : 0); }
      else { const e = o.e; if (e.T.foot) foot(e); else combo(e, 'pcav8', e.T.sc, e.dead ? clamp(1.4 - e.deadT, 0, 1) : 1, e.flash > 0 ? .5 : 0); }
    }
    for (const o of fx) { const p = o.t / o.T;
      if (o.k === 'thrust') { ctx.strokeStyle = `rgba(255,255,240,${1 - p})`; ctx.lineWidth = 4 * z; ctx.beginPath(); const L0 = 20, L1 = o.L * (.5 + p * .5); ctx.moveTo(PX(o.x + Math.cos(o.a) * L0), PY(o.y + Math.sin(o.a) * L0, 24)); ctx.lineTo(PX(o.x + Math.cos(o.a) * L1), PY(o.y + Math.sin(o.a) * L1, 24)); ctx.stroke(); }
      else if (o.k === 'poke') { ctx.strokeStyle = `rgba(255,220,200,${1 - p})`; ctx.lineWidth = 2 * z; ctx.beginPath(); ctx.moveTo(PX(o.x), PY(o.y, 16)); ctx.lineTo(PX(o.x + Math.cos(o.a) * 32), PY(o.y + Math.sin(o.a) * 32, 16)); ctx.stroke(); }
      else if (o.k === 'slash') { for (let k = 0; k < 3; k++) { ctx.strokeStyle = ['#ffffff', '#fff2b0', '#f0c04c'][k]; ctx.lineWidth = (4 - k) * z; ctx.beginPath(); ctx.ellipse(PX(o.x), PY(o.y, 18), (o.r - k * 8) * z, (o.r - k * 8) * z * SQ, 0, o.a - 1.35, o.a - 1.35 + 2.7 * Math.min(1, p * 1.6)); ctx.stroke(); } }
      else if (o.k === 'boom') { ctx.strokeStyle = p < .4 ? '#fff2a0' : p < .7 ? '#ff9a30' : '#a03a18'; ctx.lineWidth = 6 * z * (1 - p); ctx.beginPath(); ctx.ellipse(PX(o.x), PY(o.y), o.r * z * (.5 + p * .7), o.r * z * SQ * (.5 + p * .7), 0, 0, TAU); ctx.stroke(); }
    }
    for (const o of shots) {
      if (o.k === 'axe') { ctx.save(); ctx.translate(PX(o.x), PY(o.y, 20)); ctx.rotate(o.t * 14); ctx.fillStyle = '#7a4a22'; ctx.fillRect(-2 * z, -10 * z, 4 * z, 20 * z); ctx.fillStyle = '#dfe4f0'; ctx.beginPath(); ctx.moveTo(0, -10 * z); ctx.lineTo(12 * z, -14 * z); ctx.lineTo(12 * z, 2 * z); ctx.closePath(); ctx.fill(); ctx.restore(); }
      else if (o.k === 'fire') { const p = o.t / o.T; ctx.fillStyle = '#ff8a30'; ctx.beginPath(); ctx.arc(PX(o.x), PY(o.y, (1 - p) * 260), 9 * z, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff2a0'; ctx.beginPath(); ctx.arc(PX(o.x), PY(o.y, (1 - p) * 260), 4 * z, 0, TAU); ctx.fill(); }
    }
    for (const q of parts) { ctx.fillStyle = q.col; const s = 3 * z; ctx.fillRect(PX(q.x), PY(q.y, q.h), s, s); }
    ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    for (const n of nums) { const y = PY(n.y, n.h + n.t * 40); ctx.font = `${(n.big ? 18 : 14) * dpr}px Pix, monospace`; ctx.lineWidth = 3 * dpr; ctx.strokeStyle = '#2a160e'; ctx.strokeText(n.v, PX(n.x), y); ctx.fillStyle = n.col; ctx.fillText(n.v, PX(n.x), y); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (G.horse && ratio() > .75) { const a = (ratio() - .75) * 1.2, g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .7); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }   // 高速暗角
    if (joy.on) { ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.beginPath(); ctx.arc(joy.sx * dpr, joy.sy * dpr, 40 * dpr, 0, 7); ctx.fill(); const jx = joy.x - joy.sx, jy = joy.y - joy.sy, d = Math.hypot(jx, jy), k = Math.min(1, 40 / (d || 1)); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc((joy.sx + jx * k) * dpr, (joy.sy + jy * k) * dpr, 18 * dpr, 0, 7); ctx.fill(); }
    UI.hud({ hp: hero.hp, maxHp: hero.maxHp, lv: G.lv, xp: G.xp, need: 4 + G.lv * 3, kills: G.kills, left: Math.max(0, MAP.time - G.t), bossOut: G.bossOut, boss: G.boss && !G.boss.dead ? G.boss.hp / G.boss.maxHp : null, bossName: '敌将', banner: G.banner ? G.banner.t : '',
      speed: G.horse ? Math.round(ratio() * 100) : null });
  }

  function preload(onProg) {   // 开打前把素材全部载完（地图选择页就开始在后台载）
    if (!LD.started) { LD.started = true; loadArt(); }
    return new Promise(res => { if (LD.done >= LD.n) return res(LD); LD.wait.push(() => res(LD)); if (onProg) { onProg(LD); const iv = setInterval(() => { if (LD.done >= LD.n) clearInterval(iv); else onProg(LD); }, 100); } });
  }
  function frame(dt) { if (!G) return; if (!G.paused && !G.over) update(dt); draw(); }
  function init(canvas) { cv = canvas; ctx = cv.getContext('2d'); bindInput(); }
  window.CAV = {
    init, start, frame, preload, roll: dash, bg: () => G && G.bg, setBg,
    pause(v) { if (G && !G.over) G.paused = v; }, get paused() { return !!(G && G.paused); }, active: () => !!G && !G.over, stop() { G = null; },
    debug: { boss: () => G && !G.bossOut && (G.t = MAP.time), god: () => G && (G.god = !G.god), clear: () => G && foes.forEach(e => !e.T.boss && !e.dead && kill(e, R(0, TAU), true)), lvl: () => G && (G.lv++, levelUp()), win: () => { if (!G) return; if (!G.boss) { G.bossOut = true; G.boss = spawn('boss'); } kill(G.boss, 0, false); }, heal: () => hero && (hero.hp = hero.maxHp), state: () => ({ G, hero, foes, guards, z }) },
  };
})();

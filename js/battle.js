// 像素勇者 · 战斗。
// 世界坐标 = 地图像素（打谷场原图 1672×941）；人物、距离按「像素格」算，1 格 = K 个地图像素。
// 屏幕上一个精灵像素 = u 个设备像素（整数，像素才整齐）；u 按屏幕高度算，让勇者约占屏幕高度的八分之一。
// 地图用原图高清画，人物按整数倍放大不平滑，两者分开处理。
(() => {
  const K = 2.55, MAPW = 1672, MAPH = 941, YS = 1.35;   // YS：俯视地面压扁，算距离时竖向放大
  const R = (a, b) => a + Math.random() * (b - a), rd = Math.round, PI = Math.PI;
  let cv, ctx, W = 0, H = 0, u = 2, s = 1, cam = { x: 0, y: 0 };
  let MAP, MIMG, WEP, opt, G, hero, foes, shots, fx, parts, nums, tele, burns;
  const keys = {};
  const joy = { on: false, id: null, sx: 0, sy: 0, x: 0, y: 0 };

  // ---------- 场地 ----------
  function ground(y) { const g = MAP.ground, t = Math.max(0, Math.min(1, (y / MAPH - g.y0) / (g.y1 - g.y0))); return [(g.l0 + (g.l1 - g.l0) * t) * MAPW, (g.r0 + (g.r1 - g.r0) * t) * MAPW]; }
  function clampG(o, pad = 0) { const g = MAP.ground; o.y = Math.max(g.y0 * MAPH, Math.min(g.y1 * MAPH, o.y)); const [l, r] = ground(o.y); o.x = Math.max(l + pad, Math.min(r - pad, o.x)); }
  const dist = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * YS) / K;   // 单位：像素格
  const ang = (a, b) => Math.atan2((b.y - a.y) * YS, b.x - a.x);

  // ---------- 画面尺寸 ----------
  function fit() {
    const dpr = Math.min(3, window.devicePixelRatio || 1); W = Math.round(innerWidth * dpr); H = Math.round(innerHeight * dpr);
    cv.width = W; cv.height = H;
    u = Math.max(1, Math.round(H / 320));
    while (u / K * MAPW < W || u / K * MAPH < H) u++;   // 地图一定要盖满屏幕（超宽屏会把人物放大一点）
    s = u / K; ctx.imageSmoothingEnabled = false;
  }
  const X = x => rd((x - cam.x) * s), Y = y => rd((y - cam.y) * s);

  // ---------- 开局 ----------
  function start(o) {
    opt = o; MAP = DATA.maps.find(m => m.id === o.map); WEP = DATA.weapons[o.weapon]; SPR.setGrade(MAP.grade);
    MIMG = new Image(); MIMG.crossOrigin = 'anonymous'; MIMG.src = MAP.img;
    G = { t: 0, kills: 0, spawn: 1, boss: null, bossOut: false, over: null, overT: 0, shake: 0, hitStop: 0, paused: false, xp: 0, lv: 1, god: false, banner: null };
    const g = MAP.ground;
    hero = { x: MAPW / 2, y: (g.y0 + g.y1) / 2 * MAPH, hp: 100, maxHp: 100, f: 1, t: 0, roll: 0, rollCd: 0, inv: 0, hurtT: 0, atkT: 0, moving: false, cd: .6, dead: false,
      m: { dmg: 1, cd: 1, area: 1, move: 1, multi: 0 }, taken: {}, crit: .1, dmgIn: 1, xpMul: 1 };
    applyBuild(o.build);
    foes = []; shots = []; fx = []; parts = []; nums = []; tele = []; burns = []; pend = [];
    banner('哥布林来了！', 1.8);
  }
  let pend = [];
  // 备战页的配置：属性、开局宝物、现实习惯 → 勇者的各项数值
  function applyBuild(b) {
    if (!b) return; const c = DATA.calc(b), m = hero.m;
    m.dmg = c.dmg; m.cd = 1 / c.spd; m.area = c.area; m.move = c.move;
    hero.crit = c.crit; hero.dmgIn = c.dmgIn; hero.xpMul = c.xp; hero.maxHp = hero.hp = c.hp; hero.A = c.A; hero.fx = c.fx;
  }   // 延迟出手（剑的补刀）
  const banner = (t, T) => { G.banner = { t, T, left: T }; };

  // ---------- 输入 ----------
  function bindInput() {
    addEventListener('keydown', e => { keys[e.code] = 1; if (!G || G.over) return; if (e.code === 'Space') { roll(); e.preventDefault(); } if (e.code === 'KeyP' || e.code === 'Escape') UI.togglePause(); });
    addEventListener('keyup', e => { keys[e.code] = 0; });
    cv.addEventListener('pointerdown', e => { if (!running()) return; joy.on = true; joy.id = e.pointerId; joy.sx = joy.x = e.clientX; joy.sy = joy.y = e.clientY; });
    addEventListener('pointermove', e => { if (joy.on && e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; } });
    const up = e => { if (e.pointerId === joy.id) joy.on = false; }; addEventListener('pointerup', up); addEventListener('pointercancel', up);
    addEventListener('blur', () => { if (running()) UI.togglePause(true); for (const k in keys) keys[k] = 0; joy.on = false; });
  }
  const running = () => G && !G.over && !G.paused;
  function moveDir() {
    let dx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), dy = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
    if (joy.on) { const jx = joy.x - joy.sx, jy = joy.y - joy.sy, d = Math.hypot(jx, jy); if (d > 6) { const k = Math.min(1, d / 40); dx = jx / d * k; dy = jy / d * k; } }
    return [dx, dy];
  }
  function roll() {
    if (!running() || hero.roll > 0 || hero.rollCd > 0 || hero.dead) return;
    const [dx, dy] = moveDir(), d = Math.hypot(dx, dy); hero.rvx = d ? dx / d : hero.f; hero.rvy = d ? dy / d : 0; if (dx) hero.f = dx < 0 ? -1 : 1;
    hero.roll = .32; hero.rollCd = .9; hero.inv = Math.max(hero.inv, .4);
  }

  // ---------- 敌人 ----------
  function spawn(type, at) {
    const T = DATA.enemies[type], g = MAP.ground; let best = null;
    if (at) best = at; else for (let i = 0; i < 8; i++) {   // 从场地边上进来，尽量离勇者远、在镜头外
      const side = Math.random() * 3 | 0, y = side === 0 ? g.y0 * MAPH : side === 1 ? g.y1 * MAPH : R(g.y0, g.y1) * MAPH, [l, r] = ground(y), x = side < 2 ? R(l, r) : Math.random() < .5 ? l : r;
      const p = { x, y }, sc = Math.abs(x - hero.x) * s > W / 2 + 40 || Math.abs(y - hero.y) * s > H / 2 + 60 ? 1000 : 0, v = sc + dist(p, hero); if (!best || v > best.v) best = { x, y, v };
    }
    const hp = T.hp * (T.boss ? 1 : 1 + G.t / 140);
    const z = { type, T, x: best.x, y: best.y, hp, maxHp: hp, f: 1, t: R(0, 1), st: 'run', cd: R(.4, 1.2), flash: 0, kbx: 0, kby: 0, v: T.boss ? 0 : Math.random() * 3 | 0, k: T.boss ? 1 : R(.94, 1.06), as: R(.85, 1.15), sp: T.spd * R(.9, 1.1) };
    clampG(z); foes.push(z); return z;
  }
  function hurt(z, d, from, kb = 14) {
    if (z.dead) return;
    const crit = Math.random() < (hero.crit != null ? hero.crit : .15); if (crit) d *= 1.8; d = Math.max(1, rd(d));
    z.hp -= d; z.flash = .12; nums.push({ x: z.x, y: z.y - (z.T.boss ? 64 : 34) * K, v: d, t: 0, col: crit ? '#ffd84a' : '#ffffff', big: crit });
    const a = from ? ang(from, z) : R(0, 7);
    if (!z.T.boss) { z.kbx = Math.cos(a) * kb * K; z.kby = Math.sin(a) * kb * K / YS; if (z.st !== 'strike') { z.st = 'hurt'; z.t = 0; } }
    for (let i = 0; i < 3; i++) parts.push({ x: z.x, y: z.y - 14 * K, vx: (R(-30, 30) + Math.cos(a) * 30) * K, vy: R(-50, -10) * K, t: 0, T: R(.2, .4), col: i % 2 ? '#ffffff' : '#ffe9a8', g: 160 * K });
    G.hitStop = Math.max(G.hitStop, z.T.boss ? .04 : .02);
    if (z.hp <= 0) kill(z);
  }
  function kill(z) {
    z.dead = true; z.deadT = 0; z.st = 'dead'; G.kills++;
    for (let i = 0; i < 7; i++) parts.push({ x: z.x, y: z.y - 10 * K, vx: R(-45, 45) * K, vy: R(-70, -10) * K, t: 0, T: R(.4, .8), col: ['#8fd14a', '#5a8a2a', '#e8e0c8', '#c49a5c'][i % 4], g: 200 * K, sz: i < 3 ? 2 : 1 });
    if (z.T.boss) { G.shake = .5; banner('击败 哥布林王！', 3); G.winT = 2.2; for (const o of foes) if (!o.dead && o !== z) kill(o); return; }
    if (G.winT == null) addXp(z.T.xp);
  }
  function addXp(n) {
    G.xp += n * (hero.xpMul || 1); const need = () => 4 + G.lv * 3;
    if (G.xp >= need() && !hero.dead) { G.xp -= need(); G.lv++; levelUp(); }
  }
  function levelUp() {
    const L = DATA.upgrades.filter(o => !(o.max && (hero.taken[o.id] || 0) >= o.max) && !(o.id === 'heal' && hero.hp >= hero.maxHp));
    for (let i = L.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [L[i], L[j]] = [L[j], L[i]]; }
    const pick = L.slice(0, 3).map(o => ({ id: o.id, name: o.name, desc: typeof o.desc === 'string' ? o.desc : o.desc[opt.weapon] }));
    G.paused = true; UI.levelUp(pick, id => { applyUp(id); G.paused = false; });
  }
  function applyUp(id) {
    const m = hero.m; hero.taken[id] = (hero.taken[id] || 0) + 1;
    if (id === 'dmg') m.dmg *= 1.25; if (id === 'spd') m.cd /= 1.2; if (id === 'area') m.area *= 1.2; if (id === 'move') m.move *= 1.12; if (id === 'multi') m.multi++;
    if (id === 'hp') { hero.maxHp += 20; hero.hp = Math.min(hero.maxHp, hero.hp + 20); }
    if (id === 'heal') hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * .4);
  }
  function damageHero(d) {
    if (hero.inv > 0 || hero.dead || G.over || G.god) return;
    d *= hero.dmgIn || 1; hero.hp -= d; hero.inv = .7; hero.hurtT = .25; G.shake = Math.max(G.shake, .15); nums.push({ x: hero.x, y: hero.y - 44 * K, v: rd(d), t: 0, col: '#ff6a5a' });
    if (hero.hp <= 0) { hero.hp = 0; hero.dead = true; hero.deadT = 0; banner('勇者倒下了……', 99); G.loseT = 1.6; }
  }

  function soldierAI(z, dt) {
    const T = z.T; z.t += dt; z.cd -= dt;
    const d = dist(z, hero), dx = hero.x - z.x, dy = hero.y - z.y, dd = Math.hypot(dx, dy) || 1;
    if (z.st === 'hurt') { if (z.t > .2) { z.st = 'run'; z.t = 0; } return; }
    if (z.st === 'wind') { if (z.t > T.wind) { z.st = 'strike'; z.t = 0;
        if (T.ranged) { const a = ang(z, hero); shots.push({ k: 'arrow', x: z.x + z.f * 8 * K, y: z.y - 18 * K, gy: z.y, vx: Math.cos(a) * 150 * K, vy: Math.sin(a) * 150 * K / YS, a, t: 0, dmg: T.dmg }); }
        else if (d < T.reach + 7) damageHero(T.dmg); } return; }
    if (z.st === 'strike') { if (z.t > .22) { z.st = 'rec'; z.t = 0; } return; }
    if (z.st === 'rec') { if (z.t > .28) { z.st = 'run'; z.t = 0; z.cd = R(1, 1.7); } return; }
    z.f = dx < 0 ? -1 : 1;
    if (T.ranged) {   // 弓手：太近就退，够得着就停下拉弓
      if (d < 55) { z.x -= dx / dd * z.sp * K * dt; z.y -= dy / dd * z.sp * K * dt / YS; z.moving = true; return; }
      if (d < T.reach && z.cd <= 0) { z.st = 'wind'; z.t = 0; z.moving = false; return; }
    } else if (d < T.reach && z.cd <= 0) { z.st = 'wind'; z.t = 0; z.moving = false; return; }
    z.moving = d > T.reach * .7; if (z.moving) { z.x += dx / dd * z.sp * K * dt; z.y += dy / dd * z.sp * K * dt / YS; }
  }
  // 哥布林王：跺地（自身一圈）/ 冲撞（直线）/ 半血以下喊小弟。先画地面预警，再出手
  function bossAI(z, dt) {
    z.t += dt; z.cd -= dt; z.sum = (z.sum || 0) - dt;
    const d = dist(z, hero);
    if (z.st === 'run' || z.st === 'hurt') {
      z.st = 'run'; z.f = hero.x < z.x ? -1 : 1; z.moving = d > 26;
      if (z.moving) { const a = ang(z, hero); z.x += Math.cos(a) * z.sp * K * dt; z.y += Math.sin(a) * z.sp * K * dt / YS; }
      if (z.cd > 0) return;
      if (z.hp < z.maxHp * .6 && z.sum <= 0) { z.st = 'wind'; z.mv = 'summon'; z.t = 0; z.sum = 14; nums.push({ x: z.x, y: z.y - 80 * K, txt: '小的们，上！', t: 0, col: '#ffcf6a' }); return; }
      if (d < 60 || Math.random() < .45) { z.st = 'wind'; z.mv = 'slam'; z.t = 0; tele.push({ k: 'circle', x: z.x, y: z.y, r: 46, t: 0, T: .95 }); }
      else { const a = ang(z, hero); z.st = 'wind'; z.mv = 'charge'; z.t = 0; z.a = a; z.f = Math.cos(a) < 0 ? -1 : 1; tele.push({ k: 'line', x: z.x, y: z.y, a, len: 150, w: 26, t: 0, T: .9 }); }
      return;
    }
    if (z.st === 'wind') {
      if (z.mv === 'summon' && z.t > .8) { for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2; const g = spawn(Math.random() < .5 ? 'goblin' : 'gob_blade', { x: z.x + Math.cos(a) * 40 * K, y: z.y + Math.sin(a) * 25 * K }); clampG(g); } z.st = 'rec'; z.t = 0; }
      if (z.mv === 'slam' && z.t > .95) { z.st = 'strike'; z.t = 0; G.shake = .3; fx.push({ k: 'ring', x: z.x, y: z.y, t: 0, T: .45, r: 46 }); if (d < 46) damageHero(z.T.dmg * 1.6);
        for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2; parts.push({ x: z.x + Math.cos(a) * 26 * K, y: z.y + Math.sin(a) * 18 * K, vx: Math.cos(a) * 50 * K, vy: (Math.sin(a) * 30 - 30) * K, t: 0, T: .5, col: '#c8a066', g: 120 * K, sz: 2 }); } }
      if (z.mv === 'charge' && z.t > .9) { z.st = 'dash'; z.t = 0; z.x0 = z.x; z.y0 = z.y; z.hitD = false; }
      return;
    }
    if (z.st === 'dash') {
      const p = Math.min(1, z.t / .35); z.x = z.x0 + Math.cos(z.a) * 150 * K * p; z.y = z.y0 + Math.sin(z.a) * 150 * K * p / YS; clampG(z);
      if (!z.hitD && dist(z, hero) < 22) { z.hitD = true; damageHero(z.T.dmg * 1.3); }
      if (Math.random() < .8) parts.push({ x: z.x, y: z.y, vx: R(-20, 20) * K, vy: R(-20, 0) * K, t: 0, T: .4, col: '#d8c08a', g: 0, sz: 2 });
      if (p >= 1) { z.st = 'rec'; z.t = 0; } return;
    }
    if (z.st === 'strike') { if (z.t > .35) { z.st = 'rec'; z.t = 0; } return; }
    if (z.st === 'rec') { if (z.t > .7) { z.st = 'run'; z.cd = R(1.5, 2.4); } }
  }
  function teleTick(dt) {
    for (let i = tele.length - 1; i >= 0; i--) { const o = tele[i]; o.t += dt; if (o.t >= o.T) tele.splice(i, 1); }
  }

  // ---------- 勇者的武器 ----------
  function nearest(maxD) { let b = null, bd = maxD; for (const z of foes) if (!z.dead) { const d = dist(z, hero); if (d < bd) { bd = d; b = z; } } return b; }
  function weapon(dt) {
    hero.cd -= dt; for (let i = pend.length - 1; i >= 0; i--) { pend[i].t -= dt; if (pend[i].t <= 0) { pend[i].fn(); pend.splice(i, 1); } }
    if (hero.cd > 0 || hero.roll > 0 || hero.dead) return;
    const m = hero.m, area = m.area, dmg = WEP.dmg * m.dmg;
    if (opt.weapon === 'sword') {
      const t = nearest(WEP.range * area * 1.15); if (!t) { hero.cd = .1; return; }
      const a = ang(hero, t); hero.f = Math.cos(a) < 0 ? -1 : 1; hero.atkT = .3; hero.cd = WEP.cd * m.cd;
      const slash = (aa, delay) => pend.push({ t: delay, fn: () => { const r = WEP.range * area; fx.push({ k: 'slash', x: hero.x, y: hero.y - 12 * K, a: aa, t: 0, T: .2, r });
        for (const z of foes) if (!z.dead) { const b = ang(hero, z), da = Math.abs(((b - aa + PI * 3) % (PI * 2)) - PI); if (dist(z, hero) < r && da < WEP.arc) hurt(z, dmg, hero, 16); } } });
      slash(a, .1); [a + PI, a + PI / 2, a - PI / 2].slice(0, m.multi).forEach((aa, i) => slash(aa, .25 + i * .13));
    } else if (opt.weapon === 'axe') {
      const t = nearest(WEP.range * area * 1.3); if (!t) { hero.cd = .1; return; }
      const a = ang(hero, t); hero.f = Math.cos(a) < 0 ? -1 : 1; hero.atkT = .3; hero.cd = WEP.cd * m.cd;
      const n = 1 + m.multi; for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * .45; shots.push({ k: 'axe', x: hero.x, y: hero.y - 14 * K, a: aa, d: 0, out: true, t: 0, hit: new Set(), L: WEP.range * area, r: WEP.size * area, dmg }); }
    } else if (opt.weapon === 'spear') {   // 枪：朝最近的敌人长直线突刺，穿透一排
      const t = nearest(WEP.range * area * 1.1); if (!t) { hero.cd = .1; return; }
      const a = ang(hero, t); hero.f = Math.cos(a) < 0 ? -1 : 1; hero.atkT = .3; hero.cd = WEP.cd * m.cd;
      const thrust = (aa, delay) => pend.push({ t: delay, fn: () => { const L = WEP.range * area, w = WEP.width * area; fx.push({ k: 'thrust', x: hero.x, y: hero.y - 12 * K, a: aa, L, w, t: 0, T: .2 });
        for (const z of foes) if (!z.dead) { const dx = (z.x - hero.x) / K, dy = (z.y - hero.y) * YS / K, along = dx * Math.cos(aa) + dy * Math.sin(aa), side = Math.abs(-dx * Math.sin(aa) + dy * Math.cos(aa)); if (along > -4 && along < L && side < w + 6) hurt(z, dmg, hero, 14); } } });
      thrust(a, .08); for (let i = 1; i <= m.multi; i++) thrust(a + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * .35, .08 + i * .1);
    } else if (opt.weapon === 'bow') {   // 弓：射最近的敌人，箭能穿过 pierce 个
      const t = nearest(WEP.range * 1.05); if (!t) { hero.cd = .1; return; }
      const a = ang(hero, t); hero.f = Math.cos(a) < 0 ? -1 : 1; hero.atkT = .25; hero.cd = WEP.cd * m.cd;
      const n = 1 + m.multi; for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * .16; shots.push({ k: 'harrow', x: hero.x, y: hero.y - 16 * K, gy: hero.y, vx: Math.cos(aa) * 320 * K, vy: Math.sin(aa) * 320 * K / YS, t: 0, hit: new Set(), left: 1 + (WEP.pierce || 0), dmg }); }
    } else if (opt.weapon === 'staff') {
      const cand = foes.filter(z => !z.dead && dist(z, hero) < WEP.range * area * 1.1); if (!cand.length) { hero.cd = .1; return; }
      const R2 = WEP.boom * area, score = z => foes.reduce((n, o) => n + (!o.dead && dist(o, z) < R2 ? 1 : 0), 0);
      cand.sort((p, q) => score(q) - score(p)); hero.atkT = .3; hero.cd = WEP.cd * m.cd; hero.f = cand[0].x < hero.x ? -1 : 1;
      for (let i = 0; i < 1 + m.multi; i++) { const z = cand[i % cand.length], j = i >= cand.length ? 20 * K : 0; shots.push({ k: 'fire', x: z.x + R(-j, j), y: z.y + R(-j, j) / YS, t: 0, T: .5, r: R2, dmg }); }
    }
  }
  function shotTick(dt) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const o = shots[i]; o.t += dt;
      if (o.k === 'arrow') { o.x += o.vx * dt; o.y += o.vy * dt; o.gy += o.vy * dt;
        if (Math.hypot(hero.x - o.x, (hero.y - o.gy) * YS) / K < 9) { damageHero(o.dmg); shots.splice(i, 1); continue; }
        if (o.t > 1.6) shots.splice(i, 1); continue; }
      if (o.k === 'harrow') {   // 勇者的箭
        o.x += o.vx * dt; o.y += o.vy * dt; o.gy += o.vy * dt;
        for (const z of foes) if (!z.dead && !o.hit.has(z) && Math.hypot(z.x - o.x, (z.y - o.gy) * YS) / K < 10) { o.hit.add(z); hurt(z, o.dmg, { x: o.x - o.vx * .05, y: o.gy - o.vy * .05 }, 10); if (--o.left <= 0) break; }
        if (o.left <= 0 || o.t > .7) shots.splice(i, 1); continue;
      }
      if (o.k === 'axe') {
        const sp = (o.out ? 200 : 240) * K;
        if (o.out) { o.d += sp * dt / K; if (o.d >= o.L) { o.out = false; o.hit.clear(); } o.cx = hero.x + Math.cos(o.a) * o.d * K; o.cy = hero.y - 14 * K + Math.sin(o.a) * o.d * K / YS; }
        else { const dx = hero.x - o.cx, dy = hero.y - 14 * K - o.cy, d = Math.hypot(dx, dy); if (d < sp * dt) { shots.splice(i, 1); continue; } o.cx += dx / d * sp * dt; o.cy += dy / d * sp * dt; }
        for (const z of foes) if (!z.dead && !o.hit.has(z) && Math.hypot(z.x - o.cx, (z.y - 14 * K - o.cy) * YS) / K < o.r + 8) { o.hit.add(z); hurt(z, o.dmg, { x: o.cx, y: o.cy + 14 * K }, 10); }
        continue;
      }
      if (o.k === 'fire' && o.t >= o.T) {
        shots.splice(i, 1); G.shake = Math.max(G.shake, .1); fx.push({ k: 'boom', x: o.x, y: o.y, t: 0, T: .4, r: o.r }); burns.push({ x: o.x, y: o.y, r: o.r * .8, t: 0, T: 1.2 });
        for (const z of foes) if (!z.dead && dist(z, o) < o.r) hurt(z, o.dmg, o, 18);
        for (let j = 0; j < 14; j++) { const a = R(0, PI * 2); parts.push({ x: o.x, y: o.y - 4 * K, vx: Math.cos(a) * R(30, 80) * K, vy: (Math.sin(a) * 30 - R(30, 70)) * K, t: 0, T: R(.3, .6), col: ['#fff2a0', '#ffb040', '#ff6020', '#a03010'][j % 4], g: 140 * K, sz: j % 3 ? 1 : 2 }); }
      }
    }
  }

  // ---------- 刷兵 ----------
  function spawner(dt) {
    if (G.winT != null) return;
    G.spawn -= dt; const alive = foes.filter(z => !z.dead && !z.T.boss).length, want = G.bossOut ? 10 : Math.min(55, 8 + G.t * .4);
    if (G.spawn <= 0 && alive < want) {
      const pool = MAP.foes.filter(k => k === 'goblin' || (k === 'gob_blade' && G.t > 20) || (k === 'gob_archer' && G.t > 35));
      const n = G.t < 20 ? 2 : 3; for (let i = 0; i < n; i++) { const r = Math.random(), k = pool.length > 2 && r < .2 ? pool[2] : pool.length > 1 && r < .45 ? pool[1] : pool[0]; spawn(k); }
      G.spawn = Math.max(.45, 1.2 - G.t * .006) * (G.bossOut ? 2.5 : 1);
    }
    if (!G.bossOut && G.t >= MAP.time) bossIn();
  }
  function bossIn() { if (G.bossOut) return; G.bossOut = true; G.boss = spawn(MAP.boss); G.boss.cd = 2.5; banner('哥布林王 出现了！', 2.4); G.shake = .3; }

  // ---------- 每帧更新 ----------
  function update(dt) {
    G.t += dt; hero.t += dt;
    if (G.banner) { G.banner.left -= dt; if (G.banner.left <= 0) G.banner = null; }
    G.shake = Math.max(0, G.shake - dt);
    if (G.winT != null && (G.winT -= dt) <= 0 && !G.over) { G.over = 'win'; return end(); }
    if (hero.dead) { hero.deadT += dt; if ((G.loseT -= dt) <= 0 && !G.over) { G.over = 'lose'; return end(); } }
    else {
      hero.rollCd -= dt; hero.inv -= dt; hero.hurtT -= dt; hero.atkT -= dt;
      if (hero.roll > 0) { hero.roll -= dt; hero.x += hero.rvx * 175 * K * dt; hero.y += hero.rvy * 130 * K * dt; if (Math.random() < .7) parts.push({ x: hero.x, y: hero.y, vx: R(-10, 10) * K, vy: R(-10, 0) * K, t: 0, T: .3, col: '#e6dcb4', g: 0 }); }
      else { const [dx, dy] = moveDir(), d = Math.hypot(dx, dy); hero.moving = d > .1; if (hero.moving) { const k = Math.min(1, d), v = 62 * hero.m.move * K; hero.x += dx / (d || 1) * k * v * dt; hero.y += dy / (d || 1) * k * v * .76 * dt; if (hero.atkT <= 0) hero.f = dx < -.1 ? -1 : dx > .1 ? 1 : hero.f; } }
      clampG(hero, 8 * K); weapon(dt);
    }
    spawner(dt);
    for (const z of foes) {
      if (z.dead) { z.deadT += dt; continue; }
      z.flash -= dt; if (z.T.boss) bossAI(z, dt); else soldierAI(z, dt);
      z.x += z.kbx * dt * 8; z.y += z.kby * dt * 8; z.kbx *= .8; z.kby *= .8; clampG(z, 4 * K);
    }
    const L = foes.filter(z => !z.dead), m0 = 9 * K;   // 互相推开，别叠成一坨
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j], dx = b.x - a.x, dy = (b.y - a.y) * YS, d = Math.hypot(dx, dy), m = a.T.boss || b.T.boss ? m0 * 2.2 : m0; if (d > 0 && d < m) { const p = (m - d) / 2 / d; if (!a.T.boss) { a.x -= dx * p; a.y -= dy * p / YS; } if (!b.T.boss) { b.x += dx * p; b.y += dy * p / YS; } } }
    for (let i = foes.length - 1; i >= 0; i--) if (foes[i].dead && foes[i].deadT > (foes[i].T.boss ? 3 : 1.3)) foes.splice(i, 1);
    teleTick(dt); shotTick(dt);
    for (const a of [fx, parts, nums, burns]) for (let i = a.length - 1; i >= 0; i--) { const o = a[i]; o.t += dt; if (o.vx != null) { o.x += o.vx * dt; o.y += o.vy * dt; o.vy += (o.g || 0) * dt; } if (o.t >= (o.T || (o.txt ? 1.4 : .75))) a.splice(i, 1); }
  }
  function end() {
    UI.result({ win: G.over === 'win', kills: G.kills, time: G.t, lv: G.lv, weapon: opt.weapon, map: opt.map });
  }

  // ---------- 绘制 ----------
  function shadow(x, y, w) {   // 斜影子：两层像素椭圆，往右下斜（光从左上来）
    const ox = 3, hw0 = Math.max(3, w / 2 | 0), X0 = X(x), Y0 = Y(y);
    for (const [k, a] of [[1.25, .14], [.95, .22]]) { const hw = rd(hw0 * k), hh = Math.max(1, rd(hw * .3)); ctx.fillStyle = `rgba(60,30,10,${a})`;
      for (let j = -hh; j <= hh; j++) { const ww = rd(hw * Math.sqrt(1 - (j / (hh + .5)) ** 2)); ctx.fillRect(X0 + rd(ox * (j + hh) / (2 * hh) - ww + ox * .5) * u, Y0 + j * u, ww * 2 * u, u); } }
  }
  function heroFrame() {
    if (hero.dead) return ['dead', 0];
    if (hero.roll > 0) return ['roll', hero.roll > .16 ? 0 : 1];
    if (hero.atkT > 0) return ['atk', hero.atkT > .2 ? 0 : 1, 'strike'];
    if (hero.hurtT > 0) return ['hurt', 0, 'hurt'];
    if (hero.moving) return ['run', [0, 1, 2, 1][Math.floor(hero.t * 10) % 4], 'run'];
    return ['idle', Math.floor(hero.t * 2) % 2];
  }
  function foeFrame(z) {
    if (z.dead) return [z.deadT < .22 ? 'fall' : 'down'];
    if (z.st === 'hurt') return ['hurt', 'hurt'];
    if (z.st === 'wind') return [z.type === 'gob_archer' ? 'draw' : 'windup'];
    if (z.st === 'strike') return ['strike', 'strike'];
    if (z.st === 'rec') return ['recover'];
    if (z.st === 'dash') return ['walk' + (Math.floor(z.t * 16) % 6), 'run'];
    if (z.moving) { const i = Math.floor((z.t * z.as) * (z.T.boss ? 7 : 10)) % 6; return ['walk' + i, i % 2 ? 'run' : '']; }
    return ['idle' + (Math.floor(z.t * 2) % 2)];
  }
  const DIG = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001010010', 8: '111101111101111', 9: '111101111001111' };
  function num(n, x, y, col, k) {
    const t = String(n); x = rd(x - t.length * 2 * k); y = rd(y);
    for (const pass of [0, 1]) for (let j = 0; j < t.length; j++) { const g = DIG[t[j]]; if (!g) continue; for (let i = 0; i < 15; i++) if (g[i] === '1') { const px = x + (j * 4 + (i % 3)) * k, py = y + ((i / 3) | 0) * k; if (!pass) { ctx.fillStyle = '#2a160e'; ctx.fillRect(px - k, py - k, 3 * k, 3 * k); } else { ctx.fillStyle = col; ctx.fillRect(px, py, k, k); } } }
  }
  function draw() {
    if (!G) return;
    const Wm = W / s, Hm = H / s;
    cam.x = Math.max(0, Math.min(MAPW - Wm, hero.x - Wm / 2)); cam.y = Math.max(0, Math.min(MAPH - Hm, hero.y - 20 * K - Hm / 2));
    const sh = G.shake > 0 ? rd(R(-2, 2)) * u : 0;
    ctx.setTransform(1, 0, 0, 1, sh, 0);
    if (MIMG.complete && MIMG.naturalWidth) { const k = MIMG.naturalWidth / MAPW; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(MIMG, cam.x * k, cam.y * k, Wm * k, Hm * k, 0, 0, W, H); ctx.imageSmoothingEnabled = false; }
    else { ctx.fillStyle = '#6a4a2a'; ctx.fillRect(0, 0, W, H); }
    for (const b of burns) { const a = 1 - b.t / b.T; ctx.fillStyle = `rgba(40,20,10,${.35 * a})`; ctx.beginPath(); ctx.ellipse(X(b.x), Y(b.y), b.r * u, b.r * u * .55, 0, 0, 7); ctx.fill(); }
    for (const o of tele) {   // 地面预警：虚线边 + 慢慢填满，最后闪
      const p = o.t / o.T, blink = p > .7 && (Math.floor(o.t * 16) % 2), col = blink ? '#fff2c0' : '#d8402a';
      ctx.save(); ctx.translate(X(o.x), Y(o.y));
      if (o.k === 'circle') { const r = o.r * u; ctx.fillStyle = 'rgba(216,64,42,.28)'; ctx.beginPath(); ctx.ellipse(0, 0, r * p, r * p / YS, 0, 0, 7); ctx.fill(); ctx.fillStyle = col; for (let a = 0; a < PI * 2; a += .08) { if (Math.floor(a / .08) % 2) continue; ctx.fillRect(rd(Math.cos(a) * r), rd(Math.sin(a) * r / YS), 2 * u, 2 * u); } }
      else { ctx.scale(1, 1 / YS); ctx.rotate(o.a); const L = o.len * u, w = o.w * u; ctx.fillStyle = 'rgba(216,64,42,.26)'; ctx.fillRect(0, -w / 2, L * p, w); ctx.fillStyle = col; for (let i = 0; i < L; i += 6 * u) { ctx.fillRect(i, -w / 2, 3 * u, u); ctx.fillRect(i, w / 2, 3 * u, u); } }
      ctx.restore();
    }
    for (const o of shots) if (o.k === 'fire') {   // 火球落点：地上的影子越来越大
      const p = o.t / o.T, r = o.r * u * (.3 + .7 * p); ctx.fillStyle = `rgba(255,90,30,${.15 + .2 * p})`; ctx.beginPath(); ctx.ellipse(X(o.x), Y(o.y), r, r / YS * .8, 0, 0, 7); ctx.fill();
    }
    const list = foes.map(z => ({ y: z.y, z })); list.push({ y: hero.y, h: 1 }); list.sort((a, b) => a.y - b.y);
    for (const o of list) {
      if (o.h) {
        shadow(hero.x, hero.y, 26);
        if (hero.inv > 0 && hero.roll <= 0 && hero.hurtT <= 0 && !hero.dead && Math.floor(G.t * 20) % 2) continue;
        const [n, i, st] = heroFrame(), bob = st === 'run' && i % 2 ? -u : 0, lunge = st === 'strike' && i > 0 ? hero.f * 3 * u : st === 'hurt' ? -hero.f * 2 * u : 0;
        SPR.draw(ctx, 'hero', n, i, X(hero.x) + lunge, Y(hero.y) + bob, hero.f < 0, u);
      } else {
        const z = o.z, B = z.T.boss, [n, st] = foeFrame(z);
        const a = z.dead ? Math.max(0, 1 - Math.max(0, z.deadT - (B ? 2.4 : .9)) / .4) : 1;
        if (!z.dead) shadow(z.x, z.y, B ? 50 : 26 * z.k);
        const bob = st === 'run' ? -u : 0, lunge = st === 'strike' ? z.f * 4 * u : st === 'hurt' && !B ? -z.f * 2 * u : 0;
        SPR.draw(ctx, z.type, n, 0, X(z.x) + lunge, Y(z.y) + bob, z.f < 0, u, { v: z.v, k: z.k, white: z.flash > 0 && !z.dead ? .6 : 0, alpha: a });
        if (B && z.st === 'wind' && Math.floor(z.t * 12) % 2) SPR.draw(ctx, z.type, n, 0, X(z.x), Y(z.y), z.f < 0, u, { white: .35 });
      }
    }
    for (const o of shots) {
      if (o.k === 'arrow') { const f = SPR.frame('gob_archer', 'arrow'); if (f) { ctx.save(); ctx.translate(X(o.x), Y(o.y)); ctx.rotate(Math.atan2(o.vy, o.vx)); ctx.drawImage(SPR.sets.gob_archer.base, f.x, f.y, f.w, f.h, -f.w * u / 2, -f.h * u / 2, f.w * u, f.h * u); ctx.restore(); } }
      else if (o.k === 'axe') drawAxe(X(o.cx), Y(o.cy), o.t * 14);
      else if (o.k === 'harrow') { const a = Math.atan2(o.vy, o.vx); for (let j = 0; j < 9; j++) { ctx.fillStyle = j < 2 ? '#e8ecf4' : j > 6 ? '#e8e0c8' : '#8a5a2a'; ctx.fillRect(X(o.x) - rd(Math.cos(a) * j * 1.6 * u), Y(o.y) - rd(Math.sin(a) * j * 1.6 * u), u + 1, u + 1); } }
      else if (o.k === 'fire') { const p = o.t / o.T, hy = (1 - p) * 120; for (let j = 0; j < 5; j++) { ctx.fillStyle = ['#fff6c0', '#ffd060', '#ff8a30', '#e04a20', '#902a10'][j]; const q = (5 - j) * u; ctx.fillRect(X(o.x) - q / 2 - rd(j * 3 * u * (1 - p)), Y(o.y) - rd((hy + j * 7) * u) - q / 2, q, q); } }
    }
    for (const o of fx) {
      const p = o.t / o.T;
      if (o.k === 'slash') {   // 像素刀光：三层，从起手往前扫开
        for (let k = 0; k < 3; k++) { const r = (o.r - k * 4) * u; for (let a = -1.35; a <= 1.35; a += .04) { const t = (a + 1.35) / 2.7; if (t > p * 1.6) continue; if (p > .6 && (Math.floor(a * 40) % 2)) continue; const aa = o.a + a; ctx.fillStyle = k === 0 ? '#ffffff' : k === 1 ? '#fff2b0' : '#f0c04c'; const q = k === 0 ? 2 * u : u; ctx.fillRect(X(o.x) + rd(Math.cos(aa) * r), Y(o.y) + rd(Math.sin(aa) * r / YS), q, q); } }
      } else if (o.k === 'thrust') {   // 像素枪芒：一道往前捅出去的直线，带两条边
        const L = o.L * u * Math.min(1, p * 2.2), ca = Math.cos(o.a), sa = Math.sin(o.a) / YS;
        for (let d = 0; d < L; d += u) { const k = d / (o.L * u); ctx.fillStyle = k > .85 ? '#ffffff' : p > .6 ? '#f0c04c' : '#fff2b0'; const q = k > .85 ? 2 * u : u; ctx.fillRect(X(o.x) + rd(ca * d), Y(o.y) + rd(sa * d), q, q); if (d % (3 * u) < u && p < .5) { const w = o.w * u * .5; ctx.fillStyle = 'rgba(255,240,180,.6)'; ctx.fillRect(X(o.x) + rd(ca * d - sa * w), Y(o.y) + rd(sa * d + ca * w), u, u); ctx.fillRect(X(o.x) + rd(ca * d + sa * w), Y(o.y) + rd(sa * d - ca * w), u, u); } }
      } else if (o.k === 'ring') { const r = o.r * u * (.6 + p * .8); for (let a = 0; a < PI * 2; a += .05) { ctx.fillStyle = p < .5 ? '#fff2c0' : '#c8a066'; ctx.fillRect(X(o.x) + rd(Math.cos(a) * r), Y(o.y) + rd(Math.sin(a) * r / YS), 2 * u, 2 * u); } }
      else if (o.k === 'boom') { const r = o.r * u * (.5 + p * .7); for (let a = 0; a < PI * 2; a += .06) { if (Math.floor(a * 10 + o.t * 30) % 3 === 0) continue; ctx.fillStyle = p < .4 ? '#fff2a0' : p < .7 ? '#ff9a30' : '#a03a18'; ctx.fillRect(X(o.x) + rd(Math.cos(a) * r), Y(o.y) + rd(Math.sin(a) * r / YS), 2 * u, 2 * u); } if (p < .3) { ctx.fillStyle = 'rgba(255,230,140,.35)'; ctx.beginPath(); ctx.ellipse(X(o.x), Y(o.y), r * .8, r * .8 / YS, 0, 0, 7); ctx.fill(); } }
    }
    for (const q of parts) { ctx.fillStyle = q.col; const z = (q.sz || 1) * u; ctx.fillRect(X(q.x), Y(q.y), z, z); }
    const nk = Math.max(1, rd(u * .9));
    for (const n of nums) { const y = Y(n.y) - n.t * 22 * u; if (n.txt) { ctx.font = `${7 * u}px Pix, monospace`; ctx.textAlign = 'center'; ctx.lineWidth = 2 * u; ctx.strokeStyle = '#2a160e'; ctx.strokeText(n.txt, X(n.x), y); ctx.fillStyle = n.col; ctx.fillText(n.txt, X(n.x), y); } else num(n.v, X(n.x), y, n.col, n.big ? nk + 1 : nk); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (joy.on) { const dpr = W / innerWidth; ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.beginPath(); ctx.arc(joy.sx * dpr, joy.sy * dpr, 40 * dpr, 0, 7); ctx.fill(); const jx = joy.x - joy.sx, jy = joy.y - joy.sy, d = Math.hypot(jx, jy), k = Math.min(1, 40 / (d || 1)); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc((joy.sx + jx * k) * dpr, (joy.sy + jy * k) * dpr, 18 * dpr, 0, 7); ctx.fill(); }
    UI.hud({ hp: hero.hp, maxHp: hero.maxHp, lv: G.lv, xp: G.xp, need: 4 + G.lv * 3, kills: G.kills, left: Math.max(0, MAP.time - G.t), bossOut: G.bossOut, boss: G.boss && !G.boss.dead ? G.boss.hp / G.boss.maxHp : null, banner: G.banner ? G.banner.t : '' });
  }
  function drawAxe(x, y, a) {   // 飞斧：8×8 像素图，转着飞（按 4 个方向取整，保持像素整齐）
    const P = ['..aaa...', '.abbba..', 'abbbbba.', 'abbbbbcc', '.abbbcc.', '..aacc..', '....cc..', '....c...'], C = { a: '#3a2218', b: '#d8dce8', c: '#8a5a2a' }, q = Math.floor(a / (PI / 2)) % 4;
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { const ch = P[j][i]; if (ch === '.') continue; let ii = i - 4, jj = j - 4; for (let r = 0; r < q; r++) [ii, jj] = [-jj - 1, ii]; ctx.fillStyle = C[ch]; ctx.fillRect(x + ii * u * 1.5, y + jj * u * 1.5, u * 1.5 + .5, u * 1.5 + .5); }
  }

  // ---------- 主循环（由 ui.js 调用）----------
  function frame(dt) {
    if (!G) return;
    if (!G.paused && !G.over) { if (G.hitStop > 0) { G.hitStop -= dt; dt *= .2; } update(dt); }
    draw();
  }
  function init(canvas) { cv = canvas; ctx = cv.getContext('2d'); fit(); addEventListener('resize', fit); bindInput(); }
  window.BATTLE = {
    init, start, frame, fit, roll,
    pause(v) { if (G && !G.over) G.paused = v; }, get paused() { return !!(G && G.paused); }, active: () => !!G && !G.over,
    stop() { G = null; },
    debug: { boss: () => G && bossIn(), god: () => G && (G.god = !G.god), clear: () => G && foes.forEach(z => !z.T.boss && !z.dead && kill(z)), lvl: () => G && (G.lv++, levelUp()), win: () => G && G.boss ? kill(G.boss) : G && (bossIn(), kill(G.boss)), heal: () => hero && (hero.hp = hero.maxHp), state: () => ({ G, hero, foes, u, s, W, H }) },
  };
})();

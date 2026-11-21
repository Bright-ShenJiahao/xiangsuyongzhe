// 像素勇者 · 战斗。
// 世界坐标 = 地图像素（打谷场加大后 2572×1421，见 tools/extend_map.py）；人物、距离按「像素格」算，1 格 = K 个地图像素。
// 屏幕上一个精灵像素 = u 个设备像素（整数，像素才整齐）；u 按屏幕高度算，让勇者约占屏幕高度的八分之一。
// 地图用原图高清画，人物按整数倍放大不平滑，两者分开处理。
(() => {
  const K = 2.55, YS = 1.35; let MAPW = 1672, MAPH = 941;   // YS：俯视地面压扁，算距离时竖向放大
  const R = (a, b) => a + Math.random() * (b - a), rd = Math.round, PI = Math.PI;
  let cv, ctx, W = 0, H = 0, u = 2, s = 1, cam = { x: 0, y: 0 };
  let MAP, MIMG, RUN, opt, G, hero, foes, shots, fx, parts, nums, tele, burns;
  const keys = {};
  const joy = { on: false, id: null, sx: 0, sy: 0, x: 0, y: 0 };

  // ---------- 场地 ----------
  // 可走地面：y0–y1 之间，每一行的左右边界按 pts 表插值
  function ground(y) { const P = MAP.ground.pts; if (y <= P[0][0]) return [P[0][1], P[0][2]]; for (let i = 1; i < P.length; i++) if (y <= P[i][0]) { const a = P[i - 1], b = P[i], t = (y - a[0]) / (b[0] - a[0] || 1); return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; } const q = P.at(-1); return [q[1], q[2]]; }
  function clampG(o, pad = 0) { const g = MAP.ground; o.y = Math.max(g.y0, Math.min(g.y1, o.y)); const [l, r] = ground(o.y); o.x = Math.max(l + pad, Math.min(r - pad, o.x)); }
  const dist = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * YS) / K;   // 单位：像素格
  const ang = (a, b) => Math.atan2((b.y - a.y) * YS, b.x - a.x);

  // ---------- 画面尺寸 ----------
  function fit() {
    const dpr = Math.min(3, window.devicePixelRatio || 1); W = Math.round(innerWidth * dpr); H = Math.round(innerHeight * dpr);
    cv.width = W; cv.height = H;
    u = Math.max(1, Math.round(H / 480));   // 11/21 镜头拉远一档（原来 H / 320）
    while (u / K * MAPW < W || u / K * MAPH < H) u++;   // 地图一定要盖满屏幕（超宽屏会把人物放大一点）
    s = u / K; ctx.imageSmoothingEnabled = false;
  }
  const X = x => rd((x - cam.x) * s), Y = y => rd((y - cam.y) * s);

  // ---------- 开局 ----------
  function start(o) {
    opt = o; MAP = DATA.maps.find(m => m.id === (o.map || 'field')); SPR.setGrade(MAP.grade); MAPW = MAP.w || 1672; MAPH = MAP.h || 941; fit();
    MIMG = new Image(); MIMG.crossOrigin = 'anonymous'; MIMG.src = MAP.img;
    const b = o.build || { weapon: o.weapon || 'sword' }, A0 = {}; for (const a of DATA.attrs) A0[a.id] = DATA.attrBase;
    // st = 第几站（1–8，9 = 首领站），wi = 这一站第几波（0–2），route = 这一站是从哪张卡进来的
    G = { t: 0, kills: 0, boss: null, bossOut: false, over: null, overT: 0, shake: 0, hitStop: 0, paused: false, xp: 0, lv: 1, god: false, banner: null,
      st: 1, wi: -1, route: 'fight', waveOn: false, wave: 0 };
    const g = MAP.ground;
    hero = { x: MAPW / 2, y: (g.y0 + g.y1) / 2, hp: 0, maxHp: 0, f: 1, t: 0, roll: 0, rollCd: 0, inv: 0, hurtT: 0, atkT: 0, moving: false, cd: .6, dead: false,
      m: { dmg: 1, spd: 1, area: 1, move: 1 }, crit: .01, critMul: 1.5, pIn: 1, mIn: 1, xpMul: 1, fx: {}, A: {} };
    // 这一局的全部状态：属性、修炼加的点、技能栏、背包、铜钱
    RUN = { weapon: b.weapon, attrs: b.attrs || A0, habit: b.habit || null, train: {}, pts: 0, alloc: {}, tmp: {}, slots: Array(DATA.slotsMax).fill(null), open: DATA.slotsOpen,
      bag: Array(DATA.bagSize).fill(null), coins: 0, si: 0, xiu: 0, dmgAll: {}, dmgW: {}, xopt: null, xrr: 0, shop: null, rr: 0, bought: {} };
    RUN.slots[0] = { id: b.weapon, lv: 1, xp: 0 }; if (b.item) RUN.bag[0] = { kind: 'item', id: b.item };
    recompute(); RUN.coins = DATA.econ.startCoin + (hero.fx.coin || 0);
    foes = []; shots = []; fx = []; parts = []; nums = []; tele = []; burns = []; pend = []; warns.length = 0;
    if (!SK) SK = SKILLS(API); SK.reset(); hero.cs = null;
    nextWave();
  }
  let pend = [];   // 延迟出手
  // 属性、修炼、背包里的宝物、现实习惯 → 勇者的各项数值（中途换宝物、修炼后都重算一次）
  // 修炼加的 + 升级加点（已确认的 alloc + 这次结算里还能退的 tmp）
  function trainAll() { const o = {}; for (const src of [RUN.train, RUN.alloc, RUN.tmp]) for (const k in src) o[k] = (o[k] || 0) + src[k]; return o; }
  function recompute() {
    const items = RUN.bag.filter(x => x && x.kind === 'item').map(x => x.id);
    const c = DATA.calc({ weapon: RUN.weapon, attrs: RUN.attrs, train: trainAll(), items, habit: RUN.habit }), m = hero.m;
    m.dmg = (1 + (c.fx.dmg || 0)) * (1 + .03 * (G.lv - 1)); m.spd = c.spd; m.area = c.area; m.move = c.move;
    hero.crit = c.crit; hero.critMul = c.critMul; hero.pIn = c.pIn; hero.mIn = c.mIn; hero.xpMul = c.xp; hero.A = c.A; hero.fx = c.fx;
    const max = c.hp + 5 * (G.lv - 1); hero.hp = hero.maxHp ? Math.max(1, Math.min(max, hero.hp + max - hero.maxHp)) : max; hero.maxHp = max;
    return c;
  }
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
    hero.roll = .3; hero.rollCd = 1.8; hero.inv = Math.max(hero.inv, .3);
    const c = hero.cs; if (c && (c.ph === 'wu' || c.ph === 'rc')) { if (c.ph === 'wu') nums.push({ x: hero.x, y: hero.y - 50 * K, txt: c.S.name + ' 中断', t: 0, col: '#c8b890' }); endCast(); }
  }

  // ---------- 敌人 ----------
  // 生成一只敌人：tier = 'elite' / 'mini'（精英 / 小头目）。at 给了就生在那里，否则离勇者 135–190 格的地面上
  function spawnPos() {
    const g = MAP.ground; let best = null;
    for (let i = 0; i < 14; i++) {
      const a = R(0, PI * 2), d = R(135, 190) * K, x = hero.x + Math.cos(a) * d, y = hero.y + Math.sin(a) * d / YS;
      if (y < g.y0 || y > g.y1) continue; const [l, r] = ground(y); if (x < l + 6 * K || x > r - 6 * K) continue; return { x, y };
    }
    const y = R(g.y0, g.y1), [l, r] = ground(y); return { x: Math.abs(l - hero.x) > Math.abs(r - hero.x) ? l + 8 * K : r - 8 * K, y };
  }
  function spawn(type, at, tier) {
    const T = DATA.enemies[type], TT = tier ? DATA.tiers[tier] : null, p = at || spawnPos();
    const hp = Math.ceil(T.hp * (T.boss ? 1 : (DATA.stations[G.st - 1] || {}).hp || 1) * (TT ? TT.hp : 1));
    const z = { type, T, tier, x: p.x, y: p.y, hp, maxHp: hp, f: 1, t: R(0, 1), st: 'run', cd: R(.3, 1), flash: 0, kbx: 0, kby: 0, kbT: 0,
      v: T.boss ? 0 : Math.random() * 3 | 0, k: T.boss ? 1 : (TT ? TT.size : R(.94, 1.06)), as: R(.85, 1.15), sp: T.spd * R(.9, 1.1),
      dmgMul: TT ? TT.dmg : 1, reachMul: TT && TT.reach || 1, windAdd: TT && TT.wind || 0 };
    z.sp0 = z.sp;
    clampG(z); foes.push(z); return z;
  }
  // ---------- 怪身上的状态 ----------
  // 缓滞：每层减速 15%，最多 4 层，叠满冻结 1 秒；硬控（眩晕 / 定身 / 浮空 / 冻结）之后 3 秒内不再被硬控；精英时间减半，小头目和首领免疫
  function status(z, o, d) {
    if (o.slowP) { z.slowP = Math.max(z.slowP || 0, o.slowP[0]); z.slowPT = Math.max(z.slowPT || 0, o.slowP[1]); }
    if (o.slow) { z.slowL = Math.min(4, (z.slowL || 0) + o.slow); z.slowT = 3; if (z.slowL >= 4) { z.slowL = 0; cc(z, 'freeze', 1); } }
    if (o.burn) { z.burnT = 3; z.burnD = Math.max(z.burnD || 0, d * .2); }
    if (o.bleed) { z.bleedN = Math.min(5, (z.bleedN || 0) + 1); z.bleedT = 4; z.bleedD = Math.max(z.bleedD || 0, d * .12); }
    if (o.curse) z.curseT = 4;
    if (o.vuln) { z.vulnN = Math.min(10, (z.vulnN || 0) + 1); z.vulnT = 4; }
    if (o.cc) cc(z, o.cc[0], o.cc[1], o.airVuln);
  }
  function cc(z, k, t, airVuln) {
    if (z.T.boss || z.tier === 'mini' || (z.ccImm || 0) > 0) return; if (z.tier === 'elite') t *= .5;
    z.cc = { k, t, T: t }; z.ccImm = 3; z.airVuln = !!airVuln; if (z.st === 'wind') { z.st = 'run'; z.t = 0; }   // 硬控打断抬手
  }
  function statusTick(z, dt) {
    z.ccImm = (z.ccImm || 0) - dt; if (z.cc && (z.cc.t -= dt) <= 0) z.cc = null;
    if (z.slowT > 0 && (z.slowT -= dt) <= 0) z.slowL = 0; if (z.slowPT > 0 && (z.slowPT -= dt) <= 0) z.slowP = 0;
    z.curseT -= dt; z.vulnT -= dt;
    z.dotT = (z.dotT || 0) - dt; if (z.dotT <= 0) { z.dotT = .5; let d = 0; if (z.burnT > 0) d += z.burnD; if (z.bleedT > 0) d += z.bleedD * z.bleedN; if (d > 0) { z.hp -= d; nums.push({ x: z.x + R(-6, 6) * K, y: z.y - 30 * K, v: Math.max(1, rd(d)), t: 0, col: z.burnT > 0 ? '#ff9a50' : '#ff6a6a' }); if (z.hp <= 0) kill(z); } }
    if (z.burnT > 0) z.burnT -= dt; if (z.bleedT > 0 && (z.bleedT -= dt) <= 0) z.bleedN = 0;
    z.sp = (z.sp0 || z.sp) * (1 - .15 * (z.slowL || 0)) * (1 - (z.slowP || 0));
  }
  // 打怪：o = { dt 伤害类型, crit 额外暴击, slow 缓滞层数, slowP [减速, 秒], burn, bleed, curse, vuln, cc [硬控, 秒], airVuln, quiet }
  function hurt(z, d, from, kb = 14, sid, o = {}) {
    if (z.dead || z.flee) return;
    const S = sid && DATA.skills[sid], dt = o.dt || (S && S.dt) || 'phys', T = z.T;
    const def = dt === 'magic' ? (T.mdef || 0) : (T.pdef || 0) * (z.tier ? 1.5 : 1); d *= 1 - Math.min(.6, def / (def + 100));   // 怪物防御：和勇者同一公式，最多减 60%
    if (z.curseT > 0) d *= 1.15; if (z.vulnN && z.vulnT > 0) d *= 1 + .05 * z.vulnN; if (z.cc && z.cc.k === 'air' && z.airVuln) d *= 1.3;
    const crit = Math.random() < hero.crit + (o.crit || 0); if (crit) d *= hero.critMul; d = Math.max(1, rd(d));
    status(z, o, d);
    if (sid) { const r = Math.min(d, Math.max(0, z.hp)); RUN.dmgW[sid] = (RUN.dmgW[sid] || 0) + r; RUN.dmgAll[sid] = (RUN.dmgAll[sid] || 0) + r; }
    z.hp -= d; z.flash = .12; nums.push({ x: z.x, y: z.y - (z.T.boss ? 64 : 34) * K, v: d, t: 0, col: crit ? '#ffd84a' : '#ffffff', big: crit });
    const a = from ? ang(from, z) : R(0, 7);
    // 推退：普通 6 格左右（原来 14 太远），同一只 0.2 秒内只推一次；精英减半，小头目和王不推；推不打断抬手
    const kbm = z.T.boss || z.tier === 'mini' ? 0 : z.tier === 'elite' ? .22 : .43;
    if (kbm && z.kbT <= 0) { z.kbx = Math.cos(a) * kb * kbm * K; z.kby = Math.sin(a) * kb * kbm * K / YS; z.kbT = .2; if (z.st === 'run') { z.st = 'hurt'; z.t = 0; } }
    if (!o.quiet) for (let i = 0; i < 3; i++) parts.push({ x: z.x, y: z.y - 14 * K, vx: (R(-30, 30) + Math.cos(a) * 30) * K, vy: R(-50, -10) * K, t: 0, T: R(.2, .4), col: i % 2 ? '#ffffff' : '#ffe9a8', g: 160 * K });
    G.hitStop = Math.max(G.hitStop, z.T.boss ? .04 : .02);
    if (z.hp <= 0) kill(z);
  }
  function kill(z) {
    z.dead = true; z.deadT = 0; z.st = 'dead'; G.kills++; G.wk++;
    if (z.tier === 'elite') { G.wElite++; G.drops.push(z.routeElite ? { kind: 'item' } : { kind: 'book' }); }   // 固定精英掉书，路线精英掉宝物
    if (z.tier === 'mini') { G.wMini++; G.drops.push({ kind: 'item' }); }
    for (let i = 0; i < 7; i++) parts.push({ x: z.x, y: z.y - 10 * K, vx: R(-45, 45) * K, vy: R(-70, -10) * K, t: 0, T: R(.4, .8), col: ['#8fd14a', '#5a8a2a', '#e8e0c8', '#c49a5c'][i % 4], g: 200 * K, sz: i < 3 ? 2 : 1 });
    if (z.T.boss) { G.shake = .5; banner('击败 哥布林王！', 3); G.winT = 2.2; for (const o of foes) if (!o.dead && o !== z) kill(o); return; }
  }
  // 升级不弹框：自动加一点生命和伤害，攒一次「修炼」机会（波间结算的修炼页用）
  // 升到下一级要的经验：(14 + 4 × (等级 − 1)) × 1.3（用户：升级慢一些），最高 Lv12
  const need = () => Math.round((14 + 4 * (G.lv - 1)) * DATA.econ.xpMul);
  function addXp(n) {
    n *= hero.xpMul || 1; G.xp += n; G.wx += n;
    while (G.xp >= need() && !hero.dead && G.lv < DATA.econ.maxLv) { G.xp -= need(); G.lv++; RUN.xiu++; RUN.pts++; G.lvUpT = 2.2; recompute(); hero.hp = Math.min(hero.maxHp, hero.hp + 5); nums.push({ x: hero.x, y: hero.y - 52 * K, txt: '升级！属性点 +1 · 修炼 +1', t: 0, col: '#8ef07a' }); }
  }
  function damageHero(d, dtype = 'phys') {
    if (hero.inv > 0 || hero.dead || G.over || G.god || G.ending) return;
    d *= dtype === 'magic' ? hero.mIn : hero.pIn; hero.hp -= d; hero.inv = .45; hero.hurtT = .25; G.shake = Math.max(G.shake, .15); nums.push({ x: hero.x, y: hero.y - 44 * K, v: rd(d), t: 0, col: '#ff6a5a' });
    if (hero.hp <= 0) { hero.hp = 0; hero.dead = true; hero.deadT = 0; banner('勇者倒下了……', 99); G.loseT = 1.6; }
  }

  // 杂兵：走到 reach 内抬手，抬手开始时锁定方向；出招时勇者在扇面（arc / r）里才挨打。弓手保持距离，锁方向后放箭（没有预警线）
  function soldierAI(z, dt) {
    const T = z.T; z.t += dt; z.cd -= dt;
    if (z.flee) { const a = ang(hero, z); z.x += Math.cos(a) * z.sp * 1.6 * K * dt; z.y += Math.sin(a) * z.sp * 1.6 * K * dt / YS; z.moving = true; z.f = Math.cos(a) < 0 ? -1 : 1; return; }
    const d = dist(z, hero), dx = hero.x - z.x, dy = hero.y - z.y, dd = Math.hypot(dx, dy) || 1, reach = T.reach * z.reachMul;
    if (z.st === 'hurt') { if (z.t > .2) { z.st = 'run'; z.t = 0; } return; }
    if (z.st === 'wind') { if (z.t > T.wind + z.windAdd) { z.st = 'strike'; z.t = 0;
        if (T.ranged) shots.push({ k: 'arrow', x: z.x + z.f * 8 * K, y: z.y - 18 * K, gy: z.y, vx: Math.cos(z.aim) * T.arrow * K, vy: Math.sin(z.aim) * T.arrow * K / YS, a: z.aim, t: 0, dmg: T.dmg * z.dmgMul, dtype: T.dtype });
        else { const r = T.r * z.reachMul, da = Math.abs(((ang(z, hero) - z.aim + PI * 3) % (PI * 2)) - PI); if (d < r + 6 && da < T.arc * PI / 360 + .15) damageHero(T.dmg * z.dmgMul, T.dtype); } } return; }
    if (z.st === 'strike') { if (z.t > .22) { z.st = 'rec'; z.t = 0; } return; }
    if (z.st === 'rec') { if (z.t > .25) { z.st = 'run'; z.t = 0; z.cd = T.cool * R(.85, 1.15); } return; }
    z.f = dx < 0 ? -1 : 1;
    if (T.ranged) {
      const [k0, k1] = T.keep;
      if (d < k0) { z.x -= dx / dd * z.sp * K * dt; z.y -= dy / dd * z.sp * K * dt / YS; z.moving = true; return; }
      if (d < reach && z.cd <= 0) { z.st = 'wind'; z.t = 0; z.moving = false; z.aim = ang(z, hero); return; }
      z.moving = d > k1; if (z.moving) { z.x += dx / dd * z.sp * K * dt; z.y += dy / dd * z.sp * K * dt / YS; } return;
    }
    if (d < reach && z.cd <= 0) { z.st = 'wind'; z.t = 0; z.moving = false; z.aim = ang(z, hero); return; }
    z.moving = d > reach * .7; if (z.moving) { z.x += dx / dd * z.sp * K * dt; z.y += dy / dd * z.sp * K * dt / YS; }
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
      if (z.mv === 'slam' && z.t > .95) { z.st = 'strike'; z.t = 0; G.shake = .3; fx.push({ k: 'ring', x: z.x, y: z.y, t: 0, T: .45, r: 46 }); if (d < 46) damageHero(z.T.dmg * 1.6, z.T.dtype);
        for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2; parts.push({ x: z.x + Math.cos(a) * 26 * K, y: z.y + Math.sin(a) * 18 * K, vx: Math.cos(a) * 50 * K, vy: (Math.sin(a) * 30 - 30) * K, t: 0, T: .5, col: '#c8a066', g: 120 * K, sz: 2 }); } }
      if (z.mv === 'charge' && z.t > .9) { z.st = 'dash'; z.t = 0; z.x0 = z.x; z.y0 = z.y; z.hitD = false; }
      return;
    }
    if (z.st === 'dash') {
      const p = Math.min(1, z.t / .35); z.x = z.x0 + Math.cos(z.a) * 150 * K * p; z.y = z.y0 + Math.sin(z.a) * 150 * K * p / YS; clampG(z);
      if (!z.hitD && dist(z, hero) < 22) { z.hitD = true; damageHero(z.T.dmg * 1.3, z.T.dtype); }
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
  function nearest(maxD = 1e9) { let b = null, bd = maxD; for (const z of foes) if (!z.dead && !z.flee) { const d = dist(z, hero); if (d < bd) { bd = d; b = z; } } return b; }
  // 熟练度：每本书出手一次 +1，7 格（DATA.prof）；第 2/4/6 格伤害 +10%，第 7 格前摇后摇各快 0.05 秒
  const profL = sk => { let L = 0; for (const n of DATA.prof) if ((sk.xp || 0) >= n) L++; return L; };
  function skillDmg(S, sk) { const L = profL(sk); return S.dmg * (1 + .06 * (hero.A[S.type] || 0)) * hero.m.dmg * (1 + .1 * Math.floor(L / 2)) * (G && G.wi === 0 ? 1 + (hero.fx.firstWave || 0) : 1); }
  // 前摇 / 后摇：敏捷的出手速度一起缩短；瞬光斩、贯星箭第 3 格蓄力变短
  function skillT(S, sk) { const L = profL(sk), sp = hero.m.spd || 1; let wu = S.wu; if (S.charge && L >= 3) wu = S.kind === 'pierce' || sk.id === 'pierce' ? .45 : .5; const cut = L >= 7 ? .05 : 0; return { wu: Math.max(.08, (wu - cut) / sp), rc: Math.max(.08, (S.rc - cut) / sp) }; }
  const nextSlot = () => { for (let k = 0; k < RUN.open; k++) { const i = (RUN.si + k) % RUN.open; if (RUN.slots[i]) return i; } return -1; };
  const HWPN = { sword: 'sword', spear: 'spear', bow: 'bow', staff: 'staff' };
  // 技能栏 1→2→3 严格轮流（空格子跳过），没有各自冷却：前摇（能走；翻滚 = 这招作废）→ 出手 → 占时型持续 → 后摇（站定；翻滚取消）
  // 够不着也照样朝最近的敌人放，场上没有敌人才等
  function weapon(dt) {
    for (let i = pend.length - 1; i >= 0; i--) { pend[i].t -= dt; if (pend[i].t <= 0) { pend[i].fn(); pend.splice(i, 1); } }
    if (hero.dead) return;
    let c = hero.cs;
    if (!c) { const i = nextSlot(); if (i < 0 || !nearest()) return; const sk = RUN.slots[i], S = DATA.skills[sk.id], T = skillT(S, sk); c = hero.cs = { i, sk, S, ph: 'wu', t: 0, dur: T.wu, rc: T.rc, a: aimNow() }; faceTo(c.a); }
    c.t += dt;
    if (c.ph === 'wu') { c.a = aimNow(c.a); faceTo(c.a); if (c.t < c.dur) return;
      const L = profL(c.sk), r = SK.cast({ S: c.S, sk: c.sk, L, d: skillDmg(c.S, c.sk), a: c.a, sid: c.sk.id });
      if (!r) { hero.cs = null; return; }   // 场上没敌人了：不放，等下一个敌人
      c.sk.xp = (c.sk.xp || 0) + 1; if (profL(c.sk) > L) { nums.push({ x: hero.x, y: hero.y - 52 * K, txt: `${c.S.name} 熟练度 ${profL(c.sk)}/7`, t: 0, col: '#ffd86a' }); }
      if (r !== true && r.hold) { c.ph = 'hold'; c.t = 0; c.dur = r.hold; c.move = r.move || 1; return; }
      c.ph = 'rc'; c.t = 0; c.dur = c.rc; return; }
    if (c.ph === 'hold') { if (c.t >= c.dur) { SK.chEnd(); c.ph = 'rc'; c.t = 0; c.dur = c.rc; } return; }
    if (c.ph === 'rc' && c.t >= c.dur) endCast();
  }
  function endCast() { const c = hero.cs; if (!c) return; if (c.ph === 'hold') SK.chEnd(); RUN.si = (c.i + 1) % RUN.open; hero.cs = null; }
  function aimNow(a0) { const t = nearest(); return t ? ang(hero, t) : (a0 != null ? a0 : (hero.f < 0 ? PI : 0)); }
  function faceTo(a) { hero.f = Math.cos(a) < 0 ? -1 : 1; }
  // 给 skills.js 用的接口
  let SK = null;
  const API = { K, YS, PI, hero: () => hero, foes: () => foes, ang, aimNow, face: faceTo, spinFace: () => { hero.f = Math.floor(G.t * 12) % 2 ? 1 : -1; },
    hurt: (z, d, from, kb, sid, o) => hurt(z, d, from, kb, sid, o), fx: o => fx.push(o), tele: o => tele.push(Object.assign({ mine: true }, o)), shake: v => { G.shake = Math.max(G.shake, v); },
    heal: n => { hero.hp = Math.min(hero.maxHp, hero.hp + n); },
    push: (z, a, d) => { if (z.T.boss) return; const k = z.tier === 'mini' ? 0 : z.tier === 'elite' ? .5 : 1; z.x += Math.cos(a) * d * k * K; z.y += Math.sin(a) * d * k * K / YS; clampG(z, 4 * K); },
    pull: (z, p, v, dt) => { const a = Math.atan2((p.y - z.y) * YS, p.x - z.x), d = Math.hypot(p.x - z.x, (p.y - z.y) * YS) / K, m = Math.min(d, v * dt); z.x += Math.cos(a) * m * K; z.y += Math.sin(a) * m * K / YS; clampG(z, 4 * K); },
    fireball: (x, y, T, r, cb) => shots.push({ k: 'fire', x, y, t: 0, T, r, cb }) };
  function shotTick(dt) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const o = shots[i]; o.t += dt;
      if (o.k === 'arrow') { o.x += o.vx * dt; o.y += o.vy * dt; o.gy += o.vy * dt;
        if (Math.hypot(hero.x - o.x, (hero.y - o.gy) * YS) / K < 9) { damageHero(o.dmg, o.dtype); shots.splice(i, 1); continue; }
        if (o.t > 2.4) shots.splice(i, 1); continue; }
      if (o.k === 'harrow') {   // 勇者的箭
        o.x += o.vx * dt; o.y += o.vy * dt; o.gy += o.vy * dt;
        for (const z of foes) if (!z.dead && !o.hit.has(z) && Math.hypot(z.x - o.x, (z.y - o.gy) * YS) / K < 10) { o.hit.add(z); hurt(z, o.dmg, { x: o.x - o.vx * .05, y: o.gy - o.vy * .05 }, 10, o.sid); if (--o.left <= 0) break; }
        if (o.left <= 0 || o.t > .7) shots.splice(i, 1); continue;
      }
      if (o.k === 'axe') {
        const sp = (o.out ? 200 : 240) * K;
        if (o.out) { o.d += sp * dt / K; if (o.d >= o.L) { o.out = false; o.hit.clear(); } o.cx = hero.x + Math.cos(o.a) * o.d * K; o.cy = hero.y - 14 * K + Math.sin(o.a) * o.d * K / YS; }
        else { const dx = hero.x - o.cx, dy = hero.y - 14 * K - o.cy, d = Math.hypot(dx, dy); if (d < sp * dt) { shots.splice(i, 1); continue; } o.cx += dx / d * sp * dt; o.cy += dy / d * sp * dt; }
        for (const z of foes) if (!z.dead && !o.hit.has(z) && Math.hypot(z.x - o.cx, (z.y - 14 * K - o.cy) * YS) / K < o.r + 8) { o.hit.add(z); hurt(z, o.dmg, { x: o.cx, y: o.cy + 14 * K }, 10, o.sid); }
        continue;
      }
      if (o.k === 'fire' && o.t >= o.T) {
        shots.splice(i, 1); G.shake = Math.max(G.shake, .1); fx.push({ k: 'boom', x: o.x, y: o.y, t: 0, T: .4, r: o.r }); burns.push({ x: o.x, y: o.y, r: o.r * .8, t: 0, T: 1.2 });
        if (o.cb) o.cb(); else for (const z of foes) if (!z.dead && dist(z, o) < o.r) hurt(z, o.dmg, o, 18, o.sid);
        for (let j = 0; j < 14; j++) { const a = R(0, PI * 2); parts.push({ x: o.x, y: o.y - 4 * K, vx: Math.cos(a) * R(30, 80) * K, vy: (Math.sin(a) * 30 - R(30, 70)) * K, t: 0, T: R(.3, .6), col: ['#fff2a0', '#ffb040', '#ff6020', '#a03010'][j % 4], g: 140 * K, sz: j % 3 ? 1 : 2 }); }
      }
    }
  }

  // ---------- 站与波次 ----------
  // 一站 3 波，每波固定 30 秒（不再有清场）。怪分 5 批出（0 / 15% / 30% / 45% / 60% 时），每只出现前地上先亮 0.55 秒的圈。
  // 场上打光了就提前出下一批；全出完还没到时间，就一直零星补哥布林，场上不空。时间到：剩下的怪逃走。首领波不限时。
  const STN = () => DATA.stations[G.st - 1], ITEMS = () => DATA.startItems.filter(i => i.id !== 'purse');
  function nextWave() {
    RUN.dmgW = {};
    if (G.wi >= STN().waves.length - 1) return stationEnd();   // 这一站打完：出 3 张路线卡
    G.wi++; G.wave++; const W = STN().waves[G.wi];
    Object.assign(G, { W, wt: 0, T: W.boss ? 0 : DATA.waveT, waveOn: true, wk: 0, wx: 0, wElite: 0, wMini: 0, drops: [], q: [], cleared: false, endT: null, timeout: false });
    if (W.boss) { G.bossT = 2.2; G.trickle = 6; banner('首领战！', 2); }
    else {
      const n = (k, c) => Array(Math.round((W[k] || 0) * DATA.countMul)).fill(c), all = shuffle([...n('G', 'goblin'), ...n('K', 'gob_blade'), ...n('A', 'gob_archer')]);
      const T = G.T, nb = 5; for (let i = 0; i < all.length; i++) G.q.push({ at: T * .15 * Math.floor(i * nb / all.length) + R(0, 2.5), type: all[i] });
      for (const [tier, t] of W.ex || []) G.q.push({ at: T * .3 + R(0, 2), type: t, tier });
      if (G.route === 'elite' && G.wi > 0) G.q.push({ at: T * .35, type: Math.random() < .5 ? 'gob_blade' : 'goblin', tier: 'elite', routeElite: true });   // 精英路线：第 2、3 波各多一只精英（掉宝物）
      G.q.sort((a, b) => a.at - b.at);
      banner(`第 ${G.st} 站 · 第 ${G.wi + 1} 波`, 1.6);
    }
    G.paused = false;
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function spawner(dt) {
    if (G.winT != null || !G.waveOn) return;
    const alive = foes.filter(z => !z.dead && !z.flee && !z.T.boss);
    if (G.W.boss) {   // 首领波：王出场，旁边零星补哥布林
      if (G.bossT != null && (G.bossT -= dt) <= 0) { G.bossT = null; bossIn(); }
      if (G.bossOut && (G.trickle -= dt) <= 0 && alive.length < 8) { G.trickle = 5; for (let i = 0; i < 2; i++) warnSpawn({ type: Math.random() < .6 ? 'goblin' : 'gob_blade' }); }
      return;
    }
    G.wt += dt;
    if (G.endT != null) { if ((G.endT -= dt) <= 0) { G.waveOn = false; waveEnd(); } return; }
    // 场上打光了：下一批提前出
    if (!alive.length && G.q.length && !warns.length && G.q[0].at > G.wt) { const d = G.q[0].at - G.wt; for (const o of G.q) o.at -= d; }
    const arch = alive.filter(z => z.T.ranged).length;
    while (G.q.length && G.q[0].at <= G.wt) {
      const o = G.q[0]; if (alive.length + warns.length >= DATA.caps.normal || (o.type === 'gob_archer' && arch >= DATA.caps.archer)) break;   // 场上太多就等等
      G.q.shift(); warnSpawn(o);
    }
    if (!G.q.length && alive.length + warns.length < 6 && G.wt < G.T - 3) for (let i = 0; i < 3; i++) warnSpawn({ type: Math.random() < .7 ? 'goblin' : 'gob_blade' });   // 出完了：零星补怪
    if (G.wt >= G.T) { G.timeout = true; for (const z of alive) z.flee = true; G.q = []; warns.length = 0; banner('时间到！敌人撤退了', 1.4); G.endT = 1.4; }
  }
  // 出怪前地上先亮一个圈（0.55 秒），离勇者 135–190 格
  const warns = [];
  function warnSpawn(o) { const p = spawnPos(); warns.push(Object.assign({ x: p.x, y: p.y, t: 0 }, o)); }
  function warnTick(dt) {
    for (let i = warns.length - 1; i >= 0; i--) { const w = warns[i]; w.t += dt; if (w.t >= .55) { warns.splice(i, 1); const z = spawn(w.type, w, w.tier); if (w.routeElite) z.routeElite = true; } }
  }
  // 一波结算：铜钱、经验、回血、战利品（固定书、精英 / 小头目掉落）
  function waveEnd() {
    G.paused = true; foes = foes.filter(z => !z.flee); if (hero.cs) { if (hero.cs.ph === 'hold') SK.chEnd(); hero.cs = null; } SK.reset(); const E = DATA.econ, fx = hero.fx, cl = G.cleared && !G.timeout;
    const cw = Math.round((E.waveCoin[0] + E.waveCoin[1] * (G.st - 1) + Math.floor(G.wk / E.perKills) + G.wElite * E.elite + G.wMini * E.mini + (cl ? E.clear : 0) + (fx.waveCoin || 0)) * (1 + (fx.coinMul || 0)));
    RUN.coins += cw;
    const xp0 = G.xp, lv0 = G.lv; addXp(E.waveXp + G.st + Math.floor(G.wk / E.xpPerKills) + G.wElite * E.xpElite + G.wMini * E.xpMini + (cl ? E.xpClear : 0));
    hero.hp = Math.min(hero.maxHp, hero.hp + E.waveHeal + hero.maxHp * (fx.waveHeal || 0));
    RUN.xopt = null; RUN.xrr = 0; RUN.shop = null; RUN.rr = 0;
    // 掉书只从还没拿到的书里抽（11/21 定）；全拿到了就换成铜钱
    const own = new Set([...RUN.slots, ...RUN.bag].filter(x => x && (x.kind === 'book' || !x.kind)).map(x => x.id)), ids = DATA.bookPool(own, G.st, G.drops.some(d => d.kind === 'book')), pick = a => a[Math.random() * a.length | 0], loot = [];
    const book = (G.st === 1 && G.wi === 0) || G.wi === STN().waves.length - 1 || (G.st === 1 && G.wi === 2);   // 必出书：1-1、1-3、每站第 3 波
    const pickNew = () => { const f = ids.filter(i => !loot.some(o => o.id === i)); return pick(f.length ? f : ids); };   // 同一次结算不掉两本一样的
    if (book) loot.push(ids.length ? { kind: 'book', id: pickNew() } : { kind: 'use', id: 'meat' });
    for (const d of G.drops) loot.push(d.kind === 'book' && ids.length ? { kind: 'book', id: pickNew() } : { kind: 'item', id: pick(ITEMS()).id });
    if (!loot.length && Math.random() < .3) loot.push({ kind: 'use', id: 'meat' });
    const last = G.wi === STN().waves.length - 1 || !!(STN().waves[G.wi + 1] || {}).boss;
    UI.waveEnd({ st: G.st, wi: G.wi, kills: G.wk, coins: cw, clear: cl, timeout: G.timeout, xp: Math.round(G.wx), lv: G.lv, dmg: Object.assign({}, RUN.dmgW), loot, last, boss: !!(STN().waves[G.wi + 1] || {}).boss });
  }
  // 一站打完：免费开格（第 4 站后开第 4 格，第 8 站后开第 5 格），再出 3 张路线卡三选一
  function stationEnd() {
    if (G.st === 4 && RUN.open < 4) { RUN.open = 4; toastMsg('第 4 格技能栏免费解锁！'); }
    if (G.st === 8 && RUN.open < 5) { RUN.open = 5; toastMsg('第 5 格技能栏免费解锁！'); }
    G.paused = true;
    const go = route => { G.st++; G.wi = -1; G.route = route; nextWave(); };
    if (G.st + 1 >= DATA.stations.length) return UI.route({ st: G.st + 1, cards: [{ k: 'boss', name: '首领 · 哥布林王', desc: '打谷场的尽头。打完 2 波杂兵，哥布林王亲自出来。' }] }, () => go('boss'));
    const C = { fight: { k: 'fight', name: '战斗', desc: '普通的一站，3 波哥布林。' }, elite: { k: 'elite', name: '精英', desc: '第 2、3 波各多一只精英。更难，打倒精英掉宝物。' } };
    const cards = shuffle([C.fight, C.elite, Math.random() < .5 ? C.fight : C.elite]).map((c, i) => Object.assign({ i }, c));
    UI.route({ st: G.st + 1, cards }, c => go(c.k));
  }
  function toastMsg(t) { UI.toast && UI.toast(t); }
  function bossIn() { if (G.bossOut) return; G.bossOut = true; G.boss = spawn(G.W.boss || MAP.boss); G.boss.cd = 2.5; banner('哥布林王 出现了！', 2.4); G.shake = .3; }

  // ---------- 每帧更新 ----------
  function update(dt) {
    G.t += dt; hero.t += dt; if (G.lvUpT > 0) G.lvUpT -= dt;
    if (G.banner) { G.banner.left -= dt; if (G.banner.left <= 0) G.banner = null; }
    G.shake = Math.max(0, G.shake - dt);
    if (G.winT != null && (G.winT -= dt) <= 0 && !G.over) { G.over = 'win'; return end(); }
    if (hero.dead) { hero.deadT += dt; if ((G.loseT -= dt) <= 0 && !G.over) { G.over = 'lose'; return end(); } }
    else {
      hero.rollCd -= dt; hero.inv -= dt; hero.hurtT -= dt;
      if (hero.roll > 0) { hero.roll -= dt; hero.x += hero.rvx * 240 * K * dt; hero.y += hero.rvy * 182 * K * dt; if (Math.random() < .7) parts.push({ x: hero.x, y: hero.y, vx: R(-10, 10) * K, vy: R(-10, 0) * K, t: 0, T: .3, col: '#e6dcb4', g: 0 }); }
      else { const c = hero.cs, root = c && c.ph === 'rc', mm = !c ? 1 : c.ph === 'wu' ? (c.S.charge ? .5 : 1) : c.ph === 'hold' ? c.move : 1;
        const [dx, dy] = root ? [0, 0] : moveDir(), d = Math.hypot(dx, dy); hero.moving = d > .1; if (hero.moving) { const k = Math.min(1, d), v = 85 * hero.m.move * mm * K; hero.x += dx / (d || 1) * k * v * dt; hero.y += dy / (d || 1) * k * v * .76 * dt; if (!c) hero.f = dx < -.1 ? -1 : dx > .1 ? 1 : hero.f; } }
      clampG(hero, 8 * K); weapon(dt);
    }
    if (!hero.dead) { SK.tick(dt);
    }
    spawner(dt); warnTick(dt);
    for (const z of foes) {
      if (z.dead) { z.deadT += dt; continue; }
      z.flash -= dt; z.kbT -= dt; statusTick(z, dt); if (z.dead) continue;
      if (z.cc) z.moving = false; else if (z.T.boss) bossAI(z, dt); else soldierAI(z, dt);
      z.x += z.kbx * dt * 8; z.y += z.kby * dt * 8; z.kbx *= .8; z.kby *= .8; clampG(z, 4 * K);
    }
    const L = foes.filter(z => !z.dead), m0 = 9 * K;   // 互相推开，别叠成一坨
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j], dx = b.x - a.x, dy = (b.y - a.y) * YS, d = Math.hypot(dx, dy), m = a.T.boss || b.T.boss ? m0 * 2.2 : m0; if (d > 0 && d < m) { const p = (m - d) / 2 / d; if (!a.T.boss) { a.x -= dx * p; a.y -= dy * p / YS; } if (!b.T.boss) { b.x += dx * p; b.y += dy * p / YS; } } }
    for (let i = foes.length - 1; i >= 0; i--) { const z = foes[i]; if ((z.dead && z.deadT > (z.T.boss ? 3 : 1.3)) || (z.flee && (z.fleeT = (z.fleeT || 0) + dt) > 1.6)) foes.splice(i, 1); }
    teleTick(dt); shotTick(dt);
    for (const a of [fx, parts, nums, burns]) for (let i = a.length - 1; i >= 0; i--) { const o = a[i]; o.t += dt; if (o.vx != null) { o.x += o.vx * dt; o.y += o.vy * dt; o.vy += (o.g || 0) * dt; } if (o.t >= (o.T || (o.txt ? 1.4 : .75))) a.splice(i, 1); }
  }
  function end() {
    UI.result({ win: G.over === 'win', kills: G.kills, time: G.t, lv: G.lv, weapon: RUN.weapon, st: G.st, wi: G.wi, boss: !!(G.W && G.W.boss), dmg: RUN.dmgAll });
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
    const c = hero.cs; if (c) {   // 出招帧：js/skframes.js（tools/frames.html 调）
      const F = SKF.get(c.sk.id); let r = null;
      if (c.ph === 'wu') r = SKF.pick(F, 'wu', c.t);
      else if (c.ph === 'hold') r = SKF.pick(F, 'hold', c.t);
      else if (!c.move && c.t < F.hitT) { r = SKF.pick(F, 'hit', c.t); if (r) return [r[0], r[1], 'strike', F.lunge]; }
      else r = SKF.pick(F, 'rc', c.t - (c.move ? 0 : F.hitT));
      if (r) return [r[0], r[1], '']; if (c.ph !== 'rc') return ['idle', 0, '']; }
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
      const p = o.t / o.T, blink = p > .7 && (Math.floor(o.t * 16) % 2), col = o.mine ? (blink ? '#ffffff' : '#ffd86a') : blink ? '#fff2c0' : '#d8402a';
      ctx.save(); ctx.translate(X(o.x), Y(o.y));
      if (o.k === 'circle') { const r = o.r * u; ctx.fillStyle = o.mine ? 'rgba(255,216,106,.18)' : 'rgba(216,64,42,.28)'; ctx.beginPath(); ctx.ellipse(0, 0, r * p, r * p / YS, 0, 0, 7); ctx.fill(); ctx.fillStyle = col; for (let a = 0; a < PI * 2; a += .08) { if (Math.floor(a / .08) % 2) continue; ctx.fillRect(rd(Math.cos(a) * r), rd(Math.sin(a) * r / YS), 2 * u, 2 * u); } }
      else { ctx.scale(1, 1 / YS); ctx.rotate(o.a); const L = o.len * u, w = o.w * u; ctx.fillStyle = 'rgba(216,64,42,.26)'; ctx.fillRect(0, -w / 2, L * p, w); ctx.fillStyle = col; for (let i = 0; i < L; i += 6 * u) { ctx.fillRect(i, -w / 2, 3 * u, u); ctx.fillRect(i, w / 2, 3 * u, u); } }
      ctx.restore();
    }
    for (const w of warns) {   // 出怪预警：地上一个小圈慢慢合拢
      const p = w.t / .55, r = (14 + 10 * (1 - p)) * u; ctx.fillStyle = `rgba(30,10,5,${.25 + .25 * p})`; ctx.beginPath(); ctx.ellipse(X(w.x), Y(w.y), r, r / YS, 0, 0, 7); ctx.fill();
      ctx.fillStyle = w.tier ? '#ffcf3a' : '#d8402a'; for (let a = 0; a < PI * 2; a += .2) ctx.fillRect(X(w.x) + rd(Math.cos(a) * r), Y(w.y) + rd(Math.sin(a) * r / YS), u, u);
    }
    SK.drawUnder(ctx, X, Y, u); chargePreview();
    for (const o of shots) if (o.k === 'fire') {   // 火球落点：地上的影子越来越大
      const p = o.t / o.T, r = o.r * u * (.3 + .7 * p); ctx.fillStyle = `rgba(255,90,30,${.15 + .2 * p})`; ctx.beginPath(); ctx.ellipse(X(o.x), Y(o.y), r, r / YS * .8, 0, 0, 7); ctx.fill();
    }
    const list = foes.map(z => ({ y: z.y, z })); list.push({ y: hero.y, h: 1 }); list.sort((a, b) => a.y - b.y);
    for (const o of list) {
      if (o.h) {
        shadow(hero.x, hero.y, 26);
        if (hero.inv > 0 && hero.roll <= 0 && hero.hurtT <= 0 && !hero.dead && Math.floor(G.t * 20) % 2) continue;
        const [n, i, st, lg] = heroFrame(), bob = st === 'run' && i % 2 ? -u : 0, lunge = st === 'strike' ? hero.f * (lg || 0) * u : st === 'hurt' ? -hero.f * 2 * u : 0;
        SPR.drawHero(ctx, n, i, X(hero.x) + lunge, Y(hero.y) + bob, hero.f < 0, u, { w: hero.cs ? hero.cs.S.w : HWPN[RUN.weapon] || 'sword' });
      } else {
        const z = o.z, B = z.T.boss, [n, st] = foeFrame(z);
        const a = z.dead ? Math.max(0, 1 - Math.max(0, z.deadT - (B ? 2.4 : .9)) / .4) : z.flee ? Math.max(0, 1 - z.fleeT / 1.6) : 1;
        if (!z.dead) shadow(z.x, z.y, B ? 50 : 26 * z.k);
        if (!z.dead && z.tier) { const r = (z.tier === 'mini' ? 20 : 15) * u; ctx.fillStyle = z.tier === 'mini' ? '#ff7a3a' : '#ffcf3a'; for (let a = 0; a < PI * 2; a += .14) ctx.fillRect(X(z.x) + rd(Math.cos(a) * r), Y(z.y) + rd(Math.sin(a) * r / YS), u, u);
          const w = 22 * u, y = Y(z.y) - rd(46 * z.k) * u; ctx.fillStyle = '#2a160e'; ctx.fillRect(X(z.x) - w / 2 - u, y - u, w + 2 * u, 3 * u); ctx.fillStyle = z.tier === 'mini' ? '#ff7a3a' : '#ffcf3a'; ctx.fillRect(X(z.x) - w / 2, y, rd(w * Math.max(0, z.hp / z.maxHp)), u); }
        const bob = st === 'run' ? -u : 0, lunge = st === 'strike' ? z.f * 4 * u : st === 'hurt' && !B ? -z.f * 2 * u : 0;
        const air = z.cc && z.cc.k === 'air' ? rd(Math.sin(Math.min(1, 1 - z.cc.t / z.cc.T) * PI) * 18 * u) : 0;
        SPR.draw(ctx, z.type, n, 0, X(z.x) + lunge, Y(z.y) + bob - air, z.f < 0, u, { v: z.v, k: z.k, white: z.flash > 0 && !z.dead ? .6 : z.cc && z.cc.k === 'freeze' ? .35 : 0, alpha: a });
        if (!z.dead && z.cc) { if (z.cc.k === 'freeze') { ctx.fillStyle = 'rgba(140,210,255,.35)'; ctx.fillRect(X(z.x) - 10 * u, Y(z.y) - 34 * u, 20 * u, 34 * u); } else if (z.cc.k === 'stun') for (let k = 0; k < 3; k++) { const aa = G.t * 6 + k * 2.1; ctx.fillStyle = '#ffe27a'; ctx.fillRect(X(z.x) + rd(Math.cos(aa) * 7 * u), Y(z.y) - 40 * u + rd(Math.sin(aa) * 2 * u), 2 * u, 2 * u); } }
        if (!z.dead && (z.burnT > 0 || z.slowL > 0 || z.curseT > 0) && Math.random() < .3) parts.push({ x: z.x + R(-6, 6) * K, y: z.y - R(4, 26) * K, vx: 0, vy: -20 * K, t: 0, T: .4, col: z.burnT > 0 ? '#ff8a30' : z.slowL > 0 ? '#8ad8ff' : '#b07bff', g: 0 });
        if (B && z.st === 'wind' && Math.floor(z.t * 12) % 2) SPR.draw(ctx, z.type, n, 0, X(z.x), Y(z.y), z.f < 0, u, { white: .35 });
      }
    }
    for (const o of shots) {
      if (o.k === 'arrow') { const f = SPR.frame('gob_archer', 'arrow'); if (f) { ctx.save(); ctx.translate(X(o.x), Y(o.y)); ctx.rotate(Math.atan2(o.vy, o.vx)); ctx.drawImage(SPR.sets.gob_archer.base, f.x, f.y, f.w, f.h, -f.w * u / 2, -f.h * u / 2, f.w * u, f.h * u); ctx.restore(); } }
      else if (o.k === 'axe') drawAxe(X(o.cx), Y(o.cy), o.t * 14);
      else if (o.k === 'harrow') { const a = Math.atan2(o.vy, o.vx); for (let j = 0; j < 9; j++) { ctx.fillStyle = j < 2 ? '#e8ecf4' : j > 6 ? '#e8e0c8' : '#8a5a2a'; ctx.fillRect(X(o.x) - rd(Math.cos(a) * j * 1.6 * u), Y(o.y) - rd(Math.sin(a) * j * 1.6 * u), u + 1, u + 1); } }
      else if (o.k === 'fire') { const p = o.t / o.T, hy = (1 - p) * 120; for (let j = 0; j < 5; j++) { ctx.fillStyle = ['#fff6c0', '#ffd060', '#ff8a30', '#e04a20', '#902a10'][j]; const q = (5 - j) * u; ctx.fillRect(X(o.x) - q / 2 - rd(j * 3 * u * (1 - p)), Y(o.y) - rd((hy + j * 7) * u) - q / 2, q, q); } }
    }
    SK.drawOver(ctx, X, Y, u);
    for (const o of fx) {
      const p = o.t / o.T;
      if (o.k === 'slash') {   // 像素刀光：三层，从起手往前扫开（half 半角、rev 反手、gold 金色、wood 枪杆）
        const hf = o.half || 1.35, C3 = o.gold ? ['#ffffff', '#ffe27a', '#e8a020'] : o.wood ? ['#f0e0c0', '#c8a070', '#8a5a2a'] : ['#ffffff', '#fff2b0', '#f0c04c'];
        for (let k = 0; k < 3; k++) { const r = (o.r - k * 4) * u; for (let a = -hf; a <= hf; a += .04) { const t = (o.rev ? hf - a : a + hf) / (2 * hf); if (t > p * 1.6) continue; if (p > .6 && (Math.floor(a * 40) % 2)) continue; const aa = o.a + a; ctx.fillStyle = C3[k]; const q = k === 0 ? 2 * u : u; ctx.fillRect(X(o.x) + rd(Math.cos(aa) * r), Y(o.y) + rd(Math.sin(aa) * r / YS), q, q); } }
      } else if (o.k === 'thrust') {   // 像素枪芒：一道往前捅出去的直线，带两条边
        const L = o.L * u * Math.min(1, p * 2.2), ca = Math.cos(o.a), sa = Math.sin(o.a) / YS;
        for (let d = 0; d < L; d += u) { const k = d / (o.L * u); ctx.fillStyle = k > .85 ? '#ffffff' : p > .6 ? '#f0c04c' : '#fff2b0'; const q = k > .85 ? 2 * u : u; ctx.fillRect(X(o.x) + rd(ca * d), Y(o.y) + rd(sa * d), q, q); if (d % (3 * u) < u && p < .5) { const w = o.w * u * .5; ctx.fillStyle = 'rgba(255,240,180,.6)'; ctx.fillRect(X(o.x) + rd(ca * d - sa * w), Y(o.y) + rd(sa * d + ca * w), u, u); ctx.fillRect(X(o.x) + rd(ca * d + sa * w), Y(o.y) + rd(sa * d - ca * w), u, u); } }
      } else if (o.k === 'frost') { const r = o.r * u * (.3 + p * .8); for (let a = 0; a < PI * 2; a += .05) { if (p > .6 && Math.floor(a * 20) % 2) continue; ctx.fillStyle = p < .4 ? '#ffffff' : '#8ad8ff'; ctx.fillRect(X(o.x) + rd(Math.cos(a) * r), Y(o.y) + rd(Math.sin(a) * r / YS), 2 * u, 2 * u); } if (p < .35) { ctx.fillStyle = 'rgba(160,220,255,.25)'; ctx.beginPath(); ctx.ellipse(X(o.x), Y(o.y), r, r / YS, 0, 0, 7); ctx.fill(); } }
      else if (o.k === 'ring') { const r = o.r * u * (.6 + p * .8); for (let a = 0; a < PI * 2; a += .05) { ctx.fillStyle = p < .5 ? '#fff2c0' : (o.col || '#c8a066'); ctx.fillRect(X(o.x) + rd(Math.cos(a) * r), Y(o.y) + rd(Math.sin(a) * r / YS), 2 * u, 2 * u); } }
      else if (o.k === 'boom') { const r = o.r * u * (.5 + p * .7); for (let a = 0; a < PI * 2; a += .06) { if (Math.floor(a * 10 + o.t * 30) % 3 === 0) continue; ctx.fillStyle = o.col === 'dark' ? (p < .4 ? '#e0c0ff' : p < .7 ? '#9a50e0' : '#40104a') : p < .4 ? '#fff2a0' : p < .7 ? '#ff9a30' : '#a03a18'; ctx.fillRect(X(o.x) + rd(Math.cos(a) * r), Y(o.y) + rd(Math.sin(a) * r / YS), 2 * u, 2 * u); } if (p < .3) { ctx.fillStyle = 'rgba(255,230,140,.35)'; ctx.beginPath(); ctx.ellipse(X(o.x), Y(o.y), r * .8, r * .8 / YS, 0, 0, 7); ctx.fill(); } }
    }
    for (const o of fx) {
      const p = o.t / o.T;
      if (o.k === 'line') { const L = o.L * u * Math.min(1, p * 3), ca = Math.cos(o.a), sa = Math.sin(o.a) / YS, w = o.w * u * .5 * (1 - p); for (let d = 0; d < L; d += u) { ctx.fillStyle = p < .4 ? '#ffffff' : o.col; ctx.fillRect(X(o.x) + rd(ca * d - sa * w * .3), Y(o.y) + rd(sa * d + ca * w * .3), 2 * u, Math.max(u, rd(w))); } }
      else if (o.k === 'bolt') { ctx.strokeStyle = p < .5 ? '#ffffff' : o.col; ctx.lineWidth = Math.max(1, (2 - p * 1.5) * u); ctx.beginPath(); o.pts.forEach((q, i) => { const jx = i && i < o.pts.length - 1 ? R(-3, 3) * u : 0; i ? ctx.lineTo(X(q.x) + jx, Y(q.y)) : ctx.moveTo(X(q.x), Y(q.y)); }); ctx.stroke(); }
      else if (o.k === 'pillar') { const w = o.r * u * (1 - p * .5), h = 160 * u; ctx.fillStyle = `rgba(255,245,200,${.5 * (1 - p)})`; ctx.fillRect(X(o.x) - w, Y(o.y) - h, w * 2, h); ctx.fillStyle = `rgba(255,255,255,${.7 * (1 - p)})`; ctx.fillRect(X(o.x) - w * .4, Y(o.y) - h, w * .8, h); }
      else if (o.k === 'orb') { ctx.fillStyle = o.col; ctx.globalAlpha = 1 - p; ctx.beginPath(); ctx.arc(X(o.x), Y(o.y), o.r * u, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      else if (o.k === 'icicle') { const y = Y(o.y) - rd((1 - Math.min(1, p * 2)) * 40 * u); for (let j = 0; j < 6; j++) { ctx.fillStyle = j < 2 ? '#ffffff' : '#8ad8ff'; ctx.fillRect(X(o.x), y - j * u, u, u); } }
    }
    for (const q of parts) { ctx.fillStyle = q.col; const z = (q.sz || 1) * u; ctx.fillRect(X(q.x), Y(q.y), z, z); }
    const nk = Math.max(1, rd(u * .9));
    for (const n of nums) { const y = Y(n.y) - n.t * 22 * u; if (n.txt) { ctx.font = `${7 * u}px Pix, monospace`; ctx.textAlign = 'center'; ctx.lineWidth = 2 * u; ctx.strokeStyle = '#2a160e'; ctx.strokeText(n.txt, X(n.x), y); ctx.fillStyle = n.col; ctx.fillText(n.txt, X(n.x), y); } else num(n.v, X(n.x), y, n.col, n.big ? nk + 1 : nk); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (joy.on) { const dpr = W / innerWidth; ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.beginPath(); ctx.arc(joy.sx * dpr, joy.sy * dpr, 40 * dpr, 0, 7); ctx.fill(); const jx = joy.x - joy.sx, jy = joy.y - joy.sy, d = Math.hypot(jx, jy), k = Math.min(1, 40 / (d || 1)); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc((joy.sx + jx * k) * dpr, (joy.sy + jy * k) * dpr, 18 * dpr, 0, 7); ctx.fill(); }
    UI.hud({ roll: Math.max(0, hero.rollCd) / 1.8, rollT: Math.max(0, hero.rollCd), lvUp: G.lvUpT > 0, hp: hero.hp, maxHp: hero.maxHp, lv: G.lv, xp: G.xp, need: G.lv >= DATA.econ.maxLv ? 0 : need(), kills: G.kills, st: G.st, sts: DATA.stations.length, wi: G.wi, left: G.W && !G.W.boss ? Math.max(0, G.T - G.wt) : null, bossWave: !!(G.W && G.W.boss), coins: RUN.coins, slots: RUN.slots, open: RUN.open, next: nextSlot(), xiu: RUN.xiu, bossOut: G.bossOut, boss: G.boss && !G.boss.dead ? G.boss.hp / G.boss.maxHp : null, banner: G.banner ? G.banner.t : '' });
  }
  // 蓄力类前摇：脚下画金色预警（瞬光斩半圆、贯星箭长线、跃龙击圆圈 + 地裂）
  function chargePreview() {
    const c = hero.cs; if (!c || c.ph !== 'wu') return; const id = c.sk.id, p = Math.min(1, c.t / c.dur), L = profL(c.sk), ar = hero.m.area;
    ctx.save(); ctx.translate(X(hero.x), Y(hero.y)); ctx.fillStyle = 'rgba(255,216,106,.16)'; ctx.strokeStyle = '#ffd86a'; ctx.lineWidth = u;
    if (id === 'flash') { const r = 52 * 1.8 * (L >= 5 ? 1.3 : 1) * ar * u; ctx.scale(1, 1 / YS); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r * p, c.a - PI / 2, c.a + PI / 2); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, r, c.a - PI / 2, c.a + PI / 2); ctx.stroke(); }
    else if (id === 'pierce') { ctx.scale(1, 1 / YS); ctx.rotate(c.a); const w = (L >= 5 ? 15 : 10) * 2 * u; ctx.fillRect(0, -w / 2, 600 * u * p, w); }
    else if (id === 'leap') { const r = 40 * ar * u; ctx.beginPath(); ctx.ellipse(0, 0, r * p, r * p / YS, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, 0, r, r / YS, 0, 0, 7); ctx.stroke(); }
    ctx.restore();
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
    run: () => RUN, recompute: () => G && recompute(), trainAll: () => trainAll(), nextWave: () => G && nextWave(), hero: () => hero, lv: () => G ? G.lv : 1, st: () => G ? G.st : 1,
    skillInfo: sk => { const S = DATA.skills[sk.id], L = profL(sk), T = G ? skillT(S, sk) : { wu: S.wu, rc: S.rc }; return { dmg: G ? skillDmg(S, sk) : S.dmg, wu: T.wu, rc: T.rc, cd: T.wu + T.rc + (S.hold || 0), L, xp: sk.xp || 0, next: DATA.prof[L] || null }; }, profL,
    debug: { boss: () => G && (foes.forEach(z => !z.dead && kill(z)), G.st = DATA.stations.length, G.wi = 1, nextWave()), god: () => G && (G.god = !G.god), clear: () => G && (G.q = [], warns.length = 0, foes.forEach(z => !z.T.boss && !z.dead && kill(z)), G.wt = Math.max(G.wt, G.T - .1)), skip: () => G && G.W && (G.wt = G.T), st: n => G && (G.st = n, G.wi = -1), lvl: () => G && addXp(need() / (hero.xpMul || 1) - G.xp + .01), win: () => G && (G.boss ? kill(G.boss) : (G.st = DATA.stations.length, G.wi = 1, nextWave(), bossIn(), kill(G.boss))), heal: () => hero && (hero.hp = hero.maxHp), state: () => ({ G, hero, foes, RUN, u, s, W, H }) },
  };
})();

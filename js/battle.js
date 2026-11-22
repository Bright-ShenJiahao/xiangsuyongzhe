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
    cam.snap = true; hero = { gap: 0, rollBuf: 0, x: MAPW / 2, y: (g.y0 + g.y1) / 2, hp: 0, maxHp: 0, f: 1, t: 0, roll: 0, rollCd: 0, inv: 0, hurtT: 0, atkT: 0, moving: false, cd: .6, dead: false,
      m: { dmg: 1, spd: 1, area: 1, move: 1 }, crit: .01, critMul: 1.5, pIn: 1, mIn: 1, xpMul: 1, fx: {}, A: {} };
    // 这一局的全部状态：属性、修炼加的点、技能栏、背包、铜钱
    RUN = { hero: b.hero || 'm', weapon: b.weapon, attrs: b.attrs || A0, habit: b.habit || null, train: {}, pts: 0,   /* 11/22 属性加点删除，只靠修炼 */ alloc: {}, tmp: {}, slots: Array(DATA.slotsMax).fill(null), open: DATA.slotsOpen,
      bag: Array(DATA.bagSize).fill(null), gear: Array(DATA.gearSize).fill(null), oath: Array(DATA.oathSize).fill(null), mv: [null], coins: 0, si: 0, xiu: 0, dmgAll: {}, dmgW: {}, xopt: null, xrr: 0, shop: null, rr: 0, bought: {} };
    RUN.slots[0] = { id: b.weapon, lv: 1, xp: 0 }; if (b.item) RUN.gear[0] = { kind: 'item', id: b.item };
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
    const items = RUN.gear.filter(x => x && x.kind === 'item').map(x => x.id);   // 11/23 只有左边宝物格里的宝物生效
    const c = DATA.calc({ weapon: RUN.weapon, attrs: RUN.attrs, train: trainAll(), items, habit: RUN.habit }), m = hero.m;
    m.dmg = (1 + (c.fx.dmg || 0)) * (1 + .03 * (G.lv - 1)); m.spd = c.spd; m.area = c.area; m.move = c.move;
    hero.crit = c.crit; hero.critMul = c.critMul; hero.pIn = c.pIn; hero.mIn = c.mIn; hero.xpMul = c.xp * (RUN.hero === 'm' ? 1.1 : 1); hero.rollMax = RUN.hero === 'f' ? 1.44 : 1.8;   // 人物被动：男主经验 +10%，女主翻滚冷却 −20% hero.A = c.A; hero.fx = c.fx;
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
    addEventListener('blur', () => { if (running()) UI.softPause(); for (const k in keys) keys[k] = 0; joy.on = false; });
  }
  const running = () => G && !G.over && !G.paused;
  function moveDir() {
    if (G && G.lock) return [0, 0];
    let dx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), dy = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
    if (joy.on) { const jx = joy.x - joy.sx, jy = joy.y - joy.sy, d = Math.hypot(jx, jy); if (d > 6) { const k = Math.min(1, d / 40); dx = jx / d * k; dy = jy / d * k; } }
    return [dx, dy];
  }
  function roll() {
    if (running() && !hero.dead && (hero.roll > 0 || hero.rollCd > 0)) { if (Math.max(hero.roll, hero.rollCd) < .2) hero.rollBuf = .2; return; }
    if (!running() || hero.dead) return; hero.rollBuf = 0;
    const [dx, dy] = moveDir(), d = Math.hypot(dx, dy); hero.rvx = d ? dx / d : hero.f; hero.rvy = d ? dy / d : 0; if (dx) hero.f = dx < 0 ? -1 : 1;
    hero.roll = .3; hero.rollCd = hero.rollMax || 1.8; hero.inv = Math.max(hero.inv, .3);
    const c = hero.cs; if (c && (c.ph === 'wu' || c.ph === 'rc')) { if (c.ph === 'wu') nums.push({ x: hero.x, y: hero.y - 50 * K, txt: c.S.name + ' 中断', t: 0, col: '#c8b890' }); endCast(); }
  }

  // ---------- 敌人 ----------
  // 生成一只敌人：tier = 'elite' / 'mini'（精英 / 小头目）。at 给了就生在那里，否则离勇者 135–190 格的地面上
  function edgeSpawn() { const g = MAP.ground, y = R(g.y0, g.y1), [l, r] = ground(y); return { x: Math.abs(l - hero.x) > Math.abs(r - hero.x) ? l + 4 * K : r - 4 * K, y }; }
  function spawnPos() {
    const g = MAP.ground; let best = null;
    for (let i = 0; i < 14; i++) {
      // 11/22 包抄：正在跑的时候 45% 的怪刷在你跑的方向前方（±55°），专治边退边射
      const fl = hero.mvT > .6 && Math.random() < .45, a = fl ? Math.atan2(hero.mvy, hero.mvx) + R(-.95, .95) : R(0, PI * 2), d = R(135, 190) * K, x = hero.x + Math.cos(a) * d, y = hero.y + Math.sin(a) * d / YS;
      if (y < g.y0 || y > g.y1) continue; const [l, r] = ground(y); if (x < l + 6 * K || x > r - 6 * K) continue; return { x, y };
    }
    const y = R(g.y0, g.y1), [l, r] = ground(y); return { x: Math.abs(l - hero.x) > Math.abs(r - hero.x) ? l + 8 * K : r - 8 * K, y };
  }
  function spawn(type, at, tier) {
    const T = DATA.enemies[type], TT = tier ? DATA.tiers[tier] : null, p = at || spawnPos();
    const hp = Math.ceil(T.hp * (T.boss ? 1 : (DATA.stations[G.st - 1] || {}).hp || 1) * (TT ? TT.hp : 1));
    const z = { type, T, tier, x: p.x, y: p.y, hp, maxHp: hp, f: 1, t: R(0, 1), st: 'run', cd: R(.3, 1), flash: 0, kbx: 0, kby: 0, kbT: 0,
      v: T.boss ? 0 : Math.random() * 3 | 0, k: T.boss ? 1 : (TT ? TT.size : R(.94, 1.06)) * (T.k || 1), shieldHp: T.shield || 0, sumT: 3, as: R(.85, 1.15), sp: T.spd * R(.9, 1.1),
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
    if (T.res === 'iron' && dt === 'phys') d *= .5; else if (T.res === 'spirit') d *= dt === 'phys' ? .5 : 1.25; else if (T.res === 'magic' && dt === 'magic') d *= .5;   // 11/22 体质
    if (z.shieldHp > 0 && from && (from.x - z.x) * z.f > 0 && !(z.cc)) { d *= .3; if (--z.shieldHp <= 0) { z.noShield = true; z.st = 'hurt'; z.t = -.25; z.brk = .45; nums.push({ x: z.x, y: z.y - 40 * K, txt: '盾碎了！', t: 0, col: '#ffcf6a' }); } else for (let i = 0; i < 3; i++) parts.push({ x: z.x + z.f * 10 * K, y: z.y - 16 * K, vx: z.f * R(10, 50) * K, vy: R(-50, -10) * K, t: 0, T: .3, col: '#fff2a0', g: 120 * K }); }   // 盾兵正面挡 70%，挡够次数盾碎
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
    z.dead = true; z.deadT = 0; z.st = 'dead'; G.kills++; G.wk++; G.combo = (G.combo || 0) + 1; G.comboT = 3; G.maxCombo = Math.max(G.maxCombo || 0, G.combo);
    { const E = DATA.econ, v = z.tier === 'elite' ? E.elite : z.tier === 'mini' ? E.mini : Math.random() < 1 / E.perKills ? 1 : 0;   // 11/23 铜钱掉在地上，要走过去捡
      if (v && !z.T.boss) G.gc.push({ x: z.x, y: z.y, v, t: 0, h: 0, vh: 90, vx: R(-20, 20) * K }); }
    if (z.tier === 'elite') { G.wElite++; G.gi.push({ kind: 'book', x: z.x, y: z.y, t: 0 }); }   // 固定精英掉书，路线精英掉宝物
    if (z.tier === 'mini') { G.wMini++; G.gi.push({ kind: 'item', x: z.x, y: z.y, t: 0 }); }
    for (let i = 0; i < 7; i++) parts.push({ x: z.x, y: z.y - 10 * K, vx: R(-45, 45) * K, vy: R(-70, -10) * K, t: 0, T: R(.4, .8), col: ['#8fd14a', '#5a8a2a', '#e8e0c8', '#c49a5c'][i % 4], g: 200 * K, sz: i < 3 ? 2 : 1 });
    if (z.T.boss) { G.shake = .5; banner('击败 哥布林王！', 3); G.winT = 2.2; for (const o of foes) if (!o.dead && o !== z) kill(o); return; }
  }
  // 升级不弹框：自动加一点生命和伤害，攒一次「修炼」机会（波间结算的修炼页用）
  // 升到下一级要的经验：(14 + 4 × (等级 − 1)) × 1.3（用户：升级慢一些），最高 Lv12
  const need = () => Math.round((14 + 4 * (G.lv - 1)) * DATA.econ.xpMul);
  function addXp(n) {
    n *= hero.xpMul || 1; G.xp += n; G.wx += n;
    while (G.xp >= need() && !hero.dead && G.lv < DATA.econ.maxLv) { G.xp -= need(); G.lv++; RUN.xiu++; G.lvUpT = 2.2; recompute(); hero.hp = Math.min(hero.maxHp, hero.hp + 5); }
  }
  function damageHero(d, dtype = 'phys') {
    if (hero.inv > 0 || hero.dead || G.over || G.god || G.ending) return;
    d *= dtype === 'magic' ? hero.mIn : hero.pIn; hero.hp -= d; hero.inv = .45; hero.hurtT = .25; G.shake = Math.max(G.shake, .15); nums.push({ x: hero.x, y: hero.y - 44 * K, v: rd(d), t: 0, col: '#ff6a5a' });
    if (hero.hp <= 0 && RUN.save) { RUN.save = false; hero.hp = hero.maxHp; hero.inv = 2; banner('读档！满血复活', 1.6); return; }
    if (hero.hp <= 0) { hero.hp = 0; hero.dead = true; hero.deadT = 0; banner('勇者倒下了……', 99); G.loseT = 1.6; }
  }

  // 杂兵：走到 reach 内抬手，抬手开始时锁定方向；出招时勇者在扇面（arc / r）里才挨打。弓手保持距离，锁方向后放箭（没有预警线）
  function soldierAI(z, dt) {
    const T = z.T; z.t += dt; z.cd -= dt;
    if (z.flee) { const a = ang(hero, z); z.x += Math.cos(a) * z.sp * 1.6 * K * dt; z.y += Math.sin(a) * z.sp * 1.6 * K * dt / YS; z.moving = true; z.f = Math.cos(a) < 0 ? -1 : 1; return; }
    const d = dist(z, hero), dx = hero.x - z.x, dy = hero.y - z.y, dd = Math.hypot(dx, dy) || 1, reach = T.reach * z.reachMul;
    if (T.summon && (z.sumT -= dt) <= 0) { z.sumT = 7; if (foes.filter(q => !q.dead && q.type === T.summon).length < 8) for (let i = 0; i < 2; i++) { const q = spawn(T.summon, { x: z.x + R(-30, 30) * K, y: z.y + R(-14, 14) * K }); clampG(q); fx.push({ k: 'boom', x: q.x, y: q.y, t: 0, T: .35, r: 16, col: 'dark' }); } }   // 死灵法师：每 7 秒召 2 只骷髅
    if (z.st === 'hurt') { if (z.t > .2) { z.st = 'run'; z.t = 0; } return; }
    if (z.st === 'cwind') { if (z.t > .7) { z.st = 'dash'; z.t = 0; z.x0 = z.x; z.y0 = z.y; z.hitD = false; } return; }   // 冲锋：预警 0.7 秒 → 直线冲
    if (z.st === 'dash') { const p = Math.min(1, z.t / .4), L = T.charge; z.x = z.x0 + Math.cos(z.aim) * L * K * p; z.y = z.y0 + Math.sin(z.aim) * L * K * p / YS; clampG(z, 4 * K);
      if (!z.hitD && dist(z, hero) < 20) { z.hitD = true; damageHero(T.dmg * 1.2 * z.dmgMul, T.dtype); } if (Math.random() < .6) parts.push({ x: z.x, y: z.y, vx: R(-20, 20) * K, vy: R(-20, 0) * K, t: 0, T: .35, col: '#d8c08a', g: 0 });
      if (p >= 1) { z.st = 'rec'; z.t = -.3; } return; }
    if (z.st === 'wind') { if (z.t > T.wind + z.windAdd) { z.st = 'strike'; z.t = 0;
        if (T.bomb) { G.shake = Math.max(G.shake, .2); fx.push({ k: 'boom', x: z.x, y: z.y, t: 0, T: .45, r: T.bomb }); if (d < T.bomb) damageHero(T.dmg * z.dmgMul, T.dtype); z.hp = 0; kill(z); return; }   // 炸弹兵：自爆
        if (T.ranged) shots.push({ k: 'arrow', look: T.shot, x: z.x + z.f * 8 * K, y: z.y - 18 * K, gy: z.y, vx: Math.cos(z.aim) * T.arrow * K, vy: Math.sin(z.aim) * T.arrow * K / YS, a: z.aim, t: 0, dmg: T.dmg * z.dmgMul, dtype: T.dtype });
        else { const r = T.r * z.reachMul, da = Math.abs(((ang(z, hero) - z.aim + PI * 3) % (PI * 2)) - PI); if (d < r + 6 && da < T.arc * PI / 360 + .15) damageHero(T.dmg * z.dmgMul, T.dtype); } } return; }
    if (z.st === 'strike') { if (z.t > .22) { z.st = 'rec'; z.t = 0; } return; }
    if (z.st === 'rec') { if (z.t > .25) { z.st = 'run'; z.t = 0; z.cd = T.cool * R(.85, 1.15); } return; }
    z.f = dx < 0 ? -1 : 1;
    if (T.ranged) {
      const [k0, k1] = T.keep;
      if (d < k0) { z.x -= dx / dd * z.sp * (z.haste || 1) * K * dt; z.y -= dy / dd * z.sp * (z.haste || 1) * K * dt / YS; z.moving = true; return; }
      if (d < reach && z.cd <= 0) { z.st = 'wind'; z.t = 0; z.moving = false; z.aim = ang(z, hero); return; }
      z.moving = d > k1; if (z.moving) { z.x += dx / dd * z.sp * (z.haste || 1) * K * dt; z.y += dy / dd * z.sp * (z.haste || 1) * K * dt / YS; } return;
    }
    if (T.charge && z.cd <= 0 && d > reach && d < T.charge * .9) { z.st = 'cwind'; z.t = 0; z.moving = false; z.aim = ang(z, hero); tele.push({ k: 'line', x: z.x, y: z.y, a: z.aim, len: T.charge, w: 22, t: 0, T: .7 }); z.cd = T.cool * 2; return; }
    if (d < reach && z.cd <= 0) { z.st = 'wind'; z.t = 0; z.moving = false; z.aim = ang(z, hero); if (T.bomb) tele.push({ k: 'circle', x: z.x, y: z.y, r: T.bomb, t: 0, T: T.wind }); return; }
    z.moving = d > reach * .7; if (z.moving) { z.x += dx / dd * z.sp * (z.haste || 1) * K * dt; z.y += dy / dd * z.sp * (z.haste || 1) * K * dt / YS; }
  }
  // 11/22 光环：战鼓手 90 格内的怪移速 +40%；萨满每 4 秒给 90 格内的怪回 20% 血（首领、小头目不回）
  function auraTick(dt) {
    const L = foes.filter(z => !z.dead && !z.flee); for (const z of L) z.haste = 1;
    for (const a of L) { if (!a.T.aura || a.cc) continue; a.auraT = (a.auraT || 0) - dt;
      if (a.T.aura === 'drum') for (const z of L) if (z !== a && dist(z, a) < 90) z.haste = 1.4;
      if (a.T.aura === 'heal' && a.auraT <= 0) { a.auraT = 4; fx.push({ k: 'ring', x: a.x, y: a.y, t: 0, T: .5, r: 90, col: '#7af07a' });
        for (const z of L) if (dist(z, a) < 90 && !z.T.boss && z.tier !== 'mini' && z.hp < z.maxHp) { const h = Math.ceil(z.maxHp * .2); z.hp = Math.min(z.maxHp, z.hp + h); nums.push({ x: z.x, y: z.y - 30 * K, txt: '+' + h, t: 0, col: '#7af07a' }); } } }
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
  function skillDmg(S, sk) { const L = profL(sk); return (RUN.hero === 'p' && S.sys === '法杖' ? 1.1 : 1) * S.dmg * (1 + .06 * (hero.A[S.type] || 0)) * hero.m.dmg * (1 + .1 * Math.floor(L / 2)) * (G && G.wi === 0 ? 1 + (hero.fx.firstWave || 0) : 1); }
  // 前摇 / 后摇：敏捷的出手速度一起缩短；瞬光斩、贯星箭第 3 格蓄力变短
  function skillT(S, sk) { const L = profL(sk), sp = hero.m.spd || 1; let wu = S.wu; if (S.charge && L >= 3) wu = S.kind === 'pierce' || sk.id === 'pierce' ? .45 : .5; const cut = L >= 7 ? .05 : 0; return { wu: Math.max(.08, (wu - cut) / sp), rc: Math.max(.08, (S.rc - cut) / sp) }; }
  const nextSlot = () => { for (let k = 0; k < RUN.open; k++) { const i = (RUN.si + k) % RUN.open; if (RUN.slots[i]) return i; } return -1; };
  // 射程（像素格）：近战招跟着范围加成一起变大
  const reach = S => (S.rg || 9999) * (S.rg && S.rg < 100 ? hero.m.area : 1);
  // 轮到的这本够不着就跳过，看下一本；都够不着就不放
  // 11/22 做法 1：够不着照样跳过，但刚放过的那本不能紧接着再放（要么先轮到别的，要么等 0.5 秒），远程招不会被连刷
  const readySlot = () => { const t = nearest(); if (!t) return -1; const d = dist(t, hero), n = RUN.slots.slice(0, RUN.open).filter(Boolean).length;
    for (let k = 0; k < RUN.open; k++) { const i = (RUN.si + k) % RUN.open, sk = RUN.slots[i]; if (!sk || d > reach(DATA.skills[sk.id])) continue;
      if (n > 1 && i === hero.lastI && G.t - (hero.lastT || 0) < .5) return -1; return i; } return -1; };
  const HWPN = { sword: 'sword', spear: 'spear', bow: 'bow', staff: 'staff' };
  // 技能栏 1→2→3 严格轮流（空格子跳过），没有各自冷却：前摇（能走；翻滚 = 这招作废）→ 出手 → 占时型持续 → 后摇（站定；翻滚取消）
  // 11/21：够不着的招跳过（readySlot）；两招之间空 0.18 秒（hero.gap），这段时间正常跑
  function weapon(dt) {
    for (let i = pend.length - 1; i >= 0; i--) { pend[i].t -= dt; if (pend[i].t <= 0) { pend[i].fn(); pend.splice(i, 1); } }
    if (hero.dead) return;
    let c = hero.cs;
    if (!c) { if (hero.gap > 0) { hero.gap -= dt; return; } const i = readySlot(); if (i < 0) return; const sk = RUN.slots[i], S = DATA.skills[sk.id], T = skillT(S, sk); c = hero.cs = { i, sk, S, ph: 'wu', t: 0, dur: T.wu, rc: T.rc, a: aimNow() }; faceTo(c.a); }
    c.t += dt;
    if (c.ph === 'wu') { c.a = aimNow(c.a); if (!hero.moving) faceTo(c.a); if (c.t < c.dur) return; faceTo(c.a);
      const L = profL(c.sk), r = SK.cast({ S: c.S, sk: c.sk, L, d: skillDmg(c.S, c.sk), a: c.a, sid: c.sk.id });
      if (!r) { hero.cs = null; return; }   // 场上没敌人了：不放，等下一个敌人
      c.sk.xp = (c.sk.xp || 0) + 1; if (profL(c.sk) > L) { nums.push({ x: hero.x, y: hero.y - 52 * K, txt: `${c.S.name} 熟练度 ${profL(c.sk)}/7`, t: 0, col: '#ffd86a' }); }
      if (r !== true && r.hold) { c.ph = 'hold'; c.t = 0; c.dur = r.hold; c.move = r.move || 1; return; }
      c.ph = 'rc'; c.t = 0; c.dur = c.rc; return; }
    if (c.ph === 'hold') { if (c.t >= c.dur) { SK.chEnd(); c.ph = 'rc'; c.t = 0; c.dur = c.rc; } return; }
    if (c.ph === 'rc' && c.t >= c.dur) endCast();
  }
  function endCast() { const c = hero.cs; if (!c) return; hero.lastI = c.i; hero.lastT = G.t; if (c.ph === 'hold') SK.chEnd(); RUN.si = (c.i + 1) % RUN.open; hero.cs = null; hero.gap = .18; }
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
  function nextWave() {   // 进下一站（第 1 段）；站打完 → 路线卡
    RUN.dmgW = {};
    if (G.wi >= STN().waves.length - 1) return stationEnd();
    G.wi = -1; Object.assign(G, { wk: 0, wx: 0, wElite: 0, wMini: 0, drops: [], gi: [], gc: [], thief: null, cf: 0, maxCombo: 0, cleared: false, endT: null, timeout: false });
    nextPhase(); banner(G.W.boss ? '首领战！' : `第 ${G.st} 站`, 1.6); G.paused = false;
  }
  // 11/22 一站内换段：不停顿、不结算，只换一批怪并加压（击杀 / 经验 / 掉落一直累计到站末）
  function nextPhase() {
    G.wi++; G.wave++; const W = STN().waves[G.wi], PT = DATA.phaseT[G.st - 1] || [30, 30, 30];
    Object.assign(G, { W, wt: 0, T: W.boss ? 0 : PT[G.wi] || DATA.waveT, waveOn: true, q: [] });
    if (W.boss) { G.bossT = 2.2; G.trickle = 6; banner('首领战！', 2); return; }
    const all = shuffle(Object.entries(DATA.codes).flatMap(([k, c]) => Array(Math.round((W[k] || 0) * DATA.countMul)).fill(c)));
    const T = G.T, nb = 5; for (let i = 0; i < all.length; i++) G.q.push({ at: T * .15 * Math.floor(i * nb / all.length) + R(0, Math.min(2.5, T * .1)), type: all[i] });
    for (const [tier, t] of W.ex || []) G.q.push({ at: T * .3 + R(0, 2), type: t, tier });
    if (G.route === 'elite' && G.wi > 0) G.q.push({ at: T * .35, type: G.eliteType || 'gob_blade', tier: 'elite', routeElite: true });
    G.q.sort((a, b) => a.at - b.at);
    if (G.wi > 0) banner(W.ex && W.ex.length ? '强敌来袭！' : '增援！', 1.2);
  }
  // 第 1 站第 3 段（小头目）开打前：公主露米娜在战场上现身，身前放 3 个光球（书 / 修炼 / 铜钱），走过去碰到哪个拿哪个。不暂停；
  // 这 5 秒不刷新怪，捡完或时间到小头目入场（没捡默认给书）。11/22 用户定 A 方案
  const PRI = [['pbook', '技能书', '#8ad0ff', 'bk_wand'], ['xiu', '修炼', '#b98aff', 'xp'], ['pcoin', '40 铜钱', '#ffd860', 'coin']].map(([k, n, c, ic]) => { const im = new Image(); im.src = 'art/ui2/' + ic + '.png'; return { k, n, c, im }; });
  function princess() {
    RUN.metP = true; const a = hero.f || 1, px = hero.x + 70 * K * a, py = hero.y - 10 * K;
    for (const z of foes) if (!z.dead && !z.T.boss) { z.flee = true; z.fleeT = 0; } G.q = []; warns.length = 0; if (G.thief) { G.thief.st = 'run'; G.thief.n = 9; }   // 11/23 公主施法：场上所有小怪都被吓跑，小咕噜也溜   // 公主施法一道光：附近的怪被吓跑淡出
        G.pr = { t: 0, T: 5.5, x: px, y: py, orbs: PRI.map((o, i) => Object.assign({ x: px + (i - 1) * 46 * K, y: py + 38 * K }, o)), done: null };
    for (let k = 0; k < 30; k++) { const an = R(0, PI * 2); parts.push({ x: px, y: py - 20 * K, vx: Math.cos(an) * R(20, 70) * K, vy: Math.sin(an) * R(20, 70) * K - 30 * K, t: 0, T: R(.5, 1), col: ['#e6d4ff', '#b98aff', '#fff'][k % 3], g: 0 }); }
  }
  function princessTick(dt) {
    const p = G.pr; p.t += dt;
    if (!p.done) {
      for (const o of p.orbs) { if (p.t > .8 && Math.hypot(o.x - hero.x, (o.y - hero.y) * YS) < 20 * K) o.st = (o.st || 0) + dt; else o.st = 0; }
      const hit = p.orbs.find(o => o.st > .7);
      if (hit || p.t >= p.T) { const o = hit || p.orbs[0]; p.done = o; p.t2 = 0; toastMsg(doEvent(o.k)); for (let k = 0; k < 20; k++) { const an = R(0, PI * 2); parts.push({ x: o.x, y: o.y, vx: Math.cos(an) * 60 * K, vy: Math.sin(an) * 60 * K, t: 0, T: .6, col: o.c, g: 0 }); } }
    } else if ((p.t2 += dt) > 1.2) { G.pr = null; nextPhase(); }
  }
  function princessDraw() {
    const p = G.pr; if (!p) return; const fade = p.done ? Math.max(0, 1 - p.t2 / 1.2) : Math.min(1, p.t / .6);
    ctx.save(); ctx.globalAlpha = fade;
    const gl = ctx.createRadialGradient(X(p.x), Y(p.y) - 20 * u, 0, X(p.x), Y(p.y) - 20 * u, 40 * u); gl.addColorStop(0, 'rgba(220,190,255,.55)'); gl.addColorStop(1, 'rgba(220,190,255,0)'); ctx.fillStyle = gl; ctx.fillRect(X(p.x) - 40 * u, Y(p.y) - 60 * u, 80 * u, 80 * u);
    shadow(p.x, p.y, 26); SPR.drawHero(ctx, p.t < 1.1 ? 'big' : 'idle', Math.floor(G.t * 3) % 2, X(p.x), Y(p.y), p.x > hero.x, u, { w: 'staff', c: 'p' });
    if (p.t < 1.1) { const k = p.t / 1.1, r = (10 + 70 * k) * u; ctx.strokeStyle = `rgba(230,210,255,${.8 * (1 - k)})`; ctx.lineWidth = 3 * u * (1 - k) + u; ctx.beginPath(); ctx.ellipse(X(p.x), Y(p.y), r, r / YS, 0, 0, 7); ctx.stroke(); }
    if (!p.done && p.t < 3.2) {   // 对话气泡
      const tx = '勇者，收下这个！', fs = Math.round(7 * u); ctx.font = `${fs}px WenKai, Pix, serif`; const w = ctx.measureText(tx).width + 8 * u, bx = X(p.x) - w / 2, by = Y(p.y) - 64 * u;
      ctx.fillStyle = 'rgba(250,244,230,.95)'; ctx.fillRect(bx, by, w, fs + 6 * u); ctx.fillStyle = '#3a2814'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(tx, X(p.x), by + 3 * u);
    }
    for (const o of p.orbs) { if (p.done && p.done !== o) continue; const ox = X(o.x), oy = Y(o.y) - 13 * u, r = 13 * u; ctx.fillStyle = 'rgba(30,15,5,.4)'; ctx.beginPath(); ctx.ellipse(ox, Y(o.y) + 2 * u, 12 * u, 3.5 * u, 0, 0, 7); ctx.fill();
      const g2 = ctx.createRadialGradient(ox, oy, 0, ox, oy, r * 1.8); g2.addColorStop(0, o.c + 'cc'); g2.addColorStop(1, o.c + '00'); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(ox, oy, r * 1.8, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(20,14,30,.75)'; ctx.beginPath(); ctx.arc(ox, oy, r, 0, 7); ctx.fill(); ctx.strokeStyle = o.c; ctx.lineWidth = u; ctx.stroke();
      if (o.im.complete && o.im.naturalWidth) { const sz = r * 1.4; ctx.drawImage(o.im, ox - sz / 2, oy - sz / 2, sz, sz); }
      if (!p.done) { ctx.font = `${Math.round(6 * u)}px WenKai, Pix, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineWidth = 2 * u; ctx.strokeStyle = '#1a1008'; ctx.strokeText(o.n, ox, oy + r + 2 * u); ctx.fillStyle = '#fff3d0'; ctx.fillText(o.n, ox, oy + r + 2 * u); } }
    if (!p.done) { const left = Math.ceil(p.T - p.t); ctx.font = `${Math.round(6 * u)}px WenKai, Pix, serif`; ctx.fillStyle = '#e6d4ff'; ctx.textAlign = 'center'; ctx.fillText(`走过去拿一个（${left}）`, X(p.x), Y(p.y) + 64 * u); }
    ctx.restore();
  }

  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function spawner(dt) {
    if (G.winT != null || !G.waveOn) return;
    if (G.pr) return princessTick(dt);   // 公主现身期间：不刷怪、不计时
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
      const o = G.q[0]; if (alive.length + warns.length >= DATA.caps.normal || (DATA.enemies[o.type].ranged && arch >= DATA.caps.archer)) break;   // 场上太多就等等
      G.q.shift(); warnSpawn(o);
    }
    if (!G.q.length && alive.length + warns.length < 6 && G.wt < G.T - 3) for (let i = 0; i < 3; i++) warnSpawn({ type: Math.random() < .7 ? 'goblin' : 'gob_blade' });   // 出完了：零星补怪
    if (G.wt >= G.T && G.wi < STN().waves.length - 1) { if (G.st === 1 && G.wi === 1 && !RUN.metP) princess(); else nextPhase(); return; }   // 11/22 段落到点：不结算，直接下一段
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
    const cw = Math.round((E.waveCoin[0] + E.waveCoin[1] * (G.st - 1) + (cl ? E.clear : 0) + (fx.waveCoin || 0)) * (1 + (fx.coinMul || 0)) * (G.route === 'elite' ? 1.5 : 1) * (RUN.coinBoost ? 1.5 : 1));
    { const left = G.gc.reduce((a, c) => a + c.v, 0) + (G.thief ? G.thief.bag : 0), st = Math.round(left * .2);   // 站末：地上没捡的铜钱帮你收回，咕噜顺走 20%
      if (left) { RUN.coins += Math.round((left - st) * cMul()); UI.feed(st ? `地上还剩 ${left} 铜钱，帮你捡了回来……被小咕噜顺走了 ${st}` : `地上的 ${left} 铜钱帮你捡了回来`); } G.gc = []; G.thief = null; for (const o of G.gi) G.drops.push({ kind: o.kind }); G.gi = [];
      const cb = Math.floor((G.maxCombo || 0) / 10) * 2; if (cb) { RUN.coins += cb; UI.feed(`最高连击 ${G.maxCombo}，奖励 ${cb} 铜钱`); } G.maxCombo = 0; }
    RUN.coins += cw; if (RUN.coinBoost && G.wi === STN().waves.length - 1) RUN.coinBoost = 0;
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
    fieldEnd(loot, cw);   // 11/22 站末留在战场：捡掉落、找公主修炼、找地精商人、走进门
  }
  // ---------- 11/22 站末在战场上结算（哈迪斯式）：掉落在地上走过去捡；公主在中间，靠近她跳 3 个修炼光球 + 1 颗刷新水晶；地精商人；三扇门 ----------
  const IMG = {}; const img = n => IMG[n] || (IMG[n] = Object.assign(new Image(), { src: 'art/ui2/' + n + '.png' }));
  function fieldEnd(loot) {
    G.paused = false; G.waveOn = false; const g = MAP.ground, cy = (g.y0 + g.y1) / 2 - 10 * K, [gl, gr] = ground(cy), cx = (gl + gr) / 2, ly = cy + 88 * K, n = loot.length;   // 11/23 位置按地图固定
    G.fe = { t: 0, items: loot.map((o, i) => Object.assign({ x: cx + (i - (n - 1) / 2) * 30 * K, y: ly, st: 0 }, o)),
      pr: { x: cx, y: cy, near: 0, orbs: null, cr: null, said: 0, arm: dist(hero, { x: cx, y: cy }) > 40 }, mer: { x: gl + 40 * K, y: cy + 10 * K, st: 0 }, doors: [], warn: 0 };
    if (G.st === 1) G.fe.sign = { x: cx + ((n - 1) / 2 + 1.6) * 30 * K, y: ly + 6 * K };
    stationEnd();
  }
  function setDoors(cards, pick) { const f = G.fe, n = cards.length, cx = f.pr.x, y = MAP.ground.y0 + 6 * K; f.doors = cards.map((c, i) => ({ c, x: cx + (i - (n - 1) / 2) * 70 * K, y, st: 0 })); f.pick = pick; }
  const SKUL = (o, r) => Math.hypot(o.x - hero.x, (o.y - hero.y) * YS) < r * K;
  function xiuOrbs() { const P = G.fe.pr, L = CAMP.rollXiu(3 + (hero.fx.xiuOpt || 0)); P.orbs = L.map((o, i) => Object.assign({ x: P.x + (i - (L.length - 1) / 2) * 40 * K, y: P.y + 40 * K, st: 0 }, o)); P.cr = P.cr || { x: P.x + (L.length / 2 + .6) * 40 * K, y: P.y + 40 * K, st: 0, n: 0 }; }
  // 11/22 不打仗的门：宝箱 / 篝火 / 特价商人在原地演出（奇遇还是弹卡片）
  function fieldRest(k) {
    const f = G.fe, x = f.pr.x + 130 * K, y = f.pr.y + 30 * K; f.doors = [];
    if (k === 'shop') { RUN.shop = null; RUN.rr = 0; f.mer2 = { x, y, st: 0 }; return showRoute(true); }
    f.rest = { k, x, y, st: 0, t: 0 };
    if (k === 'chest') toastMsg('路边有个宝箱，走过去打开');
  }
  function restTick(dt) {
    const f = G.fe, o = f.rest; o.t += dt;
    if (o.k === 'chest' && !o.open) { if (SKUL(o, 18)) o.st += dt; else o.st = 0; if (o.st > .3) { o.open = 1; const L = []; for (let i = 0; i < 3; i++) { const id = randBook(); if (id && !L.includes(id)) L.push(id); }
        if (!L.length) { RUN.coins += 30; toastMsg('箱子里只有 30 铜钱'); f.rest = null; return showRoute(true); }
        o.books = L.map((id, i) => ({ kind: 'book', id, x: o.x + (i - (L.length - 1) / 2) * 36 * K, y: o.y + 34 * K, st: 0 })); toastMsg('三本书选一本'); } return; }
    if (o.k === 'chest') { for (const b of o.books) { if (SKUL(b, 14)) b.st += dt; else b.st = 0; if (b.st > .3) { CAMP.learn(b, true); gotFeed(b); f.rest = null; return showRoute(true); } } return; }
    if (o.k === 'fire') { if (SKUL(o, 22)) o.st += dt; else o.st = 0; if (o.st > 1) { const h0 = hero.hp; hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * .5); nums.push({ x: hero.x, y: hero.y - 44 * K, v: Math.round(hero.hp - h0), t: 0, col: '#7cff8a' }); RUN.xiu++; f.pr.said = 0; toastMsg('回复 50% 生命，修炼 +1（去找露米娜）'); f.rest = null; showRoute(true); } }
  }
  function restDraw(label, ring) {
    const f = G.fe;
    const M2 = f.mer2; if (M2) { SPR.draw(ctx, 'goblin', 'idle0', 0, X(M2.x), Y(M2.y), M2.x > hero.x, u, {}); label('特价商人 · 八折', X(M2.x), Y(M2.y) + 3 * u, '#ffb070'); say(X(M2.x), Y(M2.y) - 44 * u, ['今天全部八折！', '错过就没了哦～'], 1.2); ring(M2, 14, M2.st / .4, '#ffb070'); }
    const o = f.rest; if (!o) return; const x = X(o.x), y = Y(o.y);
    if (o.k === 'chest') { const im = img('chest'); if (!o.open && im.complete) ctx.drawImage(im, x - 14 * u, y - 24 * u, 28 * u, 28 * u); if (!o.open) { label('宝箱', x, y + 5 * u); ring(o, 14, o.st / .3, '#ffe08a'); }
      if (o.books) for (const b of o.books) { const S = DATA.skills[b.id], bi = img(({ '剑': 'bk_sword', '枪': 'bk_spear', '弓': 'bk_bow', '法杖': 'bk_wand' })[S.sys]), bx = X(b.x), by = Y(b.y) - 9 * u;
        ctx.fillStyle = 'rgba(255,220,120,.3)'; ctx.beginPath(); ctx.arc(bx, by, 13 * u, 0, 7); ctx.fill(); if (bi.complete) ctx.drawImage(bi, bx - 10 * u, by - 10 * u, 20 * u, 20 * u); label(S.name, bx, by + 12 * u, ['#e6e2d6', '#e6e2d6', '#6ab8ff', '#c890ff', '#ffd84a'][S.tier]); ring(b, 15, b.st / .3, '#fff'); } }
    if (o.k === 'fire') { for (let k = 0; k < 3; k++) { const fl = 1 + .25 * Math.sin(G.t * 12 + k * 2); ctx.fillStyle = ['#ff6a20', '#ffb040', '#fff0a0'][k]; ctx.beginPath(); ctx.ellipse(x, y - (8 + k * 3) * u, (9 - k * 3) * u * fl, (12 - k * 3) * u * fl, 0, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#5a3418'; ctx.fillRect(x - 12 * u, y - 2 * u, 24 * u, 4 * u); if (Math.random() < .3) parts.push({ x: o.x + R(-6, 6) * K, y: o.y - 14 * K, vx: R(-8, 8) * K, vy: -40 * K, t: 0, T: .7, col: '#ffb040', g: 0 });
      const gl = ctx.createRadialGradient(x, y - 10 * u, 0, x, y - 10 * u, 50 * u); gl.addColorStop(0, 'rgba(255,150,60,.35)'); gl.addColorStop(1, 'rgba(255,150,60,0)'); ctx.fillStyle = gl; ctx.fillRect(x - 50 * u, y - 60 * u, 100 * u, 100 * u);
      label('篝火 · 站一会儿', x, y + 5 * u, '#ffd0a0'); say(x, y - 34 * u, ['坐下歇歇吧……', '想当年，我膝盖中了一箭……'], 3.3); ring(o, 18, o.st, '#7cff8a'); }
  }
  function fieldTick(dt) {
    const f = G.fe; if (!f || G.paused || G.lock) return; f.t += dt;
    if (f.rest) restTick(dt);
    const M2 = f.mer2; if (M2) { if (M2.st < 0) { if (!SKUL(M2, 30)) M2.st = 0; } else if (SKUL(M2, 24)) M2.st += dt; else M2.st = 0; if (M2.st > .4) { M2.st = -99; G.lock = true; CAMP.open({ st: G.st, wi: 0, kills: 0, coins: 0, xp: 0, lv: G.lv, dmg: {}, loot: [], title: '特价商人 · 全部八折', tab: 'shang', only: 'shang', field: 1, disc: .8, goText: '离开 ▶', after: () => { G.lock = false; M2.st = -1; } }); return; } if (M2.st < 0 && !SKUL(M2, 24)) M2.st = 0; }
    for (let i = f.items.length - 1; i >= 0; i--) { const o = f.items[i]; if (f.t > .6 && SKUL(o, 16)) o.st += dt; else o.st = 0; if (o.st > .6) { o.st = 0; if (CAMP.learn(o, true)) { gotFeed(o); f.items.splice(i, 1); for (let k = 0; k < 10; k++) { const a = R(0, PI * 2); parts.push({ x: o.x, y: o.y, vx: Math.cos(a) * 50 * K, vy: Math.sin(a) * 50 * K, t: 0, T: .4, col: '#ffe08a', g: 0 }); } } else { o.x += (o.x - hero.x) * .5; o.y += (o.y - hero.y) * .5; } } }
    const P = f.pr;
    if (!P.arm && !SKUL(P, 40)) P.arm = true;
    if (!P.orbs && P.arm && SKUL(P, 26)) { if (RUN.xiu > 0) { xiuOrbs(); P.said = 1; P.ot = f.t; } else P.said = 2; }
    if (P.orbs && f.t - (P.ot || 0) > 1) {   // 光球出现 1 秒内碰到不算；站上去转满一圈（0.8 秒）才拿
      for (const o of P.orbs) { if (SKUL(o, 15)) o.st += dt; else o.st = 0;
        if (o.st > .8) { for (const [a, v] of o.adds) RUN.train[a] = (RUN.train[a] || 0) + v; RUN.xiu--; recompute(); toastMsg(`修炼：${o.adds.map(([a, v]) => DATA.attrs.find(x => x.id === a).name + ' +' + v).join('、')}`);
          for (let k = 0; k < 16; k++) { const an = R(0, PI * 2); parts.push({ x: o.x, y: o.y, vx: Math.cos(an) * 60 * K, vy: Math.sin(an) * 60 * K, t: 0, T: .5, col: DATA.rarity[o.q].col, g: 0 }); }
          if (RUN.xiu > 0) { P.cr.n = 0; xiuOrbs(); } else { P.orbs = null; P.cr = null; P.said = 3; } return; } }
      const c = P.cr; if (c) { if (SKUL(c, 14)) c.st += dt; else c.st = 0;
        if (c.st > .5) { c.st = 0; const free = 2 + (hero.fx.xiuReroll || 0), cost = c.n < free ? 0 : 5 * (c.n - free + 1); if (cost && RUN.coins < cost) { toastMsg('铜钱不够'); c.st = -1; } else { RUN.coins -= cost; c.n++; const keep = c; xiuOrbs(); P.cr = keep; } } }
    }
    const M = f.mer; if (M.st < 0) { if (!SKUL(M, 30)) M.st = 0; } else if (SKUL(M, 24)) M.st += dt; else M.st = 0;   // 离开商店后要先走开才能再进
    if (M.st > .4) { M.st = -99; G.lock = true; CAMP.open({ st: G.st, wi: 0, kills: 0, coins: 0, xp: 0, lv: G.lv, dmg: {}, loot: [], title: '地精商人', tab: 'shang', only: 'shang', field: 1, goText: '离开 ▶', after: () => { G.lock = false; M.st = -1; } }); return; }
    if (M.st < 0 && !SKUL(M, 24)) M.st = 0;
    for (const d of f.doors) { if (Math.abs(d.x - hero.x) < 22 * K && Math.abs(d.y - hero.y) < 18 * K) d.st += dt; else d.st = 0;
      if (d.st > .35) { if ((RUN.xiu > 0 || f.items.length) && !f.warn) { f.warn = 1; d.st = -1; toastMsg(RUN.xiu > 0 ? '还有修炼没拿（去找露米娜），再走进门就出发' : '地上还有东西没捡，再走进门就出发'); return; }
        if (d.st > .35) { f.doors = []; f.pick(d.c); return; } } }
  }
  // 头顶对话气泡：每 5 秒说一句（打字机效果，停 3 秒），几句轮流
  function say(x, y, lines, seed) { const t = G.t + (seed || 0), cyc = 5, k = t % cyc; if (k > 3.2) return; const L = lines[Math.floor(t / cyc) % lines.length], n = Math.min(L.length, Math.floor(k * 14) + 1), tx = L.slice(0, n);
    const fs = Math.round(6.5 * u); ctx.font = `${fs}px WenKai, Pix, serif`; const w = ctx.measureText(L).width + 10 * u, bx = x - w / 2, by = y - fs - 8 * u;
    ctx.fillStyle = 'rgba(250,244,230,.96)'; ctx.fillRect(bx, by, w, fs + 6 * u); ctx.fillRect(x - 2 * u, by + fs + 6 * u, 4 * u, 3 * u); ctx.strokeStyle = '#3a2814'; ctx.lineWidth = u; ctx.strokeRect(bx, by, w, fs + 6 * u);
    ctx.fillStyle = '#3a2814'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(tx, bx + 5 * u, by + 3 * u); ctx.textAlign = 'center'; }
  function fieldDraw() {
    const f = G.fe; if (!f) return; ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const label = (t, x, y, col, sz) => { ctx.font = `${Math.round((sz || 6) * u)}px WenKai, Pix, serif`; ctx.lineWidth = 2 * u; ctx.strokeStyle = '#1a1008'; ctx.strokeText(t, x, y); ctx.fillStyle = col || '#fff3d0'; ctx.fillText(t, x, y); };
    const ring = (o, r, p, col) => { if (p <= 0) return; ctx.strokeStyle = col; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.arc(X(o.x), Y(o.y), r * u, -PI / 2, -PI / 2 + PI * 2 * Math.min(1, p)); ctx.stroke(); };
    for (const d of f.doors) { const x = X(d.x), y = Y(d.y), w = 46 * u, h = 58 * u, c = d.c, el = c.k === 'elite', rs = c.rest;
      const gl = ctx.createRadialGradient(x, y - h / 2, 0, x, y - h / 2, w); gl.addColorStop(0, rs ? 'rgba(120,220,160,.45)' : el ? 'rgba(255,140,60,.45)' : c.k === 'boss' ? 'rgba(255,60,60,.5)' : 'rgba(140,180,255,.4)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gl; ctx.fillRect(x - w, y - h * 1.3, w * 2, h * 1.5);
      ctx.fillStyle = '#1a1210'; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h + w / 2); ctx.arc(x, y - h + w / 2, w / 2, PI, 0); ctx.lineTo(x + w / 2, y); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 2 * u; ctx.stroke();
      if (c.av) { const fr = SPR.frame(c.av, 'idle0') || SPR.frame(c.av, 'walk0'); if (fr) SPR.draw(ctx, c.av, SPR.frame(c.av, 'idle0') ? 'idle0' : 'walk0', 0, x, y - 8 * u, false, u * .8, {}); }
      else { const im = img(c.icon); if (im.complete && im.naturalWidth) ctx.drawImage(im, x - 15 * u, y - 40 * u, 30 * u, 30 * u); }
      label(c.name, x, y - h - 10 * u, el ? '#ffb070' : rs ? '#9ef0b0' : '#fff3d0'); if (c.sub) label(c.sub, x, y + 2 * u, '#c8b890', 5); ring({ x: d.x, y: d.y }, 10, d.st / .35, '#ffe08a'); }
    for (const o of f.items) { const im = img(o.kind === 'book' ? ({ '剑': 'bk_sword', '枪': 'bk_spear', '弓': 'bk_bow', '法杖': 'bk_wand' })[DATA.skills[o.id].sys] : o.kind === 'item' ? o.id : o.id), x = X(o.x), y = Y(o.y) - 9 * u - rd((0 * Math.sin(G.t * 3 + o.x) * 2) * u);
      ctx.fillStyle = 'rgba(30,15,5,.4)'; ctx.beginPath(); ctx.ellipse(x, Y(o.y) + u, 9 * u, 3 * u, 0, 0, 7); ctx.fill(); if (im.complete && im.naturalWidth) ctx.drawImage(im, x - 9 * u, y - 9 * u, 18 * u, 18 * u); ring(o, 13, o.st / .6, '#ffe08a'); }
    const P = f.pr, px = X(P.x), py = Y(P.y);
    ctx.save(); ctx.globalAlpha = .5 + .15 * Math.sin(G.t * 2); ctx.strokeStyle = '#c8a8ff'; ctx.lineWidth = 2 * u; ctx.setLineDash([4 * u, 4 * u]); ctx.beginPath(); ctx.ellipse(px, py + 30 * u, 62 * u, 62 * u / YS * .9, 0, 0, 7); ctx.stroke(); ctx.fillStyle = 'rgba(200,170,255,.07)'; ctx.fill(); ctx.restore();
    const gl = ctx.createRadialGradient(px, py - 20 * u, 0, px, py - 20 * u, 40 * u); gl.addColorStop(0, 'rgba(220,190,255,.5)'); gl.addColorStop(1, 'rgba(220,190,255,0)'); ctx.fillStyle = gl; ctx.fillRect(px - 40 * u, py - 60 * u, 80 * u, 80 * u);
    if (!P.orbs) { label(RUN.xiu > 0 ? `露米娜 · 修炼 ×${RUN.xiu}` : '露米娜', px, py + 4 * u, '#e6d4ff'); say(px, py - 44 * u, RUN.xiu > 0 ? ['辛苦了，勇者。', '过来，我帮你修炼。'] : ['再坚持一下，勇者。', '前面会更危险……'], 0); }
    if (P.orbs) { for (const o of P.orbs) { const Q = DATA.rarity[o.q], x = X(o.x), y = Y(o.y) - 12 * u, r = 12 * u; ctx.fillStyle = 'rgba(30,15,5,.4)'; ctx.beginPath(); ctx.ellipse(x, Y(o.y) + 2 * u, 11 * u, 3.5 * u, 0, 0, 7); ctx.fill();
        const g2 = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8); g2.addColorStop(0, Q.col + 'aa'); g2.addColorStop(1, Q.col + '00'); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(20,14,30,.8)'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.strokeStyle = Q.col; ctx.lineWidth = u; ctx.stroke();
        const im = img(o.adds[0][0] === 'end' ? 'amulet' : o.adds[0][0]); if (im.complete && im.naturalWidth) ctx.drawImage(im, x - 8 * u, y - 8 * u, 16 * u, 16 * u);
        o.adds.forEach(([a, v], k) => label(`+${v} ${DATA.attrs.find(t => t.id === a).name}`, x, y + r + 2 * u + k * 7 * u, Q.col)); ring(o, 14, o.st / .8, '#fff'); }
      const c = P.cr; if (c) { const x = X(c.x), y = Y(c.y), free = 2 + (hero.fx.xiuReroll || 0), cost = c.n < free ? 0 : 5 * (c.n - free + 1);
        ctx.fillStyle = '#b07bff'; ctx.beginPath(); ctx.moveTo(x, y - 12 * u); ctx.lineTo(x + 7 * u, y - 2 * u); ctx.lineTo(x, y + 6 * u); ctx.lineTo(x - 7 * u, y - 2 * u); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#efe0ff'; ctx.lineWidth = u; ctx.stroke();
        label(cost ? `刷新 ${cost} 铜钱` : `刷新（${free - c.n}）`, x, y + 8 * u, '#e6d4ff', 5); ring(c, 12, c.st / .5, '#e6d4ff'); if (G.st === 1 && !c.n) label('站上来刷新修炼', x, y - 24 * u, '#c8b890', 5); } }
    const M = f.mer; label('地精商人', X(M.x), Y(M.y) + 3 * u, '#ffd860'); say(X(M.x), Y(M.y) - 44 * u, ['嘿嘿，要买点什么？', '好货不等人！', '铜钱带够了吗？'], 2.1); ring(M, 14, M.st / .4, '#ffd860');
    restDraw(label, ring);
    if (f.sign) { const S = f.sign, near = dist(S, hero) < 40, hop = near ? Math.abs(Math.sin(G.t * 8)) * 4 : 0, x = X(S.x), y = Y(S.y) - hop * u, on = Math.floor(G.t * 2.5) % 2;   // 11/23 地上的像素 P 键帽
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x - 11 * u, Y(S.y) + u, 22 * u, 3 * u); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x - 11 * u, y - 18 * u, 22 * u, 20 * u); ctx.fillStyle = on || near ? '#f4e8c8' : '#cfc0a0'; ctx.fillRect(x - 10 * u, y - 17 * u, 20 * u, 15 * u); ctx.fillStyle = '#9a8a6a'; ctx.fillRect(x - 10 * u, y - 2 * u, 20 * u, 3 * u);
      ctx.fillStyle = '#3a2a1a'; ctx.font = `${Math.round(11 * u)}px Pix, monospace`; ctx.fillText('P', x, y - 16 * u); if (on || near) { ctx.strokeStyle = 'rgba(255,230,140,.8)'; ctx.lineWidth = u; ctx.strokeRect(x - 12 * u, y - 19 * u, 24 * u, 22 * u); }
      label(UI.pKey ? UI.pKey() : '按下 P 整理', x, y + 5 * u, '#ffe8a0', 6.5); }
    ctx.restore();
  }
  // 一站打完：免费开格（第 4 站后开第 4 格，第 8 站后开第 5 格），再出 3 张路线卡三选一
  function stationEnd() {
    // 11/22 技能格不再免费开，全部在背包页 / 商店花铜钱买
    if (!G.fe) G.paused = true; showRoute();
  }
  // 11/22 站点卡：战斗 / 精英 / 宝箱 · 篝火 · 行商 · 奇遇（不打仗的卡每章最多 restMax 次，选了不推进站数，做完回来再选）
  const EN = id => DATA.enemies[id].name.replace('哥布林', '') || '哥布林';
  function stationInfo(n) {   // 第 n 站第一次出现的怪
    const seen = new Set(), add = (S, set) => { for (const W of S.waves) for (const c in DATA.codes) if (W[c]) set.add(DATA.codes[c]); };
    for (let i = 0; i < n - 1; i++) add(DATA.stations[i], seen);
    const now = new Set(); add(DATA.stations[n - 1], now); return { fresh: [...now].filter(t => !seen.has(t)), all: [...now] };
  }
  // 11/22 路线（月圆之夜式牌库）：每站打完抽 3 张；选了不打仗的卡（宝箱 / 篝火 / 特价商店 / 奇遇）当场结算，不占站数，然后再抽 3 张只有战斗的卡
  function showRoute(combatOnly) {
    const n = G.st + 1, go = route => { G.st++; G.wi = -1; G.route = route; nextWave(); };
    if (n >= DATA.stations.length) { const bc = [{ k: 'boss', av: 'gob_king', name: '哥布林王', sub: '首领', desc: '森林的尽头是哥布林王座。', btn: '挑战' }]; if (G.fe) return setDoors(bc, () => { G.fe = null; go('boss'); }); return UI.route({ st: n, cards: bc }, () => go('boss')); }
    const S = DATA.stations[n - 1], info = stationInfo(n), main = info.fresh[0] || info.all[info.all.length - 1];
    const fight = { k: 'fight', av: main, name: S.name, sub: `第 ${n} 站 · Lv${n}`, desc: info.fresh.length ? '会出现：' + info.fresh.map(EN).join('、') : '这一段的老对手。', btn: '前往' };
    const pool = shuffle(info.all.filter(t => !DATA.enemies[t].ranged)), mk = et => ({ k: 'elite', av: et, et, name: '精英 · ' + DATA.enemies[et].name, sub: `第 ${n} 站 · Lv${n}`, desc: '后两段各多一只精英。铜钱 +50%，精英必掉技能书。', btn: '挑战' });
    const e1 = mk(pool[0] || 'gob_blade'), e2 = mk(pool[1] || pool[0] || 'gob_blade');
    let cards;
    if (combatOnly) cards = [fight, e1, e2];
    else { const rs = shuffle(DATA.rests.slice()).map(R0 => Object.assign({ rest: true, sub: '不占站数' }, R0)); cards = shuffle([fight, Math.random() < .5 ? e1 : rs[1], rs[0]]); }
    const pick = c => { if (!c.rest) { G.fe = null; G.eliteType = c.et; return go(c.k); } if (G.fe && c.k !== 'event') return fieldRest(c.k); G.paused = true; doRest(c.k); };
    if (G.fe) return setDoors(cards, pick);
    UI.route({ st: n, cards }, pick);
  }
  function ownBooks() { return new Set([...RUN.slots, ...RUN.bag].filter(x => x && (x.kind === 'book' || !x.kind)).map(x => x.id)); }
  function randBook(minTier) { const all = DATA.bookPool(ownBooks(), Math.max(G.st, minTier >= 3 ? 4 : 1), minTier >= 3); const f = all.filter(id => DATA.skills[id].tier >= (minTier || 1)); const L = f.length ? f : all; return L[Math.random() * L.length | 0]; }
  function doRest(k) {
    const back = () => { G.paused = false; showRoute(true); }, base = { st: G.st, wi: 0, kills: 0, coins: 0, xp: 0, lv: G.lv, dmg: {}, loot: [], after: back, goText: '回到路线 ▶' };
    if (k === 'chest') { const L = []; for (let i = 0; i < 3; i++) { const id = randBook(); if (id && !L.some(o => o.id === id)) L.push({ kind: 'book', id }); } return CAMP.open(Object.assign(base, { title: '宝箱 · 三本书选一本', tab: 'shi', loot: L, pickOne: true })); }
    if (k === 'fire') { hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * .5); RUN.xiu++; RUN.xopt = null; RUN.xrr = 0; return CAMP.open(Object.assign(base, { title: '篝火 · 回复 50% 生命，修炼一次', tab: 'xiu' })); }
    if (k === 'shop') { RUN.shop = null; RUN.rr = 0; return CAMP.open(Object.assign(base, { title: '地精特价商店 · 全部八折', tab: 'shang', disc: .8 })); }
    const used = RUN.evUsed || (RUN.evUsed = []), L = DATA.events.filter(e => !used.includes(e.id)), E = (L.length ? L : DATA.events)[Math.random() * (L.length || DATA.events.length) | 0]; used.push(E.id);
    UI.event(E, i => doEvent(E.opts[i][2]), back);
  }
  function doEvent(fx) {   // 返回结果文字
    const r = Math.random(), A = DATA.attrs.map(a => a.id), heal = p => { hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * p); };
    const train = (a, v) => { RUN.train[a] = (RUN.train[a] || 0) + v; recompute(); }, give = o => { CAMP.learn(o, true); gotFeed(o); };
    switch (fx) {
      case 'con2': train('con', 2); heal(0); return '体魄 +2，生命上限提高了。';
      case 'end2': train('end', 2); return '耐力 +2。旧盾还挺结实。';
      case 'book2': { const id = randBook(2); if (id) { give({ kind: 'book', id }); return '得到一本技能书。'; } RUN.coins += 30; return '没有新书了，换成 30 铜钱。'; }
      case 'prof': { const L = RUN.slots.filter(Boolean); if (!L.length) return '技能栏是空的……'; const sk = L[Math.random() * L.length | 0], lv = profL(sk); if (lv >= 7) return `「${DATA.skills[sk.id].name}」已经练满了。`; sk.xp = DATA.prof[lv]; return `「${DATA.skills[sk.id].name}」熟练度 +1 格。`; }
      case 'rift': if (r < .5) { const id = randBook(3); if (id) { give({ kind: 'book', id }); return '摸出一本技能书！'; } } hero.hp = Math.max(1, hero.hp - hero.maxHp * .2); return '被乱码咬了一口，掉了 20% 生命。';
      case 'gamble': if (RUN.coins < 20) return '铜钱不够，咕噜把杯子收了回去。'; RUN.coins -= 20; if (r < .5) { const it = ITEMS()[Math.random() * ITEMS().length | 0]; give({ kind: 'item', id: it.id }); return '猜中了！得到一件宝物。'; } return '没猜中。咕噜笑得很开心。';
      case 'kid': RUN.coinBoost = 1; return '小哥布林跑了。下一站铜钱 +50%。';
      case 'save': RUN.save = true; return '已存档。第一次倒下时会满血复活。';
      case 'full': heal(1); return '生命回满了。';
      case 'attr2': { const a = A[Math.random() * A.length | 0]; train(a, 2); return `${DATA.attrs.find(x => x.id === a).name} +2。`; }
      case 'coin25': RUN.coins += 25; return '咕噜给了你 25 铜钱。';
      case 'pbook': { const id = randBook(1); if (id) { give({ kind: 'book', id }); return '露米娜递给你一本技能书。'; } RUN.coins += 40; return '露米娜给了你 40 铜钱。'; }
      case 'pcoin': RUN.coins += 40; return '露米娜给了你 40 铜钱。';
      case 'heal60': heal(.6); return '回复了 60% 生命。';
      case 'xiu': RUN.xiu++; return '修炼次数 +1（下次结算时用）。';
    }
    return '什么都没有发生。';
  }
  const cMul = () => (1 + (hero.fx.coinMul || 0)) * (G.route === 'elite' ? 1.5 : 1) * (RUN.coinBoost ? 1.5 : 1);
  // 11/23 地上的铜钱：弹出落地，靠近就吸过来；放着 10 秒以上会招来小咕噜偷钱，撞到它钱会掉出来
  function coinTick(dt) {
    const mag = 40 + (hero.fx.waveCoin || 0) * 8;
    for (const c of G.gc) { c.t += dt; if (c.h > 0 || c.vh > 0) { c.vh -= 300 * dt; c.h = Math.max(0, c.h + c.vh * dt); c.x += c.vx * dt; if (c.h === 0) { c.vh = 0; c.vx = 0; } }
      const d = dist(c, hero); if (c.t > .35 && d < mag && !hero.dead) { const k = Math.min(1, dt * (6 + 300 / Math.max(d, 5))); c.x += (hero.x - c.x) * k; c.y += (hero.y - c.y) * k; }
      if (c.t > .35 && d < 9) { c.got = 1; G.cf += c.v * cMul(); const n = Math.floor(G.cf); G.cf -= n; RUN.coins += n; parts.push({ x: hero.x, y: hero.y - 30 * K, vx: 0, vy: -40 * K, t: 0, T: .3, col: '#ffe08a', g: 0 }); } }
    G.gc = G.gc.filter(c => !c.got);
    for (const o of G.gi) { o.t += dt; if (o.t > .4 && dist(o, hero) < 14 && !hero.dead) { o.got = 1;   // 11/23 书 / 宝物也要走过去捡
      if (o.kind === 'book') { const id = randBook(); if (id) { CAMP.learn({ kind: 'book', id }, true); gotFeed({ kind: 'book' }); } else { RUN.coins += 30; UI.feed('捡到 30 铜钱'); } }
      else { const it = ITEMS()[Math.random() * ITEMS().length | 0]; CAMP.learn({ kind: 'item', id: it.id }, true); gotFeed({ kind: 'item' }); } } }
    G.gi = G.gi.filter(o => !o.got);
    let T = G.thief;
    if (!T && !G.fe && G.gc.some(c => c.t > 10)) { const p = edgeSpawn(); T = G.thief = { x: p.x, y: p.y, ex: p.x, ey: p.y, bag: 0, n: 0, st: 'go', t: 0, f: 1 }; UI.feed('一只小咕噜溜进来偷钱了！'); }
    if (!T) return; T.t += dt;
    let tx = T.ex, ty = T.ey;
    if (T.st === 'go') { let best = null, bd = 1e9; for (const c of G.gc) if (c.t > 6) { const d = dist(c, T); if (d < bd) { bd = d; best = c; } } if (!best || T.n >= 3) T.st = 'run'; else { tx = best.x; ty = best.y; if (bd < 8) { const s = Math.ceil(best.v * .5); T.bag += s; best.v -= s; T.n++; if (best.v <= 0) G.gc = G.gc.filter(c => c !== best); } } }
    const dx = tx - T.x, dy = ty - T.y, dd = Math.hypot(dx, dy) || 1, sp = (T.st === 'run' ? 130 : 105) * K * dt; T.f = dx < 0 ? -1 : 1;
    if (dd <= sp) { T.x = tx; T.y = ty; if (T.st === 'run') { if (T.bag) UI.feed(`小咕噜偷走了 ${T.bag} 铜钱`); G.thief = null; return; } } else { T.x += dx / dd * sp; T.y += dy / dd * sp; }
    if (dist(T, hero) < 22 && T.bag && !hero.dead) { G.gc.push({ x: T.x, y: T.y, v: T.bag, t: 0, h: 0, vh: 110, vx: 0 }); UI.feed(`抓到小咕噜！${T.bag} 铜钱掉了出来`); T.bag = 0; T.st = 'run'; T.n = 9; }
  }
  function coinDraw() {
    for (const o of G.gi) { const x = X(o.x), y = Y(o.y) - 4 * u, bk = o.kind === 'book';
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(0, y - 50 * u, 0, Y(o.y)); g.addColorStop(0, 'rgba(255,220,120,0)'); g.addColorStop(1, bk ? 'rgba(140,200,255,.45)' : 'rgba(255,200,90,.45)'); ctx.fillStyle = g; ctx.fillRect(x - 5 * u, y - 50 * u, 10 * u, Y(o.y) - y + 50 * u); ctx.restore();
      ctx.fillStyle = 'rgba(30,15,5,.45)'; ctx.beginPath(); ctx.ellipse(x, Y(o.y) + 2 * u, 9 * u, 3 * u, 0, 0, 7); ctx.fill(); if (!bk) { ctx.fillStyle = '#1e1008'; ctx.fillRect(x - 7 * u, y - 8 * u, 14 * u, 13 * u); }
      if (bk) { ctx.fillStyle = '#1e1008'; ctx.fillRect(x - 8 * u, y - 2 * u, 16 * u, 9 * u); ctx.fillStyle = '#e8d8b0'; ctx.fillRect(x - 7 * u, y + 3 * u, 14 * u, 3 * u); ctx.fillStyle = '#5a2a8a'; ctx.fillRect(x - 7 * u, y - u, 14 * u, 5 * u); ctx.fillStyle = '#ffd84a'; ctx.fillRect(x - u, y, 3 * u, 2 * u); }
      else { ctx.fillStyle = '#8a5a2a'; ctx.fillRect(x - 6 * u, y - 7 * u, 12 * u, 11 * u); ctx.fillStyle = '#ffd84a'; ctx.fillRect(x - 6 * u, y - 3 * u, 12 * u, 2 * u); ctx.fillRect(x - u, y - 4 * u, 2 * u, 4 * u); } }
    for (const c of G.gc) { const u0 = u; { const u = u0 * 1.6; const x = X(c.x), gy = Y(c.y), air = c.h > 0 || c.vh > 0, y = gy - c.h * u * .4, n = c.v > 2 ? 3 : 1;
      ctx.fillStyle = 'rgba(30,15,5,.4)'; ctx.beginPath(); ctx.ellipse(x, gy + u, 5 * u, 2 * u, 0, 0, 7); ctx.fill();
      for (let j = 0; j < n; j++) { const ox = (j - (n - 1) / 2) * 4 * u, oy = y - (j % 2) * u;
        if (air) { const w = Math.max(1, Math.round(Math.abs(Math.cos(c.t * 12)) * 3)) * u; ctx.fillStyle = '#5a3208'; ctx.fillRect(x + ox - w - u, oy - 7 * u, 2 * w + 2 * u, 7 * u); ctx.fillStyle = '#f0b030'; ctx.fillRect(x + ox - w, oy - 6 * u, 2 * w, 5 * u); }
        else { ctx.fillStyle = '#5a3208'; ctx.fillRect(x + ox - 4 * u, oy - 2 * u, 8 * u, 4 * u); ctx.fillStyle = '#e8a830'; ctx.fillRect(x + ox - 3 * u, oy - 2 * u, 6 * u, 3 * u); ctx.fillStyle = '#ffe890'; ctx.fillRect(x + ox - 2 * u, oy - 2 * u, 3 * u, u); ctx.fillStyle = '#7a4a10'; ctx.fillRect(x + ox - u, oy - u, 2 * u, u); } }
      if (c.t > 8 && Math.floor(c.t * 4) % 2) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 4 * u, y - 4 * u, u, u); } } }
    const T = G.thief; if (T) { shadow(T.x, T.y, 16); SPR.draw(ctx, 'goblin', 'walk' + (Math.floor(T.t * 14) % 6), 0, X(T.x), Y(T.y), T.f < 0, u, { k: .6 });
      if (T.bag) { const x = X(T.x), y = Y(T.y) - 30 * u; ctx.fillStyle = '#3a2410'; ctx.fillRect(x - 5 * u, y - 4 * u, 10 * u, 9 * u); ctx.fillStyle = '#b08850'; ctx.fillRect(x - 4 * u, y - 3 * u, 8 * u, 7 * u); ctx.fillStyle = '#ffd84a'; ctx.fillRect(x - u, y - 5 * u, 2 * u, 2 * u); } }
  }
  // ---------- 11/23 地图氛围：光柱 / 火光火星 / 落叶 / 萤火虫，位置全部取自地图本身（MAP.amb，原图像素） ----------
  const AMB = { leaves: [], flies: [], sparks: [] };
  // 11/23 照三国终章：火用 8 帧火焰序列图（盖在地图画的火上），落叶用桑叶图，光柱用 shaft 图
  const FXI = {}; const fxi = n => FXI[n] || (FXI[n] = Object.assign(new Image(), { src: 'art/fx/map/' + n + '.webp' })); const okI = i => i.complete && i.naturalWidth;
  function ambDraw(dt) {
    const A = MAP.amb; if (!A) return; const q = MAPW / 1672, P = (x, y) => [X(x * q), Y(y * q)], t = G.t;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    { const sh = fxi('shaft'); if (okI(sh)) for (const [x, y, w, h] of A.rays || []) { const [sx, sy] = P(x, y); ctx.globalAlpha = .55 + .2 * Math.sin(t * .5 + x); ctx.drawImage(sh, sx - w * q * s * .2, sy, w * q * s * 1.2, h * q * s); } ctx.globalAlpha = 1; }
    for (const [x, y, w, h] of A.rays || []) { const [sx, sy] = P(x, y), L = h * q * s, Wd = w * q * s * .35; for (let i = 0; i < 3; i++) { const a = .12 + .05 * Math.sin(t * .6 + i * 2 + x), ox = (i - 1) * Wd * .7;
      const g = ctx.createLinearGradient(sx, sy, sx + L * .45, sy + L); g.addColorStop(0, `rgba(255,236,170,${a})`); g.addColorStop(1, 'rgba(255,236,170,0)'); ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(sx + ox, sy); ctx.lineTo(sx + ox + Wd * .5, sy); ctx.lineTo(sx + ox + L * .45 + Wd, sy + L); ctx.lineTo(sx + ox + L * .45 - Wd * .2, sy + L); ctx.fill(); } }
    for (const [x, y, k] of A.fires) { const [sx, sy] = P(x, y - 14 * k), r = (26 + 4 * Math.sin(t * 9 + x) + 3 * Math.sin(t * 23 + y)) * k * s * q, g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      g.addColorStop(0, 'rgba(255,190,90,.38)'); g.addColorStop(.5, 'rgba(255,120,40,.12)'); g.addColorStop(1, 'rgba(255,80,20,0)'); ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, 2 * r, 2 * r);
      if (Math.random() < dt * 7 * k) AMB.sparks.push({ x: x + R(-4, 4) * k, y: y - 4, vx: R(-6, 6), vy: R(-38, -20), t: 0, T: R(.6, 1.2) }); }
    ctx.globalCompositeOperation = 'source-over';
    for (const [x, y, k, kind, hh] of A.fires) { const im = fxi(kind); if (!okI(im)) continue; const fw = im.naturalWidth / 8, f = Math.floor(t * 12 + x) % 8, h = hh * q * s, w = h * fw / im.naturalHeight, [sx, sy] = P(x, y); ctx.drawImage(im, f * fw, 0, fw, im.naturalHeight, sx - w / 2, sy - h, w, h); }
    ctx.globalCompositeOperation = 'lighter';
    for (const p of AMB.sparks) { p.t += dt; p.x += (p.vx + Math.sin(p.t * 6) * 8) * dt; p.y += p.vy * dt; const [sx, sy] = P(p.x, p.y), a = 1 - p.t / p.T; ctx.fillStyle = `rgba(255,${160 + 80 * a | 0},70,${a})`; ctx.fillRect(sx, sy, u, u); }
    AMB.sparks = AMB.sparks.filter(p => p.t < p.T);
    if (AMB.flies.length < 16 && A.flies) { const [x0, y0, x1, y1] = A.flies[Math.random() * A.flies.length | 0]; AMB.flies.push({ x: R(x0, x1), y: R(y0, y1), ph: R(0, 7), t: 0, T: R(5, 9) }); }
    for (const f of AMB.flies) { f.t += dt; f.x += Math.sin(f.t * .8 + f.ph) * 10 * dt; f.y += Math.cos(f.t * .6 + f.ph * 2) * 7 * dt; const a = Math.min(1, f.t, f.T - f.t) * (.5 + .5 * Math.sin(f.t * 3 + f.ph)), [sx, sy] = P(f.x, f.y);
      ctx.fillStyle = `rgba(210,255,120,${.25 * a})`; ctx.fillRect(sx - u, sy - u, 3 * u, 3 * u); ctx.fillStyle = `rgba(240,255,190,${a})`; ctx.fillRect(sx, sy, u, u); }
    AMB.flies = AMB.flies.filter(f => f.t < f.T);
    ctx.restore();
    if (A.leaf && AMB.leaves.length < 22 && Math.random() < dt * 3) { const [x0, x1, y0, y1] = A.leaf; AMB.leaves.push({ x: R(x0, x1), y: R(y0, y1), t: 0, ph: R(0, 7), c: Math.random() < .5 ? 0 : 1, n: Math.random() * 4 | 0, sz: R(9, 14) }); }
    for (const l of AMB.leaves) { l.t += dt; l.y += 34 * dt; l.x += (Math.sin(l.t * 1.6 + l.ph) * 18 + 6) * dt; const [sx, sy] = P(l.x, l.y), a = Math.min(1, l.t, (12 - l.t) / 2), im = fxi('sang' + l.n);
      ctx.globalAlpha = Math.max(0, a); if (okI(im)) { const w = l.sz * q * s, fl = Math.cos(l.t * 3 + l.ph); ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.sin(l.t * 1.3 + l.ph) * 1.2); ctx.scale(fl, 1); ctx.drawImage(im, -w / 2, -w / 2, w, w * im.naturalHeight / im.naturalWidth); ctx.restore(); }
      ctx.globalAlpha = 1; }
    AMB.leaves = AMB.leaves.filter(l => l.t < 12);
  }
  function gotFeed(o) { const k = o.kind === 'book' ? '一本技能书' : o.kind === 'item' ? '一件宝物' : ''; if (k) { UI.feed(`获得${k}，${UI.pTip()}`); UI.newDot(); } }
  function toastMsg(t) { UI.toast && UI.toast(t); }
  function bossIn() { if (G.bossOut) return; G.bossOut = true; G.boss = spawn(G.W.boss || MAP.boss); G.boss.cd = 2.5; banner('哥布林王 出现了！', 2.4); G.shake = .3; }

  // ---------- 每帧更新 ----------
  function update(dt) {
    G.t += dt; hero.t += dt; if (G.lvUpT > 0) G.lvUpT -= dt;
    if (G.comboT > 0 && (G.comboT -= dt) <= 0) G.combo = 0; coinTick(dt);   // 11/22 连击：3 秒没杀到怪就断
    if (G.banner) { G.banner.left -= dt; if (G.banner.left <= 0) G.banner = null; }
    G.shake = Math.max(0, G.shake - dt);
    if (G.winT != null && (G.winT -= dt) <= 0 && !G.over) { G.over = 'win'; return end(); }
    if (hero.dead) { hero.deadT += dt; if ((G.loseT -= dt) <= 0 && !G.over) { G.over = 'lose'; return end(); } }
    else {
      hero.rollCd -= dt; hero.inv -= dt; hero.hurtT -= dt; if (hero.rollBuf > 0) { hero.rollBuf -= dt; if (hero.roll <= 0 && hero.rollCd <= 0) roll(); }
      if (hero.roll > 0) { hero.roll -= dt; hero.x += hero.rvx * 240 * K * dt; hero.y += hero.rvy * 182 * K * dt; if (Math.random() < .7) parts.push({ x: hero.x, y: hero.y, vx: R(-10, 10) * K, vy: R(-10, 0) * K, t: 0, T: .3, col: '#e6dcb4', g: 0 }); }
      else { const c = hero.cs, root = false, mm = !c ? 1 : c.ph === 'wu' ? (c.S.charge ? .5 : 1) : c.ph === 'hold' ? c.move : (!c.move && c.t < SKF.get(c.sk.id).hitT) ? 1 : .4;   // 11/22：出手那一下不减速，之后的后摇 40% 慢走（翻滚取消）
        const [dx, dy] = root ? [0, 0] : moveDir(), d = Math.hypot(dx, dy); hero.moving = d > .1; if (hero.moving) { hero.mvx = (hero.mvx || 0) * .9 + dx / (d || 1) * .1; hero.mvy = (hero.mvy || 0) * .9 + dy / (d || 1) * .1; hero.mvT = (hero.mvT || 0) + dt; } else hero.mvT = 0; if (hero.moving) { const k = Math.min(1, d), v = 85 * hero.m.move * mm * K; hero.x += dx / (d || 1) * k * v * dt; hero.y += dy / (d || 1) * k * v * .76 * dt; if (!c || c.ph !== 'hold') hero.f = dx < -.1 ? -1 : dx > .1 ? 1 : hero.f; } }
      clampG(hero, 8 * K); weapon(dt);
    }
    if (!hero.dead) { SK.tick(dt);
    }
    spawner(dt); warnTick(dt); auraTick(dt); fieldTick(dt);
    for (const z of foes) {
      if (z.dead) { z.deadT += dt; continue; }
      z.flash -= dt; z.kbT -= dt; z.brk = (z.brk || 0) - dt; statusTick(z, dt); if (z.dead) continue;
      if (z.cc) z.moving = false; else if (z.T.boss || z.T.ai === 'boss') bossAI(z, dt); else soldierAI(z, dt);
      z.x += z.kbx * dt * 8; z.y += z.kby * dt * 8; z.kbx *= .8; z.kby *= .8; clampG(z, 4 * K);
    }
    const L = foes.filter(z => !z.dead && !z.T.ghost), m0 = 9 * K;   // 互相推开，别叠成一坨
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
    if (hero.roll > 0) return ['roll', Math.min(2, Math.floor((.3 - hero.roll) / .1))];
    const c = hero.cs; if (c) {   // 出招帧：js/skframes.js（tools/frames.html 调）
      const F = SKF.get(c.sk.id); let r = null;
      if (c.ph !== 'hold' && hero.moving && !(c.ph === 'rc' && !c.move && c.t < F.hitT)) return ['run', Math.floor(hero.t * 10) % 4, 'run'];   // 边走边蓄力/收招：放跑步帧，不滑步
      if (c.ph === 'wu') r = SKF.pick(F, 'wu', c.t);
      else if (c.ph === 'hold') r = SKF.pick(F, 'hold', c.t);
      else if (!c.move && c.t < F.hitT) { r = SKF.pick(F, 'hit', c.t); if (r) return [r[0], r[1], 'strike', F.lunge]; }
      else r = SKF.pick(F, 'rc', c.t - (c.move ? 0 : F.hitT));
      if (r) return [r[0], r[1], '']; if (c.ph !== 'rc') return ['idle', 0, '']; }
    if (hero.hurtT > 0) return ['hurt', 0, 'hurt'];
    if (hero.moving) return ['run', Math.floor(hero.t * 10) % 4, 'run'];
    return ['idle', Math.floor(hero.t * 2) % 2];
  }
  function foeFrame(z) {
    if (z.dead) return [z.deadT < .22 ? 'fall' : 'down'];
    if (z.st === 'hurt') return ['hurt', 'hurt'];
    if (z.brk > 0 && SPR.frame(z.type, 'brk')) return ['brk', 'hurt'];
    if (z.st === 'wind' || z.st === 'cwind') return [z.type === 'gob_archer' ? 'draw' : 'windup'];
    if (z.st === 'strike') return ['strike', 'strike'];
    if (z.st === 'rec') return ['recover'];
    if (z.st === 'dash') return ['walk' + (Math.floor(z.t * 16) % (z.T.nw || 6)), 'run'];
    if (z.moving) { const i = Math.floor((z.t * z.as) * (z.T.boss ? 7 : 10)) % (z.T.nw || 6); return ['walk' + i, i % 2 ? 'run' : '']; }
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
    { const now = performance.now(), dt = Math.min(.1, (now - (cam.tm || now)) / 1000), tx = Math.max(0, Math.min(MAPW - Wm, hero.x - Wm / 2)), ty = Math.max(0, Math.min(MAPH - Hm, hero.y - 20 * K - Hm / 2)), k = 1 - Math.exp(-12 * dt);
      cam.tm = now; if (cam.snap || cam.x == null || Math.abs(tx - cam.x) > Wm || Math.abs(ty - cam.y) > Hm) { cam.x = tx; cam.y = ty; cam.snap = false; } else { cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; } }   // 镜头平滑跟随
    const sh = G.shake > 0 && !G.paused ? rd(R(-2, 2)) * u : 0;
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
    SK.drawUnder(ctx, X, Y, u); chargePreview(); coinDraw();
    for (const o of shots) if (o.k === 'fire') {   // 火球落点：地上的影子越来越大
      const p = o.t / o.T, r = o.r * u * (.3 + .7 * p); ctx.fillStyle = `rgba(255,90,30,${.15 + .2 * p})`; ctx.beginPath(); ctx.ellipse(X(o.x), Y(o.y), r, r / YS * .8, 0, 0, 7); ctx.fill();
    }
    const list = foes.map(z => ({ y: z.y, z })); list.push({ y: hero.y, h: 1 });
    if (G.fe) { const P = G.fe.pr, M = G.fe.mer;   // 11/23 公主、商人和勇者按前后排序，脚下有影子
      list.push({ y: P.y, d: () => { shadow(P.x, P.y, 26); SPR.drawHero(ctx, P.orbs ? 'big' : 'idle', Math.floor(G.t * 3) % 2, X(P.x), Y(P.y), P.x > hero.x, u, { w: 'staff', c: 'p' }); } });
      list.push({ y: M.y, d: () => { shadow(M.x, M.y, 26); SPR.draw(ctx, 'goblin', 'idle' + (Math.floor(G.t * 2) % 2), 0, X(M.x), Y(M.y), M.x < hero.x ? false : true, u, {}); } }); }
    list.sort((a, b) => a.y - b.y);
    for (const o of list) {
      if (o.d) { o.d(); continue; }
      if (o.h) {
        shadow(hero.x, hero.y, 26);
        if (hero.inv > 0 && hero.roll <= 0 && hero.hurtT <= 0 && !hero.dead && Math.floor(G.t * 20) % 2) continue;
        const [n, i, st, lg] = heroFrame(), bob = 0, lunge = st === 'strike' ? hero.f * (lg || 0) * u : st === 'hurt' ? -hero.f * 2 * u : 0;
        SPR.drawHero(ctx, n, i, X(hero.x) + lunge, Y(hero.y) + bob, hero.f < 0, u, { w: hero.cs ? hero.cs.S.w : HWPN[RUN.weapon] || 'sword', c: RUN.hero });
      } else {
        const z = o.z, B = z.T.boss || z.T.ai === 'boss', [n0, st] = foeFrame(z), n = z.noShield && SPR.frame(z.type, 'n_' + n0) ? 'n_' + n0 : n0;
        const a = z.dead ? Math.max(0, 1 - Math.max(0, z.deadT - (B ? 2.4 : .9)) / .4) : z.flee ? Math.max(0, 1 - z.fleeT / 1.6) : 1;
        if (!z.dead) shadow(z.x, z.y, B ? 50 * (z.T.boss ? 1 : z.k) : 26 * z.k);
        if (!z.dead && z.T.aura === 'drum' && !z.cc) { ctx.fillStyle = 'rgba(255,170,60,.5)'; for (let a = 0; a < PI * 2; a += .12) if (Math.floor(a / .12 + G.t * 6) % 3 === 0) ctx.fillRect(X(z.x) + rd(Math.cos(a) * 90 * u), Y(z.y) + rd(Math.sin(a) * 90 * u / YS), u, u); }
        if (!z.dead && z.tier) { const r = (z.tier === 'mini' ? 20 : 15) * u; ctx.fillStyle = z.tier === 'mini' ? '#ff7a3a' : '#ffcf3a'; for (let a = 0; a < PI * 2; a += .14) ctx.fillRect(X(z.x) + rd(Math.cos(a) * r), Y(z.y) + rd(Math.sin(a) * r / YS), u, u);
          const w = 22 * u, y = Y(z.y) - rd(46 * z.k) * u; ctx.fillStyle = '#2a160e'; ctx.fillRect(X(z.x) - w / 2 - u, y - u, w + 2 * u, 3 * u); ctx.fillStyle = z.tier === 'mini' ? '#ff7a3a' : '#ffcf3a'; ctx.fillRect(X(z.x) - w / 2, y, rd(w * Math.max(0, z.hp / z.maxHp)), u); }
        const bob = st === 'run' ? -u : 0, lunge = st === 'strike' ? z.f * 4 * u : st === 'hurt' && !B ? -z.f * 2 * u : 0;
        const air = z.cc && z.cc.k === 'air' ? rd(Math.sin(Math.min(1, 1 - z.cc.t / z.cc.T) * PI) * 18 * u) : 0;
        SPR.draw(ctx, z.type, n, 0, X(z.x) + lunge, Y(z.y) + bob - air, z.f < 0, u, { v: z.v, k: z.k, white: z.flash > 0 && !z.dead ? .6 : z.cc && z.cc.k === 'freeze' ? .35 : z.T.bomb && z.st === 'wind' && Math.floor(z.t * 12) % 2 ? .7 : 0, alpha: a * (z.T.ghost ? .72 : 1) });
        if (!z.dead && z.cc) { if (z.cc.k === 'freeze') { ctx.fillStyle = 'rgba(140,210,255,.35)'; ctx.fillRect(X(z.x) - 10 * u, Y(z.y) - 34 * u, 20 * u, 34 * u); } else if (z.cc.k === 'stun') for (let k = 0; k < 3; k++) { const aa = G.t * 6 + k * 2.1; ctx.fillStyle = '#ffe27a'; ctx.fillRect(X(z.x) + rd(Math.cos(aa) * 7 * u), Y(z.y) - 40 * u + rd(Math.sin(aa) * 2 * u), 2 * u, 2 * u); } }
        if (!z.dead && (z.burnT > 0 || z.slowL > 0 || z.curseT > 0) && Math.random() < .3) parts.push({ x: z.x + R(-6, 6) * K, y: z.y - R(4, 26) * K, vx: 0, vy: -20 * K, t: 0, T: .4, col: z.burnT > 0 ? '#ff8a30' : z.slowL > 0 ? '#8ad8ff' : '#b07bff', g: 0 });
        if (B && z.st === 'wind' && Math.floor(z.t * 12) % 2) SPR.draw(ctx, z.type, n, 0, X(z.x), Y(z.y), z.f < 0, u, { white: .35 });
      }
    }
    for (const o of shots) {
      if (o.k === 'arrow' && o.look === 'rock') { const x = X(o.x), y = Y(o.y); ctx.fillStyle = '#3a2a20'; ctx.fillRect(x - 3 * u, y - 3 * u, 6 * u, 6 * u); ctx.fillStyle = '#9a9088'; ctx.fillRect(x - 2 * u, y - 2 * u, 4 * u, 4 * u); ctx.fillStyle = '#c8c0b8'; ctx.fillRect(x - 2 * u, y - 2 * u, 2 * u, u); }
      else if (o.k === 'arrow' && o.look === 'bolt') { const x = X(o.x), y = Y(o.y); ctx.fillStyle = 'rgba(170,90,255,.35)'; ctx.beginPath(); ctx.arc(x, y, 6 * u, 0, 7); ctx.fill(); ctx.fillStyle = '#c890ff'; ctx.fillRect(x - 2 * u, y - 2 * u, 4 * u, 4 * u); ctx.fillStyle = '#fff'; ctx.fillRect(x - u, y - u, u, u); }
      else if (o.k === 'arrow') { const f = SPR.frame('gob_archer', 'arrow'); if (f) { ctx.save(); ctx.translate(X(o.x), Y(o.y)); ctx.rotate(Math.atan2(o.vy, o.vx)); const q = u * (SPR.sets.gob_archer.sk || 1); ctx.drawImage(SPR.sets.gob_archer.base, f.x, f.y, f.w, f.h, -f.w * q / 2, -f.h * q / 2, f.w * q, f.h * q); ctx.restore(); } }
      else if (o.k === 'axe') drawAxe(X(o.cx), Y(o.cy), o.t * 14);
      else if (o.k === 'harrow') { const a = Math.atan2(o.vy, o.vx); for (let j = 0; j < 9; j++) { ctx.fillStyle = j < 2 ? '#e8ecf4' : j > 6 ? '#e8e0c8' : '#8a5a2a'; ctx.fillRect(X(o.x) - rd(Math.cos(a) * j * 1.6 * u), Y(o.y) - rd(Math.sin(a) * j * 1.6 * u), u + 1, u + 1); } }
      else if (o.k === 'fire') { const p = o.t / o.T, hy = (1 - p) * 120; for (let j = 0; j < 5; j++) { ctx.fillStyle = ['#fff6c0', '#ffd060', '#ff8a30', '#e04a20', '#902a10'][j]; const q = (5 - j) * u; ctx.fillRect(X(o.x) - q / 2 - rd(j * 3 * u * (1 - p)), Y(o.y) - rd((hy + j * 7) * u) - q / 2, q, q); } }
    }
    SK.drawOver(ctx, X, Y, u); princessDraw(); fieldDraw(); { const n = performance.now(), adt = Math.min(.1, (n - (AMB.tm || n)) / 1000); AMB.tm = n; ambDraw(G.paused ? 0 : adt); }
    if (G.lvUpT > 0 && !hero.dead) {   // 11/22：升级字跳在勇者头上（跟着人走，弹两下再慢慢淡出）
      const t = 2.2 - G.lvUpT, hop = t < .6 ? Math.abs(Math.sin(t / .6 * PI * 2)) * 10 : 0, a = Math.min(1, G.lvUpT / .5), x = X(hero.x), y = Y(hero.y) - (44 + hop + Math.min(t, .3) * 8) * u;
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = `bold ${Math.round(8 * u)}px Pix, monospace`;
      ctx.fillStyle = '#0a2a2a'; ctx.fillText('LEVEL UP!', x + u, y + u); ctx.fillStyle = Math.floor(t * 8) % 2 ? '#ffffff' : '#7ff0e0'; ctx.fillText('LEVEL UP!', x, y); ctx.restore(); }
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
    UI.hud({ fe: !!G.fe, combo: G.combo || 0, comboT: G.comboT || 0, roll: Math.max(0, hero.rollCd) / (hero.rollMax || 1.8), rollT: Math.max(0, hero.rollCd), lvUp: G.lvUpT > 0, hp: hero.hp, maxHp: hero.maxHp, lv: G.lv, xp: G.xp, need: G.lv >= DATA.econ.maxLv ? 0 : need(), kills: G.kills, st: G.st, sts: DATA.stations.length, wi: G.wi, left: G.W && !G.W.boss ? Math.max(0, G.T - G.wt) : null, bossWave: !!(G.W && G.W.boss), coins: RUN.coins, slots: RUN.slots, open: RUN.open, next: nextSlot(), xiu: RUN.xiu, bossOut: G.bossOut, boss: G.boss && !G.boss.dead ? G.boss.hp / G.boss.maxHp : null, banner: G.banner ? G.banner.t : '' });
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
    stop() { G = null; }, g: () => G,
    run: () => RUN, recompute: () => G && recompute(), trainAll: () => trainAll(), nextWave: () => G && nextWave(), hero: () => hero, lv: () => G ? G.lv : 1, xpFrac: () => G ? Math.min(1, G.xp / need()) : 0, xpTxt: () => G ? `${Math.floor(G.xp)} / ${need()}` : '', st: () => G ? G.st : 1,
    skillInfo: sk => { const S = DATA.skills[sk.id], L = profL(sk), T = G ? skillT(S, sk) : { wu: S.wu, rc: S.rc }; return { dmg: G ? skillDmg(S, sk) : S.dmg, wu: T.wu, rc: T.rc, cd: T.wu + T.rc + (S.hold || 0), L, xp: sk.xp || 0, next: DATA.prof[L] || null }; }, profL,
    debug: { tp(fx, fy) { hero.x = MAPW * fx; hero.y = MAPH * fy; cam.snap = true; }, book() { G.gi.push({ kind: 'book', x: hero.x + 30 * K, y: hero.y, t: 0 }, { kind: 'item', x: hero.x + 9 * K, y: hero.y, t: 0 }); }, coin() { for (let i = 0; i < 6; i++) G.gc.push({ x: hero.x + R(60, 120) * K, y: hero.y + R(-20, 20) * K, v: 2, t: 11, h: 0, vh: 0, vx: 0 }); },   // 11/22 本波胜利：清场 + 算通关结算；本站胜利：直接当最后一波打完（结算后出路线卡）
      // 本段胜利：清场，进下一段（第 1 站第 2 段之后会触发公主）；已经是最后一段就结算这一站
      wave: () => { if (!G || G.endT != null || !G.waveOn || G.pr) return; G.q = []; warns.length = 0; foes.forEach(z => !z.dead && !z.T.boss && kill(z));
        if (G.wi < STN().waves.length - 1 && !STN().waves[G.wi + 1].boss) { G.wt = G.T; return; } G.cleared = true; G.timeout = false; banner('本站胜利', 1); G.endT = .6; },
      rest: k => G && G.fe && fieldRest(k),
      station: () => { if (!G || G.endT != null || !G.waveOn) return; const n = STN().waves.length; G.wi = STN().waves[n - 1].boss ? n - 2 : n - 1; G.q = []; warns.length = 0; foes.forEach(z => !z.dead && !z.T.boss && kill(z)); G.cleared = true; G.timeout = false; banner('本站胜利', 1); G.endT = .6; },
      boss: () => G && (foes.forEach(z => !z.dead && kill(z)), G.st = DATA.stations.length, G.wi = 1, nextWave()), god: () => G && (G.god = !G.god), clear: () => G && (G.q = [], warns.length = 0, foes.forEach(z => !z.T.boss && !z.dead && kill(z)), G.wt = Math.max(G.wt, G.T - .1)), skip: () => G && G.W && (G.wt = G.T), st: n => G && (G.st = n, G.wi = -1), lvl: () => G && addXp(need() / (hero.xpMul || 1) - G.xp + .01), win: () => G && (G.boss ? kill(G.boss) : (G.st = DATA.stations.length, G.wi = 1, nextWave(), bossIn(), kill(G.boss))), heal: () => hero && (hero.hp = hero.maxHp), route: () => G && (G.paused = true, showRoute()), spawn: (t, tier) => G && spawn(t, { x: hero.x + R(60, 120) * K * (Math.random() < .5 ? -1 : 1), y: hero.y + R(-20, 20) * K }, tier), state: () => ({ G, hero, foes, RUN, u, s, W, H }) },
  };
})();

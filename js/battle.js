// 像素勇者 · 战斗。
// 世界坐标 = 地图像素（打谷场加大后 2572×1421，见 tools/extend_map.py）；人物、距离按「像素格」算，1 格 = K 个地图像素。
// 屏幕上一个精灵像素 = u 个设备像素（整数，像素才整齐）；u 按屏幕高度算，让勇者约占屏幕高度的八分之一。
// 地图用原图高清画，人物按整数倍放大不平滑，两者分开处理。
(() => {
  const K = 2.55, YS = 1.35; let MAPW = 1672, MAPH = 941;   // YS：俯视地面压扁，算距离时竖向放大
  const R = (a, b) => a + Math.random() * (b - a), rd = Math.round, PI = Math.PI;
  let cv, ctx, W = 0, H = 0, u = 2, s = 1, cam = { x: 0, y: 0 };
  let MAP, MIMG, RUN, opt, G, hero, foes, shots, fx, parts, nums, tele, burns, MECH = null;
  const keys = {};
  const joy = { on: false, id: null, sx: 0, sy: 0, x: 0, y: 0 };

  // ---------- 场地 ----------
  // 可走地面：y0–y1 之间，每一行的左右边界按 pts 表插值
  function ground(y) { if (MECH && MECH.on()) return MECH.bounds(y); const P = MAP.ground.pts; if (y <= P[0][0]) return [P[0][1], P[0][2]]; for (let i = 1; i < P.length; i++) if (y <= P[i][0]) { const a = P[i - 1], b = P[i], t = (y - a[0]) / (b[0] - a[0] || 1); return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; } const q = P.at(-1); return [q[1], q[2]]; }
  function clampG(o, pad = 0) {
    if (MECH && MECH.on()) { const hh = o === hero; let ok = MECH.walk(o.x, o.y, hh) || (!hh && !(o.T && o.T.boss) && !o.tier && MECH.walk(o.x, o.y, true));   // 普通怪被推进坑里就掉下去
      if (ok) { o.lx = o.x; o.ly = o.y; return; } if (o.lx != null) { if (MECH.walk(o.x, o.ly, hh)) { o.y = o.ly; o.lx = o.x; return; } if (MECH.walk(o.lx, o.y, hh)) { o.x = o.lx; o.ly = o.y; return; } o.x = o.lx; o.y = o.ly; return; }
      const [sx, sy] = MECH.snap(o.x, o.y, hh); o.x = sx; o.y = sy; o.lx = sx; o.ly = sy; return; }
    const g = MAP.ground; o.y = Math.max(g.y0, Math.min(g.y1, o.y)); const [l, r] = ground(o.y); o.x = Math.max(l + pad, Math.min(r - pad, o.x)); }
  const dist = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * YS) / K;   // 单位：像素格
  const ang = (a, b) => Math.atan2((b.y - a.y) * YS, b.x - a.x);

  // ---------- 画面尺寸 ----------
  function fit() {
    const dpr = Math.min(3, window.devicePixelRatio || 1); W = Math.round(innerWidth * dpr); H = Math.round(innerHeight * dpr);
    cv.width = W; cv.height = H;
    u = Math.max(1, Math.round(H / 480));   // 11/21 镜头拉远一档（原来 H / 320）
    const ZM = MAP && MAP.zoom || 1; while (u / K * MAPW < W * ZM || u / K * MAPH < H * ZM) u++;   // 地图一定要盖满屏幕（超宽屏会把人物放大一点）
    s = u / K; ctx.imageSmoothingEnabled = false;
  }
  const X = x => rd((x - cam.x) * s), Y = y => rd((y - cam.y) * s);

  // ---------- 开局 ----------
  function careerColorSync(){const books=RUN?.slots?.filter(b=>b?.job)||[];hero.jobColor=books.some(b=>b.job.final)?'#ffd36a':books.length?({sword:'#83ed8a',spear:'#72d9ff',bow:'#e5edff',staff:'#ff8af2',gun:'#70f2ff',common:'#ffd46e',tome:'#ffe6a2',scythe:'#bb8bdf'}[books[0].job.families[0]]):null;}
  function start(o) { if (cv) cv.classList.remove('dead'); if (G) { G.deadR = null; G.dust = 0; }
    opt = o; MAP = DATA.maps.find(m => m.id === (o.map || 'field')); SPR.setGrade(MAP.grade); MAPW = MAP.w || 1672; MAPH = MAP.h || 941; fit();
    MIMG = new Image(); MIMG.crossOrigin = 'anonymous'; MIMG.src = MAP.img;
    const b = o.build || { weapon: o.weapon || 'sword' }, A0 = {}; for (const a of DATA.attrs) A0[a.id] = DATA.attrBase + ML('a_' + a.id);   /* 11/25 局外属性点 */
    // st = 第几站（1–8，9 = 首领站），wi = 这一站第几波（0–2），route = 这一站是从哪张卡进来的
    G = { t: 0, kills: 0, boss: null, bossOut: false, over: null, overT: 0, shake: 0, hitStop: 0, paused: false, xp: 0, lv: 1, god: false, banner: null,
      st: 1, wi: -1, route: 'fight', waveOn: false, wave: 0 };
    const g = MAP.ground;
    cam.snap = true; hero = { gap: 0, rollBuf: 0, x: MAPW / 2, y: (g.y0 + g.y1) / 2, hp: 0, maxHp: 0, f: 1, t: 0, roll: 0, rollCd: 0, inv: 0, hurtT: 0, atkT: 0, moving: false, cd: .6, dead: false,
      m: { dmg: 1, spd: 1, area: 1, move: 1 }, critP: .01, critM: .01, critMulP: 1.5, critMulM: 1.5, eva: 0, pIn: 1, mIn: 1, xpMul: 1, fx: {}, A: {} };
    // 这一局的全部状态：属性、修炼加的点、技能栏、背包、铜钱
    try { SEEN.add('s:' + (b.book1 || b.skill || b.weapon || 'sword')); if (b.book2) SEEN.add('s:' + b.book2); } catch (e) {}
    RUN = { title: b.title || null, hero: b.hero || 'm', weapon: b.weapon, attrs: b.attrs || A0, habit: b.habit || null, train: {}, pts: 0,   /* 11/22 属性加点删除，只靠修炼 */ alloc: {}, tmp: {}, slots: Array(DATA.slotsMax).fill(null), open: DATA.slotsOpen,
      bag: Array(DATA.bagSize).fill(null), gear: Array(DATA.gearSize).fill(null), oath: Array(DATA.oathSize).fill(null), mv: [{ kind: 'oath', id: 'traveler', lv: 1, mv: true }], eq: { main: { t: 1, aff: [] } }, gbag: [], stones: { 1: 0, 2: 0, 3: 0 }, coins: 0, si: 0, xiu: 0, dmgAll: {}, dmgW: {}, xopt: null, xrr: 0, shop: null, rr: 0, bought: {} };
    RUN.slots[0] = { id: (b.book1 && DATA.skills[b.book1]) ? b.book1 : (b.skill && DATA.skills[b.skill] && DATA.skills[b.skill].w === b.weapon) ? b.skill : (DATA.weapons[b.weapon]?.start || b.weapon), lv: 1, xp: 0 };   // 11/24 公主出发准备：第 1 格可放书库的书
    if (b.book2 && DATA.skills[b.book2] && ML('slot2') && b.book2 !== RUN.slots[0].id) RUN.slots[1] = { id: b.book2, lv: 1, xp: 0 };   /* 解锁了第 2 格就多带一本 */ if (b.item) RUN.gear[0] = { kind: 'item', id: b.item };
    RUN.heat = HEATLS(); if (!ML('oath')) RUN.heat = {}; RUN.hpCut = .1 * (RUN.heat.life || 0);careerColorSync();   /* 誓约石热度（要先解锁） */
    if (ML('step') && !o.resume) setTimeout(() => { if (!G || G.over) return; const L = shuffle(DATA.oathPool(RUN).filter(k => DATA.oaths[k].mv)).slice(0, 3); G.paused = true; CAMP.open({ title: '选择身法（3选1）', st: G.st, tab: 'shi', loot: L.map(id => ({ kind: 'oath', id })), pickOne: true, stepChoice: true, after: () => { G.paused = false; } }); }, 0);   /* 11/25 局外「身法」：开局随机带 1 个身法 */
    recompute(); RUN.coins = DATA.econ.startCoin + (hero.fx.coin || 0) + 20 * ML('coin') + (+localStorage.getItem('xsyz-bonusCoin') || 0); localStorage.removeItem('xsyz-bonusCoin');   /* 11/25 彩蛋铜钱：下一局开局带上，一次性 */ RUN.lives = 2 + ML('life'); RUN.livesUsed = 0;
    jobTraces.length = 0; foes = []; shots = []; fx = []; parts = []; nums = []; tele = []; burns = []; pend = []; warns.length = 0;
    if (!SK) SK = SKILLS(API); if (!JC) JC = JOBS.combat(JOB_API); SK.reset(); hero.cs = null;
    if (!ESK) ESK = ESKILL({ K, YS, hero: () => hero, spawn: (t, at) => spawn(t, at), clamp: o => clampG(o), hurt: (d, src) => { damageHero.src = src || null; damageHero(d, 'phys'); }, foes: () => foes,
      say: txt => nums.push({ x: hero.x, y: hero.y - 60 * K, txt, t: 0, col: '#ffb84a' }), num: (o, txt, col) => nums.push({ x: o.x, y: o.y - 40 * K, txt, t: 0, col }),
      boom: (x, y, r) => fx.push({ k: 'boom', x, y, t: 0, T: .45, r }), slash: z => { for (let i = 0; i < 5; i++) parts.push({ x: z.x, y: z.y - 14 * K, vx: R(-60, 60) * K, vy: R(-60, 0) * K, t: 0, T: .3, col: '#fff', g: 0 }); } });
    ESK.reset();
    if (o.resume) { const S = o.resume; Object.assign(RUN, JSON.parse(JSON.stringify(S.RUN))); Object.assign(G, S.G); DATA.normalizeItems(RUN); JOBS.normalize(RUN); if (!RUN.mv?.[0] || DATA.oaths[RUN.mv[0].id]?.retired) RUN.mv = [{ kind: 'oath', id: 'traveler', lv: 1, mv: true }]; RUN.lives = Math.max(RUN.lives || 2, 2 + ML('life')); recompute(); hero.hp = Math.max(1, Math.round(hero.maxHp * Math.min(1, o.cont ? Math.max(S.hp || 1, .6) + .2 * ML('rev') : (S.hp || 1)))); }   // 续关：至少 60% 血，复活强化再 +20%
    DATA.normalizeItems(RUN); JOBS.normalize(RUN);careerColorSync(); nextWave(); if (!o.resume || o.drop) { G.drop = { t: 0 }; SFX.play('fall'); } if (!o.resume && ML('shield')) hero.mShield = Math.round(hero.maxHp * .08 * ML('shield'));   /* 11/25 开局护盾 */   // 11/24 新开一局：勇者从森林上空掉下来
  }
  // 11/23 存档：每站开打时自动存（勇者状态 + 本局全部构筑）；通关或败北时删掉
  const SAVE = 'pxyz.save1';
  function saveRun() { try { localStorage.setItem(SAVE, JSON.stringify({ v: 1, opt: { map: opt.map, build: opt.build, weapon: opt.weapon }, RUN, G: { st: G.st, route: G.route, xp: G.xp, lv: G.lv, kills: G.kills, t: G.t }, hp: hero.hp / hero.maxHp, at: Date.now() })); } catch (e) {} }
  function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE)); return s && s.v === 1 ? s : null; } catch (e) { return null; } }
  function clearSave() { try { localStorage.removeItem(SAVE); } catch (e) {} }
  let pend = [];   // 延迟出手
  // 属性、修炼、背包里的宝物、现实习惯 → 勇者的各项数值（中途换宝物、修炼后都重算一次）
  // 修炼加的 + 升级加点（已确认的 alloc + 这次结算里还能退的 tmp）
  function trainAll() { const o = {}; for (const src of [RUN.train, RUN.alloc, RUN.tmp]) for (const k in src) o[k] = (o[k] || 0) + src[k]; return o; }
  const OB = id => (hero.ob && hero.ob[id]) || 0;
  // 11/24 局外：水晶（永久）+ 宫殿强化等级（xsyz-meta）
  const TT = () => { const t = DATA.titles.find(x => x.id === RUN.title); return (t && t.fx) || {}; };   // 11/24 佩戴的称号
  const META = () => { try { return JSON.parse(localStorage.getItem('xsyz-meta') || '{}'); } catch (e) { return {}; } }, ML = id => META()[id] || 0, HEATLS = () => { try { return JSON.parse(localStorage.getItem('xsyz-heat') || '{}'); } catch (e) { return {}; } }, HT = k => (RUN && RUN.heat && RUN.heat[k]) || 0, HH = () => HT('mob') + HT('dmg') + HT('life');   /* 11/25 誓约热度：怪物数量 / 怪物伤害 / 自身生命 */
  function addCrystal(n, x, y) { if (!n) return; if (HH()) n = Math.max(n, Math.round(n * (1 + .12 * HH()))); try { localStorage.setItem('xsyz-crystal', (+localStorage.getItem('xsyz-crystal') || 0) + n); } catch (e) {} RUN.cry = (RUN.cry || 0) + n; nums.push({ x, y: y - 60 * K, txt: '+' + n + ' 水晶', t: 0, col: '#9fe6ff' }); }
  // 11/25 装备：本局有效。武器三阶 + 附魔词条 + 各部位属性
  function gs() { const r = RUN; if (!r.eq) r.eq = {}; if (!r.eq.main) r.eq.main = { t: 1, aff: [] }; if (!r.gbag) r.gbag = []; if (!r.stones) r.stones = { 1: 0, 2: 0, 3: 0 }; return r; }
  function gearFx() { gs(); const g = {}, o = { g, dmgP: 0, dmgM: 0, wd: 0, a: { crit: 0, critMul: 0, spd: 0, area: 0, elite: 0 } }, m = RUN.eq.main; o.wd = DATA.weaponDmg[(m.t || 1) - 1] || 0;
    for (const a of m.aff || []) { const A = DATA.affixes[a[0]]; if (A) { const key=A[2]==='tag'?'tag_'+a[2]:A[2]; o.a[key]=(o.a[key]||0)+A[1][a[1]-1]/100; } }
    for (const [k, it] of Object.entries(RUN.eq)) { if (k === 'main' || !it || (k === 'off' && RUN.weapon !== 'sword')) continue; const D = DATA.gear[it.id], st = D && D.st[(it.t || 1) - 1]; if (!st) continue; for (const [key, v] of Object.entries(st)) { if (key === 'dmgP') o.dmgP += v; else if (key === 'dmgM') o.dmgM += v; else g[key] = (g[key] || 0) + v; } }
    return o; }
  function careerColorSync(){const books=RUN.slots.filter(b=>b?.job);hero.jobColor=books.some(b=>b.job.final)?'#ffd36a':books.length?({sword:'#83ed8a',spear:'#72d9ff',bow:'#e5edff',staff:'#ff8af2',gun:'#70f2ff',common:'#ffd46e',tome:'#ffe6a2',scythe:'#bb8bdf'}[books[0].job.families[0]]):null;}
  function recompute() {
    const items = RUN.gear.filter(x => x && x.kind === 'item').map(x => ({ id: x.id, lv: x.lv || 1 }));   // 11/23 只有左边宝物格里的宝物生效
    const gx = gearFx(); hero.gx = gx; const c = DATA.calc({ weapon: RUN.weapon, attrs: RUN.attrs, train: trainAll(), items, habit: RUN.habit, gfx: gx.g }), m = hero.m;
    m.dmg = (1 + (c.fx.dmg || 0)) * (1 + .03 * (G.lv - 1)) * (1 + (TT().dmg || 0)); m.spd = c.spd; m.area = c.area; m.move = c.move;
    hero.critP = c.critP; hero.critM = c.critM; hero.critMulP = c.critMulP; hero.critMulM = c.critMulM; hero.eva = c.eva + (RUN.hero === 'e' ? .08 : 0); hero.pIn = c.pIn; hero.mIn = c.mIn; hero.xpMul = c.xp * (RUN.hero === 'm' ? 1.1 : 1); hero.rollMax = 3; hero.rollN0 = 2; if (hero.rollN == null || hero.rollN > hero.rollN0) hero.rollN = hero.rollN0; /* 11/24 翻滚 2 格（二段滚 3 格），每格 1.5 秒回 */ hero.A = c.A; hero.fx = c.fx;   // 人物被动：男主经验 +10%，女主翻滚冷却 −20%（11/23 修：hero.A / hero.fx 之前被注释吞掉了）   // 11/26 戈拉斯尔：自带闪避 +8%
    hero.ob = {}; while (RUN.oath.length < DATA.oathSize) RUN.oath.push(null); RUN.oath.forEach((o, i) => { if (o && DATA.oaths[o.id] && (!DATA.oaths[o.id].w || DATA.heldWeapons(RUN).has(DATA.oaths[o.id].w))) hero.ob[o.id] = DATA.oathLv[Math.min(5, o.lv || 1) - 1] * (i === 0 ? 1 : .5); }); for (const o of RUN.mv || []) if (o && DATA.oaths[o.id]) hero.ob[o.id] = DATA.oathLv[Math.min(5, o.lv || 1) - 1]; if (OB('traveler')) hero.eva += .01;
    { const rn = hero.rune; if (rn && rn.t > 0) { if (rn.k === 'rage') m.dmg *= 1.25; if (rn.k === 'haste') m.spd *= 1.3; if (rn.k === 'wind') m.move *= 1.3; } }   /* 11/27 符文（10 秒，可超上限） */
    m.spd *= 1 + .08 * OB('jifeng'); hero.rollMax *= 1 - .08 * OB('qingyu'); hero.rollMul = 1 + .15 * OB('youlong');
    { const st = DATA.setOf(RUN.slots), F = {}; for (const t of Object.values(st.on)) for (const [k, v] of Object.entries(t[1])) F[k] = (F[k] || 0) + v; hero.setF = F;   // 11/24 流派羁绊
      if (F.dmg) m.dmg *= 1 + F.dmg; if (hero.fx) for (const k of ['sspd_bow', 'srng_bow', 'sdmg_staff']) if (F[k]) hero.fx[k] = (hero.fx[k] || 0) + F[k];
      const pd = (c.pdef || 0) + (F.pdef || 0), md = (c.mdef || 0) + (F.mdef || 0); hero.pIn = 1 - Math.min(.5, pd / (pd + 100)); hero.mIn = 1 - Math.min(.5, md / (md + 100)); }
    hero.rollN0 = 2; if (hero.rollN == null || hero.rollN > hero.rollN0) hero.rollN = hero.rollN0; hero.eva += .01 * ML('eva') + (TT().eva || 0); hero.critP += TT().crit || 0; hero.critM += TT().crit || 0; m.move *= 1 + (TT().move || 0); if (hero.fx) hero.fx.coinMul = (hero.fx.coinMul || 0) + (TT().coin || 0); if (TT().take) { hero.pIn *= 1 + TT().take; hero.mIn *= 1 + TT().take; } if (hero.fx && ML('disc')) hero.fx.shop = (hero.fx.shop || 0) - .05 * ML('disc');   // 局外：三格翻滚、闪避
    { const a = hero.gx.a; hero.critP += a.crit; hero.critM += a.crit; hero.critMulP += a.critMul; hero.critMulM += a.critMul; m.spd *= 1 + a.spd; m.area *= 1 + a.area; }   /* 11/25 附魔词条 */
    m.dmg *= 1 + .03 * ML('pow'); hero.critMulP += .08 * ML('cdm'); hero.critMulM += .08 * ML('cdm'); hero.critP += .01 * ML('crit'); hero.critM += .01 * ML('crit'); m.move *= 1 + .02 * ML('spd'); m.area *= 1 + .03 * ML('area'); hero.xpMul *= 1 + .03 * ML('xpg'); if (ML('iron')) { hero.pIn *= 1 - .03 * ML('iron'); hero.mIn *= 1 - .03 * ML('iron'); }   /* 11/25 局外强化：力道/暴击伤害/暴击率/移速/范围/经验/铁壁 */
    const max = Math.round((c.hp + 3 * (G.lv - 1)) * (1 - (RUN.hpCut || 0)) * (1 + .05 * ML('hp')) * (1 + ((hero.setF || {}).hp || 0)) * (1 + (TT().hp || 0))); hero.hp = hero.maxHp ? Math.max(1, Math.min(max, hero.hp + max - hero.maxHp)) : max; hero.maxHp = max;
    const a=hero.gx.a;
    hero.eva=Math.min(.25,hero.eva+(a.eva||0)+(OB('canying')?.05:0)+(OB('anying')?.08:0)+(OB('zhendi')?.03:0)+(OB('sigil')?.03:0)+(OB('mist')?.05:0));
    m.move=Math.min(1.3,m.move+(a.move||0)+(OB('youlong')?.05:0)+(OB('canying')?.03:0)+(OB('qingyu')?.04:0)+(OB('frosttrail')?.04:0)+(OB('sigil')?.03:0)+.05*OB('jifeng'));
    hero.rollMax*=Math.max(.2,1-(a.roll||0)-(OB('zhendi')?.05:0)-(OB('mist')?.04:0)-(OB('frosttrail')?.04:0));
    hero.fx.coinMul=(hero.fx.coinMul||0)+(a.coin||0);
    hero.critP=Math.min(.35,hero.critP);hero.critM=Math.min(.35,hero.critM);hero.critMulP=Math.min(2.5,hero.critMulP);hero.critMulM=Math.min(2.5,hero.critMulM);
    m.spd = Math.min(1.3, m.spd); m.area = Math.min(1.25, m.area);
    return c;
  }
  const DROP_T = 1.0;   /* 11/25 落地动画：下落 1 秒 + 落地 PON!! */
  function dropFx() { const t = G.drop.t, hx = X(hero.x), hy = Y(hero.y);
    if (t < DROP_T) { const sd = Math.floor(t * 30); ctx.fillStyle = 'rgba(255,255,255,.4)'; for (let i = 0; i < 16; i++) { const r = Math.abs(Math.sin((i + 1) * 91.7 + sd * 13.3)), x = hx + (i - 7.5) * 14 * u + (r - .5) * 10 * u, len = (70 + r * 170) * u * (.4 + t / DROP_T), y = ((r * 1.7 + t * 4.2 + i * .37) % 1.2 - .1) * H; ctx.fillRect(x, y, Math.max(1, u * .8), len); } }
    else { const p = t - DROP_T, a = Math.max(0, Math.min(1, 1.15 - p * 1.3)), sc = 1 + Math.max(0, .12 - p) * 6; ctx.save(); ctx.translate(hx + 26 * u, hy - 26 * u); ctx.rotate(-.12); ctx.scale(sc, sc); ctx.globalAlpha = a; ctx.font = `bold ${15 * u}px Pix, monospace`; ctx.textAlign = 'center'; ctx.lineWidth = 3 * u; ctx.strokeStyle = '#2a160e'; ctx.strokeText('PON!!', 0, 0); ctx.fillStyle = '#ffe45c'; ctx.fillText('PON!!', 0, 0); ctx.restore();
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fff6b8'; ctx.font = `${7 * u}px Pix, monospace`; ctx.textAlign = 'center'; for (let i = 0; i < 6; i++) { const ang = -PI * (.1 + .8 * i / 5), d = (14 + p * 90) * u; ctx.fillText('✦', hx + Math.cos(ang) * d, hy - 20 * u + Math.sin(ang) * d * .8); } ctx.restore(); } }
  const banner = (t, T) => { G.banner = { t, T, left: T }; };

  // ---------- 输入 ----------
  function bindInput() {
    addEventListener('keydown', e => { keys[e.code] = 1; if (!G || G.over) return; if (e.code === 'KeyE' && G.fe?.careerGlyph && CAMP?.careerReady?.() && SKUL(G.fe.careerGlyph,28)) { CAMP.openCareer?.(); e.preventDefault(); } if (e.code === 'Space') { roll(); e.preventDefault(); } if (e.code === 'KeyP' || e.code === 'Escape') UI.togglePause(); });
    addEventListener('keyup', e => { keys[e.code] = 0; });
    cv.addEventListener('pointerdown', e => { if (!running()) return; const cg=G.fe?.careerGlyph,rect=cv.getBoundingClientRect(); if(cg&&CAMP?.careerReady?.()&&SKUL(cg,34)&&Math.hypot(e.clientX-(rect.left+X(cg.x)*rect.width/W),e.clientY-(rect.top+Y(cg.y)*rect.height/H))<32*u){CAMP.openCareer?.();return;} joy.on = true; joy.id = e.pointerId; joy.sx = joy.x = e.clientX; joy.sy = joy.y = e.clientY; });
    addEventListener('pointermove', e => { if (joy.on && e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; } });
    const up = e => { if (e.pointerId === joy.id) joy.on = false; }; addEventListener('pointerup', up); addEventListener('pointercancel', up);
    addEventListener('blur', () => { if (running()) UI.softPause(); for (const k in keys) keys[k] = 0; joy.on = false; });
  }
  const running = () => G && !G.over && !G.paused;
  let SIMIN = null;   // 11/26 无头测试：外部直接给移动方向（?sim，见 js/sim.js）
  function moveDir() {
    if (G && G.lock) return [0, 0];
    if (SIMIN) return SIMIN;
    let dx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), dy = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
    if (joy.on) { const jx = joy.x - joy.sx, jy = joy.y - joy.sy, d = Math.hypot(jx, jy); if (d > 6) { const k = Math.min(1, d / 40); dx = jx / d * k; dy = jy / d * k; } }
    if (ESK && ESK.rev()) { dx = -dx; dy = -dy; }   // 11/24 混乱诅咒：方向颠倒
    return [dx, dy];
  }
  function roll() {
    if (running() && !hero.dead && (hero.roll > 0 || !(hero.rollN >= 1))) { if (hero.roll > 0 || hero.rollCd < .2) hero.rollBuf = .2; return; }
    if (!running() || hero.dead) return; hero.rollBuf = 0;
    const [dx, dy] = moveDir(), d = Math.hypot(dx, dy); hero.rvx = d ? dx / d : hero.f; hero.rvy = d ? dy / d : 0; if (dx) hero.f = dx < 0 ? -1 : 1;
    const full = hero.rollN >= hero.rollN0; if (full) hero.rollCd = hero.rollMax; hero.rollN--; hero.rollFull = full;   // 11/24 满格那一滚才触发身法效果
    hero.roll = .35; hero.inv = Math.max(hero.inv, .2); hero.rolling = 1; RUN.rolls = (RUN.rolls || 0) + 1; hero.pushed = new Set(); if (OB('fanji')) hero.afterRoll = 3;
    if (full) { if (OB('canying')) G.decoy={x:hero.x,y:hero.y,t:1.5};
      if (OB('erduan')) { hero.rShield = 1; nums.push({ x: hero.x, y: hero.y - 50 * K, txt: '护盾', t: 0, col: '#9fdcff' }); }
      if (OB('jinghua')) { if (ESK && ESK.cleanse) ESK.cleanse(); healHero(hero.maxHp * .01 * OB('jinghua')); fx.push({ k: 'ring', x: hero.x, y: hero.y, t: 0, T: .4, r: 34, col: '#bfffd0' }); }
       }
    if(OB('mist'))hero.mistT=.5;if(OB('qingyu'))hero.featherT=2;if(OB('sigil')&&(RUN.weapon==='gun'||DATA.heldWeapons(RUN).has('gun')))hero.sigilGuard=true;
    if (OB('anying')) { const soon = foes.some(z => !z.dead && z.st === 'wind' && z.T.wind + (z.windAdd || 0) - z.t < .25 && dist(z, hero) < (z.T.reach || 40) * 1.6 + 30) || tele.some(q => q.T - q.t < .25 && Math.hypot(q.x - hero.x, (q.y - hero.y) * YS) < 220 * K);
      if (soon) { const m = OB('anying'); hero.shadowT = .8 * m; hero.inv = Math.max(hero.inv, .8 * m); G.slowMo = .3;  nums.push({ x: hero.x, y: hero.y - 50 * K, txt: '暗影！', t: 0, col: '#b48cff' }); } }
    const c = hero.cs; if (c && (c.ph === 'wu' || c.ph === 'rc')) { if (c.ph === 'wu') nums.push({ x: hero.x, y: hero.y - 50 * K, txt: c.S.name + ' 中断', t: 0, col: '#c8b890' }); endCast(c.ph === 'rc'); }
  }

  // ---------- 敌人 ----------
  // 生成一只敌人：tier = 'elite' / 'mini'（精英 / 小头目）。at 给了就生在那里，否则离勇者 135–190 格的地面上
  function edgeSpawn() { if (MECH && MECH.on()) return spawnPos(); const g = MAP.ground, y = R(g.y0, g.y1), [l, r] = ground(y); return { x: Math.abs(l - hero.x) > Math.abs(r - hero.x) ? l + 4 * K : r - 4 * K, y }; }
  function spawnPos() {
    const g = MAP.ground; let best = null;
    for (let i = 0; i < 14; i++) {
      // 11/22 包抄：正在跑的时候 45% 的怪刷在你跑的方向前方（±55°），专治边退边射
      const fl = hero.mvT > .6 && Math.random() < .45, a = fl ? Math.atan2(hero.mvy, hero.mvx) + R(-.95, .95) : R(0, PI * 2), d = R(135, 190) * K, x = hero.x + Math.cos(a) * d, y = hero.y + Math.sin(a) * d / YS;
      if (y < g.y0 || y > g.y1) continue; if (MECH && MECH.on()) { if (!MECH.walk(x, y, false)) continue; return { x, y }; } const [l, r] = ground(y); if (x < l + 6 * K || x > r - 6 * K) continue; return { x, y };
    }
    if (MECH && MECH.on()) { for (let i = 0; i < 40; i++) { const x = R(g.y0 * 0 + 300 * 1.5, 1300 * 1.5), y = R(g.y0, g.y1); if (MECH.walk(x, y, false) && Math.hypot(x - hero.x, (y - hero.y) * YS) > 120 * K) return { x, y }; } return { x: hero.x + 200 * K, y: hero.y }; }
    const y = R(g.y0, g.y1), [l, r] = ground(y); return { x: Math.abs(l - hero.x) > Math.abs(r - hero.x) ? l + 8 * K : r - 8 * K, y };
  }
  function spawn(type, at, tier) {
    try { SEEN.add('e:' + type); } catch (e) {}
    const T = DATA.enemies[type], TT = tier ? DATA.tiers[tier] : null, p = at || spawnPos();
    const hp = Math.ceil(T.hp * (T.boss ? 1 : (DATA.stations[G.st - 1] || {}).hp || 1) * (TT ? TT.hp : 1));
    const z = { type, T, tier, x: p.x, y: p.y, hp, maxHp: hp, f: 1, t: R(0, 1), st: 'run', cd: R(.3, 1), flash: 0, kbx: 0, kby: 0, kbT: 0,
      v: T.boss ? 0 : Math.random() * 3 | 0, k: T.boss ? 1 : (TT ? TT.size : R(.94, 1.06)) * (T.k || 1), shieldHp: T.shield || 0, sumT: 3, as: R(.85, 1.15), sp: T.spd * R(.9, 1.1),
      dmgMul: (TT ? TT.dmg : 1) * (1 + .15 * HT('dmg')), reachMul: TT && TT.reach || 1, windAdd: TT && TT.wind || 0 };
    z.sp0 = z.sp;
    clampG(z); foes.push(z); if (JC) JC.spawned(z);
    return z;
  }
  // ---------- 怪身上的状态 ----------
  // 缓滞：每层减速 15%，最多 4 层，叠满冻结 1 秒；硬控（眩晕 / 定身 / 浮空 / 冻结）之后 3 秒内不再被硬控；精英时间减半，小头目和首领免疫
  const markBonus = () => RUN.eq?.main?.t === 2 && hero.effectWeapon === RUN.weapon ? .5 : 0;
  function status(z, o, d) {
    if (o.slowP) { z.slowP = Math.max(z.slowP || 0, o.slowP[0]); z.slowPT = Math.max(z.slowPT || 0, o.slowP[1]); }
    if(o.slow) {let count=o.slow+(OB('mark_staff')&&Math.random()<.2*OB('mark_staff')?1:0);
      while(count-->0){if((z.slowL||0)>=3){z.slowL=0;if(G.t-(z.frozenAt??-99)>=2){z.frozenAt=G.t;if(z.T.boss)JC.mark('imbalance',z);else cc(z,'freeze',1);}hurt(z,6,z,0,null,{dt:'magic',extra:true,detonate:true});}else z.slowL=(z.slowL||0)+1;}z.slowT=3+markBonus(); }
    if (o.poisonTag) z.poisonVisualT = 3;
    if (o.burn) { z.burnT = 3; z.burnD = Math.max(z.burnD || 0, d * .2); }
    if (o.bleed) { z.bleedN = Math.min(5, (z.bleedN || 0) + 1); z.bleedT = 4; z.bleedD = Math.max(z.bleedD || 0, d * .12); }
    if(o.curse)JC.mark('curse',z);
    if (o.vuln) { z.vulnN = Math.min(10, (z.vulnN || 0) + 1); z.vulnT = 4; }
    if (o.cc) cc(z, o.cc[0], o.cc[1], o.airVuln);
  }
  function cc(z, k, t, airVuln) {
    if (z.T.boss || z.tier === 'mini' || (z.ccImm || 0) > 0) return; if (z.tier === 'elite') t *= .5;
    z.cc = { k, t, T: t }; z.ccImm = 3; z.airVuln = !!airVuln; if (z.st === 'wind') { z.st = 'run'; z.t = 0; }   // 硬控打断抬手
  }
  function statusTick(z, dt) {
    if (JC) JC.tick(z, dt); z.ccImm = (z.ccImm || 0) - dt; if (z.cc && (z.cc.t -= dt) <= 0) z.cc = null;
    if (z.slowT > 0 && (z.slowT -= dt) <= 0) z.slowL = 0; if (z.slowPT > 0 && (z.slowPT -= dt) <= 0) z.slowP = 0;
    if (z.curseT > 0 && (z.curseT -= dt) <= 0) z.curseN = 0; z.vulnT -= dt; if(z.deathMarkT>0&&z.tier&&!z.T.boss&&z.hp<z.maxHp*.1)hurt(z,z.hp,z,0,'d_death',{execute:true,extra:true});
    z.dotT = (z.dotT || 0) - dt; if (z.dotT <= 0) { z.dotT = .5; let d = 0; if (z.burnT > 0) d += z.burnD; if (z.bleedT > 0) d += z.bleedD * z.bleedN; if(z.snakeSpread&&z.poisonVisualT>0)d+=z.poisonD||1; if (d > 0) { z.hp -= d; nums.push({ x: z.x + R(-6, 6) * K, y: z.y - 30 * K, v: Math.max(1, rd(d)), t: 0, col: z.burnT > 0 ? '#ff9a50' : '#ff6a6a' }); if (z.hp <= 0) kill(z); } }
    if (z.burnT > 0) z.burnT -= dt; if (z.bleedT > 0 && (z.bleedT -= dt) <= 0) z.bleedN = 0;
    if (z.poisonVisualT > 0) z.poisonVisualT -= dt;
    z.sp = (z.sp0 || z.sp) * (1 - .15 * (z.slowL || 0)) * (1 - (z.slowP || 0));
  }
  // 打怪：o = { dt 伤害类型, crit 额外暴击, slow 缓滞层数, slowP [减速, 秒], burn, bleed, curse, vuln, cc [硬控, 秒], airVuln, quiet }
  function hurt(z, d, from, kb = 14, sid, o = {}) {
    const token = o.cast; if (token) {
      const group = o.hitGroup || (o.finisher ? 'finisher' : 'base'); token.hitGroups ||= new Map();
      if (!token.hitGroups.has(group)) token.hitGroups.set(group, group === 'base' ? token.hits : new Map());
      const hits = token.hitGroups.get(group), n = hits.get(z) || 0, S0 = DATA.skills[sid];
      const cap = o.maxHits ?? (o.finisher ? S0?.finisherCap || 1 : S0?.hitCap);
      if (cap && n >= cap) return false; hits.set(z, n + 1);
      const seen = o.extra || token.effects.has(z); if (!seen) token.effects.add(z); o = Object.assign({}, o, { noEffects: seen });
      if(!o.extra&&sid==='thunder'&&z.slowL>0){token.thunderBonus ||= new Set();if(!token.thunderBonus.has(z)){d*=1.3;token.thunderBonus.add(z);}}
    }
    if (!o.extra && G.props && G.props.length) propHit(z.x, z.y, 34 * K);
    if (z.thiefP) return thiefHit();
    if (z.propRef) { propHit(z.propRef.x, z.propRef.y, 12 * K); return; }
    if (!o.execute && z.eShield > 0 && d > 0) { const a = Math.min(z.eShield, d); z.eShield -= a; d -= a; if (!d) { nums.push({ x: z.x, y: z.y - 40 * K, txt: '盾', t: 0, col: '#ffe08a' }); return; } }   // 11/24 圣骑士护盾
    if (z.dead || z.flee) return;
    const career = token?.career; if (!o.extra && career) d *= JC.factor(career, z);
    if(!o.extra&&career&&['hundred','drill'].includes(sid)){token.imbalanceBonus ||= new Set();if(z.imbalanceT>0)token.imbalanceBonus.add(z);if(token.imbalanceBonus.has(z))d*=1.25;}
    const S = sid && DATA.skills[sid], dt = o.dt || (S && S.dt) || 'phys', T = z.T;
    const def = dt === 'magic' ? (T.mdef || 0) : (T.pdef || 0) * (z.tier ? 1.5 : 1); d *= 1 - Math.min(.6, def / (def + 100));   /* 怪物防御：和勇者同一公式，最多减 60% */
    let addDamage = (T.boss || z.tier) ? .04 * ML('hunt') : 0; if (G.firstArm) { G.firstArm = false; if (ML('first')) addDamage += .3 * ML('first'); }   /* 11/25 猎手 / 先手 */
    const tags = o.tags || (S && S.tags) || []; const weak = tags.some(t => (T.weak || []).includes(t)), resist = tags.some(t => (T.resist || []).includes(t)); let reduction = !(o.detonate || z.armorBreakT > 0) && ((T.res === 'iron' || T.res === 'spirit') && dt === 'phys') ? .3 : !(o.detonate || z.armorBreakT > 0) && T.res === 'magic' && dt === 'magic' ? .5 : 0; if (resist && !weak) reduction = Math.max(reduction, .5); if (!(weak && resist)) d *= weak ? 1.5 : 1 - reduction; if (T.res === 'spirit' && dt === 'magic' && !(weak && resist)) d *= 1.2;   // 11/22 体质
    if (z.shieldHp > 0 && from && (from.x - z.x) * z.f > 0 && !(z.cc)) { d *= .3; if (--z.shieldHp <= 0) { z.noShield = true; z.st = 'hurt'; z.t = -.25; z.brk = .45; nums.push({ x: z.x, y: z.y - 40 * K, txt: '盾碎了！', t: 0, col: '#ffcf6a' }); } else for (let i = 0; i < 3; i++) parts.push({ x: z.x + z.f * 10 * K, y: z.y - 16 * K, vx: z.f * R(10, 50) * K, vy: R(-50, -10) * K, t: 0, T: .3, col: '#fff2a0', g: 120 * K }); }   // 盾兵正面挡 70%，挡够次数盾碎
    d *= 1 + Math.max(z.curseT > 0 ? .10 : 0, z.vulnT > 0 ? .05 * (z.vulnN || 0) : 0, z.cc && z.cc.k === 'air' && z.airVuln ? .3 : 0);
    if ((z.tier || T.boss) && OB('tulong')) addDamage += .12 * OB('tulong');
    if(hero.gx){const tags=DATA.skills[sid]?.tags||[];addDamage+=Math.max(0,...tags.map(t=>hero.gx.a['tag_'+t]||0));if([z.breakT,z.preyT,z.imbalanceT,z.judgmentT,z.curseT,z.slowT].some(t=>t>0))addDamage+=hero.gx.a.marked||0;}
    if(OB('calamity'))addDamage+=.04*OB('calamity')*Math.min(2,[z.burnT>0,z.bleedT>0,z.poisonVisualT>0].filter(Boolean).length);
    if(OB('backstab')&&from&&(from.x-z.x)*(z.f||1)<0)addDamage+=.2*OB('backstab');
    if (hero.gx) { addDamage += dt === 'magic' ? hero.gx.dmgM : hero.gx.dmgP; if (z.tier || T.boss) addDamage += hero.gx.a.elite; }   // 11/25 头盔 / 附魔：对精英

    { const tf = TT(); addDamage += T.boss ? tf.boss || 0 : z.tier ? tf.elite || 0 : tf.mob || 0; } const baseBonus = o.cast?.bonus || 0; d *= (1 + baseBonus + addDamage) / (1 + baseBonus);
    const mg = dt === 'magic', crit = !o.dot && (o.forceCrit || Math.random() < (mg ? hero.critM : hero.critP) + (hero.castCrit || 0) + (o.crit || 0)); if (crit) d *= mg ? hero.critMulM : hero.critMulP; d = o.execute ? Math.max(0,z.hp) : d > 0 ? Math.max(1, rd(d)) : 0;
    if (!o.extra && !o.noEffects) { hero.effectWeapon = S && S.w; status(z, o, d); } if(crit&&!mg&&hero.fx.critSpeed&&!o.extra&&!o.noEffects)hero.oilT=2;
    if (crit && mg && hero.fx.manaLens && !o.extra && !o.noEffects) hero.lensReady = true;
    if (sid) { const r = Math.min(d, Math.max(0, z.hp)); RUN.dmgW[sid] = (RUN.dmgW[sid] || 0) + r; RUN.dmgAll[sid] = (RUN.dmgAll[sid] || 0) + r; }
    z.hp -= d; if (!o.extra && career) JC.hit(career, z, o); z.flash = .12; nums.push({ x: z.x, y: z.y - (z.T.boss ? 64 : 34) * K, v: d, t: 0, col: crit ? (mg ? '#d08aff' : '#ffd84a') : o.detonate ? '#ffd84a' : 'rgba(255,255,255,.55)', big: crit || o.detonate || weak });
    const a = from ? ang(from, z) : R(0, 7);
    // 推退：普通 6 格左右（原来 14 太远），同一只 0.2 秒内只推一次；精英减半，小头目和王不推；推不打断抬手
    const kbm = z.T.boss || z.tier === 'mini' ? 0 : z.tier === 'elite' ? .22 : .43;
    if (!o.extra && kbm && z.kbT <= 0) { z.kbx = Math.cos(a) * kb * kbm * K; z.kby = Math.sin(a) * kb * kbm * K / YS; z.kbT = .2; if (z.st === 'run') { z.st = 'hurt'; z.t = 0; } }
    if (!o.quiet) for (let i = 0; i < 3; i++) parts.push({ x: z.x, y: z.y - 14 * K, vx: (R(-30, 30) + Math.cos(a) * 30) * K, vy: R(-50, -10) * K, t: 0, T: R(.2, .4), col: i % 2 ? '#ffffff' : '#ffe9a8', g: 160 * K });
    // 11/27 定格每次释放只触发一次（多段/连射不再一卡一卡），追加攻击不定格；掌机同弓、通用居中
    if (!o.extra && !(token && token.hsDone)) { if (token) token.hsDone = 1; const w = S && S.w, hs = w === 'bow' || w === 'gun' ? .01 : w === 'staff' ? .045 : w === 'common' ? .03 : w ? .06 : .02; G.hitStop = Math.max(G.hitStop, (z.T.boss ? Math.max(.04, hs) : hs) * (crit ? 1.5 : 1)); }   // 11/24 定格按招式：近身重、弓几乎不停、法术居中
    z.jit = .18; SFX.play(crit ? 'crit' : 'hit');   // 受击横向抖动
    if(z.hp<=0)kill(z,!!o.extra); return true;
  }
  function kill(z,secondary=false) {
    if(z.dead)return;z.dead=true;if(JC)JC.killed(z,secondary);
    if(!secondary){for(const [flag,timer,damage] of [['ember','burnT','burnD'],['snake','poisonVisualT','poisonD']])if(hero.fx[flag]&&z[timer]>0&&!z[flag+'Spread'])for(const q of foes.filter(q=>q!==z&&!q.dead&&dist(z,q)<65).slice(0,2)){q[timer]=3;q[damage]=z[damage]||1;q[flag+'Spread']=true;}}
    if(OB('scavenge')&&Math.random()<.05*OB('scavenge'))RUN.coins++;
    z.dead = true; z.deadT = 0; z.st = 'dead'; G.kills++; if (z.tier === 'elite') RUN.elites = (RUN.elites || 0) + 1; G.wk++; G.combo = (G.combo || 0) + 1; G.comboT = 3; G.maxCombo = Math.max(G.maxCombo || 0, G.combo); G.bestCombo = Math.max(G.bestCombo || 0, G.combo); if (G.combo >= 30 && OB('lianzhan')) hero.lzT = 6; if (OB('pozhu') && G.kills % 15 === 0) hero.instant = .5 * OB('pozhu'); if (z.tier === 'elite' && OB('tulong')) healHero(hero.maxHp * .05 * OB('tulong'));
    { const c = z.T.boss ? 15 : z.tier === 'elite' ? (Math.random() < .6 ? 3 : 0) : z.tier === 'mini' ? (Math.random() < .3 ? 2 : 0) : Math.random() < .02 * (1 + .03 * ML('drop') + .04 * HH()) ? 1 : 0; addCrystal(c, z.x, z.y); }   // 11/24 水晶：小怪随机、精英大概率、首领必掉
    { const E = DATA.econ, v = z.tier === 'elite' ? E.elite : z.tier === 'mini' ? E.mini : Math.random() < (1 + .05 * (RUN.luck || 0)) * (1 + .03 * ML('drop') + .04 * HH()) / E.perKills ? 1 : 0;   // 11/23 铜钱掉在地上，要走过去捡
      if (v && !z.T.boss) G.gc.push({ x: z.x, y: z.y, v, t: 0, h: 0, vh: 90, vx: R(-20, 20) * K }); }
    if (z.tier === 'elite') { if (Math.random() < .15) G.gi.push({ kind: 'manual', id: 'training', x: z.x, y: z.y, t: 0 }); G.wElite++; G.gi.push({ kind: 'book', x: z.x, y: z.y, t: 0 }); }   // 固定精英掉书，路线精英掉宝物
    if (z.tier === 'mini') { G.wMini++; G.gi.push({ kind: 'item', x: z.x, y: z.y, t: 0 }); }
    { const da = Math.atan2(z.y - hero.y, z.x - hero.x); for (let i = 0; i < 14; i++) parts.push({ x: z.x + R(-8, 8) * K, y: z.y - R(4, 30) * K, vx: (Math.cos(da) * R(30, 120) + R(-40, 40)) * K, vy: R(-160, -40) * K, t: 0, T: R(.5, 1), col: ['#8fd14a', '#5a8a2a', '#e8e0c8', '#c49a5c', '#3a2410'][i % 5], g: 360 * K, sz: i < 6 ? 3 : 2 }); }   // 11/24 像素碎块
    z.flash = .12; SFX.play('die');
    if (z.T.boss) { G.bossManual = { kind: 'manual', id: 'master' }; G.shake = .6; G.hitStop = .8; banner('击败 哥布林王！', 3); G.winT = 2.2; liveTitles(); G.lock = true; for (const o of foes) if (!o.dead && o !== z) kill(o); return; }
  }
  // 升级不弹框：自动加一点生命和伤害，攒一次「修炼」机会（波间结算的修炼页用）
  // 升到下一级要的经验：(14 + 4 × (等级 − 1)) × 1.3（用户：升级慢一些），最高 Lv12
  const need = () => Math.round((14 + 4 * (G.lv - 1)) * DATA.econ.xpMul * (1 - .05 * ML('xp')));
  function addXp(n) {
    n *= hero.xpMul || 1; G.xp += n; G.wx += n;
    while (G.xp >= need() && !hero.dead && G.lv < DATA.econ.maxLv) { G.xp -= need(); G.lv++; RUN.xiu++; G.lvUpT = 2.2; SFX.play('lv'); recompute(); healHero(5); }
  }
  function damageHero(d, dtype = 'phys') {
    if (G.decoyOn || hero.inv > 0 || hero.dead || G.over || G.god || G.ending) return;
    if (hero.rShield) { hero.rShield = 0; hero.inv = .3; nums.push({ x: hero.x, y: hero.y - 44 * K, txt: '护盾抵挡', t: 0, col: '#9fdcff' }); return; }
    if (Math.random() < (hero.eva || 0) + (hero.cyT > 0 ? .15 * OB('canying') : 0)) { nums.push({ x: hero.x, y: hero.y - 44 * K, txt: 'MISS', t: 0, col: '#ffffff' }); if(hero.fx.dodgeMove)hero.cloakT=1.5; return; }   // 11/24 闪避
    if (hero.cyT > 0) { d *= 1 - .2 * OB('canying'); hero.cyT = 0; }   // 残影步：下一次受击减伤
    d *= dtype === 'magic' ? hero.mIn : hero.pIn; { const now = G.t; hero.hitBy = (hero.hitBy || []).filter(h => now - h.t < 1); const src = damageHero.src; if (src && !hero.hitBy.some(h => h.z === src)) hero.hitBy.push({ z: src, t: now }); d *= 1 + .25 * Math.max(0, hero.hitBy.length - 1); }   /* 11/23 被围：1 秒内每多一只不同的怪打到 +25% */ if (hero.cyT > 0) { d *= 1 - .2 * OB('canying'); hero.cyT = 0; } d *= 1 + Math.max(-.3, ((hero.fx && hero.fx.take) || 0)-.08*OB('stone')); if(hero.sacredShield>0){const ab=Math.min(hero.sacredShield,d);hero.sacredShield-=ab;d-=ab;} if (hero.mShield > 0 && d > 0) { const ab = Math.min(hero.mShield, d); hero.mShield -= ab; d -= ab; nums.push({ x: hero.x, y: hero.y - 52 * K, txt: '护盾', t: 0, col: '#9fdcff' }); }   /* 开局护盾 */
    if(d<=0)return; if (JC && d > 0) JC.damaged(); hero.hp -= d; G.taken = (G.taken || 0) + d; hero.inv = .45 + .1 * ML('grit');   /* 韧性 */ hero.hurtT = .25; { const big = d >= hero.maxHp * .15; if (big) G.shake = Math.max(G.shake, .25); UI.FX.hit(big); } nums.push({ x: hero.x, y: hero.y - 44 * K, v: rd(d), t: 0, col: '#ff6a5a' });
    if(d>0&&hero.fx.thorn&&G.t-(hero.thornAt??-99)>=3){hero.thornAt=G.t;const w=DATA.weapons[RUN.weapon],sk={id:w.start||RUN.weapon,xp:0};const power=skillDmg(DATA.skills[sk.id],sk)*1.5;for(const z of foes)if(!z.dead&&dist(z,hero)<50)hurt(z,power,hero,0,sk.id,{extra:true});fx.push({k:'ring',x:hero.x,y:hero.y,t:0,T:.3,r:50});}
    if(hero.hp<=0&&hero.fx.doll&&(RUN.dollUsed||0)<2){RUN.dollUsed=(RUN.dollUsed||0)+1;hero.hp=Math.min(hero.maxHp,10);hero.inv=.5;if(RUN.dollUsed>=2){RUN.gear=RUN.gear.map(o=>o?.id==='doll'?null:o);recompute();}saveRun();UI.feed(RUN.dollUsed>=2?'替身木偶破碎了':'替身木偶挡下致命一击');return;}
    SFX.play("hurt");
    if (hero.hp <= 0 && RUN.save) { RUN.save = false; hero.hp = hero.maxHp * .5; hero.inv = 2; banner('复活羽毛燃尽了！', 1.6); return; }
    if (hero.hp <= 0) { { const k = damageHero.src; G.killer = k && k.type; G.killerElite = !!(k && k.tier); }   // 11/24 记下被谁打死（塔顶台词用）
      hero.hp = 0; hero.dead = true; hero.deadT = 0; G.loseT = 3.6; G.deadR = 0; G.shake = Math.max(G.shake, .45); addEventListener('pointerdown', () => { if (G && hero.dead && G.deadR > .4) G.loseT = 0; }, { once: true }); }
  }

  // 杂兵：走到 reach 内抬手，抬手开始时锁定方向；出招时勇者在扇面（arc / r）里才挨打。弓手保持距离，锁方向后放箭（没有预警线）
  function soldierAI(z, dt) { damageHero.src = z;
    const T = z.T; z.t += dt; z.cd -= dt;
    if (z.flee) { const a = ang(hero, z); z.x += Math.cos(a) * z.sp * 1.6 * K * dt; z.y += Math.sin(a) * z.sp * 1.6 * K * dt / YS; z.moving = true; z.f = Math.cos(a) < 0 ? -1 : 1; return; }
    if(hero.mistT>0&&!T.boss){z.moving=false;return;}
    const d = dist(z, hero), dx = hero.x - z.x, dy = hero.y - z.y, dd = Math.hypot(dx, dy) || 1, reach = T.reach * z.reachMul;
    if (T.summon && (z.sumT -= dt) <= 0) { z.sumT = 7; if (foes.filter(q => !q.dead && q.type === T.summon).length < 8) for (let i = 0; i < 2; i++) { const q = spawn(T.summon, { x: z.x + R(-30, 30) * K, y: z.y + R(-14, 14) * K }); clampG(q); fx.push({ k: 'boom', x: q.x, y: q.y, t: 0, T: .35, r: 16, col: 'dark' }); } }   // 死灵法师：每 7 秒召 2 只骷髅
    if (z.st === 'hurt') { if (z.t > .2) { z.st = 'run'; z.t = 0; } return; }
    if (z.st === 'cwind') { if (z.t > .7) { z.st = 'dash'; z.t = 0; z.x0 = z.x; z.y0 = z.y; z.hitD = false; } return; }   // 冲锋：预警 0.7 秒 → 直线冲
    if (z.st === 'dash') { const p = Math.min(1, z.t / .4), L = T.charge; z.x = z.x0 + Math.cos(z.aim) * L * K * p; z.y = z.y0 + Math.sin(z.aim) * L * K * p / YS; clampG(z, 4 * K);
      if (!z.hitD && dist(z, hero) < 20) { z.hitD = true; damageHero(T.dmg * 1.2 * z.dmgMul, T.dtype); } if (Math.random() < .6) parts.push({ x: z.x, y: z.y, vx: R(-20, 20) * K, vy: R(-20, 0) * K, t: 0, T: .35, col: '#d8c08a', g: 0 });
      if (p >= 1) { z.st = 'rec'; z.t = -.3; } return; }
    if (z.st === 'wind') { if (z.t > T.wind + z.windAdd) { z.st = 'strike'; z.t = 0;
        if (T.bomb) { G.shake = Math.max(G.shake, .2); fx.push({ k: 'boom', x: z.x, y: z.y, t: 0, T: .45, r: T.bomb }); if (d < T.bomb) damageHero(T.dmg * z.dmgMul, T.dtype); z.hp = 0; kill(z); return; }   // 炸弹兵：自爆
        if (T.ranged) shots.push({ k: 'arrow', from: z, look: T.shot, x: z.x + z.f * 8 * K, y: z.y - 18 * K, gy: z.y, vx: Math.cos(z.aim) * T.arrow * K, vy: Math.sin(z.aim) * T.arrow * K / YS, a: z.aim, t: 0, dmg: T.dmg * z.dmgMul, dtype: T.dtype });
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
    const L = foes.filter(z => !z.dead && !z.flee); for (const z of L) z.haste = z.hornT > 0 ? 1.6 : 1;
    for (const a of L) { if (!a.T.aura || a.cc) continue; a.auraT = (a.auraT || 0) - dt;
      if (a.T.aura === 'drum') for (const z of L) if (z !== a && dist(z, a) < 90) z.haste = 1.4;
      if (a.T.aura === 'heal' && a.auraT <= 0) { a.auraT = 4; fx.push({ k: 'ring', x: a.x, y: a.y, t: 0, T: .5, r: 90, col: '#7af07a' });
        for (const z of L) if (dist(z, a) < 90 && !z.T.boss && z.tier !== 'mini' && z.hp < z.maxHp) { const h = Math.ceil(z.maxHp * .2); z.hp = Math.min(z.maxHp, z.hp + h); nums.push({ x: z.x, y: z.y - 30 * K, txt: '+' + h, t: 0, col: '#7af07a' }); } } }
  }
  // 哥布林王：跺地（自身一圈）/ 冲撞（直线）/ 半血以下喊小弟。先画地面预警，再出手
  function bossAI(z, dt) { damageHero.src = z;
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
  const liveProps = () => (G && G.props || []).filter(p => !p.brk && p.hp < 50);
  const propTargets = () => liveProps().map(p => ({ propRef: p, x: p.x, y: p.y, dead: false, hp: p.hp, maxHp: PROP_HP[p.k] || 1, kbx: 0, kby: 0, flash: 0, T: { name: '物件', r: 14, pdef: 0, mdef: 0, ghost: true, hp: p.hp, spd: 0 } }));
  function nearestProp(maxD = 1e9) { let b = null, bd = maxD; for (const p of liveProps()) { const d = dist(p, hero); if (d < bd) { bd = d; b = p; } } return b; }
  function maxReach() { let r = 0; for (let i = 0; i < RUN.open; i++) { const sk = RUN.slots[i]; if (sk && DATA.canEquipCommon(RUN.slots, sk, i)) r = Math.max(r, reach(DATA.skills[JOBS.leaves(sk)[0].id])); } return r; }
  // 优先攻击射程内的可破坏物件（木箱/木桶/战旗/骷髅架），再索敌怪物
  function nearest(maxD = 1e9) { const pr = nearestProp(Math.min(maxD, maxReach())); if (pr) return pr; let b = null, bd = maxD; for (const z of foes) if (!z.dead && !z.flee) { const d = dist(z, hero); if (d < bd) { bd = d; b = z; } } return b; }
  // 熟练度：每本书出手一次 +1，7 格（DATA.prof）；第 2/4/6 格伤害 +10%，第 7 格前摇后摇各快 0.05 秒
  const profL = sk => { if (sk?.job) return 7; let L = 0; for (const n of DATA.prof) if ((sk.xp || 0) >= n) L++; return L; };
  function skillDmg(S, sk) { const L = profL(sk), w = DATA.SYSK[S.sys], f = hero.fx || {}; const bonus = (hero.cs ? hero.cs.mul - 1 : 0) + (f.dmg || 0) + (f.miser?Math.min(.06,Math.floor(RUN.coins/10)*.01):0) + (f.perfect&&hero.hp>=hero.maxHp?f.perfect:0) + (OB('ballistics')&&RUN.oath[0]?.id!=='ballistics'?.2*OB('ballistics'):0) + (f['sdmg_' + w] || 0) + (f.low && hero.hp < hero.maxHp * .3 ? f.low : 0) + (RUN.hero === 'p' && S.sys === '法杖' ? .1 : 0) + .06 * (hero.A[S.type] || 0) + .03 * (G.lv - 1) + (TT().dmg || 0) + .03 * ML('pow') + ((hero.setF || {}).dmg || 0) + (w === RUN.weapon && hero.gx ? hero.gx.wd : 0) + .1 * Math.floor(L / 2) + (G.wi === 0 ? f.firstWave || 0 : 0); return S.dmg * (1 + bonus); }
  // 前摇 / 后摇：敏捷的出手速度一起缩短；断罪一击、穿甲重矢第 3 格蓄力变短
  function skillT(S, sk) { const L = profL(sk), sp = Math.min(1.3, (hero.m.spd || 1) * (1 + ((hero.fx || {})['sspd_' + DATA.SYSK[S.sys]] || 0))); const oil=hero.oilT>0?1.08:1; let wu = S.wu; if (S.charge && L >= 3) wu = S.kind === 'pierce' || sk.id === 'pierce' ? .45 : .5; const cut = L >= 7 ? .05 : 0; return { wu: Math.max(.08, (wu - cut) / Math.min(1.3,sp*oil)), rc: Math.max(.08, (S.rc - cut) / Math.min(1.3,sp*oil)) }; }
  const nextSlot = () => { for (let k = 0; k < RUN.open; k++) { const i = (RUN.si + k) % RUN.open; if (RUN.slots[i]) return i; } return -1; };
  // 射程（像素格）：近战招跟着范围加成一起变大
  const reach = S => (S.rg || 9999) * (S.rg && S.rg < 100 ? hero.m.area : 1) * (1 + ((hero.fx || {})['srng_' + DATA.SYSK[S.sys]] || 0));
  // 轮到的这本够不着就跳过，看下一本；都够不着就不放
  // 11/22 做法 1：够不着照样跳过，但刚放过的那本不能紧接着再放（要么先轮到别的，要么等 0.5 秒），远程招不会被连刷
  const readySlot = () => { const t = nearest(); if (!t) return -1; const d = dist(t, hero), n = RUN.slots.slice(0, RUN.open).filter(Boolean).length;
    for (let k = 0; k < RUN.open; k++) { const i = (RUN.si + k) % RUN.open, sk = RUN.slots[i]; if (!sk || !DATA.canEquipCommon(RUN.slots,sk,i) || d > reach(DATA.skills[JOBS.leaves(sk)[0].id])) continue;
      if (n > 1 && i === hero.lastI && G.t - (hero.lastT || 0) < .5) return -1; return i; } return -1; };
  const HWPN = { sword: 'sword', spear: 'spear', bow: 'bow', staff: 'staff', gun: 'bow', common: 'sword', tome:'staff', scythe:'sword' };
  // 技能栏 1→2→3 严格轮流（空格子跳过），没有各自冷却：前摇（能走；翻滚 = 这招作废）→ 出手 → 占时型持续 → 后摇（站定；翻滚取消）
  // 11/21：够不着的招跳过（readySlot）；两招之间空 0.18 秒（hero.gap），这段时间正常跑
  function weapon(dt) {
    for (let i = pend.length - 1; i >= 0; i--) { pend[i].t -= dt; if (pend[i].t <= 0) { pend[i].fn(); pend.splice(i, 1); } }
    if (hero.dead) return;
    let c = hero.cs;
    if (!c && G.ready > 0) return;
    if (!c) { if (hero.gap > 0) { hero.gap -= dt; return; } const i = hero.sequence ? hero.sequence.i : readySlot(); if (i < 0) return; const book = RUN.slots[i]; if (!hero.sequence || hero.sequence.book !== book) hero.sequence = { book, i, index: 0, release: { targets: new Set(), firstHit: false } }; const seq = hero.sequence, sk = JOBS.leaves(book)[seq.index], S = DATA.skills[sk.id], T = skillT(S, sk); c = hero.cs = { i, sk, S, book, ph: 'wu', t: 0, dur: T.wu, rc: T.rc, a: aimNow(), mul: 1, cr: 0, ar: 0 }; faceTo(c.a); c.career = JC.begin(book, sk, seq.index, seq.release, c.a);
      if (!seq.counted) { G.castN = (G.castN || 0) + 1; seq.counted = true; } if (OB('sanji') && G.castN % 3 === 0) c.mul += .4 * OB('sanji');
      if (OB('jingshou') && hero.stillT >= 1) { c.mul += .25 * OB('jingshou'); hero.stillT = 0; }
      if (OB('fanji') && hero.afterRoll > 0) { c.cr = .3 * OB('fanji'); c.ar = .2 * OB('fanji'); hero.afterRoll = 0; }
      if(seq.index===0){const fam=JOBS.family(c.S);hero.sameCount=hero.lastFamily===fam?(hero.sameCount||1)+1:1;hero.lastFamily=fam;}if(OB('momentum'))c.mul+=.1*OB('momentum')*Math.min(3,Math.max(0,(hero.sameCount||1)-1));
      if (OB('xianfeng') && (G.stT || 0) < 10) c.mul += .2 * OB('xianfeng'); if (hero.lzT > 0) c.mul += .12 * OB('lianzhan');
      if (seq.index === 0) { if (hero.instant) { c.dur *= 1 - Math.min(.5, hero.instant); hero.instant = 0; } seq.bonus = { mul: c.mul, cr: c.cr, ar: c.ar }; } else Object.assign(c, seq.bonus); }
    c.t += dt;
    if (c.ph === 'wu') { c.a = aimNow(c.a); if (!hero.moving) faceTo(c.a); if (c.t < c.dur) return; faceTo(c.a);
      const L = profL(c.sk), a0 = hero.m.area; c.career.color=hero.jobColor; hero.m.area = Math.min(1.25, hero.m.area * (1 + ((hero.fx || {})['sarea_' + DATA.SYSK[c.S.sys]] || 0))) * (1 + (c.ar || 0)) * (1 + JC.range(c.career)); if (c.S.dt === 'magic' && hero.lensReady) { hero.m.area *= 1.15; hero.lensReady = false; } hero.castCrit = c.cr || 0; const r = SK.cast({ S: c.S, sk: c.sk, L, d: skillDmg(c.S, c.sk), bonus: c.S.dmg ? skillDmg(c.S, c.sk) / c.S.dmg - 1 : 0, a: c.a, sid: c.sk.id, career: c.career }); hero.m.area = a0;
      if(!r){hero.cs=null;hero.sequence=null;RUN.si=(c.i+1)%RUN.open;hero.gap=.18;return;}   // 场上没敌人了：不放，等下一个敌人
      c.released = true; c.career.a = c.a;
      { const w = c.S.w; SFX.play(w === 'gun' ? 'arrow' : w === 'bow' ? 'arrow' : w === 'staff' ? 'magic' : 'swing'); if (w === 'sword' || w === 'spear') { G.kx = Math.cos(c.a) * 3; G.ky = Math.sin(c.a) * 2; } }   // 11/24 出招声 + 镜头后坐
      c.sk.xp = Math.min(DATA.prof[6], (c.sk.xp || 0) + (c.S.w === RUN.weapon && (RUN.eq.main.t || 1) === 1 ? 1.1 : 1)); if (profL(c.sk) > L) { nums.push({ x: hero.x, y: hero.y - 52 * K, txt: `${c.S.name} 熟练度 ${profL(c.sk)}/7`, t: 0, col: '#ffd86a' }); }
      if (r !== true && r.hold) { c.ph = 'hold'; c.t = 0; c.dur = r.hold; c.move = r.move || 1; return; }
      c.ph = 'rc'; c.t = 0; c.dur = c.rc; return; }
    if (c.ph === 'hold') { if (c.t >= c.dur) { SK.chEnd(); c.ph = 'rc'; c.t = 0; c.dur = c.rc; } return; }
    if (c.ph === 'rc' && c.t >= c.dur) endCast(true);
  }
  function endCast(complete = false) {
    const c = hero.cs; if (!c) return; hero.castCrit = 0; if (c.ph === 'hold') SK.chEnd();
    if (c.released) JC.end(c.career);
    const seq = hero.sequence;
    if (complete && c.released && seq && RUN.slots[c.i] === seq.book) {
      seq.index++;
      if (seq.index < JOBS.leaves(seq.book).length) { hero.cs = null; hero.gap = .18; return; }
      if (seq.book.job && !seq.book.job.final) seq.book.job.progress = Math.min(JOBS.PROGRESS_MAX, (seq.book.job.progress || 0) + 1); if (seq.book.job) saveRun();
    }
    hero.sequence = null; hero.lastI = c.i; hero.lastT = G.t; RUN.si = (c.i + 1) % RUN.open; hero.cs = null; hero.gap = .18;
  }
  function aimNow(a0) { const t = nearest(); return t ? ang(hero, t) : (a0 != null ? a0 : (hero.f < 0 ? PI : 0)); }
  function faceTo(a) { hero.f = Math.cos(a) < 0 ? -1 : 1; }
  // 给 skills.js 用的接口
  let SK = null, ESK = null, JC = null;   // 11/24 ESK = 精英招式（js/eskill.js）
  // 11/24 技能也能打到小咕噜：给技能看的敌人列表里多一个替身，打中就掉钱逃跑（不会死）
  const TP = { thiefP: 1, dead: false, hp: 1e9, maxHp: 1e9, kbx: 0, kby: 0, flash: 0, T: { name: '小咕噜', r: 10, pdef: 0, mdef: 0, ghost: true, hp: 1, spd: 0 } };
  function thiefHit() { const T = G && G.thief; if (!T || T.hurt > 0) return; T.hurt = .4; if (T.bag) { G.gc.push({ x: T.x, y: T.y, v: T.bag, t: 0, h: 0, vh: 110, vx: 0 }); UI.feed(`打中小咕噜！${T.bag} 铜钱掉了出来`); RUN.thief = (RUN.thief || 0) + 1; T.bag = 0; } T.st = 'run'; T.n = 9; }
  const API = { K, YS, PI, now: () => G.t, clamp: o => clampG(o), hero: () => hero, character: () => RUN.hero, foes: () => { const pt = propTargets(), th = G && G.thief && G.thief.hurt <= 0 ? (TP.x = G.thief.x, TP.y = G.thief.y, [TP]) : []; return pt.length || th.length ? foes.concat(pt, th) : foes; }, ang, aimNow, face: faceTo, moveDir: () => moveDir(), spinFace: () => { hero.f = Math.floor(G.t * 12) % 2 ? 1 : -1; },
    hurt: (z, d, from, kb, sid, o) => hurt(z, d, from, kb, sid, o), fx: o => fx.push(o), tele: o => tele.push(Object.assign({ mine: true }, o)), shake: v => { G.shake = Math.max(G.shake, v); },
    mark: (kind,z,c) => {const result=JC.mark(kind,z,c?.career);if(c?.career)JC.hit(c.career,z,{});return result;}, detonate: (kind,z,c) => JC.detonate(kind,z,c?.career),
    summon: z=>JC.summon(z), drain: n=>{hero.hp=Math.max(1,hero.hp-n);},
    shield: (n,T)=>{hero.sacredShield=n;hero.sacredShieldT=T;},cleanse:()=>{ESK?.cleanse();hero.rootT=0;},
    heal: n => healSkill(n), healHero: n => healSkill(n),
    push: (z, a, d) => { if (z.T.boss) return; const k = z.tier === 'mini' ? 0 : z.tier === 'elite' ? .5 : 1; z.x += Math.cos(a) * d * k * K; z.y += Math.sin(a) * d * k * K / YS; clampG(z, 4 * K); },
    pull: (z, p, v, dt) => { const a = Math.atan2((p.y - z.y) * YS, p.x - z.x), d = Math.hypot(p.x - z.x, (p.y - z.y) * YS) / K, m = Math.min(d, v * dt); z.x += Math.cos(a) * m * K; z.y += Math.sin(a) * m * K / YS; clampG(z, 4 * K); },
    fireball: (x, y, T, r, cb) => shots.push({ k: 'fire', x, y, t: 0, T, r, cb }) };
  const jobTraces = [];
  const JOB_API = { K, YS, skillDamage:skillDmg, hero: () => hero, run: () => RUN, g: () => G, foes: () => foes, ang,
    hurt: (...args) => hurt(...args), status, oath:OB,heal:healSkill,summon:(z,opts)=>SK.summon(z,opts), fx: o => fx.push(o), shot: p => SK.extraShot(p),
    moveAngle: () => { const [x,y] = moveDir(); return x || y ? Math.atan2(y,x) : hero.f < 0 ? PI : 0; },
    push: (z, a, d) => API.push(z, a, d), trace: p => jobTraces.push({ ...p, t: 1, hit: new Set() }) };
  function shotTick(dt) {
    for (let i = jobTraces.length - 1; i >= 0; i--) { const p = jobTraces[i]; p.t -= dt; const dx = p.to.x - p.from.x, dy = (p.to.y - p.from.y) * YS, len = dx * dx + dy * dy || 1; for (const z of foes) if (!z.dead && !p.hit.has(z)) { const t = Math.max(0, Math.min(1, ((z.x - p.from.x) * dx + (z.y - p.from.y) * YS * dy) / len)); if (Math.hypot(z.x - p.from.x - dx * t, (z.y - p.from.y) * YS - dy * t) < 16 * K) { p.hit.add(z); hurt(z, 3, p.from, 0, p.sid, { extra: true, jobExtra: true, dt: 'magic' }); } } fx.push({ k: 'line', x: p.from.x, y: p.from.y, a: Math.atan2(dy, dx), L: Math.sqrt(len) / K, w: 4, t: 0, T: .08, col: p.element === 'fire' ? '#ff9a50' : p.element === 'ice' ? '#8ad8ff' : '#fff6a0' }); if (p.t <= 0) jobTraces.splice(i, 1); }

    for (let i = shots.length - 1; i >= 0; i--) {
      const o = shots[i]; o.t += dt;
      if (SK.interceptShot(o,dt)) { shots.splice(i,1); continue; }
      if (o.k === 'arrow') { o.x += o.vx * dt; o.y += o.vy * dt; o.gy += o.vy * dt;
        if (Math.hypot(hero.x - o.x, (hero.y - o.gy) * YS) / K < 9) { damageHero.src = o.from || null; damageHero(o.dmg, o.dtype); shots.splice(i, 1); continue; }
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
        shots.splice(i, 1); fx.push({ k: 'boom', x: o.x, y: o.y, t: 0, T: .4, r: o.r }); burns.push({ x: o.x, y: o.y, r: o.r * .8, t: 0, T: 1.2 });
        if (o.cb) o.cb(); else for (const z of foes) if (!z.dead && dist(z, o) < o.r) hurt(z, o.dmg, o, 18, o.sid);
        for (let j = 0; j < 14; j++) { const a = R(0, PI * 2); parts.push({ x: o.x, y: o.y - 4 * K, vx: Math.cos(a) * R(30, 80) * K, vy: (Math.sin(a) * 30 - R(30, 70)) * K, t: 0, T: R(.3, .6), col: ['#fff2a0', '#ffb040', '#ff6020', '#a03010'][j % 4], g: 140 * K, sz: j % 3 ? 1 : 2 }); }
      }
    }
  }

  // ---------- 站与波次 ----------
  // 一站 3 波，每波固定 30 秒（不再有清场）。怪分 5 批出（0 / 15% / 30% / 45% / 60% 时），每只出现前地上先亮 0.55 秒的圈。
  // 场上打光了就提前出下一批；全出完还没到时间，就一直零星补哥布林，场上不空。时间到：剩下的怪逃走。首领波不限时。
  const STN = () => DATA.stations[G.st - 1], ITEMS = () => DATA.itemPool(RUN);
  function careerReminder() {
    if(!window.CAMP?.careerReady?.())return;
    document.getElementById('careerReminder')?.remove();const info=CAMP.careerInfo?.();if(!info)return;
    const card=document.createElement('div');card.id='careerReminder';const phone=matchMedia('(max-width:760px), (pointer:coarse)').matches;
    card.style.cssText='position:fixed;z-index:140;left:50%;top:42%;transform:translate(-50%,-50%);width:min(420px,88vw);box-sizing:border-box;padding:14px 16px;text-align:center;color:#fff2c7;background:linear-gradient(135deg,#21172aee,#44321dee);border:2px solid #e8bd65;box-shadow:0 6px 28px #0009;font:14px Pix,monospace;cursor:pointer';
    const img=document.createElement('img');img.src=info.crest;img.alt='';img.style.cssText='width:52px;height:52px;image-rendering:pixelated;object-fit:contain;display:block;margin:0 auto 7px';
    const title=document.createElement('b');title.textContent='✦ 可以转职了！✦';const desc=document.createElement('div');desc.textContent=info.label;desc.style.cssText='margin:8px 0;color:#ffe08a';
    const tip=document.createElement('small');tip.textContent=phone?'点右上角暂停，点「转职」':'按 P 打开备战页，点「转职」';
    card.append(img,title,desc,tip);img.onerror=()=>img.remove();card.onclick=()=>card.remove();document.body.appendChild(card);setTimeout(()=>card.remove(),3000);
  }  function nextWave() {   // 进下一站（第 1 段）；站打完 → 路线卡
    RUN.dmgW = {};
    if (G.wi >= STN().waves.length - 1) return stationEnd();
    applyStationMap(); G.wi = -1; Object.assign(G, { firstArm: true, wk: 0, wx: 0, wElite: 0, wMini: 0, drops: [], gi: [], gc: [], stT: 0, purseBreak: false, thief: null, cf: 0, maxCombo: 0, cleared: false, endT: null, timeout: false });
    if (G.st > 1 && (RUN.cryStn || 1) < G.st) { RUN.cryStn = G.st; addCrystal(2 + G.st, hero.x, hero.y); } saveRun();   /* 每站只给一次，续关 / 重进不重复给 */ nextPhase(); G.ready = 2.2; hero.cs = null; hero.sequence = null; banner(G.W.boss ? '首领战！' : `第 ${G.st} 站 · ${MAP.name || ''}${MAP.wx ? ' · ' + MAP.wx : ''}`, 2); G.paused = false;   // 11/25 开战前 2 秒准备：不刷怪、不出招
  }
  // 11/22 一站内换段：不停顿、不结算，只换一批怪并加压（击杀 / 经验 / 掉落一直累计到站末）
  function nextPhase() {
    G.wi++; G.wave++; const W = STN().waves[G.wi], PT = DATA.phaseT[G.st - 1] || [30, 30, 30]; if(G.wi===0)careerReminder();
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
      if (hit || p.t >= p.T) { const o = hit || p.orbs[Math.random() * p.orbs.length | 0]; p.done = o; p.t2 = 0; toastMsg(doEvent(o.k)); for (let k = 0; k < 20; k++) { const an = R(0, PI * 2); parts.push({ x: o.x, y: o.y, vx: Math.cos(an) * 60 * K, vy: Math.sin(an) * 60 * K, t: 0, T: .6, col: o.c, g: 0 }); } }
    } else if ((p.t2 += dt) > 1.2) { G.pr = null; nextPhase(); }
  }
  function princessDraw() {
    const p = G.pr; if (!p) return; const fade = p.done ? Math.max(0, 1 - p.t2 / 1.2) : Math.min(1, p.t / .6);
    ctx.save(); ctx.globalAlpha = fade;
    const gl = ctx.createRadialGradient(X(p.x), Y(p.y) - 20 * u, 0, X(p.x), Y(p.y) - 20 * u, 40 * u); gl.addColorStop(0, 'rgba(220,190,255,.55)'); gl.addColorStop(1, 'rgba(220,190,255,0)'); ctx.fillStyle = gl; ctx.fillRect(X(p.x) - 40 * u, Y(p.y) - 60 * u, 80 * u, 80 * u);

    if (p.t < 1.1) { const k = p.t / 1.1, r = (10 + 70 * k) * u; ctx.strokeStyle = `rgba(230,210,255,${.8 * (1 - k)})`; ctx.lineWidth = 3 * u * (1 - k) + u; ctx.beginPath(); ctx.ellipse(X(p.x), Y(p.y), r, r / YS, 0, 0, 7); ctx.stroke(); }
    if (!p.done && p.t < 3.2) {   // 对话气泡
      const tx = '勇者，收下这个！', fs = Math.round(7 * u); ctx.font = `${fs}px WenKai, Pix, serif`; const w = ctx.measureText(tx).width + 8 * u, bx = X(p.x) - w / 2, by = Y(p.y) - 64 * u;
      ctx.fillStyle = 'rgba(250,244,230,.95)'; ctx.fillRect(bx, by, w, fs + 6 * u); ctx.fillStyle = '#3a2814'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(tx, X(p.x), by + 3 * u);
    }
    for (const o of p.orbs) { if (p.done && p.done !== o) continue; const ox = X(o.x), oy = Y(o.y) - 13 * u, r = 13 * u; ctx.fillStyle = 'rgba(30,15,5,.4)'; ctx.beginPath(); ctx.ellipse(ox, Y(o.y) + 2 * u, 12 * u, 3.5 * u, 0, 0, 7); ctx.fill();
      const g2 = ctx.createRadialGradient(ox, oy, 0, ox, oy, r * 1.8); g2.addColorStop(0, o.c + 'cc'); g2.addColorStop(1, o.c + '00'); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(ox, oy, r * 1.8, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(20,14,30,.75)'; ctx.beginPath(); ctx.arc(ox, oy, r, 0, 7); ctx.fill(); ctx.strokeStyle = o.c; ctx.lineWidth = u; ctx.stroke();
      if (o.im.complete && o.im.naturalWidth) { const sz = r * 1.4; ctx.drawImage(o.im, ox - sz / 2, oy - sz / 2, sz, sz); } if (!p.done && o.st > 0) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.arc(ox, oy, r + 3 * u, -PI / 2, -PI / 2 + PI * 2 * Math.min(1, o.st / .7)); ctx.stroke(); }
      if (!p.done) { ctx.font = `${Math.round(6 * u)}px WenKai, Pix, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineWidth = 2 * u; ctx.strokeStyle = '#1a1008'; ctx.strokeText(o.n, ox, oy + r + 2 * u); ctx.fillStyle = '#fff3d0'; ctx.fillText(o.n, ox, oy + r + 2 * u); } }
    if (!p.done) { const left = Math.ceil(p.T - p.t); ctx.font = `${Math.round(6 * u)}px WenKai, Pix, serif`; ctx.fillStyle = '#e6d4ff'; ctx.textAlign = 'center'; ctx.fillText(`走过去拿一个（${left}）`, X(p.x), Y(p.y) + 64 * u); }
    ctx.restore();
  }

  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function spawner(dt) {
    if (G.winT != null || !G.waveOn) return;
    if (G.ready > 0) { G.ready -= dt; return; }
    if (G.pr) return princessTick(dt);   // 公主现身期间：不刷怪、不计时
    const alive = foes.filter(z => !z.dead && !z.flee && !z.T.boss);
    if (G.W.boss) {   // 首领波：王出场，旁边零星补哥布林
      if (G.bossT != null && (G.bossT -= dt) <= 0) { G.bossT = null; bossIn(); }
      if (G.bossOut && (G.trickle -= dt) <= 0 && alive.length < 8) { G.trickle = 5; for (let i = 0; i < 2; i++) warnSpawn({ type: Math.random() < .6 ? 'goblin' : 'gob_blade' }); }
      return;
    }
    G.wt += dt;
    if (G.endT != null) { if ((G.endT -= dt) <= 0) { if (G.paused) return; if ((G.gc.length || G.gi.length) && (G.abs = (G.abs || 0) + dt) < 3) { for (const c of G.gc) c.pull = 1; for (const o of G.gi) o.pull = 1; return; }   /* 11/25 地上的东西先全部吸到人物身上，再结算、公主才出现 */ G.abs = 0; G.waveOn = false; waveEnd(); } return; }
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
  const warnDuration = w => (w.tier || DATA.enemies[w.type].boss ? 1.5 : .55);
  function warnSpawn(o) { const p = spawnPos(); warns.push(Object.assign({ x: p.x, y: p.y, t: 0 }, o)); }
  function warnTick(dt) {
    for (let i = warns.length - 1; i >= 0; i--) { const w = warns[i]; w.t += dt; if (w.t >= warnDuration(w)) { warns.splice(i, 1); const z = spawn(w.type, w, w.tier); if (w.routeElite) z.routeElite = true; if (!w.tier && !DATA.enemies[w.type].boss && Math.random() < .15 * HT('mob')) spawn(w.type);   /* 热度：怪物数量 +15%/级 */ } }
  }
  // 一波结算：铜钱、经验、回血、战利品（固定书、精英 / 小头目掉落）
  function waveEnd() {
    G.paused = true; foes = foes.filter(z => !z.flee); if (hero.cs) { if (hero.cs.ph === 'hold') SK.chEnd(); hero.cs = null; } SK.reset(); hero.sequence = null; const E = DATA.econ, fx = hero.fx, cl = G.cleared && !G.timeout;
    const cw = Math.round((E.waveCoin[0] + E.waveCoin[1] * (G.st - 1) + (cl ? E.clear : 0) + (fx.waveCoin || 0)) * (1 + (fx.coinMul || 0)) * (G.route === 'elite' ? 1.5 : 1) * (RUN.coinBoost ? 1.3 : 1));
    { const left = G.gc.reduce((a, c) => a + c.v, 0) + (G.thief ? G.thief.bag : 0), st = Math.round(left * .2);   // 站末：地上没捡的铜钱帮你收回，咕噜顺走 20%
      if (left) { RUN.coins += Math.round((left - st) * cMul()); UI.feed(st ? `地上还剩 ${left} 铜钱，帮你捡了回来……被小咕噜顺走了 ${st}` : `地上的 ${left} 铜钱帮你捡了回来`); } G.gc = []; G.thief = null; for (const o of G.gi) G.drops.push({ kind: o.kind, id: o.id }); G.gi = [];
      const cb = Math.floor((G.maxCombo || 0) / 10) * 2; if (cb) { RUN.coins += cb; UI.feed(`最高连击 ${G.maxCombo}，奖励 ${cb} 铜钱`); } G.maxCombo = 0; }
    if (fx.interest) { const it = Math.min(Math.round(fx.icap), Math.floor(RUN.coins * fx.interest)); if (it > 0) { RUN.coins += it; UI.feed(`存钱罐：利息 ${it} 铜钱`); } }
    RUN.coins += cw; if (G.wi === STN().waves.length - 1) { RUN.coinBoost = 0; RUN.noThief = 0; }
    const xp0 = G.xp, lv0 = G.lv; addXp(E.waveXp + G.st + Math.floor(G.wk / E.xpPerKills) + G.wElite * E.xpElite + G.wMini * E.xpMini + (cl ? E.xpClear : 0));
    healHero(E.waveHeal + hero.maxHp * (fx.waveHeal || 0));
    RUN.xopt = null; RUN.xrr = 0; RUN.shop = null; RUN.rr = 0;
    // 掉书只从还没拿到的书里抽（11/21 定）；全拿到了就换成铜钱
    const own = ownBooks(), ids = DATA.bookPool(own, G.st, G.drops.some(d => d.kind === 'book')), pick = a => a[Math.random() * a.length | 0], loot = [];
    const book = false;   // v2：技能书来自固定中场精英，不再按波次保底
    const pickNew = () => { for (let i = 0; i < 6; i++) { const b = randBook(1); if (b && !loot.some(o => o.id === b)) return b; } const f = ids.filter(i => !loot.some(o => o.id === i)); return pick(f.length ? f : ids); };   // 同一次结算不掉两本一样的，同系仅略微加权
    if (book) loot.push(ids.length ? { kind: 'book', id: pickNew() } : { kind: 'use', id: 'meat' });
    for (const d of G.drops) { if (d.kind === 'manual') { loot.push({ kind: 'manual', id: d.id }); continue; } if (d.kind === 'use') { loot.push({ kind: 'use', id: d.id || 'meat' }); continue; } const pool = ITEMS(); if (d.kind !== 'book' && !pool.length) { RUN.coins += 20; continue; } loot.push(d.kind === 'book' && ids.length ? { kind: 'book', id: pickNew() } : { kind: 'item', id: pick(pool)?.id }); }
    if (!loot.length && Math.random() < .3) loot.push({ kind: 'use', id: 'meat' });
    const last = G.wi === STN().waves.length - 1 || !!(STN().waves[G.wi + 1] || {}).boss;
    gearDrop();
    fieldEnd(loot, cw);   // 11/22 站末留在战场：捡掉落、找公主修炼、找地精商人、走进门
  }
  // ---------- 11/22 站末在战场上结算（哈迪斯式）：掉落在地上走过去捡；公主在中间，靠近她跳 3 个修炼光球 + 1 颗刷新水晶；地精商人；三扇门 ----------
  const IMG = {}; const img = n => IMG[n] || (IMG[n] = Object.assign(new Image(), { src: 'art/ui2/' + n + '.png' }));
  // 11/25 站末自动掉装备 / 附魔石（直接进装备栏的物品栏，弹提示）
  function gearDrop() { gs(); const st = G.st, tier = st <= 3 ? 1 : st <= 6 ? 2 : 3, got = [], P = a => a[Math.random() * a.length | 0], stone = t => { RUN.stones[t]++; got.push(DATA.stoneNames[t] + '附魔石'); };
    if (Math.random() < .6) stone(1); if (st >= 3 && Math.random() < .35) stone(2); if (st >= 6 && Math.random() < .25) stone(3);
    if (Math.random() < .5 && RUN.gbag.length < 16) {
      const best = Math.max(RUN.eq.main.t || 1, ...RUN.gbag.filter(x => x.k === 'w').map(x => x.t));
      if (tier > best && Math.random() < .35) { RUN.gbag.push(DATA.makeWeapon(RUN,tier)); got.push(DATA.weaponNames[RUN.weapon][tier - 1]); }
      else { const id = P(Object.keys(DATA.gear).filter(k => !(DATA.gear[k].sword && RUN.weapon !== 'sword'))), t = Math.max(1, tier - (Math.random() < .5 ? 1 : 0)); RUN.gbag.push({ k: 'g', id, t }); got.push(DATA.gear[id].names[t - 1]); } }
    if (got.length) UI.feed('获得：' + got.join('、') + '（装备页 · 物品栏）');
    const free = 16 - RUN.gbag.length; if (free <= 2) UI.feed(free > 0 ? `装备物品栏快满了，只剩 ${free} 格` : '装备物品栏已满，新装备拿不了了'); }
  function fieldEnd(loot) {
    for (const o of [...RUN.bag, ...RUN.gear]) if (o) delete o.fresh;   // 站末：「新拿到」标记清掉
    G.paused = false; G.waveOn = false; const g = MAP.ground, cy = (g.y0 + g.y1) / 2 - 10 * K, [gl, gr] = ground(cy), cx = (gl + gr) / 2, ly = cy + 88 * K, n = loot.length;   // 11/23 位置按地图固定
    G.fe = { t: 0, items: loot.map((o, i) => Object.assign({ x: cx + (i - (n - 1) / 2) * 30 * K, y: ly, st: 0 }, o)),
      pr: { x: cx, y: cy, near: 0, orbs: null, cr: null, said: 0, arm: dist(hero, { x: cx, y: cy }) > 40 }, mer: { x: gl + 40 * K, y: cy + 10 * K, st: 0 }, doors: [], warn: 0, careerGlyph: CAMP?.careerReady?.() ? { x: cx - 34*K, y: cy + 54*K } : null };
    if (G.st === 1) G.fe.sign = { x: cx + ((n - 1) / 2 + 1.6) * 30 * K, y: ly + 6 * K };
    stationEnd();
  }
  const PCV = new Map(); function portalCv(d) { let c = PCV.get(d); if (!c) { c = document.createElement('canvas'); c.width = 40; c.height = 52; PCV.set(d, c); } return c; }
  function setDoors(cards, pick) { const f = G.fe, n = cards.length, cx = f.pr.x, y = MAP.ground.y0 + 4 * K; f.doors = cards.map((c, i) => ({ c, x: cx + (i - (n - 1) / 2) * 110 * K, y, st: 0 })); f.pick = pick; }
  const SKUL = (o, r) => Math.hypot(o.x - hero.x, (o.y - hero.y) * YS) < r * K;
  function xiuOrbs() { const P = G.fe.pr, L = CAMP.rollXiu(3 + (hero.fx.xiuOpt || 0)); P.orbs = L.map((o, i) => Object.assign({ x: P.x + (i - (L.length - 1) / 2) * 40 * K, y: P.y + 40 * K, st: 0 }, o)); P.cr = P.cr || { x: P.x + (L.length / 2 + .6) * 40 * K, y: P.y + 40 * K, st: 0, n: 0 }; }
  // 11/22 不打仗的门：宝箱 / 篝火 / 特价商人在原地演出（奇遇还是弹卡片）
  function fieldRest(k) {
    const f = G.fe, [, gr0] = ground(f.pr.y), x = gr0 - 70 * K, y = f.pr.y; f.doors = [];   // 11/23 休整和奇遇一样摆在右边
    if (k === 'shop') { RUN.shop = null; RUN.rr = 0; f.mer2 = { x, y, st: 0 }; return showRoute(true); }
    if (k === 'event') { const g = MAP.ground, [, gr] = ground(f.pr.y), used = RUN.evUsed || (RUN.evUsed = []), L = DATA.events.filter(e => !used.includes(e.id)), E = (L.length ? L : DATA.events)[Math.random() * (L.length || DATA.events.length) | 0]; used.push(E.id);
      const ex = gr - 70 * K, ey = f.pr.y; f.rest = { k: 'ev', E, x: ex, y: ey, st: 0, t: 0 };
      const P = E.cups ? [['左边的杯子', 'cup'], ['中间的杯子', 'cup'], ['右边的杯子', 'cup']] : (E.pl || []);
      f.rest.pl = [...P, ['离开', 'leave']].map((p, i, A) => ({ t: p[0], fx: p[1], need: p[2], x: ex - 50 * K + (i % 2) * 100 * K + (A.length % 2 && i === A.length - 1 ? 50 * K : 0), y: ey + 52 * K + Math.floor(i / 2) * 50 * K, st: 0, lock: 1 }));
      if (E.merchant) f.rest.pl = [{ t: '离开', fx: 'leave', x: ex, y: ey + 52 * K, st: 0, lock: 1 }];
      toastMsg(`奇遇：${E.name}`); return; }
    f.rest = { k, x, y, st: 0, t: 0 };
    if (k === 'chest') toastMsg('路边有个宝箱，走过去打开');
  }
  function evOk(need) { const bagB = RUN.bag.filter(x => x && x.kind === 'book' && !x.job), eqO = [...RUN.oath, ...RUN.mv].filter(Boolean);
    switch (need) { case 'hasItem': return [...RUN.gear, ...RUN.bag].some(x => x && x.kind === 'item'); case 'bagBook': return bagB.length > 0; case 'c20': return RUN.coins >= 20; case 'cSpin': { const r = G.fe && G.fe.rest; return !!r && !r.broke && (r.n || 0) < 3 && RUN.coins >= ARC_P[r.n || 0]; }
      case 'anyOath': return [...eqO, ...RUN.bag.filter(x => x && x.kind === 'oath')].length > 0; case 'c40oath': return RUN.coins >= 40 && eqO.some(o => o.lv < 5);
      case 'tierBook': return bagB.some(b => JOBS.skills(RUN).some(s => s && DATA.skills[s.id].tier === DATA.skills[b.id].tier && profL(s) < 7)); }
    return true; }
  function evRun(fx) {
    const give = o => { CAMP.learn(o, true); gotFeed(o); }, oaths = DATA.oathPool(RUN), rOath = () => oaths[Math.random() * oaths.length | 0], bagB = RUN.bag.filter(x => x && x.kind === 'book' && !x.job), take = x => { const i = RUN.bag.indexOf(x); if (i >= 0) RUN.bag[i] = null; else { const g = RUN.gear.indexOf(x); if (g >= 0) RUN.gear[g] = null; else for (const A of [RUN.oath, RUN.mv]) { const k = A.indexOf(x); if (k >= 0) A[k] = null; } } };
    const pick = L => L[Math.random() * L.length | 0];
    switch (fx) {
      case 'fItem': { const L = [...RUN.bag, ...RUN.gear].filter(x => x && x.kind === 'item'), x = L[0]; take(x); recompute(); give({ kind: 'item', id: pick(ITEMS().filter(i => i.id !== x.id)).id }); return '泉水咕嘟一声，吐出了另一件宝物。'; }
      case 'fBook': { const b = pick(bagB), T = DATA.skills[b.id].tier, own = ownBooks(), L = Object.keys(DATA.skills).filter(id => DATA.skills[id].tier === T && !own.has(id)); take(b); if (!L.length) { RUN.coins += 30; return '没有同品阶的新书了，泉水还你 30 铜钱。'; } give({ kind: 'book', id: pick(L) }); return '泉水里浮上来一本新书。'; }
      case 'fCoin': RUN.coins -= 20; healHero(hero.maxHp * .4); return '回复了 40% 生命。';
      case 'kHeal': hero.hp = Math.max(1, hero.hp - hero.maxHp * .15); CAMP.learn({ kind: 'oath', id: rOath() }, true); return '骑士把胸前的誓约印记交给了你。';
      case 'kTake': { const W = ITEMS().filter(i => i.w), it = pick(W.length ? W : ITEMS()); give({ kind: 'item', id: it.id }); RUN.luck = Math.max(-5, (RUN.luck || 0) - 1); return '你拿走了他的宝物……幸运 −1。'; }
      case 'cup': RUN.coins -= 20; if (Math.random() < 1 / 3) { addCrystal(3, hero.x, hero.y); const id = randBook(); if (id) { give({ kind: 'book', id }); return '猜中了！咕噜不情愿地递来一本书。'; } give({ kind: 'item', id: pick(ITEMS()).id }); return '猜中了！得到一件宝物。'; } return '没猜中。咕噜把 20 铜钱揣进了兜里。';
      case 'rHand': if (Math.random() < .5) { const id = randBook(3); if (id) { give({ kind: 'book', id }); return '摸出一本技能书！'; } } hero.hp = Math.max(1, hero.hp - hero.maxHp * .2); return '被乱码咬了一口，掉了 20% 生命。';
      case 'rBook': take(pick(bagB)); CAMP.learn({ kind: 'oath', id: rOath() }, true); return '技能书被裂缝吞掉，吐出一个誓约印记。';
      case 'rOath': { const L = [...RUN.bag.filter(x => x && x.kind === 'oath'), ...[...RUN.oath, ...RUN.mv].filter(Boolean)]; take(L[0]); recompute(); const id = randBook(); if (id) give({ kind: 'book', id }); else RUN.coins += 30; return '誓约印记被吞掉，裂缝里掉出一本书。'; }
      case 'kidSave': RUN.coinBoost = 1; RUN.noThief = 1; return '小哥布林跑了。下一站小咕噜不会来，铜钱 +30%。';
      case 'kidRob': RUN.coins += 25; RUN.robElite = 1; return '你抢走了 25 铜钱。远处传来愤怒的吼叫……';
      case 'aBlood': RUN.hpCut = Math.min(.5, (RUN.hpCut || 0) + .1); recompute(); { const id = rOath(), has = [...RUN.oath, ...RUN.mv, ...RUN.bag].find(x => x && x.kind === 'oath' && x.id === id); CAMP.learn({ kind: 'oath', id }, true); const h = [...RUN.oath, ...RUN.mv, ...RUN.bag].find(x => x && x.kind === 'oath' && x.id === id); if (h && !has && h.lv < 2) h.lv = 2; recompute(); } return '鲜血渗进祭坛。生命上限 −10%，得到一个 Lv2 誓约印记。';
      case 'aCoin': { RUN.coins -= 40; const x = pick([...RUN.oath, ...RUN.mv].filter(o => o && o.lv < 5)); x.lv++; recompute(); return `${DATA.oaths[x.id].name} 升到 Lv${x.lv}。`; }
      case 'aBook': { const b = pick(bagB.filter(b => JOBS.skills(RUN).some(s => s && DATA.skills[s.id].tier === DATA.skills[b.id].tier && profL(s) < 7))), T = DATA.skills[b.id].tier, s = pick(JOBS.skills(RUN).filter(s => s && DATA.skills[s.id].tier === T && profL(s) < 7)); take(b); s.xp = DATA.prof[profL(s)]; return `「${DATA.skills[s.id].name}」熟练度升到 Lv${profL(s)}。`; }
      case 'fKeep': RUN.save = true; return '羽毛贴在了胸口，暖暖的。第一次倒下时会复活。';
      case 'fSell': RUN.coins += 30; return '卖了 30 铜钱。';
    }
    return '';
  }
  // 11/24 坏掉的街机：三列转盘。概率按幸运微调；三个骷髅 = 扣血 + 街机坏掉
  const ARC_P = [15, 25, 40];
  const ARC = { coin: { src: 'art/ui2/coin.png', name: '铜钱', em: '💰' }, book: { src: 'art/ui2/bk_sword.png', name: '技能书', em: '📘' }, chest: { src: 'art/ui2/chest.png', name: '宝箱', em: '🎁' }, oath: { src: 'art/ui2/oath/fengren.png', name: '印记', em: '🔰' }, seven: { src: 'art/ev/s7.png', name: '大奖', em: '7️⃣', rare: true }, skull: { src: 'art/ev/skull.png', name: '骷髅', em: '💀' } };
  function arcadeSpin(o, p) {
    const n = o.n || 0, price = ARC_P[n], lk = .01 * (RUN.luck || 0); RUN.coins -= price; G.paused = true; SFX.play('pick');
    const T = [['coin', .10], ['book', .08], ['chest', .07], ['oath', .06], ['seven', .02 + lk / 4], ['skull', .07 - lk / 2], ['pair', .40 + lk / 2]];
    let r = Math.random(), res = 'none'; for (const [k, pr] of T) { if (r < pr) { res = k; break; } r -= pr; }
    const keys = ['coin', 'book', 'chest', 'oath', 'seven', 'skull'], oth = k => { let x; do x = keys[Math.random() * 6 | 0]; while (x === k); return x; };
    let face; if (res === 'pair') { const k = keys[Math.random() * 4 | 0], j = Math.random() * 3 | 0; face = [k, k, k]; face[j] = oth(k); } else if (res === 'none') { const a = keys.slice().sort(() => Math.random() - .5); face = a.slice(0, 3); } else face = [res, res, res];
    UI.slot(Object.values(ARC), face.map(k => ARC[k]), () => { G.paused = false; o.n = n + 1; const give = x => { CAMP.learn(x, true); gotFeed(x); }; let msg;
      switch (res) {
        case 'coin': RUN.coins += price * 3; msg = `三个铜钱！吐出 ${price * 3} 铜钱。`; break;
        case 'book': { const id = randBook(2) || randBook(); if (id) give({ kind: 'book', id }); else RUN.coins += 40; msg = '三本书！掉出一本技能书。'; break; }
        case 'chest': give({ kind: 'item', id: ITEMS()[Math.random() * ITEMS().length | 0].id }); addCrystal(2, hero.x, hero.y); msg = '三个宝箱！掉出一件宝物和 2 水晶。'; break;
        case 'oath': { const L = DATA.oathPool(RUN); CAMP.learn({ kind: 'oath', id: L[Math.random() * L.length | 0] }, true); msg = '三个印记！得到一个誓约印记。'; break; }
        case 'seven': { const id = randBook(3) || randBook(); if (id) give({ kind: 'book', id }); give({ kind: 'item', id: ITEMS()[Math.random() * ITEMS().length | 0].id }); RUN.s777 = 1; addCrystal(8, hero.x, hero.y); msg = '大奖！高阶书 + 宝物 + 8 水晶！'; break; }
        case 'skull': hero.hp = Math.max(1, hero.hp - hero.maxHp * .15); o.broke = 1; G.shake = .3; msg = '三个骷髅……街机炸了，掉了 15% 生命。'; break;
        case 'pair': RUN.coins += Math.round(price / 2); msg = `两个一样，退回 ${Math.round(price / 2)} 铜钱。`; break;
        default: msg = '什么都没中。';
      }
      toastMsg(msg); o.msg = msg; if (o.broke || o.n >= 3) { p.t = o.broke ? '街机坏了' : '已经拉了 3 次'; } else p.t = `再拉一次：${ARC_P[o.n]} 铜钱`; });
  }
  function evTick(dt) { const f = G.fe, o = f.rest;
    if (o.E.merchant) { if (o.mst < 0) { if (!SKUL(o, 30)) o.mst = 0; } else if (SKUL(o, 24)) o.mst = (o.mst || 0) + dt; else o.mst = 0;
      if (o.mst > .4) { o.mst = -99; G.lock = true; RUN.shop = null; RUN.rr = 0; CAMP.open({ st: G.st, wi: 0, kills: 0, coins: 0, xp: 0, lv: G.lv, dmg: {}, loot: [], title: '裂缝旅商', tab: 'shang', only: 'shang', field: 1, rift: 1, goText: '离开 ▶', after: () => { G.lock = false; o.mst = -1; RUN.shop = null; } }); return; } }
    if (o.done) { if ((o.done -= dt) <= 0) { f.rest = null; showRoute(true); } return; }
    for (const p of o.pl) { const on = SKUL(p, 14), ok = evOk(p.need); if (!on) p.lock = 0; if (on && !p.lock && ok && o.t > 1) p.st += dt; else p.st = 0;
      if (p.st > 1.2 && p.fx === 'spin') { p.st = 0; p.lock = 1; arcadeSpin(o, p); return; }
      if (p.st > 1.2 && p.fx === 'rHand') { p.st = 0; G.paused = true; const win = Math.random() < .5, id = win ? randBook(3) : null, ok = win && id;   // 11/24 伸手进去：单列转盘在「高阶书 / 骷髅」间闪
        UI.slot([ARC.book, ARC.skull], [ok ? slotOf({ kind: 'book', id }) : ARC.skull], () => { G.paused = false; let msg; if (ok) { CAMP.learn({ kind: 'book', id }, true); gotFeed({ kind: 'book', id }); msg = '摸出一本技能书！'; } else { hero.hp = Math.max(1, hero.hp - hero.maxHp * .2); G.shake = .25; msg = '被乱码咬了一口，掉了 20% 生命。'; } o.msg = msg; toastMsg(msg); o.done = 1.6; }); return; }
      if (p.st > 1.2) { G.shake = Math.max(G.shake, .15); p.fl = performance.now(); const msg = p.fx === 'leave' ? '' : evRun(p.fx); if (msg) { o.msg = msg; toastMsg(msg); } o.done = msg ? 1.6 : .2; return; } } }
  function restTick(dt) {
    const f = G.fe, o = f.rest; o.t += dt; if (o.k === 'ev') return evTick(dt);
    if (o.k === 'chest' && !o.open) { if (SKUL(o, 18)) o.st += dt; else o.st = 0; if (o.st > .3) { o.open = 1; const L = []; for (let i = 0; i < 3; i++) { const id = randBook(undefined, i); if (id && !L.includes(id)) L.push(id); }
        if (!L.length) { RUN.coins += 30; toastMsg('箱子里只有 30 铜钱'); f.rest = null; return showRoute(true); }
        o.books = []; G.paused = true; UI.slot(slotPool(), L.map(id => slotOf({ kind: 'book', id })), () => { G.paused = false;   // 11/24 开箱先转老虎机
        o.books = L.map((id, i) => ({ kind: 'book', id, x: o.x + (i - (L.length - 1) / 2) * 36 * K, y: o.y + 34 * K, st: 0 })); toastMsg('三本书选一本'); }); } return; }
    if (o.k === 'chest') { for (const b of o.books) { if (SKUL(b, 14)) b.st += dt; else b.st = 0; if (b.st > .3) { CAMP.learn(b, true); gotFeed(b); f.rest = null; return showRoute(true); } } return; }
    if (o.k === 'fire') { if (o.out) return; if (SKUL(o, 22)) o.st += dt; else o.st = 0; if (o.st > 1) { const h0 = hero.hp; healHero(hero.maxHp * .5); nums.push({ x: hero.x, y: hero.y - 44 * K, v: Math.round(hero.hp - h0), t: 0, col: '#7cff8a' }); RUN.xiu++; f.pr.said = 0; toastMsg('回复 50% 生命，修炼 +1（去找露米娜）'); o.out = G.t; showRoute(true); } }
  }
  // 奇遇场景物（临时：代码画的像素小景，等出图替换）
  const EVI = {}; const evi = n => EVI[n] || (EVI[n] = Object.assign(new Image(), { src: 'art/ev/' + n + '.png' }));
  function evSpr(n, x, y, dx) { const im = evi(n); if (!im.complete || !im.naturalWidth) return false; ctx.imageSmoothingEnabled = false; ctx.drawImage(im, x + (dx || 0) * u - im.naturalWidth * u / 2, y - im.naturalHeight * u, im.naturalWidth * u, im.naturalHeight * u); return true; }
  const EV_RED = new Set(['kHeal', 'kTake', 'rHand', 'kidRob', 'aBlood', 'aCoin', 'cup', 'fCoin', 'rBook', 'rOath', 'aBook', 'fItem', 'fBook']);
  const UIM = {}; const uim = n => UIM[n] || (UIM[n] = Object.assign(new Image(), { src: n }));
  function evIcon(p) { const m = { fItem: 'art/ui2/clover.png', fBook: 'art/ui2/bk_sword.png', fCoin: 'art/drop/pile1.png', kHeal: 'art/ev/ic_potion.png', kTake: 'art/ui2/sword_edge.png', cup: 'art/drop/pile1.png', rHand: 'art/ev/ic_blood.png', rBook: 'art/ui2/bk_wand.png', rOath: 'art/ui2/oath/xianfeng.png', kidSave: 'art/ev/ic_scissor.png', kidRob: 'art/ev/ic_pouch.png', aBlood: 'art/ev/ic_blood.png', aCoin: 'art/drop/pile2.png', aBook: 'art/ui2/bk_spear.png', fKeep: 'art/ev/feather0.png', fSell: 'art/drop/pile1.png', leave: 'art/ev/ic_leave.png' }[p.fx]; return m ? uim(m) : null; }
  function evProp(id, x, y) { const f2 = Math.floor(G.t * 2.5) % 2, f3 = Math.floor(G.t * 5) % 3, o = G.fe && G.fe.rest;
    ctx.fillStyle = 'rgba(30,15,5,.4)'; ctx.beginPath(); ctx.ellipse(x, y + u, 24 * u, 5 * u, 0, 0, 7); ctx.fill();
    const map = { rift_mer: () => evSpr('mer' + f2, x, y), fairy: () => evSpr('fairy' + f3, x, y), knight: () => evSpr('knight' + (o && o.pl.some(p => SKUL(p, 30)) ? 2 : f2), x, y), gamble: () => { evSpr('gamble', x, y); SPR.draw(ctx, 'gob_thief', 'walk0', 0, x + 34 * u, y, true, u, {}); }, rift: () => evSpr('rift' + (Math.floor(G.t * 8) % 2), x, y), arcade: () => evSpr('arcade' + (o && o.broke ? 2 + f2 : f2), x, y), kid: () => evSpr('gkid' + f2, x, y), altar: () => evSpr('altar' + (o && o.done ? 3 : f3), x, y + 5 * u), feather: () => evSpr('feather' + f2, x, y) };
    if (map[id] && evi((({ rift_mer: 'mer0', fairy: 'fairy0', knight: 'knight0', gamble: 'gamble', rift: 'rift0', kid: 'gkid0', altar: 'altar0', feather: 'feather0', arcade: 'arcade0' })[id])).complete) return map[id]();
    evProp0(id, x, y); }
  function evProp0(id, x, y) { const P = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + a * u, y + b * u, w * u, h * u); };
    ctx.fillStyle = 'rgba(30,15,5,.4)'; ctx.beginPath(); ctx.ellipse(x, y + u, 20 * u, 5 * u, 0, 0, 7); ctx.fill();
    if (id === 'rift_mer') { P('#2a1a3a', -8, -38, 16, 38); P('#5a3a7a', -7, -37, 14, 22); P('#e8c8a0', -4, -32, 8, 6); P('#6a4a2a', 6, -34, 14, 26); P('#3a3a3a', 9, -30, 8, 6); P('#c0c0c0', 18, -38, 2, 22); for (let i = 0; i < 6; i++) if (Math.sin(G.t * 9 + i * 3) > .3) P(['#ff4aff', '#4affff', '#ffff4a'][i % 3], R(-20, 20), R(-44, -4), 2, 2); }
    else if (id === 'fairy') { P('#5a6a7a', -20, -6, 40, 7); P('#4ab8ff', -17, -5, 34, 4); P('#bfefff', -12, -5, 10, 1); const fy = -26 + Math.sin(G.t * 3) * 3; P('#fff0f8', -2, fy, 4, 6); P('#bff', -6, fy - 2, 3, 5); P('#bff', 3, fy - 2, 3, 5); }
    else if (id === 'knight') { P('#4a3a2a', -16, -36, 6, 36); P('#8a8a9a', -8, -26, 14, 18); P('#6a6a7a', -6, -32, 10, 8); P('#c03030', -2, -16, 3, 4); P('#c0c8d0', 12, -40, 3, 30); P('#8a6a2a', 9, -14, 9, 3); }
    else if (id === 'gamble') { P('#6a4a2a', -20, -14, 40, 4); P('#4a3018', -18, -10, 3, 10); P('#4a3018', 15, -10, 3, 10); for (let i = 0; i < 3; i++) P('#d0a060', -15 + i * 12, -22, 7, 8); SPR.draw(ctx, 'gob_thief', 'walk0', 0, x + 26 * u, y, true, u, {}); }
    else if (id === 'rift') { for (let i = 0; i < 9; i++) P(i % 2 ? '#a040ff' : '#ff40ff', -18 + i * 4, -3 + Math.sin(G.t * 6 + i) * 2, 4, 4); P('#1a0a2a', -14, -2, 28, 3); }
    else if (id === 'kid') { SPR.draw(ctx, 'goblin', 'hurt', 0, x, y, false, u * .7, {}); for (let i = 0; i < 4; i++) P('#3a7a2a', -12 + i * 6, -20 + (i % 2) * 6, 3, 14); }
    else if (id === 'altar') { P('#3a3a44', -16, -14, 32, 14); P('#2a2a34', -20, -18, 40, 4); P('#6a1a2a', -4, -24, 8, 6); P('#c040ff', -1, -30 + Math.sin(G.t * 4) * 2, 2, 4); }
    else if (id === 'feather') { P('#ffd860', -1, -16, 2, 14); for (let i = 0; i < 6; i++) { P('#fff0b0', -1 - i * .6, -15 + i * 2, 1 + i * .3, 1); P('#fff0b0', 1, -15 + i * 2, 1 + i * .3, 1); } }
  }
  function restDraw(label, ring) {
    const f = G.fe;
    const M2 = f.mer2; if (M2) { SPR.draw(ctx, 'gob_merchant', merFrame(M2), 0, X(M2.x), Y(M2.y), false, u, {}); label('特价商人 · 八折', X(M2.x), Y(M2.y) + 3 * u, '#ffb070'); say(X(M2.x), Y(M2.y) - 44 * u, ['今天全部八折！', '错过就没了哦～'], 1.2); ring(M2, 14, M2.st / .4, '#ffb070'); }
    const o = f.rest; if (!o) return; const x = X(o.x), y = Y(o.y);
    if (o.k === 'ev') { const E = o.E, a = o.done ? Math.max(0, o.done / 1.6) : Math.min(1, o.t * 2); ctx.save(); ctx.globalAlpha = a; evProp(E.id, x, y); ctx.restore();
      label(E.name, x, y + 6 * u, '#e6c8ff'); if (!o.done && !o.pl.some(p => SKUL(p, 14) && p.t.includes('：'))) say(x, y - 50 * u, o.msg ? [o.msg] : E.lines, 2.1);
      if (!o.done) for (const p of o.pl) { const px = X(p.x), py = Y(p.y), ok = evOk(p.need), ty = p.fx === 'leave' ? 'x' : !ok ? 'x' : EV_RED.has(p.fx) ? 'r' : 'g';   // 11/23 符文石板踏板 + 浮空小图标
        const b0 = evi('pl_' + ty), b1 = evi('pl_' + ty + '1'), w = 64 * u * .8, h = 28 * u * .8, pr = Math.min(1, p.st / 1.2);
        if (b0.complete && b0.naturalWidth) { ctx.save(); if (!ok) ctx.globalAlpha = .55; if (p.fl && performance.now() - p.fl < 350) ctx.filter = 'brightness(2.2)'; ctx.drawImage(b0, px - w / 2, py - h / 2, w, h); ctx.restore(); }
        if (pr > 0 && b1.complete) { ctx.save(); ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, w, -PI / 2, -PI / 2 + PI * 2 * pr); ctx.closePath(); ctx.clip(); ctx.drawImage(b1, px - w / 2, py - h / 2, w, h); ctx.restore(); }
        const ic = evIcon(p), bob = Math.sin(G.t * 3 + p.x) * 2 * u; if (ic && ic.complete && ic.naturalWidth) { const k = 18 / Math.max(ic.naturalWidth, ic.naturalHeight) * u, iw = ic.naturalWidth * k, ih = ic.naturalHeight * k; ctx.save(); if (!ok) ctx.globalAlpha = .45; ctx.drawImage(ic, px - iw / 2, py - 8 * u - ih + bob, iw, ih); ctx.restore(); }
        label(p.t.split('：')[0], px, py + 10 * u, ok ? '#fff3d8' : '#888', 6.5); if (SKUL(p, 14) && p.t.includes('：')) say(x, y - 50 * u, [p.t + (ok ? '' : '（条件不够）')], 99); }
      return; }
    if (o.k === 'chest') { const im = img('chest'); if (!o.open && im.complete) ctx.drawImage(im, x - 14 * u, y - 24 * u, 28 * u, 28 * u); if (!o.open) { label('宝箱', x, y + 5 * u); ring(o, 14, o.st / .3, '#ffe08a'); }
      if (o.books) for (const b of o.books) { const S = DATA.skills[b.id], bi = img(({ '剑': 'bk_sword', '枪': 'bk_spear', '弓': 'bk_bow', '法杖': 'bk_wand', '圣典':'bk_tome', '镰刀':'bk_scythe', '掌机': 'bk_gun', '通用': 'bk_sword' })[S.sys]), bx = X(b.x), by = Y(b.y) - 9 * u;
        ctx.fillStyle = 'rgba(255,220,120,.3)'; ctx.beginPath(); ctx.arc(bx, by, 13 * u, 0, 7); ctx.fill(); if (bi.complete) ctx.drawImage(bi, bx - 10 * u, by - 10 * u, 20 * u, 20 * u); label(S.name, bx, by + 12 * u, ['#e6e2d6', '#e6e2d6', '#6ab8ff', '#c890ff', '#ffd84a'][S.tier]); ring(b, 15, b.st / .3, '#fff'); } }
    if (o.k === 'fire') {   // 11/23 篝火：官方美术（石圈木柴底座 + 8 帧火苗叠在木柴上）
      const gl = ctx.createRadialGradient(x, y - 10 * u, 0, x, y - 10 * u, 60 * u), fl = (.3 + .06 * Math.sin(G.t * 9)) * (o.out ? Math.max(0, 1 - (G.t - o.out) / .5) : 1); gl.addColorStop(0, `rgba(255,150,60,${fl})`); gl.addColorStop(1, 'rgba(255,150,60,0)'); ctx.fillStyle = gl; ctx.fillRect(x - 60 * u, y - 70 * u, 120 * u, 120 * u);
      const ok = o.out ? Math.max(0, 1 - (G.t - o.out) / .5) : 1, bi = CAMPI(o.out && ok <= 0 ? 'fire_out' : 'fire_base'), fi = CAMPI('fire_flame'), bw = 64 * u; if (bi.complete && bi.naturalWidth) { const bh = bw * bi.naturalHeight / bi.naturalWidth; ctx.drawImage(bi, x - bw * .55, y - bh * .7, bw, bh);
        if (o.out && Math.random() < .12) parts.push({ x: o.x + R(-4, 4) * K, y: o.y - 10 * K, vx: R(-4, 4) * K, vy: -22 * K, t: 0, T: 1.4, col: 'rgba(220,220,220,.7)', g: 0, sz: 2 });
        if (ok > 0 && fi.complete && fi.naturalWidth) { const fw = fi.naturalWidth / 8, f = Math.floor(G.t * 12) % 8, h = 24 * u * ok, w = h * fw / fi.naturalHeight; ctx.drawImage(fi, f * fw, 0, fw, fi.naturalHeight, x - bw * .55 + bw * .5 - w / 2, y - bh * .7 + bh * .55 - h, w, h); } }
      if (!o.out && Math.random() < .25) parts.push({ x: o.x + R(-5, 5) * K, y: o.y - 22 * K, vx: R(-8, 8) * K, vy: -40 * K, t: 0, T: .7, col: '#ffb040', g: 0 });
      label(o.out ? '篝火 · 已熄灭' : '篝火 · 站一会儿', x, y + 8 * u, o.out ? '#a89880' : '#ffd0a0'); if (!o.out) ring(o, 18, o.st, '#7cff8a'); }
  }
  function fieldTick(dt) {
    const f = G.fe; if (!f || G.paused || G.lock) return; f.t += dt;
    if (f.rest) restTick(dt);
    const M2 = f.mer2; if (M2) { if (M2.st < 0) { if (!SKUL(M2, 30)) M2.st = 0; } else if (SKUL(M2, 24)) M2.st += dt; else M2.st = 0; if (M2.st > .4) { M2.st = -99; G.lock = true; CAMP.open({ st: G.st, wi: 0, kills: 0, coins: 0, xp: 0, lv: G.lv, dmg: {}, loot: [], title: '特价商人 · 全部八折', tab: 'shang', only: 'shang', field: 1, disc: .8, goText: '离开 ▶', after: () => { G.lock = false; M2.st = -1; } }); return; } if (M2.st < 0 && !SKUL(M2, 24)) M2.st = 0; }
    for (let i = f.items.length - 1; i >= 0; i--) { const o = f.items[i]; if (f.t > .6 && SKUL(o, 16)) o.st += dt; else o.st = 0; if (o.st > .6) { o.st = 0; if (CAMP.learn(o, true)) { gotFeed(o); f.items.splice(i, 1); for (let k = 0; k < 10; k++) { const a = R(0, PI * 2); parts.push({ x: o.x, y: o.y, vx: Math.cos(a) * 50 * K, vy: Math.sin(a) * 50 * K, t: 0, T: .4, col: '#ffe08a', g: 0 }); } } else { o.x += (o.x - hero.x) * .5; o.y += (o.y - hero.y) * .5; } } }
    const P = f.pr;
    if (!P.arm && !SKUL(P, 40)) P.arm = true;
    if (P.wait && !P.orbs && f.t >= P.wait) { P.wait = 0; xiuOrbs(); P.ot = f.t; }
    if (!P.orbs && !P.wait && P.arm && SKUL(P, 26)) { if (RUN.xiu > 0) { xiuOrbs(); P.said = 1; P.ot = f.t; } else P.said = 2; }
    if (P.orbs && f.t - (P.ot || 0) > 1) {   // 光球出现 1 秒内碰到不算；站上去转满一圈（0.8 秒）才拿
      for (const o of P.orbs) { if (SKUL(o, 15)) o.st += dt; else o.st = 0;
        if (o.st > .8) { for (const [a, v] of o.adds) RUN.train[a] = (RUN.train[a] || 0) + v; RUN.xiu--; recompute(); toastMsg(`修炼：${o.adds.map(([a, v]) => DATA.attrs.find(x => x.id === a).name + ' +' + v).join('、')}`);
          for (let k = 0; k < 16; k++) { const an = R(0, PI * 2); parts.push({ x: o.x, y: o.y, vx: Math.cos(an) * 60 * K, vy: Math.sin(an) * 60 * K, t: 0, T: .5, col: DATA.rarity[o.q].col, g: 0 }); }
          if (RUN.xiu > 0) { P.cr.n = 0; P.orbs = null; P.w0 = f.t; P.wait = f.t + 2; } else { P.orbs = null; P.cr = null; P.said = 3; } return; } }   /* 11/25 还有修炼机会：公主先说一声，过一会再刷出下一组，免得玩家顺脚又踩中 */
      const c = P.cr; if (c) { if (!SKUL(c, 20)) c.lock = false; if (SKUL(c, 14) && !c.lock) c.st += dt; else c.st = 0;
        if (c.st > .5) { c.st = 0; const free = 2 + (hero.fx.xiuReroll || 0), cost = c.n < free ? 0 : 5 * (c.n - free + 1); c.lock = true; if (cost && RUN.coins < cost) toastMsg('铜钱不够'); else { RUN.coins -= cost; c.n++; const keep = c; xiuOrbs(); P.cr = keep; } } }
    }
    const M = f.mer; if (M.st < 0) { if (!SKUL(M, 30)) M.st = 0; } else if (SKUL(M, 24)) M.st += dt; else M.st = 0;   // 离开商店后要先走开才能再进
    if (M.st > .4) { M.st = -99; G.lock = true; CAMP.open({ st: G.st, wi: 0, kills: 0, coins: 0, xp: 0, lv: G.lv, dmg: {}, loot: [], title: '矮人商人', tab: 'shang', only: 'shang', field: 1, goText: '离开 ▶', after: () => { G.lock = false; M.st = -1; M.dealT = G.t + 1.6; } }); return; }
    if (M.st < 0 && !SKUL(M, 24)) M.st = 0;
    for (const d of f.doors) { if (d.nb > G.t) d.st = 0; else if (Math.abs(d.x - hero.x) < 22 * K && Math.abs(d.y - hero.y) < 18 * K) d.st += dt; else d.st = 0;   // 金门还没开完不能进
      if (d.st > .35) { if ((RUN.xiu > 0 || f.items.length) && !f.warn) { f.warn = 1; d.st = -1; toastMsg(RUN.xiu > 0 ? '还有修炼没拿（去找露米娜），再走进门就出发' : '地上还有东西没捡，再走进门就出发'); return; }
        if (d.st > .35) { const c = d.c, sx = X(d.x), sy = Y(d.y) - 26 * u; f.doors = []; if (c.rest) { f.pick(c); return; }   /* 11/25 宝箱 / 篝火 / 商人 / 奇遇在当前界面就能完成：不碎屏，直接摆在地图上 */ G.lock = true; UI.FX.shatter(cv, sx, sy, () => { G.lock = false; f.pick(c); }); return; } } }
  }
  // 头顶对话气泡：每 5 秒说一句（打字机效果，停 3 秒），几句轮流
  function say(x, y, lines, seed) { const t = G.t + (seed || 0), cyc = 5, k = t % cyc; if (k > 3.2) return; const L = lines[Math.floor(t / cyc) % lines.length], n = Math.min(L.length, Math.floor(k * 14) + 1), tx = L.slice(0, n);
    const fs = Math.round(6.5 * u); ctx.font = `${fs}px WenKai, Pix, serif`; const w = ctx.measureText(L).width + 10 * u, bx = x - w / 2, by = y - fs - 8 * u;
    ctx.fillStyle = 'rgba(250,244,230,.96)'; ctx.fillRect(bx, by, w, fs + 6 * u); ctx.fillRect(x - 2 * u, by + fs + 6 * u, 4 * u, 3 * u); ctx.strokeStyle = '#3a2814'; ctx.lineWidth = u; ctx.strokeRect(bx, by, w, fs + 6 * u);
    ctx.fillStyle = '#3a2814'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(tx, bx + 5 * u, by + 3 * u); ctx.textAlign = 'center'; }
  function fieldDraw() {
    const f = G.fe; if (!f) return; ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const label = (t, x, y, col, sz) => { ctx.font = `${Math.round((sz || 6) * u)}px WenKai, Pix, serif`; ctx.lineWidth = 2 * u; ctx.strokeStyle = '#1a1008'; ctx.strokeText(t, x, y); ctx.fillStyle = col || '#fff3d0'; ctx.fillText(t, x, y); };
    if(f.careerGlyph&&CAMP?.careerReady?.()){const q=f.careerGlyph,x=X(q.x),y=Y(q.y),info=CAMP.careerInfo?.();ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.55+.35*Math.sin(G.t*4);ctx.strokeStyle=hero.jobColor||'#ffd86c';ctx.lineWidth=3*u;ctx.beginPath();ctx.arc(x,y,22*u,0,PI*2);ctx.stroke();ctx.beginPath();ctx.arc(x,y,15*u,0,PI*2);ctx.stroke();ctx.fillStyle='rgba(255,210,80,.18)';ctx.beginPath();ctx.arc(x,y,19*u,0,PI*2);ctx.fill();ctx.restore();label('转职',x,y-43*u,'#ffe08a',9);if(info){const im=IMG[info.crest]||(IMG[info.crest]=Object.assign(new Image(),{src:info.crest}));if(im.complete&&im.naturalWidth)ctx.drawImage(im,x-12*u,y-12*u,24*u,24*u);}label('E / 点击',x,y+25*u,'#fff0cc',6);}
    const ring = (o, r, p, col, dy) => { if (p <= 0) return; ctx.strokeStyle = col; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.arc(X(o.x), Y(o.y) - (dy || 0) * u, r * u, -PI / 2, -PI / 2 + PI * 2 * Math.min(1, p)); ctx.stroke(); };
    for (const d of f.doors) { const c = d.c, k = c.k, rs = c.rest, ev = k === 'event', bo = k === 'boss', el = k === 'elite';   // 11/23 传送门：纯代码画的旋涡，只写类型
      const col = bo ? [255, 200, 70] : el ? [225, 60, 200] : ev ? [150, 90, 255] : rs ? [60, 200, 255] : [255, 90, 50], [r0, g0, b0] = col, C = a => `rgba(${r0},${g0},${b0},${a})`;
      const near = Math.max(0, 1 - Math.hypot(d.x - hero.x, d.y - hero.y) / (70 * K)), sz = (bo ? 1.25 : 1) * (1 + near * .08) * 1.15, rw = 22 * u * sz, rh = 32 * u * sz, x = X(d.x), cy = Y(d.y) - rh + 2 * u, sp = (el ? 2.2 : 1.4) * (1 + near * 1.5);
      if (d.gate) {   // 11/26 金门（art/src/gate.png → art/obj/gate0–5）：封印 → 链断 → 开一半 → 全开 → 光幕循环；开完才能走进去
        const t = G.t - d.born, fr = t < .35 ? 0 : t < .6 ? 1 : t < .9 ? 2 : t < 1.2 ? 3 : 4 + (Math.floor(G.t / .35) & 1), gim = pim('gate' + fr), gx = X(d.x), gyb = Y(d.y) + 2 * u;
        if (gim.complete && gim.naturalWidth) { const gw = gim.naturalWidth * u, gh = gim.naturalHeight * u;
          if (fr >= 3) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createRadialGradient(gx, gyb - gh * .4, gh * .1, gx, gyb - gh * .4, gh * .9); lg.addColorStop(0, `rgba(255,205,80,${.28 + near * .2})`); lg.addColorStop(1, 'rgba(255,205,80,0)'); ctx.fillStyle = lg; ctx.fillRect(gx - gh, gyb - gh * 1.4, gh * 2, gh * 2); ctx.restore(); }
          ctx.imageSmoothingEnabled = false; ctx.drawImage(gim, Math.round(gx - gw / 2), Math.round(gyb - gh), Math.round(gw), Math.round(gh)); label(d.lbl || c.lbl || '下一章', gx, gyb - gh - 4 * u, '#ffe08a', 9); }
        ring({ x: d.x, y: d.y }, 10, d.st / .35, '#ffe08a'); continue; }
      { // 11/23 像素黑洞：先画在小画布上（每格 = 1 像素），再按像素放大
        const PW = 40, PH = 52, pc = portalCv(d), g = pc.getContext('2d'), im = g.createImageData(PW, PH), D = im.data, t = G.t * sp;   // 参考 cgwell：黑洞心 + 一圈翻腾的火焰边，边的颜色区分类型
        const hi = [Math.min(255, r0 * .4 + 160), Math.min(255, g0 * .4 + 160), Math.min(255, b0 * .4 + 170)];
        for (let py = 0; py < PH; py++) for (let px = 0; px < PW; px++) { const nx = (px + .5 - PW / 2) / (PW / 2), ny = (py + .5 - PH / 2) / (PH / 2), rr = Math.hypot(nx, ny), a = Math.atan2(ny, nx);
          const wob = .035 * Math.sin(4 * a + t * 1.3) + .025 * Math.sin(7 * a - t * 2.1) + .012 * Math.sin(13 * a + t * 3.7), hole = .6 + wob, edge = rr - hole, k = (py * PW + px) * 4;
          if (edge < 0) { const dp = Math.min(1, -edge / .12), c = 1 - dp; D[k] = 6 + c * r0 * .25; D[k + 1] = 3 + c * g0 * .2; D[k + 2] = 12 + c * b0 * .3; D[k + 3] = 255; if (edge > -.035) { D[k] = 255; D[k + 1] = 250; D[k + 2] = 245; } continue; }   // 越往里越黑 + 一圈亮白内缘
          const up = Math.max(0, -ny) * .35, flick = .5 + .5 * Math.sin(13 * a + t * 4 + rr * 9) * Math.sin(7 * a - t * 2.6), tong = Math.max(0, Math.sin(6 * a + t * 3) * Math.sin(11 * a - t * 5)) * .35, band = .3 * (.75 + .45 * flick) + tong + up * tong * 2, v = 1 - edge / band;
          if (v <= 0) continue; const q = v > .8 ? 4 : v > .55 ? 3 : v > .3 ? 2 : 1;
          const P = [null, [r0 * .45, g0 * .45, b0 * .5, 170], [r0 * .75, g0 * .75, b0 * .8, 235], [r0, g0, b0, 255], [...hi, 255]][q];
          D[k] = P[0]; D[k + 1] = P[1]; D[k + 2] = P[2]; D[k + 3] = P[3]; }
        g.putImageData(im, 0, 0);
        // 11/23 洞里往外钻的电弧：从中心附近向边缘折线，0.08 秒换一次形状，时有时无
        if (!d.arcT || G.t > d.arcT) { d.arcT = G.t + .07 + Math.random() * .06; d.arcs = []; const n = Math.random() < .25 ? 0 : 1 + (Math.random() * (el || bo ? 3 : 2) | 0);
          for (let k = 0; k < n; k++) { const an = Math.random() * PI * 2, L = [], st = 7; let px0 = PW / 2 + R(-3, 3), py0 = PH / 2 + R(-4, 4);
            for (let j = 0; j <= st; j++) { const f = j / st, tx = PW / 2 + Math.cos(an) * PW * .34 * f, ty = PH / 2 + Math.sin(an) * PH * .36 * f; L.push([Math.round(tx + R(-2, 2) * (1 - f * .3)), Math.round(ty + R(-2, 2))]); }
            d.arcs.push(L); } }
        for (const L of d.arcs) for (let j = 1; j < L.length; j++) { let [x0, y0] = L[j - 1]; const [x1, y1] = L[j], dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx - dy;
          for (let guard = 0; guard < 40; guard++) { g.fillStyle = j < 2 ? '#ffffff' : `rgb(${hi[0] | 0},${hi[1] | 0},${hi[2] | 0})`; g.fillRect(x0, y0, 1, 1); g.globalAlpha = .55; g.fillRect(x0 + 1, y0, 1, 1); g.fillRect(x0, y0 + 1, 1, 1); g.globalAlpha = 1; if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 > -dy) { e -= dy; x0 += sx; } if (e2 < dx) { e += dx; y0 += sy; } } }
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createRadialGradient(x, cy, rh * .6, x, cy, rh * 1.5); gl.addColorStop(0, C(.3 + near * .2)); gl.addColorStop(1, C(0)); ctx.fillStyle = gl; ctx.fillRect(x - rh * 1.6, cy - rh * 1.6, rh * 3.2, rh * 3.2); ctx.restore();
        const sc = Math.max(1, Math.round(2.2 * rh / PH)); ctx.imageSmoothingEnabled = false; ctx.drawImage(pc, Math.round(x - PW * sc / 2), Math.round(cy - PH * sc / 2), PW * sc, PH * sc); }
      for (let k = 0; k < 2; k++) if (Math.random() < .5) { const an = R(0, PI * 2); parts.push({ x: d.x + Math.cos(an) * rw / u * K * .55, y: d.y - (rh / u) * K + Math.sin(an) * (rh / u) * K * .75, vx: R(-6, 6) * K, vy: -R(18, 36) * K, t: 0, T: R(.4, .8), col: Math.random() < .3 ? '#fff' : C(1), g: 0 }); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; { const lg = ctx.createRadialGradient(x, Y(d.y), 0, x, Y(d.y), rw * 1.8); lg.addColorStop(0, C(.35 + near * .2)); lg.addColorStop(1, C(0)); ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(x, Y(d.y), rw * 1.8, rw * .55, 0, 0, 7); ctx.fill(); } ctx.restore();
      const big = c.lbl ? c.lbl : bo ? '首领' : el ? '精英' : ev ? '奇遇' : rs ? '休整' : '战斗', sub = rs && !ev ? ({ chest: '宝箱', fire: '篝火', shop: '商人' })[k] : '';
      label(big, x, cy - rh * 1.12 - 2 * u, `rgb(${Math.min(255, r0 + 40)},${Math.min(255, g0 + 40)},${Math.min(255, b0 + 40)})`, 9); if (sub) label(sub, x, cy - rh * 1.12 + 8 * u, '#f4ecd8', 6); ring({ x: d.x, y: d.y }, 10, d.st / .35, '#ffe08a'); }
    for (const o of f.items) { const im = img(o.kind === 'book' ? ({ '剑': 'bk_sword', '枪': 'bk_spear', '弓': 'bk_bow', '法杖': 'bk_wand', '圣典':'bk_tome', '镰刀':'bk_scythe', '掌机': 'bk_gun', '通用': 'bk_sword' })[DATA.skills[o.id].sys] : o.kind === 'manual' ? (o.id === 'master' ? 'bk_staff' : 'bk_sword') : o.id), x = X(o.x), y = Y(o.y) - 9 * u - rd((0 * Math.sin(G.t * 3 + o.x) * 2) * u);
      ctx.fillStyle = 'rgba(30,15,5,.4)'; ctx.beginPath(); ctx.ellipse(x, Y(o.y) + u, 9 * u, 3 * u, 0, 0, 7); ctx.fill(); if (o.kind === 'book') dspr('book_' + ({ '剑': 'sword', '枪': 'spear', '弓': 'bow', '法杖': 'staff', '掌机': 'gun', '圣典': 'tome', '镰刀': 'scythe', '通用': 'sword' })[DATA.skills[o.id].sys], x, Y(o.y) + 2 * u); else if (o.kind === 'use') dspr('meat', x, Y(o.y) + 2 * u); else if (im.complete && im.naturalWidth) ctx.drawImage(im, x - 9 * u, y - 9 * u, 18 * u, 18 * u); ring(o, 12, o.st / .6, '#ffe08a', 9); }
    const P = f.pr, px = X(P.x), py = Y(P.y);
    ctx.save(); ctx.globalAlpha = .5 + .15 * Math.sin(G.t * 2); ctx.strokeStyle = '#c8a8ff'; ctx.lineWidth = 2 * u; ctx.setLineDash([4 * u, 4 * u]); ctx.beginPath(); ctx.ellipse(px, py + 30 * u, 62 * u, 62 * u / YS * .9, 0, 0, 7); ctx.stroke(); ctx.fillStyle = 'rgba(200,170,255,.07)'; ctx.fill(); ctx.restore();
    const gl = ctx.createRadialGradient(px, py - 20 * u, 0, px, py - 20 * u, 40 * u); gl.addColorStop(0, 'rgba(220,190,255,.5)'); gl.addColorStop(1, 'rgba(220,190,255,0)'); ctx.fillStyle = gl; ctx.fillRect(px - 40 * u, py - 60 * u, 80 * u, 80 * u);
    if (!P.orbs && P.wait) { label(`露米娜 · 修炼 ×${RUN.xiu}`, px, py + 4 * u, '#e6d4ff'); say(px, py - 44 * u, ['还有修炼机会！'], -P.w0); }
    else if (!P.orbs) { label(RUN.xiu > 0 ? `露米娜 · 修炼 ×${RUN.xiu}` : '露米娜', px, py + 4 * u, '#e6d4ff'); say(px, py - 44 * u, RUN.xiu > 0 ? ['辛苦了，勇者。', '过来，我帮你修炼。'] : ['再坚持一下，勇者。', '前面会更危险……'], 0); }
    if (P.orbs) { for (const o of P.orbs) { const Q = DATA.rarity[o.q], x = X(o.x), y = Y(o.y) - 12 * u, r = 12 * u; ctx.fillStyle = 'rgba(30,15,5,.4)'; ctx.beginPath(); ctx.ellipse(x, Y(o.y) + 2 * u, 11 * u, 3.5 * u, 0, 0, 7); ctx.fill();
        const g2 = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8); g2.addColorStop(0, Q.col + 'aa'); g2.addColorStop(1, Q.col + '00'); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(20,14,30,.8)'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.strokeStyle = Q.col; ctx.lineWidth = u; ctx.stroke();
        const im = img(o.adds[0][0] === 'end' ? 'amulet' : o.adds[0][0]); if (im.complete && im.naturalWidth) ctx.drawImage(im, x - 8 * u, y - 8 * u, 16 * u, 16 * u);
        o.adds.forEach(([a, v], k) => label(`+${v} ${DATA.attrs.find(t => t.id === a).name}`, x, y + r + 2 * u + k * 7 * u, Q.col)); ring(o, 15, o.st / .8, '#fff', 12); }
      const c = P.cr; if (c) { const x = X(c.x), y = Y(c.y), free = 2 + (hero.fx.xiuReroll || 0), cost = c.n < free ? 0 : 5 * (c.n - free + 1);
        { const im = CAMPI('crystal'); if (im.complete && im.naturalWidth) { const fw = im.naturalWidth / 4, act = c.st > 0, fr = act ? 2 + (Math.floor(G.t * 8) % 2) : Math.floor(G.t * 2) % 2; ctx.drawImage(im, fr * fw, 0, fw, im.naturalHeight, rd(x - fw * u / 2), rd(y - (im.naturalHeight - 6) * u), rd(fw * u), rd(im.naturalHeight * u)); } }
        label(cost ? `刷新 ${cost} 铜钱` : `刷新（${free - c.n}）`, x, y + 8 * u, '#e6d4ff', 5); ring(c, 12, c.st / .5, '#e6d4ff', 3); if (G.st === 1 && !c.n) label('站上来刷新修炼', x, y - 24 * u, '#c8b890', 5); } }
    const M = f.mer; label('矮人商人', X(M.x), Y(M.y) + 3 * u, '#ffd860'); say(X(M.x), Y(M.y) - 44 * u, ['嘿嘿，要买点什么？', '好货不等人！', '铜钱带够了吗？'], 2.1); ring(M, 14, M.st / .4, '#ffd860');
    restDraw(label, ring);
    if (f.sign) { const S = f.sign, near = dist(S, hero) < 40, hop = near ? Math.abs(Math.sin(G.t * 8)) * 4 : 0, x = X(S.x), y = Y(S.y) - hop * u, on = Math.floor(G.t * 2.5) % 2;   // 11/23 地上的像素 P 键帽
      { const im = CAMPI('pkey'); if (im.complete && im.naturalWidth) { const fw = im.naturalWidth / 2, fr = near && Math.floor(G.t * 4) % 2 ? 1 : 0; ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x - 12 * u, Y(S.y) + u, 24 * u, 3 * u); ctx.drawImage(im, fr * fw, 0, fw, im.naturalHeight, rd(x - fw * u / 2), rd(y - (im.naturalHeight - 2) * u), rd(fw * u), rd(im.naturalHeight * u)); } }
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
    const n = G.st + 1, go = route => { if (RUN.robElite && route === 'fight') { route = 'elite'; G.eliteType = 'gob_blade'; } RUN.robElite = 0; G.st++; G.wi = -1; G.route = route; nextWave(); };
    if (n >= DATA.stations.length) { const bc = [{ k: 'boss', av: 'gob_king', name: '哥布林王', sub: '首领', desc: '森林的尽头是哥布林王座。', btn: '挑战' }]; if (G.fe) { setDoors(bc, () => { G.fe = null; go('boss'); }); const d = G.fe.doors[0]; d.gate = 1; d.born = G.t; d.nb = G.t + 1.3; d.lbl = '哥布林王'; return; } return UI.route({ st: n, cards: bc }, () => go('boss')); }
    const S = DATA.stations[n - 1], info = stationInfo(n), main = info.fresh[0] || info.all[info.all.length - 1];
    const fight = { k: 'fight', av: main, name: S.name, sub: `第 ${n} 站 · Lv${n}`, desc: info.fresh.length ? '会出现：' + info.fresh.map(EN).join('、') : '这一段的老对手。', btn: '前往' };
    const pool = shuffle(info.all.filter(t => !DATA.enemies[t].ranged)), mk = et => ({ k: 'elite', av: et, et, name: '精英 · ' + DATA.enemies[et].name, sub: `第 ${n} 站 · Lv${n}`, desc: '后两段各多一只精英。铜钱 +50%，精英必掉技能书。', btn: '挑战' });
    const e1 = mk(pool[0] || 'gob_blade'), e2 = mk(pool[1] || pool[0] || 'gob_blade');
    let cards;
    if (combatOnly) cards = [fight, e1, e2];
    else { const rs = shuffle(DATA.rests.slice()).map(R0 => Object.assign({ rest: true, sub: '不占站数' }, R0)); cards = shuffle([fight, Math.random() < .5 ? e1 : rs[1], rs[0]]); }
    const pick = c => { if (!c.rest) { G.fe = null; G.eliteType = c.et; return go(c.k); } if (G.fe) return fieldRest(c.k); G.paused = true; doRest(c.k); };
    if (G.fe) return setDoors(cards, pick);
    UI.route({ st: n, cards }, pick);
  }
  function ownBooks() { return new Set(JOBS.skills(RUN).map(x => x.id)); }
  function randBook(minTier) {
    const own = ownBooks(), all = DATA.bookPool(own, Math.max(G.st, minTier >= 3 ? 4 : 1), minTier >= 3);
    const available = [...new Set(all)].filter(id => DATA.skills[id].tier >= (minTier || 1));
    if (!available.length) return null;
    // 先按可用系别柔和加权抽系：主武器同系权重 2.0，其余已持有系 1.25，其他系 1.0（略微倾向同系，但不硬锁）
    const held = new Set(JOBS.skills(RUN).map(x => DATA.skills[x.id].w));
    const fams = [...new Set(available.map(id => DATA.skills[id].w))];
    const fWeights = fams.map(w => w === RUN.weapon ? 2.0 : held.has(w) ? 1.25 : 1.0);
    let fRoll = Math.random() * fWeights.reduce((a, b) => a + b, 0), w = fams[0];
    for (let i = 0; i < fams.length; i++) { fRoll -= fWeights[i]; if (fRoll < 0) { w = fams[i]; break; } }
    const pool = available.filter(id => DATA.skills[id].w === w), ids = pool.length ? pool : available;
    const tiers = [...new Set(ids.map(id => DATA.skills[id].tier))], weights = tiers.map(t => [0, 3, 2, 1, 1][t]), sum = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * sum, tier = tiers[0];
    for (let i = 0; i < tiers.length; i++) { roll -= weights[i]; if (roll < 0) { tier = tiers[i]; break; } }
    const picked = ids.filter(id => DATA.skills[id].tier === tier);
    return picked[Math.random() * picked.length | 0];
  }
  function doRest(k) {
    const back = () => { G.paused = false; showRoute(true); }, base = { st: G.st, wi: 0, kills: 0, coins: 0, xp: 0, lv: G.lv, dmg: {}, loot: [], after: back, goText: '回到路线 ▶' };
    if (k === 'chest') { const L = []; for (let i = 0; i < 3 + ML('chest'); i++) { const id = randBook(); if (id && !L.some(o => o.id === id)) L.push({ kind: 'book', id }); } return CAMP.open(Object.assign(base, { title: '宝箱 · 三本书选一本', tab: 'shi', loot: L, pickOne: true })); }
    if (k === 'fire') { healHero(hero.maxHp * .5); RUN.xiu++; RUN.xopt = null; RUN.xrr = 0; return CAMP.open(Object.assign(base, { title: '篝火 · 回复 50% 生命，修炼一次', tab: 'xiu' })); }
    if (k === 'shop') { RUN.shop = null; RUN.rr = 0; return CAMP.open(Object.assign(base, { title: '地精特价商店 · 全部八折', tab: 'shang', disc: .8 })); }
    const used = RUN.evUsed || (RUN.evUsed = []), L = DATA.events.filter(e => !used.includes(e.id)), E = (L.length ? L : DATA.events)[Math.random() * (L.length || DATA.events.length) | 0]; used.push(E.id);
    back();
  }
  function doEvent(fx) {   // 返回结果文字
    const r = Math.random(), A = DATA.attrs.map(a => a.id), heal = p => { healHero(hero.maxHp * p); };
    const train = (a, v) => { RUN.train[a] = (RUN.train[a] || 0) + v; recompute(); }, give = o => { CAMP.learn(o, true); gotFeed(o); };
    switch (fx) {
      case 'con2': train('con', 2); heal(0); return '体魄 +2，生命上限提高了。';
      case 'end2': train('end', 2); return '耐力 +2。旧盾还挺结实。';
      case 'book2': { const id = randBook(2); if (id) { give({ kind: 'book', id }); return '得到一本技能书。'; } RUN.coins += 30; return '没有新书了，换成 30 铜钱。'; }
      case 'prof': { const L = RUN.slots.filter(Boolean).flatMap(JOBS.leaves); if (!L.length) return '技能栏是空的……'; const sk = L[Math.random() * L.length | 0], lv = profL(sk); if (lv >= 7) return `「${DATA.skills[sk.id].name}」已经练满了。`; sk.xp = DATA.prof[lv]; return `「${DATA.skills[sk.id].name}」熟练度 +1 格。`; }
      case 'rift': if (r < .5) { const id = randBook(3); if (id) { give({ kind: 'book', id }); return '摸出一本技能书！'; } } hero.hp = Math.max(1, hero.hp - hero.maxHp * .2); return '被乱码咬了一口，掉了 20% 生命。';
      case 'gamble': if (RUN.coins < 20) return '铜钱不够，咕噜把杯子收了回去。'; RUN.coins -= 20; if (r < .5) { addCrystal(3, hero.x, hero.y); const it = ITEMS()[Math.random() * ITEMS().length | 0]; give({ kind: 'item', id: it.id }); return '猜中了！得到一件宝物。'; } return '没猜中。咕噜笑得很开心。';
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
  const cMul = () => (1 + (hero.fx.coinMul || 0)) * (G.route === 'elite' ? 1.5 : 1) * (RUN.coinBoost ? 1.3 : 1);
  // 11/23 地上的铜钱：弹出落地，靠近就吸过来；放着 10 秒以上会招来小咕噜偷钱，撞到它钱会掉出来
  function coinTick(dt) {
    const mag = (40 + (hero.fx.waveCoin || 0) * 8) * (RUN.hero === 'c' ? 1.2 : 1);
    for (const c of G.gc) { c.t += dt; if (c.h > 0 || c.vh > 0) { c.vh -= 300 * dt; c.h = Math.max(0, c.h + c.vh * dt); c.x += c.vx * dt; if (c.h === 0) { c.vh = 0; c.vx = 0; } }
      const d = dist(c, hero); if (c.pull && c.t > .35) { const k = Math.min(1, dt * 8); c.x += (hero.x - c.x) * k; c.y += (hero.y - c.y) * k; } if (c.t > .35 && d < mag && !hero.dead) { const k = Math.min(1, dt * (6 + 300 / Math.max(d, 5))); c.x += (hero.x - c.x) * k; c.y += (hero.y - c.y) * k; }
      if (c.t > .35 && d < 9) { c.got = 1; G.cf += c.v * cMul(); const n = Math.floor(G.cf); G.cf -= n; RUN.coins += n; SFX.play('coin'); parts.push({ x: hero.x, y: hero.y - 30 * K, vx: 0, vy: -40 * K, t: 0, T: .3, col: '#ffe08a', g: 0 }); } }
    G.gc = G.gc.filter(c => !c.got);
    for (const o of G.gi) { o.t += dt; if (o.pull && o.t > .4) { const k = Math.min(1, dt * 7); o.x += (hero.x - o.x) * k; o.y += (hero.y - o.y) * k; } if (o.t > .4 && dist(o, hero) < 14 && !hero.dead) { o.got = 1;   // 11/23 书 / 宝物也要走过去捡
      if (o.kind === 'book') { const id = randBook(); if (id) { CAMP.learn({ kind: 'book', id }, true); gotFeed({ kind: 'book', id, x: o.x, y: o.y }); } else { RUN.coins += 30; UI.feed('捡到 30 铜钱'); } }
      else if (o.kind === 'manual') { if (!CAMP.learn({ kind: 'manual', id: o.id }, true)) { o.got = 0; continue; } UI.feed('获得' + JOBS.manuals[o.id].name); } else if (o.kind === 'use') { CAMP.learn({ kind: 'use', id: o.id || 'meat' }, true); } else { const pool = ITEMS(); if (!pool.length) { RUN.coins += 20; continue; } const it = pool[Math.random() * pool.length | 0]; G.paused = true; SFX.play('pick'); UI.slot(slotPool(), [slotOf({ kind: 'item', id: it.id })], () => { G.paused = false; CAMP.learn({ kind: 'item', id: it.id }, true); gotFeed({ kind: 'item', x: o.x, y: o.y }); }); } } }
    G.gi = G.gi.filter(o => !o.got);
    let T = G.thief; if (T) { if (T.grab > 0) { T.grab -= dt; T.t += dt; return; } if (T.hurt > 0) T.hurt -= dt; }
    if (!T && !G.fe && !RUN.noThief && G.gc.some(c => c.t > 10)) { const p = edgeSpawn(); T = G.thief = { x: p.x, y: p.y, ex: p.x, ey: p.y, bag: 0, n: 0, st: 'go', t: 0, f: 1 }; UI.feed('一只小咕噜溜进来偷钱了！'); }
    if (!T) return; T.t += dt;
    let tx = T.ex, ty = T.ey;
    if (T.st === 'go') { let best = null, bd = 1e9; for (const c of G.gc) if (c.t > 6) { const d = dist(c, T); if (d < bd) { bd = d; best = c; } } if (!best || T.n >= 3) T.st = 'run'; else { tx = best.x; ty = best.y; if (bd < 8) { const s = Math.ceil(best.v * .5); T.bag += s; T.grab = .45; best.v -= s; T.n++; if (best.v <= 0) G.gc = G.gc.filter(c => c !== best); } } }
    const dx = tx - T.x, dy = ty - T.y, dd = Math.hypot(dx, dy) || 1, sp = (T.st === 'run' ? 130 : 105) * K * dt; T.f = dx < 0 ? -1 : 1;
    if (dd <= sp) { T.x = tx; T.y = ty; if (T.st === 'run') { if (T.bag) { UI.feed(`小咕噜偷走了 ${T.bag} 铜钱`); G.stolen = 1; } G.thief = null; return; } } else { T.x += dx / dd * sp; T.y += dy / dd * sp; }
    if (dist(T, hero) < 22 && T.bag && !hero.dead) { G.gc.push({ x: T.x, y: T.y, v: T.bag, t: 0, h: 0, vh: 110, vx: 0 }); UI.feed(`抓到小咕噜！${T.bag} 铜钱掉了出来`); RUN.thief = (RUN.thief || 0) + 1; T.bag = 0; T.hurt = .4; T.st = 'run'; T.n = 9; }
  }
  // 11/23 掉落物和小咕噜换成出的像素图（art/drop、art/goblin/gob_thief）
  const DI = {}; const dimg = n => DI[n] || (DI[n] = Object.assign(new Image(), { src: 'art/drop/' + n + '.png' }));
  const BKS = ['sword', 'spear', 'bow', 'staff', 'gun', 'tome', 'scythe'];
  function dspr(n, x, yb, k) { const im = dimg(n); if (!im.complete || !im.naturalWidth) return; const w = im.naturalWidth * u * (k || 1), h = im.naturalHeight * u * (k || 1); ctx.imageSmoothingEnabled = false; ctx.drawImage(im, x - w / 2, yb - h, w, h); }
  const merFrame = M => (M.dealT > G.t ? 'deal' : dist(M, hero) < 60 ? 'wave' : 'idle') + (Math.floor(G.t * 2.5) % 2);
  function coinDraw() {
    for (const o of G.gi) { const x = X(o.x), gy = Y(o.y), bk = o.kind === 'book'; o.c = o.c || BKS[Math.random() * BKS.length | 0];
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(0, gy - 54 * u, 0, gy); g.addColorStop(0, 'rgba(255,220,120,0)'); g.addColorStop(1, bk ? 'rgba(140,200,255,.45)' : 'rgba(255,200,90,.45)'); ctx.fillStyle = g; ctx.fillRect(x - 5 * u, gy - 54 * u, 10 * u, 54 * u); ctx.restore();
      ctx.fillStyle = 'rgba(30,15,5,.45)'; ctx.beginPath(); ctx.ellipse(x, gy + u, 10 * u, 3 * u, 0, 0, 7); ctx.fill(); dspr(bk ? 'book_' + o.c : 'chest', x, gy + 2 * u); }
    for (const c of G.gc) { const x = X(c.x), gy = Y(c.y), air = c.h > 0 || c.vh > 0, y = gy - c.h * u * .4;
      ctx.fillStyle = 'rgba(30,15,5,.4)'; ctx.beginPath(); ctx.ellipse(x, gy + u, (c.v > 5 ? 9 : c.v > 2 ? 7 : 5) * u, 2 * u, 0, 0, 7); ctx.fill();
      if (air) dspr('coin' + (Math.floor(c.t * 14) % 4), x, y + u); else dspr(c.v > 5 ? 'pile2' : c.v > 2 ? 'pile1' : 'coin0', x, gy + u);
      if (c.t > 8 && Math.floor(c.t * 4) % 2) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 5 * u, y - 10 * u, u, u); } }
    const T = G.thief; if (T) { shadow(T.x, T.y, 14);
      const n = T.hurt > 0 ? 'hurt' + (T.hurt > .2 ? 0 : 1) : T.grab > 0 ? 'steal' + Math.min(2, Math.floor((1 - T.grab / .45) * 3)) : (T.st === 'run' && T.bag ? 'flee' : 'walk') + (Math.floor(T.t * 14) % 6);
      SPR.draw(ctx, 'gob_thief', n, 0, X(T.x), Y(T.y), T.f < 0, u, {}); }
  }

  // ---------- 11/23 地图氛围：光柱 / 火光火星 / 落叶 / 萤火虫，位置全部取自地图本身（MAP.amb，原图像素） ----------
  const AMB = { leaves: [], flies: [], sparks: [], rain: [] };
  // 11/23 照三国终章：火用 8 帧火焰序列图（盖在地图画的火上），落叶用桑叶图，光柱用 shaft 图
  const CI = {}; const CAMPI = n => CI[n] || (CI[n] = Object.assign(new Image(), { src: 'art/camp/' + n + '.png' }));
  const FXI = {}; const fxi = n => FXI[n] || (FXI[n] = Object.assign(new Image(), { src: 'art/fx/map/' + n + '.webp' })); const okI = i => i.complete && i.naturalWidth;
  function ambDraw(dt) {
    const A = MAP.amb; if (!A) return;
    if (AMB.map !== MAP.id) { AMB.map = MAP.id; AMB.sparks.length = 0; }
    const q = MAPW / (MIMG.naturalWidth || 1672), P = (x, y) => [X(x * q), Y(y * q)], t = G.t;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    { const sh = fxi('shaft'); if (okI(sh)) for (const [x, y, w, h] of A.rays || []) { const [sx, sy] = P(x, y); ctx.globalAlpha = .55 + .2 * Math.sin(t * .5 + x); ctx.drawImage(sh, sx - w * q * s * .2, sy, w * q * s * 1.2, h * q * s); } ctx.globalAlpha = 1; }
    for (const [x, y, w, h] of A.rays || []) { const [sx, sy] = P(x, y), L = h * q * s, Wd = w * q * s * .35; for (let i = 0; i < 3; i++) { const a = .12 + .05 * Math.sin(t * .6 + i * 2 + x), ox = (i - 1) * Wd * .7;
      const g = ctx.createLinearGradient(sx, sy, sx + L * .45, sy + L); g.addColorStop(0, `rgba(255,236,170,${a})`); g.addColorStop(1, 'rgba(255,236,170,0)'); ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(sx + ox, sy); ctx.lineTo(sx + ox + Wd * .5, sy); ctx.lineTo(sx + ox + L * .45 + Wd, sy + L); ctx.lineTo(sx + ox + L * .45 - Wd * .2, sy + L); ctx.fill(); } }
    for (const [x, y, k] of A.fires) { const [sx, sy] = P(x, y - 14 * k), r = (A.slowFire ? 26 + 1.5 * Math.sin(t * 1.8 + x) + .7 * Math.sin(t * 4 + y) : 26 + 4 * Math.sin(t * 9 + x) + 3 * Math.sin(t * 23 + y)) * k * s * q, g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      g.addColorStop(0, 'rgba(255,190,90,.38)'); g.addColorStop(.5, 'rgba(255,120,40,.12)'); g.addColorStop(1, 'rgba(255,80,20,0)'); ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, 2 * r, 2 * r);
      if (Math.random() < dt * 7 * k) AMB.sparks.push({ x: x + R(-4, 4) * k, y: y - 4, vx: R(-6, 6), vy: R(-38, -20), t: 0, T: R(.6, 1.2) }); }
    // 裂缝沿原图石板缝叠加，仅视觉，不参与碰撞或伤害。
    for (const points of A.cracks || []) {
      const pulse = .24 + .10 * Math.sin(t * .9 + points[0][0]);
      ctx.lineJoin = 'round';
      for (const [width, alpha] of [[12, pulse * .22], [5, pulse * .45], [1.5, pulse]]) {
        ctx.strokeStyle = `rgba(255,35,20,${alpha})`; ctx.lineWidth = width * q * s; ctx.beginPath();
        points.forEach(([x, y], i) => { const [sx, sy] = P(x, y); if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); }); ctx.stroke();
      }
      if (Math.random() < dt * .45) { const [x, y] = points[Math.random() * points.length | 0]; AMB.sparks.push({ x, y, vx: R(-7, 7), vy: R(-22, -12), t: 0, T: R(.5, .9), red: true }); }
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const [x, y, k, kind, hh] of A.fires) { const im = fxi(kind); if (!okI(im)) continue; const fw = im.naturalWidth / 8, f = Math.floor(t * 12 + x) % 8, h = hh * q * s, w = h * fw / im.naturalHeight, [sx, sy] = P(x, y); ctx.drawImage(im, f * fw, 0, fw, im.naturalHeight, sx - w / 2, sy - h, w, h); }
    ctx.globalCompositeOperation = 'lighter';
    for (const p of AMB.sparks) { p.t += dt; p.x += (p.vx + Math.sin(p.t * 6) * 8) * dt; p.y += p.vy * dt; const [sx, sy] = P(p.x, p.y), a = 1 - p.t / p.T; ctx.fillStyle = p.red ? `rgba(255,45,25,${a * .7})` : `rgba(255,${160 + 80 * a | 0},70,${a})`; ctx.fillRect(sx, sy, u, u); }
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
    // 11/26 雨丝：斜着落的短线，落到地面溅一个小圈
    if (A.rain) { const n = 160; while (AMB.rain.length < n) AMB.rain.push({ x: R(-60, W + 60), y: R(-H, H), v: R(520, 820), L: R(10, 18), a: R(.35, .65) });
      ctx.save(); ctx.lineWidth = Math.max(1, u * .6);
      for (const r of AMB.rain) { r.y += r.v * dt * H / 800; r.x -= r.v * .22 * dt * H / 800; if (r.y > H + 20) { r.y = R(-80, -10); r.x = R(-60, W + 120); } ctx.strokeStyle = `rgba(190,210,235,${r.a})`; ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + r.L * .22 * u * .5, r.y - r.L * u * .5); ctx.stroke(); }
      ctx.restore(); }
  }
  const BKI = { '剑': 'bk_sword', '枪': 'bk_spear', '弓': 'bk_bow', '法杖': 'bk_wand', '圣典':'bk_tome', '镰刀':'bk_scythe', '掌机': 'bk_gun', '通用': 'bk_sword' };
  function slotOf(o) { if (o.kind === 'book') { const S = DATA.skills[o.id]; return { src: 'art/ui2/' + BKI[S.sys] + '.png', name: S.name, rare: S.tier >= 3 }; } const it = DATA.startItems.find(i => i.id === o.id) || {}; return { src: 'art/ui2/' + o.id + '.png', name: it.name || '宝物', em: it.icon, rare: (it.price || 0) >= 44 }; }
  function slotPool() { const P = []; for (const id in DATA.skills) P.push(slotOf({ kind: 'book', id })); for (const it of ITEMS()) P.push(slotOf({ kind: 'item', id: it.id })); return P; }
  function gotFeed(o) { const k = o.kind === 'book' ? '一本技能书' : o.kind === 'item' ? '一件宝物' : ''; if (k) { try { const rc = cv.getBoundingClientRect(), q = rc.width / cv.width, ic = o.kind === 'book' ? 'art/drop/book_' + (({ '剑': 'sword', '枪': 'spear', '弓': 'bow', '法杖': 'staff', '掌机': 'gun', '圣典': 'tome', '镰刀': 'scythe', '通用': 'sword' })[(DATA.skills[o.id] || {}).sys] || 'sword') + '.png' : 'art/drop/chest.png'; if (o.x != null) UI.FX.fly(ic, rc.left + X(o.x) * q, rc.top + Y(o.y) * q); } catch (e) {} UI.feed(`获得${k}，${UI.pTip()}`); UI.newDot(); } }
  function toastMsg(t) { UI.toast && UI.toast(t); }
  function bossIn() { if (G.bossOut) return; G.bossOut = true; G.boss = spawn(G.W.boss || MAP.boss); G.boss.cd = 2.5; banner('哥布林王 出现了！', 2.4); G.shake = .3; }

  // ---------- 每帧更新 ----------
  // 11/23 所有回血走这里：统一乘治疗倍率（狂战士项链 −30% 等）
  function healSkill(n) { if (!hero || hero.dead || n <= 0) return 0; hero.skillHeals = (hero.skillHeals || []).filter(x => G.t - x.t < 3); const used = hero.skillHeals.reduce((a, x) => a + x.n, 0); const room = Math.max(0, hero.maxHp * .03 - used), amount = Math.min(room, n * Math.max(0, 1 + (hero.fx.healMul || 0))); const healed = Math.min(hero.maxHp - hero.hp, amount); hero.hp += healed; if (healed > 0) hero.skillHeals.push({ t: G.t, n: healed }); return healed; }
  function healHero(n) { if (!hero || hero.dead || n <= 0) return 0; const h0 = hero.hp; hero.hp = Math.min(hero.maxHp, hero.hp + n * Math.max(0, 1 + ((hero.fx || {}).healMul || 0))); return hero.hp - h0; }
  function update(dt) {
    { const dc = RUN.coins - (G.lastC == null ? RUN.coins : G.lastC); if (dc > 0) G.earned = (G.earned || 0) + dc; G.lastC = RUN.coins; }
    G.t += dt; hero.t += dt; if (G.lvUpT > 0) G.lvUpT -= dt;
    if ((G.crT = (G.crT || 0) - dt) <= 0) { G.crT = 1; const ok = !!(window.CAMP && CAMP.careerReady && CAMP.careerReady()); if (ok && !G.crOk) { banner('可以转职了！打开备战页点「转职」', 3); SFX.play('lv'); UI.newDot(); } G.crOk = ok; }   // 11/27 转职提醒：条件刚满足时提示一次，暂停键亮红点
    if (G.comboT > 0 && (G.comboT -= dt) <= 0) G.combo = 0; coinTick(dt);   // 11/22 连击：3 秒没杀到怪就断
    if (G.drop) { G.drop.t += dt; hero.inv = Math.max(hero.inv, .2); if (G.drop.t >= DROP_T && !G.drop.land) { G.drop.land = 1; G.shake = Math.max(G.shake, .7); SFX.play('pon');
        for (let i = 0; i < 40; i++) { const a = R(0, PI * 2), v = R(40, 130) * K; parts.push({ x: hero.x, y: hero.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .4 - 10 * K, t: 0, T: R(.4, .8), col: i % 3 ? '#c8b088' : '#e8dcc0', g: 0 }); }
        banner((MAP.name || '哥布林森林') + (MAP.wx ? ' · ' + MAP.wx : ''), 2.4); } if (G.drop.t > DROP_T + .8) G.drop = null; }
    if (G.banner) { G.banner.left -= dt; if (G.banner.left <= 0) G.banner = null; }
    G.shake = Math.max(0, G.shake - dt);
    if (G.winT != null && (G.winT -= dt) <= 0 && !G.over && !G.vic) { G.vic = 1; G.paused = true; clearSave(); return UI.victory(vicStats(), () => { G.paused = false; G.lock = false; G.winT = null; banner('', 0); fieldEnd(G.bossManual ? [G.bossManual] : []); G.bossManual = null; setDoors([{ k: 'boss', lbl: '下一章', name: '下一章', btn: '前往' }], () => { G.fe = null; G.over = 'win'; UI.nextChapter(); }); }); }
    if (hero.dead) hero.deadT += dt;
    else {
      if (hero.rollN < hero.rollN0) { hero.rollCd -= dt; if (hero.rollCd <= 0) { hero.rollN++; hero.rollCd = hero.rollN < hero.rollN0 ? hero.rollMax : 0; } } else hero.rollCd = 0;
      for(const key of ['mistT','featherT','cloakT','oilT','sacredShieldT'])if(hero[key]>0)hero[key]-=dt;
      if(!(hero.sacredShieldT>0))hero.sacredShield=0;
      if (hero.shadowT > 0) hero.shadowT -= dt; if (G.decoy && (G.decoy.t -= dt) <= 0) G.decoy = null;
      hero.inv -= dt; hero.hurtT -= dt; if (hero.cyT > 0) hero.cyT -= dt; if (hero.afterRoll > 0) hero.afterRoll -= dt; if (hero.lzT > 0) hero.lzT -= dt;
      hero.stillT = hero.moving ? 0 : (hero.stillT || 0) + dt; if (!G.fe) G.stT = (G.stT || 0) + dt;
      if (hero.rolling && hero.roll <= 0) { hero.rolling = 0;if(OB('youlong')&&hero.rollFull&&hero.pushed.size){const a=Math.atan2(hero.rvy,hero.rvx);fx.push({k:'line',x:hero.x,y:hero.y,a,L:65,w:45,t:0,T:.3,col:'#bfe8ff'});for(const z of foes)if(!z.dead&&!z.tier&&!z.T.boss&&dist(z,hero)<65)API.push(z,a,24);}
        if (OB('zhendi') && hero.rollFull) { const sec = .2 * OB('zhendi'); G.shake = Math.max(G.shake, .1); fx.push({ k: 'ring', x: hero.x, y: hero.y, t: 0, T: .35, r: 46 });
        for (const z of foes) if (!z.dead && !z.flee && dist(z, hero) < 46 && !(z.zdT > G.t)) { z.zdT = G.t + 2; hurt(z, 0, hero, 30, null, { cc: ['stun', z.T.boss || z.tier === 'mini' ? sec / 2 : sec], quiet: true }); } } } if (hero.rollBuf > 0) { hero.rollBuf -= dt; if (hero.roll <= 0 && hero.rollCd <= 0) roll(); }
      if(hero.roll>0)for(const z of foes)if(!z.dead&&dist(z,hero)<26){
        if(OB('frosttrail')){z.slowP=Math.max(z.slowP||0,.15);z.slowPT=Math.max(z.slowPT||0,1);}
        if(!hero.pushed.has(z)){if(OB('sigil'))for(const key of ['breakT','preyT','imbalanceT','judgmentT','curseT','slowT'])if(z[key]>0)z[key]+=.8;
          if(!OB('zhendi'))hero.pushed.add(z);}
      }
      if (hero.roll > 0 && OB('zhendi') && hero.rollFull) for (const z of foes) if (!z.dead && !z.flee && !hero.pushed.has(z) && dist(z, hero) < 26) { hero.pushed.add(z); const a = Math.atan2(z.y - hero.y, z.x - hero.x); z.kbx += Math.cos(a) * 26 * K; z.kby += Math.sin(a) * 26 * K; }   // 震地步：路上的怪被推开
      if (hero.roll > 0) { hero.roll -= dt; hero.x += hero.rvx * 240 * K * dt * (hero.rollMul || 1); hero.y += hero.rvy * 182 * K * dt * (hero.rollMul || 1); if (Math.random() < .7) parts.push({ x: hero.x, y: hero.y, vx: R(-10, 10) * K, vy: R(-10, 0) * K, t: 0, T: .3, col: '#e6dcb4', g: 0 }); }
      else { const c = hero.cs, root = hero.rootT > 0, mm = !c ? 1 : c.ph === 'wu' ? (c.S.charge ? .5 : 1) : c.ph === 'hold' ? c.move : (!c.move && c.t < SKF.get(c.sk.id).hitT) ? 1 : .4;   // 11/22：出手那一下不减速，之后的后摇 40% 慢走（翻滚取消）
        const [dx, dy] = root ? [0, 0] : moveDir(), d = Math.hypot(dx, dy); hero.moving = d > .1; if (hero.moving) { hero.mvx = (hero.mvx || 0) * .9 + dx / (d || 1) * .1; hero.mvy = (hero.mvy || 0) * .9 + dy / (d || 1) * .1; hero.mvT = (hero.mvT || 0) + dt; } else hero.mvT = 0; if (hero.moving) { const k = Math.min(1, d), v = 80 * hero.m.move * mm * K * (ESK ? ESK.slow() : 1) * (hero.featherT>0?1.15:1)*(hero.cloakT>0?1.2:1) * (hero.shadowT > 0 ? 1.3 : 1); hero.x += dx / (d || 1) * k * v * dt; hero.y += dy / (d || 1) * k * v * .76 * dt; if (!c || c.ph !== 'hold') hero.f = dx < -.1 ? -1 : dx > .1 ? 1 : hero.f; } }
      clampG(hero, 8 * K); weapon(dt);
    }
    if (!hero.dead) { SK.tick(dt);
    }
    spawner(dt); warnTick(dt); auraTick(dt); fieldTick(dt);
    for (const z of foes) {
      if (z.dead) { z.deadT += dt; continue; }
      z.flash -= dt; z.jit = (z.jit || 0) - dt; z.kbT -= dt; z.brk = (z.brk || 0) - dt; statusTick(z, dt); if (z.dead) continue;
      const dc = G.decoy; let hx0, hy0; if (dc) { hx0 = hero.x; hy0 = hero.y; hero.x = dc.x; hero.y = dc.y; G.decoyOn = 1; }   // 暗影步假身：这段时间怪把假身当成勇者
      if (z.cc) z.moving = false; else if (z.eLock) z.moving = false; else if (z.T.boss || z.T.ai === 'boss') bossAI(z, dt); else soldierAI(z, dt);
      if (dc) { hero.x = hx0; hero.y = hy0; G.decoyOn = 0; }
      z.x += z.kbx * dt * 8; z.y += z.kby * dt * 8; z.kbx *= .8; z.kby *= .8; clampG(z, 4 * K);
    }
    if (ESK) ESK.tick(dt, foes);
    if (MECH && MECH.on() && !G.over) MECH.tick(dt); if (!G.over) { propsTick(dt); wildlifeTick(dt); }
    const L = foes.filter(z => !z.dead && !z.T.ghost), m0 = 9 * K;   // 互相推开，别叠成一坨
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j], dx = b.x - a.x, dy = (b.y - a.y) * YS, d = Math.hypot(dx, dy), m = a.T.boss || b.T.boss ? m0 * 2.2 : m0; if (d > 0 && d < m) { const p = (m - d) / 2 / d; if (!a.T.boss) { a.x -= dx * p; a.y -= dy * p / YS; } if (!b.T.boss) { b.x += dx * p; b.y += dy * p / YS; } } }
    for (let i = foes.length - 1; i >= 0; i--) { const z = foes[i]; if ((z.dead && z.deadT > (z.T.boss ? 3 : 1.3)) || (z.flee && (z.fleeT = (z.fleeT || 0) + dt) > 1.6)) foes.splice(i, 1); }
    teleTick(dt); shotTick(dt);
    for (const a of [fx, parts, nums, burns]) for (let i = a.length - 1; i >= 0; i--) { const o = a[i]; o.t += dt; if (o.vx != null) { o.x += o.vx * dt; o.y += o.vy * dt; o.vy += (o.g || 0) * dt; } if (o.t >= (o.T || (o.txt ? 1.4 : .75))) a.splice(i, 1); }
  }
  /* 11/25 战斗中也检查称号：每站结算 / 击败首领时（累计战绩 + 本局进度），达成就在左下角报一次 */
  function liveTitles() { try { const R0 = JSON.parse(localStorage.getItem('xsyz-rec') || '{}'); R0.kills = (R0.kills || 0) + Math.max(0, G.kills - (RUN.recK || 0)); R0.elites = (R0.elites || 0) + (RUN.elites || 0); if (G.winT != null) R0.wins = (R0.wins || 0) + 1;
      const own = JSON.parse(localStorage.getItem('xsyz-titles') || '[]'); let n = 0; for (const t of DATA.titles) if (!own.includes(t.id) && t.need(R0, RUN)) { own.push(t.id); (RUN.newT = RUN.newT || []).push(t.name); UI.feed('★ 获得称号：' + t.name, 't'); try { EGG.chime(); } catch (e) {} n++; } if (n) localStorage.setItem('xsyz-titles', JSON.stringify(own)); } catch (e) {} }
  function vicStats() { const sk = RUN.slots.filter(Boolean).map(k => ({ id: k.id, name: JOBS.name(k), L: k.job ? null : profL(k), p: (() => { if (k.job) return k.job.final ? 1 : k.job.progress / JOBS.PROGRESS_MAX; const nx = DATA.prof[profL(k)]; return nx ? Math.min(1, (k.xp || 0) / nx) : 1; })() }));
    return { time: G.t, kills: G.kills, combo: G.bestCombo || G.maxCombo || 0, coins: Math.round(G.earned || 0), taken: Math.round(G.taken || 0), lv: G.lv, xp: G.xp / need(), dmg: RUN.dmgAll || {}, sk, got: RUN.got || [] }; }
  function end() {
    let cont = 0; if (G.over !== 'win') { const S = loadSave(), used = (RUN.livesUsed || 0) + 1, lives = RUN.lives || 2; if (S && used < lives) { S.RUN.livesUsed = used; S.RUN.lives = lives; try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) {} cont = lives - used; } }   // 11/24 续命：还有命就留着本站存档
    try { const R0 = JSON.parse(localStorage.getItem('xsyz-rec') || '{}'); R0.best = Math.max(R0.best || 0, G.over === 'win' ? 99 : G.st); R0.kills = (R0.kills || 0) + Math.max(0, G.kills - (RUN.recK || 0)); if (G.over === 'win') R0.wins = (R0.wins || 0) + 1; else R0.deaths = (R0.deaths || 0) + 1; R0.runs = (R0.runs || 0) + (cont ? 0 : 1); R0.elites = (R0.elites || 0) + (RUN.elites || 0); RUN.elites = 0; localStorage.setItem('xsyz-rec', JSON.stringify(R0));
      const own = JSON.parse(localStorage.getItem('xsyz-titles') || '[]'); for (const t of DATA.titles) if (!own.includes(t.id) && t.need(R0, RUN)) { own.push(t.id); (RUN.newT = RUN.newT || []).push(t.name); } localStorage.setItem('xsyz-titles', JSON.stringify(own));
      if (cont) { const S = loadSave(); if (S) { S.RUN.recK = S.G.kills || 0; S.RUN.elites = 0; S.RUN.newT = RUN.newT || []; localStorage.setItem(SAVE, JSON.stringify(S)); } } } catch (e) {}   // 续关：已记过的击杀 / 精英不重复记，新称号留到结算页   // 11/24 称号解锁   // 11/24 大臣的战绩
    // 11/25 通关：装备卖给士兵、书 / 石头 / 宝物卖给大法师，自动换成水晶（没通关不结算）
    let sellG = 0, sellB = 0; if (G.over === 'win') { gs(); const w = x => (DATA.sellWeapon[(x.t || 1) - 1] || 0) + (x.aff || []).length;
      sellG = w(RUN.eq.main) + RUN.gbag.reduce((a, x) => a + (x.k === 'w' ? w(x) : DATA.sellGear[(x.t || 1) - 1] || 0), 0) + Object.entries(RUN.eq).reduce((a, [k, x]) => a + (k !== 'main' && x ? DATA.sellGear[(x.t || 1) - 1] || 0 : 0), 0);
      sellB = [1, 2, 3].reduce((a, t) => a + (RUN.stones[t] || 0) * DATA.sellStone[t], 0) + RUN.bag.reduce((a, x) => a + (x && x.kind === 'book' && DATA.skills[x.id] ? DATA.sellBook[DATA.skills[x.id].tier] || 1 : x && x.kind === 'item' ? 1 : 0), 0);
      const n = sellG + sellB; if (n) { try { localStorage.setItem('xsyz-crystal', (+localStorage.getItem('xsyz-crystal') || 0) + n); } catch (e) {} RUN.cry = (RUN.cry || 0) + n; } }
    if (!cont) clearSave(); UI.result({ cont, sellG, sellB, cry: RUN.cry || 0, newT: RUN.newT || [], win: G.over === 'win', kills: G.kills, time: G.t, lv: G.lv, weapon: RUN.weapon, st: G.st, wi: G.wi, boss: !!(G.W && G.W.boss), dmg: RUN.dmgAll, killer: G.killer, killerElite: G.killerElite, stolen: G.stolen });
  }

  // ---------- 绘制 ----------
  function shadow(x, y, w) {   // 斜影子：两层像素椭圆，往右下斜（光从左上来）
    const ox = 3, hw0 = Math.max(3, w / 2 | 0), X0 = X(x), Y0 = Y(y);
    for (const [k, a] of [[1.25, .14], [.95, .22]]) { const hw = rd(hw0 * k), hh = Math.max(1, rd(hw * .3)); ctx.fillStyle = `rgba(60,30,10,${a})`;
      for (let j = -hh; j <= hh; j++) { const ww = rd(hw * Math.sqrt(1 - (j / (hh + .5)) ** 2)); ctx.fillRect(X0 + rd(ox * (j + hh) / (2 * hh) - ww + ox * .5) * u, Y0 + j * u, ww * 2 * u, u); } }
  }
  function heroFrame() {
    if (hero.dead) return (G.deadR || 0) < .55 ? ['hurt', 0] : ['dead', 0];
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
    G.kx = (G.kx || 0) * .82; G.ky = (G.ky || 0) * .82; ctx.setTransform(1, 0, 0, 1, sh - rd(G.kx * u), -rd(G.ky * u));
    if (MIMG.complete && MIMG.naturalWidth) { const k = MIMG.naturalWidth / MAPW; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(MIMG, cam.x * k, cam.y * k, Wm * k, Hm * k, 0, 0, W, H); ctx.imageSmoothingEnabled = false; }
    else { ctx.fillStyle = '#6a4a2a'; ctx.fillRect(0, 0, W, H); }
    wildlifeDraw();
    for (const b of burns) { const a = 1 - b.t / b.T; ctx.fillStyle = `rgba(40,20,10,${.35 * a})`; ctx.beginPath(); ctx.ellipse(X(b.x), Y(b.y), b.r * u, b.r * u * .55, 0, 0, 7); ctx.fill(); }
    for (const o of tele) {   // 地面预警：虚线边 + 慢慢填满，最后闪
      const p = o.t / o.T, blink = p > .7 && (Math.floor(o.t * 16) % 2), col = o.mine ? (blink ? '#ffffff' : '#ffd86a') : blink ? '#fff2c0' : '#d8402a';
      ctx.save(); ctx.translate(X(o.x), Y(o.y));
      if (o.k === 'circle') { const r = o.r * u; ctx.fillStyle = o.mine ? 'rgba(255,216,106,.18)' : 'rgba(216,64,42,.28)'; ctx.beginPath(); ctx.ellipse(0, 0, r * p, r * p / YS, 0, 0, 7); ctx.fill(); ctx.fillStyle = col; for (let a = 0; a < PI * 2; a += .08) { if (Math.floor(a / .08) % 2) continue; ctx.fillRect(rd(Math.cos(a) * r), rd(Math.sin(a) * r / YS), 2 * u, 2 * u); } }
      else { ctx.scale(1, 1 / YS); ctx.rotate(o.a); const L = o.len * u, w = o.w * u; ctx.fillStyle = 'rgba(216,64,42,.26)'; ctx.fillRect(0, -w / 2, L * p, w); ctx.fillStyle = col; for (let i = 0; i < L; i += 6 * u) { ctx.fillRect(i, -w / 2, 3 * u, u); ctx.fillRect(i, w / 2, 3 * u, u); } }
      ctx.restore();
    }
    for (const w of warns) {   // 出怪预警：地上一个小圈慢慢合拢
      const p = Math.max(0, Math.min(1, w.t / warnDuration(w))), r = (14 + 10 * (1 - p)) * u; ctx.fillStyle = `rgba(30,10,5,${.25 + .25 * p})`; ctx.beginPath(); ctx.ellipse(X(w.x), Y(w.y), r, r / YS, 0, 0, 7); ctx.fill();
      ctx.fillStyle = w.tier ? '#ffcf3a' : '#d8402a'; for (let a = 0; a < PI * 2; a += .2) ctx.fillRect(X(w.x) + rd(Math.cos(a) * r), Y(w.y) + rd(Math.sin(a) * r / YS), u, u);
    }
    SK.drawUnder(ctx, X, Y, u); ESK && ESK.drawUnder(ctx, X, Y, u, G.t); chargePreview(); coinDraw(); princessDraw(); fieldDraw(); MECH && MECH.drawUnder(ctx, X, Y, s, G.t); propsUnder();   // 11/23 地上的光球、掉落、门画在人物下面
    for (const o of shots) if (o.k === 'fire') {   // 火球落点：地上的影子越来越大
      const p = o.t / o.T, r = o.r * u * (.3 + .7 * p); ctx.fillStyle = `rgba(255,90,30,${.15 + .2 * p})`; ctx.beginPath(); ctx.ellipse(X(o.x), Y(o.y), r, r / YS * .8, 0, 0, 7); ctx.fill();
    }
    const list = foes.map(z => ({ y: z.y, z })); list.push({ y: hero.y, h: 1 });
    if (G.pr) { const p = G.pr; list.push({ y: p.y, d: () => { const fade = p.done ? Math.max(0, 1 - p.t2 / 1.2) : Math.min(1, p.t / .6); ctx.save(); ctx.globalAlpha = fade; shadow(p.x, p.y, 26); SPR.drawHero(ctx, p.t < 1.1 ? 'big' : 'idle', Math.floor(G.t * 3) % 2, X(p.x), Y(p.y), p.x > hero.x, u, { w: 'staff', c: 'p' }); ctx.restore(); } }); }
    if (G.fe) { const P = G.fe.pr, M = G.fe.mer;   // 11/23 公主、商人和勇者按前后排序，脚下有影子
      list.push({ y: P.y, d: () => { shadow(P.x, P.y, 26); SPR.drawHero(ctx, P.orbs ? 'big' : 'idle', Math.floor(G.t * 3) % 2, X(P.x), Y(P.y), P.x > hero.x, u, { w: 'staff', c: 'p' }); } });
      list.push({ y: M.y, d: () => { shadow(M.x, M.y, 30); SPR.draw(ctx, 'gob_merchant', merFrame(M), 0, X(M.x), Y(M.y), false, u, {}); } }); }
    if (MECH && MECH.on()) list.push(...MECH.entries(ctx, X, Y, s));
    list.push(...propsEntries());
    list.sort((a, b) => a.y - b.y);
    for (const o of list) {
      if (o.d) { o.d(); continue; }
      if (o.h) {
        // Screenshot-only debug comparison: all three use identical sprite scale.
        if (new URLSearchParams(location.search).has('debug') && new URLSearchParams(location.search).has('bowcompare') && SPR.sets.heroBowPreview) {
          const [bn,bi]=heroFrame(), px=X(hero.x), py=Y(hero.y);
          for(const offset of [-52,0,52])shadow(hero.x+offset*K,hero.y,26);
          SPR.draw(ctx,'hero','bow.'+bn,bi,px-52*u,py,false,u,{});
          SPR.drawHero(ctx,bn,bi,px,py,false,u,{w:'bow',c:'bowPreview'});
          SPR.draw(ctx,'goblin','idle'+(Math.floor(G.t*2)%2),0,px+52*u,py,true,u,{});
          ctx.save();ctx.textAlign='center';ctx.font=`${7*u}px Pix, sans-serif`;ctx.lineWidth=3*u;ctx.strokeStyle='#26170c';ctx.fillStyle='#fff0c8';
          for(const [txt,offset] of [['旧弓',-52],['新弓',0],['哥布林',52]]){ctx.strokeText(txt,px+offset*u,py+12*u);ctx.fillText(txt,px+offset*u,py+12*u);}ctx.restore();
          continue;
        }
        shadow(hero.x, hero.y, 26);
        if (hero.inv > 0 && hero.roll <= 0 && hero.hurtT <= 0 && !hero.dead && !(hero.shadowT > 0) && Math.floor(G.t * 20) % 2) continue;
        if (G.drop && G.drop.t < DROP_T) { const k = G.drop.t / DROP_T; ctx.fillStyle = `rgba(0,0,0,${.12 + .3 * k})`; ctx.beginPath(); ctx.ellipse(X(hero.x), Y(hero.y), (3 + 11 * k) * u, (1.5 + 4 * k) * u, 0, 0, 7); ctx.fill(); }   /* 影子越来越大 */
        const [n, i, st, lg] = heroFrame(), wp = hero.cs ? hero.cs.S.w : (RUN.slots[0] && DATA.skills[RUN.slots[0].id] && DATA.skills[RUN.slots[0].id].w) || HWPN[RUN.weapon] || 'sword';
        if (G.decoy) { ctx.save(); ctx.globalAlpha = .45 + .15 * Math.sin(G.t * 10); SPR.drawHero(ctx, 'idle', 0, X(G.decoy.x), Y(G.decoy.y), hero.f < 0, u, { white: .5, w: wp, c: RUN.hero }); ctx.restore(); }   // 暗影步假身
        if (hero.shadowT > 0) { ctx.save(); ctx.globalAlpha = .55; ctx.filter = 'brightness(.15) sepia(1) hue-rotate(220deg) saturate(3)'; SPR.drawHero(ctx, n, i, X(hero.x), Y(hero.y), hero.f < 0, u, { w: wp, c: RUN.hero }); ctx.restore();
          if (Math.random() < .6) parts.push({ x: hero.x + R(-12, 12) * K, y: hero.y - R(0, 40) * K, vx: 0, vy: -20 * K, t: 0, T: .5, col: '#6a4aa8', g: 0 }); continue; }   // 暗影步：黑影
        if (hero.rShield || hero.sacredShield>0) { const r = 22 * u, a0 = G.t * 2; ctx.fillStyle = 'rgba(159,220,255,.8)'; for (let a = 0; a < PI * 2; a += .12) ctx.fillRect(X(hero.x) + Math.cos(a + a0) * r, Y(hero.y) - 14 * u + Math.sin(a + a0) * r * .9, u * ((a * 10 | 0) % 3 ? 1 : 2), u); }   // 二段滚护盾
        const bob = G.drop && G.drop.t < DROP_T ? -(1 - Math.pow(G.drop.t / DROP_T, 2)) * (Y(hero.y) + 70 * u) : 0, lunge = st === 'strike' ? hero.f * (lg || 0) * u : st === 'hurt' ? -hero.f * 2 * u : 0;
        SPR.drawHero(ctx, n, i, X(hero.x) + lunge, Y(hero.y) + bob, hero.f < 0, u, { white: hero.dead && (G.deadR || 0) < .14 ? 1 : 0, w: hero.cs ? hero.cs.S.w : (RUN.slots[0] && DATA.skills[RUN.slots[0].id] && DATA.skills[RUN.slots[0].id].w) || HWPN[RUN.weapon] || 'sword', c: RUN.hero, careerColor:hero.jobColor });
      } else {
        if (o.z.hideT > 0) continue;
        const z = o.z, B = z.T.boss || z.T.ai === 'boss', [n0, st] = foeFrame(z), n = z.noShield && SPR.frame(z.type, 'n_' + n0) ? 'n_' + n0 : n0;
        const a = z.dead ? Math.max(0, 1 - Math.max(0, z.deadT - (B ? 2.4 : .9)) / .4) : z.flee ? Math.max(0, 1 - z.fleeT / 1.6) : 1;
        if (!z.dead) shadow(z.x, z.y, B ? 50 * (z.T.boss ? 1 : z.k) : 26 * z.k);
        if (!z.dead && z.T.aura === 'drum' && !z.cc) { ctx.fillStyle = 'rgba(255,170,60,.5)'; for (let a = 0; a < PI * 2; a += .12) if (Math.floor(a / .12 + G.t * 6) % 3 === 0) ctx.fillRect(X(z.x) + rd(Math.cos(a) * 90 * u), Y(z.y) + rd(Math.sin(a) * 90 * u / YS), u, u); }
        if (!z.dead && z.tier) { const r = (z.tier === 'mini' ? 20 : 15) * u; ctx.fillStyle = z.tier === 'mini' ? '#ff7a3a' : '#ffcf3a'; for (let a = 0; a < PI * 2; a += .14) ctx.fillRect(X(z.x) + rd(Math.cos(a) * r), Y(z.y) + rd(Math.sin(a) * r / YS), u, u);
          const w = 22 * u, y = Y(z.y) - rd(46 * z.k) * u; ctx.fillStyle = '#2a160e'; ctx.fillRect(X(z.x) - w / 2 - u, y - u, w + 2 * u, 3 * u); ctx.fillStyle = z.tier === 'mini' ? '#ff7a3a' : '#ffcf3a'; ctx.fillRect(X(z.x) - w / 2, y, rd(w * Math.max(0, z.hp / z.maxHp)), u); }
        const bob = st === 'run' ? -u : 0, lunge = st === 'strike' ? z.f * 4 * u : st === 'hurt' && !B ? -z.f * 2 * u : 0;
        const air = z.cc && z.cc.k === 'air' ? rd(Math.sin(Math.min(1, 1 - z.cc.t / z.cc.T) * PI) * 18 * u) : 0;
        SPR.draw(ctx, z.type, n, 0, X(z.x) + lunge + (z.jit > 0 && !z.dead ? (Math.floor(z.jit * 60) % 2 ? 2 : -2) * u : 0), Y(z.y) + bob - air, z.f < 0, u, { v: z.v, k: z.k, white: z.flash > 0 && !z.dead ? .6 : z.T.bomb && z.st === 'wind' && Math.floor(z.t * 12) % 2 ? .7 : 0, alpha: a * (z.T.ghost ? .72 : 1) });
        if (!z.dead && z.cc) { if (z.cc.k === 'freeze') { ctx.strokeStyle = 'rgba(140,210,255,.4)'; ctx.lineWidth = u; ctx.strokeRect(X(z.x) - 10 * u, Y(z.y) - 34 * u, 20 * u, 34 * u); } else if (z.cc.k === 'stun') for (let k = 0; k < 3; k++) { const aa = G.t * 6 + k * 2.1; ctx.fillStyle = '#ffe27a'; ctx.fillRect(X(z.x) + rd(Math.cos(aa) * 7 * u), Y(z.y) - 40 * u + rd(Math.sin(aa) * 2 * u), 2 * u, 2 * u); } }
        if (!z.dead) { const labels = [z.breakT > 0 && z.breakN ? '✧' + z.breakN : '', z.preyT > 0 ? '◇'+(z.preyN||1) : '', z.imbalanceT > 0 ? '↕'+(z.imbalanceN||1) : '',z.judgmentT>0?'✝'+z.judgmentN:'', z.armorBreakT > 0 ? '破' : '', z.bounty ? '赏' : ''].filter(Boolean); if (labels.length) { ctx.fillStyle = '#ffe08a'; ctx.font = `${7 * u}px Pix,monospace`; ctx.textAlign = 'center'; ctx.fillText((z.tier || z.T.boss ? labels : labels.slice(0,1)).join(' '), X(z.x), Y(z.y) - 43 * u); } }
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
    MECH && MECH.drawOver(ctx, G.t); SK.drawOver(ctx, X, Y, u); ESK && ESK.drawOver(ctx, X, Y, u, G.t); { const n = performance.now(), adt = Math.min(.1, (n - (AMB.tm || n)) / 1000); AMB.tm = n; ambDraw(G.paused ? 0 : adt); }
    if (G.lvUpT > 1.3 && !hero.dead) { const t = 2.2 - G.lvUpT, hgt = Math.min(1, t / .27) * 150 * u, a = t < .27 ? 1 : 1 - (t - .27) / .63, bw = 16 * u, bx = X(hero.x), by = Y(hero.y); ctx.save(); ctx.globalAlpha = Math.max(0, a) * .85; const gr = ctx.createLinearGradient(0, by - hgt, 0, by); gr.addColorStop(0, 'rgba(255,230,140,0)'); gr.addColorStop(1, 'rgba(255,230,140,.9)'); ctx.fillStyle = gr; ctx.fillRect(rd(bx - bw / 2), by - hgt, rd(bw), hgt); ctx.restore(); }
    if (G.lvUpT > 0 && !hero.dead) {   // 11/22：升级字跳在勇者头上（跟着人走，弹两下再慢慢淡出）
      const t = 2.2 - G.lvUpT, hop = t < .6 ? Math.abs(Math.sin(t / .6 * PI * 2)) * 10 : 0, a = Math.min(1, G.lvUpT / .5), x = X(hero.x), y = Y(hero.y) - (44 + hop + Math.min(t, .3) * 8) * u;
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = `bold ${Math.round(8 * u)}px Pix, monospace`;
      ctx.fillStyle = '#0a2a2a'; ctx.fillText('LEVEL UP!', x + u, y + u); ctx.fillStyle = Math.floor(t * 8) % 2 ? '#ffffff' : '#7ff0e0'; ctx.fillText('LEVEL UP!', x, y); ctx.restore(); }
    for (const o of fx) {
      const p = o.t / o.T,career=o.cast?.career;if(o.sid&&career?.color&&!o.extra){o.col=career.color;ctx.save();ctx.shadowColor=career.color;ctx.shadowBlur=8*u;}
      if (window.PIXEL_SKILL_FX?.effect(ctx, o, X(o.x), Y(o.y), u, YS)) {}
      else if (o.k === 'slash' || o.k === 'pixelSlash') {   // 像素刀光：三层，从起手往前扫开（half 半角、rev 反手、gold 金色、wood 枪杆）
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
      const p = o.t / o.T,career=o.cast?.career;if(o.sid&&career?.color&&!o.extra){o.col=career.color;ctx.save();ctx.shadowColor=career.color;ctx.shadowBlur=8*u;}
      if (o.k === 'line') { const L = o.L * u * Math.min(1, p * 3), ca = Math.cos(o.a), sa = Math.sin(o.a) / YS, w = o.w * u * .5 * (1 - p); for (let d = 0; d < L; d += u) { ctx.fillStyle = p < .4 ? '#ffffff' : o.col; ctx.fillRect(X(o.x) + rd(ca * d - sa * w * .3), Y(o.y) + rd(sa * d + ca * w * .3), 2 * u, Math.max(u, rd(w))); } }
      else if (o.k === 'bolt') { ctx.strokeStyle = p < .5 ? '#ffffff' : o.col; ctx.lineWidth = Math.max(1, (2 - p * 1.5) * u); ctx.beginPath(); o.pts.forEach((q, i) => { const jx = i && i < o.pts.length - 1 ? R(-3, 3) * u : 0; i ? ctx.lineTo(X(q.x) + jx, Y(q.y)) : ctx.moveTo(X(q.x), Y(q.y)); }); ctx.stroke(); }
      else if (o.k === 'pillar') { const w = o.r * u * (1 - p * .5), h = 160 * u; ctx.fillStyle = `rgba(255,245,200,${.5 * (1 - p)})`; ctx.fillRect(X(o.x) - w, Y(o.y) - h, w * 2, h); ctx.fillStyle = `rgba(255,255,255,${.7 * (1 - p)})`; ctx.fillRect(X(o.x) - w * .4, Y(o.y) - h, w * .8, h); }
      else if (o.k === 'orb') { ctx.fillStyle = o.col; ctx.globalAlpha = 1 - p; ctx.beginPath(); ctx.arc(X(o.x), Y(o.y), o.r * u, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      else if (o.k === 'icicle') { const y = Y(o.y) - rd((1 - Math.min(1, p * 2)) * 40 * u); for (let j = 0; j < 6; j++) { ctx.fillStyle = j < 2 ? '#ffffff' : (o.col||'#8ad8ff'); ctx.fillRect(X(o.x), y - j * u, u, u); } }
      if(o.sid&&career?.color&&!o.extra)ctx.restore();
    }
    for (const q of parts) { ctx.fillStyle = q.col; const z = (q.sz || 1) * u; ctx.fillRect(X(q.x), Y(q.y), z, z); }
    const nk = Math.max(1, rd(u * .9));
    for (const n of nums) { const y = Y(n.y) - n.t * 22 * u; if (n.txt) { ctx.font = `${7 * u}px Pix, monospace`; ctx.textAlign = 'center'; ctx.lineWidth = 2 * u; ctx.strokeStyle = '#2a160e'; ctx.strokeText(n.txt, X(n.x), y); ctx.fillStyle = n.col; ctx.fillText(n.txt, X(n.x), y); } else num(n.v, X(n.x), y, n.col, n.big ? nk + 1 : nk); }
    if (hero.dead && G.deadR != null) { const r = G.deadR, hx = X(hero.x), hy = Y(hero.y) - 14 * u;
      if (r > .55 && r < .62 && !G.dust) { G.dust = 1; for (let k = 0; k < 14; k++) parts.push({ x: hero.x + R(-14, 14) * K, y: hero.y, vx: R(-20, 20) * K, vy: -R(5, 25) * K, t: 0, T: R(.5, .9), col: '#c8b090', g: 0 }); }
      const gk = Math.min(1, Math.max(0, (r - .3) / 1.2)); if (gk > 0) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = gk; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = gk * .35; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore();
        const [n, i] = heroFrame(); SPR.drawHero(ctx, n, i, hx, Y(hero.y), hero.f < 0, u, { w: (RUN.slots[0] && DATA.skills[RUN.slots[0].id] && DATA.skills[RUN.slots[0].id].w) || HWPN[RUN.weapon] || 'sword', c: RUN.hero }); }
      if (r > 1.6) { const k = Math.min(1, (r - 1.6) / 1.6), Rr = Math.hypot(W, H) * (1 - k) ** 1.6 + 2; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.moveTo(hx + Rr, hy); ctx.arc(hx, hy, Rr, 0, Math.PI * 2); ctx.fill("evenodd"); ctx.restore(); } }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (G.drop) dropFx();
    if (joy.on) { const dpr = W / innerWidth; ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.beginPath(); ctx.arc(joy.sx * dpr, joy.sy * dpr, 40 * dpr, 0, 7); ctx.fill(); const jx = joy.x - joy.sx, jy = joy.y - joy.sy, d = Math.hypot(jx, jy), k = Math.min(1, 40 / (d || 1)); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc((joy.sx + jx * k) * dpr, (joy.sy + jy * k) * dpr, 18 * dpr, 0, 7); ctx.fill(); }
    UI.hud({ wx: MAP.wx, fe: !!G.fe, combo: G.combo || 0, comboT: G.comboT || 0, roll: hero.rollN >= 1 ? 0 : Math.max(0, hero.rollCd) / (hero.rollMax || 1.5), rollT: hero.rollN >= 1 ? 0 : Math.max(0, hero.rollCd), rollN: hero.rollN, rollN0: hero.rollN0, lvUp: G.lvUpT > 0, hp: hero.hp, maxHp: hero.maxHp, lv: G.lv, xp: G.xp, need: G.lv >= DATA.econ.maxLv ? 0 : need(), kills: G.kills, st: G.st, sts: DATA.stations.length, wi: G.wi, left: G.W && !G.W.boss ? Math.max(0, G.T - G.wt) : null, bossWave: !!(G.W && G.W.boss), coins: RUN.coins, gunCombo: hero.jobCombo || 0, gunComboMax: JOBS.hasFinal(RUN,'gun|gun') ? 20 : OB('mark_gun')?15:10, slots: RUN.slots, open: RUN.open, next: nextSlot(), xiu: RUN.xiu, bossOut: G.bossOut, boss: G.boss && !G.boss.dead ? G.boss.hp / G.boss.maxHp : null, banner: G.banner ? G.banner.t : '' });
  }
  // 蓄力类前摇：脚下画金色预警（断罪一击半圆、穿甲重矢长线、震地跃击圆圈 + 地裂）
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
    if (!G.paused && !G.over) { if (G.hitStop > 0) { G.hitStop -= dt; dt *= .2; } else if (G.slowMo > 0) { G.slowMo -= dt; dt *= .35; }   // 暗影步慢动作
      if (hero.dead) { G.deadR = (G.deadR || 0) + dt; G.loseT -= dt; if (G.loseT <= 0 && !G.over) { G.over = 'lose'; end(); if (G) draw(); return; } dt *= G.deadR < .3 ? .06 : G.deadR < 1.3 ? .35 : 1; }   // 11/23 倒下：骤停 → 慢动作 → 正常
      update(dt); }
    draw();
  }

  // ---------- 11/26 场内可砸的物件 + 4–6 站高崖上的投石车 / 弓手 / 法师（够不着，只会放远程；位置都是地图像素 1672×941） ----------
  const PIMG = {}; const pim = n => PIMG[n] || (PIMG[n] = Object.assign(new Image(), { src: 'art/obj/' + n + '.png' }));
  const PROP_HP = { barrel: 1, crate: 1, banner: 3, rack: 3, brazier: 99 };
  const PDEF = {
    1: [['barrel', 520, 330], ['barrel', 548, 338], ['crate', 1130, 326]],
    2: [['barrel', 520, 330], ['barrel', 548, 338], ['barrel', 1160, 330], ['crate', 1130, 340], ['crate', 260, 520]],
    3: [['barrel', 520, 330], ['barrel', 548, 338], ['barrel', 1160, 330], ['barrel', 300, 560], ['crate', 1130, 340], ['crate', 1400, 520], ['crate', 1372, 540]],
    4: [['banner', 520, 335], ['rack', 1250, 335]],
    5: [['banner', 520, 335], ['banner', 1280, 335], ['rack', 610, 350], ['rack', 1180, 350]],
    6: [['banner', 520, 335], ['banner', 1280, 335], ['rack', 610, 350], ['rack', 1180, 350], ['brazier', 470, 380], ['brazier', 1330, 380]],
  };
  const CDEF = {   // 高崖（右上角）上的单位：k = catapult / archer / mage
    4: [['archer', 1520, 75], ['archer', 1610, 112]],
    5: [['archer', 1520, 75], ['catapult', 1630, 142]],
    6: [['mage', 1510, 70], ['catapult', 1630, 142], ['archer', 1578, 104]],
  };
  function wildlifeTick(dt) {
    for (const b of G.birds || []) {
      b.t += dt;
      if (!b.fly && ([hero, ...foes.filter(z => !z.dead)].some(z => Math.hypot(z.x-b.x,z.y-b.y)<120) || fx.some(z => ['boom','rock','burst'].includes(z.k) && Math.hypot(z.x-b.x,z.y-b.y)<220) || (G.cp || []).some(z => z.k==='hit' && Math.hypot(z.x-b.x,z.y-b.y)<220))) { b.fly=true; b.t=0; }
      if (b.fly && b.t>14+b.wait) { b.fly=false; b.t=0; }
    }
  }
  function wildlifeDraw() {
    const q=MAPW/1672;
    for (const b of G.birds || []) {
      if (b.fly && b.t>3) continue;
      const im=pim((MAP.fauna||(G.st<=3?'crow':'bat')) + (b.fly ? Math.floor(b.t*10)%3 : 0));
      if (!im.complete || !im.naturalWidth) continue;
      ctx.save(); ctx.globalAlpha=b.fly?Math.max(0,1-b.t/3):Math.min(1,b.t*2);
      const x=b.x+(b.fly?b.dir*b.t*240:0), y=b.y-(b.fly?b.t*180:0);
      ctx.translate(X(x),Y(y)); ctx.scale(b.dir,1); const h=32*q*s;
      ctx.drawImage(im,-h*im.naturalWidth/im.naturalHeight/2,-h,h*im.naturalWidth/im.naturalHeight,h); ctx.restore();
    }
    const warning=warns.some(w => w.tier || DATA.enemies[w.type].boss) || (G.bossT>0 && G.bossT<=1.5);
    if (!warning) return;
    const pts=MAP.totem||(G.st<=3?[[220,130],[548,128],[768,120],[1022,126],[1226,145]]:[[120,350],[1560,350]]);
    ctx.save(); ctx.globalCompositeOperation='lighter';
    for (const [x,y] of pts) { const r=65*q*s, g=ctx.createRadialGradient(X(x*q),Y(y*q),0,X(x*q),Y(y*q),r); g.addColorStop(0,'rgba(255,25,10,.65)');g.addColorStop(1,'rgba(255,0,0,0)');ctx.fillStyle=g;ctx.fillRect(X(x*q)-r,Y(y*q)-r,r*2,r*2); }
    ctx.restore();
  }
  function initProps() {
    const q = MAPW / 1672, deep = !!MAP.zone;
    const own = !!MAP.props;   // 11/26 新地图自带摆设 / 鸟 / 图腾坐标（地图像素 1672×941）；没写的走旧的按站号规则
    G.props = (own ? MAP.props : (PDEF[G.st] || []).filter(d => deep ? G.st >= 4 : G.st <= 3)).map(([k, x, y]) => ({ k, x: x * q, y: y * q, hp: PROP_HP[k], brk: 0, hitT: 0 }));
    G.propRespawn = { done: false, at: R(18, 36) };   // 每站战斗时间内随机再刷新一次箱子/物件
    G.cl = own ? (MAP.cliff || []).map(([k, x, y], i) => ({ k, x: x * q, y: y * q, cd: 3 + i * 1.7, st: 'idle', t: 0 })) : deep ? (CDEF[G.st] || []).map(([k, x, y], i) => ({ k, x: x * q, y: y * q, cd: 3 + i * 1.7, st: 'idle', t: 0 })) : [];
    G.birds = (MAP.birds || (G.st<=6 ? [[310,75],[600,95],[980,65],[1450,145]] : [])).map(([x,y],i)=>({x:x*q,y:y*q,t:1,fly:false,dir:i%2?1:-1,wait:i*2}));
    try { SEEN.add('place:' + G.st); } catch(e) {}
    G.cp = [];   // 飞行中的石头 / 箭 / 魔弹
  }
  function propHit(x, y, r) {
    if (!G || !G.props) return;
    for (const p of G.props) { if (p.brk || p.hp > 50 || p.hitT > 0 || Math.hypot(p.x - x, (p.y - y) * YS) > r) continue; p.hitT = .25; if (--p.hp > 0) { G.shake = Math.max(G.shake, .08); continue; }
      p.brk = 1; p.bt = G.t; G.shake = Math.max(G.shake, .12); SFX.play('pon');
      for (let i = 0; i < 12; i++) parts.push({ x: p.x, y: p.y, vx: R(-70, 70) * K, vy: R(-90, -20) * K, t: 0, T: R(.4, .8), col: i % 3 ? '#8a6038' : '#c8a070', g: 220 * K });
      const n = Math.round((p.k === 'barrel' ? 2 + G.st : p.k === 'crate' ? 3 + G.st : 4 + G.st) * (1 + (hero.fx.propCoin || 0))); if (hero.fx.firstBreak && !G.purseBreak) { G.purseBreak = true; G.gi.push({ kind: 'use', id: 'meat', x: p.x, y: p.y, t: 0 }); }
      if (Math.random() < (p.k === 'barrel' ? .7 : .85)) for (let i = 0, m = 1 + (Math.random() < .5); i < m; i++) G.gc.push({ x: p.x, y: p.y, v: n, t: 0, h: 0, vh: 90, vx: R(-20, 20) * K });
      { const rr = p.k === 'barrel' ? .08 : p.k === 'crate' ? .15 : .40; G.runes = G.runes || []; if (Math.random() < rr) G.runes.push({ k: RUNES[Math.random() * RUNES.length | 0], x: p.x + R(-14, 14) * K, y: p.y + R(-6, 6) * K, t: 0 });   // 11/27 符文掉落
        if (Math.random() < (p.k === 'barrel' ? .02 : p.k === 'crate' ? .03 : .06)) G.gi.push({ kind: 'book', x: p.x, y: p.y, t: 0 }); } }
  }
  const RIM = k => RIM[k] || (RIM[k] = Object.assign(new Image(), { src: 'art/ui2/rune_' + k + '.png' })), RUNES = ['rage', 'haste', 'wind', 'guard', 'heal'], RUNE_C = { rage: '#ff5a4a', haste: '#ffd84a', wind: '#5ab8ff', guard: '#d8e4f0', heal: '#6ee27a' }, RUNE_N = { rage: '狂暴符文 · 伤害 +25%', haste: '急速符文 · 出手 +30%', wind: '疾风符文 · 移速 +30%', guard: '守护符文 · 护盾', heal: '回复符文' };
  function runeTick(dt) { if (hero.rune && hero.rune.t > 0 && (hero.rune.t -= dt) <= 0) { hero.rune = null; recompute(); }
    if (!G.runes) return; for (const r of G.runes) { r.t += dt; if (r.t > .3 && !hero.dead && Math.hypot(r.x - hero.x, (r.y - hero.y) * YS) < 22 * K) { r.got = 1; SFX.play('lv');
        if (r.k === 'heal') { const h = healHero(hero.maxHp * .08); if (h > 0) nums.push({ x: hero.x, y: hero.y - 50 * K, txt: '+' + Math.round(h), t: 0, col: '#7ee27e' }); }
        else if (r.k === 'guard') hero.mShield = Math.max(hero.mShield || 0, hero.maxHp * .1);
        else { hero.rune = { k: r.k, t: 10 }; recompute(); }
        nums.push({ x: hero.x, y: hero.y - 70 * K, txt: RUNE_N[r.k], t: 0, col: RUNE_C[r.k] }); } }
    G.runes = G.runes.filter(r => !r.got && r.t < 8); }
  function randPropPos() {
    const g = MAP.ground, pad = 28 * K;
    for (let i = 0; i < 30; i++) {
      const y = R(g.y0 + 18 * K, g.y1 - 14 * K);
      const [l, r] = ground(y);
      if (r - l < pad * 2.5) continue;
      const x = R(l + pad, r - pad);
      if (MECH && MECH.on() && !MECH.walk(x, y, false)) continue;
      if (hero && Math.hypot(x - hero.x, (y - hero.y) * YS) < 60 * K) continue;
      if ((G.props || []).some(p => !p.brk && Math.hypot(x - p.x, (y - p.y) * YS) < 32 * K)) continue;
      return { x, y };
    }
    return null;
  }
  function respawnProps() {
    if (!G || !G.props) return;
    const baseKinds = [...new Set(G.props.map(p => p.k).filter(k => (PROP_HP[k] || 99) < 50))];
    const kinds = baseKinds.length ? baseKinds : (G.st <= 3 ? ['barrel', 'crate'] : ['banner', 'rack']);
    const n = 2 + (Math.random() * 3 | 0);
    for (let i = 0; i < n; i++) {
      const pos = randPropPos(); if (!pos) continue;
      const k = kinds[Math.random() * kinds.length | 0];
      G.props.push({ k, x: pos.x, y: pos.y, hp: PROP_HP[k], brk: 0, hitT: 0 });
      for (let j = 0; j < 8; j++) parts.push({ x: pos.x, y: pos.y, vx: R(-40, 40) * K, vy: R(-60, -15) * K, t: 0, T: R(.35, .65), col: j % 2 ? '#e8d8a8' : '#b89058', g: 140 * K });
    }
  }
  function propsTick(dt) { runeTick(dt);
    if (!G.props) return;
    for (const p of G.props) { if (p.hitT > 0) p.hitT -= dt; if (!p.brk && p.hp < 50 && hero.roll > 0 && Math.hypot(p.x - hero.x, (p.y - hero.y) * YS) < 26 * K) propHit(p.x, p.y, 9999); }
    const live = G.waveOn && !G.fe && !G.over && !(G.ready > 0) && !hero.dead && !G.winT;
    if (live && G.propRespawn && !G.propRespawn.done && (G.stT || 0) >= G.propRespawn.at) { G.propRespawn.done = true; respawnProps(); }
    for (const c of G.cl || []) {
      c.t += dt; c.f = hero.x < c.x;
      if (c.st === 'idle') { if (live && (c.cd -= dt) <= 0) { c.st = 'wind'; c.t = 0; c.tx = hero.x; c.ty = hero.y; } }
      else if (c.st === 'wind') {
        const W = c.k === 'catapult' ? 1.2 : c.k === 'mage' ? 1.0 : .85;
        if (c.k !== 'catapult' && c.t < W - .3) { c.tx = hero.x; c.ty = hero.y; }   // 弓手 / 法师：最后 0.3 秒锁定
        if (!live) { c.st = 'idle'; c.cd = 2; continue; }
        if (c.t >= W) { c.st = 'rec'; c.t = 0; c.cd = c.k === 'catapult' ? 7 - G.st * .4 : c.k === 'mage' ? 5.5 : 3.4;
          const a = Math.atan2((c.ty - c.y) * 1, c.tx - c.x), d = Math.hypot(c.tx - c.x, c.ty - c.y);
          if (c.k === 'catapult') G.cp.push({ k: 'rock', sx: c.x, sy: c.y - 30 * K, x: c.tx, y: c.ty, t: 0, T: .9, dmg: 7 + 3 * G.st });
          else if (c.k === 'archer') G.cp.push({ k: 'arrow', x: c.x, y: c.y, vx: Math.cos(a) * 300 * K, vy: Math.sin(a) * 300 * K, a, t: 0, T: Math.min(3, d / (300 * K) + .5), dmg: 4 + 2 * G.st });
          else G.cp.push({ k: 'orb', x: c.tx, y: c.ty, t: 0, T: .45, dmg: 6 + 3 * G.st }); } }
      else if (c.st === 'rec' && c.t > .5) c.st = 'idle';
    }
    for (let i = G.cp.length - 1; i >= 0; i--) { const o = G.cp[i]; o.t += dt;
      if (o.k === 'arrow') { o.x += o.vx * dt; o.y += o.vy * dt; if (!hero.dead && Math.hypot(o.x - hero.x, (o.y - hero.y) * YS) < 14 * K) { damageHero(o.dmg, 'phys'); G.cp.splice(i, 1); continue; } if (o.t >= o.T) G.cp.splice(i, 1); }
      else if (o.t >= o.T) {
        if (o.k === 'rock') { G.shake = Math.max(G.shake, .35); propHit(o.x, o.y, 70 * K); for (let j = 0; j < 14; j++) parts.push({ x: o.x, y: o.y, vx: R(-90, 90) * K, vy: R(-110, -20) * K, t: 0, T: R(.4, .8), col: j % 2 ? '#8a8a92' : '#b8b8c0', g: 240 * K }); if (!hero.dead && Math.hypot(o.x - hero.x, (o.y - hero.y) * YS) < 62 * K) damageHero(o.dmg, 'phys'); G.cp.push({ k: 'hit', x: o.x, y: o.y, t: 0, T: .45 }); }
        else if (o.k === 'orb') { if (!hero.dead && Math.hypot(o.x - hero.x, (o.y - hero.y) * YS) < 40 * K) damageHero(o.dmg, 'magic'); G.cp.push({ k: 'burst', x: o.x, y: o.y, t: 0, T: .35 }); }
        G.cp.splice(i, 1); }
      else if (o.k === 'hit' || o.k === 'burst') { if (o.t >= o.T) G.cp.splice(i, 1); } }
  }
  function propsUnder() {   // 地上的预警圈 / 预警线（在角色下面）
    for (const c of G.cl || []) if (c.st === 'wind') {
      if (c.k === 'archer') { ctx.strokeStyle = `rgba(216,64,42,${.3 + .4 * c.t})`; ctx.lineWidth = u; ctx.setLineDash([4 * u, 4 * u]); ctx.beginPath(); ctx.moveTo(X(c.x), Y(c.y)); ctx.lineTo(X(c.tx), Y(c.ty)); ctx.stroke(); ctx.setLineDash([]); }
      else { const R0 = (c.k === 'catapult' ? 62 : 40) * K * s, W = c.k === 'catapult' ? 1.2 : 1.0, p = Math.min(1, c.t / W);
        ctx.fillStyle = `rgba(216,64,42,${.12 + .18 * p})`; ctx.beginPath(); ctx.ellipse(X(c.tx), Y(c.ty), R0, R0 / YS, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = c.k === 'mage' ? '#a070ff' : '#d8402a'; ctx.lineWidth = u; ctx.beginPath(); ctx.ellipse(X(c.tx), Y(c.ty), R0, R0 / YS, 0, 0, 7); ctx.stroke();
        ctx.fillStyle = c.k === 'mage' ? 'rgba(160,112,255,.35)' : 'rgba(216,64,42,.35)'; ctx.beginPath(); ctx.ellipse(X(c.tx), Y(c.ty), R0 * p, R0 * p / YS, 0, 0, 7); ctx.fill(); } }
  }
  function propsEntries() {
    const L = [], im = (n, x, y, sc = 1, a = 1) => { const I = pim(n); if (!okI(I)) return; ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = a; const w = I.naturalWidth * u * sc, h = I.naturalHeight * u * sc; ctx.drawImage(I, rd(X(x) - w / 2), rd(Y(y) - h), w, h); ctx.restore(); };
    for (const r of G.runes || []) L.push({ y: r.y, d: () => { const x = X(r.x), y = Y(r.y) - (14 + 4 * Math.sin(G.t * 4 + r.x)) * u, a = r.t > 6 ? (Math.floor(r.t * 8) % 2 ? .4 : 1) : 1; ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(x, y, 0, x, y, 14 * u); gr.addColorStop(0, '#fff'); gr.addColorStop(.35, RUNE_C[r.k]); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 14 * u, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; const I = RIM(r.k); if (I.complete && I.naturalWidth) { const h = 22 * u, w = h * I.naturalWidth / I.naturalHeight; ctx.drawImage(I, x - w / 2, y - h / 2, w, h); } ctx.restore(); } });
    if (hero.rune && hero.rune.t > 0) L.push({ y: 99998, d: () => { const x = X(hero.x), y = Y(hero.y) - 62 * u, f = hero.rune.t / 10; if (hero.rune.t < 3 && Math.floor(G.t * 6) % 2) return; ctx.save(); ctx.strokeStyle = RUNE_C[hero.rune.k]; ctx.lineWidth = 2.5 * u; ctx.beginPath(); ctx.arc(x, y, 6 * u, -Math.PI / 2, -Math.PI / 2 + f * 2 * Math.PI); ctx.stroke(); const I = RIM(hero.rune.k); if (I.complete && I.naturalWidth) ctx.drawImage(I, x - 5 * u, y - 5 * u, 10 * u, 10 * u); ctx.restore(); } });
    for (const p of G.props || []) { const fa = p.brk ? Math.max(0, Math.min(1, 3 - (G.t - (p.bt || 0)))) : 1; if (!fa) continue;   /* 11/27 残骸 2 秒后 1 秒淡出消失 */
      L.push({ y: p.y, d: () => { if (!p.brk) shadow(p.x, p.y, p.k === 'banner' || p.k === 'rack' ? 22 : 13);
      if (p.k === 'brazier') { im('brazier_b', p.x, p.y); const [sx, sy] = [X(p.x), Y(p.y) - 26 * u], r = (30 + 4 * Math.sin(G.t * 9 + p.x)) * u; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r); g.addColorStop(0, 'rgba(255,170,70,.35)'); g.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, 2 * r, 2 * r); ctx.restore(); }
      else im(p.brk ? p.k + '_b' : p.k, p.x, p.y, 1, fa); } }); }
    for (const c of G.cl || []) L.push({ y: c.y, d: () => {
      if (c.k === 'catapult') { const f = c.st === 'wind' ? (c.t < .9 ? 1 : 1) : c.st === 'rec' ? (c.t < .18 ? 2 : 3) : 0; im('catapult' + f, c.x, c.y, 1); }
      else { const ty = c.k === 'archer' ? 'gob_archer' : 'gob_mage', n = c.st === 'wind' ? (c.k === 'archer' ? 'draw' : 'windup') : 'idle' + (Math.floor(G.t * 2) % 2); SPR.draw(ctx, ty, n, 0, X(c.x), Y(c.y), !!c.f, u, {}); } } });
    for (const o of G.cp || []) L.push({ y: 99999, d: () => {
      if (o.k === 'rock') { const p = o.t / o.T, x = o.sx + (o.x - o.sx) * p, y = o.sy + (o.y - o.sy) * p, ar = Math.sin(p * PI) * 150 * K; ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(X(x), Y(o.sy + (o.y - o.sy) * p + 30 * K * (1 - p)), 8 * u, 4 * u, 0, 0, 7); ctx.fill(); const I = pim('rock1'); if (okI(I)) { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(X(x), Y(y) - ar * s); ctx.rotate(o.t * 9); ctx.drawImage(I, -I.naturalWidth * u / 2, -I.naturalHeight * u / 2, I.naturalWidth * u, I.naturalHeight * u); ctx.restore(); } }
      else if (o.k === 'arrow') { ctx.save(); ctx.translate(X(o.x), Y(o.y)); ctx.rotate(Math.atan2(o.vy / YS, o.vx)); ctx.fillStyle = '#d8c8a0'; ctx.fillRect(-8 * u, -u / 2, 14 * u, u); ctx.fillStyle = '#d8402a'; ctx.fillRect(-8 * u, -u, 3 * u, 2 * u); ctx.restore(); }
      else if (o.k === 'orb') { /* 落点在预警圈里，不单独画 */ }
      else if (o.k === 'hit') { const I = pim('rockhit'); if (okI(I)) { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1 - o.t / o.T; ctx.drawImage(I, X(o.x) - I.naturalWidth * u / 2, Y(o.y) - I.naturalHeight * u, I.naturalWidth * u, I.naturalHeight * u); ctx.restore(); } }
      else if (o.k === 'burst') { const p = o.t / o.T, r = (14 + 34 * p) * K * s; ctx.strokeStyle = `rgba(190,150,255,${1 - p})`; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.ellipse(X(o.x), Y(o.y), r, r / YS, 0, 0, 7); ctx.stroke(); } } });
    return L;
  }
  function applyStationMap(force) {   // 11/25 第 4–6 站换成森林深处
    const id = (DATA.stationMap || {})[G.st] || 'field', m = DATA.maps.find(x => x.id === id) || DATA.maps[0], chg = force || m !== MAP;
    if (chg) { MAP = m; SPR.setGrade(MAP.grade); MAPW = MAP.w || 1672; MAPH = MAP.h || 941; MIMG = new Image(); MIMG.crossOrigin = 'anonymous'; MIMG.src = MAP.img; fit(); cam.snap = true; jobTraces.length = 0; foes = []; shots = []; warns.length = 0; }
    if (MAP.zone) { const q = MAPW / 1672; MECH.setMap(MAP.zone, q, G.st); hero.x = MAP.zone.start[0] * q; hero.y = MAP.zone.start[1] * q; hero.lx = hero.ly = null; hero.rootT = 0; cam.snap = true; }
    else { MECH.off(); if (chg) { const g = MAP.ground; hero.x = MAPW / 2; hero.y = (g.y0 + g.y1) / 2; hero.lx = hero.ly = null; } }
    initProps();
  }
  function init(canvas) { MECH = MECHF({ hero: () => hero, foes: () => foes, G: () => G, fx: () => fx, parts: () => parts, K, kill: z => kill(z),
      num: (o, t, c) => nums.push({ x: o.x, y: o.y - 44 * K, txt: t, t: 0, col: c }), dot: (z, d) => { if (z.dead) return; z.hp -= d; if (z.hp <= 0) kill(z); },
      stun: (z, t) => { if (!z.dead) cc(z, 'stun', t); },
      chest: (x, y) => { G.shake = Math.max(G.shake, .3); for (let i = 0; i < 18; i++) parts.push({ x, y, vx: R(-60, 60) * K, vy: R(-90, -20) * K, t: 0, T: R(.4, .8), col: '#ffd86a', g: 200 * K }); RUN.coins += 20 + 15 * G.st; nums.push({ x, y: y - 50 * K, txt: '宝箱！+' + (20 + 15 * G.st) + ' 铜钱', t: 0, col: '#ffd86a' }); gearDrop(); } });
    cv = canvas; ctx = cv.getContext('2d'); fit(); addEventListener('resize', fit); bindInput(); }
  // 11/26 无头快进（不画画面、固定步长）：给 GitHub Actions 上的 AI 测试用，只在网址带 ?sim 时由 js/sim.js 调用，不影响正常游戏
  const SIM = {
    step(n, dt, mx, my, rl) { SIMIN = [mx || 0, my || 0]; for (let i = 0; i < n; i++) { if (!G || G.over) break; if (rl && i === 0) roll();
        if (!G.paused) { let d = dt; if (G.hitStop > 0) { G.hitStop -= d; d *= .2; } else if (G.slowMo > 0) { G.slowMo -= d; d *= .35; }
          if (hero.dead) { G.deadR = (G.deadR || 0) + d; G.loseT -= d; if (G.loseT <= 0 && !G.over) { G.over = 'lose'; end(); break; } d *= G.deadR < .3 ? .06 : G.deadR < 1.3 ? .35 : 1; }
          update(d); } if (G.fe && !G.paused) SIM.meta(); } },
    // 站末结算：捡光掉落、修炼点全花、书放进空技能格、选一张战斗门。pol = { xiu(L), door(cards) } 返回下标
    meta(pol) { const f = G && G.fe; if (!f || !f.doors || !f.doors.length || G.lock) return false; pol = pol || SIM.pol || {};
      for (const o of f.items.splice(0)) CAMP.learn(o, true);
      for (let k = 0; k < RUN.bag.length; k++) { const o = RUN.bag[k]; if (o && o.kind === 'book') { const j = RUN.slots.findIndex((s, i) => i < RUN.open && !s); if (j >= 0 && DATA.canEquipCommon(RUN.slots,o,j)) { RUN.slots[j] = { ...o }; RUN.bag[k] = null; } } }
      while (RUN.xiu > 0) { const L = CAMP.rollXiu(3 + (hero.fx.xiuOpt || 0)); if (!L.length) break; const o = L[Math.max(0, Math.min(L.length - 1, pol.xiu ? pol.xiu(L) : 0))]; for (const [a, v] of o.adds) RUN.train[a] = (RUN.train[a] || 0) + v; RUN.xiu--; }
      recompute();
      const C = f.doors.map(d => d.c).filter(c => !c.rest), cards = C.length ? C : f.doors.map(d => d.c); const c = cards[Math.max(0, Math.min(cards.length - 1, pol.door ? pol.door(cards) : 0))];
      f.pick(c); return true; },
    // 观察：勇者、最近 K 只怪（相对位置 / 血量 / 是否远程）、技能就绪情况
    obs(K = 8) { const h = hero, al = foes.filter(z => !z.dead && !z.flee).map(z => ({ dx: (z.x - h.x) / 100, dy: (z.y - h.y) / 100, d: Math.hypot(z.x - h.x, z.y - h.y), hp: z.hp / (z.maxHp || z.hp || 1), r: z.T && z.T.ranged ? 1 : 0, boss: z.T && z.T.boss ? 1 : 0 })).sort((a, b) => a.d - b.d).slice(0, K);
      return { hp: h.hp / h.maxHp, x: h.x / MAPW, y: h.y / MAPH, rollN: h.rollN, rollN0: h.rollN0, roll: h.roll > 0 ? 1 : 0, foes: al, n: foes.filter(z => !z.dead).length, st: G.st, wi: G.wi, t: G.t, kills: G.kills, lv: G.lv, over: G.over, fe: !!G.fe, dead: !!h.dead }; },
    pol: {}, setPol(p) { SIM.pol = p; }
  };
  window.BATTLE = { sim: SIM, healHero: n => healHero(n),
    init, start, frame, fit, roll, saveRun,
    careerChanged() { hero.cs = null; hero.sequence = null; SK.chEnd(); careerColorSync(); recompute(); saveRun(); },
    saveCareer() { saveRun(); },
    exportChapter() { saveRun(); try { localStorage.setItem('pxyz.chapterBuild', JSON.stringify({ RUN, hp: hero.hp / hero.maxHp, chapter: (RUN.chapter || 1) + 1 })); } catch (e) {} },
    continueChapter() { const data = JSON.parse(localStorage.getItem('pxyz.chapterBuild') || 'null'); if (!data) return false; start({ weapon: data.RUN.weapon, map: 'field', resume: { RUN: { ...data.RUN, chapter: data.chapter }, G: { st: 1, wi: -1, kills: 0, t: 0, xp: 0, lv: 1 }, hp: data.hp } }); return true; },
    spawnDbg(t, tier) { const z = spawn(t, { x: hero.x + R(-160, 160) * K, y: hero.y + R(-60, 60) * K }, tier); clampG(z); return !!z; },   // 调试：在勇者旁边放一只
    pause(v) { if (G && !G.over) G.paused = v; }, get paused() { return !!(G && G.paused); }, active: () => !!G && !G.over,
    stop() { G = null; }, g: () => G, saveNow: () => G && saveRun(), loadSave, clearSave, addCrystal: n => G && addCrystal(n, hero.x, hero.y),
    run: () => RUN, recompute: () => G && recompute(), trainAll: () => trainAll(), nextWave: () => G && nextWave(), hero: () => hero, lv: () => G ? G.lv : 1, xpFrac: () => G ? Math.min(1, G.xp / need()) : 0, xpTxt: () => G ? `${Math.floor(G.xp)} / ${need()}` : '', st: () => G ? G.st : 1,
    skillInfo: sk => { if (sk.job) { const parts = JOBS.leaves(sk).map(x => BATTLE.skillInfo(x)); return { dmg: parts.reduce((n,x) => n+x.dmg,0), wu: parts.reduce((n,x) => n+x.wu,0), rc: parts.reduce((n,x) => n+x.rc,0), cd: parts.reduce((n,x) => n+x.cd,0), L: null, xp: sk.job.progress, next: sk.job.final ? null : JOBS.PROGRESS_MAX }; } const S = DATA.skills[sk.id], L = profL(sk), T = G ? skillT(S, sk) : { wu: S.wu, rc: S.rc }; return { dmg: G ? skillDmg(S, sk) : S.dmg, wu: T.wu, rc: T.rc, cd: T.wu + T.rc, L, xp: sk.xp || 0, next: DATA.prof[L] || null }; }, profL,
    debug: { hurt(n){hero.inv=0;G.god=false;damageHero.src=null;damageHero(n);}, projectile() { const z=foes.find(z=>!z.dead); if(!z)return; shots.push({k:'arrow',from:z,x:hero.x+48*K,y:hero.y-12*K,gy:hero.y,vx:-120*K,vy:0,t:0,dmg:6,dtype:'phys'}); }, skill(id, level = 1) { if (!DATA.skills[id]) return false; RUN.slots.fill(null); RUN.slots[0] = { id,lv:level,xp:level>=7?DATA.prof[6]:0 }; RUN.si=0; hero.cs=null;hero.sequence=null;hero.gap=0;SK.reset();recompute();return true; }, cast(id, level=1) { if (!DATA.skills[id]) return false; const S=DATA.skills[id],sk={id,lv:level,xp:level>=7?DATA.prof[6]:0},book=sk,release={targets:new Set(),firstHit:false},career=JC.begin(book,sk,0,release,aimNow());return SK.cast({S,sk,L:level,d:S.dmg,bonus:0,a:aimNow(),sid:id,career}); }, rest(k) { if (G.fe) fieldRest(k); }, ev(id) { const f = G.fe; if (!f) return; RUN.evUsed = DATA.events.map(e => e.id).filter(x => x !== id); f.doors = []; fieldRest('event'); }, oath(id) { const ks = DATA.oathPool(RUN); CAMP.learn({ kind: 'oath', id: id || ks[Math.random() * ks.length | 0] }); }, tp(fx, fy) { hero.x = MAPW * fx; hero.y = MAPH * fy; cam.snap = true; }, book() { G.gi.push({ kind: 'book', x: hero.x + 30 * K, y: hero.y, t: 0 }, { kind: 'item', x: hero.x + 9 * K, y: hero.y, t: 0 }); }, coin() { for (let i = 0; i < 6; i++) G.gc.push({ x: hero.x + R(60, 120) * K, y: hero.y + R(-20, 20) * K, v: 2, t: 11, h: 0, vh: 0, vx: 0 }); },   // 11/22 本波胜利：清场 + 算通关结算；本站胜利：直接当最后一波打完（结算后出路线卡）
      // 本段胜利：清场，进下一段（第 1 站第 2 段之后会触发公主）；已经是最后一段就结算这一站
      wave: () => { if (!G || G.endT != null || !G.waveOn || G.pr) return; G.q = []; warns.length = 0; foes.forEach(z => !z.dead && !z.T.boss && kill(z));
        if (G.wi < STN().waves.length - 1 && !STN().waves[G.wi + 1].boss) { G.wt = G.T; return; } G.cleared = true; G.timeout = false; banner('本站胜利', 1); G.endT = .6; liveTitles(); if (ML('aid')) { healHero(hero.maxHp * .04 * ML('aid')); UI.feed('战地急救：回复了一些生命'); } },
      rest: k => G && G.fe && fieldRest(k),
      station: () => { if (!G || G.endT != null || !G.waveOn) return; const n = STN().waves.length; G.wi = STN().waves[n - 1].boss ? n - 2 : n - 1; G.q = []; warns.length = 0; foes.forEach(z => !z.dead && !z.T.boss && kill(z)); G.cleared = true; G.timeout = false; banner('本站胜利', 1); G.endT = .6; },
      boss: () => G && (foes.forEach(z => !z.dead && kill(z)), G.st = DATA.stations.length, G.wi = 1, nextWave()), god: () => G && (G.god = !G.god), clear: () => G && (G.q = [], warns.length = 0, foes.forEach(z => !z.T.boss && !z.dead && kill(z)), G.wt = Math.max(G.wt, G.T - .1)), skip: () => G && G.W && (G.wt = G.T), st: n => G && (G.st = n, G.wi = -1), lvl: () => G && addXp(need() / (hero.xpMul || 1) - G.xp + .01), win: () => G && (G.boss ? kill(G.boss) : (G.st = DATA.stations.length, G.wi = 1, nextWave(), bossIn(), kill(G.boss))), heal: () => hero && (hero.hp = hero.maxHp), route: () => G && (G.paused = true, showRoute()), spawn: (t, tier) => G && spawn(t, { x: hero.x + R(60, 120) * K * (Math.random() < .5 ? -1 : 1), y: hero.y + R(-20, 20) * K }, tier), state: () => ({ G, hero, foes, RUN, u, s, W, H }) },
  };
})();


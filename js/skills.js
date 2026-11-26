// 像素勇者 · 技能书的出手效果（11/21 第二批）。规则和数值见 js/data.js 的 DATA.skills 与设计文档。
// battle.js 负责轮流、前摇 / 后摇、熟练度；这里只管「出手那一刻做什么」、持续类（占时型 channel）、飞行物、地面区域、召唤物和它们的画法。
// 距离单位：像素格（和 battle.js 一样，1 格 = K 地图像素）；角度用 ang()（已把竖向压扁算进去）。
window.SKILLS = (A) => {
  const raw = A; let active = null; A = Object.assign({}, raw, { hurt: (z, d, from, kb, sid, o = {}) => raw.hurt(z, d, from, kb, sid, Object.assign({ cast: active }, o)), fireball: (x, y, t, r, cb) => { const token = active; return raw.fireball(x, y, t, r, cb && (() => withCast(token, cb))); } });
  const withCast = (token, fn) => { const prev = active; active = token; try { return fn(); } finally { active = prev; } };
  const { K, YS, PI } = A, R = (a, b) => a + Math.random() * (b - a);
  let projs = [], zones = [], swords = [], orbs = [], ghosts = [], later = [], marks = [], followers = [], ch = null;
  const H = () => A.hero(), F = () => A.foes().filter(z => !z.dead && !z.flee);
  const D2 = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * YS) / K;
  const P = (x, y, a, d) => ({ x: x + Math.cos(a) * d * K, y: y + Math.sin(a) * d * K / YS });
  const wait = (t, fn) => { const token = active; later.push({ t, fn: () => withCast(token, fn) }); };
  const area = () => A.hero().m.area, MR = 1.45;   // 11/24 近身招式射程 ×1.45（近战加强）
  // ---------- 命中判定 ----------
  const inCircle = (z, c, r) => D2(z, c) < r + 6 * (z.k || 1);
  function inFan(z, c, a, r, half) { if (D2(z, c) > r + 6) return false; const b = A.ang(c, z), da = Math.abs(((b - a + PI * 3) % (PI * 2)) - PI); return da < half + .12; }
  function inLine(z, c, a, L, w) { const dx = (z.x - c.x) / K, dy = (z.y - c.y) * YS / K, al = dx * Math.cos(a) + dy * Math.sin(a), sd = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)); return al > -4 && al < L && sd < w / 2 + 6; }
  const hitAll = (test, d, o = {}) => { let n = 0; for (const z of F()) if (test(z)) { const landed = A.hurt(z, d, o.from || H(), o.kb ?? 10, o.sid, o); if (landed === false) continue; if (o.on && !o.extra && (!active || !active.callbacks?.has(z))) { if (active) { active.callbacks ||= new Set(); active.callbacks.add(z); } o.on(z); } n++; } return n; };
  // 怪最密的地方：每只怪数一下身边 r 格内有几只，挑最多的（排除 skip 里的点附近）
  function dense(r = 30, maxD = 170, skip = []) {
    let best = null, bn = -1; for (const z of F()) { if (D2(z, H()) > maxD || skip.some(p => D2(p, z) < r)) continue; const n = F().reduce((s, o) => s + (D2(o, z) < r ? 1 : 0), 0); if (n > bn) { bn = n; best = z; } }
    return best ? { x: best.x, y: best.y } : null;
  }
  const near = (maxD = 1e9, not) => { let b = null, bd = maxD; for (const z of F()) { if (not && not.has(z)) continue; const d = D2(z, H()); if (d < bd) { bd = d; b = z; } } return b; };
  const nearOf = (p, maxD, not) => { let b = null, bd = maxD; for (const z of F()) { if (not && not.has(z)) continue; const d = D2(z, p); if (d < bd) { bd = d; b = z; } } return b; };
  // ---------- 飞行物 ----------
  // p: { x, y, a, v(格/秒), life, r(命中半径), pierce, d, sid, look, kb, o(附加状态), back(飞回), home(追踪目标), tick(持续伤害间隔), pull, onHit, onEnd }
  function shoot(p) { p.cast = active; p.t = 0; p.hit = new Set(); p.left = p.pierce ?? 0; p.hitT = new Map(); projs.push(p); return p; }
  function zone(z) { z.cast = active; z.t = 0; z.ti = 0; zones.push(z); return z; }
  function bolt(pts, col = '#bfe8ff', T = .25) { A.fx({ k: 'bolt', pts, t: 0, T, col }); }

  // ---------- 每本书出手 ----------
  // c = { S, sk, L(熟练度格数), d(本次伤害), a(朝向), sid }；返回 false = 场上没有敌人，不放
  const C = {
    sword(c) { const r = 52 * MR * (c.L >= 3 ? 1.25 : 1) * area(), half = 1.18 * (c.L >= 3 ? 1.2 : 1), h = H();
      const slash = (rev) => { const a = A.aimNow(c.a); A.fx({ k: 'slash', x: h.x, y: h.y - 12 * K, a, t: 0, T: .2, r, half, rev }); hitAll(z => inFan(z, h, a, r, half), c.d, { sid: c.sid, kb: 12 }); };
      slash(); if (c.L >= 5) wait(.15, () => slash(true));
      if (c.L >= 7) shoot({ x: h.x, y: h.y, a: c.a, v: 260, life: .6, r: 12, pierce: 99, d: c.d * .7, sid: c.sid, o: { extra: true }, look: 'crescent' }); },
    whirl(c) { const r = 40 * MR * area(), h = H(), spin = (k) => { A.fx({ k: 'ring', x: h.x, y: h.y, t: 0, T: .3, r, col: '#e8ecf4' }); hitAll(z => inCircle(z, h, r), c.d * k, { sid: c.sid, kb: 12, slowP: c.L >= 3 ? [.3, 1.5] : 0 }); };
      spin(1); if (c.L >= 5) wait(.25, () => spin(1));
      if (c.L >= 7) zone({ x: h.x, y: h.y, r: r * .7, T: 1, every: .2, d: c.d * .4, sid: c.sid, look: 'wind' }); },
    guard(c) { swords = []; swords.push({ cast: active, hits: 6, life: 6, ph: R(0, 7), d: c.d, sid: c.sid, L: c.L, cd: new Map() }); },
    wave(c) { const h = H(), n = 3; for (let i = 0; i < n; i++) shoot({ x: h.x, y: h.y, a: c.a + (i - (n - 1) / 2) * .25, v: 240, life: .7, r: 12, pierce: c.L >= 5 ? 99 : 3, d: c.d, sid: c.sid, look: 'crescent', back: c.L >= 7 }); },
    phantom(c) { const h = H(), L = 120, w = 12, e = P(h.x, h.y, c.a, L);
      A.fx({ k: 'line', x: h.x, y: h.y - 10 * K, a: c.a, L, w, t: 0, T: .25, col: '#bfe8ff' });
      hitAll(z => inLine(z, h, c.a, L, w), c.d, { sid: c.sid, kb: 6, bleed: c.L >= 5 });
      const g = (p) => ghosts.push({ cast: active, x: p.x, y: p.y, f: h.f, t: 0, T: c.L >= 3 ? 2 : .7, d: c.d * .67, sid: c.sid, spun: false, mimic: c.L >= 3 });
      g(e); if (c.L >= 7) g({ x: h.x, y: h.y }); },
    flash(c) { const h = H(), r = 52 * 1.8 * (c.L >= 5 ? 1.3 : 1) * area();
      A.fx({ k: 'slash', x: h.x, y: h.y - 12 * K, a: c.a, t: 0, T: .3, r, half: PI / 2, gold: true }); A.shake(.2);
      hitAll(z => inFan(z, h, c.a, r, PI / 2), c.d, { sid: c.sid, kb: 16, crit: c.S.crit });
      if (c.L >= 7) shoot({ x: h.x, y: h.y, a: c.a, v: 220, life: .9, r: 22, pierce: 99, d: c.d * .6, sid: c.sid, o: { extra: true }, look: 'crescent', big: 2 }); },
    storm(c) { return { hold: c.L >= 5 ? 3 : 2, move: c.L >= 3 ? 1.3 : 1, every: .2, spin: true,
      tick: () => { const h = H(), r = 30 * MR * area(); A.fx({ k: 'ring', x: h.x, y: h.y, t: 0, T: .2, r, col: '#e8ecf4' }); hitAll(z => inCircle(z, h, r), c.d, { sid: c.sid, kb: 6 }); },
      end: () => { if (c.L >= 7) { const h = H(); A.fx({ k: 'ring', x: h.x, y: h.y, t: 0, T: .4, r: 60, col: '#fff2b0' }); hitAll(z => inCircle(z, h, 60 * area()), c.d * 3, { sid: c.sid, kb: 16, extra: true }); } } }; },
    holysword(c) { const p0 = dense(40) || H(), n = c.L >= 3 ? 9 : 6;
      for (let i = 0; i < n; i++) { const p = { x: p0.x + R(-40, 40) * K, y: p0.y + R(-28, 28) * K }; A.tele({ k: 'circle', x: p.x, y: p.y, r: 24, t: 0, T: .3 + i * .1 }); wait(.3 + i * .1, () => { A.fx({ k: 'pillar', x: p.x, y: p.y, t: 0, T: .3, r: 12, col: '#fff2b0' }); hitAll(z => inCircle(z, p, 24), c.d, { sid: c.sid, kb: 8 }); }); }
      wait(.4 + n * .1, () => { A.fx({ k: 'pillar', x: p0.x, y: p0.y, t: 0, T: .5, r: 24, col: '#fff2b0' }); hitAll(z => inCircle(z, p0, 60), c.d, { sid: c.sid, kb: 16, finisher: true }); }); },
    // ---- 枪 ----
    spear(c) { const h = H(), L = 82 * MR * (c.L >= 3 ? 1.25 : 1) * area(), w = 14 * area(), go = () => { const a = A.aimNow(c.a); A.fx({ k: 'thrust', x: h.x, y: h.y - 12 * K, a, L, w, t: 0, T: .2 }); hitAll(z => inLine(z, h, a, L, w), c.d, { sid: c.sid, kb: 12 }); return a; };
      const a = go(); if (c.L >= 5) wait(.15, go);
      if (c.L >= 7) { const e = P(h.x, h.y, a, L * .8); shoot({ x: e.x, y: e.y, a, v: 300, life: .4, r: 10, pierce: 99, d: c.d * .6, sid: c.sid, o: { extra: true }, look: 'beam' }); } },
    sweep(c) { const h = H(), r = 48 * MR * (c.L >= 3 ? 1.25 : 1) * area(), half = 1.4, st = c.L >= 5 ? .6 : .3, go = (rev) => { const a = A.aimNow(c.a); A.fx({ k: 'slash', x: h.x, y: h.y - 10 * K, a, t: 0, T: .22, r, half, rev, wood: true }); hitAll(z => inFan(z, h, a, r, half), c.d, { sid: c.sid, kb: 22, cc: ['stun', st] }); };
      go(); if (c.L >= 7) wait(.2, () => go(true)); },
    javelin(c) { const h = H(), n = c.L >= 7 ? 2 : 1; for (let i = 0; i < n; i++) shoot({ x: h.x, y: h.y - 14 * K, a: c.a + (i - (n - 1) / 2) * .12, v: 300, life: .8, r: 9, pierce: c.L >= 3 ? 4 : 2, d: c.d, sid: c.sid, look: 'spear', o: { slowP: [.5, 2] },
      onEnd: p => { marks.push({ k: 'stuck', x: p.x, y: p.y + 14 * K, a: p.a, t: 0, T: 1.2 }); if (c.L >= 5) { A.fx({ k: 'boom', x: p.x, y: p.y + 14 * K, t: 0, T: .35, r: 30 }); hitAll(z => inCircle(z, { x: p.x, y: p.y + 14 * K }, 30), c.d * .8, { sid: c.sid, kb: 12, extra: true }); } } }); },
    hundred(c) { const h = H(), n = 6, L = 100 * area(); for (let i = 0; i < n; i++) { const a = c.a + (i - (n - 1) / 2) * (PI / 2 / (n - 1)); A.fx({ k: 'thrust', x: h.x, y: h.y - 12 * K, a, L, w: 18, t: 0, T: .22 }); hitAll(z => inLine(z, h, a, L, 18), c.d, { sid: c.sid, kb: 4 }); } },
    rising(c) { const h = H(), k = c.L >= 3 ? 1.25 : 1, L = 70 * MR * k * area(), w = 22 * k * area(), hit = [];
      A.fx({ k: 'thrust', x: h.x, y: h.y - 12 * K, a: c.a, L, w, t: 0, T: .25 });
      hitAll(z => inLine(z, h, c.a, L, w), c.d, { sid: c.sid, kb: 4, cc: ['air', .6], airVuln: c.L >= 5, on: z => hit.push(z) });
      wait(.6, () => { for (const z of hit) if (!z.dead) { A.hurt(z, c.d * .67, z, 0, c.sid, { extra: true }); if (c.L >= 7) { A.fx({ k: 'ring', x: z.x, y: z.y, t: 0, T: .3, r: 22, col: '#c8a066' }); hitAll(o => o !== z && inCircle(o, z, 22), c.d * .5, { sid: c.sid, kb: 8, extra: true }); } } }); },
    drill(c) { const h = H(); shoot({ x: h.x, y: h.y - 10 * K, a: c.a, v: 60, life: 2, r: 14 * (c.L >= 3 ? 1.3 : 1) * area(), pierce: 999, d: c.d, sid: c.sid, look: 'drill', tick: .2, pullSide: c.L >= 5,
      onEnd: p => { if (c.L >= 7) { A.fx({ k: 'boom', x: p.x, y: p.y + 10 * K, t: 0, T: .4, r: 40 }); A.shake(.2); hitAll(z => inCircle(z, { x: p.x, y: p.y + 10 * K }, 40), c.d * 4, { sid: c.sid, kb: 16, extra: true }); } } }); },
    leap(c) { const h = H(), r = 40 * MR * area(), n = c.L >= 3 ? 6 : 4, a0 = R(0, PI); A.shake(.3);
      const slam = (k) => { A.fx({ k: 'ring', x: h.x, y: h.y, t: 0, T: .4, r, col: '#c8a066' }); hitAll(z => inCircle(z, h, r), c.d * k, { sid: c.sid, kb: 18, cc: c.L >= 5 && k === 1 ? ['air', .6] : 0 }); };
      slam(1); for (let i = 0; i < n; i++) { const a = a0 + i / n * PI * 2; A.fx({ k: 'line', x: h.x, y: h.y, a, L: 120, w: 10, t: 0, T: .35, col: '#c8a066' }); hitAll(z => inLine(z, h, a, 120, 12), c.d * .5, { sid: c.sid, kb: 8, extra: true }); }
      if (c.L >= 7) wait(.5, () => slam(.6)); },
    dragon(c) { let th = A.ang(H(), near() || H()); return { hold: 3, move: 1, every: .5,
      tick: () => { th += .35; const h = H(), p = P(h.x, h.y, th, 70); A.fx({ k: 'orb', x: p.x, y: p.y - 14 * K, t: 0, T: .25, r: c.L >= 3 ? 14 : 10, col: '#6fd8c8' }); hitAll(z => inCircle(z, p, c.L >= 3 ? 22 : 16), c.d, { sid: c.sid, kb: 10 }); },
      end: () => { if (c.L >= 7) { const p = dense(40) || H(); A.fx({ k: 'boom', x: p.x, y: p.y, t: 0, T: .5, r: 55 }); A.shake(.4); hitAll(z => inCircle(z, p, 55), c.d * .8, { sid: c.sid, kb: 20, extra: true, finisher: true }); } } }; },
    // ---- 弓 ----
    bow(c) { const h = H(), arrow = (a, split) => shoot({ x: h.x, y: h.y - 16 * K, a, v: 320, life: .7, r: 8, pierce: 1 + (c.L >= 3 ? 1 : 0), d: c.d, sid: c.sid, look: 'arrow',
      onHit: (p, z) => { if (split && !p.split) { p.split = 1; for (let i = -1; i <= 1; i++) shoot({ x: p.x, y: p.y, a: p.a + PI + i * .5, v: 260, life: .3, r: 6, pierce: 0, d: c.d * .5, sid: c.sid, o: { extra: true }, look: 'arrow', skip: z }); } } });
      arrow(c.a, c.L >= 7); if (c.L >= 5) wait(.1, () => arrow(A.aimNow(c.a), c.L >= 7)); },
    fan(c) { const h = H(), n = c.L >= 3 ? 7 : 5, go = () => { const a0 = A.aimNow(c.a); for (let i = 0; i < n; i++) shoot({ x: h.x, y: h.y - 16 * K, a: a0 + (i - (n - 1) / 2) * (1 / (n - 1)), v: 300, life: .35, r: 8, pierce: 0, d: c.d, sid: c.sid, look: 'arrow', kb: c.L >= 5 ? 18 : 6 }); };
      go(); if (c.L >= 7) wait(.3, go); },
    homing(c) { const h = H(), n = c.L >= 3 ? 5 : 3, used = new Set(); for (let i = 0; i < n; i++) { const t = near(1e9, used) || near(); if (t) used.add(t);
      shoot({ x: h.x, y: h.y - 16 * K, a: c.a + (i - (n - 1) / 2) * .9, v: 200, life: 1.6, r: 8, pierce: 0, d: c.d, sid: c.sid, look: 'feather', home: t, o: c.L >= 5 ? { slowP: [.3, 2] } : {},
        onHit: (p, z) => { p.bn = (p.bn || 0) + 1; p.o = Object.assign({}, p.o, { extra: true }); p.d *= .6; if (p.bn <= (c.L >= 7 ? 2 : 1)) { const n2 = nearOf(z, 110, new Set([z])); if (n2) { p.left = 1; p.home = n2; p.life = p.t + 1; } } } }); } },   // 11/22：命中后弹到下一只
    rain(c) { const go = (p) => { if (!p) return; const r = 36 * (c.L >= 3 ? 1.25 : 1) * area(); A.tele({ k: 'circle', x: p.x, y: p.y, r, t: 0, T: .6 });
        wait(.6, () => zone({ x: p.x, y: p.y, r, T: c.L >= 5 ? 2.5 : 1.5, every: .25, d: c.d, sid: c.sid, look: 'rain', o: c.L >= 5 ? { slowP: [.3, .5] } : {} })); };
      const p1 = dense(30) || (near() && { x: near().x, y: near().y }); go(p1); if (c.L >= 7) go(dense(30, 170, p1 ? [p1] : [])); },
    barrage(c) { const pick = () => F().sort((p, q) => ((q.tier || q.T.boss) ? 1e6 : 0) + q.hp - (((p.tier || p.T.boss) ? 1e6 : 0) + p.hp))[0]; let tg = pick(); const n = c.L >= 3 ? 7 : 5; for (let k = 0; k < n; k++) wait(k * .8 / (n - 1), () => { if (!tg || tg.dead) tg = pick(); if (!tg) return; const h = H(), a = A.ang(h, tg); A.face(a); const last = c.L >= 7 && k === n - 1; shoot({ x: h.x, y: h.y - 16 * K, a, v: last ? 600 : 380, life: last ? 1 : .8, r: last ? 10 : 7, pierce: last ? 99 : 0, d: c.d, sid: c.sid, look: last ? 'bigarrow' : 'arrow', home: last ? null : tg, o: c.L >= 5 ? { vuln: 1 } : {} }); }); },
    pierce(c) { const h = H(), wide = c.L >= 5 ? 15 : 10; shoot({ x: h.x, y: h.y - 16 * K, a: c.a, v: 600, life: .9, r: wide, pierce: 999, d: c.d, sid: c.sid, look: 'bigarrow', kb: 24, big: c.L >= 5 ? 1.5 : 1,
      onHit: (p, z) => { if (c.L >= 7) wait(.15, () => { A.fx({ k: 'boom', x: z.x, y: z.y, t: 0, T: .3, r: 20 }); hitAll(o => inCircle(o, z, 20), c.d * .3, { sid: c.sid, kb: 8, extra: true }); }); } }); A.shake(.15); },
    cyclone(c) { const h = H(), n = c.L >= 7 ? 2 : 1; for (let i = 0; i < n; i++) shoot({ x: h.x, y: h.y - 12 * K, a: c.a + (i - (n - 1) / 2) * .2, v: 60, life: 2, r: 16 * (c.L >= 3 ? 1.3 : 1) * area(), pierce: 999, d: c.d, sid: c.sid, look: 'tornado', tick: .2, pull: true,
      onEnd: p => { const q = { x: p.x, y: p.y + 12 * K }; for (const z of F()) if (inCircle(z, q, p.r * 1.6)) A.push(z, A.ang(q, z), 20); if (c.L >= 5) { A.fx({ k: 'boom', x: q.x, y: q.y, t: 0, T: .4, r: 36 }); hitAll(z => inCircle(z, q, 36), c.d * 5, { sid: c.sid, kb: 14 }); } } }); },
    starfall(c) { return { hold: 3, move: 1, every: c.L >= 3 ? .13 : .2, tick: () => { const z = F()[Math.random() * F().length | 0]; if (!z) return; const p = { x: z.x + R(-10, 10) * K, y: z.y + R(-8, 8) * K }; A.tele({ k: 'circle', x: p.x, y: p.y, r: 22, t: 0, T: .3 });
        wait(.3, () => { A.fx({ k: 'boom', x: p.x, y: p.y, t: 0, T: .3, r: 22 }); hitAll(o => inCircle(o, p, 22), c.d, { sid: c.sid, kb: 8 }); if (c.L >= 5) zone({ x: p.x, y: p.y, r: 14, T: 1.5, every: .5, d: c.d * .2, sid: c.sid, look: 'fire', o: { burn: 1 } }); }); },
      end: () => { if (c.L >= 7) { const p = dense(40) || H(); A.tele({ k: 'circle', x: p.x, y: p.y, r: 60, t: 0, T: .6 }); wait(.6, () => { A.fx({ k: 'boom', x: p.x, y: p.y, t: 0, T: .6, r: 60 }); A.shake(.5); hitAll(z => inCircle(z, p, 60), c.d * 6, { sid: c.sid, kb: 22 }); }); } } }; },
    // ---- 法杖 ----
    staff(c) { const h = H(), r = 30 * (c.L >= 3 ? 1.25 : 1) * area(), ball = (p) => { if (!p) return; A.fireball(p.x, p.y, .5, r, () => { hitAll(z => inCircle(z, p, r), c.d, { sid: c.sid, kb: 14, burn: 1 }); if (c.L >= 5) zone({ x: p.x, y: p.y, r: r * .8, T: 2, every: .5, d: c.d * .25, sid: c.sid, look: 'fire', o: { burn: 1 } }); }); };
      let p1 = dense(r, 150); if (!p1) { const e = P(h.x, h.y, c.a, 150 * area()); p1 = e; } ball(p1); if (c.L >= 7) ball(dense(r, 150, [p1])); },
    nova(c) { const h = H(), r = 44 * (c.L >= 3 ? 1.25 : 1) * area(); A.fx({ k: 'frost', x: h.x, y: h.y, t: 0, T: .45, r });
      hitAll(z => inCircle(z, h, r), c.d, { sid: c.sid, kb: 14, slow: c.L >= 5 ? 2 : 1 });
      if (c.L >= 7) for (let i = 0; i < 8; i++) shoot({ x: h.x, y: h.y - 8 * K, a: i / 8 * PI * 2, v: 200, life: .5, r: 7, pierce: 1, d: c.d * .4, sid: c.sid, look: 'ice', o: { slow: 1 } }); },
    chain(c) { const one = (start) => { if (!start) return; const hit = new Set([start]), pts = [{ x: H().x, y: H().y - 20 * K }]; let z = start, d = c.d; const n = (c.L >= 3 ? 5 : 3) + 1;
        for (let i = 0; i < n && z; i++) { pts.push({ x: z.x, y: z.y - 14 * K }); A.hurt(z, d * (z.slowL > 0 ? 2 : 1), H(), 4, c.sid, { dt: 'magic' }); if (c.L < 5) d *= .85; const nx = nearOf(z, 60, hit); if (nx) hit.add(nx); z = nx; }
        bolt(pts); };
      const t1 = near(); one(t1); if (c.L >= 7) one(near(1e9, new Set([t1]))); },
    pillar(c) { const n = c.L >= 3 ? 2 : 1, used = new Set(); for (let i = 0; i < n; i++) { const t = near(1e9, used) || near(); if (!t) return; used.add(t); const p = { x: t.x, y: t.y }; A.tele({ k: 'circle', x: p.x, y: p.y, r: 26, t: 0, T: .5, gold: true });
      wait(.5, () => { A.fx({ k: 'pillar', x: p.x, y: p.y, t: 0, T: c.L >= 5 ? 1.5 : .4, r: 14, col: '#fff2b0' }); let healed = 0;
        hitAll(z => inCircle(z, p, 26), c.d, { sid: c.sid, kb: 8, on: () => { if (c.L >= 7 && healed < 5) { healed++; A.heal(1); } } });
        if (c.L >= 5) zone({ x: p.x, y: p.y, r: 26, T: 1.5, every: .3, d: c.d * .3, sid: c.sid, look: 'holy' }); }); } },
    // 11/22 暗影黑雾（原暗影宝珠，id 不变）：在怪最密处放一团黑雾 5 秒，每 0.5 秒魔法伤害 + 减速；最多 2 团，再放就换掉剩得最少的那团
    orbs(c) { const p = dense(40, 220) || near(); if (!p) return; const fogs = zones.filter(z => z.look === 'fog'); if (fogs.length >= 2) { const old = fogs.sort((a, b) => (b.t / b.T) - (a.t / a.T))[0]; zones.splice(zones.indexOf(old), 1); }
      const r = 40 * (c.L >= 3 ? 1.25 : 1) * area();
      zone({ x: p.x, y: p.y, r, T: 5, every: .5, d: c.d, sid: c.sid, look: 'fog', o: { dt: 'magic', slowP: [.3, .6], curse: c.L >= 5 },
        end: c.L >= 7 ? (z0) => { A.fx({ k: 'boom', x: z0.x, y: z0.y, t: 0, T: .4, r: r, col: 'dark' }); hitAll(q => inCircle(q, z0, r), c.d * 3, { sid: c.sid, kb: 10, dt: 'magic' }); } : null }); },
    thunder(c) { const n = 4, pts = []; for (let i = 0; i < n; i++) { const p = dense(24, 200, pts) || (F()[i] && { x: F()[i].x, y: F()[i].y }); if (p) pts.push(p); }
      pts.forEach((p, i) => { A.tele({ k: 'circle', x: p.x, y: p.y, r: 24, t: 0, T: .3 + i * .15 }); wait(.3 + i * .15, () => { bolt([{ x: p.x + R(-6, 6) * K, y: p.y - 140 * K }, { x: p.x + R(-8, 8) * K, y: p.y - 70 * K }, { x: p.x, y: p.y }], '#fff6a0', .3); A.shake(.12);
        for (const z of F()) if (inCircle(z, p, 24)) A.hurt(z, c.d, p, 10, c.sid, { dt: 'magic' });
        if (c.L >= 5) zone({ x: p.x, y: p.y, r: 20, T: 1.5, every: .3, d: c.d * .2, sid: c.sid, look: 'spark' }); }); });
      if (c.L >= 7) { const p = dense(50) || pts[0]; if (p) wait(.4 + n * .15, () => { bolt([{ x: p.x, y: p.y - 160 * K }, { x: p.x + 10 * K, y: p.y - 80 * K }, { x: p.x, y: p.y }], '#ffffff', .45); A.shake(.4); hitAll(z => inCircle(z, p, 50), c.d * 2, { sid: c.sid, kb: 18, extra: true }); }); } },
    blizzard(c) { const hold = c.L >= 5 ? 3.5 : 2.5, r = 70 * (c.L >= 3 ? 1.25 : 1) * area(); return { hold, move: 1, every: .15, snow: r,
      tick: () => { const h = H(), a = R(0, PI * 2), d = Math.sqrt(Math.random()) * r, p = P(h.x, h.y, a, d); A.fx({ k: 'icicle', x: p.x, y: p.y, t: 0, T: .3 }); hitAll(z => inCircle(z, p, 10), c.d, { sid: c.sid, kb: 2, slow: 1 }); },
      end: () => { if (c.L >= 7) for (const z of F()) if (z.cc && z.cc.k === 'freeze') { A.fx({ k: 'frost', x: z.x, y: z.y, t: 0, T: .3, r: 14 }); A.hurt(z, c.d * 3, z, 6, c.sid, { dt: 'magic' }); } } }; },
    abyss(c) { const p = dense(50) || H(), pr = 90 * (c.L >= 3 ? 1.3 : 1); return { hold: 4, move: 1, every: .3, gate: p,
      tick: () => { for (const z of F()) if (D2(z, p) < pr && !z.T.boss) A.pull(z, p, z.tier ? 12 : 30, .3); const L = F().filter(z => D2(z, p) < 50); for (let i = 0; i < 3 && L.length; i++) { const z = L.splice(Math.random() * L.length | 0, 1)[0]; bolt([{ x: p.x, y: p.y }, { x: z.x, y: z.y - 10 * K }], '#b07bff', .2); A.hurt(z, c.d, p, 2, c.sid, { dt: 'magic', curse: c.L >= 5 }); } },
      end: () => { if (c.L >= 7) { A.fx({ k: 'boom', x: p.x, y: p.y, t: 0, T: .5, r: 60, col: 'dark' }); A.shake(.4); for (const z of F()) if (D2(z, p) < 60) { if (!z.tier && !z.T.boss && z.hp < z.maxHp * .15) A.hurt(z, 9999, p, 0, c.sid); else A.hurt(z, c.d * 5, p, 16, c.sid, { dt: 'magic' }); } } } }; },
  };

  // ---------- 每帧 ----------
  function tick(dt) {
    for (let i = later.length - 1; i >= 0; i--) if ((later[i].t -= dt) <= 0) { const f = later[i].fn; later.splice(i, 1); f(); }
    const h = H(), fs = F();
    // 飞行物
    for (let i = projs.length - 1; i >= 0; i--) {
      const p = projs[i]; active = p.cast; p.t += dt;
      if (p.home && !p.home.dead) { const want = A.ang(p, p.home), da = ((want - p.a + PI * 3) % (PI * 2)) - PI; p.a += Math.max(-8 * dt, Math.min(8 * dt, da)); }
      if (p.back && p.t > p.life * .5) { p.a = A.ang(p, h); if (!p.turned) { p.turned = 1; p.hit.clear(); p.left = 99; } if (D2(p, h) < 8) { projs.splice(i, 1); continue; } }
      p.x += Math.cos(p.a) * p.v * K * dt; p.y += Math.sin(p.a) * p.v * K * dt / YS;
      const gy = p.y + (p.look === 'arrow' || p.look === 'bigarrow' || p.look === 'feather' ? 16 : 12) * K, q = { x: p.x, y: gy };
      for (const z of fs) {
        if (z === p.skip) continue;
        if (p.pull) { const d = D2(z, q); if (d < p.r * 1.6 && !z.T.boss) A.pull(z, q, z.tier ? p.v * .5 : p.v * 1.2, dt); }
        if (p.pullSide) { const d = D2(z, q); if (d < p.r * 2.2 && !z.T.boss) { const side = -Math.sin(p.a) * (z.x - q.x) + Math.cos(p.a) * (z.y - q.y) * YS; A.push(z, p.a + (side > 0 ? -PI / 2 : PI / 2), 18 * dt * 10); } }
        if (D2(z, q) > p.r + 6 * (z.k || 1)) continue;
        if (p.tick) { const last = p.hitT.get(z) || -9; if (p.t - last < p.tick) continue; p.hitT.set(z, p.t); A.hurt(z, p.d, q, p.kb ?? 2, p.sid, Object.assign({}, p.o)); continue; }
        if (p.hit.has(z)) continue; p.hit.add(z); const landed = A.hurt(z, p.d, { x: q.x - Math.cos(p.a) * K, y: q.y - Math.sin(p.a) * K }, p.kb ?? 10, p.sid, Object.assign({}, p.o)); if (landed !== false && p.onHit && !p.o?.extra && (!active || !active.projectileCallbacks?.has(z))) { if (active) { active.projectileCallbacks ||= new Set(); active.projectileCallbacks.add(z); } p.onHit(p, z); }
        if (--p.left < 0) { p.dead = 1; break; }
      }
      if (p.dead || p.t >= p.life) { if (p.onEnd) p.onEnd(p); projs.splice(i, 1); }
    }
    // 地面区域
    for (let i = zones.length - 1; i >= 0; i--) { const z0 = zones[i]; active = z0.cast; z0.t += dt; z0.ti -= dt; if (z0.ti <= 0) { z0.ti = z0.every; for (const z of fs) if (inCircle(z, z0, z0.r)) A.hurt(z, z0.d, z0, 2, z0.sid, Object.assign({ quiet: true }, z0.o)); } if (z0.t >= z0.T) { zones.splice(i, 1); if (z0.end) z0.end(z0); } }
    // 守护之刃
    for (let i = swords.length - 1; i >= 0; i--) { const s = swords[i]; active = s.cast; s.life -= dt; s.ph += 4 * dt; const p = P(h.x, h.y, s.ph + i * PI * 2 / swords.length, 40); s.x = p.x; s.y = p.y;   // 11/22 变大：半径 26→40
      for (const z of fs) { const cd = s.cd.get(z) || 0; if (cd > 0) { s.cd.set(z, cd - dt); continue; } if (!inCircle(z, s, 12)) continue; s.cd.set(z, .4); A.hurt(z, s.d, h, 14, s.sid, { bleed: s.L >= 5 }); if (--s.hits <= 0) break; }
      if (s.hits <= 0 || s.life <= 0) { swords.splice(i, 1); if (s.L >= 7) { const t = nearOf(s, 160); if (t) shoot({ x: s.x, y: s.y - 12 * K, a: A.ang(s, t), v: 320, life: .6, r: 8, pierce: 0, d: s.d * 2, sid: s.sid, o: { extra: true }, look: 'sword' }); } } }
    // 暗影宝珠
    for (let i = orbs.length - 1; i >= 0; i--) { const o = orbs[i]; active = o.cast; o.ph += 2 * dt; const p = P(h.x, h.y - 26 * K, o.ph + i * 2.1, 18); o.x = p.x; o.y = p.y; o.cd -= dt;
      if (o.cd <= 0) { const t = nearOf({ x: o.x, y: o.y + 26 * K }, 170); if (t) { o.cd = .8; o.shots--; shoot({ x: o.x, y: o.y, a: A.ang(o, { x: t.x, y: t.y - 12 * K }), v: 200, life: .9, r: 7, pierce: 0, d: o.d, sid: o.sid, look: 'shadow', o: { dt: 'magic', curse: o.L >= 5 } }); } }
      if (o.shots <= 0) { orbs.splice(i, 1); if (o.L >= 7) { const t = nearOf(o, 200); if (t) shoot({ x: o.x, y: o.y, a: A.ang(o, t), v: 240, life: .8, r: 9, pierce: 0, d: o.d, sid: o.sid, look: 'shadow', big: 2, onHit: (p, z) => { A.fx({ k: 'boom', x: z.x, y: z.y, t: 0, T: .35, r: 26, col: 'dark' }); hitAll(q => inCircle(q, z, 26), o.d * 3, { sid: o.sid, kb: 10, dt: 'magic' }); } }); } } }
    // 幻影斩的残影
    for (let i = ghosts.length - 1; i >= 0; i--) { const g = ghosts[i]; active = g.cast; g.t += dt; if (!g.spun && g.t > .5) { g.spun = true; ghostSpin(g); } if (g.t >= g.T) ghosts.splice(i, 1); }
    for (let i = marks.length - 1; i >= 0; i--) if ((marks[i].t += dt) >= marks[i].T) marks.splice(i, 1);
    // 占时型
    for (let i = followers.length - 1; i >= 0; i--) { const f = followers[i]; active = f.cast; const oldArea = h.m.area; h.m.area = f.scale; f.elapsed += dt; f.ti -= dt; while (f.ti <= 0 && f.elapsed <= f.hold + dt) { f.ti += f.every; if (f.tick) f.tick(); } if (f.spin) A.spinFace(); if (f.elapsed >= f.hold) { followers.splice(i, 1); if (f.end) f.end(); } h.m.area = oldArea; }
    active = ch && ch.cast;
    if (ch) { ch.ti -= dt; if (ch.ti <= 0) { ch.ti = ch.every; ch.tick && ch.tick(); } if (ch.spin) A.spinFace(); } active = null;
  }
  function ghostSpin(g) { A.fx({ k: 'ring', x: g.x, y: g.y, t: 0, T: .3, r: 34, col: '#9fe8ff' }); hitAll(z => inCircle(z, g, 34), g.d, { sid: g.sid, kb: 10, extra: true }); }

  // ---------- 画 ----------
  function drawUnder(ctx, X, Y, u) {
    const pix = (x, y, c, q = 1) => { ctx.fillStyle = c; ctx.fillRect(x, y, q * u, q * u); };
    for (const z of zones) { const a = 1 - z.t / z.T;
      if (z.look === 'fog') { const k = Math.min(1, z.t * 4, (z.T - z.t) * 2), x = X(z.x), y = Y(z.y);   // 黑雾：深紫底 + 翻滚的暗紫颗粒
        for (let q = 0; q < 3; q++) { ctx.fillStyle = `rgba(${[40, 60, 90][q]},${[14, 24, 40][q]},${[60, 90, 130][q]},${.22 * k})`; ctx.beginPath(); ctx.ellipse(x + Math.round(Math.cos(z.t * 1.3 + q * 2) * 4 * u), y + Math.round(Math.sin(z.t * 1.1 + q * 2) * 2 * u), z.r * u * (1 - q * .18), z.r * u * (1 - q * .18) / YS, 0, 0, 7); ctx.fill(); }
        for (let j = 0; j < 14; j++) { const aa = j * 2.4 + z.t * (j % 2 ? 1.2 : -.9), rr = z.r * (.25 + .7 * ((j * 37) % 10) / 10); pix(x + Math.round(Math.cos(aa) * rr * u), y + Math.round(Math.sin(aa) * rr * u / YS) - Math.round(((z.t * 10 + j * 3) % 8) * u), j % 3 ? 'rgba(154,80,224,' + (.8 * k) + ')' : 'rgba(30,8,40,' + (.9 * k) + ')', 2 * u); }
        continue; }
      const col = { fire: '255,110,40', rain: '200,210,230', holy: '255,240,170', spark: '255,240,120', wind: '220,230,240' }[z.look] || '255,255,255';
      ctx.strokeStyle = `rgba(${col},.35)`; ctx.beginPath(); ctx.ellipse(X(z.x), Y(z.y), z.r * u, z.r * u / YS, 0, 0, 7); ctx.stroke();
      for (let k = 0; k < 6; k++) { const aa = Math.random() * 7, rr = Math.random() * z.r; pix(X(z.x) + Math.round(Math.cos(aa) * rr * u), Y(z.y) + Math.round(Math.sin(aa) * rr * u / YS) - (z.look === 'rain' ? Math.round(Math.random() * 8 * u) : 0), `rgba(${col},.35)`, z.look === 'rain' ? 1 : 2); } }
    for (const m of marks) if (m.k === 'stuck') { const ca = Math.cos(m.a), sa = Math.sin(m.a) / YS; for (let j = 0; j < 12; j++) pix(X(m.x) - Math.round(ca * j * 1.5 * u), Y(m.y) - Math.round((sa * j * 1.5 + j * .6) * u), j < 3 ? '#e8ecf4' : '#a89a80'); }
    if (ch && ch.snow) { const h = H(); ctx.fillStyle = 'rgba(200,230,255,.10)'; ctx.beginPath(); ctx.ellipse(X(h.x), Y(h.y), ch.snow * u, ch.snow * u / YS, 0, 0, 7); ctx.fill(); }
    if (ch && ch.gate) { const p = ch.gate; ctx.fillStyle = 'rgba(40,10,60,.55)'; ctx.beginPath(); ctx.ellipse(X(p.x), Y(p.y), 26 * u, 26 * u / YS, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#b07bff'; ctx.lineWidth = u; ctx.stroke(); }
  }
  function drawOver(ctx, X, Y, u) {
    for (const f of followers) if (f.snow) { const h = H(); ctx.strokeStyle = 'rgba(200,230,255,.35)'; ctx.lineWidth = u; ctx.beginPath(); ctx.ellipse(X(h.x), Y(h.y), f.snow * u, f.snow * u / YS, 0, 0, 7); ctx.stroke(); }
    const pix = (x, y, c, q = 1) => { ctx.fillStyle = c; ctx.fillRect(x, y, q * u, q * u); };
    for (const g of ghosts) { const a = Math.max(0, 1 - g.t / g.T) * .55; ctx.globalAlpha = a; SPR.drawHero(ctx, g.spun ? 'atk' : 'idle', g.spun ? 1 : 0, X(g.x), Y(g.y), g.f < 0, u, { w: 'sword', white: .8 }); ctx.globalAlpha = 1; }
    for (const s of swords) { const x = X(s.x), y = Y(s.y) - 14 * u, a = s.ph * 2, ca = Math.cos(a), sa = Math.sin(a);   // 11/22 飞剑画大：两倍长、金边
      ctx.fillStyle = 'rgba(255,216,106,.18)'; ctx.beginPath(); ctx.arc(x, y, 10 * u, 0, 7); ctx.fill();
      for (let j = -9; j <= 9; j++) { const px = x + Math.round(ca * j * u), py = y + Math.round(sa * j * u); if (j > 5) pix(px, py, j === 6 ? '#ffcf3a' : '#8a5a2a', 2 * u); else { pix(px - Math.round(sa * u), py + Math.round(ca * u), '#e8a020', 2 * u); pix(px, py, j < -7 ? '#ffffff' : '#e8ecf4', 2 * u); } } }
    for (const o of orbs) { const x = X(o.x), y = Y(o.y); ctx.fillStyle = 'rgba(120,60,200,.35)'; ctx.beginPath(); ctx.arc(x, y, 6 * u, 0, 7); ctx.fill(); pix(x - 2 * u, y - 2 * u, '#2a0a40', 4); pix(x - u, y - u, '#c8a0ff', 2); }
    for (const p of projs) { const x = X(p.x), y = Y(p.y), ca = Math.cos(p.a), sa = Math.sin(p.a) / YS, b = p.big || 1;
      if (p.look === 'crescent') { for (let j = -6 * b; j <= 6 * b; j++) { const off = (1 - (j / (6 * b)) ** 2) * 4 * b; pix(x + Math.round((-sa * j + ca * off) * u), y + Math.round((ca * j + sa * off) * u), Math.abs(j) < 2 * b ? '#ffffff' : '#bfe8ff'); } }
      else if (p.look === 'arrow' || p.look === 'bigarrow' || p.look === 'feather' || p.look === 'spear' || p.look === 'sword') { const n = p.look === 'bigarrow' ? 22 : p.look === 'spear' ? 16 : 9, q = p.look === 'bigarrow' ? 2 * b : 1, c1 = p.look === 'feather' ? '#9ff0c8' : p.look === 'bigarrow' ? '#fff6c0' : '#e8ecf4';
        for (let j = 0; j < n; j++) pix(x - Math.round(ca * j * 1.5 * u), y - Math.round(sa * j * 1.5 * u), j < 2 ? c1 : j > n - 3 ? '#e8e0c8' : p.look === 'bigarrow' ? '#ffe9a0' : '#8a5a2a', q); }
      else if (p.look === 'beam') { for (let j = 0; j < 14 * b; j++) pix(x - Math.round(ca * j * 1.5 * u), y - Math.round(sa * j * 1.5 * u), j < 3 ? '#ffffff' : '#fff2b0', 2 * b); }
      else if (p.look === 'drill' || p.look === 'tornado') { const r = p.r * u, rot = p.t * 18; ctx.fillStyle = p.look === 'drill' ? 'rgba(255,240,180,.18)' : 'rgba(220,240,255,.18)'; ctx.beginPath(); ctx.ellipse(x, y, r, r / YS, 0, 0, 7); ctx.fill();
        for (let k = 0; k < 24; k++) { const aa = rot + k * .52, rr = r * (k % 3 + 1) / 3; pix(x + Math.round(Math.cos(aa) * rr), y + Math.round(Math.sin(aa) * rr / YS) - (p.look === 'tornado' ? k * u : 0), p.look === 'drill' ? (k % 2 ? '#fff2b0' : '#e8b84a') : (k % 2 ? '#ffffff' : '#a8d8f0'), 2); } }
      else if (p.look === 'shadow' || p.look === 'ice') { const c = p.look === 'ice' ? ['#ffffff', '#8ad8ff'] : ['#e0c0ff', '#6a2aa0']; pix(x - u * b, y - u * b, c[1], 3 * b); pix(x, y, c[0], b); } }
  }
  return {
    // 出手：返回 null = 没敌人；返回 channel 对象 = 占时型
    cast(c) { if (!F().length) return null; active = { hits: new Map(), effects: new Set(), thunderBonus: false, bonus: c.bonus || 0, career: c.career }; const token = active; const r = C[c.S.kind || c.sk.id](c); if (r && r.hold) { const channel = Object.assign({ ti: r.every, cast: token, scale: area(), elapsed: 0 }, r); if (['storm', 'dragon', 'blizzard', 'starfall', 'abyss'].includes(c.sk.id)) { if (r.snow || r.spin || c.sk.id === 'dragon') followers = followers.filter(f => !f.follow); channel.follow = !!(r.snow || r.spin || c.sk.id === 'dragon'); followers.push(channel); active = null; return true; } ch = channel; active = null; return ch; } if (c.S.sys === '剑' && c.sk.id !== 'phantom') for (const g of ghosts) if (g.mimic && g.spun && g.t < g.T) withCast(g.cast, () => ghostSpin(g)); active = null; return true; },
    chEnd() { if (ch && ch.end) withCast(ch.cast, ch.end); ch = null; }, ch: () => ch,
    extraShot(p) { const prev = active; active = null; try { return shoot({ ...p, o: { ...p.o, extra: true, jobExtra: true } }); } finally { active = prev; } },
    has: id => !!C[id], tick, drawUnder, drawOver,
    reset() { projs = []; zones = []; swords = []; orbs = []; ghosts = []; later = []; marks = []; followers = []; active = null; ch = null; },
  };
};

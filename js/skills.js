const GUNOBJ=Object.fromEntries('tank0 tank1 tankfire0 tankfire1 shell brick0 brick1 claw0 claw1 claw2 missile0 missile1 bomb0 bomb1 cross0 cross1 ko_k ko_o ko_dot marble blk0 blk1 blk2 blk3 popgun0 popgun1 popgun2'.split(' ').map(n=>[n,Object.assign(new Image(),{src:'art/obj/gun/'+n+'.png'})]));
const gunImage=(ctx,n,x,y,u,a=0)=>{const im=GUNOBJ[n];if(!im?.naturalWidth)return;ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y));ctx.rotate(a);ctx.drawImage(im,-im.naturalWidth*u/2,-im.naturalHeight*u/2,im.naturalWidth*u,im.naturalHeight*u);ctx.restore();};
const BURGER=[0,1,2,3,4,5].map(i=>Object.assign(new Image(),{src:'art/obj/burger'+i+'.png'}));   // 11/27
// 像素勇者 · 技能书的出手效果（11/21 第二批）。规则和数值见 js/data.js 的 DATA.skills 与设计文档。
// battle.js 负责轮流、前摇 / 后摇、熟练度；这里只管「出手那一刻做什么」、持续类（占时型 channel）、飞行物、地面区域、召唤物和它们的画法。
// 距离单位：像素格（和 battle.js 一样，1 格 = K 地图像素）；角度用 ang()（已把竖向压扁算进去）。
window.SKILLS = (A) => {
  const raw = Object.assign({}, A, {shake:()=>{}}); let active = null; A = Object.assign({}, raw, { hurt: (z, d, from, kb, sid, o = {}) => raw.hurt(z, d, from, kb, sid, Object.assign({ cast: active }, o)), fireball: (x, y, t, r, cb) => { const token = active; return raw.fireball(x, y, t, r, cb && (() => withCast(token, cb))); } });
  const withCast = (token, fn) => { const prev = active; active = token; try { return fn(); } finally { active = prev; } };
  const { K, YS, PI } = A, R = (a, b) => a + Math.random() * (b - a);
  let projs = [], zones = [], swords = [], orbs = [], ghosts = [], later = [], marks = [], followers = [], actors = [], ch = null;
  const H = () => A.hero(), F = () => A.foes().filter(z => !z.dead && !z.flee);
  const D2 = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * YS) / K;
  const P = (x, y, a, d) => ({ x: x + Math.cos(a) * d * K, y: y + Math.sin(a) * d * K / YS });
  const wait = (t, fn) => { const token = active; later.push({ t, cast: token, fn: () => withCast(token, fn) }); };
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
    leap(c) { const h=H(),r=50*MR*area(),m=A.moveDir?.()||[0,0],a=Math.hypot(m[0],m[1])>.1?Math.atan2(m[1],m[0]):c.a,p=P(h.x,h.y,a,160);h.x=p.x;h.y=p.y;h.inv=Math.max(h.inv||0,.5);A.clamp(h);A.fx({k:'ring',x:p.x,y:p.y,t:0,T:.4,r,col:'#8be8ff'});hitAll(z=>inCircle(z,p,r),22,{sid:c.sid,kb:18});const n=c.L>=7?12:8;for(let i=0;i<n;i++){const an=a+i/n*PI*2;A.fx({k:'line',x:p.x,y:p.y,a:an,L:130,w:10,t:0,T:.35,col:'#8be8ff'});hitAll(z=>inLine(z,p,an,130,12),4,{sid:c.sid,kb:8,extra:i>=8});} },
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
        for (let i = 0; i < n && z; i++) { pts.push({ x: z.x, y: z.y - 14 * K }); A.hurt(z, d * (1+.15*(z.slowL||0)), H(), 4, c.sid, { dt: 'magic' }); if (c.L < 5) d *= .85; const nx = nearOf(z, 60, hit); if (nx) hit.add(nx); z = nx; }
        bolt(pts); };
      const t1 = near(); one(t1); if (c.L >= 7) one(near(1e9, new Set([t1]))); },
    pillar(c) { const n = c.L >= 3 ? 2 : 1, used = new Set(); for (let i = 0; i < n; i++) { const t = near(1e9, used) || near(); if (!t) return; used.add(t); const p = { x: t.x, y: t.y }; A.tele({ k: 'circle', x: p.x, y: p.y, r: 26, t: 0, T: .5, gold: true });
      wait(.5, () => { A.fx({ k: 'pillar', x: p.x, y: p.y, t: 0, T: c.L >= 5 ? 1.5 : .4, r: 14, col: '#fff2b0' }); let healed = 0;
        hitAll(z => inCircle(z, p, 26), c.d, { sid: c.sid, kb: 8, on: () => { if (false && c.L >= 7 && healed < 5) { healed++; A.heal(1); } } });
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

  Object.assign(C, {
    huntingblade(c) { let target=eliteTarget()||near(); if(!target)return false; for(let i=0;i<3;i++)wait(i*.18,()=>{if(target.dead)target=eliteTarget()||near();if(target){if(i===0)hitAll(q=>q===target,c.d,{sid:c.sid,kb:4,on:()=>A.mark('break',target,c)});else A.hurt(target,c.d,target,4,c.sid,{extra:true});}if(i===2&&target?.breakN)A.hurt(target,12,target,0,c.sid,{extra:true});}); },
    sworddomain(c) { return {hold:3,move:1,every:.25,spin:true,tick:()=>{const h=H(),r=44*area();A.fx({k:'ring',x:h.x,y:h.y,t:0,T:.2,r,col:'#9de8ff'});hitAll(z=>inCircle(z,h,r),c.d,{sid:c.sid,kb:4});},end:()=>{const h=H();for(let i=0;i<12;i++)shoot({x:h.x,y:h.y,a:i*PI/6,v:240,life:.55,r:8,pierce:99,d:7,sid:c.sid,look:'crescent',o:{extra:true}});} }; },
    meteorjavelins(c) { const p=dense(45,240)||H();for(let i=0;i<5;i++){const q={x:p.x+R(-35,35)*K,y:p.y+R(-25,25)*K};A.tele({k:'circle',x:q.x,y:q.y,r:13,t:0,T:.35});wait(.35,()=>{A.fx({k:'thrust',x:q.x,y:q.y-45*K,a:PI/2,L:55,w:12,t:0,T:.2});hitAll(z=>inCircle(z,q,16),c.d,{sid:c.sid,kb:8});});} },
    returningthrust(c) { const h=H(),z=near(),m=A.moveDir?.()||[0,0],a=Math.hypot(m[0],m[1])>.1?Math.atan2(m[1],m[0]):(z?A.ang(h,z):c.a),e=P(h.x,h.y,a,100);h.x=e.x;h.y=e.y;h.inv=Math.max(h.inv||0,.15);A.clamp(h);A.fx({k:'thrust',x:h.x,y:h.y,a,L:100,w:24,t:0,T:.25});wait(.2,()=>{A.fx({k:'thrust',x:e.x,y:e.y,a:a+PI,L:70,w:20,t:0,T:.22});hitAll(q=>inLine(q,e,a+PI,70,22),c.d,{sid:c.sid,kb:8});}); },
    knightcharge(c) { const h=H(),z=near(),m=A.moveDir?.()||[0,0],a=Math.hypot(m[0],m[1])>.1?Math.atan2(m[1],m[0]):(z?A.ang(h,z):c.a),e=P(h.x,h.y,a,140);A.fx({k:'line',x:h.x,y:h.y,a,L:140,w:22,t:0,T:.3,col:'#ffe08a'});hitAll(q=>inLine(q,h,a,140,24),5,{sid:c.sid,kb:15,on:q=>{A.mark('imbalance',q,c);A.hurt(q,18,q,0,c.sid,{extra:true});}});h.x=e.x;h.y=e.y;h.inv=Math.max(h.inv||0,.3);A.clamp(h); },
    falcondive(c) { if(!near())return false;const used=new Set();for(let i=0;i<3;i++)wait(i*.5,()=>{const t=near(1e9,used);if(!t)return;used.add(t);A.fx({k:'line',x:t.x,y:t.y-48*K,a:PI/2,L:90,w:10,t:0,T:.18,col:'#d8edff'});hitAll(q=>q===t,c.d,{sid:c.sid,kb:5,on:()=>A.mark('prey',t,c)});}); },
    moonshower(c) { return {hold:3,move:1,every:.5,spin:true,tick:()=>{const z=near();if(!z)return;const p={x:z.x+R(-18,18)*K,y:z.y+R(-14,14)*K};A.tele({k:'circle',x:p.x,y:p.y,r:14,t:0,T:.25});wait(.25,()=>{A.fx({k:'pillar',x:p.x,y:p.y,t:0,T:.2,r:10,col:'#d9d5ff'});hitAll(q=>inCircle(q,p,16),c.d,{sid:c.sid,kb:4});});},end:()=>{const p=dense(45,220)||H();hitAll(z=>inCircle(z,p,30),c.d*3,{sid:c.sid,extra:true});} }; },
    magicmissiles(c) { for(let i=0;i<4;i++)wait(i*.09,()=>{const z=near();packet(c,z?A.ang(H(),z):c.a,c.d,{look:'beam',life:.75,r:7,pierce:0});}); },
    fireburst(c) { const z=dense(45,240)||near();if(!z)return false;const p={x:z.x,y:z.y};A.tele({k:'circle',x:p.x,y:p.y,r:32,t:0,T:.6});wait(.6,()=>{A.fx({k:'boom',x:p.x,y:p.y,t:0,T:.35,r:36,col:'fire'});hitAll(q=>inCircle(q,p,36),c.d,{sid:c.sid,burn:1,kb:8});}); },
    icewall(c) { const z=near(),h=H(),a=z?A.ang(h,z):c.a,p=P(h.x,h.y,a,48);return {hold:2,move:1,every:.5,tick:()=>{A.fx({k:'line',x:p.x,y:p.y-30*K,a:a+PI/2,L:160,w:8,t:0,T:.25,col:'#bfe8ff'});hitAll(t=>inLine(t,p,a+PI/2,160,14),0,{sid:c.sid,slow:1,kb:0});},end:()=>{puff(p,46,'#bfe8ff');hitAll(t=>inLine(t,p,a+PI/2,160,32),8,{sid:c.sid,extra:true,kb:8});}}; },
    balllightning(c) { const z=near(),h=H(),p=z?{x:z.x,y:z.y}:P(h.x,h.y,c.a,80);return {hold:2,move:1,every:.25,tick:()=>{A.fx({k:'orb',x:p.x,y:p.y,t:0,T:.2,r:18,col:'#ffe98a'});hitAll(q=>inCircle(q,p,32),c.d,{sid:c.sid,kb:2});}}; },
    arcaneorb(c) { const z=near(),h=H(),p=z?{x:z.x,y:z.y}:P(h.x,h.y,c.a,80);return {hold:1.8,move:1,every:.3,tick:()=>{const q=P(p.x,p.y,R(0,PI*2),R(0,24));A.fx({k:'orb',x:q.x,y:q.y,t:0,T:.22,r:8,col:'#c59cff'});hitAll(t=>inCircle(t,q,12),c.d,{sid:c.sid,kb:2});}}; },
    firestorm(c) { const h=H(),z=near(),a=z?A.ang(h,z):c.a;for(let i=0;i<4;i++)wait(i*.14,()=>{const p=P(H().x,H().y,a,90+i*12);A.fx({k:'line',x:p.x,y:p.y,a,L:100,w:26,t:0,T:.2,col:'#ff9b5e'});hitAll(q=>inLine(q,p,a,100,30),c.d,{sid:c.sid,burn:1,kb:4});}); },
    gravitywell(c) { const p=dense(60,240)||near()||H();return {hold:2,move:1,every:.25,tick:()=>{for(const z of F())if(D2(z,p)<60){A.pull(z,p,z.tier?8:18,.25);A.hurt(z,c.d,p,0,c.sid,{dt:'magic'});}},end:()=>hitAll(z=>inCircle(z,p,54),12,{sid:c.sid,extra:true,kb:10})}; },
    mirrorbarrage(c) { return {hold:3,move:1,every:.25,spin:true,tick:()=>{for(let i=0;i<3;i++){const z=near();if(z)packet(c,A.ang(H(),z)+i*.1,c.d,{look:'shadow',life:.8,r:7,pierce:1});}},end:()=>{const p=dense(45,220)||H();hitAll(z=>inCircle(z,p,42),18,{sid:c.sid,extra:true,kb:10});}}; }
  });
  // 两个新技能池沿用现有投射物、区域和命中特效；定时实体也共享本次释放的记录。
  function actor(o) { o.cast = active; o.t = 0; o.ti = o.every || 0; o.ticks = 0; actors.push(o); return o; }
  function clearPoolSkill(sid) { actors = actors.filter(o => o.sid !== sid); zones = zones.filter(o => o.sid !== sid); projs = projs.filter(o => o.sid !== sid); later = later.filter(o => o.cast?.sid !== sid); }
  const puff = (p, r, col = '#bfe8ff') => A.fx({ k: 'ring', x: p.x, y: p.y, t: 0, T: .3, r, col });
  const packet = (c, a, d, opts = {}) => shoot({ x: H().x, y: H().y - 12 * K, a, v: 320, life: .9, r: 8, pierce: 0, d, sid: c.sid, look: 'shadow', ...opts });
  const eliteTarget = () => F().sort((a,b) => Number(!!(b.tier || b.T.boss)) - Number(!!(a.tier || a.T.boss)) || D2(a,H()) - D2(b,H()))[0];
  function explodeBomb(o, secondary = false) {
    if (o.dead) return; o.dead = true;
    actor({kind:'cross',x:o.x,y:o.y,T:.35});
    withCast(o.cast, () => {
      hitAll(z => [0,1,2,3].some(i => inLine(z,o,i*PI/2,105,24)), o.d, { sid:o.sid,extra:secondary,kb:0 });
      for (const other of actors) if (other.kind==='bomb'&&!other.dead&&other!==o&&[0,1,2,3].some(i=>inLine(other,o,i*PI/2,105,24))) explodeBomb(other,true);
    });
  }
  function poisonCloud(c, p, duration, damage, maxTicks, opts = {}) {
    const o = actor({ kind:'poison',sid:c.sid,x:p.x,y:p.y,r:46*area(),T:duration,every:.5,maxTicks,
      tick: q => { puff(q,q.r,'rgba(130,210,80,.35)'); hitAll(z=>inCircle(z,q,q.r),damage,{sid:c.sid,dot:true,poisonTag:1,hitGroup:opts.group||'base',maxHits:maxTicks,extra:!!opts.extra,kb:0}); }, ...opts }); return o;
  }
  function venomDot(c, z, secondary = false) {
    actor({kind:'venom',sid:c.sid,target:z,x:z.x,y:z.y,T:3,every:.5,maxTicks:6,last:{x:z.x,y:z.y},
      tick:o=>{if(z.dead){o.dead=true;return;}const moving=D2(z,o.last)>.5;A.hurt(z,c.d*2/3+(moving?c.d/3:0),z,0,c.sid,{dot:true,poisonTag:1,extra:secondary,hitGroup:'poison',maxHits:6});o.last={x:z.x,y:z.y};}});
  }
  Object.assign(C, {
    g_fast(c) { actor({kind:'popgun',x:H().x,y:H().y,a:c.a,T:.25}); for(let i=0;i<9;i++)wait(i*.05,()=>{const z=near();packet(c,z?A.ang(H(),z):c.a,c.d);}); },
    g_spread(c) { actor({kind:'popgun',x:H().x,y:H().y,a:c.a,T:.25}); for(let i=0;i<8;i++)packet(c,c.a+(i-3.5)*.15,c.d,{life:.5}); },
    g_bomb(c) { for(let i=0;i<3;i++)wait(i*.3,()=>actor({kind:'bomb',sid:c.sid,x:H().x,y:H().y,T:1.5,d:c.d,end:o=>explodeBomb(o)})); },
    g_head(c) { actor({kind:'popgun',x:H().x,y:H().y,a:c.a,T:.25}); const z=eliteTarget(),a=z?A.ang(H(),z):c.a,h=H(); A.fx({k:'line',x:h.x,y:h.y-12*K,a,L:1200,w:12,t:0,T:.2,col:'#fff6a0'});hitAll(q=>inLine(q,h,a,1200,18),c.d,{sid:c.sid,forceCrit:true,kb:8}); },
    g_clear(c) { for(let i=0;i<4;i++)actor({kind:'block',x:H().x+Math.cos(c.a)*i*20*K,y:H().y+Math.sin(c.a)*i*20*K/YS,T:.8,frame:i});const h={x:H().x,y:H().y},p=dense(40,220)||h;for(let i=0;i<4;i++)wait(i*.1,()=>{const q=P(h.x,h.y,c.a+PI/2,(i-1.5)*8);A.fx({k:'line',x:q.x,y:q.y,a:c.a,L:220,w:32,t:0,T:.16,col:'#80d8f0'});hitAll(z=>inLine(z,q,c.a,220,44),c.d,{sid:c.sid,kb:2});});wait(.4,()=>{puff(p,60,'#ffe08a');hitAll(z=>inCircle(z,p,60),c.d*1.5,{sid:c.sid,finisher:true,kb:8});}); },
    g_chomp(c) { const h={x:H().x,y:H().y};actor({kind:'burger',sid:c.sid,x:h.x,y:h.y,T:3,eaten:0,r:18,
      update:(o,dt)=>{if(o.gulp>0)o.gulp-=dt;o.fl=Math.cos(c.a)*Math.cos(o.t*PI/1.5)<0;const d=Math.sin(o.t*PI/1.5)*95;o.x=h.x+Math.cos(c.a)*d*K;o.y=h.y+Math.sin(c.a)*d*K/YS;A.clamp(o);for(const z of F())if(o.eaten<5&&!z.tier&&!z.T.boss&&inCircle(z,o,o.r)){A.hurt(z,z.hp,o,0,c.sid,{execute:true,maxHits:5,hitGroup:'swallow'});o.eaten++;o.gulp=.25;if(o.eaten===5)o.r=28;}},}); },
    g_missile(c) { actor({kind:'popgun',x:H().x,y:H().y,a:c.a,T:.25}); const z=eliteTarget();packet(c,z?A.ang(H(),z):c.a,c.d,{home:z,v:170,r:10,life:2,look:'gunmissile',onHit:(p,target)=>{const q={x:target.x,y:target.y};puff(q,42,'#ffb060');hitAll(t=>t!==target&&inCircle(t,q,42),c.d,{sid:c.sid,extra:true,kb:0});}}); },
    g_claw(c) { const p=dense(80,240)||H(),hit=[];actor({kind:'claw',sid:c.sid,x:p.x,y:p.y,T:.6,r:80});hitAll(z=>inCircle(z,p,80),c.d,{sid:c.sid,cc:['air',.4],kb:0,on:z=>hit.push(z)});wait(.4,()=>{puff(p,80,'#e8c8a0');for(const z of hit)if(!z.dead)A.hurt(z,c.d*8/15,p,8,c.sid,{finisher:true});}); },
    g_tank(c) { const p={x:H().x,y:H().y};actor({kind:'tank',a:c.a,sid:c.sid,x:p.x,y:p.y,origin:p,T:3,every:.5,maxTicks:6,
      update:o=>{const d=40*Math.sin(o.t*PI/1.5);o.x=p.x+Math.cos(c.a)*d*K;o.y=p.y+Math.sin(c.a)*d*K/YS;A.clamp(o);for(const z of F())if(inCircle(z,o,20))A.hurt(z,c.d,o,4,c.sid,{hitGroup:'body',maxHits:1});},
      tick:o=>{for(let i=0;i<4;i++)shoot({x:o.x,y:o.y-12*K,a:i*PI/2,v:220,life:1,r:8,pierce:0,d:c.d*1.5,sid:c.sid,look:'gunshell',o:{hitGroup:'shell',maxHits:3}});}});
      for(let i=0;i<4;i++){const q=P(p.x,p.y,i*PI/2,58);actor({kind:'brick',sid:c.sid,x:q.x,y:q.y,T:3,hp:4,contact:new Set(),update:(o,dt)=>{for(const z of F())if(!z.tier&&!z.T.boss&&inCircle(z,o,17)){A.push(z,A.ang(o,z),4);o.hp-=dt;if(o.hp<=0){o.dead=true;puff(o,16,'#c88c58');}}}});} },
    g_ko(c) { const p=dense(65,240)||H();actor({kind:'ko',sid:c.sid,x:p.x,y:p.y,T:.65});A.tele({k:'circle',x:p.x,y:p.y,r:70,t:0,T:.3});wait(.3,()=>{puff(p,70,'#ffe08a');hitAll(z=>inCircle(z,p,70),c.d,{sid:c.sid,kb:12});}); },
    g_marble(c) { const token=active;token.marbleHit=new Map();const add=(a,small=false)=>actor({kind:'marble',sid:c.sid,x:H().x,y:H().y,T:3,rx:0,ry:0,vx:Math.cos(a)*170,vy:Math.sin(a)*170,r:small?5:11,small,
      update:(o,dt)=>{o.rx+=o.vx*dt;o.ry+=o.vy*dt;let bounce=false;if(Math.abs(o.rx)>90){o.rx=Math.sign(o.rx)*90;o.vx*=-1.05;bounce=true;}if(Math.abs(o.ry)>90){o.ry=Math.sign(o.ry)*90;o.vy*=-1.05;bounce=true;}o.vx=Math.max(-350,Math.min(350,o.vx));o.vy=Math.max(-350,Math.min(350,o.vy));o.x=H().x+o.rx*K;o.y=H().y+o.ry*K/YS;
        if(bounce&&c.L>=5&&!small&&(token.smallMarbles||0)<4){token.smallMarbles=(token.smallMarbles||0)+1;const q=add(Math.atan2(o.vy,o.vx)+.8,true);q.rx=o.rx;q.ry=o.ry;q.T=Math.max(.1,3-o.t);}
        for(const z of F())if(inCircle(z,o,o.r)&&A.now()-(token.marbleHit.get(z)??-99)>=.5){const ok=A.hurt(z,c.d*(small?.5:1),o,0,c.sid,{extra:small});if(ok!==false)token.marbleHit.set(z,A.now());}}});add(c.a); },
    u_palm(c) { const h=H(),L=145*area();A.fx({k:'line',x:h.x,y:h.y,a:c.a,L,w:40,t:0,T:.3,col:'#bfe8ff'});hitAll(z=>inLine(z,h,c.a,L,45),c.d,{sid:c.sid,kb:28}); },
    u_fist(c) { const h=H();A.fx({k:'thrust',x:h.x,y:h.y-10*K,a:c.a,L:130*area(),w:32,t:0,T:.3});hitAll(z=>inLine(z,h,c.a,130*area(),35),c.d,{sid:c.sid,cc:['air',.6],kb:12}); },
    u_titan(c) { const p=dense(60,220)||H();A.tele({k:'circle',x:p.x,y:p.y,r:65,t:0,T:.3});wait(.3,()=>{A.fx({k:'pillar',x:p.x,y:p.y,t:0,T:.35,r:30,col:'#c8a070'});puff(p,65,'#c8a070');hitAll(z=>inCircle(z,p,65),c.d,{sid:c.sid,kb:18});}); },
    u_sweep(c) { const h=H(),r=65*area();A.fx({k:'slash',x:h.x,y:h.y,a:c.a,t:0,T:.25,r,half:PI*.8});hitAll(z=>inFan(z,h,c.a,r,PI*.8),c.d,{sid:c.sid,cc:['stun',.6],kb:8}); },
    u_rift(c) { const h=H(),L=200*area();A.fx({k:'line',x:h.x,y:h.y,a:c.a,L,w:26,t:0,T:.4,col:'#c8a070'});hitAll(z=>inLine(z,h,c.a,L,32),c.d,{sid:c.sid,kb:14}); },
    u_stomp(c) { for(let i=0;i<3;i++)wait(i*.3,()=>{const h=H(),r=(42+i*24)*area();puff(h,r,'#c8a070');hitAll(z=>inCircle(z,h,r),c.d,{sid:c.sid,cc:['stun',.4],kb:10});}); },
    u_knives(c) { for(let i=0;i<3;i++)packet(c,c.a+(i-1)*.1,c.d,{look:'sword',life:.7,r:7}); },
    u_ring(c) { for(let i=0;i<12;i++)packet(c,i*PI/6,c.d,{look:'crescent',v:220,life:.55,pierce:99,r:9}); },
    u_daggers(c) { const p=dense(55,220)||H();actor({kind:'daggers',sid:c.sid,x:p.x,y:p.y,r:55*area(),T:2,every:.25,maxTicks:8,tick:o=>{for(let i=0;i<4;i++){const q=P(o.x,o.y,R(0,2*PI),R(0,o.r));A.fx({k:'icicle',x:q.x,y:q.y,t:0,T:.2});}hitAll(z=>inCircle(z,o,o.r),c.d,{sid:c.sid,kb:2});}}); },
    u_poison(c) { poisonCloud(c,dense(45,210)||H(),3,c.d,6); },
    u_venom(c) { for(let i=0;i<7;i++)packet(c,c.a+(i-3)*.14,c.d,{look:'feather',life:.7,onHit:(p,z)=>venomDot(c,z)}); },
    u_plague(c) { const z=eliteTarget()||near();if(!z)return;const spawnMist=o=>{if(o.mist)return;o.mist=true;poisonCloud(c,{x:z.x,y:z.y},2,c.d,4,{group:'mist',extra:true});};
      actor({kind:'plague',sid:c.sid,target:z,x:z.x,y:z.y,T:4,every:.5,maxTicks:8,
        update:o=>{o.x=z.x;o.y=z.y;if(z.dead){spawnMist(o);o.dead=true;}},tick:o=>{if(z.dead)return;A.hurt(z,c.d,z,0,c.sid,{dot:true,poisonTag:1});for(const q of F())if(q!==z&&D2(q,z)<65&&A.now()-(q.poisonInfectedAt??-99)>=3){q.poisonInfectedAt=A.now();actor({kind:'venom',sid:c.sid,target:q,x:q.x,y:q.y,T:2,every:.5,maxTicks:4,tick:v=>{if(q.dead){v.dead=true;return;}A.hurt(q,c.d,q,0,c.sid,{extra:true,dot:true,poisonTag:1,hitGroup:'spread',maxHits:8});}});}if(z.dead)spawnMist(o);},end:o=>{if(z.dead)spawnMist(o);}}); },
    u_bash(c) { const h=H(),r=75*area();puff(h,r,'#b0d8f0');hitAll(z=>inFan(z,h,c.a,r,PI*.6),c.d,{sid:c.sid,kb:28,cc:['stun',.5]}); },
    u_wall(c) { actor({kind:'shield',sid:c.sid,x:H().x,y:H().y,a:c.a,T:1.5,update:o=>{const p=P(H().x,H().y,o.a,36);o.x=p.x;o.y=p.y;for(const z of F())if(!z.tier&&!z.T.boss&&inCircle(z,o,24))A.push(z,A.ang(o,z),5);}}); },
    u_bulwark(c) { const hit=[],h={x:H().x,y:H().y};puff(h,100,'#b0d8f0');hitAll(z=>inCircle(z,h,100),c.d,{sid:c.sid,kb:30,on:z=>{hit.push({z,x:z.x,y:z.y});A.push(z,A.ang(h,z),18);}});wait(.12,()=>{for(const {z,x,y} of hit)if(!z.dead&&(F().some(q=>q!==z&&D2(q,z)<23)||Math.hypot(z.x-x,(z.y-y)*YS)<2*K))A.hurt(z,c.d*6/25,h,0,c.sid,{finisher:true});}); },
  });
  // 圣典与镰刀复用已有光柱、连线、刃弧及敌方骷髅帧。
  const skillScale = c => c.S.dmg ? c.d / c.S.dmg : 1;
  function cappedHeal(c, ratio) {
    const used = active?.healed || 0;
    const cap = c.S.healCap || ratio;
    const request = Math.min(ratio, Math.max(0, cap - used));
    if (active) active.healed = used + request;
    if (request > 0) A.heal(H().maxHp * request);
  }
  function holyPillar(c, p, delay, damage, opts = {}) {
    A.tele({ k:'circle', x:p.x, y:p.y, r:26, t:0, T:delay });
    wait(delay, () => {
      A.fx({ k:'pillar', x:p.x, y:p.y, t:0, T:.35, r:16, col:'#fff0b0' });
      hitAll(z => inCircle(z,p,26*area()), damage, { sid:c.sid, kb:5, ...opts });
    });
  }
  Object.assign(C, {
    h_pages(c) {
      const targets=F();
      for(let i=0;i<6;i++)wait(i*.1,()=>{
        const z=targets[i%targets.length]; if(!z||z.dead)return;
        packet(c,A.ang(H(),z),c.d,{home:z,look:'beam',life:1.2});
      });
    },
    h_sword(c) { const p=eliteTarget(); if(p)holyPillar(c,{x:p.x,y:p.y},1,c.d); },
    h_smite(c) {
      const p=eliteTarget(); if(!p)return;
      holyPillar(c,{x:p.x,y:p.y},.15,c.d,{on:()=>{if(c.L>=7)cappedHeal(c,.005);}});
    },
    h_shield(c) { A.shield(H().maxHp*.06,2);puff(H(),28,'#fff0b0'); },
    h_water(c) {
      const p=dense(35,200)||H();
      actor({kind:'holy',sid:c.sid,x:p.x,y:p.y,r:50*area(),T:3,every:.5,maxTicks:6,
        update:o=>{if(inCircle(H(),o,o.r))A.cleanse();},
        tick:o=>{puff(o,o.r,'rgba(255,225,140,.35)');hitAll(z=>inCircle(z,o,o.r),c.d,{sid:c.sid,kb:0});}});
    },
    h_beam(c) {
      const origin={x:H().x,y:H().y};
      actor({kind:'holy',sid:c.sid,x:origin.x,y:origin.y,T:1.5,every:.25,maxTicks:6,
        tick:o=>{const a=c.a-.5+o.ticks/6;A.fx({k:'line',x:o.x,y:o.y,a,L:240,w:24,t:0,T:.18,col:'#fff0b0'});hitAll(z=>inLine(z,o,a,240,35),c.d,{sid:c.sid,kb:0});}});
    },
    h_verdict(c) {
      const targets=F().filter(z=>z.judgmentT>0&&D2(z,H())<=260).slice(0,6);
      for(const z of targets){A.detonate('judgment',z,c);holyPillar(c,{x:z.x,y:z.y},.1,c.d,{detonate:true,on:()=>cappedHeal(c,.0025)});}
      return true;
    },
    h_seraph(c) {
      const h={x:H().x,y:H().y},a=c.a;
      A.fx({k:'slash',x:h.x,y:h.y-12*K,a,t:0,T:.55,r:220,half:PI/2,gold:true});
      hitAll(z=>inFan(z,h,a,260,PI/2),c.d,{sid:c.sid,kb:10});
      wait(.4,()=>{puff(h,180,'rgba(255,225,140,.35)');hitAll(z=>inFan(z,h,a,260,PI/2),12*skillScale(c),{sid:c.sid,finisher:true,kb:0});});
    },
    d_reap(c) {
      const h=H(); A.fx({k:'slash',x:h.x,y:h.y-12*K,a:c.a,t:0,T:.3,r:110*area(),half:PI/2});
      hitAll(z=>inFan(z,h,c.a,110*area(),PI/2),c.d,{sid:c.sid,kb:8,on:()=>cappedHeal(c,.01)});
    },
    d_return(c) {
      const h={x:H().x,y:H().y};
      A.fx({k:'line',x:h.x,y:h.y,a:c.a,L:200,w:25,t:0,T:.4,col:'#bd86da'});
      hitAll(z=>inLine(z,h,c.a,200,30),c.d,{sid:c.sid,kb:4});
      wait(.4,()=>{A.fx({k:'line',x:h.x,y:h.y,a:c.a,L:200,w:25,t:0,T:.3,col:'#bd86da'});hitAll(z=>inLine(z,h,c.a,200,30),c.d,{sid:c.sid,kb:4});});
    },
    d_curse(c) {
      for(const z of F().filter(z=>D2(z,H())<200).slice(0,c.L>=3?5:3)){A.mark('curse',z,c);if(c.L>=7)z.curseSummon=true;puff(z,16,'#bd86da');}
    },
    d_hook(c) {
      const z=eliteTarget();if(!z)return;
      bolt([{x:H().x,y:H().y-12*K},{x:z.x,y:z.y-12*K}],'#bd86da');
      if(!z.T.boss){const p=P(H().x,H().y,c.a,90);const steps=Math.ceil(D2(z,p)/6);for(let i=0;i<steps;i++){const old={x:z.x,y:z.y};A.pull(z,p,360,.016);if(D2(old,z)<.1)break;}}
      A.hurt(z,c.d,H(),4,c.sid,{});
    },
    d_siphon(c) {
      const targets=F().filter(z=>D2(z,H())<150).slice(0,5);
      actor({kind:'siphon',sid:c.sid,x:H().x,y:H().y,T:1.5,every:.25,maxTicks:6,
        tick:()=>{for(const z of targets)if(!z.dead&&D2(z,H())<180){bolt([{x:H().x,y:H().y-15*K},{x:z.x,y:z.y-12*K}],'#bd86da',.12);if(A.hurt(z,c.d,H(),0,c.sid,{})!==false&&!active.callbacks?.has(z)){active.callbacks ||= new Set();active.callbacks.add(z);cappedHeal(c,.0025);}}}});
    },
    d_burst(c) {
      for(const z of F().filter(z=>z.curseT>0&&D2(z,H())<200)){A.detonate('curse',z,c);puff(z,28,'#bd86da');A.hurt(z,c.d,H(),0,c.sid,{detonate:true});}
    },
    d_blood(c) {
      if(H().hp<H().maxHp*.3)return false;
      A.drain(H().hp*.03);
      A.fx({k:'slash',x:H().x,y:H().y-12*K,a:c.a,t:0,T:.35,r:180,half:PI/2,gold:false});
      hitAll(z=>inFan(z,H(),c.a,220,PI/2),c.d,{sid:c.sid,kb:8,on:()=>cappedHeal(c,.01)});
    },
    d_death(c) {
      const z=eliteTarget();if(!z)return;
      z.deathMarkT=3;z.vulnT=3;z.vulnN=Math.max(z.vulnN||0,4);puff(z,20,'#bd86da');
      if(z.T.boss)A.hurt(z,30*skillScale(c),H(),0,c.sid,{detonate:true});
      else if(z.tier&&z.hp<z.maxHp*.1)A.hurt(z,z.hp,H(),0,c.sid,{execute:true});
    },
    d_feast(c) {
      for(const z of F().filter(z=>z.curseT>0&&D2(z,H())<220)){
        bolt([{x:z.x,y:z.y-12*K},{x:H().x,y:H().y-15*K}],'#bd86da');
        if(A.hurt(z,c.d,H(),0,c.sid,{})!==false){cappedHeal(c,.003);if(c.L>=7)A.summon(z);}
      }
    },
    d_harvest(c) {
      const h=H();A.fx({k:'slash',x:h.x,y:h.y-12*K,a:c.a,t:0,T:.5,r:200,half:PI});
      for(const z of F().filter(z=>D2(z,h)<200)){
        const execute=!z.tier&&!z.T.boss&&z.hp<z.maxHp*.25;
        if(A.hurt(z,execute?z.hp:c.d,h,8,c.sid,{execute})!==false){cappedHeal(c,.003);if(z.dead)A.summon(z);}
      }
    },
    d_grave(c) {
      const p=dense(50,220)||H();
      for(let i=0;i<3;i++){const q=P(p.x,p.y,i*2*PI/3,36);actor({kind:'grave',sid:c.sid,x:q.x,y:q.y,T:3,every:.5,maxTicks:6,
        tick:o=>{puff(o,38,'rgba(170,110,215,.35)');for(const z of F())if(inCircle(z,o,38)&&!active.graveTargets?.has(z)){active.graveTargets ||= new Set();active.graveTargets.add(z);A.mark('curse',z,c);}}});}
    },
  });
  function summonSkeleton(p, opts={}) {
    const minions=actors.filter(o=>o.kind==='skeleton'&&!o.dead);
    if(minions.length>=(opts.limit||4))return false;
    actor({kind:'skeleton',sid:'_skeleton',x:p.x,y:p.y,T:2,every:.5,maxTicks:4,opts,
      update:(o,dt)=>{const z=nearOf(o,240);if(!z)return;const a=A.ang(o,z),distance=D2(o,z);if(distance>18){o.x+=Math.cos(a)*80*K*dt;o.y+=Math.sin(a)*80*K*dt/YS;A.clamp(o);}},
      tick:o=>{const z=nearOf(o,opts.ranged?220:28);if(!z)return;
        if(opts.ranged)shoot({x:o.x,y:o.y-12*K,a:A.ang(o,z),v:220,life:1,r:6,pierce:0,d:3,sid:'_skeleton',look:'shadow',o:{extra:true,dt:'magic'}});
        else A.hurt(z,3,o,0,'_skeleton',{extra:true,dt:'magic'});
        // 永夜巫妖是追加攻击不挂效果规则的唯一明确职业例外。
        if(opts.curse&&!o.cursed?.has(z)){o.cursed ||= new Set();o.cursed.add(z);A.mark('curse',z);}
      }});
    return true;
  }

  function poolTick(dt) {
    for(let i=actors.length-1;i>=0;i--){const o=actors[i];if(!o)continue;withCast(o.cast,()=>{o.t+=dt;o.ti-=dt;if(!o.dead&&o.update)o.update(o,dt);if(o.tick&&!o.dead)while(o.ti<=1e-7&&(!o.maxTicks||o.ticks<o.maxTicks)){o.ti+=o.every;o.ticks++;o.tick(o);}});if(o.dead||o.t>=o.T){actors.splice(i,1);if(o.end)withCast(o.cast,()=>o.end(o));}}
  }
  function interceptShot(p,dt) {
    if(p.k!=='arrow')return false;const q={x:p.x+p.vx*dt,y:(p.gy??p.y)+p.vy*dt};
    for(const o of actors)if(!o.dead&&(o.kind==='shield'||o.kind==='brick')&&inCircle(q,o,o.kind==='shield'?30:18)){
      if(o.kind==='shield')withCast(o.cast,()=>{const z=p.from;if(z&&!z.dead){bolt([{x:o.x,y:o.y},{x:z.x,y:z.y-12*K}],'#bfe8ff');A.hurt(z,p.dmg*2,o,0,o.sid,{extra:true,dt:p.dtype||'phys',hitGroup:'reflect',maxHits:99});}});
      else {o.hp--;if(o.hp<=0){o.dead=true;puff(o,16,'#c88c58');}}return true;
    }return false;
  }
  function drawPool(ctx,X,Y,u) {
    const rect=(x,y,w,h,col)=>{ctx.fillStyle=col;ctx.fillRect(Math.round(x),Math.round(y),Math.max(1,w*u),Math.max(1,h*u));};
    const tokenBoxes=new Set();for(const o of actors){if(o.dead)continue;const x=X(o.x),y=Y(o.y)-8*u;
      if(o.kind==='skeleton'){SPR.draw(ctx,'skeleton','walk'+(Math.floor(o.t*8)%4),0,x,Y(o.y),false,u,{});}
      else if(o.kind==='cross'){gunImage(ctx,'cross'+(Math.floor(o.t*10)%2),x,y,u);}
      else if(o.kind==='block'){gunImage(ctx,'blk'+o.frame,x,y,u);}
      else if(o.kind==='popgun'){gunImage(ctx,'popgun'+Math.min(2,Math.floor(o.t*12)),X(H().x)+Math.cos(o.a)*20*u,Y(H().y)-12*u+Math.sin(o.a)*20*u/YS,u,o.a);}
      else if(o.kind==='grave'){rect(x-7*u,y-13*u,14,18,'rgba(150,120,175,.35)');rect(x-5*u,y-15*u,10,3,'#b794cd');}
      else if(o.kind==='holy'){ctx.strokeStyle='rgba(255,225,140,.35)';ctx.lineWidth=u;ctx.beginPath();ctx.ellipse(x,Y(o.y),(o.r||25)*u,(o.r||25)*u/YS,0,0,2*PI);ctx.stroke();}
      else if(o.kind==='burger'){const b=o.eaten===5?1.5:1,fi=o.gulp>0?(o.gulp>.12?4:5):Math.floor(o.t*10)%4,I=BURGER[fi];ctx.save();ctx.translate(x,y);ctx.scale(b*(o.fl?-1:1),b);ctx.imageSmoothingEnabled=false;if(I.complete&&I.naturalWidth){const w=I.naturalWidth*u,hh=I.naturalHeight*u;ctx.drawImage(I,-w/2,6*u-hh,w,hh);}else{rect(-13*u,-13*u,26,7,'#bc7b38');rect(-14*u,-2*u,28,5,'#793e2e');}ctx.restore();}   /* 11/27 汉堡吞吞怪像素帧：4 帧咀嚼 + 2 帧吞下 */
      else if(o.kind==='tank'){gunImage(ctx,(Math.floor(o.t*2)%2?'tankfire':'tank')+(Math.floor(o.t*10)%2),x,y,u,o.a+PI/2);}
      else if(o.kind==='brick'){gunImage(ctx,'brick'+(o.hp<2?1:0),x,y,u);}
      else if(o.kind==='shield'){ctx.save();ctx.translate(x,y);ctx.rotate(o.a+PI/2);rect(-25*u,-3*u,50,7,'rgba(160,210,240,.35)');rect(-24*u,-3*u,48,1,'#c8e8f8');ctx.restore();}
      else if(o.kind==='bomb'){gunImage(ctx,'bomb'+(Math.floor(o.t*8)%2),x,y,u);}
      else if(o.kind==='marble'){gunImage(ctx,'marble',x,y,u,Math.atan2(o.vy,o.vx));}
      else if(o.kind==='ko'){for(const [i,n] of ['ko_k','ko_dot','ko_o','ko_dot'].entries())gunImage(ctx,n,x+(i-1.5)*18*u,y-20*u*(1-Math.min(1,o.t/.3)),u);}
      else if(o.kind==='claw'){gunImage(ctx,'claw'+Math.min(2,Math.floor(o.t*5)),x,y-12*u,u);}
      else if(o.kind==='poison'||o.kind==='plague'){ctx.strokeStyle='rgba(130,210,80,.35)';ctx.lineWidth=u;ctx.beginPath();ctx.ellipse(x,Y(o.y),(o.r||28)*u,(o.r||28)*u/YS,0,0,2*PI);ctx.stroke();for(let j=0;j<5;j++)rect(x+Math.cos(j*1.4+o.t)*20*u,Y(o.y)+Math.sin(j*1.4+o.t)*10*u,1,2,'rgba(130,210,80,.35)');}
    }
  }

  // ---------- 每帧 ----------
  function tick(dt) {
    poolTick(dt);
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
    drawPool(ctx,X,Y,u);
    for (const f of followers) if (f.snow) { const h = H(); ctx.strokeStyle = 'rgba(200,230,255,.35)'; ctx.lineWidth = u; ctx.beginPath(); ctx.ellipse(X(h.x), Y(h.y), f.snow * u, f.snow * u / YS, 0, 0, 7); ctx.stroke(); }
    const pix = (x, y, c, q = 1) => { ctx.fillStyle = c; ctx.fillRect(x, y, q * u, q * u); };
    for (const g of ghosts) { const a = Math.max(0, 1 - g.t / g.T) * .55; ctx.globalAlpha = a; SPR.drawHero(ctx, g.spun ? 'atk' : 'idle', g.spun ? 1 : 0, X(g.x), Y(g.y), g.f < 0, u, { w: 'sword', white: .8 }); ctx.globalAlpha = 1; }
    for (const s of swords) { const x = X(s.x), y = Y(s.y) - 14 * u, a = s.ph * 2, ca = Math.cos(a), sa = Math.sin(a);   // 11/22 飞剑画大：两倍长、金边
      ctx.fillStyle = 'rgba(255,216,106,.18)'; ctx.beginPath(); ctx.arc(x, y, 10 * u, 0, 7); ctx.fill();
      for (let j = -9; j <= 9; j++) { const px = x + Math.round(ca * j * u), py = y + Math.round(sa * j * u); if (j > 5) pix(px, py, j === 6 ? '#ffcf3a' : '#8a5a2a', 2 * u); else { pix(px - Math.round(sa * u), py + Math.round(ca * u), '#e8a020', 2 * u); pix(px, py, j < -7 ? '#ffffff' : '#e8ecf4', 2 * u); } } }
    for (const o of orbs) { const x = X(o.x), y = Y(o.y); ctx.fillStyle = 'rgba(120,60,200,.35)'; ctx.beginPath(); ctx.arc(x, y, 6 * u, 0, 7); ctx.fill(); pix(x - 2 * u, y - 2 * u, '#2a0a40', 4); pix(x - u, y - u, '#c8a0ff', 2); }
    for (const p of projs) { const x = X(p.x), y = Y(p.y), ca = Math.cos(p.a), sa = Math.sin(p.a) / YS, b = p.big || 1, career=p.cast?.career;if(p.sid&&career?.color&&!p.o?.extra){ctx.save();ctx.shadowColor=career.color;ctx.shadowBlur=7*u;}
      if(p.look==='gunmissile'||p.look==='gunshell'){gunImage(ctx,p.look==='gunshell'?'shell':'missile'+(Math.floor(p.t*10)%2),x,y,u,p.a+PI/2);}
      else if (p.look === 'crescent') { for (let j = -6 * b; j <= 6 * b; j++) { const off = (1 - (j / (6 * b)) ** 2) * 4 * b; pix(x + Math.round((-sa * j + ca * off) * u), y + Math.round((ca * j + sa * off) * u), Math.abs(j) < 2 * b ? '#ffffff' : '#bfe8ff'); } }
      else if (p.look === 'arrow' || p.look === 'bigarrow' || p.look === 'feather' || p.look === 'spear' || p.look === 'sword') { const n = p.look === 'bigarrow' ? 22 : p.look === 'spear' ? 16 : 9, q = p.look === 'bigarrow' ? 2 * b : 1, c1 = p.look === 'feather' ? '#9ff0c8' : p.look === 'bigarrow' ? '#fff6c0' : '#e8ecf4';
        for (let j = 0; j < n; j++) pix(x - Math.round(ca * j * 1.5 * u), y - Math.round(sa * j * 1.5 * u), j < 2 ? c1 : j > n - 3 ? '#e8e0c8' : p.look === 'bigarrow' ? '#ffe9a0' : '#8a5a2a', q); }
      else if (p.look === 'beam') { for (let j = 0; j < 14 * b; j++) pix(x - Math.round(ca * j * 1.5 * u), y - Math.round(sa * j * 1.5 * u), j < 3 ? '#ffffff' : '#fff2b0', 2 * b); }
      else if (p.look === 'drill' || p.look === 'tornado') { const r = p.r * u, rot = p.t * 18; ctx.fillStyle = p.look === 'drill' ? 'rgba(255,240,180,.18)' : 'rgba(220,240,255,.18)'; ctx.beginPath(); ctx.ellipse(x, y, r, r / YS, 0, 0, 7); ctx.fill();
        for (let k = 0; k < 24; k++) { const aa = rot + k * .52, rr = r * (k % 3 + 1) / 3; pix(x + Math.round(Math.cos(aa) * rr), y + Math.round(Math.sin(aa) * rr / YS) - (p.look === 'tornado' ? k * u : 0), p.look === 'drill' ? (k % 2 ? '#fff2b0' : '#e8b84a') : (k % 2 ? '#ffffff' : '#a8d8f0'), 2); } }
      else if (p.look === 'shadow' || p.look === 'ice') { const c = p.look === 'ice' ? ['#ffffff', '#8ad8ff'] : ['#e0c0ff', '#6a2aa0']; pix(x - u * b, y - u * b, c[1], 3 * b); pix(x, y, c[0], b); } if(p.sid&&career?.color&&!p.o?.extra)ctx.restore(); }
  }
  return {
    // 出手：返回 null = 没敌人；返回 channel 对象 = 占时型
    cast(c) { if (!F().length) return null; if(c.sid==='h_sword'&&later.some(o=>o.cast?.sid===c.sid))return null; if (c.S.poolV2) clearPoolSkill(c.sid); active = { hits: new Map(), effects: new Set(), thunderBonus: null, bonus: c.bonus || 0, career: c.career, sid: c.sid }; const token = active; const r = C[c.S.kind || c.sk.id](c); if(r===false){active=null;return false;} if (r && r.hold) { const channel = Object.assign({ ti: r.every, cast: token, scale: area(), elapsed: 0 }, r); if (['storm', 'dragon', 'blizzard', 'starfall', 'abyss','sworddomain','moonshower','balllightning','arcaneorb','gravitywell','mirrorbarrage'].includes(c.sk.id)) { if (r.snow || r.spin || c.sk.id === 'dragon') followers = followers.filter(f => !f.follow); channel.follow = !!(r.snow || r.spin || c.sk.id === 'dragon'); followers.push(channel); active = null; return true; } ch = channel; active = null; return ch; } if (c.S.sys === '剑' && c.sk.id !== 'phantom') for (const g of ghosts) if (g.mimic && g.spun && g.t < g.T) withCast(g.cast, () => ghostSpin(g)); active = null; return true; },
    chEnd() { if (ch && ch.end) withCast(ch.cast, ch.end); ch = null; }, ch: () => ch,
    extraShot(p) { const prev = active; active = null; try { return shoot({ ...p, o: { ...p.o, extra: true, jobExtra: true } }); } finally { active = prev; } },
    summon:summonSkeleton, interceptShot, has: id => !!C[id], tick, drawUnder, drawOver,
    reset() { projs = []; zones = []; swords = []; orbs = []; ghosts = []; later = []; marks = []; followers = []; actors = []; active = null; ch = null; },
  };
};


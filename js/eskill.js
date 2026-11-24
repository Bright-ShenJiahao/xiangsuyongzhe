// 11/24 精英招式（demo/boss.html 里试过的那套）：每种哥布林的精英版多一个招牌招式
// 规则：普通怪不放；精英每 6–8 秒放一次；同时最多 2 个精英在放招；放招前身上闪（抬手）。
// 单位：demo 里的数是「屏幕像素（U=2）」，这里乘 C = K/2 换成世界坐标
window.ESKILL = function (A) {
  const { K, YS } = A, C = K / 2, PI = Math.PI, R = (a, b) => a + Math.random() * (b - a);
  const MAP = { goblin: 'boom', gob_blade: 'hook', gob_kid: 'grab', gob_archer: 'fire', gob_shield: 'wall', gob_bomb: 'mine', gob_ghost: 'blink', gob_mage: 'curse', gob_drum: 'quake', gob_necro: 'bones', gob_troll: 'crack', gob_rock: 'roll', gob_thrower: 'rock5', gob_shaman: 'homing' };
  // 小头目 / 首领：两招轮流 / 四招 + 残血二阶段
  const BOSS = { gob_chief: ['fan', 'horn'], gob_paladin: ['holy', 'charge', 'shield'], gob_king: ['fan', 'rain', 'ring', 'charge'] }, BOSS2 = { gob_king: ['ring2', 'spiral', 'rain', 'charge', 'fan'] };
  const WARN = { fan: .55, horn: .6, holy: .8, shield: .4, charge: .8, rain: .8, ring: .55, ring2: .55, spiral: .6, boom: .5, hook: .45, grab: .6, fire: .8, wall: .6, mine: .5, blink: .4, curse: .6, quake: .6, bones: .7, crack: .8, roll: .8, rock5: .4, homing: .5 };
  let marks = [], ents = [], shots = [], st = { grab: 0, grabT: 0, pull: null, rev: 0 };
  const FXI = {}, fi = n => FXI[n] || (FXI[n] = Object.assign(new Image(), { src: 'art/fx/elite/' + n + '.png' }));
  const hero = () => A.hero(), dist = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * YS) / K, ang = (a, b) => Math.atan2((b.y - a.y) * YS, b.x - a.x);
  const hit = (x, y, r) => Math.hypot(hero().x - x, (hero().y - y) * YS) < r * C;
  const safe = () => { const h = hero(); return h.inv > 0 || h.roll > 0 || h.dead; };
  const dmg = (z, m) => (z.T.dmg || 6) * (z.dmgMul || 1) * m;
  function reset() { marks = []; ents = []; shots = []; st = { grab: 0, grabT: 0, pull: null, rev: 0 }; }
  function begin(z, k) { const h = hero(); z.eLock = 1; z.es = { k, t: 0, aim: ang(z, h) }; const w = WARN[k];
    if (k === 'hook' || k === 'crack' || k === 'roll') marks.push({ k: 'line', x: z.x, y: z.y, a: z.es.aim, len: (k === 'hook' ? 300 : 420) * C, t: 0, T: w, thin: k === 'hook' });
    if (k === 'grab') marks.push({ k: 'circle', x: h.x, y: h.y, r: 22, t: 0, T: w, nohit: 1 });
    if (k === 'fire') for (let i = 0; i < 6; i++) marks.push({ k: 'circle', x: h.x + R(-120, 120) * C, y: h.y + R(-80, 80) * C, r: 26, t: 0, T: w + i * .08, fire: 1, z });
    if (k === 'rock5') z.es.q = 5;
    if (k === 'charge') marks.push({ k: 'line', x: z.x, y: z.y, a: z.es.aim, len: 380 * C, t: 0, T: w });
    if (k === 'fan') marks.push({ k: 'fan', x: z.x, y: z.y, a: z.es.aim, t: 0, T: w });
    if (k === 'rain') { const n = z.ph2 ? 6 : 4; for (let i = 0; i < n; i++) marks.push({ k: 'circle', x: i ? h.x + R(-110, 110) * C : h.x, y: i ? h.y + R(-70, 70) * C : h.y, r: 30, t: 0, T: w + .1 * i, d: dmg(z, 1.2), rock: 1 }); }
    if (k === 'holy') for (let i = 0; i < 3; i++) marks.push({ k: 'circle', gold: 1, x: h.x + (i ? R(-80, 80) * C : 0), y: h.y + (i ? R(-50, 50) * C : 0), r: 34, t: 0, T: w + .15 * i, d: dmg(z, 1.1) });
    if (k === 'ring' || k === 'ring2' || k === 'spiral' || k === 'horn' || k === 'shield') marks.push({ k: 'glow', x: z.x, y: z.y, t: 0, T: w, c: k === 'horn' ? '255,120,60' : k === 'shield' ? '255,230,120' : '200,120,255' }); }
  function fire(z) { const k = z.es.k, h = hero(), a = z.es.aim;
    if (k === 'boom') ents.push({ k: 'boom', x: z.x, y: z.y - 20 * C, a, t: 0, o: z, hit: {}, d: dmg(z, 1.1) });
    if (k === 'hook') ents.push({ k: 'hook', x: z.x, y: z.y - 20 * C, a, t: 0, o: z, d: dmg(z, .6) });
    if (k === 'grab') { if (hit(h.x, h.y, 30) && !safe()) { z.x = h.x - 10 * C; z.y = h.y; st.grab = z; st.grabT = 0; A.say('被抱住了！翻滚甩开'); } }
    if (k === 'wall') { const nx = -Math.sin(a), ny = Math.cos(a); for (let i = -1; i <= 1; i++) ents.push({ k: 'wall', x: z.x + nx * i * 34 * C, y: z.y + ny * i * 34 * C / YS, vx: Math.cos(a) * 70 * C, vy: Math.sin(a) * 70 * C / YS, t: 0, d: dmg(z, .7) }); }
    if (k === 'mine') for (let i = 0; i < 3; i++) ents.push({ k: 'mine', x: h.x + R(-90, 90) * C, y: h.y + R(-60, 60) * C, t: 0, d: dmg(z, 1.6) });
    if (k === 'blink') { z.es.gone = 1; z.hideT = 1; }
    if (k === 'curse') { const r = Math.random(), n = r < .5 ? 1 : r < .8 ? 2 : 3; for (let i = 0; i < n; i++) shots.push({ k: 'curse', x: z.x, y: z.y - 20 * C, a: a + (i - (n - 1) / 2) * .35, v: 100 * C, t: 0, r: 9, d: dmg(z, .3) }); }
    if (k === 'homing') for (let i = -1; i <= 1; i++) shots.push({ k: 'wisp', x: z.x, y: z.y - 20 * C, a: a + i * .6, v: 80 * C, t: 0, r: 8, d: dmg(z, 1), home: 1, life: 3.2 });
    if (k === 'quake') ents.push({ k: 'quake', x: z.x, y: z.y, t: 0, r: 20 * C, d: dmg(z, 1.2) });
    if (k === 'bones') for (let i = 0; i < 8; i++) { const b = A.spawn('skeleton', { x: h.x + Math.cos(i * PI / 4) * 110 * C, y: h.y + Math.sin(i * PI / 4) * 80 * C }); if (b) A.clamp(b); }
    if (k === 'crack') ents.push({ k: 'crack', x: z.x, y: z.y, a, t: 0, len: 0, d: dmg(z, 1.3) });
    if (k === 'fan') for (let i = -2; i <= 2; i++) shots.push({ k: 'axe', x: z.x, y: z.y - 20 * C, a: a + i * PI / 15, v: 130 * C, t: 0, r: 8, d: dmg(z, 1) });
    if (k === 'ring' || k === 'ring2') { const n = k === 'ring2' ? 2 : 1; for (let w = 0; w < n; w++) ents.push({ k: 'delay', t: -w * .45, fn: () => { if (z.dead) return; const gap = R(0, 16) | 0, off = w * PI / 16; for (let i = 0; i < 16; i++) if (Math.abs(i - gap) > 1) shots.push({ k: 'orb', x: z.x, y: z.y - 20 * C, a: i * PI / 8 + off, v: 100 * C, t: 0, r: 7, d: dmg(z, .8) }); } }); }
    if (k === 'spiral') { z.es.spin = 3; z.es.sa = R(0, 6); }
    if (k === 'horn') { z.hornT = 5; for (const q of A.foes()) if (!q.dead && dist(q, z) < 200) q.hornT = 5; A.say('酋长吹号！哥布林狂暴了'); }
    if (k === 'shield') { const L = A.foes().filter(q => !q.dead && q !== z && (q.tier === 'mini' || q.T.boss)), o = L[0] || z; o.eShield = Math.round(o.maxHp * .15); A.num(o, '护盾', '#ffe08a'); }
    if (k === 'charge') z.es.dash = { a, t: 0, hd: 0 };
    if (k === 'roll') ents.push({ k: 'roll', x: z.x, y: z.y, vx: Math.cos(a) * 300 * C, vy: Math.sin(a) * 300 * C / YS, t: 0, cd: 0, d: dmg(z, 1.2), o: z });
  }
  function tick(dt, foes) { const h = hero();
    // 谁来放招
    const busy = foes.filter(z => z.es && !z.dead && z.tier === 'elite').length;
    for (const q of foes) if (q.hornT > 0) q.hornT -= dt;
    for (const z of foes) { const big = !z.dead && (z.tier === 'mini' || z.T.boss) && BOSS[z.type];
      if (big) { if (z.T.boss && !z.ph2 && z.hp < z.maxHp / 2) { z.ph2 = 1; A.say('哥布林王进入第二阶段！'); }
        if (!z.es) { if (z.ecd == null) z.ecd = R(1.5, 2.5); z.ecd -= dt * (z.hornT > 0 ? 1.6 : 1); if (z.ecd <= 0 && !z.cc && dist(z, h) < 320) { const L = z.ph2 && BOSS2[z.type] ? BOSS2[z.type] : BOSS[z.type]; z.ecd = (z.T.boss ? R(2.5, 3.5) : R(4, 5)) * (z.ph2 ? .7 : 1); begin(z, L[Math.random() * L.length | 0]); } continue; } }
      if (big) { const E = z.es; E.t += dt; z.f = h.x < z.x ? -1 : 1; z.moving = false; z.st = E.fired ? 'run' : 'wind';
        if (!E.fired && E.t >= WARN[E.k]) { E.fired = 1; E.ft = E.t; fire(z); }
        if (E.dash) { const D = E.dash; D.t += dt; z.x += Math.cos(D.a) * 420 * C * dt; z.y += Math.sin(D.a) * 420 * C * dt / YS; const o = { x: z.x, y: z.y }; A.clamp(o); const wall = o.x !== z.x || o.y !== z.y; z.x = o.x; z.y = o.y; z.moving = true; if (!D.hd && dist(z, h) < 20) { D.hd = 1; A.hurt(dmg(z, 1.5), z); } if (D.t > .9 || wall) E.dash = null; }
        if (E.spin > 0) { E.spin -= dt; E.sa += dt * 2.6; E.sc = (E.sc || 0) - dt; if (E.sc <= 0) { E.sc = .12; for (let i = 0; i < 3; i++) shots.push({ k: 'orb', x: z.x, y: z.y - 20 * C, a: E.sa + i * PI * 2 / 3, v: 85 * C, t: 0, r: 7, d: dmg(z, .6) }); } }
        if (E.fired && !E.dash && !(E.spin > 0) && E.t - E.ft > .6) { z.es = null; z.eLock = 0; z.st = 'run'; z.t = 0; } continue; }
      if (z.dead || z.tier !== 'elite' || z.cc || z.flee) { if (z.es && (z.dead || z.cc)) { z.es = null; z.eLock = 0; z.hideT = 0; } continue; }
      const k = MAP[z.type]; if (!k) continue; if (z.ecd == null) z.ecd = R(2, 4);
      if (!z.es) { z.ecd -= dt; if (z.ecd <= 0 && busy < 2 && dist(z, h) < 260) { z.ecd = R(6, 8); begin(z, k); } continue; }
      const E = z.es; E.t += dt; z.f = h.x < z.x ? -1 : 1; z.moving = false; z.st = E.fired ? 'run' : 'wind';
      if (!E.fired && E.t >= WARN[E.k]) { E.fired = 1; E.ft = E.t; fire(z); }
      if (E.k === 'rock5' && E.fired) { E.sc = (E.sc || 0) - dt; if (E.sc <= 0 && E.q > 0) { E.sc = .35; E.q--; marks.push({ k: 'circle', x: h.x + (h.mvx || 0) * 48 * C, y: h.y + (h.mvy || 0) * 36 * C, r: 24, t: 0, T: .8, d: dmg(z, 1), rock: 1 }); } }
      if (E.gone && E.t - E.ft > 1 && !E.back) { E.back = 1; z.hideT = 0; const a = Math.atan2(h.mvy || 0, h.mvx || 1); z.x = h.x - Math.cos(a) * 34 * C; z.y = h.y - Math.sin(a) * 24 * C; A.clamp(z); E.stab = E.t; }
      if (E.stab && E.t - E.stab > .45 && !E.stabbed) { E.stabbed = 1; if (dist(z, h) < 24) A.hurt(dmg(z, 1.2), z); A.slash(z); }
      const hold = E.k === 'rock5' ? 2.2 : E.k === 'blink' ? 2 : E.k === 'grab' ? (st.grab === z ? 99 : .5) : .5;
      if (E.fired && E.t - E.ft > hold) { z.es = null; z.eLock = 0; z.st = 'run'; z.t = 0; } }
    // 被抱住 / 被钩 / 混乱
    if (st.grab) { const z = st.grab; if (z.dead || h.roll > 0) { if (!z.dead) A.say('甩开了！'); if (z.es) { z.es = null; z.eLock = 0; } st.grab = 0; } else { z.x = h.x - 12 * C * h.f; z.y = h.y + 1; st.grabT += dt; if (st.grabT > 1.2) { st.grabT = 0; A.hurt(dmg(z, .5), z, 1); } } }
    if (st.pull) { const o = st.pull, a = Math.atan2(o.y - h.y, o.x - h.x); h.x += Math.cos(a) * 520 * C * dt; h.y += Math.sin(a) * 520 * C * dt; A.clamp(h); if (Math.hypot(o.x - h.x, o.y - h.y) < 30 * C || o.dead) st.pull = null; }
    if (st.rev > 0) { st.rev -= dt; st.dot = (st.dot || 0) - dt; if (st.dot <= 0) { st.dot = .5; if (h.hp > 1) { h.hp = Math.max(1, h.hp - 1); A.num(h, '-1', '#c87aff'); } } }
    // 地面预警
    for (const m of marks) { m.t += dt; if (m.k === 'circle' && m.t >= m.T && !m.done) { m.done = 1;
        if (m.fire) ents.push({ k: 'firez', x: m.x, y: m.y, r: m.r, t: 0, cd: 0, d: dmg(m.z, .4) });
        else if (!m.nohit) { A.boom(m.x, m.y, m.r); if (hit(m.x, m.y, m.r + 6)) A.hurt(m.d || 8); } } }
    marks = marks.filter(m => m.k === 'circle' ? !m.done : m.t < m.T);
    // 场上的东西
    for (const e of ents) { e.t += dt;
      if (e.k === 'boom') { const out = e.t < .9, sp = 300 * C * (out ? 1 - e.t / 1.1 : 1); if (out) { e.x += Math.cos(e.a) * sp * dt; e.y += Math.sin(e.a) * sp * dt / YS; } else { const a = Math.atan2(e.o.y - 20 * C - e.y, e.o.x - e.x); e.x += Math.cos(a) * 320 * C * dt; e.y += Math.sin(a) * 320 * C * dt; if (Math.hypot(e.o.x - e.x, e.o.y - 20 * C - e.y) < 16 * C || e.o.dead || e.t > 3) e.dead = 1; }
        const ph = out ? 'o' : 'b'; if (!e.hit[ph] && hit(e.x, e.y + 16 * C, 18)) { e.hit[ph] = 1; A.hurt(e.d, e.o); } }
      if (e.k === 'hook') { const r = e.t * 600 * C; e.x = e.o.x + Math.cos(e.a) * r; e.y = e.o.y - 20 * C + Math.sin(e.a) * r / YS; if (r > 300 * C || e.o.dead) e.dead = 1; else if (hit(e.x, e.y + 16 * C, 20)) { e.dead = 1; if (!safe()) { st.pull = e.o; A.hurt(e.d, e.o); A.say('被钩住了！'); } } }
      if (e.k === 'wall') { e.x += e.vx * dt; e.y += e.vy * dt; if (hit(e.x, e.y, 26)) { const a = Math.atan2(h.y - e.y, h.x - e.x); h.x += Math.cos(a) * 160 * C * dt + e.vx * dt; h.y += Math.sin(a) * 160 * C * dt + e.vy * dt; A.clamp(h); if (!e.hd) { e.hd = 1; A.hurt(e.d); } } if (e.t > 4) e.dead = 1; }
      if (e.k === 'mine') { if (e.t > 3 && hit(e.x, e.y, 20)) { e.dead = 1; A.boom(e.x, e.y, 40); A.hurt(e.d); } if (e.t > 25) e.dead = 1; }
      if (e.k === 'quake') { e.r += 150 * C * dt; const d = Math.hypot(h.x - e.x, (h.y - e.y) * YS); if (!e.hd && Math.abs(d - e.r) < 12 * C) { e.hd = 1; A.hurt(e.d); } if (e.r > 600 * C) e.dead = 1; }
      if (e.k === 'crack') { e.len = Math.min(460 * C, e.t * 420 * C); const px = e.x + Math.cos(e.a) * e.len, py = e.y + Math.sin(e.a) * e.len / YS; if (!e.hd && hit(px, py, 26)) { e.hd = 1; A.hurt(e.d); } if (e.t > 2.4) e.dead = 1; }
      if (e.k === 'roll') { e.x += e.vx * dt; e.y += e.vy * dt; const o = { x: e.x, y: e.y }; A.clamp(o); if (o.x !== e.x) e.vx *= -1; if (o.y !== e.y) e.vy *= -1; e.x = o.x; e.y = o.y; e.cd -= dt; if (e.cd <= 0 && hit(e.x, e.y, 26)) { e.cd = .8; A.hurt(e.d); } if (e.t > 3.5) e.dead = 1; }
      if (e.k === 'delay' && e.t >= 0) { e.dead = 1; e.fn(); }
      if (e.k === 'firez') { e.cd -= dt; if (e.cd <= 0 && hit(e.x, e.y, e.r)) { e.cd = .5; A.hurt(e.d); } if (e.t > 4) e.dead = 1; } }
    ents = ents.filter(e => !e.dead);
    for (const s of shots) { s.t += dt; if (s.home && s.t < 3) { const a = Math.atan2((h.y - 16 * C - s.y) * YS, h.x - s.x), da = ((a - s.a + PI * 3) % (PI * 2)) - PI; s.a += Math.max(-1.4 * dt, Math.min(1.4 * dt, da)); }
      s.x += Math.cos(s.a) * s.v * dt; s.y += Math.sin(s.a) * s.v * dt / YS;
      if (hit(s.x, s.y + 16 * C, s.r + 6)) { s.dead = 1; const ok = !safe(); A.hurt(s.d); if (s.k === 'curse' && ok) { st.rev = 2; st.dot = .5; A.say('方向颠倒！'); } }
      if (s.t > (s.life || 5)) s.dead = 1; }
    shots = shots.filter(s => !s.dead);
  }
  function spr(ctx, n, x, y, u, rot, k = 1, bottom) { const im = fi(n); if (!im.complete || !im.naturalWidth) return false; const w = im.naturalWidth * u * k, hh = im.naturalHeight * u * k; ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (rot) ctx.rotate(rot); ctx.imageSmoothingEnabled = false; ctx.drawImage(im, -w / 2, bottom ? -hh : -hh / 2, w, hh); ctx.restore(); return true; }
  function drawUnder(ctx, X, Y, u, t) { const s = u / 2, f2 = Math.floor(t * 6) % 2;
    for (const m of marks) { const k = Math.min(1, m.t / m.T), x = X(m.x), y = Y(m.y);
      if (m.k === 'circle') { const rr = m.r * s; const col = m.gold ? '255,210,80' : '255,60,40'; ctx.fillStyle = `rgba(${col},${.15 + .3 * k})`; ctx.beginPath(); ctx.ellipse(x, y, rr, rr / YS, 0, 0, 7); ctx.fill(); ctx.strokeStyle = `rgb(${col})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, rr * k, rr * k / YS, 0, 0, 7); ctx.stroke(); if (m.rock && k > .55) spr(ctx, 'stone', x, y - (1 - k) * 260 * s, u, k * 8, 1.3); }
      if (m.k === 'fan') { ctx.fillStyle = `rgba(255,60,40,${.15 + .25 * k})`; ctx.beginPath(); ctx.moveTo(x, y); for (let q = -PI / 6; q <= PI / 6 + .01; q += .05) ctx.lineTo(X(m.x + Math.cos(m.a + q) * 260 * C), Y(m.y + Math.sin(m.a + q) * 260 * C / YS)); ctx.fill(); }
      if (m.k === 'glow') { ctx.fillStyle = `rgba(${m.c},${.4 * k})`; ctx.beginPath(); ctx.ellipse(x, y - 20 * s, 50 * k * s, 50 * k * s, 0, 0, 7); ctx.fill(); }
      if (m.k === 'line') { ctx.strokeStyle = `rgba(255,60,40,${.25 + .45 * k})`; ctx.lineWidth = (m.thin ? 10 : 34) * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(X(m.x + Math.cos(m.a) * m.len), Y(m.y + Math.sin(m.a) * m.len / YS)); ctx.stroke(); } }
    for (const e of ents) { const x = X(e.x), y = Y(e.y);
      if (e.k === 'firez') spr(ctx, 'fire' + (Math.floor(t * 8 + e.x) % 3), x, y + 6 * s, u, 0, 1.6, 1);
      if (e.k === 'mine') spr(ctx, 'mine' + (e.t > 3 && f2 ? 1 : 0), x, y + 4 * s, u, 0, 1, 1);
      if (e.k === 'crack') { ctx.strokeStyle = '#2a160e'; ctx.lineWidth = 6 * s; ctx.beginPath(); ctx.moveTo(x, y); for (let d = 0; d < e.len; d += 20 * C) ctx.lineTo(X(e.x + Math.cos(e.a) * d) + Math.sin(d * 7) * 5 * s, Y(e.y + Math.sin(e.a) * d / YS) + Math.cos(d * 5) * 3 * s); ctx.stroke(); }
      if (e.k === 'quake') { ctx.strokeStyle = 'rgba(255,170,60,.85)'; ctx.lineWidth = 6 * s; ctx.beginPath(); ctx.ellipse(x, y, (X(e.x + e.r) - x), (X(e.x + e.r) - x) / YS, 0, 0, 7); ctx.stroke(); } } }
  function drawOver(ctx, X, Y, u, t) { const s = u / 2, f2 = Math.floor(t * 6) % 2, h = hero();
    for (const e of ents) { const x = X(e.x), y = Y(e.y);
      if (e.k === 'wall') spr(ctx, 'shield', x, y, u, 0, 1, 1);
      if (e.k === 'boom') spr(ctx, 'boomer', x, y, u, e.t * 16);
      if (e.k === 'roll') spr(ctx, 'ball' + (Math.floor(e.t * 8) % 2), x, y, u, 0, 1.4, 1);
      if (e.k === 'hook') { ctx.strokeStyle = '#c9a15a'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(X(e.o.x), Y(e.o.y - 20 * C)); ctx.lineTo(x, y); ctx.stroke(); spr(ctx, 'hook', x, y, u, e.a + PI / 2, .8); } }
    for (const b of shots) spr(ctx, b.k === 'curse' ? 'curse' + f2 : b.k === 'axe' ? 'axe' : b.k === 'orb' ? 'orb' + f2 : 'wisp' + f2, X(b.x), Y(b.y), u, b.k === 'curse' ? b.t * 4 : b.k === 'axe' ? b.t * 14 : b.k === 'orb' ? 0 : b.a + PI * .75);
    if (st.rev > 0) { spr(ctx, 'dizzy', X(h.x), Y(h.y) - 62 * s, u, Math.sin(t * 4) * .3, .8); }
    if (st.grab) { ctx.fillStyle = '#ffb84a'; ctx.font = `${12 * s}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('被抱住（翻滚甩开）', X(h.x), Y(h.y) + 16 * s); } }
  return { tick, drawUnder, drawOver, reset, rev: () => st.rev > 0, slow: () => st.grab ? .35 : 1, pulled: () => !!st.pull };
};

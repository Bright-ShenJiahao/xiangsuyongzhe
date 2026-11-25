// 11/25 森林深处（第 4–6 站）机关：二维可走区域、深坑 + 阵风、骸骨遮挡、符文石板、孢子蘑菇、捕兽夹、荆棘支路 + 宝箱
// 所有坐标在 data.js 里用「原图像素」(1672×941) 写，这里乘 q 变成世界坐标
function MECHF(A) {
  let Z = null, q = 1, SH = [], TR = [], RU = null, CH = null, opened = false, wt = 0, st = 4;
  const IM = {}, im = n => IM[n] || (IM[n] = Object.assign(new Image(), { src: 'art/map/deep_obj/' + n + '.png?v=1' })), ok = i => i.complete && i.naturalWidth;
  const BONEI = Object.assign(new Image(), { src: 'art/map/deep_obj/bone.png?v=1' });
  const R = (a, b) => a + Math.random() * (b - a);
  function inPoly(x, y, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
  const inPit = (mx, my, k = 1) => ((mx - Z.pit.x) / (Z.pit.rx * k)) ** 2 + ((my - Z.pit.y) / (Z.pit.ry * k)) ** 2 < 1;
  const walkM = (mx, my, isHero) => (inPoly(mx, my, Z.main) || (opened && (inPoly(mx, my, Z.log) || inPoly(mx, my, Z.ledge)))) && !inPoly(mx, my, Z.bone) && (isHero || !inPit(mx, my, 1.15));
  const phase = () => { const t = wt % 8; return t < 5 ? 0 : t < 6 ? 1 : t < 8 ? 2 : 0; };
  const BC = {};
  function bounds(y) {   // 这一行能走的最左 / 最右（世界坐标），给放道具、门、刷怪用
    const my = Math.round(y / q); if (BC[my]) return BC[my]; let l = null, r = null;
    for (let mx = 0; mx < 1672; mx += 6) if (inPoly(mx, my, Z.main)) { if (l == null) l = mx; r = mx; }
    return BC[my] = l == null ? [Z.start[0] * q, Z.start[0] * q] : [l * q, r * q];
  }
  function snap(x, y, isHero) {   // 最近的能走的点
    if (walkM(x / q, y / q, isHero)) return [x, y];
    for (let r = 6; r < 700; r += 6) for (let a = 0; a < 6.28; a += .35) { const px = x + Math.cos(a) * r * q, py = y + Math.sin(a) * r * q * .75; if (walkM(px / q, py / q, isHero)) return [px, py]; }
    return [Z.start[0] * q, Z.start[1] * q];
  }
  function randPt(minD, avoid) { for (let k = 0; k < 200; k++) { const mx = R(260, 1300), my = R(170, 670); if (!inPoly(mx, my, Z.main) || inPoly(mx, my, Z.bone) || inPit(mx, my, 2.2)) continue;
      if (avoid.some(([ax, ay]) => Math.hypot(ax - mx, (ay - my) * 1.4) < minD)) continue; return [mx, my]; } return [700, 400]; }
  function setMap(zone, qq, stn) {
    Z = zone; q = qq; st = stn; opened = false; wt = 0; for (const k in BC) delete BC[k];
    const ns = st >= 6 ? 3 : 2, nt = st >= 5 ? 3 : 2, used = [[Z.rune.x, Z.rune.y], Z.start, [Z.pit.x, Z.pit.y], [1338, 262]];
    SH = []; TR = [];
    for (let i = 0; i < ns; i++) { const p = randPt(160, used); used.push(p); SH.push({ x: p[0], y: p[1], cd: 0, cloud: 0 }); }
    for (let i = 0; i < nt; i++) { const p = randPt(130, used); used.push(p); TR.push({ x: p[0], y: p[1], shut: 0 }); }
    RU = { x: Z.rune.x, y: Z.rune.y, w: Z.rune.w, h: Z.rune.h, ready: 1, cd: 0, charge: 0 }; CH = { x: Z.chest.x, y: Z.chest.y, open: false };
  }
  const M = a => a * q;
  function ring(x, y, r) { A.fx().push({ k: 'ring', x, y, t: 0, T: .35, r: r / A.K }); }
  function tick(dt) {
    if (!Z) return; const hero = A.hero(), foes = A.foes(), G = A.G(); wt += dt; if (G.paused) return;
    opened = !!(G.cleared || G.fe);
    const hx = hero.x / q, hy = hero.y / q, wp = phase(), live = foes.filter(z => !z.dead && !z.flee);
    // 阵风：坑口卷叶提示后吸，吸力离坑越近越强；精英 / 首领无效
    const imm = z => z.T.boss || z.tier;
    if (wp === 2) { const pull = (o, v) => { const dx = Z.pit.x - o.x / q, dy = Z.pit.y - o.y / q, d = Math.hypot(dx, dy * 1.6); if (d < 150 && d > 1) { const f = 210 * (1 - d / 150) ** 1.5 * dt * q; o.x += dx / d * f; o.y += dy / d * f * .75; } };
      if (!hero.dead && hero.roll <= 0) { const ox = hero.x, oy = hero.y; pull(hero); if (!walkM(hero.x / q, hero.y / q, true)) { hero.x = ox; hero.y = oy; } }
      for (const z of live) if (!imm(z)) pull(z); }
    // 英雄掉坑：扣 1/3 血，被送回坑边的安全位置，1.5 秒无敌
    if (!hero.dead && hero.inv <= 0 && hero.roll <= 0 && inPit(hx, hy, .9)) {
      hero.hp = Math.max(1, hero.hp - Math.ceil(hero.maxHp / 3)); hero.inv = 1.5; G.shake = Math.max(G.shake, .5);
      let best = null; for (let r = 6; r < 600 && !best; r += 6) for (let a = 0; a < 6.28; a += .3) { const px = Z.pit.x + Math.cos(a) * r, py = Z.pit.y + Math.sin(a) * r * .6; if (walkM(px, py, true) && !inPit(px, py, 1.9)) { best = [px, py]; break; } }
      if (best) { hero.x = best[0] * q; hero.y = best[1] * q; } A.num(hero, '掉进深坑！', '#ff8a6a'); }
    for (const z of live) if (!imm(z) && inPit(z.x / q, z.y / q, .85)) { A.num(z, '坠落', '#bcd'); A.kill(z); }
    // 蘑菇
    for (const m of SH) { if (m.cd > 0) { m.cd -= dt; m.cloud -= dt; continue; }
      if ([hero, ...live].some(o => Math.hypot(o.x / q - m.x, (o.y / q - m.y) * 1.4) < 30)) { m.cd = 20; m.cloud = 3; } }
    for (const m of SH) if (m.cloud > 0) {
      if (Math.random() < .5) A.parts().push({ x: (m.x + R(-60, 60)) * q, y: (m.y + R(-25, 25)) * q, vx: R(-6, 6) * q, vy: R(-14, -28) * q, t: 0, T: R(1, 2), col: '#d8ff8a', g: 0 });
      if (!hero.dead && Math.hypot(hx - m.x, (hy - m.y) * 1.5) < 95) { hero.hp = Math.max(1, hero.hp - hero.maxHp * .04 * dt); }
      for (const z of live) if (Math.hypot(z.x / q - m.x, (z.y / q - m.y) * 1.5) < 95) A.dot(z, z.maxHp * (imm(z) ? .01 : .08) * dt); }
    // 捕兽夹
    for (const t of TR) { if (t.shut > 0) { t.shut -= dt; continue; }
      if (!hero.dead && hero.roll <= 0 && Math.hypot(hx - t.x, (hy - t.y) * 1.5) < 20) { t.shut = 8; hero.rootT = 1; hero.hp = Math.max(1, hero.hp - Math.ceil(hero.maxHp * .05)); A.num(hero, '被夹住！', '#ffcf6a'); continue; }
      for (const z of live) if (Math.hypot(z.x / q - t.x, (z.y / q - t.y) * 1.5) < 20) { t.shut = 8; A.stun(z, 3); A.dot(z, z.maxHp * .1); break; } }
    if (hero.rootT > 0) hero.rootT -= dt;
    // 符文石板：站上去 1 秒，放冲击波把怪震开（击退到坑里 / 崖外就掉下去）
    if (RU.cd > 0) { RU.cd -= dt; if (RU.cd <= 0) RU.ready = 1; }
    const onR = Math.abs(hx - RU.x) < RU.w && Math.abs(hy - RU.y) < RU.h && !hero.dead;
    if (RU.ready && onR) { RU.charge += dt; if (RU.charge >= 1) { RU.ready = 0; RU.cd = 30; RU.charge = 0; shock(RU.x * q, RU.y * q, 230 * q, 26); } } else RU.charge = 0;
    // 宝箱
    if (opened && !CH.open && Math.hypot(hx - CH.x, hy - CH.y) < 50) { CH.open = true; A.chest(CH.x * q, CH.y * q); }
    const G2 = A.G(); if (G2.shake > 0 && 0) G2.shake = 0;
  }
  function shock(x, y, r, pw) {
    ring(x, y, r); ring(x, y, r * .7); A.G().shake = Math.max(A.G().shake, .5);
    for (let i = 0; i < 26; i++) { const a = R(0, 6.28), v = R(60, 160) * q; A.parts().push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .5 - 40 * q, t: 0, T: R(.5, .9), col: i % 2 ? '#8a7a66' : '#8fc4ff', g: 260 * q }); }
    for (const z of A.foes()) { if (z.dead || z.flee) continue; const dx = z.x - x, dy = z.y - y, d = Math.hypot(dx, dy) || 1; if (d < r && !z.T.boss && z.tier !== 'mini') { const p = pw * (z.tier ? .35 : 1) * (1 - d / r * .4); z.kbx = dx / d * p; z.kby = dy / d * p * .75; z.kbT = .2; } }
  }
  // ---- 画 ----
  function drawUnder(ctx, X, Y, s, T) {
    if (!Z) return; const u = s * q, wp = phase(), hero = A.hero();
    const img = (n, x, y, sc) => { const I = im(n); if (ok(I)) ctx.drawImage(I, X(x * q) - I.width * sc * u / 2, Y(y * q) - I.height * sc * u, I.width * sc * u, I.height * sc * u); };
    // 符文
    const rg = RU.ready ? .3 + .2 * Math.sin(T * 4) + RU.charge * .4 : 0; if (rg > 0) { ctx.fillStyle = `rgba(90,160,255,${rg})`; ctx.beginPath(); ctx.ellipse(X(RU.x * q), Y(RU.y * q), 70 * u, 30 * u, 0, 0, 7); ctx.fill(); }
    if (!RU.ready || RU.charge > 0) { ctx.strokeStyle = RU.charge > 0 ? '#fff' : 'rgba(120,170,255,.8)'; ctx.lineWidth = Math.max(2, 3 * u); ctx.beginPath(); ctx.ellipse(X(RU.x * q), Y(RU.y * q), 60 * u, 26 * u, 0, -1.57, -1.57 + 6.28 * (RU.charge > 0 ? RU.charge : 1 - RU.cd / 30)); ctx.stroke(); }
    for (const t of TR) { img(t.shut > 0 ? 'trap_shut' : 'trap', t.x, t.y + 10, .22);
      if (t.shut <= 0 && Math.hypot(hero.x / q - t.x, hero.y / q - t.y) < 110) { ctx.fillStyle = '#ffd23a'; ctx.font = `bold ${Math.round(22 * u)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('!', X(t.x * q), Y((t.y - 30) * q) + Math.sin(T * 8) * 3 * u); } }
    for (const m of SH) { img(m.cd > 0 ? 'shroom_dead' : 'shroom', m.x, m.y + 8, .33);
      if (m.cd > 0) { const k = 1 - m.cd / 20; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(X(m.x * q) - 12 * u, Y((m.y + 12) * q), 24 * u, 3 * u); ctx.fillStyle = '#9fe870'; ctx.fillRect(X(m.x * q) - 12 * u, Y((m.y + 12) * q), 24 * u * k, 3 * u); }
      if (m.cloud > 0) { const a0 = Math.min(1, m.cloud); for (let i = 0; i < 9; i++) { const qq = T * .5 + i * .7, r = (28 + (i % 3) * 14 + Math.sin(T * 2 + i) * 6) * u, px = X((m.x + Math.cos(qq) * (30 + i * 5)) * q), py = Y((m.y - 6 + Math.sin(qq * 1.3) * 16 - Math.sin(T + i) * 6) * q);
          const gr = ctx.createRadialGradient(px, py, 2, px, py, r); gr.addColorStop(0, `rgba(150,230,150,${.3 * a0})`); gr.addColorStop(1, 'rgba(110,200,140,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(px, py, r, r * .55, 0, 0, 7); ctx.fill(); } } }
    img(opened ? 'thorn_dead' : 'thorn', 1338, 262, .5); img(CH.open ? 'chest_open' : 'chest', CH.x, CH.y + 14, .34);
    if (opened && !CH.open) { ctx.fillStyle = '#ffd23a'; ctx.font = `bold ${Math.round(26 * u)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('!', X(CH.x * q), Y((CH.y - 50) * q) + Math.sin(T * 6) * 4 * u); }
    // 坑口：卷叶打旋 / 螺旋吸入线；离坑近时坑沿泛红
    const P = Z.pit; if (wp) { ctx.save(); ctx.translate(X(P.x * q), Y(P.y * q)); for (let i = 0; i < 26; i++) { const a = i / 26 * 6.28 + T * (wp === 2 ? 4 : 2), r = (wp === 2 ? 150 : 120) * (1 - ((T * (wp === 2 ? 1.6 : .6) + i * .13) % 1)) * u;
        ctx.fillStyle = i % 3 ? 'rgba(170,200,120,.85)' : 'rgba(220,230,255,.6)'; ctx.fillRect(Math.cos(a) * r - 3 * u, Math.sin(a) * r * .55 - 2 * u, 6 * u, 3 * u); }
      ctx.lineWidth = Math.max(1, 1.5 * u); for (let k = 0; k < 5; k++) { ctx.strokeStyle = `rgba(210,230,255,${wp === 2 ? .4 : .2})`; ctx.beginPath(); for (let v = 0; v <= 1; v += .05) { const a = k * 1.26 + v * 5 + T * (wp === 2 ? 5 : 2), r = 150 * (1 - v) * u; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * .55); } ctx.stroke(); } ctx.restore(); }
    const nr = Math.hypot(hero.x / q - P.x, (hero.y / q - P.y) * 1.6); if (nr < 160) { ctx.strokeStyle = `rgba(255,70,50,${.5 * (1 - nr / 160)})`; ctx.lineWidth = Math.max(2, 3 * u); ctx.beginPath(); ctx.ellipse(X(P.x * q), Y(P.y * q), P.rx * u, P.ry * u, 0, 0, 7); ctx.stroke(); }
  }
  // 巨人骸骨：按 y 排序；后面有人时半透明（贴地部分在 bone 多边形里不能走）
  function entries(ctx, X, Y, s) {
    if (!Z) return []; const u = s * q;
    return [{ y: Z.boneBase * q, d: () => { if (!ok(BONEI)) return; const [bx, by] = Z.boneAt, o = [A.hero(), ...A.foes()].filter(o => !o.dead);
      const behind = o.some(o => o.y / q < Z.boneBase && o.y / q > by && o.x / q > bx - 70 && o.x / q < bx + 383 + 20);
      ctx.save(); ctx.globalAlpha = behind ? .45 : 1; ctx.drawImage(BONEI, X(bx * q), Y(by * q), BONEI.width * u, BONEI.height * u); ctx.restore(); } }];
  }
  function drawOver(ctx, T) {
    if (!Z) return; const wp = phase(), W = ctx.canvas.width;
    if (wp) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); const u = Math.max(1, Math.round(ctx.canvas.height / 480)); ctx.fillStyle = wp === 1 ? '#ffd23a' : '#ff6a4a'; ctx.font = `bold ${7 * u}px system-ui`; ctx.textAlign = 'center'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
      ctx.fillText(wp === 1 ? '⚠ 深坑在呼吸…' : '⚠ 风吸！远离深坑', W / 2, 22 * u); ctx.restore(); }
  }
  return { setMap, off: () => { Z = null; }, on: () => !!Z, walk: (x, y, h) => walkM(x / q, y / q, h), bounds, snap, tick, drawUnder, entries, drawOver, shock, get opened() { return opened; }, get zone() { return Z; } };
}

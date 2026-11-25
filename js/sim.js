// 11/26 无头测试驱动（只在网址带 ?sim 时加载）：给 GitHub Actions 上跑 AI 训练 / 平衡测试用，正常游戏不加载。
// 一局在页面里整局跑完（不画画面、固定步长 1/30 秒），外部只传策略权重、拿回一行 JSON 结果。
(function () {
  if (!/[?&]sim/.test(location.search)) return;
  const B = window.BATTLE, UI = window.UI, DATA = window.DATA;
  let VIC = false, RES = null;
  // 把需要点界面的地方全部自动过：路线卡 / 开箱 / 结算 / 胜利 / 商店
  UI.route = (info, pick) => { const c = info.cards.filter(x => !x.rest); pick((c.length ? c : info.cards)[0]); };
  UI.slot = (a, b, cb) => cb && cb();
  UI.result = r => { RES = r; };
  UI.victory = () => { VIC = true; };
  if (window.CAMP) window.CAMP.open = o => { if (o && o.after) o.after(); };
  const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const NF = 6, NI = 2 + NF * 4, NH = 12, NO = 3;
  const NW = NI * NH + NH + NH * NO + NO;
  function feat(o) { const f = [o.hp, o.rollN0 ? o.rollN / o.rollN0 : 0]; for (let i = 0; i < NF; i++) { const z = o.foes[i]; if (z) f.push(Math.max(-5, Math.min(5, z.dx)) / 5, Math.max(-5, Math.min(5, z.dy)) / 5, z.r, 1); else f.push(0, 0, 0, 0); } return f; }
  function mlp(w, x) { let p = 0; const h = []; for (let j = 0; j < NH; j++) { let s = 0; for (let i = 0; i < NI; i++) s += w[p++] * x[i]; s += w[p++]; h.push(Math.tanh(s)); }
    const out = []; for (let k = 0; k < NO; k++) { let s = 0; for (let j = 0; j < NH; j++) s += w[p++] * h[j]; s += w[p++]; out.push(s); } return out; }
  // 对照用的手写脚本（只用来验证流程能跑通，平衡结论不看它）：远离最近的怪，快被贴住就翻滚
  const SCRIPT = o => { const z = o.foes[0]; if (!z) return [0, 0, 0]; const d = Math.hypot(z.dx, z.dy) || 1; return [-z.dx / d, -z.dy / d, z.d < 70 && o.rollN >= 1 ? 1 : 0]; };
  window.SIMAPI = {
    NW,
    // o = { weapon, hero, seed, maxT（游戏内最多秒数）, w（MLP 权重，缺省用手写脚本）, every（几帧决策一次）, st0（从第几站开始）, godHp（>0 时勇者血量倍数，用来测怪物强度）, god（无敌：只测输出）, pol }
    run(o) {
      const rand = rng(o.seed || 1); Math.random = rand; VIC = false; RES = null;
      B.start({ weapon: o.weapon || 'sword', map: 'field', build: { weapon: o.weapon || 'sword', hero: o.hero || 'm', book1: o.book1 } });
      if (o.st0 > 1) B.sim.skipTo && B.sim.skipTo(o.st0);
      B.sim.setPol(o.pol || {});
      const G = B.g(); if (o.god) G.god = true; const every = o.every || 3, dt = 1 / 30, maxT = o.maxT || 900; let a = [0, 0, 0], steps = 0, hpSum = 0, nObs = 0, rolls = 0;
      while (G && !G.over && !VIC && G.t < maxT) {
        if (steps % every === 0 && !G.paused && !G.fe) { const ob = B.sim.obs(); const x = feat(ob); if (o.w) { const y = mlp(o.w, x); a = [Math.tanh(y[0]), Math.tanh(y[1]), y[2] > 0 ? 1 : 0]; } else a = SCRIPT(ob); hpSum += ob.hp; nObs++; if (a[2]) rolls++; }
        B.sim.step(1, dt, a[0], a[1], steps % every === 0 && a[2]); steps++; if (steps > 400000) break; }
      const R = B.run(), h = B.hero(), g = B.g() || G;
      return { hero: o.hero || 'm', weapon: o.weapon || 'sword', seed: o.seed || 1, win: !!VIC, over: g.over || null, st: g.st, wi: g.wi, t: +g.t.toFixed(1), kills: g.kills, lv: g.lv, hpAvg: nObs ? +(hpSum / nObs).toFixed(3) : 0, rolls, steps,
        dmg: R.dmgAll || {}, slots: R.slots.filter(Boolean).map(s => s.id + ':' + s.lv), score: g.st * 120 + Math.max(0, g.wi) * 35 + g.kills * .6 + g.t * .05 + (VIC ? 2000 : 0) };
    },
    // 单怪测试：关掉刷怪，在勇者身边放 n 只同种怪，打到死光 / 勇者倒下 / 限时。st = 按第几站的血量倍率
    duel(o) {
      Math.random = rng(o.seed || 1); VIC = false; RES = null;
      B.start({ weapon: o.weapon || 'sword', map: 'field', build: { weapon: o.weapon || 'sword', hero: o.hero || 'm' } });
      const G = B.g(); G.ready = 1e9; G.st = o.st || 1; const n = o.n || 6; let ok = 0; for (let i = 0; i < n; i++) if (B.spawnDbg(o.enemy, o.tier || 0)) ok++;
      const every = o.every || 3, dt = 1 / 30, T0 = G.t, maxT = o.maxT || 60; let a = [0, 0, 0], steps = 0, firstKill = null;
      while (!G.over && G.t - T0 < maxT) { if (steps % every === 0) { const ob = B.sim.obs(); if (ob.n === 0) break; const x = feat(ob); if (o.w) { const y = mlp(o.w, x); a = [Math.tanh(y[0]), Math.tanh(y[1]), y[2] > 0 ? 1 : 0]; } else a = SCRIPT(ob); }
        B.sim.step(1, dt, a[0], a[1], steps % every === 0 && a[2]); steps++; if (firstKill == null && G.kills > 0) firstKill = G.t - T0; }
      const h = B.hero(), left = B.sim.obs().n;
      return { enemy: o.enemy, n: ok, st: o.st || 1, weapon: o.weapon || 'sword', hero: o.hero || 'm', seed: o.seed || 1, kills: G.kills, left, dead: !!h.dead, t: +(G.t - T0).toFixed(1), taken: Math.round(G.taken || 0), maxHp: h.maxHp, firstKill: firstKill == null ? null : +firstKill.toFixed(1) };
    },
    lists() { return { enemies: Object.keys(DATA.enemies).filter(k => !DATA.enemies[k].boss), bosses: Object.keys(DATA.enemies).filter(k => DATA.enemies[k].boss), skills: Object.keys(DATA.skills).map(k => ({ id: k, w: DATA.skills[k].w, sys: DATA.skills[k].sys, tier: DATA.skills[k].tier })), heroes: DATA.heroes.map(h => h.id) }; },
    ready() { return !!(B && window.SPR); }
  };
})();

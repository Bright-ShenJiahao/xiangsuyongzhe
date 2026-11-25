// 训练：进化策略（OpenAI-ES，对偶采样 + 排名归一化）训练一个小 MLP 走位 / 翻滚策略。全部在 Actions 上跑。
// 用法：node tools/sim/train.js  环境变量 TRAIN_MIN（训练分钟数）POP（种群）PAGES（并行页面数）
const fs = require('fs'), { pool } = require('./lib');
const MIN = +process.env.TRAIN_MIN || 25, POP = +process.env.POP || 24, NP = +process.env.PAGES || 4, SIG = .12, LR = .06;
const W4 = ['sword', 'spear', 'bow', 'staff'], H4 = ['m', 'f', 'e', 'p'];
const randn = () => { let u = 0, v = 0; while (!u) u = Math.random(); v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
(async () => {
  const P = await pool(NP), NW = await P.pages[0].evaluate('SIMAPI.NW'); let th = Array.from({ length: NW }, () => randn() * .3), best = null, log = [];
  const t0 = Date.now(); let gen = 0;
  const epi = (w, g, j) => ({ fn: o => SIMAPI.run(o), arg: { w, weapon: W4[(g + j) % 4], hero: H4[(g * 3 + j) % 4], seed: 1000 + g * 7 + j, maxT: 420 } });
  while ((Date.now() - t0) / 60000 < MIN) {
    const eps = Array.from({ length: POP / 2 }, () => Array.from({ length: NW }, randn)), cands = [];
    for (const e of eps) { cands.push(th.map((x, i) => x + SIG * e[i])); cands.push(th.map((x, i) => x - SIG * e[i])); }
    const jobs = []; for (const c of cands) for (let j = 0; j < 2; j++) jobs.push(epi(c, gen, j));
    const res = await P.run(jobs), fit = cands.map((_, i) => ((res[2 * i].score || 0) + (res[2 * i + 1].score || 0)) / 2);
    const order = fit.map((f, i) => [f, i]).sort((a, b) => a[0] - b[0]), rank = new Array(POP); order.forEach(([, i], r) => rank[i] = r / (POP - 1) - .5);
    const g = new Array(NW).fill(0); for (let k = 0; k < POP / 2; k++) { const d = rank[2 * k] - rank[2 * k + 1]; for (let i = 0; i < NW; i++) g[i] += d * eps[k][i]; }
    th = th.map((x, i) => x + LR / (POP * SIG) * g[i] * 4);
    const mean = fit.reduce((a, b) => a + b, 0) / POP, mx = Math.max(...fit); if (!best || mx > best.fit) best = { fit: mx, w: cands[fit.indexOf(mx)] };
    log.push({ gen, mean: +mean.toFixed(1), max: +mx.toFixed(1), min: +(t => t)(Math.min(...fit)).toFixed(1) }); console.log('gen', gen, 'mean', mean.toFixed(1), 'max', mx.toFixed(1), ((Date.now() - t0) / 60000).toFixed(1) + 'min'); gen++;
  }
  // 最终挑选：当前中心点 vs 历史最好点，各在 16 局上复测，取高者
  const test = w => P.run(Array.from({ length: 16 }, (_, j) => epi(w, 9999, j))).then(r => r.reduce((a, x) => a + (x.score || 0), 0) / 16);
  const [a, b] = [await test(th), await test(best.w)], pick = a >= b ? th : best.w; console.log('final center', a.toFixed(1), 'best', b.toFixed(1));
  fs.mkdirSync('out', { recursive: true }); fs.writeFileSync('out/weights.json', JSON.stringify({ w: pick, gens: gen, center: a, best: b })); fs.writeFileSync('out/train_log.json', JSON.stringify(log)); await P.close();
})();

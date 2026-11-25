// 评估：用训练好的 AI（out/weights.json）测。MODE = grid | skills | enemies；SHARD / SHARDS 把任务切片给矩阵并行。
const fs = require('fs'), { pool } = require('./lib');
const MODE = process.env.MODE, SHARD = +process.env.SHARD || 0, SHARDS = +process.env.SHARDS || 1, NP = +process.env.PAGES || 4, N = +process.env.N || 30;
const W4 = ['sword', 'spear', 'bow', 'staff'], H4 = ['m', 'f', 'e', 'p'];
(async () => {
  const w = JSON.parse(fs.readFileSync(process.env.WEIGHTS || 'out/weights.json')).w, P = await pool(NP), L = await P.pages[0].evaluate('SIMAPI.lists()'); let jobs = [];
  const run = arg => ({ fn: o => SIMAPI.run(o), arg: Object.assign({ w }, arg) }), duel = arg => ({ fn: o => SIMAPI.duel(o), arg: Object.assign({ w }, arg) });
  if (MODE === 'grid') for (const h of H4) for (const wp of W4) for (let s = 0; s < N; s++) jobs.push(run({ hero: h, weapon: wp, seed: 5000 + s, maxT: 1500 }));   // 4 角色 × 4 兵器 × N 局，真打（不无敌）
  if (MODE === 'skills') for (const k of L.skills) for (let s = 0; s < 6; s++) jobs.push(Object.assign(run({ weapon: k.w, book1: k.id, seed: 7000 + s, maxT: 240, god: true }), { tag: k }));   // 每个技能做 1 号位，无敌打 240 秒量输出
  if (MODE === 'enemies') for (const e of L.enemies) for (const st of [1, 5, 9]) for (const wp of ['sword', 'bow']) for (let s = 0; s < 4; s++) jobs.push(duel({ enemy: e, st, weapon: wp, n: 6, seed: 9000 + s }));
  jobs = jobs.filter((_, i) => i % SHARDS === SHARD); console.log(MODE, 'jobs', jobs.length); const t0 = Date.now();
  const res = await P.run(jobs, i => { if (i % 50 === 0) console.log(i, ((Date.now() - t0) / 60000).toFixed(1) + 'min'); });
  fs.mkdirSync('out', { recursive: true }); fs.writeFileSync(`out/${MODE}_${SHARD}.jsonl`, res.map((r, i) => JSON.stringify(Object.assign({}, r, jobs[i].tag ? { skill: jobs[i].tag.id, sys: jobs[i].tag.sys, tier: jobs[i].tag.tier } : {}))).join('\n')); await P.close();
})();

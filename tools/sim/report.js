// 汇总：out/*.jsonl → Markdown（写进 Actions 摘要 + out/report.md）。只用训练好的 AI 的数据。
const fs = require('fs'), path = require('path');
const rows = f => fs.readdirSync('out').filter(x => x.startsWith(f) && x.endsWith('.jsonl')).flatMap(x => fs.readFileSync(path.join('out', x), 'utf8').split('\n').filter(Boolean).map(JSON.parse)).filter(r => !r.error);
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0, f1 = x => x.toFixed(1), pct = x => (x * 100).toFixed(0) + '%';
const grp = (a, k) => { const m = {}; for (const r of a) (m[k(r)] = m[k(r)] || []).push(r); return m; };
let md = '# 第一章 AI 测试报告（只看强化学习 AI）\n\n';
try { const T = JSON.parse(fs.readFileSync('out/train_log.json')); md += `训练 ${T.length} 代，末代平均分 ${f1(T[T.length - 1].mean)}，最高 ${f1(Math.max(...T.map(x => x.max)))}。\n\n`; } catch (e) {}
const G = rows('grid');
if (G.length) {
  const tbl = (key, name) => { md += `| ${name} | 局数 | 通关率 | 平均到第几站 | 平均存活秒 | 平均击杀 | 平均血量比 |\n|---|---|---|---|---|---|---|\n`; for (const [k, a] of Object.entries(grp(G, key)).sort()) md += `| ${k} | ${a.length} | ${pct(avg(a.map(r => +r.win)))} | ${f1(avg(a.map(r => r.st + (Math.max(0, r.wi) + 1) / 4)))} | ${f1(avg(a.map(r => r.t)))} | ${f1(avg(a.map(r => r.kills)))} | ${avg(a.map(r => r.hpAvg)).toFixed(2)} |\n`; md += '\n'; };
  md += '## 兵器对比（4 角色合并）\n\n'; tbl(r => r.weapon, '兵器'); md += '## 角色对比（4 兵器合并）\n\n'; tbl(r => r.hero, '角色'); md += '## 角色 × 兵器\n\n'; tbl(r => r.hero + ' × ' + r.weapon, '组合');
  md += '## 死在第几站（输的局）\n\n| 站 | 局数 | 占输局 |\n|---|---|---|\n'; const L = G.filter(r => !r.win), d = grp(L, r => r.st); for (const k of Object.keys(d).sort((a, b) => a - b)) md += `| ${k} | ${d[k].length} | ${pct(d[k].length / L.length)} |\n`; md += '\n';
}
const S = rows('skills');
if (S.length) { md += '## 技能输出（无敌打 240 秒，1 号位；伤害 = 该技能累计）\n\n| 技能 | 兵器系 | 阶 | 技能伤害 | 全部伤害 | 击杀 |\n|---|---|---|---|---|---|\n'; const a = Object.entries(grp(S, r => r.skill)).map(([k, v]) => ({ k, sys: v[0].sys, tier: v[0].tier, own: avg(v.map(r => (r.dmg || {})[k] || 0)), all: avg(v.map(r => Object.values(r.dmg || {}).reduce((x, y) => x + y, 0))), kills: avg(v.map(r => r.kills)) })).sort((x, y) => y.own - x.own); for (const r of a) md += `| ${r.k} | ${r.sys} | ${r.tier} | ${Math.round(r.own)} | ${Math.round(r.all)} | ${f1(r.kills)} |\n`; md += '\n'; }
const E = rows('enemies');
if (E.length) { md += '## 单怪威胁（6 只同种怪围上来；站 = 血量倍率；勇者初始装备）\n\n| 怪 | 站 | 勇者倒下率 | 平均受伤占血量 | 平均清场秒 | 清不完 |\n|---|---|---|---|---|---|\n'; const a = Object.entries(grp(E, r => r.enemy + '|' + r.st)).map(([k, v]) => { const [e, st] = k.split('|'); return { e, st: +st, dead: avg(v.map(r => +r.dead)), taken: avg(v.map(r => r.taken / r.maxHp)), t: avg(v.map(r => r.t)), left: avg(v.map(r => +(r.left > 0))) }; }).sort((x, y) => x.st - y.st || y.taken - x.taken); for (const r of a) md += `| ${r.e} | ${r.st} | ${pct(r.dead)} | ${pct(r.taken)} | ${f1(r.t)} | ${pct(r.left)} |\n`; md += '\n'; }
fs.writeFileSync('out/report.md', md); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md); 

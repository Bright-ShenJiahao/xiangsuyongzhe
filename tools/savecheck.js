// 本地单次存档往返检查。依赖 playwright，可用 PLAYWRIGHT_CHANNEL=msedge。
// node tools/savecheck.js，报告固定写入 docs/存档检查.md，不接 Actions。
const fs = require('fs');
const path = require('path');
const http = require('http');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('./sim/node_modules/playwright')); }
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'docs/存档检查.md');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
function differences(a, b, prefix = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap(k => differences(a[k], b[k], prefix ? `${prefix}.${k}` : k));
  }
  return [{ path: prefix, before: a, after: b }];
}
const cell = x => JSON.stringify(x) === undefined ? '缺失' : JSON.stringify(x).replace(/\|/g, '\\|').replace(/\n/g, ' ');
function table(rows) {
  return rows.length ? '| 字段 | 存档前 | 读档后 |\n|---|---|---|\n' + rows.map(r => `| ${r.path} | ${cell(r.before)} | ${cell(r.after)} |`).join('\n') : '无字段变化。';
}
async function main() {
  const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (error, body) => { if (error) { res.writeHead(404); return res.end(); } res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(body); });
  });
  let browser;
  const errors = [];
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
    // 独立 context，所有夹具只进入本次浏览器临时存储。
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html?sim&nofall`);
    await page.waitForFunction(() => window.SIMAPI && SIMAPI.ready() && !document.getElementById('bStart').disabled, null, { timeout: 60000 });
    const before = await page.evaluate(() => {
      BATTLE.start({ weapon: 'sword', build: { weapon: 'sword', hero: 'm' } });
      BATTLE.g().god = true;
      // 只推进这一站，不运行平衡训练。正常计时、结算和选门由现有 sim 驱动处理。
      let steps = 0;
      while (BATTLE.g().st < 2 && !BATTLE.g().over && steps++ < 18000) BATTLE.sim.step(1, 1 / 30, 0, 0, false);
      if (BATTLE.g().st < 2) throw new Error('未完成第一站，不能宣称已经检查自动存档');
      // 构造非空字段用于往返覆盖，再走普通站点入口产生自动存档。
      const r = BATTLE.run();
      r.slots[0] = { id: 'sword', lv: 4, xp: 23 };
      r.slots[1] = { id: 'staff', lv: 2, xp: 11 };
      r.bag[0] = { kind: 'book', id: 'bow', lv: 2, xp: 7 };
      r.bag[1] = { kind: 'item', id: 'magnet', lv: 3 };
      r.eq.main = { t: 3, aff: [[0, 2], [2, 1]] };
      r.eq.armor = { id: 'plate', t: 2 };
      r.gbag.push({ k: 'w', t: 2, aff: [[3, 2]] });
      r.gear[0] = { kind: 'item', id: 'bento', lv: 3 };
      r.gear[1] = { kind: 'item', id: 'glass_sword', lv: 2 };
      const oath = Object.keys(DATA.oaths).find(id => !DATA.oaths[id].mv);
      const move = Object.keys(DATA.oaths).find(id => DATA.oaths[id].mv);
      r.oath[0] = { kind: 'oath', id: oath, lv: 3, mv: false };
      r.mv[0] = { kind: 'oath', id: move, lv: 2, mv: true };
      r.train = { str: 2, con: 1 }; r.xiu = 3; r.coins = 137;
      r.lives = 4; r.livesUsed = 1; r.stones = { 1: 2, 2: 1, 3: 1 };
      r.title = DATA.titles[0].id;
      localStorage.setItem('xsyz-titles', JSON.stringify([r.title]));
      EGG.find(EGG.LIST[0].id);
      BATTLE.addCrystal(11, BATTLE.hero().x, BATTLE.hero().y);
      BATTLE.recompute(); BATTLE.g().wi = -1; BATTLE.nextWave(); BATTLE.pause(true);
      const saved = BATTLE.loadSave();
      const storage = Object.fromEntries(Object.keys(localStorage).filter(k => !k.includes('save1')).sort().map(k => [k, localStorage.getItem(k)]));
      return { run: JSON.parse(JSON.stringify(r)), saved, storage, station: BATTLE.st(), completed: 1, steps };
    });
    await page.reload();
    await page.waitForFunction(() => window.SIMAPI && SIMAPI.ready() && !document.getElementById('bStart').disabled, null, { timeout: 60000 });
    const after = await page.evaluate(() => {
      const saved = BATTLE.loadSave();
      if (!saved) throw new Error('重新加载后找不到存档');
      // 与 ui.js 的普通读档分支使用相同入口与参数，不触发死亡续命加血。
      BATTLE.start(Object.assign({}, saved.opt, { resume: saved, drop: 1 })); BATTLE.pause(true);
      return { run: JSON.parse(JSON.stringify(BATTLE.run())), storage: Object.fromEntries(Object.keys(localStorage).filter(k => !k.includes('save1')).sort().map(k => [k, localStorage.getItem(k)])), station: BATTLE.st() };
    });
    const serialized = differences(before.run, before.saved.RUN, 'RUN');
    const restored = differences(before.saved.RUN, after.run, 'RUN');
    const roundtrip = differences(before.run, after.run, 'RUN');
    const persistent = differences(before.storage, after.storage, 'localStorage');
    const sections = ['slots', 'bag', 'eq', 'gbag', 'gear', 'oath', 'mv', 'train', 'xiu', 'coins', 'cry', 'lives', 'livesUsed', 'title', 'stones'];
    const coverage = sections.map(k => `| RUN.${k} | ${cell(before.run[k])} | ${roundtrip.some(d => d.path === 'RUN.' + k || d.path.startsWith('RUN.' + k + '.')) ? '变化，见差异表' : '一致'} |`).join('\n');
    const report = `# 存档检查

## 本次执行

本地 Playwright 单次运行。完成第一站，进入第 ${before.station} 站触发自动存档。随后填充非空覆盖夹具，重新走同站普通入口自动保存，快照后重新加载页面，经与 UI 普通读档相同的 BATTLE.start({resume}) 入口恢复。未走宫殿交互页面，也未检查死亡续命和多个存档槽。

只使用 ?sim 的固定步长推进第一站，未训练 AI、未产生平衡结论。夹具直接写入临时浏览器 RUN，用于检查非空字段的序列化，未验证这些物品通过正常获取入口的正确性。

读档前后暂停在站点入口，对比完整 RUN 和全部非快照 localStorage 键。快照时间戳与自动存档覆盖排除在局外存储比较外。

## 非空覆盖字段

| 字段 | 保存前样本 | 结果 |
|---|---|---|
${coverage}

水晶总额、解锁称号和彩蛋记录同时检查 localStorage。RUN.cry 是本局获得水晶计数，与永久总额含义不同。

## 实时 RUN → 自动存档 RUN

${table(serialized)}

## 自动存档 RUN → 读档重建 RUN

${table(restored)}

## 完整往返 RUN 差异

${table(roundtrip)}

## 局外持久字段差异

${table(persistent)}

检查的局外键有 ${Object.keys(before.storage).join('、')}。

## 结果范围

读档前站点 ${before.station}，读档后站点 ${after.station}。捕获页面错误 ${errors.length} 条。${errors.join('；')}

字段变化需结合重建语义分析，变化不自动等于丢失。未发生差异也只覆盖上述单次样本。报告不修改存档或游戏逻辑。
`;
    fs.writeFileSync(output, report);
    console.log(`报告 ${output}\nRUN 差异 ${roundtrip.length}，局外差异 ${persistent.length}，页面错误 ${errors.length}`);
    if (errors.length) throw new Error('检查遇到页面错误，详见已生成报告');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

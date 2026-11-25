// 11/26 无头测试公共部分：起静态服务 + 一组 Chromium 页面（每页整局在页面里跑完，只传权重 / 取回结果）
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
function serve() { return new Promise(r => { const s = http.createServer((q, a) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html')); fs.readFile(p, (e, d) => { if (e) { a.statusCode = 404; return a.end(); } a.setHeader('content-type', MIME[path.extname(p)] || 'application/octet-stream'); a.end(d); }); }); s.listen(0, () => r(s)); }); }
async function pool(n) {
  const srv = await serve(), port = srv.address().port, br = await chromium.launch({ args: ['--no-sandbox'] }), pages = [];
  for (let i = 0; i < n; i++) { const pg = await br.newPage({ viewport: { width: 1280, height: 720 } }); pg.on('pageerror', e => console.error('pageerror', String(e).slice(0, 200)));
    await pg.goto(`http://localhost:${port}/index.html?sim`); await pg.waitForFunction('window.SIMAPI && SIMAPI.ready()', null, { timeout: 60000 }); await pg.waitForTimeout(3000); pages.push(pg); }
  // 任务队列：fn 在页面里执行，返回结果；页面空闲就领下一个
  const run = async (jobs, onDone) => { const out = new Array(jobs.length); let k = 0; await Promise.all(pages.map(async pg => { while (k < jobs.length) { const i = k++; try { out[i] = await pg.evaluate(jobs[i].fn, jobs[i].arg); } catch (e) { out[i] = { error: String(e).slice(0, 160), job: jobs[i].arg }; } if (onDone) onDone(i, out[i]); } })); return out; };
  return { pages, run, close: async () => { await br.close(); srv.close(); } };
}
module.exports = { pool };

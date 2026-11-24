// 11/25 BGM：一首一个 mp3（art/bgm/），切歌淡出淡入；浏览器要用户点一下才能出声，第一次点击后自动补播。
// BGM.play('t1') / BGM.play(null) 淡出停；BGM.scene(屏幕id) 按界面选曲；BGM.duck(true) 压低（弹窗时）。音量存在 xsyz-bgmVol（0~1，全局，不分存档）。
(() => {
  const TRACKS = { t1: 'art/bgm/t1.mp3', u1: 'art/bgm/u1.mp3', h1: 'art/bgm/h1.mp3', k1: 'art/bgm/k1.mp3' };   /* k1 = 竖琴：宫殿 / 高塔 */   /* h1 = 圣歌：剧情第4张 / 首次选人 / 高塔召唤 */   // u1 = 入侵不安（剧情第 2、3 张）   // t1 = 轻快奇幻（主界面 / 选存档 / 备战 / 剧情第 1 张图）
  const SCENE = { title: 't1', prep: 't1', battle: null };
  let outMs = 700, want = null, cur = null, au = null, vol = (() => { const v = parseFloat(localStorage.getItem('xsyz-bgmVol')); return isNaN(v) ? .6 : v; })(), ducked = false, unlocked = false, fadeT = 0;
  const target = () => vol * (ducked ? .35 : 1) * .8;
  function fade(a, to, ms, done) { const from = a.volume, t0 = performance.now(); clearInterval(a._f); a._f = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / ms); a.volume = Math.max(0, Math.min(1, from + (to - from) * k)); if (k >= 1) { clearInterval(a._f); done && done(); } }, 40); }
  function start() { if (!unlocked) return; if (cur === want) { if (au) fade(au, target(), 300); return; }
    const old = au; cur = want; au = null; if (old) fade(old, 0, outMs, () => { old.pause(); });
    if (!want || !TRACKS[want]) return; const a = new Audio(TRACKS[want]); a.loop = true; a.volume = 0; au = a; const p = a.play(); if (p && p.catch) p.catch(() => { unlocked = false; cur = null; }); fade(a, target(), 1200); }
  const unlock = () => { unlocked = true; start(); };
  addEventListener('pointerdown', unlock, { once: true }); addEventListener('keydown', unlock, { once: true });
  window.BGM = {
    play(id, ms) { outMs = ms || 700; want = id; start(); }, scene(s) { if (s in SCENE) this.play(SCENE[s]); }, duck(on) { ducked = !!on; if (au) fade(au, target(), 300); },
    get vol() { return vol; }, set vol(v) { vol = Math.max(0, Math.min(1, v)); try { localStorage.setItem('xsyz-bgmVol', vol); } catch (e) {} if (au) fade(au, target(), 200); },
  };
})();

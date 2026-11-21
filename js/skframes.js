// 像素勇者 · 出招用哪几帧（tools/frames.html 调，调好的结果烤进 s 里）。
// 每招分四段：wu 前摇 → hit 出手（hitT 秒）→ hold 持续（只有占时型）→ rc 后摇。
// 每段是一串帧名（atk0 = 出招第 1 帧，big0 = 大招帧……），按 fps 播放，播完停在最后一帧；hold 循环播。
// 空数组 = 用平常的站立帧。lunge = 出手时往前冲几像素格。
// 本机调试：工具点「保存」会写进 localStorage xsyz-skf，游戏读到就盖过下面的默认值。
window.SKF = (() => {
  const base = { wu: ['atk0'], hit: ['atk1'], hold: ['atk0', 'atk1'], rc: [], hitT: .25, fps: 12, lunge: 3 };
  const big = { wu: ['atk0'], hit: ['big0'], hold: ['big0'], rc: [], hitT: .25, fps: 12, lunge: 0 };
  const s = {};   // 调好的招式写在这里：s.whirl = { wu: [...], ... }
  let local = {};
  const readLocal = () => { try { local = JSON.parse(localStorage.getItem('xsyz-skf') || '{}') || {}; } catch (e) { local = {}; } };
  readLocal();
  try { addEventListener('storage', e => { if (e.key === 'xsyz-skf') readLocal(); }); } catch (e) {}
  function get(id) {
    const S = window.DATA && DATA.skills[id] || {};
    return Object.assign({}, S.frame === 'big' ? big : base, s[id] || {}, local[id] || {});
  }
  // 按段和段内时间取帧：返回 [动作名, 第几帧]
  function pick(F, ph, t) {
    const L = F[ph]; if (!L || !L.length) return null;
    let i = Math.floor(t * (F.fps || 12)); i = ph === 'hold' ? i % L.length : Math.min(i, L.length - 1);
    const m = /^([a-z]+)(\d+)$/.exec(L[i]); return m ? [m[1], +m[2]] : null;
  }
  return { base, big, s, get, pick, readLocal, local: () => local };
})();

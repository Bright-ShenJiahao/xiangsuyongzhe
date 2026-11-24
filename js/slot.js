// 11/24 存档位（3 个）：按存档位区分的键自动加前缀 xsyz-s{N}-，其他代码照常读写 localStorage 就行
(function () {
  const PER = ['xsyz-crystal', 'xsyz-meta', 'xsyz-titles', 'xsyz-title', 'xsyz-rec', 'xsyz-linesSeen', 'xsyz-returns', 'xsyz-wins', 'xsyz-hero', 'xsyz-weapon', 'xsyz-introSeen', 'xsyz-name', 'xsyz-pin', 'pxyz.save1'];
  const P = Storage.prototype, g0 = P.getItem, s0 = P.setItem, r0 = P.removeItem;
  let cur = +(g0.call(localStorage, 'xsyz-slot') || 0) || 1;   // 没选过就当存档 1（调试「直接开打」也记进存档 1）
  const map = k => cur && PER.includes(k) ? 'xsyz-s' + cur + '-' + k.replace(/^xsyz-|^pxyz\./, '') : k;
  P.getItem = function (k) { return g0.call(this, this === localStorage ? map(k) : k); };
  P.setItem = function (k, v) { return s0.call(this, this === localStorage ? map(k) : k, v); };
  P.removeItem = function (k) { return r0.call(this, this === localStorage ? map(k) : k); };
  const raw = (n, k) => g0.call(localStorage, 'xsyz-s' + n + '-' + k.replace(/^xsyz-|^pxyz\./, ''));
  // 旧进度（还没有存档位时）搬进存档 1
  try { if (!g0.call(localStorage, 'xsyz-slotMig')) { if (g0.call(localStorage, 'xsyz-introSeen')) for (const k of PER) { const v = g0.call(localStorage, k); if (v != null) s0.call(localStorage, 'xsyz-s1-' + k.replace(/^xsyz-|^pxyz\./, ''), v); } s0.call(localStorage, 'xsyz-slotMig', '1'); } } catch (e) {}
  window.SLOT = {
    N: 3, get cur() { return cur; },
    use(n) { cur = n; s0.call(localStorage, 'xsyz-slot', String(n)); },
    has(n) { return raw(n, 'xsyz-introSeen') === '1'; },   // 看完塔顶开场才算建好存档
    info(n) { let R = {}; try { R = JSON.parse(raw(n, 'xsyz-rec') || '{}'); } catch (e) {} return { name: raw(n, 'xsyz-name') || '无名勇者', hero: raw(n, 'xsyz-hero') === 'f' ? 'f' : 'm', cry: +raw(n, 'xsyz-crystal') || 0, best: R.best || 0, wins: R.wins || 0, deaths: R.deaths || 0, run: !!raw(n, 'pxyz.save1') }; },
    wipe(n) { for (const k of PER) r0.call(localStorage, 'xsyz-s' + n + '-' + k.replace(/^xsyz-|^pxyz\./, '')); },
  };
})();

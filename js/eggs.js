/* 11/25 高塔 / 宫殿的隐藏小发现（5 个）：找齐给称号「好奇宝宝」。
   EGG.has/count/find；奖励铜钱存 xsyz-bonusCoin（下一局开局带上，一次性）；EGG.plaque 是上方居中的称号木牌（宫殿/高塔用）；EGG.ring 画脚下转圈。 */
(function () {
  const LIST = [
    { id: 'diary', where: '高塔', name: '前任勇者的旧日记', say: '祭坛后面压着一本旧日记……', text: '「第 47 天。哥布林王的胡子，比我想的长。如果有人读到这页：别在森林里睡觉。」' },
    { id: 'tree', where: '高塔', name: '树后的钱袋', say: '树后面藏着一小袋铜钱！', text: '花盆后面塞着一个小钱袋。不知道是哪位前任勇者，忘了带走。', coin: 15 },
    { id: 'rail', where: '高塔', name: '栏杆边的黑烟', say: '远处的森林里，几缕黑烟正在升起……', text: '站在栏杆边往远处看，森林里有几处黑烟。那是哥布林的营地。' },
    { id: 'throne', where: '宫殿', name: '垫子下的纸条', say: '王座的垫子下面，压着一张纸条。', text: '国王的字迹：「公主要是问起，我没有来过这里。」' },
    { id: 'cat', where: '宫殿', name: '门缝里的钱袋', say: '一小袋铜钱，被从门缝底下推了进来。', text: '一只布偶猫在门外蹭了蹭，把一袋铜钱从门缝底下推了进来。', coin: 15 }];
  const get = () => { try { return JSON.parse(localStorage.getItem('xsyz-eggs') || '{}'); } catch (e) { return {}; } };
  const sfx = () => localStorage.getItem('xsyz-sfx') !== '0';
  let AC; function tone(f, d, t, v) { if (!sfx()) return; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const a = AC, o = a.createOscillator(), g = a.createGain(), s = a.currentTime + t; o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(v, s + .02); g.gain.exponentialRampToValueAtTime(.001, s + d); o.connect(g).connect(a.destination); o.start(s); o.stop(s + d + .05); } catch (e) {} }
  const chime = () => { [784, 988, 1319].forEach((f, i) => tone(f, .4, i * .09, .06)); tone(2637, .5, .3, .025); };
  let css = 0, pl, plT;
  function plaque(name, desc) { if (!css) { css = 1; const s = document.createElement('style'); s.textContent = '#eggPlq{position:fixed;left:50%;top:0;transform:translate(-50%,-140%);z-index:99990;min-width:min(420px,86vw);padding:10px 26px 12px;text-align:center;background:linear-gradient(#3a2814,#2a1c0e);border:3px solid #e8c070;border-top:0;border-radius:0 0 12px 12px;box-shadow:0 6px 18px #000a,inset 0 0 0 2px #7a5a24;transition:transform .45s cubic-bezier(.2,1.4,.4,1);font-family:WenKai,"Kaiti SC",serif;pointer-events:none}#eggPlq.on{transform:translate(-50%,0)}#eggPlq small{display:block;color:#d8c08a;font-size:13px;letter-spacing:.3em}#eggPlq b{display:block;color:#ffd77a;font-size:28px;letter-spacing:.12em;text-shadow:0 2px 0 #000,0 0 14px #ffb83a88;margin:2px 0}#eggPlq i{display:block;font-style:normal;color:#cdbb97;font-size:13px}'; document.head.appendChild(s); pl = document.createElement('div'); pl.id = 'eggPlq'; document.body.appendChild(pl); }
    pl.innerHTML = `<small>获得称号</small><b>${name}</b><i>${desc}</i>`; requestAnimationFrame(() => pl.classList.add('on')); clearTimeout(plT); plT = setTimeout(() => pl.classList.remove('on'), 3800); chime(); }
  function grant() { try { const own = JSON.parse(localStorage.getItem('xsyz-titles') || '[]'); if (own.includes('curious')) return; own.push('curious'); localStorage.setItem('xsyz-titles', JSON.stringify(own)); plaque('好奇宝宝', '在高塔和宫殿找齐 5 个隐藏的小发现'); } catch (e) {} }
  window.EGG = { LIST, has: id => !!get()[id], count: () => LIST.filter(e => get()[e.id]).length, plaque, chime,
    find(id) { const e = LIST.find(x => x.id === id); if (!e || get()[id]) return null; const o = get(); o[id] = 1; localStorage.setItem('xsyz-eggs', JSON.stringify(o));
      if (e.coin) localStorage.setItem('xsyz-bonusCoin', String((+localStorage.getItem('xsyz-bonusCoin') || 0) + e.coin)); try { SEEN.add('f:' + id); } catch (x) {}
      tone(1175, .12, 0, .05); tone(1568, .2, .08, .05); if (this.count() >= LIST.length) setTimeout(grant, 1500); return e; },
    ring(g, x, y, p) { g.save(); g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x, y, 22, 8, 0, 0, 7); g.stroke(); g.strokeStyle = '#ffd77a'; g.shadowColor = '#ffb83a'; g.shadowBlur = 6; g.beginPath(); g.ellipse(x, y, 22, 8, 0, -Math.PI / 2, -Math.PI / 2 + 6.2832 * p); g.stroke(); g.restore(); } };
})();

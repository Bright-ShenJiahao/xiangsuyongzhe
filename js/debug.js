// 开发者面板：网址带 ?debug 才出现。首领出场、无敌、清场、升级、直接胜利、回血、跳过开场。
(() => {
  if (!/[?&]debug/.test(location.search)) return;
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:6px;top:42%;z-index:99;display:flex;flex-direction:column;gap:4px;align-items:flex-start;font:12px Pix,monospace';
  const B = (t, fn) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'font:inherit;padding:4px 6px;background:#1c2a1c;color:#8ef07a;border:1px solid #4a8a3a;cursor:pointer'; b.onclick = e => { e.stopPropagation(); fn(b); }; box.appendChild(b); return b; };
  const hide = B('调试 ▾', b => { const on = box.dataset.c !== '1'; box.dataset.c = on ? '1' : '0'; [...box.children].forEach(c => c !== b && (c.style.display = on ? 'none' : '')); b.textContent = on ? '调试 ▸' : '调试 ▾'; });
  B('首领出场', () => UI.mod().debug.boss());
  B('无敌', b => { UI.mod().debug.god(); b.style.color = b.style.color === 'rgb(255, 216, 96)' ? '#8ef07a' : '#ffd860'; });
  B('清场', () => UI.mod().debug.clear());
  B('时间到', () => UI.mod().debug.skip());
  B('升级', () => UI.mod().debug.lvl());
  B('回血', () => UI.mod().debug.heal());
  B('本波胜利', () => UI.mod().debug.wave());
  B('本站胜利', () => UI.mod().debug.station());
  B('直接胜利', () => UI.mod().debug.win());
  B('直接开打', () => { if (window.UI) UI.startBattle(); });
  hide.click();   // 默认收起，点「调试」展开（手机上不挡按钮）
  box.addEventListener('pointerdown', e => e.stopPropagation());
  addEventListener('DOMContentLoaded', () => document.body.appendChild(box)); if (document.body) document.body.appendChild(box);
  try { localStorage.setItem('xsyz-seenIntro', localStorage.getItem('xsyz-seenIntro') || ''); } catch (e) {}
})();

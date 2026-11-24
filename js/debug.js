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
  B('本段胜利', () => UI.mod().debug.wave());
  B('本站胜利', () => UI.mod().debug.station());
  B('给印记', () => UI.mod().debug.oath());
  B('直接胜利', () => UI.mod().debug.win());
  B('发装备', () => { CAMP.giveGear(); });
  B('选人页', () => { try { BATTLE.stop(); } catch (e) {} for (const id of ['levelup', 'pause', 'result', 'camp']) { const e = document.getElementById(id); if (e) e.classList.remove('on'); } UI.openPrep(true); });
  B('直接开打', () => { if (window.UI) UI.startBattle(); });
  // 11/23 演练场：一键进入要看的场景（自动开一局、无敌、给钱给书）
  const sel = document.createElement('select'); sel.style.cssText = 'font:inherit;background:#1c2a1c;color:#ffd860;border:1px solid #4a8a3a;padding:3px';
  const SC = [['演练场 ▸', ''], ['站末结算场地', 'fe'], ['地精商店', 'shop'], ['休整：宝箱', 'chest'], ['休整：篝火', 'fire'], ['公主中途光球', 'pr'], ['通关结算', 'win'], ['败北结算', 'lose'], ...['rift_mer', 'fairy', 'knight', 'gamble', 'rift', 'kid', 'altar', 'feather'].map(id => ['奇遇：' + id, 'ev:' + id])];
  for (const [t, v] of SC) { const o = document.createElement('option'); o.textContent = t; o.value = v; sel.appendChild(o); }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  sel.onchange = async () => { const v = sel.value; sel.value = ''; if (!v) return;
    if (!BATTLE.g() || BATTLE.g().over) { UI.startBattle(); await wait(500); }
    const d = BATTLE.debug, G = BATTLE.g(), R = BATTLE.run(); if (!G.god) d.god(); R.coins = Math.max(R.coins, 300);
    const ks = Object.keys(DATA.skills); for (let i = 0; i < 3; i++) CAMP.learn({ kind: 'book', id: ks[(Math.random() * ks.length) | 0] }, true); CAMP.learn({ kind: 'item', id: 'whet' }, true);
    if (v === 'win') return d.win(); if (v === 'lose') { BATTLE.hero().hp = 0; G.god = false; return; }
    if (v === 'pr') return d.wave();
    if (!G.fe) { d.station(); await wait(900); }
    const f = BATTLE.g().fe; f.rest = null;
    if (v === 'fe') return; if (v === 'shop') { const h = BATTLE.hero(); h.x = f.mer.x + 4; h.y = f.mer.y; return; }
    if (v.startsWith('ev:')) return d.ev(v.slice(3));
    f.doors = []; d.rest(v === 'shop2' ? 'shop' : v); };
  box.appendChild(sel);
  hide.click();   // 默认收起，点「调试」展开（手机上不挡按钮）
  box.addEventListener('pointerdown', e => e.stopPropagation());
  addEventListener('DOMContentLoaded', () => document.body.appendChild(box)); if (document.body) document.body.appendChild(box);
  try { localStorage.setItem('xsyz-seenIntro', localStorage.getItem('xsyz-seenIntro') || ''); } catch (e) {}
})();

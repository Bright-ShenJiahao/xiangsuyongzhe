// 开发者面板：网址带 ?debug 才出现。首领出场、无敌、清场、升级、直接胜利、回血、跳过开场。
(() => {
  if (!/[?&]debug/.test(location.search)) return;
  // 11/27 调试面板重排：左上角小按钮，点开是分组面板（手机/PC 都在屏幕内，可滚动）
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:6px;top:6px;z-index:9999;font:12px Pix,monospace;max-width:calc(100vw - 12px)';
  const panel = document.createElement('div');
  panel.style.cssText = 'display:none;margin-top:4px;padding:8px;background:rgba(10,20,10,.92);border:1px solid #4a8a3a;max-height:calc(100vh - 60px);overflow:auto;width:min(420px,calc(100vw - 12px));box-sizing:border-box';
  const groups = {};
  const G0 = name => { if (groups[name]) return groups[name]; const h = document.createElement('div'); h.textContent = name; h.style.cssText = 'color:#ffd860;margin:6px 0 3px'; const g = document.createElement('div'); g.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px'; panel.append(h, g); return groups[name] = g; };
  let cur = '战斗';
  const B = (t, fn) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'font:inherit;padding:5px 7px;background:#1c2a1c;color:#8ef07a;border:1px solid #4a8a3a;cursor:pointer'; b.onclick = e => { e.stopPropagation(); fn(b); }; G0(cur).appendChild(b); return b; };
  const sec = n => { cur = n; };
  const tog = document.createElement('button'); tog.textContent = '调试 ▸'; tog.style.cssText = 'font:inherit;padding:4px 8px;background:#1c2a1c;color:#8ef07a;border:1px solid #4a8a3a;cursor:pointer;opacity:.8';
  tog.onclick = e => { e.stopPropagation(); const on = panel.style.display === 'none'; panel.style.display = on ? 'block' : 'none'; tog.textContent = on ? '调试 ▾' : '调试 ▸'; };
  box.append(tog, panel);
  const hide = { click() {} };
  sec('战斗');
  B('首领出场', () => UI.mod().debug.boss());
  B('无敌', b => { UI.mod().debug.god(); b.style.color = b.style.color === 'rgb(255, 216, 96)' ? '#8ef07a' : '#ffd860'; });
  B('清场', () => UI.mod().debug.clear());
  B('时间到', () => UI.mod().debug.skip());
  B('升级', () => UI.mod().debug.lvl());
  B('回血', () => UI.mod().debug.heal());
  sec('流程');
  B('本段胜利', () => UI.mod().debug.wave());
  B('进宫殿', () => UI.enterHub());
  B('本站胜利', () => UI.mod().debug.station());
  sec('转职');
  B('转职演练', () => { if (!BATTLE.active()) UI.startBattle(); const r = BATTLE.run(); r.slots[0] = { id: 'sword', lv: 7, xp: DATA.prof[6] }; r.slots[1] = { id: 'whirl', lv: 7, xp: DATA.prof[6] }; BATTLE.careerChanged(); UI.togglePause(true); });
  sec('物品 / 开局');
  B('给印记', () => UI.mod().debug.oath());
  B('直接胜利', () => UI.mod().debug.win());
  B('发装备', () => { CAMP.giveGear(); });
  sec('阿远人物实战对比');
  for(const [w,name,id] of [['sword','剑','sword'],['spear','枪','spear'],['bow','弓','bow'],['staff','法杖','staff'],['gun','掌机','g_fast'],['tome','圣典','t_page'],['scythe','镰刀','d_reap']]) {
    for(const variant of ['原版','GEMINI原色','旧版校色']) B(name+'·'+variant,()=>{
      const title=w[0].toUpperCase()+w.slice(1),set=variant==='原版'?(['tome','scythe'].includes(w)?'heroM2':w==='gun'?'heroHandheldPreview':'hero'):variant==='GEMINI原色'?'hero'+title+'Gemini2Raw':'hero'+title+'Gemini2Cal';
      window.AYUAN_SCYTHE_SET=null;window.AYUAN_TRY={weapon:w,set};const skill=DATA.weapons[w].start||id;UI.startBattle({weapon:w,book1:skill,hero:'m'});panel.style.display='none';tog.textContent='调试 ▸';
    });
  }
  sec('物品 / 开局');
  B('七武器动作对比', () => window.open('demo/hero-compare.html','_blank'));
  B('小凛新旧对比', () => window.open('demo/heroF-compare.html','_blank'));
  B('选人页', () => { try { BATTLE.stop(); } catch (e) {} for (const id of ['levelup', 'pause', 'result', 'camp']) { const e = document.getElementById(id); if (e) e.classList.remove('on'); } UI.openPrep(true); });
  B('直接开打', () => { if (window.UI) UI.startBattle(); });
  const poolSel = document.createElement('select'); poolSel.id = 'poolSkillDebug'; poolSel.style.cssText = 'font:inherit;background:#1c2a1c;color:#8fe8ff;max-width:190px;padding:4px';
  sec('技能');
  for (const sys of [...new Set(Object.values(DATA.skills).map(k=>k.sys))]) { const group=document.createElement('optgroup');group.label=sys;for(const id of Object.keys(DATA.skills).filter(id=>DATA.skills[id].sys===sys)){const o=document.createElement('option');o.value=id;o.textContent=DATA.skills[id].name;group.appendChild(o);}poolSel.appendChild(group); } G0('技能').appendChild(poolSel);
  const preparePool = id => { UI.startBattle({weapon:(DATA.weapons[DATA.skills[id].w]?DATA.skills[id].w:'sword'),book1:id,hero:'m'}); BATTLE.debug.god(); BATTLE.debug.skill(id); for(let i=0;i<4;i++)BATTLE.debug.spawn('goblin'); };
  poolSel.onchange=()=>preparePool(poolSel.value);
  B('演练所选技能',()=>preparePool(poolSel.value));
  B('释放所选技能一次',()=>{if(!BATTLE.active())preparePool(poolSel.value);BATTLE.debug.cast(poolSel.value);});
  sec('转职');
  for (const [label,ids] of [['掌机转职演练',['g_fast','g_spread']],['通用转职演练',['u_palm','u_sweep']],['圣典转职演练',['h_pages','h_sword']],['镰刀转职演练',['d_reap','d_return']]]) B(label,()=>{UI.startBattle({weapon:label.startsWith('掌机')?'gun':label.startsWith('圣典')?'tome':label.startsWith('镰刀')?'scythe':'sword',book1:ids[0],hero:'m'});const r=BATTLE.run();r.slots[0]={id:ids[0],lv:7,xp:DATA.prof[6]};r.slots[1]={id:ids[1],lv:7,xp:DATA.prof[6]};BATTLE.careerChanged();UI.togglePause(true);});
  const ensureBattle=()=>{if(!BATTLE.active())UI.startBattle();};
  function selector(group,id,values,action){sec(group);const select=document.createElement('select');select.id=id;select.style.cssText='font:inherit;background:#1c2a1c;color:#8fe8ff;max-width:210px;padding:5px';for(const [value,label] of values){const o=document.createElement('option');o.value=value;o.textContent=label;select.appendChild(o);}G0(group).appendChild(select);B('装备所选'+group,()=>{ensureBattle();action(select.value);});return select;}
  selector('宝物','itemDebug',DATA.startItems.map(i=>[i.id,i.name]),id=>{const r=BATTLE.run();r.gear=r.gear.map(o=>o?.id===id?null:o);r.bag=r.bag.map(o=>o?.id===id?null:o);if(id==='doll')r.dollUsed=0;r.gear[0]={kind:'item',id};BATTLE.recompute();});
  selector('誓约','oathDebug',Object.entries(DATA.oaths).filter(([id,o])=>!o.mv&&!o.retired).map(([id,o])=>[id,o.name]),id=>{const r=BATTLE.run(),w=DATA.oaths[id].w;if(w&&!JOBS.skills(r).some(s=>DATA.skills[s.id].w===w)){const sid=Object.keys(DATA.skills).find(k=>DATA.skills[k].w===w);r.slots[1]={id:sid,xp:0,lv:1};}r.oath[0]={kind:'oath',id,lv:1};BATTLE.recompute();});
  selector('身法','moveDebug',Object.entries(DATA.oaths).filter(([id,o])=>o.mv&&!o.retired).map(([id,o])=>[id,o.name]),id=>{BATTLE.run().mv[0]={kind:'oath',id,lv:1,mv:true};BATTLE.recompute();BATTLE.hero().rollN=2;});
  sec('战斗');B('受到10伤害',()=>{ensureBattle();BATTLE.debug.hurt(10);});B('受到致命伤害',()=>{ensureBattle();BATTLE.debug.hurt(BATTLE.hero().maxHp*3);});
  const nextFinals=Object.keys(JOBS.finals).filter(k=>k.includes('tome')||k.includes('scythe'));
  selector('最终职业','finalJobDebug',nextFinals.map(k=>[k,JOBS.finals[k][0]]),key=>{const r=BATTLE.run(),families=key.split('|');r.careerCount=0;r.finalCareer=false;r.slots.fill(null);r.bag.fill(null);for(let i=0;i<2;i++){const ids=Object.keys(DATA.skills).filter(id=>JOBS.family(DATA.skills[id])===families[i]);r.slots[i*2]={id:ids[0],xp:DATA.prof[6],lv:7};r.slots[i*2+1]={id:ids[1],xp:DATA.prof[6],lv:7};const book=JOBS.merge(r,r.slots[i*2],r.slots[i*2+1]);if(book)book.job.progress=JOBS.PROGRESS_MAX;}const books=r.slots.filter(b=>b?.job);if(books.length===2)JOBS.merge(r,books[0],books[1],true);BATTLE.careerChanged();UI.togglePause(true);});
  // 11/23 演练场：一键进入要看的场景（自动开一局、无敌、给钱给书）
  const sel = document.createElement('select'); sel.style.cssText = 'font:inherit;background:#1c2a1c;color:#ffd860;border:1px solid #4a8a3a;padding:3px';
  const SC = [['演练场 ▸', ''], ['跳到第 2 站', 'st2'], ['跳到第 3 站', 'st3'], ['跳到第 4 站', 'st4'], ['跳到第 5 站', 'st5'], ['跳到第 6 站', 'st6'], ['跳到第 7 站', 'st7'], ['跳到第 8 站', 'st8'], ['跳到第 9 站', 'st9'], ['站末结算场地', 'fe'], ['地精商店', 'shop'], ['休整：宝箱', 'chest'], ['休整：篝火', 'fire'], ['公主中途光球', 'pr'], ['通关结算', 'win'], ['败北结算', 'lose'], ...['rift_mer', 'fairy', 'knight', 'gamble', 'rift', 'kid', 'altar', 'feather'].map(id => ['奇遇：' + id, 'ev:' + id])];
  for (const [t, v] of SC) { const o = document.createElement('option'); o.textContent = t; o.value = v; sel.appendChild(o); }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  sel.onchange = async () => { const v = sel.value; sel.value = ''; if (!v) return;
    if (!BATTLE.g() || BATTLE.g().over) { UI.startBattle(); await wait(500); }
    if (/^st\d$/.test(v)) { const G0 = BATTLE.g(); G0.st = +v[2]; G0.wi = -1; G0.fe = null; G0.paused = false; BATTLE.nextWave(); return; }   // 11/25 直接跳到森林深处
    const d = BATTLE.debug, G = BATTLE.g(), R = BATTLE.run(); if (!G.god) d.god(); R.coins = Math.max(R.coins, 300);
    const ks = Object.keys(DATA.skills); for (let i = 0; i < 3; i++) CAMP.learn({ kind: 'book', id: ks[(Math.random() * ks.length) | 0] }, true); CAMP.learn({ kind: 'item', id: 'whet' }, true);
    if (v === 'win') return d.win(); if (v === 'lose') { BATTLE.hero().hp = 0; G.god = false; return; }
    if (v === 'pr') return d.wave();
    if (!G.fe) { d.station(); await wait(900); }
    const f = BATTLE.g().fe; f.rest = null;
    if (v === 'fe') return; if (v === 'shop') { const h = BATTLE.hero(); h.x = f.mer.x + 4; h.y = f.mer.y; return; }
    if (v.startsWith('ev:')) return d.ev(v.slice(3));
    f.doors = []; d.rest(v === 'shop2' ? 'shop' : v); };
  G0('流程').appendChild(sel);
  hide.click();   // 默认收起，点「调试」展开（手机上不挡按钮）
  box.addEventListener('pointerdown', e => e.stopPropagation());
  addEventListener('DOMContentLoaded', () => document.body.appendChild(box)); if (document.body) document.body.appendChild(box);
  try { localStorage.setItem('xsyz-seenIntro', localStorage.getItem('xsyz-seenIntro') || ''); } catch (e) {}
})();

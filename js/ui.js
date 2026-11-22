// 像素勇者 · 界面和流程：加载动画（boot.js）→ 主界面 → 备战页 → 战斗 → 结算。
// 主界面照三国终章排：左边大图（卧室），右边标题和「新的开始」，右上角 图鉴 / 设置 / 帮助。
// 备战页：起手兵器四选一、属性加点、现实习惯三选一、开局宝物三选一，技能栏 5 格（开 3 格）、物品栏 8 格。
(() => {
  const $ = id => document.getElementById(id), cv = $('cv'), ctx = cv.getContext('2d');
  const rd = Math.round;
  let screen = 'title', last = performance.now();
  const fieldImg = new Image(); fieldImg.crossOrigin = 'anonymous'; fieldImg.src = DATA.maps[0].img;
  try { if (localStorage.getItem('xsyz-title') !== 'old') document.getElementById('title').classList.add('t2', 'v' + (['8', '9', '10', '11'].includes(localStorage.getItem('xsyz-tart')) ? localStorage.getItem('xsyz-tart') : '11')); } catch (e) { document.getElementById('title').classList.add('t2'); }   // 11/22 新主界面（月夜 + 旧地图水彩），旧的可在调试面板切回
  const store = { get: k => { try { return localStorage.getItem('xsyz-' + k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem('xsyz-' + k, v); } catch (e) {} } };
  const touch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window; if (touch) document.body.classList.add('touch');
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function show(id) { screen = id; for (const e of document.querySelectorAll('.scr')) if (!e.classList.contains('over')) e.classList.toggle('on', e.id === id || (id === 'battle' && e.id === 'hud')); }
  const overlay = (id, on) => $(id).classList.toggle('on', on);

  // ================= 像素小图标（16×16） =================
  const ICON = {
    sword: ['..............ab', '.............abb', '............abb.', '...........abb..', '..........abb...', '.........abb....', '........abb.....', '...c...abb......', '...cc.abb.......', '....cabb........', '.....cc.........', '....dcc.........', '...dd..c........', '..dd............', '.dd.............', 'dd..............'],
    spear: ['..............bb', '.............bbb', '............bbb.', '...........eb...', '..........dd....', '.........dd.....', '........dd......', '.......dd.......', '......dd........', '.....dd.........', '....dd..........', '...dd...........', '..dd............', '.dd.............', 'dd..............', 'd...............'],
    bow: ['....dd..........', '...d..dd........', '..d.....dd......', '..d.......d.....', '.d.........d....', '.d.....bb...d...', 'd....bbbb...d...', 'd..aaaaaaaaaaaab', 'd....bbbb...d...', '.d.....bb...d...', '.d.........d....', '..d.......d.....', '..d.....dd......', '...d..dd........', '....dd..........', '................'],
    fire: ['.......e........', '......eee.......', '.....eeffe......', '....eeffffe.....', '...eefffggfe....', '..eefffggggfe...', '..effgggghhgfe..', '.eefggghhhhgfe..', '.efggghhhhhhgfe.', '.efgghhhhhhhgfe.', '.efgghhhhhhggfe.', '..efgghhhhggfe..', '..eefggggggfee..', '...eeffffffee...', '....eeeeeeee....', '................'],
  };
  const PAL = { a: '#3a2218', b: '#dfe4f0', c: '#c8862a', d: '#7a4a22', e: '#a02a10', f: '#e85a20', g: '#ffa030', h: '#fff2a0' };
  ICON.axe = ['..aaa...', '.abbba..', 'abbbbba.', 'abbbbbcc', '.abbbcc.', '..aacc..', '....cc..', '....c...'].flatMap(r => { const w = [...r].map(ch => ch + ch).join(''); return [w, w]; });
  PAL.i = '#8ad8ff'; PAL.j = '#e8f8ff';
  ICON.nova = Array.from({ length: 16 }, (_, y) => Array.from({ length: 16 }, (_, x) => { const d = Math.hypot(x - 7.5, y - 7.5); return d > 5.6 && d < 7.4 ? ((x + y) % 3 ? 'i' : 'j') : d < 2.2 ? 'j' : (d > 3.4 && d < 4.2 && (x * y) % 2 ? 'i' : '.'); }).join(''));
  ICON.axe = ICON.axe.map(r => r.replace(/c/g, 'd'));
  // 像素图标（art/ui，尺寸见 js/uiart.js）：k = 放大倍数
  const BOOK = { sword: 'bk_sword', spear: 'bk_spear', bow: 'bk_bow', fire: 'bk_staff', axe: 'bk_axe', nova: 'bk_nova' };
  function pi(name, k = 2) { if (name === 'end') name = 'guard';   // 耐力没有单独的图标，先用盾
    const im = new Image(); im.className = 'pi'; im.alt = ''; im.draggable = false; im.src = 'art/ui2/' + name + '.png'; const s = (window.UIART || {})[name]; if (s) { im.width = s[0] * k; im.height = s[1] * k; } return im; }
  const piH = (name, k) => pi(name, k).outerHTML;
  function iconCanvas(name) { return pi(BOOK[name] || name); }
  function iconCanvasOld(name) { const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); (ICON[name] || ICON.sword).forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') { g.fillStyle = PAL[ch]; g.fillRect(x, y, 1, 1); } })); return c; }

  // ================= 主界面 =================
  $('bStart').onclick = () => openPrep(true);
  // 11/22 图鉴展示用小人（art/figure/<key>/0..3.png，比战斗小人大、更精细），有就替换图鉴里的那一个
  const FIG = {}; fetch('art/figure/meta.json').then(r => r.json()).then(M => { for (const k in M) FIG[k] = M[k].map(([ax], i) => { const im = new Image(); im.src = `art/figure/${k}/${i}.png`; return { c: im, f: { ax } }; }); }).catch(() => {});

  const PANELS = {
    codex: ['图鉴', () => { const d = document.createElement('div'); d.className = 'codex';
      // 11/22 手办收藏式（铃兰角色一览）：等距立体底座 + 循环播放的像素小人。底座分档：勇者金 / 首领红 / 远程蓝 / 近战灰
      const PED = { gold: ['#ffe9a8', '#e0b04a', '#a8741c', '#fff6c8'], red: ['#f6c0b8', '#c8564a', '#8a2a24', '#ffe0d8'], blue: ['#cfe0ff', '#5a86d0', '#2c4f94', '#eef4ff'], grey: ['#f2ede4', '#b8ae9c', '#857a68', '#ffffff'] };
      const ped = (t, lab) => { const [top, l, r, hi] = PED[t]; return `<svg class="ped" viewBox="0 0 100 62"><ellipse cx="50" cy="56" rx="46" ry="7" fill="rgba(0,0,0,.18)"/>
        <polygon points="6,22 50,44 50,58 6,36" fill="${l}"/><polygon points="94,22 50,44 50,58 94,36" fill="${r}"/><polygon points="50,0 94,22 50,44 6,22" fill="${top}"/>
        <polyline points="6,22 50,44 94,22" fill="none" stroke="${hi}" stroke-width="1.6"/><polygon points="50,6 82,22 50,38 18,22" fill="none" stroke="${l}" stroke-width="1" opacity=".6"/>
        <polygon points="36,41 50,48 50,55 36,48" fill="${r}" stroke="${hi}" stroke-width=".8"/></svg>`; };
      const anims = [];
      const add = (set, names, name, note, tier, lab, figK) => { const e = document.createElement('div'); e.className = 'fig ' + tier; const st = document.createElement('div'); st.className = 'fst';
        const fr = FIG[figK] && FIG[figK].every(x => x.c.complete) ? FIG[figK] : names.map(n => Array.isArray(n) ? SPR.crop(set, n[0], n[1]) : SPR.crop(set, n)).filter(Boolean); if (fr === FIG[figK]) e.classList.add('big');

        // 11/22 按实际像素找脚：每帧最低的不透明行 = 脚底；第 1 帧脚底几行的中点 = 站位中心，其余帧按原锚点差值跟随（保留呼吸位移）
        const meas = f => { const w = f.c.naturalWidth || f.c.width, h = f.c.naturalHeight || f.c.height, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); g.drawImage(f.c, 0, 0); const D = g.getImageData(0, 0, w, h).data;
          let bot = 0; for (let y = h - 1; y >= 0 && !bot; y--) for (let x = 0; x < w; x++) if (D[(y * w + x) * 4 + 3] > 40) { bot = y + 1; break; }
          const xs = []; for (let y = Math.max(0, bot - 3); y < bot; y++) for (let x = 0; x < w; x++) if (D[(y * w + x) * 4 + 3] > 40) xs.push(x); xs.sort((p, q) => p - q);
          return { c: cv, w, h, bot, fx: xs.length ? (xs[0] + xs[xs.length - 1] + 1) / 2 : w / 2, ax: f.f.ax }; };
        const raw = fr; let fm = fr.length ? fr.map(meas) : []; if (fm.length) { const b0 = fm[0]; fm.forEach(m => { m.ax = b0.fx + (m.ax - b0.ax); }); }
        if (fm.length) { const fr = fm.map(m => ({ c: m.c, f: { ax: m.ax }, bot: m.bot })); const W = 2 * Math.ceil(Math.max(...fr.map(f => Math.max(f.f.ax, f.c.width - f.f.ax)))) + 2, H = Math.max(...fr.map(f => f.bot)), c = document.createElement('canvas'); c.width = W; c.height = H; { const k = raw === FIG[figK] ? 1.1 : 1.6, sc = Math.min(k, 80 / H, 124 / W); c.style.height = Math.round(H * sc) + 'px'; c.style.width = Math.round(W * sc) + 'px'; }   // 统一倍率，保留怪物本身大小差别
          st.appendChild(c); anims.push({ c, fr, i: 0 }); }
        st.insertAdjacentHTML('beforeend', ped(tier, lab)); e.appendChild(st); e.insertAdjacentHTML('beforeend', `<b>${name}</b><small>${note}</small>`); d.appendChild(e); };
      const draw = a => { const g = a.c.getContext('2d'), f = a.fr[a.i % a.fr.length]; g.clearRect(0, 0, a.c.width, a.c.height); g.drawImage(f.c, Math.round(a.c.width / 2 - f.f.ax), a.c.height - f.bot); };   // 按脚底锚点对齐底座中心
      for (const h of DATA.heroes) { const n = SPR.count(SPR.heroSet(h.id, 'sword'), 'sword.idle') || 1; add(SPR.heroSet(h.id, 'sword'), Array.from({ length: Math.max(2, n) }, (_, i) => ['sword.idle', i % n]), h.name, h.perk, 'gold', '勇者', h.id); }
      for (const [k, T] of Object.entries(DATA.enemies)) { const tier = T.boss ? 'red' : T.ranged ? 'blue' : 'grey'; add(k, ['idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'walk3'].filter(n => SPR.crop(k, n)), T.name, T.boss ? '首领' : T.ranged ? '远程' : '近战', tier, T.boss ? '首领' : T.ranged ? '远程' : '近战', k); }
      anims.forEach((a, i) => { a.i = i; draw(a); }); const tm = setInterval(() => { if (!d.isConnected) return clearInterval(tm); anims.forEach(a => { a.i++; draw(a); }); }, 400);
      return d; }],
    set: ['设置', () => { const d = document.createElement('div'); d.innerHTML = '<p style="color:#a89878">音量等设置以后加。</p>'; return d; }],
    help: ['帮助', () => { const d = document.createElement('div'); d.innerHTML = `<p>· 深夜两点，你被吸进了游戏机。打倒首领才能回去。</p>
      <p>· 移动：${touch ? '按住屏幕拖动' : 'WASD 或方向键'}；翻滚：${touch ? '右下角按钮' : '空格'}（翻滚时不会受伤）。</p>
      <p>· 技能按技能栏的顺序轮流自动放出，你只管走位。</p>
      <p>· 备战页：选起手兵器、加属性点、选一个现实习惯和一件开局宝物。</p>
      <p>· 暂停：${touch ? '右上角 II' : 'P 或 Esc'}。</p>`; return d; }],
  };
  for (const b of document.querySelectorAll('[data-panel]')) b.onclick = () => { const [t, fn] = PANELS[b.dataset.panel]; $('tpTitle').textContent = t; const body = $('tpBody'); body.innerHTML = ''; body.appendChild(fn()); overlay('tpanel', true); };
  $('tpClose').onclick = () => overlay('tpanel', false);

  // ================= 备战页 =================
  const P = { hero: 'm', weapon: 'sword', free: {}, habit: null, item: null, habitOpts: [], itemOpts: [], tab: 'w' };
  const attrsOf = () => { const o = {}; for (const a of DATA.attrs) o[a.id] = DATA.attrBase + (P.free[a.id] || 0); return o; };
  const used = () => Object.values(P.free).reduce((s, v) => s + v, 0);
  const build = () => ({ hero: P.hero, weapon: P.weapon, attrs: attrsOf(), item: P.item, habit: P.habit, pts: Math.max(0, DATA.attrFree - used()) });   // 没加完的点带进游戏，营地里再加
  function openPrep(fresh) {
    if (fresh || !P.itemOpts.length) {   // 新的一局：重新抽习惯和开局宝物，属性点清零（兵器记住上次选的）
      const w = store.get('weapon'); P.weapon = DATA.weapons[w] ? w : 'sword'; P.hero = store.get('hero') === 'f' ? 'f' : 'm';
      P.free = {}; P.habitOpts = shuffle(DATA.habits).slice(0, 3).map(h => h.id); P.itemOpts = shuffle(DATA.startItems).slice(0, 3).map(i => i.id);
      P.habit = null; P.item = null;   // 11/22 开局宝物删除   // 11/22 现实习惯删除：永远不选
 P.hrr = 0;
    }
    renderPrep(); setTab(P.tab); show('prep');
  }
  function setTab(t) { P.tab = t; $('prep').dataset.t = t; for (const b of $('ptabs').children) b.classList.toggle('on', b.dataset.t === t); for (const c of document.querySelectorAll('#prep .pc')) c.classList.toggle('on', c.dataset.t === t); }
  for (const b of $('ptabs').children) b.onclick = () => setTab(b.dataset.t);
  const pct = v => (v >= 0 ? '+' : '') + Math.round(v * 100) + '%';
  function renderPrep() {
    // 人物（男主 / 女主）：不锁兵器，各一个被动
    const cs = $('cSel'); cs.innerHTML = '';
    for (const h of DATA.heroes) { const b = document.createElement('button'); b.className = h.id === P.hero ? 'on' : ''; const cr = SPR.crop(SPR.heroSet(h.id, P.weapon), P.weapon + '.idle', 0); if (cr) b.appendChild(cr.c);
      b.insertAdjacentHTML('beforeend', `<span>${h.name}</span><small>${h.perk}</small>`); b.onclick = () => { P.hero = h.id; store.set('hero', h.id); renderPrep(); }; cs.appendChild(b); }
    { const h = DATA.heroes.find(x => x.id === P.hero), c0 = DATA.calc(build()), W0 = DATA.weapons[P.weapon];   // 11/22 角色卡（铃兰式：人物 + 属性 + 兵器槽）
      $('pPort').src = `art/portrait/${P.hero === 'f' ? 'f' : 'm'}.webp`;
      const PL = (ic, n, v) => `<div><span>${piH(ic, 1)}${n}</span><b>${v}</b></div>`, dmgA = W0.type === 'agi' ? 'agi' : W0.type === 'int' ? 'int' : 'str';
      $('hInfo').innerHTML = `<div class="pnName"><h5>${h.name}</h5><span>${h.desc}</span></div><div class="hperk">◆ 特长 · ${h.perk}</div>
        <div class="pills">${PL('hp', '生命', c0.hp)}${PL(dmgA, W0.name + '伤害', pct(c0.dmg - 1))}${PL('guard', '物防 / 魔防', c0.pdef + ' / ' + c0.mdef)}${PL('move', '移速', pct(c0.move - 1))}${PL('crit', '暴击率', Math.round(c0.crit * 100) + '%')}${PL('xp', '经验', pct(c0.xp - 1))}</div>`; }
    // 起手兵器
    const ws = $('wSel'); ws.innerHTML = '';
    for (const [id, w] of Object.entries(DATA.weapons)) { const b = document.createElement('button'); b.className = id === P.weapon ? 'on' : ''; b.appendChild(iconCanvas(w.icon)); b.insertAdjacentHTML('beforeend', `<span>${w.name}</span>`); b.onclick = () => { P.weapon = id; store.set('weapon', id); heroSwing = .6; renderPrep(); }; ws.appendChild(b); }
    const W = DATA.weapons[P.weapon], SK0 = DATA.skills[P.weapon] || {}, AT = DATA.attrs.find(a => a.id === W.type);   // 11/22 起手技能介绍（铃兰式：上面选兵器，下面讲技能）
    $('wDesc').innerHTML = `<div class="skI"><div class="skIc">${iconCanvas(W.icon).outerHTML}</div><div class="skIb"><div class="skIt"><b>${SK0.name || W.skill}</b><em>${SK0.dt === 'magic' ? '魔法' : '物理'}</em><em>吃「${AT.name}」</em></div><p>${SK0.desc || W.desc}</p></div></div>
      <ul class="skLv">${['l3', 'l5', 'l7'].filter(k => SK0[k]).map(k => `<li><i>Lv${k.slice(1)}</i>${SK0[k]}</li>`).join('')}</ul>`;
    // 属性
    const c = DATA.calc(build()), left = DATA.attrFree - used(); $("aLeft").textContent = left ? `剩余 ${left} 点（可带进游戏）` : "剩余 0 点";
    const ar = $('aRows'); ar.innerHTML = '';
    for (const a of DATA.attrs) {
      const base = DATA.attrBase + (P.free[a.id] || 0), fin = c.A[a.id], cls = fin > base ? 'up' : fin < base ? 'dn' : '';
      const r = document.createElement('div'); r.className = 'arow';
      r.innerHTML = `<b>${piH(a.id, 1)}${a.name}</b><small>${a.desc}</small><button ${P.free[a.id] ? '' : 'disabled'}>−</button><button ${left ? '' : 'disabled'}>＋</button><em class="${cls}">${fin}</em>`;
      const [m, p] = r.querySelectorAll('button'); m.onclick = () => { P.free[a.id]--; renderPrep(); }; p.onclick = () => { P.free[a.id] = (P.free[a.id] || 0) + 1; renderPrep(); };
      ar.appendChild(r);
    }
    $('aStats').innerHTML = `<span>生命</span><b>${c.hp}</b><span>${W.name}伤害</span><b>${pct(c.dmg - 1)}</b><span>出手速度</span><b>${pct(c.spd - 1)}</b><span>范围</span><b>${pct(c.area - 1)}</b><span>暴击率</span><b>${Math.round(c.crit * 100)}%</b><span>物防 / 魔防</span><b>${c.pdef} / ${c.mdef}</b><span>移速</span><b>${pct(c.move - 1)}</b><span>经验</span><b>${pct(c.xp - 1)}</b>`;
    // 现实习惯：三选一，也可以不选
    const hs = $('hSel'); hs.innerHTML = '';
    for (const id of P.habitOpts) { const h = DATA.habits.find(x => x.id === id), d = document.createElement('div'); d.className = id === P.habit ? 'on' : ''; d.innerHTML = `<b>${h.name}</b><i>${h.good}</i><u>${h.bad}</u><small>${h.line}</small>`; d.onclick = () => { P.habit = P.habit === id ? null : id; renderPrep(); }; hs.appendChild(d); }
    const no = document.createElement('div'); no.className = 'none' + (P.habit ? '' : ' on'); no.textContent = '不选习惯'; no.onclick = () => { P.habit = null; renderPrep(); }; hs.appendChild(no);
    const HRR = 2, rr = document.createElement('div'); rr.className = 'none reroll' + (P.hrr >= HRR ? ' off' : ''); rr.textContent = `换一批 (${HRR - P.hrr}/${HRR})`;   // 习惯可以换 2 次
    rr.onclick = () => { if (P.hrr >= HRR) return; P.hrr++; P.habit = null; P.habitOpts = shuffle(DATA.habits.filter(h => !P.habitOpts.includes(h.id))).slice(0, 3).map(h => h.id); renderPrep(); }; hs.appendChild(rr);
    // 技能栏：5 格，开 3 格；第 1 格是起手招
    const sl = $('sSlots'); sl.innerHTML = '';
    for (let i = 0; i < DATA.slotsMax; i++) { const d = document.createElement('div'); d.innerHTML = `<u>${i + 1}</u>`;
      if (i === 0) { d.className = 'slot has'; d.appendChild(iconCanvas(W.icon)); d.insertAdjacentHTML('beforeend', `<span>${W.skill}</span>`); d.title = W.desc; }
      else if (i < DATA.slotsOpen) { d.className = 'slot'; d.insertAdjacentHTML('beforeend', '空'); }
      else d.className = 'slot lock';
      sl.appendChild(d); }
    // 开局宝物 + 物品栏
    const is = $('iSel'); is.innerHTML = '';
    for (const id of P.itemOpts) { const it = DATA.startItems.find(x => x.id === id), d = document.createElement('div'); d.className = id === P.item ? 'on' : ''; d.innerHTML = `${piH(it.id)}<b>${it.name}</b><small>${it.desc}</small>`; d.onclick = () => { P.item = id; renderPrep(); }; is.appendChild(d); }
    const bag = $('bag'); bag.innerHTML = ''; const it = DATA.startItems.find(x => x.id === P.item);
    for (let i = 0; i < DATA.bagSize; i++) { const d = document.createElement('div'); if (i === 0 && it) { d.className = 'has'; d.appendChild(pi(it.id)); d.title = it.name + '：' + it.desc; } bag.appendChild(d); }
    $('pTip').textContent = '空技能格要在路上拿技能书来填；第 4、5 格以后靠奖励打开。';
  }
  $('aReset').onclick = () => { P.free = {}; renderPrep(); };
  $('pBack').onclick = () => show('title');
  $('pGo').onclick = () => startBattle(build());
  let heroSwing = 0;
  function drawHeroPreview(t, dt) {
    const c = $('heroCv'), r = c.getBoundingClientRect(); if (!r.width || !r.height) return;
    const dpr = Math.min(3, devicePixelRatio || 1), W = rd(r.width * dpr), H = rd(r.height * dpr);
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; } const g = c.getContext('2d'); g.clearRect(0, 0, W, H); g.imageSmoothingEnabled = false;
    const u = Math.max(1, Math.floor(Math.min(H * .8 / 45, W * .8 / 50))); heroSwing -= dt;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(W / 2, H * .9, 14 * u, 3.5 * u, 0, 0, 7); g.fill();
    const hs = SPR.heroSet(P.hero, P.weapon), swing = heroSwing > 0, n = swing ? 'atk' : 'idle', i = swing ? Math.floor((.6 - heroSwing) / .6 * SPR.count(hs, 'atk')) : Math.floor(t * 3) % Math.max(1, SPR.count(hs, 'idle'));
    SPR.drawHero(g, n, i, W / 2, H * .9, false, u, { w: P.weapon, c: P.hero });   // 备战页预览：拿选中的起手兵器
  }
  function drawMenuBg(t) {   // 备战页背景：游戏里的打谷场，压暗
    const W = cv.width, H = cv.height; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#120c18'; ctx.fillRect(0, 0, W, H);
    if (fieldImg.complete && fieldImg.naturalWidth) { const s = Math.max(W / fieldImg.width, H / fieldImg.height) * 1.04, dw = fieldImg.width * s, dh = fieldImg.height * s; ctx.imageSmoothingEnabled = true; ctx.drawImage(fieldImg, (W - dw) / 2 + Math.sin(t * .2) * W * .01, (H - dh) / 2, dw, dh); }
    ctx.fillStyle = 'rgba(16,8,20,.55)'; ctx.fillRect(0, 0, W, H);
  }

  // ================= 战斗 =================
  let lastBuild = null, tipT = 0, HC = {};
  function startBattle(b) {
    lastBuild = b || lastBuild || build(); HC = {};
    BATTLE.start({ weapon: lastBuild.weapon, map: 'field', build: lastBuild }); show('battle'); for (const id of ['levelup', 'pause', 'result', 'camp']) overlay(id, false); tipT = 6;
  }
  const set = (id, prop, v) => { if (HC[id + prop] === v) return; HC[id + prop] = v; const e = $(id); if (prop === 'text') e.textContent = v; else if (prop === 'html') e.innerHTML = v; else if (prop === 'w') e.style.width = v; else if (prop === 'show') e.style.display = v ? 'block' : 'none'; else if (prop === 'cls') e.className = v; };
  const mmss = t => { t = Math.max(0, Math.ceil(t)); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };
  function hud(h) {
    set('hpBar', 'w', (h.hp / h.maxHp * 100).toFixed(1) + '%'); set('hpTxt', 'text', `${Math.ceil(h.hp)} / ${h.maxHp}`);
    set('lvTxt', 'text', 'Lv ' + h.lv); set('xpBar', 'w', h.need ? (h.xp / h.need * 100).toFixed(1) + '%' : '100%');
    set('clock', 'text', h.bossWave ? '首领站 · 首领战！' : `第 ${h.st}/${h.sts} 站 · 第 ${h.wi + 1}/3 波 · ${h.left == null ? '' : mmss(h.left)}`);
    set('clock', 'cls', h.left != null && h.left < 5.5 && !h.bossWave ? 'warn' : '');
    set('kills', 'html', piH('kill', 1) + ' ' + h.kills); set('coins', 'html', piH('coin', 1) + ' ' + h.coins);
    const sk = JSON.stringify([h.slots, h.open, h.next]);
    if (HC.sbar !== sk) { HC.sbar = sk; const bar = $('sbar'); bar.innerHTML = ''; h.slots.forEach((s, i) => { const d = document.createElement('div'); d.className = 'sb' + (i >= h.open ? ' lock' : '') + (i === h.next ? ' nx' : ''); if (s && i < h.open) { d.classList.add('tr', 't' + DATA.skills[s.id].tier); d.appendChild(iconCanvas(DATA.skills[s.id].icon)); { const L = BATTLE.profL(s); if (L) d.insertAdjacentHTML('beforeend', `<i>${L}</i>`); } } bar.appendChild(d); }); } set('bossName', 'text', h.bossName || '哥布林王');
    set('bossBox', 'show', h.boss != null); if (h.boss != null) set('bossBar', 'w', (h.boss * 100).toFixed(1) + '%');
    set('lvUp', 'cls', '');   // 11/22：升级字改成画在勇者头上，角落的不再显示
    // 右下角翻滚按钮：冷却时一圈暗色扇面倒转，中间显示剩余秒数
    const rp = Math.round(h.roll * 60) / 60; if (HC.rollP !== rp) { HC.rollP = rp; $('rollCd').style.setProperty('--p', rp); }
    set('rollT', 'text', h.rollT > .05 ? h.rollT.toFixed(1) : ''); set('bRoll', 'cls', 'btn round' + (h.rollT > .05 ? ' cd' : ''));
    set('banner', 'text', h.banner || ''); set('banner', 'show', !!h.banner);
    set('tip', 'text', tipT > 0 ? (touch ? '按住屏幕拖动走位 · 右下角翻滚 · 技能自动出手' : 'WASD / 方向键移动 · 空格翻滚 · 技能自动出手 · P 暂停') : '');
  }
  function levelUp(list, done) {
    $('luTitle').textContent = '升级！'; const box = $('ups'); box.innerHTML = '';
    for (const o of list) { const d = document.createElement('div'); d.className = 'up'; d.innerHTML = `<b>${o.name}</b><span>${o.desc}</span>`; d.onclick = () => { overlay('levelup', false); done(o.id); }; box.appendChild(d); }
    overlay('levelup', true);
  }
  function togglePause(force) {
    if (screen !== 'battle' || !BATTLE.active() || $('levelup').classList.contains('on') || $('route').classList.contains('on') || (window.CAMP && CAMP.isOpen())) return;
    const on = force != null ? force : !$('pause').classList.contains('on'); if (!on) CAMP.commit(); BATTLE.pause(on); overlay('pause', on); if (on) CAMP.pauseOpen();
  }
  $('bPause').onclick = () => togglePause(); $('pRes').onclick = () => { CAMP.commit(); togglePause(false); };
  $('pRe').onclick = () => startBattle(lastBuild); $('pHome').onclick = () => { BATTLE.stop(); overlay('pause', false); show('title'); };
  const waveEnd = r => CAMP.open(r);
  // 一站打完：三张站点卡选一张（月圆之夜式，11/22）。卡：名字 · 等级/类型 · 圆形头像 · 说明 · 按钮
  function avatar(c) { const w = document.createElement('div'); w.className = 'rav';
    if (c.av) { const cr = SPR.crop(c.av, 'idle0') || SPR.crop(c.av, 'walk0'); if (cr) { const k = Math.min(2.4, 64 / cr.c.height, 84 / cr.c.width); cr.c.style.width = cr.c.width * k + 'px'; cr.c.style.height = cr.c.height * k + 'px'; w.appendChild(cr.c); } }
    else w.appendChild(pi(c.icon, 3)); return w; }
  function route(o, done) {
    $('rtTitle').innerHTML = `选择第 ${o.st} 站${o.rests != null ? ` <small>休整还剩 ${o.rests} 次</small>` : ''}`; const box = $('rtCards'); box.innerHTML = ''; box.className = 'rcards';
    for (const c of o.cards) { const d = document.createElement('div'); d.className = 'rcard k-' + c.k + (c.rest ? ' rest' : '');
      d.innerHTML = `<b>${c.name}</b><small>${c.sub || ''}</small>`; d.appendChild(avatar(c)); d.insertAdjacentHTML('beforeend', `<p>${c.desc}</p><button class="btn mini gold">${c.btn || '前往'}</button>`);
      d.onclick = () => { overlay('route', false); done(c); }; box.appendChild(d); }
    overlay('route', true);
  }
  // 奇遇：描述 + 两个选项；选完显示结果，点继续回到选站
  function event(E, pickFn, back) {
    $('rtTitle').innerHTML = '奇遇'; const box = $('rtCards'); box.innerHTML = ''; box.className = 'rcards ev';
    const d = document.createElement('div'); d.className = 'evbox'; d.innerHTML = `<b>${E.name}</b><p>${E.desc}</p>`; const ops = document.createElement('div'); ops.className = 'evops'; d.appendChild(ops);
    E.opts.forEach(([label, hint], i) => { const b = document.createElement('button'); b.className = 'btn' + (i ? '' : ' gold'); b.innerHTML = `${label}<small>${hint}</small>`;
      b.onclick = () => { const res = pickFn(i); ops.innerHTML = `<p class="evres">${res}</p>`; const go = document.createElement('button'); go.className = 'btn gold'; go.textContent = '继续 ▶'; go.onclick = () => { overlay('route', false); back(); }; ops.appendChild(go); }; ops.appendChild(b); });
    box.appendChild(d); overlay('route', true);
  }
  let toastT = 0; function toast(s) { const e = $('toast'); e.textContent = s; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), 1800); }
  $('bRoll').addEventListener('pointerdown', e => { e.stopPropagation(); BATTLE.roll(); });
  // 11/22 卡带世界地图：打完一章出来，已通关的亮、下一章可选、其余被乱码盖着
  function worldMap(done) {   // 11/22 势力地图：领地染色 + 旗帜 + 关系；已平定的亮、下一章可选、其余锁着
    const box = $('wmNodes'); box.innerHTML = ''; let pick = null; const cleared = 1;
    $('wmTitle').textContent = '世界势力 · 选择下一章'; $('wmGo').disabled = true; $('wmHint').textContent = '点地图上的旗帜';
    const flag = (o, st, rel) => `<div class="wf" style="--fc:${o.c}"><em>${o.sym}</em></div><b>${o.name}</b><small class="rel r-${rel}">${rel}</small>`;
    for (const c of DATA.chapters) { const z = document.createElement('div'); z.className = 'wmz'; Object.assign(z.style, { left: (c.x - c.rx) * 100 + '%', top: (c.y - c.ry) * 100 + '%', width: c.rx * 200 + '%', height: c.ry * 200 + '%', '--fc': c.c }); box.appendChild(z); }
    const cap = document.createElement('div'); cap.className = 'wmn cap'; cap.style.left = DATA.capital.x * 100 + '%'; cap.style.top = DATA.capital.y * 100 + '%'; cap.innerHTML = flag(DATA.capital, '', DATA.capital.rel); cap.onclick = () => toast('王都 · 公主在这里等你'); box.appendChild(cap);
    DATA.chapters.forEach(c => { const d = document.createElement('div'), st = c.id <= cleared ? 'done' : c.id === cleared + 1 ? 'next' : 'lock', rel = st === 'done' ? '已平定' : c.rel;
      d.className = 'wmn ' + st; d.style.left = c.x * 100 + '%'; d.style.top = c.y * 100 + '%'; d.innerHTML = flag(c, st, rel);
      d.onclick = () => { if (st === 'lock') return toast(`第 ${c.id} 章 · ${c.land}：先打通前面的章节`); if (st === 'done') return toast('这里已经恢复平静了');
        for (const x of box.children) x.classList.remove('sel'); d.classList.add('sel'); pick = c; $('wmHint').textContent = `第 ${c.id} 章「${c.name}」· ${c.land} · 首领 ${c.boss}（制作中）`; $('wmGo').disabled = false; };
      box.appendChild(d); });
    $('wmGo').onclick = () => { overlay('wmap', false); done(pick); }; overlay('wmap', true);
    const sc = $('wmScroll'); sc.scrollLeft = (sc.scrollWidth - sc.clientWidth) * .45;
  }
  function result(r) {
    if (r.win && !r.mapShown) return worldMap(() => result(Object.assign({}, r, { mapShown: true })));
    $('rTitle').textContent = r.win ? '胜利！' : '败北……';
    $('rMsg').textContent = r.win ? '哥布林王倒下了，屏幕那头好像传来了「下一关」的音乐。' : '眼前一黑……再按一次开始键吧。';
    const best = Object.entries(r.dmg || {}).sort((a, b) => b[1] - a[1])[0];
    $('rStats').innerHTML = `<span>打到</span><b>${r.win ? '通关' : r.boss ? '首领战' : `第 ${r.st} 站 第 ${Math.max(0, r.wi) + 1} 波`}</b><span>用时</span><b>${mmss(r.time)}</b><span>击倒</span><b>${r.kills}</b><span>等级</span><b>Lv ${r.lv}</b>${best ? `<span>主力</span><b>${DATA.skills[best[0]].name}</b>` : ''}`;
    overlay('result', true);
  }
  $('rAgain').onclick = () => startBattle(lastBuild);
  $('rWep').onclick = () => { BATTLE.stop(); overlay('result', false); openPrep(false); };
  $('rHome').onclick = () => { BATTLE.stop(); overlay('result', false); show('title'); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) togglePause(true); });

  // ================= 主循环 =================
  let T = 0;
  function loop(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now; T += dt;
    if (screen === 'battle') { BATTLE.frame(dt); if (tipT > 0) tipT -= dt; }
    else if (screen === 'prep') { drawMenuBg(T); drawHeroPreview(T, dt); }
    else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#07101b'; ctx.fillRect(0, 0, cv.width, cv.height); }
    requestAnimationFrame(loop);
  }
  window.UI = { mod: () => BATTLE, hud, levelUp, result, waveEnd, route, event, toast, icon: iconCanvas, pi, piH, togglePause, show, startBattle, openPrep, get screen() { return screen; } };
  BATTLE.init(cv);
  const prog = v => { const b = document.getElementById('tbar'); if (b) b.style.width = Math.round(v * 100) + '%'; }; prog(.3);   // 11/22：不要加载页，主界面上直接载入
  // 界面图（旧地图底、框件）在加载页里一起载完，进了页面就不会晚一拍才出来
  const UIPRE = ['map.webp', 'panel.png', 'card.png', 'q0.png', 'q1.png', 'q2.png', 'q3.png', 'slot.png', 'slot_sel.png', 'slot_lock.png', 'cell.png', 'btn.png', 'btn_gold.png', 'tab.png', 'tab_on.png', 'bar.png', 'pause.png', 'divider.png']
    .concat(Object.keys(window.UIART || {}).filter(k => (window.UIART[k][0] || 0) < 60).map(k => k + '.png'));
  const preUI = () => Promise.all([...new Set(UIPRE)].map(f => new Promise(ok => { const im = new Image(); im.onload = im.onerror = ok; im.src = 'art/ui2/' + f; (window.__ui = window.__ui || []).push(im); })));
  Promise.all([SPR.load(), preUI(), document.fonts ? document.fonts.load('20px WenKai').catch(() => {}) : 0, ...['m', 'f'].map(k => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = 'art/portrait/' + k + '.webp'; }))]).then(() => { prog(1); document.getElementById('tload').classList.add('done'); $('bStart').disabled = false; show('title'); requestAnimationFrame(loop); })
    .catch(e => { console.error(e); document.getElementById('ttx').textContent = '载入失败，请刷新'; });
})();

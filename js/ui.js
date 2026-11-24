// 像素勇者 · 界面和流程：加载动画（boot.js）→ 主界面 → 备战页 → 战斗 → 结算。
// 主界面照三国终章排：左边大图（卧室），右边标题和「新的开始」，右上角 图鉴 / 设置 / 帮助。
// 备战页：起手兵器四选一、属性加点、现实习惯三选一、开局宝物三选一，技能栏 5 格（开 3 格）、物品栏 8 格。
(() => {
  const $ = id => document.getElementById(id), cv = $('cv'), ctx = cv.getContext('2d');
  const rd = Math.round;
  let screen = 'title', last = performance.now();
  const fieldImg = new Image(); fieldImg.crossOrigin = 'anonymous'; fieldImg.src = DATA.maps[0].img;
  document.getElementById('title').classList.add('t2', 'v13');   // 11/22 主界面定稿：精致像素三人月夜（art13），其余方案在 art/src/title_archive
  const store = { get: k => { try { return localStorage.getItem('xsyz-' + k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem('xsyz-' + k, v); } catch (e) {} } };
  const touch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window; if (touch) document.body.classList.add('touch');
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function show(id) { screen = id; if (id === 'title') setTimeout(() => { try { contShow(); } catch (e) {} }); for (const e of document.querySelectorAll('.scr')) if (!e.classList.contains('over')) e.classList.toggle('on', e.id === id || (id === 'battle' && e.id === 'hud')); }
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
  // 11/22 技能书：同一系共用一本（剑 / 枪 / 弓 / 法杖）；技能图标：每个技能单独一张 art/ui2/sk/<id>.png
  const BOOK = { sword: 'bk_sword', spear: 'bk_spear', bow: 'bk_bow', fire: 'bk_wand', nova: 'bk_wand', wand: 'bk_wand', staff: 'bk_wand', axe: 'bk_axe' };
  const SYSBK = { '剑': 'bk_sword', '枪': 'bk_spear', '弓': 'bk_bow', '法杖': 'bk_wand' };
  const bookOf = id => pi(SYSBK[(DATA.skills[id] || {}).sys] || 'bk_sword'), skIcon = id => { const im = pi('sk/' + id); im.classList.add('skic'); return im; };
  function pi(name, k = 2) { if (name === 'end') name = 'amulet';   // 11/23 耐力用护身符图标，和物防的盾分开
    const im = new Image(); im.className = 'pi'; im.alt = ''; im.draggable = false; im.src = 'art/ui2/' + name + '.png'; const s = (window.UIART || {})[name]; if (s) { im.width = s[0] * k; im.height = s[1] * k; } return im; }
  const piH = (name, k) => pi(name, k).outerHTML;
  function iconCanvas(name) { return pi(BOOK[name] || name); }
  function iconCanvasOld(name) { const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); (ICON[name] || ICON.sword).forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') { g.fillStyle = PAL[ch]; g.fillRect(x, y, 1, 1); } })); return c; }

  // ================= 主界面 =================
  const tvOff = go => { const t = $('title'); if (t.classList.contains('tvoff')) return; t.classList.add('tvoff'); document.body.classList.add('tvbg'); setTimeout(() => { t.classList.remove('tvoff'); document.body.classList.remove('tvbg'); go(); }, 560); };
  // 11/24 存档位：继续游戏 = 选存档 → 宫殿；新的游戏 = 选空位 → 选人 → 塔顶开场
  function slotPick(mode) { $('slotT').textContent = '选择存档'; $('slotForm').hidden = true; $('sCon').parentNode.classList.remove('on'); const row = $('slotRow'); row.innerHTML = '';
    for (let n = 1; n <= SLOT.N; n++) { const has = SLOT.has(n), I = SLOT.info(n), b = document.createElement('button'); b.className = 'cart'; b.dataset.n = n;
      b.innerHTML = `<img src="art/ui2/save/${has ? 'cart_gold' : 'cart'}.png" alt=""><div class="lab">${has ? `<div class="ph"><img class="av" src="art/portrait/${I.hero}.webp" alt=""><b>${I.name.replace(/[<>&]/g, '')}</b></div><span>💎 ${I.cry} · ${I.best >= 99 ? '通关' : I.best ? '第 ' + I.best + ' 站' : '—'}</span><span>通关 ${I.wins} · 倒下 ${I.deaths}</span>` : '<span class="no">空存档</span>'}</div>${has && I.run ? '<i class="rled" title="有一局没打完"></i>' : ''}<span class="tag">存档 ${n}${has && I.run ? ' · 没打完' : ''}</span>${has ? '<span class="del">删除</span>' : ''}`;
      if (has) b.querySelector('.del').onclick = e => { e.stopPropagation(); if (confirm(`删除存档 ${n}「${I.name}」？水晶、强化、称号都会清空，不能恢复。`)) { SLOT.wipe(n); slotPick(); } };
      b.onclick = () => { row.querySelectorAll('.cart').forEach(c => c.classList.toggle('sel', c === b)); insertCart(b, () => slotForm(n, has)); };
      row.appendChild(b); }
    overlay('slotScr', true); }
  // 选中的卡带飞进游戏机卡槽，电源灯亮
  function insertCart(b, done) { const r = b.getBoundingClientRect(), c = $('sCon').getBoundingClientRect(), f = b.querySelector('img').cloneNode(); f.className = 'flyCart'; Object.assign(f.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px' }); document.body.appendChild(f);
    const tx = c.left + c.width * .5 - (r.left + r.width / 2), ty = c.top + c.height * .28 - (r.top + r.height * .85), sc = (c.width * .46) / r.width;
    requestAnimationFrame(() => { f.style.transform = `translate(${tx}px, ${ty}px) scale(${sc})`; f.style.opacity = 0; });
    setTimeout(() => { f.remove(); $('sCon').parentNode.classList.add('on'); try { SFX.play('pick'); } catch (e) {} done(); }, 460); }
  // 新存档：先起名字和口令 → 选人 → 塔顶开场
  // 11/24 插好卡带后：输入名字和口令（口令可以不输）。旧卡带要对上名字和口令，空卡带就新建
  const pinHash = async (name, pin) => { if (!pin) return ''; try { const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('xsyz|' + name + '|' + pin)); return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join(''); } catch (e) { return pin; } };
  function slotForm(n, has) { $('slotForm').hidden = false; $('slotT').textContent = has ? `存档 ${n} · 输入名字和口令` : `存档 ${n} · 新的勇者`; $('sErr').textContent = ''; $('sName').value = ''; $('sPin').value = ''; setTimeout(() => $('sName').focus(), 50);
    $('sBack').onclick = () => slotPick();
    $('sName').oninput = () => { if (has) return; const L = $('slotRow').querySelector(`.cart[data-n="${n}"] .lab`); if (L) L.innerHTML = `<b>${$('sName').value.replace(/[<>&]/g, '') || '……'}</b><span>新的勇者</span>`; };
    $('sOk').onclick = async () => { const name = $('sName').value.trim().replace(/[<>&"'`\\]/g, ''), pin = $('sPin').value.trim();
      if (!name) return $('sErr').textContent = '请输入勇者的名字';
      const h = await pinHash(name, pin);
      if (has) { const raw = k => localStorage.getItem('xsyz-s' + n + '-' + k), nm = raw('name'), ph = raw('pin') || '';
        if (nm && nm !== name) return $('sErr').textContent = '名字不对';
        if (ph && ph !== h) return $('sErr').textContent = '口令不对';
        SLOT.use(n); if (!nm) store.set('name', name); overlay('slotScr', false);
        return tvOff(() => { const s = BATTLE.loadSave(); openHub('', () => { if (s) { lastBuild = s.opt.build || lastBuild; HC = {}; BATTLE.start(Object.assign({}, s.opt, { resume: s })); show('battle'); for (const id of ['levelup', 'pause', 'result', 'camp']) overlay(id, false); } else { openPrep(true); startBattle(build()); } }); }); }
      SLOT.use(n); SLOT.wipe(n); store.set('name', name); store.set('pin', h); overlay('slotScr', false); tvOff(() => openPrep(true)); };
    for (const id of ['sName', 'sPin']) $(id).onkeydown = e => { if (e.key === 'Enter') $('sOk').click(); }; }
  $('slotX').onclick = () => overlay('slotScr', false);
  $('bStart').onclick = () => slotPick();   // 11/24 只留「进入游戏」：旧卡带=直接开始，空卡带=起名字从零开始
  const contShow = () => { $('bCont').hidden = true; $('bStart').querySelector('span').textContent = '进入游戏'; };
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
      // 11/23 手办按游戏里战斗小人的身高缩放（普通哥布林 = 1），保留大小关系
      const fh = (st, n) => { const f = st && SPR.sets[st] && SPR.frame(st, n); return f ? f.h * (SPR.sets[st].sk || 1) : 0; }, GREF = fh('goblin', 'idle0') || 40;
      const gameH = (set, k) => { const h = k === 'm' || k === 'f' || k === 'p' ? fh(SPR.heroSet(k, k === 'p' ? 'staff' : 'sword'), (k === 'p' ? 'staff' : 'sword') + '.idle') : fh(set || k, 'idle0'); return h ? h / GREF : 1; };
      const add = (set, names, name, note, tier, lab, figK) => { const e = document.createElement('div'); e.className = 'fig ' + tier; e.dataset.k = figK; const st = document.createElement('div'); st.className = 'fst';
        const fr = FIG[figK] && FIG[figK].every(x => x.c.complete) ? FIG[figK] : (set ? names.map(n => Array.isArray(n) ? SPR.crop(set, n[0], n[1]) : SPR.crop(set, n)).filter(Boolean) : []); if (fr === FIG[figK]) e.classList.add('big');

        // 11/22 按实际像素找脚：每帧最低的不透明行 = 脚底；第 1 帧脚底几行的中点 = 站位中心，其余帧按原锚点差值跟随（保留呼吸位移）
        const meas = f => { const w = f.c.naturalWidth || f.c.width, h = f.c.naturalHeight || f.c.height, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); g.drawImage(f.c, 0, 0); let D; try { D = g.getImageData(0, 0, w, h).data; } catch (e) { return { c: cv, w, h, bot: h, fx: f.f.ax, ax: f.f.ax }; }
          let bot = 0; for (let y = h - 1; y >= 0 && !bot; y--) for (let x = 0; x < w; x++) if (D[(y * w + x) * 4 + 3] > 40) { bot = y + 1; break; }
          const xs = []; for (let y = Math.max(0, bot - 3); y < bot; y++) for (let x = 0; x < w; x++) if (D[(y * w + x) * 4 + 3] > 40) xs.push(x); xs.sort((p, q) => p - q);
          if (!bot) return { c: f.c, w, h, bot: h, fx: f.f.ax, ax: f.f.ax, lazy: 1 };
          return { c: cv, w, h, bot, fx: xs.length ? (xs[0] + xs[xs.length - 1] + 1) / 2 : w / 2, ax: f.f.ax }; };
        const raw = fr; let fm = fr.length ? fr.map(meas) : []; if (fm.length) { const b0 = fm[0]; fm.forEach(m => { m.ax = b0.fx + (m.ax - b0.ax); }); }
        if (fm.length) { const fr = fm.map(m => ({ c: m.c, f: { ax: m.ax }, bot: m.bot })); const W = 2 * Math.ceil(Math.max(...fr.map(f => Math.max(f.f.ax, f.c.width - f.f.ax)))) + 2, H = Math.max(...fr.map(f => f.bot)), c = document.createElement('canvas'); c.width = W; c.height = H; { const gh = gameH(set, figK), want = Math.min(96, 70 * gh), sc = Math.min(want / H, 136 / W); c.style.height = Math.round(H * sc) + 'px'; c.style.width = Math.round(W * sc) + 'px'; }   // 统一倍率，保留怪物本身大小差别
          st.appendChild(c); anims.push({ c, fr, i: 0 }); }
        st.insertAdjacentHTML('beforeend', ped(tier, lab)); e.appendChild(st); e.insertAdjacentHTML('beforeend', `<b>${name}</b><small>${note}</small>`); d.appendChild(e); };
      const draw = a => { const g = a.c.getContext('2d'), f = a.fr[a.i % a.fr.length]; g.clearRect(0, 0, a.c.width, a.c.height); g.drawImage(f.c, Math.round(a.c.width / 2 - f.f.ax), a.c.height - f.bot); };   // 按脚底锚点对齐底座中心
      for (const h of DATA.heroes) { const n = SPR.count(SPR.heroSet(h.id, 'sword'), 'sword.idle') || 1; add(SPR.heroSet(h.id, 'sword'), Array.from({ length: Math.max(2, n) }, (_, i) => ['sword.idle', i % n]), h.name, h.perk, 'gold', '勇者', h.id); }
      for (const [k, T] of Object.entries(DATA.enemies)) { const tier = T.boss ? 'red' : T.ranged ? 'blue' : 'grey'; add(k, ['idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'walk3'].filter(n => SPR.crop(k, n)), T.name, T.boss ? '首领' : T.ranged ? '远程' : '近战', tier, T.boss ? '首领' : T.ranged ? '远程' : '近战', k); }
      const INFO = { gob_thief: '偷铜钱的小贼。撞到它能把铜钱抢回来。', gob_merchant: '在各张卡带之间跑生意的矮人，吝啬又油嘴滑舌。', guard: '高塔最后的守卫。', wizard: '王国的老法师，守在召唤祭坛旁。' };
      // 11/23 简介固定在面板右边，默认选中第一个
      const show = e => { const side = document.querySelector('.cxside'); if (!e || !side) return; d.querySelectorAll('.fig.sel').forEach(x => x.classList.remove('sel')); e.classList.add('sel');
        const k = e.dataset.k, T = DATA.enemies[k], H = DATA.heroes.find(h => h.id === k), cv = e.querySelector('canvas');
        side.innerHTML = `<div class="cxbig"></div><b>${e.querySelector('b').textContent}</b>` + (H ? `<p>${H.desc || ''}</p><p class="g">◆ ${H.perk}</p>` : T ? `<p>${T.boss ? '首领' : T.ranged ? '远程' : '近战'} · ${T.dtype === 'magic' ? '魔法' : '物理'}伤害</p><div class="st"><span>生命 <i>${T.hp}</i></span><span>伤害 <i>${T.dmg}</i></span><span>移速 <i>${T.spd}</i></span><span>物防 <i>${T.pdef || 0}</i></span><span>魔防 <i>${T.mdef || 0}</i></span></div>` : `<p>${INFO[k] || ''}</p>`);
        if (cv) { const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; c2.style.height = Math.min(150, parseFloat(cv.style.height) * 1.5) + 'px'; side.querySelector('.cxbig').appendChild(c2); const a = anims.find(x => x.c === cv); if (a) anims.push({ c: c2, fr: a.fr, i: a.i }); } };
      d.addEventListener('click', ev => show(ev.target.closest('.fig')));
      for (const [k, n, note] of [['gob_thief', '小咕噜', '小偷'], ['gob_merchant', '矮人商人', '商人'], ['guard', '王国卫兵', '守卫'], ['wizard', '大法师', '王国']]) add(null, [], n, note, 'gold', note, k);   // 11/23 NPC 也进图鉴
      { // 11/23 阵营分类：页签 + 「全部」里分组小标题
        const G = [['hum', '人类阵营'], ['gob', '哥布林'], ['wild', '野兽·亡灵'], ['neu', '中立']], gOf = k => ['m', 'f', 'p', 'guard', 'wizard'].includes(k) ? 'hum' : k === 'gob_merchant' || k === 'gob_thief' ? 'neu' : ['wolf_free', 'skeleton'].includes(k) ? 'wild' : 'gob';
        const figs = [...d.querySelectorAll('.fig')]; figs.forEach(e => e.dataset.g = gOf(e.dataset.k)); d.innerHTML = '';
        for (const [g, n] of G) { const L = figs.filter(e => e.dataset.g === g); if (!L.length) continue; const h = document.createElement('div'); h.className = 'cxh'; h.dataset.g = g; h.textContent = `— ${n} —`; d.appendChild(h); L.forEach(e => d.appendChild(e)); }
        const bar = document.createElement('div'); bar.className = 'cxtabs'; let cur = 'all';
        for (const [g, n] of [['all', '全部'], ...G]) { const b = document.createElement('button'); b.textContent = n; b.className = g === cur ? 'on' : ''; b.onclick = () => { if (g === cur) return; setTimeout(() => show([...d.querySelectorAll('.fig')].find(x => x.style.display !== 'none'))); const ks = ['all', ...G.map(x => x[0])], dir = ks.indexOf(g) > ks.indexOf(cur) ? 'slideR' : 'slideL'; cur = g; bar.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
          d.querySelectorAll('.fig, .cxh').forEach(e => e.style.display = g === 'all' || e.dataset.g === g ? '' : 'none'); d.querySelectorAll('.cxh').forEach(e => { if (g !== 'all') e.style.display = 'none'; }); d.classList.remove('slideL', 'slideR'); void d.offsetWidth; d.classList.add(dir); $('tpBody').scrollTop = 0; }; bar.appendChild(b); }
        setTimeout(() => { const tb = $('tpBody'); tb.parentNode.querySelectorAll('.cxtabs').forEach(x => x.remove()); tb.parentNode.insertBefore(bar, tb);
          let row = tb.parentNode.classList.contains('cxrow') ? tb.parentNode : null; if (!row) { row = document.createElement('div'); row.className = 'cxrow'; tb.parentNode.insertBefore(row, tb); row.appendChild(tb); const sd = document.createElement('div'); sd.className = 'cxside'; row.appendChild(sd); }
          row.insertAdjacentElement('beforebegin', bar); show(d.querySelector('.fig')); }); }
      { const pend = Object.values(FIG).flat().filter(x => !x.c.complete); if (pend.length) Promise.all(pend.map(x => new Promise(r => { x.c.addEventListener('load', r); x.c.addEventListener('error', r); }))).then(() => { if (d.isConnected) document.querySelector('[data-panel="codex"]').click(); }); }
      anims.forEach((a, i) => { a.i = i; draw(a); }); const tm = setInterval(() => { if (!d.isConnected) return clearInterval(tm); anims.forEach(a => { a.i++; draw(a); }); }, 400);   // 11/23 原地小幅待机（铃兰式）
      return d; }],
    set: ['设置', () => { const d = document.createElement('div'); const b = document.createElement('button'); b.className = 'btn'; const lab = () => b.textContent = '音效：' + (SFX.on ? '开' : '关'); lab(); b.onclick = () => { SFX.on = !SFX.on; lab(); if (SFX.on) SFX.play('pick'); }; d.appendChild(b); return d; }],   // 11/24 音效开关
    help: ['帮助', () => { const d = document.createElement('div'); d.innerHTML = `<p>· 深夜两点，你被吸进了游戏机。打倒首领才能回去。</p>
      <p>· 移动：${touch ? '按住屏幕拖动' : 'WASD 或方向键'}；翻滚：${touch ? '右下角按钮' : '空格'}（翻滚时不会受伤）。</p>
      <p>· 技能按技能栏的顺序轮流自动放出，你只管走位。</p>
      <p>· 备战页：选起手兵器、加属性点、选一个现实习惯和一件开局宝物。</p>
      <p>· 暂停：${touch ? '右上角 II' : 'P 或 Esc'}。</p>`; return d; }],
  };
  for (const b of document.querySelectorAll('[data-panel]')) b.onclick = () => { const [t, fn] = PANELS[b.dataset.panel]; $('tpTitle').textContent = t; const body = $('tpBody'); document.querySelectorAll('.cxtabs, .cxpop').forEach(x => x.remove()); { const r = document.querySelector('.cxrow'); if (r) { r.parentNode.insertBefore($('tpBody'), r); r.remove(); } } body.innerHTML = ''; body.appendChild(fn()); overlay('tpanel', true); };
  $('tpX').onclick = () => $('tpClose').click(); $('tpClose').onclick = () => { overlay('tpanel', false); document.querySelectorAll('.cxtabs, .cxpop').forEach(x => x.remove()); { const r = document.querySelector('.cxrow'); if (r) { r.parentNode.insertBefore($('tpBody'), r); r.remove(); } } };

  // ================= 备战页 =================
  const P = { hero: 'm', weapon: 'sword', free: {}, habit: null, item: null, habitOpts: [], itemOpts: [], tab: 'w' };
  const attrsOf = () => { const o = {}; for (const a of DATA.attrs) o[a.id] = DATA.attrBase + (P.free[a.id] || 0); return o; };
  const used = () => Object.values(P.free).reduce((s, v) => s + v, 0);
  const build = () => ({ title: store.get('title') || null, hero: P.hero, weapon: P.weapon, attrs: attrsOf(), item: P.item, habit: P.habit, pts: Math.max(0, DATA.attrFree - used()) });   // 没加完的点带进游戏，营地里再加
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
    for (const h of DATA.heroes.filter(x => !x.locked)) { const b = document.createElement('button'); b.className = h.id === P.hero ? 'on' : ''; const cr = SPR.crop(SPR.heroSet(h.id, P.weapon), P.weapon + '.idle', 0); if (cr) b.appendChild(cr.c);
      b.insertAdjacentHTML('beforeend', `<span>${h.name}</span><small>${h.perk}</small>`); b.onclick = () => { P.hero = h.id; store.set('hero', h.id); renderPrep(); }; cs.appendChild(b); }
    { const h = DATA.heroes.find(x => x.id === P.hero), c0 = DATA.calc(build()), W0 = DATA.weapons[P.weapon];   // 11/22 角色卡（铃兰式：人物 + 属性 + 兵器槽）
      $('pPort').src = `art/portrait/${P.hero}.webp`;
      const PL = (ic, n, v) => `<div><span>${piH(ic, 1)}${n}</span><b>${v}</b></div>`, dmgA = W0.type === 'agi' ? 'agi' : W0.type === 'int' ? 'int' : 'str';
      $('hInfo').innerHTML = `<div class="pnName"><h5>${h.name}</h5><span>${h.desc}</span></div><div class="hperk">◆ 特长 · ${h.perk}</div>
        <div class="pills">${PL('hp', '生命', c0.hp)}${PL(dmgA, W0.name + '伤害', pct(c0.dmg - 1))}${PL('guard', '物防 / 魔防', c0.pdef + ' / ' + c0.mdef)}${PL('move', '移速', pct(c0.move - 1))}${PL('crit', '暴击率', Math.round(c0.critP * 100) + '% / ' + Math.round(c0.critM * 100) + '%')}${PL('move', '闪避', Math.round(c0.eva * 100) + '%')}${PL('xp', '经验', pct(c0.xp - 1))}</div>`; }
    // 起手兵器
    const ws = $('wSel'); ws.innerHTML = '';
    for (const [id, w] of Object.entries(DATA.weapons)) { const b = document.createElement('button'); b.className = id === P.weapon ? 'on' : ''; b.appendChild(iconCanvas(id)); /* 11/22 法杖用法杖书 */ b.insertAdjacentHTML('beforeend', `<span>${w.name}</span>`); b.onclick = () => { P.weapon = id; store.set('weapon', id); heroSwing = .6; renderPrep(); }; ws.appendChild(b); }
    const W = DATA.weapons[P.weapon], SK0 = DATA.skills[P.weapon] || {}, AT = DATA.attrs.find(a => a.id === W.type);   // 11/22 起手技能介绍（铃兰式：上面选兵器，下面讲技能）
    $('wDesc').innerHTML = `<div class="skI" title="${['l3', 'l5', 'l7'].filter(k => SK0[k]).map(k => 'Lv' + k.slice(1) + '：' + SK0[k]).join('\n')}"><div class="skIc">${skIcon(P.weapon).outerHTML}</div><div class="skIb"><div class="skIt"><b>${SK0.name || W.skill}</b><em>${SK0.dt === 'magic' ? '魔法' : '物理'}</em></div><p>${SK0.desc || W.desc}</p></div></div>`;
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
    $('aStats').innerHTML = `<span>生命</span><b>${c.hp}</b><span>${W.name}伤害</span><b>${pct(c.dmg - 1)}</b><span>出手速度</span><b>${pct(c.spd - 1)}</b><span>范围</span><b>${pct(c.area - 1)}</b><span>暴击率 物/魔</span><b>${Math.round(c.critP * 100)}% / ${Math.round(c.critM * 100)}%</b><span>暴伤 物/魔</span><b>${Math.round(c.critMulP * 100)}% / ${Math.round(c.critMulM * 100)}%</b><span>闪避</span><b>${Math.round(c.eva * 100)}%</b><span>物防 / 魔防</span><b>${c.pdef} / ${c.mdef}</b><span>移速</span><b>${pct(c.move - 1)}</b><span>经验</span><b>${pct(c.xp - 1)}</b>`;
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
  const introSeen = () => store.get('introSeen') === '1';
  function playIntro(go, hub) { const f = $('introF'), first = !introSeen(); f.src = 'demo/intro.html?game' + (hub ? '&hub' : '') + '&h=' + (store.get('hero') === 'f' ? 'f' : 'm') + '&w=' + (store.get('weapon') || 'sword') + (first ? '&first' : '') + '&v=' + Date.now(); f.style.display = 'block'; f.onload = () => { try { f.contentWindow.focus(); } catch (e) {} };
    const on = e => { if (e.data !== 'introDone') return; removeEventListener('message', on); store.set('introSeen', '1'); f.style.display = 'none'; f.src = 'about:blank'; go(); }; addEventListener('message', on); }
  $('pGo').onclick = () => { const b = build(); if (!introSeen()) playIntro(() => startBattle(b)); else openHub('', () => startBattle(b)); };   // 11/24 选人只在新存档出现：塔顶开场 → 开打
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

  // ================= 11/23 交互动效 =================
  const FX = (() => { let gw = 100, gT = 0, cs = null, cShow = null, lastCombo = 0;
    function ghost(pc) { const g = $('hpGhost'); if (pc > gw || cs === null) { gw = pc; g.style.transition = 'none'; g.style.width = pc + '%'; cs = 0; return; } if (pc < gw - .01) { if (!gT) gT = setTimeout(() => { g.style.transition = 'width .5s ease-in'; g.style.width = pc + '%'; gw = pc; gT = 0; }, 400); } }
    function hit(big) { const hp = $('hpBar').parentNode; hp.classList.add('flash'); setTimeout(() => hp.classList.remove('flash'), 70); if (big) { const v = $('hurtV'); v.classList.add('on'); setTimeout(() => v.classList.remove('on'), 60); } }
    function coin(n) { if (cShow === null || n < cShow || n - cShow > 60) { cShow = n; $('coins').innerHTML = piH('coin', 1) + ' ' + n; return; } if (n === cShow || coin.t) return;
      coin.t = setInterval(() => { cShow++; const e = $('coins'); e.innerHTML = piH('coin', 1) + ' ' + cShow; e.classList.remove('hit'); void e.offsetWidth; e.classList.add('hit'); if (cShow >= coin.to()) { clearInterval(coin.t); coin.t = 0; } }, 45); coin.to = () => n; }
    function combo(c) { if (lastCombo >= 5 && c === 0 && screen === 'battle') brk(lastCombo); lastCombo = c; }
    function brk(v) { const box = $('combo'), e = $('cN'); const r = e.getBoundingClientRect(); if (!r.width) return; const col = getComputedStyle(e.querySelector('svg path') || e).fill || '#ffb050';
      for (let k = 0; k < 18; k++) { const p = document.createElement('div'); p.className = 'cShard'; p.style.background = col && col !== 'none' ? col : '#ffb050'; document.body.appendChild(p); let x = r.left + Math.random() * r.width, y = r.top + Math.random() * r.height, vx = (Math.random() - .5) * 5, vy = -Math.random() * 3, t = 0;
        (function st() { vy += .35; x += vx; y += vy; t++; p.style.left = x + 'px'; p.style.top = y + 'px'; p.style.opacity = Math.max(0, 1 - t / 40); if (t < 40) requestAnimationFrame(st); else p.remove(); })(); } }
    function fly(src, cx, cy) { const b = $('bPause'), rb = b.getBoundingClientRect(); const i = document.createElement('img'); i.className = 'flyIc'; i.src = src; i.style.left = cx - 15 + 'px'; i.style.top = cy - 15 + 'px'; document.body.appendChild(i);
      requestAnimationFrame(() => requestAnimationFrame(() => { i.style.left = rb.left + rb.width / 2 - 15 + 'px'; i.style.top = rb.top + rb.height / 2 - 15 + 'px'; i.style.transform = 'scale(.5) rotate(200deg)'; }));
      setTimeout(() => { i.remove(); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }, 560); }
    // 6B：画面裂成方块被吸进 (sx,sy)，mid() 换场后再反向拼回
    function shatter(cv, sx, sy, mid) { const W = cv.width, H = cv.height, B = Math.max(8, Math.round(W / 120)), o = document.createElement('canvas'); o.id = 'shatter'; o.width = W; o.height = H; const rc = cv.getBoundingClientRect(); Object.assign(o.style, { left: rc.left + 'px', top: rc.top + 'px', width: rc.width + 'px', height: rc.height + 'px' }); document.body.appendChild(o);
      const g = o.getContext('2d'), snap = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(cv, 0, 0); return c; }, bl = []; let md = 1;
      for (let y = 0; y < H; y += B) for (let x = 0; x < W; x += B) { const d = Math.hypot(x - sx, y - sy); md = Math.max(md, d); bl.push({ x, y, d, r: Math.random() }); }
      const run = (img, rev, T) => new Promise(res => { const t0 = performance.now(); (function f() { const k = Math.min(1, (performance.now() - t0) / T); g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
        for (const b of bl) { const st = rev ? .7 - (b.d / md) * .6 - b.r * .1 : (b.d / md) * .6 + b.r * .1; let q = Math.max(0, Math.min(1, (k - st) / .3)); if (rev) q = 1 - q; if (q >= 1) continue; const e = q * q, sc = 1 - e;
          g.save(); g.translate(b.x + (sx - b.x) * e + B / 2, b.y + (sy - b.y) * e + B / 2); g.rotate(e * 3); g.scale(sc, sc); g.drawImage(img, b.x, b.y, B, B, -B / 2, -B / 2, B, B); g.restore(); }
        k < 1 ? requestAnimationFrame(f) : res(); })(); });
      run(snap(), false, 1000).then(() => { mid(); return new Promise(r => setTimeout(r, 180)); }).then(() => run(snap(), true, 800)).then(() => o.remove()); }
    return { ghost, hit, coin, combo, fly, shatter };
  })();
  function hud(h) {
    { const pc = h.hp / h.maxHp * 100; set('hpBar', 'w', pc.toFixed(1) + '%'); FX.ghost(pc); } { const k = Math.ceil(h.hp) + '/' + h.maxHp; if (HC.hp !== k) { HC.hp = k; set('hpTxt', 'html', UI.pxNum(Math.ceil(h.hp), '#fff4e0') + '<i class="sl"></i>' + UI.pxNum(h.maxHp, '#e8c8b0')); } } $('hpBar').parentNode.classList.toggle('low', h.hp / h.maxHp < .3);
    set('lvTxt', 'text', ''); if (HC.lvb !== h.lv) { if (HC.lvb != null && h.lv > HC.lvb) { const r = $('xpRow'), b = $('lvBox'); for (const e of [r, b]) { e.classList.remove('up'); void e.offsetWidth; e.classList.add('up'); } } HC.lvb = h.lv; $('lvBox').innerHTML = '<i>LV</i>' + pxNum(h.lv, '#ffe08a'); } { const w = h.need ? (h.xp / h.need * 100).toFixed(1) + '%' : '100%'; set('xpBar', 'w', w); set('xpBar2', 'w', w); }
    document.body.classList.toggle('fe', !!h.fe);
    set('clock', 'html', h.bossWave ? '<em>⌛</em><b>首领战</b>' : `<em>⌛</em><b>${pxNum(h.left == null ? '00:00' : mmss(h.left), h.left != null && h.left < 5.5 ? '#ff8a6a' : '#f4ecd8')}</b>`);
    // 11/22 右侧击倒 / 连击（群侠式）：连击到 10 / 25 / 50 / 100 放大闪一下，3 秒没杀到就断
    if (HC.k !== h.kills) { HC.k = h.kills; set('kN', 'html', pxNum(h.kills, '#f4ecd8')); }
    { const c = h.combo, col = c >= 100 ? '#ff4a6a' : c >= 50 ? '#ff7040' : c >= 25 ? '#ffb050' : c >= 10 ? '#ffe08a' : '#8a5a2a'; if (HC.c !== c) { HC.c = c; set('cN', 'html', c > 1 ? pxNum(c, col) : ''); } }
    { const c = h.combo, big = c >= 100 ? 4 : c >= 50 ? 3 : c >= 25 ? 2 : c >= 10 ? 1 : 0; set('combo', 'cls', 'cb' + big + (c > 1 ? ' on' : '') + (h.comboT < 1 && c > 1 ? ' fade' : ''));
      if (c && c !== HC.lastC) { HC.lastC = c; const e = $('cN'); e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); } }
    set('clock', 'cls', 'clock' + (h.left != null && h.left < 5.5 && !h.bossWave ? ' warn' : ''));
 FX.coin(h.coins); FX.combo(h.combo);
    const sk = JSON.stringify([h.slots, h.open, h.next]);
    if (HC.sbar !== sk) { HC.sbar = sk; const bar = $('sbar'); bar.innerHTML = ''; h.slots.forEach((s, i) => { const d = document.createElement('div'); d.className = 'sb' + (i >= h.open ? ' lock' : '') + (i === h.next ? ' nx' : ''); if (s && i < h.open) { d.classList.add('tr', 't' + DATA.skills[s.id].tier); d.appendChild(skIcon(s.id)); { const L = BATTLE.profL(s); if (L) d.insertAdjacentHTML('beforeend', `<i>${L}</i>`); } } bar.appendChild(d); }); } set('bossName', 'text', h.bossName || '哥布林王');
    set('bossBox', 'show', h.boss != null); if (h.boss != null) set('bossBar', 'w', (h.boss * 100).toFixed(1) + '%');
    set('lvUp', 'cls', '');   // 11/22：升级字改成画在勇者头上，角落的不再显示
    // 右下角翻滚按钮：冷却时一圈暗色扇面倒转，中间显示剩余秒数
    const rp = Math.round(h.roll * 60) / 60; if (HC.rollP !== rp) { HC.rollP = rp; $('rollCd').style.setProperty('--p', rp); }
    const rn = h.rollN == null ? 1 : h.rollN, full = rn >= (h.rollN0 || 1); set('rollT', 'text', rn < 1 && h.rollT > .05 ? h.rollT.toFixed(1) : rn >= 1 ? '×' + rn : ''); set('bRoll', 'cls', 'btn round' + (rn < 1 ? ' cd' : '') + (full ? ' full' : ''));   // 11/24 翻滚格数；满格发光
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
    const P = $('pause'), on = force != null ? force : !P.classList.contains('on'); if (P.classList.contains('closing')) return; if (!on) CAMP.commit(); BATTLE.pause(on);
    if (on) { P.classList.add('fresh'); overlay('pause', true); CAMP.pauseOpen(); setTimeout(() => P.classList.remove('fresh'), 900); }
    else if (P.classList.contains('on')) { document.querySelectorAll('.loinfo.pop').forEach(e => e.remove()); P.classList.add('closing'); setTimeout(() => { P.classList.remove('closing'); overlay('pause', false); }, 200); }
  }
  $('bPause').onclick = () => togglePause(); $('pRes').onclick = () => { CAMP.commit(); togglePause(false); };
  function confirmBox(t, m, yes, red, go) { $('cfT').textContent = t; $('cfM').textContent = m; const y = $('cfYes'); y.textContent = yes; y.classList.toggle('red', !!red); const close = () => { overlay('confirm', false); removeEventListener('keydown', esc, true); }, esc = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    $('cfNo').onclick = close; y.onclick = () => { close(); go(); }; $('confirm').onclick = e => { if (e.target.id === 'confirm') close(); }; addEventListener('keydown', esc, true); overlay('confirm', true); $('cfNo').focus(); }
  $('pRe').onclick = () => confirmBox('重新开始？', '当前这局冒险会被放弃，无法恢复。', '重新开始', 1, () => startBattle(lastBuild));
  $('pHome').onclick = () => confirmBox('回到主界面？', '进度保存在「本站开始时」，这一站获得的经验、铜钱和物品会丢失。', '回主界面', 0, () => { BATTLE.stop(); overlay('pause', false); show('title'); });
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
  function event(E, pickFn, back, title) {
    $('rtTitle').innerHTML = title || '奇遇'; const box = $('rtCards'); box.innerHTML = ''; box.className = 'rcards ev';
    const d = document.createElement('div'); d.className = 'evbox'; d.innerHTML = `<b>${E.name}</b><p>${E.desc}</p>`; const ops = document.createElement('div'); ops.className = 'evops'; d.appendChild(ops);
    E.opts.forEach(([label, hint], i) => { const b = document.createElement('button'); b.className = 'btn gold'; b.innerHTML = `${label}<small>${hint}</small>`;
      b.onclick = () => { const res = pickFn(i); ops.innerHTML = `<p class="evres">${res}</p>`; const go = document.createElement('button'); go.className = 'btn gold'; go.textContent = '继续 ▶'; go.onclick = () => { overlay('route', false); back(); }; ops.appendChild(go); }; ops.appendChild(b); });
    box.appendChild(d); overlay('route', true);
  }
  // 11/23 左下角播报：一条条往上滚，4.5 秒后淡出
  function feed(t) { const box = $('feed'); if (!box) return; const e = document.createElement('div'); e.textContent = t; box.appendChild(e); while (box.children.length > 5) box.firstChild.remove(); setTimeout(() => e.classList.add('out'), 4000); setTimeout(() => e.remove(), 4600); }
  // 11/23 像素数字（5×7 方块字 + 硬边深褐描边 + 右下投影），用于时间和击倒 / 连击
  const PXG = { 0: '01110100011001110101110011000101110', 1: '00100011000010000100001000010001110', 2: '01110100010000100010001000100011111', 3: '11110000010000101110000010000111110', 4: '00010001100101010010111110001000010', 5: '11111100001111000001000011000101110', 6: '00110010001000011110100011000101110', 7: '11111000010001000100010000100001000', 8: '01110100011000101110100011000101110', 9: '01110100011000101111000010001001100', ':': '00000001000010000000001000010000000' };
  function pxNum(str, fg, ol) { str = String(str); let o = '', f = '', d = ''; const W = str.length * 7 + 2;
    [...str].forEach((ch, j) => { const g = PXG[ch]; if (!g) return; for (let i = 0; i < 35; i++) if (g[i] === '1') { const x = j * 7 + i % 5 + 1, y = (i / 5 | 0) + 1; o += `<rect x="${x - 1}" y="${y - 1}" width="4" height="3"/>`; d += `<rect x="${x}" y="${y + 1}" width="4" height="2"/>`; f += `<rect x="${x}" y="${y}" width="2" height="1"/>`; } });
    return `<svg class="pxn" viewBox="0 0 ${W} 10" style="width:${W / 10}em" shape-rendering="crispEdges">${ol === 0 ? '' : `<g fill="${ol || '#1e1008'}">${d}${o}</g>`}<g fill="${fg}">${f}</g></svg>`; }  let toastT = 0; function toast(s) { const e = $('toast'); e.textContent = s; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), 1800); }
  $('bRoll').addEventListener('pointerdown', e => { e.stopPropagation(); BATTLE.roll(); });
  // 11/22 卡带世界地图：打完一章出来，已通关的亮、下一章可选、其余被乱码盖着
  function worldMap(done, soon) {   // 11/22 势力地图：领地染色 + 旗帜 + 关系；已平定的亮、下一章可选、其余锁着
    const box = $('wmNodes'); box.innerHTML = ''; let pick = null; const cleared = 1;
    $('wmTitle').textContent = '世界势力 · 选择下一章'; $('wmGo').disabled = true; $('wmHint').textContent = '点地图上的旗帜';
    const flag = (o, st, rel) => `<div class="wf" style="--fc:${o.c}"><em>${o.sym}</em></div><b>${o.name}</b><small class="rel r-${rel}">${rel}</small>`;
    for (const c of DATA.chapters) { const z = document.createElement('div'); z.className = 'wmz'; Object.assign(z.style, { left: (c.x - c.rx) * 100 + '%', top: (c.y - c.ry) * 100 + '%', width: c.rx * 200 + '%', height: c.ry * 200 + '%', '--fc': c.c }); box.appendChild(z); }
    const cap = document.createElement('div'); cap.className = 'wmn cap'; cap.style.left = DATA.capital.x * 100 + '%'; cap.style.top = DATA.capital.y * 100 + '%'; cap.innerHTML = flag(DATA.capital, '', DATA.capital.rel); cap.onclick = () => toast('王都 · 公主在这里等你'); box.appendChild(cap);
    DATA.chapters.forEach(c => { const d = document.createElement('div'), st = c.id <= cleared ? 'done' : c.id === cleared + 1 ? 'next' : 'lock', rel = st === 'done' ? '已平定' : c.rel;
      d.className = 'wmn ' + st; d.style.left = c.x * 100 + '%'; d.style.top = c.y * 100 + '%'; d.innerHTML = flag(c, st, rel);
      d.onclick = () => { if (soon && st !== 'done') return toast(`第 ${c.id} 章「${c.name}」· 敬请期待`); if (st === 'lock') return toast(`第 ${c.id} 章 · ${c.land}：先打通前面的章节`); if (st === 'done') return toast('这里已经恢复平静了');
        for (const x of box.children) x.classList.remove('sel'); d.classList.add('sel'); pick = c; $('wmHint').textContent = `第 ${c.id} 章「${c.name}」· ${c.land} · 首领 ${c.boss}（制作中）`; $('wmGo').disabled = false; };
      box.appendChild(d); });
    $('wmGo').onclick = () => { overlay('wmap', false); done(pick); }; if (soon) { $('wmGo').disabled = false; $('wmGo').textContent = '回到主界面'; $('wmHint').textContent = '其他章节敬请期待'; } else $('wmGo').textContent = '继续 ▶'; overlay('wmap', true);
    const sc = $('wmScroll'); sc.scrollLeft = (sc.scrollWidth - sc.clientWidth) * .45;
  }

  // 11/23 通关结算（战斗内像素风）：数字滚动、条长出来、最后盖印章；点一下跳到全部显示
  function victory(v, done) {
    const SKN = id => (DATA.skills[id] || {}).name || id, tot = Object.values(v.dmg).reduce((a, b) => a + b, 0) || 1;
    $('vTitle').textContent = '第一章 · 哥布林森林　通关';
    const rec = [['用时', mmss(v.time), 0], ['击倒', v.kills, 1], ['最高连击', v.combo, 1], ['铜钱', v.coins, 1, '+'], ['受到伤害', v.taken, 1]];
    $('vRec').innerHTML = rec.map(([n, x, num, pre]) => `<div class="vr"><span>${n}</span><b data-v="${num ? x : ''}" data-p="${pre || ''}">${num ? (pre || '') + '0' : x}</b></div>`).join('');
    $('vDmg').innerHTML = Object.entries(v.dmg).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, d]) => `<div class="vbar"><span>${SKN(id)}</span><i><s data-w="${(d / tot * 100).toFixed(0)}"></s></i><em>${Math.round(d / tot * 100)}%</em></div>`).join('') || '<p class="vdim">—</p>';
    $('vGrow').innerHTML = `<div class="vbar lv"><span>勇者 Lv${v.lv}</span><i><s data-w="${(v.xp * 100).toFixed(0)}"></s></i><em>${Math.round(v.xp * 100)}%</em></div>` + v.sk.map(k => `<div class="vbar sk"><span>${k.name} Lv${k.L}</span><i><s data-w="${(k.p * 100).toFixed(0)}"></s></i></div>`).join('');
    const G2 = v.got.slice(-12); $('vGot').innerHTML = G2.length ? '' : '<p class="vdim">这一局没有拿到新东西</p>'; G2.forEach(o => { const c = document.createElement('span'); c.className = 'vic'; c.appendChild(o.kind === 'book' ? skIcon(o.id) : pi(o.kind === 'oath' ? 'oath/' + o.id : o.id)); $('vGot').appendChild(c); });
    $('vNew').innerHTML = '★ 新解锁：图鉴「哥布林王」';
    const V = $('vict'), st = V.querySelector('.vstamp'); st.classList.remove('on'); V.classList.remove('done'); overlay('vict', true);
    let skip = false; const fin = () => { skip = true; V.querySelectorAll('[data-v]').forEach(b => { if (b.dataset.v !== '') b.textContent = b.dataset.p + b.dataset.v; }); V.querySelectorAll('s[data-w]').forEach(e => e.style.width = e.dataset.w + '%'); st.classList.add('on'); V.classList.add('done'); };
    V.onclick = e => { if (e.target.id !== 'vGo') fin(); };
    (async () => { const w = ms => new Promise(r => setTimeout(r, ms));
      for (const b of V.querySelectorAll('#vRec b')) { if (skip) return; if (b.dataset.v === '') { await w(120); continue; } const n = +b.dataset.v, t0 = performance.now(); await new Promise(r => (function f() { if (skip) return r(); const k = Math.min(1, (performance.now() - t0) / 450); b.textContent = b.dataset.p + Math.round(n * (1 - (1 - k) ** 3)); k < 1 ? requestAnimationFrame(f) : r(); })()); await w(80); }
      for (const e of V.querySelectorAll('s[data-w]')) { if (skip) return; e.style.width = e.dataset.w + '%'; await w(140); }
      await w(300); if (skip) return; st.classList.add('on'); await w(180); V.classList.remove('shake'); void V.offsetWidth; V.classList.add('shake'); V.classList.add('done'); })();
    $('vGo').onclick = () => { overlay('vict', false); done(); };
  }
  function nextChapter() { const w = document.createElement('div'); w.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:95;opacity:0;transition:opacity .4s'; document.body.appendChild(w); requestAnimationFrame(() => w.style.opacity = 1);
    setTimeout(() => { worldMap(() => { BATTLE.stop(); overlay('wmap', false); show('title'); }, true); w.style.opacity = 0; setTimeout(() => w.remove(), 450); }, 450); }
  function result(r) { lastRes = r; if (r.cont && !r.win) { BATTLE.stop(); return $('rAgain').onclick(); }   // 11/24 还有命：不出结算页，直接回宫殿续关
  $('rAgain').textContent = '再来一局 ▶';
    if (r.win && !r.mapShown) return worldMap(() => result(Object.assign({}, r, { mapShown: true })));
    $('rTitle').textContent = r.win ? '胜利！' : '败北……';
    setTimeout(() => { if (r.cry) $('rMsg').textContent += `　这一局带回 ${r.cry} 水晶。`; if (r.newT && r.newT.length) $('rMsg').textContent += `　获得新称号：${r.newT.join('、')}！`; }, 0);
    $('rMsg').textContent = r.win ? '哥布林王倒下了，屏幕那头好像传来了「下一关」的音乐。' : '眼前一黑……再按一次开始键吧。';
    const best = Object.entries(r.dmg || {}).sort((a, b) => b[1] - a[1])[0];
    $('rStats').innerHTML = `<span>打到</span><b>${r.win ? '通关' : r.boss ? '首领战' : `第 ${r.st} 站 第 ${Math.max(0, r.wi) + 1} 波`}</b><span>用时</span><b>${mmss(r.time)}</b><span>击倒</span><b>${r.kills}</b><span>等级</span><b>Lv ${r.lv}</b>${best ? `<span>主力</span><b>${DATA.skills[best[0]].name}</b>` : ''}`;
    const R0 = $('result'), bx = R0.querySelector('.box'); bx.querySelectorAll('.stamp').forEach(e => e.remove()); overlay('result', true);
    if (r.win) { const st = document.createElement('div'); st.className = 'stamp'; st.textContent = '通关'; bx.appendChild(st);
      const bs = [...$('rStats').querySelectorAll('b')], vals = bs.map(b => b.textContent); bs.forEach(b => b.style.visibility = 'hidden');
      (async () => { for (let i = 0; i < bs.length; i++) { const b = bs[i], v = vals[i], m = v.match(/^(\D*)(\d+)(\D*)$/); b.style.visibility = ''; if (m) { const n = +m[2], t0 = performance.now(); await new Promise(res => (function f() { const k = Math.min(1, (performance.now() - t0) / 500); b.textContent = m[1] + Math.round(n * (1 - (1 - k) ** 3)) + m[3]; k < 1 ? requestAnimationFrame(f) : res(); })()); } await new Promise(r => setTimeout(r, 120)); }
        await new Promise(r => setTimeout(r, 200)); st.classList.add('on'); await new Promise(r => setTimeout(r, 180)); R0.classList.remove('shake'); void R0.offsetWidth; R0.classList.add('shake'); })(); }
  }
  // 11/24 回到塔顶再来一次：GAME OVER → 塔顶（公主 / 法师 / 士兵说几句）→ 走进传送门开新局
  let lastRes = null, pendRes = null;   // pendRes：上一局真正结束的结果，等选完人进宫殿时再说台词
  function towerCtx(r) { const n = (+store.get('returns') || 0) + 1, wins = (+store.get('wins') || 0); store.set('returns', n); if (r.win) store.set('wins', wins + 1);
    return { n, st: r.st, boss: r.boss, win: r.win, wins: wins + (r.win ? 1 : 0), killer: r.killer, killerElite: r.killerElite, weapon: r.weapon, quick: !r.win && r.time < 60, stolen: r.stolen }; }
  function openHub(qs, go) { const f = $('introF'); f.src = 'demo/palace.html?game&h=' + (store.get('hero') === 'f' ? 'f' : 'm') + qs + '&v=' + Date.now(); f.style.display = 'block'; f.onload = () => { try { f.contentWindow.focus(); } catch (e) {} };
    const on = e => { if (e.data !== 'introDone') return; removeEventListener('message', on); f.style.display = 'none'; f.src = 'about:blank'; go(); }; addEventListener('message', on); }
  function playTower(r, go) { let seen; try { seen = new Set(JSON.parse(store.get('linesSeen') || '[]')); } catch (e) { seen = new Set(); }
    const L = pickLines(towerCtx(r), seen); for (const l of L) if (!l.rep) seen.add(l.id); store.set('linesSeen', JSON.stringify([...seen]));
    const say = [].concat(...L.map(l => l.say)), f = $('introF');
    f.src = 'demo/palace.html?game&cry=' + (r.cry || 0) + '&cont=' + (r.cont || 0) + '&h=' + (store.get('hero') === 'f' ? 'f' : 'm') + '&L=' + encodeURIComponent(JSON.stringify(say)) + '&v=' + Date.now();   /* 11/24 死后回宫殿（塔顶开场只在第一次） */ f.style.display = 'block'; f.onload = () => { try { f.contentWindow.focus(); } catch (e) {} };
    const on = e => { if (e.data !== 'introDone') return; removeEventListener('message', on); f.style.display = 'none'; f.src = 'about:blank'; go(); }; addEventListener('message', on); }
  $('rAgain').onclick = () => { BATTLE.stop(); overlay('result', false); const r = lastRes || {};
    if (!r.cont) return playTower(r, () => { openPrep(true); startBattle(build()); });   // 11/24 这局结束：回宫殿（男女已经跟着存档定了）
    playTower(r, () => { const s = r.cont && BATTLE.loadSave(); if (s) { HC = {}; BATTLE.start(Object.assign({}, s.opt, { resume: s, cont: 1 })); show('battle'); for (const id of ['levelup', 'pause', 'result', 'camp']) overlay(id, false); } else startBattle(lastBuild); }); };   // 11/24 有命：续关回本站开头；没命：新的一局
  $('rWep').onclick = () => { BATTLE.stop(); overlay('result', false); openPrep(false); };
  $('rHome').onclick = () => { BATTLE.stop(); overlay('result', false); show('title'); };
  // 11/22 切走自动暂停：只在正中间显示一个暂停图标（点一下 / 按任意键继续）；按 P 或点右上角才进备战页
  function softPause() { if (screen !== 'battle' || !BATTLE.active() || BATTLE.paused) return; BATTLE.pause(true); $('autoP').classList.add('on'); }
  function softResume() { if (!$('autoP').classList.contains('on')) return; $('autoP').classList.remove('on'); BATTLE.pause(false); }
  $('autoP').addEventListener('pointerdown', e => { e.stopPropagation(); softResume(); }); addEventListener('keydown', e => { if ($('autoP').classList.contains('on') && e.key !== 'p' && e.key !== 'P') softResume(); }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) softPause(); });

  // ================= 主循环 =================
  let T = 0;
  function loop(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now; T += dt;
    if (screen === 'battle') { BATTLE.frame(dt); if (tipT > 0) tipT -= dt; }
    else if (screen === 'prep') { drawMenuBg(T); drawHeroPreview(T, dt); }
    else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#07101b'; ctx.fillRect(0, 0, cv.width, cv.height); }
    requestAnimationFrame(loop);
  }
  const isTouch = () => matchMedia('(hover: none)').matches;
  const pTip = () => isTouch() ? '点右上角 ⏸ 看看' : '按 P 看看', pKey = () => isTouch() ? '点右上角 ⏸ 整理' : '按下 P 整理';
  const newDot = v => { const b = $('bPause'); if (b) b.classList.toggle('dot', v !== false); };

  // 11/24 宝箱老虎机：picks = 最后停下的东西（每个一列）；pool = 滚动时闪过的东西。点一下跳过
  function slot(pool, picks, done) {
    const M = $('slotM'), R = $('reels'); R.innerHTML = ''; M.classList.add('on'); let fin = false;
    const face = (el, o) => { el.innerHTML = ''; const im = new Image(); im.src = o.src; im.onerror = () => { im.replaceWith(Object.assign(document.createElement('div'), { className: 'em', textContent: o.em || '？' })); }; el.append(im, Object.assign(document.createElement('div'), { textContent: o.name })); };
    const cols = picks.map(() => { const d = document.createElement('div'); d.className = 'reel'; R.appendChild(d); return d; });
    const stopAt = picks.map((_, i) => 14 + i * 7); let n = 0, tm = null;
    const end = () => { if (fin) return; fin = true; clearTimeout(tm); let rare = false; cols.forEach((c, i) => { face(c, picks[i]); c.classList.add('stop'); if (picks[i].rare) { c.classList.add('rare'); rare = true; } }); SFX.play(rare ? 'jackpot' : 'win'); setTimeout(() => { M.classList.remove('on'); M.onclick = null; done(); }, rare ? 1300 : 800); };
    const tick = () => { n++; cols.forEach((c, i) => { if (n < stopAt[i]) face(c, pool[(Math.random() * pool.length) | 0]); else if (n === stopAt[i]) { face(c, picks[i]); c.classList.add('stop'); if (picks[i].rare) c.classList.add('rare'); } }); SFX.play('tick');
      if (n >= stopAt[stopAt.length - 1]) return end(); tm = setTimeout(tick, 35 + n * n * .15); };
    M.onclick = end; tick();
  }
  window.UI = { slot, FX, victory, nextChapter, pxNum, pTip, pKey, newDot, feed, softPause, bookOf, skIcon, mod: () => BATTLE, hud, levelUp, result, waveEnd, route, event, toast, icon: iconCanvas, pi, piH, togglePause, show, startBattle, openPrep, get screen() { return screen; } };
  BATTLE.init(cv);
  const prog = v => { const b = document.getElementById('tbar'); if (b) b.style.width = Math.round(v * 100) + '%'; }; prog(.3);   // 11/22：不要加载页，主界面上直接载入
  // 界面图（旧地图底、框件）在加载页里一起载完，进了页面就不会晚一拍才出来
  const UIPRE = ['map.webp', 'panel.png', 'card.png', 'q0.png', 'q1.png', 'q2.png', 'q3.png', 'slot.png', 'slot_sel.png', 'slot_lock.png', 'cell.png', 'btn.png', 'btn_gold.png', 'tab.png', 'tab_on.png', 'bar.png', 'pause.png', 'divider.png']
    .concat(Object.keys(window.UIART || {}).filter(k => (window.UIART[k][0] || 0) < 60).map(k => k + '.png'));
  const preUI = () => Promise.all([...new Set(UIPRE)].map(f => new Promise(ok => { const im = new Image(); im.onload = im.onerror = ok; im.src = 'art/ui2/' + f; (window.__ui = window.__ui || []).push(im); })));
  Promise.all([SPR.load(), preUI(), document.fonts ? document.fonts.load('20px WenKai').catch(() => {}) : 0, ...['m', 'f', 'p'].map(k => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = 'art/portrait/' + k + '.webp'; }))]).then(() => { prog(1); document.getElementById('tload').classList.add('done'); $('bStart').disabled = false; contShow(); show('title'); requestAnimationFrame(loop); })
    .catch(e => { console.error(e); document.getElementById('ttx').textContent = '载入失败，请刷新'; });
})();

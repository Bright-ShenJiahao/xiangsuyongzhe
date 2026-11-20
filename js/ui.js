// 像素勇者 · 界面和流程：主界面 → （开场）→ 武器选择 → 地图选择 → 战斗 → 结算。
// 主界面的「深夜房间 + 发光的游戏机」是代码画的低分辨率像素画（以后出了正式图，换掉 drawRoom 即可）。
(() => {
  const $ = id => document.getElementById(id), cv = $('cv'), ctx = cv.getContext('2d');
  const PI = Math.PI, rd = Math.round;
  let screen = 'load', last = performance.now(), sel = { weapon: 'sword', map: 'field' }, fieldImg = new Image();
  fieldImg.crossOrigin = 'anonymous'; fieldImg.src = 'art/map/field.webp';
  const store = { get: k => { try { return localStorage.getItem('xsyz-' + k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem('xsyz-' + k, v); } catch (e) {} } };
  if (matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window) document.body.classList.add('touch');

  function show(id) {
    screen = id; for (const e of document.querySelectorAll('.scr')) e.classList.toggle('on', e.id === id || (id === 'battle' && e.id === 'hud'));
  }
  const overlay = (id, on) => $(id).classList.toggle('on', on);

  // ================= 主界面：深夜房间 =================
  const LC = document.createElement('canvas'), lg = LC.getContext('2d');
  const STARS = Array.from({ length: 24 }, () => [Math.random(), Math.random(), Math.random() * 6]);
  let intro = null;   // 开场：{ t, lines, quick }
  function roomLayout(port) {
    const w = port ? 144 : 256, h = port ? 256 : 144;
    return port ? { w, h, win: [12, 18, 42, 36], desk: 150, tv: [27, 82, 90, 68] } : { w, h, win: [16, 16, 54, 46], desk: 94, tv: [118, 44, 76, 56] };
  }
  function drawRoom(t, port) {
    const L = roomLayout(port), { w, h } = L; if (LC.width !== w || LC.height !== h) { LC.width = w; LC.height = h; }
    const g = lg, R = (c, x, y, ww, hh) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, ww | 0, hh | 0); };
    g.imageSmoothingEnabled = false;
    R('#141a30', 0, 0, w, h); for (let x = 3; x < w; x += 9) R('#171e38', x, 0, 2, L.desk);   // 墙纸竖条
    R('#1d1626', 0, L.desk + 22, w, h); for (let y = L.desk + 26; y < h; y += 7) R('#18121f', 0, y, w, 1);   // 地板
    // 窗户 + 月亮 + 星星 + 窗帘
    const [wx, wy, ww, wh] = L.win; R('#2a2f48', wx - 2, wy - 2, ww + 4, wh + 4); R('#0e1430', wx, wy, ww, wh); R('#16204a', wx, wy + wh * .55, ww, wh * .45);
    for (const [sx, sy, p] of STARS) if (Math.sin(t * 2 + p) > -.3) R(Math.sin(t * 3 + p) > .6 ? '#fff' : '#9ab0e0', wx + 2 + sx * (ww - 4), wy + 2 + sy * (wh * .6), 1, 1);
    R('#f4e8b0', wx + ww - 16, wy + 6, 8, 8); R('#0e1430', wx + ww - 13, wy + 5, 6, 6);   // 弯月
    R('#2a2f48', wx + ww / 2 - 1, wy, 2, wh); R('#2a2f48', wx, wy + wh / 2 - 1, ww, 2);
    R('#3a2648', wx - 6, wy - 4, 7, wh + 10); R('#3a2648', wx + ww - 1, wy - 4, 7, wh + 10); R('#2a1c38', wx - 6, wy - 4, 2, wh + 10);
    // 书架
    const bx = port ? w - 40 : w - 54, by = port ? 34 : 22; R('#3a2618', bx, by + 18, 40, 3);
    ['#a83a3a', '#3a7aa8', '#c8a03a', '#4a8a4a', '#8a4aa8', '#c86a3a'].forEach((c, i) => R(c, bx + 3 + i * 6, by + 6 + (i % 2) * 2, 5, 12 - (i % 2) * 2));
    // 桌子
    R('#3a2218', 0, L.desk, w, 3); R('#5a3a28', 0, L.desk + 3, w, 5); R('#2e1a12', 0, L.desk + 8, w, 2); R('#2a1810', 10, L.desk + 10, 5, 30); R('#2a1810', w - 15, L.desk + 10, 5, 30);
    // 电视机（显像管），屏幕里是游戏里的打谷场
    const [tx, ty, tw, th] = L.tv, flick = .85 + .15 * Math.sin(t * 23) * Math.sin(t * 7);
    R('#1e1a24', tx + 4, ty + th, tw - 8, L.desk - ty - th); R('#3a3444', tx, ty, tw, th); R('#4e4858', tx, ty, tw, 2); R('#26222e', tx, ty + th - 3, tw, 3);
    const sx = tx + 5, sy = ty + 5, sw = tw - 18, sh = th - 12;
    if (fieldImg.complete && fieldImg.naturalWidth) g.drawImage(fieldImg, sx, sy, sw, sh); else R('#4a8a3a', sx, sy, sw, sh);
    g.fillStyle = `rgba(160,220,255,${.1 + .08 * flick})`; g.fillRect(sx, sy, sw, sh);
    for (let y = sy; y < sy + sh; y += 2) R('rgba(0,0,0,.18)', sx, y, sw, 1);
    if (Math.floor(t * 1.6) % 2) { g.fillStyle = '#fff'; g.font = '6px monospace'; R('#000', sx + sw / 2 - 16, sy + sh - 9, 32, 7); g.fillStyle = '#fff'; g.fillText('START', sx + sw / 2 - 13, sy + sh - 3); }
    R('#2a2632', tx + tw - 11, ty + 8, 8, 2); R('#2a2632', tx + tw - 11, ty + 12, 8, 2); R(Math.sin(t * 4) > 0 ? '#ff4a3a' : '#8a2a22', tx + tw - 8, ty + th - 9, 2, 2);   // 旋钮、电源灯
    // 游戏机 + 手柄 + 线 + 饮料
    const cx = port ? 18 : tx - 44, cy = L.desk - 9; R('#d8d4cc', cx, cy, 30, 9); R('#a8a49c', cx, cy + 6, 30, 3); R('#3a3a40', cx + 4, cy + 2, 14, 2); R('#ff3a2a', cx + 24, cy + 3, 2, 2);
    g.strokeStyle = '#555'; g.beginPath(); g.moveTo(cx + 30, cy + 7); g.quadraticCurveTo(cx + 40, L.desk + 10, cx + 34, L.desk + 2); g.stroke();
    const px = port ? 60 : tx + tw + 14; R('#2a2a30', px, L.desk - 4, 16, 6); R('#3e3e46', px + 1, L.desk - 5, 14, 2); R('#e84a3a', px + 11, L.desk - 3, 2, 2); R('#4a8ae8', px + 3, L.desk - 3, 3, 1);
    const cnx = port ? w - 24 : w - 40; R('#c84a2a', cnx, L.desk - 10, 7, 10); R('#e8d8b0', cnx, L.desk - 7, 7, 2);
    return L;
  }
  function drawTitle(t) {
    const W = cv.width, H = cv.height, port = H > W * 1.05, L = drawRoom(t, port);
    // 低分辨率画整数倍放大（盖满屏幕）；开场时往电视屏幕里推近
    const k0 = Math.ceil(Math.max(W / L.w, H / L.h)), [tx, ty, tw, th] = L.tv, scx = tx + (tw - 18) / 2 + 5, scy = ty + (th - 12) / 2 + 5;
    let z = 1, p = 0; if (intro) { const T0 = intro.quick ? 0 : intro.lines.length * 1.4 + .4; p = Math.max(0, Math.min(1, (intro.t - T0) / .9)); z = 1 + Math.pow(p, 3) * 14; }
    const ox0 = W / 2 - L.w / 2 * k0, oy0 = H / 2 - (port ? L.h * .42 : L.h / 2) * k0, gx0 = ox0 + scx * k0, gy0 = oy0 + scy * k0;
    const k = k0 * z, e = Math.min(1, p * 1.6), ox = gx0 + (W / 2 - gx0) * e - scx * k, oy = gy0 + (H / 2 - gy0) * e - scy * k;   // 推近时电视屏幕挪到画面正中
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0a0812'; ctx.fillRect(0, 0, W, H); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(LC, rd(ox), rd(oy), rd(L.w * k), rd(L.h * k));
    // 屏幕的光：照到墙和桌面上，忽明忽暗
    const gx = ox + scx * k, gy = oy + scy * k, fl = .75 + .15 * Math.sin(t * 6.1) + .1 * Math.sin(t * 13.7);
    ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, tw * k * 1.3);
    gr.addColorStop(0, `rgba(120,190,255,${.35 * fl})`); gr.addColorStop(.4, `rgba(70,120,220,${.14 * fl})`); gr.addColorStop(1, 'rgba(40,60,160,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (p > .55) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, (p - .55) / .45)})`; ctx.fillRect(0, 0, W, H); }
  }
  function startIntro() {
    const quick = store.get('seenIntro') === '1';
    intro = { t: 0, quick, lines: ['深夜两点。', '你还在打那台旧游戏机……', '屏幕突然亮得刺眼——'] };
    document.querySelector('#title .tbox').style.visibility = 'hidden'; $('bStart').style.visibility = 'hidden'; store.set('seenIntro', '1');
  }
  function introTick(dt) {
    if (!intro) return; intro.t += dt;
    if (!intro.quick) { const n = Math.min(intro.lines.length, Math.floor(intro.t / 1.4) + 1); $('intro').innerHTML = intro.lines.slice(0, n).join('<br>'); }
    const T = (intro.quick ? 0 : intro.lines.length * 1.4 + .4) + 1.05;
    if (intro.t >= T) { intro = null; $('intro').innerHTML = ''; document.querySelector('#title .tbox').style.visibility = ''; $('bStart').style.visibility = ''; openWeapon(); }
  }
  $('bStart').onclick = () => { if (!intro) startIntro(); };
  $('title').addEventListener('pointerdown', e => { if (intro && !intro.quick && e.target.id !== 'bStart') intro.t = Math.max(intro.t, intro.lines.length * 1.4 + .4); });   // 点一下跳过台词

  // 菜单背景：游戏里的打谷场，压暗
  function drawMenuBg(t) {
    const W = cv.width, H = cv.height; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#120c18'; ctx.fillRect(0, 0, W, H);
    if (fieldImg.complete && fieldImg.naturalWidth) { const s = Math.max(W / fieldImg.width, H / fieldImg.height) * 1.04, dw = fieldImg.width * s, dh = fieldImg.height * s, dx = (W - dw) / 2 + Math.sin(t * .2) * W * .01; ctx.imageSmoothingEnabled = true; ctx.drawImage(fieldImg, dx, (H - dh) / 2, dw, dh); }
    ctx.fillStyle = 'rgba(16,8,20,.45)'; ctx.fillRect(0, 0, W, H);
  }

  // ================= 武器选择 =================
  const ICON = {   // 16×16 像素小图标
    sword: ['..............ab', '.............abb', '............abb.', '...........abb..', '..........abb...', '.........abb....', '........abb.....', '...c...abb......', '...cc.abb.......', '....cabb........', '.....cc.........', '....dcc.........', '...dd..c........', '..dd............', '.dd.............', 'dd..............'],
    axe: ['......aaaa......', '....aabbbbaa....', '...abbbbbbbba...', '..abbbbbbbbbba..', '..abbbbccbbbba..', '...aabbccbbaa...', '.....aaccaa.....', '.......cc.......', '.......cc.......', '.......cc.......', '.......cc.......', '.......cc.......', '.......cc.......', '.......dd.......', '.......dd.......', '................'],
    fire: ['.......e........', '......eee.......', '.....eeffe......', '....eeffffe.....', '...eefffggfe....', '..eefffggggfe...', '..effgggghhgfe..', '.eefggghhhhgfe..', '.efggghhhhhhgfe.', '.efgghhhhhhhgfe.', '.efgghhhhhhggfe.', '..efgghhhhggfe..', '..eefggggggfee..', '...eeffffffee...', '....eeeeeeee....', '................'],
  };
  const PAL = { a: '#3a2218', b: '#dfe4f0', c: '#c8862a', d: '#7a4a22', e: '#a02a10', f: '#e85a20', g: '#ffa030', h: '#fff2a0' };
  function iconCanvas(name) { const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); ICON[name].forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') { g.fillStyle = PAL[ch]; g.fillRect(x, y, 1, 1); } })); return c; }
  function buildWeapons() {
    const box = $('wCards'); box.innerHTML = '';
    for (const [id, w] of Object.entries(DATA.weapons)) {
      const d = document.createElement('div'); d.className = 'card panel' + (id === sel.weapon ? ' on' : ''); d.dataset.id = id;
      d.innerHTML = `<div class="tx"><b>${w.name}</b><p>${w.desc}</p><ul>${w.stat.map(s => `<li>${s}</li>`).join('')}</ul></div>`; d.prepend(iconCanvas(w.icon));
      d.onclick = () => { sel.weapon = id; store.set('weapon', id); heroSwing = .6; for (const c of box.children) c.classList.toggle('on', c.dataset.id === id); };
      box.appendChild(d);
    }
  }
  let heroSwing = 0;
  function drawHeroPreview(t, dt) {
    const c = $('heroCv'), r = c.getBoundingClientRect(); if (!r.width) return; const dpr = Math.min(3, devicePixelRatio || 1), W = rd(r.width * dpr), H = rd(r.height * dpr);
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; } const g = c.getContext('2d'); g.clearRect(0, 0, W, H); g.imageSmoothingEnabled = false;
    const u = Math.max(1, Math.floor(Math.min(H * .8 / 45, W * .8 / 50))); heroSwing -= dt;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(W / 2 + 3 * u, H * .88, 15 * u, 4 * u, 0, 0, 7); g.fill();
    const [n, i] = heroSwing > 0 ? ['atk', heroSwing > .4 ? 0 : 1] : ['idle', Math.floor(t * 2) % 2];
    SPR.draw(g, 'hero', n, i, W / 2, H * .88, false, u);
  }
  function openWeapon() { sel.weapon = store.get('weapon') && DATA.weapons[store.get('weapon')] ? store.get('weapon') : sel.weapon; buildWeapons(); show('weapon'); }
  $('wBack').onclick = () => show('title');
  $('wNext').onclick = () => openMaps();

  // ================= 地图选择 =================
  function foeCanvas(type) { const r = SPR.crop(type, 'idle0'); if (!r) return document.createElement('canvas'); r.c.title = DATA.enemies[type].name; return r.c; }
  function openMaps() {
    const box = $('mCards'); box.innerHTML = ''; $('mWep').textContent = '武器：' + DATA.weapons[sel.weapon].name;
    for (const m of DATA.maps) {
      const d = document.createElement('div'); d.className = 'map panel' + (m.open ? '' : ' lock') + (m.id === sel.map ? ' on' : ''); d.dataset.id = m.id;
      d.innerHTML = `<div class="pic" ${m.open ? `style="background-image:url('${m.img}')"` : ''}></div><b>${m.open ? m.name : m.name}</b><p>${m.desc}</p>${m.open ? '<div class="foes"></div>' : ''}`;
      if (m.open && m.foesImg) { const f = d.querySelector('.foes'); m.foesImg.forEach((k, i) => { const im = new Image(); im.src = `art/cav/${k}/${k === 'pcav8' ? 'E2' : 'E0'}.png`; if (i === 2) im.className = 'bs'; f.appendChild(im); }); if (m.heroImg) { const h = new Image(); h.src = m.heroImg; h.className = 'bs'; h.style.marginRight = '8px'; f.prepend(h); } const s = document.createElement('span'); s.textContent = '首领：' + m.bossName; f.appendChild(s); }
      else if (m.open) { const f = d.querySelector('.foes'); m.foes.forEach(k => f.appendChild(foeCanvas(k))); const b = foeCanvas(m.boss); b.className = 'bs'; f.appendChild(b); const s = document.createElement('span'); s.textContent = '首领：' + DATA.enemies[m.boss].name; f.appendChild(s); }
      d.onclick = () => { if (!m.open) { d.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], 200); return; } sel.map = m.id; for (const c of box.children) c.classList.toggle('on', c.dataset.id === m.id); };
      box.appendChild(d);
    }
    show('mapsel');
  }
  $('mBack').onclick = () => openWeapon();
  $('mGo').onclick = () => startBattle();

  // ================= 战斗 =================
  let MOD = null;   // 当前战斗模块：勇者 BATTLE / 骑兵 CAV
  async function startBattle() {
    const m0 = DATA.maps.concat(DATA.sandbox).find(x => x.id === sel.map);
    if (m0.mode === 'cav') {   // 骑兵素材多：先显示载入进度，载完再开打；有图载不下来就把名字列出来
      const L = $('load'); show('load');
      const ld = await CAV.preload(p => { L.innerHTML = `<b>载入骑兵素材…… ${p.done} / ${p.n}</b>`; });
      if (ld.bad.length) { L.innerHTML = `<b style="max-width:90vw;text-align:center;line-height:1.6">有 ${ld.bad.length} 张图载入失败：<br>${ld.bad.slice(0, 4).map(u => u.split('/').slice(-2).join('/')).join('、')}…<br><br>点一下仍然开打</b>`; await new Promise(r => L.addEventListener('pointerdown', r, { once: true })); }
    }
    startBattle0();
  }
  function startBattle0() { const m = DATA.maps.concat(DATA.sandbox).find(x => x.id === sel.map); if (MOD) MOD.stop(); MOD = m.mode === 'cav' ? CAV : BATTLE; MOD.start({ weapon: sel.weapon, map: sel.map }); $('bRoll').textContent = m.feel === 'horse' ? '冲锋' : '翻滚'; $('bBg').style.display = m.bgSwitch ? '' : 'none'; if (m.bgSwitch) $('bBg').textContent = CAV.bg() === 'field' ? '换无尽草原' : '换打谷场'; tipFor = m.feel || 'hero'; show('battle'); for (const id of ['levelup', 'pause', 'result']) overlay(id, false); tipT = 6; }
  let tipT = 0, HC = {}, tipFor = 'hero';
  const set = (id, prop, v) => { if (HC[id + prop] === v) return; HC[id + prop] = v; const e = $(id); if (prop === 'text') e.textContent = v; else if (prop === 'w') e.style.width = v; else if (prop === 'show') e.style.display = v ? 'block' : 'none'; else if (prop === 'cls') e.className = v; };
  const mmss = t => { t = Math.ceil(t); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };
  function hud(h) {
    set('hpBar', 'w', (h.hp / h.maxHp * 100).toFixed(1) + '%'); set('hpTxt', 'text', `${Math.ceil(h.hp)} / ${h.maxHp}`);
    set('lvTxt', 'text', 'Lv ' + h.lv); set('xpBar', 'w', (h.xp / h.need * 100).toFixed(1) + '%');
    set('clock', 'text', h.bossOut ? '首领战！' : '首领 ' + mmss(h.left)); set('clock', 'cls', 'clock' + (!h.bossOut && h.left < 10 ? ' red' : ''));
    set('kills', 'text', '击倒 ' + h.kills);
    set('bossName', 'text', h.bossName || '哥布林王'); set('speed', 'text', h.speed != null ? '速度 ' + h.speed + '%' : '');
    set('bossBox', 'show', h.boss != null); if (h.boss != null) set('bossBar', 'w', (h.boss * 100).toFixed(1) + '%');
    set('banner', 'text', h.banner); set('banner', 'show', !!h.banner);
    set('tip', 'text', tipT > 0 ? (tipFor === 'horse' ? (document.body.classList.contains('touch') ? '拖动转向 · 马有惯性，越快越痛 · 右下角冲锋' : 'WASD 转向 · 马有惯性，越快越痛，满速撞飞步兵 · 空格冲锋') : document.body.classList.contains('touch') ? '按住屏幕拖动走位 · 右下角翻滚 · 武器自动出手' : 'WASD / 方向键移动 · 空格翻滚 · 武器自动出手 · P 暂停') : '');
  }
  function levelUp(list, done) {
    $('luTitle').textContent = '升级！'; const box = $('ups'); box.innerHTML = '';
    for (const o of list) { const d = document.createElement('div'); d.className = 'up'; d.innerHTML = `<b>${o.name}</b><span>${o.desc}</span>`; d.onclick = () => { overlay('levelup', false); done(o.id); }; box.appendChild(d); }
    overlay('levelup', true);
  }
  function togglePause(force) {
    if (screen !== 'battle' || !MOD || !MOD.active() || $('levelup').classList.contains('on')) return;
    const on = force != null ? force : !MOD.paused; MOD.pause(on); overlay('pause', on);
  }
  $('bBg').onclick = () => { if (!CAV.bg()) return; CAV.setBg(CAV.bg() === 'field' ? 'inf' : 'field'); startBattle0(); };   // 第 3、4 块：背景在打谷场和无尽草原之间切换（重开这一局）
  addEventListener('keydown', e => { if (e.code === 'KeyB' && screen === 'battle' && MOD === CAV && CAV.bg()) $('bBg').click(); });
  $('bPause').onclick = () => togglePause(); $('pRes').onclick = () => togglePause(false);
  $('pRe').onclick = () => startBattle(); $('pHome').onclick = () => { MOD && MOD.stop(); overlay('pause', false); show('title'); };
  $('bRoll').addEventListener('pointerdown', e => { e.stopPropagation(); MOD && MOD.roll(); });
  function result(r) {
    $('rTitle').textContent = r.win ? '胜利！' : '败北……';
    $('rMsg').textContent = r.win ? (r.wname || r.map === 'cav2' ? '敌将落马，整条战线崩了。' : '哥布林王倒下了，屏幕那头好像传来了「下一关」的音乐。') : '眼前一黑……再按一次开始键吧。';
    $('rStats').innerHTML = `<span>用时</span><b>${mmss(r.time)}</b><span>击倒</span><b>${r.kills}</b><span>等级</span><b>Lv ${r.lv}</b><span>武器</span><b>${r.wname || DATA.weapons[r.weapon].name}</b>`;
    if (r.win) store.set('clear_' + r.map, '1');
    overlay('result', true);
  }
  $('rAgain').onclick = () => startBattle(); $('rWep').onclick = () => { MOD && MOD.stop(); overlay('result', false); openWeapon(); }; $('rHome').onclick = () => { MOD && MOD.stop(); overlay('result', false); show('title'); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) togglePause(true); });

  // ================= 主循环 =================
  let T = 0;
  function loop(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now; T += dt;
    if (screen === 'battle') { if (MOD) MOD.frame(dt); if (tipT > 0) tipT -= dt; }
    else if (screen === 'title') { introTick(dt); drawTitle(T); }
    else if (screen === 'weapon' || screen === 'mapsel') { drawMenuBg(T); if (screen === 'weapon') drawHeroPreview(T, dt); }
    requestAnimationFrame(loop);
  }
  window.UI = { mod: () => MOD || BATTLE, hud, levelUp, result, togglePause, show, startBattle, openWeapon, openMaps, sel, get screen() { return screen; } };
  BATTLE.init(cv); CAV.init(cv);
  SPR.load().then(() => { show('title'); requestAnimationFrame(loop); }).catch(e => { $('load').innerHTML = '<b>载入失败：' + e + '</b>'; });
})();

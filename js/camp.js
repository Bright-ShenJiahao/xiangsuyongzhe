// 像素勇者 · 波间结算页（照三国终章的整备屏：结算 / 拾取 / 修炼 / 行商 / 技能）+ 暂停时的备战页。
// 技能搭配：点一个格子选中，再点另一个格子就交换；背包里的技能书点技能格就装上，同一招的书装到同一招上 = 升一级。
(() => {
  const $ = id => document.getElementById(id), B = () => BATTLE, R = () => BATTLE.run(), MLm = id => { try { return JSON.parse(localStorage.getItem('xsyz-meta') || '{}')[id] || 0; } catch (e) { return 0; } };   /* 11/25 局外强化等级 */
  const SK = DATA.skills, ITEM = id => DATA.startItems.find(i => i.id === id), USE = id => DATA.consumables.find(i => i.id === id);
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const coinTxt = n => `<span class="cn">${UI.piH('coin', 1)} ${n}</span>`;
  let rep = null, tab = 'jie', sel = null, loot = [];

  // ---------- 通用：东西的样子 ----------
  const dots = (L) => '●'.repeat(L) + '○'.repeat(7 - L);
  function thing(o) {   // 返回 { icon(dom), name, desc, sell }
    if (!o) return null;
    // 出售：书半价（22 / 34 / 52 → 11 / 17 / 26），宝物拿基价的 35%
    if (o.kind === 'book') { const S = SK[o.id], st = DATA.setOf(R().slots), n = st.n[S.sys] || 0, L = DATA.sets[S.sys], nx = L && L.find(t => t[0] > n); return { tier: S.tier, icon: UI.bookOf(o.id), name: S.name, sub: `${S.sys} · ${DATA.tierName[S.tier]}`, desc: S.desc + (L ? `<br><small class="${st.on[S.sys] ? 'on' : 'off'}">${S.sys}系羁绊 ${n}/${nx ? nx[0] : 4}${nx ? '：' + nx[2] : '（已满）'}</small>` : ''), brief: S.brief, sell: null }; }   /* 11/25 技能书不能在营地卖：带回宫殿，死了还有命就能带回去，让大法师换水晶 */
    if (o.kind === 'oup') return { icon: UI.pi('reroll'), name: '印记升级 +1', sub: '裂缝里的符文', desc: '随机让一个已装备、未满级的誓约印记升 1 级', sell: 0 };
    if (o.kind === 'oath') { const O = DATA.oaths[o.id], L = Math.min(5, o.lv || 1), ic = UI.pi('oath/' + o.id); ic.classList.add('oimg');
      return { icon: ic, name: O.name, sub: `${O.mv ? '身法印记' : '誓约印记'} · Lv${L}`, desc: O.d(DATA.oathLv[L - 1]) + (L < 5 ? `<br><small class="off">下一级：${O.d(DATA.oathLv[L])}</small>` : '<br><small class="on">已满级</small>'), sell: 10 + 6 * L }; }
    if (o.kind === 'item') { const it = ITEM(o.id), L = Math.min(5, o.lv || 1); return { icon: UI.pi(o.id), name: it.name, sub: it.d ? `宝物 · Lv${L}` : '宝物', desc: it.d ? it.d(DATA.oathLv[L - 1]) + (L < 5 ? '<br><small class="off">同名再得一件升一级</small>' : '') : it.desc, sell: Math.round((it.price || 25) * DATA.price.sell) }; }
    const c = USE(o.id); return { icon: UI.pi(o.id), name: c.name, sub: '消耗品', desc: c.desc, sell: 3 };
  }
  function iconEl(t) { const s = document.createElement('span'); s.className = 'ic' + (t.tier ? ' tr t' + t.tier : ''); if (t.icon) s.appendChild(t.icon); else s.textContent = t.emoji; return s; }
  // 学会一本书：已经有这一招就升一级，否则放进背包
  function learn(o, quiet) { if (o && ['book', 'item', 'oath'].includes(o.kind)) { const r0 = R(); (r0.got = r0.got || []).push({ kind: o.kind, id: o.id }); } try { if (o && o.id) SEEN.add({ book: 's:', item: 'i:', oath: 'o:' }[o.kind] + o.id); } catch (e) {}
    const r = R(); const toast = quiet ? () => {} : toast0;
    if (o.kind === 'book') {
      const has = r.slots.find(s => s && s.id === o.id) || r.bag.find(b => b && b.kind === 'book' && b.id === o.id);
      if (has) { has.lv += o.lv || 1; toast(`${SK[o.id].name} 升到 Lv${has.lv}`); return true; }
    }
    if (o.kind === 'oup') { const L = [...r.oath, ...r.mv].filter(x => x && x.lv < 5); if (!L.length) { toast('没有可以升级的誓约印记'); return false; } const x = L[Math.random() * L.length | 0]; x.lv++; B().recompute(); toast(`${DATA.oaths[x.id].name} 升到 Lv${x.lv}`); return true; }
    if (o.kind === 'oath') { const O = DATA.oaths[o.id], has = [...r.oath, ...r.mv, ...r.bag].find(x => x && x.kind === 'oath' && x.id === o.id);
      if (has) { if (has.lv >= 5) { r.coins += 20; toast(`${O.name} 已满级，换成 20 铜钱`); return true; } has.lv++; B().recompute(); toast(`${O.name} 升到 Lv${has.lv}`); return true; }
      const A = O.mv ? r.mv : r.oath, j = A.indexOf(null); if (j >= 0) { A[j] = { kind: 'oath', id: o.id, lv: 1, mv: !!O.mv }; B().recompute(); return true; } }
    if (o.kind === 'use') { const c = USE(o.id), h = B().hero(); B().healHero(h.maxHp * c.heal); toast(`吃掉${c.name}，回复生命`); return true; }
    if (o.kind === 'book') { const j = r.slots.findIndex((s, k) => !s && k < r.open); if (j >= 0) { r.slots[j] = { id: o.id, lv: 1, xp: o.xp || 0 }; toast(`${SK[o.id].name} 自动装上第 ${j + 1} 格` + (r.tipP ? '' : ' · 按 P 调整顺序')); r.tipP = 1; return true; } }   // 技能栏有空位就直接装上
    if (o.kind === 'item' && ITEM(o.id).d) { const has = [...r.gear, ...r.bag].find(x => x && x.kind === 'item' && x.id === o.id); if (has) { if ((has.lv || 1) >= 5) { r.coins += 20; toast(`${ITEM(o.id).name} 已满级，换成 20 铜钱`); return true; } has.lv = (has.lv || 1) + 1; has.up = Date.now(); B().recompute(); toast(`${ITEM(o.id).name} 升到 Lv${has.lv}`); UI.feed(`${ITEM(o.id).name} 升到 Lv${has.lv}！`); return true; } }
    if (o.kind === 'item') { const g = r.gear.indexOf(null); if (g >= 0) { r.gear[g] = { kind: 'item', id: o.id }; B().recompute(); return true; } }   // 11/23 宝物格有空就直接生效
    const i = r.bag.indexOf(null); if (i < 0) { toast('物品栏满了，先腾出点位置'); return false; }
    r.bag[i] = o.kind === 'book' ? { kind: 'book', id: o.id, lv: 1, xp: o.xp || 0 } : o.kind === 'oath' ? { kind: 'oath', id: o.id, lv: 1, mv: !!DATA.oaths[o.id].mv } : { kind: o.kind, id: o.id }; if (inFight()) r.bag[i].fresh = 1;
    return true;
  }
  // 点锁着的技能格：花铜钱解锁（第 4 格第 2 站起 50，第 5 格第 5 站起 78，每站涨 7%；第 4 / 8 站打完也会免费开）
  function slotPrice(n) { const P = DATA.price, st = B().st(), fx = B().hero().fx; return { at: n === 4 ? P.slot4At : P.slot5At, free: n === 4 ? 4 : 8, cost: Math.round((n === 4 ? P.slot4 : P.slot5) * (1 + P.stUp * (st - 1)) * (1 + (fx.shop || 0))), st }; }
  function lockInfo(info, i, box) {
    const r = R(), n = i + 1, p = slotPrice(n); info.insertAdjacentHTML('beforeend', `<span class="ic">${UI.piH('lock')}</span>`);
    const q = document.createElement('p'); info.appendChild(q);
    if (i > r.open) { q.innerHTML = `<b>第 ${n} 格</b><br>先解锁第 ${r.open + 1} 格。`; return; }
    q.innerHTML = `<b>第 ${n} 格</b><br>技能栏多开一格，多放一招轮流出手。有铜钱随时能买。`;
    const bs = document.createElement('div'); bs.className = 'lob'; info.appendChild(bs); const b = document.createElement('button'); b.className = 'btn mini gold'; b.innerHTML = `解锁 ${UI.piH('coin', 1)}${p.cost}`;
    b.onclick = e => { e.stopPropagation(); if (r.coins < p.cost) return toast('铜钱不够'); r.coins -= p.cost; r.open = Math.max(r.open, n); sel = null; toast(`第 ${n} 格解锁了`); refreshCoin(); loadout(box); }; bs.appendChild(b);
  }
  let toastT = 0; function toast0(s) { toast(s); } function toast(s) { const e = $('toast'); e.textContent = s; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), 1600); }

  // ---------- 技能搭配（结算页「技能」页签和暂停页共用） ----------
  let prevFill = null;
  function loadout(box) {
    const r = R(), h = B().hero(); box.innerHTML = '';
    document.querySelectorAll('.loinfo.pop').forEach(e => e.remove()); const wrap = document.createElement('div'); wrap.className = 'lo gearlo'; box.appendChild(wrap);
    { const st = DATA.setOf(r.slots), bar = document.createElement('div'); bar.className = 'setbar'; bar.innerHTML = Object.keys(DATA.sets).map(sys => { const n = st.n[sys] || 0, t = st.on[sys], nx = DATA.sets[sys].find(x => x[0] > n); return n ? `<span class="${t ? 'on' : ''}"><b>${sys} ${n}/${nx ? nx[0] : 4}</b> ${t ? t[2] : '再 ' + (nx[0] - n) + ' 本：' + nx[2]}</span>` : ''; }).join(''); if (bar.innerHTML) wrap.before(bar); }   // 11/24 羁绊一览
    const L = document.createElement('div'), Rt = document.createElement('div'); L.className = 'lol'; Rt.className = 'lor'; wrap.append(L, Rt);
    let cyc = 0; r.slots.slice(0, r.open).forEach(s => { if (s) cyc += B().skillInfo(s).cd; });
    L.insertAdjacentHTML('beforeend', `<h4>技能栏 <small>按 1→2→3 顺序轮流自动出手 · 一轮约 ${cyc.toFixed(1)} 秒</small></h4>`);
    const sl = document.createElement('div'); sl.className = 'slots'; L.appendChild(sl);
    r.slots.forEach((s, i) => { const d = document.createElement('div'); d.innerHTML = `<u>${i + 1}</u>`;
      if (i >= r.open) { d.dataset.t = 'L'; d.dataset.i = i; d.className = 'slot lock' + (i === r.open ? ' buy' : ''); if (sel && sel.t === 'L' && sel.i === i) d.classList.add('sel'); d.onclick = () => { sel = { t: 'L', i }; loadout(box); }; }
      else if (s) { d.className = 'slot has full tr t' + SK[s.id].tier; d.appendChild(UI.skIcon(s.id)); d.insertAdjacentHTML('beforeend', lvTag(s)); }
      else { d.className = 'slot'; d.insertAdjacentHTML('beforeend', '空'); }
      if (sel && sel.t === 's' && sel.i === i) d.classList.add('sel');
      if (i < r.open) { d.onclick = () => dragged || pick({ t: 's', i }, box); drag(d, { t: 's', i }, !!s, box); } sl.appendChild(d); });
    // 11/23 誓约印记 3 格 + 身法 1 格（同一行）
    L.insertAdjacentHTML('beforeend', '<h4>誓约印记 <small>同名升级 · 最后一格放身法</small></h4>');
    const om = document.createElement('div'); om.className = 'bag oathrow'; L.appendChild(om);
    const oc = (arr, t, cls, empty) => arr.forEach((o, i) => { const d = document.createElement('div'); d.className = cls + (o ? ' has full' : ''); if (o) { d.appendChild(iconEl(thing(o))); d.insertAdjacentHTML('beforeend', `<b class="lvb">${o.lv}</b>`); } else d.innerHTML = empty; if (sel && sel.t === t && sel.i === i) d.classList.add('sel'); d.onclick = () => dragged || pick({ t, i }, box); drag(d, { t, i }, !!o, box); om.appendChild(d); });
    oc(r.oath, 'o', 'oath', ''); om.insertAdjacentHTML('beforeend', '<div class="gap"></div>'); oc(r.mv, 'm', 'mv', '<span>身法</span>');
    const cell = (grid, arr, t) => arr.forEach((o, i) => { const d = document.createElement('div'); const th = thing(o);
      if (th) { d.className = 'has full ' + o.kind + (th.tier ? ' tr t' + th.tier : ''); if (o.kind === 'book') { d.appendChild(UI.skIcon(o.id)); d.insertAdjacentHTML('beforeend', lvTag(o) + '<em class="bk">书</em>'); } else { d.appendChild(iconEl(th)); if (o.kind === 'item' && ITEM(o.id).d) d.insertAdjacentHTML('beforeend', `<b class="lvb">${o.lv || 1}</b>`); if (o.up && Date.now() - o.up < 4000) d.classList.add('put'); } if (o.fresh && inFight()) d.insertAdjacentHTML('beforeend', '<em class="nw">新</em>'); }
      if (sel && sel.t === t && sel.i === i) d.classList.add('sel');
      d.onclick = () => dragged || pick({ t, i }, box); drag(d, { t, i }, !!o, box); grid.appendChild(d); });
    L.insertAdjacentHTML('beforeend', `<h4>宝物 ${r.gear.filter(Boolean).length}/${r.gear.length} <small>放在这里就生效</small></h4>`);
    const gg = document.createElement('div'); gg.className = 'bag gear'; L.appendChild(gg); cell(gg, r.gear, 'g');
    Rt.insertAdjacentHTML('beforeend', '<h4>物品栏 <small>收纳，不生效；拖到左边格子才生效</small></h4>');
    const bg = document.createElement('div'); bg.className = 'bag'; Rt.appendChild(bg); cell(bg, r.bag, 'b');
    { const now = {}; let k = 0; L.querySelectorAll('.slots > div, .oathrow > div:not(.gap), .gear > div').forEach((el, i) => { el.style.setProperty('--k', k++); const key = i, v = el.classList.contains('has') ? el.innerHTML : ''; now[key] = v; if (prevFill && v && prevFill[key] !== v) el.classList.add('put'); }); prevFill = now; }
    // 11/23 详情改成跟着格子弹出：电脑悬停就看，点一下带按钮；手机点一下弹在格子上方
    if (sel) { const el = box.querySelector(`[data-t="${sel.t}"][data-i="${sel.i}"]`) || box.querySelector('.slot.sel'); if (el) popAt(el, sel.t === 'L' ? info => lockInfo(info, sel.i, box) : info => fillInfo(info, box, true), box); }
    box.querySelectorAll('[data-t]').forEach(el => { el.onmouseenter = () => { if (sel || matchMedia('(hover: none)').matches) return; const q = { t: el.dataset.t, i: +el.dataset.i }; if (!curOf(q)) return; popAt(el, info => fillInfo(info, box, false, q), box, 1); }; el.onmouseleave = () => { if (!sel) document.querySelectorAll('.loinfo.pop').forEach(e => e.remove()); }; });
  }
  const inFight = () => { const G = B().g && B().g(); return !!(G && !G.fe && !G.over); };
  const ARR0 = (r, q) => q.t === 's' ? r.slots : q.t === 'g' ? r.gear : q.t === 'o' ? r.oath : q.t === 'm' ? r.mv : r.bag;
  function curOf(q) { const r = R(); if (!q) return null; if (q.t === 's') { const s = r.slots[q.i]; return s && { kind: 'book', id: s.id, lv: s.lv, xp: s.xp || 0, slot: true }; } return ARR0(r, q)[q.i]; }
  function lvTag(s) { const k = B().skillInfo(s); return `<b class="lvb">${k.L}</b><s class="pb${k.next ? '' : ' max'}" style="--p:${k.next ? Math.min(100, k.xp / k.next * 100) : 100}%"></s>`; }
  function popAt(el, fill, box, hover) {
    document.querySelectorAll('.loinfo.pop').forEach(e => e.remove());
    const info = document.createElement('div'); info.className = 'loinfo pop' + (hover ? ' hov' : ''); document.body.appendChild(info); fill(info);
    const rc = el.getBoundingClientRect(), w = info.offsetWidth, h = info.offsetHeight, W = innerWidth, H = innerHeight, narrow = W < 760;
    let x, y; if (narrow) { x = Math.max(8, Math.min(W - w - 8, rc.left + rc.width / 2 - w / 2)); y = rc.top - h - 8; if (y < 8) y = rc.bottom + 8; }
    else { x = rc.right + 10; if (x + w > W - 8) x = rc.left - w - 10; y = Math.max(8, Math.min(H - h - 8, rc.top)); }
    info.style.left = x + 'px'; info.style.top = y + 'px';
    if (hover) return;
    const kill = e => { if (!info.isConnected) return removeEventListener('pointerdown', kill, true); if (info.contains(e.target) || (e.target.closest && e.target.closest('[data-t]'))) return; info.remove(); sel = null; removeEventListener('pointerdown', kill, true); if (box.isConnected) loadout(box); };
    addEventListener('pointerdown', kill, true);
    const watch = () => { if (!info.isConnected) return; if (!box.isConnected || !box.offsetParent) { info.remove(); sel = null; return; } requestAnimationFrame(watch); }; requestAnimationFrame(watch);
  }
  function fillInfo(info, box, withBtn, q) {
    const r = R(), cur = curOf(q || sel); if (!cur) return; const t = thing(cur); if (cur.kind === 'book') { const w = document.createElement('span'); w.className = 'ic'; w.appendChild(UI.skIcon(cur.id)); info.appendChild(w); } else info.appendChild(iconEl(t));
    let txt = `<b class="${t.tier ? 'tn' + t.tier : ''}">${t.name}</b> <small>${t.sub}</small><br>${t.desc}`;
    if (cur.kind === 'book') { const S = SK[cur.id], k = B().skillInfo(cur); const AN = { str: '力量', agi: '敏捷', int: '智力' }[S.type], av = (B().hero().A || {})[S.type] || 0;
      txt += `<span class="kst"><span>伤害 <b>${Math.round(k.dmg)}</b></span><span>${S.dt === 'magic' ? '魔法' : '物理'}</span><span>前摇 ${k.wu.toFixed(2)}s</span><span>后摇 ${k.rc.toFixed(2)}s</span>${S.hold ? `<span>持续 ${S.hold}s</span>` : ''}</span>`
        + (AN ? `<span class="katt a-${S.type}">受<b>${AN}</b>加成 · 每点 +6%（现在 +${av * 6}%）</span>` : '') + `<small>熟练 Lv${k.L}${k.next ? `（${k.xp}/${k.next}）` : '（已练满）'}</small>` + ['l3', 'l5', 'l7'].filter(x => S[x]).map(x => `<small class="${k.L >= +x.slice(1) ? 'on' : 'off'}">Lv${x.slice(1)}：${S[x]}</small>`).join(''); }
    const p = document.createElement('p'); p.innerHTML = txt; info.appendChild(p);
    if (!withBtn) return; const cs = sel;
    const btns = document.createElement('div'); btns.className = 'lob'; info.appendChild(btns);
    const btn = (label, fn, gold) => { const b = document.createElement('button'); b.className = 'btn mini' + (gold ? ' gold' : ''); b.textContent = label; b.onclick = e => { e.stopPropagation(); info.remove(); fn(); }; btns.appendChild(b); };
    const F = inFight(); if (F) btns.insertAdjacentHTML('beforeend', '<small class="dim">战斗中：卸下、卖要等站末</small>');
    if (cs.t === 's') { if (!F && r.slots.filter(Boolean).length > 1) btn('卸下', () => { const j = r.bag.indexOf(null); if (j < 0) return toast('物品栏满了'); r.bag[j] = { kind: 'book', id: cur.id, lv: cur.lv, xp: cur.xp }; r.slots[cs.i] = null; sel = null; loadout(box); }); }
    else {
      if (cur.kind === 'book') btn('装上', () => { const j = r.slots.slice(0, r.open).indexOf(null); if (j < 0) return toast('技能格满了：拖到一个技能格上替换'); pick({ t: 's', i: j }, box); }, true);
      const A = cs.t === 'g' ? r.gear : r.bag;
      if (cur.kind === 'item' && cs.t === 'b') btn('放上', () => { const j = r.gear.indexOf(null); if (j < 0) return toast('宝物格满了：拖到一件宝物上替换'); r.gear[j] = cur; r.bag[cs.i] = null; sel = null; B().recompute(); loadout(box); }, true);
      if (cs.t === 'g' && !F) btn('收进物品栏', () => { const j = r.bag.indexOf(null); if (j < 0) return toast('物品栏满了'); r.bag[j] = cur; r.gear[cs.i] = null; sel = null; B().recompute(); loadout(box); });
      if (cur.kind === 'use') btn('吃掉', () => { learn(cur); A[cs.i] = null; sel = null; loadout(box); }, true);
      if (!F && t.sell != null) btn(`卖掉 ${t.sell}`, () => { r.coins += t.sell; A[cs.i] = null; sel = null; B().recompute(); loadout(box); refreshCoin(); });
    }
  }
  // ---------- 属性页：升级攒的属性点手动加；这次结算 / 暂停里加的点，离开前都能退 ----------
  function commit() { const r = R(); for (const k in r.tmp) r.alloc[k] = (r.alloc[k] || 0) + r.tmp[k]; r.tmp = {}; }
  const redraw = () => $('pause').classList.contains('on') ? pauseRender() : render();
  function attrPanel(box) {
    const r = R(), h = B().hero(); box.innerHTML = '';
    const items = r.gear.filter(x => x && x.kind === 'item').map(x => ({ id: x.id, lv: x.lv || 1 })), c = DATA.calc({ weapon: r.weapon, attrs: r.attrs, train: B().trainAll(), items, habit: r.habit });
    const pct = v => (v >= 0 ? '+' : '') + Math.round(v * 100) + '%';
    { const T = DATA.titles.find(t => t.id === r.title), d = document.createElement('div'); d.className = 'ttlbar'; d.innerHTML = T ? `<b>称号：${T.name}</b>　${T.d.replace(/<br>/g, '　')}` : '<b>称号：未佩戴</b>　<small>（宫殿里找公主「出发准备」更换）</small>'; if (r.newT && r.newT.length) d.innerHTML += `<br><span class="new">这局新获得：${r.newT.join('、')}（下一局起可佩戴）</span>`; box.appendChild(d); }   // 11/24 称号
    const wrap = document.createElement('div'); wrap.className = 'lo attrlo'; box.appendChild(wrap);
    const L = document.createElement('div'), Rt = document.createElement('div'); L.className = 'lol'; Rt.className = 'lor'; wrap.append(L, Rt);
    L.innerHTML = `<h4>属性 <small>Lv${B().lv()} · 修炼来自公主的光球</small></h4>`;
    for (const a of DATA.attrs) {
      const tr = r.train[a.id] || 0, al = (r.alloc[a.id] || 0) + (r.tmp[a.id] || 0), base = c.A[a.id] - tr - al, row = document.createElement('div'); row.className = 'arow'; row.title = a.desc;
      const src = [`基础 ${base}`, tr && `修炼 +${tr}`, al && `加点 +${al}`].filter(Boolean).join(' · ');
      row.innerHTML = `<b>${UI.piH(a.id, 1)}${a.name}</b><small>${src}<br><span class="src">${a.desc}</span></small><em>${c.A[a.id]}</em>`;
      L.appendChild(row);
    }
    const hp = DATA.heroes.find(x => x.id === r.hero) || {};
    const g = (t, rows) => `<h5>${t}</h5><div class="stats big">${rows.map(([ic, n, v]) => `<span>${UI.piH(ic, 1)}${n}</span><b>${v}</b>`).join('')}</div>`;
    Rt.innerHTML = `<h4>勇者</h4>` +
      g('进攻', [['str', '剑 · 枪伤害', pct(.06 * c.A.str + (c.fx.dmg || 0))], ['agi', '弓伤害', pct(.06 * c.A.agi + (c.fx.dmg || 0))], ['int', '法杖伤害', pct(.06 * c.A.int + (c.fx.dmg || 0))], ['spd', '出手速度', pct(c.spd - 1)], ['area', '范围', pct(c.area - 1)], ['crit', '物理暴击', `${Math.round(c.critP * 100)}% <small>伤害 ${Math.round(c.critMulP * 100)}%</small>`], ['star', '魔法暴击', `${Math.round(c.critM * 100)}% <small>伤害 ${Math.round(c.critMulM * 100)}%</small>`]]) +
      g('防御', [['hp', '生命', `${Math.ceil(h.hp)} / ${h.maxHp}`], ['guard', '物防', `${c.pdef} <small>受物理 ×${c.pIn.toFixed(2)}</small>`], ['star', '魔防', `${c.mdef} <small>受魔法 ×${c.mIn.toFixed(2)}</small>`], ['move', '闪避', `${Math.round(c.eva * 100)}% <small>物理、魔法都能躲</small>`]]) +
      g('其他', [['clover', '幸运', `${r.luck || 0} <small>掉落 ${pct(.05 * (r.luck || 0))} · 价格 ${pct(-.03 * (r.luck || 0))}</small>`], ['move', '移速', pct(c.move - 1)], ['xp', '经验', pct(c.xp * (r.hero === 'm' ? 1.1 : 1) - 1)]]);
    L.insertAdjacentHTML('beforeend', `<p class="dim">人物被动：${hp.name || ''} · ${hp.perk || '无'}</p><p class="dim">生效宝物：${items.length ? items.map(e => (DATA.startItems.find(i => i.id === e.id) || {}).name + (e.lv > 1 ? ' Lv' + e.lv : '')).join('、') : '无'}</p>`);
    /* 11/25 属性页收进一页：放不下就整体缩小（不出现滚动条） */
    const fitAttr = () => { let sc = wrap.parentNode; while (sc && sc !== document.body && sc.scrollHeight <= sc.clientHeight + 1) sc = sc.parentNode; if (!sc || sc === document.body) return; wrap.style.zoom = 1; let z = 1; for (let k = 0; k < 8 && sc.scrollHeight > sc.clientHeight + 1 && z > .5; k++) { z = Math.max(.5, z * (sc.clientHeight / sc.scrollHeight) * .98); wrap.style.zoom = z; } if (z < 1) sc.style.overflowY = 'hidden'; };
    requestAnimationFrame(fitAttr); setTimeout(fitAttr, 150);
  }
  // 拖动：按住技能格或背包里的东西拖到另一个格子上 = 交换 / 装上（PC 鼠标、手机手指都行）；没拖动就还是点选
  let dragged = false;
  function drag(el, p, has, box) {
    el.dataset.t = p.t; el.dataset.i = p.i; if (!has) return;
    el.onpointerdown = e => {
      if (e.button) return; const x0 = e.clientX, y0 = e.clientY; let gh = null; dragged = false;
      const mv = ev => {
        if (!gh && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 8) return;
        if (!gh) { const ic = el.querySelector('.pi, canvas, .ic'); gh = document.createElement('div'); gh.className = 'dragghost'; if (ic) gh.appendChild(ic.cloneNode(true)); if (ic && ic.tagName === 'CANVAS') gh.firstChild.getContext('2d').drawImage(ic, 0, 0); document.body.appendChild(gh); el.classList.add('dragging'); dragged = true; }
        gh.style.left = ev.clientX + 'px'; gh.style.top = ev.clientY + 'px';
        for (const c of box.querySelectorAll('.droptgt')) c.classList.remove('droptgt');
        const t = document.elementFromPoint(ev.clientX, ev.clientY); const c = t && t.closest('[data-t]'); if (c && c !== el && box.contains(c)) c.classList.add('droptgt');
      };
      const up = ev => {
        removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
        if (!gh) return; gh.remove(); el.classList.remove('dragging');
        const t = document.elementFromPoint(ev.clientX, ev.clientY), c = t && t.closest('[data-t]');
        if (c && c !== el && box.contains(c)) { sel = p; pick({ t: c.dataset.t, i: +c.dataset.i }, box); } else loadout(box);
        setTimeout(() => { dragged = false; }, 0);
      };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    };
  }
  function pick(p, box) {
    const r = R();
    if (!sel) { if (!ARR0(r, p)[p.i]) { if (p.t !== 's') return; } sel = p; return loadout(box); }
    if (sel.t === p.t && sel.i === p.i) { sel = null; return loadout(box); }
    const ARR = q => ARR0(r, q), get = q => ARR(q)[q.i], put = (q, v) => { ARR(q)[q.i] = v; };
    let a = get(sel), b = get(p);
    const toSlot = (o, q) => q.t !== 's' || !o || o.kind === 'book' || o.lv;   // 技能格只能放技能
    const asSlot = o => o && o.kind === 'book' ? { id: o.id, lv: 1, xp: o.xp || 0 } : o, asBag = o => o && !o.kind ? { kind: 'book', id: o.id, lv: 1, xp: o.xp || 0 } : o;   // 熟练度跟着书走
    if ((a && p.t === 's' && !toSlot(a, p)) || (b && sel.t === 's' && !toSlot(b, sel))) { toast('技能格只能放技能书'); sel = p.t !== 's' && b ? p : null; return loadout(box); }
    const fit = (o, q) => !o || q.t === 'b' || q.t === 's' || (q.t === 'g' ? o.kind === 'item' : q.t === 'o' ? o.kind === 'oath' && !o.mv : q.t === 'm' ? o.kind === 'oath' && !!o.mv : true);
    const MSG = { g: '宝物格只能放宝物', o: '这里只能放誓约印记', m: '身法格只能放身法印记' };
    if (!fit(a, p) || !fit(b, sel)) { toast(MSG[!fit(a, p) ? p.t : sel.t]); sel = null; return loadout(box); }
    // 11/23 战斗中：可以调技能顺序、往空格里装、用这一站新拿到的东西替换；其他换装 / 卸下 / 卖都要等站末
    if (inFight() && !(a && b && a.id === b.id)) {
      const eq = q => q.t !== 'b', same = sel.t === p.t && eq(p);
      const ok = (sel.t === 'b' && p.t === 'b') || (same && sel.t === 's') || (same && sel.t === 'g')
        || (!eq(sel) && eq(p) && (!b || (a && a.fresh)))     // 物品栏 → 装备格：空格，或拿新东西替换
        || (eq(sel) && !eq(p) && b && b.fresh);               // 装备格 → 物品栏里的新东西：等于用新的替换
      if (!ok) { toast('战斗中只能调顺序、填空格、用新拿到的替换；其他打完这一站再整理'); sel = null; return loadout(box); }
    }
    // 同一招合并 = 升级
    if (a && b && a.id === b.id && (a.kind === 'book' || !a.kind) && (b.kind === 'book' || !b.kind)) { b.lv += a.lv; put(sel, null); toast(`${SK[b.id].name} 升到 Lv${b.lv}`); }
    else {
      put(p, p.t === 's' ? asSlot(a) : asBag(a)); put(sel, sel.t === 's' ? asSlot(b) : asBag(b));
      if (!r.slots.some(Boolean)) { put(sel, sel.t === 's' ? asSlot(a) : asBag(a)); put(p, p.t === 's' ? asSlot(b) : asBag(b)); toast('至少留一招'); }
    }
    if (r.si >= r.open) r.si = 0; sel = null; B().recompute(); loadout(box);
  }

  // ---------- 波间结算页 ----------
  // 11/22 站末整备只剩 修炼 / 商店 / 背包（技能栏 + 物品栏）。掉落自动进背包，背包满了才出「待收」页；结算只在通关 / 死亡；属性在暂停页看
  const TABS = [['shi', '待收'], ['xiu', '修炼'], ['shang', '商店'], ['ji', '背包']];
  function open(report) { prevFill = null;
    rep = report; loot = report.loot.map(o => Object.assign({ lv: 1 }, o)); sel = null;
    if (!rep.pickOne) loot = loot.filter(o => !learn(o, true));   // 自动收进背包（装不下的留在「待收」）
    tab = report.tab || (loot.length ? 'shi' : R().xiu ? 'xiu' : 'shang');
    $('cTitle').textContent = rep.title || `第 ${rep.st} 站 结束`;
    $('cGo').textContent = rep.goText ? rep.goText : rep.boss ? '挑战首领 ▶' : '选下一站 ▶';
    $('cHint').textContent = rep.goText ? '' : `击倒 ${rep.kills} · 铜钱 +${rep.coins} · 经验 +${rep.xp}`;
    render(); $('camp').classList.toggle('fshop', !!rep.field); $('camp').classList.add('on'); document.body.classList.toggle('shopOn', !!rep.field);
  }
  function refreshCoin() { const r = R(); for (const id of ['cCoin', 'pCoin']) $(id).innerHTML = coinTxt(r.coins); if (rep && rep.field) $('cCoin').innerHTML = `<span class="pc"></span>${UI.pxNum(r.coins, '#ffe08a')}`; }
  function render() {
    const r = R(), tb = $('ctabs'); tb.innerHTML = '';
    for (const [k, n] of TABS) { if (rep.only && k !== rep.only) continue; if (k === 'shi' && !loot.length && !rep.pickOne) continue; if (rep.pickOne && k !== 'shi') continue; const b = document.createElement('button'); b.className = k === tab ? 'on' : ''; const dn = k === 'xiu' ? r.xiu : k === 'shi' ? loot.length : k === 'shu' ? r.pts : 0; b.innerHTML = n + (dn ? `<em>${dn}</em>` : ''); b.onclick = () => { if (k === tab) return; const ks = TABS.map(x => x[0]), d = ks.indexOf(k) > ks.indexOf(tab) ? 'slideR' : 'slideL'; if (tab === 'shu' && k !== 'shu') commit(); tab = k; sel = null; render(); const cb = $('cBody'); cb.classList.remove('slideL', 'slideR'); void cb.offsetWidth; cb.classList.add(d); }; tb.appendChild(b); }
    refreshCoin(); const body = $('cBody'); body.innerHTML = ''; body.className = 'cbody t-' + tab;
    if (tab === 'jie') {
      const tot = Object.values(rep.dmg).reduce((s, v) => s + v, 0) || 1, rows = Object.entries(rep.dmg).sort((a, b) => b[1] - a[1]);
      body.innerHTML = `<div class="cg"><div class="cpn"><h4>这一波</h4><div class="stats big"><span>击倒</span><b>${rep.kills}</b><span>铜钱</span><b>+${rep.coins}</b><span>经验</span><b>+${rep.xp}</b><span>等级</span><b>Lv${rep.lv}</b><span>待修炼</span><b>${r.xiu} 次</b></div></div>
        <div class="cpn"><h4>输出统计</h4>${rows.length ? rows.map(([id, v]) => `<div class="dmgr"><span>${SK[id].name}</span><i><b style="width:${(v / tot * 100).toFixed(1)}%"></b></i><em>${Math.round(v)} · ${Math.round(v / tot * 100)}%</em></div>`).join('') : '<p class="dim">没有打出伤害</p>'}</div></div>`;
    } else if (tab === 'shi') {
      if (!loot.length) { body.innerHTML = `<p class="dim center">这一波没有战利品<br><small>每站第 3 波必掉技能书；精英掉书，小头目掉宝物；行商那里也能买</small></p>`; return; }
      const g = document.createElement('div'); g.className = 'cards' + (rep.field ? ' shelf' : ''); body.appendChild(g);
      loot.forEach((o, i) => { const t = thing(o), d = card(t, o);
        btnTo(d, o.kind === 'book' ? '学会' : o.kind === 'use' ? '吃掉' : '收下', () => { if (learn(o)) { if (rep.pickOne) loot = []; else loot.splice(i, 1); render(); } }, true);
        if (!rep.pickOne && t.sell != null) btnTo(d, `卖 ${t.sell}`, () => { r.coins += t.sell; loot.splice(i, 1); render(); }); g.appendChild(d); });
      body.insertAdjacentHTML('beforeend', rep.pickOne ? '<p class="dim center">只能选一本，选了另外两本就消失</p>' : '<p class="dim center">没处理的战利品，出发时自动卖掉换铜钱（技能书卖不了，不拿就没了）</p>');
    } else if (tab === 'xiu') {
      if (!r.xiu) { body.innerHTML = '<p class="dim center">暂无修炼机会<br><small>打怪攒经验，每升一级得一次修炼</small></p>'; return; }
      const fx = B().hero().fx, nOpt = 3 + (fx.xiuOpt || 0), rrMax = Math.max(0, 2 + (fx.xiuReroll || 0) + MLm('reroll'));
      if (!r.xopt) r.xopt = rollXiu(nOpt);
      body.insertAdjacentHTML('beforeend', `<p class="dim center">还有 ${r.xiu} 次修炼机会 · 三选一</p>`);
      const g = document.createElement('div'); g.className = 'cards' + (rep.field ? ' shelf' : ''); body.appendChild(g);
      r.xopt.forEach(o => { const Q = DATA.rarity[o.q], d = document.createElement('div'); d.className = 'card xiu q' + o.q;
        d.innerHTML = `${UI.piH(o.adds[0][0])}<b>${DATA.attrs.find(a => a.id === o.adds[0][0]).name}修炼</b><small style="color:${Q.col}">${Q.name}</small>${o.adds.map(([a, v]) => `<p class="plus">+${v} ${DATA.attrs.find(x => x.id === a).name}</p>`).join('')}<p class="dim">${DATA.attrs.find(a => a.id === o.adds[0][0]).desc}</p>`;
        btnTo(d, '修 炼', () => { for (const [a, v] of o.adds) r.train[a] = (r.train[a] || 0) + v; r.xiu--; r.xopt = null; r.xrr = 0; B().recompute(); render(); }, true); g.appendChild(d); });
      const rb = document.createElement('button'); rb.className = 'btn mini'; rb.innerHTML = `${UI.piH('reroll', 1)} 刷新 ${rrMax - r.xrr}/${rrMax}`; rb.disabled = r.xrr >= rrMax; rb.onclick = () => { r.xrr++; r.xopt = rollXiu(nOpt); render(); };
      const w = document.createElement('div'); w.className = 'center'; w.appendChild(rb); body.appendChild(w);
    } else if (tab === 'shang') {
      const fx = B().hero().fx, pm = (1 + (fx.shop || 0)) * (1 + DATA.price.stUp * (rep.st - 1)) * (rep.disc || 1) * (1 - .03 * (r.luck || 0)) * (rep.rift ? 1 : 1);   // 每站涨 7%
      if (!r.shop) r.shop = rollShop();
      const g = document.createElement('div'); g.className = 'cards' + (rep.field ? ' shelf' : ''); body.appendChild(g);
      r.shop.forEach((o, i) => { const d = o.kind === 'cry' ? (() => { const e = document.createElement('div'); e.className = 'card'; e.innerHTML = `<span class="ic" style="font-size:34px">💎</span><b>水晶 ×${o.n}</b><small>局外货币，带回宫殿用</small><p>死了也不会丢</p>`; return e; })() : o.kind === 'slot' ? (() => { const e = document.createElement('div'); e.className = 'card'; e.innerHTML = `<span class="ic">${UI.piH('slotplus')}</span><b>开第 ${r.open + 1} 格</b><small>技能栏多开一格</small><p>有铜钱随时能买</p>`; return e; })() : card(thing(o), o), price = Math.round(o.price * pm);
        if (o.sold) { d.classList.add('sold'); d.insertAdjacentHTML('beforeend', '<p class="dim">已买</p>'); }
        else if (o.kind === 'slot' && o.n !== r.open + 1) { d.classList.add('sold'); d.insertAdjacentHTML('beforeend', '<p class="dim">已开</p>'); }
        else btnTo(d, rep.field ? `<span class="pc"></span>${UI.pxNum(price, '#3a2410', 0)}` : `买 ${UI.piH('coin', 1)}${price}`, () => { if (r.coins < price) return toast('铜钱不够'); if (o.kind === 'cry') { B().addCrystal(o.n); toast(`水晶 +${o.n}`); } else if (o.kind === 'slot') { r.open = Math.min(DATA.slotsMax, r.open + 1); toast('技能格 +1'); } else if (!learn(o)) return; r.coins -= price; o.sold = true; render(); }, true);
        g.appendChild(d); });
      // 刷新：4 + 2 ×（站 − 1）+ 3 × 已刷次数，每次结算最多刷 4 次
      const [c0, c1, c2] = DATA.price.refresh, cost = (fx.freeRoll && !r.rr) ? 0 : Math.round((c0 + c1 * (rep.st - 1) + c2 * r.rr) * (1 + (fx.reroll || 0))), left = DATA.price.refreshMax + MLm('reroll') - r.rr;
      const w = document.createElement('div'); w.className = 'center'; const rb = document.createElement('button'); rb.className = 'btn mini'; rb.innerHTML = `${UI.piH('reroll', 1)} ${rep.field ? '翻一翻货架' : '刷新货架'} ${UI.piH('coin', 1)}${cost} <small>(${left}/${DATA.price.refreshMax + MLm('reroll')})</small>`; rb.disabled = left <= 0;
      rb.onclick = () => { if (r.coins < cost) return toast('铜钱不够'); r.coins -= cost; r.rr++; r.shop = rollShop(); render(); }; w.appendChild(rb); body.appendChild(w);
    } else if (tab === 'ji') loadout(body);
    else if (tab === 'shu') attrPanel(body);
  }
  // 卡片：图标 · 名字 · 类别 · 分隔线 · 说明（说明区固定高度、垂直居中，按钮永远在最下面对齐）
  function card(t, o) { const d = document.createElement('div'); d.className = 'card ' + o.kind + (t.tier ? ' ct' + t.tier : ''); d.appendChild(iconEl(t)); if (o.kind === 'item' && ITEM(o.id).d) { const r = R(), has = [...r.gear, ...r.bag].find(x => x && x.kind === 'item' && x.id === o.id); if (has) d.insertAdjacentHTML('beforeend', `<em class="upb">${(has.lv || 1) >= 5 ? '已满级' : `升级 Lv${has.lv || 1}→${(has.lv || 1) + 1}`}</em>`); } d.insertAdjacentHTML('beforeend', `<b class="${t.tier ? 'tn' + t.tier : ''}">${t.name}</b><small>${t.sub}</small><i class="hr"></i><p class="desc" title="${String(t.desc).replace(/<br>/g, '\n').replace(/<[^>]+>/g, '').replace(/"/g, '&quot;')}">${t.brief || t.desc}</p>`); return d; }
  function btnTo(d, label, fn, gold) { let f = d.querySelector('.cb'); if (!f) { f = document.createElement('div'); f.className = 'cb'; d.appendChild(f); } const b = document.createElement('button'); b.className = 'btn mini' + (gold ? ' gold' : ''); b.innerHTML = label; b.onclick = fn; f.appendChild(b); }
  function rollXiu(n) {
    const out = [], ids = shuffle(DATA.attrs.map(a => a.id));
    for (let k = 0; k < n; k++) { let x = Math.random(), q = 0; for (let j = DATA.rarity.length - 1; j > 0; j--) { if (x < DATA.rarity[j].p) { q = j; break; } x -= DATA.rarity[j].p; }
      const a = ids[k % ids.length], Q = DATA.rarity[q], o = { q, adds: [[a, Q.add]] };
      if (Q.extra) { const b = ids.find(i => i !== a); o.adds.push([b, Q.extra]); } out.push(o); }
    return out;
  }
  function rollShop() {
    // 货架：3 件宝物 + 2 本书（新书 22，已有的升 Lv2 34，再往上 52）。开技能格改成在「技能」页点锁
    const r = R(), P = DATA.price, items = shuffle(DATA.itemPool(r)).slice(0, 3 + MLm('shelf')).map(i => ({ kind: 'item', id: i.id, price: i.price || 25 }));
    const lvOf = id => { const h = r.slots.find(s => s && s.id === id) || r.bag.find(b => b && b.kind === 'book' && b.id === id); return h ? h.lv : 0; };
    const own = new Set(Object.keys(SK).filter(id => lvOf(id) || loot.some(o => o.kind === 'book' && o.id === id))), pool = DATA.bookPool(own, rep.st), books = [];   // 已经有的书不再出；按品阶抽，价格 22 / 34 / 52
    while (books.length < 2 && pool.length) { const id = pool[Math.random() * pool.length | 0]; if (!books.some(b => b.id === id)) books.push({ kind: 'book', id, lv: 1, xp: 0, price: DATA.tierPrice[SK[id].tier] }); if (pool.every(i => books.some(b => b.id === i))) break; }
    const ok0 = Object.keys(DATA.oaths); if (rep.rift) { const pk0 = () => ({ kind: 'oath', id: ok0[Math.random() * ok0.length | 0], price: 46 }), costI = shuffle(DATA.startItems.filter(i => i.cost)).slice(0, 1).map(i => ({ kind: 'item', id: i.id, price: Math.round((i.price || 40) * 1.3) }));
      return [pk0(), pk0(), { kind: 'oup', id: 'oup', price: 52 }, ...costI]; }
    const L = items.concat(books), ok = Object.keys(DATA.oaths), pk = () => ({ kind: 'oath', id: ok[Math.random() * ok.length | 0], price: 38 });
    if (rep.disc) { L.splice(0, 2, pk(), pk()); } else if (Math.random() < .3) L.splice(2, 1, pk());
    { let ml = 0; try { ml = JSON.parse(localStorage.getItem('xsyz-meta') || '{}').ex || 0; } catch (e) {} L.push({ kind: 'cry', id: 'cry', n: 4 + 2 * ml, price: 30 }); }   // 11/24 商人：铜钱换水晶（大臣「兑换」每级 +2）
    return L;
  }
  $('cGo').onclick = () => {
    commit(); const r = R(); if (!rep.pickOne) for (const o of loot) r.coins += thing(o).sell || 0; loot = [];   // 没处理的自动卖掉
    $('camp').classList.remove('on'); document.body.classList.remove('shopOn'); if (rep.after) rep.after(); else B().nextWave();
  };

  // ---------- 暂停页 = 备战 ----------
  let ptab = 'ji';
  function pauseRender() {
    const tb = $('pTabs'); tb.innerHTML = '';
    for (const [k, n] of [['ji', '技能'], ['shu', '属性']]) { const b = document.createElement('button'); b.className = k === ptab ? 'on' : ''; const dn = k === 'shu' ? R().pts : 0; b.innerHTML = n + (dn ? `<em>${dn}</em>` : '');
      b.onclick = () => { if (k === ptab) return; const d = k === 'shu' ? 'slideR' : 'slideL'; if (ptab === 'shu' && k !== 'shu') commit(); ptab = k; sel = null; pauseRender(); const pb = $('pBody'); pb.classList.remove('slideL', 'slideR'); void pb.offsetWidth; pb.classList.add(d); }; tb.appendChild(b); }
    refreshCoin(); if (ptab === 'ji') loadout($('pBody')); else attrPanel($('pBody'));
  }
  function pauseOpen() { prevFill = null; UI.newDot(false); sel = null; ptab = R().pts ? 'shu' : 'ji'; pauseRender(); }

  window.CAMP = { learn, rollXiu, open, pauseOpen, commit, isOpen: () => $('camp').classList.contains('on'), close: () => $('camp').classList.remove('on') };
})();

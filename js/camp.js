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
    if (o.job) return { tier: o.job.final ? 4 : 3, icon: UI.careerIcon(o), name: JOBS.name(o), sub: o.job.final ? '最终职业书' : '职业书', desc: JOBS.desc(o) + '<br>' + JOBS.leaves(o).map(s => SK[s.id].name + ' Lv' + JOBS.level(s)).join(' → '), sell: null };
    if (o.kind === 'manual') return { icon: UI.pi(o.id === 'master' ? 'bk_staff' : 'bk_sword'), name: JOBS.manuals[o.id].name, sub: '手册 · 使用时选择技能', desc: JOBS.manuals[o.id].desc, sell: 0 };
    if (o.kind === 'book') { const S = SK[o.id], st = DATA.setOf(R().slots), n = st.n[S.sys] || 0, L = DATA.sets[S.sys], nx = L && L.find(t => t[0] > n); return { tier: S.tier, icon: UI.bookOf(o.id), name: S.name, sub: `${S.sys} · ${DATA.tierName[S.tier]}`, desc: S.desc + (L ? `<br><small class="${st.on[S.sys] ? 'on' : 'off'}">${S.sys}系羁绊 ${n}/${nx ? nx[0] : 4}${nx ? '：' + nx[2] : '（已满）'}</small>` : ''), brief: S.brief, sell: null }; }   /* 11/25 技能书不能在营地卖：带回宫殿，死了还有命就能带回去，让大法师换水晶 */
    if (o.kind === 'oup') return { icon: UI.pi('reroll'), name: '印记升级 +1', sub: '裂缝里的符文', desc: '随机让一个已装备、未满级的誓约印记升 1 级', sell: 0 };
    if (o.kind === 'oath') { const O = DATA.oaths[o.id], L = Math.min(5, o.lv || 1), ic = UI.pi('oath/' + o.id); ic.classList.add('oimg');
      return { icon: ic, name: O.name, sub: `${O.mv ? '身法印记' : '誓约印记'} · Lv${L}`, desc: O.d(DATA.oathLv[L - 1]) + (L < 5 ? `<br><small class="off">下一级：${O.d(DATA.oathLv[L])}</small>` : '<br><small class="on">已满级</small>'), sell: 10 + 6 * L }; }
    if (o.kind === 'item') { const it = ITEM(o.id), L = Math.min(5, o.lv || 1); return { icon: UI.pi(o.id), name: it.name, sub: '宝物', desc: it.d ? it.d(1) : it.desc, sell: Math.round((it.price || 25) * DATA.price.sell) }; }
    const c = USE(o.id); return { icon: UI.pi(o.id), name: c.name, sub: '消耗品', desc: c.desc, sell: 3 };
  }
  function iconEl(t) { const s = document.createElement('span'); s.className = 'ic' + (t.tier ? ' tr t' + t.tier : ''); if (t.icon) s.appendChild(t.icon); else s.textContent = t.emoji; return s; }
  // 学会一本书：已经有这一招就升一级，否则放进背包
  function learn(o, quiet) { if (o && ['book', 'item', 'oath'].includes(o.kind)) { const r0 = R(); (r0.got = r0.got || []).push({ kind: o.kind, id: o.id }); } try { if (o && o.id) SEEN.add({ book: 's:', item: 'i:', oath: 'o:' }[o.kind] + o.id); } catch (e) {}
    const r = R(); const toast = quiet ? () => {} : toast0;
    if (o.kind === 'book') {
      const has = JOBS.skills(r).find(s => s.id === o.id);
      if (has) { if (JOBS.level(has) < 7) { has.xp = DATA.prof[Math.min(6, JOBS.level(has))]; toast(`${SK[o.id].name} 熟练度提升`); } else { r.coins += DATA.tierPrice[SK[o.id].tier]; toast('满级技能换成铜钱'); } B().saveCareer(); return true; }
    }
    if (o.kind === 'oup') { const L = [...r.oath, ...r.mv].filter(x => x && x.lv < 5); if (!L.length) { toast('没有可以升级的誓约印记'); return false; } const x = L[Math.random() * L.length | 0]; x.lv++; B().recompute(); toast(`${DATA.oaths[x.id].name} 升到 Lv${x.lv}`); return true; }
    if (o.kind === 'oath') { const O = DATA.oaths[o.id]; if (O.mv && rep?.stepChoice) { r.mv[0] = { kind: 'oath', id: o.id, lv: 1, mv: true }; B().recompute(); return true; } const has = [...r.oath, ...r.mv, ...r.bag].find(x => x && x.kind === 'oath' && x.id === o.id);
      if (has) { if (has.lv >= 5) { r.coins += 20; toast(`${O.name} 已满级，换成 20 铜钱`); return true; } has.lv++; B().recompute(); toast(`${O.name} 升到 Lv${has.lv}`); return true; }
      const A = O.mv ? r.mv : r.oath, j = A.indexOf(null); if (j >= 0) { A[j] = { kind: 'oath', id: o.id, lv: 1, mv: !!O.mv }; B().recompute(); return true; } }
    if (o.kind === 'manual') { const free = r.bag.indexOf(null); if (free < 0) { toast('物品栏满了，先腾出一格'); return false; } r.bag[free] = { kind: 'manual', id: o.id }; B().saveCareer(); return true; }
    if (o.kind === 'use') { const c = USE(o.id), h = B().hero(); B().healHero(h.maxHp * c.heal); toast(`吃掉${c.name}，回复生命`); return true; }
    if (o.kind === 'book') { const j = r.slots.findIndex((s, k) => !s && k < r.open); if (j >= 0 && DATA.canEquipCommon(r.slots,o,j)) { r.slots[j] = { id: o.id, lv: 1, xp: o.xp || 0 }; toast(`${SK[o.id].name} 自动装上第 ${j + 1} 格` + (r.tipP ? '' : ' · 按 P 调整顺序')); r.tipP = 1; return true; } }   // 技能栏有空位就直接装上
    if (o.kind === 'item' && [...r.gear, ...r.bag].some(x => x && x.kind === 'item' && x.id === o.id)) { toast('已拥有这件宝物'); return false; }
    if (o.kind === 'item') { const g = r.gear.indexOf(null); if (g >= 0) { r.gear[g] = { kind: 'item', id: o.id }; B().recompute(); return true; } }   // 11/23 宝物格有空就直接生效
    const i = r.bag.indexOf(null); if (i < 0) { toast('物品栏满了，先腾出点位置'); return false; }
    r.bag[i] = o.kind === 'book' ? { kind: 'book', id: o.id, lv: 1, xp: o.xp || 0 } : o.kind === 'oath' ? { kind: 'oath', id: o.id, lv: 1, mv: !!DATA.oaths[o.id].mv } : { kind: o.kind, id: o.id }; if (inFight()) r.bag[i].fresh = 1;
    { const free = r.bag.filter(x => !x).length; if (free <= 2) toast(free ? `物品栏快满了，只剩 ${free} 格——不要的可以丢弃` : '物品栏已经满了！再拿东西要先丢弃'); }   /* 11/25 快满提前提醒 */
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
      else if (s) { d.className = 'slot has full tr t' + SK[s.id].tier+(s.job?' careerSlot':''); d.appendChild(UI.careerIcon(s)); if(!s.job)d.insertAdjacentHTML('beforeend', lvTag(s)); }
      else { d.className = 'slot'; d.insertAdjacentHTML('beforeend', '空'); }
      if (sel && sel.t === 's' && sel.i === i) d.classList.add('sel');
      if (i < r.open) { d.onclick = () => dragged || pick({ t: 's', i }, box); drag(d, { t: 's', i }, !!s, box); } sl.appendChild(d); });
    // 11/23 誓约印记 3 格 + 身法 1 格（同一行）
    L.insertAdjacentHTML('beforeend', '<h4>誓约印记 <small>1主修 + 3辅修（50%）· 另有身法</small></h4>');
    const om = document.createElement('div'); om.className = 'bag oathrow'; L.appendChild(om);
    const oc = (arr, t, cls, empty) => arr.forEach((o, i) => { const d = document.createElement('div'); d.className = cls + (o ? ' has full' : ''); if (t === 'o') { d.title = i === 0 ? '主修：100%' : '辅修：50%'; if (i === 0) { d.style.outline = '2px solid #ffd36a'; d.style.outlineOffset = '-2px'; d.style.borderColor = '#ffd36a'; d.style.boxShadow = 'inset 0 0 0 1px #ffd36a'; } } if (o) { d.appendChild(iconEl(thing(o))); d.insertAdjacentHTML('beforeend', `<b class="lvb">${o.lv}</b>`); } else d.innerHTML = empty; if (sel && sel.t === t && sel.i === i) d.classList.add('sel'); d.onclick = () => dragged || pick({ t, i }, box); drag(d, { t, i }, !!o, box); om.appendChild(d); });
    oc(r.oath, 'o', 'oath', ''); oc(r.mv, 'm', 'mv', '<span>身法</span>');
    const cell = (grid, arr, t) => arr.forEach((o, i) => { const d = document.createElement('div'); const th = thing(o);
      if (th) { d.className = 'has full ' + o.kind + (th.tier ? ' tr t' + th.tier : '')+(o.job?' careerSlot':''); if (o.kind === 'book') { d.appendChild(UI.careerIcon(o)); if(!o.job)d.insertAdjacentHTML('beforeend', lvTag(o) + '<em class="bk">书</em>'); } else { d.appendChild(iconEl(th));  if (o.up && Date.now() - o.up < 4000) d.classList.add('put'); } if (o.fresh && inFight()) d.insertAdjacentHTML('beforeend', '<em class="nw">新</em>'); }
      if (sel && sel.t === t && sel.i === i) d.classList.add('sel');
      d.onclick = () => dragged || pick({ t, i }, box); drag(d, { t, i }, !!o, box); grid.appendChild(d); });
    const lockCells = (grid, n, tip) => { for (let k = 0; k < n; k++) { const d = document.createElement('div'); d.className = 'lk'; d.dataset.tip = tip; grid.appendChild(d); } };
    L.insertAdjacentHTML('beforeend', `<h4>宝物 ${r.gear.filter(Boolean).length}/${r.gear.length} <small>放在这里就生效</small></h4>`);
    const gg = document.createElement('div'); gg.className = 'bag gear'; L.appendChild(gg); cell(gg, r.gear, 'g'); lockCells(gg, 1, '未解锁的宝物格：以后开放');
    { const nb = r.bag.filter(Boolean).length, tot = r.bag.length; Rt.insertAdjacentHTML('beforeend', `<h4>物品栏 <span class="bagN${tot - nb <= 2 ? ' warn' : ''}">${nb}/${tot}</span> <small>拖到左边才生效 · 不要的点开丢弃</small></h4>`); }
    const bg = document.createElement('div'); bg.className = 'bag'; Rt.appendChild(bg); cell(bg, r.bag, 'b'); lockCells(bg, 4, '未解锁的物品格：以后开放');
    { const now = {}; let k = 0; L.querySelectorAll('.slots > div, .oathrow > div:not(.gap), .gear > div').forEach((el, i) => { el.style.setProperty('--k', k++); const key = i, v = el.classList.contains('has') ? el.innerHTML : ''; now[key] = v; if (prevFill && v && prevFill[key] !== v) el.classList.add('put'); }); prevFill = now; }
    // 11/23 详情改成跟着格子弹出：电脑悬停就看，点一下带按钮；手机点一下弹在格子上方
    if (sel) { const el = box.querySelector(`[data-t="${sel.t}"][data-i="${sel.i}"]`) || box.querySelector('.slot.sel'); if (el) popAt(el, sel.t === 'L' ? info => lockInfo(info, sel.i, box) : info => fillInfo(info, box, true), box); }
    box.querySelectorAll('[data-t]').forEach(el => { el.onmouseenter = () => { if (sel || matchMedia('(hover: none)').matches) return; const q = { t: el.dataset.t, i: +el.dataset.i }; if (!curOf(q)) return; popAt(el, info => fillInfo(info, box, false, q), box, 1); }; el.onmouseleave = () => { if (!sel) document.querySelectorAll('.loinfo.pop').forEach(e => e.remove()); }; });
  }
  const inFight = () => { const G = B().g && B().g(); return !!(G && !G.fe && !G.over); };
  const ARR0 = (r, q) => q.t === 's' ? r.slots : q.t === 'g' ? r.gear : q.t === 'o' ? r.oath : q.t === 'm' ? r.mv : r.bag;
  function curOf(q) { const r = R(); if (!q) return null; if (q.t === 's') { const s = r.slots[q.i]; return s && { ...s, kind: 'book', slot: true }; } return ARR0(r, q)[q.i]; }
  function lvTag(s) { if (s.job) return `<b class="lvb">${s.job.final ? '最终' : s.job.progress + '/' + JOBS.PROGRESS_MAX}</b><s class="pb${s.job.progress >= JOBS.PROGRESS_MAX ? ' max' : ''}" style="--p:${s.job.final ? 100 : s.job.progress / JOBS.PROGRESS_MAX * 100}%"></s>`; const k = B().skillInfo(s); return `<b class="lvb">${k.L}</b><s class="pb${k.next ? '' : ' max'}" style="--p:${k.next ? Math.min(100, k.xp / k.next * 100) : 100}%"></s>`; }
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
    const r = R(), cur = curOf(q || sel); if (!cur) return; const t = thing(cur); if (cur.kind === 'book') { const w = document.createElement('span'); w.className = 'ic'; w.appendChild(UI.careerIcon(cur)); info.appendChild(w); } else info.appendChild(iconEl(t));
    let txt = `<b class="${t.tier ? 'tn' + t.tier : ''}">${t.name}</b> <small>${t.sub}</small><br>${t.desc}`;
    if (cur.kind === 'book' && !cur.job) { const S = SK[cur.id], k = B().skillInfo(cur); const AN = { str: '力量', agi: '敏捷', int: '智力' }[S.type], av = (B().hero().A || {})[S.type] || 0;
      txt += `<span class="kst"><span>伤害 <b>${Math.round(k.dmg)}</b></span><span>${S.dt === 'magic' ? '魔法' : '物理'}</span><span>前摇 ${k.wu.toFixed(2)}s</span><span>后摇 ${k.rc.toFixed(2)}s</span>${S.hold ? `<span>持续 ${S.hold}s</span>` : ''}</span>`
        + (AN ? `<span class="katt a-${S.type}">受<b>${AN}</b>加成 · 每点 +6%（现在 +${av * 6}%）</span>` : '') + `<small>熟练 Lv${k.L}${k.next ? `（${k.xp}/${k.next}）` : '（已练满）'}</small>` + ['l3', 'l5', 'l7'].filter(x => S[x]).map(x => `<small class="${k.L >= +x.slice(1) ? 'on' : 'off'}">Lv${x.slice(1)}：${S[x]}</small>`).join(''); }
    const p = document.createElement('p'); p.innerHTML = txt; info.appendChild(p);
    if (!withBtn) return; const cs = sel;
    const btns = document.createElement('div'); btns.className = 'lob'; info.appendChild(btns);
    const btn = (label, fn, gold) => { const b = document.createElement('button'); b.className = 'btn mini' + (gold ? ' gold' : ''); b.textContent = label; b.onclick = e => { e.stopPropagation(); info.remove(); fn(); }; btns.appendChild(b); };
    if(!cur.job) careerActions(cur, cs, btn, box);
    const F = inFight(); if (F) btns.insertAdjacentHTML('beforeend', '<small class="dim">战斗中：卸下要等站末（丢弃随时可以）</small>');
    if (cs.t === 's') { if (!F && r.slots.filter(Boolean).length > 1) btn('卸下', () => { const j = r.bag.indexOf(null); if (j < 0) return toast('物品栏满了'); r.bag[j] = { ...cur, kind: 'book' }; delete r.bag[j].slot; r.slots[cs.i] = null; sel = null; loadout(box); }); }
    else {
      if (cur.kind === 'book') btn('装上', () => { const j = r.slots.slice(0, r.open).indexOf(null); if (j < 0) return toast('技能格满了：拖到一个技能格上替换'); pick({ t: 's', i: j }, box); }, true);
      const A = cs.t === 'g' ? r.gear : r.bag;
      if (cur.kind === 'item' && cs.t === 'b') btn('放上', () => { const j = r.gear.indexOf(null); if (j < 0) return toast('宝物格满了：拖到一件宝物上替换'); r.gear[j] = cur; r.bag[cs.i] = null; sel = null; B().recompute(); loadout(box); }, true);
      if (cs.t === 'g' && !F) btn('收进物品栏', () => { const j = r.bag.indexOf(null); if (j < 0) return toast('物品栏满了'); r.bag[j] = cur; r.gear[cs.i] = null; sel = null; B().recompute(); loadout(box); });
      if (cur.kind === 'use') btn('吃掉', () => { learn(cur); A[cs.i] = null; sel = null; loadout(box); }, true);
      if (cs.t === 'b' || (cs.t === 'g' && !F)) { const b = document.createElement('button'); b.className = 'btn mini'; b.textContent = '丢弃'; let arm = 0;   /* 11/25 局内不能卖，只能丢；带回去才能卖给大法师 */
        b.onclick = e => { e.stopPropagation(); if (!arm) { arm = 1; b.textContent = '再点一次：永久丢弃'; b.classList.add('gold'); setTimeout(() => { if (b.isConnected) { arm = 0; b.textContent = '丢弃'; b.classList.remove('gold'); } }, 3000); return; } info.remove(); A[cs.i] = null; sel = null; B().recompute(); toast(`丢弃了 ${t.name}`); loadout(box); }; btns.appendChild(b); }
    }
  }
  function chooseCareer(title, choices, apply) {
    document.getElementById('careerPicker')?.remove(); const overlay = document.createElement('div'); overlay.id = 'careerPicker'; overlay.style.cssText = 'position:fixed;inset:0;z-index:150;background:#000b;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box';
    const panel = document.createElement('div'); panel.className = 'panel box'; panel.style.cssText = 'max-width:540px;width:100%;max-height:85vh;overflow:auto;box-sizing:border-box'; const head = document.createElement('h3'); head.textContent = title; panel.appendChild(head);
    for (const item of choices) { const b = document.createElement('button'); b.className = 'btn gold'; b.style.cssText = 'display:block;width:100%;min-height:44px;margin:8px 0;white-space:normal'; b.textContent = item.label; b.onclick = () => { if (apply(item) !== false) overlay.remove(); }; panel.appendChild(b); }
    const cancel = document.createElement('button'); cancel.className = 'btn'; cancel.style.minHeight = '44px'; cancel.textContent = '取消'; cancel.onclick = () => overlay.remove(); panel.appendChild(cancel); overlay.appendChild(panel); document.body.appendChild(overlay);
  }
  function careerChoices() {
    const r=R(), books=JOBS.books(r), finals=[];
    if(!r.finalCareer) for(const a of books.filter(b=>b.job&&!b.job.final&&b.job.progress>=JOBS.PROGRESS_MAX)) for(const b of books.filter(q=>q!==a&&q.job&&!q.job.final&&q.job.progress>=JOBS.PROGRESS_MAX)) { const key=JOBS.key([a.job.families[0],b.job.families[0]]), name=JOBS.finals[key]?.[0]; if(name&&!finals.some(x=>x.a===b&&x.b===a)) finals.push({kind:'final',a,b,label:`${JOBS.name(a)} + ${JOBS.name(b)} → ${name}`}); }
    if(finals.length) return finals;
    const pairs=[];for(const a of books.filter(b=>!b.job&&JOBS.level(b)>=7))for(const b of books)if(JOBS.canPair(r,a,b))pairs.push({kind:'pair',a,b,label:`${SK[a.id].name} + ${SK[b.id].name} → ${JOBS.careers[JOBS.family(SK[a.id])][0]}`});
    return pairs;
  }
  function careerButton() {
    if(!JOBS?.books||!B()?.run?.()){document.getElementById('careerEntry')?.remove();return;}
    const choices=careerChoices();if(!choices.length){document.getElementById('careerEntry')?.remove();return;}
    const btn=document.getElementById('careerEntry')||document.createElement('button');btn.id='careerEntry';btn.className='btn gold career-entry';btn.textContent=choices[0].kind==='final'?'最终转职':'转职';btn.style.cssText='position:fixed;z-index:110;left:50%;bottom:82px;transform:translateX(-50%);min-width:190px;animation:careerPulse 1.3s ease-in-out infinite alternate';
    btn.onclick=()=>chooseCareer(btn.textContent,careerChoices(),item=>{const r=R(),merged=JOBS.merge(r,item.a,item.b,item.kind==='final');if(!merged)return false;B().careerChanged(); careerAnimation(merged);return true;});
    if(!btn.isConnected)document.body.appendChild(btn);
  }
  const careerColor=book=>book?.job?.final?'#ffd36a':({sword:'#83ed8a',spear:'#72d9ff',bow:'#e5edff',staff:'#ff8af2',gun:'#70f2ff',common:'#ffd46e'})[book?.job?.families?.[0]]||'#fff';
  function careerAnimation(book){
    document.getElementById('careerReveal')?.remove();const color=careerColor(book),english=({sword:'WIND SWORDSMAN',spear:'SPEAR MASTER',bow:'MOONSTALKER',staff:'ELEMENTAL MAGE',gun:'ARCADE ACE',common:'GRAND ADVENTURER'})[book.job.families[0]],frame=document.createElement('div');
    const families=book.job.families,eng=book.job.final?families.map(f=>({sword:'WIND',spear:'SPEAR',bow:'MOON',staff:'ELEMENT',gun:'ARCADE',common:'ADVENTURE'})[f]).join(' × '):english;frame.id='careerReveal';frame.style.setProperty('--career-color',color);frame.innerHTML=`<div class="career-reveal-box"><div class="career-rune"></div><div class="career-pillar"></div><div class="career-hero"><span></span><i></i></div><div class="career-banner"><strong>${JOBS.name(book)}</strong><small>${eng}</small></div></div>`;const soldier=document.createElement('canvas'),raw=SPR.crop(SPR.heroSet(R().hero,'sword'),'idle',0);if(raw){soldier.width=raw.c.width*2;soldier.height=raw.c.height*2;soldier.getContext('2d').drawImage(raw.c,0,0,soldier.width,soldier.height);soldier.className='careerSoldier';frame.querySelector('.career-hero span').appendChild(soldier);}document.body.appendChild(frame);setTimeout(()=>frame.remove(),2200);
  }
  function careerActions(cur, cs, btn, box) {
    const r = R(), raw = ARR0(r, cs)[cs.i];
    if (cur.kind === 'manual') { btn('使用', () => { const choices = JOBS.books(r).flatMap(b => JOBS.leaves(b).filter(s => JOBS.level(s) < 7).map(s => ({ label: `${SK[s.id].name} · Lv${JOBS.level(s)}${b.job ? '（' + JOBS.name(b) + '内）' : ''}`, skill: s }))); if (!choices.length) return toast('没有未满级的技能'); chooseCareer(JOBS.manuals[cur.id].name + '：选择技能', choices, x => { if (ARR0(r, cs)[cs.i] !== raw || !JOBS.applyManual(cur.id, x.skill)) return false; ARR0(r, cs)[cs.i] = null; B().careerChanged(); sel = null; loadout(box); return true; }); }, true); return; }
    if (cur.kind !== 'book') return;
    if (raw.job) {
      btn('调换招式顺序', () => chooseCareer('选择要前移的招式', raw.job.children.map((s,i) => ({ label: `${i+1}. ${SK[s.id].name}${i ? ' ↑' : '（移到末尾）'}`, i })), x => { const j = x.i ? x.i-1 : raw.job.children.length-1; JOBS.swap(raw,x.i,j); B().careerChanged(); sel=null; loadout(box); return true; }));
      if (!raw.job.final && raw.job.progress >= JOBS.PROGRESS_MAX && !r.finalCareer) { const peers = JOBS.books(r).filter(b => b !== raw && b.job && !b.job.final && b.job.progress >= JOBS.PROGRESS_MAX); if (peers.length) btn('最终转职', () => chooseCareer('合成最终职业书', peers.map(b => ({ label: JOBS.finals[JOBS.key([raw.job.families[0],b.job.families[0]])][0] + '（与' + JOBS.name(b) + '合成）', book:b })), x => { if (!JOBS.merge(r,raw,x.book,true)) return false; B().careerChanged(); sel=null; loadout(box); return true; }),true); }
    } else if (JOBS.level(raw) >= 7) { const peers = JOBS.books(r).filter(b => JOBS.canPair(r,raw,b)); if (peers.length) btn('转职', () => chooseCareer((r.careerCount ? '第二职业书' : '一转') + '：选择同系技能', peers.map(b => ({ label: `${SK[raw.id].name} + ${SK[b.id].name} → ${JOBS.careers[JOBS.family(SK[raw.id])][0]}`, book:b })), x => { if (!JOBS.merge(r,raw,x.book)) return false; B().careerChanged(); sel=null; loadout(box); return true; }),true); }
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
      g('进攻', [['str', '剑 · 枪伤害', pct(.06 * c.A.str + (c.fx.dmg || 0))], ['agi', '弓伤害', pct(.06 * c.A.agi + (c.fx.dmg || 0))], ['int', '法杖伤害', pct(.06 * c.A.int + (c.fx.dmg || 0))], ['str', '当前招式总增伤', pct((B().skillInfo(r.slots.find(Boolean)).dmg / Math.max(1, SK[r.slots.find(Boolean).id].dmg)) - 1)], ['spd', '出手速度', pct(h.m.spd - 1)], ['area', '范围', pct(h.m.area - 1)], ['crit', '物理暴击', `${Math.round(c.critP * 100)}% <small>伤害 ${Math.round(c.critMulP * 100)}%</small>`], ['star', '魔法暴击', `${Math.round(c.critM * 100)}% <small>伤害 ${Math.round(c.critMulM * 100)}%</small>`]]) +
      g('防御', [['hp', '生命', `${Math.ceil(h.hp)} / ${h.maxHp}`], ['guard', '物防', `${c.pdef} <small>受物理 ×${c.pIn.toFixed(2)}</small>`], ['star', '魔防', `${c.mdef} <small>受魔法 ×${c.mIn.toFixed(2)}</small>`], ['guard', '百分比减伤', `${Math.round(Math.max(0, -Math.max(-.3, h.fx.take || 0)) * 100)}%`], ['guard', '护盾', `${Math.ceil(h.mShield || 0)}`], ['move', '闪避', `${Math.round(h.eva * 100)}% <small>物理、魔法都能躲</small>`]]) +
      g('其他', [['clover', '幸运', `${r.luck || 0} <small>掉落 ${pct(.05 * (r.luck || 0))} · 价格 ${pct(-.03 * (r.luck || 0))}</small>`], ['move', '移速', pct(c.move - 1)], ['xp', '经验', pct(c.xp * (r.hero === 'm' ? 1.1 : 1) - 1)]]);
    L.insertAdjacentHTML('beforeend', `<p class="dim">人物被动：${hp.name || ''} · ${hp.perk || '无'}</p><p class="dim">生效宝物：${items.length ? items.map(e => (DATA.startItems.find(i => i.id === e.id) || {}).name + '').join('、') : '无'}</p>`);
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
    const asSlot = o => o && o.kind === 'book' ? { ...o } : o, asBag = o => o && !o.kind ? { ...o, kind: 'book' } : o;   // 熟练度跟着书走
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
    const proposed = r.slots.slice(); if (p.t === 's') proposed[p.i] = a; if (sel.t === 's') proposed[sel.i] = b; if (DATA.commonMasters(proposed) > 1) { toast('一套技能槽最多装备1个通用宗师（职业书内也计入）'); sel=null; return loadout(box); }
    // 同一招合并 = 升级
    if (a && b && !a.job && !b.job && a.id === b.id && (a.kind === 'book' || !a.kind) && (b.kind === 'book' || !b.kind)) { b.xp = Math.min(DATA.prof[6], Math.max(b.xp || 0, DATA.prof[Math.min(6, JOBS.level(b))])); put(sel, null); toast(`${SK[b.id].name} 熟练度提升`); }
    else {
      put(p, p.t === 's' ? asSlot(a) : asBag(a)); put(sel, sel.t === 's' ? asSlot(b) : asBag(b));
      if (!r.slots.some(Boolean)) { put(sel, sel.t === 's' ? asSlot(a) : asBag(a)); put(p, p.t === 's' ? asSlot(b) : asBag(b)); toast('至少留一招'); }
    }
    if (r.si >= r.open) r.si = 0; sel = null; B().careerChanged(); loadout(box);
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
      if (!loot.length) { body.innerHTML = `<p class="dim center">这一波没有战利品<br><small>每站中场固定精英必掉技能书；精英掉书，小头目掉宝物；行商那里也能买</small></p>`; return; }
      const g = document.createElement('div'); g.className = 'cards' + (rep.field ? ' shelf' : ''); body.appendChild(g);
      loot.forEach((o, i) => { const t = thing(o), d = card(t, o);
        btnTo(d, o.kind === 'book' ? '学会' : o.kind === 'use' ? '吃掉' : '收下', () => { if (learn(o)) { if (rep.pickOne) loot = []; else loot.splice(i, 1); render(); } }, true);
        if (!rep.pickOne) btnTo(d, '丢弃', () => { loot.splice(i, 1); render(); }); g.appendChild(d); });
      body.insertAdjacentHTML('beforeend', rep.pickOne ? '<p class="dim center">只能选一本，选了另外两本就消失</p>' : '<p class="dim center">没处理的战利品出发时就没了；局内不能卖，带回去才能卖给大法师</p>');
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
        else btnTo(d, rep.field ? `<span class="pc"></span>${UI.pxNum(price, '#3a2410', 0)}` : `买 ${UI.piH('coin', 1)}${price}`, () => { if (r.coins < price) return toast('铜钱不够'); if (o.kind === 'cry') { B().addCrystal(o.n); toast(`水晶 +${o.n}`); } else if (o.kind === 'slot') { r.open = Math.min(DATA.slotsMax, r.open + 1); toast('技能格 +1'); } else if (!learn(o)) return; if (o.kind === 'manual' && o.id === 'training') r.trainingBoughtSt = `${r.chapter || 1}:${rep.st}`; r.coins -= price; o.sold = true; B().saveCareer(); render(); }, true);
        g.appendChild(d); });
      // 刷新：4 + 2 ×（站 − 1）+ 3 × 已刷次数，每次结算最多刷 4 次
      const [c0, c1, c2] = DATA.price.refresh, cost = (fx.freeRoll && !r.rr) ? 0 : Math.round((c0 + c1 * (rep.st - 1) + c2 * r.rr) * (1 + (fx.reroll || 0))), left = DATA.price.refreshMax + MLm('reroll') - r.rr;
      const w = document.createElement('div'); w.className = 'center'; const rb = document.createElement('button'); rb.className = 'btn mini'; rb.innerHTML = `${UI.piH('reroll', 1)} ${rep.field ? '翻一翻货架' : '刷新货架'} ${UI.piH('coin', 1)}${cost} <small>(${left}/${DATA.price.refreshMax + MLm('reroll')})</small>`; rb.disabled = left <= 0;
      rb.onclick = () => { if (r.coins < cost) return toast('铜钱不够'); r.coins -= cost; r.rr++; r.shop = rollShop(); render(); }; w.appendChild(rb); body.appendChild(w);
    } else if (tab === 'ji') loadout(body);
    else if (tab === 'shu') attrPanel(body);
  }
  // 卡片：图标 · 名字 · 类别 · 分隔线 · 说明（说明区固定高度、垂直居中，按钮永远在最下面对齐）
  function card(t, o) { const d = document.createElement('div'); d.className = 'card ' + o.kind + (t.tier ? ' ct' + t.tier : ''); d.appendChild(iconEl(t)); d.insertAdjacentHTML('beforeend', `<b class="${t.tier ? 'tn' + t.tier : ''}">${t.name}</b><small>${t.sub}</small><i class="hr"></i><p class="desc" title="${String(t.desc).replace(/<br>/g, '\n').replace(/<[^>]+>/g, '').replace(/"/g, '&quot;')}">${t.brief || t.desc}</p>`); return d; }
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
    const lvOf = id => { const h = JOBS.skills(r).find(s => s.id === id); return h ? JOBS.level(h) : 0; };
    const own = new Set(Object.keys(SK).filter(id => lvOf(id) || loot.some(o => o.kind === 'book' && o.id === id))), pool = DATA.bookPool(own, rep.st).filter(id => SK[id].w !== 'gun' || JOBS.skills(r).some(s => SK[s.id].w === 'gun')), books = [];   // 已经有的书不再出；按品阶抽，价格 22 / 34 / 52
    while (books.length < 1 && pool.length) { const id = pool[Math.random() * pool.length | 0]; if (!books.some(b => b.id === id)) books.push({ kind: 'book', id, lv: 1, xp: 0, price: DATA.tierPrice[SK[id].tier] }); if (pool.every(i => books.some(b => b.id === i))) break; }
    const ok0 = DATA.oathPool(r.weapon); if (rep.rift) { const pk0 = () => ({ kind: 'oath', id: ok0[Math.random() * ok0.length | 0], price: 46 }), costI = shuffle(DATA.itemPool(r).filter(i => i.cost)).slice(0, 1).map(i => ({ kind: 'item', id: i.id, price: Math.round((i.price || 40) * 1.3) }));
      return [pk0(), pk0(), { kind: 'oup', id: 'oup', price: 52 }, ...costI]; }
    const L = items.concat(books), ok = DATA.oathPool(r.weapon), pk = () => ({ kind: 'oath', id: ok[Math.random() * ok.length | 0], price: 38 });
    if (rep.disc) { L.splice(0, 2, pk(), pk()); } else if (Math.random() < .3) L.splice(2, 1, pk());
    { let ml = 0; try { ml = JSON.parse(localStorage.getItem('xsyz-meta') || '{}').ex || 0; } catch (e) {} L.push({ kind: 'cry', id: 'cry', n: 4 + 2 * ml, price: 30 }); }   // 11/24 商人：铜钱换水晶（大臣「兑换」每级 +2）
    if (r.trainingBoughtSt !== `${r.chapter || 1}:${rep.st}`) L.push({ kind: 'manual', id: 'training', price: JOBS.manuals.training.price }); if (rep.st > 8 && Math.random() < .25) L.push({ kind: 'manual', id: 'master', price: JOBS.manuals.master.price });
    return L;
  }
  $('cGo').onclick = () => {
    commit(); const r = R(); loot = [];   // 11/25 没处理的直接丢掉（不再自动卖）
    $('camp').classList.remove('on'); document.body.classList.remove('shopOn'); if (rep.after) rep.after(); else B().nextWave();
  };

  // ---------- 装备页（暂停页里的一页，11/25）：主手＝本局兵器；副手可放盾；长枪/弓/法杖占两格 ----------
  let eqMsg = '起手只有一把兵器，其余格子都空着。';
  const gearIcon = (it, id, t) => `<img src="art/ui2/g_${id}${t}.png?v=1" alt="" style="width:78%;image-rendering:pixelated">`;
  // 空装备格的像素剪影（16×16，# 为填充）
  const SIL = {
    helm: ['................', '.....######.....', '....########....', '...##########...', '...##########...', '...##########...', '...###....###...', '...###....###...', '...##......##...', '...##......##...'],
    armor: ['..###......###..', '.####......####.', '.#####....#####.', '.##############.', '.##############.', '..############..', '..############..', '..############..', '..############..', '...##########...', '...##########...', '...##########...', '....########....'],
    belt: ['################', '################', '#######..#######', '#######..#######', '################', '################'],
    boots: ['..####....####..', '..####....####..', '..####....####..', '..####....####..', '..####....####..', '.#####....#####.', '#######..#######', '#######..#######'],
    acc: ['.......##.......', '......####......', '.....######.....', '......####......', '....########....', '...###....###...', '..###......###..', '..##........##..', '..##........##..', '..###......###..', '...###....###...', '....########....'],
    main: ['.......##.......', '......####......', '......####......', '......####......', '......####......', '......####......', '......####......', '......####......', '......####......', '....########....', '.......##.......', '.......##.......', '......####......'],
    off: ['..############..', '.##############.', '.##############.', '.##############.', '.##############.', '.##############.', '..############..', '..############..', '...##########...', '....########....', '.....######.....', '......####......'],
  };
  function drawSil(box) {
    for (const c of box.querySelectorAll('canvas[data-sil]')) { const g = c.getContext('2d'), rows = SIL[c.dataset.sil], dy = Math.floor((16 - rows.length) / 2);
      rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '#') return; g.fillStyle = '#7a6040'; g.fillRect(x, y + dy, 1, 1); }));
      g.fillStyle = '#9a7c52'; rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#' && (rows[y - 1] || '')[x] !== '#') g.fillRect(x, y + dy, 1, 1); })); }
  }
  // 11/25 装备状态在本局里（RUN.eq / gbag / stones），通关自动卖，真死全丢
  function GS() { const r = R(); if (!r.eq) r.eq = {}; if (!r.eq.main) r.eq.main = { t: 1, aff: [] }; if (!r.gbag) r.gbag = []; if (!r.stones) r.stones = { 1: 0, 2: 0, 3: 0 }; return r; }
  const wIcon = (wp, t, cls) => `<img class="wimg${cls ? ' ' + cls : ''}" src="art/ui2/w_${wp}${t}.png?v=2" alt="">`;
  const WN = (wp, t) => DATA.weaponNames[wp][t - 1], gname = it => (it.k === 'w' || !it.id) ? WN(R().weapon || 'sword', it.t) : DATA.gear[it.id].names[it.t - 1];
  const affTxt = a => a.map(x => `${DATA.affixes[x[0]][0]} +${DATA.affixes[x[0]][1][x[1] - 1]}%（${DATA.stoneNames[x[1]]}）`);
  const statTxt = (D, t) => Object.entries(D.st[t - 1]).map(([k, v]) => `${DATA.statLabel[k]} +${k.startsWith('dmg') ? Math.round(v * 100) + '%' : v}`);
  function equipPanel(box) {
    const r = GS(), wp = r.weapon || 'sword', W = DATA.weapons[wp], two = wp !== 'sword', E = r.eq, mt = E.main.t || 1;
    if (two) E.off = null;
    const HINT = { main: '本局拿的兵器，局内换不了系，只能升阶。', off: '盾牌；只有拿剑才能装。', helm: '头部防具。', armor: '身体防具。', belt: '腰带。', boots: '鞋子。', acc: '戒指、护符等配饰。' };
    const SN = { main: '主手', off: '副手', helm: '头盔', armor: '铠甲', belt: '腰带', boots: '鞋子', acc: '配饰' };
    const cellOf = (key, label, area) => {
      let inner = `<canvas class="sil" data-sil="${key}" width="16" height="16"></canvas>`, cls = 'slot', nm = label, em = ' em';
      if (key === 'main') { cls += ' has full'; inner = wIcon(wp, mt); nm = WN(wp, mt); em = ' tr' + mt; }
      else if (key === 'off' && two) { cls += ' eqghost'; inner = wIcon(wp, mt, 'ghost'); nm = '（占用）'; }
      else if (E[key]) { const D = DATA.gear[E[key].id]; cls += ' has full'; inner = gearIcon(D, E[key].id, E[key].t); nm = gname(E[key]); em = ' tr' + E[key].t; }
      return `<div class="sw" style="grid-area:${area}"><div class="${cls}" data-s="${key}">${inner}</div><div class="nm${em}">${nm}</div></div>`;
    };
    const stoneKs = [1, 2, 3].filter(t => r.stones[t] > 0), cells = Math.max(16, stoneKs.length + r.gbag.length) + 4;
    const list = [...stoneKs.map(t => ({ st: t })), ...r.gbag.map((it, i) => ({ it, i }))];
    box.innerHTML = `<div class="lo gearlo"><div class="lol"><h4>装备栏 <small>点一下卸下</small></h4><div class="eqD">` +
      cellOf('main', '主手', 'm') + cellOf('helm', '头盔', 'h') + cellOf('off', '副手', 'o') + cellOf('armor', '铠甲', 'a') + cellOf('acc', '配饰', 'c') + cellOf('boots', '鞋子', 'b') + cellOf('belt', '腰带', 'e') +
      `</div><div class="eqDet" id="eqDet">${eqMsg}</div></div>` +
      `<div class="lor"><h4>物品栏 <span class="bagN${r.gbag.length >= 14 ? ' warn' : ''}">${r.gbag.length}/16</span> <small>拖附魔石到主手武器 · 通关自动卖</small></h4><div class="eqBtns" style="margin:0 0 6px"><button class="btn mini" data-m="1" ${r.stones[1] >= 2 ? '' : 'disabled'}>2 低阶 → 1 中阶</button><button class="btn mini" data-m="2" ${r.stones[2] >= 2 ? '' : 'disabled'}>2 中阶 → 1 高阶</button></div><div class="bag">` +
      Array.from({ length: cells }, (_, i) => { const x = list[i]; if (i >= cells - 4) return '<div class="lk" data-tip="未解锁的物品格：以后开放"></div>'; if (!x) return '<div></div>';
        if (x.st) return `<div class="has full eqS${eqSel === x.st ? ' sel' : ''}" data-st="${x.st}"><img class="stnI" src="art/ui2/g_stone${x.st}.png?v=1" alt=""><i class="stk">${r.stones[x.st]}</i></div>`;
        const it = x.it; return `<div class="has full eqI tr${it.t}" data-i="${x.i}">${it.k === 'w' ? wIcon(wp, it.t) : gearIcon(DATA.gear[it.id], it.id, it.t)}</div>`; }).join('') + `</div></div></div>`;
    for (const e of box.querySelectorAll('[data-ic]')) { const n = UI.icon(e.dataset.ic); if (e.classList.contains('ghost')) n.classList.add('ghost'); e.replaceWith(n); }
    drawSil(box);
    let tt = document.getElementById('eqTT'); if (!tt) { tt = document.createElement('div'); tt.id = 'eqTT'; tt.className = 'eqTT'; document.body.appendChild(tt); } tt.style.display = 'none';
    const det = $('eqDet'), hideT = () => { tt.style.display = 'none'; det.innerHTML = eqMsg; };
    const showT = (e, html, d) => { tt.innerHTML = html; tt.style.display = 'block'; const w = tt.offsetWidth, h = tt.offsetHeight; let x = e.clientX + 16, y = e.clientY + 16; if (x + w > innerWidth - 6) x = e.clientX - w - 12; if (y + h > innerHeight - 6) y = innerHeight - h - 6; tt.style.left = Math.max(6, x) + 'px'; tt.style.top = y + 'px'; det.innerHTML = d; };
    const wTip = (it, tag) => `<h5 class="tr${it.t}">${gname(it)}<span>${tag || W.name + ' · ' + it.t + ' 阶'}</span></h5><div class="g">${W.name}系招式伤害 +${Math.round(DATA.weaponDmg[it.t - 1] * 100)}%${it.t === 1 ? '；该系熟练度 +10%' : it.t === 2 ? '；该系标记持续 +0.5秒' : ''}</div>` + (it.aff && it.aff.length ? affTxt(it.aff).map(t => `<div class="g">✦ ${t}</div>`).join('') : '') + `<div class="d">附魔 ${(it.aff || []).length}/${it.t}</div>`;
    const wDet = it => `<b class="tr${it.t}">${gname(it)}</b> <i>· ${it.t} 阶 · ${W.name}系招式伤害 +${Math.round(DATA.weaponDmg[it.t - 1] * 100)}%${it.t === 1 ? '；该系熟练度 +10%' : it.t === 2 ? '；该系标记持续 +0.5秒' : ''}　附魔 ${(it.aff || []).length}/${it.t}</i><br>` + ((it.aff || []).map(a => `<span class="aff">✦ ${affTxt([a])[0]}</span>`).join('') || '<i>还没有词条</i>');
    const gTip = (it, tag, extra) => { const D = DATA.gear[it.id]; return `<h5 class="tr${it.t}">${gname(it)}<span>${tag}</span></h5>${statTxt(D, it.t).map(t => `<div class="g">${t}</div>`).join('')}${extra || ''}`; };
    for (const e of box.querySelectorAll('.eqD .slot')) { const k = e.dataset.s, it = k === 'main' ? E.main : E[k];
      e.onmousemove = ev => { if (k === 'main') showT(ev, wTip(E.main, '主手'), wDet(E.main));
        else if (k === 'off' && two) showT(ev, `<h5>副手<span>被占用</span></h5><div class="d">${HINT.off}</div>`, `<b>副手</b> <i>· 被双手武器占用</i>`);
        else if (it) showT(ev, gTip(it, SN[k], '<hr><div class="d">点一下卸下</div>'), `<b class="tr${it.t}">${gname(it)}</b> <i>· ${SN[k]}　${statTxt(DATA.gear[it.id], it.t).join('　')}　点一下卸下</i>`);
        else showT(ev, `<h5>${SN[k]}<span>空</span></h5><div class="d">${HINT[k]}</div><hr><div class="d">获得途径：打完一站后偶尔掉落</div>`, `<b>${SN[k]}</b> <i>· 空　${HINT[k]}</i>`); };
      e.onmouseleave = hideT; }
    for (const e of box.querySelectorAll('.eqI')) { const i = +e.dataset.i, it = r.gbag[i];
      e.onmousemove = ev => { if (it.k === 'w') { const c = E.main; showT(ev, wTip(it, it.t + ' 阶' + (it.t > mt ? '（比现在的更好）' : '')) + `<hr><div class="d">点一下换上（词条跟着武器走，旧武器回物品栏）</div>`, wDet(it)); }
        else { const D = DATA.gear[it.id], cur = E[D.slot], blk = D.sword && two; showT(ev, gTip(it, D.tag + '（未装备）', `<hr>${blk ? '<div class="d">只有拿剑才能装盾</div>' : cur ? `<div class="d">替换 ${gname(cur)}</div>` : `<div class="g">装备后：${D.tag}栏 空 → ${gname(it)}</div>`}<div class="d">点一下装备</div>`), `<b class="tr${it.t}">${gname(it)}</b> <i>· ${D.tag}（未装备）</i>　${statTxt(D, it.t).join('　')}`); } };
      e.onmouseleave = hideT; }
    for (const e of box.querySelectorAll('.eqS')) { const t = +e.dataset.st; e.onmousemove = ev => showT(ev, `<h5>附魔石<span>${DATA.stoneNames[t]}</span></h5><div class="g">给武器随机添加 1 个词条</div><div class="d">词条强度：${DATA.stoneNames[t]}　·　拖到主手武器上（点选后再点武器也行）</div>`, `<b>附魔石</b> <i>· ${DATA.stoneNames[t]}　×${r.stones[t]}　拖到主手武器上</i>`); e.onmouseleave = hideT; }
    for (const e of box.querySelectorAll('.lk')) { e.onmousemove = ev => showT(ev, `<h5>未解锁的格子<span>物品栏</span></h5><div class="d">以后开放。</div>`, '<b>未解锁</b> <i>· 以后开放</i>'); e.onmouseleave = hideT; }
    const redo = m => { eqMsg = m; hideT(); equipPanel(box); B().recompute(); };
    // 附魔：满了弹确认，随机覆盖一条
    const doEnc = t => { if (!(r.stones[t] > 0)) return; const w = E.main, P = a => a[Math.random() * a.length | 0], used = new Set(w.aff.map(a => a[0])), pool = DATA.affixes.map((_, i) => i).filter(i => !used.has(i)), n = [P(pool.length ? pool : DATA.affixes.map((_, i) => i)), t]; let old = null;
      if (w.aff.length < mt) w.aff.push(n); else { const i = Math.random() * w.aff.length | 0; old = affTxt([w.aff[i]])[0]; w.aff[i] = n; }
      r.stones[t]--; if (!r.stones[t] && eqSel === t) eqSel = 0; redo(`新增：${affTxt([n])[0]}${old ? '（覆盖了：' + old + '）' : ''}`); };
    const enc = t => { t = t || eqSel; if (!t || !(r.stones[t] > 0)) return; if (E.main.aff.length < mt) return doEnc(t);
      const m = document.createElement('div'); m.className = 'eqMdl'; m.innerHTML = `<div><p>${WN(wp, mt)} 的附魔已满（${E.main.aff.length}/${mt}）。<br>用${DATA.stoneNames[t]}石会<b>随机覆盖一条词条</b>，确定吗？</p><div class="eqBtns"><button class="btn mini" data-n>取消</button><button class="btn mini gold" data-y>确定覆盖</button></div></div>`; document.body.appendChild(m);
      m.querySelector('[data-n]').onclick = () => m.remove(); m.querySelector('[data-y]').onclick = () => { m.remove(); doEnc(t); }; };
    for (const e of box.querySelectorAll('.eqD .slot')) e.onclick = () => { const k = e.dataset.s; if (k === 'main') { if (eqSel) return enc(); return redo('主手是本局的兵器，只能升阶（背包里有更高阶的就点它换上）。'); } if (k === 'off' && two) return redo('双格武器占着副手，只有拿剑才能放盾。'); if (!E[k]) return; if (r.gbag.length >= 16) return redo('物品栏满了，先把东西腾出来。'); r.gbag.push(E[k]); E[k] = null; redo('已卸下，回到物品栏。'); };
    for (const e of box.querySelectorAll('.eqI')) e.onclick = () => { const i = +e.dataset.i, it = r.gbag[i];
      if (it.k === 'w') { const old = E.main; E.main = it; r.gbag.splice(i, 1); r.gbag.push(old.k ? old : Object.assign({ k: 'w' }, old)); return redo(`换上了 ${WN(wp, it.t)}。`); }
      const D = DATA.gear[it.id]; if (D.sword && two) return redo('现在拿的是双格武器，副手用不了盾。'); const old = E[D.slot]; E[D.slot] = it; r.gbag.splice(i, 1); if (old) r.gbag.push(old); redo(gname(it) + '已装备。'); };
    for (const e of box.querySelectorAll('[data-m]')) e.onclick = () => { const t = +e.dataset.m; if (r.stones[t] < 2) return; r.stones[t] -= 2; r.stones[t + 1]++; redo(`合成了 1 颗${DATA.stoneNames[t + 1]}附魔石。`); };
    // 石头：按住拖到主手武器上（手机手指也行）；不拖动就是选中，再点主手
    for (const e of box.querySelectorAll('.eqS')) { const t = +e.dataset.st; e.onpointerdown = ev => { const sx = ev.clientX, sy = ev.clientY; let gh = null, moved = 0;
        const mv = m => { if (!moved && Math.hypot(m.clientX - sx, m.clientY - sy) > 6) { moved = 1; gh = document.createElement('div'); gh.className = 'dragghost'; gh.innerHTML = e.innerHTML; gh.style.cssText += ';position:fixed;z-index:200;pointer-events:none;width:48px;height:48px;opacity:.9'; document.body.appendChild(gh); } if (gh) { gh.style.left = m.clientX - 24 + 'px'; gh.style.top = m.clientY - 24 + 'px'; box.querySelector('.eqD .slot[data-s=main]').classList.toggle('dro', !!(document.elementFromPoint(m.clientX, m.clientY) || {}).closest && !!document.elementFromPoint(m.clientX, m.clientY).closest('.slot[data-s=main]')); } };
        const up = m => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); if (gh) gh.remove(); const ms = box.querySelector('.eqD .slot[data-s=main]'); if (ms) ms.classList.remove('dro');
          if (moved) { const el = document.elementFromPoint(m.clientX, m.clientY); if (el && el.closest('.slot[data-s=main]')) enc(t); } else { eqSel = eqSel === t ? 0 : t; equipPanel(box); } };
        addEventListener('pointermove', mv); addEventListener('pointerup', up); }; e.ondragstart = ev => ev.preventDefault(); }
  }
  let eqSel = 0;
  function giveGear() { const r = GS(); r.stones = { 1: 5, 2: 3, 3: 1 }; r.gbag = [{ k: 'w', t: 2, aff: [] }, { k: 'w', t: 3, aff: [] }, ...Object.keys(DATA.gear).filter(k => !(DATA.gear[k].sword && r.weapon !== 'sword')).map(id => ({ k: 'g', id, t: 1 + Math.floor(Math.random() * 3) }))].slice(0, 16); B().recompute(); if ($('pause').classList.contains('on') && ptab === 'zhuang') pauseRender(); }
  // ---------- 暂停页 = 备战 ----------
  let ptab = 'ji';
  function pauseRender() {
    { const t = document.getElementById('eqTT'); if (t) t.style.display = 'none'; }
    const tb = $('pTabs'); tb.innerHTML = '';
    for (const [k, n] of [['ji', '技能'], ['shu', '属性'], ['zhuang', '装备']]) { const b = document.createElement('button'); b.className = k === ptab ? 'on' : ''; const dn = k === 'shu' ? R().pts : 0; b.innerHTML = n + (dn ? `<em>${dn}</em>` : '');
      b.onclick = () => { if (k === ptab) return; const d = ['ji', 'shu', 'zhuang'].indexOf(k) > ['ji', 'shu', 'zhuang'].indexOf(ptab) ? 'slideR' : 'slideL'; if (ptab === 'shu' && k !== 'shu') commit(); ptab = k; sel = null; pauseRender(); const pb = $('pBody'); pb.classList.remove('slideL', 'slideR'); void pb.offsetWidth; pb.classList.add(d); }; tb.appendChild(b); }
    refreshCoin(); if (ptab === 'ji') loadout($('pBody')); else if (ptab === 'zhuang') equipPanel($('pBody')); else attrPanel($('pBody')); careerButton();
  }
  function pauseOpen() { prevFill = null; UI.newDot(false); sel = null; ptab = R().pts ? 'shu' : 'ji'; pauseRender(); careerButton(); }

  window.CAMP = { giveGear, learn, rollXiu, open, pauseOpen, commit, isOpen: () => $('camp').classList.contains('on'), close: () => $('camp').classList.remove('on') };
})();

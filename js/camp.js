// 像素勇者 · 波间结算页（照三国终章的整备屏：结算 / 拾取 / 修炼 / 行商 / 技能）+ 暂停时的备战页。
// 技能搭配：点一个格子选中，再点另一个格子就交换；背包里的技能书点技能格就装上，同一招的书装到同一招上 = 升一级。
(() => {
  const $ = id => document.getElementById(id), B = () => BATTLE, R = () => BATTLE.run();
  const SK = DATA.skills, ITEM = id => DATA.startItems.find(i => i.id === id), USE = id => DATA.consumables.find(i => i.id === id);
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const coinTxt = n => `<span class="cn">${UI.piH('coin', 1)} ${n}</span>`;
  let rep = null, tab = 'jie', sel = null, loot = [];

  // ---------- 通用：东西的样子 ----------
  function thing(o) {   // 返回 { icon(dom), name, desc, sell }
    if (!o) return null;
    if (o.kind === 'book') { const S = SK[o.id]; return { icon: UI.icon(S.icon), name: S.name, sub: `${S.sys} · 技能书`, desc: S.desc, sell: DATA.price.sellBook * (o.lv || 1) }; }
    if (o.kind === 'item') { const it = ITEM(o.id); return { icon: UI.pi(o.id), name: it.name, sub: '宝物 · 放在背包里就生效', desc: it.desc, sell: DATA.price.sellItem }; }
    const c = USE(o.id); return { icon: UI.pi(o.id), name: c.name, sub: '消耗品', desc: c.desc, sell: 5 };
  }
  function iconEl(t) { const s = document.createElement('span'); s.className = 'ic'; if (t.icon) s.appendChild(t.icon); else s.textContent = t.emoji; return s; }
  // 学会一本书：已经有这一招就升一级，否则放进背包
  function learn(o) {
    const r = R();
    if (o.kind === 'book') {
      const has = r.slots.find(s => s && s.id === o.id) || r.bag.find(b => b && b.kind === 'book' && b.id === o.id);
      if (has) { has.lv += o.lv || 1; toast(`${SK[o.id].name} 升到 Lv${has.lv}`); return true; }
    }
    if (o.kind === 'use') { const c = USE(o.id), h = B().hero(); h.hp = Math.min(h.maxHp, h.hp + h.maxHp * c.heal); toast(`吃掉${c.name}，回复生命`); return true; }
    const i = r.bag.indexOf(null); if (i < 0) { toast('背包满了，先卖掉点东西'); return false; }
    r.bag[i] = o.kind === 'book' ? { kind: 'book', id: o.id, lv: o.lv || 1 } : { kind: o.kind, id: o.id }; if (o.kind === 'item') B().recompute();
    return true;
  }
  let toastT = 0; function toast(s) { const e = $('toast'); e.textContent = s; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), 1600); }

  // ---------- 技能搭配（结算页「技能」页签和暂停页共用） ----------
  function loadout(box) {
    const r = R(), h = B().hero(); box.innerHTML = '';
    const wrap = document.createElement('div'); wrap.className = 'lo'; box.appendChild(wrap);
    const L = document.createElement('div'), Rt = document.createElement('div'); L.className = 'lol'; Rt.className = 'lor'; wrap.append(L, Rt);
    let cyc = 0; r.slots.slice(0, r.open).forEach(s => { if (s) cyc += B().skillInfo(s).cd; });
    L.insertAdjacentHTML('beforeend', `<h4>技能栏 <small>按 1→2→3 顺序轮流自动出手 · 一轮约 ${cyc.toFixed(1)} 秒</small></h4>`);
    const sl = document.createElement('div'); sl.className = 'slots'; L.appendChild(sl);
    r.slots.forEach((s, i) => { const d = document.createElement('div'); d.innerHTML = `<u>${i + 1}</u>`;
      if (i >= r.open) d.className = 'slot lock';
      else if (s) { d.className = 'slot has'; d.appendChild(UI.icon(SK[s.id].icon)); d.insertAdjacentHTML('beforeend', `<span>${SK[s.id].name}</span><i>Lv${s.lv}</i>`); }
      else { d.className = 'slot'; d.insertAdjacentHTML('beforeend', '空'); }
      if (sel && sel.t === 's' && sel.i === i) d.classList.add('sel');
      if (i < r.open) d.onclick = () => pick({ t: 's', i }, box); sl.appendChild(d); });
    L.insertAdjacentHTML('beforeend', '<h4>背包 <small>宝物放着就生效；技能书点一下再点技能格装上</small></h4>');
    const bg = document.createElement('div'); bg.className = 'bag'; L.appendChild(bg);
    r.bag.forEach((o, i) => { const d = document.createElement('div'); const t = thing(o);
      if (t) { d.className = 'has ' + o.kind; d.appendChild(iconEl(t)); if (o.kind === 'book') d.insertAdjacentHTML('beforeend', `<i>${o.lv > 1 ? 'Lv' + o.lv : '书'}</i>`); }
      if (sel && sel.t === 'b' && sel.i === i) d.classList.add('sel');
      d.onclick = () => pick({ t: 'b', i }, box); bg.appendChild(d); });
    // 选中东西的说明和按钮
    const info = document.createElement('div'); info.className = 'loinfo'; L.appendChild(info);
    const cur = sel && (sel.t === 's' ? r.slots[sel.i] && { kind: 'book', id: r.slots[sel.i].id, lv: r.slots[sel.i].lv, slot: true } : r.bag[sel.i]);
    if (cur) {
      const t = thing(cur); info.appendChild(iconEl(t));
      let txt = `<b>${t.name}${cur.kind === 'book' ? ' Lv' + cur.lv : ''}</b> <small>${t.sub}</small><br>${t.desc}`;
      if (cur.kind === 'book') { const k = B().skillInfo({ id: cur.id, lv: cur.lv }); txt += `<br><small>伤害 ${Math.round(k.dmg)} · 冷却 ${k.cd.toFixed(2)} 秒 · 吃「${DATA.attrs.find(a => a.id === SK[cur.id].type).name}」</small>`; }
      const p = document.createElement('p'); p.innerHTML = txt; info.appendChild(p);
      const btns = document.createElement('div'); btns.className = 'lob'; info.appendChild(btns);
      const btn = (label, fn, gold) => { const b = document.createElement('button'); b.className = 'btn mini' + (gold ? ' gold' : ''); b.textContent = label; b.onclick = e => { e.stopPropagation(); fn(); }; btns.appendChild(b); };
      if (sel.t === 's') { if (r.slots.filter(Boolean).length > 1) btn('卸下', () => { const j = r.bag.indexOf(null); if (j < 0) return toast('背包满了'); r.bag[j] = { kind: 'book', id: cur.id, lv: cur.lv }; r.slots[sel.i] = null; sel = null; loadout(box); }); }
      else {
        if (cur.kind === 'book') btn('装上', () => { const j = r.slots.slice(0, r.open).indexOf(null); if (j < 0) return toast('技能格满了：点一个技能格来替换'); pick({ t: 's', i: j }, box); }, true);
        if (cur.kind === 'use') btn('吃掉', () => { learn(cur); r.bag[sel.i] = null; sel = null; loadout(box); }, true);
        btn(`卖掉 ${t.sell}`, () => { r.coins += t.sell; r.bag[sel.i] = null; sel = null; if (cur.kind === 'item') B().recompute(); loadout(box); refreshCoin(); });
      }
    } else info.innerHTML = '<p class="dim">点技能格或背包里的东西查看说明。点两个格子可以交换位置。</p>';
    // 右边：属性和各项数值
    const c = DATA.calc({ weapon: r.weapon, attrs: r.attrs, train: r.train, items: r.bag.filter(x => x && x.kind === 'item').map(x => x.id), habit: r.habit });
    const pct = v => (v >= 0 ? '+' : '') + Math.round(v * 100) + '%';
    Rt.innerHTML = `<h4>勇者 <small>Lv${B().lv()}</small></h4><div class="attr4">${DATA.attrs.map(a => `<span>${UI.piH(a.id, 1)}${a.name}</span><b>${c.A[a.id]}${r.train[a.id] ? `<small> (修炼+${r.train[a.id]})</small>` : ''}</b>`).join('')}</div>
      <div class="stats"><span>${UI.piH('hp', 1)}生命</span><b>${Math.ceil(h.hp)}/${h.maxHp}</b><span>${UI.piH('spd', 1)}出手速度</span><b>${pct(c.spd - 1)}</b><span>${UI.piH('area', 1)}范围</span><b>${pct(c.area - 1)}</b><span>${UI.piH('crit', 1)}暴击率</span><b>${Math.round(c.crit * 100)}%</b><span>${UI.piH('guard', 1)}受到伤害</span><b>${pct(c.dmgIn - 1)}</b><span>${UI.piH('move', 1)}移速</span><b>${pct(c.move - 1)}</b></div>
      ${r.habit ? `<p class="dim">现实习惯：${DATA.habits.find(x => x.id === r.habit).name}</p>` : ''}`;
  }
  function pick(p, box) {
    const r = R();
    if (!sel) { if (p.t === 'b' && !r.bag[p.i]) return; sel = p; return loadout(box); }
    if (sel.t === p.t && sel.i === p.i) { sel = null; return loadout(box); }
    const get = q => q.t === 's' ? r.slots[q.i] : r.bag[q.i], put = (q, v) => { if (q.t === 's') r.slots[q.i] = v; else r.bag[q.i] = v; };
    let a = get(sel), b = get(p);
    const toSlot = (o, q) => q.t !== 's' || !o || o.kind === 'book' || o.lv;   // 技能格只能放技能
    const asSlot = o => o && o.kind === 'book' ? { id: o.id, lv: o.lv } : o, asBag = o => o && !o.kind ? { kind: 'book', id: o.id, lv: o.lv } : o;
    if ((a && p.t === 's' && !toSlot(a, p)) || (b && sel.t === 's' && !toSlot(b, sel))) { toast('技能格只能放技能书'); sel = p.t === 'b' && b ? p : null; return loadout(box); }
    // 同一招合并 = 升级
    if (a && b && a.id === b.id && (a.kind === 'book' || !a.kind) && (b.kind === 'book' || !b.kind)) { b.lv += a.lv; put(sel, null); toast(`${SK[b.id].name} 升到 Lv${b.lv}`); }
    else {
      put(p, p.t === 's' ? asSlot(a) : asBag(a)); put(sel, sel.t === 's' ? asSlot(b) : asBag(b));
      if (!r.slots.some(Boolean)) { put(sel, sel.t === 's' ? asSlot(a) : asBag(a)); put(p, p.t === 's' ? asSlot(b) : asBag(b)); toast('至少留一招'); }
    }
    if (r.si >= r.open) r.si = 0; sel = null; B().recompute(); loadout(box);
  }

  // ---------- 波间结算页 ----------
  const TABS = [['jie', '结算'], ['shi', '拾取'], ['xiu', '修炼'], ['shang', '行商'], ['ji', '技能']];
  function open(report) {
    rep = report; loot = report.loot.map(o => Object.assign({ lv: 1 }, o)); tab = 'jie'; sel = null;
    $('cTitle').textContent = `第 ${rep.wave + 1}/${rep.waves} 波 清完`;
    $('cGo').textContent = rep.last ? '挑战首领 ▶' : `第 ${rep.wave + 2} 波 ▶`;
    $('cHint').textContent = rep.last ? '（「下一步去哪」还没做，先直接打首领）' : '';
    render(); $('camp').classList.add('on');
  }
  function refreshCoin() { const r = R(); for (const id of ['cCoin', 'pCoin']) $(id).innerHTML = coinTxt(r.coins); }
  function render() {
    const r = R(), tb = $('ctabs'); tb.innerHTML = '';
    for (const [k, n] of TABS) { const b = document.createElement('button'); b.className = k === tab ? 'on' : ''; const dot = (k === 'xiu' && r.xiu) || (k === 'shi' && loot.length); b.innerHTML = n + (dot ? `<em>${k === 'xiu' ? r.xiu : loot.length}</em>` : ''); b.onclick = () => { tab = k; sel = null; render(); }; tb.appendChild(b); }
    refreshCoin(); const body = $('cBody'); body.innerHTML = ''; body.className = 'cbody t-' + tab;
    if (tab === 'jie') {
      const tot = Object.values(rep.dmg).reduce((s, v) => s + v, 0) || 1, rows = Object.entries(rep.dmg).sort((a, b) => b[1] - a[1]);
      body.innerHTML = `<div class="cg"><div class="cpn"><h4>这一波</h4><div class="stats big"><span>击倒</span><b>${rep.kills}</b><span>铜钱</span><b>+${rep.coins} <small>(含清场 ${rep.coinWave})</small></b><span>经验</span><b>+${rep.xp}</b><span>等级</span><b>Lv${rep.lv}</b><span>待修炼</span><b>${r.xiu} 次</b></div></div>
        <div class="cpn"><h4>输出统计</h4>${rows.length ? rows.map(([id, v]) => `<div class="dmgr"><span>${SK[id].name}</span><i><b style="width:${(v / tot * 100).toFixed(1)}%"></b></i><em>${Math.round(v)} · ${Math.round(v / tot * 100)}%</em></div>`).join('') : '<p class="dim">没有打出伤害</p>'}</div></div>`;
    } else if (tab === 'shi') {
      if (!loot.length) { body.innerHTML = `<p class="dim center">这一波没有别的战利品${rep.last ? '' : '<br><small>技能书要打完一站才掉；行商那里也能买</small>'}</p>`; return; }
      const g = document.createElement('div'); g.className = 'cards'; body.appendChild(g);
      loot.forEach((o, i) => { const t = thing(o), d = card(t, o);
        btnTo(d, o.kind === 'book' ? '学会' : o.kind === 'use' ? '吃掉' : '收下', () => { if (learn(o)) { loot.splice(i, 1); render(); } }, true);
        btnTo(d, `卖 ${t.sell}`, () => { r.coins += t.sell; loot.splice(i, 1); render(); }); g.appendChild(d); });
      body.insertAdjacentHTML('beforeend', '<p class="dim center">没处理的战利品，出发时自动卖掉换铜钱</p>');
    } else if (tab === 'xiu') {
      if (!r.xiu) { body.innerHTML = '<p class="dim center">暂无修炼机会<br><small>打怪攒经验，每升一级得一次修炼</small></p>'; return; }
      const fx = B().hero().fx, nOpt = 3 + (fx.xiuOpt || 0), rrMax = Math.max(0, 2 + (fx.xiuReroll || 0));
      if (!r.xopt) r.xopt = rollXiu(nOpt);
      body.insertAdjacentHTML('beforeend', `<p class="dim center">还有 ${r.xiu} 次修炼机会 · 三选一</p>`);
      const g = document.createElement('div'); g.className = 'cards'; body.appendChild(g);
      r.xopt.forEach(o => { const Q = DATA.rarity[o.q], d = document.createElement('div'); d.className = 'card xiu q' + o.q;
        d.innerHTML = `${UI.piH(o.adds[0][0])}<b>${DATA.attrs.find(a => a.id === o.adds[0][0]).name}修炼</b><small style="color:${Q.col}">${Q.name}</small>${o.adds.map(([a, v]) => `<p class="plus">+${v} ${DATA.attrs.find(x => x.id === a).name}</p>`).join('')}<p class="dim">${DATA.attrs.find(a => a.id === o.adds[0][0]).desc}</p>`;
        btnTo(d, '修 炼', () => { for (const [a, v] of o.adds) r.train[a] = (r.train[a] || 0) + v; r.xiu--; r.xopt = null; r.xrr = 0; B().recompute(); render(); }, true); g.appendChild(d); });
      const rb = document.createElement('button'); rb.className = 'btn mini'; rb.innerHTML = `${UI.piH('reroll', 1)} 刷新 ${rrMax - r.xrr}/${rrMax}`; rb.disabled = r.xrr >= rrMax; rb.onclick = () => { r.xrr++; r.xopt = rollXiu(nOpt); render(); };
      const w = document.createElement('div'); w.className = 'center'; w.appendChild(rb); body.appendChild(w);
    } else if (tab === 'shang') {
      const fx = B().hero().fx, pm = 1 + (fx.shop || 0);
      if (!r.shop) r.shop = rollShop();
      const g = document.createElement('div'); g.className = 'cards'; body.appendChild(g);
      r.shop.forEach((o, i) => { const d = o.kind === 'slot' ? (() => { const e = document.createElement('div'); e.className = 'card'; e.innerHTML = `<span class="ic">${UI.piH('slotplus')}</span><b>开新技能格</b><small>技能栏多开一格</small>`; return e; })() : card(thing(o), o), price = Math.round(o.price * pm);
        if (o.sold) { d.classList.add('sold'); d.insertAdjacentHTML('beforeend', '<p class="dim">已买</p>'); }
        else btnTo(d, `买 ${UI.piH('coin', 1)}${price}`, () => { if (r.coins < price) return toast('铜钱不够'); if (o.kind === 'slot') { r.open = Math.min(DATA.slotsMax, r.open + 1); toast('技能格 +1'); } else if (!learn(o)) return; r.coins -= price; o.sold = true; render(); }, true);
        g.appendChild(d); });
      const cost = Math.round(DATA.price.reroll * (r.rr + 1) * (1 + (fx.reroll || 0)));
      const w = document.createElement('div'); w.className = 'center'; const rb = document.createElement('button'); rb.className = 'btn mini'; rb.innerHTML = `${UI.piH('reroll', 1)} 刷新货架 ${UI.piH('coin', 1)}${cost}`;
      rb.onclick = () => { if (r.coins < cost) return toast('铜钱不够'); r.coins -= cost; r.rr++; r.shop = rollShop(); render(); }; w.appendChild(rb); body.appendChild(w);
    } else if (tab === 'ji') loadout(body);
  }
  function card(t, o) { const d = document.createElement('div'); d.className = 'card ' + o.kind; d.appendChild(iconEl(t)); d.insertAdjacentHTML('beforeend', `<b>${t.name}</b><small>${t.sub}</small><p>${t.desc}</p>`);
    if (o.kind === 'book') { const r = R(), has = r.slots.find(s => s && s.id === o.id) || r.bag.find(b => b && b.kind === 'book' && b.id === o.id); if (has) d.insertAdjacentHTML('beforeend', `<p class="plus">已有：Lv${has.lv} → Lv${has.lv + 1}</p>`); }
    return d; }
  function btnTo(d, label, fn, gold) { let f = d.querySelector('.cb'); if (!f) { f = document.createElement('div'); f.className = 'cb'; d.appendChild(f); } const b = document.createElement('button'); b.className = 'btn mini' + (gold ? ' gold' : ''); b.innerHTML = label; b.onclick = fn; f.appendChild(b); }
  function rollXiu(n) {
    const out = [], ids = shuffle(DATA.attrs.map(a => a.id));
    for (let k = 0; k < n; k++) { let x = Math.random(), q = 0; for (let j = DATA.rarity.length - 1; j > 0; j--) { if (x < DATA.rarity[j].p) { q = j; break; } x -= DATA.rarity[j].p; }
      const a = ids[k % ids.length], Q = DATA.rarity[q], o = { q, adds: [[a, Q.add]] };
      if (Q.extra) { const b = ids.find(i => i !== a); o.adds.push([b, Q.extra]); } out.push(o); }
    return out;
  }
  function rollShop() {
    const r = R(), items = shuffle(DATA.startItems.filter(i => i.id !== 'purse')).slice(0, 3).map(i => ({ kind: 'item', id: i.id, price: DATA.price.item }));
    const books = shuffle(Object.keys(SK)).slice(0, 2).map(id => ({ kind: 'book', id, lv: 1, price: DATA.price.book }));
    const L = items.concat(books); if (r.open < DATA.slotsMax) L.push({ kind: 'slot', price: DATA.price.slot * (r.open - 2) }); return L;
  }
  $('cGo').onclick = () => {
    const r = R(); for (const o of loot) r.coins += thing(o).sell; loot = [];   // 没处理的自动卖掉
    $('camp').classList.remove('on'); B().nextWave();
  };

  // ---------- 暂停页 = 备战 ----------
  function pauseOpen() { sel = null; refreshCoin(); loadout($('pBody')); }

  window.CAMP = { open, pauseOpen, isOpen: () => $('camp').classList.contains('on'), close: () => $('camp').classList.remove('on') };
})();

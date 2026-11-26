// 职业书保留原技能对象；只有整本完成才累计职业进度。
window.JOBS = (() => {
  const PROGRESS_MAX = 40, TRAINING_XP = 20;
  const order = ['sword', 'spear', 'bow', 'staff', 'gun', 'common', 'tome', 'scythe'];
  const careers = {
    sword: ['疾风剑士', '首次命中追加一道4伤风刃并叠1层破绽'],
    spear: ['枪术大师', '首次命中挂失衡；放完沿移动方向射出40长枪芒，无位移'],
    bow: ['月影游侠', '首次命中挂猎物；放完补1支4伤追踪箭'],
    staff: ['元素法师', '火冰雷强化本系状态；奥术轮流附带已有元素'],
    gun: ['电玩高手', '每次释放连击最多+1；追加3伤像素弹不加连击'],
    common: ['大冒险家', '第二本技能命中后追加一次4伤小击退波'],
    tome: ['圣光使徒', '每次释放首次命中挂审判；审判惩击回复0.5%生命'],
    scythe: ['亡灵术士', '每次释放首次命中挂诅咒；诅咒死亡召唤小骷髅'],
  };
  const finals = {
    'sword|sword': ['圣剑之主', '破绽上限5层；引爆时按层数向四周射金色剑芒'],
    'spear|spear': ['苍穹龙骑', '位移落地追加8伤落雷；打失衡+30%'],
    'bow|bow': ['幻影神射', '可同时有2只猎物；死亡时跳到最近怪'],
    'staff|staff': ['大魔导师', '元素状态不互相抵消；反应后下一招法术范围+20%'],
    'gun|gun': ['像素勇者', '连击上限20；受伤只扣3层'],
    'common|common': ['武器大师', '同目标第三次命中破甲3秒，无视体质减伤'],
    'sword|spear': ['战争领主', '枪位移穿过带破绽的怪直接引爆'],
    'sword|bow': ['刃之舞者', '弓挂猎物时同时叠1层破绽'],
    'sword|staff': ['魔导剑士', '引爆破绽附带最近法术元素并扩散到周围2只'],
    'sword|gun': ['数码剑士', '连击≥10时剑的风刃/剑芒+1道'],
    'sword|common': ['剑之旅人', '通用技能命中也叠破绽'],
    'spear|bow': ['龙翼游侠', '位移结束向最近猎物射1支6伤穿刺箭'],
    'spear|staff': ['魔枪术士', '位移路径留下最近法术元素痕迹1秒'],
    'spear|gun': ['机甲骑士', '位移结束向四周射4颗3伤像素弹；位移中受伤不扣连击'],
    'spear|common': ['破阵斗士', '通用控制挂失衡；对精英/首领+15%'],
    'bow|staff': ['星辉射手', '法术命中猎物后下一箭附该元素，命中8伤小爆炸'],
    'bow|gun': ['数码游侠', '连击≥10时每次放弓多1支追踪箭'],
    'bow|common': ['赏金猎人', '每站标记1只精英，击杀额外10币；对猎物+10%'],
    'staff|gun': ['像素法师', '每次元素反应射出2颗带该元素的3伤像素弹'],
    'staff|common': ['奥术斗士', '通用技能附带最近法术元素'],
    'gun|common': ['街机斗士', '通用命中也叠连击；连击≥10时通用范围+20%'],
  };
  Object.assign(finals, {
    'tome|tome': ['圣光祭司','审判上限5层，惩击变为小范围圣光爆发'],
    'scythe|scythe': ['永夜巫妖','骷髅上限+2，骷髅攻击可挂诅咒'],
    'tome|scythe': ['暮光行者','审判惩击时使已有诅咒传染一次'],
    'sword|tome': ['圣殿骑士','破绽引爆挂一层审判'],
    'spear|tome': ['天枪骑士','位移结束落点周围挂审判'],
    'bow|tome': ['光羽射手','猎物引爆叠一层审判'],
    'staff|tome': ['神谕法师','元素反应挂一层审判'],
    'gun|tome': ['电玩圣骑','连击至少10时，审判惩击伤害+50%'],
    'common|tome': ['光明斗士','通用技能命中挂审判'],
    'sword|scythe': ['血刃骑士','破绽引爆时使已有诅咒传染一次'],
    'spear|scythe': ['冥枪骑士','位移路径挂诅咒'],
    'bow|scythe': ['幽冥射手','猎物死亡召唤小骷髅'],
    'staff|scythe': ['骸骨祭司','元素反应使已有诅咒传染一次'],
    'gun|scythe': ['像素死灵','骷髅发射3伤像素弹'],
    'common|scythe': ['亡魂斗士','通用技能命中挂诅咒'],
  });
  const key = ws => ws.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b)).join('|');
  const family = s => ({ '剑': 'sword', '枪': 'spear', '弓': 'bow', '法杖': 'staff', '元素法杖': 'staff', '掌机': 'gun', '掌机': 'gun', '通用': 'common', '普通': 'common', '圣典': 'tome', '镰刀': 'scythe' })[s?.sys] || ({ lightgun: 'gun', blaster: 'gun', general: 'common', normal: 'common' })[s?.w] || (order.includes(s?.w) ? s.w : null);
  const leaves = b => b?.job ? b.job.children : b && DATA.skills[b.id] ? [b] : [];
  const books = r => [...r.slots, ...r.bag].filter(b => b && (b.kind === 'book' || !b.kind) && DATA.skills[b.id]);
  const skills = r => books(r).flatMap(leaves);
  const level = s => Math.min(7, DATA.prof.filter(n => (s.xp || 0) >= n).length);
  const name = b => b.job ? (b.job.final ? finals[key(b.job.families)] : careers[b.job.families[0]])[0] : DATA.skills[b.id]?.name || b.id;
  const desc = b => b.job ? (b.job.final ? finals[key(b.job.families)] : careers[b.job.families[0]])[1] : '';
  const refs = r => ['slots', 'bag'].flatMap(a => r[a].map((b, i) => ({ a, i, b })).filter(x => x.b && DATA.skills[x.b.id] && (!x.b.kind || x.b.kind === 'book')));
  const finalKey = b => b?.job?.final ? key(b.job.families) : '';
  const hasFinal = (r, k) => r.slots.some(b => finalKey(b) === k);
  const canPair = (r, a, b) => a !== b && !a.job && !b.job && a.id !== b.id && level(a) === 7 && level(b) === 7 && family(DATA.skills[a.id]) && family(DATA.skills[a.id]) === family(DATA.skills[b.id]) && (r.careerCount || books(r).filter(b => b.job).reduce((n, b) => n + (b.job.final ? 2 : 1), 0)) < 2;
  function merge(r, a, b, final = false) {
    const ra = refs(r).find(x => x.b === a), rb = refs(r).find(x => x.b === b);
    if (!ra || !rb || a === b) return false;
    if (final ? (r.finalCareer || books(r).some(x => x.job?.final) || !a.job || !b.job || a.job.final || b.job.final || a.job.progress < PROGRESS_MAX || b.job.progress < PROGRESS_MAX) : !canPair(r, a, b)) return false;
    const children = [...leaves(a), ...leaves(b)].map(x => ({ ...x, kind: 'book' }));
    const families = final ? [a.job.families[0], b.job.families[0]] : [family(DATA.skills[a.id])];
    const origin = final ? [...a.job.origins, ...b.job.origins] : children.map(() => families[0]);
    const book = { kind: 'book', id: children[0].id, lv: 7, xp: children[0].xp, job: { final, families, children, origins: origin, progress: 0 } };
    if (ra.a === 'slots' || rb.a === 'slots') { const next = r.slots.slice(); if (ra.a === 'slots') next[ra.i] = null; if (rb.a === 'slots') next[rb.i] = null; if (DATA.commonMasters(next.concat(book)) > 1) return false; }
    r[ra.a][ra.i] = book; r[rb.a][rb.i] = null;
    if (ra.a === 'bag' && rb.a === 'slots') { r.slots[rb.i] = book; r.bag[ra.i] = null; }
    r.careerCount = final ? 2 : (r.careerCount || 0) + 1;
    if (final) r.finalCareer = true;
    return book;
  }
  function swap(book, i, j) { if (!book.job || !book.job.children[i] || !book.job.children[j]) return false; for (const a of [book.job.children, book.job.origins]) [a[i], a[j]] = [a[j], a[i]]; book.id = book.job.children[0].id; return true; }
  const manuals = { training: { name: '修炼手册', desc: '选择一个未满级技能，熟练度+20', price: 34 }, master: { name: '大师手册', desc: '选择一个未满级技能，直接升1级（最高Lv7）', price: 52 } };
  function applyManual(type, skill) { if (!manuals[type] || !skill || skill.job || level(skill) >= 7) return false; skill.xp = type === 'training' ? Math.min(DATA.prof[6], (skill.xp || 0) + TRAINING_XP) : DATA.prof[Math.min(6, level(skill))]; return true; }
  function normalize(r) { for (const b of books(r)) if (b.job) { b.job.origins ||= b.job.children.map(s => family(DATA.skills[s.id])); b.job.progress = Math.min(PROGRESS_MAX, Math.max(0, b.job.progress || 0)); } r.careerCount = Math.max(r.careerCount || 0, books(r).reduce((n, b) => n + (b.job ? b.job.final ? 2 : 1 : 0), 0)); r.finalCareer ||= books(r).some(b => b.job?.final); }
  return { PROGRESS_MAX, TRAINING_XP, careers, finals, key, family, leaves, books, skills, level, name, desc, refs, finalKey, hasFinal, canPair, merge, swap, manuals, applyManual, normalize };
})();

// 职业效果只从原技能命中进入；所有追加攻击带 extra 标志，禁止再次触发。
JOBS.combat = A => {
  const H = A.hero, R = A.run, G = A.g, K = A.K, YS = A.YS;
  const live = () => A.foes().filter(z => !z.dead && !z.flee);
  const distance = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * YS) / K;
  const nearby = (p, n = 1, range = 160) => live().filter(z => z !== p && distance(p, z) < range).sort((a, b) => distance(p, a) - distance(p, b)).slice(0, n);
  const has = k => JOBS.hasFinal(R(), k);
  const oath = id => A.oath(id);
  const equipped = w => R().slots.filter(Boolean).some(b=>b.job?.families.includes(w));
  const fx = (p, col = '#bfe8ff', r = 18) => A.fx({ k: 'ring', x: p.x, y: p.y, t: 0, T: .25, r, col });
  const extra = (z, n, sid, dt = 'phys', detonate = false) => { if (!z.dead) A.hurt(z, n, H(), 0, sid, { extra: true, jobExtra: true, detonate, dt }); };
  function shot(c, n, target, look = 'crescent', opts = {}) {
    const h = H(), a = target ? A.ang(h, target) : c.a;
    A.shot({ x: h.x, y: h.y - 12 * K, a, v: 260, life: 1, r: 8, pierce: 0, home: look === 'feather' ? target : null, d: n, sid: c.sk.id, look, o: { extra: true, jobExtra: true, dt: look === 'shadow' ? 'magic' : 'phys' }, ...opts });
  }
  const final = c => JOBS.finalKey(c.book);
  function element(sid) { return ['staff','fireball','pyroblast','flame','meteor'].includes(sid) ? 'fire' : ['nova','blizzard','icewall','winter'].includes(sid) ? 'ice' : ['chain','thunder','balllightning','stormeye'].includes(sid) ? 'lightning' : DATA.skills[sid]?.element || 'arcane'; }
  function reaction(c, z, e) {
    const mage = has('staff|staff');
    const reacts = (e === 'fire' && z.cc?.k === 'freeze') || (e === 'lightning' && z.slowL > 0);
    if (!reacts) return;
    if(has('staff|tome'))mark('judgment',z,c);
    if(has('staff|scythe')&&z.curseT>0)spread(z,c);
    if(e==='fire'){const radius=R().weapon==='staff'&&R().eq?.main?.t===3?39:30;for(const q of [z,...nearby(z,99,radius)])extra(q,10*(1+.5*oath('mark_staff')),c.sk.id,'magic',true);}
    if(e==='lightning'&&c.sk.id==='chain'&&!mage)z.slowL=0;
    if (mage) H().jobRange = .2;
    else if (e === 'fire') { z.slowL = 0; if (z.cc?.k === 'freeze') z.cc = null; }
    if (final(c) === 'staff|gun') { const targets = [z, ...nearby(z, 1)]; for (let i = 0; i < 2; i++) shot(c, 3, targets[i % targets.length], 'shadow', { o: { extra: true, jobExtra: true, dt: 'magic', tags: [e] } }); }
  }
  function applyElement(c, z, e, strengthen = false) {
    if (!e || e === 'arcane') return; reaction(c, z, e);
    if (e === 'fire') { z.burnT = Math.max(z.burnT || 0, 3); z.burnD = Math.max(z.burnD || 0, strengthen ? 2 : 1); }
    if (e === 'ice') A.status(z, { slow: 1 }, 0);
    if (e === 'lightning') { fx(z, '#fff6a0', 10); extra(z, strengthen ? 2 : 1, c.sk.id, 'magic'); }
  }
  function burst(c, z) {
    const n = z.breakN || 0; if (!n) return;
    z.breakN = 0; z.breakT = 0; fx(z, '#ffd86a', 28); extra(z, 4 * n*(1+.2*oath('mark_sword')), c.sk.id, 'phys', true);
    if(has('sword|tome'))mark('judgment',z,c);
    if(has('sword|scythe')&&z.curseT>0)spread(z,c);
    if(R().weapon==='sword'&&R().eq?.main?.t===3)shot(c,n,null,'crescent');
    if (final(c) === 'sword|sword') for (let i = 0; i < n; i++) shot(c, 4, null, 'crescent', { a: i * Math.PI * 2 / n, pierce: 99 });
    if (final(c) === 'sword|staff' && G().lastElement) for (const q of [z, ...nearby(z, 2, 70)]) applyElement(c, q, G().lastElement);
  }
  function markBreak(c,z) { return mark('break',z,c); }
  function imbalance(c,z) { return mark('imbalance',z,c); }
  function prey(c,z) { const n=mark('prey',z,c); if(final(c)==='sword|bow')markBreak(c,z); return n; }
  function combo(c,z) { if(c.release.comboAdded)return; c.release.comboAdded=true;
    H().jobCombo=Math.min(has('gun|gun')?20:oath('mark_gun')?15:10,(H().jobCombo||0)+1);
    H().comboPulse=(H().comboPulse||0)+1;
    if(H().comboPulse>3){H().comboPulse=0;if(z)extra(z,6,c.sk.id,'magic',true);}
  }
  const displacement = c => !!(c.S.displacement || c.S.moveSkill || ['spear','drill','leap','charge','returnSpear','thunderDive'].includes(c.sk.id));
  function begin(book, sk, index, release, a) {
    const c = { book, sk, S: DATA.skills[sk.id], index, release, a, family: book.job?.origins[index], start: { x: H().x, y: H().y } };
    c.color=book.job?.final?'#ffd36a':({sword:'#83ed8a',spear:'#72d9ff',bow:'#e5edff',staff:'#ff8af2',gun:'#70f2ff',common:'#ffd46e'}[c.family]||null);
    if (c.S.w === 'staff') { const e = element(sk.id); if (e !== 'arcane') G().lastElement = e; }
    if (c.family === 'staff' && element(sk.id) === 'arcane') { c.arcaneElement = ['fire','ice','lightning'][(R().elementCycle || 0) % 3]; R().elementCycle = (R().elementCycle || 0) + 1; }
    c.arrowElement = c.S.w === 'bow' ? H().jobArrowElement : null;
    if (c.arrowElement) H().jobArrowElement = null;
    return c;
  }
  function hit(c, z, o) {
    if (!c || o.extra || o.noEffects) return; nativeHit(c,z,o); if (c.S.w === 'gun') combo(c,z); if (!c.book.job) return;
    if (c.release.targets.has(z) && !(c.family === 'common' && c.index % 2 === 1 && !c.release.wave)) return;
    c.release.targets.add(z); const first = !c.release.firstHit; c.release.firstHit = true; const f = final(c);
    if (c.family === 'sword' && first) { shot(c, 4, z); markBreak(c, z); }
    if (c.family === 'spear' && first) imbalance(c, z);
    if (c.family === 'bow' && first) prey(c, z);
    if (c.family === 'gun' && first) { combo(c,z); shot(c, 3, z, 'shadow'); }
    if (c.family === 'tome' && first) mark('judgment',z,c);
    if (c.family === 'scythe' && first) mark('curse',z,c);
        if (c.family === 'staff') {const e=c.arcaneElement||element(c.sk.id);if(e==='fire'){z.burnT=3;z.burnD=Math.max(z.burnD||0,2);}if(e==='ice')A.status(z,{slow:1},0);}
    if (c.family === 'common' && c.index % 2 === 1 && !c.release.wave) { c.release.wave = true; fx(H(), '#c8a066', 36); for (const q of live()) if (distance(H(), q) < 36) { extra(q, 4, c.sk.id); A.push(q, A.ang(H(), q), 8); } }
    if (f === 'common|common') { z.jobHits = (z.jobHits || 0) + 1; if (z.jobHits % 3 === 0) z.armorBreakT = 3; }
    if (f === 'sword|common' && c.family === 'common') markBreak(c, z);
    if (f === 'spear|common' && c.family === 'common' && (o.cc || o.slowP)) imbalance(c, z);
    if (f === 'bow|staff' && c.S.dt === 'magic' && z.preyT > 0) H().jobArrowElement = element(c.sk.id) === 'arcane' ? G().lastElement : element(c.sk.id);
    if (c.arrowElement) { fx(z, '#bfe8ff', 24); for (const q of live()) if (distance(z, q) < 24) extra(q, 8, c.sk.id, 'magic'); }
    if (f === 'staff|common' && c.family === 'common') applyElement(c, z, G().lastElement);
    if (f === 'gun|common' && c.family === 'common') combo(c);
  }
  function end(c) {
    if(!c)return;
    if(oath('ballistics')&&R().oath[0]?.id==='ballistics'&&!c.release.weakShot&&c.S.dmg>0){c.release.weakShot=true;shot(c,A.skillDamage(c.S,c.sk)*.35,nearby(H())[0],c.S.dt==='magic'?'shadow':'arrow',{o:{extra:true,dt:c.S.dt}});}
    if (!c.book.job) return;
    if (c.family === 'spear') shot(c, 4, null, 'beam', { a: A.moveAngle(), v: 240, life: 40 / 240, pierce: 99 });
    if (c.family === 'bow') shot(c, 4, live().filter(z => z.preyT > 0)[0] || nearby(H())[0], 'feather');
    const f = final(c);
    if (f === 'sword|gun' && ['sword','wave','phantom','flash'].includes(c.sk.id) && H().jobCombo >= 10) shot(c, c.S.dmg, nearby(H())[0]);
    if (f === 'bow|gun' && c.S.w === 'bow' && H().jobCombo >= 10) shot(c, 4, nearby(H())[0], 'feather');
    if (!displacement(c)) return;
    const h = H(), moved = distance(h, c.start); if (moved < 1) return;
    if(f==='spear|tome')for(const z of live())if(distance(z,h)<42)mark('judgment',z,c);
    if(f==='spear|scythe'||oath('mark_spear')){const dx=h.x-c.start.x,dy=(h.y-c.start.y)*YS,len=dx*dx+dy*dy||1;for(const z of live()){const t=Math.max(0,Math.min(1,((z.x-c.start.x)*dx+(z.y-c.start.y)*YS*dy)/len)),p={x:c.start.x+dx*t,y:c.start.y+dy*t/YS};if(distance(z,p)<18)mark(f==='spear|scythe'?'curse':'imbalance',z,c);}}
    if (f === 'spear|spear' || (R().weapon==='spear'&&R().eq?.main?.t===3)) { const q = nearby(h)[0]; if (q) { fx(q, '#fff6a0'); extra(q, 8, c.sk.id, 'magic'); } }
    if (f === 'spear|bow') { const q = live().filter(z => z.preyT > 0).sort((a,b) => distance(a,h)-distance(b,h))[0]; if (q) shot(c, 6, q, 'arrow', { pierce: 99 }); }
    if (f === 'spear|gun') for (let i = 0; i < 4; i++) shot(c, 3, null, 'shadow', { a: i * Math.PI / 2 });
    if (f === 'sword|spear' || f === 'spear|staff') {
      const dx=h.x-c.start.x, dy=(h.y-c.start.y)*YS, len=dx*dx+dy*dy||1;
      for (const z of live()) { const t=Math.max(0,Math.min(1,((z.x-c.start.x)*dx+(z.y-c.start.y)*YS*dy)/len)); const p={x:c.start.x+dx*t,y:c.start.y+dy*t/YS}; if(distance(z,p)<18&&f==='sword|spear'&&z.breakN)burst(c,z); }
      if (f === 'spear|staff' && G().lastElement) A.trace({ from:c.start, to:{x:h.x,y:h.y}, element:G().lastElement, sid:c.sk.id });
    }
  }
  function factor(c, z) { if (c && final(c) === 'common|common' && !c.release.targets.has(z) && ((z.jobHits || 0) + 1) % 3 === 0) z.armorBreakT = 3; let n = z.preyT > 0 && c?.S.w==='bow' ? .25+.15*oath('mark_bow') : 0; if(c && final(c)==='bow|common'&&z.preyT>0)n+=.10; if(c&&final(c)==='spear|common'&&(z.tier||z.T.boss))n+=.15; return (1+n)*(c&&final(c)==='spear|spear'&&z.imbalanceT>0?1.3:1)*(c?.S.w==='gun'?1+.02*(H().jobCombo||0):1); }
  function tick(z, dt) { for (const k of ['breakT','preyT','imbalanceT','judgmentT','deathMarkT','armorBreakT']) if(z[k]>0)z[k]-=dt; if(z.breakT<=0)z.breakN=0;if(z.preyT<=0)z.preyN=0;if(z.imbalanceT<=0)z.imbalanceN=0;if(z.judgmentT<=0)z.judgmentN=0; }
  function killed(z,secondary=false) { if(secondary)return;
    if(z.curseT>0){spread(z);if(equipped('scythe')||z.curseSummon&&Math.random()<.25)summon(z);}
    if(z.preyT>0&&has('bow|scythe'))summon(z);
    if(z.preyT>0&&R().weapon==='bow'&&R().eq?.main?.t===3){const q=nearby(z)[0];if(q)shot({a:0,sk:{id:'bow'}},4,q,'feather');}
 if(z.bounty){R().coins+=10;z.bounty=false;} if(z.preyT>0&&(has('bow|bow')||oath('mark_bow'))) {const q=nearby(z,1)[0];if(q){q.preyT=4;q.preyN=z.preyN||1;q.preyAt=G().t;}} }
  function spawned(z) { if(z.tier==='elite'&&has('bow|common')&&G().bountyStation!==G().st){G().bountyStation=G().st;z.bounty=true;fx(z,'#ffd86a',22);} }
  function damaged() { if(H().sigilGuard){H().sigilGuard=false;return;} const c=H().cs?.career;if(c&&final(c)==='spear|gun'&&displacement(c))return;H().jobCombo=Math.max(0,(H().jobCombo||0)-(has('gun|gun')||oath('mark_gun')?3:5)); }
  function range(c) { let n=0;if(c?.S.dt==='magic'&&H().jobRange){n+=H().jobRange;H().jobRange=0;}if(c&&final(c)==='gun|common'&&c.family==='common'&&H().jobCombo>=10)n+=.2;return n; }
  const markFields={break:['breakN','breakT'],prey:['preyN','preyT'],imbalance:['imbalanceN','imbalanceT'],judgment:['judgmentN','judgmentT'],curse:['curseN','curseT']};
  function context(sid='sword'){return {sk:{id:sid},S:DATA.skills[sid]||{},release:{targets:new Set()},book:{},a:0};}
  function summon(z){A.summon(z,{limit:has('scythe|scythe')?6:4,curse:has('scythe|scythe'),ranged:has('gun|scythe')});}
  function spread(z,c=context('d_curse')) {
    if(!(z.curseT>0))return;
    const n=oath('mark_scythe')?2:1;
    for(const q of nearby(z,n,80))if(G().t-(q.infectedAt??-99)>=3){q.infectedAt=G().t;q.curseT=4;q.curseN=Math.max(1,q.curseN||0);if(R().weapon==='scythe'&&R().eq?.main?.t===3)extra(q,5,c.sk.id,'magic');}
  }
  function judgment(z,c){
    const amount=6*(has('gun|tome')&&H().jobCombo>=10?1.5:1),radius=has('tome|tome')?38:0;
    fx(z,'#fff0b0',radius||18);
    extra(z,amount,c.sk.id,'magic',true);
    if(radius)for(const q of nearby(z,99,radius))extra(q,amount,c.sk.id,'magic',true);
    if(equipped('tome'))A.heal(H().maxHp*.005*(1+.5*oath('mark_tome')));
    if(has('tome|scythe')&&z.curseT>0)spread(z,c);
  }
  function mark(kind,z,c=context()) {
    if(z.dead)return false;
    if(kind==='frost')return A.status(z,{slow:1},0);
    if(kind==='prey'){const count=has('bow|bow')?2:1;const current=live().filter(q=>q!==z&&q.preyT>0).sort((a,b)=>(a.preyAt||0)-(b.preyAt||0));while(current.length>=count){const old=current.shift();old.preyT=0;old.preyN=0;}z.preyAt=G().t;}
    const fields=markFields[kind];if(!fields)return false;
    const [n,t]=fields,max=kind==='break'&&has('sword|sword')||kind==='judgment'&&has('tome|tome')?5:3;
    if((z[n]||0)>=max){z[n]=0;z[t]=0;if(kind==='judgment')judgment(z,c);else {fx(z);extra(z,6,c.sk.id,kind==='curse'?'magic':'phys',true);}}
    else {z[n]=(z[n]||0)+1;z[t]=kind==='imbalance'?Math.min(4.5,2.5+1.5*oath('mark_spear')):4;
      if(R().eq?.main?.t===2&&c.S?.w===R().weapon)z[t]+=.5;
    }
    return true;
  }
  function detonate(kind,z,c=context()) {
    if(kind==='break'){if(z.breakN)burst(c,z);return;}
    const fields=markFields[kind];if(!fields||!z[fields[0]]||!(z[fields[1]]>0))return;
    if(kind==='curse')spread(z,c);
    z[fields[0]]=0;z[fields[1]]=0;fx(z,kind==='judgment'?'#fff0b0':'#bfe8ff',30);
    if(kind==='judgment') {if(has('tome|scythe')&&z.curseT>0)spread(z,c);return;}
    if(kind==='prey'){extra(z,8,c.sk.id,'phys',true);if(has('bow|tome'))mark('judgment',z,c);}
  }
  function nativeHit(c,z,o) {
    const id=c.sk.id;
    if(['sword','whirl','wave'].includes(id))markBreak(c,z);
    if(['phantom','flash','huntingBlade'].includes(id)&&z.breakN)burst(c,z);
    if(id==='rising'||id==='charge')imbalance(c,z);
    if(['hundred','drill'].includes(id)&&z.imbalanceT>0)detonate('imbalance',z,c);
    if(id==='homing'||id==='falcon'||id==='bow'&&JOBS.level(c.sk)>=3)prey(c,z);
    if(id==='pierce'&&z.preyT>0)detonate('prey',z,c);
    if(['h_pages','h_sword','h_beam'].includes(id))mark('judgment',z,c);
    if(id==='d_return')mark('curse',z,c);
    if(c.S.w==='staff')reaction(c,z,element(id));
    if(['g_head','g_ko'].includes(id)&&(H().jobCombo||0)>=3){H().jobCombo-=3;extra(z,12,id,'magic',true);}
    if(c.S.w==='common'&&has('common|tome'))mark('judgment',z,c);
    if(c.S.w==='common'&&has('common|scythe'))mark('curse',z,c);
    c.nativeFirst ||= false;
    if(!c.nativeFirst){c.nativeFirst=true;for(const [key,kind] of [['mark_break','break'],['mark_imbalance','imbalance'],['mark_prey','prey'],['mark_frost','frost']])if(H().fx[key]&&Math.random()<.15)mark(kind,z,c);}
    if(H().fx.riftEye&&G().t-(z.overloadAt??-99)>=3){const count=[z.breakT>0,z.preyT>0,z.imbalanceT>0,z.judgmentT>0,z.curseT>0,z.slowL>0,z.cc?.k==='freeze',z.burnT>0,z.bleedT>0,z.poisonVisualT>0].filter(Boolean).length;if(count>=3){z.overloadAt=G().t;extra(z,15,id,'magic');fx(z,'#b58aff');}}
    if(R().weapon==='gun'&&R().eq?.main?.t===3&&H().jobCombo>=10&&!c.release.legendShot){c.release.legendShot=true;shot(c,3,z,'shadow');}
  }
  return { begin, hit, end, factor, tick, killed, spawned, damaged, range, displacement, mark, detonate, spread, summon, judgment };

};

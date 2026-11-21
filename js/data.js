// 像素勇者 · 数据表（武器、敌人、地图、升级）。
// 距离、速度都用「像素格」（sp）：勇者从头到脚约 40 格。世界坐标是地图像素，1 格 = K 个地图像素（见 battle.js）。
window.DATA = {
  // 起手兵器（备战页四选一，不锁定：之后技能书什么系都会出）。type：吃哪项属性的加成
  weapons: {
    sword: { name: '剑', skill: '横斩', icon: 'sword', type: 'str', desc: '身前大扇面横扫，近身最稳。', cd: .8, dmg: 6, range: 52, arc: 1.35 },
    spear: { name: '枪', skill: '突刺', icon: 'spear', type: 'str', desc: '朝前方长直线突刺，穿透一整排。', cd: .9, dmg: 7, range: 82, width: 14 },
    bow: { name: '弓', skill: '速射', icon: 'bow', type: 'agi', desc: '远程直线箭，射最近的敌人，能穿过一个。', cd: .55, dmg: 4, range: 170, pierce: 1 },
    staff: { name: '法杖', skill: '火球', icon: 'fire', type: 'int', desc: '砸向远处的敌群，落地炸开一圈。', cd: 1.5, dmg: 9, range: 150, boom: 30 },
  },
  // 属性：开局各 3 点，另有 5 点自由分配（备战页）
  attrs: [
    { id: 'str', name: '力量', desc: '剑、枪、斧招式伤害 +6% / 点' },
    { id: 'agi', name: '敏捷', desc: '弓招式伤害 +6% / 点，出手速度 +2% / 点' },
    { id: 'int', name: '智力', desc: '法杖招式伤害 +6% / 点，技能范围 +2%、魔防 +2 / 点' },
    { id: 'con', name: '体魄', desc: '生命 +10 / 点，物防 +4、魔防 +2 / 点' },
  ],
  attrBase: 3, attrFree: 5,
  // 开局宝物（备战页随机三选一，放进物品栏）。fx：生效的加成
  startItems: [
    { id: 'amulet', name: '护身符', icon: '🧿', desc: '生命上限 +20', fx: { hp: 20 }, price: 26 },
    { id: 'boots', name: '轻便靴', icon: '👢', desc: '移动速度 +10%', fx: { move: .1 }, price: 24 },
    { id: 'purse', name: '钱袋', icon: '💰', desc: '开局铜钱 +30', fx: { coin: 30 }, price: 24 },
    { id: 'whet', name: '磨刀石', icon: '🪨', desc: '所有伤害 +10%', fx: { dmg: .1 }, price: 26 },
    { id: 'magnet', name: '磁石', icon: '🧲', desc: '每波铜钱 +3', fx: { waveCoin: 3 }, price: 24 },
    { id: 'bento', name: '便当', icon: '🍱', desc: '每波开始回复 6% 生命', fx: { waveHeal: .06 }, price: 43 },
    { id: 'hourglass', name: '沙漏', icon: '⏳', desc: '出手速度 +8%', fx: { spd: .08 }, price: 46 },
    { id: 'clover', name: '四叶草', icon: '🍀', desc: '暴击率 +8%', fx: { crit: .08 }, price: 40 },
  ],
  // 现实习惯（备战页随机抽 3 个选 1，也可以不选）：一好一坏，现实里的小毛病带进了游戏
  habits: [
    { id: 'chips', name: '爱吃薯片', good: '体魄 +1', bad: '力量 −1', line: '手上全是油，剑握不稳。', fx: { con: 1, str: -1 } },
    { id: 'night', name: '熬夜冠军', good: '敏捷 +1', bad: '体魄 −1', line: '反应快，但身体被掏空。', fx: { agi: 1, con: -1 } },
    { id: 'troll', name: '键盘侠', good: '智力 +1', bad: '体魄 −1', line: '嘴上功夫一流。', fx: { int: 1, con: -1 } },
    { id: 'gym', name: '健身卡从没用过', good: '力量 +1', bad: '敏捷 −1', line: '办卡那天练过一次。', fx: { str: 1, agi: -1 } },
    { id: 'takeout', name: '外卖达人', good: '铜钱 +50%', bad: '移速 −10%', line: '钱省下来了，人也胖了。', fx: { coinMul: .5, move: -.1 } },
    { id: 'pad', name: '手柄党', good: '出手速度 +10%', bad: '暴击率 −5%', line: '按键快，准头一般。', fx: { spd: .1, crit: -.05 } },
    { id: 'mouse', name: '键鼠党', good: '暴击率 +10%', bad: '移速 −5%', line: '瞄得准，走位一般。', fx: { crit: .1, move: -.05 } },
    { id: 'bed', name: '赖床专业户', good: '每波开始回复 10% 生命', bad: '每站第 1 波伤害 −20%', line: '起得慢，但睡得香。', fx: { waveHeal: .1, firstWave: -.2 } },
    { id: 'stingy', name: '抠门', good: '行商便宜 20%', bad: '刷新贵一倍', line: '能砍价，不舍得刷。', fx: { shop: -.2, reroll: 1 } },
    { id: 'choosy', name: '选择困难症', good: '修炼多一个选项', bad: '修炼不能刷新', line: '选项越多越纠结。', fx: { xiuOpt: 1, xiuReroll: -99 } },
    { id: 'gamer', name: '网瘾少年', good: '经验 +20%', bad: '生命上限 −10%', line: '越玩越会玩。', fx: { xp: .2, hpMul: -.1 } },
    { id: 'otaku', name: '宅', good: '每波铜钱 +4', bad: '移速 −8%', line: '不想动，钱自己过来。', fx: { waveCoin: 4, move: -.08 } },
  ],
  slotsMax: 5, slotsOpen: 3, bagSize: 8,
  // 技能库（技能书）。按技能栏顺序轮流自动出手；同一招的书再拿一本 = 升一级（伤害 +25%，冷却 −4%，范围不涨）
  // 前四招就是四种起手兵器的起手招；kind 对应 battle.js 里的出手方式
  skills: {
    sword: { name: '横斩', sys: '剑', icon: 'sword', kind: 'sword', type: 'str', desc: '身前大扇面横扫，近身最稳。', cd: .8, dmg: 6, range: 52, arc: 1.35 },
    spear: { name: '突刺', sys: '枪', icon: 'spear', kind: 'spear', type: 'str', desc: '朝最近的敌人长直线突刺，穿透一整排。', cd: .9, dmg: 7, range: 82, width: 14 },
    bow: { name: '速射', sys: '弓', icon: 'bow', kind: 'bow', type: 'agi', desc: '远程直线箭，射最近的敌人，能穿过一个。', cd: .55, dmg: 4, range: 170, pierce: 1 },
    staff: { name: '火球', sys: '法杖', icon: 'fire', kind: 'staff', type: 'int', desc: '砸向敌人最密的地方，落地炸开一圈。', cd: 1.5, dmg: 9, range: 150, boom: 30 },
    axe: { name: '回旋斧', sys: '斧', icon: 'axe', kind: 'axe', type: 'str', desc: '甩出飞斧，飞到头再转回来，来回都伤人。', cd: 1.3, dmg: 6, range: 95, size: 10 },
    nova: { name: '冰环', sys: '法杖', icon: 'nova', kind: 'nova', type: 'int', desc: '以自己为中心炸开一圈寒气，被围时救命。', cd: 1.4, dmg: 8, range: 44 },
  },
  // 第一章：8 站 + 首领站，每站 3 波，限时（11/21 定稿，照 Codex 表，数量再 ×countMul，前两站时间更短）
  // G / K / A = 哥布林 / 刀手 / 弓手数量；ex = 额外的精英或小头目；hp = 这一站的血量倍率
  stations: [
    { hp: 1.00, waves: [{ G: 8 }, { G: 10, K: 2 }, { G: 12, K: 3, A: 2 }] },
    { hp: 1.06, waves: [{ G: 12, K: 4 }, { G: 14, K: 4, A: 3 }, { G: 15, K: 5, A: 3 }] },
    { hp: 1.15, waves: [{ G: 15, K: 5, A: 3 }, { G: 16, K: 6, A: 4 }, { G: 17, K: 6, A: 4, ex: [['elite', 'gob_blade']] }] },
    { hp: 1.25, waves: [{ G: 18, K: 6, A: 4 }, { G: 18, K: 7, A: 5 }, { G: 20, K: 8, A: 5, ex: [['mini', 'gob_blade']] }] },
    { hp: 1.40, waves: [{ G: 20, K: 8, A: 5 }, { G: 22, K: 9, A: 6 }, { G: 24, K: 9, A: 6, ex: [['elite', 'gob_archer']] }] },
    { hp: 1.55, waves: [{ G: 22, K: 9, A: 7 }, { G: 24, K: 10, A: 7 }, { G: 24, K: 10, A: 8, ex: [['mini', 'gob_blade']] }] },
    { hp: 1.75, waves: [{ G: 24, K: 11, A: 7 }, { G: 26, K: 12, A: 8 }, { G: 28, K: 12, A: 8, ex: [['elite', 'gob_blade'], ['elite', 'gob_blade']] }] },
    { hp: 1.95, waves: [{ G: 26, K: 12, A: 8 }, { G: 28, K: 13, A: 9 }, { G: 30, K: 14, A: 9, ex: [['mini', 'gob_blade']] }] },
    { hp: 2.10, boss: true, waves: [{ G: 26, K: 12, A: 8 }, { G: 28, K: 13, A: 9, ex: [['elite', 'gob_archer']] }, { boss: 'gob_king' }] },
  ],
  waveT: 30,                             // 每波固定 30 秒（11/21 用户定，先这样试）
  countMul: 2,                           // 出怪数量 = 表上 × 2（30 秒一波、不再清场，怪要多）
  // 精英 / 小头目：血、伤害、体型倍率（群侠四档）
  tiers: { elite: { hp: 2.5, dmg: 1.25, size: 1.15, name: '精英' }, mini: { hp: 7, dmg: 1.5, size: 1.35, reach: 1.2, wind: .1, name: '小头目' } },
  caps: { normal: 50, archer: 10 },      // 场上同时最多多少只
  // 经济（起始值，Codex）
  econ: { startCoin: 18, waveCoin: [10, 2], perKills: 3, elite: 5, mini: 8, clear: 0, waveHeal: 4,
    waveXp: 8, xpPerKills: 4, xpElite: 3, xpMini: 5, xpClear: 0, xpMul: 1.3, maxLv: 12 },
  // 行商：书价、开格价、刷新价（每站涨 7%）；出售拿基价的 35%
  price: { book: 22, slot4: 50, slot5: 78, slot4At: 2, slot5At: 5, stUp: .07, sell: .35, refresh: [4, 2, 3], refreshMax: 4, itemLimit: 2 },
  // 修炼（照三国终章）：每升一级攒一次，三选一，品阶 普通/精良/稀有/绝世，每次机会可刷新 2 次
  rarity: [{ name: '普通', col: '#e8e0d0', add: 1, p: .55 }, { name: '精良', col: '#6fb8ff', add: 2, p: .3 }, { name: '稀有', col: '#c58cff', add: 3, p: .12 }, { name: '绝世', col: '#ffb347', add: 3, extra: 2, p: .03 }],
  consumables: [{ id: 'meat', name: '烤肉', icon: '🍖', desc: '回复 40% 生命', heal: .4 }],
  // 敌人：用《异世界幸存者》的哥布林（art/goblin/），像素和勇者一样粗细
  enemies: {
    // reach = 走到多近开始抬手；arc / r = 劈砍扇面角度和半径；cool = 招后间隔；dtype = 伤害类型（物理 / 魔法）
    goblin: { name: '哥布林', hp: 6, spd: 45, reach: 24, arc: 60, r: 36, dmg: 6, wind: .43, cool: 1.35, dtype: 'phys' },
    gob_blade: { name: '哥布林刀手', hp: 9, spd: 55, reach: 31, arc: 110, r: 50, dmg: 8, wind: .52, cool: 1.65, dtype: 'phys' },
    gob_archer: { name: '哥布林弓手', hp: 5, spd: 38, reach: 168, keep: [115, 155], dmg: 5, wind: .7, cool: 1.9, arrow: 130, ranged: true, dtype: 'phys' },
    gob_king: { name: '哥布林王', hp: 600, spd: 30, reach: 30, dmg: 14, wind: .9, boss: true, dtype: 'phys' },
  },
  // 地图：第一版只开打谷场
  maps: [
    { id: 'field', name: '哥布林森林', img: 'art/map/forest3.webp', w: 2508, h: 1412,   // 11/21 哥布林森林扩图版：图 1672×941，世界按 1.5 倍算（forest / forest2 / 打谷场 field 都留着）
      open: true, foes: ['goblin', 'gob_blade', 'gob_archer'], boss: 'gob_king', time: 120,
      desc: '游戏里的第一站。密林深处的哥布林营地，哥布林从林子里一波波涌出来。',
      // 能走的地面（地图像素）：y0–y1 之间，每一行的左右边界见 pts [y, 左, 右]（11/21 改回原图；加大版 field_big 和 tools/extend_map.py 留着）
      ground: {"y0":412,"y1":1282,"pts":[[412,675,2078],[495,570,2160],[600,450,2212],[720,278,2280],[840,158,2362],[945,38,2475],[1230,30,2478],[1282,90,2430]]}, grade: [['saturate', .94]] },
  ],
  // 骑兵素材的沙盒板块（11/21 对比后定了勇者画风，先从地图选择里拿掉；代码 js/cav.js 和素材 art/cav/ 留着，以后当别的世界还能用）
  sandbox: [
    { id: 'cav', mode: 'cav', feel: 'horse', name: '骑兵战场 · 原版手感', img: 'art/cav/cover.jpg', open: true, time: 120,
      foesImg: ['spara', 'immortal', 'pcav8'], bossName: '敌将',
      desc: '骑白马的少年带 4 名亲卫冲锋。转向有惯性，越快越痛，满速能把步兵撞飞；骑枪固定，不用选好的武器。无尽草原。' },
    { id: 'cav2', mode: 'cav', feel: 'hero', name: '骑兵素材 · 勇者玩法', img: 'art/cav/cover.jpg', open: true, time: 120,
      foesImg: ['spara', 'immortal', 'pcav8'], bossName: '敌将',
      desc: '同样的白马少年，但操作和勇者一样：指哪走哪、空格翻滚，用你选好的武器自动出手。背景可切换无尽草原 / 打谷场。', bgSwitch: true },
    { id: 'cav3', mode: 'cav', feel: 'foot', name: '骑兵画风 · 步行勇者', img: 'art/cav/cover.jpg', open: true, time: 120,
      foesImg: ['spara', 'immortal', 'pcav8'], bossName: '敌将', heroImg: 'art/cav/herofoot/idleE.png',
      desc: '用骑兵画风重画的勇者，八个方向走路。玩法和勇者一样，用你选好的武器。背景可切换无尽草原 / 打谷场。', bgSwitch: true },
  ],
  // 升级三选一
  upgrades: [
    { id: 'dmg', name: '力量', desc: '伤害 +25%' },
    { id: 'spd', name: '敏捷', desc: '出手速度 +20%' },
    { id: 'area', name: '扩张', desc: '攻击范围 +20%' },
    { id: 'move', name: '疾行', desc: '移动速度 +12%' },
    { id: 'hp', name: '体魄', desc: '最大生命 +20，并回复 20' },
    { id: 'heal', name: '烤肉', desc: '回复 40% 生命', repeat: true },
    { id: 'multi', name: '连击', desc: { sword: '再反手补一刀', spear: '多刺一枪', bow: '多射一支箭', staff: '多砸一颗火球' }, max: 3 },
  ],
};

// 备战配置 → 勇者数值（备战页显示、战斗开局都用这一份，避免两边算得不一样）
// b = { weapon, attrs: {str, agi, int, con}（含底子 3 点）, item, habit }
window.DATA.calc = function (b) {
  const DATA = window.DATA;
  const fx = {}, add = o => { for (const k in (o || {})) fx[k] = (fx[k] || 0) + o[k]; };
  for (const id of (b.items || [b.item])) add((DATA.startItems.find(i => i.id === id) || {}).fx); add((DATA.habits.find(h => h.id === b.habit) || {}).fx);
  const A = {}; for (const a of DATA.attrs) A[a.id] = (b.attrs && b.attrs[a.id] || 0) + (b.train && b.train[a.id] || 0) + (fx[a.id] || 0);
  const W = DATA.weapons[b.weapon] || DATA.weapons.sword, type = W.type || 'str';
  const out = {
    A, fx,
    dmg: (1 + .06 * A[type]) * (1 + (fx.dmg || 0)),        // 起手兵器那一系的伤害倍率
    spd: 1 + .02 * A.agi + (fx.spd || 0),                    // 出手速度倍率（冷却 ÷ 它）
    area: Math.min(1.6, Math.max(.8, 1 + .02 * A.int + (fx.area || 0))),
    move: 1 + (fx.move || 0),
    crit: Math.max(0, .01 + (fx.crit || 0)), critMul: 1.5 + (fx.critMul || 0),   // 暴击率 1% 起，暴击伤害 150% 起
    // 防御：受到的伤害 × 100 / (100 + 防御)，最多减 50%。物防 = 体魄 × 4，魔防 = 体魄 × 2 + 智力 × 2，再加宝物
    pdef: Math.max(0, 4 * A.con + (fx.pdef || 0)), mdef: Math.max(0, 2 * A.con + 2 * A.int + (fx.mdef || 0)),
    hp: Math.round((100 + 10 * A.con + (fx.hp || 0)) * (1 + (fx.hpMul || 0))),
    xp: 1 + (fx.xp || 0), coin: fx.coin || 0, pick: 1 + (fx.pick || 0),
  };
  const r = c => Math.min(.5, c / (c + 100)); out.pIn = 1 - r(out.pdef); out.mIn = 1 - r(out.mdef);   // pIn / mIn：受到物理 / 魔法伤害的倍率
  return out;
};

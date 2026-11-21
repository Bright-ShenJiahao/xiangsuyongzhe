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
    { id: 'str', name: '力量', desc: '剑、枪招式伤害 +6% / 点' },
    { id: 'agi', name: '敏捷', desc: '弓招式伤害 +6% / 点，出手速度 +2% / 点' },
    { id: 'int', name: '智力', desc: '法杖招式伤害 +6% / 点，技能范围 +2% / 点' },
    { id: 'con', name: '体魄', desc: '生命 +10 / 点，受到伤害 −1% / 点' },
  ],
  attrBase: 3, attrFree: 5,
  // 开局宝物（备战页随机三选一，放进物品栏）。fx：生效的加成
  startItems: [
    { id: 'amulet', name: '护身符', icon: '🧿', desc: '生命上限 +20', fx: { hp: 20 } },
    { id: 'boots', name: '轻便靴', icon: '👢', desc: '移动速度 +10%', fx: { move: .1 } },
    { id: 'purse', name: '钱袋', icon: '💰', desc: '开局铜钱 +50', fx: { coin: 50 } },
    { id: 'whet', name: '磨刀石', icon: '🪨', desc: '所有伤害 +10%', fx: { dmg: .1 } },
    { id: 'magnet', name: '磁石', icon: '🧲', desc: '拾取范围 +50%', fx: { pick: .5 } },
    { id: 'bento', name: '便当', icon: '🍱', desc: '每波开始回复 10% 生命', fx: { waveHeal: .1 } },
    { id: 'hourglass', name: '沙漏', icon: '⏳', desc: '出手速度 +8%', fx: { spd: .08 } },
    { id: 'clover', name: '四叶草', icon: '🍀', desc: '暴击率 +8%', fx: { crit: .08 } },
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
    { id: 'otaku', name: '宅', good: '拾取范围 +50%', bad: '移速 −5%', line: '不想动，东西自己过来。', fx: { pick: .5, move: -.05 } },
  ],
  slotsMax: 5, slotsOpen: 3, bagSize: 8,
  // 敌人：用《异世界幸存者》的哥布林（art/goblin/），像素和勇者一样粗细
  enemies: {
    goblin: { name: '哥布林', hp: 6, spd: 21, reach: 16, dmg: 6, wind: .45, xp: 1 },
    gob_blade: { name: '哥布林刀手', hp: 9, spd: 27, reach: 18, dmg: 8, wind: .38, xp: 2 },
    gob_archer: { name: '哥布林弓手', hp: 5, spd: 18, reach: 95, dmg: 5, wind: .7, xp: 2, ranged: true },
    gob_king: { name: '哥布林王', hp: 360, spd: 16, reach: 30, dmg: 14, wind: .9, xp: 0, boss: true },
  },
  // 地图：第一版只开打谷场
  maps: [
    { id: 'field', name: '新手村 · 打谷场', img: 'art/map/field.webp', open: true, foes: ['goblin', 'gob_blade', 'gob_archer'], boss: 'gob_king', time: 120,
      desc: '游戏里的第一站。哥布林从栅栏外、石阶上一波波涌进来。',
      // 能走的地面（占整张图的比例）：上边 y0、下边 y1，左右两条斜边从 (上 x, 下 x) 收拢
      ground: { y0: .31, y1: .85, l0: .2, l1: .03, r0: .8, r1: .97 }, grade: [['saturate', .94]] },
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
  add((DATA.startItems.find(i => i.id === b.item) || {}).fx); add((DATA.habits.find(h => h.id === b.habit) || {}).fx);
  const A = {}; for (const a of DATA.attrs) A[a.id] = (b.attrs && b.attrs[a.id] || 0) + (fx[a.id] || 0);
  const W = DATA.weapons[b.weapon] || DATA.weapons.sword, type = W.type || 'str';
  return {
    A, fx,
    dmg: (1 + .06 * A[type]) * (1 + (fx.dmg || 0)),        // 起手兵器那一系的伤害倍率
    spd: 1 + .02 * A.agi + (fx.spd || 0),                    // 出手速度倍率（冷却 ÷ 它）
    area: 1 + .02 * A.int,
    move: 1 + (fx.move || 0),
    crit: Math.max(0, .1 + (fx.crit || 0)),
    dmgIn: Math.max(.5, 1 - .01 * A.con),
    hp: Math.round((100 + 10 * (A.con - DATA.attrBase) + (fx.hp || 0)) * (1 + (fx.hpMul || 0))),
    xp: 1 + (fx.xp || 0), coin: fx.coin || 0, pick: 1 + (fx.pick || 0),
  };
};

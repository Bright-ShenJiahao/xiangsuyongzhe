// 像素勇者 · 数据表（武器、敌人、地图、升级）。
// 距离、速度都用「像素格」（sp）：勇者从头到脚约 40 格。世界坐标是地图像素，1 格 = K 个地图像素（见 battle.js）。
window.DATA = {
  // 武器：三种出手形状完全不同（照幸存者类游戏：大、看得清、往外甩）
  weapons: {
    sword: { name: '勇者之剑', icon: 'sword', desc: '身前大范围横扫，近身最稳', stat: ['伤害 ★★★', '范围 ★★', '速度 ★★★'], cd: .8, dmg: 6, range: 52, arc: 1.35 },
    axe: { name: '回旋飞斧', icon: 'axe', desc: '甩出去再飞回来，一路穿透', stat: ['伤害 ★★', '范围 ★★★', '速度 ★★'], cd: 1.25, dmg: 5, range: 120, size: 13 },
    fire: { name: '火球术', icon: 'fire', desc: '砸向远处的敌群，落地炸开一圈', stat: ['伤害 ★★★★', '范围 ★★★', '速度 ★'], cd: 1.5, dmg: 9, range: 150, boom: 30 },
  },
  // 敌人：用《异世界幸存者》的哥布林（art/goblin/），像素和勇者一样粗细
  enemies: {
    goblin: { name: '哥布林', hp: 6, spd: 21, reach: 16, dmg: 6, wind: .45, xp: 1 },
    gob_blade: { name: '哥布林刀手', hp: 9, spd: 27, reach: 18, dmg: 8, wind: .38, xp: 2 },
    gob_archer: { name: '哥布林弓手', hp: 5, spd: 18, reach: 95, dmg: 5, wind: .7, xp: 2, ranged: true },
    gob_king: { name: '哥布林王', hp: 360, spd: 16, reach: 30, dmg: 14, wind: .9, xp: 0, boss: true },
  },
  // 地图：第一版只开打谷场
  maps: [
    { id: 'field', name: '勇者 · 打谷场', img: 'art/map/field.webp', open: true, foes: ['goblin', 'gob_blade', 'gob_archer'], boss: 'gob_king', time: 120,
      desc: '游戏里的第一站。哥布林从栅栏外、石阶上一波波涌进来。',
      // 能走的地面（占整张图的比例）：上边 y0、下边 y1，左右两条斜边从 (上 x, 下 x) 收拢
      ground: { y0: .31, y1: .85, l0: .2, l1: .03, r0: .8, r1: .97 }, grade: [['saturate', .94]] },
    // 下面两张是沙盒对比：素材和无尽地图来自《骑兵幸存者》（js/cav.js）
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
    { id: 'multi', name: '连击', desc: { sword: '再反手补一刀', axe: '多甩一把飞斧', fire: '多砸一颗火球' }, max: 3 },
  ],
};

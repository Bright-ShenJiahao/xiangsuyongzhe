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
    { id: 'field', name: '新手村 · 打谷场', img: 'art/map/field.webp', open: true, foes: ['goblin', 'gob_blade', 'gob_archer'], boss: 'gob_king', time: 120,
      desc: '游戏里的第一站。哥布林从栅栏外、石阶上一波波涌进来。',
      // 能走的地面（占整张图的比例）：上边 y0、下边 y1，左右两条斜边从 (上 x, 下 x) 收拢
      ground: { y0: .31, y1: .85, l0: .2, l1: .03, r0: .8, r1: .97 }, grade: [['saturate', .94]] },
    { id: 'forest', name: '迷雾森林', open: false, foes: [], desc: '还在施工中……' },
    { id: 'snow', name: '冰封雪原', open: false, foes: [], desc: '还在施工中……' },
    { id: 'castle', name: '哥布林王城', open: false, foes: [], desc: '还在施工中……' },
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

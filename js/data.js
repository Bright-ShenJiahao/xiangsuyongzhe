// 像素勇者 · 数据表（武器、敌人、地图、升级）。
// 距离、速度都用「像素格」（sp）：勇者从头到脚约 40 格。世界坐标是地图像素，1 格 = K 个地图像素（见 battle.js）。
window.DATA = {
  // 起手兵器（备战页四选一，不锁定：之后技能书什么系都会出）。type：吃哪项属性的加成
  weapons: {
    sword: { name: '剑', skill: '半月斩', icon: 'sword', type: 'str', desc: '身前大扇面横扫，近身最稳。', cd: .8, dmg: 6, range: 52, arc: 1.35 },
    spear: { name: '枪', skill: '疾风刺', icon: 'spear', type: 'str', desc: '朝前方长直线突刺，穿透一整排。', cd: .9, dmg: 7, range: 82, width: 14 },
    bow: { name: '弓', skill: '疾矢', icon: 'bow', type: 'agi', desc: '远程直线箭，射最近的敌人，能穿过一个。', cd: .55, dmg: 4, range: 170, pierce: 1 },
    staff: { name: '法杖', skill: '火球术', icon: 'fire', type: 'int', desc: '砸向远处的敌群，落地炸开一圈。', cd: 1.5, dmg: 9, range: 150, boom: 30 },
  },
  // 属性：开局各 3 点，另有 5 点自由分配（备战页）
  attrs: [
    { id: 'str', name: '力量', desc: '剑、枪、斧招式伤害 +6%、物防 +1 / 点' },
    { id: 'agi', name: '敏捷', desc: '弓招式伤害 +6% / 点，出手速度 +2% / 点' },
    { id: 'int', name: '智力', desc: '法杖招式伤害 +6%、技能范围 +2%、魔防 +1 / 点' },
    { id: 'con', name: '体魄', desc: '生命 +10 / 点' },
    { id: 'end', name: '耐力', desc: '物防 +4、魔防 +4 / 点' },   // 11/21 用户加：耐力管两种防御
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
  // 人物（11/22）：不锁兵器，只管长相 + 一个被动
  heroes: [
    { id: 'm', name: '男主', from: '中国', desc: '熬夜打游戏的年轻人', perk: '经验 +10%' },
    { id: 'f', name: '女主', from: '日本', desc: '剑道部的高中生', perk: '翻滚冷却 −20%' },
  ],
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
  // 技能书（11/21 第二批定稿，文档：剑 / 枪 / 弓 / 法杖的技能书）。
  // 出招：技能栏 1→2→3 严格轮流；每招 wu 前摇（能走，前摇中翻滚 = 这招作废）→ 出手 → rc 后摇（站定，翻滚可取消）。
  //   hold：占时型持续多久（这段时间不轮到下一招，能走，翻滚不取消）。没有各自冷却。
  // tier 品阶 1 初阶 2 中阶 3 高阶 4 宗师（第一章不出）；w = 勇者拿哪套武器的姿势；dt = 伤害类型 phys / magic；type = 吃哪项属性
  // l3 / l5 / l7 = 熟练度第 3 / 5 / 7 格的变化（说明用）
  skills: {
    // ---- 剑（力量，物理）----
    sword: { name: '半月斩', brief: '身前大扇面横扫', rg: 60, sys: '剑', w: 'sword', tier: 1, icon: 'sword', type: 'str', dt: 'phys', wu: .3, rc: .4, dmg: 6, desc: '身前 135° 大扇面一刀。', l3: '扇面扩大 +25%', l5: '反手再补一刀', l7: '斩完飞出一道月牙剑气' },
    whirl: { name: '旋风斩', brief: '原地转一圈', rg: 48, sys: '剑', w: 'sword', tier: 1, icon: 'sword', type: 'str', dt: 'phys', wu: .35, rc: .45, dmg: 4, desc: '原地转一圈，打身边一整圈。', l3: '打中的怪减速', l5: '连转两圈', l7: '转完留下小旋风' },
    guard: { name: '守护之刃', brief: '召唤飞剑绕身转', rg: 90, sys: '剑', w: 'sword', tier: 1, icon: 'sword', type: 'str', dt: 'phys', wu: .5, rc: .3, dmg: 4, frame: 'big', desc: '每次召唤 1 把大飞剑绕身转（最多 2 把），碰 8 次才碎。', l3: '最多 3 把', l5: '碰到的怪流血', l7: '碎掉时飞向敌人' },
    wave: { name: '破空斩', brief: '飞出月牙剑气', rg: 220, sys: '剑', w: 'sword', tier: 2, icon: 'sword', type: 'str', dt: 'phys', wu: .3, rc: .5, dmg: 7, desc: '朝最近的敌人射出月牙剑气，穿透 3 只。', l3: '扇形 3 道', l5: '穿透不限', l7: '飞到尽头再飞回来' },
    phantom: { name: '幻影斩', brief: '剑气直线 + 留残影', rg: 130, sys: '剑', w: 'sword', tier: 2, icon: 'sword', type: 'str', dt: 'phys', wu: .35, rc: .5, dmg: 9, desc: '瞬间斩出一条直线，尽头留下残影转身斩一圈。', l3: '残影停留 2 秒，跟着你出剑招', l5: '直线留伤痕，怪流血', l7: '两端各留一个残影' },
    flash: { name: '瞬光斩', brief: '蓄力拔剑大半圆', rg: 110, sys: '剑', w: 'sword', tier: 3, icon: 'sword', type: 'str', dt: 'phys', wu: .8, rc: .5, dmg: 20, crit: .3, charge: true, desc: '蓄力后向前砍出一个大半圆，暴击率 +30%。蓄力时翻滚就作废。', l3: '蓄力缩短到 0.5 秒', l5: '半圆扩大 +30%', l7: '出刀后飞出巨大月牙剑气' },
    storm: { name: '剑刃风暴', brief: '持续旋转的剑刃风暴', rg: 60, sys: '剑', w: 'sword', tier: 3, icon: 'sword', type: 'str', dt: 'phys', wu: .4, rc: .4, hold: 2, dmg: 3, desc: '旋转 2 秒一路割过去，能走，翻滚不取消。', l3: '旋转时移速 +30%', l5: '持续 3 秒', l7: '结束时爆开一圈剑气' },
    holysword: { name: '圣剑审判', brief: '天降剑雨砸怪群', rg: 220, sys: '剑', w: 'sword', tier: 4, icon: 'sword', type: 'str', dt: 'phys', wu: 1, rc: .8, dmg: 12, frame: 'big', desc: '天上落下十几把剑砸向怪最多的地方。', l3: '剑数 +50%', l5: '剑插地形成剑阵', l7: '最后落下一把巨剑' },
    // ---- 枪（力量，物理）----
    spear: { name: '疾风刺', brief: '直线突刺穿透一排', rg: 90, sys: '枪', w: 'spear', tier: 1, icon: 'spear', type: 'str', dt: 'phys', wu: .25, rc: .45, dmg: 7, desc: '朝最近的敌人长直线突刺，穿透一排。', l3: '长度 +25%', l5: '连刺两下', l7: '枪芒继续往前飞' },
    sweep: { name: '回旋枪扫', brief: '横扫击晕', rg: 56, sys: '枪', w: 'spear', tier: 1, icon: 'spear', type: 'str', dt: 'phys', wu: .35, rc: .4, dmg: 5, desc: '枪杆横扫身前 160°，把怪击晕 0.3 秒。', l3: '扇面扩大 +25%', l5: '眩晕加时到 0.6 秒', l7: '反手再扫回来' },
    javelin: { name: '穿云枪', brief: '投枪钉地减速', rg: 240, sys: '枪', w: 'spear', tier: 1, icon: 'spear', type: 'str', dt: 'phys', wu: .4, rc: .4, dmg: 10, frame: 'big', desc: '把枪投向最近的敌人，穿透 2 只后钉在地上，钉中的怪减速。', l3: '穿透 4 只', l5: '钉地处炸开一圈', l7: '一次投 2 支' },
    hundred: { name: '百裂刺', brief: '原地快刺 6 下', rg: 90, sys: '枪', w: 'spear', tier: 2, icon: 'spear', type: 'str', dt: 'phys', wu: .2, rc: .4, hold: 1, dmg: 3, desc: '原地朝前方快刺 6 下（占 1 秒，能慢慢走）。', l3: '刺 9 下', l5: '每下都穿透', l7: '最后一刺放出粗枪芒' },
    rising: { name: '升龙挑', brief: '上挑浮空一排', rg: 80, sys: '枪', w: 'spear', tier: 2, icon: 'spear', type: 'str', dt: 'phys', wu: .3, rc: .45, dmg: 6, frame: 'big', desc: '向前上挑，前方一条宽直线的怪全部浮空 0.6 秒，落地再伤。', l3: '直线变长变宽 +25%', l5: '浮空的怪受伤 +30%', l7: '落地砸出冲击' },
    drill: { name: '螺旋龙枪', brief: '慢速钻头穿透', rg: 200, sys: '枪', w: 'spear', tier: 3, icon: 'spear', type: 'str', dt: 'phys', wu: .6, rc: .5, dmg: 3, desc: '刺出一道旋转枪芒缓慢向前，持续搅伤路上的怪。', l3: '枪芒变粗 +30%', l5: '两边的怪被吸向中线', l7: '走到尽头爆炸' },
    leap: { name: '跃龙击', brief: '跃起砸地 + 地裂', rg: 60, sys: '枪', w: 'spear', tier: 3, icon: 'spear', type: 'str', dt: 'phys', wu: .7, rc: .5, dmg: 16, frame: 'big', desc: '跃起砸地：一圈冲击 + 四道地裂。', l3: '地裂 6 道', l5: '中心冲击把怪击飞', l7: '0.5 秒后再震一次' },
    dragon: { name: '苍龙之枪', brief: '苍龙盘旋撞怪', rg: 220, sys: '枪', w: 'spear', tier: 4, icon: 'spear', type: 'str', dt: 'phys', wu: 1, rc: .8, hold: 4, dmg: 6, frame: 'big', desc: '枪化苍龙在场上盘旋 4 秒撞击怪。', l3: '龙更大', l5: '每秒喷龙息', l7: '结束时俯冲重击' },
    // ---- 弓（敏捷，物理）----
    bow: { name: '疾矢', brief: '射最近的怪', rg: 230, sys: '弓', w: 'bow', tier: 1, icon: 'bow', type: 'agi', dt: 'phys', wu: .2, rc: .35, dmg: 4, desc: '射最近的敌人，能穿过 1 只。出手最快。', l3: '穿透 +1', l5: '一次射 2 支', l7: '命中后分裂 3 支小箭' },
    fan: { name: '扇羽箭', brief: '扇形射 5 箭', rg: 120, sys: '弓', w: 'bow', tier: 1, icon: 'bow', type: 'agi', dt: 'phys', wu: .3, rc: .4, dmg: 3, desc: '朝前方扇形射出 5 支短程箭，近身伤害高。', l3: '7 支', l5: '击退', l7: '0.3 秒后再补一轮' },
    homing: { name: '灵羽箭', brief: '追踪羽箭会弹射', rg: 260, sys: '弓', w: 'bow', tier: 1, icon: 'bow', type: 'agi', dt: 'phys', wu: .3, rc: .4, dmg: 4, desc: '射出 3 支会追踪的羽箭，命中后弹到下一只怪。', l3: '5 支', l5: '命中减速', l7: '弹 2 次' },
    rain: { name: '暴风箭雨', brief: '怪最密处落箭雨', rg: 240, sys: '弓', w: 'bow', tier: 2, icon: 'bow', type: 'agi', dt: 'phys', wu: .45, rc: .45, dmg: 3, frame: 'big', desc: '朝天一箭，0.6 秒后在怪最密处落下箭雨 1.5 秒。', l3: '范围 +25%', l5: '持续 2.5 秒且减速', l7: '同时落两片' },
    barrage: { name: '连珠箭', brief: '连射精英和首领', rg: 240, sys: '弓', w: 'bow', tier: 2, icon: 'bow', type: 'agi', dt: 'phys', wu: .2, rc: .35, hold: .8, dmg: 4, desc: '锁定一只（优先精英），0.8 秒连射 5 箭。', l3: '7 箭', l5: '每箭叠易伤', l7: '最后一箭贯穿全屏' },
    pierce: { name: '贯星箭', brief: '蓄力贯穿一条线', rg: 260, sys: '弓', w: 'bow', tier: 3, icon: 'bow', type: 'agi', dt: 'phys', wu: .7, rc: .5, dmg: 22, charge: true, desc: '蓄力后射出贯穿全屏的巨箭，推开沿途的怪。', l3: '蓄力缩短到 0.45 秒', l5: '箭变粗 +50%', l7: '沿途接连爆炸' },
    cyclone: { name: '旋风箭', brief: '慢速龙卷风', rg: 200, sys: '弓', w: 'bow', tier: 3, icon: 'bow', type: 'agi', dt: 'phys', wu: .5, rc: .5, dmg: 2, desc: '射出缓慢的旋风箭，把沿途的怪卷着往前带。', l3: '旋风变大', l5: '尽头炸开', l7: '同时两道' },
    starfall: { name: '星陨之弓', brief: '流星群砸怪', rg: 260, sys: '弓', w: 'bow', tier: 4, icon: 'bow', type: 'agi', dt: 'phys', wu: 1, rc: .8, hold: 3, dmg: 10, frame: 'big', desc: '光箭化作流星群，3 秒内砸向怪群。', l3: '流星 +50%', l5: '落点留火坑', l7: '最后落下巨大陨星' },
    // ---- 法杖（智力，法术）----
    staff: { name: '火球术', brief: '火球落地爆炸', rg: 220, sys: '法杖', w: 'staff', tier: 1, icon: 'fire', type: 'int', dt: 'magic', wu: .4, rc: .4, dmg: 9, desc: '砸向怪最密处爆炸，点燃。', l3: '爆炸范围 +25%', l5: '留下火海 2 秒', l7: '一次砸 2 颗' },
    nova: { name: '霜冻新星', brief: '身边炸开寒气', rg: 52, sys: '法杖', w: 'staff', tier: 1, icon: 'nova', type: 'int', dt: 'magic', wu: .3, rc: .45, dmg: 8, frame: 'big', desc: '以自己为中心炸开寒气，叠 1 层缓滞（叠满 4 层冻结）。', l3: '范围 +25%', l5: '一次叠 2 层', l7: '飞出 8 根冰刺' },
    chain: { name: '闪电链', brief: '闪电链弹射', rg: 200, sys: '法杖', w: 'staff', tier: 1, icon: 'fire', type: 'int', dt: 'magic', wu: .3, rc: .4, dmg: 6, desc: '劈中最近的怪再弹 3 只，打缓滞的怪伤害翻倍。', l3: '弹 5 只', l5: '弹跳不衰减', l7: '同时两道' },
    pillar: { name: '圣光柱', brief: '圣光柱砸目标', rg: 240, sys: '法杖', w: 'staff', tier: 2, icon: 'fire', type: 'int', dt: 'magic', wu: .4, rc: .4, dmg: 12, desc: '0.5 秒后在怪脚下降下光柱。', l3: '同时 2 道', l5: '光柱停留 1.5 秒', l7: '打中回复生命' },
    orbs: { name: '暗影黑雾', brief: '怪堆里放黑雾', rg: 220, sys: '法杖', w: 'staff', tier: 2, icon: 'nova', type: 'int', dt: 'magic', wu: .3, rc: .3, dmg: 4, desc: '在怪最密的地方放一团黑雾 5 秒（最多 2 团），雾里的怪每 0.5 秒受魔法伤害并减速。', l3: '黑雾变大 +25%', l5: '雾里的怪被诅咒', l7: '雾散时炸开' },
    thunder: { name: '雷霆万钧', brief: '连劈 4 道落雷', rg: 240, sys: '法杖', w: 'staff', tier: 3, icon: 'fire', type: 'int', dt: 'magic', wu: .6, rc: .5, dmg: 14, frame: 'big', desc: '依次劈下 4 道落雷，打缓滞的怪伤害翻倍。', l3: '6 道', l5: '留下雷区', l7: '最后一道巨大天雷' },
    blizzard: { name: '暴风雪', brief: '跟着走的暴风雪', rg: 80, sys: '法杖', w: 'staff', tier: 3, icon: 'nova', type: 'int', dt: 'magic', wu: .4, rc: .4, hold: 2.5, dmg: 4, frame: 'big', desc: '2.5 秒内周围不断落下冰锥叠缓滞，跟着你走。', l3: '范围 +25%', l5: '持续 3.5 秒', l7: '结束时冻住的怪碎裂' },
    abyss: { name: '深渊之门', brief: '深渊之门吸怪', rg: 240, sys: '法杖', w: 'staff', tier: 4, icon: 'nova', type: 'int', dt: 'magic', wu: 1, rc: .8, hold: 4, dmg: 6, frame: 'big', desc: '打开深渊之门 4 秒，吸怪并用触手抽打。', l3: '吸引范围 +30%', l5: '周围的怪被诅咒', l7: '关门大爆炸' },
  },
  prof: [8, 20, 36, 56, 80, 110, 150],   // 熟练度：每格要的累计出手次数（7 格）
  tierName: ['', '初阶', '中阶', '高阶', '宗师'], tierPrice: [0, 22, 34, 52, 80],
  // 第一章：8 站 + 首领站，每站 3 波，限时（11/21 定稿，照 Codex 表，数量再 ×countMul，前两站时间更短）
  // G / K / A = 哥布林 / 刀手 / 弓手数量；ex = 额外的精英或小头目；hp = 这一站的血量倍率
  // 11/22 用户定：第一章 9 站把哥布林全家用完（异世界幸存者的 20 种），每站加新怪；下一章换别的怪。
  // 字母 → 兵种：G 哥布林 K 刀手 A 弓手 S 小哥布林 W 野狼 D 盾兵 T 投石兵 B 炸弹兵 H 幽灵 R 狼骑兵 P 野猪骑兵 M 法师 O 岩石哥布林（数量再 ×countMul）
  // ex = 额外的精英 / 小头目；hp = 这一站的血量倍率
  codes: { G: 'goblin', K: 'gob_blade', A: 'gob_archer', S: 'gob_kid', W: 'wolf_free', D: 'gob_shield', T: 'gob_thrower', B: 'gob_bomb', H: 'gob_ghost', R: 'gob_wolf', P: 'gob_boar', M: 'gob_mage', O: 'gob_rock' },
  stations: [
    { hp: 1.00, name: '森林外围', waves: [{ G: 6, S: 3 }, { G: 8, S: 4 }, { G: 8, S: 4, K: 2, A: 1 }] },
    { hp: 1.06, name: '森林外围', waves: [{ G: 8, S: 3, K: 3 }, { G: 9, S: 3, K: 3, A: 2 }, { G: 10, S: 4, K: 4, A: 3, ex: [['elite', 'gob_blade']] }] },
    { hp: 1.15, name: '森林外围', waves: [{ G: 9, S: 3, K: 4, A: 2, W: 3 }, { G: 10, K: 4, A: 3, W: 4 }, { G: 10, K: 5, A: 3, W: 4, ex: [['mini', 'gob_chief']] }] },
    { hp: 1.25, name: '森林深处', waves: [{ G: 10, K: 4, A: 3, D: 3, T: 2 }, { G: 10, K: 5, A: 3, D: 4, T: 3 }, { G: 11, K: 5, D: 4, T: 3, W: 3, ex: [['elite', 'gob_shaman']] }] },
    { hp: 1.40, name: '森林深处', waves: [{ G: 10, K: 5, D: 3, T: 2, B: 2, H: 2 }, { G: 11, K: 5, D: 4, T: 3, B: 3, H: 3 }, { G: 12, K: 6, D: 4, T: 3, B: 3, H: 3, ex: [['elite', 'gob_drum']] }] },
    { hp: 1.55, name: '森林深处', waves: [{ G: 11, K: 5, D: 4, B: 3, H: 3, R: 2 }, { G: 12, K: 6, D: 4, T: 3, B: 3, R: 3 }, { G: 12, K: 6, D: 4, T: 3, H: 3, R: 3, ex: [['mini', 'gob_paladin']] }] },
    { hp: 1.75, name: '哥布林营地', waves: [{ G: 12, K: 6, D: 4, R: 3, P: 2, M: 2 }, { G: 12, K: 6, D: 4, T: 3, P: 3, M: 3 }, { G: 13, K: 6, D: 5, P: 3, M: 3, B: 3, ex: [['elite', 'gob_necro']] }] },
    { hp: 1.95, name: '哥布林营地', waves: [{ G: 12, K: 6, D: 5, P: 3, M: 3, O: 2 }, { G: 13, K: 6, D: 5, R: 3, M: 3, O: 3, ex: [['elite', 'gob_giant']] }, { G: 14, K: 7, D: 5, P: 3, M: 3, O: 3, ex: [['elite', 'gob_hero'], ['elite', 'gob_troll']] }] },
    { hp: 2.10, name: '哥布林王座', boss: true, waves: [{ G: 12, K: 6, A: 3, D: 4, T: 3, B: 3, H: 3 }, { G: 12, K: 6, R: 3, P: 3, M: 3, O: 3, ex: [['elite', 'gob_shaman'], ['elite', 'gob_drum']] }, { boss: 'gob_king' }] },
  ],
  // 11/22 站点卡（月圆之夜式）：每站打完 3 张。第 1 张战斗，第 2 张（第 2 站起）一半是精英，第 3 张是不打仗的卡（每章最多选 restMax 次，用完变战斗）
  restMax: 3,
  rests: [
    { k: 'chest', name: '宝箱', icon: 'chest', desc: '路边一个没上锁的宝箱。三本书选一本。', btn: '打开' },
    { k: 'fire', name: '篝火', icon: 'meat', desc: '膝盖中了一箭的老兵在烤火。回复 50% 生命，修炼一次。', btn: '休息' },
    { k: 'shop', name: '行商', icon: 'coin', desc: '咕噜老板摆了个摊：「今天全部八折！」', btn: '进店' },
    { k: 'event', name: '奇遇', icon: 'clover', desc: '前面好像有什么……', btn: '查看' },
  ],
  // 事件：二选一。fx 由 battle.js doEvent 执行，返回结果文字
  events: [
    { id: 'fairy', name: '仙女的泉水', desc: '泉水里飘出一个小仙女，说可以实现你一个愿望。', opts: [['许愿变强壮', '体魄 +2（生命 +20）', 'con2'], ['许愿变聪明', '随机得一本中阶书', 'book2']] },
    { id: 'vet', name: '膝盖中箭的老兵', desc: '老兵揉着膝盖：「想当年我也是个冒险者……」', opts: [['请教剑术', '技能栏里随机一本书熟练度 +1 格', 'prof'], ['讨他的旧盾', '耐力 +2', 'end2']] },
    { id: 'rift', name: '紫色的乱码裂缝', desc: '地上裂开一道闪着紫光的缝，里面好像有东西在发光。', opts: [['伸手去摸', '50% 得一本高阶书，50% 被咬掉 20% 生命', 'rift'], ['绕开走', '什么都不发生', 'none']] },
    { id: 'gamble', name: '咕噜的赌局', desc: '咕噜拿出三个杯子：「押 20 铜钱，猜中有奖！」', opts: [['押 20 铜钱', '50% 得一件随机宝物', 'gamble'], ['不赌', '咕噜嘀咕了一句', 'none']] },
    { id: 'kid', name: '被困的哥布林小孩', desc: '一个小哥布林被藤蔓缠住，正在哭。', opts: [['救他', '下一站铜钱 +50%（他爸爸来谢你）', 'kid'], ['不管', '什么都不发生', 'none']] },
    { id: 'save', name: '存档水晶', desc: '一块会发光的水晶。屏幕角落跳出「是否存档？」', opts: [['存档', '本局第一次倒下时满血复活', 'save'], ['不存', '回满生命', 'full']] },
    { id: 'manual', name: '说明书残页', desc: '地上有一张发黄的纸，是那盘 999 合 1 的说明书。', opts: [['仔细读', '随机一项属性 +2', 'attr2'], ['卖给咕噜', '铜钱 +25', 'coin25']] },
    { id: 'lumina', name: '露米娜的声音', desc: '耳边传来露米娜的声音：「勇者，你还好吗？」', opts: [['请她治疗', '回复 60% 生命', 'heal60'], ['请她指点', '多一次修炼', 'xiu']] },
  ],
  waveT: 30,                             // 每波固定 30 秒（11/21 用户定，先这样试）
  countMul: 2,                           // 出怪数量 = 表上 × 2（30 秒一波、不再清场，怪要多）
  // 精英 / 小头目：血、伤害、体型倍率（群侠四档）
  tiers: { elite: { hp: 2.5, dmg: 1.25, size: 1.15, name: '精英' }, mini: { hp: 7, dmg: 1.5, size: 1.35, reach: 1.2, wind: .1, name: '小头目' } },
  caps: { normal: 50, archer: 12 },      // archer = 远程怪合计      // 场上同时最多多少只
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
    // 怪物属性（11/21）：hp 生命、dmg 攻击、dtype 攻击类型（phys 物理 / magic 法术）、pdef 物防、mdef 魔防（和勇者同一公式：受伤 × 100/(100+防御)，最多减 60%）。
    // 精英 / 小头目 / 首领另有控制抗性（硬控时间减半 / 免疫）。
    // reach = 走到多近开始抬手；arc / r = 劈砍扇面角度和半径；cool = 招后间隔；dtype = 伤害类型（物理 / 魔法）
    goblin: { name: '哥布林', pdef: 5, mdef: 0, hp: 6, spd: 45, reach: 24, arc: 60, r: 36, dmg: 6, wind: .43, cool: 1.35, dtype: 'phys' },
    gob_blade: { name: '哥布林刀手', pdef: 15, mdef: 5, hp: 9, spd: 55, reach: 31, arc: 110, r: 50, dmg: 8, wind: .52, cool: 1.65, dtype: 'phys' },
    gob_archer: { name: '哥布林弓手', pdef: 0, mdef: 10, hp: 5, spd: 38, reach: 168, keep: [115, 155], dmg: 5, wind: .7, cool: 1.9, arrow: 130, ranged: true, dtype: 'phys' },
    // 11/22 哥布林全家（异世界幸存者的图）。nw = 走路帧数；k = 体型系数（别比王大）；res = 体质：iron 铁甲（物理减半）/ spirit 灵体（物理减半、法术 +25%）/ magic 魔抗（法术减半）
    // 特殊行为：shield 正面挡几下（之后换成没盾的帧）/ bomb 自爆半径 / charge 冲锋距离 / ghost 穿过别的怪 / aura heal 回血 · drum 加速 / summon 召唤 / ai boss 用首领的招式
    gob_kid: { name: '小哥布林', pdef: 0, mdef: 0, hp: 3, spd: 62, reach: 20, arc: 60, r: 30, dmg: 4, wind: .35, cool: 1.1, dtype: 'phys', nw: 4 },
    wolf_free: { name: '野狼', pdef: 0, mdef: 0, hp: 6, spd: 72, reach: 24, arc: 70, r: 34, dmg: 5, wind: .3, cool: 1.2, dtype: 'phys', nw: 4 },
    gob_shield: { name: '哥布林盾兵', pdef: 10, mdef: 5, hp: 12, spd: 36, reach: 26, arc: 80, r: 40, dmg: 8, wind: .6, cool: 1.8, dtype: 'phys', shield: 8 },
    gob_thrower: { name: '哥布林投石兵', pdef: 0, mdef: 5, hp: 6, spd: 36, reach: 175, keep: [120, 165], dmg: 6, wind: .8, cool: 2.2, arrow: 110, ranged: true, shot: 'rock', dtype: 'phys', nw: 4 },
    gob_bomb: { name: '哥布林炸弹兵', pdef: 0, mdef: 0, hp: 5, spd: 58, reach: 30, dmg: 16, wind: .9, cool: 1, bomb: 44, dtype: 'phys', nw: 4 },
    gob_ghost: { name: '哥布林幽灵', pdef: 0, mdef: 0, hp: 8, spd: 46, reach: 22, arc: 70, r: 34, dmg: 6, wind: .45, cool: 1.4, res: 'spirit', ghost: true, dtype: 'magic', nw: 4 },
    gob_wolf: { name: '哥布林狼骑兵', pdef: 10, mdef: 0, hp: 14, spd: 58, reach: 28, arc: 80, r: 40, dmg: 8, wind: .5, cool: 1.8, charge: 130, dtype: 'phys', nw: 4, k: .85 },
    gob_boar: { name: '哥布林野猪骑兵', pdef: 15, mdef: 0, hp: 18, spd: 40, reach: 28, arc: 80, r: 42, dmg: 10, wind: .55, cool: 2, charge: 170, dtype: 'phys', nw: 4, k: .9 },
    gob_mage: { name: '哥布林法师', pdef: 0, mdef: 30, hp: 7, spd: 34, reach: 170, keep: [110, 160], dmg: 7, wind: .8, cool: 2.2, arrow: 120, ranged: true, shot: 'bolt', res: 'magic', dtype: 'magic', nw: 4 },
    gob_rock: { name: '岩石哥布林', pdef: 20, mdef: 0, hp: 30, spd: 26, reach: 30, arc: 100, r: 46, dmg: 12, wind: .8, cool: 2, res: 'iron', dtype: 'phys', nw: 4, k: .8 },
    gob_shaman: { name: '哥布林萨满', pdef: 0, mdef: 20, hp: 10, spd: 34, reach: 160, keep: [100, 150], dmg: 6, wind: .8, cool: 2.4, arrow: 120, ranged: true, shot: 'bolt', aura: 'heal', dtype: 'magic', k: .85 },
    gob_drum: { name: '哥布林战鼓手', pdef: 10, mdef: 10, hp: 14, spd: 32, reach: 24, arc: 70, r: 36, dmg: 6, wind: .6, cool: 2, aura: 'drum', dtype: 'phys', nw: 4, k: .65 },
    gob_necro: { name: '哥布林死灵法师', pdef: 0, mdef: 25, hp: 12, spd: 30, reach: 160, keep: [110, 155], dmg: 6, wind: .9, cool: 2.6, arrow: 110, ranged: true, shot: 'bolt', summon: 'skeleton', dtype: 'magic', nw: 4, k: .75 },
    skeleton: { name: '骷髅', pdef: 0, mdef: 0, hp: 4, spd: 48, reach: 22, arc: 70, r: 34, dmg: 5, wind: .4, cool: 1.3, dtype: 'phys', nw: 4, k: .7 },
    gob_giant: { name: '哥布林巨人', pdef: 20, mdef: 5, hp: 30, spd: 26, reach: 38, arc: 140, r: 58, dmg: 14, wind: .9, cool: 2.2, dtype: 'phys', nw: 4, k: .8 },
    gob_hero: { name: '哥布林勇士', pdef: 25, mdef: 10, hp: 24, spd: 40, reach: 34, arc: 110, r: 50, dmg: 12, wind: .6, cool: 1.8, dtype: 'phys', k: .8 },
    gob_troll: { name: '哥布林巨魔', pdef: 15, mdef: 5, hp: 40, spd: 22, reach: 42, arc: 150, r: 64, dmg: 16, wind: 1, cool: 2.4, dtype: 'phys', k: .6 },
    gob_chief: { name: '哥布林酋长', pdef: 20, mdef: 10, hp: 40, spd: 32, reach: 34, dmg: 10, wind: .8, ai: 'boss', dtype: 'phys', nw: 4, k: .68 },
    gob_paladin: { name: '哥布林圣骑士', pdef: 25, mdef: 20, hp: 44, spd: 36, reach: 34, dmg: 11, wind: .8, ai: 'boss', dtype: 'phys', nw: 4, k: .66 },
    gob_king: { name: '哥布林王', pdef: 30, mdef: 20, hp: 600, spd: 30, reach: 30, dmg: 14, wind: .9, boss: true, dtype: 'phys' },
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
// b = { weapon, attrs: {str, agi, int, con, end}（含底子 3 点）, item, habit }
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
    // 防御：受到的伤害 × 100 / (100 + 防御)，最多减 50%。物防 = 耐力 × 4 + 力量 × 1，魔防 = 耐力 × 4 + 智力 × 1，再加宝物
    pdef: Math.max(0, 4 * A.end + A.str + (fx.pdef || 0)), mdef: Math.max(0, 4 * A.end + A.int + (fx.mdef || 0)),
    hp: Math.round((100 + 10 * A.con + (fx.hp || 0)) * (1 + (fx.hpMul || 0))),
    xp: 1 + (fx.xp || 0), coin: fx.coin || 0, pick: 1 + (fx.pick || 0),
  };
  const r = c => Math.min(.5, c / (c + 100)); out.pIn = 1 - r(out.pdef); out.mIn = 1 - r(out.mdef);   // pIn / mIn：受到物理 / 魔法伤害的倍率
  return out;
};
// 能掉 / 能买的书：还没拿到的；第一章初阶、中阶一直有，高阶第 4 站起（精英、小头目随时可能掉），宗师第一章不出
window.DATA.bookPool = function (own, st, rich) {
  const S = window.DATA.skills, ids = Object.keys(S).filter(id => !own.has(id) && S[id].tier < 4 && (S[id].tier < 3 || st >= 4 || rich));
  const w = id => [0, 3, 2, 1][S[id].tier]; return ids.flatMap(id => Array(w(id)).fill(id));   // 初阶 3 : 中阶 2 : 高阶 1
};

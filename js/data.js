// 像素勇者 · 数据表（武器、敌人、地图、升级）。
// 距离、速度都用「像素格」（sp）：勇者从头到脚约 40 格。世界坐标是地图像素，1 格 = K 个地图像素（见 battle.js）。
window.DATA = {
  // 起手兵器（备战页四选一，不锁定：之后技能书什么系都会出）。type：吃哪项属性的加成
  weapons: {
    sword: { name: '剑', skill: '半月斩', icon: 'sword', type: 'str', desc: '身前大扇面横扫，近身最稳。', cd: .8, dmg: 6, range: 52, arc: 1.35 },
    spear: { name: '枪', skill: '疾风刺', icon: 'spear', type: 'str', desc: '朝前方长直线突刺，穿透一整排。', cd: .9, dmg: 7, range: 82, width: 14 },
    bow: { name: '弓', skill: '疾矢', icon: 'bow', type: 'agi', desc: '远程直线箭，射最近的敌人，能穿过一个。', cd: .55, dmg: 4, range: 153, pierce: 1 },
    staff: { name: '法杖', skill: '火球术', icon: 'fire', type: 'int', desc: '砸向远处的敌群，落地炸开一圈。', cd: 1.5, dmg: 9, range: 135, boom: 30 },
  },
  // 11/25 装备：本局有效，通关自动卖给士兵 / 大法师换水晶；三阶（t=1/2/3）。st=[各阶数值]，fx 进 calc，dmgP/dmgM 为物理 / 法术招式伤害
  gearSlots: { helm: '头盔', armor: '铠甲', belt: '腰带', boots: '鞋子', acc: '配饰' },
  gear: {
    helmP: { slot: 'helm', tag: '头盔', g: '盔', names: ['皮盔', '铁盔', '精钢盔'], st: [{ pdef: 1, dmgP: .03 }, { pdef: 2, dmgP: .05 }, { pdef: 3, dmgP: .07 }] },
    helmM: { slot: 'helm', tag: '头盔', g: '帽', names: ['布帽', '法帽', '贤者帽'], st: [{ mdef: 1, dmgM: .03 }, { mdef: 2, dmgM: .05 }, { mdef: 3, dmgM: .07 }] },
    plate: { slot: 'armor', tag: '铠甲', g: '甲', img: 'art/ui2/heavy_armor.png', names: ['皮甲', '锁甲', '板甲'], st: [{ pdef: 2, hp: 10 }, { pdef: 4, hp: 20 }, { pdef: 6, hp: 32 }] },
    robe: { slot: 'armor', tag: '铠甲', g: '袍', names: ['布袍', '法袍', '星辉袍'], st: [{ mdef: 2, hp: 10 }, { mdef: 4, hp: 20 }, { mdef: 6, hp: 32 }] },
    shieldP: { slot: 'off', tag: '副手', g: '盾', sword: 1, names: ['木盾', '铁盾', '塔盾'], st: [{ pdef: 3 }, { pdef: 5 }, { pdef: 8 }] },
    shieldM: { slot: 'off', tag: '副手', g: '符', sword: 1, names: ['符文盾', '奥术盾', '星辉盾'], st: [{ mdef: 3 }, { mdef: 5 }, { mdef: 8 }] },
    belt: { slot: 'belt', tag: '腰带', g: '带', names: ['皮带', '铁扣带', '金腰带'], st: [{ hp: 12 }, { hp: 24 }, { hp: 40 }] },
    boots: { slot: 'boots', tag: '鞋子', g: '靴', img: 'art/ui2/boots.png', names: ['皮靴', '疾行靴', '疾风靴'], st: [{ agi: 1 }, { agi: 2 }, { agi: 3 }] },
    ring: { slot: 'acc', tag: '配饰', g: '戒', names: ['铜戒', '银戒', '智者之戒'], st: [{ int: 1 }, { int: 2 }, { int: 3 }] },
  },
  // 武器三阶：加成该武器系所有招式伤害
  weaponNames: { sword: ['铁剑', '精钢剑', '传说之剑'], spear: ['铁枪', '精钢枪', '传说之枪'], bow: ['木弓', '复合弓', '传说之弓'], staff: ['木杖', '秘银杖', '传说之杖'] },
  weaponDmg: [0, .15, .30],
  // 附魔词条：[名字, [低, 中, 高阶石的数值], 钥匙]（百分比）
  affixes: [['暴击率', [2, 4, 7], 'crit'], ['暴击伤害', [8, 16, 28], 'critMul'], ['出手速度', [3, 6, 10], 'spd'], ['范围', [3, 6, 10], 'area'], ['对精英伤害', [4, 8, 14], 'elite']],
  stoneNames: ['', '低阶', '中阶', '高阶'],
  // 回塔顶自动结算的价格（水晶）
  sellWeapon: [1, 3, 8], sellGear: [1, 2, 4], sellStone: [0, 1, 2, 5], sellBook: [0, 1, 2, 4, 6],
  statLabel: { pdef: '物防', mdef: '魔防', hp: '生命', agi: '敏捷', int: '智力', dmgP: '物理招式伤害', dmgM: '法术招式伤害' },
  // 属性：开局各 3 点，另有 5 点自由分配（备战页）
  attrs: [
    { id: 'str', name: '力量', desc: '剑、枪招式伤害 +6%、物防 +1、物理暴击伤害 +2% / 点' },
    { id: 'agi', name: '敏捷', desc: '弓招式伤害 +6% / 点，出手速度 +2%、物理暴击率 +1%、闪避 +0.5% / 点' },
    { id: 'int', name: '智力', desc: '法杖招式伤害 +6%、技能范围 +2%、魔防 +1、魔法暴击率 +1%、魔法暴击伤害 +2% / 点' },
    { id: 'con', name: '体魄', desc: '生命 +10 / 点' },
    { id: 'end', name: '耐力', desc: '物防 +4、魔防 +4 / 点' },   // 11/21 用户加：耐力管两种防御
  ],
  attrBase: 3, attrFree: 5,
  itemTier: it => { const p = (it && it.price) || 0; return p <= 26 ? 1 : p <= 36 ? 2 : p <= 44 ? 3 : 4; },   /* 11/25 宝物分级：按价格 24-26 初阶 / 30-36 进阶 / 38-44 高阶 / 46 顶阶 */
  // 11/23 誓约印记：普通 8 + 身法 6。v = Lv1 数值，等级倍率 oathLv；同名合并升级，最高 Lv5
  oathLv: [1, 1.4, 1.7, 1.9, 2.0],
  oaths: {
    xianfeng: { name: '先锋之誓', ch: '旗', v: .20, d: m => `每站开打头 10 秒，技能伤害 +${Math.round(20 * m)}%` },
    sanji: { name: '三击之誓', ch: '三', v: .40, d: m => `每放到第 3 招，这一招伤害 +${Math.round(40 * m)}%` },
    jingshou: { name: '静守之誓', ch: '盾', v: .25, d: m => `站着不动 1 秒后，下一招伤害 +${Math.round(25 * m)}%` },
    fanji: { name: '反击之誓', ch: '反', v: .20, d: m => `翻滚后的下一招：范围 +${Math.round(20 * m)}%，暴击率 +${Math.round(30 * m)}%` },
    tulong: { name: '屠龙之誓', ch: '龙', v: .12, d: m => `对精英和首领伤害 +${Math.round(12 * m)}%；打倒精英回复 ${Math.round(5 * m)}% 生命` },
    jifeng: { name: '疾风之誓', ch: '风', v: .08, d: m => `出手快 ${Math.round(8 * m)}%` },
    lianzhan: { name: '连斩之誓', ch: '连', v: .12, d: m => `连击到 30 后，6 秒内伤害 +${Math.round(12 * m)}%` },
    pozhu: { name: '破竹之誓', ch: '竹', v: .04, d: m => `击倒敌人时 ${Math.round(4 * m)}% 几率：下一招不用前摇` },
    youlong: { name: '游龙步', ch: '龙', mv: 1, d: m => `翻滚距离 +${Math.round(15 * m)}%；满格翻滚时把附近的铜钱吸过来` },
    canying: { name: '残影步', ch: '影', mv: 1, d: m => `满格翻滚后 1 秒内：闪避 +${Math.round(15 * m)}%，下一次受击伤害 −${Math.round(20 * m)}%` },
    qingyu: { name: '轻羽步', ch: '羽', mv: 1, d: m => `翻滚每格回得快 ${Math.round(8 * m)}%；连续跑 2 秒后移速 +${Math.round(6 * m)}%` },
    erduan: { name: '二段滚', ch: '二', mv: 1, d: m => `翻滚 +1 次；三格全满时翻滚，带一层护盾挡下一次伤害` },
    zhendi: { name: '震地步', ch: '震', mv: 1, d: m => `满格翻滚：路上的怪被推开，落地让身边的怪僵直 ${(.2 * m).toFixed(2)} 秒（同一只 2 秒一次）` },
    jinghua: { name: '净化步', ch: '净', mv: 1, d: m => `满格翻滚：清掉方向颠倒、减速、持续掉血，并回复 ${Math.round(1 * m)}% 生命` },
    anying: { name: '暗影步', ch: '暗', mv: 1, d: m => `怪出招前一刻翻滚：化成黑影 ${(.8 * m).toFixed(1)} 秒（无敌、穿怪、移速 +30%），慢动作 0.3 秒，原地留假身吸引怪 1.5 秒` },
  },
  // 开局宝物（备战页随机三选一，放进物品栏）。fx：生效的加成
  startItems: [
    { id: 'amulet', name: '护身符', icon: '🧿', desc: '生命上限 +20', fx: { hp: 20 }, price: 26 },
    { id: 'boots', name: '轻便靴', icon: '👢', desc: '移动速度 +10%', fx: { move: .1 }, price: 24 },
    { id: 'purse', name: '钱袋', icon: '💰', desc: '开局铜钱 +30', fx: { coin: 30 }, price: 24 },
    { id: 'whet', name: '磨刀石', icon: '🪨', desc: '所有伤害 +10%', fx: { dmg: .1 }, price: 26 },
    { id: 'magnet', name: '磁石', icon: '🧲', desc: '吸铜钱的范围变大，每站铜钱 +3', fx: { waveCoin: 3 }, price: 24 },
    { id: 'bento', name: '便当', icon: '🍱', desc: '每波开始回复 6% 生命', fx: { waveHeal: .06 }, price: 43 },
    { id: 'hourglass', name: '沙漏', icon: '⏳', desc: '出手速度 +8%', fx: { spd: .08 }, price: 46 },
    { id: 'clover', name: '四叶草', icon: '🍀', desc: '物理、魔法暴击率 +8%', fx: { crit: .08 }, price: 40 },
    { id: 'cloak', name: '斗篷', icon: '🧥', fx: { eva: .04 }, d: m => `闪避 +${Math.round(4 * m)}%（物理、魔法攻击都能躲）`, price: 34 },
    { id: 'blade_oil', name: '锋刃油', icon: '🗡️', fx: { critMulP: .2 }, d: m => `物理暴击伤害 +${Math.round(20 * m)}%`, price: 36 },
    { id: 'mana_lens', name: '法力透镜', icon: '🔮', fx: { critM: .05 }, d: m => `魔法暴击率 +${Math.round(5 * m)}%`, price: 36 },
    // 11/23 新宝物（同名合并升级，倍率同誓约印记；fx 随等级涨，cost 固定）
    { id: 'curse_crown', name: '诅咒王冠', fx: { dmg: .15 }, cost: { take: .15 }, d: m => `所有伤害 +${Math.round(15 * m)}%<br><span class="bad">受到伤害 +15%</span>`, price: 42 },
    { id: 'berserk', name: '狂战士项链', fx: { low: .20 }, cost: { healMul: -.3 }, d: m => `生命低于 30% 时，伤害 +${Math.round(20 * m)}%<br><span class="bad">受到治疗 −30%</span>`, price: 38 },
    { id: 'glass_sword', name: '玻璃剑', fx: { dmg: .20 }, cost: { hpMul: -.2 }, d: m => `所有伤害 +${Math.round(20 * m)}%<br><span class="bad">生命上限 −20%</span>`, price: 44 },
    { id: 'heavy_armor', name: '沉重铠甲', fx: { take: -.10 }, cost: { move: -.1 }, cap: { take: -.2 }, d: m => `受到伤害 −${Math.min(20, Math.round(10 * m))}%<br><span class="bad">移速 −10%</span>`, price: 40 },
    { id: 'greed_bag', name: '贪婪钱袋', fx: { coinMul: .15 }, cost: { take: .15 }, d: m => `铜钱获得 +${Math.round(15 * m)}%<br><span class="bad">受到伤害 +15%</span>`, price: 36 },
    { id: 'guild', name: '商会徽章', fx: { shop: -.08 }, cost: { freeRoll: 1 }, d: m => `商店价格 −${Math.round(8 * m)}%；翻一翻货架第一次免费`, price: 34 },
    { id: 'piggy', name: '存钱罐', fx: { interest: .05, icap: 6 }, d: m => `每站结束按身上铜钱给 ${Math.round(5 * m)}% 利息（最多 ${Math.round(6 * m)}）`, price: 30 },
    { id: 'sheath', name: '剑鞘', w: 'sword', fx: { sspd_sword: .05 }, d: m => `剑系技能出手快 ${Math.round(5 * m)}%`, price: 24 },
    { id: 'sword_edge', name: '磨亮的剑刃', w: 'sword', fx: { sdmg_sword: .08, sarea_sword: .1 }, d: m => `剑系技能伤害 +${Math.round(8 * m)}%<br>剑系招式范围 +${Math.round(10 * m)}%`, price: 30 },
    { id: 'holy_shard', name: '圣剑碎片', w: 'sword', fx: { sdmg_sword: .15 }, d: m => `剑系技能伤害 +${Math.round(15 * m)}%`, price: 46 },
    { id: 'spear_tassel', name: '红枪缨', w: 'spear', fx: { sspd_spear: .05 }, d: m => `枪系技能出手快 ${Math.round(5 * m)}%`, price: 24 },
    { id: 'spear_head', name: '长枪头', w: 'spear', fx: { sdmg_spear: .08, sarea_spear: .15 }, d: m => `枪系技能伤害 +${Math.round(8 * m)}%<br>突刺距离 +${Math.round(15 * m)}%`, price: 30 },
    { id: 'dragon_shaft', name: '龙骑士枪柄', w: 'spear', fx: { sdmg_spear: .15 }, d: m => `枪系技能伤害 +${Math.round(15 * m)}%`, price: 46 },
    { id: 'finger_tab', name: '皮护指', w: 'bow', fx: { sspd_bow: .05 }, d: m => `弓系技能出手快 ${Math.round(5 * m)}%`, price: 24 },
    { id: 'quiver', name: '鹰羽箭袋', w: 'bow', fx: { sdmg_bow: .08, srng_bow: .15 }, d: m => `弓系技能伤害 +${Math.round(8 * m)}%<br>射程 +${Math.round(15 * m)}%`, price: 30 },
    { id: 'elf_string', name: '精灵弓弦', w: 'bow', fx: { sdmg_bow: .15 }, d: m => `弓系技能伤害 +${Math.round(15 * m)}%`, price: 46 },
    { id: 'prism', name: '水晶棱镜', w: 'staff', fx: { sspd_staff: .05 }, d: m => `法杖技能出手快 ${Math.round(5 * m)}%`, price: 24 },
    { id: 'mana_vial', name: '魔力药瓶', w: 'staff', fx: { sdmg_staff: .08, sarea_staff: .12 }, d: m => `法杖技能伤害 +${Math.round(8 * m)}%<br>爆炸范围 +${Math.round(12 * m)}%`, price: 30 },
    { id: 'sage_tome', name: '贤者法典', w: 'staff', fx: { sdmg_staff: .15 }, d: m => `法杖技能伤害 +${Math.round(15 * m)}%`, price: 46 },
  ],
  // 现实习惯（备战页随机抽 3 个选 1，也可以不选）：一好一坏，现实里的小毛病带进了游戏
  // 人物（11/22）：不锁兵器，只管长相 + 一个被动
  heroes: [
    { id: 'm', name: '阿远', from: '中国', desc: '熬夜打游戏的年轻人', perk: '经验 +10%' },
    { id: 'f', name: '小凛', from: '日本', desc: '剑道部的高中生', perk: '翻滚冷却 −20%' },
    { id: 'p', name: '公主', desc: '光之王国的公主露米娜', perk: '法杖伤害 +10%', locked: true },   // 11/22 先锁起来（素材都在）
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
  slotsMax: 5, slotsOpen: 3, bagSize: 16, gearSize: 5, oathSize: 3,
  // 技能书（11/21 第二批定稿，文档：剑 / 枪 / 弓 / 法杖的技能书）。
  // 出招：技能栏 1→2→3 严格轮流；每招 wu 前摇（能走，前摇中翻滚 = 这招作废）→ 出手 → rc 后摇（站定，翻滚可取消）。
  //   hold：占时型持续多久（这段时间不轮到下一招，能走，翻滚不取消）。没有各自冷却。
  // tier 品阶 1 初阶 2 中阶 3 高阶 4 宗师（第一章不出）；w = 勇者拿哪套武器的姿势；dt = 伤害类型 phys / magic；type = 吃哪项属性
  // l3 / l5 / l7 = 熟练度第 3 / 5 / 7 格的变化（说明用）
  skills: {
    // ---- 剑（力量，物理）----
    sword: { name: '半月斩', brief: '身前大扇面横扫', rg: 87, sys: '剑', w: 'sword', tier: 1, icon: 'sword', type: 'str', dt: 'phys', wu: .3, rc: .4, dmg: 6, desc: '身前 135° 大扇面一刀。', l3: '扇面扩大 +25%', l5: '反手再补一刀', l7: '斩完飞出一道月牙剑气' },
    whirl: { name: '旋风斩', brief: '原地转一圈', rg: 70, sys: '剑', w: 'sword', tier: 1, icon: 'sword', type: 'str', dt: 'phys', wu: .35, rc: .45, dmg: 4, desc: '原地转一圈，打身边一整圈。', l3: '打中的怪减速', l5: '连转两圈', l7: '转完留下小旋风' },
    guard: { name: '守护之刃', brief: '召唤飞剑绕身转', rg: 90, sys: '剑', w: 'sword', tier: 1, icon: 'sword', type: 'str', dt: 'phys', wu: .5, rc: .3, dmg: 4, frame: 'big', desc: '每次召唤 1 把大飞剑绕身转（最多 2 把），碰 8 次才碎。', l3: '最多 3 把', l5: '碰到的怪流血', l7: '碎掉时飞向敌人' },
    wave: { name: '破空斩', brief: '飞出月牙剑气', rg: 220, sys: '剑', w: 'sword', tier: 2, icon: 'sword', type: 'str', dt: 'phys', wu: .3, rc: .5, dmg: 7, desc: '朝最近的敌人射出月牙剑气，穿透 3 只。', l3: '扇形 3 道', l5: '穿透不限', l7: '飞到尽头再飞回来' },
    phantom: { name: '幻影斩', brief: '剑气直线 + 留残影', rg: 130, sys: '剑', w: 'sword', tier: 2, icon: 'sword', type: 'str', dt: 'phys', wu: .35, rc: .5, dmg: 9, desc: '瞬间斩出一条直线，尽头留下残影转身斩一圈。', l3: '残影停留 2 秒，跟着你出剑招', l5: '直线留伤痕，怪流血', l7: '两端各留一个残影' },
    flash: { name: '瞬光斩', brief: '蓄力拔剑大半圆', rg: 110, sys: '剑', w: 'sword', tier: 3, icon: 'sword', type: 'str', dt: 'phys', wu: .8, rc: .5, dmg: 20, crit: .3, charge: true, desc: '蓄力后向前砍出一个大半圆，暴击率 +30%。蓄力时翻滚就作废。', l3: '蓄力缩短到 0.5 秒', l5: '半圆扩大 +30%', l7: '出刀后飞出巨大月牙剑气' },
    storm: { name: '剑刃风暴', brief: '持续旋转的剑刃风暴', rg: 87, sys: '剑', w: 'sword', tier: 3, icon: 'sword', type: 'str', dt: 'phys', wu: .4, rc: .4, hold: 2, dmg: 3, desc: '旋转 2 秒一路割过去，能走，翻滚不取消。', l3: '旋转时移速 +30%', l5: '持续 3 秒', l7: '结束时爆开一圈剑气' },
    holysword: { name: '圣剑审判', brief: '天降剑雨砸怪群', rg: 220, sys: '剑', w: 'sword', tier: 4, icon: 'sword', type: 'str', dt: 'phys', wu: 1, rc: .8, dmg: 12, frame: 'big', desc: '天上落下十几把剑砸向怪最多的地方。', l3: '剑数 +50%', l5: '剑插地形成剑阵', l7: '最后落下一把巨剑' },
    // ---- 枪（力量，物理）----
    spear: { name: '疾风刺', brief: '直线突刺穿透一排', rg: 130, sys: '枪', w: 'spear', tier: 1, icon: 'spear', type: 'str', dt: 'phys', wu: .25, rc: .45, dmg: 7, desc: '朝最近的敌人长直线突刺，穿透一排。', l3: '长度 +25%', l5: '连刺两下', l7: '枪芒继续往前飞' },
    sweep: { name: '回旋枪扫', brief: '横扫击晕', rg: 81, sys: '枪', w: 'spear', tier: 1, icon: 'spear', type: 'str', dt: 'phys', wu: .35, rc: .4, dmg: 5, desc: '枪杆横扫身前 160°，把怪击晕 0.3 秒。', l3: '扇面扩大 +25%', l5: '眩晕加时到 0.6 秒', l7: '反手再扫回来' },
    javelin: { name: '穿云枪', brief: '投枪钉地减速', rg: 240, sys: '枪', w: 'spear', tier: 1, icon: 'spear', type: 'str', dt: 'phys', wu: .4, rc: .4, dmg: 10, frame: 'big', desc: '把枪投向最近的敌人，穿透 2 只后钉在地上，钉中的怪减速。', l3: '穿透 4 只', l5: '钉地处炸开一圈', l7: '一次投 2 支' },
    hundred: { name: '百裂刺', brief: '原地快刺 6 下', rg: 130, sys: '枪', w: 'spear', tier: 2, icon: 'spear', type: 'str', dt: 'phys', wu: .2, rc: .4, hold: 1, dmg: 3, desc: '原地朝前方快刺 6 下（占 1 秒，能慢慢走）。', l3: '刺 9 下', l5: '每下都穿透', l7: '最后一刺放出粗枪芒' },
    rising: { name: '升龙挑', brief: '上挑浮空一排', rg: 116, sys: '枪', w: 'spear', tier: 2, icon: 'spear', type: 'str', dt: 'phys', wu: .3, rc: .45, dmg: 6, frame: 'big', desc: '向前上挑，前方一条宽直线的怪全部浮空 0.6 秒，落地再伤。', l3: '直线变长变宽 +25%', l5: '浮空的怪受伤 +30%', l7: '落地砸出冲击' },
    drill: { name: '螺旋龙枪', brief: '慢速钻头穿透', rg: 200, sys: '枪', w: 'spear', tier: 3, icon: 'spear', type: 'str', dt: 'phys', wu: .6, rc: .5, dmg: 3, desc: '刺出一道旋转枪芒缓慢向前，持续搅伤路上的怪。', l3: '枪芒变粗 +30%', l5: '两边的怪被吸向中线', l7: '走到尽头爆炸' },
    leap: { name: '跃龙击', brief: '跃起砸地 + 地裂', rg: 87, sys: '枪', w: 'spear', tier: 3, icon: 'spear', type: 'str', dt: 'phys', wu: .7, rc: .5, dmg: 16, frame: 'big', desc: '跃起砸地：一圈冲击 + 四道地裂。', l3: '地裂 6 道', l5: '中心冲击把怪击飞', l7: '0.5 秒后再震一次' },
    dragon: { name: '苍龙之枪', brief: '苍龙盘旋撞怪', rg: 220, sys: '枪', w: 'spear', tier: 4, icon: 'spear', type: 'str', dt: 'phys', wu: 1, rc: .8, hold: 4, dmg: 6, frame: 'big', desc: '枪化苍龙在场上盘旋 4 秒撞击怪。', l3: '龙更大', l5: '每秒喷龙息', l7: '结束时俯冲重击' },
    // ---- 弓（敏捷，物理）----
    bow: { name: '疾矢', brief: '射最近的怪', rg: 207, sys: '弓', w: 'bow', tier: 1, icon: 'bow', type: 'agi', dt: 'phys', wu: .2, rc: .35, dmg: 4, desc: '射最近的敌人，能穿过 1 只。出手最快。', l3: '穿透 +1', l5: '一次射 2 支', l7: '命中后分裂 3 支小箭' },
    fan: { name: '扇羽箭', brief: '扇形射 5 箭', rg: 108, sys: '弓', w: 'bow', tier: 1, icon: 'bow', type: 'agi', dt: 'phys', wu: .3, rc: .4, dmg: 3, desc: '朝前方扇形射出 5 支短程箭，近身伤害高。', l3: '7 支', l5: '击退', l7: '0.3 秒后再补一轮' },
    homing: { name: '灵羽箭', brief: '追踪羽箭会弹射', rg: 234, sys: '弓', w: 'bow', tier: 1, icon: 'bow', type: 'agi', dt: 'phys', wu: .3, rc: .4, dmg: 4, desc: '射出 3 支会追踪的羽箭，命中后弹到下一只怪。', l3: '5 支', l5: '命中减速', l7: '弹 2 次' },
    rain: { name: '暴风箭雨', brief: '怪最密处落箭雨', rg: 216, sys: '弓', w: 'bow', tier: 2, icon: 'bow', type: 'agi', dt: 'phys', wu: .45, rc: .45, dmg: 3, frame: 'big', desc: '朝天一箭，0.6 秒后在怪最密处落下箭雨 1.5 秒。', l3: '范围 +25%', l5: '持续 2.5 秒且减速', l7: '同时落两片' },
    barrage: { name: '连珠箭', brief: '连射精英和首领', rg: 216, sys: '弓', w: 'bow', tier: 2, icon: 'bow', type: 'agi', dt: 'phys', wu: .2, rc: .35, hold: .8, dmg: 4, desc: '锁定一只（优先精英），0.8 秒连射 5 箭。', l3: '7 箭', l5: '每箭叠易伤', l7: '最后一箭贯穿全屏' },
    pierce: { name: '贯星箭', brief: '蓄力贯穿一条线', rg: 234, sys: '弓', w: 'bow', tier: 3, icon: 'bow', type: 'agi', dt: 'phys', wu: .7, rc: .5, dmg: 22, charge: true, desc: '蓄力后射出贯穿全屏的巨箭，推开沿途的怪。', l3: '蓄力缩短到 0.45 秒', l5: '箭变粗 +50%', l7: '沿途接连爆炸' },
    cyclone: { name: '旋风箭', brief: '慢速龙卷风', rg: 180, sys: '弓', w: 'bow', tier: 3, icon: 'bow', type: 'agi', dt: 'phys', wu: .5, rc: .5, dmg: 2, desc: '射出缓慢的旋风箭，把沿途的怪卷着往前带。', l3: '旋风变大', l5: '尽头炸开', l7: '同时两道' },
    starfall: { name: '星陨之弓', brief: '流星群砸怪', rg: 234, sys: '弓', w: 'bow', tier: 4, icon: 'bow', type: 'agi', dt: 'phys', wu: 1, rc: .8, hold: 3, dmg: 10, frame: 'big', desc: '光箭化作流星群，3 秒内砸向怪群。', l3: '流星 +50%', l5: '落点留火坑', l7: '最后落下巨大陨星' },
    // ---- 法杖（智力，法术）----
    staff: { name: '火球术', brief: '火球落地爆炸', rg: 198, sys: '法杖', w: 'staff', tier: 1, icon: 'fire', type: 'int', dt: 'magic', wu: .4, rc: .4, dmg: 9, desc: '砸向怪最密处爆炸，点燃。', l3: '爆炸范围 +25%', l5: '留下火海 2 秒', l7: '一次砸 2 颗' },
    nova: { name: '霜冻新星', brief: '身边炸开寒气', rg: 52, sys: '法杖', w: 'staff', tier: 1, icon: 'nova', type: 'int', dt: 'magic', wu: .3, rc: .45, dmg: 8, frame: 'big', desc: '以自己为中心炸开寒气，叠 1 层缓滞（叠满 4 层冻结）。', l3: '范围 +25%', l5: '一次叠 2 层', l7: '飞出 8 根冰刺' },
    chain: { name: '闪电链', brief: '闪电链弹射', rg: 180, sys: '法杖', w: 'staff', tier: 1, icon: 'fire', type: 'int', dt: 'magic', wu: .3, rc: .4, dmg: 6, desc: '劈中最近的怪再弹 3 只，打缓滞的怪伤害翻倍。', l3: '弹 5 只', l5: '弹跳不衰减', l7: '同时两道' },
    pillar: { name: '圣光柱', brief: '圣光柱砸目标', rg: 216, sys: '法杖', w: 'staff', tier: 2, icon: 'fire', type: 'int', dt: 'magic', wu: .4, rc: .4, dmg: 12, desc: '0.5 秒后在怪脚下降下光柱。', l3: '同时 2 道', l5: '光柱停留 1.5 秒', l7: '打中回复生命' },
    orbs: { name: '暗影黑雾', brief: '怪堆里放黑雾', rg: 198, sys: '法杖', w: 'staff', tier: 2, icon: 'nova', type: 'int', dt: 'magic', wu: .3, rc: .3, dmg: 4, desc: '在怪最密的地方放一团黑雾 5 秒（最多 2 团），雾里的怪每 0.5 秒受魔法伤害并减速。', l3: '黑雾变大 +25%', l5: '雾里的怪被诅咒', l7: '雾散时炸开' },
    thunder: { name: '雷霆万钧', brief: '连劈 4 道落雷', rg: 216, sys: '法杖', w: 'staff', tier: 3, icon: 'fire', type: 'int', dt: 'magic', wu: .6, rc: .5, dmg: 14, frame: 'big', desc: '依次劈下 4 道落雷，打缓滞的怪伤害翻倍。', l3: '6 道', l5: '留下雷区', l7: '最后一道巨大天雷' },
    blizzard: { name: '暴风雪', brief: '跟着走的暴风雪', rg: 80, sys: '法杖', w: 'staff', tier: 3, icon: 'nova', type: 'int', dt: 'magic', wu: .4, rc: .4, hold: 2.5, dmg: 4, frame: 'big', desc: '2.5 秒内周围不断落下冰锥叠缓滞，跟着你走。', l3: '范围 +25%', l5: '持续 3.5 秒', l7: '结束时冻住的怪碎裂' },
    abyss: { name: '深渊之门', brief: '深渊之门吸怪', rg: 216, sys: '法杖', w: 'staff', tier: 4, icon: 'nova', type: 'int', dt: 'magic', wu: 1, rc: .8, hold: 4, dmg: 6, frame: 'big', desc: '打开深渊之门 4 秒，吸怪并用触手抽打。', l3: '吸引范围 +30%', l5: '周围的怪被诅咒', l7: '关门大爆炸' },
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
    { hp: 1.00, name: '森林外围', waves: [{ G: 6, S: 3 }, { G: 8, S: 4, A: 1 }, { G: 8, S: 4, K: 2, A: 2, ex: [['mini', 'gob_blade']] }] },
    { hp: 1.06, name: '森林外围', waves: [{ G: 8, S: 3, K: 3 }, { G: 9, S: 3, K: 3, A: 2 }, { G: 10, S: 4, K: 4, A: 3, T: 1, ex: [['elite', 'gob_blade']] }] },
    { hp: 1.15, name: '森林外围', waves: [{ G: 9, S: 3, K: 4, A: 2, W: 3, T: 1 }, { G: 10, K: 4, A: 3, W: 4, T: 2 }, { G: 10, K: 5, A: 3, W: 4, ex: [['mini', 'gob_chief']] }] },
    { hp: 1.25, name: '森林深处', waves: [{ G: 10, K: 4, A: 3, D: 3, T: 2 }, { G: 10, K: 5, A: 3, D: 4, T: 3 }, { G: 11, K: 5, D: 4, T: 3, W: 3, ex: [['elite', 'gob_shaman']] }] },
    { hp: 1.40, name: '森林深处', waves: [{ G: 10, K: 5, D: 3, T: 2, B: 2, H: 2 }, { G: 11, K: 5, D: 4, T: 3, B: 3, H: 3 }, { G: 12, K: 6, D: 4, T: 3, B: 3, H: 3, ex: [['elite', 'gob_drum']] }] },
    { hp: 1.55, name: '森林深处', waves: [{ G: 11, K: 5, D: 4, B: 3, H: 3, R: 2 }, { G: 12, K: 6, D: 4, T: 3, B: 3, R: 3 }, { G: 12, K: 6, D: 4, T: 3, H: 3, R: 3, ex: [['mini', 'gob_paladin']] }] },
    { hp: 1.75, name: '哥布林营地', waves: [{ G: 12, K: 6, D: 4, R: 3, P: 2, M: 2 }, { G: 12, K: 6, D: 4, T: 3, P: 3, M: 3 }, { G: 13, K: 6, D: 5, P: 3, M: 3, B: 3, ex: [['elite', 'gob_necro']] }] },
    { hp: 1.95, name: '哥布林营地', waves: [{ G: 12, K: 6, D: 5, P: 3, M: 3, O: 2 }, { G: 13, K: 6, D: 5, R: 3, M: 3, O: 3, ex: [['elite', 'gob_troll']] }, { G: 14, K: 7, D: 5, P: 3, M: 3, O: 3, ex: [['elite', 'gob_troll'], ['elite', 'gob_rock']] }] },
    { hp: 2.10, name: '哥布林王座', boss: true, waves: [{ G: 12, K: 6, A: 3, D: 4, T: 3, B: 3, H: 3 }, { G: 12, K: 6, R: 3, P: 3, M: 3, O: 3, ex: [['elite', 'gob_shaman'], ['elite', 'gob_drum']] }, { boss: 'gob_king' }] },
  ],
  // 11/22 站点卡（月圆之夜式）：每站打完 3 张。第 1 张战斗，第 2 张（第 2 站起）一半是精英，第 3 张是不打仗的卡（每章最多选 restMax 次，用完变战斗）
  restMax: 3,
  rests: [
    { k: 'chest', name: '宝箱', icon: 'chest', desc: '路边一个没上锁的宝箱。三本书选一本。', btn: '打开' },
    { k: 'fire', name: '篝火', icon: 'meat', desc: '噼啪作响的篝火，站在旁边歇一会儿。回复 50% 生命，修炼一次。', btn: '休息' },
    { k: 'event', name: '奇遇', icon: 'clover', desc: '前面好像有什么……', btn: '查看' },
  ],
  // 事件：二选一。fx 由 battle.js doEvent 执行，返回结果文字
  // 11/23 奇遇（在战场右边摆场景，地上踏板选）：pl = [踏板文字, fx, 条件]。merchant = 走近开店
  events: [
    { id: 'rift_mer', name: '裂缝旅商', merchant: 1, lines: ['从别的游戏过来的货，要不要看看？', '这些可不是地精那里买得到的。'] },
    { id: 'fairy', name: '仙女的泉水', lines: ['投点东西进来吧，我会还你更好的。'], pl: [['投一件宝物：换一件随机宝物', 'fItem', 'hasItem'], ['投一本技能书：换同品阶的另一本', 'fBook', 'bagBook'], ['投 20 铜钱：回复 40% 生命', 'fCoin', 'c20']] },
    { id: 'knight', name: '受伤的骑士', lines: ['勇者……能帮帮我吗？'], pl: [['给他治疗：−15% 生命，换一个誓约印记', 'kHeal'], ['拿走他的宝物：得武器宝物，幸运 −1', 'kTake']] },
    { id: 'gamble', name: '小咕噜的赌局', lines: ['又是你！押 20 铜钱，猜中给好东西～', '上次偷的钱？什么钱？我不知道哦。'], cups: 1 },
    { id: 'rift', name: '紫色的乱码裂缝', lines: ['……（滋滋的电子噪音）'], pl: [['伸手进去：50% 高阶书 / 50% −20% 生命', 'rHand'], ['投一本技能书：换一个誓约印记', 'rBook', 'bagBook'], ['投一个誓约印记：换一本技能书', 'rOath', 'anyOath']] },
    { id: 'kid', name: '被困的哥布林小孩', lines: ['呜呜……救救我……'], pl: [['救他：下一站没有小咕噜，铜钱 +30%', 'kidSave'], ['抢他的零花钱：+25 铜钱，下一站多精英', 'kidRob']] },
    { id: 'altar', name: '诅咒祭坛', lines: ['献上祭品，获得力量。'], pl: [['献血：生命上限 −10%，换一个誓约印记 Lv2', 'aBlood'], ['献 40 铜钱：一个已装备的印记 +1 级', 'aCoin', 'c40oath'], ['献一本技能书：同品阶已装备技能 +1 级', 'aBook', 'tierBook']] },
    { id: 'arcade', name: '坏掉的街机', lines: ['一台从别的游戏掉进来的老虎机，还在滋滋作响。'], arcade: 1, pl: [['拉一次：15 铜钱', 'spin', 'cSpin']] },   // 11/24 最多拉 3 次（15 / 25 / 40），期望大致持平
    { id: 'feather', name: '复活羽毛', lines: ['一根闪着微光的羽毛。'], pl: [['收下：第一次倒下时回 50% 生命复活', 'fKeep'], ['卖掉：+30 铜钱', 'fSell']] },
  ],

  // 11/22 卡带世界地图（art/ui2/map.webp 上的位置，按图宽高的比例）：打完一章在这里选下一章。只有第一章能玩，其余锁着
  // 11/22 世界势力（铃兰之剑式）：每章一块领地，地图上叠颜色 + 旗帜 + 关系。x/y 是 art/ui2/map.webp 上的比例位置，rx/ry 是领地染色范围
  chapters: [
    { id: 1, name: '哥布林森林', land: '西部森林', c: '#9ccf3a', sym: '牙', rel: '敌对', x: .2, y: .42, rx: .14, ry: .2, boss: '哥布林王', open: true },
    { id: 2, name: '暗夜精灵', land: '幽林', c: '#3fae8a', sym: '月', rel: '中立', x: .44, y: .27, rx: .11, ry: .14, boss: '暗夜女祭司' },
    { id: 3, name: '矮人废坑', land: '北方雪山', c: '#d0703a', sym: '镐', rel: '敌对', x: .28, y: .12, rx: .13, ry: .12, boss: '失控熔炉魔像' },
    { id: 4, name: '吸血鬼城堡', land: '东部古堡', c: '#c8283a', sym: '血', rel: '敌对', x: .82, y: .32, rx: .12, ry: .2, boss: '吸血鬼伯爵' },
    { id: 5, name: '魔导国', land: '南方塔城', c: '#5a7cff', sym: '星', rel: '中立', x: .5, y: .66, rx: .15, ry: .17, boss: '大魔导师' },
    { id: 6, name: '黑暗之地', land: '东南焦土', c: '#a040e0', sym: '冥', rel: '敌对', x: .79, y: .76, rx: .14, ry: .17, boss: '???' },
  ],
  capital: { name: '王都', c: '#ffe07a', sym: '冠', rel: '信赖', x: .59, y: .33 },   // 公主露米娜在这，不打仗
  waveT: 30,
  // 11/22 一站 = 一场连续战斗：3 段不停顿（段落时间如下，越往后越长），第 3 段打完才结算。第 1 站第 3 段前公主出现（三选一）
  phaseT: [[15, 15, 30], [20, 25, 35], [25, 30, 40], [30, 30, 45], [30, 35, 45], [35, 35, 50], [35, 40, 50], [40, 40, 60], [40, 45, 0]],                             // 每波固定 30 秒（11/21 用户定，先这样试）
  countMul: 3.12,   // 11/22 数量再加一些（2 → 2.4）                           // 出怪数量 = 表上 × 2（30 秒一波、不再清场，怪要多）
  // 精英 / 小头目：血、伤害、体型倍率（群侠四档）
  tiers: { elite: { hp: 2.5, dmg: 1.25, size: 1.15, name: '精英' }, mini: { hp: 7, dmg: 1.5, size: 1.35, reach: 1.2, wind: .1, name: '小头目' } },
  caps: { normal: 78, archer: 18 },   // 11/22 跟着数量加      // archer = 远程怪合计      // 场上同时最多多少只
  // 经济（起始值，Codex）
  econ: { startCoin: 18, waveCoin: [10, 2], perKills: 3, elite: 5, mini: 8, clear: 0, waveHeal: 4,
    waveXp: 8, xpPerKills: 4, xpElite: 3, xpMini: 5, xpClear: 0, xpMul: 1.3, maxLv: 12 },
  // 行商：书价、开格价、刷新价（每站涨 7%）；出售拿基价的 35%
  price: { book: 22, slot4: 60, slot5: 120, slot4At: 2, slot5At: 5, stUp: .07, sell: .35, refresh: [4, 2, 3], refreshMax: 4, itemLimit: 2 },
  // 修炼（照三国终章）：每升一级攒一次，三选一，品阶 普通/精良/稀有/绝世，每次机会可刷新 2 次
  rarity: [{ name: '普通', col: '#e8e0d0', add: 1, p: .55 }, { name: '精良', col: '#6fb8ff', add: 2, p: .3 }, { name: '稀有', col: '#c58cff', add: 3, p: .12 }, { name: '绝世', col: '#ffb347', add: 3, extra: 2, p: .03 }],
  consumables: [{ id: 'meat', name: '烤肉', icon: '🍖', desc: '回复 40% 生命', heal: .4 }],
  // 敌人：用《异世界幸存者》的哥布林（art/goblin/），像素和勇者一样粗细
  enemies: {
    // 怪物属性（11/21）：hp 生命、dmg 攻击、dtype 攻击类型（phys 物理 / magic 法术）、pdef 物防、mdef 魔防（和勇者同一公式：受伤 × 100/(100+防御)，最多减 60%）。
    // 精英 / 小头目 / 首领另有控制抗性（硬控时间减半 / 免疫）。
    // reach = 走到多近开始抬手；arc / r = 劈砍扇面角度和半径；cool = 招后间隔；dtype = 伤害类型（物理 / 魔法）
    goblin: { name: '哥布林', pdef: 5, mdef: 0, hp: 6, spd: 45, reach: 48, arc: 60, r: 48, dmg: 6, wind: .43, cool: 1.35, dtype: 'phys' },
    gob_blade: { name: '哥布林刀手', pdef: 15, mdef: 5, hp: 9, spd: 55, reach: 64, arc: 110, r: 61, dmg: 8, wind: .52, cool: 1.65, dtype: 'phys' },
    gob_archer: { name: '哥布林弓手', pdef: 0, mdef: 10, hp: 5, spd: 38, reach: 220, keep: [115, 155], dmg: 5, wind: .7, cool: 1.9, arrow: 130, ranged: true, dtype: 'phys' },
    // 11/22 哥布林全家（异世界幸存者的图）。nw = 走路帧数；k = 体型系数（别比王大）；res = 体质：iron 铁甲（物理减半）/ spirit 灵体（物理减半、法术 +25%）/ magic 魔抗（法术减半）
    // 特殊行为：shield 正面挡几下（之后换成没盾的帧）/ bomb 自爆半径 / charge 冲锋距离 / ghost 穿过别的怪 / aura heal 回血 · drum 加速 / summon 召唤 / ai boss 用首领的招式
    gob_kid: { name: '小哥布林', pdef: 0, mdef: 0, hp: 3, spd: 71, reach: 20, arc: 60, r: 30, dmg: 3, wind: .35, cool: 1.1, dtype: 'phys', nw: 4 },
    wolf_free: { name: '野狼', pdef: 0, mdef: 0, hp: 6, spd: 72, reach: 69, arc: 70, r: 66, dmg: 5, wind: .3, cool: 1.2, dtype: 'phys', nw: 4 },
    gob_shield: { name: '哥布林盾兵', pdef: 10, mdef: 5, hp: 12, spd: 36, reach: 39, arc: 80, r: 40, dmg: 8, wind: .6, cool: 1.8, dtype: 'phys', shield: 8 },
    gob_thrower: { name: '哥布林投石兵', pdef: 0, mdef: 5, hp: 6, spd: 36, reach: 175, keep: [120, 165], dmg: 6, wind: .8, cool: 2.2, arrow: 110, ranged: true, shot: 'rock', dtype: 'phys', nw: 4 },
    gob_bomb: { name: '哥布林炸弹兵', pdef: 0, mdef: 0, hp: 5, spd: 58, reach: 42, dmg: 16, wind: .9, cool: 1, bomb: 44, dtype: 'phys', nw: 4 },
    gob_ghost: { name: '哥布林幽灵', pdef: 0, mdef: 0, hp: 8, spd: 46, reach: 70, arc: 70, r: 70, dmg: 3, wind: .45, cool: 1.4, res: 'spirit', ghost: true, dtype: 'magic', nw: 4 },
    gob_wolf: { name: '哥布林狼骑兵', pdef: 10, mdef: 0, hp: 14, spd: 58, reach: 61, arc: 80, r: 60, dmg: 8, wind: .5, cool: 1.8, charge: 130, dtype: 'phys', nw: 4, k: .85 },
    gob_boar: { name: '哥布林野猪骑兵', pdef: 15, mdef: 0, hp: 18, spd: 40, reach: 45, arc: 80, r: 42, dmg: 10, wind: .55, cool: 2, charge: 170, dtype: 'phys', nw: 4, k: .9 },
    gob_mage: { name: '哥布林法师', pdef: 0, mdef: 30, hp: 7, spd: 34, reach: 220, keep: [110, 160], dmg: 7, wind: .8, cool: 2.2, arrow: 120, ranged: true, shot: 'bolt', res: 'magic', dtype: 'magic', nw: 4 },
    gob_rock: { name: '岩石哥布林', pdef: 20, mdef: 0, hp: 30, spd: 26, reach: 34, arc: 100, r: 35, dmg: 12, wind: .8, cool: 2, res: 'iron', dtype: 'phys', nw: 4, k: .8 },
    gob_shaman: { name: '哥布林萨满', pdef: 0, mdef: 20, hp: 10, spd: 34, reach: 183, keep: [100, 150], dmg: 6, wind: .8, cool: 2.4, arrow: 120, ranged: true, shot: 'bolt', aura: 'heal', dtype: 'magic', k: .85 },
    gob_drum: { name: '哥布林战鼓手', pdef: 10, mdef: 10, hp: 14, spd: 32, reach: 24, arc: 70, r: 36, dmg: 6, wind: .6, cool: 2, aura: 'drum', dtype: 'phys', nw: 4, k: .65 },
    gob_necro: { name: '哥布林死灵法师', pdef: 0, mdef: 25, hp: 12, spd: 30, reach: 220, keep: [110, 155], dmg: 6, wind: .9, cool: 2.6, arrow: 110, ranged: true, shot: 'bolt', summon: 'skeleton', dtype: 'magic', nw: 4, k: .75 },
    skeleton: { name: '骷髅', pdef: 0, mdef: 0, hp: 4, spd: 55, reach: 22, arc: 70, r: 34, dmg: 5, wind: .4, cool: 1.3, dtype: 'phys', nw: 4, k: .7 },
    gob_troll: { name: '哥布林巨魔', pdef: 15, mdef: 5, hp: 40, spd: 22, reach: 74, arc: 150, r: 70, dmg: 16, wind: 1, cool: 2.4, dtype: 'phys', k: .6 },
    gob_chief: { name: '哥布林酋长', pdef: 20, mdef: 10, hp: 40, spd: 32, reach: 34, dmg: 10, wind: .8, ai: 'boss', dtype: 'phys', nw: 4, k: .68 },
    gob_paladin: { name: '哥布林圣骑士', pdef: 25, mdef: 20, hp: 44, spd: 36, reach: 34, dmg: 11, wind: .8, ai: 'boss', dtype: 'phys', nw: 4, k: .66 },
    gob_king: { name: '哥布林王', pdef: 30, mdef: 20, hp: 600, spd: 30, reach: 30, dmg: 14, wind: .9, boss: true, dtype: 'phys' },
  },
  // 11/24 称号（哥布林森林篇）：解锁后永久，选人界面佩戴 1 个，一加一减。need(rec, run) 判定解锁
  titles: [
    { id: 'rookie', name: '初出茅庐', how: '第一次打完一局', fx: { hp: .05, dmg: -.03 }, d: '生命上限 +5%<br><span class="bad">伤害 −3%</span>', need: (R) => (R.runs || 0) >= 1 },
    { id: 'gobkiller', name: '哥布林杀手', how: '累计击杀 3000 只哥布林', fx: { dmg: .08, take: .05 }, d: '伤害 +8%<br><span class="bad">受到伤害 +5%</span>', need: (R) => (R.kills || 0) >= 3000 },
    { id: 'undying', name: '不死之身', how: '累计倒下 20 次', fx: { hp: .15, dmg: -.05 }, d: '生命上限 +15%<br><span class="bad">伤害 −5%</span>', need: (R) => (R.deaths || 0) >= 20 },
    { id: 'gale', name: '疾风', how: '一局翻滚 300 次', fx: { move: .08, hp: -.08 }, d: '移速 +8%<br><span class="bad">生命上限 −8%</span>', need: (R, r) => (r.rolls || 0) >= 300 },
    { id: 'gambler', name: '赌徒', how: '街机拉出 777', fx: { crit: .05, eva: -.03 }, d: '暴击率 +5%<br><span class="bad">闪避 −3%</span>', need: (R, r) => !!r.s777 },
    { id: 'gollum', name: '小咕噜之友', how: '一局里抓到小咕噜 5 次', fx: { coin: .05, take: .05 }, d: '铜钱获得 +5%<br><span class="bad">受到伤害 +5%</span>', need: (R, r) => (r.thief || 0) >= 5 },
    { id: 'elitehunter', name: '精英猎人', how: '累计击败 50 只哥布林精英', fx: { elite: .12, mob: -.05 }, d: '对精英伤害 +12%<br><span class="bad">对小怪伤害 −5%</span>', need: (R) => (R.elites || 0) >= 50 },
    { id: 'curious', name: '好奇宝宝', how: '找齐高塔和宫殿里 5 个隐藏的小发现', fx: { coin: .08, hp: -.04 }, d: '铜钱获得 +8%<br><span class="bad">生命上限 −4%</span>', need: () => !!(window.EGG && EGG.count() >= 5) },
    { id: 'kingbane', name: '哥布林王的克星', how: '打倒哥布林王', fx: { boss: .10, hp: -.05 }, d: '对首领伤害 +10%<br><span class="bad">生命上限 −5%</span>', need: (R) => (R.wins || 0) >= 1 },
  ],
  // 11/24 流派羁绊：技能栏里同一系 2 本 / 4 本触发（剑 生命+伤害，枪 生命+物防，弓 出手快+射程，法杖 法术伤害+魔防）
  sets: {
    '剑': [[2, { hp: .08, dmg: .06 }, '生命 +8%，伤害 +6%'], [4, { hp: .18, dmg: .15 }, '生命 +18%，伤害 +15%']],
    '枪': [[2, { hp: .08, pdef: 10 }, '生命 +8%，物防 +10'], [4, { hp: .18, pdef: 25 }, '生命 +18%，物防 +25']],
    '弓': [[2, { sspd_bow: .08, srng_bow: .15 }, '弓系出手快 8%，射程 +15%'], [4, { sspd_bow: .18, srng_bow: .30 }, '弓系出手快 18%，射程 +30%']],
    '法杖': [[2, { sdmg_staff: .08, mdef: 10 }, '法杖伤害 +8%，魔防 +10'], [4, { sdmg_staff: .18, mdef: 25 }, '法杖伤害 +18%，魔防 +25']],
  },
  meleeBooks: ['sword', 'whirl', 'spear', 'sweep', 'storm', 'leap', 'rising', 'hundred', 'flash'],
  // 地图：第一版只开打谷场
  stationMap: { 2: 'ford', 3: 'logyard', 4: 'deep4', 5: 'moonbay', 6: 'village', 7: 'stable', 8: 'forge', 9: 'hall' },   // 11/26 1 晴（field）/ 2 薄雾 / 3 雨；   // 11/25 第几站用哪张地图（没写的用 field）
  maps: [
    { id: 'field', name: '哥布林森林', img: 'art/map/forest_sun.webp', w: 2508, h: 1412,   // 11/21 哥布林森林扩图版：图 1672×941，世界按 1.5 倍算（forest / forest2 / 打谷场 field 都留着）
      open: true, wx: '晴', foes: ['goblin', 'gob_blade', 'gob_archer'], boss: 'gob_king', time: 120,
      // 11/23 地图氛围（原图像素）：火 = 营火锅 + 两支火把；光 = 左上林间光柱；叶 = 从树冠带落下；萤 = 两侧草丛和底部灌木
      amb: { fires: [[903, 184, 1.4, 'fire', 30], [60, 793, 1, 'torch', 62], [1612, 793, 1, 'torch', 62]], rays: [[150, 20, 300, 360], [470, 40, 240, 300]], leaf: [0, 1672, 0, 160], flies: [[0, 240, 300, 600], [1380, 240, 1672, 600], [0, 820, 1672, 941]] },
      desc: '游戏里的第一站。密林深处的哥布林营地，哥布林从林子里一波波涌出来。',
      // 能走的地面（地图像素）：y0–y1 之间，每一行的左右边界见 pts [y, 左, 右]（11/21 改回原图；加大版 field_big 和 tools/extend_map.py 留着）
      ground: {"y0":412,"y1":1282,"pts":[[412,675,2078],[495,570,2160],[600,450,2212],[720,278,2280],[840,158,2362],[945,38,2475],[1230,30,2478],[1282,90,2430]]}, grade: [['saturate', .94]] },
    // 11/26 森林深处（第 4–6 站）：同一构图三种光线（黄昏 / 夜 / 深夜），可走区域是一个多边形（原图像素 1672×941，js/mech.js 的 simple 模式）
    ...[['deep4', 'forest_d4', '黄昏'], ['deep5', 'forest_d5', '夜'], ['deep6', 'forest_d6', '深夜']].map(([id, img, wx]) => ({ wx, id, name: '森林深处', img: 'art/map/' + img + '.webp', w: 2508, h: 1412, hidden: true, boss: 'gob_king', time: 120,
      foes: ['goblin', 'gob_blade', 'gob_archer'], desc: '森林深处的林间空地。', grade: [['saturate', .94]],
      ground: { y0: 427, y1: 1275, pts: [[427, 0, 2508], [1275, 0, 2508]] },
      zone: { simple: true, start: [836, 700], main: [[445,285],[1355,285],[1640,620],[1640,700],[1605,850],[75,850],[32,700],[32,622]] } })),
    // 11/26 新外围地图：第 2 站 决口浅河（浅河整片可走）/ 第 3 站 倒木集散场；zone 是布局图里的可走多边形（原图像素 1672×941）
    { id: 'ford', name: '决口浅河', wx: '晨雾', img: 'art/map/forest_s2.webp', w: 2508, h: 1412, hidden: true, open: false, boss: 'gob_king', time: 120,
      foes: ['goblin', 'gob_blade', 'gob_archer'], desc: '精灵旧水闸被拆开的决口，河水退成一片浅滩。', grade: [['saturate', .94]],
      ground: { y0: 427, y1: 1275, pts: [[427, 0, 2508], [1275, 0, 2508]] },
      zone: { simple: true, start: [700, 690], main: [[180,160],[1430,150],[1580,380],[1530,790],[1230,870],[260,830],[80,590]] },
      amb: { fires: [], rays: [], leaf: [0, 1672, 0, 140], flies: [[0, 240, 300, 600], [1380, 240, 1672, 600]] },
      props: [['barrel', 235, 650], ['barrel', 265, 662], ['crate', 1340, 290], ['barrel', 1450, 420], ['crate', 420, 770]],
      birds: [[660, 100], [1030, 95], [1570, 235]], totem: [[105, 100], [1005, 860]], fauna: 'crow' },
    { id: 'logyard', name: '倒木集散场', wx: '午后', img: 'art/map/forest_s3.webp', w: 2508, h: 1412, hidden: true, open: false, boss: 'gob_king', time: 120,
      foes: ['goblin', 'gob_blade', 'gob_archer'], desc: '哥布林砍倒精灵树运出森林的集散地。', grade: [['saturate', .94]],
      ground: { y0: 427, y1: 1275, pts: [[427, 0, 2508], [1275, 0, 2508]] },
      zone: { simple: true, start: [800, 560], main: [[80,340],[1360,230],[1600,365],[1570,700],[360,810],[75,675]] },
      amb: { fires: [], rays: [[140, 0, 300, 300]], leaf: [0, 1672, 0, 150], flies: [[0, 240, 300, 600]] },
      props: [['barrel', 300, 640], ['crate', 1380, 600], ['crate', 1350, 620], ['barrel', 1180, 330], ['barrel', 220, 450]],
      birds: [[330, 175], [540, 170], [740, 170], [1275, 150]], totem: [[120, 190], [570, 115], [825, 100], [1525, 130]], fauna: 'crow' },
    { id: 'moonbay', name: '退水月湾', wx: '雨后', img: 'art/map/forest_moon.webp', w: 2508, h: 1412, hidden: true, open: false, boss: 'gob_king', time: 120,
      foes: ['goblin', 'gob_blade', 'gob_archer'], desc: '精灵圣泉被抽干，只剩一片泥滩。', grade: [['saturate', .94]],
      ground: { y0: 427, y1: 1275, pts: [[427, 0, 2508], [1275, 0, 2508]] },
      zone: { simple: true, start: [830, 548], main: [[84, 674], [132, 313], [345, 219], [475, 181], [1029, 198], [1488, 372], [1597, 616], [1397, 827], [1350, 836], [411, 844]] },
      amb: { fires: [], rays: [], leaf: null, flies: null },
      props: [["barrel", 311, 380], ["barrel", 371, 400], ["crate", 1385, 592], ["barrel", 916, 778], ["crate", 538, 764]],
      birds: [[850, 60], [1200, 70], [1300, 95], [600, 105]], totem: [[1480, 170], [900, 60]], fauna: 'crow' },
    { id: 'village', name: '村口广场', wx: '深夜', img: 'art/map/forest_village.webp', w: 2508, h: 1412, hidden: true, open: false, boss: 'gob_king', time: 120,
      foes: ['goblin', 'gob_blade', 'gob_archer'], desc: '精灵村落的废墟，树屋被烧毁。', grade: [['saturate', .94]],
      ground: { y0: 427, y1: 1275, pts: [[427, 0, 2508], [1275, 0, 2508]] },
      zone: { simple: true, start: [897, 560], main: [[1523, 575], [1522, 612], [1432, 738], [1290, 835], [657, 845], [443, 814], [184, 717], [128, 613], [220, 380], [357, 287], [525, 221], [1076, 209], [1254, 250], [1406, 333], [1445, 379]] },
      amb: { fires: [], rays: [], leaf: null, flies: null },
      props: [["banner", 435, 349], ["banner", 1244, 368], ["rack", 826, 285], ["brazier", 295, 559], ["brazier", 1384, 559]],
      birds: [[300, 100], [760, 70], [1300, 110]], totem: [[230, 110], [740, 90], [1330, 125]], fauna: 'bat' },
    { id: 'stable', name: '斜坡驯骑场', wx: '黄昏', img: 'art/map/forest_stable.webp', w: 2508, h: 1412, hidden: true, open: false, boss: 'gob_king', time: 120,
      foes: ['goblin', 'gob_blade', 'gob_archer'], desc: '精灵草场被改成哥布林驯养坐骑的场地。', grade: [['saturate', .94]],
      ground: { y0: 427, y1: 1275, pts: [[427, 0, 2508], [1275, 0, 2508]] },
      zone: { simple: true, start: [815, 572], main: [[1541, 470], [1504, 599], [951, 835], [445, 812], [73, 626], [130, 471], [678, 207], [1201, 239]] },
      amb: { fires: [], rays: [], leaf: null, flies: null },
      props: [["barrel", 337, 458], ["crate", 1247, 427], ["crate", 1306, 446], ["rack", 807, 270], ["barrel", 513, 760]],
      birds: [[500, 110], [740, 120], [1150, 120]], totem: [[730, 50], [1138, 115], [496, 96]], fauna: 'crow' },
    { id: 'forge', name: '森林工业基地', wx: '烟尘', img: 'art/map/forest_forge.webp', w: 2508, h: 1412, hidden: true, open: false, boss: 'gob_king', time: 120,
      foes: ['goblin', 'gob_blade', 'gob_archer'], desc: '哥布林用砍倒的精灵树建起的工业基地。', grade: [['saturate', .94]],
      ground: { y0: 427, y1: 1275, pts: [[427, 0, 2508], [1275, 0, 2508]] },
      zone: { simple: true, start: [936, 607], main: [[1644, 663], [1526, 758], [1346, 843], [575, 818], [137, 735], [76, 585], [45, 460], [317, 213], [1435, 250], [1563, 331], [1639, 587]] },
      amb: { fires: [], rays: [], leaf: null, flies: null },
      props: [["barrel", 237, 434], ["crate", 1452, 465], ["brazier", 525, 289], ["brazier", 1164, 289], ["banner", 844, 276]],
      birds: [[1138, 70], [500, 180]], totem: [[887, 190], [1138, 150]], fauna: 'bat' },
    { id: 'hall', name: '宫殿大殿', wx: '殿内', img: 'art/map/forest_hall.webp', w: 2508, h: 1412, hidden: true, open: false, boss: 'gob_king', time: 120,
      foes: ['goblin', 'gob_blade', 'gob_archer'], desc: '被哥布林霸占的精灵王宫大殿。', grade: [['saturate', .94]],
      ground: { y0: 427, y1: 1275, pts: [[427, 0, 2508], [1275, 0, 2508]] },
      zone: { simple: true, start: [788, 635], main: [[1536, 592], [1519, 734], [1402, 850], [263, 850], [161, 787], [144, 736], [149, 512], [201, 390], [311, 311], [358, 298], [1326, 300], [1396, 322], [1482, 408]] },
      amb: { fires: [], rays: [], leaf: null, flies: null },
      props: [["banner", 422, 381], ["banner", 1258, 381], ["brazier", 311, 574], ["brazier", 1369, 574], ["crate", 562, 767]],
      birds: [[540, 60], [1190, 70], [250, 60]], totem: [[850, 150], [860, 65]], fauna: 'bat' },
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
// 11/26 外围天气版（第 2 站薄雾 / 第 3 站雨）：和 field 同构图，营火和火把位置不变；晴天光柱已画进 forest_sun，雾雨不要光柱
(function () { const f = window.DATA.maps.find(m => m.id === 'field');
  [['fieldmist', 'forest_mist'], ['fieldrain', 'forest_rain']].forEach(([id, img]) => window.DATA.maps.push(Object.assign({}, f, { id, img: 'art/map/' + img + '.webp', hidden: true, open: false, wx: id === 'fieldrain' ? '雨' : '薄雾', amb: Object.assign({}, f.amb, { rays: [] }, id === 'fieldrain' ? { rain: 1, leaf: null, flies: null } : {}) }))); })();
window.DATA.calc = function (b) {
  const DATA = window.DATA;
  const fx = {}, add = o => { for (const k in (o || {})) fx[k] = (fx[k] || 0) + o[k]; };
  for (const e of (b.items || [b.item])) { const id = e && e.id || e, it = DATA.startItems.find(i => i.id === id) || {}, m = DATA.oathLv[Math.min(5, (e && e.lv) || 1) - 1];
    const f = {}; for (const k in (it.fx || {})) { f[k] = it.fx[k] * (it.d ? m : 1); if (it.cap && it.cap[k] != null) f[k] = it.cap[k] < 0 ? Math.max(it.cap[k], f[k]) : Math.min(it.cap[k], f[k]); } add(f); add(it.cost); } add(b.gfx); add((DATA.habits.find(h => h.id === b.habit) || {}).fx);
  const A = {}; for (const a of DATA.attrs) A[a.id] = (b.attrs && b.attrs[a.id] || 0) + (b.train && b.train[a.id] || 0) + (fx[a.id] || 0);
  const W = DATA.weapons[b.weapon] || DATA.weapons.sword, type = W.type || 'str';
  const out = {
    A, fx,
    dmg: (1 + .06 * A[type]) * (1 + (fx.dmg || 0)),        // 起手兵器那一系的伤害倍率
    spd: 1 + .02 * A.agi + (fx.spd || 0),                    // 出手速度倍率（冷却 ÷ 它）
    area: Math.min(1.6, Math.max(.8, 1 + .02 * A.int + (fx.area || 0))),
    move: 1 + (fx.move || 0),
    // 11/24 暴击分物理 / 魔法：暴击率 1% 起（物理 + 敏捷 1%/点，魔法 + 智力 1%/点，上限 60%）；暴击伤害 150% 起（物理 + 力量 2%/点，魔法 + 智力 2%/点）
    critP: Math.min(.6, Math.max(0, .01 + .01 * A.agi + (fx.crit || 0) + (fx.critP || 0))), critM: Math.min(.6, Math.max(0, .01 + .01 * A.int + (fx.crit || 0) + (fx.critM || 0))),
    critMulP: 1.5 + .02 * A.str + (fx.critMul || 0) + (fx.critMulP || 0), critMulM: 1.5 + .02 * A.int + (fx.critMul || 0) + (fx.critMulM || 0),
    eva: Math.min(.25, Math.max(0, .005 * A.agi + (fx.eva || 0))),   // 闪避：物理、魔法都能躲；敏捷 0.5%/点，上限 25%
    // 防御：受到的伤害 × 100 / (100 + 防御)，最多减 50%。物防 = 耐力 × 4 + 力量 × 1，魔防 = 耐力 × 4 + 智力 × 1，再加宝物
    pdef: Math.max(0, 4 * A.end + A.str + (fx.pdef || 0)), mdef: Math.max(0, 4 * A.end + A.int + (fx.mdef || 0)),
    hp: Math.round((55 + 10 * A.con + (fx.hp || 0)) * (1 + (fx.hpMul || 0))),
    xp: 1 + (fx.xp || 0), coin: fx.coin || 0, pick: 1 + (fx.pick || 0),
  };
  const r = c => Math.min(.5, c / (c + 100)); out.pIn = 1 - r(out.pdef); out.mIn = 1 - r(out.mdef);   // pIn / mIn：受到物理 / 魔法伤害的倍率
  return out;
};
// 能掉 / 能买的书：还没拿到的；第一章初阶、中阶一直有，高阶第 4 站起（精英、小头目随时可能掉），宗师第一章不出
window.DATA.setOf = function (slots) { const n = {}; for (const x of slots || []) { const S = x && window.DATA.skills[x.id]; if (S) n[S.sys] = (n[S.sys] || 0) + 1; } const on = {}; for (const [sys, L] of Object.entries(window.DATA.sets)) { let t = null; for (const tier of L) if ((n[sys] || 0) >= tier[0]) t = tier; if (t) on[sys] = t; } return { n, on }; };   // 11/24 羁绊统计
window.DATA.SYSK = { '剑': 'sword', '枪': 'spear', '弓': 'bow', '法杖': 'staff' };
// 能掉 / 能卖的宝物：武器专属的只在带了这一系技能时出
window.DATA.itemPool = function (run) { const S = window.DATA.skills, has = new Set([...run.slots, ...run.bag].filter(x => x && (x.kind === 'book' || !x.kind) && S[x.id]).map(x => window.DATA.SYSK[S[x.id].sys])); return window.DATA.startItems.filter(i => i.id !== 'purse' && (!i.w || has.has(i.w))); };
window.DATA.bookPool = function (own, st, rich) {
  const S = window.DATA.skills, ids = Object.keys(S).filter(id => !own.has(id) && S[id].tier < 4 && (S[id].tier < 3 || st >= 4 || rich));
  const w = id => [0, 3, 2, 1][S[id].tier]; return ids.flatMap(id => Array(w(id)).fill(id));   // 初阶 3 : 中阶 2 : 高阶 1
};

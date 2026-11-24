// 11/24 回塔顶台词：每句带条件，回来时挑「条件满足、还没说过」的；说完记进存档（xsyz-linesSeen）
// c = { n: 第几次回来, st: 死在第几站, boss: 死在首领战, win: 通关, wins: 通关次数, killer: 被什么打死, weapon, quick: 1 分钟内就死, stolen: 被偷过钱 }
window.LINES = [
  // 公主（每次必说 1 句，pri 大的先）
  { id: 'p1', who: 'p', pri: 99, if: c => c.n === 1, say: [['露米娜', '……太好了，召唤的线还连着。你回来了。']] },
  { id: 'p2', who: 'p', pri: 90, if: c => c.n === 2, say: [['露米娜', '被打倒，又站在这里……果然，你的身体和我们不一样。']] },
  { id: 'p3', who: 'p', pri: 95, if: c => c.n >= 3, say: [['露米娜', '我们的人倒下就不会再起来。只有你……会一直回来。']] },
  { id: 'p5', who: 'p', pri: 80, if: c => c.n >= 5, say: [['露米娜', '你又回来了。我好像开始习惯等你了。']] },
  { id: 'p8', who: 'p', pri: 95, if: c => c.n >= 8, say: [['露米娜', '这座塔以前有很多人。祭典的时候，从这里能看到整座城的灯。']] },
  { id: 'p12', who: 'p', pri: 85, if: c => c.n >= 12, say: [['露米娜', '每次你回来，身上的「乱码」好像都多了一点……疼吗？']] },
  { id: 'p15', who: 'p', pri: 95, if: c => c.n >= 15, say: [['露米娜', '父王最后一句话是「守住祭坛」。所以我一直在这里。']] },
  { id: 'p20', who: 'p', pri: 85, if: c => c.n >= 20, say: [['露米娜', '二十次了。你从来没有说过「不想打了」。……谢谢你。']] },
  { id: 'p25', who: 'p', pri: 95, if: c => c.n >= 25, say: [['露米娜', '如果裂缝合上了……你会回到屏幕的那一边吧。']] },
  { id: 'ps1', who: 'p', pri: 60, if: c => !c.win && c.st === 1, say: [['露米娜', '森林外围就……没关系，谁都有第一次。']] },
  { id: 'ps4', who: 'p', pri: 60, if: c => !c.win && c.st >= 4 && c.st <= 6, say: [['露米娜', '森林深处的哥布林更凶了。可是你走得比上次更远。']] },
  { id: 'ps7', who: 'p', pri: 60, if: c => !c.win && c.st >= 7 && !c.boss, say: [['露米娜', '营地……已经很接近王座了。']] },
  { id: 'pb', who: 'p', pri: 70, if: c => c.boss && !c.win, say: [['露米娜', '那个戴王冠的……你差一点就赢了。我看到了。']] },
  { id: 'pw1', who: 'p', pri: 100, if: c => c.win, say: [['露米娜', '你做到了……可是，裂缝还没有合上。']] },
  { id: 'pw2', who: 'p', pri: 70, if: c => c.wins >= 1 && !c.win, say: [['露米娜', '森林安静了。可是东边的古堡，乱码越来越浓。']] },
  // 公主说完了以后的日常话（可以重复）
  { id: 'pd1', who: 'p', pri: 0, rep: 1, say: [['露米娜', '回来了呢。']] }, { id: 'pd2', who: 'p', pri: 0, rep: 1, say: [['露米娜', '传送门我已经准备好了。']] }, { id: 'pd3', who: 'p', pri: 0, rep: 1, say: [['露米娜', '慢慢来，我会一直在这里。']] },
  // 大法师（点评死因）
  { id: 'm_bomb', who: 'm', pri: 50, if: c => c.killer === 'gob_bomb', say: [['大法师', '背着火药桶的那种，靠近你就会点火。离它们远一点。']] },
  { id: 'm_arch', who: 'm', pri: 50, if: c => c.killer === 'gob_archer', say: [['大法师', '哥布林弓手站得远，箭倒是射得很准。']] },
  { id: 'm_ride', who: 'm', pri: 50, if: c => c.killer === 'gob_wolf' || c.killer === 'gob_boar', say: [['大法师', '骑狼的家伙，冲起来连树都撞得断。地上的红线就是它的路。']] },
  { id: 'm_sham', who: 'm', pri: 50, if: c => c.killer === 'gob_shaman', say: [['大法师', '萨满的火会追着人跑。别跟它比耐心。']] },
  { id: 'm_ghost', who: 'm', pri: 50, if: c => c.killer === 'gob_ghost', say: [['大法师', '那些半透明的……打它们，剑会穿过去。法术倒是有用。']] },
  { id: 'm_rock', who: 'm', pri: 50, if: c => c.killer === 'gob_rock', say: [['大法师', '石头皮的哥布林，刀砍上去只会冒火花。']] },
  { id: 'm_elite', who: 'm', pri: 40, if: c => c.killerElite, say: [['大法师', '发着光的那种，是部落里的老兵。招式比普通的多一手。']] },
  { id: 'm_king', who: 'm', pri: 55, if: c => c.killer === 'gob_king', say: [['大法师', '王的招式，残血时会变。看清地上的红色，那是他要砸的地方。']] },
  { id: 'm_thief', who: 'm', pri: 45, if: c => c.stolen, say: [['大法师', '那只小咕噜……我年轻时也被它偷过。它活得比我还久。']] },
  // 两个士兵（互相调侃）
  { id: 's2', who: 's', pri: 20, if: c => c.n >= 2, say: [['士兵甲', '他又回来了。'], ['士兵乙', '这周第几次了？'], ['士兵甲', '我数到第七次就不数了。']] },
  { id: 's_thief', who: 's', pri: 30, if: c => c.stolen, say: [['士兵乙', '……被那个小东西偷了？'], ['士兵甲', '我们不会告诉别人的。']] },
  { id: 's_bow', who: 's', pri: 25, if: c => c.weapon === 'bow', say: [['士兵甲', '这次拿弓了。'], ['士兵乙', '上次拿剑也是这么说的。']] },
  { id: 's_staff', who: 's', pri: 25, if: c => c.weapon === 'staff', say: [['士兵乙', '法师大人，他抢了你的饭碗。'], ['大法师', '……哼。']] },
  { id: 's_quick', who: 's', pri: 30, if: c => c.quick, say: [['士兵甲', '这次好快。'], ['士兵乙', '嘘！']] },
  { id: 's10', who: 's', pri: 25, if: c => c.n >= 10, say: [['士兵乙', '要不要给他刻个名字在墙上？'], ['士兵甲', '墙不够刻。']] },
  { id: 's_boss', who: 's', pri: 30, if: c => c.boss && !c.win, say: [['士兵甲', '听说他见到王了。'], ['士兵乙', '真的假的？'], ['士兵甲', '真的，然后就回来了。']] },
  { id: 's_r1', who: 's', pri: 5, if: c => c.n >= 3, say: [['士兵乙', '站岗好无聊。'], ['士兵甲', '至少有个会复活的人陪我们。']] },
  { id: 's_r2', who: 's', pri: 5, if: c => c.n >= 4, say: [['士兵甲', '你说屏幕那一边是什么样子？'], ['士兵乙', '大概……没有哥布林吧。']] },
  { id: 's_w1', who: 's', pri: 40, if: c => c.win, say: [['士兵甲', '他真的打赢了！'], ['士兵乙', '……那我们还要站岗吗？'], ['士兵甲', '要。']] },
  { id: 's_w2', who: 's', pri: 20, if: c => c.wins >= 1, say: [['士兵乙', '我有点想去森林走走了。'], ['士兵甲', '先等哥布林搬走。']] },
  { id: 's12', who: 's', pri: 15, if: c => c.n >= 12, say: [['士兵乙', '他身上那些闪的是什么？'], ['士兵甲', '别看。看久了会头晕。']] },
];
// 挑这次要说的：公主 1 句（必说）+ 法师（死因对得上优先）或士兵 1 段
window.pickLines = function (c, seen) {
  const ok = l => (l.rep || !seen.has(l.id)) && (!l.if || l.if(c)), best = L => L.filter(ok).sort((a, b) => b.pri - a.pri || Math.random() - .5)[0];
  const out = [], p = best(LINES.filter(l => l.who === 'p' && !l.rep)) || LINES.filter(l => l.rep)[Math.random() * 3 | 0]; out.push(p);
  const m = best(LINES.filter(l => l.who === 'm')), s = best(LINES.filter(l => l.who === 's'));
  const two = m || (s && (s.pri >= 20 || Math.random() < .6) ? s : null); if (two) out.push(two);
  return out;
};

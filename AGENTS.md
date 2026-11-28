# 像素勇者 · 给 AI 助手（Claude / Codex）的项目规则

仓库：Bright-ShenJiahao/xiangsuyongzhe。开工前先读本文件和 docs/TODO.md。

## 推送规则（最重要）
- 只推送到 `preview` 分支。**不要推 `main`，不要合并到 `main`。**
- 只有用户明确说「上线」或「推送」时才动 `main`。
- 每次交付给一个能直接点开的试玩链接，用刚推送的**完整提交号**，不要留模板、不要用分支名（避免缓存）：
  `https://raw.githack.com/Bright-ShenJiahao/xiangsuyongzhe/<完整提交号>/index.html?debug&nofall`

## 做事方式
- 改动尽量小，只做基本检查（能运行、页面能打开），不要做大量测试。
- 平衡测试只在 GitHub Actions 上跑，不在本地跑。
- UI 改动要同时照顾手机竖屏和电脑。
- 切精灵图不要一刀切，切出来不能带相邻格的碎片。
- 改完在 docs/TODO.md 记一笔：做了什么、还差什么。

## 角色
- 新增角色的切帧、抠图、尺寸和锚点校准，以及给其他 AI 的提示词，见 [新增英雄动作帧接入](docs/新增英雄动作帧接入.md)。
- 新增可选角色（男 / 女 / 精灵 / 以后的新人物）时，所有显示勇者的地方都要接上：选人页小人、高塔开场（demo/intro.html 的 HSEX/HDIR）、宫殿（demo/palace.html 的 HS）、战斗（js/sprites.js heroSet）、ui.js 里传给 iframe 的 h= 参数。不要写成「是女就女，否则一律男」。

## 地图
- 外围地图（第 1–3 站：晴 / 薄雾 / 雨）和森林深处（第 4–6 站）的图是同构图。营火、火把、图腾、帐篷、瞭望塔的位置不能动，js/battle.js 里的氛围效果（火光、火星）坐标取自这些位置。
- 地图和站点对应见 js/data.js 的 `stationMap` 和 `maps`；调试下拉里有「跳到第 N 站」。

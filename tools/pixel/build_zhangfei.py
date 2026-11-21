"""张飞（11/22 试看：当小怪放进第一章）→ art/goblin/zhangfei（像素小图）+ art/goblin_hd/zhangfei（高清），帧名和哥布林一样。
用法（仓库根目录）：python3 tools/pixel/build_zhangfei.py
原图 art/src/zhangfei.jpg：绿底，4 行 × 6，第 24 格是头像。按连通块切（膨胀后分组，矛头、手不会被切掉）。
借帧（试看用，定下来再按要求出完整一套）：只有 1 帧站立 + 4 帧走，所以 idle1 用喊话那帧，walk 4/5 重复 3/2。"""
import json, os
import numpy as np, cv2
from PIL import Image
R0 = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); P = lambda *p: os.path.join(R0, 'art', *p)
PX_H = 52                                # 像素版站立高度（哥布林约 41）
a = np.array(Image.open(P('src', 'zhangfei.jpg')).convert('RGB')).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
bg = (g > 120) & (g - r > 40) & (g - b > 40); fg = cv2.morphologyEx((~bg).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(bool)
d = cv2.dilate(fg.astype(np.uint8), np.ones((9, 9), np.uint8)); n, lab, st, _ = cv2.connectedComponentsWithStats(d)
cells = [tuple(st[i][:4]) for i in range(1, n) if st[i][4] > 2000]
cells.sort(key=lambda c: (int((c[1] + c[3] / 2) // (a.shape[0] / 4)), c[0])); assert len(cells) == 24, len(cells)
def cut(i):
  x, y, w, h = cells[i]
  c = a[y:y + h, x:x + w].copy(); m = fg[y:y + h, x:x + w].copy()
  ys, xs = np.nonzero(m); c = c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
  edge = cv2.dilate((~m).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool) & m   # 去绿边
  rr, gg, bb = c[..., 0], c[..., 1], c[..., 2]; gr = edge & (gg > rr + 15) & (gg > bb + 15); c[gr] = (40, 22, 14)
  return Image.fromarray(np.dstack([c, m * 255]).astype(np.uint8), 'RGBA')
def anchor(im):
  al = np.array(im)[..., 3] > 0; ys, xs = np.nonzero(al); y1 = ys.max(); low = ys > y1 - (ys.max() - ys.min()) * .15
  return float(np.median(xs[low])), float(y1 + 1)
# 格子编号（0 起）：0 站立 1–4 走 5 低姿 / 6 刺 7 刺 8 冲刺 9 低姿 10 喊 11 挥手 / 12 枪往后 13 横扫 14 背身 15 蹲 16 举矛 17 单独的矛 / 18 受伤 19 躺地 20 被打飞 21 倒栽 22 跪 23 头像
NAMES = {'idle0': 0, 'idle1': 10, 'walk0': 1, 'walk1': 2, 'walk2': 3, 'walk3': 4, 'walk4': 3, 'walk5': 2, 'windup': 12, 'strike': 8, 'recover': 9, 'hurt': 18, 'fall': 20, 'down': 19}
hd0 = cut(0); R = round(hd0.height / PX_H, 3)
for d_ in ('goblin', 'goblin_hd'): os.makedirs(P(d_, 'zhangfei'), exist_ok=True)
JP = json.load(open(P('goblin', 'frames.json'))); JH = json.load(open(P('goblin_hd', 'frames.json'))); JP['zhangfei'] = {}; JH['zhangfei'] = {'_r': R}
for nm, i in NAMES.items():
  hd = cut(i); hd.save(P('goblin_hd', 'zhangfei', nm + '.png'), optimize=True); ax, ay = anchor(hd); JH['zhangfei'][nm] = [round(ax, 1), round(ay, 1)]
  w, h = max(1, round(hd.width / R)), max(1, round(hd.height / R)); A = np.array(hd).astype(float); al = A[..., 3:4] / 255
  pm = Image.fromarray(np.dstack([A[..., :3] * al, al * 255]).astype(np.uint8), 'RGBA').resize((w, h), Image.BOX); B = np.array(pm).astype(float); Al = B[..., 3:4] / 255
  rgb = np.where(Al > 0, B[..., :3] / np.maximum(Al, 1e-6), 0); px = Image.fromarray(np.dstack([rgb, (Al[..., 0] > .5) * 255]).clip(0, 255).astype(np.uint8), 'RGBA')
  px.save(P('goblin', 'zhangfei', nm + '.png')); ax, ay = anchor(px); JP['zhangfei'][nm] = [round(ax, 1), round(ay, 1)]
cut(23).save(P('goblin_hd', 'zhangfei', 'portrait.png'))
json.dump(JP, open(P('goblin', 'frames.json'), 'w'), ensure_ascii=False); json.dump(JH, open(P('goblin_hd', 'frames.json'), 'w'), ensure_ascii=False)
print('r', R, 'idle hd', hd0.size)

"""像素勇者：把出好的品红底动作图（art/src/hero.png、soldiers.png、boss.png）切帧、缩成真像素、打包成图集。
用法（仓库根目录）：python3 tools/pixel/build_atlas.py   → 写 art/hero/atlas.png + atlas.json（游戏直接读，不用再打包）
需要 Pillow、numpy、scipy。出图提示词见 docs/pixel/帝国风精进_出图提示词.md。
- 切帧按连通块（不是一刀切），小碎片（特效线、尘土）并到最近的帧（slice.py）。
- ART = 原图里一个像素点有几像素宽（帝国精进这套约 5）；首领缩得少一点（÷BOSSK），更大、像素更细。
- 加新角色：把新图放进 art/src/，在 MAP 里照样写「动作: [(第几行, 第几个), …]」，再在 js/data.js 里用上。"""
import json, os, sys
from PIL import Image
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slice import frames
R0 = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); P = lambda *p: os.path.join(R0, 'art', *p)
ART, BOSSK = 5.0, 1.6
MAP = {'hero': {'idle': [(0, 0), (0, 1)], 'run': [(1, 0), (1, 1), (1, 2)], 'atk': [(2, 0), (2, 1)], 'roll': [(3, 0), (3, 1)], 'hurt': [(4, 0)], 'dead': [(4, 1)], 'por': [(5, 0)]},
       'soldiers': {'dao_run': [(0, 0), (0, 1), (0, 2)], 'dao_atk': [(0, 3), (0, 4)], 'dao_hurt': [(1, 0)], 'dao_dead': [(1, 1)], 'qiang_run': [(2, 0), (2, 1), (2, 2)], 'qiang_atk': [(2, 3), (2, 4)], 'qiang_hurt': [(3, 0)], 'qiang_dead': [(3, 1)], 'dao_por': [(4, 0)], 'qiang_por': [(4, 1)]},
       'boss': {'idle': [(0, 0), (0, 1)], 'walk': [(0, 2), (0, 3), (0, 4)], 'charge': [(1, 0), (1, 1)], 'jump': [(2, 0), (2, 1), (2, 2)], 'hurt': [(3, 0)], 'dead': [(3, 1)], 'por': [(4, 0)]}}
def shrink(img, k):
  w, h = max(1, round(img.width / k)), max(1, round(img.height / k))
  a = np.array(img).astype(float); al = a[..., 3:4] / 255
  pm = Image.fromarray(np.dstack([a[..., :3] * al, al * 255]).clip(0, 255).astype(np.uint8), 'RGBA').resize((w, h), Image.BOX)
  b = np.array(pm).astype(float); A = b[..., 3:4] / 255
  rgb = np.where(A > 0, b[..., :3] / np.maximum(A, 1e-6), 0)
  keep = (A[..., 0] > .5) & ~((rgb[..., 0] - rgb[..., 1] > 50) & (rgb[..., 2] - rgb[..., 1] > 50))   # 去掉品红残边
  return Image.fromarray(np.dstack([rgb, keep * 255]).clip(0, 255).astype(np.uint8), 'RGBA')
def anchor(img):   # 脚底锚点：下半身有颜色的部分的水平中点 + 最低一行
  a = np.array(img).astype(int); al = a[..., 3] > 0; h = a.shape[0]
  mx, mn = a[..., :3].max(-1), a[..., :3].min(-1); sat = (mx - mn) / np.maximum(mx, 1)
  m = al & (sat > .25); m[: int(h * .45)] = False
  if m.sum() < 5: m = al
  return float(np.nonzero(m)[1].mean()), int(np.nonzero(al)[0].max()) + 1
def merge(a, b):   # 把掉在一旁的大刀并进倒地帧
  x0, y0 = min(a['x'], b['x']), min(a['y'], b['y']); x1, y1 = max(a['x'] + a['w'], b['x'] + b['w']), max(a['y'] + a['h'], b['y'] + b['h'])
  c = Image.new('RGBA', (x1 - x0, y1 - y0)); c.paste(a['img'], (a['x'] - x0, a['y'] - y0), a['img']); c.paste(b['img'], (b['x'] - x0, b['y'] - y0), b['img'])
  return dict(x=x0, y=y0, w=x1 - x0, h=y1 - y0, img=c)
sheets = {}
for n in MAP:
  R = frames(P('src', n + '.png'))
  if n == 'boss' and len(R[3]) == 3: R[3] = [R[3][0], merge(R[3][1], R[3][2])]
  k = ART / (BOSSK if n == 'boss' else 1)
  for an, idx in MAP[n].items():
    for (r, c) in idx: sheets.setdefault((n, an), []).append(shrink(R[r][c]['img'], k))
allims = [im for v in sheets.values() for im in v]
big = Image.new('RGBA', (sum(i.width + 2 for i in allims), max(i.height for i in allims))); x = 0; pos = []
for im in allims: big.paste(im, (x, 0)); pos.append(x); x += im.width + 2
q = big.convert('RGB').quantize(48, method=Image.Quantize.MEDIANCUT).convert('RGB'); big = Image.merge('RGBA', (*q.split(), big.split()[3]))   # 统一量化成 48 色，减少杂色
meta = {}; i = 0; AW = 1024; cx = cy = rh = 0; places = []
for key, ims in sheets.items():
  for im in ims:
    sub = big.crop((pos[i], 0, pos[i] + im.width, im.height)); i += 1
    if cx + sub.width > AW: cx = 0; cy += rh + 2; rh = 0
    places.append((key, sub, cx, cy)); cx += sub.width + 2; rh = max(rh, sub.height)
atlas = Image.new('RGBA', (AW, cy + rh))
for key, sub, x0, y0 in places:
  atlas.paste(sub, (x0, y0)); ax, ay = anchor(sub); meta.setdefault(key[0] + ':' + key[1], []).append([x0, y0, sub.width, sub.height, round(ax, 1), ay])
atlas.save(P('hero', 'atlas.png')); json.dump({'f': meta, 'art': ART}, open(P('hero', 'atlas.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print(atlas.size, {k: [m[3] for m in v] for k, v in meta.items() if k.endswith(':idle') or 'run' in k})

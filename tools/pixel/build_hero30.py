"""像素勇者：四把兵器各 30 帧的勇者（11/22 新出图）→ art/hero/atlas.png + atlas.json。
用法（仓库根目录）：python3 tools/pixel/build_hero30.py
原图（品红底，5 行 × 6）：art/src/hero30_<sword|spear|bow|staff>.png
  法杖第 23 帧原图多一只手，已经在原图上修掉（擦掉中间那只拳头，补杖身和衣服）。
- 切帧按连通块（slice.py），不是一刀切。
- 缩放按第 1 帧「头发顶到靴底」量，缩到和旧勇者一样高（37.6 像素）。
- 脚底锚点：每一行取这一行脚底的中位数当地面线（跳起那帧离地，就不会被拉回地面）。
- 帧名（skframes.js / 帧工具里用）：前 18 帧和最后 2 帧四把兵器一样，19–28 是各自的动作。
  另外 atk0 = 蓄力高姿、atk1 = 主出手帧、big0 = 举武器朝天，给老设置用。"""
import json, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slice import frames
BODY = 37.6                                   # 旧勇者头发顶到靴底的高度（像素）
def body_h(img):   # 头发顶到靴底：暖棕色像素的上下范围
  a = np.array(img).astype(float) / 255; al = a[..., 3] > .5; r, g, b = a[..., 0], a[..., 1], a[..., 2]
  m = al & (r > g + .12) & (g > b + .02) & (a[..., :3].max(-1) - a[..., :3].min(-1) > .3) & (r < .85); ys = np.nonzero(m)[0]; return ys.max() - ys.min()
def shrink(img, k):
  w, h = max(1, round(img.width / k)), max(1, round(img.height / k))
  a = np.array(img).astype(float); al = a[..., 3:4] / 255
  pm = Image.fromarray(np.dstack([a[..., :3] * al, al * 255]).clip(0, 255).astype(np.uint8), 'RGBA').resize((w, h), Image.BOX)
  b = np.array(pm).astype(float); A = b[..., 3:4] / 255
  rgb = np.where(A > 0, b[..., :3] / np.maximum(A, 1e-6), 0)
  keep = (A[..., 0] > .5) & ~((rgb[..., 0] - rgb[..., 1] > 50) & (rgb[..., 2] - rgb[..., 1] > 50))
  return Image.fromarray(np.dstack([rgb, keep * 255]).clip(0, 255).astype(np.uint8), 'RGBA')
def anchor(img):   # 脚底锚点：下半身有颜色部分的水平中点 + 最低一行（倒地帧另算：取身体中点）
  a = np.array(img).astype(int); al = a[..., 3] > 0; h = a.shape[0]
  mx, mn = a[..., :3].max(-1), a[..., :3].min(-1); sat = (mx - mn) / np.maximum(mx, 1)
  m = al & (sat > .25); m[: int(h * .45)] = False
  if m.sum() < 5: m = al
  return float(np.nonzero(m)[1].mean()), int(np.nonzero(al)[0].max()) + 1
R0 = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); P = lambda *p: os.path.join(R0, 'art', *p)
COMMON = [('idle', 2), ('run', 4), ('roll', 3), ('back', 1), ('hurt', 1), ('dead', 1), ('charge', 2), ('dash', 1), ('stop', 1), ('jump', 1), ('slam', 1)]
OWN = {
  'sword': [('slash', 3), ('chop', 2), ('upper', 2), ('spin', 2), ('thrust', 1)],
  'spear': [('thrust', 2), ('sweep', 3), ('lift', 2), ('twirl', 2), ('throw', 1)],   # thrust0 枪头朝后（11/22 用户：可用于横扫起手）
  'bow': [('shoot', 3), ('sky', 2), ('side', 1), ('kneel', 2), ('rapid', 1), ('lower', 1)],
  'staff': [('point', 2), ('raise', 2), ('stomp', 2), ('twirl', 2), ('palm', 2)],
}
TAIL = [('up', 1), ('finish', 1)]
MAIN = {'sword': ('slash', 1), 'spear': ('thrust', 1), 'bow': ('shoot', 1), 'staff': ('point', 1)}   # atk1 用哪帧
sheets = {}; anch = {}
for w in ['sword', 'spear', 'bow', 'staff']:
  R = frames(P('src', 'hero30_%s.png' % w)); assert [len(r) for r in R] == [6] * 5, (w, [len(r) for r in R])
  k = body_h(R[0][0]['img']) / BODY; L = COMMON + OWN[w] + TAIL; assert sum(n for _, n in L) == 30
  flat = [(f, int(np.median([int(g['y'] + g['h']) for g in row]))) for row in R for f in row]
  i = 0
  for an, n in L:
    for _ in range(n):
      f, gy = flat[i]; im = shrink(f['img'], k); sheets.setdefault((w, an), []).append(im)
      anch[id(im)] = (gy - int(f['y'])) / k; i += 1
  ch = sheets[(w, 'charge')][1]; ma = sheets[(w, MAIN[w][0])][MAIN[w][1]]; up = sheets[(w, 'up')][0]
  sheets[(w, 'atk')] = [ch, ma]; sheets[(w, 'big')] = [up]
  print(w, 'k=%.2f' % k, 'idle', sheets[(w, 'idle')][0].size)
uniq = []; seen = set()
for v in sheets.values():
  for im in v:
    if id(im) not in seen: seen.add(id(im)); uniq.append(im)
big = Image.new('RGBA', (sum(i.width + 2 for i in uniq), max(i.height for i in uniq))); x = 0; pos = {}
for im in uniq: big.paste(im, (x, 0)); pos[id(im)] = x; x += im.width + 2
q = big.convert('RGB').quantize(128, method=Image.Quantize.MAXCOVERAGE, dither=Image.Dither.NONE).convert('RGB'); big = Image.merge('RGBA', (*q.split(), big.split()[3]))
AW = 1024; cx = cy = rh = 0; place = {}
for im in uniq:
  sub = big.crop((pos[id(im)], 0, pos[id(im)] + im.width, im.height))
  if cx + sub.width > AW: cx = 0; cy += rh + 2; rh = 0
  place[id(im)] = (sub, cx, cy); cx += sub.width + 2; rh = max(rh, sub.height)
atlas = Image.new('RGBA', (AW, cy + rh)); meta = {}
for (w, an), ims in sheets.items():
  for im in ims:
    sub, x0, y0 = place[id(im)]; atlas.paste(sub, (x0, y0)); ax, _ = anchor(sub)
    meta.setdefault('hero:%s.%s' % (w, an), []).append([x0, y0, sub.width, sub.height, round(ax, 1), round(anch[id(im)])])
for (w, an) in list(sheets):
  if w == 'sword': meta['hero:' + an] = meta['hero:sword.' + an]   # 老代码用的 key → 剑
atlas.save(P('hero', 'atlas.png'))
json.dump({'f': meta, 'art': 'per-sheet-30', 'weapons': ['sword', 'spear', 'bow', 'staff'], 'own': {w: [a for a, _ in COMMON + OWN[w] + TAIL] for w in OWN}}, open(P('hero', 'atlas.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print(atlas.size)

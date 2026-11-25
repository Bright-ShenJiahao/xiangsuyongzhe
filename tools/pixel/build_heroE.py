"""11/26 精灵王子戈拉斯尔：四把兵器各 33 帧姿势表（品红底，7 列 × 5 行，最后一行 5 帧）→ art/heroE，图鉴 4 帧 → art/figure/e，立绘 → art/portrait/e.webp
用法（仓库根目录）：python3 tools/pixel/build_heroE.py
- 只取每张表前 30 帧（后 3 帧 普攻 ×2 / 大招 在图集里由 charge2 + 主出手帧 / up 拼出，和别的人物一致）。
- 缩放：每张表用「跑步 4 帧」的中位高度，对到同兵器的男主跑步帧高度（保证王子和阿远一样大）。
- 其余（切帧、锚点、图集排布）同 build_heroP.py。"""
import json, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slice import frames
R0 = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); P = lambda *p: os.path.join(R0, 'art', *p)
def shrink(img, k):
  w, h = max(1, round(img.width / k)), max(1, round(img.height / k))
  a = np.array(img).astype(float); al = a[..., 3:4] / 255
  pm = Image.fromarray(np.dstack([a[..., :3] * al, al * 255]).clip(0, 255).astype(np.uint8), 'RGBA').resize((w, h), Image.BOX)
  b = np.array(pm).astype(float); A = b[..., 3:4] / 255
  rgb = np.where(A > 0, b[..., :3] / np.maximum(A, 1e-6), 0)
  keep = (A[..., 0] > .5) & ~((rgb[..., 1] < 90) & (rgb[..., 0] > 150) & (rgb[..., 2] > 150))
  return Image.fromarray(np.dstack([rgb, keep * 255]).clip(0, 255).astype(np.uint8), 'RGBA')
def anchor(img):
  a = np.array(img).astype(int); al = a[..., 3] > 0; h = a.shape[0]
  mx, mn = a[..., :3].max(-1), a[..., :3].min(-1); sat = (mx - mn) / np.maximum(mx, 1)
  m = al & (sat > .25); m[: int(h * .45)] = False
  if m.sum() < 5: m = al
  return float(np.nonzero(m)[1].mean()), int(np.nonzero(al)[0].max()) + 1
REF = json.load(open(P('hero', 'atlas.json')))['f']
COMMON = [('idle', 2), ('run', 4), ('roll', 3), ('back', 1), ('hurt', 1), ('dead', 1), ('charge', 2), ('dash', 1), ('stop', 1), ('jump', 1), ('slam', 1)]
OWN = {
  'sword': [('slash', 3), ('chop', 2), ('upper', 2), ('spin', 2), ('thrust', 1)],
  'spear': [('thrust', 2), ('sweep', 3), ('lift', 2), ('twirl', 2), ('throw', 1)],
  'bow': [('shoot', 3), ('sky', 2), ('side', 1), ('kneel', 2), ('rapid', 1), ('lower', 1)],
  'staff': [('point', 2), ('raise', 2), ('stomp', 2), ('twirl', 2), ('palm', 2)],
}
TAIL = [('up', 1), ('finish', 1)]
MAIN = {'sword': ('slash', 1), 'spear': ('thrust', 1), 'bow': ('shoot', 1), 'staff': ('point', 1)}
sheets = {}; anch = {}
for w in ['sword', 'spear', 'bow', 'staff']:
  Rw = frames(P('src', 'heroE_%s.png' % w), dil=4); print(w, [len(r) for r in Rw]); assert [len(r) for r in Rw] == [7, 7, 7, 7, 5], (w, [len(r) for r in Rw])
  flatf = [f for row in Rw for f in row]
  runh = np.median([flatf[i]['h'] for i in range(2, 6)]); refh = np.median([f[3] for f in REF['hero:%s.run' % w]]); k = runh / refh
  L = COMMON + OWN[w] + TAIL; assert sum(n for _, n in L) == 30
  flat = [(f, int(np.median([int(g['y'] + g['h']) for g in row]))) for row in Rw for f in row]
  i = 0
  for an, n in L:
    for _ in range(n):
      f, gy = flat[i]; im = shrink(f['img'], k); sheets.setdefault((w, an), []).append(im); anch[id(im)] = (gy - int(f['y'])) / k; i += 1
  ch = sheets[(w, 'charge')][1]; ma = sheets[(w, MAIN[w][0])][MAIN[w][1]]; up = sheets[(w, 'up')][0]
  sheets[(w, 'atk')] = [ch, ma]; sheets[(w, 'big')] = [up]
  print(w, 'k=%.2f' % k, 'idle', sheets[(w, 'idle')][0].size, 'ref run h', refh)
uniq = []; seen = set()
for v in sheets.values():
  for im in v:
    if id(im) not in seen: seen.add(id(im)); uniq.append(im)
AW = 1024; cx = cy = rh = 0; place = {}
for im in uniq:
  if cx + im.width > AW: cx = 0; cy += rh + 2; rh = 0
  place[id(im)] = (cx, cy); cx += im.width + 2; rh = max(rh, im.height)
atlas = Image.new('RGBA', (AW, cy + rh)); meta = {}
for (w, an), ims in sheets.items():
  for im in ims:
    x0, y0 = place[id(im)]; atlas.paste(im, (x0, y0)); ax, _ = anchor(im)
    meta.setdefault('hero:%s.%s' % (w, an), []).append([x0, y0, im.width, im.height, round(ax, 1), round(anch[id(im)])])
for (w, an) in list(sheets):
  if w == 'sword': meta['hero:' + an] = meta['hero:sword.' + an]
os.makedirs(P('heroE'), exist_ok=True); atlas.save(P('heroE', 'atlas.png'))
json.dump({'f': meta, 'art': 'per-sheet-30', 'weapons': ['sword', 'spear', 'bow', 'staff'], 'own': {w: [a for a, _ in COMMON + OWN[w] + TAIL] for w in OWN}}, open(P('heroE', 'atlas.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print('atlas', atlas.size)

# 图鉴 4 帧（单行 4 个，品红底）：缩到高约 110，脚底锚点同 build_figures.py 的做法（按第 1 帧轮廓对齐）
Rf = frames(P('src', 'figureE.png'), dil=4); assert [len(r) for r in Rf] == [4], [len(r) for r in Rf]
os.makedirs(P('figure', 'e'), exist_ok=True); ims = []
kf = Rf[0][0]['h'] / 110
for i, g in enumerate(Rf[0]):
  im = shrink(g['img'], kf); im.save(P('figure', 'e', '%d.png' % i)); ims.append(np.array(im)[..., 3] > 0)
m0 = ims[0]; ys, xs = np.nonzero(m0); ax0 = float(np.median(xs[ys >= ys.max() - 3])); Lm = []
for mi in ims:
  best = (-1, 0)
  for dx in range(-20, 21):
    A = np.zeros((200, 220), bool); B = np.zeros((200, 220), bool); A[200 - m0.shape[0]:, 20:20 + m0.shape[1]] = m0
    ox = 20 + dx
    if ox < 0 or ox + mi.shape[1] > 220: continue
    B[200 - mi.shape[0]:, ox:ox + mi.shape[1]] = mi; sc = (A & B).sum()
    if sc > best[0]: best = (sc, dx)
  Lm.append([round(ax0 - best[1], 1), 0])
M = json.load(open(P('figure', 'meta.json'))); M['e'] = Lm; json.dump(M, open(P('figure', 'meta.json'), 'w')); print('figure', Lm, ims[0].shape)

# 立绘：白底 → 透明（从四边向里泛洪，只抠和边缘相连的近白色），缩到宽 800
from scipy import ndimage
a = np.array(Image.open(P('src', 'portraitE.png')).convert('RGB')).astype(int)
near = (a.min(-1) > 238)
lab, n = ndimage.label(near); edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bgm = np.isin(lab, list(edge)); bgm = ndimage.binary_dilation(bgm, iterations=1) & (a.min(-1) > 215)
al = (~bgm).astype(np.uint8) * 255; al = ndimage.gaussian_filter(al.astype(float), .8).clip(0, 255).astype(np.uint8)
im = Image.fromarray(np.dstack([a.astype(np.uint8), al]), 'RGBA'); im = im.resize((800, round(im.height * 800 / im.width)), Image.LANCZOS)
im.save(P('portrait', 'e.webp'), quality=92); print('portrait', im.size)

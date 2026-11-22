"""11/22 技能图标 / 技能书切图：按品红空隙带切（行带 → 列带，空白够宽才算缝），再按连通块去掉别格碎屑；去品红边，缩到 128 高。
输出 art/ui2/sk/<技能id>.png，书 art/ui2/bk_<sword|spear|bow|wand>.png"""
import numpy as np
from PIL import Image
from scipy import ndimage as nd
def bands(m, gap):
  on = (m.sum(1) >= 6) if m.ndim == 2 else m; out = []; s = None; z = 0
  for i, v in enumerate(on):
    if v:
      if s is None: s = i
      z = 0; e = i
    elif s is not None:
      z += 1
      if z >= gap: out.append((s, e + 1)); s = None
  if s is not None: out.append((s, e + 1))
  return out
def cut(path, nrow_cols, gap=10):
  a = np.array(Image.open(path).convert('RGBA')).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
  bg = (r > 200) & (b > 200) & (g < 90); fg = ~bg
  fg = nd.binary_opening(fg, iterations=2)
  rows = [x for x in bands(fg, gap) if x[1] - x[0] > 40]; out = []
  assert len(rows) == len(nrow_cols), (path, rows)
  for (y0, y1), nc in zip(rows, nrow_cols):
    sub = fg[y0:y1]; cols = [x for x in bands(sub.T, gap) if x[1] - x[0] > 30]
    while len(cols) > nc:   # 合并最近的两段
      k = min(range(len(cols) - 1), key=lambda i: cols[i + 1][0] - cols[i][1]); cols[k] = (cols[k][0], cols[k + 1][1]); del cols[k + 1]
    assert len(cols) == nc, (path, y0, cols)
    for x0, x1 in cols:
      m = fg[y0:y1, x0:x1]; lab, n = nd.label(nd.binary_dilation(m, iterations=6)); sz = nd.sum(m, lab, range(1, n + 1)); keep = lab == (int(np.argmax(sz)) + 1)
      ys, xs = np.nonzero(keep & m); bb = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
      t = a[y0:y1, x0:x1].copy(); al = np.where(keep & m, 255, 0)
      sp = (t[..., 0] > 170) & (t[..., 2] > 170) & (t[..., 1] < 120); al[sp] = (al[sp] * np.clip((t[..., 1][sp]) / 120, 0, 1)).astype(int)   # 品红渗边变透明
      t[..., 3] = al; im = Image.fromarray(t.astype(np.uint8)).crop(bb); s = 128 / max(im.size); im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
      c = Image.new('RGBA', (128, 128)); c.paste(im, ((128 - im.width) // 2, (128 - im.height) // 2), im); out.append(c)
  return out
import os
os.makedirs('art/ui2/sk', exist_ok=True)
SW = ['sword', 'whirl', 'guard', 'wave', 'phantom', 'flash', 'storm', 'holysword']
SP = ['spear', 'sweep', 'javelin', 'hundred', 'rising', 'drill', 'leap', 'dragon']
BW = ['bow', 'fan', 'homing', 'rain', 'barrage', 'pierce', 'cyclone', 'starfall']
ST = ['staff', 'nova', 'chain', 'pillar', 'orbs', 'thunder', 'blizzard', 'abyss']
for f, ids, rc, gp in (('sword', SW, [4, 4], 10), ('spear', SP, [4, 4], 10), ('bow', BW, [4, 4], 10), ('staff_b', ['_book'] + ST, [3, 3, 3], 3)):
  for k, im in zip(ids, cut(f'art/src/skillicons/{f}.png', rc, gp)):
    if k != '_book': im.save(f'art/ui2/sk/{k}.png')
for k, im in zip(['bk_sword', 'bk_spear', 'bk_bow', 'bk_wand'], cut('art/src/skillicons/books4.png', [4])): im.save(f'art/ui2/{k}.png')
print('ok')

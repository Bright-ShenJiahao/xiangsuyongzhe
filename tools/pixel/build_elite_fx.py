"""11/24 精英 / 首领投射物：art/src/elite_fx.png（品红底，3 行）→ art/fx/elite/*.png（按同一比例缩到游戏像素大小）
紫色东西会被一般的品红判定吃掉，所以每块用「从边缘连通的品红才算背景」重新抠"""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slice import frames
import numpy as np
from PIL import Image
from scipy import ndimage
SRC = 'art/src/elite_fx.png'; R = frames(SRC, dil=10); print([len(r) for r in R])
assert [len(r) for r in R] == [6, 10, 3], [len(r) for r in R]
N = [['axe', 'boomer', 'hook', 'stone', 'shield', 'dizzy'], ['orb0', 'orb1', 'wisp0', 'wisp1', 'curse0', 'curse1', 'mine0', 'mine1', 'ball0', 'ball1'], ['fire0', 'fire1', 'fire2']]
src = np.array(Image.open(SRC).convert('RGB')).astype(int); S = .17
for row, names in zip(R, N):
  for f, n in zip(row, names):
    p = 6; y0, x0 = max(0, f['y'] - p), max(0, f['x'] - p); a = src[y0:f['y'] + f['h'] + p, x0:f['x'] + f['w'] + p]
    r, g, b = a[..., 0], a[..., 1], a[..., 2]; bg = ((r - g > 80) & (b - g > 80) & (r > 140) & (b > 140)) if not n.startswith("wisp") else ((r > 225) & (g < 40) & (b > 225))
    lab, _ = ndimage.label(bg); edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    al = np.where(np.isin(lab, list(edge)), 0, 255); im = Image.fromarray(np.dstack([a, al]).astype(np.uint8)); im = im.crop(im.getbbox())
    w, h = max(1, round(im.width * S)), max(1, round(im.height * S)); x = np.array(im.resize((w, h), Image.BOX)); x[..., 3] = np.where(x[..., 3] > 110, 255, 0)
    Image.fromarray(x).save(f'art/fx/elite/{n}.png'); print(n, w, h)

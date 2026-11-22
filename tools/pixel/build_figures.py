"""图鉴展示小人：art/src/figures2.png（4 行 × 4 帧，品红底）→ art/figure/<key>/0..3.png + meta.json（脚底锚点，按第 1 帧轮廓对齐）"""
import sys, os, json; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slice import frames
import numpy as np
from PIL import Image
SRC = sys.argv[1] if len(sys.argv) > 1 else 'art/src/figures2.png'; keys = ['m', 'f', 'goblin', 'gob_blade']
R = frames(SRC, dil=4); assert [len(r) for r in R] == [4] * 4, [len(r) for r in R]
M = json.load(open('art/figure/meta.json')) if os.path.exists('art/figure/meta.json') else {}
for k, row in zip(keys, R):
  os.makedirs(f'art/figure/{k}', exist_ok=True); ims = []
  for i, g in enumerate(row):
    a = np.array(g['img'].convert('RGBA')).astype(int); r, gg, b = a[..., 0], a[..., 1], a[..., 2]
    pk = (a[..., 3] > 0) & (r - gg > 40) & (b - gg > 40); dark = pk & (np.maximum(r, b) < 170); a[dark, :3] = (30, 14, 18); a[pk & ~dark, 3] = 0
    im = Image.fromarray(a.astype(np.uint8)); im = im.resize((round(im.width / 2), round(im.height / 2)), Image.NEAREST); im.save(f'art/figure/{k}/{i}.png'); ims.append(np.array(im)[..., 3] > 0)
  m0 = ims[0]; ys, xs = np.nonzero(m0); ax0 = float(np.median(xs[ys >= ys.max() - 3])); L = []
  for mi in ims:
    best = (-1, 0)
    for dx in range(-20, 21):
      A = np.zeros((200, 220), bool); B = np.zeros((200, 220), bool); A[200 - m0.shape[0]:, 20:20 + m0.shape[1]] = m0
      ox = 20 + dx
      if ox < 0 or ox + mi.shape[1] > 220: continue
      B[200 - mi.shape[0]:, ox:ox + mi.shape[1]] = mi; sc = (A & B).sum()
      if sc > best[0]: best = (sc, dx)
    L.append([round(ax0 - best[1], 1), 0])
  M[k] = L
json.dump(M, open('art/figure/meta.json', 'w')); print(M)

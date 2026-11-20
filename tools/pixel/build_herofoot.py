"""骑兵画风勇者：把 art/src/hero_cav.png（品红底，8 行）按连通块切帧，去掉品红残边，存成 art/cav/herofoot/*.png + meta.js。
用法（仓库根目录）：python3 tools/pixel/build_herofoot.py
行：1–5 走路（朝右/右下/下/右上/上 各 6 帧），6 待机 5 张，7 挥剑 5 张，8 受击、倒地、头像。"""
import json, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slice import frames
R0 = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(R0, 'art', 'cav', 'herofoot'); os.makedirs(OUT, exist_ok=True)
DIRS = ['E', 'SE', 'S', 'NE', 'N']
R = frames(os.path.join(R0, 'art', 'src', 'hero_cav.png'))
assert [len(r) for r in R] == [6, 6, 6, 6, 6, 5, 5, 3], [len(r) for r in R]
def clean(img):   # 去掉品红残边
  a = np.array(img).astype(int); r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
  pink = (r - g > 60) & (b - g > 60); a[..., 3] = np.where(pink, 0, al); return Image.fromarray(a.astype(np.uint8), 'RGBA')
def anchor(img, noslash=False):  # 脚底：最下面 10% 的不透明像素的水平中点 + 最低一行；挥剑帧先把刀光（亮白/淡紫）去掉再量
  a = np.array(img).astype(int); al = a[..., 3] > 0
  if noslash: r, g, b = a[..., 0], a[..., 1], a[..., 2]; al &= ~((np.minimum(np.minimum(r, g), b) > 165) | ((b > g + 25) & (r > 140)))
  ys, xs = np.nonzero(al); bot = ys.max(); m = ys >= bot - max(4, int(img.height * .1))
  return round(float(xs[m].mean()), 1), int(bot) + 1
meta = {'dirs': DIRS, 'walk': [], 'idle': [], 'atk': [], 'hurt': None, 'down': None, 'portrait': None}
def save(img, name):
  img = clean(img); img.save(os.path.join(OUT, name + '.png')); ax, ay = anchor(img, name.startswith('atk')); return {'w': img.width, 'h': img.height, 'ax': ax, 'ay': ay}
for d, row in zip(DIRS, R[:5]): meta['walk'].append([save(f['img'], f'{d}{i}') for i, f in enumerate(row)])
meta['idle'] = [save(f['img'], 'idle' + d) for d, f in zip(DIRS, R[5])]
meta['atk'] = [save(f['img'], 'atk' + d) for d, f in zip(DIRS, R[6])]
for n, f in zip(['hurt', 'down', 'portrait'], R[7]): meta[n] = save(f['img'], n)
open(os.path.join(OUT, 'meta.js'), 'w').write('window.HEROFOOT=' + json.dumps(meta) + ';\n')
print('ok', meta['walk'][0][0], meta['atk'][0])

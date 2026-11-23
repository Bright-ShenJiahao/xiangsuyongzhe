"""普通哥布林重画（11/24）：art/src/goblin_v2.png（品红底，3 行：待机2+走路6 / 抬手 砸下 收招 受伤 倒下 躺地 / 图鉴4）
→ art/goblin/goblin（像素，idle 高 40）、art/goblin_hd/goblin（高清，idle 高 79）、art/figure/goblin（图鉴）+ 各自的锚点"""
import sys, os, json; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slice import frames
import numpy as np
from PIL import Image
R = frames('art/src/goblin_v2.png', dil=6); assert [len(r) for r in R] == [8, 6, 4], [len(r) for r in R]
NAMES = ['idle0', 'idle1'] + [f'walk{i}' for i in range(6)] + ['windup', 'strike', 'recover', 'hurt', 'fall', 'down']
SPR = R[0] + R[1]; H0 = SPR[0]['h']

def clean(img):
  a = np.array(img.convert('RGBA')).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
  pk = (a[..., 3] > 0) & (r - g > 40) & (b - g > 40); dark = pk & (np.maximum(r, b) < 170); a[dark, :3] = (30, 14, 18); a[pk & ~dark, 3] = 0
  return Image.fromarray(a.astype(np.uint8))

def shrink(img, s):
  w, h = max(1, round(img.width * s)), max(1, round(img.height * s))
  a = np.array(img.resize((w, h), Image.BOX)); a[..., 3] = np.where(a[..., 3] > 110, 255, 0); return Image.fromarray(a)

def anchor(im, name):
  a = np.array(im)[..., 3] > 0; ys, xs = np.nonzero(a); bot = ys.max()
  row = sorted(set(xs[ys >= bot - 2]))          # 最下面 3 行的像素列，分成一段段（脚 / 棒子 / 碎土）
  segs, cur = [], [row[0]]
  for x in row[1:]:
    if x - cur[-1] > max(2, im.width // 20): segs.append(cur); cur = [x]
    else: cur.append(x)
  segs.append(cur)
  if name in ('strike', 'recover'): segs = segs[:2] if len(segs) > 2 else segs[:1]   # 只取脚，不要地上的棒子
  if name in ('fall', 'down'): xs2 = xs[ys >= bot - im.height // 3]; return [round(float(np.median(xs2)), 1), float(bot + 1)]
  pts = [x for s in segs[:2] for x in s]; return [round((min(pts) + max(pts) + 1) / 2, 1), float(bot + 1)]

for out, h in (('art/goblin', 40), ('art/goblin_hd', 79)):
  s = h / H0; fj = json.load(open(f'{out}/frames.json')); F = {}
  for n, f in zip(NAMES, SPR):
    im = shrink(clean(f['img']), s); im.save(f'{out}/goblin/{n}.png'); F[n] = anchor(im, n)
  if out.endswith('hd'): F['_r'] = fj['goblin'].get('_r', 1.975)
  fj['goblin'] = F; json.dump(fj, open(f'{out}/frames.json', 'w'), ensure_ascii=False, separators=(',', ':')); print(out, F)

# 图鉴：高 101（和旧的一样），脚底中点对齐第 1 帧
M = json.load(open('art/figure/meta.json')); s = 101 / R[2][0]['h']; L = []
for i, f in enumerate(R[2]):
  im = shrink(clean(f['img']), s); im.save(f'art/figure/goblin/{i}.png'); ax, _ = anchor(im, 'idle0'); L.append([ax, 0])
M['goblin'] = L; json.dump(M, open('art/figure/meta.json', 'w')); print('figure', L)

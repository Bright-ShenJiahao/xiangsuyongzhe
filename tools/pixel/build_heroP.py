"""11/22 公主露米娜 · 剑 30 帧（同 build_hero30 帧名）→ art/heroP。以后可选角色用；其余武器出图后加进来。
调试面板「人物帧：旧 / 新」（localStorage xsyz-hf=new）切换对比。高度 = 旧男主站立高。去品红边，不压色。"""
import json, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slice import frames
R0 = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); P = lambda *p: os.path.join(R0, 'art', *p)
def clean(img):
  a = np.array(img.convert('RGBA')).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
  pk = (a[..., 3] > 0) & (r - g > 60) & (b - g > 60) & (r > 150); a[pk, 3] = 0
  ed = (a[..., 3] > 0) & (g < 70) & (r > 170) & (b > 170); a[ed, :3] = (40, 20, 50)   # 只压纯品红渗边（公主头发是淡紫，不能动）
  return Image.fromarray(a.astype(np.uint8), 'RGBA')
def shrink(im, k):
  w, h = max(1, round(im.width * k)), max(1, round(im.height * k)); A = np.array(im).astype(float); al = A[..., 3:4] / 255
  pm = Image.fromarray(np.dstack([A[..., :3] * al, al * 255]).astype(np.uint8), 'RGBA').resize((w, h), Image.BOX); B = np.array(pm).astype(float); Al = B[..., 3:4] / 255
  rgb = np.where(Al > 0, B[..., :3] / np.maximum(Al, 1e-6), 0); return Image.fromarray(np.dstack([rgb, (Al[..., 0] > .5) * 255]).clip(0, 255).astype(np.uint8), 'RGBA')
def anchor_x(im):
  al = np.array(im)[..., 3] > 0; ys, xs = np.nonzero(al); low = ys > ys.max() - (ys.max() - ys.min()) * .12; return float(np.median(xs[low]))
J0 = json.load(open(P('hero', 'atlas.json'))); oh = J0['f']['hero:sword.idle'][0][3]
names = [('idle', 2), ('run', 4), ('roll', 3), ('back', 1), ('hurt', 1), ('dead', 1), ('charge', 2), ('dash', 1), ('stop', 1), ('jump', 1), ('slam', 1), ('slash', 3), ('chop', 2), ('upper', 2), ('spin', 2), ('thrust', 1), ('up', 1), ('finish', 1)]
for key, src in (('heroP', 'hero30p_sword.png'),):
  R = frames(P('src', src), dil=4); assert [len(r) for r in R] == [6] * 5; k = oh * 1.0 / R[0][0]['h']; F = []
  for row in R:
    gy = int(np.median([int(g['y'] + g['h']) for g in row]))
    for f in row: im = shrink(clean(f['img']), k); F.append((im, (gy - int(f['y'])) * k))
  sheets = {}; i = 0
  for n, c in names:
    for _ in range(c): sheets.setdefault(n, []).append(F[i]); i += 1
  sheets['atk'] = [sheets['charge'][1], sheets['slash'][1]]; sheets['big'] = [sheets['up'][0]]
  uniq = []; [uniq.append(x) for v in sheets.values() for x in v if all(x is not u for u in uniq)]
  AW = 1024; cx = cy = rh = 0; pos = {}
  for im, _ in uniq:
    if cx + im.width > AW: cx = 0; cy += rh + 2; rh = 0
    pos[id(im)] = (cx, cy); cx += im.width + 2; rh = max(rh, im.height)
  atl = Image.new('RGBA', (AW, cy + rh)); meta = {}
  for n, L in sheets.items():
    for im, ay in L: x, y = pos[id(im)]; atl.paste(im, (x, y)); meta.setdefault('hero:sword.' + n, []).append([x, y, im.width, im.height, round(anchor_x(im), 1), round(ay)])
  os.makedirs(P(key), exist_ok=True); atl.save(P(key, 'atlas.png')); json.dump({'f': meta}, open(P(key, 'atlas.json'), 'w')); print(key, atl.size)

"""11/22 新画风试用（HD 像素、2.5 头身、有色描边）：男主剑 30 帧 → art/heroN；哥布林 30 帧 → art/goblin_n/goblin + frames.json。
游戏里调试面板「画风：旧 / 新」切换（localStorage xsyz-style）。只有男主拿剑和普通哥布林有新图，其余照旧。
大小：男主站立高 = 旧男主站立高 × 1.1；哥布林站立高 = 旧哥布林 × 1.1。不压色，去品红边。"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slice import frames
R0 = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); P = lambda *p: os.path.join(R0, 'art', *p)
def clean(img):
  a = np.array(img.convert('RGBA')).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
  pk = (a[..., 3] > 0) & (r - g > 30) & (b - g > 30); dark = pk & (np.maximum(r, b) < 170); a[dark, :3] = (30, 14, 18); a[pk & ~dark, 3] = 0
  return Image.fromarray(a.astype(np.uint8), 'RGBA')
def shrink(im, k):
  w, h = max(1, round(im.width * k)), max(1, round(im.height * k)); A = np.array(im).astype(float); al = A[..., 3:4] / 255
  pm = Image.fromarray(np.dstack([A[..., :3] * al, al * 255]).astype(np.uint8), 'RGBA').resize((w, h), Image.BOX); B = np.array(pm).astype(float); Al = B[..., 3:4] / 255
  rgb = np.where(Al > 0, B[..., :3] / np.maximum(Al, 1e-6), 0); return Image.fromarray(np.dstack([rgb, (Al[..., 0] > .5) * 255]).clip(0, 255).astype(np.uint8), 'RGBA')
def anchor_x(im):
  al = np.array(im)[..., 3] > 0; ys, xs = np.nonzero(al); low = ys > ys.max() - (ys.max() - ys.min()) * .15; return float(np.median(xs[low]))
def cut(path, target_h):
  R = frames(path, dil=4); assert [len(r) for r in R] == [6] * 5; k = target_h / R[0][0]['h']; out = []
  for row in R:
    gy = int(np.median([int(g['y'] + g['h']) for g in row]))
    for f in row: im = shrink(clean(f['img']), k); out.append((im, (gy - int(f['y'])) * k))
  return out
# ---- 男主（剑）：帧名同 build_hero30 ----
J0 = json.load(open(P('hero', 'atlas.json'))); oh = J0['f']['hero:sword.idle'][0][3]
F = cut(P('src', 'heroN_sword.png'), oh * 1.1)
names = [('idle', 2), ('run', 4), ('roll', 3), ('back', 1), ('hurt', 1), ('dead', 1), ('charge', 2), ('dash', 1), ('stop', 1), ('jump', 1), ('slam', 1), ('slash', 3), ('chop', 2), ('upper', 2), ('spin', 2), ('thrust', 1), ('up', 1), ('finish', 1)]
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
os.makedirs(P('heroN'), exist_ok=True); atl.save(P('heroN', 'atlas.png')); json.dump({'f': meta}, open(P('heroN', 'atlas.json'), 'w'))
# ---- 哥布林：用到的帧名 ----
gh = Image.open(P('goblin', 'goblin', 'idle0.png')).height; G = cut(P('src', 'goblinN.png'), gh * 1.1)
GN = {'idle0': 0, 'idle1': 1, 'walk0': 2, 'walk1': 3, 'walk2': 4, 'walk3': 5, 'walk4': 2, 'walk5': 3, 'windup': 18, 'strike': 19, 'recover': 20, 'hurt': 10, 'fall': 9, 'down': 11}
d = P('goblin_n', 'goblin'); os.makedirs(d, exist_ok=True); GJ = {'goblin': {}}
for nm, i in GN.items(): im, ay = G[i]; im.save(os.path.join(d, nm + '.png')); GJ['goblin'][nm] = [round(anchor_x(im), 1), round(ay, 1)]
json.dump(GJ, open(P('goblin_n', 'frames.json'), 'w')); print('ok', atl.size)

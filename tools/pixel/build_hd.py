"""高清版勇者和哥布林（11/22 用户要看高清效果）：按原图清晰度切，不缩成像素小图。
用法（仓库根目录）：python3 tools/pixel/build_hd.py [哥布林原图目录]
  默认哥布林原图目录：../bright-shenjiahao/sanguoxingcunzhe/art_src/characters（异世界幸存者仓库）
输出：
  art/herohd/atlas.webp + atlas.json —— 勇者四把兵器各 30 帧（原图 art/src/hero30_*.png），帧名和 build_hero30.py 一样；json 里 r = 原图比像素版大几倍
  art/goblin_hd/<兵种>/<帧>.png + frames.json —— 帧名和 art/goblin 一样；锚点 = 像素版锚点 × r
切法：都按连通块，不一刀切。"""
import json, os, sys
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slice import frames
R0 = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); P = lambda *p: os.path.join(R0, 'art', *p)
GSRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(R0, '..', 'bright-shenjiahao', 'sanguoxingcunzhe', 'art_src', 'characters')

# ---------- 勇者 ----------
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build_hero30.py'), encoding='utf-8').read()
ns = {'__file__': os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build_hero30.py')}; exec(src.split('sheets = {}; anch = {}')[0], ns)   # 拿 COMMON / OWN / TAIL / MAIN / body_h / anchor / BODY
COMMON, OWN, TAIL, MAIN, body_h, anchor, BODY = (ns[k] for k in ('COMMON', 'OWN', 'TAIL', 'MAIN', 'body_h', 'anchor', 'BODY'))
def rgba(f):
  im = f['img'].convert('RGBA'); a = np.array(im); r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
  a[..., 3] = np.where((a[..., 3] > 0) & ~((r - g > 60) & (b - g > 60)), 255, 0); return Image.fromarray(a)
sheets = {}; anch = {}; ks = []
for w in ['sword', 'spear', 'bow', 'staff']:
  R = frames(P('src', 'hero30_%s.png' % w)); assert [len(r) for r in R] == [6] * 5
  ks.append(body_h(R[0][0]['img']) / BODY); L = COMMON + OWN[w] + TAIL
  flat = [(f, int(np.median([int(g['y'] + g['h']) for g in row]))) for row in R for f in row]; i = 0
  for an, n in L:
    for _ in range(n):
      f, gy = flat[i]; im = rgba(f); sheets.setdefault((w, an), []).append(im); anch[id(im)] = gy - int(f['y']); i += 1
  sheets[(w, 'atk')] = [sheets[(w, 'charge')][1], sheets[(w, MAIN[w][0])][MAIN[w][1]]]; sheets[(w, 'big')] = [sheets[(w, 'up')][0]]
r = round(float(np.mean(ks)), 3)
uniq, seen = [], set()
for v in sheets.values():
  for im in v:
    if id(im) not in seen: seen.add(id(im)); uniq.append(im)
AW = 2048; cx = cy = rh = 0; place = {}
for im in uniq:
  if cx + im.width > AW: cx = 0; cy += rh + 2; rh = 0
  place[id(im)] = (cx, cy); cx += im.width + 2; rh = max(rh, im.height)
atlas = Image.new('RGBA', (AW, cy + rh)); meta = {}
for (w, an), ims in sheets.items():
  for im in ims:
    x0, y0 = place[id(im)]; atlas.paste(im, (x0, y0)); ax, _ = anchor(im)
    meta.setdefault('hero:%s.%s' % (w, an), []).append([x0, y0, im.width, im.height, round(ax, 1), anch[id(im)]])
for (w, an) in list(sheets):
  if w == 'sword': meta['hero:' + an] = meta['hero:sword.' + an]
os.makedirs(P('herohd'), exist_ok=True); atlas.save(P('herohd', 'atlas.webp'), lossless=True, method=6)
json.dump({'f': meta, 'r': r, 'own': {w: [a for a, _ in COMMON + OWN[w] + TAIL] for w in OWN}}, open(P('herohd', 'atlas.json'), 'w'), ensure_ascii=False)
print('hero hd', atlas.size, 'r', r)

# ---------- 哥布林 ----------
def fgmask(a):
  mag = (a[..., 0] > 150) & (a[..., 2] > 120) & (a[..., 1] < a[..., 0] - 60) & (a[..., 1] < a[..., 2] - 30)
  return cv2.morphologyEx((~mag).astype(np.uint8), cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)).astype(bool)
def crop(a, fg, x0, y0, x1, y1):
  m = fg[y0:y1, x0:x1]; ys, xs = np.nonzero(m); y0b, y1b, x0b, x1b = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
  c = a[y0:y1, x0:x1][y0b:y1b, x0b:x1b].copy(); m = m[y0b:y1b, x0b:x1b].copy()
  # 去品红边：边上 3 像素内偏品红的像素（红、蓝都比绿高很多）→ 深色描边；太浅的直接去掉
  edge = cv2.dilate((~m).astype(np.uint8), np.ones((7, 7), np.uint8)).astype(bool) & m
  r, g, b = c[..., 0], c[..., 1], c[..., 2]; pk = edge & (r - g > 35) & (b - g > 35)
  c[pk & (r + b < 330)] = (40, 18, 14); m[pk & (r + b >= 330)] = False
  return Image.fromarray(np.dstack([c, m * 255]).astype(np.uint8), 'RGBA')
def segments(prof, target):   # 同 sanguoxingcunzhe/tools/slice_goblins.py
  on = prof > 2; segs = []; st = None
  for x, v in enumerate(list(on) + [False]):
    if v and st is None: st = x
    if not v and st is not None: segs.append([st, x]); st = None
  while len(segs) > target:
    i = min(range(len(segs)), key=lambda i: segs[i][1] - segs[i][0])
    j = i - 1 if i == len(segs) - 1 or (i > 0 and segs[i][0] - segs[i - 1][1] < segs[i + 1][0] - segs[i][1]) else i + 1
    segs[min(i, j)] = [min(segs[i][0], segs[j][0]), max(segs[i][1], segs[j][1])]; segs.pop(max(i, j))
  while len(segs) < target:
    i = max(range(len(segs)), key=lambda i: segs[i][1] - segs[i][0]); s, e = segs[i]; w = e - s
    c = s + int(w * .25) + int(np.argmin(prof[s + int(w * .25):s + int(w * .75)])); segs[i:i + 1] = [[s, c], [c, e]]
  return segs
OLD = json.load(open(P('goblin', 'frames.json'))); OUTJ = {}
def save(kind, name, im):
  os.makedirs(P('goblin_hd', kind), exist_ok=True); im.save(P('goblin_hd', kind, name + '.png'), optimize=True)
  old = Image.open(P('goblin', kind, name + '.png')); rr = im.height / old.height
  ax, ay = OLD[kind][name]; OUTJ.setdefault(kind, {})[name] = [round(ax * rr, 1), round(ay * rr, 1)]; return rr
# 1) 小兵 / 弓手 / 大王：goblins.png，6 行（小兵、刀手、弓手、盾兵、萨满、大王）
a = np.array(Image.open(os.path.join(GSRC, 'enemies', 'goblins.png')).convert('RGB')).astype(int); fg = fgmask(a)
rp = fg.sum(1) > 3; rows = []; st = None
for y, v in enumerate(list(rp) + [False]):
  if v and st is None: st = y
  if not v and st is not None:
    if y - st > 30: rows.append((st, y))
    st = None
assert len(rows) == 6, rows
for kind, ri, n in [('goblin', 0, 15), ('gob_archer', 2, 16), ('gob_king', 5, 15)]:
  ya, yb = max(0, rows[ri][0] - 25), min(a.shape[0], rows[ri][1] + 4); segs = segments(fg[ya:yb].sum(0), n)
  names = ['idle0', 'idle1'] + ['walk%d' % i for i in range(6)] + (['windup', 'draw', 'strike', 'recover'] if kind == 'gob_archer' else ['windup', 'strike', 'recover']) + ['hurt', 'fall', 'down', 'extra']
  rs = []
  for nm, (s, e) in zip(names, segs):
    if nm == 'extra': nm = 'arrow' if kind == 'gob_archer' else None
    if not nm or not os.path.exists(P('goblin', kind, nm + '.png')): continue
    rs.append(save(kind, nm, crop(a, fg, s, ya, e, yb)))
  OUTJ[kind]['_r'] = round(float(np.median(rs)), 3); print(kind, len(rs), 'r', OUTJ[kind]['_r'])
# 2) 刀手：gob_blade_full.png，按格子（连通块膨胀后分组）：8 待机走路 / 抬手 出刀 收刀 / 蓄力 冲刺 喘气 / 受伤 倒飞 躺地(+掉的刀)
a = np.array(Image.open(os.path.join(GSRC, 'gob_blade_full.png')).convert('RGB')).astype(int); fg = fgmask(a)
d = cv2.dilate(fg.astype(np.uint8), np.ones((26, 26), np.uint8)); n, lab, stt, _ = cv2.connectedComponentsWithStats(d)
cells = [tuple(stt[i][:4]) for i in range(1, n) if stt[i][4] > 400]; cells.sort(key=lambda c: c[1] + c[3] / 2)
grp = []
for c in cells:
  cy = c[1] + c[3] / 2
  if grp and abs(cy - grp[-1][0]) < 60: grp[-1][1].append(c)
  else: grp.append([cy, [c]])
rowsB = [sorted(g[1]) for g in grp]; print('blade rows', [len(r) for r in rowsB])
NB = [['idle0', 'idle1'] + ['walk%d' % i for i in range(6)], ['windup', 'strike', 'recover'], ['charge', 'dash', 'tired'], ['hurt', 'fall', 'down']]
rs = []
for names, row in zip(NB, rowsB):
  assert len(row) == len(names), (names, row)
  for nm, (x, y, w, h) in zip(names, row): rs.append(save('gob_blade', nm, crop(a, fg, x, y, x + w, y + h)))
OUTJ['gob_blade']['_r'] = round(float(np.median(rs)), 3); print('gob_blade', len(rs), 'r', OUTJ['gob_blade']['_r'])
json.dump(OUTJ, open(P('goblin_hd', 'frames.json'), 'w'), ensure_ascii=False)

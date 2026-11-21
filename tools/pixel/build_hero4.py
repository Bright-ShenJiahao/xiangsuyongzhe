"""像素勇者：四套武器的勇者（剑、枪、弓、法杖，11/21 新出图）→ art/hero/atlas.png + atlas.json。
用法（仓库根目录）：python3 tools/pixel/build_hero4.py
原图（品红底）：art/src/hero_sb.png（上：剑 2 行，下：弓 2 行）、hero_spear.png、hero_staff.png，每套 12 帧，2 行 × 6：
  待机 2 · 跑 3 · 攻击 2（蓄力、出手）· 大招 1 · 翻滚 2 · 受伤 1 · 倒地 1
- 切帧按连通块（slice.py），不是一刀切；法杖图里宝石旁的小光点先去掉（特效由代码画）。
- 每张图的缩放按「头发顶到靴底」量，缩到和旧勇者一样高（约 37.6 像素），三张图大小一致。
- 图集 key：hero:<武器>.<动作>，例如 hero:spear.atk；另外 hero:<动作> 指向剑那套（老代码照用）。"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slice import frames
R0 = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); P = lambda *p: os.path.join(R0, 'art', *p)
BODY = 37.6                                   # 旧勇者头发顶到靴底的高度（像素）
ANIM = [('idle', 2), ('run', 3), ('atk', 2), ('big', 1), ('roll', 2), ('hurt', 1), ('dead', 1)]
def clean_small(path, minpx=400):   # 去掉小光点，存一张临时图再切
  a = np.array(Image.open(path).convert('RGB')).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
  bg = (r - g > 80) & (b - g > 80) & (r > 140) & (b > 140); lab, n = ndimage.label(~bg); sz = ndimage.sum(~bg, lab, range(1, n + 1))
  for i, s in enumerate(sz):
    if s < minpx: a[lab == i + 1] = (255, 0, 255)
  out = '/tmp/_hero4_clean.png'; Image.fromarray(a.astype(np.uint8)).save(out); return out
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
# 枪的待机两帧：手上方那截枪杆和手之间那截角度不一样（看起来弯了，11/21 用户指出）。
# 把手上方露在外面的那截（枪杆 + 枪头）绕握枪的手转到和下面那截同一个角度，只贴在背景上，手和身体保持在上面。
SPEAR_FIX = [  # 手心（转轴）、外露那截的起点 A 和枪尖 B、下面那截的两个点（定角度）
  dict(P=(183, 298), A=(190, 290), B=(266, 221), L=((152, 318), (172, 305))),
  dict(P=(468, 298), A=(475, 290), B=(551, 221), L=((437, 318), (457, 305)))]
def straighten(path):
  im = Image.open(path).convert('RGB'); a = np.array(im).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
  bg = (r - g > 80) & (b - g > 80) & (r > 140) & (b > 140); H, W = bg.shape; yy, xx = np.mgrid[0:H, 0:W]
  for F in SPEAR_FIX:
    (ax, ay), (bx, by), (px, py) = F['A'], F['B'], F['P']; dx, dy = bx - ax, by - ay; L2 = dx * dx + dy * dy
    t = ((xx - ax) * dx + (yy - ay) * dy) / L2; d = np.abs((xx - ax) * dy - (yy - ay) * dx) / np.sqrt(L2)
    m = ~bg & (t > -.02) & (t < 1.12) & (d < np.where(t > .5, 17, 11)) & (yy <= ay)
    near = (t > -.02) & (t < 1.15) & (d < 19) & (yy <= ay)   # 原来枪头边上和背景混色的一圈也一起擦掉
    (l0x, l0y), (l1x, l1y) = F['L']; up = np.degrees(np.arctan2(by - ay, bx - ax)); lo = np.degrees(np.arctan2(l1y - l0y, l1x - l0x))
    patch = np.zeros((H, W, 4), np.uint8); patch[m, :3] = a[m]; patch[m, 3] = 255
    rot = np.array(Image.fromarray(patch, 'RGBA').rotate(up - lo, resample=Image.NEAREST, center=(px, py)))   # PIL 正角度 = 逆时针
    a[near] = (255, 0, 255); bg2 = bg | near; put = (rot[..., 3] > 0) & bg2; a[put] = rot[put][:, :3]
  out = '/tmp/_hero4_spear.png'; Image.fromarray(a.astype(np.uint8)).save(out); return out
SRC = [('hero_sb', [('sword', 0), ('bow', 2)], False), ('hero_spear', [('spear', 0)], False), ('hero_staff', [('staff', 0)], True)]
sheets = {}
for name, sets, dots in SRC:
  path = P('src', name + '.png')
  if name == 'hero_spear': path = straighten(path)
  R = frames(clean_small(path) if dots else path)
  assert all(len(r) == 6 for r in R), (name, [len(r) for r in R])
  for w, r0 in sets:
    fr = [f['img'] for f in R[r0] + R[r0 + 1]]; k = body_h(fr[0]) / BODY; i = 0
    for an, n in ANIM:
      for _ in range(n): sheets.setdefault((w, an), []).append(shrink(fr[i], k)); i += 1
    print(w, 'k=%.2f' % k, 'idle', sheets[(w, 'idle')][0].size)
allims = [im for v in sheets.values() for im in v]
big = Image.new('RGBA', (sum(i.width + 2 for i in allims), max(i.height for i in allims))); x = 0; pos = []
for im in allims: big.paste(im, (x, 0)); pos.append(x); x += im.width + 2
q = big.convert('RGB').quantize(64, method=Image.Quantize.MEDIANCUT).convert('RGB'); big = Image.merge('RGBA', (*q.split(), big.split()[3]))   # 统一量化成 64 色（之后按颜色标部位换色）
meta = {}; i = 0; AW = 1024; cx = cy = rh = 0; places = []
for key, ims in sheets.items():
  for im in ims:
    sub = big.crop((pos[i], 0, pos[i] + im.width, im.height)); i += 1
    if cx + sub.width > AW: cx = 0; cy += rh + 2; rh = 0
    places.append((key, sub, cx, cy)); cx += sub.width + 2; rh = max(rh, sub.height)
atlas = Image.new('RGBA', (AW, cy + rh))
for (w, an), sub, x0, y0 in places:
  atlas.paste(sub, (x0, y0)); ax, ay = anchor(sub); meta.setdefault('hero:%s.%s' % (w, an), []).append([x0, y0, sub.width, sub.height, round(ax, 1), ay])
for an, _ in ANIM: meta['hero:' + an] = meta['hero:sword.' + an]   # 老代码用的 key → 剑
atlas.save(P('hero', 'atlas.png')); json.dump({'f': meta, 'art': 'per-sheet', 'weapons': ['sword', 'spear', 'bow', 'staff']}, open(P('hero', 'atlas.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print(atlas.size)

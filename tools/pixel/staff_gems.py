"""11/22 法杖宝珠：男主蓝圆珠 → 红圆珠；女主杖身换金色、保留蓝宝珠（11/22 跟立绘）。改打包好的图集（recolor_capes 之后跑）。
只动 hero:staff.* 帧；宝珠 = 帧里偏蓝的连通块（女主披风是亮蓝 → 只取最靠上的那块且面积小的）。"""
import json, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
R0 = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
def gem_mask(a):
  r, g, b = a[..., 0], a[..., 1], a[..., 2]; m = (a[..., 3] > 0) & (b > 140) & (b > r + 70) & (b > g + 30)
  lab, n = nd.label(m, structure=np.ones((3, 3)))
  if not n: return None
  sz = nd.sum(m, lab, range(1, n + 1)); objs = nd.find_objects(lab)
  c = [(o[0].start, i + 1) for i, o in enumerate(objs) if 4 <= sz[i] <= 90 and (o[0].stop - o[0].start) <= 12]
  if not c: return None
  core = lab == min(c)[1]; r2 = r - 0; near = nd.binary_dilation(core, iterations=1) & (a[..., 3] > 0) & (b > r + 25) & (b > 60)
  return core | near
def star(cx, cy, R):   # 六芒星：两个三角形
  import math
  t1 = [(cx + R * math.cos(math.radians(-90 + 120 * k)), cy + R * math.sin(math.radians(-90 + 120 * k))) for k in range(3)]
  t2 = [(cx + R * math.cos(math.radians(90 + 120 * k)), cy + R * math.sin(math.radians(90 + 120 * k))) for k in range(3)]
  return t1, t2
def run(name, female):
  P = os.path.join(R0, 'art', name, 'atlas.png'); J = json.load(open(P.replace('.png', '.json'))); A = np.array(Image.open(P).convert('RGBA')); done = set(); cnt = 0
  from PIL import ImageDraw
  for k, L in J['f'].items():
    if not k.startswith('hero:staff.'): continue
    for x, y, w, h, ax, ay in L:
      if (x, y) in done: continue
      done.add((x, y)); sub = A[y:y + h, x:x + w].copy(); m = gem_mask(sub.astype(int))
      if female:   # 杖身：浅木 → 深色木
        r, g, b = [sub[..., i].astype(int) for i in range(3)]
        wood = (sub[..., 3] > 0) & (r > 170) & (g > 130) & (b > 70) & (r - b > 40) & (r - b < 140) & (g < r)
        hair_skin = (r > 225) & (g > 170) & (b > 150)
        wood &= ~hair_skin
        L_ = ((r + g + b) / 3)[..., None]; t = np.clip((L_ - 140) / 110, 0, 1)
        sub[wood, :3] = (np.array([120, 78, 20]) + (np.array([250, 214, 110]) - np.array([120, 78, 20])) * t)[wood].astype(np.uint8)   # 11/22 跟立绘：金色杖身
      if m is not None and not female:   # 11/22 女主保留原来的蓝宝珠（跟立绘）
        ys, xs = np.nonzero(m); cy, cx = ys.mean(), xs.mean(); R = max(np.ptp(ys), np.ptp(xs)) / 2 + .5
        if not female:
          bb = sub[..., 2].astype(float); t = np.clip((bb - 140) / 115, 0, 1)
          sub[m, :3] = (np.array([150, 20, 20]) + (np.array([255, 120, 90]) - np.array([150, 20, 20])) * t[..., None])[m].astype(np.uint8)
        else:
          sub[nd.binary_dilation(m, iterations=1) & ~(sub[..., 3] == 0) & m, 3] = 0   # 先擦掉圆珠
          im = Image.fromarray(sub); d = ImageDraw.Draw(im); Rr = R * 1.45
          for tri in star(cx, cy, Rr + 1): d.polygon(tri, fill=(40, 10, 50, 255))
          for tri in star(cx, cy, Rr): d.polygon(tri, fill=(170, 80, 240, 255))
          d.point((round(cx), round(cy)), fill=(240, 210, 255, 255)); sub = np.array(im)
        cnt += 1
      A[y:y + h, x:x + w] = sub
  Image.fromarray(A).save(P); print(name, cnt)
run('hero', False); run('heroF', True)

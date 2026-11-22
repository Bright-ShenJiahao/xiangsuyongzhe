"""立绘抠图：art/src/portraits2.png（男左女右，白底）→ art/portrait/m|f.webp
背景 = 外圈连通近白 + 被头发围住的大块近白（但金属高光、宝珠高光保留）；边缘按白度软透明并反推颜色去白边。"""
from PIL import Image
import numpy as np
from scipy import ndimage as nd
src = Image.open('art/src/portraits2.png').convert('RGBA')
KEEP = {'f': [(573, 255, 55)], 'm': []}   # 保护圈（裁后坐标 x, y, r）：女主宝珠
for k, (x0, x1) in {'m': (0, 667), 'f': (787, 1536)}.items():
  a = np.array(src.crop((x0, 0, x1, 1024))).astype(float); rgb = a[..., :3]; mn = rgb.min(-1); sp = rgb.max(-1) - mn; H, W = mn.shape
  w1 = (mn > 200) & (sp < 28); lab, n = nd.label(w1); edge = set(np.unique(np.r_[lab[0], lab[:, 0], lab[:, -1]])) - {0}; bg = np.isin(lab, list(edge))
  w2 = (mn > 222) & (sp < 18); lab2, n2 = nd.label(w2); yy, xx = np.mgrid[:H, :W]
  prot = np.zeros_like(mn, bool)
  for (cx, cy, r) in KEEP[k]: prot |= (xx - cx) ** 2 + (yy - cy) ** 2 < r * r
  for i in range(1, n2 + 1):
    m = lab2 == i; s = m.sum()
    if s < 60 or (m & prot).any(): continue
    ring = nd.binary_dilation(m, iterations=3) & ~m
    if k == 'm' and np.median(mn[ring]) > 135: continue          # 周围是浅灰金属 → 高光，保留
    bg |= m
  near = nd.binary_dilation(bg, iterations=4) & ~bg
  t = np.clip((mn - 150) / 100, 0, 1) * (sp < 60); al = np.ones(mn.shape); al[bg] = 0; al[near] = 1 - t[near]
  mm = (al > .02) & (al < 1); rgb[mm] = np.clip((rgb[mm] - 255 * (1 - al[mm, None])) / al[mm, None], 0, 255)
  im = Image.fromarray(np.dstack([rgb, al * 255]).astype(np.uint8)); bb = im.getbbox(); im = im.crop((max(0, bb[0] - 20), max(0, bb[1] - 20), min(im.width, bb[2] + 20), im.height))
  im = im.resize((round(im.width * 900 / im.height), 900), Image.LANCZOS); im.save(f'art/portrait/{k}.webp', quality=90)
  b = Image.new('RGB', im.size, (40, 30, 20)); b.paste(im, (0, 0), im); b.save(f'/home/claude/t/chk_{k}_dark.png')

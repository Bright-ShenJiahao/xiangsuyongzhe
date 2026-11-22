"""11/22 披风换色：男主黄 → 深灰紫（跟立绘），女主黄 → 亮蓝。直接改打包好的图集（build_hero30 / build_heroine 之后跑）。
黄色判定：r>150、g>0.7r、b<0.55g（头发橙、皮肤、木头都不进）。保留原来的明暗。"""
import numpy as np, os
from PIL import Image
R0 = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import json
def run(path, dark, light):
  J = json.load(open(path.replace('.png', '.json'))); im = Image.open(path).convert('RGBA'); a = np.array(im).astype(float); r, g, b = a[..., 0], a[..., 1], a[..., 2]
  m = (a[..., 3] > 0) & (r > 150) & (g > .72 * r) & (b < .42 * g)
  head = np.zeros(m.shape, bool)
  for k, L0 in J['f'].items():
    for x, y, w, h, ax, ay in L0: head[y:y + int(h * .38), x:x + w] = True
  m &= ~head
  from scipy import ndimage as nd
  for _ in range(3):   # 披风边上偏暗的黄 / 橙黄也带上（只在已改区域旁边）
    near = nd.binary_dilation(m, iterations=2); m |= near & ~head & (a[..., 3] > 0) & (r > 110) & (g > .55 * r) & (b < .5 * g)
  L = ((r + g) / 2)[..., None]; t = np.clip((L - 150) / 105, 0, 1)
  new = np.array(dark) + (np.array(light) - np.array(dark)) * t
  a[m, :3] = new[m]; Image.fromarray(a.clip(0, 255).astype(np.uint8)).save(path); print(path, int(m.sum()))
run(os.path.join(R0, 'art/hero/atlas.png'), (40, 34, 50), (122, 108, 140))   # 11/22 跟立绘：深灰紫
run(os.path.join(R0, 'art/heroF/atlas.png'), (30, 96, 190), (120, 196, 255))

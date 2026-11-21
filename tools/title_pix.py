# 主界面：水墨插画 → 像素水墨（缩小 K 倍 + 限色 + 抖点），书法标题 → 像素墨字（透明底，三档墨色）
# 用法：python tools/title_pix.py 插画.png 书法.png
import sys, os, numpy as np
from PIL import Image
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'art', 'title')
def art(path, k=4, n=32):
    im = Image.open(path).convert('RGB'); s = im.resize((im.width // k, im.height // k), Image.BOX)
    q = s.quantize(colors=n, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG).convert('RGB'); q.save(os.path.join(OUT, 'art.png'))
    a = np.asarray(q).astype(int); print('art', q.size, 'paper', a[a.shape[0] // 2, -8])
def logo(path, k=5):
    g = np.asarray(Image.open(path).convert('L')).astype(float) / 255; ink = 1 - g
    h, w = ink.shape; ys, xs = np.where(ink > .3); ink = ink[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    sm = np.asarray(Image.fromarray((ink * 255).astype('uint8')).resize((ink.shape[1] // k, ink.shape[0] // k), Image.BOX)).astype(float) / 255
    a = np.zeros(sm.shape + (4,), 'uint8'); a[..., :3] = (26, 18, 14)
    a[..., 3] = np.where(sm > .62, 255, np.where(sm > .38, 200, np.where(sm > .2, 110, 0)))   # 浓墨 / 淡墨 / 飞白
    Image.fromarray(a, 'RGBA').save(os.path.join(OUT, 'logo.png')); print('logo', a.shape[1], a.shape[0])
os.makedirs(OUT, exist_ok=True); art(sys.argv[1]); logo(sys.argv[2])

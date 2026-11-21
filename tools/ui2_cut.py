# HD-2D 界面素材切图（高清，不像素化）：绿底框件 / 品红底图标，软抠底 + 去溢色 → 按连通块切开 → art/ui2/*.png
# 用法：python tools/ui2_cut.py 图标图.png 框图.png 地图.png
import sys, os, json, numpy as np
from PIL import Image
from scipy import ndimage
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = os.path.join(R, 'art', 'ui2')
ICONS = ['str', 'agi', 'int', 'con', 'hp', 'crit', 'move', 'spd', 'area', 'guard', 'xp', 'kill',
         'bk_sword', 'bk_spear', 'bk_bow', 'bk_staff', 'bk_axe', 'bk_nova', 'amulet', 'boots', 'purse', 'whet', 'magnet', 'bento',
         'hourglass', 'clover', 'meat', 'coin', 'coins', 'lock', 'xiu', 'reroll', 'slotplus', 'bag', 'chest', 'crown']
FRAMES = [['panel', 'titlebar', 'close', 'back'], ['info', 'card', 'q0', 'q1', 'q2', 'q3'], ['slot', 'slot_sel', 'slot_lock', 'cell'],
          ['btn', 'btn_gold', 'tag_blue', 'tag_red', 'tab', 'tab_on'], ['bar_hp', 'bar_mp', 'bar_xp', 'bar_boss', 'bar'],
          ['star', 'star_off', 'coinbox', 'pause', 'arrow', 'c_tl', 'c_tr', 'c_bl', 'c_br', 'divider']]
def key(path, kind):
    a = np.asarray(Image.open(path).convert('RGB')).astype(float); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    if kind == 'green': d = g - np.maximum(r, b); g2 = np.minimum(g, np.maximum(r, b) + 6); a = np.dstack([r, g2, b])
    else: d = np.minimum(r, b) - g
    alpha = np.clip(1 - (d - 40) / 120, 0, 1)
    if kind != 'green':   # 去品红溢色：半透明像素按透明程度减掉 r、b 里多出来的那份
        ex = np.clip(d, 0, None) * (1 - alpha); a = np.dstack([r - ex, g, b - ex])
    return a, alpha
def save(a, al, ys, xs, name, scale=1):
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    im = Image.fromarray(np.dstack([a[y0:y1, x0:x1], al[y0:y1, x0:x1] * 255]).clip(0, 255).astype('uint8'), 'RGBA')
    if scale != 1: im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    im.save(os.path.join(OUT, name + '.png')); return im.size
def run(icons, frames, mp):
    os.makedirs(OUT, exist_ok=True); sizes = {}
    a, al = key(icons, 'mag'); solid = al > .5; cw, ch = a.shape[1] / 6, a.shape[0] / 6
    lab, k = ndimage.label(solid); cells = {}
    for i, sl in enumerate(ndimage.find_objects(lab)):
        if (lab[sl] == i + 1).sum() < 40: continue
        c = int((sl[1].start + sl[1].stop) / 2 // cw) + 6 * int((sl[0].start + sl[0].stop) / 2 // ch); cells.setdefault(c, []).append(i + 1)
    for c, mem in cells.items():
        m = ndimage.binary_dilation(np.isin(lab, mem), iterations=3); ys, xs = np.where(m & (al > .02))
        w, h = save(a, al * m, ys, xs, ICONS[c], 128 / max(np.ptp(xs) + 1, np.ptp(ys) + 1)); sizes[ICONS[c]] = [round(w / 4), round(h / 4)]
    a, al = key(frames, 'green'); solid = al > .5
    lab, k = ndimage.label(solid); P = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        if (lab[sl] == i + 1).sum() < 60: continue
        P.append([sl[0].start, sl[0].stop, sl[1].start, sl[1].stop, [i + 1]])
    P.sort(key=lambda p: (p[0] + p[1]) / 2); rows = []
    for p in P:
        cy = (p[0] + p[1]) / 2
        if rows and abs(cy - rows[-1][0]) < 60: rows[-1][1].append(p)
        else: rows.append([cy, [p]])
    for (cy, L), names in zip(rows, FRAMES):
        L.sort(key=lambda p: p[2]); print(len(L), names)
        for p, n in zip(L, names):
            m = ndimage.binary_dilation(np.isin(lab, p[4]), iterations=3); ys, xs = np.where(m & (al > .02))
            sizes[n] = list(save(a, al * m, ys, xs, n))
    im = Image.open(mp).convert('RGB'); im.save(os.path.join(OUT, 'map.webp'), quality=78, method=6)
    open(os.path.join(R, 'js', 'uiart.js'), 'w').write('// 界面素材尺寸（tools/ui2_cut.py 切的 art/ui2/*.png）。图标记的是显示尺寸（k=1 时），框件记的是原图像素\nwindow.UIART = ' + json.dumps(sizes, separators=(',', ':')) + ';\n')
if __name__ == '__main__': run(*sys.argv[1:4])

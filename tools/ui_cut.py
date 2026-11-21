# 界面素材切图：品红底抠掉 → 按连通块切开（小碎块并到最近的大块）→ 按各自倍率缩回真像素 → 存 art/ui/*.png
# 用法：python tools/ui_cut.py 图标图.png 框图.png
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'art', 'ui')
ICONS = ['str', 'agi', 'int', 'con', 'hp', 'crit', 'move', 'spd', 'area', 'guard', 'xp', 'kill',
         'bk_sword', 'bk_spear', 'bk_bow', 'bk_staff', 'bk_axe', 'bk_nova', 'amulet', 'boots', 'purse', 'whet', 'magnet', 'bento',
         'hourglass', 'clover', 'meat', 'coin', 'coins', 'lock', 'xiu', 'reroll', 'slotplus', 'bag', 'chest', 'crown']
FRAMES = [['panel', 'card', 'plaque'], ['q0', 'q1', 'q2', 'q3'], ['slot', 'slot_sel', 'slot_lock', 'cell'],
          ['btn', 'btn_gold', 'btn_red', 'tab', 'tab_on'], ['hp_frame', 'hp_fill', 'xp_fill', 'boss_frame', 'boss_fill'],
          ['coinbox', 'pause', 'arrow_r', 'arrow_d', 'c_tl', 'c_tr', 'c_bl', 'c_br']]

def key(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    bg = (np.abs(r - 251) + g + np.abs(b - 252)) < 60
    fringe = (g < 22) & (np.abs(r - b) < 18) & (r > 70)        # 品红和黑描边混出来的紫边
    return a, ~(bg | fringe)

def parts(solid, minz=300, near=14):
    lab, k = ndimage.label(solid); sl = ndimage.find_objects(lab); z = ndimage.sum(solid, lab, range(1, k + 1))
    big = [i for i in range(k) if z[i] >= minz]; groups = {i: [i] for i in big}
    for i in range(k):
        if z[i] >= minz: continue
        cy, cx = [(s.start + s.stop) / 2 for s in sl[i]]
        best = min(big, key=lambda j: max(0, sl[j][0].start - cy, cy - sl[j][0].stop) + max(0, sl[j][1].start - cx, cx - sl[j][1].stop))
        d = max(0, sl[best][0].start - cy, cy - sl[best][0].stop) + max(0, sl[best][1].start - cx, cx - sl[best][1].stop)
        if d < near: groups[best].append(i)
    out = []
    for j, mem in groups.items():
        m = np.isin(lab, [i + 1 for i in mem]); ys, xs = np.where(m)
        out.append((ys.min(), ys.max() + 1, xs.min(), xs.max() + 1, m))
    return out

def shrink(a, m, box, f):
    y0, y1, x0, x1 = box; rgb = a[y0:y1, x0:x1].astype(float); al = m[y0:y1, x0:x1].astype(float)
    W, H = max(1, round((x1 - x0) / f)), max(1, round((y1 - y0) / f))
    pre = Image.fromarray(np.dstack([rgb * al[..., None], al * 255]).clip(0, 255).astype('uint8'), 'RGBA')
    sm = np.asarray(pre.resize((W, H), Image.BOX)).astype(float); A = sm[..., 3:4] / 255
    col = np.where(A > 0, sm[..., :3] / np.maximum(A, 1e-6), 0)
    al = A[..., 0] > .5
    edge = al & ~ndimage.binary_erosion(al, border_value=0)                      # 贴着透明的一圈
    pur = (col[..., 0] - col[..., 1] > 40) & (col[..., 2] - col[..., 1] > 40) & (col.max(-1) < 170)
    col[edge & pur] = (26, 14, 8)                                                  # 残留的暗紫边 → 深棕描边色
    return Image.fromarray(np.dstack([col, al * 255]).clip(0, 255).astype('uint8'), 'RGBA')

def run(icons, frames):
    os.makedirs(OUT, exist_ok=True)
    a, s = key(icons); cw = a.shape[1] / 6; ch = a.shape[0] / 6   # 图标是 6×6 整齐网格：同一格里的碎块（速度线、闪电）合成一个
    lab, k = ndimage.label(s); cells = {}
    for i, sl in enumerate(ndimage.find_objects(lab)):
        if (lab[sl] == i + 1).sum() < 20: continue
        c = int((sl[1].start + sl[1].stop) / 2 // cw) + 6 * int((sl[0].start + sl[0].stop) / 2 // ch); cells.setdefault(c, []).append(i + 1)
    for c, mem in cells.items():
        m = np.isin(lab, mem); ys, xs = np.where(m)
        shrink(a, m, (ys.min(), ys.max() + 1, xs.min(), xs.max() + 1), 5).save(os.path.join(OUT, ICONS[c] + '.png'))
    a, s = key(frames); P = sorted(parts(s), key=lambda p: p[0] + p[1])
    rows = []
    for p in P:
        cy = (p[0] + p[1]) / 2
        if rows and abs(cy - rows[-1][0]) < 45: rows[-1][1].append(p)
        else: rows.append([cy, [p]])
    for (cy, L), names in zip(rows, FRAMES):
        L.sort(key=lambda p: p[2]); print(len(L), names)
        for p, n in zip(L, names): shrink(a, p[4], p[:4], 4.5).save(os.path.join(OUT, n + '.png'))

if __name__ == '__main__': run(sys.argv[1], sys.argv[2])

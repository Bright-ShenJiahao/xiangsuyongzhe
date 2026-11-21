# 新勇者（高清像素，品红底）切帧：抠底 → 连通块 → 按行分组、同一行里挨得近的块合并（死亡帧和掉落的剑）→ 原分辨率拼图集
# 行：待机2 / 跑3 / 攻击2 / 翻滚2 / 受伤1+倒地1 / 头像1。锚点 = 脚底中点
# 用法：python tools/cut_hd_hero.py 源图.png
import sys, os, json, numpy as np
from PIL import Image
from scipy import ndimage
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = os.path.join(R, 'art', 'hero2')
ROWS = [['idle', 'idle'], ['run', 'run', 'run'], ['atk', 'atk'], ['roll', 'roll'], ['hurt', 'dead'], ['por']]
a = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
bg = (np.abs(r - 255) + g + np.abs(b - 255) < 120) | ((g < 40) & (r > 150) & (b > 150))
fr = (g < 30) & (np.abs(r - b) < 25) & (r > 60)          # 品红和深色描边混出来的紫边
solid = ~(bg | fr); solid = ndimage.binary_opening(solid, iterations=1) | (solid & ndimage.binary_erosion(solid))
lab, k = ndimage.label(solid); sl = ndimage.find_objects(lab); z = ndimage.sum(solid, lab, range(1, k + 1))
blobs = [dict(y0=s[0].start, y1=s[0].stop, x0=s[1].start, x1=s[1].stop, ids=[i + 1]) for i, s in enumerate(sl) if z[i] > 150]
blobs.sort(key=lambda o: (o['y0'] + o['y1']) / 2)
rows = []
for o in blobs:
    cy = (o['y0'] + o['y1']) / 2
    if rows and abs(cy - rows[-1][0]) < 110: rows[-1][1].append(o)
    else: rows.append([cy, [o]])
frames, tiles = {}, []
for (cy, L), names in zip(rows, ROWS):
    L.sort(key=lambda o: o['x0']); M = []
    for o in L:   # 同一行里横向挨得近（< 40 像素）的块并成一帧
        if M and o['x0'] - M[-1]['x1'] < 40: m = M[-1]; m['x1'] = max(m['x1'], o['x1']); m['y0'] = min(m['y0'], o['y0']); m['y1'] = max(m['y1'], o['y1']); m['ids'] += o['ids']
        else: M.append(dict(o))
    print(len(M), names)
    for o, n in zip(M, names):
        mask = np.isin(lab[o['y0']:o['y1'], o['x0']:o['x1']], o['ids']); rgb = a[o['y0']:o['y1'], o['x0']:o['x1']]
        im = Image.fromarray(np.dstack([rgb, mask * 255]).astype('uint8'), 'RGBA'); h, w = mask.shape
        ys, xs = np.where(mask); low = ys > h - 8
        ax = float(xs[low].mean()) if n not in ('dead', 'roll', 'por') else w / 2
        tiles.append((n, im, round(ax, 1), h))
x = 0; H = max(t[1].height for t in tiles); atlas = Image.new('RGBA', (sum(t[1].width + 2 for t in tiles), H))
for n, im, ax, ay in tiles: atlas.paste(im, (x, 0)); frames.setdefault(n, []).append([x, 0, im.width, im.height, ax, ay]); x += im.width + 2
os.makedirs(OUT, exist_ok=True); atlas.save(os.path.join(OUT, 'atlas.png')); json.dump({'f': frames}, open(os.path.join(OUT, 'atlas.json'), 'w'))
print({k: [f[2:4] for f in v] for k, v in frames.items()})

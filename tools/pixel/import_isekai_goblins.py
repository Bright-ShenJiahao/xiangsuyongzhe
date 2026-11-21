"""从《异世界幸存者》（sanguoxingcunzhe 仓库）拷第一章要用的哥布林全家（11/22）→ art/goblin/<兵种>/ + frames.json。
那边已经按连通块切好、去过品红边；锚点记的是一半（逻辑像素），这里 ×2。拷完逐帧检查碎片和品红残留。
用法：python3 tools/pixel/import_isekai_goblins.py [异世界仓库路径]"""
import json, os, shutil, sys
import numpy as np
from PIL import Image
from scipy import ndimage
R0 = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(R0, '..', 'bright-shenjiahao', 'sanguoxingcunzhe')
KINDS = ['gob_kid', 'wolf_free', 'gob_shield', 'gob_thrower', 'gob_bomb', 'gob_ghost', 'gob_wolf', 'gob_boar', 'gob_mage', 'gob_rock',
         'gob_shaman', 'gob_drum', 'gob_necro', 'skeleton', 'gob_giant', 'gob_hero', 'gob_troll', 'gob_chief', 'gob_paladin', 'gob_emperor']
E = json.load(open(os.path.join(SRC, 'data', 'enemies.json'))); FJ = os.path.join(R0, 'art', 'goblin', 'frames.json'); J = json.load(open(FJ)); bad = []
for k in KINDS:
  out = os.path.join(R0, 'art', 'goblin', k); os.makedirs(out, exist_ok=True); J[k] = {}
  for nm, f in E[k]['frames'].items():
    src = os.path.join(SRC, f['src'].split('?')[0]); dst = os.path.join(out, nm + '.png'); shutil.copy(src, dst)
    if 'anchor' in f: J[k][nm] = [round(f['anchor'][0] * 2, 1), round(f['anchor'][1] * 2, 1)]
    else: im = Image.open(dst); J[k][nm] = [im.width / 2, im.height / 2]
    a = np.array(Image.open(dst).convert('RGBA')).astype(int); al = a[..., 3] > 0; lab, n = ndimage.label(al)
    if n > 1:
      sz = sorted(ndimage.sum(al, lab, range(1, n + 1)), reverse=True)
      if sz[1] > 6: bad.append((k, nm, 'pieces', [int(s) for s in sz[:4]]))
    mg = al & (a[..., 0] - a[..., 1] > 70) & (a[..., 2] - a[..., 1] > 70) & ~((a[..., 2] > a[..., 0] + 30))
    if mg.sum() > 4: bad.append((k, nm, 'magenta', int(mg.sum())))
json.dump(J, open(FJ, 'w'), ensure_ascii=False)
print(len(KINDS), 'kinds'); [print(b) for b in bad]

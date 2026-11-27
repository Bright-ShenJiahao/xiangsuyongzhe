"""Reduce handheld sprite color noise without changing frame bounds or alpha silhouette.
Run from repository root. Original atlas is retained for repeatable tuning.
"""
from pathlib import Path
from PIL import Image
import numpy as np
import json

src = Path('art/src/handheld_before_pixel.png')
dst = Path('art/heroHandheldPreview/atlas.png')
if not src.exists():
    src.write_bytes(dst.read_bytes())
im = Image.open(src).convert('RGBA')
a = np.array(im)
mask = a[:, :, 3] >= 128
# Train one shared palette on visible pixels only, without background bias.
pixels = Image.fromarray(a[:, :, :3][mask].reshape(1, -1, 3))
q = pixels.quantize(colors=32, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
rgb = np.array(q.convert('RGB')).reshape(-1, 3)
a[mask, :3] = rgb
# Clear transparent fringe RGB and enforce hard pixel edges.
a[:, :, 3] = np.where(mask, 255, 0)
a[~mask, :3] = 0
# Remove only near-color interior singleton noise; retain dark outlines and cyan screen.
original = a.copy()
frames = json.loads(Path('art/heroHandheldPreview/atlas.json').read_text())['f']
for group in frames.values():
    for x, y, w, h, *_ in group:
        for yy in range(y + 1, y + h - 1):
            for xx in range(x + 1, x + w - 1):
                c = original[yy, xx, :3].astype(int)
                if not mask[yy-1:yy+2, xx-1:xx+2].all() or c.max() < 65 or (c[2] > c[0] and c[1] > c[0]):
                    continue
                neighbors = original[yy-1:yy+2, xx-1:xx+2, :3].reshape(-1, 3)
                neighbors = np.delete(neighbors, 4, axis=0)
                if np.any(np.all(neighbors == c, axis=1)):
                    continue
                colors, counts = np.unique(neighbors, axis=0, return_counts=True)
                best = colors[counts.argmax()]
                if counts.max() >= 4 and np.linalg.norm(best.astype(int)-c) < 60:
                    a[yy, xx, :3] = best
# Keep the handheld screen recognizably teal rather than merging into clothing.
base = np.array(im)
screen = mask & (base[:,:,1] > base[:,:,0].astype(int)+12) & (base[:,:,2] > base[:,:,0].astype(int)+12)
a[screen, :3] = [44, 116, 111]
# Material-aware warm-tone correction: preserve cloak, clothes and deep shadows.
c = a[:,:,:3].astype(float)
r,g,b = c[:,:,0],c[:,:,1],c[:,:,2]
hair = mask & (r > 110) & (r > g*1.4) & (g > 45) & (g < 145) & (b < g*.85)
c[hair] *= np.array([.91, .96, .94])
# Consolidate the large pale face/hand midtone; leave the brightest glints alone.
skin = mask & (r > 180) & (g > 130) & (b > 65) & (r > g*1.06) & (g > b*1.12)
highlight = skin & (g >= 210)
c[skin & ~highlight] -= np.array([9, 10, 9])
c[highlight] -= np.array([3, 4, 4])
a[:,:,:3] = np.clip(np.rint(c),0,255).astype(np.uint8)
# One-pixel torso dip on idle1; keep feet and frame anchors unchanged.
x,y,w,h,*_ = frames['hero:gun.idle'][1]
cut = max(1, int(h*.72))
upper = a[y:y+cut,x:x+w].copy()
a[y,x:x+w] = 0
a[y+1:y+cut+1,x:x+w] = upper
Image.fromarray(a).save(dst)
print('Shared visible palette:', len(np.unique(a[mask, :3], axis=0)))

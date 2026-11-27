"""Build supplied scythe sheet with one scale and pose-relative body anchors."""
from pathlib import Path
import json
import runpy
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parents[2]
base = runpy.run_path(str(ROOT / 'tools/pixel/build_gemini2.py'))
helper = base['helper']
frames = base['cut'](ROOT / 'art/src/ayuan_scythe_latest.webp')
old = Image.open(ROOT / 'art/hero/atlas.png').convert('RGBA')
mapping = json.loads((ROOT / 'art/hero/atlas.json').read_text())['f']
refs = [r for key, arr in mapping.items() if key.startswith('hero:sword.') for r in arr]
ox, oy, ow, oh = refs[0][:4]
oi = old.crop((ox, oy, ox + ow, oy + oh))
q = np.array(oi); r, g, b = q[:, :, :3].astype(float).transpose(2, 0, 1)
boots = (q[:, :, 3] > 0) & (r > 90) & (r < 200) & (g > 40) & (g < 110) & (b < 70) & (r > g * 1.5)
target = np.where(boots)[0].max() - base['head_measure'](oi)[2] + 1
# First source idle boot sole is row 80, not the lower diagonal handle.
scale = target / (80 - base['head_measure'](frames[0])[2] + 1)
anchors = []
for r in refs:
    x, y, w, h, ax, ay = r
    _, hx, hy = base['head_measure'](old.crop((x, y, x + w, y + h)))
    anchors.append((ax - hx, ay - hy))

# Repair chroma-key spill inside the contour; do not erode hands or the blade.
clean = []
for im in frames:
    a = np.array(im); mask = a[:, :, 3] > 0
    edge = mask & ~nd.binary_erosion(mask, iterations=2)
    r, g, b = a[:, :, :3].astype(float).transpose(2, 0, 1)
    spill = edge & (r > g * 1.35) & (b > g * 1.35) & (r > 70)
    a[spill, :3] = [58, 34, 24]
    clean.append(Image.fromarray(a))
cal = helper['recolor'](clean, helper['old_palette']('sword')[0])
for tag, source in [('Gemini2Raw', clean), ('Gemini2Cal', cal)]:
    small = [im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.NEAREST) for im in source]
    atlas = Image.new('RGBA', (sum(im.width + 2 for im in small), max(im.height for im in small)))
    out = {}; x = idx = 0
    contact = Image.new('RGB', (1100, 1260), '#597c80'); draw = ImageDraw.Draw(contact)
    for name, count in helper['COMMON'] + helper['ATK']['scythe'] + helper['TAIL']:
        arr = []
        for k in range(count):
            im = small[idx]; _, hx, hy = base['head_measure'](frames[idx]); dx, dy = anchors[idx]
            arr.append([x, 0, im.width, im.height, round(hx * scale + dx), round(hy * scale + dy)])
            atlas.alpha_composite(im, (x, 0)); x += im.width + 2
            px = (idx % 5) * 220 + 5; py = (idx // 5) * 180
            draw.text((px, py), f'{idx + 1}: {name}{k}', fill='white')
            enlarged = im.resize((im.width * 3, im.height * 3), Image.Resampling.NEAREST)
            contact.paste(enlarged, (px, py + 20), enlarged)
            idx += 1
        out['hero:scythe.' + name] = arr
    assert idx == 33
    dest = ROOT / ('art/heroScythe' + tag)
    atlas.save(dest / 'atlas.png')
    (dest / 'atlas.json').write_text(json.dumps({'f': out}), encoding='utf-8')
    if tag == 'Gemini2Cal': contact.save(ROOT / 'art/heroScytheGemini2Cal/frames-check.png')
print('33 frames; shared scale', round(scale, 4), 'idle body height', target)

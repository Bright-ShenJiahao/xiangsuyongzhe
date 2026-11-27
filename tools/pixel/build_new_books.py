"""Extract three supplied book covers without eroding their silhouettes."""
from pathlib import Path
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parents[2]
source = Path(sys.argv[1])
a = np.array(Image.open(source).convert('RGB'))
r, g, b = a.astype(int).transpose(2, 0, 1)
mask = ~((r > 170) & (b > 140) & (np.minimum(r, b) - g > 75))
labels, _ = nd.label(mask)
parts = [(sl[1].start, i, sl) for i, sl in enumerate(nd.find_objects(labels), 1)
         if sl is not None and (labels[sl] == i).sum() > 10000]
assert len(parts) == 3, len(parts)
for name, (_, label, sl) in zip(('gun', 'tome', 'scythe'), sorted(parts)):
    rgba = np.dstack((a[sl], (labels[sl] == label).astype('uint8') * 255))
    im = Image.fromarray(rgba)
    scale = 128 / im.height
    im = im.resize((round(im.width * scale), 128), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (128, 128))
    canvas.alpha_composite(im, ((128 - im.width) // 2, 0))
    canvas.save(ROOT / f'art/ui2/bk_{name}.png')
    canvas.resize((17, 17), Image.Resampling.LANCZOS).save(ROOT / f'art/drop/book_{name}.png')
    print(name, im.size)

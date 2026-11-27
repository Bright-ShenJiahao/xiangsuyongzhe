"""Coverage-aware pixel reduction: keep thin weapons before adding an outline."""
import numpy as np
from PIL import Image
from scipy import ndimage as nd

CROSS = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]])

def despill(im, outline=(58, 34, 24)):
    a = np.array(im).copy()
    m = a[..., 3] > 0
    edge = m & ~nd.binary_erosion(m, iterations=2)
    r, g, b = a[..., :3].astype(float).transpose(2, 0, 1)
    # Only dark chroma-contaminated contour; preserve bright steel highlights.
    pink = edge & (r > g + 15) & (b > g + 15) & (g < 100)
    a[pink, :3] = outline
    return Image.fromarray(a)

def reduce_complete(im, size):
    # Resample premultiplied channels: RGB under transparent pixels cannot bleed in.
    a = np.array(im).astype(float)
    alpha = a[..., 3] / 255
    coverage = np.array(Image.fromarray(alpha.astype('float32'), mode='F').resize(size, Image.Resampling.BOX))
    nearest = np.array(im.resize(size, Image.Resampling.NEAREST))
    out = np.zeros((size[1], size[0], 4), dtype='uint8')
    mask = (coverage >= .28) | (nearest[..., 3] > 0)
    for c in range(3):
        p = Image.fromarray((a[..., c] * alpha).astype('float32'), mode='F').resize(size, Image.Resampling.BOX)
        recovered = np.clip(np.rint(np.array(p) / np.maximum(coverage, .001)), 0, 255)
        # Keep the established pixel palette inside the sprite; coverage only repairs lost edges.
        out[..., c] = np.where(nearest[..., 3] > 0, nearest[..., c], recovered)
    out[..., 3] = mask * 255
    out[~mask, :3] = 0
    return Image.fromarray(out)

def outline_complete(im, color=(58, 34, 24), reference=None):
    # Outline OUTSIDE the recovered silhouette. Never paint over blade interiors.
    a = np.pad(np.array(im), ((1, 1), (1, 1), (0, 0)))
    m = a[..., 3] > 0
    edge = m & ~nd.binary_erosion(m, structure=CROSS)
    ref = a if reference is None else np.pad(np.array(reference), ((1, 1), (1, 1), (0, 0)))
    light = edge & (ref[..., :3].astype(float).mean(2) > 85)
    ring = nd.binary_dilation(light, structure=CROSS) & ~m
    a[ring, :3] = color
    a[ring, 3] = 255
    return Image.fromarray(a)

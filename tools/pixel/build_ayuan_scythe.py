"""Build calibrated 33-frame Ayuan scythe atlas (heroScytheGemini2Raw + heroScytheGemini2Cal)."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(r"C:\Users\hangs\.gemini\antigravity\brain\efc7e57b-693c-47d1-ba23-a2a1c2b47937\.user_uploaded\media_1795812722189_6919d37d.webp")

COMMON = [
    ("idle", 2), ("run", 4), ("roll", 3), ("back", 1), ("hurt", 1), ("dead", 1),
    ("charge", 2), ("dash", 1), ("stop", 1), ("jump", 1), ("slam", 1),
]
ATK_SCYTHE = [("reap", 3), ("toss", 2), ("hook", 2), ("chop", 2), ("spin", 1)]
TAIL = [("up", 1), ("finish", 1), ("atk", 2), ("big", 1)]
OUTLINE = np.array([58, 34, 24], dtype=np.uint8)
CROSS = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]])


def rgb_lab(rgb):
    v = np.asarray(rgb, dtype=np.float32) / 255.0
    v = np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4)
    xyz = v @ np.array(
        [[0.4124564, 0.2126729, 0.0193339],
         [0.3575761, 0.7151522, 0.1191920],
         [0.1804375, 0.0721750, 0.9503041]],
        np.float32,
    )
    xyz /= np.array([0.95047, 1.0, 1.08883], np.float32)
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], axis=-1)


def cut_sheet(path):
    im = Image.open(path).convert("RGB")
    a = np.array(im)
    r, g, b = a.astype(int).transpose(2, 0, 1)
    mask = ~((r > 155) & (b > 125) & (np.minimum(r, b) - g > 55))
    lab, _ = ndimage.label(mask)
    parts = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        if sl is None or int(((lab[sl] == i) & mask[sl]).sum()) < 200:
            continue
        ys, xs = sl
        parts.append(((ys.start + ys.stop) / 2, (xs.start + xs.stop) / 2, i))
    parts.sort(key=lambda p: p[0])
    rows = []
    for p in parts:
        if rows and abs(p[0] - rows[-1][0]) < 45:
            rows[-1][1].append(p)
        else:
            rows.append([p[0], [p]])
    ordered_ids = []
    for _, rp in rows:
        rp.sort(key=lambda p: p[1])
        ordered_ids.extend([p[2] for p in rp])
    assert len(ordered_ids) == 33, f"expected 33, got {len(ordered_ids)}"

    selected = np.isin(lab, ordered_ids)
    dist, nearest = ndimage.distance_transform_edt(~selected, return_indices=True)
    lab2 = np.where(selected, lab, np.where((~selected) & mask & (dist <= 10.0), lab[tuple(nearest)], 0))

    frames = []
    for cid in ordered_ids:
        yy, xx = np.where((lab2 == cid) & mask)
        y0, y1, x0, x1 = int(yy.min()), int(yy.max()) + 1, int(xx.min()), int(xx.max()) + 1
        m = (lab2[y0:y1, x0:x1] == cid) & mask[y0:y1, x0:x1]
        sub = a[y0:y1, x0:x1].copy()
        sr, sg, sb = sub.astype(int).transpose(2, 0, 1)
        edge = m & ~ndimage.binary_erosion(m, structure=np.ones((3, 3)), border_value=0)
        m = m & ~(edge & (sr > sg + 25) & (sb > sg + 20) & ((sr + sb) > 205))
        clab, cn = ndimage.label(m)
        if cn > 1:
            sizes = np.bincount(clab.ravel())
            sizes[0] = 0
            m = (sizes >= 4)[clab]
        # Clean purple edge specks
        sr, sg, sb = sub.astype(int).transpose(2, 0, 1)
        purp = m & (sr > sg + 14) & (sb > sg + 12) & (sr < 185)
        sub[purp] = OUTLINE
        fr = Image.fromarray(np.dstack([sub, (m.astype(np.uint8) * 255)]))
        bbox = fr.getbbox()
        frames.append(fr.crop(bbox) if bbox else fr)
    return frames


def ayuan_metrics(im):
    a = np.array(im).astype(float)
    al = a[:, :, 3] > 127
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    hair = al & (r > 120) & (r > g * 1.25) & (g > 45) & (b < g * 0.95)
    boots = al & (r > 70) & (r < 185) & (g > 25) & (g < 105) & (b < 80) & (r > g * 1.3)
    xs_all = np.arange(im.width)[None, :]
    ys_all = np.arange(im.height)[:, None]
    hy, hx = np.where(hair)
    if len(hx) >= 6:
        fcx, fcy, htop = float(np.median(hx)), float(np.median(hy)), float(hy.min())
    else:
        yy, xx = np.where(al)
        fcx, fcy, htop = float(np.median(xx)), float(np.median(yy)) * 0.6, 0.0
    by, bx = np.where(boots & (ys_all > fcy + im.height * 0.12) & (np.abs(xs_all - fcx) < im.width * 0.24))
    if len(by) >= 4:
        return htop, float(np.percentile(by, 98)), 0.55 * float(np.median(bx)) + 0.45 * fcx
    return htop, float(im.height - 1), fcx


def compute_anchor(im, act, idx):
    w, h = im.size
    a = np.array(im).astype(float)
    al = a[:, :, 3] > 127
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    if act == "roll" and idx == 1:
        ball = al & (r > 80) & (g > 50) & (b < 140)
        yy, xx = np.where(ball)
        if len(xx) >= 10:
            return round(float((xx.min() + xx.max()) / 2.0), 1), round(float(yy.max()) + 1.0, 1)
    if act == "dead":
        hair = al & (r > 120) & (r > g * 1.25) & (b < g * 0.95)
        yy, xx = np.where(hair)
        if len(xx) >= 6:
            return round(float(np.median(xx)) + 6.0, 1), round(float(h - 1), 1)
    _, boot_bot, cx = ayuan_metrics(im)
    ay = boot_bot + 1.0
    if act == "jump":
        ay = boot_bot + 4.0
    elif act == "back":
        ay = boot_bot + 2.0
    return round(cx, 1), round(ay, 1)


def main():
    ref_im = Image.open(ROOT / "art/heroSwordGemini2Cal/atlas.png").convert("RGBA")
    ref_arr = np.array(ref_im)
    pal_cols = ref_arr[ref_arr[..., 3] > 127, :3]
    pal = np.unique(pal_cols, axis=0)
    plab = rgb_lab(pal)

    raw_frames = cut_sheet(SRC)
    t0, b0, _ = ayuan_metrics(raw_frames[0])
    t1, b1, _ = ayuan_metrics(raw_frames[1])
    sc = float(np.mean([39.0 / (b0 - t0 + 1), 36.0 / (b1 - t1 + 1)]))

    small_raw, small_cal = [], []
    for fr in raw_frames:
        sm = fr.resize((max(1, round(fr.width * sc)), max(1, round(fr.height * sc))), Image.Resampling.NEAREST)
        a = np.array(sm).copy()
        m = a[..., 3] > 127
        a[~m, :3] = 0
        a[..., 3] = np.where(m, 255, 0)
        small_raw.append(Image.fromarray(a))

        # Calibrated to Ayuan sword palette
        rgb = a[m, :3]
        lab = rgb_lab(rgb)
        out_rgb = np.empty_like(rgb)
        for i in range(0, len(lab), 4096):
            d = ((lab[i:i + 4096, None, :] - plab[None, :, :]) ** 2).sum(axis=2)
            out_rgb[i:i + 4096] = pal[d.argmin(axis=1)]
        ca = a.copy()
        ca[m, :3] = out_rgb
        edge = m & ~ndimage.binary_erosion(m, structure=CROSS, border_value=0)
        ca[edge, :3] = OUTLINE
        small_cal.append(Image.fromarray(ca))

    groups = COMMON + ATK_SCYTHE + TAIL
    for tag, frames in [("Raw", small_raw), ("Cal", small_cal)]:
        dest = ROOT / f"art/heroScytheGemini2{tag}"
        dest.mkdir(parents=True, exist_ok=True)
        W = sum(im.width + 2 for im in frames)
        H = max(im.height for im in frames)
        atlas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        mapping = {}
        idx = x = 0
        for act, cnt in groups:
            arr = []
            for k_i in range(cnt):
                im = frames[idx]
                ax, ay = compute_anchor(im, act, k_i)
                atlas.alpha_composite(im, (x, 0))
                arr.append([x, 0, im.width, im.height, ax, ay])
                x += im.width + 2
                idx += 1
            mapping[f"hero:scythe.{act}"] = arr
        atlas.save(dest / "atlas.png")
        (dest / "atlas.json").write_text(json.dumps({"f": mapping}), encoding="utf-8")
        print(f"Saved {dest} ({atlas.size}) scale={sc:.4f} idle0={frames[0].size}")


if __name__ == "__main__":
    main()

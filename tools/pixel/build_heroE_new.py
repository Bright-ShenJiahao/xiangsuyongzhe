"""Build calibrated 7-weapon Elf Prince (heroENew) atlas from uploaded 33-frame sheets.

Preserves art/heroE/ intact for comparison; outputs art/heroENew/atlas.png + atlas.json + compare.png.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SRC_DIR = Path(r"C:\Users\hangs\.gemini\antigravity\brain\efc7e57b-693c-47d1-ba23-a2a1c2b47937\.user_uploaded")

SOURCES = {
    "sword": SRC_DIR / "media_1795804116629_b6453c8e.webp",
    "spear": SRC_DIR / "media_1795804116636_f36dca6b.webp",
    "bow": SRC_DIR / "media_1795804116631_7d6479d3.webp",
    "staff": SRC_DIR / "media_1795804116632_e50e97cb.webp",
    "tome": SRC_DIR / "media_1795804116633_5c2db55e.webp",
    "gun": SRC_DIR / "media_1795804116635_37c49b6d.webp",
    "scythe": SRC_DIR / "media_1795804116635_5a1837d3.webp",
}

COMMON = [
    ("idle", 2), ("run", 4), ("roll", 3), ("back", 1), ("hurt", 1), ("dead", 1),
    ("charge", 2), ("dash", 1), ("stop", 1), ("jump", 1), ("slam", 1),
]
ATK = {
    "sword": [("slash", 3), ("chop", 2), ("upper", 2), ("spin", 2), ("thrust", 1)],
    "spear": [("thrust", 2), ("sweep", 3), ("lift", 2), ("twirl", 2), ("throw", 1)],
    "bow": [("shoot", 3), ("sky", 2), ("side", 1), ("kneel", 2), ("rapid", 1), ("lower", 1)],
    "staff": [("point", 2), ("raise", 2), ("stomp", 2), ("twirl", 2), ("palm", 2)],
    "tome": [("cast", 3), ("raise", 2), ("push", 2), ("guard", 2), ("orbit", 1)],
    "gun": [("press", 3), ("rapid", 2), ("aim", 2), ("toss", 2), ("sky", 1)],
    "scythe": [("reap", 3), ("toss", 2), ("hook", 2), ("chop", 2), ("spin", 1)],
}
TAIL = [("up", 1), ("finish", 1), ("atk", 2), ("big", 1)]


def cut_sheet(path):
    im = Image.open(path).convert("RGB")
    a = np.array(im)
    r, g, b = a.astype(int).transpose(2, 0, 1)
    bg_mag = (r > 165) & (b > 135) & (np.minimum(r, b) - g > 68)
    mask = ~bg_mag

    lab, _ = ndimage.label(mask)
    parts = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        if sl is None:
            continue
        area = int(((lab[sl] == i) & mask[sl]).sum())
        if area < 200:
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

    assert len(ordered_ids) == 33, f"{path.name}: expected 33, got {len(ordered_ids)}"

    selected = np.isin(lab, ordered_ids)
    dist, nearest = ndimage.distance_transform_edt(~selected, return_indices=True)
    attach = (~selected) & mask & (dist <= 10.0)
    lab2 = np.where(selected, lab, np.where(attach, lab[tuple(nearest)], 0))

    frames = []
    for cid in ordered_ids:
        yy, xx = np.where((lab2 == cid) & mask)
        y0, y1, x0, x1 = int(yy.min()), int(yy.max()) + 1, int(xx.min()), int(xx.max()) + 1
        m = (lab2[y0:y1, x0:x1] == cid) & mask[y0:y1, x0:x1]
        sub = a[y0:y1, x0:x1].copy()

        # Remove 1-pixel magenta fringe along outer boundary
        sr, sg, sb = sub.astype(int).transpose(2, 0, 1)
        edge = m & ~ndimage.binary_erosion(m, structure=np.ones((3, 3)), border_value=0)
        pink_edge = edge & (sr > sg + 30) & (sb > sg + 25) & ((sr + sb) > 220)
        m = m & ~pink_edge

        # Clean isolated 1-3px detached dust
        clab, cn = ndimage.label(m)
        if cn > 1:
            sizes = np.bincount(clab.ravel())
            sizes[0] = 0
            m = (sizes >= 4)[clab]

        # Gentle magenta despill on dark outline pixels only (keep purple scythe intact!)
        edge2 = m & ~ndimage.binary_erosion(m, structure=np.ones((3, 3)), border_value=0)
        sr, sg, sb = sub.astype(int).transpose(2, 0, 1)
        dark_mag = edge2 & (sr < 105) & (sg < 65) & (sb < 105) & (sb > sg + 18) & (sr > sg + 18)
        sub[dark_mag, 0] = 58
        sub[dark_mag, 1] = 34
        sub[dark_mag, 2] = 24

        rgba = np.dstack([sub, (m.astype(np.uint8) * 255)])
        fr = Image.fromarray(rgba)
        bbox = fr.getbbox()
        frames.append(fr.crop(bbox) if bbox else fr)
    return frames


def person_metrics(im):
    """Measure (hair_top, boot_bottom, body_cx) for Elf Prince (blonde hair, green cape, brown boots)."""
    a = np.array(im).astype(float)
    al = a[:, :, 3] > 127
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]

    # Blonde hair + warm skin
    blonde = al & (r > 190) & (g > 155) & (b < 145) & (r - b > 45)
    # Green cape
    green = al & (g > 75) & (g > r + 10) & (g > b + 10)
    # Brown boots
    boots = al & (r > 70) & (r < 175) & (g > 25) & (g < 105) & (b < 85) & (r > g * 1.25)

    xs_all = np.arange(im.width)[None, :]
    ys_all = np.arange(im.height)[:, None]

    hy, hx = np.where(blonde)
    if len(hx) >= 8:
        face_cx = float(np.median(hx))
        face_cy = float(np.median(hy))
        hair_top = float(np.percentile(hy, 1))
    else:
        gy, gx = np.where(green | al)
        face_cx = float(np.median(gx)) if len(gx) else im.width / 2.0
        face_cy = float(np.median(gy)) if len(gy) else im.height * 0.35
        hair_top = 0.0

    near_boots = boots & (ys_all > face_cy) & (np.abs(xs_all - face_cx) < im.width * 0.28)
    by, bx = np.where(near_boots)
    if len(by) >= 4:
        boot_bot = float(np.percentile(by, 98))
        body_cx = 0.55 * float(np.median(bx)) + 0.45 * face_cx
    else:
        body = (blonde | green) & (np.abs(xs_all - face_cx) < im.width * 0.35)
        yy, xx = np.where(body)
        boot_bot = float(yy.max()) if len(yy) else float(im.height - 1)
        body_cx = float(np.median(xx)) if len(xx) else face_cx
    return hair_top, boot_bot, body_cx


def compute_anchor(im, act, idx):
    w, h = im.size
    a = np.array(im).astype(float)
    al = a[:, :, 3] > 127
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]

    if act == "roll" and idx == 1:
        blonde = al & (r > 180) & (g > 140) & (b < 145)
        green = al & (g > 70) & (g > r + 8)
        ball = blonde | green
        yy, xx = np.where(ball)
        if len(xx) >= 10:
            return round(float((xx.min() + xx.max()) / 2.0), 1), round(float(yy.max()) + 2.0, 1)
        return round(w / 2.0, 1), round(float(h), 1)

    if act == "dead":
        blonde = al & (r > 180) & (g > 140) & (b < 145)
        green = al & (g > 70) & (g > r + 8)
        yy, xx = np.where(blonde | green)
        if len(xx) >= 10:
            return round(float((xx.min() + xx.max()) / 2.0) + 3.0, 1), round(float(yy.max()) + 1.0, 1)
        return round(w / 2.0, 1), round(float(h - 1), 1)

    _, boot_bot, body_cx = person_metrics(im)
    ax = round(body_cx, 1)
    ay = round(boot_bot + 1.0, 1)
    if act == "jump":
        ay = round(boot_bot + 4.0, 1)
    elif act == "back":
        ay = round(boot_bot + 2.0, 1)
    return ax, ay


def main():
    oi = Image.open(ROOT / "art/heroE/atlas.png").convert("RGBA")
    oj = json.loads((ROOT / "art/heroE/atlas.json").read_text(encoding="utf-8"))["f"]
    old_h0 = 38.0
    old_h1 = 35.0

    processed = {}
    scales = {}
    for w, path in SOURCES.items():
        raw_frames = cut_sheet(path)
        t0, b0, _ = person_metrics(raw_frames[0])
        t1, b1, _ = person_metrics(raw_frames[1])
        h0, h1 = b0 - t0 + 1, b1 - t1 + 1
        sc = float(np.mean([old_h0 / h0, old_h1 / h1]))
        scales[w] = sc

        scaled = [
            im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.Resampling.NEAREST)
            for im in raw_frames
        ]
        processed[w] = scaled
        st0, sb0, _ = person_metrics(scaled[0])
        print(f"  {w:6s}: 33f | raw=({h0:.0f},{h1:.0f}) | scale={sc:.4f} | scaled_h={sb0 - st0 + 1:.1f}px | idle0={scaled[0].size}")

    MAX_W = 1024
    placements = {}
    x = y = row_h = 0
    for w in SOURCES:
        for idx, im in enumerate(processed[w]):
            if x + im.width + 2 > MAX_W:
                x = 0
                y += row_h + 2
                row_h = 0
            placements[(w, idx)] = (x, y, im)
            x += im.width + 2
            row_h = max(row_h, im.height)
    atlas = Image.new("RGBA", (MAX_W, y + row_h), (0, 0, 0, 0))
    for (w, idx), (px, py, im) in placements.items():
        atlas.alpha_composite(im, (px, py))

    fmap = {}
    own = {}
    for w in SOURCES:
        groups = COMMON + ATK[w] + TAIL
        own[w] = [nm for nm, _ in COMMON + ATK[w] + [("up", 1), ("finish", 1)]]
        idx = 0
        for act, cnt in groups:
            arr = []
            for k_i in range(cnt):
                px, py, im = placements[(w, idx)]
                ax, ay = compute_anchor(im, act, k_i)
                arr.append([px, py, im.width, im.height, ax, ay])
                idx += 1
            fmap[f"hero:{w}.{act}"] = arr
            if w == "sword":
                fmap[f"hero:{act}"] = arr

    dest = ROOT / "art/heroENew"
    dest.mkdir(parents=True, exist_ok=True)
    atlas.save(dest / "atlas.png")
    meta = {
        "f": fmap,
        "art": "heroENew-7w",
        "weapons": list(SOURCES.keys()),
        "own": own,
        "scales": {w: round(v, 4) for w, v in scales.items()},
    }
    (dest / "atlas.json").write_text(json.dumps(meta, separators=(",", ":")), encoding="utf-8")
    print(f"Saved {dest / 'atlas.png'} ({atlas.size}) and atlas.json ({len(fmap)} keys)")

    # 3x Old vs New comparison image
    u = 3
    comp_rows = [
        ("sword", [("idle", 0), ("run", 0), ("roll", 1), ("slash", 1), ("up", 0)]),
        ("spear", [("idle", 0), ("run", 0), ("roll", 1), ("thrust", 1), ("up", 0)]),
        ("bow",   [("idle", 0), ("run", 0), ("roll", 1), ("shoot", 1), ("sky", 1)]),
        ("staff", [("idle", 0), ("run", 0), ("roll", 1), ("point", 1), ("raise", 1)]),
        ("tome",  [("idle", 0), ("run", 0), ("roll", 1), ("cast", 2), ("up", 0)]),
        ("gun",   [("idle", 0), ("run", 0), ("roll", 1), ("press", 2), ("up", 0)]),
        ("scythe",[("idle", 0), ("run", 0), ("roll", 1), ("reap", 1), ("up", 0)]),
    ]
    cw, ch = 260, 175
    comp = Image.new("RGBA", (5 * cw + 90, len(comp_rows) * ch + 40), "#e9dfc1")
    dr = ImageDraw.Draw(comp)
    dr.text((12, 10), "Old heroE (left) vs New heroENew (right) - 3x scale, shared ground line", fill="#38281d")
    for ri, (w, items) in enumerate(comp_rows):
        y_base = 40 + ri * ch + 148
        dr.line([(0, y_base), (comp.width, y_base)], fill=(200, 60, 60, 180), width=1)
        dr.text((12, 40 + ri * ch + 70), w.upper(), fill="#38281d")
        for ci, (act, fi) in enumerate(items):
            x0 = 90 + ci * cw
            dr.text((x0 + 60, 40 + ri * ch + 6), f"{act}{fi}", fill="#38281d")
            or_list = oj.get(f"hero:{w}.{act}")
            if or_list:
                ox, oy, ow, oh, oax, oay = or_list[min(fi, len(or_list) - 1)]
                oim = oi.crop((ox, oy, ox + ow, oy + oh)).resize((ow * u, oh * u), Image.Resampling.NEAREST)
                comp.alpha_composite(oim, (int(x0 + 55 - oax * u), int(y_base - oay * u)))
            nr_list = fmap.get(f"hero:{w}.{act}")
            if nr_list:
                nx, ny, nw, nh, nax, nay = nr_list[min(fi, len(nr_list) - 1)]
                nim = atlas.crop((nx, ny, nx + nw, ny + nh)).resize((nw * u, nh * u), Image.Resampling.NEAREST)
                x_new = x0 + (185 if or_list else 120)
                comp.alpha_composite(nim, (int(x_new - nax * u), int(y_base - nay * u)))
    comp.save(dest / "compare.png")
    print(f"Saved {dest / 'compare.png'}")


if __name__ == "__main__":
    main()

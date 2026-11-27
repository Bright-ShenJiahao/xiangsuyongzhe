"""Build calibrated 7-weapon Rin (heroFNew) atlas from uploaded magenta-keyed sheets.

Preserves art/heroF/ intact for comparison; outputs art/heroFNew/atlas.png + atlas.json.
"""
import json
import os
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SRC_DIR = Path(r"C:\Users\hangs\.gemini\antigravity\brain\efc7e57b-693c-47d1-ba23-a2a1c2b47937\.user_uploaded")
INSPECT_DIR = Path(r"C:\Users\hangs\.gemini\antigravity\brain\efc7e57b-693c-47d1-ba23-a2a1c2b47937\scratch\inspect")

SOURCES = {
    "sword": SRC_DIR / "media_1795798116748_90127d2d.webp",
    "spear": SRC_DIR / "media_1795798116746_0a5e4f8d.webp",
    "bow": SRC_DIR / "media_1795798116744_e4bde02a.webp",
    "staff": SRC_DIR / "media_1795798116744_3119fc45.webp",
    "tome": SRC_DIR / "media_1795798116743_cb4eefc9.webp",
    "gun": SRC_DIR / "media_1795798116743_2da66deb.webp",
    "scythe": SRC_DIR / "media_1795798116743_09432bf7.webp",
}

# Exact frame index mapping verified visually on each numbered sheet against heroF + js/skframes.js
ACTION_MAPS = {
    "sword": {
        "idle": [0, 1],
        "run": [2, 3, 4, 5],
        "roll": [7, 8, 9],
        "back": [10],
        "hurt": [12],
        "dead": [13],
        "charge": [14, 15],
        "dash": [16],
        "stop": [18],
        "jump": [19],
        "slam": [21],
        "slash": [14, 17, 21],
        "chop": [20, 22],
        "upper": [22, 23],
        "spin": [24, 25],
        "thrust": [27],
        "up": [28],
        "finish": [29],
        "atk": [30, 31],
        "big": [32],
    },
    "spear": {
        "idle": [0, 1],
        "run": [2, 3, 4, 5],
        "roll": [7, 8, 9],
        "back": [10],
        "hurt": [12],
        "dead": [13],
        "charge": [14, 15],
        "dash": [16],
        "stop": [18],
        "jump": [19],
        "slam": [20],
        "thrust": [15, 17],
        "sweep": [21, 22, 26],
        "lift": [20, 23],
        "twirl": [24, 25],
        "throw": [30],
        "up": [28],
        "finish": [29],
        "atk": [30, 31],
        "big": [32],
    },
    "bow": {
        "idle": [0, 1],
        "run": [2, 3, 4, 3],
        "roll": [14, 5, 11],
        "back": [5],
        "hurt": [6],
        "dead": [7],
        "charge": [8, 9],
        "dash": [10],
        "stop": [12],
        "jump": [13],
        "slam": [14],
        "shoot": [8, 20, 20],
        "sky": [13, 17],
        "side": [9],
        "kneel": [22, 14],
        "rapid": [21],
        "lower": [15],
        "up": [23],
        "finish": [22],
        "atk": [9, 20],
        "big": [23],
    },
    "staff": {
        "idle": [0, 1],
        "run": [2, 3, 4, 3],
        "roll": [14, 5, 11],
        "back": [5],
        "hurt": [6],
        "dead": [7],
        "charge": [8, 9],
        "dash": [10],
        "stop": [12],
        "jump": [13],
        "slam": [14],
        "point": [15, 16],
        "raise": [17, 21],
        "stomp": [14, 22],
        "twirl": [18, 19],
        "palm": [15, 20],
        "up": [21],
        "finish": [23],
        "atk": [9, 20],
        "big": [21],
    },
    "tome": {
        "idle": [0, 1],
        "run": [2, 3, 4, 5],
        "roll": [7, 8, 9],
        "back": [10],
        "hurt": [10],
        "dead": [23],
        "charge": [15, 17],
        "dash": [11],
        "stop": [12],
        "jump": [13],
        "slam": [14],
        "cast": [15, 16, 20],
        "raise": [17, 21],
        "push": [16, 20],
        "guard": [14, 21],
        "orbit": [18],
        "up": [22],
        "finish": [23],
        "atk": [15, 20],
        "big": [22],
    },
    "gun": {
        "idle": [0, 1],
        "run": [2, 3, 4, 3],
        "roll": [14, 10, 11],
        "back": [5],
        "hurt": [6],
        "dead": [7],
        "charge": [8, 9],
        "dash": [11],
        "stop": [12],
        "jump": [13],
        "slam": [14],
        "press": [15, 16, 20],
        "rapid": [16, 20],
        "aim": [17, 20],
        "toss": [8, 21],
        "sky": [17],
        "up": [22],
        "finish": [23],
        "atk": [9, 20],
        "big": [22],
    },
    "scythe": {
        "idle": [0, 1],
        "run": [2, 3, 4, 5],
        "roll": [7, 8, 9],
        "back": [10],
        "hurt": [10],
        "dead": [11],
        "charge": [15, 17],
        "dash": [20],
        "stop": [12],
        "jump": [13],
        "slam": [14],
        "reap": [15, 16, 20],
        "toss": [15, 20],
        "hook": [16, 17],
        "chop": [17, 14],
        "spin": [18, 19],
        "up": [21],
        "finish": [23],
        "atk": [15, 20],
        "big": [22],
    },
}

EXPECTED_COUNTS = {
    "sword": 33,
    "spear": 33,
    "bow": 24,
    "staff": 24,
    "tome": 24,
    "gun": 24,
    "scythe": 24,
}


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


def cut_sheet(path, expected):
    im = Image.open(path).convert("RGB")
    a = np.array(im)
    r, g, b = a.astype(int).transpose(2, 0, 1)
    # Magenta chroma key (strict enough to never eat blue cape or maroon boots)
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

    assert len(ordered_ids) == expected, f"{path.name}: expected {expected}, got {len(ordered_ids)}"

    # Assign small nearby detached weapon fragments (<= 10px away) to their nearest sprite; drop far dust
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

        # Remove 1-pixel magenta fringe along outer boundary without eroding dark outlines
        sr, sg, sb = sub.astype(int).transpose(2, 0, 1)
        edge = m & ~ndimage.binary_erosion(m, structure=np.ones((3, 3)), border_value=0)
        pink_edge = edge & (sr > sg + 30) & (sb > sg + 25) & ((sr + sb) > 220)
        m = m & ~pink_edge

        # Remove isolated 1-2px detached dust specs inside crop
        clab, cn = ndimage.label(m)
        if cn > 1:
            sizes = np.bincount(clab.ravel())
            sizes[0] = 0
            keep = sizes >= 4
            m = keep[clab]

        rgba = np.dstack([sub, (m.astype(np.uint8) * 255)])
        fr = Image.fromarray(rgba)
        bbox = fr.getbbox()
        frames.append(fr.crop(bbox) if bbox else fr)
    return frames


def load_heroF_palette():
    oi = Image.open(ROOT / "art/heroF/atlas.png").convert("RGBA")
    arr = np.array(oi)
    cols = arr[arr[..., 3] > 127, :3]
    uniq, cnt = np.unique(cols, axis=0, return_counts=True)
    # Keep colors that appear at least twice so stray compression pixels don't pollute palette
    pal = uniq[cnt >= 2]
    return pal, rgb_lab(pal)


def recolor_frame(im, pal, plab):
    a = np.array(im).copy()
    mask = a[..., 3] > 127
    if not mask.any():
        return im
    rgb = a[mask, :3].copy()
    r, g, b = rgb[:, 0].astype(np.int16), rgb[:, 1].astype(np.int16), rgb[:, 2].astype(np.int16)

    # Identify pure dark outline pixels (< 38) while keeping charcoal hair (~47) intact
    dark_outline = (r < 38) & (g < 35) & (b < 38)
    # Despill slight magenta tint on dark hair/outline pixels so they map cleanly to charcoal/outline, not maroon
    mag_tint = (~dark_outline) & (r > g + 8) & (b > g + 8) & (r < 125) & (b < 115) & (r - g < 32)
    rgb[mag_tint, 0] = np.minimum(rgb[mag_tint, 0], rgb[mag_tint, 1] + 6)
    rgb[mag_tint, 2] = np.minimum(rgb[mag_tint, 2], rgb[mag_tint, 1] + 4)

    lab = rgb_lab(rgb)
    out_rgb = np.empty_like(rgb)
    chunk = 4096
    for i in range(0, len(lab), chunk):
        d = ((lab[i:i + chunk, None, :] - plab[None, :, :]) ** 2).sum(axis=2)
        out_rgb[i:i + chunk] = pal[d.argmin(axis=1)]
    # Snap dark outline pixels cleanly to old heroF's crisp dark outline (17, 10, 13)
    out_rgb[dark_outline] = np.array([17, 10, 13], dtype=np.uint8)
    a[mask, :3] = out_rgb
    a[~mask, :3] = 0
    a[..., 3] = np.where(mask, 255, 0)
    return Image.fromarray(a)


def person_head_and_boots(im, restrict_boot_x=True):
    """Return (hair_top, boot_bottom, body_cx) excluding weapons."""
    a = np.array(im).astype(float)
    al = a[:, :, 3] > 127
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]

    skin = al & (r > 175) & (g > 130) & (b > 90) & (r - b > 20)
    hair = al & (r < 75) & (g < 75) & (b < 75)
    cape = al & (b > 130) & (b > r + 25)
    jacket = al & (b > 45) & (b < 115) & (r < 75) & (g < 85) & (b > r + 8)
    boots = al & (r > 55) & (r < 165) & (g < 72) & (b < 80) & (r > g * 1.35)

    xs_all = np.arange(im.width)[None, :]
    ys_all = np.arange(im.height)[:, None]

    # Body center X from skin + jacket + hair (prefer skin+jacket)
    sy, sx = np.where(skin)
    jy, jx = np.where(jacket)
    if len(sx) >= 6:
        face_cx = float(np.median(sx))
        face_cy = float(np.median(sy))
    elif len(jx) >= 6:
        face_cx = float(np.median(jx))
        face_cy = float(np.median(jy))
    else:
        hy, hx = np.where(hair)
        face_cx = float(np.median(hx)) if len(hx) else im.width / 2.0
        face_cy = float(np.median(hy)) if len(hy) else im.height * 0.35

    # Hair top: dark pixels above or around face_cy, near face_cx
    near_head = hair & (np.abs(xs_all - face_cx) < im.width * 0.28) & (ys_all <= face_cy + im.height * 0.15)
    hy, _ = np.where(near_head)
    hair_top = float(hy.min()) if len(hy) else 0.0

    # Boot bottom: maroon boot pixels below face_cy and horizontally near body center
    boot_half_w = im.width * (0.22 if restrict_boot_x else 0.38)
    near_boots = boots & (ys_all > face_cy) & (np.abs(xs_all - face_cx) < boot_half_w)
    by, bx = np.where(near_boots)
    if len(by) >= 4:
        # Exclude stray low handle pixel: take 98th percentile of boot Y
        boot_bot = float(np.percentile(by, 98))
        foot_cx = float(np.median(bx))
        body_cx = 0.55 * foot_cx + 0.45 * face_cx
    else:
        # Fallback: bottom of body (hair/skin/jacket/cape) near face_cx
        body = (hair | skin | jacket | cape) & (np.abs(xs_all - face_cx) < im.width * 0.3)
        yy, xx = np.where(body)
        boot_bot = float(yy.max()) if len(yy) else float(im.height - 1)
        body_cx = float(np.median(xx)) if len(xx) else face_cx

    return hair_top, boot_bot, body_cx


def compute_anchor(im, act, idx, weapon):
    """Compute (ax, ay) based on support foot & body center of mass."""
    w, h = im.size
    a = np.array(im).astype(float)
    al = a[:, :, 3] > 127
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]

    # Special poses
    if act == "roll" and idx == 1 and weapon in ("sword", "spear", "tome", "scythe"):
        # Ball roll: center of the dark/yellow/blue ball
        yy, xx = np.where(al)
        # Exclude long protruding spear/scythe shaft by looking at dense core
        dark = al & (r < 75) & (g < 75) & (b < 75)
        dy, dx = np.where(dark)
        if len(dx) >= 10:
            return round(float(np.median(dx)), 1), round(float(dy.max()) + 1.0, 1)
        return round(w / 2.0, 1), round(float(h), 1)

    if act == "dead":
        # Lying flat: horizontal center of dark hair + uniform, bottom of body
        hair = al & (r < 75) & (g < 75) & (b < 75)
        skin = al & (r > 175) & (g > 130) & (b > 90) & (r - b > 20)
        body = hair | skin
        yy, xx = np.where(body)
        if len(xx) >= 10:
            return round(float((xx.min() + xx.max()) / 2.0) + 4.0, 1), round(float(yy.max()) + 1.0, 1)
        return round(w / 2.0, 1), round(float(h - 1), 1)

    # Normal grounded / airborne poses
    restrict = weapon in ("scythe", "bow", "spear")
    _, boot_bot, body_cx = person_head_and_boots(im, restrict_boot_x=restrict)

    # Check if boots were cleanly detected below mid-body
    boots = al & (r > 55) & (r < 165) & (g < 72) & (b < 80) & (r > g * 1.35)
    # For back view (spin1 / twirl1), no skin visible -> use hair center + boot bottom
    if act in ("spin", "twirl") and idx == 1:
        hair = al & (r < 75) & (g < 75) & (b < 75)
        hy, hx = np.where(hair)
        hcx = float(np.median(hx)) if len(hx) else w / 2.0
        by, bx = np.where(boots & (np.abs(np.arange(w)[None, :] - hcx) < w * 0.35))
        if len(by) >= 4:
            return round(float((bx.min() + bx.max()) / 2.0), 1), round(float(by.max()) + 1.0, 1)
        return round(hcx, 1), round(float(h), 1)

    ax = round(body_cx, 1)
    ay = round(boot_bot + 1.0, 1)

    # Airborne offsets matching old heroF (jump floats ~4px, back floats ~3px)
    if act == "jump":
        ay = round(boot_bot + 5.0, 1)
    elif act == "back" or (act == "roll" and idx == 1 and weapon in ("bow", "staff", "gun")):
        ay = round(boot_bot + 3.0, 1)

    return ax, ay


def main():
    INSPECT_DIR.mkdir(parents=True, exist_ok=True)
    pal, plab = load_heroF_palette()

    # Measure old heroF reference idle0 & idle1 height (hair top to boot bottom)
    oi = Image.open(ROOT / "art/heroF/atlas.png").convert("RGBA")
    oj = json.loads((ROOT / "art/heroF/atlas.json").read_text(encoding="utf-8"))["f"]
    old_idle0_h = np.median([
        person_head_and_boots(oi.crop((r[0], r[1], r[0] + r[2], r[1] + r[3])), restrict_boot_x=True)[1]
        - person_head_and_boots(oi.crop((r[0], r[1], r[0] + r[2], r[1] + r[3])), restrict_boot_x=True)[0] + 1
        for w in ("sword", "spear", "bow", "staff")
        for r in [oj[f"hero:{w}.idle"][0]]
    ])
    old_idle1_h = np.median([
        person_head_and_boots(oi.crop((r[0], r[1], r[0] + r[2], r[1] + r[3])), restrict_boot_x=True)[1]
        - person_head_and_boots(oi.crop((r[0], r[1], r[0] + r[2], r[1] + r[3])), restrict_boot_x=True)[0] + 1
        for w in ("sword", "spear", "bow", "staff")
        for r in [oj[f"hero:{w}.idle"][1]]
    ])
    print(f"Old heroF ref heights: idle0={old_idle0_h:.1f}px, idle1={old_idle1_h:.1f}px")

    # Process each weapon with ONE single uniform scale per weapon
    processed = {}  # weapon -> list of scaled recolored PIL images
    scales = {}
    for w, path in SOURCES.items():
        raw_frames = cut_sheet(path, EXPECTED_COUNTS[w])
        # Measure idle0 & idle1 hair-top-to-boot-bottom strictly near face X
        t0, b0, _ = person_head_and_boots(raw_frames[0], restrict_boot_x=True)
        t1, b1, _ = person_head_and_boots(raw_frames[1], restrict_boot_x=True)
        h0, h1 = b0 - t0 + 1, b1 - t1 + 1
        sc = float(np.mean([old_idle0_h / h0, old_idle1_h / h1]))
        if w == "staff":
            sc = max(sc, 39.6 / h0)
        scales[w] = sc

        scaled = []
        for im in raw_frames:
            nw = max(1, round(im.width * sc))
            nh = max(1, round(im.height * sc))
            sm = im.resize((nw, nh), Image.Resampling.NEAREST)
            sm = recolor_frame(sm, pal, plab)
            scaled.append(sm)
        processed[w] = scaled

        # Verify scaled idle0 height
        st0, sb0, _ = person_head_and_boots(scaled[0], restrict_boot_x=True)
        print(f"  {w:6s}: {len(scaled)}f | raw idle=({h0:.0f},{h1:.0f}) | scale={sc:.4f} | scaled idle0_h={sb0 - st0 + 1:.1f}px | idle0_size={scaled[0].size}")

    # Pack all unique frames of all 7 weapons into one clean atlas (art/heroFNew/atlas.png)
    # Row-packed to max width 1024 for fast GPU texture compatibility
    MAX_W = 1024
    placements = {}  # (w, idx) -> (x, y, im)
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
    atlas_h = y + row_h
    atlas = Image.new("RGBA", (MAX_W, atlas_h), (0, 0, 0, 0))
    for (w, idx), (px, py, im) in placements.items():
        atlas.alpha_composite(im, (px, py))

    # Build atlas.json mapping
    fmap = {}
    own = {}
    for w, amap in ACTION_MAPS.items():
        own[w] = [k for k in amap if k not in ("atk", "big")]
        for act, idxs in amap.items():
            arr = []
            for k_i, src_idx in enumerate(idxs):
                px, py, im = placements[(w, src_idx)]
                ax, ay = compute_anchor(im, act, k_i, w)
                arr.append([px, py, im.width, im.height, ax, ay])
            fmap[f"hero:{w}.{act}"] = arr
            if w == "sword":
                fmap[f"hero:{act}"] = arr

    dest = ROOT / "art/heroFNew"
    dest.mkdir(parents=True, exist_ok=True)
    atlas.save(dest / "atlas.png")
    meta = {
        "f": fmap,
        "art": "heroFNew-7w",
        "weapons": list(SOURCES.keys()),
        "own": own,
        "scales": {w: round(v, 4) for w, v in scales.items()},
    }
    (dest / "atlas.json").write_text(json.dumps(meta, separators=(",", ":")), encoding="utf-8")
    print(f"Saved {dest / 'atlas.png'} ({atlas.size}) and atlas.json ({len(fmap)} keys)")

    # Generate light-bg and dark-bg check sheets for visual inspection of edges & colors
    for bg_name, bg_col in [("light", "#e9dfc1"), ("dark", "#1d2230")]:
        cols = 12
        cell_w, cell_h = 84, 78
        total = sum(len(processed[w]) for w in SOURCES)
        rows = (total + cols - 1) // cols
        sheet = Image.new("RGBA", (cols * cell_w, rows * cell_h), bg_col)
        dr = ImageDraw.Draw(sheet)
        pos = 0
        for w in SOURCES:
            for idx, im in enumerate(processed[w]):
                r_i, c_i = divmod(pos, cols)
                cx = c_i * cell_w + cell_w // 2
                cy = r_i * cell_h + cell_h - 8
                # Draw ground line
                dr.line([(c_i * cell_w + 4, cy), ((c_i + 1) * cell_w - 4, cy)], fill=(255, 80, 80, 160))
                im2 = im.resize((im.width, im.height), Image.Resampling.NEAREST)
                # Use default idle-like anchor for inspection
                ax, ay = compute_anchor(im, "idle", 0, w)
                sheet.alpha_composite(im2, (int(cx - ax), int(cy - ay)))
                dr.text((c_i * cell_w + 2, r_i * cell_h + 2), f"{w[:2]}{idx}", fill=(20, 20, 20) if bg_name == "light" else (230, 230, 230))
                pos += 1
        sheet.save(INSPECT_DIR / f"heroFNew_check_{bg_name}.png")

    # Generate side-by-side Old vs New comparison sheet (same scale 3x, same ground line)
    # Shows idle0, run0, roll1, main attack, and up0 for sword/spear/bow/staff, plus new tome/gun/scythe
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
    dr.text((12, 10), "Old heroF (left) vs New heroFNew (right) - 3x scale, shared ground line (tome/gun/scythe are new)", fill="#38281d")
    for ri, (w, items) in enumerate(comp_rows):
        y_base = 40 + ri * ch + 148
        dr.line([(0, y_base), (comp.width, y_base)], fill=(200, 60, 60, 180), width=1)
        dr.text((12, 40 + ri * ch + 70), w.upper(), fill="#38281d")
        for ci, (act, fi) in enumerate(items):
            x0 = 90 + ci * cw
            dr.text((x0 + 60, 40 + ri * ch + 6), f"{act}{fi}", fill="#38281d")
            # Old (only sword/spear/bow/staff exist in old heroF)
            or_list = oj.get(f"hero:{w}.{act}")
            if or_list:
                ox, oy, ow, oh, oax, oay = or_list[min(fi, len(or_list) - 1)]
                oim = oi.crop((ox, oy, ox + ow, oy + oh)).resize((ow * u, oh * u), Image.Resampling.NEAREST)
                comp.alpha_composite(oim, (int(x0 + 55 - oax * u), int(y_base - oay * u)))
            # New
            nr_list = fmap.get(f"hero:{w}.{act}")
            if nr_list:
                nx, ny, nw, nh, nax, nay = nr_list[min(fi, len(nr_list) - 1)]
                nim = atlas.crop((nx, ny, nx + nw, ny + nh)).resize((nw * u, nh * u), Image.Resampling.NEAREST)
                x_new = x0 + (185 if or_list else 120)
                comp.alpha_composite(nim, (int(x_new - nax * u), int(y_base - nay * u)))
    comp.save(dest / "compare.png")
    comp.save(INSPECT_DIR / "heroFNew_compare.png")
    print(f"Saved comparison image to {dest / 'compare.png'}")


if __name__ == "__main__":
    main()

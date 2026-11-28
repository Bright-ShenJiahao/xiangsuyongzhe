"""Build calibrated 7-weapon Royal Knight (female, heroK) atlas from uploaded 33-frame sheets.

Outputs art/heroK/atlas.png + atlas.json + art/portrait/k.webp + art/compare_6heroes.png.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SRC_DIR = Path(r"C:\Users\hangs\.gemini\antigravity\brain\efc7e57b-693c-47d1-ba23-a2a1c2b47937\.user_uploaded")

SOURCES = {
    "sword": SRC_DIR / "media_1795848995026_ef4b8b57.webp",
    "spear": SRC_DIR / "media_1795848994928_6df105fe.webp",
    "bow": SRC_DIR / "media_1795848995027_783bcd82.webp",
    "staff": SRC_DIR / "media_1795848995025_e0b647a4.webp",
    "tome": SRC_DIR / "media_1795848995026_cb140dc4.webp",
    "gun": SRC_DIR / "media_1795848994928_be717dcc.webp",
    "scythe": SRC_DIR / "media_1795848994930_ba77aa8c.webp",
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
OUTLINE = np.array([58, 34, 24], dtype=np.uint8)
CROSS = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]])


def cut_sheet(path):
    im = Image.open(path).convert("RGB")
    a = np.array(im)
    r, g, b = a.astype(int).transpose(2, 0, 1)
    bg_mag = (r > 185) & (b > 165) & (np.minimum(r, b) - g > 95)
    mask = ~bg_mag

    def find_parts(m_in):
        lb, _ = ndimage.label(m_in)
        ps = []
        for i, sl in enumerate(ndimage.find_objects(lb), 1):
            if sl is None or int(((lb[sl] == i) & mask[sl]).sum()) < 200:
                continue
            ys, xs = sl
            ps.append(((ys.start + ys.stop) / 2, (xs.start + xs.stop) / 2, i))
        return lb, ps

    lab, parts = find_parts(mask)
    for it in (1, 2, 3):
        if len(parts) == 33:
            break
        lab, parts = find_parts(ndimage.binary_erosion(mask, iterations=it))

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
    lab2 = np.where(selected, lab, np.where((~selected) & mask & (dist <= 10.0), lab[tuple(nearest)], 0))

    frames = []
    for cid in ordered_ids:
        yy, xx = np.where((lab2 == cid) & mask)
        y0, y1, x0, x1 = int(yy.min()), int(yy.max()) + 1, int(xx.min()), int(xx.max()) + 1
        m = (lab2[y0:y1, x0:x1] == cid) & mask[y0:y1, x0:x1]
        sub = a[y0:y1, x0:x1].copy()

        # Despill bright pink outer halo to dark outline instead of deleting pixels (keeps thin spear/sword intact!)
        sr, sg, sb = sub.astype(int).transpose(2, 0, 1)
        edge = m & ~ndimage.binary_erosion(m, structure=np.ones((3, 3)), border_value=0)
        pink_halo = edge & (sr > 165) & (sb > 145) & (np.minimum(sr, sb) - sg > 65)
        sub[pink_halo] = OUTLINE

        clab, cn = ndimage.label(m)
        if cn > 1:
            sizes = np.bincount(clab.ravel())
            sizes[0] = 0
            m = (sizes >= 4)[clab]

        fr = Image.fromarray(np.dstack([sub, (m.astype(np.uint8) * 255)]))
        bbox = fr.getbbox()
        frames.append(fr.crop(bbox) if bbox else fr)
    return frames


def knight_metrics(im):
    """Measure (helmet_top excluding blue plume, boot_bottom, body_cx)."""
    a = np.array(im).astype(float)
    al = a[:, :, 3] > 127
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]

    # Exclude vivid blue plume (b > 170, b > r + 70)
    blue_plume = al & (b > 150) & (b > r + 60)
    # Warm blonde hair / face skin / gold trim
    warm = al & (r > 185) & (g > 135) & (b < 155) & (r - b > 30)
    # Silver/dark armour body (excluding plume)
    body = al & (~blue_plume)

    xs_all = np.arange(im.width)[None, :]
    ys_all = np.arange(im.height)[:, None]

    wy, wx = np.where(warm)
    if len(wx) >= 8:
        fcx = float(np.median(wx))
        fcy = float(np.median(wy))
    else:
        by, bx = np.where(body)
        fcx = float(np.median(bx)) if len(bx) else im.width / 2.0
        fcy = float(np.median(by)) * 0.45 if len(by) else im.height * 0.4

    # Helmet top: highest non-plume pixel near fcx
    near_head = body & (np.abs(xs_all - fcx) < im.width * 0.22)
    hy, _ = np.where(near_head)
    htop = float(hy.min()) if len(hy) else 0.0

    # Boot bottom: lowest body pixel strictly under torso (exclude weapons extending right)
    near_boots = body & (ys_all > fcy + im.height * 0.15) & (xs_all >= fcx - im.width * 0.24) & (xs_all <= fcx + im.width * 0.16)
    by, bx = np.where(near_boots)
    if len(by) >= 4:
        boot_bot = float(np.percentile(by, 98))
        body_cx = 0.55 * float(np.median(bx)) + 0.45 * fcx
    else:
        boot_bot = float(im.height - 1)
        body_cx = fcx
    return htop, boot_bot, body_cx


def compute_anchor(im, act, idx):
    w, h = im.size
    a = np.array(im).astype(float)
    al = a[:, :, 3] > 127
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]

    if act == "roll" and idx == 1:
        yy, xx = np.where(al)
        if len(xx) >= 10:
            return round(float((xx.min() + xx.max()) / 2.0), 1), round(float(h), 1)
    if act == "dead":
        warm = al & (r > 185) & (g > 135) & (b < 155)
        yy, xx = np.where(warm)
        if len(xx) >= 6:
            return round(float(np.median(xx)) + 6.0, 1), round(float(h - 1), 1)
        return round(w / 2.0, 1), round(float(h - 1), 1)

    _, boot_bot, cx = knight_metrics(im)
    ay = boot_bot + 1.0
    if act == "jump":
        ay = boot_bot + 4.0
    elif act == "back":
        ay = boot_bot + 2.0
    return round(cx, 1), round(ay, 1)


def main():
    processed = {}
    scales = {}
    for w, path in SOURCES.items():
        raw_frames = cut_sheet(path)
        t0, b0, _ = knight_metrics(raw_frames[0])
        t1, b1, _ = knight_metrics(raw_frames[1])
        h0, h1 = b0 - t0 + 1, b1 - t1 + 1
        # Exclude tall blue plume (~12px in source) so helmet-to-boot body matches Ayuan's 39px
        sc = float(np.mean([44.0 / h0, 41.0 / h1]))
        scales[w] = sc

        scaled = []
        for im in raw_frames:
            sm = im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.Resampling.NEAREST)
            arr = np.array(sm).copy()
            m = arr[..., 3] > 127
            edge = m & ~ndimage.binary_erosion(m, structure=CROSS, border_value=0)
            lum = 0.299 * arr[..., 0] + 0.587 * arr[..., 1] + 0.114 * arr[..., 2]
            arr[edge & (lum < 155), :3] = OUTLINE
            hi = m & (~edge) & (lum > 230)
            arr[hi, :3] = np.clip(np.rint(arr[hi, :3].astype(float) * 0.94), 0, 255).astype(np.uint8)
            arr[~m, :3] = 0
            arr[..., 3] = np.where(m, 255, 0)
            scaled.append(Image.fromarray(arr))
        processed[w] = scaled
        st0, sb0, _ = knight_metrics(scaled[0])
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

    dest = ROOT / "art/heroK"
    dest.mkdir(parents=True, exist_ok=True)
    atlas.save(dest / "atlas.png")
    meta = {
        "f": fmap,
        "art": "heroK-7w",
        "weapons": list(SOURCES.keys()),
        "own": own,
        "scales": {w: round(v, 4) for w, v in scales.items()},
    }
    (dest / "atlas.json").write_text(json.dumps(meta, separators=(",", ":")), encoding="utf-8")
    print(f"Saved {dest / 'atlas.png'} ({atlas.size}) and atlas.json ({len(fmap)} keys)")

    port_path = ROOT / "art/portrait/k.webp"
    if not port_path.exists():
        idle0 = processed["sword"][0]
        p_im = idle0.resize((idle0.width * 8, idle0.height * 8), Image.Resampling.NEAREST)
        p_im.save(port_path, quality=95)
        print(f"Saved placeholder portrait {port_path} ({p_im.size})")

    # 6-hero comparison image
    def load_h(h, w):
        d = ROOT / (
            f"art/hero{w.title()}Gemini2Cal" if h == "m"
            else "art/heroFNew" if h == "f"
            else "art/heroENew" if h == "e"
            else "art/heroV" if h == "v"
            else "art/heroS" if h == "s"
            else "art/heroK"
        )
        return Image.open(d / "atlas.png").convert("RGBA"), json.loads((d / "atlas.json").read_text(encoding="utf-8"))["f"]

    u = 3
    rows = [
        ("sword",  [("idle", 0), ("run", 0), ("slash", 1)]),
        ("spear",  [("idle", 0), ("run", 0), ("thrust", 1)]),
        ("bow",    [("idle", 0), ("run", 0), ("shoot", 1)]),
        ("staff",  [("idle", 0), ("run", 0), ("point", 1)]),
        ("tome",   [("idle", 0), ("run", 0), ("cast", 2)]),
        ("gun",    [("idle", 0), ("run", 0), ("press", 2)]),
        ("scythe", [("idle", 0), ("run", 0), ("reap", 1)]),
    ]
    cw, ch = 730, 165
    W = 90 + 3 * cw
    H = 44 + len(rows) * ch
    comp = Image.new("RGBA", (W, H), "#e9dfc1")
    dr = ImageDraw.Draw(comp)
    dr.text((12, 10), "6-Hero Calibration: Ayuan / Rin / Elf / Vampire / Skeleton / Royal Knight - 3x scale, shared ground line", fill="#38281d")
    for ri, (w, poses) in enumerate(rows):
        y_base = 44 + ri * ch + 142
        dr.line([(0, y_base), (W, y_base)], fill=(200, 60, 60, 180), width=1)
        dr.text((12, 44 + ri * ch + 68), w.upper(), fill="#38281d")
        sets = {h: load_h(h, w) for h in ("m", "f", "e", "v", "s", "k")}
        for ci, (act, fi) in enumerate(poses):
            x0 = 90 + ci * cw
            dr.text((x0 + 320, 44 + ri * ch + 6), f"{act}{fi}", fill="#38281d")
            for hi, h in enumerate(("m", "f", "e", "v", "s", "k")):
                at, jf = sets[h]
                arr = jf.get(f"hero:{w}.{act}")
                if not arr:
                    continue
                sx, sy, sw, sh, ax, ay = arr[min(fi, len(arr) - 1)]
                crop = at.crop((sx, sy, sx + sw, sy + sh)).resize((sw * u, sh * u), Image.Resampling.NEAREST)
                cx = x0 + 62 + hi * 120
                comp.alpha_composite(crop, (int(cx - ax * u), int(y_base - ay * u)))
    out6 = ROOT / "art/compare_6heroes.png"
    comp.save(out6)
    print(f"Saved {out6} ({comp.size})")


if __name__ == "__main__":
    main()

"""Generate 3-hero (Ayuan / Rin / Elf Prince) side-by-side comparison at 3x scale on shared ground line."""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]


def load_hero(h, w):
    if h == "m":
        d = ROOT / f"art/hero{w.title()}Gemini2Cal"
    elif h == "f":
        d = ROOT / "art/heroFNew"
    else:
        d = ROOT / "art/heroENew"
    return Image.open(d / "atlas.png").convert("RGBA"), json.loads((d / "atlas.json").read_text(encoding="utf-8"))["f"]


def main():
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
    cw, ch = 370, 165
    W = 90 + 3 * cw
    H = 44 + len(rows) * ch
    img = Image.new("RGBA", (W, H), "#e9dfc1")
    dr = ImageDraw.Draw(img)
    dr.text((12, 10), "3-Hero Calibration: Ayuan (left) / Rin (mid) / Elf Prince (right) - 3x scale, shared ground line", fill="#38281d")

    for ri, (w, poses) in enumerate(rows):
        y_base = 44 + ri * ch + 142
        dr.line([(0, y_base), (W, y_base)], fill=(200, 60, 60, 180), width=1)
        dr.text((12, 44 + ri * ch + 68), w.upper(), fill="#38281d")
        sets = {h: load_hero(h, w) for h in ("m", "f", "e")}
        for ci, (act, fi) in enumerate(poses):
            x0 = 90 + ci * cw
            dr.text((x0 + 140, 44 + ri * ch + 6), f"{act}{fi}", fill="#38281d")
            for hi, h in enumerate(("m", "f", "e")):
                at, jf = sets[h]
                arr = jf.get(f"hero:{w}.{act}")
                if not arr:
                    continue
                sx, sy, sw, sh, ax, ay = arr[min(fi, len(arr) - 1)]
                crop = at.crop((sx, sy, sx + sw, sy + sh)).resize((sw * u, sh * u), Image.Resampling.NEAREST)
                cx = x0 + 62 + hi * 120
                img.alpha_composite(crop, (int(cx - ax * u), int(y_base - ay * u)))

    out = ROOT / "art/compare_3heroes.png"
    img.save(out)
    print(f"Saved {out} ({img.size})")


if __name__ == "__main__":
    main()

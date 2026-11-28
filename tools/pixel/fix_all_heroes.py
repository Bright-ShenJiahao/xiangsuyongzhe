"""Recover original frame pixels and calibrate ground anchors without resizing."""
import io
import json
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import binary_fill_holes, distance_transform_edt

ART = Path(__file__).resolve().parents[2] / "art"
BASE = "da1d8fd"
WEAPONS = ("sword", "spear", "bow", "staff", "tome", "gun", "scythe")
AIR = {"jump", "back", "roll", "dead"}


def base_file(path):
    key = path.relative_to(ART.parent).as_posix()
    return subprocess.check_output(["git", "show", f"{BASE}:{key}"], cwd=ART.parent)


def boot_line(pixels, center, previous, spread):
    mask = pixels[:, :, 3] >= 128
    left = max(0, round(center)-spread)
    right = min(mask.shape[1], round(center)+spread+1)
    column = mask[:, left:right]
    rows = np.flatnonzero((column[:, 1:] & column[:, :-1]).sum(axis=1) >= 2)
    if not rows.size:
        return previous
    return int(rows[-1]+1)


def edge_color(pixels):
    r, g, b, a = pixels.astype(int).transpose(2, 0, 1)
    magenta = (r > 180) & (b > 160) & (np.minimum(r, b)-g > 60)
    solid = a >= 128
    exterior = ~binary_fill_holes(solid)
    padded = np.pad(exterior, 1, constant_values=True)
    edge = padded[:-2, 1:-1] | padded[2:, 1:-1] | padded[1:-1, :-2] | padded[1:-1, 2:]
    fringe = magenta & solid & edge
    reference = solid & ~magenta
    if fringe.any() and reference.any():
        nearest = distance_transform_edt(~reference, return_distances=False, return_indices=True)
        yy, xx = nearest[:, fringe]
        pixels[fringe, :3] = pixels[yy, xx, :3]
        return int(fringe.sum())
    return 0


def calibrate(directory):
    meta = directory / "atlas.json"
    png = directory / "atlas.png"
    data = json.loads(base_file(meta))
    source = Image.open(io.BytesIO(base_file(png))).convert("RGBA")
    result = source.copy()
    frames = data["f"]
    regions = {}
    for key, entries in frames.items():
        action = key.split(".")[-1].split(":")[-1]
        for entry in entries:
            regions.setdefault(tuple(entry[:4]), []).append((action, entry, key))
    changed = tinted = 0
    for (x, y, w, h), aliases in regions.items():
        pixels = np.array(source.crop((x, y, x+w, y+h)))
        tinted += edge_color(pixels)
        result.paste(Image.fromarray(pixels), (x, y))
        if any(action in AIR for action, _, _ in aliases):
            continue
        _, sample, _ = aliases[0]
        scythe = any("scythe." in key for _, _, key in aliases)
        line = boot_line(pixels, sample[4], sample[5], 8 if scythe else 13)
        if abs(line-sample[5]) >= 2:
            changed += 1
            for _, entry, _ in aliases:
                entry[5] = line
    assert np.array_equal(np.asarray(source)[:, :, 3], np.asarray(result)[:, :, 3])
    result.save(png)
    meta.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":"))+"\n", encoding="utf-8")
    print(directory.name, len(regions), changed, tinted)
    return result, frames


def main():
    groups = [[f"hero{weapon.title()}Gemini2Cal" for weapon in WEAPONS]]
    groups += [[name] for name in ("heroFNew", "heroENew", "heroV", "heroS", "heroK")]
    sheet = Image.new("RGB", (1990, 932), "#e9ddc0")
    draw = ImageDraw.Draw(sheet)
    for col, (name, directories) in enumerate(zip(("Ayuan", "Rin", "Elf", "Vampire", "Skeleton", "Knight"), groups)):
        atlases = [calibrate(ART / directory) for directory in directories]
        draw.text((80+320*col, 10), name, fill="#30251b")
        for row, weapon in enumerate(WEAPONS):
            atlas, frames = atlases[row] if len(atlases)>1 else atlases[0]
            base = 141+row*128
            draw.text((5, base-30), weapon, fill="#30251b")
            draw.line((71, base, sheet.width, base), fill="#18844a")
            for j, action in enumerate(("idle", "run", "atk")):
                entries = frames.get(f"hero:{weapon}.{action}")
                if not entries:
                    continue
                x, y, w, h, ax, ay = entries[0]
                im = atlas.crop((x, y, x+w, y+h)).resize((2*w, 2*h), Image.Resampling.NEAREST)
                sheet.paste(im, (120+320*col+102*j-round(2*ax), base-round(2*ay)), im)
    sheet.save(ART / "compare_6heroes.png")


if __name__ == "__main__":
    main()

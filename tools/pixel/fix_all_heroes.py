"""Calibrate and repack the six playable hero atlases."""
from pathlib import Path
import json
import re

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import label

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "art"
WEAPONS = ("sword", "spear", "bow", "staff", "tome", "gun", "scythe")
HEROES = ("Ayuan", "Rin", "Elf", "Vampire", "Skeleton", "Knight")
AIR = {"jump", "back", "roll", "dead"}
LOW = AIR | {"slam", "charge", "dash"}
BEFORE = np.zeros(4, dtype=int)
AFTER = BEFORE.copy()


def noise(pixels):
    r, g, b, a = pixels.astype(int).transpose(2, 0, 1)
    pink = (a > 0) & (r > 180) & (b > 160) & (np.minimum(r, b) - g > 60)
    groups, _ = label((a >= 128) & ~pink, np.ones((3, 3)))
    sizes = np.bincount(groups.ravel())
    bright = (0.2126*r + 0.7152*g + 0.0722*b >= 155) & (groups > 0)
    protected = np.unique(groups[bright])
    return pink | ((groups > 0) & (sizes[groups] <= 3) & ~np.isin(groups, protected))


def body(pixels):
    mask = pixels[:, :, 3] >= 128
    # Locate the dense head using a short moving vertical window. Thin shafts,
    # tips and plumes contribute too few pixels to define the head.
    h, w = mask.shape
    best = (0, 0, 0)
    for y in range(max(1, h // 2)):
        row = mask[y:y+9].sum(axis=0)
        for x in range(max(w - 13, 1)):
            score = np.minimum(row[x:x+14], 8).sum()
            if score > best[0]:
                best = (score, y, x)
    _, y, x = best
    left, right = max(0, x-7), min(w, x+21)
    head = mask[:min(h, y+13), left:right].copy()
    rgb = pixels[:head.shape[0], left:right, :3].astype(int)
    r, g, b = rgb.transpose(2, 0, 1)
    head &= ~((b > r+18) & (g > r+8))
    dense = np.flatnonzero(head.sum(axis=1) >= 5)
    top = int(dense[0]) if dense.size else y
    upper = mask[top:min(h, top+22), left:right]
    center = float(np.nonzero(upper)[1].mean() + left + .5) if upper.any() else w/2
    lower = mask[max(top+13, h//2):, max(0, left-5):min(w, right+5)]
    rows = np.flatnonzero(lower.sum(axis=1) >= 3)
    bottom = int(max(top+13, h//2)+rows[-1]+1) if rows.size else h
    return round(center, 1), bottom, bottom-top


def read(name):
    directory = ART / name
    data = json.loads((directory / "atlas.json").read_text(encoding="utf-8"))
    return directory, data, Image.open(directory / "atlas.png").convert("RGBA")


def crop(atlas, box):
    x,y,w,h = box[:4]
    return np.array(atlas.crop((x,y,x+w,y+h)))


def fix(directory, data, atlas, target):
    actions = {}
    for key, frames in data["f"].items():
        if "." in key:
            for box in frames:
                actions.setdefault(tuple(box[:4]), set()).add(key.rsplit(".",1)[1])
    packed = {}
    preview = {}
    x = y = row = 0
    for key, frames in data["f"].items():
        first = tuple(frames[0][:4]) if frames else None
        for i, box in enumerate(frames):
            region = tuple(box[:4])
            if region not in packed:
                pixels = crop(atlas, box)
                dirt = noise(pixels)
                ax, ay, height = body(pixels)
                acts = actions.get(region, set())
                grounded = not acts.intersection(AIR)
                upright = not acts.intersection(LOW) and height >= target * .73
                BEFORE[:] += (upright and abs(height-target)>2, grounded and box[5]!=ay,
                              abs(box[4]-ax)>.05, dirt.any())
                pixels[dirt] = 0
                pixels[pixels[:,:,3]<128] = 0
                clean = Image.fromarray(pixels)
                if upright and abs(body(pixels)[2]-target)>2:
                    candidates = [clean]
                    _, _, height = body(pixels)
                    for offset in range(-12,13):
                        scale = (target+offset)/max(height,1)
                        size = tuple(max(1,round(v*scale)) for v in clean.size)
                        candidates.append(clean.resize(size, Image.Resampling.NEAREST))
                    clean = min(candidates, key=lambda im: (abs(body(np.array(im))[2]-target),
                                                            abs(im.height-pixels.shape[0])))
                pixels = np.array(clean)
                pixels[noise(pixels)] = 0
                clean = Image.fromarray(pixels)
                ax, bottom, height = body(pixels)
                ay = bottom if grounded else round(box[5]*clean.height/box[3],1)
                w,h = clean.size
                if x+w > 1024:
                    x,y,row = 0,y+row+2,0
                packed[region] = ([x,y,w,h,ax,ay], clean, upright, grounded)
                x += w+2
                row = max(row,h)
            frames[i] = packed[region][0].copy()
        if frames:
            preview[key] = packed[first][:2]
    output = Image.new("RGBA",(1024,y+row))
    for box, image, _, _ in packed.values():
        output.paste(image, tuple(box[:2]))
    png = directory/"atlas.png"
    output.save(png)
    (directory/"atlas.json").write_text(json.dumps(data,ensure_ascii=False,separators=(",",":"))+"\n", encoding="utf-8")
    with Image.open(png) as saved:
        for box, _, upright, grounded in packed.values():
            pixels = crop(saved,box)
            ax, ay, height = body(pixels)
            AFTER[:] += (upright and abs(height-target)>2, grounded and box[5]!=ay,
                         abs(box[4]-ax)>.05, noise(pixels).any())
    return preview


def main():
    groups = [[f"hero{weapon.title()}Gemini2Cal" for weapon in WEAPONS]]
    groups += [[name] for name in ("heroFNew","heroENew","heroV","heroS","heroK")]
    sheet = Image.new("RGB",(6*320+70,7*128+36),"#e9ddc0")
    draw = ImageDraw.Draw(sheet)
    for col,(hero,names) in enumerate(zip(HEROES,groups)):
        directory,data,atlas = read(names[0])
        target = body(crop(atlas,data["f"]["hero:sword.idle"][0]))[2]
        previews = {}
        for name in names:
            previews.update(fix(*read(name), target))
        draw.text((80+col*320,10),hero,fill="#30251b")
        for row,weapon in enumerate(WEAPONS):
            baseline = row*128+141
            draw.text((5,baseline-30),weapon,fill="#30251b")
            draw.line((71,baseline,sheet.width,baseline),fill="#b78671")
            for j,action in enumerate(("idle","run","atk")):
                item = previews.get(f"hero:{weapon}.{action}")
                if item is None:
                    continue
                box,image = item
                image = image.resize((image.width*2,image.height*2),Image.Resampling.NEAREST)
                position = (120+col*320+j*102-round(box[4]*2),baseline-round(box[5]*2))
                sheet.paste(image,position,image)
    sheet.save(ART/"compare_6heroes.png")
    for name,before,after in zip(("height","ay","ax","cutout"),BEFORE,AFTER):
        print(f"{name}: {before} -> {after}")
    return int(AFTER.any())


if __name__ == "__main__":
    raise SystemExit(main())

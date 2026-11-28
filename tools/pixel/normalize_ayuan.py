"""Normalize Ayuan (hero*Gemini2Cal) frame scales and grounded foot anchors.

Problem:
- Sword/Spear/Gun/Staff have median body height ~36-37px (hair top to boot bottom).
- Bow, Tome, and Scythe have many oversized frames (41-52px) and a few undersized
  standing/attack frames (26-30px), causing noticeable size popping in-game.
- Several oversized frames also had stale `ay` (e.g. bot_y=45, ay=38), sinking into the floor.

Solution:
- Measure each frame's hair-top to boot-bottom height (`body_h`).
- Scale oversized frames (`body_h > 39`) down to TARGET_H (37px).
- Scale undersized non-crouch/non-ball frames (`body_h < 31`) up to TARGET_H (36px).
- Preserve crisp pixel art via Image.NEAREST (for upscaling) or Image.BOX/NEAREST
  with hard alpha cutoff (`a >= 128`).
- Re-anchor `ay` so grounded frames sit cleanly on boot bottom (never sinking >1px).
"""
import json
import os
from PIL import Image
import numpy as np

REPO = r'C:\Users\hangs\.gemini\antigravity\scratch\xiangsuyongzhe'
ART = os.path.join(REPO, 'art')
WEAPONS = ['Sword', 'Spear', 'Bow', 'Staff', 'Tome', 'Gun', 'Scythe']

# Poses that are naturally horizontal/curled/crouching and should NOT be upscaled
SKIP_UPSCALE = ('dead', 'roll', 'slam', 'charge0', 'finish', 'kneel0', 'dash', 'back', 'up0')
# Poses that are airborne (ay may legitimately be below bot_y)
AIRBORNE = ('jump', 'back', 'up', 'roll', 'dead')


def measure_body_h(sub_rgba):
    arr = np.array(sub_rgba)
    a = arr[:, :, 3] >= 128
    ys, xs = np.where(a)
    if len(ys) == 0:
        return 0, 0, 0
    top_y, bot_y = int(ys.min()), int(ys.max())
    r = arr[:, :, 0].astype(int)
    g = arr[:, :, 1].astype(int)
    b = arr[:, :, 2].astype(int)
    # Ayuan's orange-brown hair
    hair = a & (r > 150) & (r - b > 70) & (g < 175)
    hys, _ = np.where(hair)
    hair_top = int(hys.min()) if len(hys) > 5 else top_y
    return bot_y - hair_top + 1, top_y, bot_y


def rescale_sprite(im, scale):
    nw = max(1, int(round(im.width * scale)))
    nh = max(1, int(round(im.height * scale)))
    # NEAREST keeps pixel art edges crisp and avoids halo artifacts
    out = im.resize((nw, nh), Image.NEAREST)
    arr = np.array(out)
    arr[:, :, 3] = np.where(arr[:, :, 3] >= 128, 255, 0).astype(np.uint8)
    # Trim transparent border
    ys, xs = np.where(arr[:, :, 3] > 0)
    if len(ys) == 0:
        return Image.fromarray(arr), 0, 0
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    return Image.fromarray(arr[y0:y1, x0:x1]), x0, y0


def process_weapon(wname):
    d = os.path.join(ART, f'hero{wname}Gemini2Cal')
    json_path = os.path.join(d, 'atlas.json')
    png_path = os.path.join(d, 'atlas.png')
    with open(json_path, 'r', encoding='utf-8') as f:
        meta = json.load(f)
    atlas = Image.open(png_path).convert('RGBA')

    new_frames = []  # (key, idx, img, ax, ay)
    changed = 0

    for k, flist in meta['f'].items():
        short_k = k.split('.')[-1]
        for idx, fr in enumerate(flist):
            x, y, w, h, ax, ay = fr
            sub = atlas.crop((x, y, x + w, y + h))
            name = f'{short_k}{idx}'
            body_h, top_y, bot_y = measure_body_h(sub)

            scale = 1.0
            if not name.startswith(('dead', 'roll')):
                if body_h > 39:
                    scale = 37.0 / body_h
                elif body_h < 31 and body_h > 0 and not name.startswith(SKIP_UPSCALE):
                    scale = 36.0 / body_h

            if abs(scale - 1.0) > 0.03:
                sub2, dx, dy = rescale_sprite(sub, scale)
                nax = round(ax * scale - dx, 1)
                nay = round(ay * scale - dy, 1)
                _, _, nbot = measure_body_h(sub2)
                # Fix grounded frames that were sinking below ay
                if not name.startswith(AIRBORNE) and nbot > nay + 1:
                    nay = float(nbot)
                new_frames.append((k, idx, sub2, nax, nay))
                changed += 1
                print(f'  [{wname}] {name:12s} body_h {body_h:2d} -> scale {scale:.2f}x ({w}x{h} -> {sub2.width}x{sub2.height}, ay={nay})')
            else:
                nay = ay
                if not name.startswith(AIRBORNE) and bot_y > nay + 2:
                    nay = float(bot_y)
                    changed += 1
                    print(f'  [{wname}] {name:12s} anchor fix ay {ay} -> {nay}')
                new_frames.append((k, idx, sub, ax, nay))

    if changed == 0:
        print(f'[{wname}] no changes needed')
        return 0

    # Pack into single-row atlas with 2px padding (matching original layout)
    pad = 2
    total_w = sum(item[2].width + pad for item in new_frames) - pad
    max_h = max(item[2].height for item in new_frames)
    out_img = Image.new('RGBA', (total_w, max_h), (0, 0, 0, 0))

    new_meta = {'f': {k: [] for k in meta['f'].keys()}}
    cx = 0
    for k, idx, im, ax, ay in new_frames:
        out_img.paste(im, (cx, 0))
        # Keep clean int if whole number
        ax_v = int(ax) if float(ax).is_integer() else round(float(ax), 1)
        ay_v = int(ay) if float(ay).is_integer() else round(float(ay), 1)
        new_meta['f'][k].append([cx, 0, im.width, im.height, ax_v, ay_v])
        cx += im.width + pad

    out_img.save(png_path)
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(new_meta, f, ensure_ascii=False)
    print(f'[{wname}] updated {changed} frames -> atlas {total_w}x{max_h}')
    return changed


if __name__ == '__main__':
    total = 0
    for w in WEAPONS:
        total += process_weapon(w)
    print(f'Done. Total frames adjusted: {total}')

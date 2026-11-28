"""Fixed, anchor-relative character scaling; never normalize an individual pose.

Manual body-top marks on sword.idle0 exclude hats, crowns, ears and antennae.
Input comes from the reviewed commit so rerunning cannot grow sprites again.
"""
import io
import json
import math
import subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parents[2]
BASE = '74db8d1757db2548b56c4162dd0dec29bbf8177d'
# Princess: hair top y=2, boot anchor y=40 -> body height 38.
TARGET = 38
CONFIG = {
    'heroMech': {'bodyTop': 6, 'boot': 38, 'outline': True},
    'heroWitch': {'bodyTop': 11, 'boot': 42, 'outline': True},
    'heroMoon': {'bodyTop': 7, 'boot': 38, 'outline': True},
    'heroCat': {'bodyTop': 5, 'boot': 38, 'outline': True},
    'heroMiko': {'bodyTop': 0, 'boot': 38, 'outline': True},
    'heroK': {'bodyTop': 8, 'boot': 44, 'outline': False},
}


def original(path):
    return subprocess.run(['git', 'show', BASE+':'+path], cwd=ROOT, check=True, capture_output=True).stdout


def convert(im, ax, ay, scale, outline):
    pad = 3
    nx, ny = round(ax*scale)+pad, round(ay*scale)+pad
    size = (math.ceil(im.width*scale)+2*pad+2, math.ceil(im.height*scale)+2*pad+2)
    tile = im.transform(size, Image.Transform.AFFINE,
                        (1/scale, 0, ax-nx/scale, 0, 1/scale, ay-ny/scale),
                        Image.Resampling.NEAREST)
    a = np.array(tile)
    a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0)
    if outline:
        mask = a[:, :, 3] > 0
        edge = mask & ~nd.binary_erosion(mask)
        rgb = a[:, :, :3].astype(int)
        lum = rgb @ np.array([.2126, .7152, .0722])
        # Recolor saturated edge fringe, without removing opaque art.
        fringe = edge & (rgb[:, :, 0] > 105) & (rgb[:, :, 2] > 95) & (np.minimum(rgb[:, :, 0], rgb[:, :, 2])-rgb[:, :, 1] > 36) & (lum < 155)
        a[fringe, :3] = (33, 29, 41)
        neighbours = nd.convolve(mask.astype(int), np.ones((3, 3), int), mode='constant')
        # Protect bright thin weapons. Dark edging is added around solid masses.
        eligible = mask & ~((lum >= 155) & (neighbours <= 5))
        ring = nd.binary_dilation(eligible) & ~mask
        a[ring] = (33, 29, 41, 255)
        # New sole outline is one pixel below the original sole; compensate anchor.
        ny += 1
    # Preserve the original sole-to-anchor gap through nearest-neighbour rounding.
    # Only correct an existing nearby sole; airborne anchors remain untouched.
    before = np.array(im)
    by, bx = np.where(before[:, :, 3] >= 128)
    near = (np.abs(bx-ax) <= 17) & (by >= ay-4) & (by <= ay+1)
    cy, cx = np.where(a[:, :, 3] > 0)
    current = (np.abs(cx-nx) <= 17*scale) & (cy >= ny-4) & (cy <= ny+1)
    if near.any() and current.any():
        old_gap = ay-(by[near].max()+1)
        if abs(old_gap) <= 1.5:
            ny = round(cy[current].max()+1+old_gap*scale)
    return Image.fromarray(a), nx, ny


def main():
    compare = Image.new('RGB', (1680, len(CONFIG)*180), '#dfd4b4')
    draw = ImageDraw.Draw(compare)
    summary = []
    for row, (name, cfg) in enumerate(CONFIG.items()):
        meta = json.loads(original('art/'+name+'/atlas.json'))
        source = Image.open(io.BytesIO(original('art/'+name+'/atlas.png'))).convert('RGBA')
        scale = TARGET/(cfg['boot']-cfg['bodyTop'])
        dest = Image.new('RGBA', (2048, 2048))
        cache, frames = {}, {}
        x = y = height = 0
        for key, values in meta['f'].items():
            entries = []
            for f in values:
                tag = tuple(f)
                if tag not in cache:
                    ox, oy, w, h, ax, ay = f
                    tile, nax, nay = convert(source.crop((ox, oy, ox+w, oy+h)), ax, ay, scale, cfg['outline'])
                    if x+tile.width+2 > dest.width:
                        x = 0; y += height+2; height = 0
                    assert y+tile.height <= dest.height
                    dest.paste(tile, (x, y))
                    cache[tag] = [x, y, tile.width, tile.height, nax, nay]
                    x += tile.width+2; height = max(height, tile.height)
                entries.append(cache[tag])
            frames[key] = entries
        dest = dest.crop((0, 0, 2048, y+height+2))
        meta['f'] = frames
        # Update any stored dimensions while retaining action ownership and mappings.
        for field in ['w', 'width']:
            if field in meta: meta[field] = dest.width
        for field in ['h', 'height']:
            if field in meta: meta[field] = dest.height
        (ROOT/'art'/name/'atlas.json').write_text(json.dumps(meta, separators=(',', ':')), encoding='utf-8')
        dest.save(ROOT/'art'/name/'atlas.png')
        oldmeta = json.loads(original('art/'+name+'/atlas.json'))
        poses = [('sword.idle', 0), ('sword.idle', 1), ('sword.run', 0), ('sword.atk', 0), ('spear.idle', 0), ('scythe.idle', 0)]
        for col, (key, index) in enumerate(poses):
            key = 'hero:'+key
            for offset, atlas, j in [(0, source, oldmeta), (115, dest, meta)]:
                values = j['f'].get(key, j['f']['hero:sword.idle']); f = values[min(index,len(values)-1)]
                xx, yy, w, h, ax, ay = f
                tile = atlas.crop((xx, yy, xx+w, yy+h)).resize((w*2,h*2), Image.Resampling.NEAREST)
                cx = 100+col*260+offset; base = row*180+140
                compare.paste(tile, (round(cx-ax*2),round(base-ay*2)), tile)
                draw.line((cx-48,base,cx+54,base), fill='#237d49')
            draw.text((col*260+55,row*180+148), key.split(':')[1]+str(index)+' old / new', fill='#211d29')
        draw.text((5,row*180+10), name+' x'+str(round(scale,3)), fill='#211d29')
        summary.append({'set': name, 'bodyTop':cfg['bodyTop'], 'boot':cfg['boot'], 'targetBody':TARGET, 'scale':scale, 'outline':cfg['outline'], 'uniqueAnchorFrames':len(cache)})
    compare.save(ROOT/'art/compare_hero_body_scale.png')
    (ROOT/'art/hero_body_calibration.json').write_text(json.dumps({'base':BASE,'reference':{'set':'heroP','bodyTop':2,'boot':40},'heroes':summary},indent=2),encoding='utf-8')
    print('Calibrated 6 sets, fixed per-hero scales; '+str(sum(r['uniqueAnchorFrames'] for r in summary))+' frame/anchor entries')


if __name__ == '__main__': main()

"""Build the Cat hero from the seven preserved sprite sheets."""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from build_heroK import COMMON, ATK, TAIL

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "art"
CENTERS_Y = (90, 240, 390, 540, 690)


def cut_sheet(path):
    rgb = np.array(Image.open(path).convert("RGB"))
    r, g, b = rgb.astype(int).transpose(2, 0, 1)
    foreground = ~((r > 180) & (b > 155) & (np.minimum(r, b)-g > 90))
    for erosion in range(8):
        seeds = ndimage.binary_erosion(foreground,iterations=erosion) if erosion else foreground
        labels, _ = ndimage.label(seeds, np.ones((3, 3)))
        big = {}
        for cid, region in enumerate(ndimage.find_objects(labels), 1):
            ys, xs = region
            if np.count_nonzero(labels[region] == cid) < 300:
                continue
            row = int(np.argmin(np.abs(np.array(CENTERS_Y)-(ys.start+ys.stop)/2)))
            big.setdefault(row, []).append((xs.start, cid))
        sizes = np.bincount(labels.ravel())
        big = {row: sorted(parts, key=lambda part: -sizes[part[1]])[:8 if row<4 else 1]
               for row,parts in big.items()}
        if [len(big.get(row,[])) for row in range(5)] == [8,8,8,8,1]:
            break
    assert [len(big.get(row,[])) for row in range(5)] == [8,8,8,8,1], (path,big)
    order = [cid for row in range(5) for _,cid in sorted(big[row])]
    major = np.isin(labels, order)
    dist, nearest = ndimage.distance_transform_edt(~major, return_indices=True)
    owner = labels[tuple(nearest)]
    for cid in order:
        mask = (owner == cid) & foreground & (dist <= max(8, erosion + 5))
        ys,xs = np.where(mask)
        bounds = (slice(ys.min(),ys.max()+1),slice(xs.min(),xs.max()+1))
        sub = rgb[bounds].copy()
        m = mask[bounds]
        rr,gg,bb = sub.astype(int).transpose(2,0,1)
        edge = m & ~ndimage.binary_erosion(m)
        fringe = edge & (rr>105) & (bb>95) & (np.minimum(rr,bb)-gg>36)
        valid = m & ~fringe
        nearest_color = ndimage.distance_transform_edt(~valid,return_distances=False,return_indices=True)
        sub[fringe] = sub[tuple(nearest_color[:,fringe])]
        yield Image.fromarray(np.dstack((sub,m.astype(np.uint8)*255))), (int(xs.min()),int(ys.min()))


def main(directory="heroCat", hero_id="c"):
    sources = {w:list(cut_sheet(ART/'src'/directory/f'{w}.webp')) for w in ATK}
    sword = sources['sword']
    # All sheets share the same body poses. Measure anchors on the short sword
    # sheet so long weapons and tail tips cannot move the other weapon sets.
    anchors = []
    for i,(im,(x,y)) in enumerate(sword):
        mask = np.asarray(im)[:,:,3]>0
        cx = (83 if i==32 else 83+168*(i%8))
        yy,xx = np.where(mask)
        torso = np.abs(xx+x-cx)<=24
        ax = float(np.median(xx[torso])+x) if torso.any() else x+im.width/2
        boots = (xx+x>=cx-32)&(xx+x<=cx+23)
        ay = int(yy[boots].max()+1+y) if boots.any() else y+im.height
        anchors.append((ax,ay))
    scale = (42 if directory == "heroWitch" else 38)/(anchors[0][1]-sword[0][1][1])
    atlas = Image.new('RGBA',(1024,900))
    sheet = Image.new('RGB',(1320,700),'#e9ddc0')
    draw = ImageDraw.Draw(sheet)
    frames = {}
    own = {}
    x=y=tall=0
    for row,w in enumerate(ATK):
        n=0
        own[w]=[]
        draw.text((3,row*100+50),w,fill='black')
        for action,count in COMMON+ATK[w]+TAIL:
            entries=[]
            own[w].append(action)
            for _ in range(count):
                im,(sx,sy)=sources[w][n]
                ax,ay=anchors[n]
                width,height=(max(1,round(d*scale)) for d in im.size)
                cut=im.resize((width,height),Image.Resampling.NEAREST)
                if x+width>atlas.width:
                    x,y,tall=0,y+tall+2,0
                assert y+height<=atlas.height
                atlas.paste(cut,(x,y))
                px,py=round((ax-sx)*scale,1),round((ay-sy)*scale,1)
                entries.append([x,y,width,height,px,py])
                base=row*100+ (48 if n<17 else 97)
                center=65+(n%17)*76
                draw.line((center-35,base,center+36,base),fill='#398353')
                sheet.paste(cut,(center-round(px),base-round(py)),cut)
                x+=width+2
                tall=max(tall,height)
                n+=1
            frames[f'hero:{w}.{action}']=entries
            if w=='sword':
                frames[f'hero:{action}']=entries
        assert n==33
    dest=ART/directory
    dest.mkdir(exist_ok=True)
    atlas.crop((0,0,atlas.width,y+tall)).save(dest/'atlas.png')
    (dest/'atlas.json').write_text(json.dumps({'f':frames,'art':directory+'-7w','weapons':list(ATK),'own':own},separators=(',',':')),encoding='utf-8')
    portrait=sword[0][0].crop((8,0,86,76))
    portrait.save(ART/'portrait'/f'{hero_id}.webp',lossless=True)
    sheet.save(dest/'compare.png')


if __name__=='__main__':
    main()

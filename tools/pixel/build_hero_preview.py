"""Build calibrated sword/spear/bow preview atlases from 33-frame sheets.

Usage: python tools/pixel/build_hero_preview.py sword=sheet.png spear=sheet.png bow=sheet.png
Frames are cropped by silhouette, mapped to the legacy action order, normalized
to the legacy idle height, then palette-matched to the same legacy weapon.
"""
import json, os, pathlib, sys
os.environ.setdefault('LOKY_MAX_CPU_COUNT','4')
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
src = (ROOT / 'tools/pixel/build_heroM2.py').read_text(encoding='utf-8')
exec(src[:src.index('def main(args):')], globals())

def rgb_lab(rgb):
    v = np.asarray(rgb, dtype=np.float32) / 255.0
    v = np.where(v <= .04045, v / 12.92, ((v + .055) / 1.055) ** 2.4)
    xyz = v @ np.array([[.4124564,.2126729,.0193339],[.3575761,.7151522,.1191920],[.1804375,.0721750,.9503041]],np.float32)
    xyz /= np.array([.95047,1.,1.08883],np.float32)
    f = np.where(xyz > .008856, np.cbrt(xyz), 7.787 * xyz + 16/116)
    return np.stack([116*f[...,1]-16,500*(f[...,0]-f[...,1]),200*(f[...,1]-f[...,2])],axis=-1)

def lab_rgb(lab):
    L,a,b = lab[...,0],lab[...,1],lab[...,2]
    fy=(L+16)/116; fx=fy+a/500; fz=fy-b/200
    f=np.stack([fx,fy,fz],axis=-1)
    xyz=np.where(f**3 > .008856,f**3,(f-16/116)/7.787)*np.array([.95047,1.,1.08883],np.float32)
    rgb=xyz @ np.array([[3.2404542,-.9692660,.0556434],[-1.5371385,1.8760108,-.2040259],[-.4985314,.0415560,1.0572252]],np.float32)
    rgb=np.where(rgb <= .0031308,12.92*rgb,1.055*np.maximum(rgb,0)**(1/2.4)-.055)
    return np.clip(np.rint(rgb*255),0,255).astype(np.uint8)

ATK = {'sword':[('slash',3),('chop',2),('upper',2),('spin',2),('thrust',1)],
       'spear':[('thrust',2),('sweep',3),('lift',2),('twirl',2),('throw',1)],
       'bow':[('shoot',3),('sky',2),('side',1),('kneel',2),('rapid',1),('lower',1)]}

def old_palette(weapon):
    atlas=Image.open(ROOT/'art/hero/atlas.png').convert('RGBA')
    frames_json=json.loads((ROOT/'art/hero/atlas.json').read_text(encoding='utf-8'))['f']
    rects=[]
    for key,arr in frames_json.items():
        if key.startswith(f'hero:{weapon}.'):
            for x,y,w,h,*_ in arr:
                r=(x,y,w,h)
                if r not in rects: rects.append(r)
    samples=[]
    for x,y,w,h in rects:
        p=np.asarray(atlas.crop((x,y,x+w,y+h)))
        samples.append(p[p[...,3]>127,:3])
    return np.concatenate(samples), atlas

def frames(path):
    # Use connected silhouette bounds rather than row/cell rectangles.
    clean_src=src[:src.index('def main(args):')]
    start=clean_src.index('            h=ndimage.binary_fill_holes')
    end=clean_src.index('            im=Image.fromarray',start)
    clean_src=clean_src[:start]+clean_src[end:]
    clean_src=clean_src.replace('(np.minimum(a[...,0],a[...,2])-a[...,1]>40)', '( (a[...,0]>180)&(a[...,2]>150)&(np.minimum(a[...,0],a[...,2])-a[...,1]>80) )')
    namespace={}; exec(clean_src,namespace)
    return namespace['frames'](path)

def recolor(frames, old_rgb):
    # Direct nearest legacy palette preserves light metal and dark outlines.
    palette=np.unique(old_rgb,axis=0); plab=rgb_lab(palette)
    out=[]
    for im in frames:
        a=np.array(im); mask=a[...,3]>127; colors=a[mask,:3]
        lab=rgb_lab(colors); d=((lab[:,None,:]-plab[None,:,:])**2).sum(2)
        a[mask,:3]=palette[d.argmin(1)]; a[~mask,:3]=0
        out.append(Image.fromarray(a))
    return out

def build(weapon, path):
    fr=frames(path)
    assert len(fr)==33, f'{weapon}: expected 33 frames, got {len(fr)}'
    old_rgb,_=old_palette(weapon)
    source_height=body_h(fr[0])
    fr=recolor(fr,old_rgb)
    names=COMMON+ATK[weapon]+TAIL
    hh=source_height; scale=38/max(1,hh)
    scaled=[]
    for im in fr:
        g=im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.Resampling.NEAREST)
        a=np.array(g); mask=a[...,3]>127
        # One inner pixel of continuous dark contour, including weapon and holes.
        edge=mask & ~ndimage.binary_erosion(mask,structure=np.array([[0,1,0],[1,1,1],[0,1,0]]),border_value=0)
        a[edge,:3]=[58,34,24]
        # Despill only edge-adjacent magenta contamination, preserving cape interiors.
        near=mask & ndimage.binary_dilation(edge)
        r,gg,b=a[...,:3].astype(np.int16).transpose(2,0,1)
        spill=near & (r>gg*1.35) & (b>gg*1.35) & (r>90)
        a[spill,:3]=[58,34,24]
        a[...,3]=np.where(mask,255,0); a[~mask,:3]=0
        scaled.append(Image.fromarray(a))
    W=sum(im.width+2 for im in scaled); H=max(im.height for im in scaled)
    atlas=Image.new('RGBA',(W,H),(0,0,0,0)); x=idx=0; mapping={}
    for name,count in names:
        arr=[]
        for _ in range(count):
            im=scaled[idx]; idx+=1; atlas.alpha_composite(im,(x,0))
            yy,xx=np.where(np.asarray(im)[...,3]>0); bottom=xx[yy>=yy.max()-3]
            arr.append([x,0,im.width,im.height,float((bottom.min()+bottom.max())/2),im.height]); x+=im.width+2
        mapping[f'hero:{weapon}.{name}']=arr
    dest=ROOT/f'art/hero{weapon.title()}Preview'; dest.mkdir(exist_ok=True)
    atlas.save(dest/'atlas.png'); (dest/'atlas.json').write_text(json.dumps({'f':mapping},separators=(',',':')),encoding='utf-8')
    print(weapon, 'frames=33', 'legacy-height=38', 'scale=',round(scale,3),'atlas=',atlas.size)

if __name__=='__main__':
    for arg in sys.argv[1:]:
        weapon,path=arg.split('=',1); build(weapon,path)

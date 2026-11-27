"""Build calibrated sword/spear/bow preview atlases from 33-frame sheets.

Usage: python tools/pixel/build_hero_preview.py sword=sheet.png spear=sheet.png bow=sheet.png
Frames are cropped by silhouette, mapped to the legacy action order, normalized
to the legacy idle height, then palette-matched to the same legacy weapon.
"""
import json, os, pathlib, sys
os.environ.setdefault('LOKY_MAX_CPU_COUNT','4')
import numpy as np
from PIL import Image
from scipy.optimize import linear_sum_assignment
from sklearn.cluster import KMeans

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

def recolor(frames, old_rgb):
    old_lab=rgb_lab(old_rgb)
    pts=[]
    source_hair=[]
    for im in frames:
        a=np.asarray(im); visible=a[a[...,3]>127,:3]; pts.append(rgb_lab(visible))
        c=visible.astype(np.float32); hm=(c[:,0]>c[:,1]*1.35)&(c[:,0]>c[:,2]*1.9)&(c[:,1]>40)&(c[:,1]<190)
        source_hair.append(rgb_lab(visible[hm]))
    new_lab=np.concatenate(pts)
    old_color=old_rgb.astype(np.float32)
    old_hm=(old_color[:,0]>old_color[:,1]*1.35)&(old_color[:,0]>old_color[:,2]*1.9)&(old_color[:,1]>40)&(old_color[:,1]<190)
    old_hair=rgb_lab(old_rgb[old_hm]); source_hair=np.concatenate(source_hair)
    hair_src_mu=source_hair.mean(0); hair_dst_mu=old_hair.mean(0)
    hair_ratio=np.minimum(1.5,np.maximum(old_hair.std(0),1.)/np.maximum(source_hair.std(0),1.))
    km_old=KMeans(n_clusters=8,random_state=21,n_init=5).fit(old_lab)
    km_new=KMeans(n_clusters=8,random_state=21,n_init=5).fit(new_lab)
    oc,nc=km_old.cluster_centers_,km_new.cluster_centers_
    cost=np.linalg.norm(oc[:,None,1:]-nc[None,:,1:],axis=2)
    oi,ni=linear_sum_assignment(cost)
    old_mu=[]; old_sd=[]; new_mu=[]; new_sd=[]
    for i in range(8):
        op=old_lab[km_old.labels_==i]; npix=new_lab[km_new.labels_==i]
        old_mu.append(op.mean(0)); old_sd.append(np.maximum(op.std(0),1.0))
        new_mu.append(npix.mean(0)); new_sd.append(np.maximum(npix.std(0),1.0))
    match={int(j):int(i) for i,j in zip(oi,ni)}
    def transfer(lab, labels):
        mapped=np.empty_like(lab)
        for j in range(8):
            sel=labels==j
            if not np.any(sel): continue
            k=match[j]; ratio=np.minimum(1.5,old_sd[k]/new_sd[j])
            mapped[sel]=(lab[sel]-new_mu[j])*ratio+old_mu[k]
        return mapped
    cluster_mapped=transfer(new_lab,km_new.labels_)
    old_l_mean,old_l_std=old_lab[:,0].mean(),max(1.,old_lab[:,0].std())
    mapped_l_mean,mapped_l_std=cluster_mapped[:,0].mean(),max(1.,cluster_mapped[:,0].std())
    global_l_scale=min(1.5,old_l_std/mapped_l_std)
    palette=np.unique(np.asarray(old_rgb,dtype=np.uint8),axis=0); plab=rgb_lab(palette)
    out=[]
    for im in frames:
        a=np.array(im.convert('RGBA')); mask=a[...,3]>127
        lab=rgb_lab(a[mask,:3]); mapped=transfer(lab,km_new.predict(lab))
        mapped[:,0]=(mapped[:,0]-mapped_l_mean)*global_l_scale+old_l_mean
        c=a[mask,:3].astype(np.float32); hair=(c[:,0]>c[:,1]*1.35)&(c[:,0]>c[:,2]*1.9)&(c[:,1]>40)&(c[:,1]<190)
        mapped[hair]=(lab[hair]-hair_src_mu)*hair_ratio+hair_dst_mu
        target=lab_rgb(mapped); d=((rgb_lab(target)[:,None,:]-plab[None,:,:])**2).sum(2)
        a[mask,:3]=palette[d.argmin(1)]; a[~mask,:3]=0; a[...,3]=np.where(mask,255,0)
        out.append(Image.fromarray(a))
    return out

def frames(path):
    # Use connected silhouette bounds rather than row/cell rectangles.
    clean_src=src[:src.index('def main(args):')]
    start=clean_src.index('            h=ndimage.binary_fill_holes')
    end=clean_src.index('            im=Image.fromarray',start)
    clean_src=clean_src[:start]+clean_src[end:]
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
        a=np.array(g); a[...,3]=np.where(a[...,3]>127,255,0); scaled.append(Image.fromarray(a))
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

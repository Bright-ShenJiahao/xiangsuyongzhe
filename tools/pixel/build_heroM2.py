# 11/27 阿远新版精灵：每把武器一张 33 帧 AI 图 → 按轮廓切帧、按像素块缩到 42px 高 → art/heroM2/atlas.png/json
# 用法：python3 build_heroM2.py sword=图.png staff=图.png ...
import sys, json, numpy as np
from PIL import Image
from scipy import ndimage
COMMON=[('idle',2),('run',4),('roll',3),('back',1),('hurt',1),('dead',1),('charge',2),('dash',1),('stop',1),('jump',1),('slam',1)]
TAIL=[('up',1),('finish',1),('atk',2),('big',1)]
ATK={'sword':[('slash',3),('chop',2),('upper',2),('spin',2),('thrust',1)],
 'spear':[('thrust',2),('sweep',3),('lift',2),('twirl',2),('throw',1)],
 'bow':[('shoot',3),('sky',2),('side',1),('kneel',2),('rapid',1),('lower',1)],
 'staff':[('point',2),('raise',2),('stomp',2),('twirl',2),('palm',2)],
 'tome':[('cast',3),('raise',2),('push',2),('guard',2),('orbit',1)],
 'scythe':[('reap',3),('toss',2),('hook',2),('chop',2),('spin',1)],
 'gun':[('press',3),('rapid',2),('aim',2),('toss',2),('sky',1)]}
def frames(path):
    a=np.array(Image.open(path).convert('RGB')).astype(int)
    bg=np.median(np.concatenate([a[0],a[-1],a[:,0],a[:,-1]]),axis=0); fg=np.abs(a-bg).max(-1)>30
    L,n=ndimage.label(ndimage.binary_dilation(fg,iterations=6))
    ob=[(s,i+1) for i,s in enumerate(ndimage.find_objects(L)) if (s[0].stop-s[0].start)*(s[1].stop-s[1].start)>2500]
    ob.sort(key=lambda o:(o[0][0].start+o[0][0].stop)/2); rows=[]
    for o in ob:
        cy=(o[0][0].start+o[0][0].stop)/2
        if rows and abs(cy-rows[-1][0])<90: rows[-1][1].append(o)
        else: rows.append([cy,[o]])
    cw=a.shape[1]/8; out=[]   # 每行按 8 格分列，同一格里的碎块（飞出去的方块、光束）并成一帧
    for _,r in rows:
        cells={}
        for sl,lid in r: cells.setdefault(int(((sl[1].start+sl[1].stop)/2)//cw),[]).append((sl,lid))
        for k in sorted(cells):
            grp=cells[k]; y0=min(g[0][0].start for g in grp); y1=max(g[0][0].stop for g in grp); x0=min(g[0][1].start for g in grp); x1=max(g[0][1].stop for g in grp)
            m=np.isin(L[y0:y1,x0:x1],[g[1] for g in grp])&fg[y0:y1,x0:x1]
            h=ndimage.binary_fill_holes(m)&~m; hl,hn=ndimage.label(h)   # 11/27 身体里被抠空的小缝（披风和手臂之间等）补回来，不透出背景
            for j in range(1,hn+1):
                if (hl==j).sum()<700: m|=hl==j
            im=Image.fromarray(np.dstack([a[y0:y1,x0:x1],np.where(m,255,0)]).astype(np.uint8),'RGBA'); out.append(im.crop(im.getbbox()))
    return out
def body_h(im):
    A=np.array(im).astype(int); r,g,b,al=A[...,0],A[...,1],A[...,2],A[...,3]
    hair=(al>0)&(r>150)&(g>70)&(g<150)&(b<90)&(r-b>90)
    ys=np.where(hair.sum(1)>=3)[0]; return im.height-ys.min() if len(ys) else im.height
SC=38.9/125   # 11/27 对齐旧版阿远：待机帧头发顶到脚底 38px
def main(args):
    small={}; 
    for arg in args:
        w,p=arg.split('=',1); fr=frames(p); names=COMMON+ATK[w]+TAIL; need=sum(c for _,c in names)
        assert len(fr)==need,(w,len(fr),need)
        hh=body_h(fr[0]); ref=ref if 'ref' in dir() and ref else hh   # 待机帧：从头发顶到脚底的高度（不算举过头的武器）
        sc=SC*ref/hh; print(w,'scale',round(sc,3)); L=[]
        for f in fr:
            g=f.resize((max(1,round(f.width*sc)),max(1,round(f.height*sc))),Image.NEAREST); A=np.array(g); A[...,3]=np.where(A[...,3]>127,255,0); L.append(Image.fromarray(A))
        small[w]=(names,L)
    W=sum(s.width+2 for _,L in small.values() for s in L); H=max(s.height for _,L in small.values() for s in L)
    atlas=Image.new('RGBA',(W,H),(0,0,0,0)); x=0; out={}
    for w,(names,L) in small.items():
        i=0
        for nm,c in names:
            arr=[]
            for _ in range(c):
                s=L[i]; i+=1; atlas.paste(s,(x,0)); A=np.array(s)[...,3]; ys,xs=np.where(A>0); bot=xs[ys>=ys.max()-3]
                arr.append([x,0,s.width,s.height,float((bot.min()+bot.max())/2),s.height]); x+=s.width+2
            out[f'hero:{w}.{nm}']=arr
    atlas.save('art/heroM2/atlas.png'); json.dump({'f':out},open('art/heroM2/atlas.json','w')); print('ok',list(small),atlas.size)
main(sys.argv[1:])

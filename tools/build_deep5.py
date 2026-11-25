import sys; sys.path.insert(0,'/tmp')
import numpy as np, cv2, json
from PIL import Image
from scipy import ndimage
exec(open('comp.py').read().split("b1=Image.open")[0])
U='/mnt/user-data/uploads/'
def key(f):
    a=np.array(Image.open(U+f).convert('RGB')).astype(float); d=np.linalg.norm(a-np.array([255,0,255.]),axis=-1)
    al=np.clip((d-45)/(160-45),0,1); m=(al>.5).astype(np.uint8); n,l,st,_=cv2.connectedComponentsWithStats(m)
    keep=np.isin(l,[i for i in range(1,n) if st[i][4]>2000]); al[~cv2.dilate(keep.astype(np.uint8),np.ones((5,5),np.uint8)).astype(bool)]=0
    core=cv2.erode((al>=.999).astype(np.uint8),np.ones((5,5),np.uint8)).astype(bool); idx=ndimage.distance_transform_edt(~core,return_indices=True)[1]
    im=np.dstack([a[idx[0],idx[1]],al*255]).astype(np.uint8); ys,xs=np.nonzero(im[...,3]>20); x0,y0=xs.min(),ys.min()
    return Image.fromarray(im[y0:ys.max()+1,x0:xs.max()+1]),(x0,y0)
def surf2(im):
    a=np.array(im).astype(int); al=a[...,3]>128; r,g,b=a[...,0],a[...,1],a[...,2]
    al=cv2.morphologyEx(al.astype(np.uint8),cv2.MORPH_OPEN,np.ones((9,9),np.uint8)).astype(bool)
    hc=int(al.shape[0]*.36); f=np.zeros_like(al); f[:-hc]=al[:-hc]&al[hc:]
    gr=(g>b+12)&(g>=r-10); m=(f&cv2.dilate(gr.astype(np.uint8),np.ones((21,21),np.uint8)).astype(bool)).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((25,25),np.uint8)); m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((15,15),np.uint8))
    n,l,st,_=cv2.connectedComponentsWithStats(m); k=1+np.argmax(st[1:,4]); m=(l==k).astype(np.uint8)
    m=cv2.erode(m,np.ones((15,15),np.uint8))
    c,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE); c=max(c,key=cv2.contourArea)
    return cv2.approxPolyDP(c,4,True)[:,0].tolist()
K=1.0
def sc(im): return im.resize((round(im.width*K),round(im.height*K)),Image.LANCZOS)
(Li,_),(Ri,_),(Si,so)=key('c91c9caf-image.png'),key('e02b91af-image.png'),key('12a544f2-image.png')
for n,im in (('L5',Li),('R5',Ri),('S5',Si)): im.save(n+'.png')
Li,Ri,Si=sc(Li),sc(Ri),sc(Si)
sL,sR=surf2(Li),surf2(Ri)
# stone polys in original image coords -> crop -> scale
def sp(pts): return [[(x-so[0])*K,(y-so[1])*K] for x,y in pts]
top=sp([(545,300),(1105,300),(1115,592),(545,600)]); stL=sp([(330,385),(560,385),(560,545),(330,545)]); stR=sp([(1095,385),(1320,385),(1320,545),(1095,545)])
W,H=2174,941
b1=np.array(Image.open(U+'bc053283-image.png').convert('RGB')).astype(float); b2=np.array(Image.open(U+'6aeab8b3-image.png').convert('RGB')).astype(float)
A=np.zeros((H,W,3)); A[:,:1672]=b1; ov=160; R=b2[:,1672-(W-1672)-ov:]; t=np.linspace(0,1,ov)[None,:,None]
A[:,1672-ov:1672]=A[:,1672-ov:1672]*(1-t)+R[:,:ov]*t; A[:,1672:]=R[:,ov:]
cv_=Image.fromarray(A.astype(np.uint8)).convert('RGBA')
cy=lambda s:np.mean([p[1] for p in s])
tuck=(Li.width+Si.width+Ri.width-(W-140))/2; tot=Li.width+Si.width-2*tuck+Ri.width; xL=int((W-tot)/2); xS=int(xL+Li.width-tuck); xR=int(xS+Si.width-tuck)
yL=int(470-cy(sL)); yS=int(470-np.mean([p[1] for p in stL])); yR=int(470-cy(sR))
cv_.alpha_composite(Li,(xL,yL)); cv_.alpha_composite(Ri,(xR,yR)); cv_.alpha_composite(Si,(xS,yS))
polys=[[[x+xL,y+yL] for x,y in sL],[[x+xR,y+yR] for x,y in sR]]+[[[x+xS,y+yS] for x,y in p] for p in (top,stL,stR)]
print('tuck',tuck,W,tot,xL,xS,xR,yL,yS,yR)
cv_.convert('RGB').save('/home/claude/xiangsuyongzhe/art/map/deep5.webp',quality=92)
json.dump({'w':W,'h':H,'poly':[[[int(a),int(b)] for a,b in p] for p in polys]},open('deep5.json','w'))
o=np.array(cv_.convert('RGB')); v=o.copy()
for p in polys: cv2.fillPoly(v,[np.array(p,np.int32)],(80,255,80))
o=cv2.addWeighted(v,.3,o,.7,0)
for p in polys: cv2.polylines(o,[np.array(p,np.int32)],True,(255,40,40),3)
Image.fromarray(o).resize((W//2,H//2)).save('prev5.png'); cv_.convert('RGB').resize((W//2,H//2)).save('raw5.png')

import numpy as np, cv2, json
from PIL import Image
src=np.array(Image.open('/mnt/user-data/uploads/b709fac6-image.png').convert('RGB'))
H0,W0=src.shape[:2]; a=src.astype(int); r,g,b=a[...,0],a[...,1],a[...,2]
m=((g>70)&(g>=b+8)&(r+g>150)).astype(np.uint8); m[:300]=0
m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((21,21),np.uint8))
# cliffs: grey stone also; include anything not blue-fog under surfaces: expand down
fog=(b>r+8)&(b>g-5)
P=json.load(open('/tmp/m/poly.json'))
def piece(rect,extra=None):
    x0,y0,x1,y1=rect; M=np.zeros((H0,W0),np.uint8); M[y0:y1,x0:x1]=1
    M=M&((m>0)|(~fog)).astype(np.uint8)
    if extra is not None: M&=extra
    M=cv2.morphologyEx(M,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
    n,l,st,_=cv2.connectedComponentsWithStats(M); k=1+np.argmax(st[1:,4]); M=(l==k).astype(np.uint8)
    M=cv2.morphologyEx(M,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
    al=cv2.GaussianBlur(M.astype(np.float32),(3,3),0)
    rgba=np.dstack([src,(al*255).astype(np.uint8)])[y0:y1,x0:x1]
    return rgba,(x0,y0)
ex=np.ones((H0,W0),np.uint8); ex[548:,:598]=0   # main: drop log part
A=piece((540,318,1066,840),ex)
ex2=np.ones((H0,W0),np.uint8); ex2[:, 625:]=0
L=piece((95,535,640,760),ex2)
ex3=np.ones((H0,W0),np.uint8); ex3[:, :1162]=0; ex3[548:,:]=0
S1=piece((1155,402,1352,700),ex3)
ex4=np.ones((H0,W0),np.uint8); ex4[:,1168:]=0; ex4[:,:1046]=0
LG2=piece((1040,478,1205,640),ex4)
ex5=np.ones((H0,W0),np.uint8); ex5[:540]=0; ex5[668:]=0
RT=piece((1212,540,1285,668),ex5)
S2=piece((1172,655,1390,880))
# background: inpaint pieces away
big=cv2.dilate(((m>0)|(~fog)).astype(np.uint8),np.ones((15,15),np.uint8)); big[:310]=0; big[:,:140]=0; big[:,1525:]=0
sm=cv2.resize(src,(W0//2,H0//2)); mk=cv2.resize(big,(W0//2,H0//2),interpolation=cv2.INTER_NEAREST)
inp=cv2.inpaint(sm,mk,9,cv2.INPAINT_TELEA); inp=cv2.GaussianBlur(inp,(9,9),0); inp=cv2.resize(inp,(W0,H0))
B=src.copy(); bm=big.astype(bool); B[bm]=inp[bm]
W,H=2350,1250
bg=np.zeros((H,W,3),np.uint8)
bg=bg.astype(float); Bf=B.astype(float)
bg[:H0,:W0]=Bf
ov=100; R2=Bf[:,140-ov:140+W-W0]; t=np.linspace(0,1,ov)[None,:,None]
bg[:H0,W0-ov:W0]=bg[:H0,W0-ov:W0]*(1-t)+R2[:,:ov]*t; bg[:H0,W0:W]=R2[:,ov:]
T2=Bf[:,:150][:,::-1]; t=np.linspace(0,1,60)[None,:,None]; bg[:H0,W-150:W-90]=bg[:H0,W-150:W-90]*(1-t)+T2[:,:60]*t; bg[:H0,W-90:W]=T2[:,60:]
ex_=H-H0; ov=160; SRC=bg[H0-ex_-ov:H0].copy(); t=np.linspace(0,1,ov)[:,None,None]
bg[H0-ov:H0]=bg[H0-ov:H0]*(1-t)+SRC[:ov]*t; bg[H0:H]=SRC[ov:ov+ex_]
d=np.clip((np.arange(H)-650)/(H-650),0,1)[:,None,None]; bg*=1-.45*d
bg=np.clip(bg,0,255).astype(np.uint8)
canvas=Image.fromarray(bg).convert('RGBA')
polys=[]
def put(pc,dx,dy,flip=False,poly=None):
    rgba,(x0,y0)=pc; im=Image.fromarray(rgba)
    w=rgba.shape[1]
    if flip: im=im.transpose(Image.FLIP_LEFT_RIGHT)
    canvas.alpha_composite(im,(x0+dx,y0+dy))
    if poly:
        pts=P[poly]
        if flip: pts=[[2*x0+w-x,y] for x,y in pts]
        if poly in ('log','log2','root'):
            cx=sum(p[0] for p in pts)/len(pts); cy=sum(p[1] for p in pts)/len(pts); kx,ky={'log':(1.1,1),'log2':(1.3,1),'root':(1,1.45)}[poly]
            pts=[[cx+(x-cx)*kx,cy+(y-cy)*ky] for x,y in pts]
        polys.append([[x+dx,y+dy] for x,y in pts])
put(L,690,-50,True,'log'); put(LG2,395,80,True,'log2')
put(A,-250,0,False,'main'); put(S1,100,95,False,'p1')
put(A,1015,105,True,'main'); put(RT,-710,105,False,'root')
put(L,690,330,True,"log"); put(A,-252,425,False,'main'); put(S2,85,235,False,"p2")
canvas.convert('RGB').save('/home/claude/xiangsuyongzhe/art/map/deep2.webp',quality=92)
json.dump({'w':W,'h':H,'poly':polys},open('/tmp/st/deep2.json','w'))
o=np.array(canvas.convert('RGB')); ov=o.copy()
for p in polys: cv2.fillPoly(ov,[np.array(p,np.int32)],(80,255,80))
o=cv2.addWeighted(ov,.3,o,.7,0)
for p in polys: cv2.polylines(o,[np.array(p,np.int32)],True,(255,40,40),3)
Image.fromarray(o).resize((W//2,H//2)).save('/tmp/st/prev.png'); canvas.convert('RGB').resize((W//2,H//2)).save('/tmp/st/raw.png')

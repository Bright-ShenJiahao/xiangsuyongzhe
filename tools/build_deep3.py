import numpy as np, cv2, json
from PIL import Image
U='/mnt/user-data/uploads/'
def L(n): return Image.open(n+'.png')
def surf(im):
    a=np.array(im).astype(int); al=a[...,3]>128; r,g,b=a[...,0],a[...,1],a[...,2]
    al=cv2.morphologyEx(al.astype(np.uint8),cv2.MORPH_OPEN,np.ones((9,9),np.uint8)).astype(bool)
    hc=int(al.shape[0]*.2); f=np.zeros_like(al); f[:-hc]=al[:-hc]&al[hc:]
    gr=(g>b+12)&(g>=r-10); m=(f&cv2.dilate(gr.astype(np.uint8),np.ones((21,21),np.uint8)).astype(bool)).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((25,25),np.uint8)); m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((15,15),np.uint8))
    n,l,st,_=cv2.connectedComponentsWithStats(m); k=1+np.argmax(st[1:,4]); m=(l==k).astype(np.uint8)
    m=cv2.erode(m,np.ones((15,15),np.uint8))
    c,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE); c=max(c,key=cv2.contourArea)
    return cv2.approxPolyDP(c,4,True)[:,0].tolist()
def band(im,t,b,l=-0.12,r=1.12):
    h,w=im.size[1],im.size[0]; return [[w*l,h*t],[w*r,h*t],[w*r,h*b],[w*l,h*b]]
b1=Image.open(U+'bc053283-image.png').convert('RGB'); b2=Image.open(U+'6aeab8b3-image.png').convert('RGB')
W,H=3344,941; A=np.zeros((H,W,3),float); A[:,:1672]=np.array(b1); B=np.array(b2).astype(float)
ov=160; t=np.linspace(0,1,ov)[None,:,None]; A[:,1672-ov:1672]=A[:,1672-ov:1672]*(1-t)+B[:,:ov]*t; A[:,1672:]=B
cv_=Image.fromarray(A.astype(np.uint8)).convert('RGBA')
P={k:L(k) for k in ['B1','B2','B3','s1','s2','s3','logL','logS','root','bridge']}
SP={k:surf(P[k]) for k in ['B1','B2','B3','s3']}
cy=lambda k:np.mean([p[1] for p in SP[k]])
Y=170; place=[];polys=[]
def add(k,x,y,poly): place.append((k,x,y)); polys.append([[px+x,py+y] for px,py in poly])
x=150; add('B1',x,Y,SP['B1']); xe=x+P['B1'].size[0]
def bridge(k,xe,yc,t,b):
    im=P[k]; y=int(yc-im.size[1]*(t+b)/2); x=xe-90; add(k,x,y,band(im,t,b)); return x+im.size[0]
xe=bridge('logL',xe,Y+cy('B1'),.12,.5); x=xe-90; add('B2',x,Y,SP['B2']); xe=x+P['B2'].size[0]
xe=bridge('bridge',xe,Y+cy('B2'),.42,.78); x=xe-90; add('B3',x,Y,SP['B3']); xe=x+P['B3'].size[0]
xe=bridge('logS',xe,Y+cy('B3'),.12,.5); x=xe-90; ys=int(Y+cy('B3')-cy('s3')); add('s3',x,ys,SP['s3'])
order=sorted(place,key=lambda p:(0 if p[0] in('logL','logS','bridge','root') else 1))
for k,x,y in order: cv_.alpha_composite(P[k],(int(x),int(y)))
cv_.convert('RGB').save('/home/claude/xiangsuyongzhe/art/map/deep3.webp',quality=92)
json.dump({'w':W,'h':H,'poly':[[[int(a),int(b)] for a,b in p] for p in polys]},open('deep3.json','w'))
o=np.array(cv_.convert('RGB')); v=o.copy()
for p in polys: cv2.fillPoly(v,[np.array(p,np.int32)],(80,255,80))
o=cv2.addWeighted(v,.3,o,.7,0)
for p in polys: cv2.polylines(o,[np.array(p,np.int32)],True,(255,40,40),3)
Image.fromarray(o).resize((W//2,H//2)).save('prev.png'); cv_.convert('RGB').resize((W//2,H//2)).save('raw.png'); print(xe)

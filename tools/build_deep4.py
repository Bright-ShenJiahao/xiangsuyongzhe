import numpy as np, cv2, json
from PIL import Image
exec(open('comp.py').read().split("b1=Image.open")[0])
U='/mnt/user-data/uploads/'
b1=np.array(Image.open(U+'bc053283-image.png').convert('RGB')).astype(float); b2=np.array(Image.open(U+'6aeab8b3-image.png').convert('RGB')).astype(float)
W,H=2508,941; A=np.zeros((H,W,3)); A[:,:1672]=b1; R=b2[:,1672-(W-1672)-160:]; ov=160; t=np.linspace(0,1,ov)[None,:,None]
A[:,1672-ov:1672]=A[:,1672-ov:1672]*(1-t)+R[:,:ov]*t; A[:,1672:]=R[:,ov:]
cv_=Image.fromarray(A.astype(np.uint8)).convert('RGBA')
def sc(n,k): im=Image.open(n+'.png'); return im.resize((round(im.width*k),round(im.height*k)),Image.LANCZOS)
PK,BK=1.1,1.25
B1,B3,BR=sc('B1',PK),sc('B3',PK),sc('bridge',BK)
s1,s3=surf(B1),surf(B3); cy=lambda s:np.mean([p[1] for p in s])
Y=150; tot=B1.width-90+2*BR.width-60-90+B3.width; xA=(W-tot)//2; xB=xA+tot-B3.width; yB=int(Y+cy(s1)-cy(s3))
bl=xA+B1.width-90; yc=Y+cy(s1); t_,b_=.42,.78; by=int(yc-BR.height*(t_+b_)/2)
polys=[[[p[0]+xA,p[1]+Y] for p in s1],[[p[0]+xB,p[1]+yB] for p in s3]]
x2=bl+BR.width-60
for x in (bl,x2): cv_.alpha_composite(BR,(int(x),by))
polys.append([[bl-40,by+BR.height*t_],[x2+BR.width+40,by+BR.height*t_],[x2+BR.width+40,by+BR.height*b_],[bl-40,by+BR.height*b_]])
cv_.alpha_composite(B1,(xA,Y)); cv_.alpha_composite(B3,(xB,yB))
print('bridge span',bl,x2+BR.width,'overlap',bl+BR.width-x2)
cv_.convert('RGB').save('/home/claude/xiangsuyongzhe/art/map/deep4.webp',quality=92)
json.dump({'w':W,'h':H,'poly':[[[int(a),int(b)] for a,b in p] for p in polys]},open('deep4.json','w'))
cv_.convert('RGB').resize((W//2,H//2)).save('raw4.png')

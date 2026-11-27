"""Extend exposed weapon shafts without scaling the hero or blade."""
import json
from pathlib import Path
import numpy as np
from scipy import ndimage
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2]
# Direction from hands toward blade, in source frame order.
D=[(1,-1),(1,-1),(1,0),(1,0),(1,0),(1,0),(1,0),(1,-1),(1,-.4),(1,-.4),(1,-.4),(1,0),(-1,0),(-1,-1),(1,0),(1,-.3),(1,-.4),(1,0),(-1,0),(1,0),(1,.4),(0,-1),(1,.4),(1,.4),(1,-1),(1,0),(1,0),(1,0),(0,-1),(0,-1),(-1,-1),(1,0),(0,-1)]
def build(w):
 path=ROOT/('art/hero'+w.title()+'Preview');im=Image.open(path/'atlas.png').convert('RGBA');data=json.loads((path/'atlas.json').read_text());out=[];index=0
 for key,arr in data['f'].items():
  for frame in arr:
   x,y,ww,hh,ax,ay=frame;a=np.array(im.crop((x,y,x+ww,y+hh)));rgb=a[:,:,:3].astype(float)
   metal=(a[:,:,3]>0)&(rgb.max(2)-rgb.min(2)<48)&(rgb.mean(2)>110)
   labels,n=ndimage.label(ndimage.binary_dilation(metal,iterations=1));candidates=[]
   for lid in range(1,n+1):
    ys,xs=np.where((labels==lid)&metal)
    if len(xs)>=2:candidates.append((len(xs),xs,ys))
   if not candidates: raise ValueError((w,key,index,'blade missing'))
   _,xs,ys=max(candidates,key=lambda c:c[0]);cx,cy=float(xs.mean()),float(ys.mean())
   dx,dy=D[index];index+=1
   if w=='scythe' and index in [13]:dx,dy=1,0
   v=np.array([dx,dy],float);v/=np.linalg.norm(v);extension=11 if w=='spear' else 10;shift=np.rint(v*extension).astype(int)
   # Restrict movable pixels to blade and the short exposed shaft next to it.
   yy,xx=np.indices(a.shape[:2]);proj=(xx-cx)*v[0]+(yy-cy)*v[1];cross=np.abs((xx-cx)*v[1]-(yy-cy)*v[0])
   blob=ndimage.binary_dilation(labels==int(labels[int(round(cy)),int(round(cx))]),iterations=1)
   # Blade metal plus its adjacent outline; shaft is redrawn straight.
   blade=ndimage.binary_dilation(metal & (labels==labels[ys[0],xs[0]]),iterations=1)&(a[:,:,3]>0)
   pad=20;canvas=Image.new('RGBA',(ww+40,hh+40));body=a.copy();body[blade]=0;canvas.alpha_composite(Image.fromarray(body),(pad,pad))
   tip=Image.fromarray(np.where(blade[:,:,None],a,0).astype('uint8'))
   g=ImageDraw.Draw(canvas);start=(cx-v[0]*5+pad,cy-v[1]*5+pad);end=(cx+shift[0]+pad,cy+shift[1]+pad)
   g.line([start,end],fill=(58,34,24,255),width=3);g.line([start,end],fill=(147,91,48,255) if w=='spear' else (88,66,61,255),width=1)
   canvas.alpha_composite(tip,(pad+int(shift[0]),pad+int(shift[1])))
   box=canvas.getbbox();canvas=canvas.crop(box);out.append((key,canvas,ax+pad-box[0],ay+pad-box[1]))
 atlas=Image.new('RGBA',(sum(f.width+2 for _,f,_,_ in out),max(f.height for _,f,_,_ in out)));mapping={};x=0
 for key,f,ax,ay in out:atlas.alpha_composite(f,(x,0));mapping.setdefault(key,[]).append([x,0,f.width,f.height,ax,ay]);x+=f.width+2
 atlas.save(path/'atlas.png');(path/'atlas.json').write_text(json.dumps({'f':mapping}),encoding='utf-8')
for w in ['spear','scythe']:build(w)

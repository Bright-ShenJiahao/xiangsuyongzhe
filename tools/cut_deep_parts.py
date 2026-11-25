import sys; sys.path.insert(0,'/tmp')
import numpy as np, cv2, json
from PIL import Image
from scipy import ndimage
from cells import cells
U='/mnt/user-data/uploads/'
out={}
def cut(f,names,dil=20):
    a,rows=cells(U+f,dil=dil,minpx=3000); cs=[c for r in rows for c in r]; print(f,[ (c['x'],c['y'],c['w'],c['h']) for c in cs])
    for c,nm in zip(cs,names):
        pad=6;x0=max(c['x']-pad,0);y0=max(c['y']-pad,0);x1=min(c['x']+c['w']+pad,a.shape[1]);y1=min(c['y']+c['h']+pad,a.shape[0])
        sub=a[y0:y1,x0:x1].astype(float); keep=np.zeros(sub.shape[:2],bool); keep[c['y']-y0:c['y']-y0+c['h'],c['x']-x0:c['x']-x0+c['w']]=c['m']
        keep=cv2.dilate(keep.astype(np.uint8),np.ones((7,7),np.uint8)).astype(bool)
        d=np.linalg.norm(sub-np.array([255,0,255.]),axis=-1); al=np.clip((d-45)/(160-45),0,1); al[~keep]=0
        core=cv2.erode((al>=.999).astype(np.uint8),np.ones((5,5),np.uint8)).astype(bool)
        idx=ndimage.distance_transform_edt(~core,return_indices=True)[1]; rgb=sub[idx[0],idx[1]]
        im=np.dstack([rgb,al*255]).astype(np.uint8); ys,xs=np.nonzero(im[...,3]>20); im=im[ys.min():ys.max()+1,xs.min():xs.max()+1]
        Image.fromarray(im).save(f'{nm}.png'); out[nm]=im.shape[:2]
cut('a7262982-image.png',['B1','B2','B3'])
cut('dcde6b4b-image.png',['s1','s2','s3','logL','logS','root','bridge'])
print(out)

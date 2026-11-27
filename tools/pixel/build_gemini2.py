"""Latest GEMINI sheets: shared complete silhouettes, raw and legacy palette variants."""
from pathlib import Path
import runpy,json
import numpy as np
from PIL import Image,ImageDraw
from scipy import ndimage
from sprite_edges import despill, reduce_complete, outline_complete
ROOT=Path(__file__).resolve().parents[2]
helper=runpy.run_path(str(ROOT/'tools/pixel/build_hero_preview.py'))
SOURCES={'sword':'f406ba20-7890-40bd-bd64-9522f40d9abf','bow':'25b0c864-19bd-46f3-8e79-0894b5fba575','staff':'319aa72e-d30b-4912-b11f-183c74264e94','tome':'21252ca1-86e5-4220-81e3-a71a0c5ed9f9','gun':'38b1b61d-ea3d-492e-8f49-c0441f5ee56f','scythe':'0bcd3ff5-e070-48bf-ba05-c2e663952814','spear':'3c41dc30-76f3-4b53-8098-b0ff620bd461'}
def cut(path):
 a=np.array(Image.open(path).convert('RGB'));r,g,b=a.astype(int).transpose(2,0,1)
 mask=~((r>170)&(b>140)&(np.minimum(r,b)-g>75))
 lab,n=ndimage.label(ndimage.binary_dilation(mask,iterations=1));parts=[]
 for i,sl in enumerate(ndimage.find_objects(lab),1):
  if sl is None or ((lab[sl]==i)&mask[sl]).sum()<250:continue
  ys,xs=sl;row=round(((ys.start+ys.stop)/2)/(a.shape[0]/5)-.5);parts.append((row,xs.start,i,sl))
 assert len(parts)==33,(path,len(parts))
 selected=np.isin(lab,[x[2] for x in parts]);_,nearest=ndimage.distance_transform_edt(~selected,return_indices=True)
 lab=np.where(selected,lab,lab[tuple(nearest)])
 result=[]
 for _,__,i,sl in sorted(parts):
  yy,xx=np.where((lab==i)&mask);sl=(slice(yy.min(),yy.max()+1),slice(xx.min(),xx.max()+1))
  m=(lab[sl]==i)&mask[sl];rgba=np.dstack([a[sl],m.astype('uint8')*255]);im=Image.fromarray(rgba);result.append(despill(im.crop(im.getbbox())))
 # Every substantial source pixel belongs to one of the 33 extracted silhouettes.
 selected=np.isin(lab,[x[2] for x in parts]);assert not np.any(mask&~selected)
 return result

def head_measure(im):
 a=np.array(im);r,g,b=a[:,:,:3].astype(float).transpose(2,0,1)
 mask=(a[:,:,3]>0)&(r>95)&(r>g*1.3)&(g>35)&(b<g*.95)
 labels,n=ndimage.label(ndimage.binary_closing(mask,iterations=1))
 sizes=np.bincount(labels.ravel());sizes[0]=0;component=labels==int(sizes.argmax())
 yy,xx=np.where(component)
 return float(xx.max()-xx.min()+1),float((xx.max()+xx.min())/2),float(yy.min())

def build(w,path):
 fr=cut(path)
 reference=cut(Path.home()/'Downloads'/(SOURCES['sword']+'.webp'))
 reference_scale=38/helper['body_h'](reference[0])
 target_width=head_measure(reference[0])[0]*reference_scale
 # Hair width is less sensitive to hands/arrow occlusion than colored area.
 scales=[target_width/head_measure(im)[0] for im in fr]
 # Avoid within-cycle zoom; use one scale for idle/run, measured from idle heads.
 scales[:6]=[float(np.median(scales[:2]))]*6
 # 11/27 身高统一：只看「人」——发顶到靴底（不算武器），待机+跑步共 6 帧取中位数，整套乘一个系数，使人和旧剑一样高。逐帧的相对大小仍按头宽保持稳定。
 def boot_bottom(im, limit_handle=False):
  q=np.array(im).astype(float);r,g,b=q[:,:,0],q[:,:,1],q[:,:,2]
  m=(q[:,:,3]>0)&(r>90)&(r<200)&(g>40)&(g<110)&(b<70)&(r>g*1.5)
  if limit_handle:
   _,cx,_=head_measure(im)
   m &= np.abs(np.arange(im.width)-cx)<im.height*.26
  yy=np.where(m)[0]
  return float(yy.max()) if len(yy) else None
 def person_h(im, limit_handle=False):
  f=boot_bottom(im,limit_handle);return None if f is None else f-head_measure(im)[2]+1
 _oi=Image.open(ROOT/'art/hero/atlas.png').convert('RGBA');_oj=json.loads((ROOT/'art/hero/atlas.json').read_text())['f']
 _of=[r for key,arr in _oj.items() if key.startswith('hero:sword.') for r in arr]
 ratios=[]
 for i in range(6):
  ox,oy,ow,oh=_of[i][:4];oh_=person_h(_oi.crop((ox,oy,ox+ow,oy+oh)));nh=person_h(fr[i],w=="scythe")
  if oh_ and nh: ratios.append(oh_/(nh*float(scales[i])))
 k=float(np.median(ratios)) if ratios else 1.0;scales=[v*k for v in scales];print(w,'身高系数',round(k,3),'（1=已一样高）')
 # Check the actual resized pixels. A single median cannot align all poses.
 for i in range(6):
  ox,oy,ow,oh=_of[i][:4]
  target=person_h(_oi.crop((ox,oy,ox+ow,oy+oh)))
  im=fr[i]
  if w=="scythe":
   # Foot rows marked on the source frames, excluding the lower blade and handle.
   sole=[108,100,95,101,95,93][i]
   scales[i]=target/(sole-head_measure(im)[2])
   continue
  for candidate in sorted(scales[i]*np.linspace(.70,1.30,241),key=lambda v:abs(v-scales[i])):
   resized=im.resize((round(im.width*candidate),round(im.height*candidate)),Image.Resampling.NEAREST)
   measured=person_h(resized,w=="scythe")
   if measured is not None and abs(measured-target)<=1:
    scales[i]=float(candidate)
    break
  else: raise ValueError((w,i,'height outside tolerance'))
 if w=='gun':
  # The hands and console obscure the hair in some casting poses.
  # Keep all 33 poses at the calibrated first idle frame's scale.
  scales=[scales[0]]*len(fr)
 scale=float(np.median(scales));names=helper['COMMON']+helper['ATK'][w]+helper['TAIL']
 refs=helper['old_palette']('sword')[0]
 # Pose-relative ground anchors from the actual old sword, excluding every weapon.
 old_image=Image.open(ROOT/'art/hero/atlas.png').convert('RGBA')
 old_json=json.loads((ROOT/'art/hero/atlas.json').read_text())['f']
 old_frames=[r for key,arr in old_json.items() if key.startswith('hero:sword.') for r in arr]
 anchors=[]
 for r in old_frames:
  ox,oy,ow,oh,oax,oay=r;oi=old_image.crop((ox,oy,ox+ow,oy+oh));_,hx,hy=head_measure(oi)
  anchors.append((oax-hx,oay-hy))
 corrected=helper['recolor'](fr,refs)
 for tag,frames in [('Gemini2Raw',fr),('Gemini2Cal',corrected)]:
  small=[outline_complete(reduce_complete(im,(max(1,round(im.width*sc)),max(1,round(im.height*sc)))),reference=reduce_complete(raw,(max(1,round(raw.width*sc)),max(1,round(raw.height*sc))))) for im,raw,sc in zip(frames,fr,scales)]
  dest=ROOT/('art/hero'+w.title()+tag);dest.mkdir(exist_ok=True)
  atlas=Image.new('RGBA',(sum(im.width+2 for im in small),max(im.height for im in small)));mapping={};idx=x=0
  sheet=Image.new('RGB',(1100,1260),'#597c80');d=ImageDraw.Draw(sheet)
  for name,count in names:
   arr=[]
   for k in range(count):
    im=small[idx]
    _,hx,hy=head_measure(fr[idx]);dx,dy=anchors[idx]
    ax=round(hx*float(scales[idx])+dx)+1;ay=round(hy*float(scales[idx])+dy)+1
    atlas.alpha_composite(im,(x,0));arr.append([x,0,im.width,im.height,ax,ay]);x+=im.width+2
    px=(idx%5)*220+5;py=(idx//5)*180;d.text((px,py),name+str(k),fill='white');big=im.resize((im.width*3,im.height*3),Image.Resampling.NEAREST);sheet.paste(big,(px,py+20),big);idx+=1
   mapping['hero:'+w+'.'+name]=arr
  atlas.save(dest/'atlas.png');(dest/'atlas.json').write_text(json.dumps({'f':mapping}),encoding='utf-8')
  if tag=='Gemini2Raw':sheet.save(ROOT.parent.parent/(w+'_gemini2_check.png'))
 # Both variants have identical bounds and alpha, so correction cannot remove limbs.
 raw=np.array(Image.open(ROOT/('art/hero'+w.title()+'Gemini2Raw/atlas.png')));cal=np.array(Image.open(ROOT/('art/hero'+w.title()+'Gemini2Cal/atlas.png')));assert np.array_equal(raw[:,:,3],cal[:,:,3])
 print(w,'33 complete silhouettes, identical alpha, scale',round(scale,3))
if __name__=='__main__':
 for w,f in SOURCES.items():
  if w=='scythe' and (ROOT/'art/src/ayuan_scythe_latest.webp').exists():
   runpy.run_path(str(ROOT/'tools/pixel/build_ayuan_scythe.py'),run_name='__main__')
  else:build(w,Path.home()/'Downloads'/(f+'.webp'))

"""Latest GEMINI sheets: shared complete silhouettes, raw and legacy palette variants."""
from pathlib import Path
import runpy,json
import numpy as np
from PIL import Image,ImageDraw
from scipy import ndimage
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
  m=(lab[sl]==i)&mask[sl];rgba=np.dstack([a[sl],m.astype('uint8')*255]);im=Image.fromarray(rgba);result.append(im.crop(im.getbbox()))
 # Every substantial source pixel belongs to one of the 33 extracted silhouettes.
 selected=np.isin(lab,[x[2] for x in parts]);assert not np.any(mask&~selected)
 return result

def head_measure(im):
 a=np.array(im);r,g,b=a[:,:,:3].astype(float).transpose(2,0,1)
 mask=(a[:,:,3]>0)&(r>95)&(r>g*1.3)&(g>35)&(b<g*.95)
 labels,n=ndimage.label(ndimage.binary_closing(mask,iterations=1))
 sizes=np.bincount(labels.ravel());sizes[0]=0;component=labels==int(sizes.argmax())
 yy,xx=np.where(component)
 return float(mask[component].sum()),float(np.median(xx)),float(yy.min())

def build(w,path):
 fr=cut(path)
 reference=cut(Path.home()/'Downloads'/(SOURCES['sword']+'.webp'))
 ref_area,_,_=head_measure(reference[0]);reference_scale=38/helper['body_h'](reference[0])
 target_area=ref_area*reference_scale**2
 scales=[]
 for im in fr:
  area,_,_=head_measure(im);scales.append(float(np.sqrt(target_area/max(1,area))))
 # Limit occlusion-induced corrections while preserving true per-frame scale differences.
 median=float(np.median(scales));scales=np.clip(scales,median*.88,median*1.12)
 if w=='scythe': scales[:6]=float(np.median(scales[:6]))
 scale=float(np.median(scales));names=helper['COMMON']+helper['ATK'][w]+helper['TAIL']
 refs=helper['old_palette'](w if w in ['sword','spear','bow','staff'] else 'sword')[0]
 corrected=helper['recolor'](fr,refs)
 for tag,frames in [('Gemini2Raw',fr),('Gemini2Cal',corrected)]:
  small=[im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.Resampling.NEAREST) for im,scale in zip(frames,scales)]
  dest=ROOT/('art/hero'+w.title()+tag);dest.mkdir(exist_ok=True)
  atlas=Image.new('RGBA',(sum(im.width+2 for im in small),max(im.height for im in small)));mapping={};idx=x=0
  sheet=Image.new('RGB',(1100,1260),'#597c80');d=ImageDraw.Draw(sheet)
  for name,count in names:
   arr=[]
   for k in range(count):
    im=small[idx];yy,xx=np.where(np.array(im)[:,:,3]>0);bot=xx[yy>=yy.max()-3];ax=float((bot.min()+bot.max())/2)
    ay=im.height
    if w=='scythe' and idx<6:
     # Source-space pelvis/ground reference excludes blade and trailing handle.
     sx,sy=[(40,108),(45,100),(53,95),(52,101),(54,95),(52,93)][idx]
     ax=round(sx*float(scales[idx]));ay=round(sy*float(scales[idx]))
    atlas.alpha_composite(im,(x,0));arr.append([x,0,im.width,im.height,ax,ay]);x+=im.width+2
    px=(idx%5)*220+5;py=(idx//5)*180;d.text((px,py),name+str(k),fill='white');big=im.resize((im.width*3,im.height*3),Image.Resampling.NEAREST);sheet.paste(big,(px,py+20),big);idx+=1
   mapping['hero:'+w+'.'+name]=arr
  atlas.save(dest/'atlas.png');(dest/'atlas.json').write_text(json.dumps({'f':mapping}),encoding='utf-8')
  if tag=='Gemini2Raw':sheet.save(ROOT.parent.parent/(w+'_gemini2_check.png'))
 # Both variants have identical bounds and alpha, so correction cannot remove limbs.
 raw=np.array(Image.open(ROOT/('art/hero'+w.title()+'Gemini2Raw/atlas.png')));cal=np.array(Image.open(ROOT/('art/hero'+w.title()+'Gemini2Cal/atlas.png')));assert np.array_equal(raw[:,:,3],cal[:,:,3])
 print(w,'33 complete silhouettes, identical alpha, scale',round(scale,3))
if __name__=='__main__':
 for w,f in SOURCES.items():build(w,Path.home()/'Downloads'/(f+'.webp'))

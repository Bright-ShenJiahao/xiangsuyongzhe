import runpy,sys,io,json
from pathlib import Path
from PIL import Image,ImageDraw
sys.path.insert(0,str(Path(__file__).resolve().parent))
mods={h:runpy.run_path(str(Path(__file__).resolve().parent/f)) for h,f in [('m','build_gemini2.py'),('f','build_heroF_new.py'),('e','build_heroE_new.py')]}
root=Path(__file__).resolve().parents[2];out=root/'art/sprite-audit';out.mkdir(exist_ok=True)
# All unique source frames, compared with the actual packed output, not a new mock rendering.
for w in mods['m']['SOURCES']:
 panels=[]
 for h in ['m','f','e']:
  mod=mods[h]
  if h=='m':
   source=root/'art/src/ayuan_scythe_latest.webp' if w=='scythe' else Path.home()/'Downloads'/(mod['SOURCES'][w]+'.webp')
   raw=runpy.run_path(str(root/'tools/pixel/build_ayuan_scythe.py'))['cut_sheet'](source) if w=='scythe' else mod['cut'](source);dest=root/f'art/hero{w.title()}Gemini2Cal';at=Image.open(dest/'atlas.png');mp=json.loads((dest/'atlas.json').read_text())['f'];rects=[r for rs in mp.values() for r in rs]
  else:
   raw=mod['cut_sheet'](mod['SOURCES'][w],mod['EXPECTED_COUNTS'][w] if h=='f' else w)
   dest=root/('art/heroFNew' if h=='f' else 'art/heroENew');at=Image.open(dest/'atlas.png');meta=json.loads((dest/'atlas.json').read_text());sc=meta['scales'][w];rects=[];x=y=rh=0
   for ww in mod['SOURCES']:
    rr=mod['cut_sheet'](mod['SOURCES'][ww],mod['EXPECTED_COUNTS'][ww] if h=='f' else ww)
    for im in rr:
     sw=round(im.width*sc)+2 if ww==w else round(im.width*meta['scales'][ww])+2
     sh=round(im.height*(sc if ww==w else meta['scales'][ww]))+2
     if x+sw+2>1024:x=0;y+=rh+2;rh=0
     if ww==w:rects.append([x,y,sw,sh])
     x+=sw+2;rh=max(rh,sh)
  panel=Image.new('RGB',(1440,45+((len(raw)+5)//6)*150),'#697f85');d=ImageDraw.Draw(panel);d.text((8,8),f'{h} {w}: source (left), game pixels x2 (right); {len(raw)} source frames',fill='white')
  for i,(im,r) in enumerate(zip(raw,rects)):
   x=(i%6)*240;y=45+(i//6)*150;d.text((x+3,y),str(i+1),fill='white');p=im.copy();p.thumbnail((110,125));panel.paste(p,(x,y+15),p);sx,sy,sw,sh=r[:4];p=at.crop((sx,sy,sx+sw,sy+sh));p=p.resize((sw*2,sh*2),Image.Resampling.NEAREST);panel.paste(p,(x+115,y+15),p)
  panels.append(panel)
 sheet=Image.new('RGB',(1440,sum(p.height for p in panels)),'#697f85');y=0
 for p in panels:sheet.paste(p,(0,y));y+=p.height
 sheet.save(out/(w+'.png'));print(w, 'source/game comparison', sheet.size)

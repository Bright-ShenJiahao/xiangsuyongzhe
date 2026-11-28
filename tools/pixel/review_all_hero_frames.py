"""Check every playable hero frame and create repeatable visual review sheets."""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from align_hero_poses import HEROES, WEAPONS, open_atlas

ART = Path(__file__).resolve().parents[2]/'art'
def main():
    dest=ART/'hero-final-review'
    dest.mkdir(exist_ok=True)
    summary=[]
    for hero in HEROES:
        name=hero or 'Ayuan'
        canvas=Image.new('RGB',(2040,980),'#e9ddc0')
        draw=ImageDraw.Draw(canvas)
        unique=set()
        total=0
        for row,weapon in enumerate(WEAPONS):
            p,meta,atlas=open_atlas(hero or 'hero'+weapon.title()+'Gemini2Cal')
            index=0
            for key,frames in meta['f'].items():
                if not key.startswith('hero:'+weapon+'.'):
                    continue
                for i,f in enumerate(frames):
                    x,y,w,h,ax,ay=f
                    assert 0<=x<x+w<=atlas.width and 0<=y<y+h<=atlas.height
                    tile=atlas.crop((x,y,x+w,y+h))
                    assert tile.getbbox()
                    assert np.isfinite([ax,ay]).all()
                    unique.add((p.name,x,y,w,h))
                    cx=52+(index%17)*120
                    base=row*140+(58 if index<17 else 124)
                    # Position the art around its actual engine anchor.
                    canvas.paste(tile,(cx-round(ax),base-round(ay)),tile)
                    draw.line((cx-47,base,cx+47,base),fill='#18844a')
                    draw.line((cx,base-48,cx,base+2),fill='#955293')
                    draw.text((cx-45,base+3),key.split('.')[-1]+str(i),fill='black')
                    index+=1
                    total+=1
        canvas.save(dest/(name+'.png'))
        summary.append({'hero':name,'mappedFrames':total,'uniqueFrames':len(unique)})
    (dest/'summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
    print(sum(x['uniqueFrames'] for x in summary),'unique;',sum(x['mappedFrames'] for x in summary),'mapped')
if __name__=='__main__':
    main()

"""Transfer anchors between matching body poses; leave unmatched art untouched."""
import json
from pathlib import Path
import numpy as np
from PIL import Image

ART = Path(__file__).resolve().parents[2] / 'art'
HEROES = ('', 'heroFNew', 'heroENew', 'heroV', 'heroS', 'heroK',
          'heroCat', 'heroMech', 'heroWitch', 'heroMoon', 'heroMiko')
WEAPONS = 'sword spear bow staff tome gun scythe'.split()


def open_atlas(name):
    p = ART / name
    return p, json.loads((p/'atlas.json').read_bytes()), Image.open(p/'atlas.png').convert('RGBA')


def tile(atlas, box):
    x,y,w,h = box[:4]
    return np.array(atlas.crop((x,y,x+w,y+h)), dtype=np.int16)


def match(ref, target, base, current):
    _,_,_,_,ax,ay = base
    yy,xx = np.indices(ref.shape[:2])
    mask = (ref[:,:,3]>=128) & (abs(xx-ax)<=10) & (yy>=ay-38) & (yy<ay-6)
    y,x=np.where(mask)
    if len(x)<100:
        return None
    colors=ref[y,x,:3]
    dx0,dy0=(round(current[i]-base[i]) for i in (4,5))
    candidates=[]
    for dy in range(dy0-9,dy0+10):
        for dx in range(dx0-8,dx0+9):
            tx,ty=x+dx,y+dy
            ok=(tx>=0)&(tx<target.shape[1])&(ty>=0)&(ty<target.shape[0])
            sample=target[ty[ok],tx[ok]]
            similar=(sample[:,3]>=128)&(np.abs(sample[:,:3]-colors[ok]).mean(1)<28)
            score=similar.sum()/len(x)
            candidates.append((score,dx,dy))
    candidates.sort(reverse=True)
    score,dx,dy=candidates[0]
    if score<.69 or score-candidates[1][0]<.025:
        return None
    return round(ax+dx,1),round(ay+dy,1),score


def main():
    for hero in HEROES:
        sword=open_atlas(hero or 'heroSwordGemini2Cal')
        atlases=[sword] if hero else [sword]+[open_atlas('hero'+w.title()+'Gemini2Cal') for w in WEAPONS[1:]]
        changed=0
        for p,data,atlas in atlases:
            render=data['f']
            adjustments={}
            for key,frames in render.items():
                for box in frames:
                    x,y,w,h=box[:4]
                    assert 0<=x<x+w<=atlas.width and 0<=y<y+h<=atlas.height
                    assert atlas.crop((x,y,x+w,y+h)).getbbox()
                if '.' not in key:
                    continue
                weapon,action=key.split(':',1)[-1].split('.')
                if weapon=='sword' or action in ('atk', 'big'):
                    continue
                reference = sword[1]['f'].get('hero:sword.'+action)
                if reference is None:
                    if action in ('jump','back','roll','dead'):
                        continue
                    reference = [f for k, entries in sword[1]['f'].items()
                                 if k.startswith('hero:sword.')
                                 and k.split('.')[-1] not in ('jump','back','roll','dead')
                                 for f in entries]
                    reference = list({tuple(f):f for f in reference}.values())
                    reference = reference[18:28]
                for i,box in enumerate(frames):
                    choices = reference if 'hero:sword.'+action not in sword[1]['f'] else reference[i:i+1]
                    matches = [result for base in choices
                               if (result := match(tile(sword[2],base),tile(atlas,box),base,box))]
                    if not matches:
                        continue
                    result = max(matches, key=lambda result:result[2])
                    anchor = result[:2]
                    if result[2] >= .78 and any(abs(a-b)>=1.5 for a,b in zip(anchor,box[4:])):
                        adjustments[tuple(box[:4])]=anchor
            if adjustments:
                for frames in render.values():
                    for box in frames:
                        if tuple(box[:4]) in adjustments:
                            box[4:]=adjustments[tuple(box[:4])]
                (p/'atlas.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
            changed+=len(adjustments)
        print(hero or 'Ayuan',changed)


if __name__=='__main__':
    main()

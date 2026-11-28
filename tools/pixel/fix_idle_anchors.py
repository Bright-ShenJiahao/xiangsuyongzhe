"""Apply reviewed boot/body landmarks, without changing sprite pixels or poses."""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
CONFIG = Path(__file__).with_name('hero_idle_anchor_overrides.json')


def apply_idle_overrides(review=False, only=None):
    config = json.loads(CONFIG.read_text(encoding='utf-8'))
    rows = []
    changed = 0
    for name, keys in config['sets'].items():
        if only is not None and name not in only:
            continue
        path = ROOT/'art'/name/'atlas.json'
        meta = json.loads(path.read_text(encoding='utf-8'))
        replace = {}
        for key, entries in keys.items():
            before = [f.copy() for f in meta['f'][key]]
            after = []
            for f, entry in zip(before, entries):
                assert f[:4] == entry['rect'], (name, key, 'atlas layout changed; re-review landmarks')
                nf = f[:4]+entry['anchor']
                replace[tuple(f)] = nf
                after.append(nf)
                changed += int(f[4:] != nf[4:])
            rows.append((name, key, before, after))
        # Keep exact aliases and reused idle poses consistent with weapon-specific keys.
        meta['f'] = {k:[replace.get(tuple(f), f) for f in fs] for k, fs in meta['f'].items()}
        path.write_text(json.dumps(meta, separators=(',', ':')), encoding='utf-8')
    if review:
        frames = []
        for index in range(2):
            cv = Image.new('RGB', (680, len(rows)*150), '#ddd2b1')
            d = ImageDraw.Draw(cv)
            for row, (name, key, before, after) in enumerate(rows):
                atlas = Image.open(ROOT/'art'/name/'atlas.png').convert('RGBA')
                d.text((8,row*150+5),name+' '+key,fill='#302331')
                for col, fs in enumerate([before, after]):
                    x,y,w,h,ax,ay = fs[index]
                    tile=atlas.crop((x,y,x+w,y+h)).resize((w*2,h*2),Image.Resampling.NEAREST)
                    cx=170+col*340; baseline=row*150+125
                    cv.paste(tile,(round(cx-ax*2),round(baseline-ay*2)),tile)
                    d.line((cx-100,baseline,cx+115,baseline),fill='#16844b')
                    d.line((cx,row*150+20,cx,baseline),fill='#b59e6c')
                    d.text((cx-95,row*150+132),('before' if col==0 else 'after')+' frame '+str(index),fill='#302331')
            frames.append(cv)
        frames[0].save(ROOT/'art/compare_idle_anchor_fix.gif',save_all=True,append_images=frames[1:],duration=340,loop=0,disposal=2)
        board=Image.new('RGB',(1360,len(rows)*150))
        board.paste(frames[0],(0,0));board.paste(frames[1],(680,0))
        board.save(ROOT/'art/compare_idle_anchor_fix.png')
    return changed


if __name__ == '__main__':
    print('Idle anchors corrected:',apply_idle_overrides(review=True),'; pixels and sprite dimensions unchanged')

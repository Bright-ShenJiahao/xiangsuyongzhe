"""像素字体子集：把 js/、index.html、css 里出现的字从缝合像素字体（OFL）里抽出来，写 art/font/pixel.woff2。
改了界面文字后跑一次：python3 tools/font_subset.py（需要 fontTools、brotli）。"""
import glob, os
from fontTools import subset
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
txt = ''.join(open(f, encoding='utf-8').read() for f in glob.glob(os.path.join(R, 'js', '*.js')) + [os.path.join(R, 'index.html')])
chars = {c for c in txt if ord(c) > 127} | set(map(chr, range(32, 127))) | set('…—·！？，。：；「」（）★▾▸')
o = subset.Options(); o.flavor = 'woff2'; o.name_IDs = ['*']
f = subset.load_font(os.path.join(R, 'tools', 'fonts', 'FusionPixel12-SC.woff'), o); s = subset.Subsetter(o); s.populate(text=''.join(chars)); s.subset(f)
os.makedirs(os.path.join(R, 'art', 'font'), exist_ok=True); out = os.path.join(R, 'art', 'font', 'pixel.woff2'); subset.save_font(f, out, o)
print(len(chars), 'chars', os.path.getsize(out) // 1024, 'KB')

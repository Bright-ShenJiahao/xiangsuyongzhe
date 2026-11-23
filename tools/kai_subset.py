"""霞鹜文楷子集：把 js/、index.html、css、demo/ 里用到的字，从 lxgw-wenkai-screen-webfont 的分片里抽出来合成 art/font/kai.woff2。
用法：npm pack lxgw-wenkai-screen-webfont 解压到 /tmp/wk 后跑 python3 tools/kai_subset.py。改了界面文字后重跑，否则缺的字会掉回系统字体。"""
import glob, os, sys
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.merge import Merger
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/wk/package/files'
files = glob.glob(os.path.join(R, 'js', '*.js')) + glob.glob(os.path.join(R, 'demo', '*.html')) + glob.glob(os.path.join(R, 'css', '*.css')) + [os.path.join(R, 'index.html')]
txt = ''.join(open(f, encoding='utf-8').read() for f in files)
need = {ord(c) for c in txt if ord(c) > 127} | set(range(32, 127)) | {ord(c) for c in '…—·！？，。：；「」『』（）、～'}
parts, left = [], set(need)
for fp in sorted(glob.glob(os.path.join(SRC, 'lxgwwenkaigbscreen-subset-*.woff2'))):
    cm = TTFont(fp).getBestCmap(); hit = left & set(cm)
    if not hit: continue
    o = subset.Options(); o.flavor = None; o.name_IDs = ['*']; o.notdef_outline = True
    f = subset.load_font(fp, o); s = subset.Subsetter(o); s.populate(unicodes=hit); s.subset(f)
    out = f'/tmp/kai_part_{len(parts)}.ttf'; f.flavor = None; f.save(out); parts.append(out); left -= hit
m = Merger().merge(parts); m.flavor = 'woff2'; out = os.path.join(R, 'art', 'font', 'kai.woff2'); m.save(out)
print(len(need) - len(left), 'chars,', len(parts), 'parts,', os.path.getsize(out) // 1024, 'KB; not in font:', ''.join(chr(c) for c in sorted(left) if c > 0x2e80)[:80])

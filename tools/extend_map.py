# 打谷场地图加大（11/21 用户定：横向约 1.5 屏、纵向约 1.2 屏，先用代码补，以后重出美术）
# 做法：从原图中间截一条「晒架 + 石阶 + 地面 + 栅栏」的竖条，正着、镜像交替插进去（接缝连续）；
#       再截一条地面横条同样交替插进去。输出新图 + 可走区域的左右边界表（每 20 地图像素一行）。
# 单位：地图像素（原图 1672×941，图片文件是它的 2 倍 3344×1882）。
import json, os
from PIL import Image, ImageOps
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, OUT = os.path.join(R, 'art/map/field.webp'), os.path.join(R, 'art/map/field_big.webp')
MW, MH, S = 1672, 941, 2                       # 地图尺寸、图片倍率
XA, XB, NX = 1130, 1280, 6                     # 竖条：x 1130–1280，插 6 条（偶数，接回原图）
YA, YB, NY = 350, 470, 4                       # 横条：y 350–470，插 4 条
G = dict(y0=.31, y1=.85, l0=.2, l1=.03, r0=.8, r1=.97)   # 原图可走梯形
im = Image.open(SRC).convert('RGB')
def strips(img, a, b, n, axis):
    seg = img.crop((a * S, 0, b * S, img.height)) if axis == 'x' else img.crop((0, a * S, img.width, b * S))
    mir = ImageOps.mirror(seg) if axis == 'x' else ImageOps.flip(seg)
    return [mir if i % 2 == 0 else seg for i in range(n)]     # 先镜像：从切口那一行往回走，接缝连续
# 横向加宽
L, Rr = im.crop((0, 0, XB * S, im.height)), im.crop((XB * S, 0, im.width, im.height))
add = strips(im, XA, XB, NX, 'x'); w = L.width + sum(p.width for p in add) + Rr.width
big = Image.new('RGB', (w, im.height)); x = 0
for p in [L] + add + [Rr]: big.paste(p, (x, 0)); x += p.width
# 纵向加高
T, B = big.crop((0, 0, big.width, YB * S)), big.crop((0, YB * S, big.width, big.height))
add = strips(big, YA, YB, NY, 'y'); h = T.height + sum(p.height for p in add) + B.height
out = Image.new('RGB', (big.width, h)); y = 0
for p in [T] + add + [B]: out.paste(p, (0, y)); y += p.height
out.save(OUT, quality=82, method=6)
DX, DY = NX * (XB - XA), NY * (YB - YA); NW, NH = MW + DX, MH + DY
# 可走区域：新 y → 原图 y（插入段按镜像来回折），再算原梯形的左右边，右边整体右移 DX
def orig_y(y):
    if y < YB: return y
    if y < YB + DY: k, r = divmod(y - YB, YB - YA); return YB - r if k % 2 == 0 else YA + r
    return y - DY
def edges(yo):
    t = max(0, min(1, (yo / MH - G['y0']) / (G['y1'] - G['y0'])))
    return (G['l0'] + (G['l1'] - G['l0']) * t) * MW, (G['r0'] + (G['r1'] - G['r0']) * t) * MW + DX
y0, y1 = G['y0'] * MH, G['y1'] * MH + DY
pts = [[round(y), *[round(v) for v in edges(orig_y(y))]] for y in list(range(int(y0), int(y1), 20)) + [int(y1)]]
json.dump({'w': NW, 'h': NH, 'y0': round(y0), 'y1': round(y1), 'pts': pts}, open(os.path.join(R, 'art/map/field_big.json'), 'w'), separators=(',', ':'))
print(out.size, NW, NH, len(pts))

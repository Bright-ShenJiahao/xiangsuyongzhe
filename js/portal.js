// 11/24 时空门（塔顶和宫殿共用）：红色裂缝漩涡
const PCV = document.createElement('canvas'); PCV.width = 40; PCV.height = 52; let ARC = { t: 0, L: [] };
function gamePortal(ctx, x, footY, T, open) { const [r0, g0, b0] = [255, 90, 50], C = a => `rgba(${r0},${g0},${b0},${a})`, PW = 40, PH = 52, g = PCV.getContext('2d'), im = g.createImageData(PW, PH), D = im.data, t = T * 1.4, R = (a, b) => a + Math.random() * (b - a);
  const hi = [Math.min(255, r0 * .4 + 160), Math.min(255, g0 * .4 + 160), Math.min(255, b0 * .4 + 170)];
  for (let py = 0; py < PH; py++) for (let px = 0; px < PW; px++) { const nx = (px + .5 - PW / 2) / (PW / 2), ny = (py + .5 - PH / 2) / (PH / 2), rr = Math.hypot(nx, ny), a = Math.atan2(ny, nx);
    const wob = .035 * Math.sin(4 * a + t * 1.3) + .025 * Math.sin(7 * a - t * 2.1) + .012 * Math.sin(13 * a + t * 3.7), hole = .6 + wob, edge = rr - hole, k = (py * PW + px) * 4;
    if (edge < 0) { const dp = Math.min(1, -edge / .12), c = 1 - dp; D[k] = 6 + c * r0 * .25; D[k + 1] = 3 + c * g0 * .2; D[k + 2] = 12 + c * b0 * .3; D[k + 3] = 255; if (edge > -.035) { D[k] = 255; D[k + 1] = 250; D[k + 2] = 245; } continue; }
    const up = Math.max(0, -ny) * .35, flick = .5 + .5 * Math.sin(13 * a + t * 4 + rr * 9) * Math.sin(7 * a - t * 2.6), tong = Math.max(0, Math.sin(6 * a + t * 3) * Math.sin(11 * a - t * 5)) * .35, band = .3 * (.75 + .45 * flick) + tong + up * tong * 2, v = 1 - edge / band;
    if (v <= 0) continue; const q = v > .8 ? 4 : v > .55 ? 3 : v > .3 ? 2 : 1, P = [null, [r0 * .45, g0 * .45, b0 * .5, 170], [r0 * .75, g0 * .75, b0 * .8, 235], [r0, g0, b0, 255], [...hi, 255]][q];
    D[k] = P[0]; D[k + 1] = P[1]; D[k + 2] = P[2]; D[k + 3] = P[3]; }
  g.putImageData(im, 0, 0);
  if (T > ARC.t) { ARC.t = T + .07 + Math.random() * .06; ARC.L = []; const n = Math.random() < .25 ? 0 : 1 + (Math.random() * 2 | 0);
    for (let k = 0; k < n; k++) { const an = Math.random() * Math.PI * 2, L = [], st = 7; for (let j = 0; j <= st; j++) { const f = j / st; L.push([Math.round(PW / 2 + Math.cos(an) * PW * .34 * f + R(-2, 2) * (1 - f * .3)), Math.round(PH / 2 + Math.sin(an) * PH * .36 * f + R(-2, 2))]); } ARC.L.push(L); } }
  for (const L of ARC.L) for (let j = 1; j < L.length; j++) { let [x0, y0] = L[j - 1]; const [x1, y1] = L[j], dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx - dy;
    for (let q = 0; q < 40; q++) { g.fillStyle = j < 2 ? '#fff' : `rgb(${hi[0] | 0},${hi[1] | 0},${hi[2] | 0})`; g.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 > -dy) { e -= dy; x0 += sx; } if (e2 < dx) { e += dx; y0 += sy; } } }
  const sc = 1.5, w = PW * sc * open, h = PH * sc * open, cy = footY - PH * sc / 2;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createRadialGradient(x, footY, 0, x, footY, 60); lg.addColorStop(0, C(.4)); lg.addColorStop(1, C(0)); ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(x, footY, 60, 16, 0, 0, 7); ctx.fill();
  const gl = ctx.createRadialGradient(x, cy, 30, x, cy, 80); gl.addColorStop(0, C(.3)); gl.addColorStop(1, C(0)); ctx.fillStyle = gl; ctx.fillRect(x - 85, cy - 85, 170, 170); ctx.restore();
  ctx.imageSmoothingEnabled = false; ctx.drawImage(PCV, Math.round(x - w / 2), Math.round(cy - h / 2), Math.round(w), Math.round(h));
  if (open >= 1) { ctx.font = 'bold 15px WenKai, serif'; ctx.textAlign = 'center'; const ty = cy - h / 2 - 6; ctx.fillStyle = '#1a0e06'; for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillText('哥布林森林', x + ox, ty + oy); ctx.fillStyle = '#ffd890'; ctx.fillText('哥布林森林', x, ty); ctx.textAlign = 'left'; } }

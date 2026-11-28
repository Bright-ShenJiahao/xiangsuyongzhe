// 新月斩：保留原图四张64px画布，共用(12,32)出手点，禁止按可见轮廓重新居中。
window.PIXEL_SKILL_FX = (() => {
  const image = new Image();
  image.src = 'art/fx/player/newmoon.png';
  function slash(ctx, o, x, y, unit, squash) {
    if (!image.complete || image.naturalWidth !== 256 || image.naturalHeight !== 64) return false;
    const phase = Math.min(3, Math.max(0, Math.floor(o.t / o.T * 4)));
    const radius = o.r * unit, scale = Math.max(1, Math.round(radius / 46));
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.shadowBlur = 0;
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(1, 1 / squash);
    ctx.rotate(o.a || 0);
    // Match the actual fan; the art must not suggest hits outside its range/angle.
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -(o.half || 1.18), o.half || 1.18);
    ctx.closePath(); ctx.clip();
    if (o.rev) ctx.scale(1, -1);
    ctx.drawImage(image, phase * 64, 0, 64, 64, -12 * scale, -32 * scale, 64 * scale, 64 * scale);
    ctx.restore();
    return true;
  }
  return { slash };
})();

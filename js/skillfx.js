// 新月斩：保留原图四张64px画布，共用(12,32)出手点，禁止按可见轮廓重新居中。
window.PIXEL_SKILL_FX = (() => {
  const image = new Image(); image.crossOrigin = 'anonymous';
  let goldImage = null, missile = null;
  const blade = document.createElement('canvas'); blade.width = 32; blade.height = 12;
  { const g = blade.getContext('2d');
    const rows = ['................................','....nn..........................','....nnnnnnnnnnnnnnnnnnnnnn......','....nswwwwwwwwwwwwwwwwwwwwnn....','nnnngswwwwwwwwwwwwwwwwwwwwwwnn..','nssggsllllllllllllllllllllllwwwn','nnnngsllllllllllllllllllllllnn..','....nsnnnnnnnnnnnnnnnnnnnnnn....','....nn..........................','....nn..........................','................................','................................'];
    const colors = {n:'#233449',s:'#69899b',l:'#c5d9df',w:'#f1f3e5',g:'#69899b'};
    rows.forEach((row,y)=>[...row].forEach((c,x)=>{if(colors[c]){g.fillStyle=colors[c];g.fillRect(x,y,1,1);}}));
  }
  image.onload = () => {
    goldImage = document.createElement('canvas'); goldImage.width=256; goldImage.height=64;
    const g=goldImage.getContext('2d'); g.drawImage(image,0,0); const a=g.getImageData(0,0,256,64);
    for(let i=0;i<a.data.length;i+=4)if(a.data[i+3]){const l=(a.data[i]+a.data[i+1]+a.data[i+2])/3,c=l>210?[245,237,195]:l>145?[216,185,112]:l>75?[145,116,69]:[54,48,46];a.data.set(c,i);}g.putImageData(a,0,0);
    missile=document.createElement('canvas');missile.width=16;missile.height=16;
    const m=missile.getContext('2d');m.imageSmoothingEnabled=false;m.drawImage(image,80,3,38,58,3,0,10,16);
  };
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
    ctx.drawImage(o.gold && goldImage || image, phase * 64, 0, 64, 64, -12 * scale, -32 * scale, 64 * scale, 64 * scale);
    ctx.restore();
    return true;
  }
  function sword(ctx,x,y,a,unit,length=28,tip=false) {
    const k=Math.max(1,Math.round(length*unit/32));ctx.save();ctx.shadowBlur=0;ctx.imageSmoothingEnabled=false;
    ctx.translate(Math.round(x),Math.round(y));ctx.rotate(a);ctx.drawImage(blade,(tip?-31:-16)*k,-5*k,32*k,12*k);ctx.restore();
  }
  function ring(ctx,o,x,y,unit,squash) {
    const p=Math.min(.999,o.t/o.T), step=Math.floor(p*4),storm=o.art==='storm',n=storm?2:3;
    for(let i=0;i<n;i++)slash(ctx,{r:o.r,half:Math.PI/n,a:i*Math.PI*2/n+step*Math.PI/4,t:step===3?.19:.09,T:.24,gold:o.gold},x,y,unit,squash);
    return true;
  }
  function domain(ctx,x,y,r,time,unit,squash) {
    ctx.save();ctx.shadowBlur=0;
    // Sparse boundary, no filled disk; enemies and their warnings stay visible inside.
    for(let i=0;i<32;i++){if(i%4===3)continue;const a=i*Math.PI/16;ctx.fillStyle=i%4?'#69899b':'#c5d9df';ctx.fillRect(Math.round(x+Math.cos(a)*r*unit),Math.round(y+Math.sin(a)*r*unit/squash),unit,unit);}
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3+Math.floor(time*6)*Math.PI/8;sword(ctx,x+Math.cos(a)*r*unit*.78,y+Math.sin(a)*r*unit*.78/squash,a+Math.PI/2,unit,14);}
    ctx.restore();
  }
  function projectile(ctx,p,x,y,unit) {
    if(p.sid==='sworddomain'){sword(ctx,x,y,p.a,unit,16);return true;}
    if(!missile)return false;const k=Math.max(1,Math.round(p.r*unit/8));ctx.save();ctx.shadowBlur=0;ctx.imageSmoothingEnabled=false;
    ctx.translate(Math.round(x),Math.round(y));ctx.rotate(p.a);ctx.drawImage(missile,-8*k,-8*k,16*k,16*k);ctx.restore();return true;
  }
  function effect(ctx,o,x,y,unit,squash) {
    if(o.k==='pixelSlash')return slash(ctx,o,x,y,unit,squash);
    if(o.k!=='swordArt')return false;
    const p=Math.min(.999,o.t/o.T),step=Math.floor(p*4);ctx.save();ctx.shadowBlur=0;
    if(o.art==='ring'||o.art==='storm')ring(ctx,o,x,y,unit,squash);
    else if(o.art==='trail'){
      ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(1,1/squash);ctx.rotate(o.a||0);
      for(let i=0;i<3;i++){const at=(i+.5)*o.L*unit/3;if(i>step)continue;ctx.fillStyle=step>2?'#69899b':'#c5d9df';for(let j=-5;j<=5;j++)ctx.fillRect(Math.round(at+j*unit),Math.round(j*unit),2*unit,unit);}
      ctx.restore();
    }else if(o.art==='hunt'){
      const d=(3-step)*5*unit;sword(ctx,x-Math.cos(o.a)*d,y-Math.sin(o.a)*d/squash,o.a,unit,24,true);
      if(step===1){ctx.fillStyle='#f1f3e5';ctx.fillRect(Math.round(x-unit),Math.round(y-3*unit),unit,6*unit);}
    }else if(o.art==='fall'){
      sword(ctx,x,y-(3-step)*22*unit,Math.PI/2,unit,o.big?54:32,true);
    }else if(o.art==='impact'){
      if(step<2)sword(ctx,x,y+3*unit,Math.PI/2,unit,o.big?54:30,true);
      const r=o.r*unit*(.35+step*.2);ctx.fillStyle=step<2?'#d8b970':'#918055';
      for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.fillRect(Math.round(x+Math.cos(a)*r),Math.round(y+Math.sin(a)*r/squash),2*unit,unit);}
    }
    ctx.restore();return true;
  }
  function charge(ctx,x,y,unit,p,flip) {
    const n=1+Math.floor(p*3);ctx.save();ctx.shadowBlur=0;ctx.fillStyle='#c5d9df';ctx.fillRect(Math.round(x+flip*14*unit),Math.round(y-25*unit),n*unit,unit);ctx.fillStyle='#f1f3e5';ctx.fillRect(Math.round(x+flip*15*unit),Math.round(y-(26+Math.floor(p*2))*unit),unit,(n+1)*unit);ctx.restore();
  }
  return { slash, effect, sword, domain, projectile, charge };
})();

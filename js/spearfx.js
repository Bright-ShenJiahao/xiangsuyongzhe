// Spear art uses fixed source-cell anchors. Combat supplies all lengths/radii.
window.SPEAR_SKILL_FX = (() => {
  const ROOT = new URL('../art/fx/player/spear/', document.currentScript.src);
  const assets = window.SPEAR_FX_ART || {}, images = {}, KEY = 'xsyz-swordfx';
  const mapping = {spear:'thrust', sweep:'sweep', javelin:'javelin', hundred:'rapid', rising:'rising', drill:'drill', leap:'leap_impact', dragon:'dragon_soul', meteorjavelins:'meteor', returningthrust:'return', knightcharge:'knight_charge'};
  const catalog = Object.fromEntries(Object.entries(mapping).map(([id, art]) => [id, assets[art]]));
  let overrides = {}, forcedFrame = -1;
  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
  function read() { try { overrides=JSON.parse(localStorage.getItem(KEY)||'{}')||{}; } catch(e) { overrides={}; } }
  read(); addEventListener('storage',e=>{if(e.key===KEY)read();});
  const ready = Promise.all(Object.entries(assets).map(([id,m]) => new Promise(done => {
    const im=images[id]=new Image(); im.crossOrigin='anonymous'; im.onload=()=>done(true); im.onerror=()=>done(false); im.src=new URL(m.file,ROOT).href;
  })));
  function config(id) { const o=overrides[id]||{}, n=(k,d,a,b)=>Number.isFinite(+o[k])?clamp(+o[k],a,b):d; return {scale:n('scale',1,.6,1.05),x:n('x',0,-8,8),y:n('y',0,-8,8)}; }
  function setOverrides(o) { overrides=o||{}; }
  function box(id) { const b=assets[id].extent.map(e=>e.bbox); return [Math.min(...b.map(v=>v[0])),Math.min(...b.map(v=>v[1])),Math.max(...b.map(v=>v[2])),Math.max(...b.map(v=>v[3]))]; }
  const phase=(t,T)=>forcedFrame>=0?forcedFrame:clamp(Math.floor(4*t/Math.max(.001,T)),0,3);
  function scope(ctx,x,y,a,ys,clip,draw) {
    ctx.save(); ctx.shadowBlur=0;ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y));ctx.scale(1,1/ys);ctx.rotate(a||0);
    if(clip){ctx.beginPath();if(clip.kind==='line')ctx.rect(0,-clip.w/2,clip.L,clip.w);else if(clip.half){ctx.moveTo(0,0);ctx.arc(0,0,clip.r,-clip.half,clip.half);ctx.closePath();}else ctx.arc(0,0,clip.r,0,Math.PI*2);ctx.clip();}
    try{return draw();}finally{ctx.restore();}
  }
  function art(ctx,id,t,T,sx,sy,u,calId,anchor) {
    const m=assets[id],im=images[id]; if(!m||!im?.complete||!im.naturalWidth)return false;
    const c=config(calId),p=anchor||m.anchor;ctx.save();ctx.translate(Math.round(c.x*u),Math.round(c.y*u));
    ctx.drawImage(im,phase(t,T)*64,0,64,64,-p[0]*sx*c.scale,-p[1]*sy*c.scale,64*sx*c.scale,64*sy*c.scale);ctx.restore();return true;
  }
  function line(ctx,o,x,y,u,ys) {
    const id=o.spear,b=box(id),anchor=assets[id].anchor,sx=o.L*u/Math.max(1,b[2]-anchor[0]),sy=Math.min(sx,(o.w||12)*u/(b[3]-b[1]));
    return scope(ctx,x,y,o.a,ys,{kind:'line',L:o.L*u,w:(o.w||12)*u},()=>art(ctx,id,o.t,o.T,sx,sy,u,o.skill||id));
  }
  function impact(ctx,o,x,y,u,ys) {
    const id=o.spear,r=o.r*u,s=r/Math.max(...assets[id].extent.map(e=>e.radius));
    return scope(ctx,x,y,0,ys,{r},()=>art(ctx,id,o.t,o.T,s,s,u,o.skill||id));
  }
  function effect(ctx,o,x,y,u,ys) {
    if(!o.spear||!assets[o.spear])return false;
    if(o.spear==='sweep'){
      const r=o.r*u,s=r/Math.max(...assets.sweep.extent.map(e=>e.radius));
      return scope(ctx,x,y,o.a,ys,{r,half:o.half||1.4},()=>{if(o.rev)ctx.scale(1,-1);return art(ctx,'sweep',o.t,o.T,s,s,u,'sweep');});
    }
    if(['impact','leap_impact','dragon_soul'].includes(o.spear)){
      if(o.spear==='dragon_soul'){
        const r=o.r*u,s=r/Math.max(...assets.dragon_soul.extent.map(e=>e.radius));
        return scope(ctx,x,y,o.a,ys,{r},()=>art(ctx,'dragon_soul',o.t,o.T,s,s,u,'dragon'));
      }
      return impact(ctx,o,x,y,u,ys);
    }
    if(o.spear==='meteor'){
      // The source already descends to its fixed tip; no second vertical flight.
      const s=38*u/46,p=clamp(o.t/o.T,0,1),fall=o.stage==='fall',sample=fall?(p<.3?.05:.3):.5+p*.49;return scope(ctx,x,y+45*u-(fall?(1-p)*45*u:0),0,1,null,()=>art(ctx,'meteor',sample,1,s,s,u,'meteorjavelins'));
    }
    return line(ctx,o,x,y,u,ys);
  }
  function projectile(ctx,p,x,y,u,ys) {
    if(!mapping[p.sid]||!['beam','spear','drill'].includes(p.look))return false;
    const id=p.look==='drill'?'drill':p.look==='spear'?'javelin':'thrust';
    const b=box(id),anchor=[(b[0]+b[2])/2,32],r=p.r*u;
    const rad=Math.max(...assets[id].extent.map(e=>Math.max(Math.hypot(e.bbox[0]-anchor[0],e.bbox[1]-32),Math.hypot(e.bbox[2]-anchor[0],e.bbox[3]-32))));
    const s=r/rad;return scope(ctx,x,y,p.a,ys,{r},()=>art(ctx,id,p.t%.4,.4,s,s,u,p.sid,anchor));
  }
  function stuck(ctx,m,x,y,u,ys) {
    const b=box('javelin'),s=22*u/(b[2]-b[0]);
    return scope(ctx,x,y,m.a+Math.PI/5,ys,null,()=>art(ctx,'javelin',0,1,s,s,u,'javelin',[55,32]));
  }
  // Mirrors existing combat, including older description/implementation differences.
  function geometry(id,L=1,A=1) {
    switch(id){
      case 'spear':return {kind:'line',L:82*1.45*(L>=3?1.25:1)*A,w:14*A,life:L>=7?.4:L>=5?.35:.2};
      case 'sweep':return {kind:'fan',r:48*1.45*(L>=3?1.25:1)*A,half:1.4,life:L>=7?.42:.22};
      case 'javelin':return {kind:'projectile',r:9,v:300,travel:240,life:2,n:L>=7?2:1};
      case 'hundred':return {kind:'fanLines',L:100*A,w:18,n:6,life:.22};
      case 'rising':return {kind:'line',L:70*1.45*(L>=3?1.25:1)*A,w:22*(L>=3?1.25:1)*A,life:L>=7?.9:.25};
      case 'drill':return {kind:'projectile',r:14*(L>=3?1.3:1)*A,v:60,travel:120,life:L>=7?2.4:2};
      case 'leap':return {kind:'rays',r:50*1.45*A,L:130,w:12,n:L>=7?12:8,life:.4};
      case 'dragon':return {kind:'orbit',orbit:70,r:L>=3?22:16,life:L>=7?3.5:3};
      case 'meteorjavelins':return {kind:'rain',r:16,n:5,life:.55};
      case 'returningthrust':return {kind:'return',L:70,w:22,life:.42};
      case 'knightcharge':return {kind:'line',L:140,w:24,life:.3};
      default:return null;
    }
  }
  function extent(id,L=1,A=1) {
    const z=geometry(id,L,A);if(!z)return 50;
    if(id==='spear'&&L>=7)return z.L*.8+120+10;
    if(id==='returningthrust')return 100;
    if(id==='javelin')return z.travel+30;
    if(id==='drill')return z.travel+(L>=7?40:z.r);
    if(id==='leap')return 130;
    if(id==='dragon')return z.orbit+z.r;
    if(id==='meteorjavelins')return 135;
    return (z.L||z.r)+8;
  }
  function range(ctx,id,x,y,u,a=0,L=1,A=1,time=0) {
    const z=geometry(id,L,A);if(!z)return;
    ctx.save();ctx.translate(x,y);ctx.scale(1,1/1.35);ctx.rotate(a);ctx.strokeStyle='#71ef96';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);ctx.beginPath();
    const circle=(xx,yy,r)=>{ctx.moveTo((xx+r)*u,yy*u);ctx.arc(xx*u,yy*u,r*u,0,Math.PI*2);};
    if(z.kind==='line')ctx.rect(0,-z.w*u/2,z.L*u,z.w*u);
    else if(z.kind==='fan'){ctx.moveTo(0,0);ctx.arc(0,0,z.r*u,-z.half,z.half);ctx.closePath();}
    else if(z.kind==='fanLines'){for(let i=0;i<z.n;i++){ctx.save();ctx.rotate((i-(z.n-1)/2)*Math.PI/2/(z.n-1));ctx.rect(0,-z.w*u/2,z.L*u,z.w*u);ctx.restore();}}
    else if(z.kind==='rays'){circle(0,0,z.r);for(let i=0;i<z.n;i++){ctx.save();ctx.rotate(i/z.n*Math.PI*2);ctx.rect(0,-z.w*u/2,z.L*u,z.w*u);ctx.restore();}}
    else if(z.kind==='projectile'){
      const d=Math.min(time*z.v,z.travel),n=z.n||1;
      for(let i=0;i<n;i++){const aa=(i-(n-1)/2)*.12;circle(Math.cos(aa)*d,Math.sin(aa)*d,z.r);}
      if(time>=(id==='javelin'?.8:2)&&L>=5)circle(z.travel,0,id==='javelin'?30:L>=7?40:z.r);
    }else if(z.kind==='orbit'){const aa=Math.floor(Math.min(time,2.99)/.5)*.35;circle(Math.cos(aa)*z.orbit,Math.sin(aa)*z.orbit,z.r);}
    else if(z.kind==='return'){ctx.save();ctx.translate(100*u,0);ctx.rotate(Math.PI);ctx.rect(0,-z.w*u/2,z.L*u,z.w*u);ctx.restore();}
    else for(let i=0;i<5;i++)circle(80+(i-2)*16,(i%2?10:-10),z.r);
    ctx.stroke();ctx.restore();
  }
  function preview(ctx,{id,time,x,y,u=3,a=0,L=1,A=1,showRange=false,showFx=true,frame=-1}) {
    const z=geometry(id,L,A);if(!z)return;forcedFrame=frame;
    const pt=(d,aa=a)=>[x+Math.cos(aa)*d*u,y+Math.sin(aa)*d*u/1.35];
    const draw=(o,xx=x,yy=y)=>effect(ctx,o,xx,yy,u,1.35);
    try{
      if(showRange&&time>=0)range(ctx,id,x,y,u,a,L,A,time);
      if(!showFx||time<0||time>z.life)return;
      if(id==='spear'){
        const t=L>=5&&time>=.15?time-.15:time;
        if(t<.2)draw({spear:'thrust',skill:id,L:z.L,w:z.w,a,t,T:.2},x,y-12*u);
        if(L>=7){const p=pt(z.L*.8+time*300);projectile(ctx,{sid:id,look:'beam',r:10,a,t:time},p[0],p[1],u,1.35);}
      }else if(id==='sweep'){
        const rev=L>=7&&time>=.2,t=rev?time-.2:time;draw({spear:'sweep',r:z.r,half:z.half,a,rev,t,T:.22},x,y-10*u);
      }else if(id==='hundred')for(let i=0;i<6;i++)draw({spear:'rapid',skill:id,L:z.L,w:18,a:a+(i-2.5)*Math.PI/10,t:time,T:.22},x,y-12*u);
      else if(id==='rising'){
        if(time<.25)draw({spear:'rising',skill:id,L:z.L,w:z.w,a,t:time,T:.25},x,y-12*u);
        else if(time>=.6&&L>=7){const p=pt(80);draw({spear:'impact',skill:id,r:22,t:time-.6,T:.3},...p);}
      }else if(id==='javelin'||id==='drill'){
        const life=id==='javelin'?.8:2,d=Math.min(time,life)*z.v,n=z.n||1;
        for(let i=0;i<n;i++){const aa=a+(i-(n-1)/2)*.12,p=pt(d,aa);
          if(time<life)projectile(ctx,{sid:id,look:id==='javelin'?'spear':'drill',r:z.r,a:aa,t:time},p[0],p[1]-(id==='javelin'?14:10)*u,u,1.35);
          else {if(id==='javelin')stuck(ctx,{a:aa},...p,u,1.35);if((id==='javelin'&&L>=5||id==='drill'&&L>=7)&&time<life+.4)draw({spear:'impact',skill:id,r:id==='javelin'?30:40,t:time-life,T:.35},...p);}
        }
      }else if(id==='leap'){
        draw({spear:'leap_impact',skill:id,r:z.r,t:time,T:.4});
        if(time<.35)for(let i=0;i<z.n;i++)draw({spear:'thunder_ray',skill:id,L:130,w:12,a:a+i/z.n*Math.PI*2,t:time,T:.35});
      }else if(id==='dragon'){
        const tick=Math.floor(time/.5),t=time%.5,p=pt(70,a+(tick+1)*.35);
        if(time<3&&t<.25)draw({spear:'dragon_soul',skill:id,r:L>=3?14:10,a:a+(tick+1)*.35+Math.PI/2,t,T:.25},p[0],p[1]-14*u);
        if(time>=3&&L>=7)draw({spear:'impact',skill:id,r:55,t:time-3,T:.5});
      }else if(id==='meteorjavelins'){
        for(let i=0;i<5;i++){const p=pt(80+(i-2)*16);draw({spear:'meteor',stage:time<.35?'fall':'impact',skill:id,t:time<.35?time:time-.35,T:time<.35?.35:.2},p[0],p[1]-45*u+(i%2?10:-10)*u/1.35);}
      }else if(id==='returningthrust'){
        const p=pt(100);if(time<.25)draw({spear:'return',skill:id,L:100,w:24,a,t:time,T:.25},...p);
        if(time>=.2)draw({spear:'return',skill:id,L:70,w:20,a:a+Math.PI,t:time-.2,T:.22},...p);
      }else if(id==='knightcharge')draw({spear:'knight_charge',skill:id,L:140,w:22,a,t:time,T:.3});
    }finally{forcedFrame=-1;}
  }
  return {ready,assets,catalog,mapping,config,setOverrides,geometry,extent,range,preview,effect,projectile,stuck};
})();

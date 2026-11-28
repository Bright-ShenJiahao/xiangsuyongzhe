// 剑系正式像素特效。游戏和校准页共用素材、范围、锚点和微调参数。
window.PIXEL_SKILL_FX = (() => {
  const ROOT=new URL('../art/fx/player/sword/',document.currentScript.src);
  const catalog=window.SWORD_FX_ART||{},images={},KEY='xsyz-swordfx',clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  let overrides={},forcedFrame=-1;
  const ready=Promise.all(Object.entries(catalog).map(([id,m])=>new Promise(ok=>{
    const im=images[id]=new Image();im.crossOrigin='anonymous';im.onload=()=>ok(true);im.onerror=()=>ok(false);im.src=new URL(m.file,ROOT).href;
  })));
  function read(){try{overrides=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){overrides={};}}
  read();addEventListener('storage',e=>{if(e.key===KEY)read();});
  function config(id){const o=overrides[id]||{},n=(k,d,a,b)=>Number.isFinite(+o[k])?clamp(+o[k],a,b):d;return {scale:n('scale',1,.6,1.05),x:n('x',0,-8,8),y:n('y',0,-8,8)};}
  function setOverrides(v){overrides=v&&typeof v==='object'?v:{};}
  const phase=(t,T)=>forcedFrame>=0?forcedFrame:clamp(Math.floor(t/Math.max(.001,T)*4),0,3);
  const radius=id=>Math.max(...catalog[id].extent.map(e=>e.radius));
  function box(id){const b=catalog[id].extent.map(e=>e.bbox);return [Math.min(...b.map(x=>x[0])),Math.min(...b.map(x=>x[1])),Math.max(...b.map(x=>x[2])),Math.max(...b.map(x=>x[3]))];}
  function scope(ctx,x,y,a,ys,clip,fn){
    ctx.save();ctx.shadowBlur=0;ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y));ctx.scale(1,1/ys);ctx.rotate(a||0);
    if(clip){ctx.beginPath();if(clip.kind==='line')ctx.rect(0,-clip.w/2,clip.L,clip.w);else if(clip.half){ctx.moveTo(0,0);ctx.arc(0,0,clip.r,-clip.half,clip.half);ctx.closePath();}else ctx.arc(0,0,clip.r,0,Math.PI*2);ctx.clip();}
    try{fn();}finally{ctx.restore();}
  }
  function art(ctx,id,frame,sx,sy,u,anchor,calId=id){
    const im=images[id],m=catalog[id];if(!im?.complete||!im.naturalWidth||!m)return false;
    const c=config(calId),p=anchor||m.anchor,n=forcedFrame>=0?forcedFrame:clamp(frame,0,3);
    ctx.save();ctx.translate(Math.round(c.x*u),Math.round(c.y*u));
    ctx.drawImage(im,n*64,0,64,64,-p[0]*sx*c.scale,-p[1]*sy*c.scale,64*sx*c.scale,64*sy*c.scale);ctx.restore();return true;
  }
  // Real hit tests consume these same values; artwork never changes combat parameters.
  function geometry(id,L=1,A=1){const mr=1.45;
    switch(id){
      case 'sword':return {kind:'fan',r:52*mr*(L>=3?1.25:1)*A,half:1.18*(L>=3?1.2:1),duration:.24,life:L>=7?.6:L>=5?.39:.24};
      case 'whirl':return {kind:'circle',r:40*mr*A,duration:.3,life:L>=7?1:L>=5?.55:.3};
      case 'guard':return {kind:'orbit',orbit:40,r:12,life:6};
      case 'wave':return {kind:'projectile',r:12,v:240,travel:L>=7?84:168,life:.7,spread:.25};
      case 'phantom':return {kind:'line',L:120,w:12,ghostR:34,life:L>=3?2:.8};
      case 'flash':return {kind:'fan',r:52*1.8*(L>=5?1.3:1)*A,half:Math.PI/2,duration:.3,life:L>=7?.9:.3};
      case 'storm':return {kind:'circle',r:30*mr*A,life:(L>=5?3:2)+(L>=7?.4:0)};
      case 'huntingblade':return {kind:'target',r:18,reach:220,life:.54};
      case 'holysword':return {kind:'rain',r:24,finalR:60,n:L>=3?9:6,life:.9+(L>=3?9:6)*.1};
      case 'sworddomain':return {kind:'domain',r:44*A,life:3.55};
      default:return null;
    }
  }
  function slash(ctx,o,x,y,u,ys){
    const id=o.skill||(o.gold?'flash':'sword');if(!catalog[id])return false;
    const r=o.r*u,s=r/radius(id);let drawn=false;
    scope(ctx,x,y,o.a,ys,{r,half:o.half||1.18},()=>{if(o.rev)ctx.scale(1,-1);drawn=art(ctx,id,phase(o.t,o.T),s,s,u);});return drawn;
  }
  function ring(ctx,o,x,y,u,ys){
    const id=o.art==='storm'?'storm':'whirl',r=o.r*u,s=r/radius(id);
    scope(ctx,x,y,0,ys,{r},()=>art(ctx,id,phase(o.t,o.T),s,s,u,null,o.skill||id));return true;
  }
  function domain(ctx,x,y,r,t,u,ys){const s=r*u/radius('sworddomain');scope(ctx,x,y,0,ys,{r:r*u},()=>art(ctx,'sworddomain',phase(t%.5,.5),s,s,u));}
  function sword(ctx,x,y,a,u,length=24,tip=false,id='guard',t=0){
    const b=box(id),s=length*u/(b[2]-b[0]);
    scope(ctx,x,y,a,1,null,()=>art(ctx,id,phase(t%.4,.4),s,s,u,tip?[56,32]:id==='huntingblade'?[34,32]:null));
  }
  function projectile(ctx,p,x,y,u,ys=1.35){
    const id=p.sid==='sworddomain'?'huntingblade':'wave',r=p.r*u,s=r/(id==='huntingblade'?22:radius(id));
    scope(ctx,x,y,p.a,ys,{r},()=>art(ctx,id,phase((p.t||0)%.3,.3),s,s,u,id==='huntingblade'?[34,32]:[32,32],p.sid||id));return true;
  }
  function effect(ctx,o,x,y,u,ys){
    if(o.k==='pixelSlash')return slash(ctx,o,x,y,u,ys);
    if(o.k!=='swordArt')return false;
    if(o.art==='ring'||o.art==='storm')return ring(ctx,o,x,y,u,ys);
    const p=clamp(o.t/o.T,0,.999);
    if(o.art==='trail'){
      const b=box('phantom'),sx=o.L*u/(b[2]-b[0]),sy=o.w*u/(b[3]-b[1]);
      scope(ctx,x,y,o.a,ys,{kind:'line',L:o.L*u,w:o.w*u},()=>art(ctx,'phantom',phase(o.t,o.T),sx,sy,u,[b[0],32]));
    }else if(o.art==='hunt'){
      const b=box('huntingblade'),s=24*u/(b[2]-b[0]);
      scope(ctx,x,y,o.a,ys,null,()=>art(ctx,'huntingblade',phase(o.t,o.T),s,s,u,[b[2],32]));
    }else if(o.art==='fall'){
      const s=(o.big?56:38)*u/46;
      scope(ctx,x,y-(1-p)*66*u,0,1,null,()=>art(ctx,'holysword',p<.5?0:1,s,s,u,p<.5?[32,52]:[32,56]));
    }else if(o.art==='impact'){
      const first=p<.5,s=first?(o.big?56:38)*u/40:o.r*u/12;
      scope(ctx,x,y,0,first?1:ys,first?null:{r:o.r*u},()=>art(ctx,'holysword',first?2:3,s,s,u));
    }return true;
  }
  function charge(ctx,x,y,u,p,flip){
    const n=1+Math.floor(p*3);ctx.save();ctx.shadowBlur=0;ctx.fillStyle='#c5d9df';ctx.fillRect(Math.round(x+flip*14*u),Math.round(y-25*u),n*u,u);ctx.fillStyle='#f1f3e5';ctx.fillRect(Math.round(x+flip*15*u),Math.round(y-(26+Math.floor(p*2))*u),u,(n+1)*u);ctx.restore();
  }
  function range(ctx,id,x,y,u,a=0,L=1,A=1,time=0){
    const z=geometry(id,L,A);if(!z)return;ctx.save();ctx.strokeStyle='#71ef96';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);ctx.translate(x,y);ctx.scale(1,1/1.35);ctx.rotate(a);ctx.beginPath();
    const circle=(xx,yy,r)=>{ctx.moveTo(xx+r*u,yy);ctx.arc(xx,yy,r*u,0,Math.PI*2);};
    if(z.kind==='fan'){ctx.moveTo(0,0);ctx.arc(0,0,z.r*u,-z.half,z.half);ctx.closePath();}
    else if(z.kind==='line'){ctx.rect(0,-z.w*u/2,z.L*u,z.w*u);circle(z.L*u,0,z.ghostR);}
    else if(z.kind==='orbit'){circle(0,0,z.orbit);circle(Math.cos(time*4)*z.orbit*u,Math.sin(time*4)*z.orbit*u,z.r);}
    else if(z.kind==='projectile'){const d=L>=7?Math.max(0,(time<=.35?time:.7-time)*z.v):Math.min(time*z.v,z.travel);for(let i=-1;i<=1;i++){ctx.moveTo(0,0);ctx.lineTo(Math.cos(i*z.spread)*z.travel*u,Math.sin(i*z.spread)*z.travel*u);circle(Math.cos(i*z.spread)*d*u,Math.sin(i*z.spread)*d*u,z.r);}}
    else if(z.kind==='target')circle(80*u,0,6);
    else if(z.kind==='rain'){circle(80*u,0,z.finalR);circle(80*u,0,z.r);}
    else circle(0,0,id==='storm'&&L>=7&&time>=3?60*A:z.r);
    ctx.stroke();ctx.restore();
  }
  function extent(id,L=1,A=1){const z=geometry(id,L,A);if(!z)return 50;if(z.kind==='projectile')return z.travel+z.r;if(z.kind==='line')return z.L+z.ghostR;if(z.kind==='orbit')return z.orbit+z.r;if(z.kind==='rain')return 80+z.finalR;if(z.kind==='target')return 105;return id==='storm'&&L>=7?60*A+8:z.r+8;}
  function preview(ctx,{id,time,x,y,u=3,a=0,L=1,A=1,showRange=false,showFx=true,frame=-1}){
    const z=geometry(id,L,A);if(!z)return;forcedFrame=frame;
    try{
      if(showRange&&time>=0)range(ctx,id,x,y,u,a,L,A,Math.max(0,time));
      if(!showFx||time<0||time>z.life)return;
      const point=d=>[x+Math.cos(a)*d*u,y+Math.sin(a)*d*u/1.35];
      if(z.kind==='fan'){
        let t=time;if(id==='sword'&&L>=5&&time>=.15)t-=.15;
        if(t<z.duration)slash(ctx,{r:z.r,half:z.half,a,t,T:z.duration,rev:id==='sword'&&L>=5&&time>=.15,gold:id==='flash'},x,y-12*u,u,1.35);
        if(L>=7){const v=id==='flash'?220:260,life=id==='flash'?.9:.6;if(time<life){const q=point(time*v);projectile(ctx,{sid:id,r:id==='flash'?22:12,a,t:time},q[0],q[1],u);}}
      }else if(id==='whirl'){
        let t=time;if(L>=5&&t>=.25)t-=.25;
        if(t<.3)ring(ctx,{r:z.r,t,T:.3},x,y,u,1.35);
        if(L>=7)ring(ctx,{r:z.r*.7,t:time%.3,T:.3},x,y,u,1.35);
      }else if(id==='guard'){
        sword(ctx,x+Math.cos(time*4)*40*u,y+Math.sin(time*4)*40*u/1.35-14*u,time*4+Math.PI/2,u,24,false,'guard',time);
      }else if(id==='wave'){
        const back=L>=7&&time>.35,travel=(back?.7-time:time)*240;
        for(let i=-1;i<=1;i++){const aa=a+i*.25;projectile(ctx,{sid:id,r:12,a:aa+(back?Math.PI:0),t:time},x+Math.cos(aa)*travel*u,y+Math.sin(aa)*travel*u/1.35,u);}
      }else if(id==='phantom'){
        if(time<.25)effect(ctx,{k:'swordArt',art:'trail',a,L:120,w:12,t:time,T:.25},x,y-10*u,u,1.35);
        if(time>=.5&&time<.8){const q=point(120);ring(ctx,{r:34,t:time-.5,T:.3,skill:'phantom'},q[0],q[1],u,1.35);}
      }else if(id==='storm'){const hold=L>=5?3:2;if(time<hold)ring(ctx,{r:z.r,art:'storm',t:time%.4,T:.4},x,y,u,1.35);else if(L>=7)ring(ctx,{r:60*A,t:time-hold,T:.4},x,y,u,1.35);}
      else if(id==='huntingblade'){
        const q=point(80);for(let i=0;i<3;i++){const t=time-i*.18;if(t>=0&&t<.18)effect(ctx,{k:'swordArt',art:'hunt',a,t,T:.18},q[0],q[1]-10*u,u,1.35);}
      }else if(id==='holysword'){
        const center=point(80);
        for(let i=0;i<z.n;i++){const angle=i*2.4,q=[center[0]+Math.cos(angle)*30*u,center[1]+Math.sin(angle)*20*u/1.35],delay=.3+i*.1;
          if(time<delay)effect(ctx,{k:'swordArt',art:'fall',t:time,T:delay,r:24},q[0],q[1],u,1.35);
          else if(time<delay+.3)effect(ctx,{k:'swordArt',art:'impact',t:time-delay,T:.3,r:24},q[0],q[1],u,1.35);
        }
        const delay=.4+z.n*.1;if(time<delay)effect(ctx,{k:'swordArt',art:'fall',t:time,T:delay,r:60,big:true},center[0],center[1],u,1.35);
        else effect(ctx,{k:'swordArt',art:'impact',t:time-delay,T:.5,r:60,big:true},center[0],center[1],u,1.35);
      }else if(id==='sworddomain'){
        if(time<3)domain(ctx,x,y,z.r,time,u,1.35);
        else for(let i=0;i<12;i++){const aa=i*Math.PI/6,d=(time-3)*240;projectile(ctx,{sid:id,r:8,a:aa,t:time},x+Math.cos(aa)*d*u,y+Math.sin(aa)*d*u/1.35,u);}
      }
    }finally{forcedFrame=-1;}
  }
  return {ready,catalog,geometry,extent,config,setOverrides,slash,effect,sword,domain,projectile,charge,range,preview};
})();

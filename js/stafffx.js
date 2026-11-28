// Fixed-cell pixel staff VFX. Art is clipped to horizontal combat footprints.
window.STAFF_SKILL_FX=(()=>{
  const ROOT=new URL('../art/fx/player/staff/',document.currentScript.src),assets=window.STAFF_FX_ART||{},images={};
  const mapping={staff:'fireball',nova:'frost_nova',chain:'chain_lightning',pillar:'holy_pillar',orbs:'shadow_fog',thunder:'thunder_bolt',blizzard:'ice_shard',abyss:'abyss_gate',magicmissiles:'magic_missile',fireburst:'fire_impact',icewall:'icewall',balllightning:'electric_field',arcaneorb:'arcane_orb',firestorm:'fire_wave',gravitywell:'gravity_well',mirrorbarrage:'mirror_bullet'};
  const catalog=Object.fromEntries(Object.entries(mapping).map(([id,art])=>[id,assets[art]])),KEY='xsyz-swordfx';
  let overrides={},forcedFrame=-1;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function read(){try{overrides=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){overrides={};}}
  read();addEventListener('storage',e=>{if(e.key===KEY)read();});
  const ready=Promise.all(Object.entries(assets).map(([id,m])=>new Promise(done=>{const im=images[id]=new Image();im.crossOrigin='anonymous';im.onload=()=>done(true);im.onerror=()=>done(false);im.src=new URL(m.file,ROOT).href;})));
  function config(id){const o=overrides[id]||{},n=(k,d,a,b)=>Number.isFinite(+o[k])?clamp(+o[k],a,b):d;return {scale:n('scale',1,.6,1.05),x:n('x',0,-8,8),y:n('y',0,-8,8)};}
  function setOverrides(o){overrides=o||{};}
  function box(id){const b=assets[id].extent.map(e=>e.bbox);return [Math.min(...b.map(v=>v[0])),Math.min(...b.map(v=>v[1])),Math.max(...b.map(v=>v[2])),Math.max(...b.map(v=>v[3]))];}
  function scope(g,x,y,a,ys,clip,fn){g.save();g.shadowBlur=0;g.imageSmoothingEnabled=false;g.translate(Math.round(x),Math.round(y));g.scale(1,1/ys);g.rotate(a||0);if(clip){g.beginPath();if(clip.kind==='line')g.rect(0,-clip.w/2,clip.L,clip.w);else g.arc(0,0,clip.r,0,Math.PI*2);g.clip();}try{return fn();}finally{g.restore();}}
  function art(g,id,t,T,sx,sy,u,cal,anchor){const im=images[id],m=assets[id];if(!m||!im?.complete||!im.naturalWidth)return false;const c=config(cal),p=anchor||m.anchor,f=forcedFrame>=0?forcedFrame:clamp(Math.floor(t/Math.max(T,.001)*4),0,3);g.save();g.translate(Math.round(c.x*u),Math.round(c.y*u));g.drawImage(im,f*64,0,64,64,-p[0]*sx*c.scale,-p[1]*sy*c.scale,64*sx*c.scale,64*sy*c.scale);g.restore();return true;}
  function circle(g,id,x,y,r,t,T,u,ys,cal){const s=r*u/Math.max(...assets[id].extent.map(e=>e.radius));return scope(g,x,y,0,ys,{r:r*u},()=>art(g,id,t,T,s,s,u,cal));}
  function segment(g,id,x,y,x2,y2,t,T,u,cal){const b=box(id),L=Math.hypot(x2-x,y2-y),sx=L/Math.max(1,b[2]-b[0]);return scope(g,x,y,Math.atan2(y2-y,x2-x),1,null,()=>art(g,id,t,T,sx,Math.min(u,.8*u),u,cal,[b[0],assets[id].anchor[1]]));}
  function effect(g,o,x,y,u,ys){
    const id=o.staff;if(!assets[id])return false;
    const cal=o.skill||id,p=clamp(o.t/o.T,0,1);
    if(id==='thunder_bolt'&&o.pts){const last=o.pts[o.pts.length-1],k=o.unit||1;x+=(last.x-o.x)/k*u;y+=(last.y-o.y)/k*u;o={...o,pts:null};}
    if(o.pts){for(let i=1;i<o.pts.length;i++){const a=o.pts[i-1],b=o.pts[i],k=o.unit||1;segment(g,id,x+(a.x-o.x)/k*u,y+(a.y-o.y)/k*u,x+(b.x-o.x)/k*u,y+(b.y-o.y)/k*u,o.t,o.T,u,cal);}return true;}
    if(id==='holy_pillar'||id==='thunder_bolt'){
      const b=box(id),r=o.r||14,sx=2*r*u/(b[2]-b[0]),sy=(o.height||120)*u/(assets[id].anchor[1]-b[1]);
      return scope(g,x,y,0,1,null,()=>art(g,id,o.t,o.T,sx,sy,u,cal));
    }
    if(o.wall){const n=4;for(let i=0;i<n;i++){const d=(i+.5)*o.L/n;circle(g,id,x+Math.cos(o.a)*d*u,y+Math.sin(o.a)*d*u/ys,16,o.t,o.T,u,ys,cal);}return true;}
    if(id==='icewall'){
      const b=box(id),L=o.L||160,n=Math.ceil(L/40),piece=L/n;
      for(let i=0;i<n;i++){const d=(i+.5)*piece,xx=x+Math.cos(o.a)*d*u,yy=y+30*u+Math.sin(o.a)*d*u/ys;scope(g,xx,yy,0,1,null,()=>art(g,id,o.t,o.T,piece*u/(b[2]-b[0]),20*u/(b[3]-b[1]),u,cal));}return true;
    }
    if(id==='fire_wave'){
      const b=box(id),L=o.L||100,w=o.w||30;return scope(g,x,y,o.a,ys,{kind:'line',L:L*u,w:w*u},()=>art(g,id,o.t,o.T,L*u/(b[2]-b[0]),w*u/(2*(b[3]-b[1])),u,cal,[b[0],assets[id].anchor[1]]));
    }
    if(id==='ice_shard'){
      const b=box(id),s=(o.r||10)*2*u/(b[2]-b[0]);return scope(g,x,y,Math.PI/2,ys,{r:(o.r||10)*u},()=>art(g,id,o.t,o.T,s,s,u,cal));
    }
    if(id==='fireball')return circle(g,id,x,y-(1-p)*120*u,10,o.t% .35,.35,u,1,cal);
    return circle(g,id,x,y,o.r||20,o.t,o.T,u,ys,cal);
  }
  function projectile(g,p,x,y,u,ys){
    if(!mapping[p.sid])return false;
    const id=p.sid==='magicmissiles'?'magic_missile':p.sid==='mirrorbarrage'?'mirror_bullet':p.sid==='nova'?'ice_shard':null;if(!id)return false;
    const r=p.r*u,s=r/Math.max(...assets[id].extent.map(e=>e.radius));return scope(g,x,y,p.a,ys,{r},()=>art(g,id,p.t%.32,.32,s,s,u,p.sid));
  }
  function zone(g,z,x,y,u,ys){const id={fire:'fire_ground',fog:'shadow_fog',holy:'holy_ground',spark:'electric_field'}[z.look];if(!id||!mapping[z.sid])return false;return circle(g,id,x,y,z.r,z.t%.6,.6,u,ys,z.sid);}
  function geometry(id,L=1,A=1){const z={
    staff:{kind:'target',r:30*(L>=3?1.25:1)*A,life:L>=5?2.5:.9},nova:{kind:'circle',r:44*(L>=3?1.25:1)*A,life:L>=7?.5:.45},
    chain:{kind:'chain',r:60,life:.25},pillar:{kind:'target',r:26,life:L>=5?2:.9},orbs:{kind:'target',r:40*(L>=3?1.25:1)*A,life:L>=7?5.4:5},
    thunder:{kind:'target',r:L>=7?50:24,life:L>=7?1.45:L>=5?2.25:1.05},blizzard:{kind:'circle',r:70*(L>=3?1.25:1)*A,life:L>=5?3.5:2.5},
    abyss:{kind:'target',r:90*(L>=3?1.3:1),damageR:50,life:L>=7?4.5:4},magicmissiles:{kind:'projectile',r:7,v:320,life:1.02},
    fireburst:{kind:'target',r:36,life:.95},icewall:{kind:'line',L:160,w:14,life:2.3},balllightning:{kind:'target',r:32,life:2},arcaneorb:{kind:'target',r:36,life:1.8},
    firestorm:{kind:'waves',L:100,w:30,life:.62},gravitywell:{kind:'target',r:60,life:2.4},mirrorbarrage:{kind:'projectile',r:7,v:320,life:3.8}};return z[id]||null;}
  function extent(id,L=1,A=1){const z=geometry(id,L,A);if(!z)return 60;if(z.kind==='target')return 80+z.r;if(id==='icewall')return 160;if(id==='firestorm')return 230;if(z.kind==='projectile')return 320;return z.r+10;}
  function range(g,id,x,y,u,a=0,L=1,A=1,time=0){const z=geometry(id,L,A);if(!z)return;g.save();g.translate(x,y);g.scale(1,1/1.35);g.strokeStyle='#71ef96';g.lineWidth=1.5;g.setLineDash([5,4]);g.beginPath();const c=(xx,yy,r)=>{g.moveTo((xx+r)*u,yy*u);g.arc(xx*u,yy*u,r*u,0,Math.PI*2);};if(z.kind==='circle')c(0,0,z.r);else if(z.kind==='line'){g.rotate(a+Math.PI/2);g.rect(0,-z.w*u/2,z.L*u,z.w*u);}else if(z.kind==='waves'){g.rotate(a);g.rect(90*u,-15*u,136*u,30*u);}else if(z.kind==='chain'){g.moveTo(0,0);g.lineTo(80*u,0);g.lineTo(110*u,30*u);}else if(z.kind==='projectile'){g.rotate(a);c(Math.min(time*320,240),0,7);}else {c(80,0,z.r);if(id==='abyss')c(80,0,z.damageR);}g.stroke();g.restore();}
  function preview(g,{id,time,x,y,u=3,a=0,L=1,A=1,showRange=false,showFx=true,frame=-1}){
    const z=geometry(id,L,A);if(!z)return;forcedFrame=frame;const target=[x+80*u,y],draw=(art,o={},xx=target[0],yy=target[1])=>effect(g,{staff:art,skill:id,t:time,T:z.life,r:z.r,...o},xx,yy,u,1.35);
    try{
      if(showRange&&time>=0)range(g,id,x,y,u,a,L,A,time);if(!showFx||time<0||time>z.life)return;
      if(id==='staff'){if(time<.5)draw('fireball',{T:.5});else if(time<.9)draw('fire_impact',{t:time-.5,T:.4});if(L>=5&&time>=.5)draw('fire_ground',{r:z.r*.8,t:time%.6,T:.6});}
      else if(id==='nova'){draw('frost_nova',{T:.45},x,y);if(L>=7)for(let i=0;i<8;i++){const aa=i*Math.PI/4;projectile(g,{sid:id,r:7,a:aa,t:time},x+Math.cos(aa)*time*200*u,y+Math.sin(aa)*time*200*u/1.35,u,1.35);}}
      else if(id==='chain'){segment(g,'chain_lightning',x,y-20*u,target[0],target[1]-14*u,time,.25,u,id);segment(g,'chain_lightning',target[0],target[1]-14*u,target[0]+35*u,target[1]+12*u,time,.25,u,id);}
      else if(id==='pillar'){if(time>=.5)draw('holy_pillar',{r:14,t:time-.5,T:L>=5?1.5:.4});if(L>=5&&time>=.5)draw('holy_ground',{t:time%.6,T:.6});}
      else if(id==='orbs'){if(time<5)draw('shadow_fog',{t:time%.7,T:.7});else draw('dark_burst',{t:time-5,T:.4});}
      else if(id==='thunder'){for(let i=0;i<4;i++){const t=time-(.3+i*.15);if(t>=0&&t<.3)draw('thunder_bolt',{r:12,t,T:.3},target[0]+(i-1.5)*20*u,target[1]);}if(L>=7&&time>=1)draw('thunder_bolt',{r:25,t:time-1,T:.45});}
      else if(id==='blizzard'){for(let i=0;i<5;i++){const aa=i*2.4;draw('ice_shard',{r:10,t:(time+i*.08)%.3,T:.3},x+Math.cos(aa)*z.r*.65*u,y+Math.sin(aa)*z.r*.65*u/1.35);}}
      else if(id==='abyss'){if(time<4){draw('abyss_gate',{r:26,t:time%.6,T:.6});if(time%.3<.2)segment(g,'abyss_tentacle',...target,target[0]+32*u,target[1]-12*u,time%.3,.2,u,id);}else draw('dark_burst',{r:60,t:time-4,T:.5});}
      else if(id==='magicmissiles'||id==='mirrorbarrage'){const n=id==='magicmissiles'?4:3;for(let i=0;i<n;i++){const t=id==='magicmissiles'?time-i*.09:time%.25;if(t>=0&&t<.75){const aa=a+(id==='mirrorbarrage'?i*.1:0);projectile(g,{sid:id,r:7,a:aa,t},x+Math.cos(aa)*t*320*u,y-12*u+Math.sin(aa)*t*320*u/1.35,u,1.35);}}}
      else if(id==='fireburst'){if(time<.6)draw('fire_charge',{T:.6,r:16});else draw('fire_impact',{t:time-.6,T:.35});}
      else if(id==='icewall'){if(time<2)draw('icewall',{L:160,a:a+Math.PI/2,t:time%.5,T:.5},x,y-30*u);else draw('ice_break',{wall:true,L:160,a:a+Math.PI/2,r:16,t:time-2,T:.3},x,y);}
      else if(id==='balllightning')draw('electric_field',{t:time%.25,T:.25});
      else if(id==='arcaneorb'){const aa=Math.floor(time/.3)*2.4;draw('arcane_orb',{r:12,t:time%.3,T:.3},target[0]+Math.cos(aa)*24*u,target[1]+Math.sin(aa)*24*u/1.35);}
      else if(id==='firestorm')for(let i=0;i<4;i++){const t=time-i*.14;if(t>=0&&t<.2)draw('fire_wave',{L:100,w:30,a,t,T:.2},x+Math.cos(a)*(90+i*12)*u,y+Math.sin(a)*(90+i*12)*u/1.35);}
      else if(id==='gravitywell'){if(time<2)draw('gravity_well',{t:time%.5,T:.5});else draw('arcane_burst',{r:54,t:time-2,T:.4});}
    }finally{forcedFrame=-1;}
  }
  return {ready,assets,catalog,mapping,config,setOverrides,effect,projectile,zone,geometry,extent,range,preview};
})();

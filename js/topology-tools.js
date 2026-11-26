/* NetworkDesk 0.9.4: presentation-only topology tools. No GLPI writes. */
'use strict';
window.NDTopologyTools=(()=>{
const NS='http://www.w3.org/2000/svg';
function init({data,graph,wrap,controls,style,zoom,zoomLabel,fit}){
 const root=document.getElementById('nd');
 const storageKey='networkdesk:topology:v1:'+location.pathname+':'+(data.viewer??'local');
 let prefs={positions:{},colors:{},grouped:false};let storageOK=true;
 try{const v=JSON.parse(localStorage.getItem(storageKey)||'null');if(v&&typeof v==='object'){prefs.positions=v.positions||{};prefs.colors=v.colors||{};prefs.grouped=v.grouped===true;}}catch(e){storageOK=false;}
 const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(prefs));storageOK=true;}catch(e){storageOK=false;}status.textContent=storageOK?'Настройки сохранены в этом браузере':'Сохранение в браузере недоступно';};
 const E=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
 const S=(tag,attrs,parent)=>{const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);parent.append(e);return e;};
 const B=(label,fn)=>{const b=E('button',label);b.type='button';b.onclick=fn;return b;};
 const key=(a,b)=>[Number(a),Number(b)].sort((x,y)=>x-y).join(':');
 const rackMap=new Map();for(const r of data.racks)for(const i of r.devices)if(!rackMap.has('NetworkEquipment:'+i.id))rackMap.set('NetworkEquipment:'+i.id,{id:String(r.id),name:r.name});
 const rackOf=k=>rackMap.get(k)||{id:'unplaced',name:'Вне доступных шкафов'};
 const base=graph.viewBox.baseVal, baseW=base.width,baseH=base.height;
 const nodes=new Map();
 for(const g of graph.querySelectorAll('[data-nd-node]')){const t=g.transform.baseVal.getItem(0).matrix, bb=g.getBBox();nodes.set(g.dataset.ndNode,{g,k:g.dataset.ndNode,x:t.e,y:t.f,bx:t.e,by:t.f,bb});}
 const edges=[];for(const g of graph.querySelectorAll('.nd-top-edge[data-port-a][data-port-b]')){
  const a=data.ports[g.dataset.portA],b=data.ports[g.dataset.portB],line=g.querySelector('.nd-edge-line'),hit=g.querySelector('.nd-edge-hit');if(!a||!b||!line||!hit)continue;
  const u=nodes.get(a.ownerKey),v=nodes.get(b.ownerKey);if(!u||!v)continue;
  const start=line.getPointAtLength(0),end=line.getPointAtLength(line.getTotalLength());
  edges.push({g,a,b,u,v,line,hit,original:line.getAttribute('d'),start:{x:start.x,y:start.y},end:{x:end.x,y:end.y},key:key(a.id,b.id)});
 }
 const groupLayer=S('g',{'class':'nd-rack-groups','aria-hidden':'true'},graph);graph.insertBefore(groupLayer,graph.firstChild);
 const status=E('span');status.className='nd-layout-status';status.setAttribute('role','status');
 const group=E('label');group.className='nd-group-toggle';const check=E('input');check.type='checkbox';check.checked=prefs.grouped;group.append(check,document.createTextNode(' Группировать по шкафам'));
 const config=()=>style+(check.checked?':grouped':':normal');
 const valid=(v)=>v&&Number.isFinite(v.x)&&Number.isFinite(v.y)&&Math.abs(v.x)<100000&&Math.abs(v.y)<100000;
 function defaultPositions(){
  for(const n of nodes.values()){n.x=n.bx;n.y=n.by;}
  if(!check.checked)return;
  const groups=new Map();for(const n of nodes.values()){const r=rackOf(n.k);if(!groups.has(r.id))groups.set(r.id,[]);groups.get(r.id).push(n);}
  // One rack per column: devices never overlap in the automatic grouped arrangement.
  let left=48;
  for(const list of groups.values()){let top=80;let colW=0;for(const n of list){n.x=left-n.bb.x;n.y=top-n.bb.y;top+=n.bb.height+36;colW=Math.max(colW,n.bb.width);}left+=colW+100;}
 }
 function restore(){defaultPositions();const saved=prefs.positions[config()]||{};for(const n of nodes.values())if(valid(saved[n.k])){n.x=saved[n.k].x;n.y=saved[n.k].y;}}
 function saveNode(n){const cfg=config();if(!prefs.positions[cfg]||typeof prefs.positions[cfg]!=='object')prefs.positions[cfg]={};prefs.positions[cfg][n.k]={x:Math.round(n.x),y:Math.round(n.y)};save();}
 function drawGroups(){groupLayer.replaceChildren();if(!check.checked)return;const groups=new Map();for(const n of nodes.values()){const r=rackOf(n.k);const a=groups.get(r.id)||{name:r.name,left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity};a.left=Math.min(a.left,n.x+n.bb.x);a.top=Math.min(a.top,n.y+n.bb.y);a.right=Math.max(a.right,n.x+n.bb.x+n.bb.width);a.bottom=Math.max(a.bottom,n.y+n.bb.y+n.bb.height);groups.set(r.id,a);}
  for(const a of groups.values()){S('rect',{x:a.left-20,y:a.top-38,width:a.right-a.left+40,height:a.bottom-a.top+58,rx:12,'class':'nd-rack-group-bg'},groupLayer);S('text',{x:a.left-8,y:a.top-15,'class':'nd-rack-group-label'},groupLayer).textContent=a.name;}
 }
 function redraw(){
  for(const n of nodes.values())n.g.setAttribute('transform',`translate(${n.x},${n.y})`);
  for(const e of edges){const dx1=e.u.x-e.u.bx,dy1=e.u.y-e.u.by,dx2=e.v.x-e.v.bx,dy2=e.v.y-e.v.by;let d=e.original;
   if(dx1===dx2&&dy1===dy2){e.g.setAttribute('transform',`translate(${dx1},${dy1})`);}
   else{e.g.removeAttribute('transform');const x1=e.start.x+dx1,y1=e.start.y+dy1,x2=e.end.x+dx2,y2=e.end.y+dy2;
    if(style==='ports'){const sign1=e.start.x<e.u.bx+e.u.bb.x+e.u.bb.width/2?-1:1,sign2=e.end.x<e.v.bx+e.v.bb.x+e.v.bb.width/2?-1:1;const span=Math.max(45,Math.min(180,Math.abs(x2-x1)*.45));d=`M ${x1} ${y1} C ${x1+sign1*span} ${y1}, ${x2+sign2*span} ${y2}, ${x2} ${y2}`;}
    else{const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1;const same=edges.filter(i=>((i.u===e.u&&i.v===e.v)||(i.u===e.v&&i.v===e.u)));const off=(same.indexOf(e)-(same.length-1)/2)*34;d=`M ${x1} ${y1} Q ${(x1+x2)/2-dy/len*off} ${(y1+y2)/2+dx/len*off} ${x2} ${y2}`;}
   }e.line.setAttribute('d',d);e.hit.setAttribute('d',d);
   const c=prefs.colors[e.key];if(typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c))e.g.style.setProperty('--nd-cable-color',c);else e.g.style.removeProperty('--nd-cable-color');
  }drawGroups();
 }
 let worldW=baseW,worldH=baseH;
 function dimensions(){worldW=Math.max(baseW,...[...nodes.values()].map(n=>n.x+n.bb.x+n.bb.width+70));worldH=Math.max(baseH,...[...nodes.values()].map(n=>n.y+n.bb.y+n.bb.height+70));graph.setAttribute('viewBox',`0 0 ${worldW} ${worldH}`);applyZoom();}
 function applyZoom(){const z=Number(zoom.value)/100;graph.style.width=worldW*z+'px';graph.style.height=worldH*z+'px';if(zoomLabel)zoomLabel.textContent=zoom.value+'%';}
 zoom.oninput=applyZoom;
 if(fit)fit.onclick=()=>{zoom.value=String(Math.max(Number(zoom.min),Math.min(Number(zoom.max),Math.floor(wrap.clientWidth/worldW*100))));applyZoom();};
 const auto=B('Автораскладка',()=>{delete prefs.positions[config()];defaultPositions();redraw();dimensions();save();});
 check.onchange=()=>{prefs.grouped=check.checked;restore();redraw();dimensions();save();};
 // Native fullscreen includes filters, navigation and details; CSS fallback for browsers that disallow it.
 const full=B('На весь экран',async()=>{if(document.fullscreenElement===root){await document.exitFullscreen();return;}if(root.classList.contains('nd-fullscreen-fallback')){root.classList.remove('nd-fullscreen-fallback');full.textContent='На весь экран';return;}try{if(!root.requestFullscreen)throw Error();await root.requestFullscreen();}catch(e){root.classList.add('nd-fullscreen-fallback');full.textContent='Выйти из полноэкранного режима';}});
 full.className='nd-full-toggle';full.textContent=document.fullscreenElement===root||root.classList.contains('nd-fullscreen-fallback')?'Выйти из полноэкранного режима':'На весь экран';
 const cable=E('select');cable.setAttribute('aria-label','Кабель для настройки цвета');const blank=E('option','Выберите соединение');blank.value='';cable.append(blank);
 for(const e of edges){const o=E('option',`${e.a.owner} / ${e.a.name} ↔ ${e.b.owner} / ${e.b.name}`);o.value=e.key;cable.append(o);}
 const color=E('input');color.type='color';color.value='#458cc0';color.setAttribute('aria-label','Цвет кабеля');color.disabled=true;
 const clearColor=B('Сбросить цвет',()=>{if(!cable.value)return;delete prefs.colors[cable.value];syncColor();redraw();save();});clearColor.disabled=true;
 function syncColor(){color.disabled=clearColor.disabled=!cable.value;const c=prefs.colors[cable.value];color.value=typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c)?c:'#458cc0';}
 cable.onchange=syncColor;color.oninput=()=>{if(cable.value){prefs.colors[cable.value]=color.value;redraw();}};color.onchange=()=>{if(cable.value){prefs.colors[cable.value]=color.value;redraw();save();}};
 for(const e of edges){const select=()=>{cable.value=e.key;syncColor();};e.g.addEventListener('click',select);e.g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' ')select();});}
 const toolbar=E('div');toolbar.className='nd-tools nd-layout-tools';toolbar.append(auto,group,full,cable,color,clearColor,status);controls.after(toolbar);
 status.textContent=storageOK?'Перетащите устройство за заголовок. Настройки локальные.':'Сохранение в браузере недоступно';
 // Click is preserved for opening device; dragging suppresses the subsequent click only.
 for(const n of nodes.values()){
  const handle=n.g.querySelector('.nd-top-card-header')||n.g;handle.classList.add('nd-drag-handle');let drag=null,suppressUntil=0;
  const point=ev=>{const p=graph.createSVGPoint();p.x=ev.clientX;p.y=ev.clientY;return p.matrixTransform(graph.getScreenCTM().inverse());};
  handle.addEventListener('pointerdown',ev=>{if(ev.button!==0||!ev.isPrimary)return;const p=point(ev);drag={id:ev.pointerId,px:p.x,py:p.y,x:n.x,y:n.y,sx:ev.clientX,sy:ev.clientY,moved:false};handle.setPointerCapture(ev.pointerId);});
  handle.addEventListener('pointermove',ev=>{if(!drag||drag.id!==ev.pointerId)return;if(!drag.moved&&Math.hypot(ev.clientX-drag.sx,ev.clientY-drag.sy)<5)return;drag.moved=true;handle.classList.add('nd-dragging');const p=point(ev);n.x=Math.max(45-n.bb.x,Math.min(worldW-n.bb.width-n.bb.x-25,drag.x+p.x-drag.px));n.y=Math.max(45-n.bb.y,Math.min(worldH-n.bb.height-n.bb.y-25,drag.y+p.y-drag.py));redraw();});
  function finish(ev){if(!drag||drag.id!==ev.pointerId)return;const moved=drag.moved;drag=null;handle.classList.remove('nd-dragging');if(moved){suppressUntil=performance.now()+350;saveNode(n);dimensions();}if(handle.hasPointerCapture(ev.pointerId))handle.releasePointerCapture(ev.pointerId);}
  handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);handle.addEventListener('lostpointercapture',finish);
  handle.addEventListener('click',ev=>{if(performance.now()<suppressUntil){ev.stopImmediatePropagation();ev.preventDefault();}},true);
 }
 restore();redraw();dimensions();
}
 document.addEventListener('fullscreenchange',()=>{const b=document.querySelector('#nd .nd-full-toggle');if(b)b.textContent=document.fullscreenElement===document.getElementById('nd')?'Выйти из полноэкранного режима':'На весь экран';});
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){const root=document.getElementById('nd');if(root?.classList.contains('nd-fullscreen-fallback')){root.classList.remove('nd-fullscreen-fallback');const b=root.querySelector('.nd-full-toggle');if(b)b.textContent='На весь экран';}}});
 return {init};
})();

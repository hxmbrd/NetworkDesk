'use strict';
(()=>{
const data=JSON.parse(document.getElementById('nd-data').textContent), $=id=>document.getElementById(id);
const el=(tag,txt,cls)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;if(cls)e.className=cls;return e};
const link=(label,url)=>{const a=el('a',label);a.href=url;return a};
const allRack={name:'Все сетевые устройства',units:0,devices:Object.values(data.devices).map(d=>{const r=data.racks.find(r=>r.devices.some(i=>i.id===d.id));return {id:d.id,position:null,orientation:null,rackName:r?.name||'Вне шкафов'}})};
let rack=data.racks[0]||allRack, selected=null, frame=0, mode='rack';
const edges=[];for(const p of Object.values(data.ports))for(const id of p.peers)if(p.id<id&&data.ports[id])edges.push([p.id,id]);
function switchView(m,r){mode=m;if(r)rack=r;selected=null;$('nd-search').value='';$('nd-details').replaceChildren(el('h3','Карточка порта'),el('p','Выберите порт или соединение.'));render()}
for(const [m,label] of [['all','Все коммутаторы'],['topology','Топология сети'],['mac','MAC-таблица']]){const b=el('button',label);b.dataset.mode=m;b.onclick=()=>switchView(m);$('nd-views').append(b)}
const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('nd-wires');svg.setAttribute('aria-hidden','true');$('nd').append(svg);
const buttons=new Map();
function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(draw)}
function draw(){svg.replaceChildren();if(mode==='topology')return;const root=$('nd').getBoundingClientRect();svg.setAttribute('viewBox',`0 0 ${root.width} ${root.height}`);
const point=b=>{if(!b)return null;const r=b.getBoundingClientRect(),clip=b.closest('.nd-device').getBoundingClientRect();return r.left>=clip.left&&r.right<=clip.right?{x:r.left+r.width/2-root.left,y:r.top+r.height/2-root.top}:null};
const pairs=$('nd-all-wires').checked?edges:selected?data.ports[selected].peers.map(id=>[selected,id]):[];
for(const [a,b] of pairs){const start=point(buttons.get(a)),end=point(buttons.get(b));if(!start||!end)continue;const path=document.createElementNS(svg.namespaceURI,'path');const mid=(start.y+end.y)/2;path.setAttribute('d',`M ${start.x} ${start.y} V ${mid} H ${end.x} V ${end.y}`);if(selected&&a!==selected&&b!==selected)path.classList.add('nd-wire-muted');svg.append(path)}}
function select(p){selected=p.id;details(p);for(const [id,b] of buttons){b.classList.toggle('nd-selected',id===selected);b.classList.toggle('nd-peer',p.peers.includes(id));b.classList.toggle('nd-muted',id!==selected&&!p.peers.includes(id));}schedule()}
function go(p){if(mode==='all'&&buttons.has(p.id)){select(p);buttons.get(p.id).scrollIntoView({block:'nearest',inline:'nearest'});return;}mode='rack';const r=data.racks.find(r=>r.devices.some(d=>data.devices[d.id].ports.includes(p.id)));if(!r){selected=null;render();details(p);return;}rack=r;$('nd-search').value='';$('nd-vlan').value='';selected=p.id;render();buttons.get(p.id)?.scrollIntoView({block:'nearest',inline:'nearest'});schedule()}
window.addEventListener('resize',schedule);document.addEventListener('scroll',schedule,true);if(window.ResizeObserver)new ResizeObserver(schedule).observe($('nd'));
for(const r of data.racks){const b=el('button',`${r.name} · ${r.devices.length}`);b.onclick=()=>switchView('rack',r);$('nd-racks').append(b)}
for(const v of data.vlans.sort((a,b)=>Number(a.tag)-Number(b.tag))){const o=el('option',`${v.tag} — ${v.name}`);o.value=v.tag;$('nd-vlan').append(o)}
function details(p){const e=$('nd-details');e.replaceChildren(el('h3',p.owner+' / '+p.name),el('p',`GLPI ID: ${p.id} · ${p.type}`),el('p',`MAC: ${p.mac||'—'}`),el('p',`Скорость (данные GLPI): ${p.speed||'—'}`),el('p',p.comment||''),el('h4','Подключение'));
if(!p.peers.length)e.append(el('p','Нет видимого документированного подключения'));
for(const id of p.peers){const q=data.ports[id];const b=el('button',`${q.owner} → ${q.name}`);const target=data.racks.find(r=>r.devices.some(d=>data.devices[d.id].ports.includes(q.id)));if(target&&target!==rack)b.textContent+=` · ${target.name}`;b.onclick=()=>go(q);e.append(b)}
e.append(el('h4','VLAN'));for(const v of p.vlans)e.append(el('p',`${v.tag} · ${v.name} · ${v.tagged?'Tagged':'Untagged'}`));if(!p.vlans.length)e.append(el('p','Нет доступных назначений'));
const clear=el('button','Снять выделение');clear.onclick=()=>{selected=null;render();e.replaceChildren(el('h3','Карточка порта'),el('p','Выберите порт.'))};e.append(clear);e.append(link('Открыть порт в GLPI',p.url),link('Управление подключениями в GLPI',p.ownerUrl));window.NDSnmp?.details(p.id);window.NDMac?.details(p.id);}
function render(){const out=$('nd-devices');out.replaceChildren();buttons.clear();svg.replaceChildren();$('nd-wire-toggle').hidden=mode==='topology'||mode==='mac';for(const b of $('nd-views').children)b.classList.toggle('nd-active',b.dataset.mode===mode);if(mode==='mac'){window.NDMac?.search(out);return;}if(mode==='topology'){renderTopology(out);window.NDSnmp?.paint();window.NDMac?.paint();return;}const current=mode==='all'?allRack:rack;if(!current){$('nd-title').textContent='Нет доступных шкафов';return} $('nd-title').textContent=`${current.name}${current.units?' · '+current.units+'U':''}`;const query=$('nd-search').value.trim().toLowerCase(), vlan=$('nd-vlan').value;
for(const item of current.devices){const d=data.devices[item.id];const ports=d.ports.map(id=>data.ports[id]);const matches=p=>!query||[d.name,p.name,p.mac,p.comment,...p.peers.map(id=>data.ports[id].owner)].join(' ').toLowerCase().includes(query);if(query&&!ports.some(matches)&&!d.name.toLowerCase().includes(query))continue;
const panel=el('article',undefined,'nd-device');panel.dataset.ndDevice=d.id;const heading=el('h3');if(item.position!==null)heading.append(document.createTextNode(item.position+'U · '));if(d.url){const a=link(d.name,d.url);a.className='nd-device-title-link';a.target='_blank';a.rel='noopener noreferrer';a.title='Открыть сетевое устройство в GLPI (новая вкладка)';heading.append(a);}else heading.append(document.createTextNode(d.name));panel.append(heading,el('small',`${item.rackName?item.rackName+' · ':''}GLPI #${d.id} · ${ports.length} портов · ${item.orientation===1?'ориентация 1':'ориентация '+(item.orientation??'—')}`));
const optical=p=>/sfp|qsfp/i.test(p.name)||(/Aruba.*24/i.test(d.name)&&p.number>24);const copper=ports.filter(p=>!optical(p)).sort((a,b)=>a.number-b.number||a.id-b.id), fiber=ports.filter(optical).sort((a,b)=>a.number-b.number||a.id-b.id);
const bank=el('div',undefined,'nd-banks');for(const [group,isFiber] of [[copper,false],[fiber,true]]){if(!group.length)continue;const grid=el('div',undefined,'nd-ports');const single=/CCR1009|Патч/i.test(d.name)&&!isFiber;grid.style.gridTemplateRows=single?'1fr':'repeat(2,1fr)';for(const p of group){const b=el('button',p.name.replace(/ \(копия\)/g,''),`nd-port ${p.documented?'connected':''} ${isFiber?'fiber':''}`);if((vlan&&!p.vlans.some(v=>String(v.tag)===vlan))||!matches(p))b.classList.add('dim');b.title=`${p.name} · ${p.peers.map(id=>data.ports[id].owner+' / '+data.ports[id].name).join(', ')||'нет видимой связи'} · ${p.vlans.map(v=>v.tag+(v.tagged?' T':' U')).join(', ')}`;b.dataset.portId=p.id;b.onclick=()=>select(p);buttons.set(p.id,b);if(!single&&/CRS354/i.test(d.name)&&!isFiber)b.style.gridRow=p.number%2?'2':'1';grid.append(b)}bank.append(grid)}panel.append(bank);out.append(panel)} if(selected&&data.ports[selected])select(data.ports[selected]);else schedule();window.NDSnmp?.paint();window.NDMac?.paint(); }
function renderCompactTopology(out){
 $('nd-title').textContent='Топология сети';const q=$('nd-search').value.trim().toLowerCase(),vlan=$('nd-vlan').value;
 const nodes=new Map();for(const d of Object.values(data.devices))nodes.set('NetworkEquipment:'+d.id,{name:d.name,ports:d.ports});
 for(const [a,b] of edges)for(const id of [a,b]){const p=data.ports[id];if(!nodes.has(p.ownerKey))nodes.set(p.ownerKey,{name:p.owner,ports:[]});const n=nodes.get(p.ownerKey);if(!n.ports.includes(id))n.ports.push(id)}
 const match=p=>(!vlan||p.vlans.some(v=>String(v.tag)===vlan))&&(!q||[p.owner,p.name,p.mac,p.comment].join(' ').toLowerCase().includes(q));
 const visible=edges.filter(([a,b])=>match(data.ports[a])||match(data.ports[b]));const connected=new Set(visible.flatMap(pair=>pair.map(id=>data.ports[id].ownerKey)));
 const keys=[...nodes.keys()].filter(k=>connected.has(k)||(!vlan&&(!q||nodes.get(k).name.toLowerCase().includes(q)))||nodes.get(k).ports.some(id=>match(data.ports[id])));
 const degree=k=>visible.filter(pair=>pair.some(id=>data.ports[id].ownerKey===k)).length;keys.sort((a,b)=>degree(b)-degree(a));
 out.append(el('p',`${keys.length} устройств · ${visible.length} документированных соединений. Нажмите линию для просмотра портов.`));
 const controls=el('div',undefined,'nd-tools');const zoom=el('input');zoom.type='range';zoom.min=50;zoom.max=150;zoom.value=100;controls.append(el('span','Масштаб'),zoom);out.append(controls);
 const wrap=el('div',undefined,'nd-topology-wrap');out.append(wrap);const ns=svg.namespaceURI, graph=document.createElementNS(ns,'svg');const W=1000,H=Math.max(720,keys.length*48);graph.setAttribute('viewBox',`0 0 ${W} ${H}`);graph.style.width=W+'px';graph.style.height=H+'px';wrap.append(graph);zoom.oninput=()=>{graph.style.width=W*zoom.value/100+'px';graph.style.height=H*zoom.value/100+'px'};
 const make=(tag,attrs,parent=graph)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);parent.append(e);return e};const pos=new Map();keys.forEach((k,i)=>{const angle=-Math.PI/2+(i-1)*2*Math.PI/Math.max(1,keys.length-1);pos.set(k,i===0?{x:W/2,y:H/2}:{x:W/2+380*Math.cos(angle),y:H/2+(H/2-65)*Math.sin(angle)})});
 const parallel=new Map();for(const [a,b] of visible){const p=data.ports[a],t=data.ports[b],u=pos.get(p.ownerKey),v=pos.get(t.ownerKey);if(!u||!v)continue;const key=[p.ownerKey,t.ownerKey].sort().join('|'),i=parallel.get(key)||0;parallel.set(key,i+1);const dx=v.x-u.x,dy=v.y-u.y,len=Math.hypot(dx,dy)||1,off=(i+1)*18*(i%2?-1:1);const mx=(u.x+v.x)/2-dy/len*off,my=(u.y+v.y)/2+dx/len*off;const d=p.ownerKey===t.ownerKey?`M ${u.x} ${u.y} c -100 -100 100 -100 0 0`:`M ${u.x} ${u.y} Q ${mx} ${my} ${v.x} ${v.y}`;const g=make('g',{'class':'nd-top-edge','data-port-a':a,'data-port-b':b,tabindex:0,role:'button','aria-label':`${p.owner} ${p.name} — ${t.owner} ${t.name}`});make('path',{d,'class':'nd-edge-hit'},g);make('path',{d,'class':'nd-edge-line'},g);const title=make('title',{},g);title.textContent=`${p.owner} / ${p.name} ↔ ${t.owner} / ${t.name}`;const click=()=>{graph.querySelectorAll('.nd-top-edge').forEach(e=>e.classList.remove('nd-edge-active'));g.classList.add('nd-edge-active');details(p)};g.onclick=click;g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();click()}};}
 for(const k of keys){const n=nodes.get(k),p=pos.get(k),g=make('g',{'class':'nd-top-node','data-nd-node':k,transform:`translate(${p.x},${p.y})`});make('rect',{x:-102,y:-26,width:204,height:52,rx:8},g);const name=make('text',{x:0,y:-4,'text-anchor':'middle'},g);name.textContent=n.name.length>29?n.name.slice(0,27)+'…':n.name;const info=make('text',{x:0,y:14,'text-anchor':'middle','class':'nd-node-info'},g);info.textContent=`${degree(k)} связей`;const title=make('title',{},g);title.textContent=n.name;g.onclick=()=>{const id=n.ports[0];if(id)go(data.ports[id])};}
 if(!keys.length)out.append(el('p','Нет результатов по выбранным фильтрам.'));
 if(keys.length)window.NDTopologyTools.init({data,graph,wrap,controls,style:'compact',zoom});
}
// 0.9.3.1: additional detailed topology; the original compact graph is retained.
let topologyStyle='ports';
function renderTopology(out){
 const bar=el('div',undefined,'nd-tools nd-top-style');
 for(const [id,label] of [['ports','Порт → порт'],['compact','Общая схема']]){
  const b=el('button',label);b.type='button';b.classList.toggle('nd-active',topologyStyle===id);b.setAttribute('aria-pressed',String(topologyStyle===id));
  b.onclick=()=>{topologyStyle=id;render()};bar.append(b);
 }
 out.append(bar);
 if(topologyStyle==='compact')renderCompactTopology(out);else renderPortTopology(out);
}
function renderPortTopology(out){
 $('nd-title').textContent='Топология сети';
 const q=$('nd-search').value.trim().toLowerCase(),vlan=$('nd-vlan').value;
 const nodes=new Map(Object.values(data.devices).map(d=>['NetworkEquipment:'+d.id,{name:d.name,ports:d.ports}]));
 for(const [a,b] of edges)for(const id of [a,b]){const p=data.ports[id];if(!nodes.has(p.ownerKey))nodes.set(p.ownerKey,{name:p.owner,ports:[]});const n=nodes.get(p.ownerKey);if(!n.ports.includes(id))n.ports.push(id)}
 const match=p=>(!vlan||p.vlans.some(v=>String(v.tag)===vlan))&&(!q||[p.owner,p.name,p.mac,p.comment].join(' ').toLowerCase().includes(q));
 const visible=edges.filter(([a,b])=>match(data.ports[a])||match(data.ports[b]));
 const connected=new Set(visible.flatMap(pair=>pair.map(id=>data.ports[id].ownerKey)));
 const keys=[...nodes.keys()].filter(k=>connected.has(k)||(!vlan&&(!q||nodes.get(k).name.toLowerCase().includes(q)))||nodes.get(k).ports.some(id=>match(data.ports[id])));
 const degree=k=>visible.filter(pair=>pair.some(id=>data.ports[id].ownerKey===k)).length;
 keys.sort((a,b)=>degree(b)-degree(a)||nodes.get(a).name.localeCompare(nodes.get(b).name));
 out.append(el('p',`${keys.length} устройств · ${visible.length} документированных соединений. Видны порты этих соединений; остальные порты доступны в карточках оборудования.`));
 if(!keys.length){out.append(el('p','Нет результатов по выбранным фильтрам.'));return;}
 const controls=el('div',undefined,'nd-tools');const zoom=el('input');zoom.type='range';zoom.min=40;zoom.max=150;zoom.value=80;zoom.setAttribute('aria-label','Масштаб топологии');
 const zoomLabel=el('span','80%');const fit=el('button','Вписать');fit.type='button';const reset=el('button','Снять выделение');reset.type='button';
 controls.append(el('span','Масштаб'),zoom,zoomLabel,fit,reset);out.append(controls);
 const wrap=el('div',undefined,'nd-topology-wrap');out.append(wrap);
 const ns=svg.namespaceURI,graph=document.createElementNS(ns,'svg');graph.classList.add('nd-port-graph');wrap.append(graph);
 const make=(tag,attrs,parent=graph)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);parent.append(e);return e};
 const cardW=304, rowH=29, W=1440, colX=[190,720,1250], groups=[[],[],[]], layout=new Map();
 // Put the highest-degree node in the centre, distribute others down either side.
 keys.forEach((k,i)=>{
  const neighbors=visible.flatMap(([a,b])=>data.ports[a].ownerKey===k?[data.ports[b].ownerKey]:data.ports[b].ownerKey===k?[data.ports[a].ownerKey]:[]);
  const nearby=neighbors.map(key=>layout.get(key)).filter(n=>n&&n.col!==1);
  const col=i===0?1:nearby.length?nearby[0].col:groups[0].length<=groups[2].length?0:2;
  const n={key:k,col,left:[],right:[],x:colX[col],y:0,h:0};layout.set(k,n);groups[col].push(n);
 });
 const anchors=new Map();
 for(const [a,b] of visible)for(const [id,other] of [[a,b],[b,a]]){
  if(anchors.has(id))continue;
  const n=layout.get(data.ports[id].ownerKey),m=layout.get(data.ports[other].ownerKey);if(!n||!m)continue;
  const side=m.col<n.col?'left':m.col>n.col?'right':n.col===0?'left':'right';
  n[side].push(id);anchors.set(id,{n,side});
 }
 const sortPorts=(a,b)=>data.ports[a].number-data.ports[b].number||a-b;
 for(const n of layout.values()){n.left.sort(sortPorts);n.right.sort(sortPorts);n.h=58+Math.max(1,n.left.length,n.right.length)*rowH;}
 const colHeight=g=>g.reduce((s,n)=>s+n.h+28,0)-28;
 const H=Math.max(540,...groups.map(colHeight))+70;
 for(const g of groups){let y=(H-colHeight(g))/2;for(const n of g){n.y=y;y+=n.h+28;for(const side of ['left','right'])n[side].forEach((id,i)=>{const a=anchors.get(id);a.x=n.x+(side==='left'?-cardW/2:cardW/2);a.y=n.y+58+i*rowH+rowH/2;});}}
 graph.setAttribute('viewBox',`0 0 ${W} ${H}`);
 function applyZoom(){graph.style.width=W*Number(zoom.value)/100+'px';graph.style.height=H*Number(zoom.value)/100+'px';zoomLabel.textContent=zoom.value+'%';}
 zoom.oninput=applyZoom;fit.onclick=()=>{zoom.value=String(Math.max(40,Math.min(150,Math.floor(wrap.clientWidth/W*100))));applyZoom()};applyZoom();
 const edgeLayer=make('g',{}),nodeLayer=make('g',{}),portEls=new Map(),edgeEls=[];
 function activate(id,pair=null){
  selected=id;const p=data.ports[id];if(!p)return;
  const peers=new Set(pair?pair.filter(x=>x!==id):p.peers);
  for(const [pid,g] of portEls){g.classList.toggle('nd-top-port-selected',pid===id);g.classList.toggle('nd-top-port-peer',peers.has(pid));}
  for(const e of edgeEls){const hit=pair?(e.a===pair[0]&&e.b===pair[1]):(e.a===id||e.b===id);e.g.classList.toggle('nd-edge-active',hit);e.g.classList.toggle('nd-edge-dim',!hit);if(hit)edgeLayer.append(e.g);}
  details(p);
 }
 function keyboard(g,fn){g.onclick=fn;g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn()}};}
 for(const [a,b] of visible){
  const u=anchors.get(a),v=anchors.get(b);if(!u||!v)continue;
  const ux=u.side==='left'?-1:1,vx=v.side==='left'?-1:1;
  let d;
  if(u.n.col===v.n.col&&u.side===v.side){const outer=u.x+ux*28;d=`M ${u.x} ${u.y} C ${outer} ${u.y}, ${outer} ${v.y}, ${v.x} ${v.y}`;}
  else if(Math.abs(u.n.col-v.n.col)===2&&groups[1].length){
   const center=groups[1][0],top=center.y-16,bottom=center.y+center.h+16;
   const lane=Math.abs(u.y-top)+Math.abs(v.y-top)<Math.abs(u.y-bottom)+Math.abs(v.y-bottom)?top:bottom;
   const aX=u.x+ux*75,bX=v.x+vx*75;
   d=`M ${u.x} ${u.y} C ${aX} ${u.y}, ${aX} ${lane}, ${aX} ${lane} H ${bX} C ${bX} ${lane}, ${bX} ${v.y}, ${v.x} ${v.y}`;
  }
  else {const span=Math.max(30,Math.min(180,Math.abs(v.x-u.x)*.48));d=`M ${u.x} ${u.y} C ${u.x+ux*span} ${u.y}, ${v.x+vx*span} ${v.y}, ${v.x} ${v.y}`;}
  const p=data.ports[a],t=data.ports[b],label=`${p.owner} / ${p.name} ↔ ${t.owner} / ${t.name}`;
  const g=make('g',{'class':'nd-top-edge',tabindex:0,role:'button','aria-label':label,'data-port-a':a,'data-port-b':b},edgeLayer);
  make('path',{d,'class':'nd-edge-hit'},g);make('path',{d,'class':'nd-edge-line'},g);make('title',{},g).textContent=label;
  keyboard(g,()=>activate(a,[a,b]));edgeEls.push({a,b,g});
 }
 for(const n of layout.values()){
  const item=nodes.get(n.key),g=make('g',{'class':'nd-top-card','data-nd-node':n.key,transform:`translate(${n.x-cardW/2},${n.y})`},nodeLayer);
  make('rect',{'class':'nd-top-card-bg',width:cardW,height:n.h,rx:8},g);
  const header=make('g',{'class':'nd-top-card-header',role:'button',tabindex:0,'aria-label':'Открыть оборудование: '+item.name},g);
  make('rect',{width:cardW,height:54,rx:8,'class':'nd-top-card-head'},header);
  make('text',{x:12,y:20,'class':'nd-top-card-name'},header).textContent=item.name.length>39?item.name.slice(0,37)+'…':item.name;
  make('text',{x:12,y:39,'class':'nd-top-card-meta'},header).textContent=`${degree(n.key)} связей · ${item.ports.length} портов`;
  make('title',{},header).textContent=item.name+' — открыть лицевую панель';keyboard(header,()=>{const id=item.ports[0];if(id)go(data.ports[id])});
  for(const side of ['left','right'])for(const id of n[side]){
   const p=data.ports[id],a=anchors.get(id),left=side==='left',x=left?0:cardW/2+4,y=a.y-n.y;
   const pg=make('g',{'class':'nd-top-port'+(/sfp|qsfp/i.test(p.name)?' nd-top-port-fiber':''),role:'button',tabindex:0,'data-port-id':id,'aria-label':`${p.owner} / ${p.name}`},g);
   make('rect',{x,y:y-11,width:cardW/2-4,height:22,rx:4,'class':'nd-top-port-chip'},pg);
   make('circle',{cx:left?0:cardW,cy:y,r:4,'class':'nd-top-port-anchor'},pg);
   const label=p.name||String(p.number);make('text',{x:left?10:cardW-10,y:y+4,'text-anchor':left?'start':'end'},pg).textContent=label.length>22?label.slice(0,20)+'…':label;
   make('title',{},pg).textContent=`${p.owner} / ${p.name} · ${p.peers.map(i=>data.ports[i].owner+' / '+data.ports[i].name).join(', ')}`;
   keyboard(pg,()=>activate(id));portEls.set(id,pg);
  }
  if(!n.left.length&&!n.right.length)make('text',{x:12,y:76,'class':'nd-top-card-empty'},g).textContent='Нет видимых соединений';
 }
 reset.onclick=()=>{selected=null;for(const g of portEls.values())g.classList.remove('nd-top-port-selected','nd-top-port-peer');for(const e of edgeEls)e.g.classList.remove('nd-edge-active','nd-edge-dim');$('nd-details').replaceChildren(el('h3','Карточка порта'),el('p','Выберите порт или соединение.'));};
 window.NDTopologyTools.init({data,graph,wrap,controls,style:'ports',zoom,zoomLabel,fit});
 if(selected&&portEls.has(selected))activate(selected);
}

$('nd-all-wires').onchange=schedule;$('nd-search').oninput=render;$('nd-vlan').onchange=render;render();window.NDSnmp?.init(data);window.NDMac?.init(data,go,()=>{if(mode==='mac')render();});
})();

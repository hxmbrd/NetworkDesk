'use strict';
(()=>{
const $=id=>document.getElementById(id), labels={online:'SNMP Online',no_response:'Нет ответа SNMP',not_configured:'Не настроено',disabled:'Опрос отключён',pending:'Ожидание опроса',stale:'Данные устарели'};
const oper={1:'UP',2:'DOWN',3:'Testing',4:'Unknown',5:'Dormant',6:'Not present',7:'Lower layer down'};
let data=null, snapshots={},busy=false;
const REFRESH_MS=10000;
const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const device=id=>snapshots[id]||{status:'pending',ports:{},ips:[]};
const ownerId=p=>p?.ownerKey?.startsWith('NetworkEquipment:')?p.ownerKey.split(':')[1]:null;
const snapshot=p=>{const id=ownerId(p),d=device(id);return d.status==='online'?d.ports?.[p.id]:null;};
const state=p=>{const v=snapshot(p);return !v?'unknown':v.oper===1?'up':v.admin===2?'admin-down':v.oper===2||v.oper===7?'down':'unknown';};
const fmt=(v,unit='')=>v===null||v===undefined?'—':Number(v).toLocaleString('ru-RU',{maximumFractionDigits:2})+unit;
const time=t=>t?new Date(t*1000).toLocaleString('ru-RU'):'—';
const clock=t=>t?new Date(t*1000).toLocaleTimeString('ru-RU'):'—';
function refreshInfo(info){
 const times=Object.values(snapshots).filter(d=>['online','no_response','stale'].includes(d.status)).map(d=>Number(d.time)).filter(t=>Number.isFinite(t)&&t>0);
 if(!info)return;
 if(!times.length){info.textContent='Ожидается первый опрос · Автообновление: 10 с';return;}
 const first=Math.min(...times),last=Math.max(...times);
 info.textContent='Последний опрос: '+clock(last)+(first!==last?' · Самые ранние данные: '+clock(first):'')+' · Автообновление: 10 с';
 info.title='Последний результат: '+time(last)+'; самый ранний: '+time(first);
}
// Only link validated IP addresses from the authoritative GLPI «Сеть» field.
const validIPv4=ip=>typeof ip==='string'&&/^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(ip)&&ip.split('.').every(v=>Number(v)<=255);
function managementLinks(d,fallback){
 const ips=[...new Set((Array.isArray(d.ips)?d.ips:[]).filter(validIPv4))];
 if(!ips.length)return document.createTextNode(fallback);
 const fragment=document.createDocumentFragment();
 for(const [i,ip] of ips.entries()){
  if(i)fragment.append(document.createTextNode(', '));
  const a=make('a',ip,'nd-management-ip');
  a.href='http://'+ip+'/';a.target='_blank';a.rel='noopener noreferrer';
  a.title='Открыть веб-интерфейс '+ip+' в новой вкладке';
  fragment.append(a);
 }
 return fragment;
}

function paint(){
 if(!data||!$('nd'))return;
 for(const b of document.querySelectorAll('#nd .nd-port[data-port-id],#nd .nd-top-port[data-port-id]')){
  const p=data.ports[b.dataset.portId]; if(!p)continue;
  b.dataset.ndLive=state(p);
  if(b instanceof HTMLElement){if(!b.dataset.ndOriginalTitle)b.dataset.ndOriginalTitle=b.title;b.title=b.dataset.ndOriginalTitle+' · SNMP: '+(snapshot(p)?oper[snapshot(p).oper]||'Unknown':'нет данных');}
 }
 for(const panel of document.querySelectorAll('#nd .nd-device[data-nd-device]')){
  const id=panel.dataset.ndDevice,d=device(id);let status=panel.querySelector('.nd-live-device');
  if(!status){status=make('div',undefined,'nd-live-device');panel.querySelector('small')?.after(status);}
  status.dataset.status=d.status;const mapped=Object.keys(d.ports||{}).length;
  const statusText=[labels[d.status]||d.status,d.status==='online'?`${mapped}/${data.devices[id]?.ports.length||0} портов сопоставлено`:d.message,['online','no_response','stale'].includes(d.status)&&d.time?'Опрос '+clock(d.time):''].filter(Boolean).join(' · ');
  status.replaceChildren(managementLinks(d,'IP не указан'),document.createTextNode(statusText?' · '+statusText:''));
 }
 for(const g of document.querySelectorAll('#nd [data-nd-node]')){
  const k=g.getAttribute('data-nd-node');if(!k?.startsWith('NetworkEquipment:'))continue;
  const d=device(k.split(':')[1]);let dot=g.querySelector('.nd-live-dot');
  if(!dot){dot=document.createElementNS('http://www.w3.org/2000/svg','circle');dot.setAttribute('class','nd-live-dot');dot.setAttribute('r','5');const detailed=g.classList.contains('nd-top-card');dot.setAttribute('cx',detailed?'293':'94');dot.setAttribute('cy',detailed?'11':'-17');dot.setAttribute('pointer-events','none');g.append(dot);}
  dot.dataset.status=d.status;
  let t=dot.querySelector('title');if(!t){t=document.createElementNS(dot.namespaceURI,'title');dot.append(t);}t.textContent=`${labels[d.status]||d.status} · ${d.ip||'IP не определён'} · ${time(d.time)}`;
 }
 const active=$('nd-live-port');if(active)fillDetails(active,active.dataset.portId);
 const all=Object.values(snapshots);if($('nd-snmp-summary'))$('nd-snmp-summary').textContent=all.length?`SNMP: ${all.filter(d=>d.status==='online').length} отвечают · ${all.filter(d=>d.status==='no_response').length} без ответа · ${all.filter(d=>d.status==='stale').length} устарели · ${all.filter(d=>!['online','no_response','stale'].includes(d.status)).length} без данных/отключены`:'SNMP: нет данных';
}
function fillDetails(box,id){
 const p=data?.ports[id];if(!p)return;const owner=ownerId(p);if(!owner){box.replaceChildren();return;}const d=device(owner),v=snapshot(p);
 const ipRow=make('p');ipRow.append(document.createTextNode('IP управления (поле «Сеть» GLPI): '),managementLinks(d,'—'));
 const rows=[`Устройство: ${labels[d.status]||d.status}`,`Последний опрос: ${time(d.time)}`];
 if(d.uptime_ticks!==null&&d.uptime_ticks!==undefined)rows.push(`Uptime SNMP: ${fmt(d.uptime_ticks/8640000,' дн.')}`);
 if(v){rows.push(`Интерфейс: ${v.name||v.descr||'—'} (ifIndex ${v.ifIndex})`,`Link: ${oper[v.oper]||'Unknown'} · Admin: ${v.admin===1?'UP':v.admin===2?'DOWN':'Unknown'}`,`Скорость: ${fmt(v.speed_mbps,' Мбит/с')}`,`RX / TX: ${fmt(v.rx_bps==null?null:v.rx_bps/1000000,' Мбит/с')} / ${fmt(v.tx_bps==null?null:v.tx_bps/1000000,' Мбит/с')}`,`Ошибки RX / TX: ${fmt(v.inErrors)} / ${fmt(v.outErrors)}`);
 if(p.documented&&v.oper===2)rows.push('Внимание: документированная связь, Link DOWN.');else if(!p.documented&&v.oper===1)rows.push('Link UP без видимой прямой связи GLPI — проверьте документацию.');
 }else rows.push(d.status==='online'?'Интерфейс не сопоставлен однозначно.':d.message||'Ожидается опрос.');
 box.replaceChildren(make('h4','Живое состояние · SNMP'),ipRow,...rows.map(s=>make('p',s)));
}
function details(id){if(!data||!ownerId(data.ports[id]))return;let box=make('div',undefined,'nd-live-detail');box.id='nd-live-port';box.dataset.portId=id;$('nd-details').append(box);fillDetails(box,id);}
async function refresh(){
 if(busy||!data)return;busy=true;const info=$('nd-snmp-refresh-info');
 try{const r=await fetch(data.snmpUrl,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'},signal:AbortSignal.timeout?AbortSignal.timeout(12000):undefined});if(!r.ok)throw Error('HTTP '+r.status);const result=await r.json();if(!result.devices||typeof result.devices!=='object')throw Error('JSON');snapshots=result.devices;paint();refreshInfo(info);}
 catch(e){snapshots=Object.fromEntries(Object.entries(snapshots).map(([id,d])=>[id,['online','no_response','stale'].includes(d.status)?{...d,status:'stale',ports:{},message:'Нет связи с сервером данных SNMP'}:d]));paint();if(info)info.textContent='Нет связи с сервером данных SNMP · Повтор через 10 с';}finally{busy=false;}
}
function init(d){
 data=d;if(!data.snmpUrl||!$('nd'))return;
 const toolbar=make('div',undefined,'nd-snmp-toolbar nd-tools');const summary=make('strong','SNMP: ожидание');summary.id='nd-snmp-summary';
 const info=make('small','Ожидается первый опрос · Автообновление: 10 с');info.id='nd-snmp-refresh-info';toolbar.append(summary,info);$('nd-title').after(toolbar);
 const legend=make('p','SNMP: зелёная метка — Link UP; красная — DOWN; жёлтая — административно выключен; без метки — нет актуальных данных. Цвет корпуса порта по-прежнему показывает связь GLPI.','nd-snmp-legend');toolbar.after(legend);
 refresh();setInterval(refresh,REFRESH_MS);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
}
window.NDSnmp={init,paint,details};
})();

'use strict';
(()=>{
const $=id=>document.getElementById(id), make=(tag,txt,cls)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;if(cls)e.className=cls;return e;};
let data=null,go=null,renderView=null,snapshots={},known=new Map(),busy=false,failed=false;
const norm=s=>String(s||'').replace(/[:-]/g,'').replace(/\./g,'').toUpperCase();
const valid=s=>/^[0-9A-F]{12}$/.test(s);
const deviceId=p=>p?.ownerKey?.startsWith('NetworkEquipment:')?p.ownerKey.split(':')[1]:null;
const snap=p=>snapshots[deviceId(p)];
const entries=p=>snap(p)?.status==='online'&&Object.hasOwn(snap(p).ports||{},p.id)?snap(p).ports[p.id]:null;
const transit=p=>p.peers.some(id=>data.ports[id]?.ownerKey?.startsWith('NetworkEquipment:'))||p.vlans.some(v=>v.tagged);
const unique=rows=>new Set(rows.map(r=>r.mac)).size;
const date=t=>t?new Date(t*1000).toLocaleString('ru-RU'):'—';
const external=(txt,url)=>{const a=make('a',txt);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
function matches(p,r,q){if(!q)return true;const k=norm(q);return (/^[0-9A-F]{2,12}$/.test(k)&&norm(r.mac).includes(k))||[r.mac,p.owner,p.name,...(known.get(norm(r.mac))||[]).map(x=>x.owner)].join(' ').toLowerCase().includes(q.toLowerCase());}
function glpiCell(r){const box=make('span');const hits=known.get(norm(r.mac))||[];if(!hits.length){box.textContent='Нет видимого совпадения';return box;}const owners=new Map(hits.map(p=>[p.ownerKey,p]));for(const p of owners.values()){if(box.childNodes.length)box.append(document.createTextNode(' · '));box.append(p.ownerUrl?external(p.owner,p.ownerUrl):document.createTextNode(p.owner));}return box;}
function role(p,rows){if(transit(p))return 'Магистраль / tagged VLAN';if(unique(rows)>1)return 'Несколько MAC';return 'Вероятный конечный порт';}
function details(id){if(!data||!deviceId(data.ports[id]))return;const b=make('div',undefined,'nd-mac-detail');b.id='nd-mac-port';b.dataset.portId=id;$('nd-details').append(b);fillDetails(b);}
function fillDetails(b){const p=data.ports[b.dataset.portId];if(!p)return;const rows=entries(p),s=snap(p);b.replaceChildren(make('h4','MAC-адреса · SNMP FDB'));
 if(!rows){b.append(make('p',failed?'Нет связи с сервером MAC-данных':s?.message||'Нет актуальной MAC-таблицы для этого порта'));return;}
 b.append(make('p',`${unique(rows)} уникальных MAC · ${date(s.time)}`));if(!rows.length){b.append(make('p','В последнем опросе нет записей для этого порта.'));return;}
 b.append(make('p',role(p,rows)));const list=make('div',undefined,'nd-mac-list');for(const r of rows){const line=make('div',undefined,'nd-mac-row');line.append(make('strong',r.mac),make('small',r.fdb==null?'FDB без дополнительного индекса':`FDB / индекс ${r.fdb}`),glpiCell(r));list.append(line);}b.append(list);}
function paint(){if(!data)return;
 for(const b of document.querySelectorAll('#nd .nd-port[data-port-id],#nd .nd-top-port[data-port-id]')){const p=data.ports[b.dataset.portId],rows=p&&entries(p);if(rows){b.dataset.ndMacCount=String(unique(rows));}else delete b.dataset.ndMacCount;}
 const detail=$('nd-mac-port');if(detail)fillDetails(detail);
 if($('nd-mac-table'))renderView?.();}
function search(out){$('nd-title').textContent='MAC-таблица сети';const root=make('div',undefined,'nd-mac-page');root.id='nd-mac-table';const q=$('nd-search').value.trim(),vlan=$('nd-vlan').value;
 const all=Object.values(snapshots),rows=[];for(const p of Object.values(data.ports)){const rs=entries(p);if(!rs)continue;if(vlan&&!p.vlans.some(v=>String(v.tag)===vlan))continue;for(const r of rs)if(matches(p,r,q))rows.push({p,r,role:role(p,rs),rank:transit(p)?2:unique(rs)>1?1:0});}
 rows.sort((a,b)=>a.rank-b.rank||a.p.owner.localeCompare(b.p.owner)||a.p.number-b.p.number||a.r.mac.localeCompare(b.r.mac));
 const summary=make('p',failed?'Не удалось получить данные MAC. Повтор через 15 с.':`MAC: ${all.filter(s=>s.status==='online').length}/${Object.keys(data.devices).length} устройств с актуальными данными · ${rows.length} записей по фильтру`);root.append(summary,make('p','Поиск по MAC, имени устройства GLPI, коммутатору или порту. VLAN-фильтр использует назначения GLPI. FDB-индекс не всегда равен VLAN ID. Конечный порт — предположение, не подтверждение физического подключения.'));
 const table=make('table',undefined,'nd-mac-table');const tr=make('tr');for(const h of ['MAC','Оборудование GLPI','Коммутатор / порт','FDB / индекс','Тип порта','Опрос'])tr.append(make('th',h));const head=make('thead');head.append(tr);table.append(head);const body=make('tbody');
 for(const {p,r,role:label} of rows.slice(0,1000)){const line=make('tr');const cell=x=>{const c=make('td');c.append(typeof x==='string'?document.createTextNode(x):x);line.append(c);};const b=make('button',`${p.owner} / ${p.name}`);b.type='button';b.onclick=()=>go(p);cell(r.mac);cell(glpiCell(r));cell(b);cell(String(r.fdb??'—'));cell(label);cell(date(snap(p).time));body.append(line);}table.append(body);root.append(table);if(rows.length>1000)root.append(make('p','Показаны первые 1000 записей. Уточните поиск.'));if(!rows.length)root.append(make('p','Нет записей по текущему фильтру или ожидается MAC-опрос.'));
 const diag=make('details');diag.append(make('summary','Диагностика MAC-опроса'));for(const [id,s] of Object.entries(snapshots)){diag.append(make('p',`${data.devices[id]?.name||id}: ${s.status} · ${s.message||''} · ${date(s.time)}`));}root.append(diag);out.append(root);}
async function refresh(){if(busy||!data)return;busy=true;try{const r=await fetch(data.macUrl,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'},signal:AbortSignal.timeout?AbortSignal.timeout(12000):undefined});if(!r.ok)throw Error('HTTP');const j=await r.json();if(!j.devices||typeof j.devices!=='object')throw Error('JSON');snapshots=j.devices;failed=false;}catch(e){failed=true;snapshots={};}finally{busy=false;paint();}}
function init(d,open,render){data=d;go=open;renderView=render;if(!data.macUrl)return;for(const p of Object.values(data.ports)){const k=norm(p.mac);if(valid(k)){if(!known.has(k))known.set(k,[]);known.get(k).push(p);}}refresh();setInterval(refresh,15000);}
window.NDMac={init,paint,details,search};
})();

<?php
require '../../../inc/includes.php';
Session::checkLoginUser();
Session::checkRight('networking', READ);
global $DB, $CFG_GLPI;
function nd_owner($type,$id) {
 if (!in_array($type,['NetworkEquipment','Computer','Printer','Peripheral','Phone','Unmanaged'],true)) return null;
 $item = new $type();
 if (!$item->can((int)$id, READ) || !empty($item->fields['is_deleted']) || !empty($item->fields['is_template'])) return null;
 return ['name'=>$item->getName(),'url'=>$item->getLinkURL()];
}
$racks=[]; $devices=[]; $ports=[]; $owners=[]; $vlans=[];
foreach ($DB->request(['FROM'=>'glpi_racks','WHERE'=>['is_deleted'=>0,'is_template'=>0],'ORDER'=>'name']) as $r) {
 $obj=new Rack(); if (!$obj->can((int)$r['id'],READ)) continue;
 $racks[$r['id']]=['id'=>(int)$r['id'],'name'=>$r['name'],'units'=>(int)$r['number_units'],'devices'=>[],'url'=>$obj->getLinkURL()];
}
foreach ($DB->request(['FROM'=>'glpi_networkequipments','WHERE'=>['is_deleted'=>0,'is_template'=>0]]) as $d) {
 $o=nd_owner('NetworkEquipment',$d['id']); if (!$o) continue;
 $devices[$d['id']]=['id'=>(int)$d['id'],'name'=>$d['name'],'url'=>$o['url'],'ports'=>[]];
 $owners['NetworkEquipment:'.$d['id']]=$o;
}
foreach ($DB->request(['FROM'=>'glpi_networkports','WHERE'=>['is_deleted'=>0]]) as $p) {
 $key=$p['itemtype'].':'.$p['items_id'];
 if (!array_key_exists($key,$owners)) $owners[$key]=nd_owner($p['itemtype'],$p['items_id']);
 if (!$owners[$key]) continue;
 $obj=new NetworkPort(); if (!$obj->can((int)$p['id'],READ)) continue;
 $ports[$p['id']]=['id'=>(int)$p['id'],'name'=>$p['name'],'number'=>(int)$p['logical_number'],'type'=>$p['instantiation_type'],'mac'=>$p['mac'],'comment'=>$p['comment'],'speed'=>$p['ifspeed'],'ownerKey'=>$key,'owner'=>$owners[$key]['name'],'url'=>$obj->getLinkURL(),'ownerUrl'=>$owners[$key]['url'],'vlans'=>[],'peers'=>[],'documented'=>false];
 if ($p['itemtype']==='NetworkEquipment' && isset($devices[$p['items_id']])) $devices[$p['items_id']]['ports'][]=(int)$p['id'];
}
foreach ($DB->request(['FROM'=>'glpi_vlans']) as $v) { $obj=new Vlan(); if ($obj->can((int)$v['id'],READ)) $vlans[$v['id']]=['tag'=>$v['tag'],'name'=>$v['name'],'comment'=>$v['comment']]; }
foreach ($DB->request(['FROM'=>'glpi_networkports_vlans']) as $v) if (isset($ports[$v['networkports_id']],$vlans[$v['vlans_id']])) $ports[$v['networkports_id']]['vlans'][]=$vlans[$v['vlans_id']]+['tagged'=>(bool)$v['tagged']];
foreach ($DB->request(['FROM'=>'glpi_networkports_networkports']) as $c) {
 $a=$c['networkports_id_1']; $b=$c['networkports_id_2'];
 if (isset($ports[$a],$ports[$b])) { $ports[$a]['peers'][]=(int)$b; $ports[$b]['peers'][]=(int)$a; $ports[$a]['documented']=true; $ports[$b]['documented']=true; }
}
$placed=[];
foreach ($DB->request(['FROM'=>'glpi_items_racks','WHERE'=>['itemtype'=>'NetworkEquipment'],'ORDER'=>'position DESC']) as $i) {
 if (!isset($racks[$i['racks_id']],$devices[$i['items_id']])) continue;
 $racks[$i['racks_id']]['devices'][]=['id'=>(int)$i['items_id'],'position'=>(int)$i['position'],'orientation'=>(int)$i['orientation']]; $placed[$i['items_id']]=true;
}
$unplaced=[]; foreach ($devices as $id=>$d) if (!isset($placed[$id])) $unplaced[]=['id'=>(int)$id,'position'=>null,'orientation'=>null];
if ($unplaced) $racks[0]=['id'=>0,'name'=>'Вне доступных шкафов','units'=>0,'devices'=>$unplaced,'url'=>''];
$base=$CFG_GLPI['root_doc'].'/plugins/networkdesk';
Html::header('NetworkDesk',$_SERVER['PHP_SELF'],'assets','pluginnetworkdeskmenu');
?>
<link rel="stylesheet" href="<?= htmlspecialchars($base.'/css/networkdesk.css?v=0.9.6',ENT_QUOTES) ?>">
<div id="nd"><aside><h2>NetworkDesk</h2><p>Network infrastructure · GLPI</p><div id="nd-views"></div><hr><div id="nd-racks"></div><a href="">Обновить данные</a></aside><main><h2 id="nd-title"></h2><div class="nd-tools"><input id="nd-search" placeholder="Поиск устройства, порта, MAC"><select id="nd-vlan"><option value="">Все VLAN</option></select><label id="nd-wire-toggle"><input type="checkbox" id="nd-all-wires"> Все соединения</label></div><p>Зелёный — документированная связь; серый — нет видимой связи; синяя рамка — оптика. Живой статус SNMP обозначается отдельной меткой.</p><div id="nd-devices"></div></main><section id="nd-details"><h3>Карточка порта</h3><p>Выберите порт.</p></section></div>
<script type="application/json" id="nd-data"><?= json_encode(['snmpUrl'=>$base.'/ajax/snmp-status.php','macUrl'=>$base.'/ajax/mac-status.php','viewer'=>(int)Session::getLoginUserID(),'racks'=>array_values($racks),'devices'=>(object)$devices,'ports'=>(object)$ports,'vlans'=>array_values($vlans)],JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_INVALID_UTF8_SUBSTITUTE) ?></script>
<script src="<?= htmlspecialchars($base.'/js/topology-tools.js?v=0.9.4',ENT_QUOTES) ?>"></script>
<script src="<?= htmlspecialchars($base.'/js/snmp-live.js?v=0.9.5.6',ENT_QUOTES) ?>"></script>
<script src="<?= htmlspecialchars($base.'/js/mac-live.js?v=0.9.6',ENT_QUOTES) ?>"></script>
<script src="<?= htmlspecialchars($base.'/js/networkdesk.js?v=0.9.6',ENT_QUOTES) ?>"></script>
<?php Html::footer();

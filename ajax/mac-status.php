<?php
require '../../../inc/includes.php';
Session::checkLoginUser();Session::checkRight('networking', READ);
require_once __DIR__.'/../inc/mac-common.php';
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');
$out=[];
foreach($DB->request(['FROM'=>'glpi_networkequipments','WHERE'=>['is_deleted'=>0,'is_template'=>0]]) as $d){
    $id=(int)$d['id'];$obj=new NetworkEquipment();if(!$obj->can($id,READ))continue;
    $c=nd_mac_cache($id);$status=$c['status']??'pending';$message=$c['message']??'Ожидается первый MAC-опрос';$ports=[];
    if($c&&(!in_array($c['ip']??null,nd_snmp_ips($id),true))&&$status==='online'){$status='pending';$message='IP изменился в GLPI';}
    if($c&&time()-(int)$c['time']>300&&$status==='online'){$status='stale';$message='MAC-таблица устарела';}
    if($status==='online')foreach($c['mapped']??[] as $pid){$p=new NetworkPort();if(!$p->can((int)$pid,READ)||$p->fields['itemtype']!=='NetworkEquipment'||(int)$p->fields['items_id']!==$id||!empty($p->fields['is_deleted']))continue;$ports[$pid]=$c['ports'][$pid]??[];}
    $out[$id]=['status'=>$status,'message'=>$message,'time'=>$c['time']??null,'ports'=>(object)$ports];
}
echo json_encode(['devices'=>(object)$out],JSON_INVALID_UTF8_SUBSTITUTE);

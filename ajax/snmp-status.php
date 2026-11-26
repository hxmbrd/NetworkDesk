<?php
require '../../../inc/includes.php';
Session::checkLoginUser();
Session::checkRight('networking', READ);
require_once __DIR__.'/../inc/snmp-common.php';
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');
global $DB;
$out=[];
foreach($DB->request(['FROM'=>'glpi_networkequipments','WHERE'=>['is_deleted'=>0,'is_template'=>0]]) as $d){
    $id=(int)$d['id'];$obj=new NetworkEquipment();if(!$obj->can($id,READ))continue;
    $cache=nd_snmp_read_cache($id);
    // Never expose credentials, raw IF-MIB tables or inaccessible port records.
    $ips=nd_snmp_ips($id);
    $visible=[];if($cache&&($cache['status']??'')==='online'&&in_array($cache['ip']??null,$ips,true)){
        foreach(($cache['ports']??[]) as $pid=>$p){$port=new NetworkPort();if(!$port->can((int)$pid,READ)||$port->fields['itemtype']!=='NetworkEquipment'||(int)$port->fields['items_id']!==$id||!empty($port->fields['is_deleted']))continue;
            $visible[$pid]=array_intersect_key($p,array_flip(['ifIndex','name','descr','match','admin','oper','speed_mbps','inErrors','outErrors','rx_bps','tx_bps']));}
    }
    $status=$cache['status']??'pending';$msg=$cache['message']??'Ожидается первый опрос';$ip=$cache['ip']??null;
    if($ip!==null&&!in_array($ip,$ips,true)){$status='pending';$msg='IP изменился в GLPI, ожидается новый опрос';$ip=null;$visible=[];}
    if($cache&&time()-(int)$cache['time']>240&&in_array($status,['online','no_response'],true)){$status='stale';$msg='Данные устарели: проверьте службу опроса';$visible=[];}
    $out[$id]=['status'=>$status,'message'=>$msg,'time'=>$cache['time']??null,'ip'=>$ip,'ips'=>$ips,'uptime_ticks'=>$status==='online'?($cache['uptime_ticks']??null):null,'ports'=>(object)$visible];
}
echo json_encode(['devices'=>(object)$out],JSON_INVALID_UTF8_SUBSTITUTE);

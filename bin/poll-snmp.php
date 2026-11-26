<?php
// CLI only. The web application NEVER makes synchronous SNMP calls.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__.'/../inc/snmp-common.php';
if (!class_exists('SNMP')) {fwrite(STDERR,"Install php-snmp for CLI PHP.\n");exit(1);}
if (!is_readable(ND_SNMP_CONFIG) || !is_dir(ND_SNMP_CACHE) || !is_writable(ND_SNMP_CACHE)) {fwrite(STDERR,"Configure /etc/networkdesk/snmp.php and /var/lib/networkdesk.\n");exit(1);}
$config=require ND_SNMP_CONFIG;
if(!is_array($config)||empty($config['allowed_networks'])){fwrite(STDERR,"Invalid SNMP configuration.\n");exit(1);}
$lock=fopen(ND_SNMP_CACHE.'/poll.lock','c');if(!$lock||!flock($lock,LOCK_EX|LOCK_NB))exit(0);
require_once __DIR__.'/../../../inc/includes.php';
function nd_write($id,array $d) {
    $file=ND_SNMP_CACHE.'/device-'.(int)$id.'.json';$tmp=tempnam(ND_SNMP_CACHE,'nd-');
    if($tmp===false)throw new RuntimeException('cache');
    $json=json_encode($d,JSON_INVALID_UTF8_SUBSTITUTE|JSON_THROW_ON_ERROR);
    if(file_put_contents($tmp,$json)===false){@unlink($tmp);throw new RuntimeException('cache');}chmod($tmp,0600);
    if(!rename($tmp,$file)){@unlink($tmp);throw new RuntimeException('cache');}
}
function nd_walk($s,$oid) {
    try{$v=@$s->walk($oid,true);return is_array($v)?$v:[];}catch(Throwable $e){return [];}
}
function nd_num($v){return is_numeric($v)?(float)$v:null;}
function nd_poll($ip,array $cfg,array $previous) {
    $ver=(string)($cfg['version']??'2c');$v=['1'=>SNMP::VERSION_1,'2c'=>SNMP::VERSION_2C,'3'=>SNMP::VERSION_3];
    if(!isset($v[$ver]))return ['status'=>'not_configured','message'=>'Неизвестная версия SNMP'];
    $secret=(string)($ver==='3'?($cfg['user']??''):($cfg['community']??''));
    if($secret==='')return ['status'=>'not_configured','message'=>'Не заданы параметры SNMP'];
    $s=null;
    try {
        $s=new SNMP($v[$ver],$ip,$secret,800000,0);$s->valueretrieval=SNMP_VALUE_PLAIN;$s->oid_output_format=SNMP_OID_OUTPUT_NUMERIC;$s->exceptions_enabled=0;
        if($ver==='3'&&!@$s->setSecurity($cfg['level']??'authPriv',$cfg['auth_protocol']??'SHA',$cfg['auth_password']??'',$cfg['priv_protocol']??'AES',$cfg['priv_password']??''))return ['status'=>'not_configured','message'=>'Не приняты настройки SNMPv3'];
        $up=@$s->get('.1.3.6.1.2.1.1.3.0');
        if($up===false)return ['status'=>'no_response','message'=>'Нет ответа SNMP: проверьте UDP/161, ACL и параметры доступа'];
        $uptime=nd_num($up);$now=time();
        $oids=['name'=>'.1.3.6.1.2.1.31.1.1.1.1','descr'=>'.1.3.6.1.2.1.2.2.1.2','admin'=>'.1.3.6.1.2.1.2.2.1.7','oper'=>'.1.3.6.1.2.1.2.2.1.8','speed'=>'.1.3.6.1.2.1.31.1.1.1.15','speed32'=>'.1.3.6.1.2.1.2.2.1.5','inErrors'=>'.1.3.6.1.2.1.2.2.1.14','outErrors'=>'.1.3.6.1.2.1.2.2.1.20','rx'=>'.1.3.6.1.2.1.31.1.1.1.6','tx'=>'.1.3.6.1.2.1.31.1.1.1.10','discontinuity'=>'.1.3.6.1.2.1.31.1.1.1.19'];
        $ifs=[];foreach($oids as $k=>$oid){if($ver==='1'&&in_array($k,['rx','tx'],true))continue;foreach(nd_walk($s,$oid) as $i=>$value){$i=(string)$i;if(!ctype_digit($i)||((int)$i)<1)continue;$ifs[(int)$i][$k]=in_array($k,['name','descr'],true)?(string)$value:nd_num($value);}}
        $elapsed=$now-($previous['sample_time']??0);$same=($previous['ip']??null)===$ip&&($previous['status']??'')==='online'&&$elapsed>=5&&$elapsed<=600&&$uptime!==null&&isset($previous['uptime_ticks'])&&$uptime>=$previous['uptime_ticks'];
        foreach($ifs as $i=>&$f){$f['speed_mbps']=!empty($f['speed'])?$f['speed']:(!empty($f['speed32'])&&$f['speed32']<4294967295?$f['speed32']/1000000:null);$old=$previous['interfaces'][$i]??[];
            foreach(['rx','tx'] as $k){$f[$k.'_bps']=null;if($same&&isset($f[$k],$old[$k],$f['discontinuity'],$old['discontinuity'])&&$f['discontinuity']===$old['discontinuity']&&($f['name']??'')===($old['name']??'')&&($f['descr']??'')===($old['descr']??'')&&$f[$k]>=$old[$k])$f[$k.'_bps']=round(($f[$k]-$old[$k])*8/$elapsed);}
        }unset($f);
        return ['status'=>'online','message'=>empty($ifs)?'SNMP отвечает, IF-MIB не получен':'','uptime_ticks'=>$uptime,'sample_time'=>$now,'interfaces'=>$ifs];
    }catch(Throwable $e){return ['status'=>'no_response','message'=>'Не удалось выполнить SNMP-опрос'];}finally{if($s instanceof SNMP)$s->close();}
}
$only=isset($argv[1])&&ctype_digit($argv[1])?(int)$argv[1]:0;
foreach($DB->request(['FROM'=>'glpi_networkequipments','WHERE'=>['is_deleted'=>0,'is_template'=>0],'ORDER'=>'id']) as $d){
    $id=(int)$d['id'];if($only&&$id!==$only)continue;
    $cfg=array_replace($config['default']??[],$config['devices'][$id]??[]);
    $ips=nd_snmp_ips($id);[$ip,$why]=nd_snmp_pick_ip($ips,$config['allowed_networks'],$cfg['preferred_ip']??null);
    $base=['time'=>time(),'ip'=>$ip,'ips'=>$ips,'device_id'=>$id,'ports'=>[]];
    if(empty($cfg['enabled']))$r=['status'=>'disabled','message'=>'Опрос отключён'];
    elseif(!$ip)$r=['status'=>'not_configured','message'=>$why];
    else {$r=nd_poll($ip,$cfg,nd_snmp_read_cache($id)??[]);if($r['status']==='online'){
        $ports=[];foreach($DB->request(['FROM'=>'glpi_networkports','WHERE'=>['itemtype'=>'NetworkEquipment','items_id'=>$id,'is_deleted'=>0]]) as $p)$ports[$p['id']]=['name'=>$p['name']];
        $base['ports']=nd_snmp_match($ports,$r['interfaces'],$config['port_map'][$id]??[],(string)$d['name']);
        $base['port_count']=count($ports);
    }}
    $base['time']=time();nd_write($id,$base+$r);echo 'GLPI #'.$id.' '.$r['status'].PHP_EOL;
}

<?php
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require_once __DIR__.'/../inc/mac-common.php';
if(!class_exists('SNMP')||!is_readable(ND_SNMP_CONFIG)||!is_writable(ND_SNMP_CACHE)){fwrite(STDERR,"Configure SNMP and cache first.\n");exit(1);}
$config=require ND_SNMP_CONFIG;
if(!is_array($config)||empty($config['allowed_networks']))exit(1);
$lock=fopen(ND_SNMP_CACHE.'/mac-poll.lock','c');if(!$lock||!flock($lock,LOCK_EX|LOCK_NB))exit(0);
require_once __DIR__.'/../../../inc/includes.php';
function nd_mac_write($id,$d){$tmp=tempnam(ND_SNMP_CACHE,'mac-');if($tmp===false)throw new RuntimeException('cache');$json=json_encode($d,JSON_INVALID_UTF8_SUBSTITUTE|JSON_THROW_ON_ERROR);if(strlen($json)>4194304||file_put_contents($tmp,$json)===false){@unlink($tmp);throw new RuntimeException('cache size/write');}chmod($tmp,0600);if(!rename($tmp,ND_SNMP_CACHE.'/mac-'.(int)$id.'.json')){@unlink($tmp);throw new RuntimeException('cache rename');}}
function nd_mac_walk($s,$oid){try{$v=@$s->walk($oid,true);return is_array($v)&&$s->getErrno()===0?$v:null;}catch(Throwable $e){return null;}}
function nd_mac_poll($ip,$cfg,$matched){
    $ver=(string)($cfg['version']??'2c');$versions=['1'=>SNMP::VERSION_1,'2c'=>SNMP::VERSION_2C,'3'=>SNMP::VERSION_3];$secret=(string)($ver==='3'?($cfg['user']??''):($cfg['community']??''));
    if(!isset($versions[$ver])||$secret==='')return ['status'=>'not_configured','message'=>'Не заданы параметры SNMP'];
    $s=null;
    try{$s=new SNMP($versions[$ver],$ip,$secret,800000,0);$s->valueretrieval=SNMP_VALUE_PLAIN;$s->oid_output_format=SNMP_OID_OUTPUT_NUMERIC;$s->exceptions_enabled=0;$s->oid_increasing_check=true;
        if($ver==='3'&&!@$s->setSecurity($cfg['level']??'authPriv',$cfg['auth_protocol']??'SHA',$cfg['auth_password']??'',$cfg['priv_protocol']??'AES',$cfg['priv_password']??''))return ['status'=>'not_configured','message'=>'Не приняты настройки SNMPv3'];
        $bridge=nd_mac_walk($s,'.1.3.6.1.2.1.17.1.4.1.2');if(!$bridge)return ['status'=>'unavailable','message'=>'Не получено соответствие bridge port → ifIndex'];
        // Prefer observed working BRIDGE-MIB. Q-BRIDGE is optional, never disable OID order checks.
        $legacy=nd_mac_walk($s,'.1.3.6.1.2.1.17.4.3.1.2');$rows=nd_mac_parse($legacy??[],'bridge');
        $extended=false;foreach($rows as $r)if($r['fdb']!==null){$extended=true;break;}
        $source=$extended?'bridge (extra index)':'bridge';
        if(!$extended){$q=nd_mac_walk($s,'.1.3.6.1.2.1.17.7.1.2.2.1.2');$qr=nd_mac_parse($q??[],'qbridge');$qa=nd_mac_attach($qr,$bridge,$matched);
            // Use Q-BRIDGE only where mapping is available for every reported entry; otherwise retain working legacy data.
            if($qr&&$qa['unmapped']===0){$rows=$qr;$source='qbridge';}elseif($legacy===null&&!$qr)return ['status'=>'unavailable','message'=>'MAC-таблица не получена'];
            elseif($legacy===null&&$qr){$rows=$qr;$source='qbridge';}
        }
        $a=nd_mac_attach($rows,$bridge,$matched);
        return ['status'=>'online','source'=>$source,'total'=>count($rows),'mapped'=>array_map('intval',array_keys(array_filter($matched,static fn($p)=>in_array((int)$p['ifIndex'],array_map('intval',$bridge),true)))),'message'=>$a['unmapped']?'Часть MAC не сопоставлена с физическими портами':'']+$a;
    }catch(Throwable $e){return ['status'=>'unavailable','message'=>'Ошибка чтения MAC-таблицы'];}finally{if($s instanceof SNMP)$s->close();}
}
$only=isset($argv[1])&&ctype_digit($argv[1])?(int)$argv[1]:0;
foreach($DB->request(['FROM'=>'glpi_networkequipments','WHERE'=>['is_deleted'=>0,'is_template'=>0],'ORDER'=>'id']) as $d){
    $id=(int)$d['id'];if($only&&$id!==$only)continue;
    $cfg=array_replace($config['default']??[],$config['devices'][$id]??[]);$ips=nd_snmp_ips($id);[$ip,$why]=nd_snmp_pick_ip($ips,$config['allowed_networks'],$cfg['preferred_ip']??null);
    $live=nd_snmp_read_cache($id);$matched=[];$r=[];
    if(empty($cfg['enabled']))$r=['status'=>'disabled','message'=>'Опрос отключён'];
    elseif(!$ip)$r=['status'=>'not_configured','message'=>$why];
    elseif(!$live||$live['status']!=='online'||$live['ip']!==$ip||time()-(int)$live['time']>240)$r=['status'=>'pending','message'=>'Ожидаются актуальные данные IF-MIB'];
    else{$ports=[];foreach($DB->request(['FROM'=>'glpi_networkports','WHERE'=>['itemtype'=>'NetworkEquipment','items_id'=>$id,'is_deleted'=>0]]) as $p)$ports[$p['id']]=['name'=>$p['name']];
        $matched=nd_snmp_match($ports,$live['interfaces']??[],$config['port_map'][$id]??[],(string)$d['name']);
        $r=$matched?nd_mac_poll($ip,$cfg,$matched):['status'=>'pending','message'=>'Нет сопоставленных интерфейсов IF-MIB'];}
    $r+=['ports'=>[],'total'=>0,'unmapped'=>0];$r['ip']=$ip;$r['time']=time();$r['device_id']=$id;
    // Store the set of mapped GLPI ports, including those with no learned MACs.
    $r['mapped']=$r['mapped']??[];nd_mac_write($id,$r);echo 'GLPI #'.$id.' '.$r['status'].' MAC '.$r['total'].' unmapped '.$r['unmapped'].PHP_EOL;
}

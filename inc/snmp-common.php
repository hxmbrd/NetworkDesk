<?php
// No SNMP credentials or cache files are stored under the web root.
const ND_SNMP_CONFIG = '/etc/networkdesk/snmp.php';
const ND_SNMP_CACHE = '/var/lib/networkdesk';
function nd_snmp_ips($deviceId) {
    global $DB;
    $ips = [];
    // The GLPI equipment form's «Сеть» dropdown is authoritative.
    $networkId=0;
    foreach ($DB->request(['FROM'=>'glpi_networkequipments','WHERE'=>['id'=>(int)$deviceId,'is_deleted'=>0,'is_template'=>0]]) as $d) $networkId=(int)$d['networks_id'];
    if ($networkId<=0) return [];
    foreach ($DB->request(['FROM'=>'glpi_networks','WHERE'=>['id'=>$networkId]]) as $network) {
        $ip=trim((string)$network['name']);
        // Strict IPv4 only; never guess an IP from a label or fall back to ports.
        if (filter_var($ip,FILTER_VALIDATE_IP,FILTER_FLAG_IPV4)) $ips[$ip]=$ip;
    }
    return array_values($ips);
}
function nd_snmp_in_cidr($ip,$cidr) {
    $parts=explode('/',(string)$cidr,2);
    if(count($parts)!==2 || !ctype_digit($parts[1]) || (int)$parts[1]>32 || !filter_var($parts[0],FILTER_VALIDATE_IP,FILTER_FLAG_IPV4) || !filter_var($ip,FILTER_VALIDATE_IP,FILTER_FLAG_IPV4)) return false;
    $bits=(int)$parts[1]; $mask=$bits===0?0:((0xffffffff << (32-$bits)) & 0xffffffff);
    return (ip2long($ip)&$mask)===(ip2long($parts[0])&$mask);
}
function nd_snmp_pick_ip(array $ips,array $networks,$preferred=null) {
    if (!$ips) return [null,'В поле «Сеть» GLPI отсутствует корректный IPv4-адрес'];
    $allowed=array_values(array_filter($ips,static function($ip)use($networks){foreach($networks as $net) if(nd_snmp_in_cidr($ip,$net))return true; return false;}));
    if($preferred!==null) return in_array($preferred,$allowed,true)?[$preferred,'']: [null,'Выбранный IP отсутствует в GLPI или вне разрешённых сетей'];
    return count($allowed)===1?[$allowed[0],'']:[null,count($allowed)>1?'Несколько адресов управления: укажите preferred_ip':'IP из поля «Сеть» вне разрешённых сетей'];
}
function nd_snmp_read_cache($id) {
    $path=ND_SNMP_CACHE.'/device-'.(int)$id.'.json';
    if(!is_file($path))return null;
    $raw=@file_get_contents($path,false,null,0,2097152); $d=$raw===false?null:json_decode($raw,true);
    return is_array($d)&&isset($d['time'],$d['status'])?$d:null;
}
function nd_snmp_norm($name,$model='') {
    $s=trim((string)$name); $s=preg_replace('/\s*\(копия\)\s*$/ui','',$s);$s=strtolower(trim($s));
    if(preg_match('/^(?:sfp\+?|sfp-sfpplus|sfpplus)[\s_-]*0*([1-9][0-9]*)$/i',$s,$m)) return 'sfp:'.(int)$m[1];
    if(preg_match('/^(?:qsfp\+?)[\s_-]*0*([1-9][0-9]*)$/i',$s,$m))return 'qsfp:'.(int)$m[1];
    if(preg_match('/^(?:poe[- ]?|ether(?:net)?[- ]?|port[- ]?)?0*([1-9][0-9]*)$/i',$s,$m))return 'port:'.(int)$m[1];
    // TP-Link stack interface names and common Ethernet IF-MIB descriptions.
    if(preg_match('/^(?:gigabit[- ]?ethernet|ten[- ]?gigabit[- ]?ethernet|fast[- ]?ethernet|ethernet|gi|te|ge)\s*(?:1\/0\/|0\/)?0*([1-9][0-9]*)$/i',$s,$m))return 'port:'.(int)$m[1];
    return 'name:'.$s;
}
function nd_snmp_match(array $ports,array $ifs,array $manual=[],string $model='') {
    $candidates=[];$used=[];$out=[];
    // Manual verified mapping takes priority; no logical_number = ifIndex assumption.
    foreach($ports as $id=>$p){
        if(array_key_exists($id,$manual)){
            $i=(int)$manual[$id]; if(isset($ifs[$i]))$candidates[$id]=[$i,'manual']; continue;
        }
        $name=trim((string)$p['name']); if($name==='')continue;
        $key=nd_snmp_norm($name,$model);$hits=[];
        // On models with globally numbered SFP ports the same front-panel number may appear as Ethernet in IF-MIB.
        $globalSfp=preg_match('/^(?:sfp|sfp\+):([0-9]+)$/',$key,$m)&&preg_match('/TL-SG3452X|TL-SG3428X|Aruba.*1930|V1910/i',$model)&&(int)$m[1]>24;
        foreach($ifs as $i=>$f){
            foreach([$f['name']??'',$f['descr']??''] as $n){
                if(trim($n)==='')continue;$nk=nd_snmp_norm($n,$model);
                if($nk===$key || ($globalSfp && $nk==='port:'.$m[1]))$hits[$i]=true;
            }
        }
        if(count($hits)===1)$candidates[$id]=[(int)array_key_first($hits),'name'];
    }
    foreach($candidates as [$i,$method])$used[$i]=($used[$i]??0)+1;
    foreach($candidates as $id=>[$i,$method])if($used[$i]===1)$out[$id]=$ifs[$i]+['ifIndex'=>$i,'match'=>$method];
    return $out;
}

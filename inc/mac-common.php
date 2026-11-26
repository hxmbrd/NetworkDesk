<?php
require_once __DIR__.'/snmp-common.php';
// Standard bridge index (6 octets), or TP-Link's observed extra index (7).
function nd_mac_parse(array $rows, string $source): array {
    $out=[];
    foreach($rows as $suffix=>$value){
        $parts=explode('.',ltrim((string)$suffix,'.')); $n=count($parts);
        if(($source==='qbridge'&&$n!==7)||($source==='bridge'&&!in_array($n,[6,7],true)))continue;
        foreach($parts as $p)if(!ctype_digit($p)||strlen($p)>10)continue 2;
        $idx=$n===7?(int)array_shift($parts):null;
        foreach($parts as $p)if((int)$p>255)continue 2;
        if(((int)$parts[0]&1)||array_sum($parts)===0)continue; // unicast only
        if(!is_numeric($value)||(int)$value<=0)continue;
        $mac=implode(':',array_map(static fn($x)=>sprintf('%02X',(int)$x),$parts));
        $key=$mac.'|'.($idx??'-').'|'.(int)$value;
        $out[$key]=['mac'=>$mac,'fdb'=>$idx,'bridge_port'=>(int)$value,'source'=>$source];
    }
    return array_values($out);
}
function nd_mac_attach(array $rows,array $bridge,array $matched): array {
    $byIf=[];foreach($matched as $id=>$p)if(isset($p['ifIndex']))$byIf[(int)$p['ifIndex']][]=(int)$id;
    $ports=[];$unmapped=0;$seen=[];
    foreach($rows as $r){$i=(int)($bridge[$r['bridge_port']]??0);$ids=$byIf[$i]??[];
        if(count($ids)!==1){$unmapped++;continue;}
        $pid=$ids[0];$key=$pid.'|'.$r['mac'].'|'.($r['fdb']??'-');if(isset($seen[$key]))continue;$seen[$key]=true;
        $ports[$pid][]=$r+['ifIndex'=>$i];
    }
    return ['ports'=>$ports,'unmapped'=>$unmapped];
}
function nd_mac_cache($id){$f=ND_SNMP_CACHE.'/mac-'.(int)$id.'.json';$raw=@file_get_contents($f,false,null,0,4194304);$d=$raw===false?null:json_decode($raw,true);return is_array($d)&&isset($d['time'],$d['status'])?$d:null;}

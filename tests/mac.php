<?php
if(PHP_SAPI!=='cli')exit;
require __DIR__.'/../inc/mac-common.php';
function checkmac($x,$m){if(!$x)throw new RuntimeException($m);echo "OK: $m\n";}
$rows=nd_mac_parse(['1.2.0.0.0.0.1'=>49204,'15.2.0.0.0.0.2'=>49157,'2.0.0.0.0.2'=>49157,'1.0.0.0.0.0.0'=>5,'1.256.0.0.0.0.0'=>5,'1.1.0.0.0.0.0'=>1],'bridge');
checkmac(count($rows)===3,'Extended and standard index; invalid/multicast rejected');
checkmac($rows[0]['mac']==='02:00:00:00:00:01'&&$rows[0]['fdb']===1,'Decimal index decoded');
$r=nd_mac_attach($rows,[49204=>49204,49157=>49157],[101=>['ifIndex'=>49204],102=>['ifIndex'=>49157]]);
checkmac(count($r['ports'][101])===1&&count($r['ports'][102])===2,'Bridge mapping and multiple FDBs');
checkmac(nd_mac_attach($rows,[49204=>49204],[])['unmapped']===3,'No guessed port');
checkmac(nd_mac_parse(['1.2.0.0.0.0.3'=>37],'qbridge')[0]['mac']==='02:00:00:00:00:03','Q-BRIDGE index');
if(isset($argv[1])){
 $rows=[];foreach(file($argv[1],FILE_IGNORE_NEW_LINES) as $line)if(preg_match('/^\.1\.3\.6\.1\.2\.1\.17\.4\.3\.1\.2\.([0-9.]+) = INTEGER: (\d+)/',$line,$m))$rows[$m[1]]=(int)$m[2];
 $parsed=nd_mac_parse($rows,'bridge');$bridge=[];$ports=[];$ifs=[];for($i=1;$i<=52;$i++){ $bridge[49152+$i]=49152+$i;$ports[$i]=['name'=>$i>48?'SFP+'.$i:sprintf('%02d',$i)];$ifs[49152+$i]=['name'=>($i>48?'ten-':'').'gigabitEthernet 1/0/'.$i];}
 $matched=nd_snmp_match($ports,$ifs,[],'TP-LINK TL-SG3452X');$r=nd_mac_attach($parsed,$bridge,$matched);
 checkmac(count($matched)===52,'52 synthetic TP-Link interface naming patterns');
 checkmac(count($parsed)===count($rows)&&$r['unmapped']===0,'All supplied FDB entries mapped');
 echo 'Rows '.count($parsed).'; unique '.count(array_unique(array_column($parsed,'mac'))).'; port 52 '.count($r['ports'][52]).'; ports with records '.count($r['ports']).PHP_EOL;
}

<?php
if(PHP_SAPI!=='cli')exit;
require __DIR__.'/../inc/snmp-common.php';
function check($v,$msg){if(!$v)throw new RuntimeException($msg);echo "OK: $msg\n";}
check(nd_snmp_pick_ip(['198.51.100.10','192.0.2.6'],['192.0.2.0/24'])[0]==='192.0.2.6','Prefer management subnet');
check(nd_snmp_pick_ip(['192.0.2.6','192.0.2.7'],['192.0.2.0/24'])[0]===null,'Ambiguous management IP rejected');
check(nd_snmp_pick_ip(['192.0.2.6'],['192.0.2.0/24'],'192.0.2.7')[0]===null,'IP not in GLPI rejected');
check(nd_snmp_pick_ip(['192.0.2.6','192.0.2.7'],['192.0.2.0/24'],'192.0.2.7')[0]==='192.0.2.7','Verified IP selection');
$ports=[101=>['name'=>'01 (копия)'],102=>['name'=>'SFP+49']];
$ifs=[123=>['name'=>'GigabitEthernet1/0/1'],777=>['name'=>'Ten-GigabitEthernet1/0/49']];
$r=nd_snmp_match($ports,$ifs,[],'TP-LINK TL-SG3452X');check($r[101]['ifIndex']===123&&$r[102]['ifIndex']===777,'TP-Link and copy suffix: match without guessing ifIndex');
$r=nd_snmp_match([1=>['name'=>'01'],2=>['name'=>'SFP+01']],[99=>['name'=>'ether1'],100=>['name'=>'sfp-sfpplus1']],[],'MikroTik CRS354');check($r[1]['ifIndex']===99&&$r[2]['ifIndex']===100,'Copper and SFP with duplicate physical numbers');
check(!nd_snmp_match([1=>['name'=>'01']],[99=>['name'=>'ether1'],100=>['name'=>'ethernet1']]),'Ambiguous interfaces rejected');
check(!nd_snmp_match([1=>['name'=>'01'],2=>['name'=>'01 (копия)']],[99=>['name'=>'ether1']]),'Duplicate GLPI port mapping rejected');
$r=nd_snmp_match([1=>['name'=>'anything']],[9=>['name'=>'if unknown']],[1=>9]);check($r[1]['match']==='manual','Explicit mapping');
// Synthetic fixture for the networks_id and glpi_networks schema.
class NdTestDB {
    public $calls=[];
    public $names=[2=>'192.0.2.6',3=>' 198.51.100.20 ',4=>'Example LAN'];
    public function request($q) {
        $this->calls[]=$q['FROM'];
        if($q['FROM']==='glpi_networkequipments')return [['networks_id'=>$q['WHERE']['id']===0?0:$q['WHERE']['id']+1]];
        if($q['FROM']==='glpi_networks')return isset($this->names[$q['WHERE']['id']])?[['name'=>$this->names[$q['WHERE']['id']]]]:[];
        throw new RuntimeException('Unexpected query');
    }
}
$DB=new NdTestDB();
check(nd_snmp_ips(1)===['192.0.2.6'],'IP from equipment Network dropdown');
check(nd_snmp_ips(2)===['198.51.100.20'],'Whitespace trimmed');
check(nd_snmp_ips(3)===[],'Non-IP network name rejected');
check(nd_snmp_ips(0)===[],'No network assignment rejected');
check(nd_snmp_ips(8)===[],'Missing dropdown record rejected');
check(count(array_diff($DB->calls,['glpi_networkequipments','glpi_networks']))===0,'No port IP fallback');
check(nd_snmp_pick_ip(['198.51.100.20'],['192.0.2.0/24'])[0]===null,'Network field does not bypass IP allowlist');

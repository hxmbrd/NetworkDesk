<?php
class PluginNetworkdeskMenu extends CommonGLPI {
 static function getMenuName() { return 'NetworkDesk'; }
 static function getMenuContent() {
  if (!Session::haveRight('networking', READ)) return false;
  return ['title'=>'NetworkDesk','page'=>'/plugins/networkdesk/front/index.php','icon'=>'ti ti-network'];
 }
}

<?php
function plugin_init_networkdesk() {
 global $PLUGIN_HOOKS;
 $PLUGIN_HOOKS['csrf_compliant']['networkdesk'] = true;
 $PLUGIN_HOOKS['menu_toadd']['networkdesk'] = ['assets' => 'PluginNetworkdeskMenu'];
}
function plugin_version_networkdesk() {
 return ['name'=>'NetworkDesk','version'=>'0.9.6','author'=>'hxmbrd','license'=>'GPLv3','requirements'=>['glpi'=>['min'=>'10.0.0','max'=>'10.0.99']]];
}
function plugin_networkdesk_check_prerequisites() { return version_compare(GLPI_VERSION,'10.0.0','>=') && version_compare(GLPI_VERSION,'11.0.0','<'); }
function plugin_networkdesk_check_config($verbose=false) { return true; }

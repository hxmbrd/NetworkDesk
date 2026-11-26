<?php
// Copy to /etc/networkdesk/snmp.php (root:www-data, mode 0640). Never put the live file in the web root.
return [
    'allowed_networks'=>[], // Required: your approved management CIDRs. Example only: ['192.0.2.0/24'].
    'default'=>[
        'enabled'=>false, // Enable explicitly after configuring the allowlist and read-only credentials.
        'version'=>'2c',
        'community'=>'', // Required for v1/v2c. Use an existing READ-ONLY community.
    ],
    'devices'=>[
        // GLPI device ID => overrides. IP is read only from GLPI NetworkEquipment → networks_id → glpi_networks.name.
        // 1 => ['version'=>'1','community'=>'READ_ONLY_VALUE'],
        // preferred_ip is optional; if present it must equal the IP in the «Сеть» field.
        // 4 => ['version'=>'3','user'=>'nd-monitor','level'=>'authPriv','auth_protocol'=>'SHA','auth_password'=>'','priv_protocol'=>'AES','priv_password'=>''],
        // 100 => ['enabled'=>false], // Example: exclude a passive device using its actual GLPI ID.
    ],
    // Optional verified mapping: device ID => [GLPI port ID => SNMP ifIndex].
    'port_map'=>[],
];

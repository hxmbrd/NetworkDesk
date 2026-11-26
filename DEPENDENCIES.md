# Dependencies and license review

Review date: 2026-11-26. Inventory covers the supplied archive and this preparation.

| Component | Use | License/source | Bundled |
| --- | --- | --- | --- |
| GLPI 10.x | Host application, database and access-control APIs | [GLPI repository](https://github.com/glpi-project/glpi); [10.0.1 release notes](https://www.glpi-project.org/br/get-the-new-glpi-version/) state GPLv3+ | No |
| PHP | Web and CLI runtime | Verify the installed version's terms; PHP 8.3 uses [PHP License 3.01](https://www.php.net/license/3_01.txt) | No |
| PHP SNMP / Net-SNMP | Read-only management polling | [PHP SNMP requirements](https://www.php.net/manual/en/snmp.requirements.php); Net-SNMP has [multiple BSD-like notices](https://www.net-snmp.org/about/license.html) | No |
| Browser APIs | SVG, DOM, Fetch, local storage | Supplied by the browser | No |
| systemd | Optional Linux scheduling | External OS component; inspect the installed distribution's notices | No |
| Node.js | Development-only JavaScript checks | External development tool | No |

No Composer/npm manifests, vendored libraries, bundled fonts, remote CDN imports or third-party asset packages were found. JavaScript and CSS are supplied as project source. This inventory cannot independently prove the provenance of every source line.

Screenshots use the included frontend with synthetic data; no third-party photo/icon package was added. The plugin menu requests an icon from the GLPI host.

Runtime dependencies are installed separately. Their licenses do not establish NetworkDesk's redistribution rights. If future packages bundle runtimes, libraries, fonts or assets, review exact versions and carry required notices. See [LICENSE-STATUS.md](LICENSE-STATUS.md).

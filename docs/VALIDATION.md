# Publication preparation validation

Code and browser checks: 2026-11-26. Branding/licensing update: 2026-11-27. Package: NetworkDesk 0.9.6, sanitized publication package.

## Provenance and changes

Input: the exact user-supplied `NetworkDesk-0.9.6.zip`.

Input SHA-256: `8b1aff0254acbdbe7bc4695b871ec83cf7dcc355dde00f493aa6d11dd99eeaa9`.

The original archive is kept outside the distributable. Of its 23 files, six were changed: `setup.php`, `front/index.php`, `config/snmp.example.php`, `tests/mapping.php`, `tests/mac.php` and `README.md`. Remaining original files, including polling and mapping implementations, AJAX endpoints, JavaScript, CSS and systemd units, are byte-identical. New files provide documentation, ignore rules, synthetic FDB input and screenshots.

The UI change is a branding string. Metadata credits hxmbrd and preserves version 0.9.6. On 2026-11-27 the owner selected the precise license identifier GPL-3.0-only; the corresponding metadata and SPDX/copyright comments were added. Test replacements retain original cases with fictional values. The example configuration removes a deployment-specific subnet/device exclusion and requires explicit enablement and allowlist. No live configuration is part of the package.

## Executed checks

| Check | Result |
| --- | --- |
| Original baseline tests | 16 mapping + 5 MAC assertions passed |
| PHP syntax, all 13 PHP files | Passed with PHP 8.3.37 CLI, `-n -l` |
| JavaScript syntax, all 4 JS files | Passed with Node.js 26.13.0, `--check` |
| Sanitized mapping tests | 16 assertions passed |
| Sanitized MAC tests with synthetic FDB input | 7 assertions passed; 52 entries, 52 unique MACs, zero unmapped |
| Source comparison | Core behavior files unchanged; only the six original files listed above differ |
| Data/secret review | Branding, original address/MAC values, private IPv4 patterns, internal domain patterns and common secret signatures checked; discovered deployment values replaced |
| Dependency inventory | No bundled third-party packages or package-manager manifests found |
| Browser smoke test | Rack panels, live port details, both topology modes, fit-to-view, MAC table, exact MAC search and navigation back to the port worked with synthetic data |
| Browser error log during smoke test | No error entries returned |
| Screenshot review | Two screenshots visually inspected; all inventory and polling responses are synthetic |

PHP was downloaded from the official Windows PHP distribution and its SHA-256 matched the publisher's release manifest. Development runtimes are excluded from the package.

The browser preview uses the shipped frontend, extracted page markup and a minimal host style, without GLPI itself. It simulates JSON responses with two fictional switches and 24 ports. Screenshots are illustrative; they are not evidence of successful SNMP polling or a production GLPI installation. A visible synthetic-demo banner identifies them.

Test IPv4 values use documentation ranges. MAC examples use locally administered unicast addresses. Standard SNMP OIDs, model compatibility strings and interface patterns remain intentionally unchanged. File scanning and manual review do not guarantee the absence of every possible secret or unknown identifier.

## Not verified here

- Installation and permissions against an actual GLPI database, including restricted profiles and multi-entity access.
- Network access to real devices, SNMPv3 interoperability, live counters or FDB behavior.
- systemd execution, Linux ownership/permissions, deployment paths and actual timing under load.
- Drag persistence across reloads, every UI control, accessibility and large-inventory performance.
- Full penetration testing, independent source provenance or legal clearance for publication.

The review environment is Windows. Supplied systemd units were inspected but not executed. The original GPLv3 declaration was clarified to GPL-3.0-only at the owner’s explicit direction on 2026-11-27. The owner confirmed publication rights; see the [licensing record](LICENSING.md). Branding and documentation updates do not change runtime behavior.

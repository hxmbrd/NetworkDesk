# Changelog

## 0.9.6 — publication package (2026-11-27)

- Added NetworkDesk logo assets and a branded README header.
- Added a separate Russian preparation and validation report.
- Recorded the owner’s publication authorization, specified GPL-3.0-only and included the official license text.
- Repackaged the sanitized source without changing runtime behavior.

## Publication preparation (2026-11-26)

- Prepared from the supplied NetworkDesk 0.9.6 ZIP; plugin version remains 0.9.6.
- Replaced organization branding with neutral UI text and credited hxmbrd in metadata and documentation.
- Replaced deployment addresses and learned MACs in tests with documentation IPv4 ranges and synthetic MACs; retained test intent.
- Removed the deployment-specific device exclusion. New example configurations require explicit allowlist, credentials and enablement. Existing external configurations are not changed.
- Added installation, systemd, limitations, security and contribution documentation, dependency/license review, synthetic screenshots and validation report.
- Added ignore and archive rules. No change to polling, mapping, API authorization, topology or database behavior.
- At preparation time, public release was pending licensing/provenance review. The owner resolved the licensing decision on 2026-11-27; live deployment validation is still required.

## 0.9.6 — MAC discovery

- Separate read-only FDB polling, cache and 60-second systemd timer.
- MAC counts, port details, inventory matches and searchable MAC table with 15-second browser refresh.
- Bridge-port to ifIndex to GLPI-port mapping, standard/extended index handling and conservative Q-BRIDGE fallback.

## 0.9.5.6 — live SNMP refresh

- Automatic cached status refresh every 10 seconds and a 30-second systemd polling schedule.

## 0.9.5.1–0.9.5.5 — monitoring refinements

- Management IPv4 from GLPI's Network dropdown, equipment web links, status animations and native equipment-card links.

## 0.9.5 — SNMP monitoring

- External credentials, allowlisted targets, independent CLI polling, cache and locking.
- Live/admin states, speeds, errors, uptime and traffic rates where supported.

## 0.9.4 — interactive topology

- Dragging, local layout persistence, grouping, connection colors and fullscreen.

## 0.9.3.1 and earlier

- Rack and switch panels, documented connections, VLAN filters and overview/port-level topology.

Earlier entries summarize the supplied archive's documentation; earlier release artifacts were not independently inspected. No historical release dates are inferred.

# Contributing

NetworkDesk uses GPL-3.0-only. Contributions must be compatible with that license and must be work you have the right to submit. See [LICENSE](LICENSE) and the [licensing record](LICENSE-STATUS.md).

Keep changes focused and preserve read-only behavior. Do not infer physical connections from learned MACs or guess ambiguous port mappings. Preserve GLPI access checks and keep polling out of web requests.

Use documentation IPv4 ranges (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`), locally administered unicast MACs such as `02:00:00:00:00:01`, and fictional labels such as `Example Switch A`. Model strings and standard interface names may be needed for compatibility tests; real hostnames and exported records are not.

Run PHP lint, JavaScript syntax checks and both test scripts as shown in the README. Include `tests/fixtures/fdb-synthetic.txt` when running `tests/mac.php` to exercise full mapping. For UI changes, test both topology modes, racks, filters, port details and refresh. For access-control changes, also test restricted profiles in a real test GLPI instance.

Describe the problem, resulting behavior, verification and limitations in each change. Update the changelog. Never add live configuration, generated cache, backups, SQL dumps, credentials or production screenshots. Review every staged file; `.gitignore` does not sanitize tracked content.

# Security

## Reporting

Do not post credentials, real inventory, caches, packet captures or live SNMP exports in issues or pull requests. Report vulnerabilities through a private channel agreed with maintainer **hxmbrd**. No public security mailbox or enabled GitHub private-reporting endpoint is claimed. If you have no private contact channel, open an issue asking for one without disclosing vulnerability details.

Provide an affected version, impact and minimal synthetic reproduction. If a credential is exposed, rotate it and remove it from artifacts and repository history; a later deletion alone does not revoke it.

## Deployment boundaries

- Keep `/etc/networkdesk/snmp.php` outside the web root, owned by root and readable only by the service group (`0640`). It is executable PHP configuration and must not be writable by untrusted users.
- Keep `/var/lib/networkdesk` outside the web root. Cache contents are sensitive inventory; restrict the directory to `0750`. Pollers create cache files with `0600` permissions.
- Use read-only credentials, SNMPv3 `authPriv` where supported and explicit management CIDRs. SNMPv1/v2c do not encrypt the community or traffic.
- Restrict UDP/161 to the poller. Treat changes to GLPI Network dropdown addresses and the allowlist as security-relevant changes.
- Polling runs independently of the web user's entity scope and may cache every configured device. Web responses apply GLPI device/port access checks; verify with restricted users in your installation.
- The UI exposes observed MACs on accessible switch ports. This can reveal downstream devices even when their GLPI owner is not visible. Inventory links only use visible matches.
- Keep GLPI, PHP, Net-SNMP and browsers patched. Validate exact version compatibility before upgrade.
- Protect browser profiles on shared workstations. Local storage contains preferences and object identifiers; clear site data when decommissioning.
- Equipment links use HTTP in this version; manually use HTTPS where supported.

No penetration test, complete dependency audit or live multi-entity authorization test is implied. See [validation](docs/VALIDATION.md).

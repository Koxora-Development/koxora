# Security and privacy architecture

**Status: requirements and proposed verification, not an audit or compliance certificate.**

## Trust boundaries

1. Project archives: ZIP bombs, traversal, schemas/encoding, external assets, broken versions.
2. Visual content: SVG/HTML/Markdown, URLs, export actions, XSS, CSP.
3. Community content: templates, plugins, metadata, reviews, uploads, moderation, copyright.
4. Optional cloud: authentication, object-level authorization, CSRF, limits, guest scopes, tenant isolation, backup/restore.
5. External data/AI: SSRF, credentials, exfiltration, prompts, third parties.
6. Supply chain: transitive dependencies, licenses, CI tokens, releases, signing, SBOM.

## Minimum controls

- Bound archive file count, size, expansion ratio, paths, symlinks, and permitted types before extraction; validate content after reading.
- Never execute unvalidated imported HTML. Constrain interactive exports with CSP/isolation and no tracking/network dependency.
- Use CI secrets, OS keychains, or server secret stores; no SMTP/provider tokens in Git or native archives.
- Private local projects by default; cloud/sharing opt-in; minimal logs/telemetry; understandable export/deletion paths.
- Enforce team/marketplace permissions, abuse controls, and quotas server-side.
- Encrypt transport and protect backups/restore. Determine encryption-at-rest details through threat modeling.
- Follow [security reporting](../../SECURITY.md). Mark the planned security mailbox operational only after testing it.

## Governance and evidence

Each security-relevant story records attack scenarios, tests, dependency versions/licenses, review findings, and residual risk. Before beta, threat-model project files, HTML, plugins, AI, guest links, and data bindings; apply OWASP/CWE checks where relevant. Legal/privacy compliance needs appropriate review and cannot be inferred from planning documents.

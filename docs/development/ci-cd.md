# CI/CD and release automation plan

**Status: proposed; no workflow or deployment is configured by this documentation.**

## Planned PR pipeline

1. Markdown/link/structure checks, JSON/CSV syntax, requirement IDs, and cross-references. The current local validator is `python3 scripts/validate_docs.py`.
2. After foundation: manifest/lockfile integrity, lint, TypeScript, unit/integration, localization missing-key/resource checks.
3. Editor: browser E2E/offline, file round trips/migrations, import/export fixtures, security negative cases.
4. Desktop: OS build matrix, native tests, reproducible artifacts, smoke tests, dependency scans.
5. Dependency/license/SCA checks, SBOM, explicit treatment of critical vulnerabilities.
6. PR builds are test artifacts; publication requires a separate release gate.

## Isolation

Untrusted fork PRs receive no production secrets or publishing tokens. Cloud deployment and signing/notarization identities belong in protected environments with approvals. Documentation changes must not trigger DNS/mailserver/production changes.

## Costs

Budget Actions runners, macOS/Windows signing, packaging, and artifact storage. Optimize caches and artifact reuse using measured runtimes rather than forcing every costly job onto every PR. Required checks need real owners and must not make approval impossible for a single human maintainer.

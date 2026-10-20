# Phase 0 acceptance and documentation baseline

**Date: 2026-10-20. Status: documentation prepared for review; merge approval pending.**

## Source and repository baseline

Main at `08c9a67302f8f349a8650c3b8a883c7c5bc721a7` contains only README and `.gitignore`. The existing feature branch `docs/phase-0-foundation` at `201f9fdc9409fa0b5d2cd7c2c9165cb1ede003fa` contains the initial reduced documentation and templates. Remote Git refs associate that commit with pull request #1; API metadata access is a separate operation.

The supplied `Koxora_Phase0_Masterplanung_komplett.zip` is the authoritative planning source. Both uploaded copies have the same SHA-256 recorded in [traceability](traceability.md) and the [source manifest](planning/source-manifest.json). All 45 archive paths are integrated, preserving the full 178 original requirement IDs and acceptance intent in English. Earlier R-, M-, and D-IDs remain mapped rather than silently removed.

The initial foundation reported incomplete historical chat access. The supplied archive resolves the missing planning baseline for this task; no complete transcript of previous conversations is claimed. Its prior Nexora working name is superseded by Koxora. User instructions supersede German documentation preferences and clarify English default/fallback, German inception support, independent selection, localization keys, and extensibility.

## Deliverables

- Vision, PRD, 178-entry Markdown/CSV catalog, diagram families, UX concepts, and explicit internationalization contract.
- Architecture overview and detailed local-first, editor, format, data/export, collaboration, AI/plugin, and security specifications.
- Website, desktop, cloud, marketplace, self-hosting/enterprise, email, and licensing proposals.
- Roadmap, M0–M8, 27 engineering items, agent workflows, testing/CI/release plans, governance, issue/PR templates.
- Confirmed K-decisions, candidate T-decisions, open O-decisions, legacy ID maps, provenance hashes, and a reusable documentation validator.

## Not implemented

No application features, framework scaffold, dependency manifests, package installation, product CI, accounts, DNS/mail changes, deployments, organization settings, labels/milestones/issues, license choice, or production readiness. Technical feasibility is not proved by documentation. The validation helper is documentation tooling, not an application feature or product test suite.

## Validation

From the repository root:

```sh
python3 scripts/validate_docs.py
```

To compare with the original uploaded archive (kept outside Git):

```sh
python3 scripts/validate_docs.py --source-archive /absolute/path/to/Koxora_Phase0_Masterplanung_komplett.zip
```

The first command validates the complete original ID ranges/counts and metadata, Markdown/CSV agreement, known requirement/decision/backlog references, 27 engineering items, nine milestones, legacy mappings, source-path coverage, local paths/heading fragments, table/fence structure, fenced JSON, and issue/PR template structure. The second additionally verifies archive/content hashes, all 45 original paths, catalog identity/order/metadata, and engineering/milestone identities against the authoritative source. Automated checks cannot certify translation semantics or application behavior.

Use `git diff --check` and inspect the diff against main and the existing foundation to confirm documentation-only scope, preserved `.gitignore`, no deletions, and no unrelated changes. The validator must fail on missing/duplicate requirements, catalog drift, malformed examples, or broken local references. External URL reachability is not part of local-link validation.

## Integration verification results

The source-archive validator passed for all 178 requirements, 38 decision IDs, 27 engineering items, nine milestones, 21 legacy mappings, 44 Markdown documents, 94 local links/anchors, the manifest JSON example, all 45 source paths/content hashes, and template structure. Markdown/CSV agreement and original catalog/backlog metadata passed.

Eleven controlled damage cases in temporary copies were correctly rejected: missing requirement, duplicate requirement, catalog wording mismatch, changed historical wave, broken path, broken heading fragment, missing source document, unknown requirement reference, malformed JSON, missing legacy mapping, and unclosed fence. A pristine copy passed before and after these checks. The temporary mutation harness is not a product test suite.

An independent agent reviewed the source documents and all 178 translated catalog rows. The review found file-relative links that would break when issue templates are copied into issue bodies; both were replaced with stable GitHub repository URLs. The reviewer verified the correction and reported no remaining actionable findings. This is source/document consistency review, not formal maintainer approval, legal review, or application testing. `git diff --check` passed after normalizing the CSV to LF line endings. No GitHub CI checks are configured for this branch.

## Product Owner checklist

- [ ] Vision and all 178 requirements match the intended long-term product.
- [ ] Long-term scope is distinct from first-release scope and historical waves.
- [ ] Local-first, guest/offline, browser/desktop, English default/fallback, and German from inception are correctly confirmed.
- [ ] Technology and library choices require actual spikes and license/security checks.
- [ ] Registered-domain/source claims are distinguished from live deployment and verified mail routes.
- [ ] License, copyright, trademark, privacy, pricing, and operating decisions remain open.
- [ ] Legacy IDs, agent roles, review, validation, and release gates are traceable.
- [ ] Independent review findings are addressed, and the PR is explicitly approved before merge.

A Phase 0 merge accepts this documentation baseline only. Phase 1 needs a separate assignment with concrete scope and acceptance cases. No merge is authorized by the integration task itself.

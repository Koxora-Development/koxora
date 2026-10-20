# Optional AI, templates, and plugin SDK

**Status: confirmed optional product goals; mechanisms are not implemented.**

## AI

Prompt-to-diagram, text-requested changes, layout improvements, labels, semantic suggestions, and diagram explanations are long-term targets. Users control providers: bring your own keys, local models such as Ollama, and potentially a voluntary cloud service later. No account or AI dependency in the editor core.

Never transmit document content to an external provider without consent and visibility into provider and scope. Validate output as structured proposals with preview, confirmation, and undo; do not execute arbitrary generated JavaScript or scripts. Keep secrets in an OS keychain or appropriate secure store, never project files, logs, or Git. Support interchangeable providers and safe failure handling.

## Templates and shapes

Local/community templates, extensible shapes/icons, themes/styles, categorized search, and previews need portability, source/license notices, version/compatibility metadata, and safe asset validation. Import must not silently fetch unsafe external resources.

## Plugin SDK

Later extensions can add diagram types, importers/exporters, tools, themes, and connectors. Require declared capabilities, explicit consent, isolation, signatures/integrity checks, versioned manifests/APIs, and updates. Marketplace availability does not authorize unsandboxed JavaScript, Rust, or shell execution. Browser and desktop have different host capabilities; restrict desktop command scopes. Plugin interface text must use the shared localization system.

## Security gates

Threat-model document prompt injection, exfiltration, iframe/HTML execution, provider errors, unsafe URL fetching, secret leakage, and marketplace supply-chain attacks. Require tests and Product Owner authorization before public activation.

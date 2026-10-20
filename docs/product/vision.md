# Koxora: product vision and binding principles

**Status: confirmed product direction; implementation and schedule require separate validation.**

## Purpose

An open universal studio makes ideas, processes, systems, and data accessible as editable, shareable, exportable visualizations. A project can contain multiple diagram types, pages, datasets, and assets. Quality includes ownership, portability, accessibility, and reproducibility as well as visual output.

## Product constraints

1. **Local-first:** Local editing and the project model are independent of account, cloud, API, and network failures. Browser offline use follows initial app/PWA provisioning; desktop core operations do not require a network.
2. **No login barrier:** Create, edit, store locally, import, and export without an account. Optional accounts must not gate local core features.
3. **Browser and desktop:** A common core supports Linux, Windows, macOS, and web. Document platform-specific exceptions.
4. **Portable native format:** Editable projects use a documented, versioned schema and migrations. `.koxora` is the proposed extension; final specification is open.
5. **Broad visualization:** Graphs, mind maps, charts, whiteboards, time-based models, and domain-specific diagrams belong to the long-term vision.
6. **Exports without lock-in:** Native projects, PNG/JPEG/SVG/PDF, interactive standalone HTML, and GIF/video are long-term targets. Disclose format losses.
7. **Internationalization from inception:** English is the default and fallback; German is supported from the beginning and selectable independently of operating system language. All interface text uses localization keys. Add languages through resources without application-logic changes. Keep interface language separate from document content and prepare Unicode/RTL support.
8. **Optional AI:** User-provided keys and local models are options, never prerequisites. Never silently transmit document data.
9. **Optional cloud and collaboration:** Shared editing, roles, guest links, versions, and synchronization extend an independently useful offline editor.
10. **Open-source direction:** Exact core license, community/enterprise boundaries, and commercial terms remain open.
11. **Extensibility with safety:** Templates, shapes, themes, uploads, and potential plugins need permission and security boundaries before untrusted code runs.
12. **Agent-assisted development:** The Product Owner decides priorities and manually accepts outcomes; agents and CI handle implementation and technical validation.

## Platform components

- **Koxora Studio:** Browser/desktop editor, projects, diagrams, datasets, exports.
- **Website and docs:** Product information, downloads, help, releases, SEO, security.
- **Cloud:** Optional identity, storage, synchronization, teams, live sessions.
- **Community and marketplace:** Templates, themes, shapes, plugins, reviews, moderation.
- **Self-hosting and enterprise:** Optional server deployment, administration, SSO, auditing, and support subject to license decisions.

## Incremental delivery

Phases 1–2 focus on a reliable core and native file round trip. Additional visualizations, data, exports, and optional services follow. The [catalog](feature-catalog.md) remains the full long-term scope; the [decision register](../decisions.md) distinguishes binding product goals from provisional implementation choices. Deferral does not delete requirements.

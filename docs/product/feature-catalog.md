# Master requirement catalog

> **Status:** Planning baseline v0.1, 2026-10-20. Koxora is the confirmed name; technical designs remain proposals. All 178 goals belong to the long-term scope. Technology and release assignments are not delivery commitments.

## Interpretation

- **MUST** means confirmed long-term target scope, not delivery in the first release.
- **P0–P3** are historical implementation waves, not current GitHub priority labels, roadmap phases, or release promises.
- IDs, ordering, categories, priority, and wave assignments are preserved from the authoritative archive. Titles and acceptance criteria are translated into English. CORE-015 and CORE-016 incorporate the explicit language rules; see [internationalization](internationalization.md).
- Technical feasibility and acceptance testing remain outstanding until implementation.

## Product foundations and cross-cutting concerns (20)

| ID | Requirement | Wave | Acceptance criterion |
| --- | --- | --- | --- |
| CORE-001 | Shared browser and desktop editor | P0 | The same project file can be opened and edited on the web, Linux, Windows, and macOS. |
| CORE-002 | Usable without registration | P0 | The editor, imports, and exports work for guests. |
| CORE-003 | Offline-first | P0 | Core features work without a network after installation or PWA caching. |
| CORE-004 | Local storage | P0 | Desktop uses files and the browser uses persistent local storage. |
| CORE-005 | Portable native project archive | P0 | A project can be exported, copied, and imported. |
| CORE-006 | Document model with schema versions | P0 | Files contain an explicit format version and migration path. |
| CORE-007 | Preservation of unknown extension data | P0 | Unknown extension fields are preserved during compatible editing. |
| CORE-008 | Undo and redo | P0 | All relevant editing operations can be undone and redone. |
| CORE-009 | Automatic recovery | P0 | A crash does not cause complete loss of unsaved work. |
| CORE-010 | Project and page management | P0 | A project can contain multiple diagrams or pages. |
| CORE-011 | Project search | P0 | Elements and text can be found. |
| CORE-012 | Keyboard operation and shortcuts | P0 | Essential actions can be performed without a mouse. |
| CORE-013 | Themes and dark mode | P0 | Light, dark, and custom styles work. |
| CORE-014 | Accessibility | P0 | The core interface supports keyboards, screen readers, and sufficient contrast. |
| CORE-015 | Internationalization from project inception | P0 | All interface text uses localization keys; English (en) is the default and fallback, German (de) is supported from the beginning, and additional languages require no application-logic changes. |
| CORE-016 | Language selection independent of the document | P0 | Changing the interface language does not change document content; users can select German independently of their operating system language. |
| CORE-017 | RTL and Unicode | P0 | Text and layout direction can be displayed correctly for each language. |
| CORE-018 | Privacy-friendly defaults | P0 | Telemetry and cloud services are not prerequisites. |
| CORE-019 | Versioned public interfaces | P0 | Breaking changes require a version change and migration. |
| CORE-020 | Cross-platform fonts and assets | P0 | Missing fonts are visibly substituted or embedded. |

## Editor (16)

| ID | Requirement | Wave | Acceptance criterion |
| --- | --- | --- | --- |
| EDIT-001 | Infinite canvas with pan and zoom | P1 | Navigation remains responsive with large diagrams. |
| EDIT-002 | Grid and snapping | P1 | Elements can be aligned precisely. |
| EDIT-003 | Nodes, edges, and groups | P1 | Elements can be connected and grouped. |
| EDIT-004 | Multiple selection and alignment | P1 | Multiple elements can be changed together. |
| EDIT-005 | Connection anchors and routing | P1 | Edges adapt when elements move. |
| EDIT-006 | Automatic layout | P1 | Structured diagrams can be rearranged automatically. |
| EDIT-007 | Free manual editing | P1 | Automatic layout does not overwrite user positions without consent. |
| EDIT-008 | Style and formatting presets | P1 | Styles can be reused consistently. |
| EDIT-009 | Presentation mode | P1 | Pages or steps can be presented. |
| EDIT-010 | Animations and transitions | P1 | Diagram states can be animated over time. |
| EDIT-011 | Interactive elements | P1 | Click actions, tooltips, filters, and links can be modeled. |
| EDIT-012 | Local template management | P1 | Templates can be saved and applied. |
| EDIT-013 | Switching diagram views | P1 | Compatible data can be displayed in different views. |
| EDIT-014 | Conversion with loss warnings | P1 | Conversions that are not lossless display their limitations. |
| EDIT-015 | Shape and icon libraries | P1 | New shapes can be imported or added. |
| EDIT-016 | Configurable widgets and information boxes | P1 | Additional information can be bound to elements. |

## Diagram families (27)

| ID | Requirement | Wave | Acceptance criterion |
| --- | --- | --- | --- |
| DIAG-001 | Mind maps and brainstorming | P1 | Tree-like mind maps with topics and subtopics are supported. |
| DIAG-002 | Concept maps and knowledge graphs | P1 | Arbitrary semantic relationships are supported. |
| DIAG-003 | Decision trees and argument maps | P1 | Branches and labels are supported. |
| DIAG-004 | Fishbone and affinity diagrams | P1 | Specialized layouts or templates are available. |
| DIAG-005 | Flowcharts and swimlanes | P1 | Process flows with distinct lanes can be represented. |
| DIAG-006 | BPMN | P1 | Validated basic BPMN elements and relationships are available. |
| DIAG-007 | Organization charts | P1 | Hierarchical structures can be laid out automatically. |
| DIAG-008 | Gantt charts, roadmaps, and timelines | P1 | Time-bound tasks and milestones are visible. |
| DIAG-009 | Kanban, SIPOC, and value streams | P1 | Domain-specific templates or models are available. |
| DIAG-010 | UML class and object diagrams | P1 | Classes, attributes, methods, and relationships can be modeled. |
| DIAG-011 | UML sequence, activity, and state diagrams | P1 | Temporal and state flows can be represented. |
| DIAG-012 | UML use case and deployment diagrams | P1 | Actors, use cases, and infrastructure can be modeled. |
| DIAG-013 | Entity-relationship diagrams | P1 | Entities, attributes, and cardinalities can be represented. |
| DIAG-014 | C4 and software architecture | P1 | Context, container, component, and code views are supported. |
| DIAG-015 | Network and infrastructure diagrams | P1 | Devices, networks, and relationships can be modeled. |
| DIAG-016 | API and data flow diagrams | P1 | Interfaces and data movement can be represented. |
| DIAG-017 | Bar, line, area, and pie charts | P1 | Tabular data is visualized correctly. |
| DIAG-018 | Scatter, bubble, radar, and histogram charts | P1 | Suitable numerical datasets are supported. |
| DIAG-019 | Box plots, heatmaps, and treemaps | P1 | Aggregations and scales are displayed correctly. |
| DIAG-020 | Sankey, funnel, waterfall, and combination charts | P1 | Multidimensional representations are available. |
| DIAG-021 | Mathematical function plots | P1 | Functions and axes can be defined. |
| DIAG-022 | Electrical schematics and logic gates | P1 | Symbols and connections are available. |
| DIAG-023 | Block, control loop, and signal flow diagrams | P1 | Technical relationships can be represented. |
| DIAG-024 | Wireframes and UI flows | P1 | Interface components and connections are available. |
| DIAG-025 | User journeys, storyboards, and infographics | P1 | Customizable visual templates are available. |
| DIAG-026 | Freeform whiteboard | P1 | Freehand drawing, shapes, notes, and media are supported. |
| DIAG-027 | Extensible diagram registry | P1 | New diagram types do not require restructuring the core schema. |

## Data (16)

| ID | Requirement | Wave | Acceptance criterion |
| --- | --- | --- | --- |
| DATA-001 | CSV and TSV import | P2 | Encoding, delimiters, and columns are detected. |
| DATA-002 | XLSX and XLS import | P2 | Worksheets and values are accessible. |
| DATA-003 | ODS import | P2 | LibreOffice spreadsheets can be read. |
| DATA-004 | JSON import | P2 | Nested datasets can be mapped. |
| DATA-005 | Tables from the clipboard | P2 | Pasting tabular data works. |
| DATA-006 | Integrated table editor | P2 | Data can be changed without an external application. |
| DATA-007 | Data type and format detection | P2 | Numbers, dates, currencies, and categories are detected. |
| DATA-008 | Automatic chart suggestions | P2 | The data schema produces suitable suggestions. |
| DATA-009 | Live data binding | P2 | Changes update the visualization. |
| DATA-010 | Filtering, sorting, and aggregation | P2 | Transformations are reproducible. |
| DATA-011 | Formulas and calculated fields | P2 | Calculations are evaluated transparently. |
| DATA-012 | Local SQLite connection | P2 | Users can use a local database as a source. |
| DATA-013 | REST API connection | P2 | External data sources are usable with explicit consent. |
| DATA-014 | Google Sheets and Excel Online | P2 | Optional integrations with OAuth are available. |
| DATA-015 | Data source permissions and secrets | P2 | Tokens are not exported in project archives. |
| DATA-016 | Source snapshots | P2 | A project can be opened without its live data source. |

## Import and export (18)

| ID | Requirement | Wave | Acceptance criterion |
| --- | --- | --- | --- |
| IO-001 | Project archive import and export | P2 | A fully editable round trip is possible. |
| IO-002 | PNG and JPEG | P2 | Resolution and background are configurable. |
| IO-003 | SVG | P2 | Vectors and text are exported correctly. |
| IO-004 | PDF | P2 | Vector export, pages, print profiles, and links work where supported. |
| IO-005 | Standalone HTML | P2 | An offline file contains embedded assets and interactions. |
| IO-006 | Embedded HTML | P2 | An embeddable diagram variant is available. |
| IO-007 | GIF | P2 | Animated frames are exported. |
| IO-008 | MP4 and WebM | P2 | Time-based animations can be exported as video. |
| IO-009 | JSON interchange | P2 | Structural data can be exported in a documented format. |
| IO-010 | Mermaid import and export | P2 | Supported syntax is converted with warnings. |
| IO-011 | Markdown outline import | P2 | Hierarchical content can generate mind maps. |
| IO-012 | Batch export | P2 | Multiple diagrams or pages can be exported in one operation. |
| IO-013 | Export profiles | P2 | Presets for web, print, and presentations are available. |
| IO-014 | Exports without cloud services | P2 | Standard exports run locally. |
| IO-015 | Import security boundaries | P2 | Size limits, parser isolation, and protection against ZIP bombs are enforced. |
| IO-016 | Export fidelity checks | P2 | Differences and missing features are reported. |
| IO-017 | Asset embedding | P2 | Standalone files work without external dependencies. |
| IO-018 | Reimport limitations | P2 | Raster formats are not advertised as losslessly editable. |

## Optional AI (11)

| ID | Requirement | Wave | Acceptance criterion |
| --- | --- | --- | --- |
| AI-001 | Optional AI | P2 | All core features remain usable without AI. |
| AI-002 | User-provided API keys | P2 | Provider credentials can be configured locally. |
| AI-003 | Multiple AI providers | P2 | Adapters support interchangeable providers. |
| AI-004 | Local Ollama | P2 | A local model can be used without an external API. |
| AI-005 | Text to diagram | P2 | A description generates a validated document model. |
| AI-006 | Data to diagram | P2 | AI suggests a chart type from a table. |
| AI-007 | Diagram optimization | P2 | AI can suggest layout or structural changes. |
| AI-008 | Diagram explanation | P2 | Content can be explained in natural language. |
| AI-009 | AI preview and consent | P2 | Changes are shown before application. |
| AI-010 | Protection against unsafe code | P2 | AI output is schema-validated; arbitrary JavaScript is not executed. |
| AI-011 | API key security | P2 | Secrets are not stored unencrypted in projects. |

## Optional collaboration (14)

| ID | Requirement | Wave | Acceptance criterion |
| --- | --- | --- | --- |
| COLLAB-001 | Simultaneous editing | P3 | Two users see consistent changes. |
| COLLAB-002 | Live cursors and presence | P3 | Participants and cursors are displayed. |
| COLLAB-003 | Live selection | P3 | Objects selected by other participants are identifiable. |
| COLLAB-004 | Comments and mentions | P3 | Discussions can be attached to elements. |
| COLLAB-005 | Roles and permissions | P3 | Owner, Editor, Commenter, and Viewer roles are enforced. |
| COLLAB-006 | Invitation links | P3 | Links are revocable and unguessable. |
| COLLAB-007 | Guest collaboration | P3 | Temporary participation without an account is possible. |
| COLLAB-008 | Offline changes and merging | P3 | Offline edits can be synchronized. |
| COLLAB-009 | Conflict semantics | P3 | Deletion, renaming, and assets have defined rules. |
| COLLAB-010 | Version history | P3 | Historical states can be restored. |
| COLLAB-011 | Follow-presenter mode | P3 | Participants can follow the presenter. |
| COLLAB-012 | WebSocket cloud synchronization | P3 | A persistent team session works without an active host. |
| COLLAB-013 | WebRTC peer-to-peer | P3 | An optional direct mode with signaling and TURN fallback is available. |
| COLLAB-014 | Session security | P3 | Access control is enforced and end-to-end encryption is a testable option. |

## Optional platform (22)

| ID | Requirement | Wave | Acceptance criterion |
| --- | --- | --- | --- |
| PLAT-001 | Optional registration and login | P3 | The guest editor remains usable without an account. |
| PLAT-002 | Passkeys and MFA | P3 | Accounts can be secured further. |
| PLAT-003 | Private cloud projects | P3 | Only authorized users have access. |
| PLAT-004 | Cross-device synchronization | P3 | Local and cloud copies are reconciled. |
| PLAT-005 | Cloud export and account sign-out | P3 | Data remains usable locally. |
| PLAT-006 | Account data export and deletion | P3 | Privacy rights are supported technically. |
| PLAT-007 | Public template browsing | P3 | Browsing and downloading work without an account. |
| PLAT-008 | Template publishing | P3 | Authenticated authors can submit content. |
| PLAT-009 | Template versions and licenses | P3 | Publications carry a license and version. |
| PLAT-010 | Marketplace search and categories | P3 | Templates, shapes, themes, and plugins can be found. |
| PLAT-011 | Ratings, favorites, and reports | P3 | The community can rate and report content. |
| PLAT-012 | Moderation and abuse prevention | P3 | Approval, blocking, and auditing are available. |
| PLAT-013 | Plugin SDK and manifest | P3 | Plugins have versioned APIs. |
| PLAT-014 | Plugin sandbox and permissions | P3 | Untrusted code is isolated and restricted. |
| PLAT-015 | Optional paid templates | P3 | The marketplace can support payments and commissions later. |
| PLAT-016 | Community profiles and public projects | P3 | Users can showcase content. |
| PLAT-017 | Self-hosting through Docker | P3 | Operators can deploy community servers themselves. |
| PLAT-018 | Enterprise SSO and LDAP | P3 | OIDC, SAML, and LDAP integrations are optional. |
| PLAT-019 | Enterprise auditing and policies | P3 | Administrators manage organizations and logs. |
| PLAT-020 | Support and maintenance contracts | P3 | Commercial service offerings can be administered. |
| PLAT-021 | Managed cloud subscriptions | P3 | Optional paid storage services are available. |
| PLAT-022 | License and entitlement management | P3 | Enterprise access does not disable access to existing data. |

## Website (22)

| ID | Requirement | Wave | Acceptance criterion |
| --- | --- | --- | --- |
| SITE-001 | Multilingual landing page | P1 | Product information, calls to action, screenshots, and a demo are available. |
| SITE-002 | Feature catalog | P1 | Features and diagram types can be filtered. |
| SITE-003 | Download center | P1 | Operating system, architecture, package format, and version can be selected. |
| SITE-004 | Signatures and checksums | P1 | Artifacts can be verified. |
| SITE-005 | Stable, Beta, and Nightly channels | P1 | Versions are documented separately. |
| SITE-006 | Automatic update metadata | P1 | Desktop receives signed update information. |
| SITE-007 | Changelogs and release pages | P1 | Version, date, fixes, and migrations are displayed. |
| SITE-008 | Public roadmap and voting | P1 | Status and suggestions are visible. |
| SITE-009 | Documentation and tutorials | P1 | User and developer documentation is available. |
| SITE-010 | Blog and news | P1 | Publications can be managed editorially. |
| SITE-011 | Marketplace web frontend | P1 | A public gallery works without login. |
| SITE-012 | Community profiles | P1 | Public profiles and content can be accessed. |
| SITE-013 | Cloud dashboard | P1 | Signed-in users manage projects. |
| SITE-014 | Self-hosting and enterprise pages | P1 | Docker guides and offerings are available. |
| SITE-015 | Support, FAQ, and bug reports | P1 | Help channels are available. |
| SITE-016 | Administrative CMS | P1 | Releases, text, moderation, and translations can be maintained. |
| SITE-017 | Legal and privacy information | P1 | Legal notice, privacy policy, terms of use, and licenses are available. |
| SITE-018 | SEO and hreflang | P1 | Language variants can be indexed. |
| SITE-019 | Mobile and accessible website | P1 | The website is responsive and follows WCAG principles. |
| SITE-020 | Status page and security disclosure | P1 | Incidents and the vulnerability reporting channel are documented. |
| SITE-021 | Interactive demo gallery | P1 | Visitors can test HTML diagrams without registration. |
| SITE-022 | Automatic operating system detection | P1 | A suitable download is suggested and alternatives remain visible. |

## Operations and quality (12)

| ID | Requirement | Wave | Acceptance criterion |
| --- | --- | --- | --- |
| OPS-001 | Automated CI and tests | P0 | Lint, type checking, unit, integration, and end-to-end tests run in CI. |
| OPS-002 | Release signing | P0 | Desktop artifacts and update feeds are signed. |
| OPS-003 | Supply chain checks | P0 | Dependencies and licenses are checked regularly. |
| OPS-004 | Observability for optional services | P0 | Logs and metrics avoid unintended document content. |
| OPS-005 | Cloud backup and restore | P0 | Recovery is tested. |
| OPS-006 | Rate limits and access protection | P0 | APIs and uploads are protected. |
| OPS-007 | ADRs and documentation | P0 | Architecture decisions are versioned. |
| OPS-008 | Security threat modeling | P0 | File formats, HTML export, plugins, and sharing are assessed. |
| OPS-009 | Privacy and data minimization | P0 | Data flows are documented and telemetry is not mandatory. |
| OPS-010 | Performance budgets | P0 | Large documents are tested with measured results. |
| OPS-011 | Reproducible builds | P0 | Artifacts are traceable and versioned. |
| OPS-012 | Trademark and license checks | P0 | The name and library licenses are checked before publication. |

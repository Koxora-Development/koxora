# Future network and IT diagrams

**Status: requested future planning, not implemented by Issue #57.** The Product Owner requests network devices and useful diagram tools for IT work alongside the broader shape and diagram expansion. This plan proposes a sequence; it assigns no release date and does not authorize implementation, publication or live network integration.

The primary [catalog](../product/feature-catalog.md) references are DIAG-015 (networks and infrastructure), EDIT-015 (shape libraries), EDIT-005 (anchors/routing), EDIT-012 (templates) and DIAG-027 (extensible diagram registry). Later software diagrams map to DIAG-010/011/012/013/014/016. Existing catalog IDs and historical waves remain unchanged.

## First useful device library

Start with vendor-neutral symbols that remain recognizable at small sizes and in monochrome. Search and categories use English/German names and common aliases such as AP/access point, PC/workstation and switch/network switch. An element's device type and its optional role remain distinct: a laptop, PC or virtual machine can be labeled as a client without requiring a duplicate symbol for every role.

| Category | Initial candidates | Later additions |
| --- | --- | --- |
| Network | Router, switch, wireless access point, firewall, modem/gateway, Internet/cloud | Wireless controller, load balancer, VPN gateway, patch panel |
| Endpoints | Laptop, desktop PC/workstation, generic client, phone/tablet, printer | IP phone, camera, IoT device, thin client |
| Compute and storage | Server, rack server, virtual machine, database, NAS/storage | Rack/container, hypervisor, application/service, cluster |
| Structure | Network/subnet boundary, site/room, security zone, text legend | Rack elevation, availability zone, nested deployment boundaries |

Each symbol supports a readable editable label, normal selection, sizing, rotation, mirroring, styling, connections and undo/redo. Labels retain readable glyphs when mirrored. A diagram may mix devices with ordinary shapes and text; choosing a network category does not replace existing content. Vendor-specific artwork is a later optional library with verified licensing and attribution, not a prerequisite for core use.

## Proposed delivery sequence

| Step | Scope | Acceptance before advancing |
| --- | --- | --- |
| 1. Device symbols | Searchable local palette with the initial network, endpoint and compute families; consistent previews and descriptions. | Build a router → switch → PC/laptop/server diagram offline. Connect, rotate, mirror, rename and duplicate devices; save, reopen and transfer the native project between browser and desktop without losing appearance or identity. |
| 2. Network connections | Named device ports, endpoint labels, cable/link labels, optional direction and line styles for wired, wireless and logical links. Improve routing only through the editor's shared connection model. | A labeled connection stays attached to its intended port after move, resize, rotation and reflection. Endpoint labels remain editable and legible. Port changes never silently reconnect or discard links; undo restores the complete change. |
| 3. Optional technical details | Structured fields for hostname, device role, IPv4/IPv6 address and subnet, VLAN, interface name, link speed, protocol and notes; per-diagram control over displayed fields. | Blank fields are valid and do not block drawing. Validation distinguishes malformed values from incomplete drafts; duplicates may be intentional in separate sites. Details survive round trips and remain separate from translated UI labels. Users can omit sensitive detail from future shared/exported views without altering their source diagram. |
| 4. Organization and starters | Logical and physical network diagrams, subnet/security-zone grouping, legends and local templates in the dedicated overview. Candidate starters: home/small office, segmented office with guest Wi-Fi, server environment and a simple hybrid deployment. | Create a fresh project from a starter without overwriting a template. Use fictional example data. Boundaries, labels and line styles convey meaning without color alone. Logical/physical layouts remain independent unless an explicit shared-model feature is later accepted. |
| 5. Broader IT modeling | UML class/sequence/activity/state/use-case/deployment, ER entities and cardinalities, C4 context/container/component views, API/data flows and generic cloud/container deployment shapes. | Assign each family its own notation, editing and validation acceptance. A symbol library alone is not presented as full UML, ER or C4 support. Reuse the shared model and history where practical; document any required schema or compatibility change before implementation. |

Useful follow-ups include search/filter by device type or tag, cross-page links from a high-level network to detailed diagrams, an optional structured device/connection list, and deliberate automatic layout with preview and undo. Reuse existing project navigation where possible. CSV inventory import/export, infrastructure-as-code import and automatic layout engines each need a separate format/validation scope; none is implied by adding symbols.

## Model and safety boundaries

Use the existing element registry, immutable commands and documented native project format as the starting point. Assess stable device/port identities and optional metadata before choosing a schema. Preserve compatible unknown data. If older readers cannot represent a required feature faithfully, use the established compatibility mechanism instead of silently flattening or dropping semantics. Define template-copy behavior for internal IDs, port links and page references before shipping.

Bundled symbols and templates work without an account, cloud service or runtime icon download. Validate imported assets and metadata with size limits and no executable content or remote-resource loading. Device fields are documentation, not credentials: examples contain no secrets, and the editor must not request passwords, private keys or access tokens for drawing. Network addresses and hostnames remain local unless the user deliberately includes them in an export or a separately authorized sharing feature.

Live discovery, network scanning, device login, monitoring, configuration deployment and packet simulation are outside this plan. A line marked connected or a device marked active represents user-authored diagram information, not a claim about the actual network.

## Accessibility and verification

Palette items, devices, ports and technical fields need meaningful accessible names, keyboard insertion and editing, visible focus and textual equivalents for icon-only controls. Do not rely on color to distinguish device types, connection states or network zones. Test long hostnames, non-ASCII labels, dense port lists and overlapping links in EN/DE, light/dark themes, enhanced accessibility mode and 100–200% interface scale. Small windows must keep the palette, properties and confirmation controls reachable.

Each implementation stage needs browser and native acceptance, offline restart, save/reopen and export/import checks, atomic undo/redo, attachment geometry after transforms, protected/unsupported element cases and malformed input coverage. Include realistic synthetic diagrams and measure large-diagram responsiveness rather than promising an untested device count. Accessibility remains a design and verification obligation; this planning document makes no certification claim.

See [Studio design presets and customization](studio-design-customization.md) for the separate template overview and the boundary between UI appearance and diagram content.

# Import, data connections, and export

**Status: confirmed long-term scope; parser and format details require spikes.**

## Imports

| Format/source | Purpose | Risks and checks |
| --- | --- | --- |
| CSV/TSV/clipboard | Tables and inferred types | Encoding, data types, special characters, formula injection |
| XLS/XLSX/ODS | Worksheets/ranges as datasets | Size, formulas, styles, parser license |
| JSON/REST/SQL | Data bindings and snapshots | No credentials in projects, authorization, SQL restrictions |
| draw.io/diagrams.net | Existing flows | Mapping and fidelity |
| Mermaid/PlantUML | Text diagram descriptions | Parser isolation, unsupported features |
| Markdown outline | Hierarchical content to mind maps | Encoding, structure, safe text handling |
| Native project | Editable round trip | ZIP, hashes, schema, and versions |

## Data pipeline

Source → validation/typing → dataset → transforms/filter/aggregation → chart/diagram generator → binding/refresh → local snapshot.

Suggest suitable diagrams after import while allowing manual selection and field mapping. Live CSV/REST/SQL refresh is optional. Display snapshot age/source status using localization keys. External connections require explicit authorization; store keys in a suitable secret store, never a shared project. Local SQLite and optional OAuth-based Google Sheets/Excel Online connections remain in catalog scope.

## Exports

| Format | Capability | Constraints |
| --- | --- | --- |
| Native project | Editable portable project | Schema and migrations |
| SVG/PNG/JPEG | Vector or raster visualization | Fonts, transparency, resolution |
| PDF | Print/document, multiple pages | Embedded assets, links, accessibility where feasible |
| Standalone HTML | Offline zoom, actions, links, tooltips, filters, animations | CSP, isolation, no arbitrary injected scripts |
| Embedded HTML | Embeddable diagram | Host isolation and capability limits |
| GIF/MP4/WebM | Time-based animation | Codecs, platform support, performance |
| Mermaid/JSON/other interchange | Structural/data export profiles | Semantic loss warnings |

Support batch export, web/print/presentation profiles, local execution, and embedded assets. Each exporter reports `supported`, `partiallySupported`, or `unsupported` capabilities before output. Secure SVG/HTML, URLs, and active content. Standalone HTML must actually work offline. Raster exports must not imply editable structural reimport.

## Tests

Golden files, native round trips, migrations, large tables, encoding/Unicode/RTL, malformed inputs, ZIP bombs, formula-containing spreadsheets, malicious SVG/XML, HTML CSP, and exported offline interactions. Preserve the distinction between required long-term formats and experimentally supported conversions.

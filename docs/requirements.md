# Projektanforderungen

## Bestätigt

| ID | Anforderung | Herkunft |
| --- | --- | --- |
| R-01 | Plattform für Diagramme, Mindmaps, Datenvisualisierung und Zusammenarbeit | Bestehende README |
| R-02 | Open-Source-Ausrichtung | Bestehende README; Lizenz noch offen |
| R-03 | Product Owner verantwortet Ziele, Prioritäten und Freigaben, nicht Programmierung | Aktueller Auftrag |
| R-04 | Entwicklung über eigenen Branch und Pull Request | Aktueller Auftrag |
| R-05 | Phase 0 liefert ausschließlich Grundlagen und Vorlagen | Aktueller Auftrag |
| R-06 | E-Mail-Struktur für koxora.app auf vorhandenem selbst gehostetem Mailserver planen | Auftrag und Referenzchat |
| R-07 | Keine DNS- oder Mailserver-Änderungen | Aktueller Auftrag |

## Produktvision und vorgeschlagener Fokus

Menschen sollen Informationen visuell strukturieren, verständlich darstellen und gemeinsam weiterentwickeln können. Zielgruppe und Differenzierung sind noch nicht belegt (D-01). Vorschlag für den ersten Test: Eine Einzelperson erstellt und überarbeitet ein einfaches Knotendiagramm im Browser.

### MVP-Vorschlag – noch nicht freigegeben (D-02)

| ID | Fähigkeit | Geplantes Abnahmeszenario |
| --- | --- | --- |
| M-01 | Diagramm bearbeiten | Knoten anlegen, beschriften, bewegen, verbinden und löschen |
| M-02 | Arbeit erhalten | Diagramm speichern und erneut öffnen; Speicherfehler sichtbar machen, keine stillen Verluste |
| M-03 | Änderungen korrigieren | Bearbeitung rückgängig machen und wiederherstellen |
| M-04 | Daten mitnehmen | Versioniertes Dokumentformat exportieren und wieder importieren; ungültige Daten verständlich ablehnen |
| M-05 | Bedienbarer Einstieg | Neues Diagramm ohne Einführung erstellen; wesentliche Aktionen per Tastatur und beschriftete Bedienelemente |

Speicherort (lokal oder Konto), Exportformate neben dem Dokumentformat, Browsermatrix und konkrete Qualitätsbudgets werden vor Umsetzung entschieden. Diese Tabelle ist ein Vorschlag, keine Feature-Zusage.

### Nach MVP priorisieren

Mindmap-Modus, Datenvisualisierung aus Datensätzen, Bild-/Vektorexport, Vorlagen, Kommentare, Freigaben und gleichzeitiges Bearbeiten. Zusammenarbeit gehört zur Vision; ihr genauer Umfang und Zeitpunkt bleiben offen. Kein Echtzeitversprechen für den ersten MVP.

### Qualitätsziele zur Konkretisierung

- Dokumentinhalt von Darstellung trennen; Format versionieren und Migrationen prüfen.
- Bei späterem Mehrbenutzerbetrieb Zugriff auf jedes Dokument serverseitig prüfen.
- Privatsphäre als Standard; keine öffentlichen Dokumente ohne bewusste Freigabe.
- Zugängliche Bedienung und verständliche Fehler; Testfälle und messbare Ziele vor Feature-Freigabe festlegen.
- Abhängigkeiten, Lizenzen und Datenverarbeitung vor Übernahme bewerten.

## Außerhalb Phase 0

Kein App-Gerüst, keine Abhängigkeiten, Datenbank, Authentifizierung, CI-Ausführung, Bereitstellung oder Migration. Keine Konten, E-Mail-Adressen, DNS-Einträge oder Serverkonfiguration anlegen. Bezahlmodell, KI-Funktionen, mobile Apps und Integrationen sind nicht beschlossen.

Offene Fragen werden im [Entscheidungsregister](decisions.md) geführt.

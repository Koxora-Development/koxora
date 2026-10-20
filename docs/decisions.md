# Entscheidungsregister

Alle Einträge sind **offen**. Vorschläge in anderen Dokumenten sind keine Beschlüsse. Der Product Owner entscheidet über Produktziele und Freigaben; technische Ausführende liefern verständliche Empfehlungen und Nachweise.

| ID | Entscheidung | Empfehlung / Optionen | Benötigt vor |
| --- | --- | --- | --- |
| D-01 | Zielgruppe und Kernproblem | Einen ersten Nutzerkreis und einen häufigen visuellen Arbeitsablauf wählen | Phase 1 |
| D-02 | MVP-Grenze und Speicherung | M-01 bis M-05 als Ausgangspunkt; lokal ohne Konto oder serverseitig mit Konto bewusst wählen | Phase 1 |
| D-03 | Technik und Editor | Webanwendung und bestehende Editor-Bibliothek evaluieren; Vergleich samt Lizenz, Wartung und Betriebsaufwand vorlegen | Produktgerüst |
| D-04 | Zusammenarbeit | Teilen, Kommentare und Echtzeit getrennt priorisieren; Konflikt- und Berechtigungsmodell bestimmen | Zusammenarbeit |
| D-05 | Hosting und Betrieb | Selbsthosting oder betreuter Betrieb; Verantwortliche, Budget, Regionen und Wiederherstellungsziele festlegen | Server/Pilot |
| D-06 | Lizenz und Öffentlichkeit | Open-Source-Ausrichtung bestätigt; konkrete Lizenz und Zeitpunkt der Repository-Öffnung offen | Externe Weitergabe/Veröffentlichung |
| D-07 | Daten und Konten | Erforderliche personenbezogene Daten, Anmeldung, Aufbewahrung, Löschung und zuständige Person bestimmen | Externe Nutzer |
| D-08 | E-Mail-Adressen und Routing | Mailplan bestätigen, reale Empfänger und Vertretung festlegen, Systemversand separat bewerten | Mail-Einrichtung |
| D-09 | Sprache und Qualitätsziele | Dokumentation zunächst Deutsch; UI-Sprache, Browser, Barrierefreiheit und messbare Größen-/Leistungsziele festlegen | MVP-Umsetzung |

## Beschlüsse dokumentieren

Ein Entscheidungs-Issue benennt Problem, Optionen, Empfehlung, Folgen und akzeptierende Person. Nach ausdrücklicher PO-Entscheidung: Status, Datum, Begründung und Issue-/PR-Link hier ergänzen; betroffene Dokumente im selben PR aktualisieren. Technische Detailentscheidungen bei Bedarf unter docs/adr/ festhalten. Ein angenommenes Dokument bedeutet nicht, dass darin als offen bezeichnete Entscheidungen ebenfalls angenommen sind.

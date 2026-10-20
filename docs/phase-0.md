# Phase 0 – Ausgangslage und Abnahme

Stand: 20. Oktober 2026. Status: zur Freigabe vorgeschlagen.

## Nachvollziehbare Quellen

- Aktueller Auftrag: Phase 0 im Repository, eigener Branch und Pull Request; Anforderungen, Architektur, Roadmap, Workflow, Vorlagen, Agentenanweisungen und E-Mail-Plan. Keine Produktimplementierung, DNS- oder Mailserver-Änderungen.
- Repository Koxora-Development/koxora, main bei Commit `08c9a67302f8f349a8650c3b8a883c7c5bc721a7`: ausschließlich README.md und .gitignore. README nennt Diagramme, Mindmaps, Datenvisualisierung und Zusammenarbeit sowie Open-Source-Ausrichtung.
- Referenzchat „Projektideen entwickeln“, ID `6ad67f14-17b8-83ed-a6f4-a4aacdc0965b`: abrufbare Nutzernachrichten bestätigen Organisation, Repository, Domain koxora.app und vorhandenen eigenen Mailserver. Assistentenantworten sind im abrufbaren Verlauf nur Inhaltsreferenzen. Ein zuvor erstellter Initialisierungsplan ist daraus nicht rekonstruierbar.
- Im Repository sind kein Initialisierungsplan und keine bestehenden Agentenanweisungen vorhanden. Die allgemeine Node-.gitignore ist kein Beleg für einen beschlossenen Technologie-Stack.

Die folgenden Dokumente ersetzen keinen unbekannten alten Plan. Neue Ausgestaltungen sind ausdrücklich Vorschläge. Ein später verfügbarer Originalplan muss vor einer davon abhängigen Umsetzung abgeglichen werden.

## Lieferumfang

README als Einstieg; Anforderungen; logische Architektur; phasenweise Roadmap; Entwicklungsworkflow; Entscheidungsregister; E-Mail-Plan; Sicherheitsmeldeweg; AGENTS.md und CLAUDE.md; Issue-Vorlagen für Fehler, Funktionen und Entscheidungen sowie PR-Vorlage.

## Abnahme durch den Product Owner

- [ ] Anforderungen und Trennung zwischen bestätigt, vorgeschlagen und offen sind verständlich.
- [ ] MVP-Zielgruppe und erster Anwendungsfall sind gewählt (D-01).
- [ ] MVP-Umfang und Abnahmeszenario sind bestätigt (D-02).
- [ ] Architektur und technische Auswahl erhalten einen separaten Entscheidungsauftrag (D-03).
- [ ] E-Mail-Plan wurde geprüft; alle Adressen sind weiterhin nur geplant.
- [ ] Offene Entscheidungen sind priorisiert; keine Freigabe wird aus Schweigen abgeleitet.
- [ ] Phase-0-PR wurde geprüft und ausdrücklich zur Übernahme freigegeben.

Ein Merge dieses Dokumentations-PRs genehmigt allein die dokumentierte Planungsgrundlage. Er beauftragt keine Produktimplementierung und keine Infrastrukturänderung. Phase 1 benötigt eine gesonderte Freigabe mit konkretem Umfang.

## Prüfungen dieses Umfangs

Dateibestand und bestehende Inhalte vor Änderungen gelesen. Dokumente auf konsistente Rollen, Entscheidungsstatus und Grenzen prüfen; relative Links und Vorlagenstruktur prüfen; Remote-Diff auf reine Dokumentation/Vorlagen kontrollieren. Keine Produkt-Tests möglich, da kein Produktcode existiert. Keine GitHub-Regeln, Labels, Workflows oder Servereinstellungen werden durch diesen Stand eingerichtet.

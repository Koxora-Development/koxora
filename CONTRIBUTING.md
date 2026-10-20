# Entwicklungsworkflow

## Rollen

Der Product Owner legt Bedarf, Priorität und Akzeptanzkriterien fest und gibt Ergebnisse frei. Er muss weder programmieren noch technische Prüfungen selbst ausführen. Entwickler und Coding-Agenten bereiten Änderungen vor, führen passende Prüfungen aus und erläutern Ergebnis, Grenzen und offene Entscheidungen.

## Ablauf

1. Bedarf als Issue beschreiben: Problem, erwarteter Nutzen, Abnahmefälle, Grenzen und offene Entscheidungen. Bei kleinen Dokumentationsaufgaben kann der direkte Auftrag als Referenz genügen.
2. Aktuellen Stand und AGENTS.md lesen, bestehende Änderungen respektieren.
3. Eigenen Branch vom aktuellen main verwenden, etwa docs/phase-0-foundation oder feat/<issue>-<thema>. Keine direkten Änderungen an main.
4. Kleinen, zusammenhängenden Umfang bearbeiten. Abhängige Produktentscheidungen vorher klären; technische Detailarbeit selbstständig erledigen.
5. Passende Prüfungen ausführen und tatsächliche Ergebnisse dokumentieren. Dokumentation: Links und Konsistenz. Später Produktcode: Formatierung, statische Prüfungen und risikogerechte Funktions-/Integrationstests.
6. PR gegen main mit Ergebnis, Begründung, Nachweisen, Risiken und offenen Punkten öffnen.
7. Review-Rückmeldungen bearbeiten. Der PO erhält eine verständliche Abnahmebeschreibung oder Demo und erteilt die Freigabe. Kein automatischer Merge durch Agenten.
8. Nach Freigabe durch berechtigte Person übernehmen; Releases und Infrastrukturänderungen separat freigeben.

## Definition of Ready

Problem und Umfang verständlich; überprüfbare Akzeptanzkriterien; notwendige Entscheidungen getroffen; Abhängigkeiten benannt. Keine unbestätigten Vorschläge stillschweigend als Auftrag behandeln.

## Definition of Done

Akzeptanzkriterien erfüllt; geeignete Prüfungen mit Ergebnis im PR; Dokumentation aktuell; keine Geheimnisse oder personenbezogenen Echtdaten; offene Punkte sichtbar; PO-Freigabe vor Merge. Nicht ausgeführte Prüfungen mit Grund nennen.

## GitHub-Konventionen

Issue-Vorlagen: Fehler, Funktionswunsch, Entscheidung. PR-Vorlage enthält Abnahme und Prüfnachweise. Dokumentation auf Deutsch; technische Bezeichner bei Bedarf Englisch. Aussagekräftige Commit-Titel, optional docs:, feat: oder fix:.

Empfohlene spätere Repository-Regeln: main nur über PR, keine Force-Pushes, notwendige Prüfungen nach Einrichtung verlangen. Das ist eine Empfehlung; dieser PR richtet keine Regeln ein. Bei einem einzelnen menschlichen Verantwortlichen muss die Review-Regel zur GitHub-Rollenverteilung passen, statt einen unerfüllbaren zweiten menschlichen Reviewer vorauszusetzen. Labels, Milestones, CODEOWNERS und CI erst nach Bestimmung realer Zuständigkeiten einrichten.

## Aktueller Prüfstand

Phase 0 hat keine Anwendung, Paketdatei oder CI. Daher sind npm install, Build und Produkt-Tests derzeit nicht definiert. Fehlende Produktprüfungen dürfen nicht als bestanden gemeldet werden. Zukünftige Ausführende dokumentieren mit dem ersten technischen Gerüst die exakten Start- und Prüfbefehle.

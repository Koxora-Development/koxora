# Anweisungen für Coding-Agenten

Gilt für das gesamte Repository.

## Kontext lesen

README.md, docs/phase-0.md, docs/requirements.md, docs/decisions.md und CONTRIBUTING.md vor Änderungen lesen; für fachliche Aufgaben auch Architektur, Roadmap und E-Mail-Plan heranziehen. Bestätigte Anforderungen, Vorschläge und offene Entscheidungen unterscheiden.

## Auftrag und Verantwortung

- Der Nutzer ist Product Owner und übernimmt Prioritäten, Produktentscheidungen und Freigaben. Programmierung, technische Analyse und Prüfungen übernehmen die Ausführenden.
- Aktueller Stand ist Phase 0: nur Dokumentation und Vorlagen. Kein Produktgerüst, keine Abhängigkeiten oder Infrastruktur ohne gesonderten Auftrag.
- Fehlenden historischen Kontext offen benennen. Keine Anforderungen oder bereits erteilten Freigaben erfinden.
- Routineentscheidungen innerhalb des freigegebenen Umfangs selbst treffen. Den PO nur bei relevanten fehlenden Produktentscheidungen einbeziehen; konkrete Optionen verständlich vorbereiten.

## Änderungen

- Aktuellen Repository-Stand und fremde Änderungen prüfen und erhalten.
- Eigenen Branch verwenden und PR gegen main öffnen. Keine direkten main-Schreibzugriffe, kein Force-Push und kein Merge ohne ausdrückliche Freigabe.
- Kleine nachvollziehbare Änderungen; keine unabhängigen Refactorings.
- Keine Geheimnisse, Zugangsdaten, Echtdaten oder internen Serverdetails in Git, Issues oder Logs.
- Keine DNS-, Mailserver-, Hosting- oder Kontenänderungen im Rahmen von Phase 0. Mailadressen sind ausschließlich geplant.
- Sicherheitsmeldungen nach SECURITY.md behandeln.

## Prüfung und Übergabe

Passende vorhandene Prüfungen ausführen. Aktuell existieren keine Build- oder Produkttestbefehle. Für Dokumentation lokale Links, Statuskonsistenz und Vorlagen prüfen; tatsächliche Ergebnisse berichten. Keine bestandenen Tests behaupten, die nicht ausgeführt wurden.

Ergebnis für den PO zusammenfassen: Was geändert wurde, warum, wie geprüft, was offen bleibt und welche Freigabe als Nächstes erforderlich ist. Offene Entscheidungen im Register pflegen. Ein Phase-0-Merge ist keine Freigabe für Phase 1.

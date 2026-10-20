# Architekturentwurf

Status: Vorschlag zur Diskussion, keine Stack-Freigabe und keine Implementierung. Entscheidung D-03.

## Logische Bausteine

1. **Weboberfläche und Editor**: Eingaben, Auswahl, Zoom, Tastaturbedienung und Anzeige. Änderungen werden als fachliche Operationen verarbeitet.
2. **Dokumentmodell**: Dokument-ID, Formatversion, Knoten, Verbindungen und Layout. Diagrammtyp und Nutzdaten getrennt halten, damit Mindmaps und Datenvisualisierung später ergänzbar bleiben.
3. **Speicherschnittstelle**: Laden, Speichern, Import und Export hinter einer klaren Grenze. Lokale Speicherung und serverseitige Speicherung sind Alternativen, über D-02/D-03 zu wählen.
4. **Optionaler Anwendungsserver**: Für Konten, Dokumentrechte, geteilte Dokumente und zentrale Speicherung. Autorisierung und Validierung liegen hier, nicht allein im Browser.
5. **Spätere Zusammenarbeit**: Präsenz, Kommentare oder gleichzeitige Änderungen erst nach eigenem Konflikt-, Offline- und Rechtekonzept (D-04).
6. **Benachrichtigungen**: Späterer Versandadapter mit Warteschlange, Wiederholungen und Versandprotokoll ohne vertrauliche Inhalte. Separat vom interaktiven Editor.

## Datenfluss und Grenzen

Einzelbenutzer-Variante: Eingabe → fachliche Operation → Dokumentmodell → Darstellung und Speicheradapter. Import ist nicht vertrauenswürdig: Schema, Größe und unterstützte Version vor Übernahme prüfen.

Mehrbenutzer-Variante: Browser → authentifizierte API → Autorisierung pro Dokument → validierte Speicherung. Der Server liefert nur zulässige Daten. Zugangsdaten und SMTP-Geheimnisse gehören nie in Browsercode oder Repository.

Künftige Dokumente benötigen eine explizite Formatversion. Rechte und Kontozuordnung gehören bei Serverbetrieb zur autoritativen Serververwaltung, nicht in frei editierbare Importdaten. Gleichzeitiges Speichern braucht eine Revision beziehungsweise eine erkennbare Konfliktantwort, bevor kollaboratives Bearbeiten angeboten wird.

## Technische Optionen für Phase 1

| Bereich | Zu prüfender Vorschlag | Alternative / Entscheidungskriterium |
| --- | --- | --- |
| Oberfläche | TypeScript-basierte Webanwendung | Framework nach Editor-Kompatibilität, Zugänglichkeit und Wartbarkeit bewerten |
| Editor | Bestehende Canvas-/Graph-Bibliothek evaluieren | Eigene Darstellung nur bei belegter Lücke; Lizenz, Export und große Dokumente prüfen |
| Speicherung | Lokal für einen frühen Einzelbenutzer-Test | Serverbetrieb bei Konten/Teilen; Sicherung und Wiederherstellung einplanen |
| Serverdaten | Relationale Datenbank bei Serverbedarf | Erst aus Zugriffsmustern, Dokumentgröße und Betriebsaufwand ableiten |
| Zusammenarbeit | Zunächst sequenzielles Teilen/Kommentieren prüfen | CRDT/OT nur nach bestätigtem Echtzeitbedarf und Konflikttest |
| Betrieb | Kleine, gemeinsam deploybare Anwendung mit klaren Modulgrenzen | Getrennte Dienste erst bei messbarem Bedarf |

Es werden keine konkreten Paketversionen oder Anbieter vorausgesetzt. Die Auswahl benötigt in Phase 1 einen dokumentierten Vergleich mit aktuellem Wartungsstatus, Lizenz, Betriebskosten und kurzem technischen Nachweis. Keine Technologie wird durch die bestehende .gitignore festgelegt.

## Betrieb und Sicherheit als spätere Voraussetzungen

Vor Pilotbetrieb: Umgebungen trennen, Geheimnisse außerhalb Git verwalten, Sicherung und Wiederherstellung testen, Aufbewahrung und Löschung festlegen, Fehlerüberwachung ohne Dokumentinhalte gestalten. Vor externen Konten: Anmeldung, Missbrauchsschutz und Kontowiederherstellung prüfen. Selbst gehostete E-Mail ist ein vorhandener separater Dienst; die Anwendung darf weder administrative Mailserver-Rechte benötigen noch dessen Konfiguration verändern.

## Geplante Repository-Struktur

Jetzt vorhanden: docs/ und .github/ für Grundlagen. Erst nach Freigabe denkbar: apps/web/, gegebenenfalls apps/server/ und packages/document-model/. Keine leeren App-Pakete oder Build-Konfigurationen in Phase 0.

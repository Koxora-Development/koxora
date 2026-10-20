# Geplante @koxora.app-E-Mail-Struktur

Status: **Plan, nicht eingerichtet**. Ein selbst gehosteter Mailserver ist laut Nutzer vorhanden. Seine Software, aktuelle Domains, Postfächer und Zustellkonfiguration wurden nicht geprüft. Keine der nachstehenden Adressen ist als bestehend oder erreichbar bestätigt. Keine DNS-, Mailserver-, Konto- oder Versandänderung gehört zu Phase 0.

## Adressen und Zuständigkeiten – Vorschlag D-08

| Adresse | Zweck | Vorgeschlagener Typ / Ziel | Zeitpunkt |
| --- | --- | --- | --- |
| admin@koxora.app | GitHub-Organisation, technische Anbieter und Wiederherstellung | Separates geschütztes Funktionspostfach; PO als zunächst verantwortliche Person | Vor Nutzung als Kontoadresse |
| info@koxora.app | Allgemeine externe Anfragen | Alias auf betreutes Kontaktpostfach | Vor öffentlichem Auftritt |
| support@koxora.app | Produktfragen und Fehlerberichte | Alias auf Kontaktpostfach; später eigenes Supportpostfach | Vor Pilot |
| security@koxora.app | Vertrauliche Sicherheitsmeldungen | Geschütztes Postfach mit eng begrenztem Zugriff | Vor Veröffentlichung als Meldeweg |
| privacy@koxora.app | Datenschutzanfragen | Alias an festgelegte verantwortliche Person | Vor Verarbeitung externer Nutzerdaten |
| postmaster@koxora.app | Zustellprobleme und Mailbetrieb | Alias an tatsächlichen Mailadministrator | Bei Domainbetrieb prüfen |
| abuse@koxora.app | Missbrauchsmeldungen | Alias an betreuten Betriebskontakt | Bei öffentlichem Betrieb prüfen |
| notifications@koxora.app | Automatische Produktnachrichten | Separater Versandzugang; Antworten an support@ nach dessen Aktivierung | Erst bei Produktbedarf |
| bounces@koxora.app | Unzustellbarkeit automatischer Nachrichten | Technisch verarbeitetes Empfangsziel; kein allgemeiner Kontakt | Mit Systemversand |

Info und Support können anfangs dasselbe betreute Postfach erreichen; die Rollen bleiben nach außen getrennt. Ein Alias ist kein Login und erhält kein geteiltes Passwort. Zugang für Menschen über persönliche Konten oder delegierten Zugriff; konkrete Empfänger, Vertretung und Zugriffsrechte vor Einrichtung festlegen.

## GitHub und Wiederherstellung

Vorschlag: admin@ für Organisations-/Anbieterkontakte, persönliche Konten der Mitglieder für GitHub-Anmeldung und nachvollziehbare Aktionen. Keine gemeinsam genutzte GitHub-Identität. Das Kontaktpostfach ist nicht automatisch Eigentümer oder Administrator der Organisation. Vor Nutzung als Wiederherstellungsadresse Erreichbarkeit prüfen und einen unabhängigen Wiederherstellungsweg dokumentieren, damit ein Mailserverausfall nicht sämtliche Adminzugänge blockiert.

## Betriebsregeln als spätere Einrichtungsanforderungen

- Sicherheits- und Wiederherstellungsnachrichten nur für berechtigte Personen zugänglich machen; Mehrfaktorverfahren und Wiederherstellung nach Möglichkeiten des eingesetzten Systems planen.
- Keine Catch-all-Zustellung als Standard; jede Funktionsadresse bewusst zuordnen.
- Systemversand mit begrenzten Zugangsdaten und getrenntem Versandzweck; keine Mailserver-Administrationsrechte für die Anwendung.
- Antworten und Unzustellbarkeit aktiv bearbeiten; keine unbetreute no-reply-Adresse als Supportkontakt verwenden.
- Aufbewahrung, Löschung, Sicherung, Vertretung und Prüfung des Posteingangs verbindlich festlegen; keine erfundenen Reaktionszeitversprechen.
- Geheimnisse außerhalb des Repositorys verwalten.

## Separater späterer Einrichtungsauftrag

1. Reale verantwortliche Personen, vorhandene Postfächer und Mailserver-Funktionen aufnehmen.
2. Adressen und Routing freigeben, zuerst erreichbare Empfangswege bereitstellen.
3. Bestehende DNS-/Mailauthentifizierung (MX, SPF, DKIM, DMARC) und TLS prüfen; konkrete Änderungen ausschließlich nach gesondertem Auftrag planen und ausführen.
4. Empfang, Versand, Antwortadresse, Unzustellbarkeit, Zugriffstrennung und Wiederherstellung testen.
5. Erst danach Kontaktadressen in Anwendung, GitHub und Sicherheitsrichtlinie veröffentlichen.

Keine DNS-Werte oder Serverbefehle werden hier vorgegeben. Funktionsfähigkeit oder rechtliche Vollständigkeit dieses Plans wird nicht behauptet.

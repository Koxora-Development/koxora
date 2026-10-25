import type { WebsiteMessageKey } from './en';
// German is supported from the start and selectable independently of the
// operating system language. The type below enforces full parity with English:
// a key that exists in `en.ts` must exist here too, or the build fails.
export const de: Record<WebsiteMessageKey, string> = {
  'brand.name': 'Koxora',
  'brand.wordmark': 'koxora',
  'brand.tagline': 'Ideen nehmen Form an.',
  'brand.description':
    'Koxora ist ein Local-first-Studio für Diagramme, Mindmaps, Datenvisualisierung und visuelle Zusammenarbeit.',

  'a11y.skip': 'Zum Hauptinhalt springen',
  'a11y.breadcrumb': 'Brotkrumennavigation',
  'a11y.mainNavigation': 'Hauptnavigation',
  'a11y.footerNavigation': 'Fußbereichsnavigation',
  'a11y.currentPage': 'Aktuelle Seite',
  'a11y.externalLink': 'Öffnet eine externe Seite',
  'a11y.statusLegend': 'Bedeutung der Statusangaben',

  'nav.menu': 'Menü',
  'nav.menuOpen': 'Menü öffnen',
  'nav.menuClose': 'Menü schließen',
  'nav.home': 'Startseite',
  'nav.features': 'Funktionen',
  'nav.localFirst': 'Local-first',
  'nav.compare': 'Vergleich',
  'nav.roadmap': 'Roadmap',
  'nav.download': 'Download',
  'nav.docs': 'Dokumentation',
  'nav.releases': 'Versionen',
  'nav.legalNotice': 'Impressum',
  'nav.privacyPolicy': 'Datenschutz',
  'nav.privacySettings': 'Datenschutz-Einstellungen',
  'nav.groupProduct': 'Produkt',
  'nav.groupResources': 'Ressourcen',
  'nav.groupLegal': 'Rechtliches',
  'nav.language': 'Sprache',
  'nav.languageMenu': 'Sprache wählen',
  'nav.languageCurrent': 'Aktuelle Sprache',
  'nav.languageEnglish': 'English',
  'nav.languageGerman': 'Deutsch',
  'nav.theme': 'Darstellung',
  'nav.themeDark': 'Dunkel',
  'nav.themeLight': 'Hell',
  'nav.themeSystem': 'System',

  'cta.openStudio': 'Studio öffnen',
  'cta.openStudioNote': 'Läuft im Browser. Ohne Konto, ohne Upload.',
  'cta.studioPending': 'So probieren Sie Koxora aus',
  'cta.studioPendingNote':
    'Die gehostete Vorschau ist noch nicht veröffentlicht. Die aktuelle Entwicklungsversion lässt sich aus dem öffentlichen Repository bauen.',
  'cta.roadmap': 'Zur Roadmap',
  'cta.features': 'Funktionen ansehen',
  'cta.repository': 'Quellcode auf GitHub',
  'cta.more': 'Mehr lesen',
  'cta.backHome': 'Zurück zur Startseite',

  'status.available': 'Verfügbar',
  'status.inDevelopment': 'In Entwicklung',
  'status.planned': 'Geplant',
  'status.concept': 'Konzept',
  'status.inPreparation': 'In Vorbereitung',
  'status.legend.title': 'So sind die Statusangaben zu lesen',
  'status.legend.available':
    'In der aktuellen Entwicklungsversion von Koxora Studio umgesetzt und zusammengeführt. Koxora hat noch keine öffentliche Veröffentlichung, „verfügbar“ bedeutet deshalb nie „heute herunterladbar“.',
  'status.legend.inDevelopment':
    'Wird gerade in einem geprüften Entwicklungsschritt gebaut. Umfang und Verhalten können sich noch ändern.',
  'status.legend.planned':
    'Teil des dokumentierten Produktumfangs, ohne begonnene Umsetzung und ohne zugesagten Termin.',
  'status.legend.concept':
    'Die Darstellung einer Idee. Konzeptbilder zeigen nie Software, die es heute schon gibt.',

  'project.statusTitle': 'Entwicklungsstand',
  'project.statusSummary':
    'Koxora Studio ist eine funktionierende technische Vorschau. Die öffentliche Website befindet sich in der Prüfung. Es gibt noch keine öffentliche Veröffentlichung und keinen Download.',
  'project.statusMilestone': 'Aktueller Meilenstein',
  'project.statusMilestoneValue':
    'Studio-Phase 2.4 zusammengeführt · Studio 2.5 und Website W1 in Arbeit',
  'project.statusUpdated': 'Inhalte zuletzt geprüft am {date}',
  'project.statusLink': 'Entwicklungsstand und Roadmap',

  'home.meta.title': 'Koxora — Local-first-Diagramme und Mindmaps',
  'home.meta.description':
    'Ein Local-first-Studio für Diagramme, Mindmaps und Datenvisualisierung. Funktioniert offline, braucht kein Konto, speichert in portablen Dateien.',
  'home.hero.eyebrow': 'Visuelles Denken, local-first',
  'home.hero.title': 'Ideen nehmen Form an.',
  'home.hero.titleAccent': 'Auf Ihrem Gerät.',
  'home.hero.lead':
    'Koxora ist ein Studio für Diagramme, Mindmaps, Datenvisualisierung und visuelle Zusammenarbeit. Es läuft im Browser und auf dem Desktop, funktioniert offline und speichert Ihre Projekte in portablen Dateien, die Ihnen gehören.',
  'home.hero.note':
    'Koxora wird aktiv entwickelt. Alles auf dieser Seite ist als Verfügbar, In Entwicklung oder Geplant gekennzeichnet.',
  'home.preview.title': 'Das Studio heute',
  'shot.frameLabel': 'Bildschirmfoto · Koxora Studio',
  'home.preview.caption':
    'Echter Screenshot der aktuellen Entwicklungsversion von Koxora Studio, aufgenommen am {date}. Keine Montage.',
  'home.preview.altDark':
    'Koxora Studio in dunkler Darstellung mit einem Flussdiagramm aus verbundenen Formen auf der Arbeitsfläche.',
  'home.preview.altLight':
    'Koxora Studio in heller Darstellung mit der Formenpalette und den Projektdetails.',
  'home.preview.altMobile':
    'Koxora Studio auf einem schmalen Smartphone-Bildschirm, mit Formenpalette und Projektdetails untereinander.',
  'home.preview.tabDark': 'Dunkel',
  'home.preview.tabLight': 'Hell',
  'home.preview.tabMobile': 'Auf dem Smartphone',
  'home.features.kicker': 'Was heute möglich ist',
  'home.features.title': 'Eine Arbeitsfläche, die schon trägt',
  'home.features.description':
    'Diese Funktionen sind in der aktuellen Entwicklungsversion umgesetzt. Ohne Konto, ohne Netzverbindung, ohne Upload.',
  'home.features.link': 'Alle Funktionen im Detail',

  'home.local.kicker': 'Local-first',
  'home.local.title': 'Ihre Projekte bleiben, wo Sie sie ablegen',
  'home.local.description':
    'Koxora speichert Projekte in Ihrem Browser oder in Dateien auf Ihrem Rechner. Nichts wird auf einen Koxora-Server geladen, denn es gibt keinen Koxora-Projektserver. Sie können jederzeit ein portables .koxora-Archiv exportieren und auf einem anderen Gerät öffnen.',
  'home.local.link': 'Wie Local-first funktioniert',
  'home.local.point1.title': 'Kein Konto nötig',
  'home.local.point1.body':
    'Studio öffnen und loslegen. Eine Registrierung gehört nicht zum Kernprodukt.',
  'home.local.point2.title': 'Offline ab dem ersten Besuch',
  'home.local.point2.body':
    'Das Browser-Studio arbeitet nach dem ersten Laden auch ohne Verbindung weiter.',
  'home.local.point3.title': 'Portable Dateien',
  'home.local.point3.body':
    'Ein .koxora-Archiv ist ein dokumentierter Container, den Sie selbst sichern, kopieren und verschieben.',
  'home.local.point4.title': 'Kein Tracking auf dieser Website',
  'home.local.point4.body':
    'Keine Analyse, keine fremden Schriftarten, kein Werbenetzwerk, keine Tracking-Cookies.',

  'home.future.kicker': 'Wohin Koxora geht',
  'home.future.title': 'Das ganze Bild, ehrlich beschriftet',
  'home.future.description':
    'Koxora ist als vollständige visuelle Plattform geplant. Die folgenden Abschnitte zeigen, was gerade gebaut wird und was auf der dokumentierten Roadmap steht. Nichts davon wird als fertig verkauft.',
  'home.future.conceptCaption':
    'Konzeptdarstellung des geplanten Zusammenarbeitsmodells. Dies ist die Zeichnung einer Idee, kein Screenshot funktionierender Software.',
  'home.future.conceptAlt':
    'Schematische Zeichnung: Drei Geräte bearbeiten ein gemeinsames Projekt, eine gestrichelte Linie markiert den optionalen Synchronisationsdienst.',
  'home.future.link': 'Vollständige Roadmap',

  'home.compare.kicker': 'Einordnung',
  'home.compare.title': 'Wo Koxora hingehört',
  'home.compare.description':
    'Diagrammwerkzeuge sind ein reifes Feld mit starken Produkten. Koxora ist für einen bestimmten Arbeitsablauf gebaut: visuelle Arbeit, die auf Ihrem Gerät bleibt, offline weiterläuft und Dateien erzeugt, die Ihnen gehören.',
  'home.compare.focusTitle': 'Worauf Koxora optimiert',
  'home.compare.peersTitle': 'Die Werkzeuge, mit denen Koxora verglichen wird',
  'home.compare.peersNote':
    'Mehrere dieser Werkzeuge bieten ebenfalls Offline-, Desktop- oder Self-Hosting-Optionen und jedes ist in seinem Feld stark. Der Vergleich sagt das, mit einer Quelle für jede Aussage.',
  'home.compare.methodology':
    'Der Vergleich beantwortet zehn Fragen für sechs Produkte. Jede Aussage über ein anderes Produkt verweist auf die offizielle Seite, die sie belegt, und hält das Lesedatum fest.',
  'home.compare.link': 'Den Vergleich lesen',

  'home.roadmap.kicker': 'Transparenz',
  'home.roadmap.title': 'Öffentlicher Entwicklungsstand',
  'home.roadmap.description':
    'Koxora wird öffentlich entwickelt. Jeder Meilenstein verweist auf die Issues und Dokumente im Repository.',
  'home.roadmap.link': 'Ausführliche Roadmap',

  'home.structure.kicker': 'Kommt auf diese Website',
  'home.structure.title': 'Dokumentation, Downloads und Versionen',
  'home.structure.description':
    'Diese Bereiche haben ihren Platz in Struktur und Navigation bereits. Sie werden gefüllt, sobald es etwas Echtes zu veröffentlichen gibt.',

  'home.cta.kicker': 'Nah am Projekt bleiben',
  'home.cta.title': 'Die Entwicklung mitverfolgen',
  'home.cta.description':
    'Issues, Entscheidungen, Architekturdokumente und Meilensteine sind öffentlich. Rückmeldungen zu den offenen Issues sind willkommen.',

  'features.meta.title': 'Funktionen: verfügbar, in Entwicklung, geplant',
  'features.meta.description':
    'Was Koxora heute kann — Formen, Verbindungen, lokale Projekte, Offline-Nutzung — und was in Entwicklung oder geplant ist, klar gekennzeichnet.',
  'features.hero.eyebrow': 'Funktionen',
  'features.hero.title':
    'Alles, was Koxora kann, und alles, was es können wird',
  'features.hero.lead':
    'Diese Seite trennt drei Dinge: was die aktuelle Entwicklungsversion wirklich tut, was gerade umgesetzt wird und was dokumentierter Produktumfang ohne Umsetzung ist. Die Statusangaben zeigen den Unterschied.',
  'features.available.title': 'In der aktuellen Entwicklungsversion verfügbar',
  'features.available.description':
    'Umgesetzt, geprüft und zusammengeführt. All das funktioniert ohne Konto und ohne Netzverbindung.',
  'features.inDevelopment.title': 'In Entwicklung',
  'features.inDevelopment.description':
    'Wird im aktuellen Meilenstein umgesetzt. Verhalten und Umfang können sich bis zur Veröffentlichung noch ändern.',
  'features.planned.title': 'Geplant',
  'features.planned.description':
    'Dokumentierter Produktumfang. Nicht begonnen, kein zugesagter Termin, keine vorführbare Umsetzung.',
  'features.limits.title': 'Bekannte Grenzen heute',
  'features.limits.description':
    'Eine ehrliche Funktionsseite nennt auch die Lücken. In der aktuellen Entwicklungsversion gilt:',
  'features.limits.item1':
    'Es gibt noch keinen Bildexport. Projekte werden als .koxora-Archive gespeichert und ausgetauscht.',
  'features.limits.item2':
    'Diagrammdateien anderer Werkzeuge lassen sich noch nicht importieren.',
  'features.limits.item3':
    'Der Verlauf ist begrenzt und gilt nur für die Sitzung; er wird nicht in der Projektdatei gespeichert.',
  'features.limits.item4':
    'Textformatierung gilt jeweils für eine ganze Beschriftung; zeichenweise Formatierung ist nicht umgesetzt.',
  'features.limits.item5':
    'Zusammenarbeit, Cloud und KI-Unterstützung gibt es im Produkt heute nicht.',

  'localFirst.meta.title': 'Local-first: wo Ihre Projekte liegen',
  'localFirst.meta.description':
    'Wo Koxora Ihre Projekte speichert, was offline funktioniert, was ein Webserver dennoch sieht und warum Browserspeicher zu einer Adresse gehört.',
  'localFirst.hero.eyebrow': 'Local-first',
  'localFirst.hero.title': 'Software, die arbeitet, wenn das Netz es nicht tut',
  'localFirst.hero.lead':
    'Local-first heißt: Die maßgebliche Fassung Ihrer Arbeit liegt auf Ihrem Gerät, nicht im Rechenzentrum eines anderen. Koxora ist vom Speicherformat an so gebaut.',
  'localFirst.section.storage.title': 'Wo Ihre Projekte liegen',
  'localFirst.section.storage.body':
    'Im Browser liegen Projekte in der Browser-Datenbank (IndexedDB) der Adresse, die Sie geöffnet haben. Auf dem Desktop sind es Dateien in einem Verzeichnis Ihrer Wahl. Koxora speichert Änderungen automatisch auf Ihrem Gerät und bewahrt einen vorherigen Stand zur Wiederherstellung auf.',
  'localFirst.section.offline.title': 'Offline arbeiten',
  'localFirst.section.offline.body':
    'Nach dem ersten Besuch ist das Browser-Studio zwischengespeichert und startet ohne Verbindung. Anlegen, Bearbeiten, Speichern, Exportieren und Importieren brauchen zu keinem Zeitpunkt einen Server.',
  'localFirst.section.portable.title': 'Dateien, die lesbar bleiben',
  'localFirst.section.portable.body':
    'Ein .koxora-Archiv ist ein dokumentierter Container mit den Projektdaten darin. Exportieren, sichern, auf einen anderen Rechner mitnehmen und dort öffnen. Unbekannte Inhalte aus neueren Versionen bleiben erhalten, statt verworfen zu werden.',
  'localFirst.section.boundary.title': 'Was ein Server trotzdem sieht',
  'localFirst.section.boundary.body':
    'Eine Webseite auszuliefern ist nie „keine Verarbeitung“: Hosting-Anbieter und Content-Delivery-Netzwerk verarbeiten notwendigerweise die Verbindungsdaten, die zur Übertragung nötig sind, etwa Ihre IP-Adresse. Koxora lädt keine Projektinhalte hoch, und diese Website nutzt keine Analyse, kein Werbenetzwerk und keine fremden Schriftarten.',
  'localFirst.section.origin.title': 'Browserspeicher hängt an einer Adresse',
  'localFirst.section.origin.body':
    'Browserspeicher gehört genau zu der Adresse, auf der er entstanden ist. Ein Projekt, das unter einer Adresse liegt, ist unter einer anderen nicht sichtbar, und das Löschen der Browserdaten entfernt es. Exportieren Sie, was Sie behalten möchten.',
  'localFirst.warning.title': 'Eigene Sicherungen anlegen',
  'localFirst.warning.body':
    'Local-first bedeutet auch lokale Verantwortung. Browserdaten können vom Browser, von einem Aufräumwerkzeug oder von Ihnen selbst gelöscht werden. Exportieren Sie ein .koxora-Archiv von allem, dessen Verlust Sie sich nicht leisten können.',
  'localFirst.link.privacy': 'Datenschutzerklärung lesen',

  'compare.meta.title': 'Koxora im Vergleich zu anderen Werkzeugen',
  'compare.meta.description':
    'Koxora neben draw.io, Lucidchart, Miro, Microsoft Visio und Excalidraw. Jede Aussage über ein anderes Produkt nennt ihre Quelle und das Prüfdatum.',
  'compare.hero.eyebrow': 'Vergleich',
  'compare.hero.title': 'Ein Vergleich, den Sie nachprüfen können',
  'compare.hero.lead':
    'Koxora neben draw.io, Lucidchart, Miro, Microsoft Visio und Excalidraw. Jede Aussage über ein anderes Produkt verweist auf eine offizielle Seite und hält das Datum fest, an dem diese Seite gelesen wurde. Wo eine Quelle etwas nicht aussagt, steht \u201enicht geprüft\u201c und keine Vermutung.',
  'compare.method.title': 'Wie dieser Vergleich entsteht',
  'compare.method.item1.title': 'Jede Aussage nennt Quelle und Datum',
  'compare.method.item1.body':
    'Jede Aussage über ein anderes Produkt verweist auf die offizielle Seite, die sie belegt, und die Quellenliste hält fest, wann diese Seite gelesen wurde. Was betrachtet wurde \u2014 Tarif, Edition oder Build \u2014 steht neben jedem Produkt.',
  'compare.method.item2.title': 'Mehr als zwei Antworten',
  'compare.method.item2.body':
    'Eine Antwort ist unterstützt, eingeschränkt oder tarifabhängig, nicht unterstützt, für Koxora geplant, eine Beschreibung oder nicht geprüft. Ein bloßes Häkchen verbirgt zu viel, um nützlich zu sein.',
  'compare.method.item3.title': 'Anerkennung, wo sie hingehört',
  'compare.method.item3.body':
    'Das sind starke Produkte, und mehrere können etwas, das Koxora nicht kann. draw.io liefert eine Desktop-Anwendung, die seine Entwickler als vom Internet isoliert beschreiben; Lucidchart bietet Offline-Bearbeitung im Browser. Beides steht hier.',
  'compare.method.item4.title': 'Koxora gilt derselbe Maßstab',
  'compare.method.item4.body':
    'Die Koxora-Spalte beschreibt den zusammengeführten Entwicklungsstand des öffentlichen Repositories. Koxora hat keine öffentliche Veröffentlichung, es lässt sich heute also nichts installieren, und eine geplante Funktion ist als geplant markiert, nie abgehakt.',
  'compare.method.item5.title': 'Er wird erneut geprüft, und sagt wann',
  'compare.method.item5.body':
    'Funktionen, Tarife und Preise ändern sich, manchmal innerhalb von Wochen. Das Datum der letzten Prüfung steht auf dieser Seite, jede Quelle nennt ihr Lesedatum, und vor jeder Veröffentlichung wird erneut geprüft.',
  'compare.peers.title': 'Die betrachteten Werkzeuge',
  'compare.peers.note':
    'Was jedes Werkzeug ist und was betrachtet wurde, um die Fragen darunter zu beantworten.',

  'roadmap.meta.title': 'Roadmap und Entwicklungsstand',
  'roadmap.meta.description':
    'Die öffentliche Koxora-Roadmap: was fertig ist, woran gebaut wird und was geplant ist — offen entwickelt, ohne zugesagte Termine.',
  'roadmap.hero.eyebrow': 'Roadmap',
  'roadmap.hero.title': 'Offen entwickelt, Meilenstein für Meilenstein',
  'roadmap.hero.lead':
    'Koxora wird öffentlich entwickelt. Diese Seite spiegelt die Planungsdokumente im Repository. Die Reihenfolge der Phasen ist geplant, die Termine sind nicht zugesagt.',
  'roadmap.now.title': 'Wo das Projekt steht',
  'roadmap.phases.title': 'Geplante Phasen',
  'roadmap.phases.description':
    'Der langfristige Umfang umfasst einen Katalog von 178 dokumentierten Anforderungen. Die Phasen bündeln sie; spätere Phasen bauen auf früheren und auf gesonderten Freigaben auf.',
  'roadmap.disclaimer.title': 'Keine Termine, keine Versprechen',
  'roadmap.disclaimer.body':
    'Diese Roadmap ist eine geplante Reihenfolge, keine Lieferzusage. Umfang kann zwischen Phasen wandern, und optionale Dienste wie Cloud, Zusammenarbeit, KI und Marktplatz brauchen jeweils eine eigene Sicherheits-, Datenschutz- und Rechtsprüfung, bevor sie gebaut werden.',
  'roadmap.participate.title': 'Mitverfolgen oder mitwirken',
  'roadmap.participate.body':
    'Meilensteine, Entscheidungen und Architekturdokumente liegen im öffentlichen Repository. Die Issues sind der Ort für Fragen und Rückmeldungen.',

  'download.meta.title': 'Koxora herunterladen',
  'download.meta.description':
    'Koxora hat noch keine öffentliche Veröffentlichung. Was es heute gibt, wie die Entwicklungsversion startet und welche Plattformen geplant sind.',
  'download.hero.eyebrow': 'Download',
  'download.hero.title': 'Es gibt noch nichts herunterzuladen',
  'download.hero.lead':
    'Das sagen wir lieber deutlich, als einen Build anzubieten, den niemand getestet, signiert oder unterstützt. Koxora hatte noch keine öffentliche Veröffentlichung. Hier steht, was es heute gibt und was geplant ist.',
  'download.today.title': 'Was es heute gibt',
  'download.today.body':
    'Das Browser-Studio und die Desktop-Hülle laufen aus dem öffentlichen Quellcode. Die gehostete Vorschau unter der geplanten Adresse ist noch nicht veröffentlicht, und es gibt keine signierten Installationspakete.',
  'download.source.title': 'Die aktuelle Entwicklungsversion starten',
  'download.source.body':
    'Das Repository enthält das vollständige Monorepo, die exakte Paketmanager- und Node-Version sowie die Befehle, um das Browser-Studio lokal zu bauen und zu starten.',
  'download.source.link': 'Bauanleitung im Repository',
  'download.planned.title': 'Geplante Verteilung',
  'download.planned.body':
    'Sobald es eine Version gibt, deren Installation sich lohnt, wird diese Seite ein echtes Download-Zentrum. Die Struktur dafür steht bereits.',
  'download.planned.item1':
    'Browser-Studio unter der geplanten Editor-Adresse, ohne Installation.',
  'download.planned.item2': 'Desktop-Pakete für Linux, Windows und macOS.',
  'download.planned.item3': 'Getrennte Stable-, Beta- und Nightly-Kanäle.',
  'download.planned.item4': 'Prüfsummen und Signaturen für jedes Artefakt.',
  'download.planned.item5':
    'Ein Archiv früherer Versionen mit ihren Änderungsprotokollen.',
  'download.noFake.title': 'Warum hier kein Knopf steht',
  'download.noFake.body':
    'Software zu veröffentlichen heißt, sie zu betreuen: signierte Artefakte, überprüfbare Prüfsummen, ein Aktualisierungsweg und ein Sicherheitskontakt. Solange das nicht steht, wäre ein Download-Knopf ein Versprechen, das wir nicht halten können.',

  'docs.meta.title': 'Dokumentation',
  'docs.meta.description':
    'Die Koxora-Dokumentation ist in Vorbereitung. Bis dahin gelten die Architektur- und Entwicklungsdokumente im öffentlichen Repository.',
  'docs.hero.eyebrow': 'Dokumentation',
  'docs.hero.title': 'Die Dokumentation ist in Vorbereitung',
  'docs.hero.lead':
    'Produktdokumentation entsteht, wenn die beschriebenen Funktionen real sind. Bis dahin liegen Architektur, Entscheidungen und Entwicklungsleitfäden im öffentlichen Repository.',
  'docs.available.title': 'Heute im Repository verfügbar',
  'docs.planned.title': 'Geplante Dokumentationsbereiche',
  'docs.planned.body':
    'Diese Abschnitte gehören zur dokumentierten Seitenstruktur und werden mit dem Produkt veröffentlicht.',
  'docs.planned.item1': 'Erste Schritte und alltägliche Abläufe',
  'docs.planned.item2': 'Diagrammarten und Vorlagen',
  'docs.planned.item3': 'Import, Export und das Projektformat',
  'docs.planned.item4': 'Self-Hosting und Administration',
  'docs.planned.item5': 'Schnittstellen für Plugins und Erweiterungen',

  'releases.meta.title': 'Versionen und Änderungsprotokoll',
  'releases.meta.description':
    'Koxora hat noch keine veröffentlichte Version. Meilensteine werden öffentlich nachgehalten; diese Seite ist für Änderungsprotokolle vorbereitet.',
  'releases.hero.eyebrow': 'Versionen',
  'releases.hero.title': 'Noch keine veröffentlichte Version',
  'releases.hero.lead':
    'Koxora hat noch keine Version ausgeliefert. Die Entwicklung schreitet in geprüften Meilensteinen voran, die in das öffentliche Repository übernommen werden. Diese Seite ist der vorbereitete Ort für Änderungsprotokolle, sobald es Versionen gibt.',
  'releases.milestones.title': 'Zusammengeführte Entwicklungsmeilensteine',
  'releases.milestones.description':
    'Jeder Meilenstein wurde geprüft und in den Hauptzweig des öffentlichen Repositories übernommen. Ein zusammengeführter Meilenstein ist keine Produktveröffentlichung.',
  'releases.planned.title': 'Was eine Versionsseite enthalten wird',
  'releases.planned.item1': 'Versionsnummer, Datum und Veröffentlichungskanal',
  'releases.planned.item2': 'Änderungen, Korrekturen und bekannte Probleme',
  'releases.planned.item3': 'Migrationshinweise für das Projektformat',
  'releases.planned.item4': 'Prüfsummen und Signaturen für jedes Artefakt',
  'releases.link': 'Commit-Verlauf im Repository',

  'notFound.meta.title': 'Seite nicht gefunden',
  'notFound.title': 'Diese Seite gibt es nicht',
  'notFound.lead':
    'Vielleicht hat sich die Adresse vertippt, vielleicht ist die Seite noch nicht veröffentlicht. Die folgenden Bereiche gibt es heute.',
  'notFound.suggestions': 'Diese Seiten könnten gemeint sein',

  'footer.tagline':
    'Ein Local-first-Studio für Diagramme, Mindmaps und Datenvisualisierung.',
  'footer.contact': 'Kontakt',
  'footer.contactSupport': 'Produkt und Support',
  'footer.supportTask': 'Fragen zu Koxora',
  'footer.securityTask': 'Sicherheitsproblem gefunden?',
  'footer.contactPrivacy': 'Datenschutz',
  'footer.contactLegal': 'Rechtliches',
  'footer.copyright': '© {year} Koxora. Ein Projekt in Entwicklung.',
  'footer.statusNote':
    'Noch keine öffentliche Veröffentlichung. Funktionen auf dieser Website sind als Verfügbar, In Entwicklung oder Geplant gekennzeichnet.',
  'footer.openConsent': 'Datenschutz-Einstellungen',
  'footer.repository': 'GitHub-Repository',
  'footer.issues': 'Issues und Rückmeldungen',
  'footer.security': 'Sicherheitslücke melden',
  'footer.backToTop': 'Nach oben',

  'consent.banner.title': 'Ihre Datenschutz-Entscheidung',
  'consent.banner.body':
    'Koxora möchte Ihre Entscheidung zu optionalen Technologien einholen, die zur Anzeige dieser Website nicht erforderlich sind. Unbedingt erforderliche Speicherung funktioniert in jedem Fall weiter, und eine Ablehnung schränkt weder das Studio noch Ihre lokalen Projekte ein.',
  'consent.banner.acceptAll': 'Alle akzeptieren',
  'consent.banner.rejectOptional': 'Optionale ablehnen',
  'consent.banner.customize': 'Einstellungen anpassen',
  'consent.banner.privacyLink': 'Datenschutzerklärung',
  'consent.banner.noticeLink': 'Impressum',
  'consent.dialog.title': 'Datenschutz- und Speichereinstellungen',
  'consent.dialog.intro':
    'Entscheiden Sie, welche optionalen Zwecke Koxora auf diesem Gerät nutzen darf. Optionale Zwecke bleiben ausgeschaltet, bis Sie sie einschalten, und Sie können Ihre Entscheidung jederzeit ändern oder widerrufen.',
  'consent.dialog.save': 'Auswahl speichern',
  'consent.dialog.acceptAll': 'Alle akzeptieren',
  'consent.dialog.rejectOptional': 'Optionale ablehnen',
  'consent.dialog.close': 'Schließen',
  'consent.dialog.alwaysActive': 'Immer aktiv',
  'consent.dialog.optional': 'Optional',
  'consent.dialog.purpose': 'Zweck',
  'consent.dialog.provider': 'Anbieter',
  'consent.dialog.storage': 'Speicherung und Dauer',
  'consent.dialog.legalBasis': 'Rechtsgrundlage',
  'consent.dialog.noOptional.title': 'Derzeit ist keine Einwilligung nötig',
  'consent.dialog.noOptional.body':
    'Diese Installation nutzt auf Ihrem Gerät ausschließlich unbedingt erforderliche Speicherung und keine optionale Analyse, Werbung oder eingebettete Fremddienste. Das Gesetz verlangt eine Einwilligung für das Speichern oder Auslesen von Informationen auf Ihrem Endgerät nur dort, wo dies für den von Ihnen gewünschten Dienst nicht unbedingt erforderlich ist. Koxora fragt deshalb nicht nach einer Entscheidung, die es nicht braucht. Ändert sich das, fragt dieser Dialog, bevor etwas Optionales geladen wird.',
  'consent.state.saved':
    'Ihre Auswahl wurde am {date} auf diesem Gerät gespeichert.',
  'consent.state.none':
    'Sie haben auf diesem Gerät noch keine Auswahl getroffen.',
  'consent.state.necessaryOnly':
    'Es wird ausschließlich unbedingt erforderliche Speicherung genutzt.',
  'consent.withdraw':
    'Einwilligung widerrufen und gespeicherte Auswahl löschen',
  'consent.withdrawDone':
    'Ihre gespeicherte Auswahl wurde auf diesem Gerät gelöscht.',
  'consent.category.necessary.name': 'Unbedingt erforderlich',
  'consent.category.necessary.description':
    'Nötig, um diese Website auszuliefern und Einstellungen zu merken, die Sie selbst vorgenommen haben. Nicht abschaltbar.',
  'consent.category.preferences.name': 'Komforteinstellungen',
  'consent.category.preferences.description':
    'Merkt sich optionale Bequemlichkeitseinstellungen über die von Ihnen ausdrücklich gesetzten hinaus.',
  'consent.category.statistics.name': 'Messung',
  'consent.category.statistics.description':
    'Datensparsame Messung der Seitennutzung, falls ein solcher Dienst jemals eingeführt wird.',
  'consent.category.media.name': 'Externe Medien',
  'consent.category.media.description':
    'Eingebettete Inhalte anderer Anbieter, etwa ein Videoplayer, der diesen Anbieter kontaktieren würde.',
  'consent.item.theme.name': 'Darstellungseinstellung',
  'consent.item.theme.purpose':
    'Speichert, ob Sie die helle oder dunkle Darstellung gewählt haben.',
  'consent.item.theme.storage':
    'Browserspeicher auf diesem Gerät, bis Sie ihn löschen',
  'consent.item.language.name': 'Sprachauswahl',
  'consent.item.language.purpose':
    'Speichert die Sprache, die Sie im Sprachmenü gewählt haben, damit die Adresse ohne Sprachangabe beim nächsten Besuch in dieser Sprache öffnet. Sie wird nur von dieser Website gelesen und enthält nichts außer „en“ oder „de“.',
  'consent.item.language.storage':
    'Eigenes Cookie und Browserspeicher auf diesem Gerät, ein Jahr ab Ihrer letzten Auswahl',
  'consent.item.consent.name': 'Datenschutz-Entscheidung',
  'consent.item.consent.purpose':
    'Speichert Ihre Datenschutz-Auswahl und deren Version, damit Sie nicht erneut gefragt werden.',
  'consent.item.consent.storage':
    'Browserspeicher auf diesem Gerät, bis Sie widerrufen',
  'consent.legalBasis.necessary':
    'Unbedingt erforderlich nach § 25 Abs. 2 Nr. 2 TDDDG; berechtigtes Interesse nach Art. 6 Abs. 1 lit. f DSGVO.',
  'consent.legalBasis.consent':
    'Einwilligung nach § 25 Abs. 1 TDDDG und Art. 6 Abs. 1 lit. a DSGVO.',
  'consent.openSettings': 'Datenschutz-Einstellungen öffnen',
  'consent.noScript':
    'Die Datenschutz-Einstellungen benötigen JavaScript im Browser. Diese Installation nutzt ausschließlich unbedingt erforderliche Speicherung, es gibt also nichts abzuschalten. Die Datenschutzerklärung beschreibt alles im Einzelnen.',

  'privacySettings.meta.title': 'Datenschutz-Einstellungen',
  'privacySettings.meta.description':
    'Prüfen und ändern Sie, was Koxora auf Ihrem Gerät behält: jeden Eintrag mit Zweck, Speicherort und Dauer sowie jeden optionalen Zweck.',
  'privacySettings.hero.eyebrow': 'Datenschutz-Einstellungen',
  'privacySettings.hero.title': 'Ihre Auswahl auf diesem Gerät',
  'privacySettings.hero.lead':
    'Alles, was Koxora auf diesem Gerät speichert, steht hier: mit Zweck, Speicherort und Dauer. Optionale Entscheidungen können Sie jederzeit ändern oder widerrufen.',
  'privacySettings.current.title': 'Aktueller Stand',
  'privacySettings.inventory.title': 'Was auf diesem Gerät gespeichert wird',
  'privacySettings.editor.title': 'Das Browser-Studio ist getrennt',
  'privacySettings.editor.body':
    'Browserspeicher gehört zu genau einer Adresse. Entscheidungen auf dieser Website gelten nicht für die Studio-Adresse, und das Studio hält seine Projekte in seiner eigenen Browser-Datenbank. Daten für eine Adresse zu löschen, berührt die andere nicht.',
  'privacySettings.link.privacy': 'Vollständige Datenschutzerklärung',

  'legalNotice.meta.title': 'Impressum',
  'legalNotice.meta.description':
    'Impressum für koxora.app: Anbieter, Kontaktadressen, inhaltliche Verantwortung, Streitschlichtung, Haftung und Urheberrecht.',
  'legalNotice.hero.eyebrow': 'Impressum',
  'legalNotice.hero.title': 'Impressum',
  'legalNotice.hero.lead':
    'Angaben gemäß § 5 des Digitale-Dienste-Gesetzes (DDG) für koxora.app und das Koxora-Browser-Studio.',
  'legalNotice.provider.title': 'Diensteanbieter',
  'legalNotice.provider.note':
    'Privatperson; bei der Anschrift handelt es sich um eine Postdienstadresse.',
  'legalNotice.contact.title': 'Kontakt',
  'legalNotice.contact.body':
    'Schriftliche Anfragen werden auf Deutsch oder Englisch beantwortet. Eine Telefonnummer wird nicht veröffentlicht; der Kontaktweg ist E-Mail.',
  'legalNotice.contact.legal': 'Rechtliche Anfragen',
  'legalNotice.contact.privacy': 'Datenschutzanfragen',
  'legalNotice.contact.support': 'Produkt- und Supportanfragen',
  'legalNotice.editorial.title': 'Verantwortlich für den Inhalt',
  'legalNotice.editorial.body':
    'Verantwortlich für journalistisch-redaktionelle Inhalte nach § 18 Abs. 2 des Medienstaatsvertrags (MStV) ist der oben genannte Diensteanbieter unter derselben Anschrift.',
  'legalNotice.vat.title': 'Umsatzsteuer',
  'legalNotice.vat.body':
    'Es wird keine Umsatzsteuer ausgewiesen, da die Kleinunternehmerregelung nach § 19 des Umsatzsteuergesetzes (UStG) angewendet wird. Eine Umsatzsteuer-Identifikationsnummer wurde nicht erteilt.',
  'legalNotice.dispute.title': 'Verbraucherstreitbeilegung',
  'legalNotice.dispute.body':
    'Der Diensteanbieter ist nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen (§ 36 VSBG). Die Europäische Kommission hat ihre Plattform zur Online-Streitbeilegung zum 20. Juli 2025 eingestellt.',
  'legalNotice.liability.title': 'Haftung für Inhalte',
  'legalNotice.liability.body':
    'Als Diensteanbieter sind wir nach §§ 7 bis 10 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Wir sind nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben unberührt; eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden entsprechender Rechtsverletzungen entfernen wir diese Inhalte unverzüglich.',
  'legalNotice.links.title': 'Haftung für Links',
  'legalNotice.links.body':
    'Diese Website enthält Links zu externen Websites, auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft; rechtswidrige Inhalte waren nicht erkennbar. Eine permanente inhaltliche Kontrolle ohne konkrete Anhaltspunkte einer Rechtsverletzung ist nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen entfernen wir derartige Links unverzüglich.',
  'legalNotice.copyright.title': 'Urheberrecht',
  'legalNotice.copyright.body':
    'Die durch den Betreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Beiträge Dritter sind als solche gekennzeichnet. Downloads und Kopien dieser Seite sind für den privaten, nicht kommerziellen Gebrauch gestattet. Der Koxora-Quellcode wird öffentlich entwickelt; die für ihn geltende Lizenz wird gemeinsam mit ihm im Repository veröffentlicht und geht für den Code vor. Solange dort keine Lizenz veröffentlicht ist, werden keine Nutzungsrechte am Code eingeräumt.',
  'legalNotice.project.title': 'Über dieses Projekt',
  'legalNotice.project.body':
    'Koxora ist ein Softwareprojekt in Entwicklung. Diese Website informiert darüber. Über sie kommt kein Vertrag zustande, es wird keine entgeltliche Leistung angeboten und derzeit keine herunterladbare Software verbreitet.',

  'privacyPolicy.meta.title': 'Datenschutzerklärung',
  'privacyPolicy.meta.description':
    'Wie Koxora mit personenbezogenen Daten umgeht: Verantwortlicher, Hosting, Speicherung auf Ihrem Gerät, Ihre Rechte und die Aufsichtsbehörde.',
  'privacyPolicy.hero.eyebrow': 'Datenschutz',
  'privacyPolicy.hero.title': 'Datenschutzerklärung',
  'privacyPolicy.hero.lead':
    'Diese Erklärung beschreibt, welche personenbezogenen Daten bei der Nutzung von koxora.app verarbeitet werden, auf welcher Rechtsgrundlage, wie lange und welche Rechte Sie haben. Sie nennt außerdem vorab, was für das Koxora-Browser-Studio gelten wird, das noch nicht veröffentlicht ist.',
  'privacyPolicy.version': 'Fassung {version}, zuletzt aktualisiert am {date}.',
  'privacyPolicy.scope.title': '1. Geltungsbereich',
  'privacyPolicy.scope.body':
    'Diese Erklärung gilt für die öffentliche Koxora-Website. Das Koxora-Browser-Studio ist noch nicht veröffentlicht; Abschnitt 7 nennt, was dafür gelten wird, sobald es unter einer eigenen Adresse betrieben wird, die einen eigenen, getrennten Browserspeicher hat. Diese Erklärung gilt nicht für andere Websites, auf die wir verlinken. Die Koxora-Desktop-Anwendung verarbeitet Ihre Daten ausschließlich auf Ihrem eigenen Gerät und übermittelt uns keine Projektdaten.',
  'privacyPolicy.controller.title': '2. Verantwortlicher',
  'privacyPolicy.controller.body':
    'Verantwortlicher für die Datenverarbeitung auf dieser Website im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:',
  'privacyPolicy.controller.contact': 'Datenschutzkontakt: {email}',
  'privacyPolicy.principles.title': '3. Die kurze Fassung',
  'privacyPolicy.principles.body':
    'Koxora ist local-first. Ihre Diagramme, Projekte und Dateien werden auf Ihrem Gerät verarbeitet und nicht an einen Koxora-Server übermittelt. Diese Website verwendet keine Analyse, kein Werbenetzwerk, keine fremden Schriftarten und keine Tracking-Cookies. Es bleiben die Verbindungsdaten, die jeder Webserver und jedes Content-Delivery-Netzwerk zur Auslieferung einer Seite verarbeiten muss, sowie eine kleine Menge Speicher auf Ihrem Gerät für Einstellungen, die Sie selbst treffen.',
  'privacyPolicy.logs.title': '4. Serverprotokolldaten',
  'privacyPolicy.logs.body':
    'Beim Aufruf einer Seite verarbeitet der Hosting-Anbieter die Daten, die Ihr Browser übermittelt: die angeforderte Adresse, Datum und Uhrzeit, die übertragene Datenmenge, die verweisende Adresse, Angaben zu Browser und Betriebssystem sowie die IP-Adresse. Diese Verarbeitung ist technisch erforderlich, um die Seite auszuliefern und Angriffe zu erkennen und abzuwehren.',
  'privacyPolicy.logs.basis':
    'Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse ist der sichere, stabile und nachvollziehbare Betrieb des Dienstes. Protokolldaten werden nur so lange aufbewahrt, wie es für diesen Zweck erforderlich ist, und danach gelöscht oder anonymisiert. Die genaue Speicherdauer ergibt sich aus der Konfiguration dieser Anbieter. Sie ist noch nicht gemessen und hier angegeben; sie wird in diese Erklärung aufgenommen, sobald das geschehen ist, und bis dahin können Sie den aktuellen Stand beim oben genannten Datenschutzkontakt erfragen.',
  'privacyPolicy.hosting.title': '5. Hosting und Auslieferung',
  'privacyPolicy.hosting.body':
    'Die Website wird in Deutschland von der Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, gehostet. Auslieferung, Zwischenspeicherung und Schutz vor Angriffen übernimmt Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA, das dabei die oben beschriebenen Verbindungsdaten verarbeitet. Beide Anbieter handeln als Auftragsverarbeiter nach Art. 28 DSGVO auf unsere Weisung.',
  'privacyPolicy.hosting.transfer':
    'Der Einsatz von Cloudflare kann eine Verarbeitung in den Vereinigten Staaten umfassen. Diese Übermittlung stützt sich auf die Standardvertragsklauseln der Europäischen Kommission und die Teilnahme des Anbieters am EU-US Data Privacy Framework. Eine Kopie der Garantien können Sie über den oben genannten Datenschutzkontakt anfordern.',
  'privacyPolicy.device.title': '6. Speicherung auf Ihrem Endgerät',
  'privacyPolicy.device.body':
    'Über die zur Anzeige nötigen Dateien hinaus speichert Koxora Informationen auf Ihrem Endgerät nur, wo dies für eine von Ihnen gewünschte Funktion unbedingt erforderlich ist oder wo Sie eingewilligt haben. Nach § 25 Abs. 2 Nr. 2 des Telekommunikation-Digitale-Dienste-Datenschutz-Gesetzes (TDDDG) ist für unbedingt erforderliche Speicherung keine Einwilligung nötig. Die aktuelle Installation dieser Website speichert Folgendes:',
  'privacyPolicy.device.note':
    'Diese Website nutzt derzeit keine optionale Analyse, keine Werbung und keine eingebetteten Fremddienste; deshalb wird kein Einwilligungsbanner angezeigt. Sollte sich das ändern, wird nichts Optionales geladen, bevor Sie zugestimmt haben, und Sie können Ihre Entscheidung in den Datenschutz-Einstellungen jederzeit ändern oder widerrufen.',
  'privacyPolicy.studio.title':
    '7. Das Browser-Studio, sobald es veröffentlicht ist',
  'privacyPolicy.studio.body':
    'Das gehostete Browser-Studio ist noch nicht verfügbar; nichts von dem hier Beschriebenen wird heute verarbeitet. Sobald es veröffentlicht ist, läuft es vollständig in Ihrem Browser: Projekte, Diagramme, importierte Dateien und die Einstellungen des Studios liegen dann in der Browser-Datenbank (IndexedDB) und im lokalen Speicher der Studio-Adresse, und die Anwendungsdateien werden zwischengespeichert, damit das Studio offline funktioniert. Nichts davon wird an uns übermittelt: Es gibt keinen Koxora-Projektserver, kein Konto und keinen Upload.',
  'privacyPolicy.studio.control':
    'Diese Daten liegen dann in Ihrer Hand: Ein Projekt lässt sich als portables .koxora-Archiv exportieren, und die Daten lassen sich jederzeit über die Browsereinstellungen für diese Adresse löschen. Browserspeicher ist an genau die Adresse gebunden, die ihn angelegt hat; Daten unter der Website-Adresse und unter der Studio-Adresse bleiben daher getrennt.',
  'privacyPolicy.studio.desktop':
    'Die Desktop-Anwendung speichert Projekte als Dateien in einem Verzeichnis auf Ihrem Rechner. Sie funktioniert ohne Koxora-Konto und übermittelt uns keine Projektinhalte.',
  'privacyPolicy.contactForm.title':
    '8. Kontakt per E-Mail und über das Formular',
  'privacyPolicy.contactForm.body':
    'Wenn Sie an eine der im Impressum genannten Adressen schreiben, verarbeiten wir Ihre E-Mail-Adresse, Ihre Nachricht und etwaige Anhänge, um Ihnen zu antworten. Die E-Mail wird auf selbst verwalteter Infrastruktur bei der IONOS SE, Elgendorfer Str. 57, 56410 Montabaur, betrieben.',
  'privacyPolicy.contactForm.basis':
    'Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO, soweit Ihre Anfrage einen Vertrag oder vorvertragliche Maßnahmen betrifft, sonst Art. 6 Abs. 1 lit. f DSGVO, unser berechtigtes Interesse an der Beantwortung von Anfragen. Nachrichten werden gelöscht, sobald die Anfrage erledigt ist und keine Aufbewahrungspflicht besteht.',
  'privacyPolicy.contactForm.form':
    'Wenn diese Website ein Kontaktformular anbietet, sendet es Ihre Eingaben — den Namen, falls Sie einen angegeben haben, die E-Mail-Adresse, die Kategorie, den Betreff und die Nachricht — an dasselbe Support-Postfach, über eine verschlüsselte Verbindung zum Mailserver. Mehr wird nicht erhoben: kein Tracking, kein fremder Formularanbieter, kein Captcha-Dienst und kein Newsletter. Das Formular ist der einzige Weg, auf dem diese Website etwas von Ihnen Eingegebenes übermittelt, und sie tut es nur, wenn Sie die Schaltfläche drücken.',
  'privacyPolicy.contactForm.storage':
    'Der Endpunkt führt keine Datenbank und behält keine Kopie Ihrer Nachricht: er übergibt die Nachricht an den Mailserver und vergisst sie. Zwei kurzlebige Werte werden aufbewahrt, in einer kleinen Datei auf demselben Server. Ein Einwegwert der Übermittlung wird zehn Minuten aufbewahrt, damit ein zweiter Druck auf die Schaltfläche nicht zwei Nachrichten sendet. Ein Einwegwert aus Ihrer Netzwerkadresse wird eine Stunde aufbewahrt, damit eine Flut gestoppt werden kann; er wird mit einem geheimen Schlüssel berechnet, der nur auf diesem Server existiert, lässt sich daher nicht in eine Adresse zurückrechnen, und die Adresse selbst wird nirgends festgehalten. Beide Werte werden nach Ablauf ihrer Frist automatisch entfernt, und keiner lässt sich in Ihre Nachricht zurückrechnen.',
  'privacyPolicy.contactForm.logs':
    'Ihr eigenes Protokoll hält je Übermittlung eine Zeile mit Zeitpunkt, Ergebnis und gewählter Kategorie fest. Es enthält keinen Namen, keine Adresse, keinen Betreff, keine Nachricht und keine Netzwerkadresse. Von da an ist Ihre Nachricht eine E-Mail im Support-Postfach, und die Abschnitte oben beschreiben, was dort mit ihr passiert.',
  'privacyPolicy.contactForm.accepted':
    'Wenn das Formular meldet, dass Ihre Nachricht angenommen wurde, bedeutet das: der Mailserver hat sie zur Zustellung übernommen. Mehr lässt sich von einer Website aus ehrlich nicht bestätigen; ob sie dann im Postfach angekommen ist, kann diese Seite nicht versprechen, und sie behauptet es auch nie.',
  'privacyPolicy.noTracking.title': '9. Was diese Website nicht tut',
  'privacyPolicy.noTracking.item1':
    'Keine Analyse-, Mess- oder Reichweitendienste.',
  'privacyPolicy.noTracking.item2':
    'Kein Werbenetzwerk, kein Profiling und keine automatisierte Entscheidungsfindung.',
  'privacyPolicy.noTracking.item3':
    'Keine fremden Schriftarten, Videoplayer, Karten oder Social-Media-Plugins; alle Inhalte werden von der Koxora-Adresse ausgeliefert.',
  'privacyPolicy.noTracking.item4':
    'Kein Konto, kein Newsletter und keine Nutzerprofile auf der öffentlichen Website.',
  'privacyPolicy.noTracking.item5':
    'Kein Upload und keine serverseitige Verarbeitung der Diagramme und Dateien, an denen Sie arbeiten.',
  'privacyPolicy.future.title': '10. Geplante Funktionen',
  'privacyPolicy.future.body':
    'Optionale Konten, Cloud-Synchronisation, Zusammenarbeit im Team, ein Marktplatz, KI-Unterstützung und vergleichbare Funktionen sind geplant, aber nicht umgesetzt; keine davon verarbeitet heute Daten. Bevor eine davon aktiviert wird, wird diese Erklärung aktualisiert, es werden die erforderlichen Vereinbarungen mit Auftragsverarbeitern geschlossen und, wo das Gesetz es verlangt, vorab Ihre Einwilligung eingeholt.',
  'privacyPolicy.rights.title': '11. Ihre Rechte',
  'privacyPolicy.rights.body':
    'Sie haben das Recht auf Auskunft über die zu Ihnen verarbeiteten personenbezogenen Daten (Art. 15 DSGVO), auf Berichtigung (Art. 16), Löschung (Art. 17) oder Einschränkung der Verarbeitung (Art. 18), auf Datenübertragbarkeit (Art. 20) sowie auf Widerspruch gegen eine Verarbeitung auf Grundlage eines berechtigten Interesses (Art. 21). Beruht eine Verarbeitung auf Ihrer Einwilligung, können Sie diese jederzeit mit Wirkung für die Zukunft widerrufen.',
  'privacyPolicy.rights.contact':
    'Zur Ausübung dieser Rechte schreiben Sie an {email}.',
  'privacyPolicy.authority.title': '12. Beschwerderecht',
  'privacyPolicy.authority.body':
    'Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren, insbesondere im Mitgliedstaat Ihres Aufenthaltsorts, Ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes. Die für den Verantwortlichen zuständige Behörde ist:',
  'privacyPolicy.authority.name':
    'Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)',
  'privacyPolicy.authority.address': 'Promenade 18, 91522 Ansbach',
  'privacyPolicy.changes.title': '13. Änderungen dieser Erklärung',
  'privacyPolicy.changes.body':
    'Diese Erklärung wird angepasst, wenn sich der Dienst ändert oder die Rechtslage es erfordert. Fassung und Datum oben kennzeichnen stets den aktuellen Stand.',
  'privacyPolicy.draft.title': 'Status dieses Dokuments',
  'privacyPolicy.draft.body':
    'Dieser Text beschreibt die geplante Installation der Koxora-Website und des Studios. Vor der Veröffentlichung prüft der Betreiber jede Aussage gegen die tatsächlich eingesetzten Dienste, einschließlich Speicherdauern, Auftragsverarbeitern und Aufsichtsbehörde, und lässt das Ergebnis prüfen. Bis dahin ist dieses Dokument vorbereiteter Inhalt und keine Bestätigung der Rechtskonformität.',

  'feature.shapes.title': 'Formen, Text und Verbindungen',
  'feature.shapes.body':
    'Rechtecke, abgerundete Rechtecke, Ellipsen, Rauten, Dreiecke, Sechsecke, Parallelogramme, Container, freier Text, Linien und Pfeile. Verbindungen docken an sichtbare Anschlusspunkte an oder finden ihren Ankerpunkt selbst und folgen den Formen, wenn Sie sie verschieben.',
  'feature.canvas.title': 'Eine Arbeitsfläche, die nicht im Weg steht',
  'feature.canvas.body':
    'Verschieben, zoomen, Inhalt einpassen sowie Raster und Einrasten mit einstellbarem Abstand an- oder abschalten. Mit gedrückter Alt-Taste lässt sich das Einrasten für eine einzelne Aktion umgehen.',
  'feature.editing.title': 'Direktes Bearbeiten',
  'feature.editing.body':
    'Klicken zum Auswählen, Aufziehen eines Rahmens für mehrere Elemente, Verschieben und Skalieren mit Griffen, Duplizieren, Ausrichten, Verteilen sowie Kopieren und Einfügen innerhalb der Arbeitsfläche.',
  'feature.history.title': 'Rückgängig und Wiederherstellen',
  'feature.history.body':
    'Jede Bearbeitung ist ein umkehrbarer Schritt. Der Verlauf ist je Seite begrenzt und gehört zur Sitzung, bläht die Projektdatei also nicht auf.',
  'feature.projects.title': 'Projekte auf Ihrem Gerät',
  'feature.projects.body':
    'Projekte anlegen, umbenennen und öffnen, automatisch auf Ihrem Gerät gespeichert. Ein vorheriger Stand bleibt erhalten, damit Sie einen schlechten Moment zurücknehmen können.',
  'feature.files.title': 'Portable .koxora-Dateien',
  'feature.files.body':
    'Ein Projekt als dokumentiertes Archiv exportieren, auf einem anderen Gerät wieder importieren oder als Kopie mit neuer Identität einlesen. Unbekannte Inhalte aus neueren Versionen bleiben erhalten statt verloren zu gehen.',
  'feature.offline.title': 'Funktioniert offline',
  'feature.offline.body':
    'Nach dem ersten Besuch startet und läuft das Browser-Studio ohne Netzverbindung. Kein Konto, keine Anmeldung, kein Warten auf einen Server.',
  'feature.typography.title': 'Text und Formatierung',
  'feature.typography.body':
    'Serifen-, serifenlose und dicktengleiche Schriftfamilien aus Ihrem System, Größen von 8 bis 96, fett, kursiv, unterstrichen, Farbe und Ausrichtung, angewendet auf eine Beschriftung als Ganzes.',
  'feature.languages.title': 'Englisch und Deutsch',
  'feature.languages.body':
    'Das gesamte Produkt und diese Website gibt es in beiden Sprachen, unabhängig vom Betriebssystem wählbar. Die Architektur ist auf weitere Sprachen vorbereitet.',
  'feature.themes.title': 'Hell und dunkel',
  'feature.themes.body':
    'Eine helle und eine dunkle Darstellung für Studio und Website, mit den Kontrasten und Fokusmarkierungen, die Tastaturnutzung braucht.',
  'feature.keyboard.title': 'Tastatur und Barrierefreiheit',
  'feature.keyboard.body':
    'Werkzeuge, Anschlusspunkte, Dialoge und Arbeitsfläche lassen sich mit der Tastatur bedienen, mit durchsuchbarer Kurzbefehlsübersicht in beiden Sprachen.',
  'feature.recovery.title': 'Speichern und Wiederherstellen',
  'feature.recovery.body':
    'Änderungen werden kurz nach dem Tippen auf Ihr Gerät geschrieben, und der vorherige Stand bleibt verfügbar, falls etwas schiefgeht.',
  'feature.pages.title': 'Seiten und Tabs je Projekt',
  'feature.pages.body':
    'Mehrere Diagramme und Seiten in einem Projekt, mit bearbeitbaren Tabs. Wird im aktuellen Studio-Meilenstein umgesetzt.',
  'feature.richText.title': 'Reichere Textbearbeitung',
  'feature.richText.body':
    'Formatierung innerhalb einer Beschriftung statt für die ganze Beschriftung, näher an dem, was ein Office-Programm bietet. Wird im aktuellen Studio-Meilenstein umgesetzt.',
  'feature.desktop.title': 'Desktop-Anwendungen',
  'feature.desktop.body':
    'Eine Desktop-Hülle für Linux, Windows und macOS liegt im Repository und läuft aus dem Quellcode. Signierte, betreute Installationspakete sind noch nicht veröffentlicht.',
  'feature.diagramTypes.title': 'Geführte Diagrammarten',
  'feature.diagramTypes.body':
    'Mindmaps, Flussdiagramme, Organigramme, UML, ER, BPMN, C4, Netzwerk, Gantt, Kanban und Wireframes mit Vorlagen und unterstütztem Layout. Heute zeichnen Sie frei mit Formen, Text und Verbindungen.',
  'feature.export.title': 'Export nach SVG, PNG und PDF',
  'feature.export.body':
    'Bild- und Dokumentexport zum Teilen und Drucken. Heute wird ein Projekt als .koxora-Archiv ausgetauscht.',
  'feature.import.title': 'Import aus anderen Werkzeugen',
  'feature.import.body':
    'Das Lesen von Diagrammdateien anderer Editoren, mit ehrlichem Bericht darüber, was übernommen werden konnte und was nicht.',
  'feature.data.title': 'Von Daten zu Bildern',
  'feature.data.body':
    'Tabellen aus CSV, XLSX und ODS importieren und daraus Diagramme und datengetriebene Darstellungen erzeugen.',
  'feature.collaboration.title': 'Gemeinsam arbeiten',
  'feature.collaboration.body':
    'Bearbeiten in Echtzeit, Anwesenheit, Kommentare und Gastlinks, so entworfen, dass Offline-Arbeit zusammengeführt statt ersetzt wird.',
  'feature.cloud.title': 'Optionale Cloud und Teams',
  'feature.cloud.body':
    'Ein optionaler Synchronisationsdienst mit Versionen, Teams und Freigaben für alle, die ihn möchten. Local-first ohne Konto bleibt der Standard.',
  'feature.ai.title': 'KI-Unterstützung',
  'feature.ai.body':
    'Unterstützung mit Ihrem eigenen API-Schlüssel oder einem lokalen Modell, mit Vorschau und Prüfung, bevor sich am Diagramm etwas ändert.',
  'feature.plugins.title': 'Plugins und Marktplatz',
  'feature.plugins.body':
    'Abgeschottete Erweiterungen, Formenbibliotheken, Themes und Vorlagen, mit Moderation und Signaturprüfung vor der Veröffentlichung.',
  'feature.selfHosting.title': 'Self-Hosting',
  'feature.selfHosting.body':
    'Eine dokumentierte Container-Installation für Teams, die die optionalen Dienste auf eigener Infrastruktur betreiben möchten.',
  'feature.mobile.title': 'Tablets und Smartphones',
  'feature.mobile.body':
    'Auf Berührung ausgelegtes Betrachten und Bearbeiten über das heute vorhandene responsive Layout hinaus.',

  'phase.0.title': 'Planung und Anforderungen',
  'phase.0.body':
    'Produktdefinition, 178 dokumentierte Anforderungen, Architektur und die Regeln, nach denen dieses Projekt gebaut wird.',
  'phase.1.title': 'Fundament',
  'phase.1.body':
    'Monorepo, gemeinsame Browser- und Desktop-Hülle, Lokalisierung, Themes, lokale Speicherung und kontinuierliche Integration.',
  'phase.2.title': 'Editor',
  'phase.2.body':
    'Arbeitsfläche, Formen, Text, Verbindungen, Auswahl, Bearbeitung, Verlauf, Projektdateien und Wiederherstellung. Seiten, Tabs und reichere Texte kommen gerade hinzu.',
  'phase.3.title': 'Daten und Export',
  'phase.3.body':
    'Tabellenimport, Diagramme sowie Export nach SVG, PNG, PDF und interaktivem HTML.',
  'phase.4.title': 'Diagrammvielfalt',
  'phase.4.body':
    'UML, ER, BPMN, C4, Netzwerk, Gantt, Kanban, Wireframes und Whiteboard-Abläufe.',
  'phase.5.title': 'KI und Plugins',
  'phase.5.body':
    'Unterstützung mit eigenen Schlüsseln oder lokalen Modellen und ein abgeschottetes Erweiterungssystem.',
  'phase.6.title': 'Cloud und Live-Teams',
  'phase.6.body':
    'Optionale Konten, Synchronisation, Verlauf, Rollen, Anwesenheit und Kommentare.',
  'phase.7.title': 'Community, Self-Hosting und Unternehmen',
  'phase.7.body':
    'Marktplatz, Moderation, Container-Installation, Richtlinien und zentrale Anmeldung.',
  'phase.8.title': 'Stabilisierung und Wachstum',
  'phase.8.body':
    'Barrierefreiheit, weitere Sprachen, Leistung, Verteilung und Härtung der Veröffentlichungen.',
  'phase.state.done': 'Abgenommen',
  'phase.state.active': 'In Arbeit',
  'phase.state.planned': 'Geplant',

  'peer.drawio.name': 'draw.io / diagrams.net',
  'peer.drawio.body':
    'Ein weit verbreiteter quelloffener Diagrammeditor mit Browser-, Desktop- und Self-Hosting-Optionen.',
  'peer.lucidchart.name': 'Lucidchart',
  'peer.lucidchart.body':
    'Eine kommerzielle Cloud-Suite für Diagramme mit großer Vorlagenbibliothek und Geschäftsintegrationen.',
  'peer.miro.name': 'Miro',
  'peer.miro.body':
    'Ein kollaboratives Online-Whiteboard, das auf Workshops und große gemeinsame Boards ausgelegt ist.',
  'peer.visio.name': 'Microsoft Visio',
  'peer.visio.body':
    'Eine lange etablierte professionelle Diagrammanwendung mit tiefer Schablonen- und Unternehmensintegration.',
  'peer.excalidraw.name': 'Excalidraw',
  'peer.excalidraw.body':
    'Ein quelloffenes Whiteboard, bekannt für schnelles, handgezeichnet wirkendes Skizzieren und einen fokussierten Funktionsumfang.',
  'compare.focus1.title': 'Ihre Daten bleiben Ihre',
  'compare.focus1.body':
    'Projekte liegen auf Ihrem Gerät in portablen Dateien, nicht in einem Konto, das Sie behalten müssen.',
  'compare.focus2.title': 'Offline ist ein vollwertiger Zustand',
  'compare.focus2.body':
    'Bearbeiten, Speichern, Exportieren und Importieren brauchen nie einen erreichbaren Server.',
  'compare.focus3.title': 'Ein Produkt auf jeder Plattform',
  'compare.focus3.body':
    'Browser-Studio und Desktop-Anwendung teilen denselben Editor-Kern und dasselbe Dateiformat.',
  'compare.focus4.title': 'Optionale Dienste bleiben optional',
  'compare.focus4.body':
    'Cloud, Zusammenarbeit und KI sind als Ergänzungen geplant, die Sie ignorieren können, nie als Eintrittspreis.',

  'structure.docs.body':
    'Anleitungen, Tutorials, Projektformat und Self-Hosting-Dokumentation.',
  'structure.download.body':
    'Browser-Studio, Desktop-Pakete, Veröffentlichungskanäle, Prüfsummen und Signaturen.',
  'structure.releases.body':
    'Versionen, Änderungsprotokolle, bekannte Probleme und Migrationshinweise.',

  'repoDoc.vision': 'Produktvision',
  'repoDoc.architecture': 'Architekturüberblick',
  'repoDoc.format': 'Projektformat',
  'repoDoc.localFirst': 'Local-first-Architektur',
  'repoDoc.decisions': 'Entscheidungsregister',
  'repoDoc.roadmap': 'Roadmap und Backlog',
  'repoDoc.security': 'Sicherheitsrichtlinie',
  'repoDoc.contributing': 'Beitragsleitfaden',

  'milestone.storage.title': 'Projekte und Dateien',
  'milestone.storage.body':
    'Projektmodell, Validierung, Migrationen, lokale Speicherung, Import, Export und Wiederherstellung.',
  'milestone.canvas.title': 'Die Arbeitsfläche',
  'milestone.canvas.body':
    'Navigation, Zoom, Raster, Einrasten, portable Ansichts- und Seiteneinstellungen sowie Leistungsmessungen.',
  'milestone.shapes.title': 'Formen, Text und Verbindungen',
  'milestone.shapes.body':
    'Grundformen, einfacher Text, Verbindungen, Gestaltung, Ankergeometrie und umkehrbare Bearbeitungsschritte.',
  'milestone.editing.title': 'Interaktives Bearbeiten',
  'milestone.editing.body':
    'Auswahl, Verschieben, Skalieren, direktes Einfügen, freie Linien und Pfeile, begrenzter Verlauf und Umbenennen.',

  'address.country': 'Deutschland',

  'og.imageAlt': 'Das Koxora-Logo neben den Worten „Ideen nehmen Form an“.',

  'home.preview.heading': 'Schauen Sie sich das Echte an',
  'home.preview.description':
    'Jedes Produktbild auf dieser Website ist ein Screenshot der aktuellen Entwicklungsversion, aufgenommen von einem automatisierten Lauf gegen die echte Anwendung. Keine Montagen, keine Retusche.',

  'localFirst.how.title': 'Wie Koxora mit Ihrer Arbeit umgeht',
  'localFirst.how.description':
    'Fünf Antworten auf die Fragen, die jedes Local-first-Produkt ehrlich beantworten muss: Wo die Daten liegen, was offline passiert, was Sie mitnehmen können, was ein Server dennoch sieht und woran der Browser Ihren Speicher bindet.',
  'consent.state.session':
    'Ihre Auswahl konnte auf diesem Gerät nicht gespeichert werden und gilt deshalb nur für diesen Besuch.',
  'consent.noScript.optional':
    'Die Datenschutz-Einstellungen benötigen JavaScript im Browser. Ohne JavaScript wird nichts Optionales geladen und keine Entscheidung gespeichert; Sie werden also nicht verfolgt, die Bedienelemente auf dieser Seite lassen sich jedoch nicht benutzen.',
  'privacyPolicy.device.note.optional':
    'Diese Website nutzt außerdem optionale Technologien, die nicht unbedingt erforderlich sind. Nichts Optionales wird geladen, bevor Sie zugestimmt haben, Ihre Entscheidung wird erst mit dem Treffen gespeichert, und Sie können sie jederzeit in den Datenschutz-Einstellungen ändern oder widerrufen.',
  'a11y.tableScroll':
    'Zur Seite scrollen, um alle Spalten dieser Tabelle zu sehen.',
  'a11y.languageNavigationFooter': 'Sprache, im Fußbereich',
  'cta.moreAbout': 'Mehr über {topic}',
  'nav.themeToLight': 'Zur hellen Darstellung wechseln',
  'nav.themeToDark': 'Zur dunklen Darstellung wechseln',
  'project.statusSummary.published':
    'Koxora Studio ist eine funktionierende technische Vorschau. Es gibt noch keine öffentliche Veröffentlichung und keinen Download.',
  'project.statusMilestoneValue.published':
    'Studio-Phase 2.4 zusammengeführt \u00b7 Studio 2.5 in Arbeit',
  'legalNotice.contact.security': 'Erstkontakt bei einem Sicherheitsproblem',

  'nav.contact': 'Kontakt',
  'contact.meta.title': 'Koxora kontaktieren',
  'contact.meta.description':
    'Frage stellen, Rückmeldung geben, Problem melden. Das Formular erreicht das Koxora-Support-Postfach; die Adresse ist ebenfalls veröffentlicht.',
  'contact.hero.eyebrow': 'Kontakt',
  'contact.hero.title': 'Schreiben Sie dem Projekt',
  'contact.hero.lead':
    'Fragen, Rückmeldungen und Problemmeldungen erreichen dasselbe Postfach. Das Formular unten schickt Ihre Nachricht dorthin; wenn Sie lieber Ihr eigenes Mailprogramm nutzen, ist die Adresse ebenfalls veröffentlicht.',
  'contact.form.title': 'Nachricht senden',
  'contact.form.intro':
    'Nötig sind nur die Adresse und die Nachricht. Ein Name hilft, wenn Sie damit angesprochen werden möchten.',
  'contact.field.name': 'Name',
  'contact.field.name.hint':
    'Optional. Nur damit eine Antwort Sie ansprechen kann.',
  'contact.field.email': 'E-Mail-Adresse',
  'contact.field.email.hint':
    'Nötig für eine Antwort. Sie wird dafür und für nichts anderes verwendet.',
  'contact.field.category': 'Worum geht es?',
  'contact.field.subject': 'Betreff',
  'contact.field.message': 'Nachricht',
  'contact.field.message.hint': 'Bis zu {max} Zeichen.',
  'contact.field.optional': 'optional',
  'contact.field.required': 'erforderlich',
  'contact.category.general': 'Allgemeine Anfrage',
  'contact.category.feedback': 'Rückmeldung',
  'contact.category.support': 'Support',
  'contact.category.bug': 'Fehler melden',
  'contact.honeypot.label': 'Website',
  'contact.submit': 'Nachricht senden',
  'contact.submit.busy': 'Wird gesendet …',
  'contact.error.required': 'Bitte füllen Sie dieses Feld aus.',
  'contact.error.tooShort': 'Das ist kürzer, als das Formular annimmt.',
  'contact.error.tooLong': 'Das ist länger, als das Formular annimmt.',
  'contact.error.email':
    'Bitte geben Sie genau eine einfache E-Mail-Adresse ein.',
  'contact.error.category': 'Bitte wählen Sie eine der Möglichkeiten.',
  'contact.error.controlCharacter':
    'Bitte entfernen Sie Zeilenumbrüche und Sonderzeichen aus diesem Feld.',
  'contact.status.invalid':
    'Die Nachricht wurde nicht gesendet. Bitte korrigieren Sie die oben markierten Felder.',
  'contact.status.accepted':
    'Ihre Nachricht wurde zur Zustellung angenommen. Sie ist an den Mailserver übergeben; ein Mensch liest sie, sobald sie ankommt.',
  'contact.status.duplicate':
    'Diese Nachricht war bereits angenommen, sie wurde also nicht ein zweites Mal gesendet.',
  'contact.status.rejected':
    'Das Formular hat diese Übermittlung abgelehnt. Wenn Sie sehr schnell ausgefüllt oder die Seite lange offen gelassen haben, laden Sie sie bitte neu und versuchen es erneut.',
  'contact.status.rateLimited':
    'Von hier wurden bereits mehrere Nachrichten gesendet. Bitte warten Sie eine Weile oder schreiben Sie direkt an {email}.',
  'contact.status.undelivered':
    'Die Nachricht konnte nicht übergeben werden. Es wurde nichts gesendet, es geht also nichts verloren: bitte später erneut versuchen oder direkt an {email} schreiben.',
  'contact.status.offline':
    'Die Nachricht konnte nicht gesendet werden. Bitte prüfen Sie Ihre Verbindung oder schreiben Sie direkt an {email}.',
  'contact.fallback.title': 'Oder schreiben Sie selbst eine Mail',
  'contact.fallback.body':
    'Dasselbe Postfach ist direkt unter {email} erreichbar. Dieser Weg ist auch der richtige, wenn Sie kein Formular ausfüllen möchten oder das Formular bei Ihnen nicht funktioniert.',
  'contact.security.title': 'Ein Sicherheitsproblem gehört woandershin',
  'contact.security.body':
    'Bitte senden Sie Einzelheiten zu einer Schwachstelle nicht über dieses Formular: es erreicht ein gewöhnliches Postfach. Die Sicherheitsrichtlinie sagt, was zu senden ist, wohin und was Sie erwarten können.',
  'contact.security.link': 'Sicherheitsrichtlinie lesen',
  'contact.privacy.title': 'Was mit Ihren Angaben passiert',
  'contact.privacy.body':
    'Name, Adresse, Betreff und Nachricht, die Sie eingeben, werden an das Koxora-Support-Postfach gesendet, damit Ihre Anfrage beantwortet werden kann. Sie werden für nichts anderes verwendet, nicht für Werbung weitergegeben, und es gibt keinen Newsletter, für den man angemeldet würde. Die Datenschutzerklärung beschreibt die Verarbeitung, die Rechtsgrundlage und wie lange die Mail aufbewahrt wird.',
  'contact.privacy.link': 'Datenschutzerklärung',
  'contact.unconfigured.title': 'Das Formular ist hier nicht eingeschaltet',
  'contact.unconfigured.body':
    'Für diese Installation ist kein Versanddienst konfiguriert, deshalb wird kein Formular gezeigt: ein Formular, das nirgends ankommt, wäre schlechter als eine Adresse. Schreiben Sie stattdessen an {email}.',
  'contact.noscript':
    'Das Formular funktioniert ohne JavaScript: es wird als gewöhnliches Formular gesendet, und Sie landen auf einer Seite, die sagt, was passiert ist. Mit JavaScript bleiben Sie stattdessen auf dieser Seite.',
  'contactSent.meta.title': 'Nachricht angenommen',
  'contactSent.meta.description':
    'Ihre Nachricht wurde zur Zustellung an das Koxora-Support-Postfach angenommen.',
  'contactSent.hero.eyebrow': 'Kontakt',
  'contactSent.hero.title': 'Zur Zustellung angenommen',
  'contactSent.hero.lead':
    'Der Mailserver hat Ihre Nachricht übernommen. Ein Mensch liest sie, sobald sie im Postfach ankommt; für Sie ist nichts weiter zu tun.',
  'contactSent.body':
    'Keine Fassung dieser Seite enthält Ihre Nachricht, und es wird keine Bestätigungsmail versendet; in Ihrem Postfach kommt also nichts weiter an, bis jemand antwortet.',
  'contactSent.back': 'Zurück zur Kontaktseite',
  'contactProblem.meta.title': 'Die Nachricht wurde nicht gesendet',
  'contactProblem.meta.description':
    'Etwas hat die Übergabe der Nachricht verhindert. Es wurde nichts gesendet, und die E-Mail-Adresse ist ebenfalls veröffentlicht.',
  'contactProblem.hero.eyebrow': 'Kontakt',
  'contactProblem.hero.title': 'Die Nachricht wurde nicht gesendet',
  'contactProblem.hero.lead':
    'Es wurde nichts übergeben, es ist also nichts halb gesendet. Eines von wenigen Dingen ist passiert, und alle lassen sich erneut versuchen.',
  'contactProblem.reason.invalid':
    'Ein Feld war leer, zu kurz, zu lang oder enthielt Zeichen, die das Formular nicht annimmt. Gehen Sie zurück, dann markiert der Browser, was zu ändern ist.',
  'contactProblem.reason.rateLimited':
    'Von dieser Verbindung wurden bereits mehrere Nachrichten gesendet. Eine Weile warten oder direkt schreiben funktioniert beides.',
  'contactProblem.reason.undelivered':
    'Der Mailserver hat die Nachricht nicht übernommen. Das liegt auf unserer Seite, und ein späterer Versuch hilft meist.',
  'contactProblem.back': 'Zurück zum Formular',

  'cmp.status.supported': 'Unterstützt',
  'cmp.status.supported.definition':
    'Eine offizielle Seite nennt die Funktion für das, was betrachtet wurde.',
  'cmp.status.limited': 'Eingeschränkt oder tarifabhängig',
  'cmp.status.limited.definition':
    'Vorhanden, aber nur in einem bestimmten Tarif, einer bestimmten Edition oder Situation, die die Antwort benennt.',
  'cmp.status.notSupported': 'Nicht unterstützt',
  'cmp.status.notSupported.definition':
    'Eine offizielle Seite sagt, dass es für das Betrachtete nicht verfügbar ist.',
  'cmp.status.planned': 'Geplant',
  'cmp.status.planned.definition':
    'Dokumentierter Koxora-Umfang, der nicht umgesetzt ist. Er wird nie als verfügbar dargestellt.',
  'cmp.status.unknown': 'Nicht geprüft',
  'cmp.status.unknown.definition':
    'Für diese Prüfung wurde keine offizielle Aussage gefunden und gelesen. Das bedeutet nicht, dass die Funktion fehlt.',
  'cmp.status.info': 'Angaben',
  'cmp.status.info.definition':
    'Eine Frage, die ein Ja oder Nein nicht beantworten würde; der Eintrag beschreibt, was gefunden wurde.',
  'cmp.group.independence': 'Unabhängigkeit',
  'cmp.group.work': 'Zeichnen und Dateien',
  'cmp.group.together': 'Teams und Dienste',
  'cmp.group.cost': 'Lizenz und Preis',
  'cmp.dim.offline.label': 'Funktioniert offline',
  'cmp.dim.offline.description':
    'Ob Sie weiterarbeiten können, wenn die Verbindung abbricht oder nie bestand.',
  'cmp.dim.onDevice.label': 'Ihre Arbeit bleibt auf Ihrem Gerät',
  'cmp.dim.onDevice.description':
    'Ob die Diagramme auf Ihrem eigenen Rechner in Ihren eigenen Dateien liegen statt nur in einem Anbieterkonto.',
  'cmp.dim.withoutAccount.label': 'Nutzbar ohne Konto',
  'cmp.dim.withoutAccount.description':
    'Ob Sie etwas zeichnen können, bevor Sie sich registrieren.',
  'cmp.dim.desktop.label': 'Desktop-Anwendung',
  'cmp.dim.desktop.description':
    'Ob es eine Anwendung zum Installieren gibt und für welche Betriebssysteme.',
  'cmp.dim.diagramTypes.label': 'Diagrammtypen',
  'cmp.dim.diagramTypes.description':
    'Für welche Arten von Diagrammen der Editor gebaut ist.',
  'cmp.dim.importExport.label': 'Import und Export',
  'cmp.dim.importExport.description':
    'Welche Formate hinein- und hinausgehen und ob Ihre Arbeit wieder herauskommt.',
  'cmp.dim.collaboration.label': 'Zusammenarbeit',
  'cmp.dim.collaboration.description':
    'Gemeinsames Bearbeiten, Kommentare und Teilen mit anderen Menschen.',
  'cmp.dim.ai.label': 'Assistenzfunktionen',
  'cmp.dim.ai.description': 'Generierte Inhalte oder ein Assistent im Editor.',
  'cmp.dim.integration.label': 'Integrationen und Erweiterungen',
  'cmp.dim.integration.description':
    'Verbindungen zu anderen Werkzeugen und ob der Editor eingebettet oder erweitert werden kann.',
  'cmp.dim.licence.label': 'Lizenz- und Preismodell',
  'cmp.dim.licence.description':
    'Wie das Produkt lizenziert und bezahlt wird. Beträge stehen hier nicht, weil sie sich ändern und je nach Region und Währung unterschiedlich sind.',
  'cmp.product.koxora.description':
    'Ein local-first Studio für Diagramme, offen entwickelt.',
  'cmp.product.koxora.examined':
    'Der zusammengeführte Entwicklungsstand des öffentlichen Repositories. Es gibt keine öffentliche Veröffentlichung, aus dieser Spalte lässt sich heute also nichts installieren.',
  'cmp.product.drawio.description':
    'Ein weit verbreiteter Diagrammeditor, im Browser und als Desktop-Anwendung, mit Integrationen in andere Werkzeuge.',
  'cmp.product.drawio.examined':
    'Die offizielle Produktseite und das Repository der Desktop-Anwendung.',
  'cmp.product.excalidraw.description':
    'Ein quelloffener Editor im handgezeichneten Stil, mit einer gehosteten Version und einem bezahlten Dienst darum.',
  'cmp.product.excalidraw.examined':
    'Das Projekt-Repository und die Produktseite von Excalidraw+.',
  'cmp.product.lucidchart.description':
    'Ein browserbasiertes Diagrammprodukt für Teams, mit Tarifen von einer kostenlosen Stufe aufwärts.',
  'cmp.product.lucidchart.examined':
    'Die veröffentlichten Hilfeartikel zur Offline-Bearbeitung und zu den Systemanforderungen sowie die Preisseite.',
  'cmp.product.miro.description':
    'Ein gemeinsames Whiteboard für Workshops und Planung, unter anderem zum Zeichnen von Diagrammen.',
  'cmp.product.miro.examined':
    'Die veröffentlichte Preisseite und die Downloadseite der Anwendungen.',
  'cmp.product.visio.description':
    'Das lange etablierte Diagrammprodukt von Microsoft, verkauft innerhalb von Microsoft-365-Tarifen und als Einmalkauf.',
  'cmp.product.visio.examined':
    'Der veröffentlichte Tarifvergleich und der Versions- und Funktionsvergleich im Microsoft-Support.',
  'cmp.offline.koxora':
    'Local-first von Anfang an. Der Entwicklungsstand läuft im Browser und braucht nach dem Laden keinen Server, und Projekte bleiben auf dem Gerät.',
  'cmp.offline.drawio':
    'Die Desktop-Anwendung wird von ihren Entwicklern als vollständig vom Internet isoliert beschrieben, abgesehen von einer täglichen Aktualisierungsprüfung, die abgeschaltet werden kann.',
  'cmp.offline.excalidraw':
    'Der gehostete Editor ist als progressive Web-App ausgewiesen, die offline funktioniert und automatisch in den Browser speichert.',
  'cmp.offline.lucidchart':
    'Offline-Bearbeitung wird in Chrome, Firefox und Edge auf macOS, Windows und Linux in allen Tarifen angeboten. Neue Dokumente lassen sich offline nicht anlegen, Echtzeit-Zusammenarbeit braucht eine Verbindung, die Dokumente müssen vor dem Verbindungsverlust geöffnet sein, und ein privates Fenster behält die Änderungen nicht.',
  'cmp.offline.miro':
    'Desktop-Anwendungen sind veröffentlicht, aber für diese Prüfung wurde keine offizielle Aussage zur Offline-Nutzung gefunden und gelesen.',
  'cmp.offline.visio':
    'Offline-Arbeit und Unterstützung lokaler Dateien sind für die Desktop-Anwendung genannt, die Visio Plan 2 oder eine Desktop-Edition als Einmalkauf voraussetzt. Die reinen Web-Varianten sind ohne beides aufgeführt.',
  'cmp.onDevice.koxora':
    'Projekte liegen im Browserspeicher Ihres eigenen Geräts und lassen sich in Projektdateien schreiben und daraus zurücklesen. Kein Koxora-Server erhält sie, weil es keinen gibt.',
  'cmp.onDevice.drawio':
    'Die Entwickler geben an, keinen Zugriff auf Ihre Diagramme zu haben: der Online-Editor nutzt Speicher, den Sie selbst mitbringen, und die Desktop-Anwendung speichert in lokale Dateien.',
  'cmp.onDevice.excalidraw':
    'Der gehostete Editor speichert automatisch in den Browser, und eine Zeichnung lässt sich als offene JSON-Datei speichern.',
  'cmp.onDevice.lucidchart':
    'Dokumente liegen im Lucid-Dienst. Die Offline-Funktion beschreibt einen Browser-Zwischenspeicher von etwa zehn Megabyte statt lokaler Dateien; darüber hinaus wurde für diese Prüfung nichts belegt.',
  'cmp.onDevice.miro':
    'Für diese Prüfung wurde keine offizielle Aussage dazu gefunden und gelesen, wo Boards liegen oder ob sie als lokale Dateien behalten werden können.',
  'cmp.onDevice.visio':
    'Unterstützung lokaler Dateien ist für die Desktop-Anwendung genannt, die Plan 2 oder eine Edition als Einmalkauf voraussetzt. Das lokale Speichern eines Diagramms als PNG oder JPEG ist für die Microsoft-365-Varianten aufgeführt.',
  'cmp.withoutAccount.koxora':
    'Keine Registrierung und kein Konto, das man anlegen könnte: der Editor hat überhaupt keine Anmeldung.',
  'cmp.withoutAccount.drawio':
    'Die offizielle Startseite gibt an, dass kein Konto und keine Registrierung nötig sind.',
  'cmp.withoutAccount.excalidraw':
    'Der kostenlose Editor wird als ohne Konto nutzbar beschrieben. Excalidraw+ ist eine bezahlte Erweiterung, und deren Testphase setzt eine Anmeldung voraus.',
  'cmp.withoutAccount.lucidchart':
    'Für diese Prüfung wurde keine offizielle Aussage zur Nutzung des Editors ohne Konto gefunden und gelesen.',
  'cmp.withoutAccount.miro':
    'Für diese Prüfung wurde keine offizielle Aussage dazu gefunden und gelesen, ob ein Board ohne Konto geöffnet werden kann.',
  'cmp.withoutAccount.visio':
    'Microsoft gibt an, dass der Webzugang ein Microsoft-365-Geschäfts- oder Schulkonto braucht und dass persönliche Identitäten wie outlook.com nicht unterstützt werden. Die Desktop-Anwendung braucht eine zugewiesene Lizenz.',
  'cmp.desktop.koxora':
    'Ein Desktop-Build für Linux, Windows und macOS ist dokumentierter Produktumfang und nicht umgesetzt. Es gibt keinen Download.',
  'cmp.desktop.drawio':
    'Installationspakete sind veröffentlicht für Windows, darunter ein ARM64- und ein portabler Build, für Linux als AppImage, deb und rpm sowie über die Snap- und Flatpak-Stores, und für macOS.',
  'cmp.desktop.excalidraw':
    'Das Repository dokumentiert die gehostete Web-Anwendung, die es als installierbar und offline nutzbar ausweist. Zu einer offiziellen Desktop-Anwendung wurde für diese Prüfung nichts belegt.',
  'cmp.desktop.lucidchart':
    'Die veröffentlichten Systemanforderungen beschreiben unterstützte Browser und die Betriebssysteme, auf denen sie laufen. Zu einer Desktop-Anwendung wurde für diese Prüfung nichts belegt.',
  'cmp.desktop.miro':
    'Desktop-Anwendungen werden für macOS angeboten, getrennt für Apple Silicon und Intel, sowie für Windows, auch über den Microsoft Store.',
  'cmp.desktop.visio':
    'Die Desktop-Anwendung ist für Visio Plan 2 und für die Editionen als Einmalkauf aufgeführt. Visio Plan 1 und Visio in Microsoft 365 sind als reine Web-Varianten aufgeführt.',
  'cmp.diagramTypes.koxora':
    'Der zusammengeführte Stand zeichnet Formen, einfachen Text und Verbindungen mit sichtbaren Ports. Der breitere Katalog an Diagrammfamilien ist geplant, und die Funktionsseite benennt die heutigen Grenzen.',
  'cmp.diagramTypes.drawio':
    'Für diese Prüfung nicht belegt. Die offiziellen Formbibliotheken sind umfangreich; welche Familien sie abdecken, wurde nicht gegen eine einzelne offizielle Seite bestätigt.',
  'cmp.diagramTypes.excalidraw':
    'Für diese Prüfung nicht belegt, abgesehen davon, dass sich das Projekt selbst als virtuelles Whiteboard im handgezeichneten Stil beschreibt.',
  'cmp.diagramTypes.lucidchart': 'Für diese Prüfung nicht belegt.',
  'cmp.diagramTypes.miro': 'Für diese Prüfung nicht belegt.',
  'cmp.diagramTypes.visio':
    'Microsoft führt das Ansehen und Bearbeiten von Dateien auf, die mit Visio 2000 und später erstellt wurden, und zwar für alle Microsoft-365-Varianten. Der vollständige Satz an Schablonen je Tarif wurde für diese Prüfung nicht belegt.',
  'cmp.importExport.koxora':
    'Projektarchive lassen sich schreiben und lesen, und ein Projekt lässt sich daraus wiederherstellen. Im zusammengeführten Stand gibt es keinen Bildexport und keinen Import aus anderen Werkzeugen; die Funktionsseite sagt das ebenfalls.',
  'cmp.importExport.drawio': 'Für diese Prüfung nicht belegt.',
  'cmp.importExport.excalidraw':
    'Eine Zeichnung lässt sich als offene JSON-Datei exportieren, die das Projekt als eigenes Format beschreibt.',
  'cmp.importExport.lucidchart': 'Für diese Prüfung nicht belegt.',
  'cmp.importExport.miro': 'Für diese Prüfung nicht belegt.',
  'cmp.importExport.visio':
    'Das lokale Speichern eines Diagramms als PNG oder JPEG ist für die Microsoft-365-Varianten aufgeführt, ebenso das Ansehen und Bearbeiten von Dateien, die mit Visio 2000 und später erstellt wurden.',
  'cmp.collaboration.koxora':
    'Gemeinsames Bearbeiten ist dokumentierter Produktumfang und nicht umgesetzt. Nichts auf dieser Website stellt es als verfügbar dar.',
  'cmp.collaboration.drawio': 'Für diese Prüfung nicht belegt.',
  'cmp.collaboration.excalidraw':
    'Das Projekt beschreibt sich selbst als kollaborativ und Ende-zu-Ende verschlüsselt.',
  'cmp.collaboration.lucidchart':
    'Echtzeit-Zusammenarbeit ist als Funktion des Produkts genannt und als eine, die eine Verbindung braucht.',
  'cmp.collaboration.miro':
    'Boards werden standardmäßig mit den Mitgliedern eines Teams geteilt. Im kostenlosen Tarif lassen sich unbegrenzt Boards anlegen, bearbeitbar bleiben aber nur die drei neuesten, und es gibt keine Besucher- oder Gastrollen.',
  'cmp.collaboration.visio': 'Für diese Prüfung nicht belegt.',
  'cmp.ai.koxora':
    'Optionale Assistenz ist dokumentierter Produktumfang und nicht umgesetzt. Sie ist als optional geplant, ein Koxora ohne sie bleibt also vollständig.',
  'cmp.ai.drawio': 'Für diese Prüfung nicht belegt.',
  'cmp.ai.excalidraw':
    'Generative Funktionen und eine Schnittstelle, über die ein Agent in einen Arbeitsbereich zeichnen kann, sind als Teil des bezahlten Angebots Excalidraw+ aufgeführt.',
  'cmp.ai.lucidchart': 'Für diese Prüfung nicht belegt.',
  'cmp.ai.miro':
    'Assistenz wird mit einem tarifabhängigen Guthaben angeboten; der kostenlose Tarif ist als eingeschränkter Test aufgeführt, den die Fragen zur Preisgestaltung mit zehn Guthaben pro Monat beschreiben.',
  'cmp.ai.visio': 'Für diese Prüfung nicht belegt.',
  'cmp.integration.koxora':
    'Integrationen und eine Plugin-Schnittstelle sind dokumentierter Produktumfang und nicht umgesetzt.',
  'cmp.integration.drawio':
    'Die offizielle Startseite nennt Google Drive, Docs und Slides, Microsoft SharePoint, OneDrive und Teams, Atlassian Confluence und Jira, GitHub-Repositories und Markdown, eine Editor-Erweiterung für VS Code und eine Erweiterung für Notion.',
  'cmp.integration.excalidraw':
    'Der Editor ist als Paket veröffentlicht, das andere Anwendungen einbetten können, und das Projekt ist quelloffen, also erweiterbar.',
  'cmp.integration.lucidchart': 'Für diese Prüfung nicht belegt.',
  'cmp.integration.miro':
    'Die Preisseite nennt mehr als 250 Anwendungen, verfügbar ab dem kostenlosen Tarif.',
  'cmp.integration.visio': 'Für diese Prüfung nicht belegt.',
  'cmp.licence.koxora':
    'Der Quellcode ist öffentlich. Eine Lizenz ist noch nicht veröffentlicht, es werden also bis dahin keine Rechte eingeräumt, und es gibt keinen Preis, weil es keine Veröffentlichung gibt. Das Impressum sagt dasselbe.',
  'cmp.licence.drawio':
    'Die Desktop-Anwendung ist unter der GPL Version 3 veröffentlicht und frei nutzbar. Der Online-Editor verlangt kein Konto.',
  'cmp.licence.excalidraw':
    'Der Editor ist unter der MIT-Lizenz veröffentlicht und wird als dauerhaft kostenlos beschrieben. Excalidraw+ ist ein bezahltes Angebot mit Testphase.',
  'cmp.licence.lucidchart':
    'Ein Abonnementprodukt mit einer kostenlosen Stufe. Die Tarifnamen, ihre Grenzen und die Beträge stehen auf der offiziellen Preisseite und werden hier nicht wiedergegeben, weil sie sich ändern und je nach Region unterschiedlich sind.',
  'cmp.licence.miro':
    'Die Tarife Free, Starter, Business und Enterprise. Im kostenlosen Tarif lassen sich unbegrenzt Boards anlegen, bearbeitbar bleiben aber nur die drei neuesten.',
  'cmp.licence.visio':
    'Visio in Microsoft 365, Visio Plan 1 und Visio Plan 2 sind Abonnements, und zusätzlich gibt es Desktop-Editionen als Einmalkauf. Nur Plan 2 und die Einmalkauf-Editionen sind mit der Desktop-Anwendung aufgeführt.',
  'cmp.table.title': 'Zehn Fragen, sechs Produkte',
  'cmp.table.description':
    'Jede Antwort sagt, was gefunden wurde, und verweist auf die Seite, die es belegt. Mit den Filtern können Sie sich eine Frage oder ein Produkt einzeln ansehen.',
  'cmp.table.caption':
    'Koxora im Vergleich mit fünf anderen Diagrammwerkzeugen',
  'cmp.table.question': 'Frage',
  'cmp.filter.topics': 'Diese Themen zeigen',
  'cmp.filter.products': 'Diese Produkte zeigen',
  'cmp.filter.status':
    '{rows} von {total} Fragen und {columns} von {products} Produkten werden gezeigt.',
  'cmp.filter.reset': 'Wieder alles zeigen',
  'cmp.filter.hint':
    'Der Filter ist eine Bequemlichkeit. Ohne ihn und ohne JavaScript wird die ganze Tabelle gezeigt.',
  'cmp.legend.title': 'Was die Antworten bedeuten',
  'cmp.sources.title': 'Quellen',
  'cmp.sources.note':
    'Jede Seite in dieser Liste wurde am angegebenen Datum gelesen, und es wird hier nichts behauptet, was über diese Seiten hinausgeht. Wenn sich etwas geändert hat oder etwas falsch ist, schreiben Sie an {email}, dann wird es korrigiert.',
  'cmp.sources.checkedOn': 'Gelesen am {date}',
  'cmp.checked': 'Dieser Vergleich wurde zuletzt am {date} geprüft.',
  'cmp.disclaimer.title': 'Was dieser Vergleich nicht ist',
  'cmp.disclaimer.body':
    'Er ist vom Koxora-Projekt geschrieben, lesen Sie ihn also als solchen. Er behauptet nicht, Koxora sei besser: er beantwortet zehn Fragen und zeigt, woher jede Antwort kommt. Mehrere dieser Produkte können Dinge, die Koxora nicht kann, und die Tabelle sagt das. Produktnamen und Marken gehören ihren Inhabern und werden zur Bezeichnung der Produkte verwendet, nicht um eine Empfehlung zu suggerieren.',
  'cmp.pages.title': 'Ein Werkzeug auf einmal',
  'cmp.pages.note':
    'Kürzere Seiten, die dieselben Fragen für ein einzelnes Produkt beantworten, mit Hinweisen, welches Werkzeug zu welcher Aufgabe passt.',
  'cmp.page.hero.eyebrow': 'Vergleich',
  'cmp.page.table.title': 'Nebeneinander',
  'cmp.page.choose.title': 'Was zu welcher Aufgabe passt',
  'cmp.page.strengths.title': 'Was {product} gut macht',
  'cmp.page.koxora.title': 'Was Koxora anders macht',
  'cmp.page.chooseOther': '{product} passt, wenn',
  'cmp.page.chooseKoxora': 'Koxora passt, wenn',
  'cmp.page.full': 'Alle sechs Produkte, alle zehn Fragen',
  'cmp.page.drawio.meta.title': 'Koxora im Vergleich mit draw.io',
  'cmp.page.drawio.meta.description':
    'draw.io und Koxora nebeneinander: Offline-Nutzung, wo die Dateien liegen, Konten, Desktop-Anwendungen und Lizenzen, jeweils mit Quelle und Prüfdatum.',
  'cmp.page.drawio.hero.title': 'Koxora und draw.io',
  'cmp.page.drawio.hero.lead':
    'draw.io ist dem am nächsten, was Koxora werden will, und es ist bereits fertig. Diese Seite sagt, wo sich beide unterscheiden, mit einer Quelle für jede Aussage über draw.io.',
  'cmp.page.drawio.strengths.body':
    'Die Desktop-Anwendung wird von ihren Entwicklern als vollständig vom Internet isoliert beschrieben, abgesehen von einer täglichen Aktualisierungsprüfung, die abgeschaltet werden kann. Sie ist unter der GPL Version 3 veröffentlicht, für Windows einschließlich eines ARM64- und eines portablen Builds, für Linux als AppImage, deb, rpm, Snap und Flatpak sowie für macOS. Der Online-Editor braucht kein Konto und nutzt Speicher, den Sie selbst mitbringen, und die offizielle Seite nennt Integrationen mit Google, Microsoft, Atlassian, GitHub, VS Code und Notion. Es ist ein ausgereiftes Werkzeug mit einer großen Formbibliothek und Jahren an Nutzung.',
  'cmp.page.drawio.koxora.body':
    'Koxora steht am Anfang und hat keine öffentliche Veröffentlichung, der ehrliche Vergleich dreht sich heute also um die Absicht und nicht um ein fertiges Produkt. Koxora ist als ein Editor mit einem portablen Projektformat über Browser und Desktop gebaut, mit Deutsch und Englisch im Produkt ab der ersten Version und mit Cloud, Assistenz und Zusammenarbeit als optionalen Teilen statt als Standard. Vorhanden ist heute der Entwicklungsstand im offenen Repository: Formen, Text und Verbindungen, Projekte auf dem Gerät und Projektdateien, die geschrieben und gelesen werden können.',
  'cmp.page.drawio.chooseOther':
    'Sie heute ein fertiges Werkzeug brauchen, die große Formbibliothek wollen, in Google, Microsoft, Atlassian oder GitHub arbeiten oder eine installierte Anwendung wollen, die überhaupt nicht mit dem Internet spricht.',
  'cmp.page.drawio.chooseKoxora':
    'Sie ein Werkzeug begleiten wollen, das offen entwickelt wird, Wert auf ein portables Projektformat und eine deutsche Oberfläche von Anfang an legen und auf eine Veröffentlichung warten können.',
  'cmp.page.miro.meta.title': 'Koxora im Vergleich mit Miro',
  'cmp.page.miro.meta.description':
    'Miro und Koxora nebeneinander: Zusammenarbeit, Offline-Nutzung, wo Boards liegen, Konten und Tarife, jeweils mit Quelle und Prüfdatum.',
  'cmp.page.miro.hero.title': 'Koxora und Miro',
  'cmp.page.miro.hero.lead':
    'Miro und Koxora sind für unterschiedliche Situationen gebaut: ein gemeinsames Board für einen Workshop und ein Diagramm, das Sie auf Ihrem Rechner behalten. Diese Seite sagt, wo dieser Unterschied sichtbar wird, mit einer Quelle für jede Aussage über Miro.',
  'cmp.page.miro.strengths.body':
    'Miro ist für Menschen gebaut, die zusammenarbeiten. Boards werden standardmäßig mit einem Team geteilt, es gibt Desktop-Anwendungen für macOS, für Apple Silicon wie für Intel, und für Windows, die Preisseite nennt mehr als 250 Integrationen ab dem kostenlosen Tarif, und Assistenz wird mit einem Guthaben je Tarif angeboten. Für einen Workshop mit einem Dutzend Menschen auf einer Fläche ist es genau dafür gemacht, und das ist eine andere Aufgabe, als ein Diagramm zu zeichnen und die Datei zu behalten.',
  'cmp.page.miro.koxora.body':
    'Koxora beginnt am anderen Ende: die Arbeit ist Ihre, auf Ihrem Gerät, und ein Dienst ist etwas, das Sie hinzufügen können, statt etwas, mit dem Sie anfangen. Projekte liegen auf dem Gerät und in Projektdateien, nichts braucht ein Konto, und gemeinsames Bearbeiten ist als optional geplant. Koxora hat keine öffentliche Veröffentlichung, Miro ist heute also ein funktionierendes Produkt und Koxora nicht.',
  'cmp.page.miro.chooseOther':
    'es darum geht, dass eine Gruppe gleichzeitig auf einer Fläche arbeitet, Sie einen großen Katalog an Integrationen wollen oder Sie Workshops leiten und Vorlagen und Moderationswerkzeuge brauchen.',
  'cmp.page.miro.chooseKoxora':
    'das Diagramm wichtiger ist als die Besprechung, die Datei auf Ihrem Rechner bleiben muss, Sie ohne Konto und ohne Verbindung arbeiten wollen und auf eine Veröffentlichung warten können.',
  'cmp.page.lucidchart.meta.title': 'Koxora im Vergleich mit Lucidchart',
  'cmp.page.lucidchart.meta.description':
    'Lucidchart und Koxora nebeneinander: Offline-Bearbeitung, wo Dokumente liegen, Konten, Zusammenarbeit und Tarife, jeweils mit Quelle und Prüfdatum.',
  'cmp.page.lucidchart.hero.title': 'Koxora und Lucidchart',
  'cmp.page.lucidchart.hero.lead':
    'Lucidchart ist ein Diagrammprodukt für Teams, das auch offline im Browser funktioniert — das sollte man wissen, bevor jemand das Gegenteil behauptet. Diese Seite sagt, wo es sich von Koxora unterscheidet, mit einer Quelle für jede Aussage über Lucidchart.',
  'cmp.page.lucidchart.strengths.body':
    'Offline-Bearbeitung wird in allen Tarifen angeboten, in Chrome, Firefox und Edge, auf macOS, Windows und Linux, mit den Dokumenten, die Sie bereits geöffnet haben: der Browser behält die Änderungen und überträgt sie, sobald die Verbindung zurückkommt. Echtzeit-Zusammenarbeit ist Teil des Produkts, und die veröffentlichten Systemanforderungen sind bei Browsern und Betriebssystemen sehr konkret. Es ist ein Teamprodukt mit einer kostenlosen Stufe und bezahlten Tarifen.',
  'cmp.page.lucidchart.koxora.body':
    'Der Unterschied liegt nicht darin, ob es Offline gibt, sondern wo die Arbeit liegt. Lucidchart hält Dokumente im eigenen Dienst und legt für Offline-Änderungen etwa zehn Megabyte im Browser ab; Koxora behält Projekte auf dem Gerät und in Projektdateien, ohne Konto und ohne Server dahinter. Lucidchart ist ein fertiges Produkt und Koxora hat keine öffentliche Veröffentlichung, das ist also ein Vergleich von Entwürfen, nicht von Reife.',
  'cmp.page.lucidchart.chooseOther':
    'Ihr Team schon in Lucid arbeitet, Sie Echtzeit-Zusammenarbeit und Kommentare brauchen oder Sie ein fertiges Produkt mit Support dahinter wollen.',
  'cmp.page.lucidchart.chooseKoxora':
    'die Datei auf Ihrem Rechner statt in einem Anbieterkonto liegen muss, Sie ohne Registrierung anfangen wollen und auf eine Veröffentlichung warten können.',
};

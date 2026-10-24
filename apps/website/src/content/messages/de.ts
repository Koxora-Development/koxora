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
  'a11y.languageNavigation': 'Sprache',
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
  'home.compare.peersTitle':
    'Etablierte Werkzeuge, mit denen wir vergleichen werden',
  'home.compare.peersNote':
    'Mehrere dieser Werkzeuge bieten ebenfalls Offline-, Desktop- oder Self-Hosting-Optionen und sind in ihrem Feld jeweils stark. Häkchentabellen ohne Belege veröffentlichen wir nicht.',
  'home.compare.methodology':
    'Der ausführliche Vergleich folgt in einem späteren Schritt: mit Quellen je Aussage, dem geprüften Tarif und der geprüften Version sowie dem Datum der jeweiligen Prüfung.',
  'home.compare.link': 'Vergleich (in Vorbereitung)',

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
    'Wie sich Koxora neben draw.io, Lucidchart, Miro, Visio und Excalidraw einordnet. Der belegte Vergleich folgt; hier steht die Methode.',
  'compare.hero.eyebrow': 'Vergleich',
  'compare.hero.title': 'Ein ehrlicher Vergleich braucht Belege',
  'compare.hero.lead':
    'Ein ausführlicher Vergleich mit draw.io, Lucidchart, Miro, Microsoft Visio und Excalidraw ist in Vorbereitung. Er ist noch nicht veröffentlicht, denn ein nützlicher Vergleich braucht aktuelle Quellen für jede Aussage statt Marketing-Häkchen.',
  'compare.state.title': 'Diese Seite ist in Vorbereitung',
  'compare.state.body':
    'Hier stehen heute die Methode und die Einordnung. Die Vergleichstabellen, die Seiten je Werkzeug und die Empfehlungen nach Anwendungsfall folgen im nächsten Website-Schritt.',
  'compare.method.title': 'Wie der Vergleich entsteht',
  'compare.method.item1.title': 'Jede Aussage bekommt Quelle und Datum',
  'compare.method.item1.body':
    'Jede Aussage über ein anderes Produkt verweist auf dessen offizielle Dokumentation oder eine andere seriöse Quelle, nennt den geprüften Tarif und die geprüfte Version und hält fest, wann geprüft wurde.',
  'compare.method.item2.title': 'Mehr als zwei Antworten',
  'compare.method.item2.body':
    'Funktionen werden als unterstützt, nicht unterstützt, eingeschränkt oder tarifabhängig, für Koxora geplant oder ungeprüft ausgewiesen. Ein bloßes Häkchen verbirgt zu viel.',
  'compare.method.item3.title': 'Anerkennung, wo sie hingehört',
  'compare.method.item3.body':
    'Die anderen Werkzeuge sind starke Produkte mit echten Stärken, auch bei Offline- und Desktop-Nutzung. Der Vergleich benennt diese Stärken.',
  'compare.method.item4.title': 'Koxora gilt derselbe Maßstab',
  'compare.method.item4.body':
    'Koxora-Funktionen erscheinen mit denselben Statusangaben wie überall auf dieser Website. Geplante Funktionen werden nie als verfügbar dargestellt.',
  'compare.method.item5.title': 'Er wird aktuell gehalten',
  'compare.method.item5.body':
    'Funktionen, Tarife und Preise ändern sich. Der Vergleich wird vor Veröffentlichungen und in regelmäßigen Abständen erneut geprüft und zeigt das Datum der letzten Prüfung.',
  'compare.peers.title': 'Die betrachteten Werkzeuge',
  'compare.peers.note':
    'Kurze, neutrale Beschreibungen dessen, wofür die Werkzeuge bekannt sind. Funktionsaussagen werden hier nicht getroffen; dafür braucht es den belegten Vergleich.',

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
  'footer.contactPrivacy': 'Datenschutz',
  'footer.contactLegal': 'Rechtliches',
  'footer.copyright': '© {year} Koxora. Ein Projekt in Entwicklung.',
  'footer.statusNote':
    'Noch keine öffentliche Veröffentlichung. Funktionen auf dieser Website sind als Verfügbar, In Entwicklung oder Geplant gekennzeichnet.',
  'footer.openConsent': 'Datenschutz-Einstellungen',
  'footer.repository': 'GitHub-Repository',
  'footer.issues': 'Issues und Rückmeldungen',
  'footer.security': 'Sicherheitsmeldungen',
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
    'Diese Erklärung beschreibt, welche personenbezogenen Daten bei der Nutzung von koxora.app und des Koxora-Browser-Studios verarbeitet werden, auf welcher Rechtsgrundlage, wie lange und welche Rechte Sie haben.',
  'privacyPolicy.version': 'Fassung {version}, zuletzt aktualisiert am {date}.',
  'privacyPolicy.scope.title': '1. Geltungsbereich',
  'privacyPolicy.scope.body':
    'Diese Erklärung gilt für die öffentliche Koxora-Website und das unter den Koxora-Adressen betriebene Koxora-Browser-Studio. Sie gilt nicht für andere Websites, auf die wir verlinken. Die Koxora-Desktop-Anwendung verarbeitet Ihre Daten ausschließlich auf Ihrem eigenen Gerät und übermittelt uns keine Projektdaten.',
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
    'Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse ist der sichere, stabile und nachvollziehbare Betrieb des Dienstes. Protokolldaten werden nur so lange aufbewahrt, wie es für diesen Zweck erforderlich ist, und danach gelöscht oder anonymisiert. Die genaue Speicherdauer ergibt sich aus der eingesetzten Konfiguration; sie wird vor der Veröffentlichung dieser Website gemessen, dokumentiert und hier angegeben.',
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
  'privacyPolicy.studio.title': '7. Das Browser-Studio und Ihre Projekte',
  'privacyPolicy.studio.body':
    'Das Koxora-Browser-Studio läuft vollständig in Ihrem Browser. Projekte, Diagramme, importierte Dateien und die Einstellungen des Studios liegen in der Browser-Datenbank (IndexedDB) und im lokalen Speicher der Studio-Adresse, und die Anwendungsdateien werden zwischengespeichert, damit das Studio offline funktioniert. Nichts davon wird an uns übermittelt: Es gibt keinen Koxora-Projektserver, kein Konto und keinen Upload.',
  'privacyPolicy.studio.control':
    'Diese Daten liegen in Ihrer Hand. Sie können ein Projekt als portables .koxora-Archiv exportieren und die Daten jederzeit über die Browsereinstellungen für diese Adresse löschen. Browserspeicher ist an genau die Adresse gebunden, die ihn angelegt hat; Daten unter der Website-Adresse und unter der Studio-Adresse sind daher getrennt.',
  'privacyPolicy.studio.desktop':
    'Die Desktop-Anwendung speichert Projekte als Dateien in einem Verzeichnis auf Ihrem Rechner. Sie funktioniert ohne Koxora-Konto und übermittelt uns keine Projektinhalte.',
  'privacyPolicy.contactForm.title': '8. Kontakt per E-Mail',
  'privacyPolicy.contactForm.body':
    'Wenn Sie an eine der im Impressum genannten Adressen schreiben, verarbeiten wir Ihre E-Mail-Adresse, Ihre Nachricht und etwaige Anhänge, um Ihnen zu antworten. Die E-Mail wird auf selbst verwalteter Infrastruktur bei der IONOS SE, Elgendorfer Str. 57, 56410 Montabaur, betrieben.',
  'privacyPolicy.contactForm.basis':
    'Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO, soweit Ihre Anfrage einen Vertrag oder vorvertragliche Maßnahmen betrifft, sonst Art. 6 Abs. 1 lit. f DSGVO, unser berechtigtes Interesse an der Beantwortung von Anfragen. Nachrichten werden gelöscht, sobald die Anfrage erledigt ist und keine Aufbewahrungspflicht besteht.',
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
};

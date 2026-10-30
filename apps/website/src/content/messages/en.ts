// English is the default and fallback language of every Koxora surface.
// Every string the website renders lives here; `de.ts` must stay complete.
export const en = {
  'brand.name': 'Koxora',
  'brand.wordmark': 'koxora',
  'brand.tagline': 'Ideas take shape.',
  'brand.description':
    'Koxora is a local-first studio for diagrams, mind maps, data visualization and visual collaboration.',

  'a11y.skip': 'Skip to main content',
  'a11y.breadcrumb': 'Breadcrumb',
  'a11y.mainNavigation': 'Main navigation',
  'a11y.footerNavigation': 'Footer navigation',
  'a11y.currentPage': 'Current page',
  'a11y.externalLink': 'Opens an external site',
  'a11y.statusLegend': 'What the status labels mean',

  'nav.menu': 'Menu',
  'nav.menuOpen': 'Open the menu',
  'nav.menuClose': 'Close the menu',
  'nav.home': 'Home',
  'nav.features': 'Features',
  'nav.localFirst': 'Local-first',
  'nav.compare': 'Comparison',
  'nav.roadmap': 'Roadmap',
  'nav.download': 'Download',
  'nav.docs': 'Documentation',
  'nav.releases': 'Releases',
  'nav.legalNotice': 'Legal notice',
  'nav.privacyPolicy': 'Privacy policy',
  'nav.privacySettings': 'Privacy settings',
  'nav.groupProduct': 'Product',
  'nav.groupResources': 'Resources',
  'nav.groupLegal': 'Legal',
  'nav.language': 'Language',
  'nav.languageMenu': 'Choose language',
  'nav.languageCurrent': 'Current language',
  'nav.languageEnglish': 'English',
  'nav.languageGerman': 'Deutsch',
  'nav.theme': 'Appearance',
  'nav.themeDark': 'Dark',
  'nav.themeLight': 'Light',
  'nav.themeSystem': 'System',

  'cta.openStudio': 'Open the studio',
  'cta.openStudioNote': 'Runs in your browser. No account, no upload.',
  'cta.studioPending': 'How to try Koxora',
  'cta.studioPendingNote':
    'The hosted preview is not published yet. The current development version can be built from the public repository.',
  'cta.roadmap': 'See the roadmap',
  'cta.features': 'Explore the features',
  'cta.repository': 'Source code on GitHub',
  'cta.more': 'Read more',
  'cta.backHome': 'Back to the home page',

  'status.available': 'Available',
  'status.inDevelopment': 'In development',
  'status.planned': 'Planned',
  'status.concept': 'Concept',
  'status.inPreparation': 'In preparation',
  'status.legend.title': 'How to read the status labels',
  'status.legend.available':
    'Implemented and merged in the current development version of Koxora Studio. Koxora has not had a public release yet, so "available" never means "downloadable today".',
  'status.legend.inDevelopment':
    'Actively being built right now, in a reviewed development milestone. Scope and behaviour can still change.',
  'status.legend.planned':
    'Part of the documented product scope, with no implementation started and no committed date.',
  'status.legend.concept':
    'An illustration of an idea. Concept images never show software that exists today.',

  'project.statusTitle': 'Development status',
  'project.statusSummary':
    'Koxora Studio is a working technical preview. The public website is in review. There is no public release and no download yet.',
  'project.statusMilestone': 'Current milestone',
  'project.statusMilestoneValue':
    'Studio phase 2.5 accepted and merged · Website W2 in review',
  'project.statusUpdated': 'Content last reviewed on {date}',
  'project.statusLink': 'Development status and roadmap',

  'home.meta.title': 'Koxora — local-first diagrams and mind maps',
  'home.meta.description':
    'A local-first studio for diagrams, mind maps and data visualization. Works offline, needs no account, keeps your projects in portable files.',
  'home.hero.eyebrow': 'Local-first visual thinking',
  'home.hero.title': 'Ideas take shape.',
  'home.hero.titleAccent': 'On your device.',
  'home.hero.lead':
    'Koxora is a studio for diagrams, mind maps, data visualization and visual collaboration. It runs in the browser and on the desktop, works offline, and keeps your projects in portable files that belong to you.',
  'home.hero.note':
    'Koxora is in active development. Everything on this page is labelled Available, In development or Planned.',
  'home.preview.title': 'The studio today',
  'shot.frameLabel': 'Screenshot · Koxora Studio',
  'home.preview.caption':
    'Real screenshot of the current development version of Koxora Studio, captured on {date}. Not a mock-up.',
  'home.preview.altDark':
    'Koxora Studio in dark appearance with a flowchart of connected shapes on the canvas.',
  'home.preview.altLight':
    'Koxora Studio in light appearance showing the shape palette and the project inspector.',
  'home.preview.altMobile':
    'Koxora Studio on a narrow phone screen, with the shape palette and the project details below each other.',
  'home.preview.tabDark': 'Dark',
  'home.preview.tabLight': 'Light',
  'home.preview.tabMobile': 'On a phone',
  'home.features.kicker': 'What you can do today',
  'home.features.title': 'A canvas that is already useful',
  'home.features.description':
    'These capabilities are implemented in the current development version. No account, no network connection, no upload.',
  'home.features.link': 'All features in detail',

  'home.local.kicker': 'Local-first',
  'home.local.title': 'Your projects stay where you put them',
  'home.local.description':
    'Koxora stores projects in your browser or in files on your computer. Nothing is uploaded to a Koxora server, because there is no Koxora project server. You can export a portable .koxora archive at any time and open it on another device.',
  'home.local.link': 'How local-first works',
  'home.local.point1.title': 'No account required',
  'home.local.point1.body':
    'Open the studio and start. Registration is not part of the core product.',
  'home.local.point2.title': 'Offline after the first visit',
  'home.local.point2.body':
    'The browser studio keeps working without a connection once it has been loaded.',
  'home.local.point3.title': 'Portable files',
  'home.local.point3.body':
    'A .koxora archive is a documented container you can back up, copy and move yourself.',
  'home.local.point4.title': 'No tracking on this website',
  'home.local.point4.body':
    'No analytics, no third-party fonts, no advertising network, no tracking cookies.',

  'home.future.kicker': 'Where Koxora is going',
  'home.future.title': 'The full picture, honestly labelled',
  'home.future.description':
    'Koxora is planned as a complete visual platform. The sections below show what is being built now and what is on the documented roadmap. Nothing here is sold as finished.',
  'home.future.conceptCaption':
    'Concept illustration of the planned collaboration model. This is a drawing of an idea, not a screenshot of working software.',
  'home.future.conceptAlt':
    'Schematic drawing: three devices edit a shared project; a dashed line marks the optional synchronization service.',
  'home.future.link': 'Full roadmap',

  'home.compare.kicker': 'Positioning',
  'home.compare.title': 'Where Koxora fits',
  'home.compare.description':
    'Diagram tools are a mature field with strong products. Koxora is built for one specific workflow: visual work that stays on your device, keeps working offline and produces files you own.',
  'home.compare.focusTitle': 'What Koxora optimizes for',
  'home.compare.peersTitle': 'The tools Koxora is compared with',
  'home.compare.peersNote':
    'Several of these tools also offer offline, desktop or self-hosted options, and each is strong in its own field. The comparison says so, with a source for every statement.',
  'home.compare.methodology':
    'The comparison answers ten questions for six products. Every statement about another product links to the official page that says it and records the date that page was read.',
  'home.compare.link': 'Read the comparison',

  'home.roadmap.kicker': 'Transparency',
  'home.roadmap.title': 'Public development status',
  'home.roadmap.description':
    'Koxora is developed in public. Every milestone below links to the issues and documents in the repository.',
  'home.roadmap.link': 'Detailed roadmap',

  'home.structure.kicker': 'Coming to this site',
  'home.structure.title': 'Documentation, downloads and releases',
  'home.structure.description':
    'These areas already have their place in the site structure and navigation. They will be filled as soon as there is something real to publish.',

  'home.cta.kicker': 'Stay close to the project',
  'home.cta.title': 'Follow the build',
  'home.cta.description':
    'Issues, decisions, architecture documents and milestones are public. Feedback on the open issues is welcome.',

  'features.meta.title': 'Features: available, in development and planned',
  'features.meta.description':
    'What Koxora does today — shapes, connections, local projects, offline use — and what is in development or planned, each clearly labelled.',
  'features.hero.eyebrow': 'Features',
  'features.hero.title': 'Everything Koxora does, and everything it will do',
  'features.hero.lead':
    'This page separates three things: what the current development version really does, what is being implemented right now, and what is documented product scope without an implementation. Use the status labels to tell them apart.',
  'features.available.title': 'Available in the current development version',
  'features.available.description':
    'Implemented, reviewed and merged. You can use all of this without an account and without a network connection.',
  'features.inDevelopment.title': 'In development',
  'features.inDevelopment.description':
    'Being implemented in the current milestone. Behaviour and scope can still change before release.',
  'features.planned.title': 'Planned',
  'features.planned.description':
    'Documented product scope. Not started, no committed date, no implementation to demonstrate.',
  'features.limits.title': 'Known limits today',
  'features.limits.description':
    'An honest feature page names the gaps as well. In the current development version:',
  'features.limits.item1':
    'There is no image export yet. Projects are saved and exchanged as .koxora archives.',
  'features.limits.item2':
    'Diagram files from other tools cannot be imported yet.',
  'features.limits.item3':
    'Undo history is bounded and session-only; it is not stored in the project file.',
  'features.limits.item4':
    'Interactive links, moving pages between projects and a full layer manager are not implemented yet.',
  'features.limits.item5':
    'There is no collaboration, no cloud and no AI assistance in the product today.',

  'localFirst.meta.title': 'Local-first: where your projects live',
  'localFirst.meta.description':
    'Where Koxora keeps your projects, what works offline, what a web server still sees, and why browser storage belongs to one address.',
  'localFirst.hero.eyebrow': 'Local-first',
  'localFirst.hero.title': 'Software that works when the network does not',
  'localFirst.hero.lead':
    'Local-first means the authoritative copy of your work is on your device, not in someone else’s data centre. Koxora is designed that way from the storage format upwards.',
  'localFirst.section.storage.title': 'Where your projects live',
  'localFirst.section.storage.body':
    'In the browser, projects are stored in the browser database (IndexedDB) of the origin you opened. On the desktop they are files in a directory you choose. Koxora saves changes on your device automatically and keeps a previous save for recovery.',
  'localFirst.section.offline.title': 'Offline use',
  'localFirst.section.offline.body':
    'After the first visit the browser studio is cached and starts without a connection. Creating, editing, saving, exporting and importing projects need no server at any point.',
  'localFirst.section.portable.title': 'Files that stay readable',
  'localFirst.section.portable.body':
    'A .koxora archive is a documented container with the project data inside. Export it, back it up, move it to another computer and open it there. Unknown content from newer versions is preserved rather than discarded.',
  'localFirst.section.boundary.title': 'What a server still sees',
  'localFirst.section.boundary.body':
    'Delivering a web page is never zero processing: the hosting provider and the content delivery network necessarily handle the connection data needed to transfer files, such as your IP address. Koxora does not upload project content, and this website has no analytics, no advertising network and no third-party fonts.',
  'localFirst.section.origin.title': 'Browser storage is tied to one address',
  'localFirst.section.origin.body':
    'Browser storage belongs to the exact address it was created on. A project stored under one address is not visible under another, and clearing browser data removes it. Export the projects you want to keep.',
  'localFirst.warning.title': 'Keep your own backups',
  'localFirst.warning.body':
    'Local-first also means local responsibility. Browser data can be cleared by the browser, by a cleaning tool or by you. Export a .koxora archive of anything you cannot afford to lose.',
  'localFirst.link.privacy': 'Read the privacy policy',

  'compare.meta.title': 'Koxora compared to other diagram tools',
  'compare.meta.description':
    'Koxora next to draw.io, Lucidchart, Miro, Visio and Excalidraw. Every statement about another product carries its source and the date it was read.',
  'compare.hero.eyebrow': 'Comparison',
  'compare.hero.title': 'A comparison you can check',
  'compare.hero.lead':
    'Koxora next to draw.io, Lucidchart, Miro, Microsoft Visio and Excalidraw. Every statement about another product links to an official page and records the date that page was read. Where a source does not say something, the answer is \u201cnot verified\u201d rather than a guess.',
  'compare.method.title': 'How this comparison is made',
  'compare.method.item1.title': 'Every claim carries a source and a date',
  'compare.method.item1.body':
    'Each statement about another product links to the official page that says it, and the source list records the date that page was read. What was looked at \u2014 the plan, edition or build \u2014 is named next to each product.',
  'compare.method.item2.title': 'More than two answers',
  'compare.method.item2.body':
    'An answer is supported, limited or plan-dependent, not supported, planned for Koxora, a description, or not verified. A bare checkmark hides too much to be useful.',
  'compare.method.item3.title': 'Credit where it is due',
  'compare.method.item3.body':
    'These are strong products, and several of them do things Koxora does not. draw.io ships a desktop application its makers describe as isolated from the internet; Lucidchart offers offline editing in the browser. Both are named here.',
  'compare.method.item4.title': 'Koxora is held to the same rule',
  'compare.method.item4.body':
    'The Koxora column describes the merged development version of the public repository. Koxora has no public release, so nothing here can be installed today, and a planned capability is marked planned, never ticked.',
  'compare.method.item5.title': 'It is rechecked, and it says when',
  'compare.method.item5.body':
    'Features, plans and prices change, sometimes within weeks. The date of the last review is printed on this page, every source carries the date it was read, and the comparison is rechecked before each release.',
  'compare.peers.title': 'The tools in scope',
  'compare.peers.note':
    'What each tool is, and what was looked at to answer the questions below.',

  'roadmap.meta.title': 'Roadmap and development status',
  'roadmap.meta.description':
    'The public Koxora roadmap: what is finished, what is being built and what is planned, developed in the open without committed release dates.',
  'roadmap.hero.eyebrow': 'Roadmap',
  'roadmap.hero.title': 'Built in the open, one milestone at a time',
  'roadmap.hero.lead':
    'Koxora is developed in public. This page mirrors the planning documents in the repository. The order of the phases is planned; the dates are not committed.',
  'roadmap.now.title': 'Where the project stands',
  'roadmap.phases.title': 'Planned phases',
  'roadmap.phases.description':
    'The long-term scope is a catalog of 178 documented requirements. The phases group them; later phases depend on earlier ones and on separate approvals.',
  'roadmap.disclaimer.title': 'No dates, no promises',
  'roadmap.disclaimer.body':
    'This roadmap is a planned sequence, not a delivery commitment. Scope can move between phases, and optional services such as cloud, collaboration, AI and the marketplace each need their own security, privacy and legal review before they are built.',
  'roadmap.participate.title': 'Follow or contribute',
  'roadmap.participate.body':
    'Milestones, decisions and architecture documents live in the public repository. Issues are the place to ask questions and give feedback.',

  'download.meta.title': 'Download Koxora',
  'download.meta.description':
    'Koxora has no public release yet. What exists today, how to run the current development version, and which platforms are planned.',
  'download.hero.eyebrow': 'Download',
  'download.hero.title': 'There is nothing to download yet',
  'download.hero.lead':
    'We would rather say that plainly than offer a build that nobody has tested, signed or supported. Koxora has not had a public release. Here is what exists today and what is planned.',
  'download.today.title': 'What exists today',
  'download.today.body':
    'The browser studio and the desktop shell run from the public source code. The hosted preview at the planned address is not published yet, and there are no signed installers.',
  'download.source.title': 'Run the current development version',
  'download.source.body':
    'The repository contains the full monorepo, the exact package manager and Node version, and the commands to build and start the browser studio locally.',
  'download.source.link': 'Build instructions in the repository',
  'download.planned.title': 'Planned distribution',
  'download.planned.body':
    'Once there is a release worth installing, this page becomes a real download centre. It is already structured for it.',
  'download.planned.item1':
    'Browser studio at the planned editor address, with no installation.',
  'download.planned.item2': 'Desktop builds for Linux, Windows and macOS.',
  'download.planned.item3': 'Separate stable, beta and nightly channels.',
  'download.planned.item4': 'Checksums and signatures for every artefact.',
  'download.planned.item5':
    'An archive of previous versions and their changelogs.',
  'download.noFake.title': 'Why there is no button here',
  'download.noFake.body':
    'Publishing software means supporting it: signed artefacts, verifiable checksums, an update path and a security contact. Until that is in place, a download button would be a promise we cannot keep.',

  'docs.meta.title': 'Documentation',
  'docs.meta.description':
    'The Koxora documentation is in preparation. Until it is published, the architecture and development documents in the public repository apply.',
  'docs.hero.eyebrow': 'Documentation',
  'docs.hero.title': 'Documentation is in preparation',
  'docs.hero.lead':
    'Product documentation is written when the features it describes are real. Until then, the public repository holds the architecture, the decisions and the development guides.',
  'docs.available.title': 'Available today in the repository',
  'docs.planned.title': 'Planned documentation areas',
  'docs.planned.body':
    'These sections are part of the documented site structure and will be published as the product grows.',
  'docs.planned.item1': 'Getting started and everyday workflows',
  'docs.planned.item2': 'Diagram types and templates',
  'docs.planned.item3': 'Import, export and the project format',
  'docs.planned.item4': 'Self-hosting and administration',
  'docs.planned.item5': 'Plugin and extension interfaces',

  'releases.meta.title': 'Releases and changelog',
  'releases.meta.description':
    'Koxora has no published release yet. Development milestones are tracked in public; this page is prepared for versions and changelogs.',
  'releases.hero.eyebrow': 'Releases',
  'releases.hero.title': 'No published release yet',
  'releases.hero.lead':
    'Koxora has not shipped a version. Development progresses in reviewed milestones that are merged into the public repository. This page is the prepared home for changelogs once releases exist.',
  'releases.milestones.title': 'Merged development milestones',
  'releases.milestones.description':
    'Each milestone was reviewed and merged into the main branch of the public repository. A merged milestone is not a product release.',
  'releases.planned.title': 'What a release page will contain',
  'releases.planned.item1': 'Version number, date and release channel',
  'releases.planned.item2': 'Changes, fixes and known issues',
  'releases.planned.item3': 'Migration notes for the project format',
  'releases.planned.item4': 'Checksums and signatures for every artefact',
  'releases.link': 'Commit history in the repository',

  'notFound.meta.title': 'Page not found',
  'notFound.title': 'This page does not exist',
  'notFound.lead':
    'The address may be mistyped, or the page may not be published yet. The sections below are the ones that exist today.',
  'notFound.suggestions': 'Try one of these',

  'footer.tagline':
    'A local-first studio for diagrams, mind maps and data visualization.',
  'footer.contact': 'Contact',
  'footer.contactSupport': 'Product and support',
  'footer.supportTask': 'Questions about Koxora',
  'footer.contactPage': 'Write to us',
  'footer.securityTask': 'Found a security problem?',
  'footer.contactPrivacy': 'Data protection',
  'footer.contactLegal': 'Legal',
  'footer.copyright': '© {year} Koxora. A project in development.',
  'footer.statusNote':
    'No public release yet. Capabilities on this site are labelled Available, In development or Planned.',
  'footer.openConsent': 'Privacy settings',
  'footer.repository': 'GitHub repository',
  'footer.issues': 'Issues and feedback',
  'footer.security': 'Report a vulnerability',
  'footer.backToTop': 'Back to top',

  'consent.banner.title': 'Your privacy choices',
  'consent.banner.body':
    'Koxora would like your decision about optional technologies that are not required to display this website. Strictly necessary storage keeps working either way, and declining never limits the studio or your local projects.',
  'consent.banner.acceptAll': 'Accept all',
  'consent.banner.rejectOptional': 'Reject optional',
  'consent.banner.customize': 'Customize',
  'consent.banner.privacyLink': 'Privacy policy',
  'consent.banner.noticeLink': 'Legal notice',
  'consent.dialog.title': 'Privacy and storage settings',
  'consent.dialog.intro':
    'Decide which optional purposes Koxora may use on this device. Optional purposes are switched off until you switch them on, and you can change or withdraw your decision at any time.',
  'consent.dialog.save': 'Save selection',
  'consent.dialog.acceptAll': 'Accept all',
  'consent.dialog.rejectOptional': 'Reject optional',
  'consent.dialog.close': 'Close',
  'consent.dialog.alwaysActive': 'Always active',
  'consent.dialog.optional': 'Optional',
  'consent.dialog.purpose': 'Purpose',
  'consent.dialog.provider': 'Provider',
  'consent.dialog.storage': 'Storage and duration',
  'consent.dialog.legalBasis': 'Legal basis',
  'consent.dialog.noOptional.title': 'Nothing to consent to right now',
  'consent.dialog.noOptional.body':
    'This website uses only strictly necessary storage on your device, and no optional analytics, advertising or embedded third-party services. German law requires consent for storing or reading information on your device only where it is not strictly necessary for the service you asked for, so Koxora does not ask you for a decision it does not need. If that changes, this dialog will ask before anything optional is loaded.',
  'consent.state.saved': 'Your choice was saved on this device on {date}.',
  'consent.state.none': 'You have not made a choice on this device yet.',
  'consent.state.necessaryOnly': 'Only strictly necessary storage is in use.',
  'consent.withdraw': 'Withdraw consent and delete the saved choice',
  'consent.withdrawDone': 'Your saved choice was deleted on this device.',
  'consent.category.necessary.name': 'Strictly necessary',
  'consent.category.necessary.description':
    'Required to deliver this website and to remember settings you set yourself. Cannot be switched off.',
  'consent.category.preferences.name': 'Comfort settings',
  'consent.category.preferences.description':
    'Remembers optional convenience settings beyond the ones you set explicitly.',
  'consent.category.statistics.name': 'Measurement',
  'consent.category.statistics.description':
    'Privacy-preserving measurement of page usage, only if such a service is ever introduced.',
  'consent.category.media.name': 'External media',
  'consent.category.media.description':
    'Embedded content from other providers, such as a video player, which would contact that provider.',
  'consent.item.theme.name': 'Appearance preference',
  'consent.item.theme.purpose':
    'Stores whether you chose the light or dark appearance.',
  'consent.item.theme.storage':
    'Browser storage on this device, until you clear it',
  'consent.item.language.name': 'Language choice',
  'consent.item.language.purpose':
    'Stores the language you selected in the language menu, so that the address without a language in it opens in that language on your next visit. It is read by this website only and contains nothing but "en" or "de".',
  'consent.item.language.storage':
    'First-party cookie and browser storage on this device, one year from your last selection',
  'consent.item.consent.name': 'Privacy decision',
  'consent.item.consent.purpose':
    'Stores your privacy choices and their version so you are not asked again.',
  'consent.item.consent.storage':
    'Browser storage on this device, until you withdraw it',
  'consent.legalBasis.necessary':
    'Strictly necessary under § 25(2) no. 2 TDDDG; legitimate interest under Art. 6(1)(f) GDPR.',
  'consent.legalBasis.consent':
    'Consent under § 25(1) TDDDG and Art. 6(1)(a) GDPR.',
  'consent.openSettings': 'Open privacy settings',
  'consent.noScript':
    'Privacy settings need JavaScript in your browser. This website uses only strictly necessary storage, so there is nothing to switch off. The privacy policy describes everything in detail.',

  'privacySettings.meta.title': 'Privacy settings',
  'privacySettings.meta.description':
    'Review and change what Koxora keeps on your device: every entry with its purpose, where it is stored and how long it stays.',
  'privacySettings.hero.eyebrow': 'Privacy settings',
  'privacySettings.hero.title': 'Your choices on this device',
  'privacySettings.hero.lead':
    'Everything Koxora stores on this device is listed here, together with its purpose, where it is stored and how long it stays. You can change or withdraw any optional choice at any time.',
  'privacySettings.current.title': 'Current state',
  'privacySettings.inventory.title': 'What is stored on this device',
  'privacySettings.editor.title': 'The browser studio is separate',
  'privacySettings.editor.body':
    'Browser storage belongs to one address. Choices made on this website do not apply to the studio address, and the studio keeps its projects in its own browser database. Clearing data for one address does not touch the other.',
  'privacySettings.link.privacy': 'Full privacy policy',

  'legalNotice.meta.title': 'Legal notice',
  'legalNotice.meta.description':
    'Legal notice for koxora.app: operator, contact addresses, editorial responsibility, dispute resolution, liability and copyright.',
  'legalNotice.hero.eyebrow': 'Legal notice',
  'legalNotice.hero.title': 'Legal notice',
  'legalNotice.hero.lead':
    'Information required by § 5 of the German Digital Services Act (DDG) for koxora.app and the Koxora browser studio.',
  'legalNotice.provider.title': 'Service provider',
  'legalNotice.provider.note':
    'Private individual; the address is a postal service address.',
  'legalNotice.contact.title': 'Contact',
  'legalNotice.contact.body':
    'Written enquiries are answered in German or English. No telephone number is published; email is the contact channel.',
  'legalNotice.contact.legal': 'Legal enquiries',
  'legalNotice.contact.privacy': 'Data protection enquiries',
  'legalNotice.contact.support': 'Product and support enquiries',
  'legalNotice.editorial.title': 'Responsible for the content',
  'legalNotice.editorial.body':
    'Responsible for journalistic and editorial content under § 18(2) of the German Interstate Media Treaty (MStV): the service provider named above, at the same address.',
  'legalNotice.vat.title': 'Value added tax',
  'legalNotice.vat.body':
    'No value added tax is shown, because the small business scheme under § 19 of the German VAT Act (UStG) applies. No VAT identification number has been issued.',
  'legalNotice.dispute.title': 'Consumer dispute resolution',
  'legalNotice.dispute.body':
    'The service provider is neither obliged nor willing to take part in dispute resolution proceedings before a consumer arbitration board (§ 36 VSBG). The European Commission discontinued its online dispute resolution platform on 20 July 2025.',
  'legalNotice.liability.title': 'Liability for content',
  'legalNotice.liability.body':
    'As a service provider we are responsible for our own content on these pages under general law (§§ 7 to 10 DDG). We are not obliged to monitor transmitted or stored third-party information or to investigate circumstances that indicate unlawful activity. Obligations to remove or block the use of information under general law remain unaffected; liability in that respect begins only when a concrete infringement becomes known, and the content is removed without undue delay.',
  'legalNotice.links.title': 'Liability for links',
  'legalNotice.links.body':
    'This website contains links to external websites whose content we do not control. The respective provider or operator of the linked pages is always responsible for their content. The linked pages were checked for possible legal violations at the time of linking; no unlawful content was apparent. Permanent monitoring without concrete evidence of an infringement is not reasonable. Links are removed without undue delay once an infringement becomes known.',
  'legalNotice.copyright.title': 'Copyright',
  'legalNotice.copyright.body':
    'The content and works on these pages created by the operator are subject to German copyright law. Contributions by third parties are marked as such. Downloads and copies of this page are permitted for private, non-commercial use. The Koxora source code is developed in public; the licence that applies to it is published with it in the repository and takes precedence for the code. Until a licence is published there, no rights to use the code are granted.',
  'legalNotice.project.title': 'About this project',
  'legalNotice.project.body':
    'Koxora is a software project in development. This website is informational. No contract is concluded through it, no paid service is offered and no downloadable software is distributed through it at present.',

  'privacyPolicy.meta.title': 'Privacy policy',
  'privacyPolicy.meta.description':
    'How Koxora handles personal data: controller, hosting, what is stored on your device, the local-first studio, your rights and the supervisory authority.',
  'privacyPolicy.hero.eyebrow': 'Privacy',
  'privacyPolicy.hero.title': 'Privacy policy',
  'privacyPolicy.hero.lead':
    'This policy explains which personal data is processed when you use koxora.app, on what legal basis, for how long and what rights you have. It also states in advance what will apply to the Koxora browser studio, which is not published yet.',
  'privacyPolicy.version': 'Version {version}, last updated {date}.',
  'privacyPolicy.scope.title': '1. Scope',
  'privacyPolicy.scope.body':
    'This policy covers the public Koxora website. The Koxora browser studio is not published yet; section 7 states what will apply to it once it is operated at its own address, which will have its own separate browser storage. This policy does not cover other websites that we link to. The Koxora desktop application processes your data only on your own device and does not transmit project data to us.',
  'privacyPolicy.controller.title': '2. Controller',
  'privacyPolicy.controller.body':
    'The controller for data processing on this website within the meaning of the General Data Protection Regulation (GDPR) is:',
  'privacyPolicy.controller.contact': 'Data protection contact: {email}',
  'privacyPolicy.principles.title': '3. The short version',
  'privacyPolicy.principles.body':
    'Koxora is local-first. Your diagrams, projects and files are processed on your device and are not transmitted to a Koxora server. This website uses no analytics, no advertising network, no third-party fonts and no tracking cookies. What remains is the connection data that any web server and content delivery network must handle in order to deliver a page, plus a small amount of storage on your device for settings you choose yourself.',
  'privacyPolicy.logs.title': '4. Server log data',
  'privacyPolicy.logs.body':
    'When you request a page, the hosting provider processes the data your browser transmits: the requested address, date and time, the amount of data transferred, the referring address, browser and operating system information and the IP address. This processing is technically necessary to deliver the page and to detect and defend against attacks.',
  'privacyPolicy.logs.basis':
    'Legal basis: Art. 6(1)(f) GDPR. Our legitimate interest is the secure, stable and traceable operation of the service. Log data is kept only as long as necessary for that purpose and is then deleted or anonymized. The exact retention period follows from the configuration of these providers. It has not yet been measured and published here; it is recorded in this policy as soon as it has been, and you can ask the data protection contact above for the current state in the meantime.',
  'privacyPolicy.hosting.title': '5. Hosting and content delivery',
  'privacyPolicy.hosting.body':
    'The website is hosted in Germany by Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen. Delivery, caching and protection against attacks are handled by Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA, which therefore processes the connection data described above. Both providers act as processors on our instructions under Art. 28 GDPR.',
  'privacyPolicy.hosting.transfer':
    'Using Cloudflare can involve processing in the United States. That transfer is based on the European Commission’s standard contractual clauses and the provider’s participation in the EU-US Data Privacy Framework. You can request a copy of the safeguards from the data protection contact above.',
  'privacyPolicy.device.title': '6. Storage on your device',
  'privacyPolicy.device.body':
    'Beyond the files needed to display a page, Koxora stores information on your device only where it is strictly necessary for a function you asked for, or where you have consented. Under § 25(2) no. 2 of the German Telecommunications Digital Services Data Protection Act (TDDDG), strictly necessary storage does not require consent. The current deployment of this website stores the following:',
  'privacyPolicy.device.note':
    'This website currently uses no optional analytics, advertising or external embedded services, so no consent banner is shown. If that ever changes, nothing optional is loaded before you have agreed, and you can change or withdraw your decision at any time in the privacy settings.',
  'privacyPolicy.studio.title': '7. The browser studio, once it is published',
  'privacyPolicy.studio.body':
    'The hosted browser studio is not available yet, so nothing described here is being processed today. Once it is published, it will run entirely in your browser: projects, diagrams, imported files and the preferences of the studio will be stored in the browser database (IndexedDB) and in local storage of the studio address, and the application files will be cached so that the studio works offline. None of that content will be transmitted to us: there is no Koxora project server, no account and no upload.',
  'privacyPolicy.studio.control':
    'That data will be under your control: a project can be exported as a portable .koxora archive, and the data can be deleted at any time through your browser settings for that address. Browser storage is tied to the exact address that created it, so data stored under the website address and under the studio address stay separate.',
  'privacyPolicy.studio.desktop':
    'The desktop application stores projects as files in a directory on your computer. It works without a Koxora account and does not transmit project content to us.',
  'privacyPolicy.contactForm.title': '8. Contact by email and through the form',
  'privacyPolicy.contactForm.body':
    'If you write to one of the addresses in the legal notice, we process your email address, your message and any attachments in order to answer you. Email is operated on self-managed infrastructure at IONOS SE, Elgendorfer Str. 57, 56410 Montabaur, Germany.',
  'privacyPolicy.contactForm.basis':
    'Legal basis: Art. 6(1)(b) GDPR where your enquiry concerns a contract or pre-contractual steps, otherwise Art. 6(1)(f) GDPR, our legitimate interest in answering enquiries. Messages are deleted once the enquiry is settled and no retention obligation applies.',
  'privacyPolicy.contactForm.form':
    'Where this website offers a contact form, it sends what you entered — the name if you gave one, the email address, the category, the subject and the message — to the same support mailbox, over an encrypted connection to the mail server. Nothing else is collected: there is no tracking, no third-party form provider, no captcha service and no newsletter. The form is the only way this website transmits anything you typed, and it does so only when you press the button.',
  'privacyPolicy.contactForm.storage':
    'The endpoint keeps no database and no copy of your message: it hands the message to the mail server and forgets it. Two short-lived values are kept, in a small file on the same server. A one-way fingerprint of the submission is kept for ten minutes, so that pressing the button twice does not send two messages. A one-way value derived from your network address is kept for one hour, so that a flood can be stopped; it is computed with a secret key that exists only on that server, so it cannot be turned back into an address, and the address itself is never written down. Both values are removed automatically once their period has passed, and neither can be turned back into your message.',
  'privacyPolicy.contactForm.logs':
    'Its own log records one line per submission with the time, the outcome and the chosen category. It contains no name, no address, no subject, no message and no network address. From then on your message is an email in the support mailbox, and the paragraphs above describe what happens to it there.',
  'privacyPolicy.contactForm.accepted':
    'When the form reports that your message was accepted, it means the mail server took it for delivery. That is what can honestly be confirmed from a website; whether it then arrived in the mailbox is not something this page can promise, and it is never claimed.',
  'privacyPolicy.noTracking.title': '9. What this website does not do',
  'privacyPolicy.noTracking.item1':
    'No analytics, measurement or audience-tracking service.',
  'privacyPolicy.noTracking.item2':
    'No advertising network, no profiling and no automated decision-making.',
  'privacyPolicy.noTracking.item3':
    'No external fonts, video players, maps or social media plugins; all assets are delivered from the Koxora address.',
  'privacyPolicy.noTracking.item4':
    'No account, no newsletter and no user profiles on the public website.',
  'privacyPolicy.noTracking.item5':
    'No upload or server-side processing of the diagrams and files you work on.',
  'privacyPolicy.future.title': '10. Planned features',
  'privacyPolicy.future.body':
    'Optional accounts, cloud synchronization, team collaboration, a marketplace, AI assistance and similar capabilities are planned but not implemented, and none of them processes data today. Before any of them is activated, this policy is updated, the necessary agreements with processors are concluded and, where the law requires it, your consent is obtained beforehand.',
  'privacyPolicy.rights.title': '11. Your rights',
  'privacyPolicy.rights.body':
    'You have the right to obtain information about the personal data we process about you (Art. 15 GDPR), to have it corrected (Art. 16), deleted (Art. 17) or its processing restricted (Art. 18), to data portability (Art. 20) and to object to processing based on a legitimate interest (Art. 21). Where processing is based on consent, you may withdraw it at any time with effect for the future.',
  'privacyPolicy.rights.contact': 'To exercise these rights, write to {email}.',
  'privacyPolicy.authority.title': '12. Right to complain',
  'privacyPolicy.authority.body':
    'You have the right to lodge a complaint with a data protection supervisory authority, in particular in the member state of your residence, your place of work or the place of the alleged infringement. The authority responsible for the controller is:',
  'privacyPolicy.authority.name':
    'Bavarian State Office for Data Protection Supervision (BayLDA)',
  'privacyPolicy.authority.address': 'Promenade 18, 91522 Ansbach, Germany',
  'privacyPolicy.changes.title': '13. Changes to this policy',
  'privacyPolicy.changes.body':
    'This policy is updated when the service changes or when the legal situation requires it. The version and date above always identify the current text.',
  'privacyPolicy.draft.title': 'Status of this document',
  'privacyPolicy.draft.body':
    'This text describes the planned deployment of the Koxora website and studio. Before publication, the operator verifies every statement against the services actually deployed, including retention periods, processors and the supervisory authority, and has the result reviewed. Until then this document is prepared content, not a confirmation of legal compliance.',

  'feature.shapes.title': 'Shapes, text and connections',
  'feature.shapes.body':
    'Rectangles, rounded rectangles, ellipses, diamonds, triangles, hexagons, parallelograms, containers, free text, lines and arrows. Connections attach to visible ports or find their own anchor, and they follow the shapes when you move them.',
  'feature.canvas.title': 'A canvas that gets out of the way',
  'feature.canvas.body':
    'Pan, zoom, fit the content, and switch the grid and snapping on or off with adjustable spacing. Hold Alt to bypass snapping for a single action.',
  'feature.editing.title': 'Direct editing',
  'feature.editing.body':
    'Select, move, resize and duplicate objects. Edit compatible properties together, align or distribute a selection, arrange it without overlap, and change the stack order of shapes and connections within a layer.',
  'feature.history.title': 'Undo and redo',
  'feature.history.body':
    'Undo and redo diagram edits and page operations across the current project. History is bounded to 100 steps and 16 MiB and lasts for the session; an open text draft has its own undo history.',
  'feature.projects.title': 'Projects on your device',
  'feature.projects.body':
    'Create, rename, duplicate and switch local projects. Changes save automatically, with a previous save for recovery. Confirmed project deletion moves it to local Trash, where it can be restored.',
  'feature.files.title': 'Portable .koxora files',
  'feature.files.body':
    'Export a project as a documented archive, import it again on another device, or import a copy with a new identity. Unknown content from newer versions is preserved, not dropped.',
  'feature.offline.title': 'Works offline',
  'feature.offline.body':
    'After the first visit the browser studio starts and runs without a network connection. No account, no sign-in, no waiting for a server.',
  'feature.typography.title': 'Text and formatting',
  'feature.typography.body':
    'Search 20 font preferences with previews, sizes from 8 to 96, bold, italic, underline, colour and paragraph alignment. Fonts use your installed families and fallbacks, without external requests; appearance can differ between devices.',
  'feature.languages.title': 'English and German',
  'feature.languages.body':
    'The whole product and this website exist in both languages, chosen independently of your operating system. The architecture is ready for more languages.',
  'feature.themes.title': 'Light and dark',
  'feature.themes.body':
    'A light and a dark appearance for the studio and for this website, with the contrast and focus styles that keyboard users need.',
  'feature.keyboard.title': 'Keyboard and accessibility',
  'feature.keyboard.body':
    'Tools, ports, dialogs and the canvas can be operated from the keyboard, with a searchable shortcut reference in both languages.',
  'feature.recovery.title': 'Saving and recovery',
  'feature.recovery.body':
    'Changes are written to your device shortly after you stop typing, and the previous save stays available if something goes wrong.',
  'feature.pages.title': 'Documents and diagram pages',
  'feature.pages.body':
    'Keep several documents and pages in one .koxora project. The sidebar navigator supports switching, renaming, duplicating, reordering and moving pages between documents, with individual zoom and canvas views.',
  'feature.richText.title': 'Office-style rich-text editing',
  'feature.richText.body':
    'Edit text beside its canvas label with a formatting toolbar. Format individual words or selected passages in text elements, shapes, lines, arrows and connections; keep multiline content, clipboard formatting and text undo.',
  'feature.desktop.title': 'Desktop applications',
  'feature.desktop.body':
    'A desktop shell for Linux, Windows and macOS exists in the repository and runs from source. Signed, supported installers are not released yet.',
  'feature.diagramTypes.title': 'Guided diagram types',
  'feature.diagramTypes.body':
    'Mind maps, flowcharts, organization charts, UML, ER, BPMN, C4, network, Gantt, Kanban and wireframe families with templates and assisted layout. Today you can draw freely with shapes, text and connections.',
  'feature.export.title': 'Export to SVG, PNG and PDF',
  'feature.export.body':
    'Image and document export for sharing and printing. Today a project is exchanged as a .koxora archive.',
  'feature.import.title': 'Import from other tools',
  'feature.import.body':
    'Reading diagram files produced by other editors, with an honest report of what could and could not be converted.',
  'feature.data.title': 'From data to visuals',
  'feature.data.body':
    'Import tables from CSV, XLSX and ODS, and turn them into charts and data-driven diagrams.',
  'feature.collaboration.title': 'Working together',
  'feature.collaboration.body':
    'Real-time editing, presence, comments and guest links, designed to merge offline work rather than replace it.',
  'feature.cloud.title': 'Optional cloud and teams',
  'feature.cloud.body':
    'An optional synchronization service with versions, teams and sharing, for people who want it. Local-first use without an account stays the default.',
  'feature.ai.title': 'AI assistance',
  'feature.ai.body':
    'Assistance that uses your own API key or a local model, with a preview and validation before anything changes your diagram.',
  'feature.plugins.title': 'Plugins and marketplace',
  'feature.plugins.body':
    'Sandboxed extensions, shape libraries, themes and templates, with moderation and signature checks before publication.',
  'feature.selfHosting.title': 'Self-hosting',
  'feature.selfHosting.body':
    'A documented container deployment for teams that want to run the optional services on their own infrastructure.',
  'feature.mobile.title': 'Tablets and phones',
  'feature.mobile.body':
    'Touch-first viewing and editing beyond the responsive layout that exists today.',

  'phase.0.title': 'Planning and requirements',
  'phase.0.body':
    'Product definition, 178 documented requirements, architecture and the rules this project is built by.',
  'phase.1.title': 'Foundation',
  'phase.1.body':
    'Monorepo, shared browser and desktop shell, localization, themes, local storage and continuous integration.',
  'phase.2.title': 'Editor',
  'phase.2.body':
    'The editor foundation through accepted Studio 2.5 includes shapes, connections, multi-document/page navigation, rich text, batch properties, freehand drawing, stacking, non-overlap arrangement and portable project files. Further editor capabilities remain planned.',
  'phase.3.title': 'Data and export',
  'phase.3.body':
    'Table import, charts, and export to SVG, PNG, PDF and interactive HTML.',
  'phase.4.title': 'Diagram breadth',
  'phase.4.body':
    'UML, ER, BPMN, C4, network, Gantt, Kanban, wireframes and whiteboard workflows.',
  'phase.5.title': 'AI and plugins',
  'phase.5.body':
    'Assistance with your own keys or local models, and a sandboxed extension system.',
  'phase.6.title': 'Cloud and live teams',
  'phase.6.body':
    'Optional accounts, synchronization, history, roles, presence and comments.',
  'phase.7.title': 'Community, self-hosting and enterprise',
  'phase.7.body':
    'Marketplace, moderation, container deployment, policies and single sign-on.',
  'phase.8.title': 'Stabilization and growth',
  'phase.8.body':
    'Accessibility, more languages, performance, distribution and release hardening.',
  'phase.state.done': 'Accepted',
  'phase.state.active': 'In progress',
  'phase.state.planned': 'Planned',

  'peer.drawio.name': 'draw.io / diagrams.net',
  'peer.drawio.body':
    'A widely used open-source diagram editor with browser, desktop and self-hosted options.',
  'peer.lucidchart.name': 'Lucidchart',
  'peer.lucidchart.body':
    'A commercial cloud suite for diagrams with a broad template library and business integrations.',
  'peer.miro.name': 'Miro',
  'peer.miro.body':
    'A collaborative online whiteboard built around workshops and large shared boards.',
  'peer.visio.name': 'Microsoft Visio',
  'peer.visio.body':
    'A long-established professional diagram application with deep stencil and enterprise integration.',
  'peer.excalidraw.name': 'Excalidraw',
  'peer.excalidraw.body':
    'An open-source whiteboard known for fast, hand-drawn sketching and a focused feature set.',
  'compare.focus1.title': 'Your data stays yours',
  'compare.focus1.body':
    'Projects live on your device in portable files, not in an account you have to keep.',
  'compare.focus2.title': 'Offline is a first-class state',
  'compare.focus2.body':
    'Editing, saving, exporting and importing never need a server to be reachable.',
  'compare.focus3.title': 'One product on every platform',
  'compare.focus3.body':
    'The browser studio and the desktop application share the same editor core and the same file format.',
  'compare.focus4.title': 'Optional services stay optional',
  'compare.focus4.body':
    'Cloud, collaboration and AI are planned as additions you can ignore, never as the price of entry.',

  'structure.docs.body':
    'Guides, tutorials, the project format and self-hosting documentation.',
  'structure.download.body':
    'Browser studio, desktop builds, release channels, checksums and signatures.',
  'structure.releases.body':
    'Versions, changelogs, known issues and migration notes.',

  'repoDoc.vision': 'Product vision',
  'repoDoc.architecture': 'Architecture overview',
  'repoDoc.format': 'Project format',
  'repoDoc.localFirst': 'Local-first architecture',
  'repoDoc.decisions': 'Decision register',
  'repoDoc.roadmap': 'Roadmap and backlog',
  'repoDoc.security': 'Security policy',
  'repoDoc.contributing': 'Contributing guide',

  'milestone.storage.title': 'Projects and files',
  'milestone.storage.body':
    'The project model, validation, migrations, local storage, import, export and recovery.',
  'milestone.canvas.title': 'The canvas',
  'milestone.canvas.body':
    'Navigation, zoom, grid, snapping, portable viewport and page settings, and performance measurements.',
  'milestone.shapes.title': 'Shapes, text and connections',
  'milestone.shapes.body':
    'Basic shapes, plain text, connections, styling, anchor geometry and reversible editing transactions.',
  'milestone.editing.title': 'Interactive editing',
  'milestone.editing.body':
    'Selection, dragging, resizing, direct insertion, free lines and arrows, bounded history and renaming.',

  'address.country': 'Germany',

  'og.imageAlt': 'The Koxora logo beside the words "Ideas take shape".',

  'home.preview.heading': 'Look at the real thing',
  'home.preview.description':
    'Every product image on this site is a screenshot of the current development version, taken by an automated capture run against the real application. No mock-ups, no retouching.',

  'localFirst.how.title': 'How Koxora handles your work',
  'localFirst.how.description':
    'Five answers to the question every local-first product has to answer honestly: where the data is, what happens offline, what you can take with you, what a server sees anyway, and what the browser ties your storage to.',
  'consent.state.session':
    'Your choice could not be stored on this device, so it applies to this visit only.',
  'consent.noScript.optional':
    'Privacy settings need JavaScript in your browser. Without it nothing optional is loaded and no decision is stored, so you are not tracked; the controls on this page cannot be operated.',
  'privacyPolicy.device.note.optional':
    'This website also uses optional technologies that are not strictly necessary. Nothing optional is loaded before you have agreed to it, your decision is stored only once you make it, and you can change or withdraw it at any time in the privacy settings.',
  'a11y.tableScroll': 'Scroll sideways to see every column of this table.',
  'a11y.languageNavigationFooter': 'Language, in the footer',
  'cta.moreAbout': 'More about {topic}',
  'nav.themeToLight': 'Switch to the light appearance',
  'nav.themeToDark': 'Switch to the dark appearance',
  'project.statusSummary.published':
    'Koxora Studio is a working technical preview. There is no public release and no download yet.',
  'project.statusMilestoneValue.published':
    'Studio phase 2.5 accepted and merged · No public Studio release',
  'legalNotice.contact.security': 'First contact about a security problem',

  'docsStart.shot.alt':
    'The Koxora studio with an empty project list, a New project button and an Import .koxora button.',
  'docsEditing.shot.alt':
    'The keyboard shortcut reference open over the editor, with a search field and the navigation shortcuts listed.',
  'docsEditing.properties.alt':
    'The properties of a selected element open over the editor, with text and formatting controls at the top.',

  'docs.hub.title': 'Everything there is to read',
  'docs.hub.note':
    'Each section says which state it describes. Koxora has no public release, so "available" means implemented and merged in the development version you can run from the repository, never downloadable today.',
  'docs.section.start.title': 'First steps with Koxora',
  'docs.section.start.summary':
    'Opening the studio, making a project, and what the first screen offers.',
  'docs.section.editing.title': 'Editing a diagram',
  'docs.section.editing.summary':
    'Shapes, connections, rich text, freehand strokes, batch properties, arrangement and undo in the accepted Studio 2.5 development version.',
  'docs.section.localFirst.title': 'Local-first, explained',
  'docs.section.localFirst.summary':
    'What local-first means here, and what it means for your files and your privacy.',
  'docs.section.projects.title': 'Projects and file formats',
  'docs.section.projects.summary':
    'Manage documents and diagram pages, switch local projects, use Trash and keep portable .koxora backups.',
  'docs.section.features.title': 'Available capabilities',
  'docs.section.features.summary':
    'The list of what is implemented, with the limits of the current version named.',
  'docs.section.roadmap.title': 'Planned capabilities',
  'docs.section.roadmap.summary':
    'What is intended, in which order, with no committed dates.',
  'docs.section.faq.title': 'Frequently asked questions',
  'docs.section.faq.summary':
    'Questions about the implemented editor, pages, formatting, offline storage and the features still planned.',
  'docs.section.support.title': 'Reporting a problem, and getting help',
  'docs.section.support.summary':
    'Where a bug report goes, what to put in it, and where a security problem goes instead.',
  'docsStart.meta.title': 'First steps with Koxora',
  'docsStart.meta.description':
    'Opening the Koxora studio, making a first project and finding your way around the first screen, with no account and nothing to install.',
  'docsStart.hero.eyebrow': 'Documentation',
  'docsStart.hero.title': 'First steps',
  'docsStart.hero.lead':
    'Koxora has no public release yet, so there is nothing to download. What follows describes the development version, which runs in a browser and keeps everything on your device.',
  'docsStart.step1.title': 'Open the studio',
  'docsStart.step1.body':
    'The studio is a web application. It asks for no account, no email address and no sign-in: the first screen is the project list, and it is empty because nothing has been made yet. Until a public release exists, the way to run it is from the source repository.',
  'docsStart.step2.title': 'Make a project, or bring one',
  'docsStart.step2.body':
    '"New project" starts an empty one. "Import .koxora" opens a project file you already have — from another device, from a backup, or from someone who sent you one. Both end in the same place: a project on this device.',
  'docsStart.step3.title': 'Draw something',
  'docsStart.step3.body':
    'Choose a shape above the canvas and click or drag to place it. Use Line or Arrow to connect shapes, and Freehand pen to sketch. The Project navigator in the sidebar adds documents and diagram pages; each page keeps its own view.',
  'docsStart.step4.title': 'Automatic saves and portable backups',
  'docsStart.step4.body':
    'Changes save on this device after a short pause; the header shows the save status. Save project also saves immediately. Export .koxora creates a portable backup. Nothing is uploaded to a Koxora server.',
  'docsStart.shot.caption':
    'The first screen of the studio, before any project exists. Captured from the development version.',
  'docsStart.warning.title': 'One thing to know on the first day',
  'docsStart.warning.body':
    'A project lives in this browser on this device. Clearing the browser data, using a private window, or losing the device removes it. Export a .koxora file for anything you would be sorry to lose — that is the backup, and there is no copy anywhere else.',
  'docsEditing.meta.title': 'Editing a diagram',
  'docsEditing.meta.description':
    'Use Studio 2.5 shapes, connections, rich-text formatting, freehand drawing, batch properties, stacking and undo in the merged development version.',
  'docsEditing.hero.eyebrow': 'Documentation',
  'docsEditing.hero.title': 'Editing a diagram',
  'docsEditing.hero.lead':
    'What the editor does today, described from the merged development version. Where something is not there yet, this page says so rather than leaving you to find out.',
  'docsEditing.place.title': 'Placing shapes',
  'docsEditing.place.body':
    'Choose a rectangle, rounded rectangle, ellipse, diamond, triangle, hexagon, parallelogram, text element or container. Click to place it, drag to size it, or press Enter to insert at the view centre. Repeat insertion keeps a shape tool active. Line, Arrow and Freehand pen have their own drawing gestures.',
  'docsEditing.select.title': 'Selecting',
  'docsEditing.select.body':
    'Click to select. Shift-click adds to or removes from the selection. Dragging across empty canvas draws a marquee around everything inside it, and Ctrl or Cmd with A selects everything on the page that can be edited. Escape clears a tool or a draft.',
  'docsEditing.move.title': 'Moving and resizing',
  'docsEditing.move.body':
    'Drag a selection to move it. A single selected shape gets corner handles; holding Shift keeps its proportions. The arrow keys nudge by one unit or one grid step, and Shift multiplies that by ten. Snapping follows the grid, and holding Alt switches it off for as long as you hold it — the canvas shows a coloured border while snapping is on.',
  'docsEditing.connect.title': 'Connecting shapes',
  'docsEditing.connect.body':
    'Choose Line or Arrow, then either click a visible port on the edge of each shape or click the shapes themselves and let the editor choose the anchor. Line draws no arrowhead; Arrow draws one. A connection keeps its chosen anchors when either shape is moved or resized. There is no obstacle routing and no connection from a shape to itself.',
  'docsEditing.text.title': 'Text and formatting',
  'docsEditing.text.body':
    'Double-click a label or choose Edit text to open the canvas text editor; Element properties provides the same editor. Select a word or passage and apply font, size, bold, italic, underline or colour. Alignment applies to paragraphs. Ctrl/Cmd+B, I and U toggle formatting; paste keeps supported text styles and line breaks. Apply changes or Ctrl/Cmd+Enter commits the draft; Escape cancels it.',
  'docsEditing.history.title': 'Undoing',
  'docsEditing.history.body':
    'Ctrl/Cmd+Z undoes and Ctrl/Cmd+Shift+Z or Ctrl+Y redoes. Project history follows edits across pages, including page creation, movement and deletion; it retains at most 100 steps within a 16 MiB bound. It resets when another project is opened and is not saved in .koxora. While a text draft is open, undo affects the draft; applying it creates one project edit. Restore project in Trash is separate from Undo.',
  'docsEditing.keyboard.title': 'Doing it from the keyboard',
  'docsEditing.keyboard.body':
    'Every tool is reachable with Tab and the arrow keys, and the ports for connecting are too. F1 or the question mark opens a searchable list of every shortcut, in English and German, with Ctrl shown as Cmd on Apple computers. Text fields keep the editing shortcuts you already know.',
  'docsEditing.shot.caption':
    'The keyboard shortcut reference, opened with F1. Captured from the development version.',
  'docsEditing.properties.caption':
    'The properties of a selected element, with text and formatting first. Captured from the development version.',
  'docsEditing.limits.title': 'Not there yet',
  'docsEditing.limits.body':
    'Image export, import from other diagram tools, interactive links, full layer management, collaboration, cloud sync and AI assistance are not implemented. The freehand pen has no eraser or pressure brushes. Undo history does not survive reopening a project. The capability list distinguishes the implemented development version from future work.',
  'docsProjects.meta.title': 'Projects and file formats',
  'docsProjects.meta.description':
    'What a Koxora project is, where it is kept, what the .koxora file contains, how to move a project between devices and how to keep a backup.',
  'docsProjects.hero.eyebrow': 'Documentation',
  'docsProjects.hero.title': 'Projects and file formats',
  'docsProjects.hero.lead':
    'A project is yours, it is on your device, and it comes out as a file you keep. This page says exactly what that file is and what happens to it.',
  'docsProjects.format.title': 'The .koxora file',
  'docsProjects.format.body':
    'Export creates one portable .koxora archive containing all documents, pages, page views, rich-text formatting and freehand strokes. Existing projects still open without conversion. The documented format stores structured text, not HTML. Keep a backup before editing in an older version: it cannot display every newer feature.',
  'docsProjects.saved.title': 'Where a project is while you work',
  'docsProjects.saved.body':
    'In the browser, on the device you are using, in that browser’s own storage. Changes are written there automatically after a short pause. No Koxora server receives the project, because there is none, and nothing is uploaded.',
  'docsProjects.transfer.title': 'Moving a project to another device',
  'docsProjects.transfer.body':
    'Export it to a .koxora file, move the file the way you would move any file, and import it on the other device. Browser storage belongs to one address on one device, so this is the way to carry work across — and it is the same way to hand a project to someone else.',
  'docsProjects.backup.title': 'Keeping a backup',
  'docsProjects.backup.body':
    'Export the projects you care about to .koxora files and keep them where you keep your other documents. Clearing browser data, a private window, a reinstalled browser or a lost device all remove what is only in browser storage, and no copy exists anywhere else to restore it from. An exported file is the backup.',
  'docsProjects.notStored.title': 'What the file does not contain',
  'docsProjects.notStored.body':
    'What you had selected, which tool was active, what was on the internal clipboard and the undo history are not written into a project. They belong to the session you are in. Data the current version does not understand is preserved rather than dropped, so a file written by a newer version does not lose what it carried.',
  'docsFaq.meta.title': 'Frequently asked questions',
  'docsFaq.meta.description':
    'Answers about Studio 2.5 pages, rich text, freehand drawing, offline files, fonts and release status, with unimplemented features clearly identified.',
  'docsFaq.hero.eyebrow': 'Documentation',
  'docsFaq.hero.title': 'Frequently asked questions',
  'docsFaq.hero.lead':
    'Answered from what is implemented, not from what is planned. Where the honest answer is "not yet", it says so.',
  'faq.account.q': 'Do I need an account?',
  'faq.account.a':
    'No. There is no registration, no sign-in and no account to create. The studio has no server behind it to hold one.',
  'faq.release.q': 'Can I download Koxora?',
  'faq.release.a':
    'Not yet. There is no public release and no approved public installer download. Studio 2.5 is accepted and merged in the source repository. CI test packages do not constitute a published release; the download page will change only after a separate release approval.',
  'faq.offline.q': 'Does it work without an internet connection?',
  'faq.offline.a':
    'The editor runs on your device and needs no server once it has loaded. Projects are stored locally, so the work itself does not depend on a connection.',
  'faq.where.q': 'Where are my diagrams kept?',
  'faq.where.a':
    'In your browser’s own storage, on the device you are using, and in whatever .koxora files you export. Not on a Koxora server: there is none.',
  'faq.clearing.q': 'What happens if I clear my browser data?',
  'faq.clearing.a':
    'Projects that exist only in browser storage are removed, and there is no copy to restore them from. Export a .koxora file for anything you want to keep. The studio says this on its own first screen too.',
  'faq.formats.q': 'Which file formats can I use?',
  'faq.formats.a':
    'Koxora reads and writes its own .koxora project archive. Importing from other diagram tools and exporting to an image are not implemented yet; both are documented scope rather than something you can do today.',
  'faq.today.q': 'What can the editor actually do right now?',
  'faq.today.a':
    'Studio 2.5 includes shapes and connections with ports, documents and diagram pages, formatting of individual words, batch properties, freehand drawing, stack order and arrangement without overlap. Projects save locally and can be exported as .koxora; session undo works across their pages. These features belong to the merged development version, not a public release.',
  'faq.missing.q': 'What about working together, the cloud, or assistance?',
  'faq.missing.a':
    'None of the three is implemented. All three are documented product scope, and all three are planned as optional, so a Koxora without them stays a complete product rather than a crippled one.',
  'faq.languages.q': 'Which languages is Koxora in?',
  'faq.languages.a':
    'English and German, in the product and on this website, selectable independently of the language your operating system is in. English is the fallback. A further language needs a resource file and its addresses, not a change to the application.',
  'faq.price.q': 'What does it cost?',
  'faq.price.a':
    'There is nothing to buy, because there is no release. No price, no plan and no trial has been announced, and this site will not invent one.',
  'faq.source.q': 'Is the source code public? Under which licence?',
  'faq.source.a':
    'The source code is public in the repository. A licence has not been published yet, which means no rights are granted until it is. The legal notice says the same thing, and it will change when the licence is decided.',
  'faq.problem.q': 'I found a problem. Where does it go?',
  'faq.problem.a':
    'An ordinary bug goes to the support address or the contact form, and the support section says what to include. A security problem goes somewhere else: the security policy describes a separate route, and the details do not belong in an ordinary mailbox.',
  'docsSupport.meta.title': 'Reporting a problem and getting help',
  'docsSupport.meta.description':
    'Where a Koxora bug report goes, what to put in it so it can be acted on, and where a security problem goes instead.',
  'docsSupport.hero.eyebrow': 'Documentation',
  'docsSupport.hero.title': 'Reporting a problem',
  'docsSupport.hero.lead':
    'A report that can be reproduced gets fixed; one that cannot usually does not. This page says what makes the difference, and where to send it.',
  'docsSupport.include.title': 'What to put in a report',
  'docsSupport.include.item1':
    'What you did, step by step, in enough detail that someone else can do the same.',
  'docsSupport.include.item2':
    'What you expected to happen, and what happened instead.',
  'docsSupport.include.item3':
    'Which browser and which operating system, with their versions.',
  'docsSupport.include.item4':
    'Whether it happens every time, or only sometimes and under what conditions.',
  'docsSupport.include.item5':
    'A .koxora export of the project where it happens, if you can share one and it contains nothing confidential.',
  'docsSupport.where.title': 'Where to send it',
  'docsSupport.where.body':
    'The contact form reaches the support mailbox, and so does writing to the address directly. Development happens in the open, so an issue in the public repository is also a good place for something reproducible — it is visible, it can be discussed, and it does not get lost in a mailbox.',
  'docsSupport.security.title': 'A security problem goes elsewhere',
  'docsSupport.security.body':
    'Please do not send details of a vulnerability to the support mailbox or put them in a public issue. The security policy describes the route for that, what to send in a first message and what to expect in return.',
  'docsSupport.expect.title': 'What to expect',
  'docsSupport.expect.body':
    'Koxora is a project under development without a release and without a support contract. Reports are read and taken seriously; no response time is promised, because promising one would be inventing a service level that does not exist.',

  'nav.contact': 'Contact',
  'contact.meta.title': 'Contact Koxora',
  // True whether or not this deployment has a form, because a page
  // description is read by a crawler that cannot see which one it got.
  'contact.meta.description':
    'Ask a question, send feedback, report a problem. Messages reach the Koxora support mailbox, and the address is published on the page.',
  'contact.hero.eyebrow': 'Contact',
  'contact.hero.title': 'Write to the project',
  'contact.hero.lead':
    'Questions, feedback and problem reports all reach the same mailbox. The form below sends your message there; if you would rather use your own mail program, the address is published too.',
  // The same page where there is no form: the address is the way, not a
  // consolation for a missing control, and nothing here mentions why.
  'contact.hero.leadMail':
    'Questions, feedback and problem reports all reach the same mailbox. Write to {email} and a person will read it. A security problem has a route of its own, described below.',
  'contact.form.title': 'Send a message',
  'contact.form.intro':
    'Only the address and the message are needed. A name helps if you would like to be addressed by it.',
  'contact.field.name': 'Name',
  'contact.field.name.hint': 'Optional. Only so a reply can address you.',
  'contact.field.email': 'Email address',
  'contact.field.email.hint':
    'Needed for a reply. It is used for that and nothing else.',
  'contact.field.category': 'What is this about?',
  'contact.field.subject': 'Subject',
  'contact.field.message': 'Message',
  'contact.field.message.hint': 'Up to {max} characters.',
  'contact.field.optional': 'optional',
  'contact.field.required': 'required',
  'contact.category.general': 'General question',
  'contact.category.feedback': 'Feedback',
  'contact.category.support': 'Support',
  'contact.category.bug': 'Report a problem',
  'contact.honeypot.label': 'Website',
  'contact.submit': 'Send message',
  'contact.submit.busy': 'Sending…',
  'contact.error.required': 'Please fill this in.',
  'contact.error.tooShort': 'This is shorter than the form accepts.',
  'contact.error.tooLong': 'This is longer than the form accepts.',
  'contact.error.email': 'Please enter one plain email address.',
  'contact.error.category': 'Please choose one of the options.',
  'contact.error.controlCharacter':
    'Please remove the line breaks and special characters from this field.',
  'contact.status.invalid':
    'The message was not sent. Please correct the fields marked above.',
  'contact.status.accepted':
    'Your message was accepted for delivery. It has been handed to the mail server; a person will read it when it arrives.',
  'contact.status.duplicate':
    'This message had already been accepted, so it was not sent a second time.',
  'contact.status.rejected':
    'The form refused this submission. If you filled it in very quickly, or left the page open for a long time, please reload and try again.',
  'contact.status.rateLimited':
    'Several messages have already been sent from here. Please wait a while, or write to {email} directly.',
  'contact.status.undelivered':
    'The message could not be handed over. Nothing was sent, so nothing is lost: please try again later or write to {email} directly.',
  'contact.status.offline':
    'The message could not be sent. Please check your connection, or write to {email} directly.',
  'contact.fallback.title': 'Or write a mail yourself',
  'contact.fallback.body':
    'The same mailbox is reachable directly at {email}. That is also the way to use if you prefer not to fill in a form, or if the form is not working for you.',
  'contact.security.title': 'A security problem goes elsewhere',
  'contact.security.body':
    'Please do not send details of a vulnerability through this form: it reaches an ordinary mailbox. The security policy says what to send, where to send it and what to expect.',
  // The same warning on the page that has no form; it names the mailbox
  // instead, so it does not point at a control that is not there.
  'contact.security.bodyMail':
    'Please do not send details of a vulnerability to the support address: it is an ordinary mailbox. The security policy says what to send, where to send it and what to expect.',
  'contact.security.link': 'Read the security policy',
  'contact.privacy.title': 'What happens to what you write',
  'contact.privacy.body':
    'The name, address, subject and message you enter are sent to the Koxora support mailbox so that your request can be answered. They are not used for anything else, not passed on for advertising, and there is no newsletter to be subscribed to. The privacy policy describes the processing, the legal basis and how long the mail is kept.',
  'contact.privacy.bodyMail':
    'A mail to this address is read so that your request can be answered, and is kept for as long as that takes. It is not used for anything else, not passed on for advertising, and there is no newsletter to be subscribed to. The privacy policy describes the processing, the legal basis and how long the mail is kept.',
  'contact.privacy.link': 'Privacy policy',
  'contact.mail.title': 'Write to the support mailbox',
  'contact.mail.body':
    'One address for questions, feedback and problem reports, read by a person. It helps to name the part of Koxora your message is about, and to add the steps you took if something did not work.',
  'contact.mail.hint': 'Opens your own mail program.',
  'contact.noscript':
    'The form works without JavaScript: it is sent as an ordinary form and you land on a page that says what happened. With JavaScript you stay on this page instead.',
  'contactSent.meta.title': 'Message accepted',
  'contactSent.meta.description':
    'Your message was accepted for delivery to the Koxora support mailbox.',
  'contactSent.hero.eyebrow': 'Contact',
  'contactSent.hero.title': 'Accepted for delivery',
  'contactSent.hero.lead':
    'The mail server has taken your message. A person will read it when it arrives in the mailbox; there is nothing else for you to do.',
  'contactSent.body':
    'No copy of this page holds your message, and no confirmation mail is sent, so nothing further will arrive in your inbox until someone answers.',
  'contactSent.back': 'Back to the contact page',
  'contactProblem.meta.title': 'The message was not sent',
  'contactProblem.meta.description':
    'Something stopped the message from being handed over. Nothing was sent, and the email address is published as well.',
  'contactProblem.hero.eyebrow': 'Contact',
  'contactProblem.hero.title': 'The message was not sent',
  'contactProblem.hero.lead':
    'Nothing was handed over, so nothing is half-sent. One of a few things happened, and all of them can be tried again.',
  'contactProblem.reason.invalid':
    'A field was empty, too short, too long, or contained characters the form does not accept. Go back and the browser will mark what to change.',
  'contactProblem.reason.rateLimited':
    'Several messages have already been sent from this connection. Waiting a while, or writing directly, both work.',
  'contactProblem.reason.undelivered':
    'The mail server did not take the message. That is on our side, and trying again later usually works.',
  'contactProblem.back': 'Back to the form',

  'cmp.status.supported': 'Supported',
  'cmp.status.supported.definition':
    'An official page states the capability for what was examined.',
  'cmp.status.limited': 'Limited or plan-dependent',
  'cmp.status.limited.definition':
    'Available, but only in a particular plan, edition or situation, which the answer names.',
  'cmp.status.notSupported': 'Not supported',
  'cmp.status.notSupported.definition':
    'An official page states that it is not available for what was examined.',
  'cmp.status.planned': 'Planned',
  'cmp.status.planned.definition':
    'Documented Koxora scope that is not implemented. It is never shown as available.',
  'cmp.status.unknown': 'Not verified',
  'cmp.status.unknown.definition':
    'No official statement was found and read for this review. It does not mean the capability is missing.',
  'cmp.status.info': 'Details',
  'cmp.status.info.definition':
    'A question that a yes or a no would not answer; the entry describes what was found.',
  'cmp.group.independence': 'Independence',
  'cmp.group.work': 'Drawing and files',
  'cmp.group.together': 'Teams and services',
  'cmp.group.cost': 'Licence and price',
  'cmp.dim.offline.label': 'Works offline',
  'cmp.dim.offline.description':
    'Whether you can keep working when the connection drops, or when there never was one.',
  'cmp.dim.onDevice.label': 'Your work stays on your device',
  'cmp.dim.onDevice.description':
    'Whether the diagrams are on your own machine, in your own files, rather than only inside a provider account.',
  'cmp.dim.withoutAccount.label': 'Usable without an account',
  'cmp.dim.withoutAccount.description':
    'Whether you can draw something before you register.',
  'cmp.dim.desktop.label': 'Desktop application',
  'cmp.dim.desktop.description':
    'Whether there is an application to install, and for which operating systems.',
  'cmp.dim.diagramTypes.label': 'Diagram types',
  'cmp.dim.diagramTypes.description':
    'What kinds of diagram the editor is built for.',
  'cmp.dim.importExport.label': 'Import and export',
  'cmp.dim.importExport.description':
    'Which formats come in and go out, and whether your work can leave again.',
  'cmp.dim.collaboration.label': 'Working together',
  'cmp.dim.collaboration.description':
    'Shared editing, comments and sharing with other people.',
  'cmp.dim.ai.label': 'Assistance features',
  'cmp.dim.ai.description':
    'Generated content or an assistant inside the editor.',
  'cmp.dim.integration.label': 'Integrations and extensions',
  'cmp.dim.integration.description':
    'Connections to other tools, and whether the editor can be embedded or extended.',
  'cmp.dim.licence.label': 'Licence and price model',
  'cmp.dim.licence.description':
    'How the product is licensed and paid for. Amounts are not reproduced here, because they change and differ by region and currency.',
  'cmp.product.koxora.description':
    'A local-first studio for diagrams, built in the open.',
  'cmp.product.koxora.examined':
    'The merged development version of the public repository. There is no public release, so nothing in this column can be installed today.',
  'cmp.product.drawio.description':
    'A widely used diagram editor, in the browser and as a desktop application, with integrations into other tools.',
  'cmp.product.drawio.examined':
    'The official product site and the desktop application repository.',
  'cmp.product.excalidraw.description':
    'An open-source editor in a hand-drawn style, with a hosted version and a paid service around it.',
  'cmp.product.excalidraw.examined':
    'The project repository and the Excalidraw+ product page.',
  'cmp.product.lucidchart.description':
    'A browser-based diagram product for teams, with plans from a free tier upwards.',
  'cmp.product.lucidchart.examined':
    'The published help centre articles on offline editing and on system requirements, and the pricing page.',
  'cmp.product.miro.description':
    'A collaborative whiteboard for workshops and planning, with diagramming among its uses.',
  'cmp.product.miro.examined':
    'The published pricing page and the application download page.',
  'cmp.product.visio.description':
    'The long-established Microsoft diagram product, sold within Microsoft 365 plans and as a single purchase.',
  'cmp.product.visio.examined':
    'The published plan comparison and the Microsoft Support comparison of versions and features.',
  'cmp.offline.koxora':
    'Local-first by design. The development version runs in the browser and needs no server once it has loaded, and projects stay on the device.',
  'cmp.offline.drawio':
    'The desktop application is described by its makers as completely isolated from the internet, apart from a daily update check that can be switched off.',
  'cmp.offline.excalidraw':
    'The hosted editor is listed as a progressive web app that works offline and autosaves into the browser.',
  'cmp.offline.lucidchart':
    'Offline editing is offered in Chrome, Firefox and Edge on macOS, Windows and Linux, on every plan. New documents cannot be created offline, real-time collaboration needs a connection, the documents have to be open before the connection goes, and a private window does not keep the changes.',
  'cmp.offline.miro':
    'Desktop applications are published, but no official statement about working offline was found and read for this review.',
  'cmp.offline.visio':
    'Offline work and local file support are listed for the desktop application, which needs Visio Plan 2 or a single-purchase desktop edition. The web-only options are listed without them.',
  'cmp.onDevice.koxora':
    'Projects live in the browser storage of your own device and can be written to and read back from project files. No Koxora server receives them, because there is none.',
  'cmp.onDevice.drawio':
    'The makers state they have no access to your diagrams: the online editor uses storage you bring yourself, and the desktop application saves to local files.',
  'cmp.onDevice.excalidraw':
    'The hosted editor autosaves into the browser, and a drawing can be saved as an open JSON file.',
  'cmp.onDevice.lucidchart':
    'Documents are held in the Lucid service. The offline feature describes a browser cache of about ten megabytes rather than local files; nothing beyond that was verified for this review.',
  'cmp.onDevice.miro':
    'No official statement about where boards are stored, or about keeping them as local files, was found and read for this review.',
  'cmp.onDevice.visio':
    'Local file support is listed for the desktop application, which needs Plan 2 or a single-purchase edition. Saving a diagram locally as PNG or JPEG is listed for the Microsoft 365 options.',
  'cmp.withoutAccount.koxora':
    'No registration, and no account to create: the editor has no sign-in at all.',
  'cmp.withoutAccount.drawio':
    'The official home page states that no account and no sign-up are required.',
  'cmp.withoutAccount.excalidraw':
    'The free editor is described as needing no account. Excalidraw+ is a paid upgrade, and its trial does require signing up.',
  'cmp.withoutAccount.lucidchart':
    'No official statement about using the editor without an account was found and read for this review.',
  'cmp.withoutAccount.miro':
    'No official statement about opening a board without an account was found and read for this review.',
  'cmp.withoutAccount.visio':
    'Microsoft states that web access needs a Microsoft 365 work or school account, and that personal identities such as outlook.com are not supported. The desktop application needs an assigned licence.',
  'cmp.desktop.koxora':
    'A desktop build for Linux, Windows and macOS is documented product scope and is not implemented. There is no download.',
  'cmp.desktop.drawio':
    'Installers are published for Windows, including an ARM64 build and a portable build, for Linux as AppImage, deb and rpm as well as through the Snap and Flatpak stores, and for macOS.',
  'cmp.desktop.excalidraw':
    'The repository documents the hosted web application, which it lists as installable and working offline. Nothing about an official desktop application was verified for this review.',
  'cmp.desktop.lucidchart':
    'The published system requirements describe supported browsers and the operating systems they run on. Nothing about a desktop application was verified for this review.',
  'cmp.desktop.miro':
    'Desktop applications are offered for macOS, separately for Apple silicon and Intel, and for Windows, also through the Microsoft Store.',
  'cmp.desktop.visio':
    'The desktop application is listed for Visio Plan 2 and for the single-purchase editions. Visio Plan 1 and Visio in Microsoft 365 are listed as web only.',
  'cmp.diagramTypes.koxora':
    'The merged Studio 2.5 development version supports shapes, rich text, connections with ports, freehand strokes and several documents/pages per project. Guided diagram types and semantic auto-layout remain planned.',
  'cmp.diagramTypes.drawio':
    'Not verified for this review. The official shape libraries are extensive; which families they cover was not confirmed against a single official page.',
  'cmp.diagramTypes.excalidraw':
    'Not verified for this review beyond the project describing itself as a virtual whiteboard with a hand-drawn style.',
  'cmp.diagramTypes.lucidchart': 'Not verified for this review.',
  'cmp.diagramTypes.miro': 'Not verified for this review.',
  'cmp.diagramTypes.visio':
    'Microsoft lists viewing and editing of files created in Visio 2000 and later across the Microsoft 365 options. The full set of stencils per plan was not verified for this review.',
  'cmp.importExport.koxora':
    'Project archives can be written and read, and a project can be recovered from one. There is no image export and no import from other tools in the merged version; the features page says so too.',
  'cmp.importExport.drawio': 'Not verified for this review.',
  'cmp.importExport.excalidraw':
    'A drawing can be exported as an open JSON file, which the project describes as its own format.',
  'cmp.importExport.lucidchart': 'Not verified for this review.',
  'cmp.importExport.miro': 'Not verified for this review.',
  'cmp.importExport.visio':
    'Saving a diagram locally as PNG or JPEG is listed for the Microsoft 365 options, as is viewing and editing files created in Visio 2000 and later.',
  'cmp.collaboration.koxora':
    'Shared editing is documented product scope and is not implemented. Nothing on this site presents it as available.',
  'cmp.collaboration.drawio': 'Not verified for this review.',
  'cmp.collaboration.excalidraw':
    'The project describes itself as collaborative and end-to-end encrypted.',
  'cmp.collaboration.lucidchart':
    'Real-time collaboration is named as a feature of the product, and as one that needs a connection.',
  'cmp.collaboration.miro':
    'Boards are shared by default with the members of a team. On the free plan boards can be created without limit, but only the three most recent stay editable, and there are no visitor or guest roles.',
  'cmp.collaboration.visio': 'Not verified for this review.',
  'cmp.ai.koxora':
    'Optional assistance is documented product scope and is not implemented. It is planned as optional, so a Koxora without it stays complete.',
  'cmp.ai.drawio': 'Not verified for this review.',
  'cmp.ai.excalidraw':
    'Generative features and an interface that lets an agent draw into a workspace are listed as part of the paid Excalidraw+ offering.',
  'cmp.ai.lucidchart': 'Not verified for this review.',
  'cmp.ai.miro':
    'Assistance is offered with a credit allowance that depends on the plan; the free plan is listed as a limited trial, which the pricing questions describe as ten credits a month.',
  'cmp.ai.visio': 'Not verified for this review.',
  'cmp.integration.koxora':
    'Integrations and a plugin interface are documented product scope and are not implemented.',
  'cmp.integration.drawio':
    'The official home page names Google Drive, Docs and Slides, Microsoft SharePoint, OneDrive and Teams, Atlassian Confluence and Jira, GitHub repositories and Markdown, an editor extension for VS Code and an extension for Notion.',
  'cmp.integration.excalidraw':
    'The editor is published as a package other applications can embed, and the project is open source, so it can be extended.',
  'cmp.integration.lucidchart': 'Not verified for this review.',
  'cmp.integration.miro':
    'The pricing page names more than 250 applications, available from the free plan upwards.',
  'cmp.integration.visio': 'Not verified for this review.',
  'cmp.licence.koxora':
    'The source code is public. No licence has been published yet, so no rights are granted until it is, and there is no price because there is no release. The legal notice says the same.',
  'cmp.licence.drawio':
    'The desktop application is published under the GPL version 3 licence and is free to use. The online editor requires no account.',
  'cmp.licence.excalidraw':
    'The editor is published under the MIT licence and described as free forever. Excalidraw+ is a paid offering with a trial.',
  'cmp.licence.lucidchart':
    'A subscription product with a free tier. The plan names, their limits and the amounts are published on the official pricing page and are not reproduced here, because they change and differ by region.',
  'cmp.licence.miro':
    'Free, Starter, Business and Enterprise plans. On the free plan boards can be created without limit, but only the three most recent stay editable.',
  'cmp.licence.visio':
    'Visio in Microsoft 365, Visio Plan 1 and Visio Plan 2 are subscriptions, and single-purchase desktop editions exist as well. Only Plan 2 and the single-purchase editions are listed with the desktop application.',
  'cmp.table.title': 'Ten questions, six products',
  'cmp.table.description':
    'Each answer says what was found, and links to the page that says it. Use the filters to look at one question or one product at a time.',
  'cmp.table.caption': 'Koxora compared with five other diagram tools',
  'cmp.table.question': 'Question',
  'cmp.filter.topics': 'Show these topics',
  'cmp.filter.products': 'Show these products',
  'cmp.filter.status':
    '{rows} of {total} questions and {columns} of {products} products shown.',
  'cmp.filter.reset': 'Show everything again',
  'cmp.filter.hint':
    'The filter is a convenience. Without it, and without JavaScript, the whole table is shown.',
  'cmp.legend.title': 'What the answers mean',
  'cmp.sources.title': 'Sources',
  'cmp.sources.note':
    'Every page in this list was read on the date given, and nothing here is claimed beyond what those pages say. If something has changed, or something is wrong, write to {email} and it will be corrected.',
  'cmp.sources.checkedOn': 'Read on {date}',
  'cmp.checked':
    'Comparison content updated on {date}. Individual source review dates are listed below.',
  'cmp.disclaimer.title': 'What this comparison is not',
  'cmp.disclaimer.body':
    'It is written by the Koxora project, so read it as such. It does not claim that Koxora is better: it answers ten questions and shows where each answer comes from. Several of these products do things Koxora does not, and the table says so. Product names and trademarks belong to their owners and are used to identify the products, not to suggest any endorsement.',
  'cmp.pages.title': 'One tool at a time',
  'cmp.pages.note':
    'Shorter pages that answer the same questions for a single product, with guidance on which tool fits which task.',
  'cmp.page.hero.eyebrow': 'Comparison',
  'cmp.page.table.title': 'Side by side',
  'cmp.page.choose.title': 'Which one fits the task',
  'cmp.page.strengths.title': 'What {product} does well',
  'cmp.page.koxora.title': 'What Koxora does differently',
  'cmp.page.chooseOther': 'Choose {product} when',
  'cmp.page.chooseKoxora': 'Choose Koxora when',
  'cmp.page.full': 'All six products, all ten questions',
  'cmp.page.drawio.meta.title': 'Koxora compared with draw.io',
  'cmp.page.drawio.meta.description':
    'draw.io and Koxora side by side: offline use, where the files live, accounts, desktop builds and licensing, each with a source and a date.',
  'cmp.page.drawio.hero.title': 'Koxora and draw.io',
  'cmp.page.drawio.hero.lead':
    'draw.io is the closest tool to what Koxora is trying to be, and it is already finished. This page says where the two differ, with a source for every statement about draw.io.',
  'cmp.page.drawio.strengths.body':
    'The desktop application is described by its makers as completely isolated from the internet apart from a daily update check, which can be switched off. It is published under the GPL version 3 licence for Windows, including an ARM64 and a portable build, for Linux as AppImage, deb, rpm, Snap and Flatpak, and for macOS. The online editor needs no account and uses storage you bring yourself, and the official site names integrations with Google, Microsoft, Atlassian, GitHub, VS Code and Notion. It is a mature tool with a large shape library and years of use behind it.',
  'cmp.page.drawio.koxora.body':
    'Koxora is at the start of its life and has no public release, so the honest comparison today is about intent rather than about a finished product. Koxora is built as one editor with a portable project format across browser and desktop, with German and English in the product from the first version, and with cloud, assistance and collaboration designed as optional parts rather than as the default. What exists today is the development version in the open repository: shapes, text and connections, projects on the device, and project files that can be written and read.',
  'cmp.page.drawio.chooseOther':
    'you need a finished tool today, want the large shape library, work inside Google, Microsoft, Atlassian or GitHub, or want an installed application that does not talk to the internet at all.',
  'cmp.page.drawio.chooseKoxora':
    'you want to follow a tool being built in the open, care about a portable project format and a German interface from the start, and can wait for a release.',
  'cmp.page.miro.meta.title': 'Koxora compared with Miro',
  'cmp.page.miro.meta.description':
    'Miro and Koxora side by side: collaboration, offline use, where boards live, accounts and plans, each with its source and the date it was checked.',
  'cmp.page.miro.hero.title': 'Koxora and Miro',
  'cmp.page.miro.hero.lead':
    'Miro and Koxora are built for different situations: a shared board for a workshop, and a diagram you keep on your own machine. This page says where that difference shows, with a source for every statement about Miro.',
  'cmp.page.miro.strengths.body':
    'Miro is built for people working together. Boards are shared with a team by default, there are desktop applications for macOS, for both Apple silicon and Intel, and for Windows, the pricing page names more than 250 integrations from the free plan upwards, and assistance is offered with a credit allowance per plan. For a workshop with a dozen people on one surface, that is what it is made for, and it is a different job from drawing a diagram and keeping the file.',
  'cmp.page.miro.koxora.body':
    'Koxora starts from the opposite end: the work is yours, on your device, and a service is something you may add rather than something you start with. Projects live on the device and in project files, nothing needs an account, and shared editing is planned as optional. Koxora has no public release, so Miro is a working product today and Koxora is not.',
  'cmp.page.miro.chooseOther':
    'the point is a group of people on one surface at the same time, you want a large catalogue of integrations, or you run workshops and need templates and facilitation tools.',
  'cmp.page.miro.chooseKoxora':
    'the diagram matters more than the meeting, the file has to stay on your machine, you want to work with no account and no connection, and you can wait for a release.',
  'cmp.page.lucidchart.meta.title': 'Koxora compared with Lucidchart',
  'cmp.page.lucidchart.meta.description':
    'Lucidchart and Koxora side by side: offline editing, where documents live, accounts, collaboration and plans, each with a source and a date.',
  'cmp.page.lucidchart.hero.title': 'Koxora and Lucidchart',
  'cmp.page.lucidchart.hero.lead':
    'Lucidchart is a diagram product for teams that also works offline in the browser, which is worth knowing before anyone claims otherwise. This page says where it and Koxora differ, with a source for every statement about Lucidchart.',
  'cmp.page.lucidchart.strengths.body':
    'Offline editing is offered on every plan, in Chrome, Firefox and Edge, on macOS, Windows and Linux, with the documents you already have open: the browser keeps the changes and syncs them when the connection returns. Real-time collaboration is part of the product, and the published system requirements are specific about the browsers and operating systems supported. It is a team product with a free tier and paid plans.',
  'cmp.page.lucidchart.koxora.body':
    'The difference is not whether offline exists but where the work lives. Lucidchart holds documents in its service and caches about ten megabytes in the browser for offline edits; Koxora keeps projects on the device and in project files, with no account and no server behind them. Lucidchart is a finished product and Koxora has no public release, so this is a comparison of designs, not of maturity.',
  'cmp.page.lucidchart.chooseOther':
    'your team already works in Lucid, you need real-time collaboration and comments, or you want a finished product with support behind it.',
  'cmp.page.lucidchart.chooseKoxora':
    'the file has to live on your machine rather than in a provider account, you want to start without registering, and you can wait for a release.',
  'feature.freehand.title': 'Freehand drawing',
  'feature.freehand.body':
    'Sketch with mouse, touch, pen or keyboard. Set stroke colour and width, then move, resize, copy or delete each stroke like an object. Strokes save offline in your project; pressure brushes and an eraser are not included.',
  'docsEditing.fonts.title': 'Fonts, colour and text limits',
  'docsEditing.fonts.body':
    'The searchable menu previews 20 font preferences using installed fonts and fallbacks. No fonts are downloaded; two missing families may look alike on your device. Sizes range from 8 to 96. Automatic colour adapts to the background; explicit colours stay as authored. A label holds up to 4,096 characters. A small shape can clip its display without discarding the stored text: resize it or reduce the font size.',
  'docsEditing.batch.title': 'Changing several objects together',
  'docsEditing.batch.body':
    'Select objects with Shift-click or a marquee, then open Element properties or the context menu. Mixed values stay unchanged until you edit that property. A colour change leaves font choices and other formatting intact. Each batch change is one undo step; only properties supported by the selected objects are offered.',
  'docsEditing.arrange.title': 'Aligning, arranging and stacking',
  'docsEditing.arrange.body':
    'Align appears for at least two selected shapes; Distribute needs three. Hover or focus previews a command and Escape cancels. Align shares an edge or centre and can overlap objects. Arrange without overlap is a separate action that moves selected editable objects around visible obstacles. Bring forward, Send backward, Bring to front and Send to back order shapes and connections within their existing layer. Each command can be undone; there is no full layer manager yet.',
  'docsEditing.pen.title': 'Drawing freehand',
  'docsEditing.pen.body':
    'Choose Freehand pen, set stroke colour and width, and draw with mouse, touch or pen. Each completed stroke is an editable object saved in .koxora. For keyboard drawing, Enter starts at the view centre, arrows extend the stroke, Shift makes larger steps, and Enter finishes. Escape cancels an unfinished stroke. There are no pressure or tilt brushes, eraser or individual point editing.',
  'docsProjects.pages.title': 'Documents and diagram pages',
  'docsProjects.pages.body':
    'One .koxora project can contain several documents, each with diagram pages. Use the Project navigator in the sidebar to switch pages; expanded canvas opens the same navigator from its button. Each page keeps its zoom, position and grid. The accepted Studio 2.5 uses this single hierarchy instead of the originally planned bottom diagram tabs.',
  'docsProjects.actions.title': 'Creating and organising pages',
  'docsProjects.actions.body':
    'Use New document and New page, double-click or F2 to rename, and right-click, Shift+F10 or the row action button for page operations. Duplicate a page, reorder by dragging or Alt+Up/Down, or move it to another document in the same project. Deletion asks for confirmation and supports Undo. The last page of a document and the last document of a project are protected. Referenced pages may also be protected; moving pages between different projects is not supported.',
  'docsProjects.trash.title': 'Switching, copying and deleting projects',
  'docsProjects.trash.body':
    'The navigator lists local projects. Switching saves the current work first; if saving fails, it stays open. Duplicate creates a complete project copy with a new project identity. Delete project asks for confirmation and moves it to local Trash; Restore project brings it back with its recovery data. Trash belongs to this device, is not an export or backup, and does not delete exported .koxora files.',
  'faq.pages.q': 'Where are the diagram tabs?',
  'faq.pages.a':
    'Studio 2.5 provides several diagram pages through one sidebar Project navigator: project, document, page. It replaces the initially planned bottom tabs. Create, rename, duplicate, reorder or delete pages there, and move them between documents in the same project. Each page keeps its own view.',
  'faq.richText.q':
    'Can I format just one word, and do I need to download fonts?',
  'faq.richText.a':
    'Yes: select a word or passage in the canvas text editor and change its font, size, bold, italic, underline or colour. The 20 searchable font preferences use installed families and fallbacks. There are no external font downloads; missing families can look alike and layout can vary between systems. Formatting is stored in .koxora.',
  'faq.pen.q': 'Can I sketch freehand?',
  'faq.pen.a':
    'Yes. The Freehand pen supports mouse, touch, pen and keyboard drawing, with stroke colour and width. Completed strokes can be edited as objects and saved offline. Pressure and tilt brushes, an eraser and point editing are not implemented.',
  'faq.links.q': 'Can a shape link to another page or website?',
  'faq.links.a':
    'Interactive link authoring and activation are not implemented yet. Ordinary navigation between pages is available in the sidebar; it does not make shapes clickable links. Cross-project page transfer and a full layer manager are also future work.',
  'milestone.workbook.title': 'Pages, rich text and freehand editing',
  'milestone.workbook.body':
    'Studio 2.5: project/document/page navigation, word-level formatting, offline font preferences, batch properties, freehand pen, stacking and non-overlap arrangement. Manually accepted and merged; no public release.',
  'docsEditing.rich.alt':
    'The Studio 2.5 canvas text editor showing mixed word formatting and its font toolbar.',
  'docsEditing.rich.caption':
    'The Studio 2.5 canvas text editor showing mixed word formatting and its font toolbar. Captured from the accepted development version; not a public release.',
  'docsEditing.pen.alt':
    'The Studio 2.5 freehand pen and a drawn stroke alongside a diagram.',
  'docsEditing.pen.caption':
    'The Studio 2.5 freehand pen and a drawn stroke alongside a diagram. Captured from the accepted development version; not a public release.',
  'docsProjects.shot.alt':
    'The Studio 2.5 sidebar navigator with multiple documents and pages and the page context menu.',
  'docsProjects.shot.caption':
    'The Studio 2.5 sidebar navigator with multiple documents and pages and the page context menu. Captured from the accepted development version; not a public release.',
} as const;
export type WebsiteMessageKey = keyof typeof en;

import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createProject, exportProject } from '../../packages/project/src/index';
import {
  applyEdit,
  applyWorkbook,
  selectPage,
  resolveAppearance,
  DEFAULT_CONNECTION,
  type EditCommand,
  type ShapeKind,
} from '../../packages/editor-core/src/index';
// Captures genuine screenshots of the current studio for the public website.
// Nothing is drawn or retouched: the studio renders the project below and the
// browser records what it shows.
//
// Every control is reached by the accessible name a reader is told about. The
// names are written out per language instead of being read from the studio's
// message catalog, so a renamed control breaks this run instead of silently
// leaving the website describing an interface nobody can find.
const directory = 'apps/website/public/images/studio';
const origin = 'http://127.0.0.1:4173';
const desktop = { width: 1440, height: 980 };
const phone = { width: 390, height: 844 };
const now = '2026-11-15T09:00:00.000Z';
const sizes: Record<string, { width: number; height: number }> = {};
type Locale = 'en' | 'de';
/** The studio's own accessible names, in the language being captured. */
const names = {
  en: {
    import: 'Import .koxora',
    open: 'Open project',
    saved: 'Saved on this device',
    fit: 'Fit content',
    settings: 'Settings…',
    language: 'Language',
    appearance: 'Appearance',
    close: 'Close',
    expand: 'Expand canvas',
    restore: 'Restore workspace',
    templates: 'Templates',
    back: 'Back to projects',
    objects: 'Objects',
    element: 'Diagram element',
    properties: 'Element properties',
    text: 'Text',
    links: 'Links',
    linkType: 'Link type',
    destination: 'Destination page',
    cells: 'Table cell contents',
    help: 'Help',
    shortcuts: 'Keyboard shortcuts',
    pageActions: 'Page actions: ',
    editText: 'Edit text on canvas',
    pen: 'Freehand pen',
    outline: 'Outline',
    outlineWidth: 'Outline width',
    undo: 'Undo',
    browse: 'Browse elements…',
    library: 'Element library',
  },
  de: {
    import: '.koxora importieren',
    open: 'Projekt öffnen',
    saved: 'Auf diesem Gerät gespeichert',
    fit: 'Inhalt einpassen',
    settings: 'Einstellungen …',
    language: 'Sprache',
    appearance: 'Darstellung',
    close: 'Schließen',
    expand: 'Zeichenfläche erweitern',
    restore: 'Arbeitsbereich wiederherstellen',
    templates: 'Vorlagen',
    back: 'Zurück zu Projekten',
    objects: 'Objekte',
    element: 'Diagrammelement',
    properties: 'Elementeigenschaften',
    text: 'Text',
    links: 'Links',
    linkType: 'Linktyp',
    destination: 'Zielseite',
    cells: 'Tabelleninhalte',
    help: 'Hilfe',
    shortcuts: 'Tastenkürzel',
    pageActions: 'Seitenaktionen: ',
    editText: 'Text auf der Zeichenfläche bearbeiten',
    pen: 'Freihandstift',
    outline: 'Kontur',
    outlineWidth: 'Konturstärke',
    undo: 'Rückgängig',
    browse: 'Elemente durchsuchen…',
    library: 'Elementbibliothek',
  },
} as const;
/**
 * The sample project, written in the language of the page that shows it. A
 * diagram is the reader's own content and the studio never translates it, so
 * each language gets its own project rather than one relabelled interface.
 */
const sample = {
  en: {
    project: 'Product discovery',
    document: 'Discovery',
    overview: 'Overview',
    notes: 'Research notes',
    second: 'Delivery',
    idea: 'New idea',
    research: ['Research ', 'options'],
    review: 'Review',
    revise: 'Revise draft',
    release: 'Release notes',
    archive: 'Archive',
    planTitle: 'Launch plan',
    planBody: 'Checklist\nSign-off',
    table: [
      ['Task', 'Owner', 'Status'],
      ['Interviews', 'Ada', 'Done'],
      ['Prototype', 'Lin', 'In progress'],
    ],
  },
  de: {
    project: 'Produktfindung',
    document: 'Erkundung',
    overview: 'Überblick',
    notes: 'Recherchenotizen',
    second: 'Umsetzung',
    idea: 'Neue Idee',
    research: ['Optionen ', 'recherchieren'],
    review: 'Prüfung',
    revise: 'Entwurf überarbeiten',
    release: 'Versionshinweise',
    archive: 'Archiv',
    planTitle: 'Startplan',
    planBody: 'Checkliste\nFreigabe',
    table: [
      ['Aufgabe', 'Zuständig', 'Status'],
      ['Interviews', 'Ada', 'Erledigt'],
      ['Prototyp', 'Lin', 'In Arbeit'],
    ],
  },
} as const;
type ShapeId =
  | 'idea'
  | 'research'
  | 'review'
  | 'revise'
  | 'release'
  | 'archive'
  | 'table'
  | 'plan';
const layout: {
  id: ShapeId;
  kind: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
}[] = [
  { id: 'idea', kind: 'ellipse', x: -400, y: -260, width: 180, height: 100 },
  {
    id: 'research',
    kind: 'rectangle',
    x: -130,
    y: -260,
    width: 240,
    height: 100,
  },
  { id: 'review', kind: 'diamond', x: 200, y: -275, width: 200, height: 130 },
  { id: 'archive', kind: 'database', x: -390, y: -70, width: 160, height: 120 },
  {
    id: 'revise',
    kind: 'rounded-rectangle',
    x: -130,
    y: -60,
    width: 240,
    height: 100,
  },
  { id: 'release', kind: 'document', x: 200, y: -60, width: 200, height: 100 },
  { id: 'table', kind: 'table', x: -400, y: 120, width: 510, height: 150 },
  { id: 'plan', kind: 'container', x: 200, y: 120, width: 200, height: 150 },
];
const edges: [ShapeId, ShapeId][] = [
  ['idea', 'research'],
  ['research', 'review'],
  ['review', 'release'],
  ['review', 'revise'],
  ['revise', 'research'],
  ['release', 'plan'],
  ['idea', 'archive'],
];
function build(locale: Locale) {
  const content = sample[locale];
  let project = createProject(content.project, () => crypto.randomUUID(), now);
  const document = project.documents[0];
  const first = document.pages[0];
  const layerId = first.layers[0].id;
  const edit = (command: EditCommand) => {
    project = applyEdit(project, document.id, first.id, command, now);
  };
  const labels: Partial<Record<ShapeId, string>> = {
    idea: content.idea,
    research: content.research.join(''),
    review: content.review,
    revise: content.revise,
    release: content.release,
    archive: content.archive,
    plan: content.planBody,
  };
  const ids = {} as Record<ShapeId, string>;
  for (const shape of layout) {
    ids[shape.id] = crypto.randomUUID();
    edit({
      type: 'insert',
      id: ids[shape.id],
      kind: shape.kind,
      text: labels[shape.id] ?? '',
      position: { x: shape.x, y: shape.y },
      geometry: {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        rotation: 0,
      },
      layerId,
    });
  }
  const node = (id: string) =>
    project.documents[0].pages[0].nodes.find((entry) => entry.id === id)!;
  // The table and the container carry their text in regions of their own:
  // cells that are edited one at a time, and a title beside the body.
  for (const [id, textRegions] of [
    [
      ids.table,
      {
        version: 1,
        type: 'table',
        headerRow: true,
        cells: content.table.map((row) => [...row]),
      },
    ],
    [ids.plan, { version: 1, type: 'container', title: content.planTitle }],
  ] as const)
    edit({
      type: 'updateNode',
      id,
      text: String(node(id).content.text ?? ''),
      style: resolveAppearance(node(id)),
      textRegions,
    });
  for (const [source, target] of edges)
    edit({
      type: 'connect',
      id: crypto.randomUUID(),
      sourceId: ids[source],
      targetId: ids[target],
      layerId,
      options: { ...DEFAULT_CONNECTION },
    });
  // Two words formatted differently, which is what word-level formatting is.
  edit({
    type: 'richText',
    id: ids.research,
    value: {
      version: 1,
      paragraphs: [
        {
          align: 'center',
          runs: [
            {
              text: content.research[0],
              style: { fontWeight: 700, textColor: '#2766d7' },
            },
            { text: content.research[1], style: { fontStyle: 'italic' } },
          ],
        },
      ],
    },
  });
  for (const command of [
    {
      type: 'renameDocument',
      documentId: document.id,
      title: content.document,
    },
    { type: 'renamePage', pageId: first.id, title: content.overview },
    { type: 'newPage', documentId: document.id, title: content.notes },
    { type: 'newDocument', title: content.second },
  ] as const)
    project = applyWorkbook(project, command, () => crypto.randomUUID(), now);
  project = selectPage(project, document.id, first.id);
  return { project, ids };
}
async function settle(page: Page) {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
}
async function shoot(page: Page, name: string) {
  mkdirSync(directory, { recursive: true });
  const buffer = await page.screenshot({ path: `${directory}/${name}.png` });
  const size = await page.evaluate(
    (data) =>
      new Promise<{ width: number; height: number; webp: string }>(
        (resolve, reject) => {
          const image = new Image();
          image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            canvas.getContext('2d')!.drawImage(image, 0, 0);
            resolve({
              width: image.naturalWidth,
              height: image.naturalHeight,
              webp: canvas.toDataURL('image/webp', 0.9),
            });
          };
          image.onerror = () =>
            reject(new Error('Screenshot could not be decoded'));
          image.src = `data:image/png;base64,${data}`;
        },
      ),
    buffer.toString('base64'),
  );
  writeFileSync(
    `${directory}/${name}.webp`,
    Buffer.from(size.webp.split(',')[1]!, 'base64'),
  );
  sizes[name] = { width: size.width, height: size.height };
}
/**
 * Language and appearance live in Settings, under General. The dialog is
 * closed by whatever its close control is called once the choice has applied,
 * which for the language is the point of the choice.
 */
async function preference(
  page: Page,
  open: string,
  field: string,
  value: string,
  close: string,
) {
  await page.getByRole('button', { name: open, exact: true }).click();
  await page
    .getByRole('dialog', { name: open, exact: true })
    .getByRole('combobox', { name: field, exact: true })
    .selectOption(value);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: close, exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function capture(page: Page, locale: Locale) {
  let ui: (typeof names)[Locale] = names.en;
  const content = sample[locale];
  // A control that is not there fails here, by name, instead of at the end.
  page.setDefaultTimeout(15000);
  await page.setViewportSize(desktop);
  await page.clock.setFixedTime(new Date(now));
  // The library first, before anything is imported: once a project exists on
  // the device the studio lists it, which is the point of local-first and
  // also why a first-time view has to be captured first.
  await page.goto(`${origin}/`);
  await expect(
    page.getByRole('button', { name: ui.import, exact: true }),
  ).toBeVisible();
  if (locale === 'en') {
    await settle(page);
    await shoot(page, 'docs-dashboard');
  } else {
    // A fresh profile starts in English; the language is then chosen in the
    // studio itself, independently of the operating system.
    await preference(
      page,
      ui.settings,
      ui.language,
      locale,
      names[locale].close,
    );
    ui = names[locale];
  }
  const appearance = (theme: 'dark' | 'light') =>
    preference(page, ui.settings, ui.appearance, theme, ui.close);
  await appearance('dark');
  // The template overview, reached from the library the way a reader would.
  await page
    .locator('.start-actions')
    .getByRole('button', { name: ui.templates, exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: ui.templates, exact: true, level: 1 }),
  ).toBeVisible();
  await expect(page.locator('.template-card')).toHaveCount(8);
  await settle(page);
  await shoot(page, `docs-templates-${locale}`);
  await page.getByRole('button', { name: ui.back, exact: true }).click();
  const { project, ids } = build(locale);
  await page.getByRole('button', { name: ui.import, exact: true }).click();
  await page
    .getByRole('dialog')
    .getByLabel(ui.import, { exact: true })
    .setInputFiles({
      name: 'sample.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await expect(page.locator('[data-node-id]').first()).toBeVisible();
  const fit = async () => {
    await page.getByRole('button', { name: ui.fit, exact: true }).click();
    // Wait for the automatic local save so the status shows a settled state.
    await expect(page.locator('.save-status')).toHaveText(ui.saved);
    await settle(page);
  };
  /** Selects through the object list, because a click on a label edits it. */
  const select = async (id: string) => {
    if (!(await page.getByLabel(ui.element, { exact: true }).isVisible()))
      await page.getByRole('button', { name: ui.objects, exact: true }).click();
    await page.getByLabel(ui.element, { exact: true }).selectOption(id);
    const region = page.getByRole('region', {
      name: ui.properties,
      exact: true,
    });
    await expect(region).toBeVisible();
    return region;
  };
  await fit();
  // Only what is in view is drawn, so the count is taken once it all fits.
  await expect(page.locator('[data-node-id]')).toHaveCount(layout.length);
  if (locale === 'en') {
    await shoot(page, 'editor-dark');
    await appearance('light');
    await fit();
    await shoot(page, 'editor-light');
    await appearance('dark');
  }
  // Each language gets its own narrow-screen screenshot, so a reader never
  // sees the interface in a language the page is not written in. The studio
  // arranges its panels for the window it starts in, so the phone view is
  // loaded at that size rather than squeezed from a desktop one.
  const reopen = async (viewport: { width: number; height: number }) => {
    await page.setViewportSize(viewport);
    await page.reload();
    await page.getByRole('button', { name: ui.open, exact: true }).click();
    await expect(page.locator('[data-node-id]').first()).toBeVisible();
    await fit();
  };
  await reopen(phone);
  await shoot(page, `editor-small-${locale}`);
  await reopen(desktop);
  /** A settled picture: the save has landed and nothing is half-focused. */
  const snap = async (name: string, blur = true) => {
    await expect(page.locator('.save-status')).toHaveText(ui.saved);
    if (blur) await settle(page);
    await shoot(page, name);
  };
  // The documentation pages show what a reader is told about, each reached
  // the way the documentation says to reach it.
  let properties = await select(ids.review);
  if (locale === 'en') await snap('docs-properties');
  // A link is authored in the Links tab and applies as it is chosen.
  await properties.getByRole('tab', { name: ui.links, exact: true }).click();
  await properties
    .getByLabel(ui.linkType, { exact: true })
    .selectOption('page');
  await properties
    .getByLabel(ui.destination, { exact: true })
    .selectOption({ label: content.notes });
  await snap(`docs-links-${locale}`);
  await page.getByRole('button', { name: ui.undo, exact: true }).click();
  // A table keeps one text per cell; its Text tab shows the grid.
  properties = await select(ids.table);
  await properties.getByRole('tab', { name: ui.text, exact: true }).click();
  await expect(
    properties.getByRole('region', { name: ui.cells, exact: true }),
  ).toBeVisible();
  await snap(`docs-table-${locale}`);
  // Back to nothing selected and the object list closed, which is how the
  // workbench looks before a reader has touched anything. A click on blank
  // canvas clears the selection; fitted content always leaves a margin.
  await page.getByRole('button', { name: ui.objects, exact: true }).click();
  await expect(page.getByLabel(ui.element, { exact: true })).toHaveCount(0);
  const blank = (await page.locator('.interactive-canvas').boundingBox())!;
  await page.mouse.click(blank.x + 14, blank.y + 14);
  await expect(
    page.getByRole('region', { name: ui.properties, exact: true }),
  ).toHaveCount(0);
  // The navigator beside the sheet tabs: one project, its documents and
  // pages, and the actions a page offers.
  await page
    .getByRole('button', {
      name: `${ui.pageActions}${content.overview}`,
      exact: true,
    })
    .click();
  await expect(page.getByRole('menu')).toBeVisible();
  await snap(`docs-navigator-${locale}`, false);
  await page.keyboard.press('Escape');
  if (locale === 'en') {
    await page
      .getByRole('menubar')
      .getByRole('menuitem', { name: ui.help, exact: true })
      .click();
    await page
      .getByRole('menuitem', { name: ui.shortcuts, exact: true })
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await snap('docs-shortcuts', false);
    await page.keyboard.press('Escape');
  }
  // A click on a label opens the text editor beside it.
  await page.locator(`[data-node-id="${ids.research}"]`).first().click();
  const editor = page.getByRole('dialog', { name: ui.editText, exact: true });
  await expect(editor).toBeVisible();
  await expect(editor.locator('[contenteditable]')).toContainText(
    content.research.join(''),
  );
  await snap(`docs-rich-text-${locale}`, false);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: ui.pen, exact: true }).click();
  await page.getByLabel(ui.outline, { exact: true }).fill('#e9a83b');
  await page.getByLabel(ui.outlineWidth, { exact: true }).fill('5');
  // The stroke goes through the free band between two rows of the diagram,
  // measured from where the studio actually drew them.
  const drawn = async (id: string) =>
    (await page.locator(`[data-node-id="${id}"]`).first().boundingBox())!;
  const above = await drawn(ids.revise);
  const below = await drawn(ids.table);
  const beside = await drawn(ids.plan);
  const top = above.y + above.height;
  const gap = below.y - top;
  const from = below.x + 16;
  const to = beside.x - 28;
  await page.mouse.move(from, top + gap / 2);
  await page.mouse.down();
  for (let i = 1; i <= 60; i++)
    await page.mouse.move(
      from + ((to - from) * i) / 60,
      top + gap / 2 + Math.sin(i / 5) * (gap / 2 - 16),
    );
  await page.mouse.up();
  await expect(page.locator('[data-node-id]')).toHaveCount(layout.length + 1);
  await snap(`docs-freehand-${locale}`);
  await page.getByRole('button', { name: ui.undo, exact: true }).click();
  await expect(page.locator('[data-node-id]')).toHaveCount(layout.length);
  await page.keyboard.press('Escape');
  // The element browser: every built-in element with its name.
  await page.getByRole('button', { name: ui.browse, exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: ui.library, exact: true }),
  ).toBeVisible();
  await snap(`docs-library-${locale}`);
  await page.keyboard.press('Escape');
}
test('capture studio screenshots for the website', async ({ browser }) => {
  test.setTimeout(240000);
  // One profile per language, so neither run sees the other's projects and
  // each starts the way a first visit does.
  for (const locale of ['en', 'de'] as const) {
    const context = await browser.newContext({ viewport: desktop });
    const page = await context.newPage();
    try {
      await capture(page, locale);
    } finally {
      await context.close();
    }
  }
  const entries = Object.entries(sizes)
    .map(
      ([name, size]) =>
        `  '${name}': { width: ${size.width}, height: ${size.height} },`,
    )
    .join('\n');
  writeFileSync(
    'apps/website/src/content/screenshots.ts',
    `// Generated by tests/assets/studio-screenshots.spec.ts. Do not edit.\n` +
      `export const screenshotSizes: Record<\n  string,\n  { width: number; height: number }\n> = {\n${entries}\n};\n`,
  );
});

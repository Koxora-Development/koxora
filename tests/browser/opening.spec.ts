import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { applyEdit, elementLink } from '../../packages/editor-core/src/index';
test.setTimeout(60000);
import {
  createProject,
  exportProject,
  parseProject,
} from '../../packages/project/src/index';
async function bytes(title: string) {
  return Array.from(
    await exportProject(
      createProject(title, randomUUID, '2026-11-09T00:00:00.000Z'),
    ),
  );
}
async function harness(page: Page, initial: number[] | null) {
  await page.addInitScript((initial) => {
    const records = new Map<string, string>();
    let sequence = 0;
    const queue: {
      id: number;
      name: string;
      bytes: number[];
      error: null;
      copy: boolean;
    }[] = [];
    const enqueue = (bytes: number[], copy = false) =>
      queue.push({
        id: ++sequence,
        name: 'Plan 世界.koxora',
        bytes,
        error: null,
        copy,
      });
    if (initial) enqueue(initial);
    Object.assign(window, {
      openingTest: { enqueue, records, queue, picker: initial, ackFailures: 0 },
      __TAURI__: {
        core: {
          invoke: async (
            command: string,
            args: Record<string, unknown> = {},
          ) => {
            if (command === 'storage_status')
              return {
                directory:
                  sessionStorage.getItem('location') ?? '/default/projects-v1',
                firstRun: false,
              };
            if (command === 'storage_change') {
              sessionStorage.setItem('location', '/migrated/projects-v1');
              return true;
            }
            if (command === 'project_list') return [...records.keys()];
            if (command === 'project_read')
              return records.get(args.id as string) ?? null;
            if (command === 'project_write') {
              if ((records.get(args.id as string) ?? null) !== args.expected)
                throw 'conflict';
              records.set(args.id as string, args.value as string);
              return;
            }
            if (command === 'project_open_next') return queue[0] ?? null;
            if (command === 'project_open_ack') {
              const test = (
                window as unknown as { openingTest: { ackFailures: number } }
              ).openingTest;
              if (test.ackFailures > 0) {
                test.ackFailures--;
                throw 'storage';
              }
              if (queue[0]?.id !== args.id) throw 'conflict';
              queue.shift();
              return;
            }
            if (command === 'project_open_choose') {
              const value = (
                window as unknown as { openingTest: { picker: number[] } }
              ).openingTest.picker;
              enqueue(value, Boolean(args.asCopy));
              return;
            }
            throw 'storage';
          },
        },
      },
    });
  }, initial);
  await page.goto('/');
}
async function enqueue(page: Page, data: number[]) {
  await page.evaluate(
    (data) =>
      (
        window as unknown as {
          openingTest: { enqueue: (data: number[]) => void };
        }
      ).openingTest.enqueue(data),
    data,
  );
}
test('cold and warm requests open actual projects, preserve pending edits, and reopen idempotently', async ({
  page,
}) => {
  const first = await bytes('First');
  const second = await bytes('Second');
  await harness(page, first);
  await expect(
    page.getByRole('textbox', { name: 'Project name', exact: true }),
  ).toHaveValue('First');
  await enqueue(page, first);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as unknown as {
              openingTest: { records: Map<string, string> };
            }
          ).openingTest.records.size,
      ),
    )
    .toBe(1);
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as unknown as { openingTest: { queue: unknown[] } })
              .openingTest.queue.length,
        ),
      { timeout: 15000 },
    )
    .toBe(0);
  await page
    .getByRole('textbox', { name: 'Project name', exact: true })
    .fill('Pending First');
  await enqueue(page, second);
  await expect(
    page.getByRole('textbox', { name: 'Project name', exact: true }),
  ).toHaveValue('Second');
  const stored = await page.evaluate(() => [
    ...(
      window as unknown as { openingTest: { records: Map<string, string> } }
    ).openingTest.records.values(),
  ]);
  const titles = await Promise.all(
    stored.map(
      async (raw) =>
        (await parseProject((JSON.parse(raw) as { current: string }).current))
          .manifest.title,
    ),
  );
  expect(titles).toContain('Pending First');
});
test('invalid requests pause queue, cancellation continues, picker import-as-copy keeps intent in German', async ({
  page,
}) => {
  const data = await bytes('Portable');
  await harness(page, null);
  await enqueue(page, [1, 2, 3]);
  await enqueue(page, data);
  await expect(
    page.getByRole('dialog', { name: 'Could not open requested project' }),
  ).toBeVisible();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  await expect(
    page.getByRole('textbox', { name: 'Project name', exact: true }),
  ).toHaveValue('Portable');
  await page.evaluate((data) => {
    (
      window as unknown as { openingTest: { picker: number[] } }
    ).openingTest.picker = data;
  }, data);
  await page
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('de');
  await page
    .getByRole('button', { name: '.koxora importieren', exact: true })
    .click();
  await page.getByRole('checkbox').check();
  await page.evaluate(() => {
    (
      window as unknown as { openingTest: { ackFailures: number } }
    ).openingTest.ackFailures = 1;
  });
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Eine .koxora-Datei auswählen', exact: false })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as unknown as {
              openingTest: { records: Map<string, string> };
            }
          ).openingTest.records.size,
      ),
    )
    .toBe(2);
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as unknown as { openingTest: { queue: unknown[] } })
              .openingTest.queue.length,
        ),
      { timeout: 15000 },
    )
    .toBe(0);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { openingTest: { records: Map<string, string> } })
          .openingTest.records.size,
    ),
  ).toBe(2);
});
test('browser drop validates files, retains work and offers explicit conflict recovery', async ({
  page,
}) => {
  const data = await bytes('Dropped');
  await page.goto('/');
  async function drop() {
    const transfer = await page.evaluateHandle((data) => {
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array(data)], 'Portable.koxora'));
      return dt;
    }, data);
    await page
      .locator('.application-body')
      .dispatchEvent('drop', { dataTransfer: transfer });
  }
  await drop();
  await expect(
    page.getByRole('textbox', { name: 'Project name', exact: true }),
  ).toHaveValue('Dropped');
  await page
    .getByRole('textbox', { name: 'Project name', exact: true })
    .fill('Changed');
  await drop();
  await expect(
    page.getByRole('dialog', { name: 'Could not open requested project' }),
  ).toBeVisible();
  await page.getByRole('dialog').getByRole('checkbox').check();
  await page
    .getByRole('button', { name: 'Retry opening', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('textbox', { name: 'Project name', exact: true }),
  ).toHaveValue('Dropped');
});

test('combined storage migration holds warm requests until the dialog closes and preserves the source', async ({
  page,
}) => {
  await harness(page, await bytes('Before migration'));
  await expect(
    page.getByRole('textbox', { name: 'Project name', exact: true }),
  ).toHaveValue('Before migration');
  await page
    .getByRole('button', { name: 'Settings · Storage', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Settings · Storage' });
  await expect(dialog).toContainText('/default/projects-v1');
  await enqueue(page, await bytes('Queued during migration'));
  // More than two queue polling intervals: a modal must keep this request pending.
  await expect
    .poll(async () => {
      await page.waitForTimeout(1800);
      return page.evaluate(
        () =>
          (window as unknown as { openingTest: { queue: unknown[] } })
            .openingTest.queue.length,
      );
    })
    .toBe(1);
  await expect(
    page.getByRole('textbox', { name: 'Project name', exact: true }),
  ).toHaveValue('Before migration');
  await dialog
    .getByRole('button', { name: 'Change location…', exact: true })
    .click();
  await expect(dialog).toContainText('/migrated/projects-v1');
  await expect(page.locator('.workspace-header')).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { openingTest: { queue: unknown[] } })
            .openingTest.queue.length,
      ),
    )
    .toBe(1);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Project name', exact: true }),
  ).toHaveValue('Queued during migration');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as unknown as {
              openingTest: { records: Map<string, string> };
            }
          ).openingTest.records.size,
      ),
    )
    .toBe(2);
});

test('warm requests wait for unapplied element link drafts without losing their values', async ({
  page,
}) => {
  let source = createProject(
    'Link draft source',
    randomUUID,
    '2026-11-10T00:00:00.000Z',
  );
  const doc = source.documents[0],
    target = doc.pages[0],
    id = randomUUID();
  source = applyEdit(
    source,
    doc.id,
    target.id,
    {
      type: 'insert',
      id,
      kind: 'rectangle',
      position: { x: 0, y: 0 },
      layerId: target.layers[0].id,
      text: 'Source',
    },
    '2026-11-10T00:00:00.000Z',
  );
  await harness(page, Array.from(await exportProject(source)));
  await expect(
    page.getByRole('textbox', { name: 'Project name', exact: true }),
  ).toHaveValue('Link draft source');
  const picker = page.getByLabel('Diagram element', { exact: true });
  if (!(await picker.isVisible()))
    await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await picker.selectOption(id);
  const dialog = page.getByRole('dialog', { name: 'Element properties' });
  await dialog.getByLabel('Link type', { exact: true }).selectOption('url');
  await dialog
    .getByLabel('URL address', { exact: true })
    .fill('https://example.org/pending-draft');
  await enqueue(page, await bytes('After link dialog'));
  await page.waitForTimeout(1800);
  await expect(dialog.getByLabel('URL address', { exact: true })).toHaveValue(
    'https://example.org/pending-draft',
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { openingTest: { queue: unknown[] } })
            .openingTest.queue.length,
      ),
    )
    .toBe(1);
  await dialog
    .getByRole('button', { name: 'Apply changes', exact: true })
    .click();
  await expect(
    page.getByRole('textbox', { name: 'Project name', exact: true }),
  ).toHaveValue('After link dialog');
  const stored = await page.evaluate(
    (id) =>
      (
        window as unknown as { openingTest: { records: Map<string, string> } }
      ).openingTest.records.get(id)!,
    source.manifest.projectId,
  );
  const saved = await parseProject(JSON.parse(stored).current);
  expect(elementLink(saved, id)).toMatchObject({
    state: 'ready',
    target: { type: 'url', url: 'https://example.org/pending-draft' },
  });
});

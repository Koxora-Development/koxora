import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
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

import { expect, test } from '@playwright/test';
import { importProject } from '../../packages/project/src/index';

type NativeTest = {
  calls: {
    suggestedName: string;
    bytes: number[];
    labels: Record<string, string>;
  }[];
  finish: (value: string | null, failure?: boolean) => void;
};
declare global {
  interface Window {
    nativeTest: NativeTest;
  }
}
// The browser harness verifies the shared UI/IPC contract, not an OS dialog.
// Native filesystem semantics are exercised separately by Rust tests.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const records = new Map<string, string>();
    window.nativeTest = { calls: [], finish: () => {} };
    Object.assign(window, {
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
            if (command === 'project_export') {
              window.nativeTest.calls.push(args as NativeTest['calls'][number]);
              return new Promise((resolve, reject) => {
                window.nativeTest.finish = (value, failure) =>
                  failure ? reject(value) : resolve(value);
              });
            }
            throw 'storage';
          },
        },
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await expect(
    page.getByText('Saved on this device', { exact: true }),
  ).toBeVisible();
});

test('Save As awaits the native choice, cancellation is explicit and the project remains saved', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Save as…', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Save as…', exact: true }),
  ).toBeDisabled();
  await expect(page.locator('.save-status')).toHaveText(
    'Preparing project export…',
  );
  await expect
    .poll(() => page.evaluate(() => window.nativeTest.calls.length))
    .toBe(1);
  await page.evaluate(() => window.nativeTest.finish(null));
  await expect(page.getByRole('status')).toHaveText(
    'Export cancelled. No file was written.',
  );
  await expect(
    page.getByText('Saved on this device', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveValue(
    'Untitled project',
  );
  await expect(
    page.getByRole('button', { name: 'Save as…', exact: true }),
  ).toBeEnabled();
});

test('Save As carries complete project bytes and localized labels and reports the selected path', async ({
  page,
}) => {
  await page
    .getByRole('textbox', { name: 'Project name' })
    .fill('Roadmap 世界');
  await expect(
    page.getByText('Saved on this device', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('de');
  await page
    .getByRole('button', { name: 'Speichern unter…', exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.nativeTest.calls.length))
    .toBe(1);
  const call = await page.evaluate(() => window.nativeTest.calls[0]);
  expect(call.suggestedName).toBe('Roadmap 世界');
  expect(call.labels.title).toBe('Projekt speichern unter');
  expect(call.labels.overwrite).toBe('Datei ersetzen');
  expect(Object.hasOwn(call, 'path')).toBe(false);
  expect((await importProject(new Uint8Array(call.bytes))).manifest.title).toBe(
    'Roadmap 世界',
  );
  await page.evaluate(() => window.nativeTest.finish('/chosen/Roadmap.koxora'));
  await expect(page.getByRole('status')).toContainText(
    '/chosen/Roadmap.koxora',
  );
  await expect(page.getByRole('textbox', { name: 'Projektname' })).toHaveValue(
    'Roadmap 世界',
  );
});

test('native export failures remain visible and retry preserves the active project', async ({
  page,
}) => {
  for (const failure of ['storage', 'conflict']) {
    await page.getByRole('button', { name: 'Save as…', exact: true }).click();
    await expect(page.locator('.save-status')).toHaveText(
      'Preparing project export…',
    );
    await page.evaluate(
      (failure) => window.nativeTest.finish(failure, true),
      failure,
    );
    await expect(page.getByRole('alert')).toContainText(
      failure === 'storage' ? 'Local storage' : 'changed elsewhere',
    );
    await expect(
      page.getByRole('textbox', { name: 'Project name' }),
    ).toHaveValue('Untitled project');
    await expect(
      page.getByRole('button', { name: 'Save as…', exact: true }),
    ).toBeEnabled();
  }
});

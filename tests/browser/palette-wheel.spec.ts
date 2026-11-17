import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createProject, exportProject } from '../../packages/project/src/index';

async function open(page: Page, locale = 'en') {
  await page.addInitScript(
    (locale) =>
      localStorage.setItem(
        'koxora.preferences.v1',
        JSON.stringify({ locale, guiScale: 100, theme: 'light' }),
      ),
    locale,
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  const messages: Record<string, string> = JSON.parse(
    readFileSync(`packages/i18n/src/locales/${locale}.json`, 'utf8'),
  );
  const project = createProject(
    'Wheel through symbols',
    () => crypto.randomUUID(),
    '2026-11-17T10:00:00.000Z',
  );
  await page.goto('/');
  await page
    .getByRole('button', { name: messages['project.import'], exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel(messages['project.import'], { exact: true })
    .setInputFiles({
      name: 'palette-wheel.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await expect(page.locator('.save-status')).toHaveText(
    messages['project.saved'],
  );
  await page.clock.install();
  return {
    messages,
    strip: page.locator('.palette-strip'),
    status: page.locator('.palette-page-status'),
    next: page.getByRole('button', {
      name: messages['palette.nextPage'],
      exact: true,
    }),
    previous: page.getByRole('button', {
      name: messages['palette.previousPage'],
      exact: true,
    }),
  };
}
async function dispatch(
  locator: Locator,
  options: {
    deltaX?: number;
    deltaY?: number;
    deltaMode?: number;
    ctrlKey?: boolean;
    metaKey?: boolean;
  },
) {
  return locator.evaluate((element, options) => {
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      ...options,
    });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  }, options);
}

for (const locale of ['en', 'de'])
  test(`mouse wheel changes symbol pages over icons and arrows without scrolling a narrow editor ${locale}`, async ({
    page,
    isMobile,
  }) => {
    const { strip, status, next, previous } = await open(page, locale);
    await page.setViewportSize({ width: 420, height: 540 });
    await strip.scrollIntoViewIfNeeded();
    await expect(next).toBeEnabled();
    const first = await status.textContent();
    const icon = strip.locator('.palette-tool').first();
    await icon.hover();
    // Touch emulation suppresses CDP mouse-wheel input; dispatch the same native
    // event there, while desktop projects exercise real wheel delivery.
    if (isMobile) expect(await dispatch(icon, { deltaY: 120 })).toBe(true);
    else await page.mouse.wheel(0, 120);
    await expect(status).not.toHaveText(first!);
    await page.clock.runFor(260);
    await previous.hover();
    const before = await page.evaluate(() => ({
      library: document.querySelector('.element-library')!.scrollTop,
      stage: document.querySelector('.interactive-stage')!.scrollTop,
      camera: document
        .querySelector('.interactive-canvas')!
        .getAttribute('data-camera'),
    }));
    if (isMobile) expect(await dispatch(previous, { deltaY: -120 })).toBe(true);
    else await page.mouse.wheel(0, -120);
    await expect(status).toHaveText(first!);
    expect(
      await page.evaluate(() => ({
        library: document.querySelector('.element-library')!.scrollTop,
        stage: document.querySelector('.interactive-stage')!.scrollTop,
        camera: document
          .querySelector('.interactive-canvas')!
          .getAttribute('data-camera'),
      })),
    ).toEqual(before);
    await page.clock.runFor(260);
    await next.focus();
    await page.keyboard.press('Enter');
    await expect(status).not.toHaveText(first!);
    await previous.focus();
    await page.keyboard.press('Enter');
    await expect(status).toHaveText(first!);
  });

test('trackpad bursts, line/page delta modes, boundaries and zoom modifiers preserve bounded paging', async ({
  page,
}) => {
  const { messages, strip, status, next, previous } = await open(page);
  const first = await status.textContent();
  await strip.evaluate((element) => {
    for (let i = 0; i < 12; i++)
      element.dispatchEvent(
        new WheelEvent('wheel', { deltaY: 3, bubbles: true, cancelable: true }),
      );
  });
  await expect(status).toHaveText(first!);
  await strip.evaluate((element) => {
    for (let i = 0; i < 24; i++)
      element.dispatchEvent(
        new WheelEvent('wheel', { deltaY: 3, bubbles: true, cancelable: true }),
      );
    // Keep the rapid burst in one browser turn so a slow runner cannot let
    // the real cooldown expire between separate protocol calls.
    for (let i = 0; i < 20; i++)
      element.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY: 120,
          bubbles: true,
          cancelable: true,
        }),
      );
  });
  await expect(status).not.toHaveText(first!);
  const second = await status.textContent();
  const firstRange = first!.match(/\d+/g)!.map(Number);
  expect(Number(second!.match(/\d+/)![0])).toBe(firstRange[1] + 1);
  await page.clock.runFor(260);
  expect(await dispatch(strip, { deltaY: 3, deltaMode: 1 })).toBe(true);
  await expect(status).not.toHaveText(second!);
  await page.clock.runFor(260);
  expect(await dispatch(strip, { deltaX: -1, deltaMode: 2 })).toBe(true);
  await expect(status).toHaveText(second!);
  for (const modifiers of [{ ctrlKey: true }, { metaKey: true }]) {
    expect(await dispatch(strip, { deltaY: 120, ...modifiers })).toBe(false);
    await expect(status).toHaveText(second!);
  }
  const search = page.getByRole('searchbox', {
    name: messages['palette.search'],
    exact: true,
  });
  expect(await dispatch(search, { deltaY: 120 })).toBe(false);
  await expect(status).toHaveText(second!);
  for (let i = 0; i < 100 && (await next.isEnabled()); i++) await next.click();
  await expect(next).toBeDisabled();
  const last = await status.textContent();
  await page.clock.runFor(260);
  expect(await dispatch(strip, { deltaY: 1, deltaMode: 2 })).toBe(true);
  await expect(status).toHaveText(last!);
  while (await previous.isEnabled()) await previous.click();
  await page.clock.runFor(260);
  expect(await dispatch(strip, { deltaY: -1, deltaMode: 2 })).toBe(true);
  await expect(status).toHaveText(first!);
});

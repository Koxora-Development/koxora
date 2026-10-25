import { expect, test } from '@playwright/test';

test('opening a project visibly enters its workspace, focuses its title and survives window resizing', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Import .koxora', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Import .koxora', { exact: true })
    .setInputFiles('packages/project/fixtures/complete-v1.koxora');
  await expect(
    page.getByText('Saved on this device', { exact: true }),
  ).toBeVisible();
  const title = page.getByRole('heading', { level: 1 });
  const name = await title.textContent();
  await page.getByRole('button', { name: /Local projects/ }).click();
  await expect(title).toHaveText('Ideas start here.');
  await expect(page.locator('.project-card.active')).toContainText(name!);
  await expect(page.locator('.card-meta')).toContainText('Documents:');
  await page.getByRole('button', { name: 'Open project', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(title).toHaveText(name!);
  await expect(title).toBeFocused();
  await expect(
    page.getByRole('complementary', { name: 'Project details' }),
  ).toBeVisible();
  await page.getByText('Project pages', { exact: true }).click();
  const pages = page
    .getByRole('navigation', { name: 'Documents' })
    .getByRole('button');
  await pages.last().click();
  await expect(pages.last()).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.canvas-toolbar')).toContainText(
    (await pages.last().locator('span').last().textContent())!,
  );
  for (const width of [1440, 1024, 800, 600, 360]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole('button', { name: 'Export .koxora', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('textbox', { name: 'Project name' }),
    ).toBeVisible();
  }
});

test('import dialog traps keyboard focus and Escape restores its trigger', async ({
  page,
}) => {
  await page.goto('/');
  const trigger = page.getByRole('button', {
    name: 'Import .koxora',
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const centered = await dialog.evaluate((el) => {
    const box = el.getBoundingClientRect();
    return (
      Math.abs(box.x + box.width / 2 - innerWidth / 2) < 2 &&
      Math.abs(box.y + box.height / 2 - innerHeight / 2) < 2
    );
  });
  expect(centered).toBe(true);
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press('Tab');
    expect(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Ideas start here.',
  );
});

import { expect, test } from '@playwright/test';

test('opening a project visibly enters its workspace, focuses its name and survives window resizing', async ({
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
  const title = page.locator('.office-document-name h1');
  const projectName = page.getByRole('textbox', {
    name: 'Project name',
    exact: true,
  });
  const name = await title.textContent();
  const navigator = page.getByRole('complementary', {
    name: 'Project navigator',
    exact: true,
  });
  if (!(await navigator.isVisible()))
    await page
      .getByRole('button', { name: 'Project navigator', exact: true })
      .click();
  await page.getByRole('button', { name: /Local projects/ }).click();
  await expect(page.locator('.dashboard-heading h1')).toHaveText(
    'Ideas start here.',
  );
  await expect(page.locator('.project-card.active')).toContainText(name!);
  await expect(page.locator('.card-meta')).toContainText('Documents:');
  await page.getByRole('button', { name: 'Open project', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(title).toHaveText(name!);
  await expect(projectName).toBeFocused();
  const properties = page.getByRole('complementary', {
    name: 'Properties',
    exact: true,
  });
  if (!(await properties.isVisible()))
    await page.getByRole('button', { name: 'Properties', exact: true }).click();
  await expect(properties).toBeVisible();
  await properties.getByText('Project details', { exact: true }).click();
  await expect(properties.locator('.project-properties')).toBeVisible();
  if (!(await navigator.isVisible()))
    await page
      .getByRole('button', { name: 'Project navigator', exact: true })
      .click();
  const pages = page.locator('[role=treeitem][data-page-id]');
  await pages.last().click();
  await expect(pages.last()).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.canvas-toolbar')).toContainText(
    (await pages.last().locator('.tree-name').textContent())!,
  );
  for (const width of [1440, 1024, 800, 600, 360]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const exportAction = page.getByRole('button', {
      name: 'Export .koxora',
      exact: true,
    });
    await exportAction.scrollIntoViewIfNeeded();
    await expect(exportAction).toBeInViewport();
    await projectName.scrollIntoViewIfNeeded();
    await expect(projectName).toBeInViewport();
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

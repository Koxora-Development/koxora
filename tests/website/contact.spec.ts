import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, openNavigation, status } from './helpers';
import {
  contactField,
  honeypotField,
  minimumFillMilliseconds,
} from '../../packages/contact/src/index';
const good = {
  name: 'Alex Beispiel',
  email: 'alex@example.org',
  subject: 'A question about project files',
  message: 'I would like to know how the project archive format works today.',
};
/**
 * A subject no other run has used. The delivery stand-in refuses the same
 * message twice, as the service does, and the three layout projects share
 * one stand-in, so a fixed subject would make the second project see its own
 * submission as a duplicate.
 */
function uniqueSubject(suffix = '') {
  const { project, title } = test.info();
  return `${good.subject} (${project.name}, ${title})${suffix}`;
}
/** Fills the form and waits past the minimum a person needs to type. */
async function fill(page: import('@playwright/test').Page, values = good) {
  await page.fill('#contact-name', values.name);
  await page.fill('#contact-email', values.email);
  await page.fill('#contact-subject', values.subject);
  await page.fill('#contact-message', values.message);
  await page.waitForTimeout(minimumFillMilliseconds + 200);
}
test.describe('the contact page', () => {
  test('answers in both languages and offers the form, the address and the security route', async ({
    page,
    request,
  }) => {
    for (const [path, locale] of [
      ['/en/contact/', 'en'],
      ['/de/kontakt/', 'de'],
    ] as const) {
      expect((await status(request, path)).status, path).toBe(200);
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('[data-contact-form]')).toBeVisible();
      // The published address stays, for anyone who would rather use it.
      await expect(
        page.locator('a[href="mailto:support@koxora.app"]').first(),
      ).toBeVisible();
      // A vulnerability does not belong in an ordinary mailbox.
      await expect(page.locator('#security')).toContainText(
        locale === 'de' ? 'Sicherheitsproblem' : 'security problem',
      );
    }
  });
  test('says what happens without JavaScript, in the page itself', async ({
    request,
  }) => {
    // The sentence lives in a noscript element, so it is read from the
    // served document rather than from a rendered page.
    const html = await (await request.get('/en/contact/')).text();
    expect(html).toContain('<noscript>');
    expect(html).toContain('The form works without JavaScript');
    const german = await (await request.get('/de/kontakt/')).text();
    expect(german).toContain('Das Formular funktioniert ohne JavaScript');
  });
  test('is reachable from the footer of every page', async ({ page }) => {
    for (const [path, target] of [
      ['/en/', '/en/contact/'],
      ['/de/funktionen/', '/de/kontakt/'],
    ] as const) {
      await page.goto(path);
      await expect(page.locator(`.footer-nav a[href="${target}"]`)).toHaveCount(
        1,
      );
    }
  });
  test('keeps the result pages out of the index', async ({ page }) => {
    for (const path of [
      '/en/contact/sent/',
      '/de/kontakt/gesendet/',
      '/en/contact/problem/',
      '/de/kontakt/problem/',
    ]) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        'content',
        /noindex/,
      );
      await expect(page.locator('h1')).toHaveCount(1);
    }
  });
});
/**
 * Finding the page at all.
 *
 * The page existed, answered in both languages and was in the sitemap, and the
 * Product Owner could not find a link to it on the live site: it was one entry
 * in a footer column of resources. These tests are about the link rather than
 * the page, on every layout the suite runs - desktop, tablet and phone - and
 * with the keyboard and without JavaScript, because a reader who cannot find
 * it has no way to report that they could not.
 */
test.describe('finding the contact page', () => {
  test('is in the main navigation, in both languages', async ({ page }) => {
    for (const [path, target, label] of [
      ['/en/', '/en/contact/', 'Contact'],
      ['/de/', '/de/kontakt/', 'Kontakt'],
    ] as const) {
      await page.goto(path);
      await openNavigation(page);
      const link = page.locator(`.primary-nav a[href="${target}"]`);
      await expect(link, path).toHaveCount(1);
      await expect(link).toHaveText(label);
      await expect(link).toBeVisible();
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${target}$`));
      // And it says which page a reader is on, as the other entries do.
      await expect(
        page.locator(`.primary-nav a[href="${target}"]`),
      ).toHaveAttribute('aria-current', 'page');
    }
  });
  test('is in the footer column about contact, not among the resources', async ({
    page,
  }) => {
    for (const [path, target] of [
      ['/en/', '/en/contact/'],
      ['/de/', '/de/kontakt/'],
    ] as const) {
      await page.goto(path);
      const inContactColumn = page.locator(
        `.footer-column-contact a[href="${target}"]`,
      );
      await expect(inContactColumn, path).toHaveCount(1);
      // Once in the footer, so the two columns do not offer the same link
      // twice with different words.
      await expect(
        page.locator(`.footer-nav a[href="${target}"]`),
        path,
      ).toHaveCount(1);
    }
  });
  test('is reachable with the keyboard alone', async ({ page }) => {
    await page.goto('/en/');
    await openNavigation(page);
    const link = page.locator('.primary-nav a[href="/en/contact/"]');
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/en\/contact\/$/);
  });
  test('is in the document without JavaScript', async ({ browser }) => {
    // The collapsed phone menu is opened by a script; without one it stays
    // expanded, so the link has to be an ordinary link in the markup.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    for (const [path, target] of [
      ['http://127.0.0.1:4175/en/', '/en/contact/'],
      ['http://127.0.0.1:4175/de/', '/de/kontakt/'],
    ] as const) {
      await page.goto(path);
      await expect(
        page.locator(`.primary-nav a[href="${target}"]`),
        path,
      ).toBeVisible();
      await expect(
        page.locator(`.footer-column-contact a[href="${target}"]`),
        path,
      ).toBeVisible();
    }
    await context.close();
  });
  test('reaches the page from the support documentation as well', async ({
    page,
  }) => {
    for (const [path, target] of [
      ['/en/docs/support/', '/en/contact/'],
      ['/de/dokumentation/support/', '/de/kontakt/'],
    ] as const) {
      await page.goto(path);
      await expect(
        page.locator(`main a[href="${target}"]`).first(),
        path,
      ).toBeVisible();
    }
  });
  test('fits the layout it is shown in, with no sideways scrolling', async ({
    page,
  }) => {
    for (const path of ['/en/', '/de/', '/en/contact/', '/de/kontakt/']) {
      await page.goto(path);
      await openNavigation(page);
      await expectNoHorizontalOverflow(page);
    }
  });
});
test.describe('sending a message', () => {
  test('reports it as accepted for delivery, and says so in those words', async ({
    page,
  }) => {
    await page.goto('/en/contact/');
    await fill(page, { ...good, subject: uniqueSubject() });
    await page.selectOption('#contact-category', 'support');
    await page.click('.contact-form button[type="submit"]');
    const status = page.locator('[data-contact-status]');
    // "accepted for delivery" is the honest claim; the page never says the
    // message reached a mailbox.
    await expect(status).toContainText('accepted for delivery');
    await expect(status).not.toContainText('delivered to');
    // The form is cleared, so the same message is not sent twice by accident.
    await expect(page.locator('#contact-message')).toHaveValue('');
  });
  test('says what is wrong, field by field, and sends nothing', async ({
    page,
  }) => {
    await page.goto('/en/contact/');
    await page.fill('#contact-email', 'not-an-address');
    await page.fill('#contact-subject', 'Hi');
    await page.fill('#contact-message', 'too short');
    await page.click('.contact-form button[type="submit"]');
    for (const field of ['email', 'subject', 'message']) {
      const error = page.locator(`[data-error-for="${field}"]`);
      await expect(error, field).toBeVisible();
      await expect(page.locator(`[name="${field}"]`), field).toHaveAttribute(
        'aria-invalid',
        'true',
      );
    }
    await expect(page.locator('[data-contact-status]')).toContainText(
      'was not sent',
    );
    // The first field with a problem takes the focus, so a keyboard reader
    // lands on what to fix.
    await expect(page.locator('#contact-email')).toBeFocused();
  });
  test('stops marking a field as soon as it is corrected', async ({ page }) => {
    await page.goto('/en/contact/');
    await page.click('.contact-form button[type="submit"]');
    await expect(page.locator('[data-error-for="email"]')).toBeVisible();
    await page.fill('#contact-email', 'alex@example.org');
    await expect(page.locator('[data-error-for="email"]')).toBeHidden();
  });
  test('refuses the same message twice', async ({ page }) => {
    await page.goto('/en/contact/');
    const once = { ...good, subject: uniqueSubject() };
    await fill(page, once);
    await page.click('.contact-form button[type="submit"]');
    await expect(page.locator('[data-contact-status]')).toContainText(
      'accepted for delivery',
    );
    await fill(page, once);
    await page.click('.contact-form button[type="submit"]');
    await expect(page.locator('[data-contact-status]')).toContainText(
      'not sent a second time',
    );
  });
  test('never claims success when the service does not accept it', async ({
    page,
  }) => {
    await page.goto('/en/contact/');
    // The failure is produced here rather than by breaking the service, and
    // what matters is that the page does not lie about it.
    await page.route('**/api/contact', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'undelivered' }),
      }),
    );
    await fill(page, { ...good, subject: uniqueSubject(' — blocked') });
    await page.click('.contact-form button[type="submit"]');
    const status = page.locator('[data-contact-status]');
    await expect(status).toContainText('could not be handed over');
    await expect(status).not.toContainText('accepted');
    // Nothing was cleared, so the reader can try again without retyping.
    await expect(page.locator('#contact-message')).not.toHaveValue('');
  });
  test('says so when the request never reaches anything', async ({ page }) => {
    await page.goto('/en/contact/');
    await page.route('**/api/contact', (route) => route.abort('failed'));
    await fill(page, { ...good, subject: uniqueSubject(' — offline') });
    await page.click('.contact-form button[type="submit"]');
    await expect(page.locator('[data-contact-status]')).toContainText(
      'could not be sent',
    );
  });
  test('tells a reader who has sent several to wait or write directly', async ({
    page,
  }) => {
    await page.goto('/en/contact/');
    await page.route('**/api/contact', (route) =>
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'rateLimited' }),
      }),
    );
    await fill(page, { ...good, subject: uniqueSubject(' — too many') });
    await page.click('.contact-form button[type="submit"]');
    const status = page.locator('[data-contact-status]');
    await expect(status).toContainText('support@koxora.app');
  });
});
test.describe('the form itself', () => {
  test('marks what is required, bounds what is typed and names every field', async ({
    page,
  }) => {
    await page.goto('/en/contact/');
    for (const field of ['email', 'subject', 'message'])
      await expect(page.locator(`#contact-${field}`), field).toHaveAttribute(
        'required',
        '',
      );
    // The name is optional, and the form says so rather than implying it.
    await expect(page.locator('#contact-name')).not.toHaveAttribute(
      'required',
      '',
    );
    await expect(page.locator('[data-field="name"] .form-flag')).toContainText(
      'optional',
    );
    await expect(page.locator('#contact-message')).toHaveAttribute(
      'maxlength',
      String(contactField('message').maxLength),
    );
    for (const field of ['name', 'email', 'category', 'subject', 'message']) {
      const label = page.locator(`label[for="contact-${field}"]`);
      await expect(label, field).toHaveCount(1);
    }
  });
  test('offers the four published categories and nothing else', async ({
    page,
  }) => {
    await page.goto('/de/kontakt/');
    const options = page.locator('#contact-category option');
    await expect(options).toHaveCount(4);
    await expect(options).toHaveText([
      'Allgemeine Anfrage',
      'Rückmeldung',
      'Support',
      'Fehler melden',
    ]);
  });
  test('hides the trap from readers and from assistive technology', async ({
    page,
  }) => {
    await page.goto('/en/contact/');
    const trap = page.locator(`[name="${honeypotField}"]`);
    await expect(trap).toHaveCount(1);
    // Hidden from assistive technology, out of the tab order, out of the
    // viewport, and not offered to autofill. It is moved off-screen rather
    // than removed from the layout, because some automation skips what is
    // not rendered at all.
    await expect(page.locator('.form-trap')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    await expect(trap).toHaveAttribute('tabindex', '-1');
    await expect(trap).toHaveAttribute('autocomplete', 'off');
    const box = await page.locator('.form-trap').boundingBox();
    expect(box!.x + box!.width).toBeLessThan(0);
  });
  test('is operable from the keyboard alone', async ({ page }) => {
    await page.goto('/en/contact/');
    await page.locator('#contact-name').focus();
    await page.keyboard.type(good.name);
    await page.keyboard.press('Tab');
    await page.keyboard.type(good.email);
    await page.keyboard.press('Tab');
    // The category is next, and the trap is not in the order.
    await expect(page.locator('#contact-category')).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.type(uniqueSubject(' — keyboard'));
    await page.keyboard.press('Tab');
    await page.keyboard.type(good.message);
    await page.waitForTimeout(minimumFillMilliseconds + 200);
    await page.keyboard.press('Tab');
    await expect(
      page.locator('.contact-form button[type="submit"]'),
    ).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-contact-status]')).toContainText(
      'accepted for delivery',
    );
  });
  test('announces the answer where a reader cannot see the page change', async ({
    page,
  }) => {
    await page.goto('/en/contact/');
    const status = page.locator('[data-contact-status]');
    await expect(status).toHaveAttribute('role', 'status');
    await expect(status).toHaveAttribute('aria-live', 'polite');
  });
  test('posts as an ordinary form, so it works without JavaScript', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4175/en/contact/');
    const form = page.locator('[data-contact-form]');
    await expect(form).toHaveAttribute('method', 'post');
    await expect(form).toHaveAttribute('action', /\/api\/contact$/);
    await page.fill('#contact-email', good.email);
    await page.fill('#contact-subject', uniqueSubject(' — no script'));
    await page.fill('#contact-message', good.message);
    await page.click('.contact-form button[type="submit"]');
    // It lands on a page that says what happened, in its own language.
    await expect(page).toHaveURL(/\/en\/contact\/sent\/$/);
    await expect(page.locator('h1')).toContainText('Accepted for delivery');
    await context.close();
  });
  test('without JavaScript, a bad submission lands on the problem page', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4175/de/kontakt/');
    // Without this script the browser's own validation runs, so the address
    // has to be one the browser accepts and the service does not: `a@b` has
    // no dot in its domain, which is where the two disagree.
    await page.fill('#contact-email', 'a@b');
    await page.fill('#contact-subject', 'Eine Frage ohne Skripte');
    await page.fill(
      '#contact-message',
      'Diese Nachricht ist lang genug für das Formular, aber die Adresse ist keine.',
    );
    await page.click('.contact-form button[type="submit"]');
    await expect(page).toHaveURL(/\/de\/kontakt\/problem\/$/);
    await expect(page.locator('h1')).toContainText('nicht gesendet');
    await context.close();
  });
});

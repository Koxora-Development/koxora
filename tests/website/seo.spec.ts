import { expect, test } from '@playwright/test';
import { allPaths, meta, pages, property } from './helpers';
test.describe('search engine readiness', () => {
  test('serves real HTML with the content inside it', async ({ request }) => {
    const response = await request.get('/en/');
    expect(response.headers()['content-type']).toContain('text/html');
    const body = await response.text();
    expect(body).toContain('<h1>');
    expect(body).toContain('Koxora is a studio for diagrams');
    // The marketing content must not depend on client-side rendering.
    expect(body).not.toContain('<div id="root"></div>');
  });
  test('each page has a unique title, description and canonical address', async ({
    page,
  }) => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const path of allPaths) {
      await page.goto(path);
      const title = await page.title();
      const description = (await meta(page, 'description')) ?? '';
      expect(title.length, path).toBeGreaterThan(10);
      expect(description.length, path).toBeGreaterThan(60);
      expect(description.length, path).toBeLessThan(320);
      titles.add(title);
      descriptions.add(description);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://koxora.app${path}`,
      );
      expect(await meta(page, 'robots'), path).toContain('index');
    }
    expect(titles.size).toBe(allPaths.length);
    expect(descriptions.size).toBe(allPaths.length);
  });
  test('language variants reference each other with hreflang', async ({
    page,
  }) => {
    for (const entry of pages)
      for (const locale of ['en', 'de'] as const) {
        await page.goto(entry[locale]);
        for (const [language, target] of [
          ['en', entry.en],
          ['de', entry.de],
          ['x-default', entry.en],
        ] as const)
          await expect(
            page.locator(`link[rel="alternate"][hreflang="${language}"]`),
            `${entry.id} ${locale} ${language}`,
          ).toHaveAttribute('href', `https://koxora.app${target}`);
      }
  });
  test('social previews are complete', async ({ page }) => {
    await page.goto('/de/');
    expect(await property(page, 'og:title')).toBeTruthy();
    expect(await property(page, 'og:description')).toBeTruthy();
    expect(await property(page, 'og:url')).toBe('https://koxora.app/de/');
    expect(await property(page, 'og:image')).toBe(
      'https://koxora.app/images/og-de.png',
    );
    expect(await property(page, 'og:locale')).toBe('de_DE');
    expect(await property(page, 'og:locale:alternate')).toBe('en_US');
    expect(await meta(page, 'twitter:card')).toBe('summary_large_image');
  });
  test('structured data is valid and claims nothing unreleased', async ({
    page,
  }) => {
    await page.goto('/en/features/');
    const raw = await page
      .locator('script[type="application/ld+json"]')
      .innerText();
    const data = JSON.parse(raw) as { '@graph': { '@type': string }[] };
    expect(data['@graph'].map((entry) => entry['@type'])).toEqual([
      'Organization',
      'WebSite',
      'BreadcrumbList',
    ]);
    expect(raw).not.toContain('SoftwareApplication');
    expect(raw).not.toContain('aggregateRating');
    expect(raw).not.toContain('offers');
  });
  test('the sitemap lists every page with its language variants', async ({
    request,
  }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('xml');
    const body = await response.text();
    for (const path of allPaths)
      expect(body).toContain(`<loc>https://koxora.app${path}</loc>`);
    expect(body).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(body).toContain('hreflang="x-default"');
    expect((body.match(/<url>/g) ?? []).length).toBe(allPaths.length);
    expect(body).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  });
  test('robots.txt allows crawling and points at the sitemap', async ({
    request,
  }) => {
    const body = await (await request.get('/robots.txt')).text();
    expect(body).toContain('User-agent: *');
    expect(body).toContain('Allow: /');
    expect(body).toContain('Sitemap: https://koxora.app/sitemap.xml');
  });
  test('headings form a single meaningful outline', async ({ page }) => {
    for (const path of allPaths) {
      await page.goto(path);
      const levels = await page
        .locator('main h1, main h2, main h3')
        .evaluateAll((nodes) => nodes.map((node) => Number(node.tagName[1])));
      expect(levels[0], path).toBe(1);
      expect(levels.filter((level) => level === 1).length, path).toBe(1);
      for (const [index, level] of levels.entries())
        if (index > 0)
          expect(
            level - levels[index - 1]!,
            `${path} #${index}`,
          ).toBeLessThanOrEqual(1);
    }
  });
  test('images declare their size and a description', async ({ page }) => {
    await page.goto('/en/');
    const images = page.locator('main img');
    expect(await images.count()).toBeGreaterThan(0);
    for (const image of await images.all()) {
      expect(await image.getAttribute('alt')).toBeTruthy();
      expect(Number(await image.getAttribute('width'))).toBeGreaterThan(0);
      expect(Number(await image.getAttribute('height'))).toBeGreaterThan(0);
    }
  });
  test('pages load no third-party resources', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (request) => {
      if (!request.url().startsWith('http://127.0.0.1:4175'))
        external.push(request.url());
    });
    for (const path of ['/en/', '/de/datenschutz/', '/en/features/']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
    }
    expect(external).toEqual([]);
  });
});

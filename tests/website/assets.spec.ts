import { expect, test } from '@playwright/test';
import { allPaths } from './helpers';
/**
 * Every picture a page shows, asked for over HTTP and then looked at.
 *
 * The live site answered **403 Forbidden** for
 * `/images/studio/editor-small-en.webp` and for `editor-light.webp` while
 * serving `editor-dark.webp` from the same directory. Both files were ordinary
 * Git blobs of the right size, so every check that looked at the repository
 * passed; the cause was the mode each file carried into the container, and the
 * only place it was ever visible was an HTTP answer.
 *
 * So these tests ask for the addresses the pages name and refuse anything but
 * 200 with the type the markup promised - 403 fails here exactly as loudly as
 * 404 - and then check that the browser actually painted the picture, which is
 * the thing a reader noticed and no status code states.
 *
 * This runs against the reference preview server. The same addresses are asked
 * of a real NGINX by `pnpm website:nginx` and of the real running container by
 * `pnpm website:container`, because the reference server and production are
 * two different servers and the regression lived in the second one.
 */
const types: Record<string, string[]> = {
  webp: ['image/webp'],
  png: ['image/png'],
  svg: ['image/svg+xml'],
  ico: ['image/vnd.microsoft.icon', 'image/x-icon'],
};
function extensionOf(url: string): string {
  return new URL(url, 'http://127.0.0.1').pathname.split('.').pop() ?? '';
}
test.describe('the pictures the pages reference', () => {
  test('every image address on every page answers 200 with its own type', async ({
    page,
    request,
  }) => {
    const seen = new Map<string, string>();
    for (const path of allPaths) {
      await page.goto(path);
      // Both halves of every `<picture>`: the WebP a modern browser takes
      // from the source and the PNG the img falls back to. A deployment has
      // to serve both, because which one is asked for is the browser's
      // decision and not ours.
      const urls = await page.locator('img, source').evaluateAll((elements) =>
        elements.flatMap((element) => {
          if (element instanceof HTMLImageElement)
            return element.getAttribute('src')
              ? [element.getAttribute('src')!]
              : [];
          const set = element.getAttribute('srcset') ?? '';
          return set
            .split(',')
            .map((candidate) => candidate.trim().split(/\s+/)[0]!)
            .filter(Boolean);
        }),
      );
      for (const url of new Set(urls)) seen.set(url, path);
    }
    // Not every page shows a picture, so the floor is on the whole set: both
    // encodings of every studio screenshot, which is what broke.
    expect(seen.size).toBeGreaterThan(10);
    for (const name of [
      'editor-dark',
      'editor-light',
      'editor-small-en',
      'editor-small-de',
    ])
      for (const extension of ['webp', 'png'])
        expect(
          [...seen.keys()],
          `${name}.${extension} is referenced by no page`,
        ).toContain(`/images/studio/${name}.${extension}`);
    const failures: string[] = [];
    for (const [url, path] of seen) {
      const answer = await request.get(url);
      const type = (answer.headers()['content-type'] ?? '').split(';')[0]!;
      const allowed = types[extensionOf(url)];
      const body = await answer.body();
      if (answer.status() !== 200)
        failures.push(`${url} answered ${answer.status()} (named by ${path})`);
      else if (allowed && !allowed.includes(type))
        failures.push(
          `${url} answered ${type}, expected ${allowed.join(' or ')}`,
        );
      else if (body.length === 0)
        failures.push(`${url} answered an empty body`);
    }
    expect(failures.join('\n')).toBe('');
  });
  test('the home page screenshots are actually painted, not merely served', async ({
    page,
  }) => {
    // A status code says the file arrived; it does not say the browser could
    // decode it or that the element it belongs to is on the page. These are
    // the three the Product Owner saw fail, two of them with a broken-image
    // placeholder where a screenshot belonged.
    for (const path of ['/en/', '/de/']) {
      await page.goto(path);
      const shots = page.locator('#preview .shot img');
      await expect(shots, path).toHaveCount(3);
      const count = await shots.count();
      for (let index = 0; index < count; index += 1) {
        const shot = shots.nth(index);
        await shot.scrollIntoViewIfNeeded();
        const source = await shot.getAttribute('src');
        await expect
          .poll(
            async () =>
              shot.evaluate(
                (image: HTMLImageElement) =>
                  image.complete && image.naturalWidth > 0,
              ),
            { message: `${path} ${source} never decoded`, timeout: 10000 },
          )
          .toBe(true);
      }
    }
  });
  test('the documentation screenshots are painted in both languages', async ({
    page,
  }) => {
    for (const path of [
      '/en/docs/editing/',
      '/de/dokumentation/bearbeiten/',
      '/en/docs/getting-started/',
      '/de/dokumentation/erste-schritte/',
    ]) {
      await page.goto(path);
      const shots = page.locator('.shot img');
      const count = await shots.count();
      expect(count, `${path} shows no screenshots`).toBeGreaterThan(0);
      for (let index = 0; index < count; index += 1) {
        const shot = shots.nth(index);
        await shot.scrollIntoViewIfNeeded();
        await expect
          .poll(
            async () =>
              shot.evaluate(
                (image: HTMLImageElement) =>
                  image.complete && image.naturalWidth > 0,
              ),
            {
              message: `${path} picture ${index} never decoded`,
              timeout: 10000,
            },
          )
          .toBe(true);
      }
    }
  });
  test('each screenshot reserves its own space, so nothing shifts while it loads', async ({
    page,
  }) => {
    await page.goto('/en/');
    const shots = page.locator('#preview .shot img');
    const count = await shots.count();
    for (let index = 0; index < count; index += 1) {
      const shot = shots.nth(index);
      await expect(shot).toHaveAttribute('width', /^\d+$/);
      await expect(shot).toHaveAttribute('height', /^\d+$/);
    }
  });
  test('the social image and the icons answer as well', async ({
    page,
    request,
  }) => {
    // Named in the head rather than in the body, so no element points at
    // them and the test above would never ask.
    await page.goto('/en/');
    const addresses = await page
      .locator(
        'meta[property="og:image"], link[rel="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]',
      )
      .evaluateAll((elements) =>
        elements
          .map(
            (element) =>
              element.getAttribute('content') ?? element.getAttribute('href'),
          )
          .filter((value): value is string => Boolean(value)),
      );
    expect(addresses.length).toBeGreaterThanOrEqual(4);
    for (const address of addresses) {
      // The social image is named by its absolute production address, which
      // this preview does not answer on. Ask for its path instead.
      const target = address.startsWith('http')
        ? new URL(address).pathname
        : address;
      const answer = await request.get(target);
      expect(answer.status(), target).toBe(200);
      expect((await answer.body()).length, target).toBeGreaterThan(0);
    }
  });
  test('a web app manifest is served as one, not as an unknown file', async ({
    request,
  }) => {
    // A manifest answered as application/octet-stream is ignored by the
    // browser. The reference server was right about this and the container
    // was not, which is why the type is asserted and not only the status.
    for (const path of ['/en/site.webmanifest', '/de/site.webmanifest']) {
      const answer = await request.get(path);
      expect(answer.status(), path).toBe(200);
      expect(answer.headers()['content-type'], path).toContain(
        'application/manifest+json',
      );
      expect(JSON.parse(await answer.text()).name, path).toBeTruthy();
    }
  });
});

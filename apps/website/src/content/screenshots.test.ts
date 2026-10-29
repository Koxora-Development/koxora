import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { screenshotSizes } from './screenshots';
import { locales } from '../routes';
/**
 * The studio screenshots, as files.
 *
 * The live site answered 403 for `editor-small-en.webp` and `editor-light.webp`
 * while serving `editor-dark.webp` from the same directory. Both were ordinary
 * Git blobs, so "the file is in the repository" was true and useless: the
 * cause was the mode the file carried into the container, which Git does not
 * record and nothing checked.
 *
 * These assertions cover what can be known without a server: the pages name
 * only pictures that exist, both encodings of each one are there, and the
 * modes let a web server read them. What a server actually answers is checked
 * over HTTP by `pnpm website:nginx` and `pnpm website:container`, because that
 * is the only place the 403 was ever visible.
 */
const pagesDirectory = resolve(import.meta.dirname, '../pages');
const studio = resolve(import.meta.dirname, '../../public/images/studio');
/** Every name a page passes to `Screenshot`, with the locale resolved. */
function referencedNames(): string[] {
  const names = new Set<string>();
  for (const file of readdirSync(pagesDirectory)) {
    if (!file.endsWith('.tsx')) continue;
    const source = readFileSync(resolve(pagesDirectory, file), 'utf8');
    // Only the `name` of a `Screenshot`: the pages carry other elements with
    // a name of their own, the form fields above all.
    for (const element of source.matchAll(/<Screenshot\b[\s\S]*?\/>/g)) {
      const literal = /name="([a-z0-9-]+)"/.exec(element[0]);
      if (literal) names.add(literal[1]!);
      // A name built from the locale exists once per language.
      const perLocale = /name=\{`([a-z0-9-]+)\$\{locale\}`\}/.exec(element[0]);
      if (perLocale)
        for (const locale of locales) names.add(`${perLocale[1]!}${locale}`);
    }
  }
  return [...names];
}
const referenced = referencedNames().filter((name) => name in screenshotSizes);
describe('the studio screenshots the pages reference', () => {
  it('finds the ones the pages actually name', () => {
    // So a renamed page or a changed prop cannot make the rest of this file
    // assert nothing at all.
    expect(referenced.length).toBeGreaterThanOrEqual(5);
    expect(referenced).toContain('editor-dark');
    expect(referenced).toContain('editor-light');
    for (const locale of locales)
      expect(referenced, locale).toContain(`editor-small-${locale}`);
  });
  it('names only pictures the capture run measured', () => {
    for (const name of referencedNames())
      expect(screenshotSizes[name], name).toBeDefined();
  });
  it('ships both encodings of every one, because the browser picks', () => {
    // The WebP is offered first and the PNG is the fallback, so a deployment
    // that serves only one of them is broken for some readers and fine for
    // others - which is the hardest kind of broken to notice.
    for (const name of Object.keys(screenshotSizes))
      for (const extension of ['webp', 'png']) {
        const file = resolve(studio, `${name}.${extension}`);
        expect(() => statSync(file), `${name}.${extension}`).not.toThrow();
        expect(statSync(file).size, `${name}.${extension}`).toBeGreaterThan(0);
      }
  });
  it('leaves every one readable by a web server', () => {
    // An unprivileged server answers 403 for a file it cannot open, one
    // address at a time. The build normalizes these modes as well, so this
    // failing is a signal about the working tree rather than about the
    // deployment - and the place to notice it is here.
    for (const file of readdirSync(studio)) {
      const { mode } = statSync(resolve(studio, file));
      expect(
        mode & 0o004,
        `${file} is mode ${(mode & 0o777).toString(8)}`,
      ).toBe(0o004);
    }
  });
  it('measures each one, so the layout does not shift while it loads', () => {
    for (const [name, size] of Object.entries(screenshotSizes)) {
      expect(size.width, name).toBeGreaterThan(0);
      expect(size.height, name).toBeGreaterThan(0);
    }
  });
});

// The static files the emitted pages actually reference, read out of the pages
// themselves rather than kept in a second list beside them.
//
// A screenshot that exists in `public/` proves nothing about the deployment:
// the live site answered 403 for two of them while serving a third, because
// the running server could not read those two files. So the checks that matter
// ask the server for every address a page names, and this is where that list
// comes from. A new image added to a page is covered without anybody
// remembering to add it here.
import { chmod, readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * What a server may answer for each kind of file this site publishes.
 *
 * Several entries list more than one value, because more than one is correct:
 * a script is `text/javascript` or the older `application/javascript`
 * depending on the table the server ships. The ones with a single value are
 * the ones where being wrong has a consequence - an image or a manifest
 * answered as `application/octet-stream` is an asset the browser will not use.
 */
export const expectedTypes = {
  '.webp': ['image/webp'],
  '.png': ['image/png'],
  '.svg': ['image/svg+xml'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.gif': ['image/gif'],
  '.ico': ['image/vnd.microsoft.icon', 'image/x-icon'],
  '.css': ['text/css'],
  '.js': ['text/javascript', 'application/javascript'],
  '.json': ['application/json'],
  '.webmanifest': ['application/manifest+json'],
  '.txt': ['text/plain'],
  '.xml': ['application/xml', 'text/xml'],
};
/** The types a path may be served as, or `null` if this site never serves it. */
export function expectedType(path) {
  const dot = path.lastIndexOf('.');
  if (dot === -1) return null;
  return expectedTypes[path.slice(dot).toLowerCase()] ?? null;
}
/** Whether an answer's `Content-Type` is one of them. */
export function typeMatches(path, contentType) {
  const allowed = expectedType(path);
  if (!allowed) return false;
  return allowed.includes(
    String(contentType ?? '')
      .split(';')[0]
      .trim(),
  );
}

async function* htmlFiles(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path, `${prefix}${entry.name}/`);
    else if (entry.name.endsWith('.html'))
      yield { path, relative: `${prefix}${entry.name}` };
  }
}

/**
 * Every same-origin static file the emitted pages reference, as request paths.
 *
 * Both halves of a `<picture>` are collected: the `srcset` of the WebP source
 * and the `src` of the PNG the fallback uses. A browser asks for one of them,
 * but which one depends on the browser, so a deployment has to serve both.
 */
export async function referencedAssets(siteRoot, origin) {
  const found = new Map();
  const note = (reference, page) => {
    let path = reference;
    // A social image is named by its absolute address, because that is the
    // only form a crawler accepts. It is still this site's own file, so an
    // address on the canonical origin counts as one of these references.
    if (origin && path.startsWith(`${origin}/`))
      path = path.slice(origin.length);
    if (!path.startsWith('/') || path.startsWith('//')) return;
    path = path.split('#')[0].split('?')[0];
    if (path.endsWith('.html') || !expectedType(path)) return;
    const pages = found.get(path) ?? new Set();
    pages.add(page);
    found.set(path, pages);
  };
  for await (const file of htmlFiles(siteRoot)) {
    const html = await readFile(file.path, 'utf8');
    for (const match of html.matchAll(/(?:src|href|content)="([^"]+)"/g))
      note(match[1], file.relative);
    for (const match of html.matchAll(/srcSet="([^"]+)"|srcset="([^"]+)"/g))
      for (const candidate of (match[1] ?? match[2] ?? '').split(','))
        note(candidate.trim().split(/\s+/)[0] ?? '', file.relative);
  }
  return [...found.entries()]
    .map(([path, pages]) => ({ path, pages: [...pages].sort() }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

/** The subset that is an image, which is what the screenshot regression is. */
export async function referencedImages(siteRoot, origin) {
  return (await referencedAssets(siteRoot, origin)).filter((asset) =>
    asset.path.startsWith('/images/'),
  );
}

/**
 * The modes published files are given. A static site is read by everyone and
 * written by nobody, and these are the two modes that say so.
 */
export const publishedDirectoryMode = 0o755;
export const publishedFileMode = 0o644;

/**
 * Gives every emitted file the same mode, rather than whichever one it
 * inherited.
 *
 * The build copies `public/` as it finds it, so the modes of the tree the site
 * was built from end up in the published output and then in the image. Git
 * records no read permission, so those modes are not source data in the first
 * place: a checkout, a capture run and an unpacked archive all produce
 * different ones. Deciding them here is what keeps a deployment from
 * answering 403 for one asset because of how a file happened to be created.
 */
export async function normalizeModes(directory) {
  let changed = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await chmod(path, publishedDirectoryMode);
      changed += 1 + (await normalizeModes(path));
    } else if (entry.isFile()) {
      const { mode } = await stat(path);
      if ((mode & 0o777) !== publishedFileMode) {
        await chmod(path, publishedFileMode);
        changed += 1;
      }
    }
  }
  return changed;
}

/**
 * Published files a web server running as an unprivileged account could not
 * read. A file like that is answered with 403, one address at a time, which is
 * invisible in a build log and obvious only on the live site.
 */
export async function unreadableFiles(directory, prefix = '') {
  const unreadable = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const relative = `${prefix}${entry.name}`;
    const { mode } = await stat(path);
    if (entry.isDirectory()) {
      // A directory also has to be traversable, or nothing inside it is
      // reachable however readable the files themselves are.
      if ((mode & 0o005) !== 0o005) unreadable.push(relative);
      try {
        unreadable.push(...(await unreadableFiles(path, `${relative}/`)));
      } catch {
        // Unreadable to this process too, which is the finding itself; it is
        // already recorded above, so there is nothing more to learn here.
      }
    } else if ((mode & 0o004) !== 0o004) unreadable.push(relative);
  }
  return unreadable;
}

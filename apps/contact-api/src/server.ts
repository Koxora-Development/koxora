import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import {
  detectSpam,
  honeypotField,
  timestampField,
  validateContact,
  type ContactFieldError,
} from '@koxora/contact';
import {
  isResultLocale,
  type ContactConfig,
  type ResultLocale,
} from './config';
import {
  DuplicateGuard,
  SlidingWindow,
  createClientKeyer,
  fingerprint,
} from './limits';
import type { Mailer } from './mailer';
/**
 * The contact endpoint.
 *
 * It accepts one kind of request, answers in one of a few fixed shapes, and
 * tells a client nothing it does not need. Everything a reader sends is
 * validated here independently of the browser, because the browser's
 * validation is a convenience for the reader and not a control.
 *
 * What it deliberately does not do: store a message, store an address, write
 * either into a log, read a file or a URL named by a message, or report the
 * mail server's own error text to the client.
 */
export const contactPath = '/api/contact';
export const healthPath = '/api/contact/health';
export type Outcome =
  | 'accepted'
  | 'duplicate'
  | 'invalid'
  | 'rejected'
  | 'rateLimited'
  | 'undelivered'
  | 'badRequest';
export interface ContactLogEntry {
  time: string;
  outcome: Outcome;
  /** One of the four published categories, or absent when none was valid. */
  category?: string;
  durationMs: number;
}
export interface ServerDependencies {
  config: ContactConfig;
  mailer: Mailer;
  /** Receives one entry per submission. It never contains personal data. */
  log?: (entry: ContactLogEntry) => void;
  now?: () => number;
}
interface Answer {
  status: number;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
  /** Set for a classic form post, which cannot show a JSON answer. */
  redirect?: string;
}
/** Reads the body with a hard cap, so a large request is refused, not buffered. */
async function readBody(
  request: IncomingMessage,
  limit: number,
): Promise<{ text: string } | { tooLarge: true }> {
  const declared = Number(request.headers['content-length'] ?? '0');
  if (Number.isFinite(declared) && declared > limit) return { tooLarge: true };
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > limit) {
      request.destroy();
      return { tooLarge: true };
    }
    chunks.push(buffer);
  }
  return { text: Buffer.concat(chunks).toString('utf8') };
}
/** Whether this request came from a form rather than from the script. */
function isFormPost(contentType: string): boolean {
  return (
    contentType.split(';')[0]!.trim().toLowerCase() ===
    'application/x-www-form-urlencoded'
  );
}
function parseBody(
  contentType: string,
  text: string,
): Record<string, unknown> | null {
  const type = contentType.split(';')[0]!.trim().toLowerCase();
  if (type === 'application/json') {
    try {
      const parsed: unknown = JSON.parse(text);
      // An array or a primitive is not a submission, and a prototype key
      // must never reach the object the validator reads.
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        return null;
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).filter(
          ([key]) => key !== '__proto__' && key !== 'constructor',
        ),
      );
    } catch {
      return null;
    }
  }
  if (type === 'application/x-www-form-urlencoded') {
    // The form without JavaScript posts this. The last value of a repeated
    // field wins, which is what a browser would send anyway.
    const parameters = new URLSearchParams(text);
    const result: Record<string, unknown> = {};
    for (const [key, value] of parameters)
      if (key !== '__proto__' && key !== 'constructor') result[key] = value;
    return result;
  }
  return null;
}
/**
 * Where the submission came from. A browser sends `Origin` on a cross-site
 * form post, so a mismatch is refused. A missing `Origin` is accepted: the
 * endpoint uses no cookie and no session, so there is nothing for a forged
 * request to borrow, and refusing it would only lock out readers whose
 * browser or privacy setting withholds the header.
 */
export function originAllowed(
  headers: IncomingMessage['headers'],
  allowed: string[],
): boolean {
  const origin = typeof headers.origin === 'string' ? headers.origin : '';
  if (origin && origin !== 'null')
    return allowed.includes(origin.replace(/\/$/, ''));
  const referer = typeof headers.referer === 'string' ? headers.referer : '';
  if (referer) {
    try {
      return allowed.includes(new URL(referer).origin);
    } catch {
      return false;
    }
  }
  return true;
}
/** The address to count against, trusting a proxy header only where told to. */
export function clientAddress(
  request: IncomingMessage,
  trustProxy: boolean,
): string {
  if (trustProxy) {
    const forwarded = request.headers['x-forwarded-for'];
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
      ?.split(',')[0]
      ?.trim();
    if (first) return first;
  }
  return request.socket.remoteAddress ?? 'unknown';
}
export function createContactHandler({
  config,
  mailer,
  log = () => {},
  now = Date.now,
}: ServerDependencies) {
  const perClient = new SlidingWindow(
    config.limits.perClient.count,
    config.limits.perClient.windowSeconds * 1000,
  );
  const global = new SlidingWindow(
    config.limits.global.count,
    config.limits.global.windowSeconds * 1000,
  );
  const duplicates = new DuplicateGuard(
    config.limits.duplicateWindowSeconds * 1000,
  );
  const keyFor = createClientKeyer();
  async function handle(request: IncomingMessage): Promise<Answer> {
    const started = now();
    const contentType = String(request.headers['content-type'] ?? '');
    // A classic form post cannot show a JSON answer, so it is sent to a page
    // on the website instead. Which page is decided here, from configuration
    // and the submitted language, never from an address in the request.
    const formPost = isFormPost(contentType);
    let locale: ResultLocale = 'en';
    const finish = (
      status: number,
      body: Record<string, unknown>,
      outcome: Outcome,
      extra?: { category?: string; headers?: Record<string, string> },
    ): Answer => {
      log({
        time: new Date(started).toISOString(),
        outcome,
        ...(extra?.category ? { category: extra.category } : {}),
        durationMs: now() - started,
      });
      if (!formPost) return { status, body, headers: extra?.headers };
      const page =
        outcome === 'accepted' || outcome === 'duplicate'
          ? config.results.accepted[locale]
          : config.results.problem[locale];
      return {
        status: 303,
        body,
        headers: extra?.headers,
        redirect: `${config.results.base}${page}`,
      };
    };
    if (!originAllowed(request.headers, config.allowedOrigins))
      return finish(403, { status: 'badRequest' }, 'badRequest');
    const body = await readBody(request, config.limits.bodyBytes);
    if ('tooLarge' in body)
      return finish(413, { status: 'badRequest' }, 'badRequest');
    const input = parseBody(contentType, body.text);
    if (!input) return finish(415, { status: 'badRequest' }, 'badRequest');
    if (isResultLocale(input.locale)) locale = input.locale;
    // Counted before the work, so a flood costs the service a hash and
    // nothing else. The global window is the backstop for many addresses.
    const clientWindow = perClient.take(
      keyFor(clientAddress(request, config.trustProxy)),
      now(),
    );
    if (!clientWindow.allowed)
      return finish(429, { status: 'rateLimited' }, 'rateLimited', {
        headers: { 'retry-after': String(clientWindow.retryAfter) },
      });
    const globalWindow = global.take('all', now());
    if (!globalWindow.allowed)
      return finish(429, { status: 'rateLimited' }, 'rateLimited', {
        headers: { 'retry-after': String(globalWindow.retryAfter) },
      });
    const spam = detectSpam({
      honeypot: input[honeypotField],
      openedAt: input[timestampField],
      now: now(),
    });
    if (spam)
      return finish(400, { status: 'rejected', reason: spam }, 'rejected');
    const validation = validateContact(input);
    if (!validation.submission)
      return finish(
        400,
        { status: 'invalid', errors: asErrorList(validation.errors) },
        'invalid',
      );
    const submission = validation.submission;
    const identity = fingerprint([
      submission.email,
      submission.category,
      submission.subject,
      submission.message,
    ]);
    // A second press of the button is the same message, not a second one.
    if (duplicates.check(identity, now()))
      return finish(200, { status: 'accepted', duplicate: true }, 'duplicate', {
        category: submission.category,
      });
    const outcome = await mailer.send(submission);
    if (outcome.status !== 'accepted')
      return finish(503, { status: 'undelivered' }, 'undelivered', {
        category: submission.category,
      });
    duplicates.remember(identity, now());
    perClient.prune(now());
    global.prune(now());
    return finish(200, { status: 'accepted' }, 'accepted', {
      category: submission.category,
    });
  }
  return {
    async respond(request: IncomingMessage, response: ServerResponse) {
      const url = new URL(request.url ?? '/', 'http://contact.invalid');
      const headers: Record<string, string> = {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        // The answer is read by a script on the site itself; nothing here is
        // meant to be embedded, framed or sniffed.
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'no-referrer',
      };
      if (url.pathname === healthPath && request.method === 'GET') {
        response.writeHead(200, headers);
        response.end(JSON.stringify({ status: 'ok' }));
        return;
      }
      if (url.pathname !== contactPath) {
        response.writeHead(404, headers);
        response.end(JSON.stringify({ status: 'notFound' }));
        return;
      }
      if (request.method !== 'POST') {
        response.writeHead(405, { ...headers, allow: 'POST' });
        response.end(JSON.stringify({ status: 'badRequest' }));
        return;
      }
      try {
        const answer = await handle(request);
        if (answer.redirect) {
          // 303 so the browser follows with a GET and a reload does not
          // repeat the submission.
          response.writeHead(303, {
            ...headers,
            ...answer.headers,
            location: answer.redirect,
          });
          response.end();
          return;
        }
        response.writeHead(answer.status, { ...headers, ...answer.headers });
        response.end(JSON.stringify(answer.body));
      } catch {
        // Nothing about an internal failure reaches the client.
        if (!response.headersSent) response.writeHead(500, headers);
        response.end(JSON.stringify({ status: 'undelivered' }));
      }
    },
    /** For tests and for the shutdown path. */
    state: () => ({
      clients: perClient.size,
      duplicates: duplicates.size,
    }),
  };
}
function asErrorList(errors: ContactFieldError[]) {
  return errors.map((error) => ({
    field: error.field,
    problem: error.problem,
  }));
}
export function createContactServer(dependencies: ServerDependencies) {
  const handler = createContactHandler(dependencies);
  return createServer((request, response) => {
    void handler.respond(request, response);
  });
}

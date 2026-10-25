// A stand-in for the contact delivery service, for the browser tests only.
//
// It answers with the same shapes `apps/contact-api` answers with, and it
// runs the real validation and the real spam checks: those are imported from
// the website bundle, so this file holds no second copy of the rules. What it
// does not do is send mail, which is why it is a stand-in — the service
// itself is covered by its own integration tests.
//
// It is never deployed. `pnpm website:build` does not emit it, and nothing
// outside the test server starts it.
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = await import(resolve(root, 'dist-ssr/entry-server.js'));
const headers = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
};
export function startContactStub({
  port,
  host = '127.0.0.1',
  allowedOrigins,
  perClient = 3,
  resultBase,
}) {
  const sent = [];
  const seen = new Map();
  const hits = [];
  const instance = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://stub.invalid');
    if (url.pathname === '/api/contact/health') {
      response.writeHead(200, headers);
      response.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    if (url.pathname === '/api/contact/sent') {
      // Only the tests read this, to assert what would have been delivered.
      response.writeHead(200, headers);
      response.end(JSON.stringify(sent));
      return;
    }
    if (url.pathname !== '/api/contact') {
      response.writeHead(404, headers);
      response.end(JSON.stringify({ status: 'notFound' }));
      return;
    }
    if (request.method !== 'POST') {
      response.writeHead(405, { ...headers, allow: 'POST' });
      response.end(JSON.stringify({ status: 'badRequest' }));
      return;
    }
    const origin = request.headers.origin;
    if (origin && origin !== 'null' && !allowedOrigins.includes(origin)) {
      response.writeHead(403, headers);
      response.end(JSON.stringify({ status: 'badRequest' }));
      return;
    }
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const text = Buffer.concat(chunks).toString('utf8');
    const type = String(request.headers['content-type'] ?? '')
      .split(';')[0]
      .trim();
    const formPost = type === 'application/x-www-form-urlencoded';
    let input;
    if (type === 'application/json') {
      try {
        input = JSON.parse(text);
      } catch {
        input = null;
      }
    } else if (formPost) {
      input = Object.fromEntries(new URLSearchParams(text));
    }
    const locale = input?.locale === 'de' ? 'de' : 'en';
    const answer = (status, body) => {
      if (formPost) {
        const page =
          body.status === 'accepted'
            ? locale === 'de'
              ? '/de/kontakt/gesendet/'
              : '/en/contact/sent/'
            : locale === 'de'
              ? '/de/kontakt/problem/'
              : '/en/contact/problem/';
        response.writeHead(303, {
          ...headers,
          location: `${resultBase}${page}`,
        });
        response.end();
        return;
      }
      response.writeHead(status, headers);
      response.end(JSON.stringify(body));
    };
    if (!input || typeof input !== 'object' || Array.isArray(input))
      return answer(415, { status: 'badRequest' });
    const now = Date.now();
    while (hits.length > 0 && hits[0] < now - 3600_000) hits.shift();
    if (hits.length >= perClient) {
      response.writeHead(429, { ...headers, 'retry-after': '60' });
      response.end(JSON.stringify({ status: 'rateLimited' }));
      return;
    }
    hits.push(now);
    const spam = server.detectSpam({
      honeypot: input[server.honeypotField],
      openedAt: input[server.timestampField],
      now,
    });
    if (spam) return answer(400, { status: 'rejected', reason: spam });
    const validation = server.validateContact(input);
    if (!validation.submission)
      return answer(400, { status: 'invalid', errors: validation.errors });
    const identity = createHash('sha256')
      .update(
        [
          validation.submission.email,
          validation.submission.subject,
          validation.submission.message,
        ].join('\u0000'),
      )
      .digest('base64url');
    if (seen.has(identity))
      return answer(200, { status: 'accepted', duplicate: true });
    seen.set(identity, now);
    sent.push(validation.submission);
    return answer(200, { status: 'accepted' });
  });
  return new Promise((ready, failed) => {
    instance.on('error', failed);
    instance.listen(port, host, () => {
      console.log(`Contact stand-in on http://${host}:${port}/api/contact`);
      ready(instance);
    });
  });
}

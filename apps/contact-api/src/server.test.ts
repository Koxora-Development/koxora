import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import {
  honeypotField,
  minimumFillMilliseconds,
  timestampField,
} from '@koxora/contact';
import { readConfig } from './config';
import { createContactServer, type ContactLogEntry } from './server';
import type { DeliveryOutcome, Mailer } from './mailer';
import type { ContactSubmission } from '@koxora/contact';
const environment = {
  KOXORA_CONTACT_ALLOWED_ORIGINS: 'https://koxora.app',
  KOXORA_CONTACT_RECIPIENT: 'support@koxora.app',
  KOXORA_CONTACT_SENDER: 'website@koxora.app',
  KOXORA_CONTACT_SMTP_HOST: 'smtp.example.invalid',
  KOXORA_CONTACT_SMTP_USER: 'website@koxora.app',
  // Not a real credential: the test never opens a connection, because the
  // mailer is replaced below.
  KOXORA_CONTACT_SMTP_PASSWORD: 'placeholder-for-tests',
  KOXORA_CONTACT_RATE_PER_CLIENT: '3',
  KOXORA_CONTACT_RATE_GLOBAL: '10',
};
const valid = {
  name: 'Alex Beispiel',
  email: 'alex@example.org',
  category: 'support',
  subject: 'A question about project files',
  message: 'I would like to know how the project archive format works.',
};
/** A mailer that records what it was asked to send and sends nothing. */
function fakeMailer(outcome: DeliveryOutcome = { status: 'accepted' }) {
  const sent: ContactSubmission[] = [];
  const mailer: Mailer = {
    async send(submission) {
      sent.push(submission);
      return outcome;
    },
    async verify() {
      return true;
    },
    close() {},
  };
  return { mailer, sent };
}
let server: Server;
let origin: string;
let logged: ContactLogEntry[];
function start(options: {
  mailer: Mailer;
  now?: () => number;
  env?: Record<string, string>;
}) {
  logged = [];
  server = createContactServer({
    config: readConfig({ ...environment, ...options.env }),
    mailer: options.mailer,
    log: (entry) => logged.push(entry),
    ...(options.now ? { now: options.now } : {}),
  });
  return new Promise<void>((ready) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      origin = `http://127.0.0.1:${address.port}`;
      ready();
    });
  });
}
afterEach(
  () =>
    new Promise<void>((done) => {
      if (!server?.listening) return done();
      server.close(() => done());
    }),
);
async function post(
  body: unknown,
  {
    contentType = 'application/json',
    headers = {},
    raw,
    follow = true,
  }: {
    contentType?: string | null;
    headers?: Record<string, string>;
    raw?: string;
    follow?: boolean;
  } = {},
) {
  const response = await fetch(`${origin}/api/contact`, {
    method: 'POST',
    headers: {
      ...(contentType ? { 'content-type': contentType } : {}),
      origin: 'https://koxora.app',
      ...headers,
    },
    body: raw ?? JSON.stringify(body),
    redirect: follow ? 'follow' : 'manual',
  });
  const text = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    body: text ? (JSON.parse(text) as Record<string, unknown>) : {},
  };
}
describe('a good submission', () => {
  let sent: ContactSubmission[];
  beforeEach(async () => {
    const fake = fakeMailer();
    sent = fake.sent;
    await start({ mailer: fake.mailer });
  });
  it('is accepted, sent once, and reported as accepted rather than delivered', async () => {
    const answer = await post(valid);
    expect(answer.status).toBe(200);
    // "accepted" is the honest word: the mail server took it. What the
    // mailbox does afterwards is not visible from here.
    expect(answer.body).toEqual({ status: 'accepted' });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ email: valid.email, category: 'support' });
  });
  it('is accepted from the form that posts without JavaScript', async () => {
    // A classic form post cannot show a JSON answer, so the reader is sent
    // to a page on the website that says what happened, in their language.
    const answer = await post(undefined, {
      contentType: 'application/x-www-form-urlencoded',
      raw: new URLSearchParams({ ...valid, locale: 'de' }).toString(),
      follow: false,
    });
    expect(answer.status).toBe(303);
    expect(answer.headers.get('location')).toBe(
      'https://koxora.app/de/kontakt/gesendet/',
    );
    expect(sent).toHaveLength(1);
  });
  it('sends a failed form post to the problem page of its language', async () => {
    const answer = await post(undefined, {
      contentType: 'application/x-www-form-urlencoded',
      raw: new URLSearchParams({
        ...valid,
        locale: 'en',
        message: 'short',
      }).toString(),
      follow: false,
    });
    expect(answer.status).toBe(303);
    expect(answer.headers.get('location')).toBe(
      'https://koxora.app/en/contact/problem/',
    );
    expect(sent).toHaveLength(0);
  });
  it('never builds the address it redirects to out of the request', async () => {
    const answer = await post(undefined, {
      contentType: 'application/x-www-form-urlencoded',
      raw: new URLSearchParams({
        ...valid,
        locale: 'https://evil.example',
        return: 'https://evil.example',
        redirect: '//evil.example',
      }).toString(),
      follow: false,
    });
    expect(answer.status).toBe(303);
    // An unknown language falls back to English, and nothing a request said
    // appears in the target.
    expect(answer.headers.get('location')).toBe(
      'https://koxora.app/en/contact/sent/',
    );
  });
  it('is not sent twice when the button is pressed twice', async () => {
    expect((await post(valid)).status).toBe(200);
    const second = await post(valid);
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ status: 'accepted', duplicate: true });
    expect(sent, 'the same message is sent once').toHaveLength(1);
    expect(logged.map((entry) => entry.outcome)).toEqual([
      'accepted',
      'duplicate',
    ]);
  });
  it('logs the outcome and the category and nothing else', async () => {
    await post(valid);
    expect(logged).toHaveLength(1);
    const entry = logged[0]!;
    expect(Object.keys(entry).sort()).toEqual([
      'category',
      'durationMs',
      'outcome',
      'time',
    ]);
    const serialized = JSON.stringify(entry);
    for (const secret of [
      valid.email,
      valid.name,
      valid.subject,
      valid.message,
      '127.0.0.1',
    ])
      expect(serialized, secret).not.toContain(secret);
  });
  it('answers with no cache and no sniffing', async () => {
    const answer = await post(valid);
    expect(answer.headers.get('cache-control')).toBe('no-store');
    expect(answer.headers.get('x-content-type-options')).toBe('nosniff');
    expect(answer.headers.get('referrer-policy')).toBe('no-referrer');
  });
});
describe('a submission that is not acceptable', () => {
  let sent: ContactSubmission[];
  beforeEach(async () => {
    const fake = fakeMailer();
    sent = fake.sent;
    await start({ mailer: fake.mailer });
  });
  it('names every field that is wrong and sends nothing', async () => {
    // Long enough to reach the address check, and not an address.
    const answer = await post({
      ...valid,
      email: 'nope@nope',
      message: 'short',
    });
    expect(answer.status).toBe(400);
    expect(answer.body.status).toBe('invalid');
    expect(answer.body.errors).toEqual([
      { field: 'message', problem: 'tooShort' },
      { field: 'email', problem: 'email' },
    ]);
    expect(sent).toHaveLength(0);
  });
  it('refuses a header injection in every field a header is built from', async () => {
    for (const field of ['name', 'email', 'subject'] as const) {
      const answer = await post({
        ...valid,
        [field]: `x\r\nBcc: victim@example.net`,
      });
      expect(answer.status, field).toBe(400);
      expect(answer.body.status, field).toBe('invalid');
    }
    expect(sent).toHaveLength(0);
  });
  it('refuses a body that is too large, without buffering it', async () => {
    const answer = await post(undefined, {
      raw: JSON.stringify({ ...valid, message: 'a'.repeat(200_000) }),
    });
    expect(answer.status).toBe(413);
    expect(sent).toHaveLength(0);
  });
  it('refuses a content type it does not parse', async () => {
    for (const contentType of ['text/plain', 'application/xml', null]) {
      const answer = await post(valid, { contentType });
      expect(answer.status, String(contentType)).toBe(415);
    }
    expect(sent).toHaveLength(0);
  });
  it('refuses a body that is not an object', async () => {
    for (const raw of ['[]', '"x"', 'null', '{', '42'])
      expect((await post(undefined, { raw })).status, raw).toBe(415);
    expect(sent).toHaveLength(0);
  });
  it('ignores a prototype key instead of letting it through', async () => {
    const answer = await post(undefined, {
      raw: `{"__proto__":{"polluted":true},${JSON.stringify(valid).slice(1)}`,
    });
    expect(answer.status).toBe(200);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
  it('refuses a submission from another origin', async () => {
    const answer = await post(valid, {
      headers: { origin: 'https://evil.example' },
    });
    expect(answer.status).toBe(403);
    expect(answer.body).toEqual({ status: 'badRequest' });
    expect(sent).toHaveLength(0);
  });
  it('accepts a submission with no origin header at all', async () => {
    // No cookie and no session is borrowed by this endpoint, so there is
    // nothing for a forged request to use, and refusing it would lock out
    // readers whose browser withholds the header.
    const response = await fetch(`${origin}/api/contact`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(valid),
    });
    expect(response.status).toBe(200);
  });
  it('refuses a filled honeypot and a submission faster than a person', async () => {
    const trap = await post({ ...valid, [honeypotField]: 'http://spam' });
    expect(trap.status).toBe(400);
    expect(trap.body).toEqual({ status: 'rejected', reason: 'honeypot' });
    const fast = await post({ ...valid, [timestampField]: Date.now() - 10 });
    expect(fast.body).toEqual({ status: 'rejected', reason: 'tooFast' });
    expect(sent).toHaveLength(0);
  });
  it('accepts a submission that took a person long enough', async () => {
    const answer = await post({
      ...valid,
      [timestampField]: Date.now() - minimumFillMilliseconds - 1000,
    });
    expect(answer.status).toBe(200);
    expect(sent).toHaveLength(1);
  });
});
describe('abuse controls', () => {
  it('stops a client after its allowance and says when to retry', async () => {
    const fake = fakeMailer();
    await start({ mailer: fake.mailer });
    for (let index = 0; index < 3; index += 1) {
      const answer = await post({ ...valid, subject: `Question ${index}` });
      expect(answer.status, `submission ${index}`).toBe(200);
    }
    const blocked = await post({ ...valid, subject: 'One more' });
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ status: 'rateLimited' });
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(fake.sent).toHaveLength(3);
  });
  it('counts the limit before it does any work', async () => {
    const fake = fakeMailer();
    await start({
      mailer: fake.mailer,
      env: { KOXORA_CONTACT_RATE_PER_CLIENT: '1' },
    });
    await post(valid);
    // An invalid submission still costs the allowance, so a flood of junk
    // cannot be used to probe the validator for free.
    const blocked = await post({ ...valid, email: 'nope@nope' });
    expect(blocked.status).toBe(429);
  });
  it('stops the whole service when the global allowance is spent', async () => {
    const fake = fakeMailer();
    await start({
      mailer: fake.mailer,
      env: {
        KOXORA_CONTACT_RATE_PER_CLIENT: '100',
        KOXORA_CONTACT_RATE_GLOBAL: '2',
      },
    });
    expect((await post({ ...valid, subject: 'First question' })).status).toBe(
      200,
    );
    expect((await post({ ...valid, subject: 'Second question' })).status).toBe(
      200,
    );
    expect((await post({ ...valid, subject: 'Third question' })).status).toBe(
      429,
    );
  });
});
describe('when the mail server does not take the message', () => {
  it('says so instead of claiming success', async () => {
    const fake = fakeMailer({ status: 'undelivered', reason: 'ECONNREFUSED' });
    await start({ mailer: fake.mailer });
    const answer = await post(valid);
    expect(answer.status).toBe(503);
    expect(answer.body).toEqual({ status: 'undelivered' });
    // The mail server's own words never reach the client.
    expect(JSON.stringify(answer.body)).not.toContain('ECONNREFUSED');
    expect(logged[0]!.outcome).toBe('undelivered');
  });
  it('does not remember a failed submission as a duplicate', async () => {
    const fake = fakeMailer({ status: 'undelivered', reason: 'ETIMEDOUT' });
    await start({ mailer: fake.mailer });
    expect((await post(valid)).status).toBe(503);
    // The reader must be able to try the same message again.
    expect((await post(valid)).status).toBe(503);
    expect(fake.sent).toHaveLength(2);
  });
});
describe('the other addresses the service answers', () => {
  beforeEach(async () => {
    await start({ mailer: fakeMailer().mailer });
  });
  it('answers a health check without touching the mail server', async () => {
    const response = await fetch(`${origin}/api/contact/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });
  it('refuses any other method and names the one it takes', async () => {
    const response = await fetch(`${origin}/api/contact`, { method: 'GET' });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
  });
  it('knows nothing about any other address', async () => {
    for (const path of ['/', '/api', '/api/contact/send', '/admin'])
      expect((await fetch(`${origin}${path}`)).status, path).toBe(404);
  });
});

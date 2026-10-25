import { describe, expect, it } from 'vitest';
import { readConfig } from './config';
import { createMailer } from './mailer';
import { validateContact } from '@koxora/contact';
/**
 * The mailer against the real library, with no mail server to talk to.
 *
 * It cannot assert a delivery without an SMTP account, and inventing one is
 * out of the question, so what it asserts is the half that matters without
 * credentials: a failure is reported as a failure rather than thrown, and the
 * mail server's own words do not escape into the result a client would see.
 */
const config = readConfig({
  KOXORA_CONTACT_ALLOWED_ORIGINS: 'https://koxora.app',
  KOXORA_CONTACT_RECIPIENT: 'support@koxora.app',
  KOXORA_CONTACT_SENDER: 'website@koxora.app',
  // A port nothing listens on, so the connection fails immediately.
  KOXORA_CONTACT_SMTP_HOST: '127.0.0.1',
  KOXORA_CONTACT_SMTP_PORT: '1',
  KOXORA_CONTACT_SMTP_SECURE: 'false',
  KOXORA_CONTACT_SMTP_USER: 'website@koxora.app',
  KOXORA_CONTACT_SMTP_PASSWORD: 'placeholder-for-tests',
  KOXORA_CONTACT_SEND_TIMEOUT: '1500',
});
const submission = validateContact({
  name: 'Alex Beispiel',
  email: 'alex@example.org',
  category: 'support',
  subject: 'A question about project files',
  message: 'I would like to know how the project archive format works.',
}).submission!;
describe('the mailer, with no mail server to reach', () => {
  it('reports a failure instead of throwing, and says nothing more', async () => {
    const mailer = createMailer(config);
    try {
      const outcome = await mailer.send(submission);
      expect(outcome.status).toBe('undelivered');
      // A short code for the log. Nothing a mail server said, and nothing
      // about the host, the mailbox or the credentials.
      if (outcome.status === 'undelivered') {
        expect(outcome.reason.length).toBeLessThan(40);
        expect(outcome.reason).not.toContain('@');
        expect(outcome.reason).not.toContain('127.0.0.1');
        expect(outcome.reason).not.toContain(config.smtp.password);
      }
    } finally {
      mailer.close();
    }
  }, 15000);
  it('reports an unreachable server as not verified rather than failing', async () => {
    const mailer = createMailer(config);
    try {
      // Startup logs this; it must never be the thing that stops the service.
      await expect(mailer.verify()).resolves.toBe(false);
    } finally {
      mailer.close();
    }
  }, 15000);
});

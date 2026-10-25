import { createTransport, type Transport } from 'nodemailer';
import { buildContactMail, type ContactSubmission } from '@koxora/contact';
import type { ContactConfig } from './config';
export type DeliveryOutcome =
  /** The mail server accepted the message for delivery. */
  | { status: 'accepted'; messageId?: string }
  /** It did not. Nothing is claimed about the mailbox. */
  | { status: 'undelivered'; reason: string };
export interface Mailer {
  send(submission: ContactSubmission): Promise<DeliveryOutcome>;
  verify(): Promise<boolean>;
  close(): void;
}
/**
 * SMTP delivery.
 *
 * Two properties matter more than anything else here:
 *
 * - **The reader's address is a `Reply-To`, never a `From`.** Sending as the
 *   reader would be a forgery that mail providers reject on sight, and it
 *   would turn this mailbox into a relay for any address anyone types.
 * - **Accepted is not delivered.** This returns `accepted` when the mail
 *   server took the message, which is all that can honestly be claimed from
 *   here; what the mailbox does afterwards is not visible to this service and
 *   is not reported to the reader as success.
 *
 * TLS is required. A transport that would fall back to a plain connection is
 * refused at configuration time, because the credentials travel on it.
 */
export function createMailer(config: ContactConfig): Mailer {
  const transport: Transport = createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    // On a port that starts in the clear, STARTTLS is mandatory rather than
    // opportunistic: without this an attacker who can strip the upgrade sees
    // the credentials.
    requireTLS: !config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.password },
    connectionTimeout: config.limits.sendTimeoutMilliseconds,
    greetingTimeout: config.limits.sendTimeoutMilliseconds,
    socketTimeout: config.limits.sendTimeoutMilliseconds,
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    pool: false,
    // The service sends text it built itself. Nothing may read a file or
    // fetch a URL on behalf of a message, which is where an SSRF would live.
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return {
    async send(submission) {
      const mail = buildContactMail(submission, {
        subjectPrefix: config.subjectPrefix,
      });
      try {
        const result = await transport.sendMail({
          from: config.sender,
          to: config.recipient,
          subject: mail.subject,
          text: mail.text,
          replyTo: mail.replyTo,
          headers: {
            // Marks the message as automatic so holiday replies and other
            // automation do not answer it, and names where it came from.
            'Auto-Submitted': 'auto-generated',
            'X-Koxora-Contact-Category': submission.category,
          },
        });
        if (result.accepted.length === 0)
          return { status: 'undelivered', reason: 'rejected-by-server' };
        return { status: 'accepted', messageId: result.messageId };
      } catch (error) {
        // The reason is a short code for the log. The response to the client
        // never carries it: a mail server's error text can name hosts,
        // mailboxes and policies that are nobody else's business.
        return {
          status: 'undelivered',
          reason: error instanceof Error ? error.name : 'unknown',
        };
      }
    },
    async verify() {
      try {
        await transport.verify();
        return true;
      } catch {
        return false;
      }
    },
    close() {
      transport.close();
    },
  };
}

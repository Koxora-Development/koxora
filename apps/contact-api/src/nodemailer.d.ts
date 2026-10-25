/**
 * The part of nodemailer this service uses, and nothing more.
 *
 * nodemailer ships no type declarations, and this is the whole surface the
 * mailer touches: one transport, one send, one verify, one close. Declaring
 * it here rather than adding another dependency keeps the list of things that
 * can change under us to one package.
 */
declare module 'nodemailer' {
  export interface SmtpOptions {
    host: string;
    port: number;
    /** `true` for implicit TLS on 465; STARTTLS is used otherwise. */
    secure: boolean;
    requireTLS?: boolean;
    auth?: { user: string; pass: string };
    connectionTimeout?: number;
    greetingTimeout?: number;
    socketTimeout?: number;
    tls?: { minVersion?: string; rejectUnauthorized?: boolean };
    pool?: boolean;
    maxConnections?: number;
    disableFileAccess?: boolean;
    disableUrlAccess?: boolean;
  }
  export interface Envelope {
    from: string;
    to: string;
    subject: string;
    text: string;
    replyTo?: string;
    headers?: Record<string, string>;
  }
  export interface SentMessage {
    accepted: string[];
    rejected: string[];
    messageId?: string;
    response?: string;
  }
  export interface Transport {
    sendMail(envelope: Envelope): Promise<SentMessage>;
    verify(): Promise<true>;
    close(): void;
  }
  export function createTransport(options: SmtpOptions): Transport;
}

import { contactField } from '@koxora/contact';
/**
 * Everything the service needs, from the environment and nowhere else.
 *
 * There is no default for any secret and no default mailbox: a missing
 * setting stops the service at startup with a message naming what is
 * missing, rather than starting something that silently cannot deliver. No
 * value here is ever sent to a client.
 */
export interface ContactConfig {
  port: number;
  host: string;
  /** Absolute origin the form is served from; a submission must come from it. */
  allowedOrigins: string[];
  /** The mailbox that receives the messages. */
  recipient: string;
  /** The address the service sends as. Never a reader's address. */
  sender: string;
  subjectPrefix: string;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
  };
  limits: {
    /** Largest accepted request body, in bytes. */
    bodyBytes: number;
    perClient: { count: number; windowSeconds: number };
    global: { count: number; windowSeconds: number };
    /** How long an identical submission is treated as the same one. */
    duplicateWindowSeconds: number;
    sendTimeoutMilliseconds: number;
  };
  /** `true` only where a known proxy sets the forwarded address. */
  trustProxy: boolean;
  /**
   * Where a submission without JavaScript is sent afterwards. A classic form
   * post cannot show a JSON answer, so the service redirects to a page on
   * the website. The addresses are built from configuration and a fixed
   * table, never from anything the request contains: a redirect target that
   * a request can name is an open redirect.
   */
  results: {
    base: string;
    accepted: Record<ResultLocale, string>;
    problem: Record<ResultLocale, string>;
  };
}
/** The languages the website has, as the result pages exist in both. */
export const resultLocales = ['en', 'de'] as const;
export type ResultLocale = (typeof resultLocales)[number];
export function isResultLocale(value: unknown): value is ResultLocale {
  return (
    typeof value === 'string' &&
    (resultLocales as readonly string[]).includes(value)
  );
}
export class ConfigurationError extends Error {}
function required(name: string, value: string | undefined): string {
  if (!value || !value.trim())
    throw new ConfigurationError(
      `${name} is required; the contact service does not start without it.`,
    );
  return value.trim();
}
function number(name: string, value: string | undefined, fallback: number) {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0)
    throw new ConfigurationError(`${name} must be a positive number.`);
  return parsed;
}
function flag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}
function mailbox(name: string, value: string): string {
  // The configured addresses become headers too, so they are held to the
  // same rule as a reader's address: one plain address, nothing else.
  if (!/^[^\s<>",;:\\]+@[^\s<>",;:\\]+\.[A-Za-z]{2,}$/.test(value))
    throw new ConfigurationError(`${name} must be one plain email address.`);
  return value;
}
/** A site-relative path, so a configured value cannot leave the website. */
function path(name: string, value: string | undefined, fallback: string) {
  const candidate = value?.trim() || fallback;
  if (!/^\/[A-Za-z0-9/_-]*\/$/.test(candidate))
    throw new ConfigurationError(
      `${name} must be an absolute site path ending in a slash; got ${candidate}`,
    );
  return candidate;
}
export function readConfig(
  environment: Record<string, string | undefined> = process.env,
): ContactConfig {
  const origins = required(
    'KOXORA_CONTACT_ALLOWED_ORIGINS',
    environment.KOXORA_CONTACT_ALLOWED_ORIGINS,
  )
    .split(',')
    .map((entry) => entry.trim().replace(/\/$/, ''))
    .filter(Boolean);
  for (const origin of origins)
    if (!/^https?:\/\/[^/\s]+$/.test(origin))
      throw new ConfigurationError(
        `KOXORA_CONTACT_ALLOWED_ORIGINS must list absolute origins; got ${origin}`,
      );
  const secure = flag(environment.KOXORA_CONTACT_SMTP_SECURE, true);
  return {
    port: number('KOXORA_CONTACT_PORT', environment.KOXORA_CONTACT_PORT, 8081),
    host: environment.KOXORA_CONTACT_HOST?.trim() || '0.0.0.0',
    allowedOrigins: origins,
    recipient: mailbox(
      'KOXORA_CONTACT_RECIPIENT',
      required(
        'KOXORA_CONTACT_RECIPIENT',
        environment.KOXORA_CONTACT_RECIPIENT,
      ),
    ),
    sender: mailbox(
      'KOXORA_CONTACT_SENDER',
      required('KOXORA_CONTACT_SENDER', environment.KOXORA_CONTACT_SENDER),
    ),
    subjectPrefix:
      environment.KOXORA_CONTACT_SUBJECT_PREFIX?.trim() || '[Koxora]',
    smtp: {
      host: required(
        'KOXORA_CONTACT_SMTP_HOST',
        environment.KOXORA_CONTACT_SMTP_HOST,
      ),
      port: number(
        'KOXORA_CONTACT_SMTP_PORT',
        environment.KOXORA_CONTACT_SMTP_PORT,
        secure ? 465 : 587,
      ),
      secure,
      user: required(
        'KOXORA_CONTACT_SMTP_USER',
        environment.KOXORA_CONTACT_SMTP_USER,
      ),
      password: required(
        'KOXORA_CONTACT_SMTP_PASSWORD',
        environment.KOXORA_CONTACT_SMTP_PASSWORD,
      ),
    },
    limits: {
      // Comfortably more than the longest valid submission, and far less
      // than anything worth buffering.
      bodyBytes: number(
        'KOXORA_CONTACT_MAX_BODY_BYTES',
        environment.KOXORA_CONTACT_MAX_BODY_BYTES,
        Math.max(16 * 1024, contactField('message').maxLength * 2),
      ),
      perClient: {
        count: number(
          'KOXORA_CONTACT_RATE_PER_CLIENT',
          environment.KOXORA_CONTACT_RATE_PER_CLIENT,
          3,
        ),
        windowSeconds: number(
          'KOXORA_CONTACT_RATE_PER_CLIENT_WINDOW',
          environment.KOXORA_CONTACT_RATE_PER_CLIENT_WINDOW,
          3600,
        ),
      },
      global: {
        count: number(
          'KOXORA_CONTACT_RATE_GLOBAL',
          environment.KOXORA_CONTACT_RATE_GLOBAL,
          60,
        ),
        windowSeconds: number(
          'KOXORA_CONTACT_RATE_GLOBAL_WINDOW',
          environment.KOXORA_CONTACT_RATE_GLOBAL_WINDOW,
          3600,
        ),
      },
      duplicateWindowSeconds: number(
        'KOXORA_CONTACT_DUPLICATE_WINDOW',
        environment.KOXORA_CONTACT_DUPLICATE_WINDOW,
        600,
      ),
      sendTimeoutMilliseconds: number(
        'KOXORA_CONTACT_SEND_TIMEOUT',
        environment.KOXORA_CONTACT_SEND_TIMEOUT,
        15000,
      ),
    },
    trustProxy: flag(environment.KOXORA_CONTACT_TRUST_PROXY, false),
    results: {
      base: (
        environment.KOXORA_CONTACT_RESULT_BASE?.trim() || origins[0]!
      ).replace(/\/$/, ''),
      // The localized addresses of the two result pages. A unit test in the
      // website asserts these match the real route table, so the two cannot
      // drift apart unnoticed.
      accepted: {
        en: path(
          'KOXORA_CONTACT_RESULT_ACCEPTED_EN',
          environment.KOXORA_CONTACT_RESULT_ACCEPTED_EN,
          '/en/contact/sent/',
        ),
        de: path(
          'KOXORA_CONTACT_RESULT_ACCEPTED_DE',
          environment.KOXORA_CONTACT_RESULT_ACCEPTED_DE,
          '/de/kontakt/gesendet/',
        ),
      },
      problem: {
        en: path(
          'KOXORA_CONTACT_RESULT_PROBLEM_EN',
          environment.KOXORA_CONTACT_RESULT_PROBLEM_EN,
          '/en/contact/problem/',
        ),
        de: path(
          'KOXORA_CONTACT_RESULT_PROBLEM_DE',
          environment.KOXORA_CONTACT_RESULT_PROBLEM_DE,
          '/de/kontakt/problem/',
        ),
      },
    },
  };
}

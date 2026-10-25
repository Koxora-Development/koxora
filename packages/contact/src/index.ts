/**
 * The contract of the contact form.
 *
 * The website renders the form from this specification, the enhancement
 * script checks a submission against it before sending, and the delivery
 * service checks it again before accepting. The server never trusts the
 * client: it runs the same validation independently, which is why the rules
 * live here rather than in either of them.
 *
 * It has no dependencies and touches no runtime API, so the same file runs in
 * a browser, in the build-time renderer and in the service.
 */
export const contactCategories = [
  'general',
  'feedback',
  'support',
  'bug',
] as const;
export type ContactCategory = (typeof contactCategories)[number];
export function isContactCategory(value: unknown): value is ContactCategory {
  return (
    typeof value === 'string' &&
    (contactCategories as readonly string[]).includes(value)
  );
}
export type ContactFieldName =
  'name' | 'email' | 'category' | 'subject' | 'message';
export interface ContactFieldSpec {
  name: ContactFieldName;
  required: boolean;
  /** Longest accepted value; a longer one is refused, never truncated. */
  maxLength: number;
  minLength: number;
}
/**
 * Lengths are deliberate rather than round. A subject longer than 120
 * characters is a message in the wrong field, and a header field has to stay
 * short; 5000 characters is a long support request and still a bounded body.
 */
export const contactFields: ContactFieldSpec[] = [
  { name: 'name', required: false, minLength: 0, maxLength: 80 },
  { name: 'email', required: true, minLength: 6, maxLength: 160 },
  { name: 'category', required: true, minLength: 1, maxLength: 20 },
  { name: 'subject', required: true, minLength: 3, maxLength: 120 },
  { name: 'message', required: true, minLength: 20, maxLength: 5000 },
];
export function contactField(name: ContactFieldName): ContactFieldSpec {
  const field = contactFields.find((entry) => entry.name === name);
  if (!field) throw new Error(`Unknown contact field: ${name}`);
  return field;
}
/** The name of the field that must stay empty, and the one that times it. */
export const honeypotField = 'website';
export const timestampField = 'opened';
/** A submission faster than this was not typed by a person. */
export const minimumFillMilliseconds = 3000;
/** A form open for longer than this is stale; the reader reloads and retries. */
export const maximumFillMilliseconds = 12 * 60 * 60 * 1000;
export interface ContactSubmission {
  name: string;
  email: string;
  category: ContactCategory;
  subject: string;
  message: string;
}
export type ContactProblem =
  | 'required'
  | 'tooShort'
  | 'tooLong'
  | 'email'
  | 'category'
  | 'controlCharacter';
export interface ContactFieldError {
  field: ContactFieldName;
  problem: ContactProblem;
}
/**
 * One address, nothing else. The pattern is deliberately stricter than the
 * mail standard allows: it refuses a display name, a comment, a quoted local
 * part, a second address and anything that is not a single plain address,
 * because the value becomes a `Reply-To` header and the simplest value that
 * works is the only one worth accepting.
 */
const emailPattern =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
export function isContactEmail(value: string): boolean {
  if (value.length > contactField('email').maxLength) return false;
  if (hasControlCharacter(value)) return false;
  return emailPattern.test(value);
}
/**
 * Anything that could end a header line or smuggle a new one. A carriage
 * return or a line feed in a subject or an address is the classic header
 * injection, and the other control characters have no business in any of
 * these fields either. A message body may contain line breaks and tabs.
 */
export function hasControlCharacter(
  value: string,
  { allowLineBreaks = false }: { allowLineBreaks?: boolean } = {},
): boolean {
  for (const character of value) {
    const code = character.codePointAt(0)!;
    if (allowLineBreaks && (code === 10 || code === 13 || code === 9)) continue;
    // C0 controls, delete, and the C1 range, which some mail software
    // interprets and which no reader types on purpose.
    if (code < 32 || code === 127 || (code >= 128 && code <= 159)) return true;
  }
  return false;
}
/**
 * Normalizes the line endings of a message body and trims it, without
 * changing what was written. Single-line fields do not go through this: they
 * are refused when they contain a line ending rather than rewritten.
 */
export function normalizeContactValue(
  value: unknown,
  { allowLineBreaks = false }: { allowLineBreaks?: boolean } = {},
): string {
  if (typeof value !== 'string') return '';
  const text = value.replace(/\r\n?/g, '\n');
  return allowLineBreaks ? text.trim() : text.replace(/\n/g, ' ').trim();
}
export interface ContactValidationResult {
  errors: ContactFieldError[];
  /** Present only when there is no error at all. */
  submission?: ContactSubmission;
}
/**
 * Validates one submission. The result names every field that is wrong, so a
 * reader fixes the whole form once instead of discovering one problem at a
 * time, and the service answers with the same list.
 */
export function validateContact(
  input: Record<string, unknown>,
): ContactValidationResult {
  const errors: ContactFieldError[] = [];
  const add = (field: ContactFieldName, problem: ContactProblem) =>
    errors.push({ field, problem });
  // A single-line field is checked as it was written, before anything is
  // normalized away: a line ending in a subject is refused rather than
  // quietly turned into a space, so a reader is never told their message was
  // sent as typed when it was rewritten.
  const single = (value: unknown) =>
    typeof value === 'string' ? value.trim() : '';
  const name = single(input.name);
  const email = single(input.email);
  const subject = single(input.subject);
  const category = single(input.category);
  const message = normalizeContactValue(input.message, {
    allowLineBreaks: true,
  });
  for (const [field, value, allowLineBreaks] of [
    ['name', name, false],
    ['email', email, false],
    ['subject', subject, false],
    ['message', message, true],
  ] as const) {
    const spec = contactField(field);
    if (!value) {
      if (spec.required) add(field, 'required');
      continue;
    }
    if (hasControlCharacter(value, { allowLineBreaks }))
      add(field, 'controlCharacter');
    else if (value.length < spec.minLength) add(field, 'tooShort');
    else if (value.length > spec.maxLength) add(field, 'tooLong');
  }
  if (!category) add('category', 'required');
  else if (!isContactCategory(category)) add('category', 'category');
  if (email && !errors.some((error) => error.field === 'email'))
    if (!isContactEmail(email)) add('email', 'email');
  if (errors.length > 0) return { errors };
  return {
    errors: [],
    submission: {
      name,
      email,
      category: category as ContactCategory,
      subject,
      message,
    },
  };
}
export type SpamReason = 'honeypot' | 'tooFast' | 'stale';
/**
 * The checks that need no third party and store nothing: a field a person
 * never sees and a submission faster than a person can type. A missing
 * timestamp is not held against anyone, because a reader without JavaScript
 * has none.
 */
export function detectSpam({
  honeypot,
  openedAt,
  now = Date.now(),
}: {
  honeypot?: unknown;
  openedAt?: unknown;
  now?: number;
}): SpamReason | null {
  if (typeof honeypot === 'string' && honeypot.trim() !== '') return 'honeypot';
  const opened = Number(openedAt);
  if (!openedAt || !Number.isFinite(opened) || opened <= 0) return null;
  const elapsed = now - opened;
  if (elapsed < minimumFillMilliseconds) return 'tooFast';
  if (elapsed > maximumFillMilliseconds) return 'stale';
  return null;
}
/**
 * What a delivered message looks like. The address a reader supplied becomes
 * a `Reply-To` and never a `From`: sending as the reader would be a forgery
 * that mail providers reject, and it would make the operator's domain a relay
 * for anyone's address.
 */
export interface ContactMail {
  subject: string;
  replyTo: string;
  text: string;
}
export function buildContactMail(
  submission: ContactSubmission,
  { subjectPrefix = '[Koxora]' }: { subjectPrefix?: string } = {},
): ContactMail {
  // The category is one of four known words and the subject has already been
  // stripped of anything that could end a header line.
  const subject = `${subjectPrefix} ${submission.category}: ${submission.subject}`;
  const lines = [
    `Category: ${submission.category}`,
    `From: ${submission.name || '(no name given)'} <${submission.email}>`,
    '',
    submission.message,
    '',
  ];
  return { subject, replyTo: submission.email, text: lines.join('\n') };
}

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contractFixture } from './contract-fixture';
import {
  buildContactMail,
  contactCategories,
  contactField,
  detectSpam,
  hasControlCharacter,
  isContactEmail,
  minimumFillMilliseconds,
  normalizeContactValue,
  validateContact,
} from './index';
const valid = {
  name: 'Alex Beispiel',
  email: 'alex@example.org',
  category: 'support',
  subject: 'A question about project files',
  message: 'I would like to know how the project archive format works.',
};
describe('validation', () => {
  it('accepts a complete submission and returns what was written', () => {
    const result = validateContact(valid);
    expect(result.errors).toEqual([]);
    expect(result.submission).toEqual(valid);
  });
  it('treats the name as optional and everything else as required', () => {
    expect(validateContact({ ...valid, name: '' }).errors).toEqual([]);
    expect(validateContact({ ...valid, name: '   ' }).errors).toEqual([]);
    for (const field of ['email', 'category', 'subject', 'message'] as const)
      expect(
        validateContact({ ...valid, [field]: '' }).errors,
        field,
      ).toContainEqual({ field, problem: 'required' });
  });
  it('names every problem at once, so the form is fixed in one pass', () => {
    const result = validateContact({
      name: 'x'.repeat(200),
      email: 'not-an-address',
      category: 'marketing',
      subject: 'hi',
      message: 'too short',
    });
    expect(result.submission).toBeUndefined();
    expect(result.errors.map((error) => error.field).sort()).toEqual([
      'category',
      'email',
      'message',
      'name',
      'subject',
    ]);
  });
  it('refuses a value longer than its limit instead of truncating it', () => {
    for (const field of ['name', 'subject', 'message'] as const) {
      const spec = contactField(field);
      const result = validateContact({
        ...valid,
        [field]: 'a'.repeat(spec.maxLength + 1),
      });
      expect(result.errors, field).toContainEqual({
        field,
        problem: 'tooLong',
      });
      expect(
        validateContact({ ...valid, [field]: 'a'.repeat(spec.maxLength) })
          .errors,
        field,
      ).toEqual([]);
    }
  });
  it('accepts only the four published categories', () => {
    for (const category of contactCategories)
      expect(validateContact({ ...valid, category }).errors, category).toEqual(
        [],
      );
    for (const category of ['Support', 'security', 'other', '../general'])
      expect(
        validateContact({ ...valid, category }).errors,
        category,
      ).toContainEqual({ field: 'category', problem: 'category' });
  });
  it('ignores anything the form did not ask for', () => {
    const result = validateContact({
      ...valid,
      admin: 'true',
      to: 'someone@example.net',
    });
    expect(result.submission).toEqual(valid);
  });
  it('refuses a non-string where a string belongs', () => {
    for (const value of [42, null, undefined, {}, ['a']])
      expect(
        validateContact({ ...valid, subject: value }).errors,
        String(value),
      ).toContainEqual({ field: 'subject', problem: 'required' });
  });
});
describe('header safety', () => {
  it('refuses a line ending anywhere a header field is built from', () => {
    for (const field of ['name', 'email', 'subject'] as const)
      for (const value of [
        'a\r\nBcc: victim@example.net',
        'a\nBcc: victim@example.net',
        'a\rb',
        'a\u0000b',
        'a\u0085b',
      ]) {
        const result = validateContact({ ...valid, [field]: value });
        expect(
          result.errors.some((error) => error.field === field),
          `${field}: ${JSON.stringify(value)}`,
        ).toBe(true);
        expect(result.submission).toBeUndefined();
      }
  });
  it('lets a message body contain line breaks and tabs', () => {
    const message = 'First line.\n\nSecond line.\n\tIndented.';
    const result = validateContact({ ...valid, message });
    expect(result.errors).toEqual([]);
    expect(result.submission?.message).toBe(message);
  });
  it('normalizes line endings without rewriting the text', () => {
    expect(normalizeContactValue('a\r\nb', { allowLineBreaks: true })).toBe(
      'a\nb',
    );
    // Only a body goes through this; a single-line field with a break is
    // refused instead, which the header-safety cases above assert.
    expect(normalizeContactValue('a\r\nb')).toBe('a b');
  });
  it('detects control characters, and allows the three a body may have', () => {
    expect(hasControlCharacter('plain text')).toBe(false);
    expect(hasControlCharacter('a\nb')).toBe(true);
    expect(hasControlCharacter('a\nb', { allowLineBreaks: true })).toBe(false);
    expect(hasControlCharacter('a\u0007b')).toBe(true);
  });
  it('accepts one plain address and nothing that is more than that', () => {
    for (const value of [
      'alex@example.org',
      'a.b+c@sub.example.co.uk',
      "o'brien@example.com",
    ])
      expect(isContactEmail(value), value).toBe(true);
    for (const value of [
      'Alex <alex@example.org>',
      'alex@example.org, other@example.net',
      'alex@example.org\r\nBcc: x@example.net',
      '"alex"@example.org',
      'alex@example.org (comment)',
      'alex@localhost',
      'alex@',
      '@example.org',
      'alex@example',
      'alex@-example.org',
      'alex@example.org.',
      `${'a'.repeat(200)}@example.org`,
    ])
      expect(isContactEmail(value), value).toBe(false);
  });
});
describe('the mail that is built', () => {
  it('replies to the reader and never sends as them', () => {
    const mail = buildContactMail(validateContact(valid).submission!);
    expect(mail.replyTo).toBe(valid.email);
    expect(mail.subject).toContain(valid.subject);
    expect(mail.subject).toContain('support');
    expect(mail.text).toContain(valid.message);
    expect(mail.text).toContain(valid.email);
  });
  it('builds a subject that cannot carry a second header', () => {
    const submission = validateContact({
      ...valid,
      subject: 'a'.repeat(contactField('subject').maxLength),
    }).submission!;
    const mail = buildContactMail(submission);
    expect(mail.subject).not.toMatch(/[\r\n]/);
    expect(mail.replyTo).not.toMatch(/[\r\n]/);
  });
  it('says so when no name was given, rather than leaving a gap', () => {
    const mail = buildContactMail(
      validateContact({ ...valid, name: '' }).submission!,
    );
    expect(mail.text).toContain('(no name given)');
  });
});
describe('the checks that need no third party', () => {
  it('rejects a filled honeypot', () => {
    expect(detectSpam({ honeypot: 'http://spam.example' })).toBe('honeypot');
    expect(detectSpam({ honeypot: '' })).toBeNull();
    expect(detectSpam({ honeypot: '   ' })).toBeNull();
  });
  it('rejects a submission faster than a person can type', () => {
    const now = 1_000_000;
    expect(detectSpam({ openedAt: now - 10, now })).toBe('tooFast');
    expect(
      detectSpam({ openedAt: now - minimumFillMilliseconds + 1, now }),
    ).toBe('tooFast');
    expect(
      detectSpam({ openedAt: now - minimumFillMilliseconds, now }),
    ).toBeNull();
  });
  it('asks a reader with a very old form to reload', () => {
    const now = 1_000_000_000;
    expect(detectSpam({ openedAt: now - 13 * 60 * 60 * 1000, now })).toBe(
      'stale',
    );
  });
  it('holds a missing or unusable timestamp against nobody', () => {
    // A reader without JavaScript has no timestamp, and that is not spam.
    for (const openedAt of [undefined, '', 'abc', 0, -1, null])
      expect(detectSpam({ openedAt }), String(openedAt)).toBeNull();
  });
});
/**
 * The vectors below are the ones the PHP endpoint runs as well, from the same
 * file. The browser's validation is a convenience for the reader and the
 * server's is the control, so the two are written independently — but a
 * reader told their message is fine and then told by the server that it is
 * too long has been lied to once, which is what these prevent.
 */
describe('the vectors the server runs too', () => {
  const vectors = JSON.parse(
    readFileSync(
      resolve(import.meta.dirname, '../fixtures/validation.json'),
      'utf8',
    ),
  ) as {
    vectors: {
      name: string;
      input: Record<string, unknown>;
      errors: { field: string; problem: string }[];
      submission: Record<string, string> | null;
    }[];
    spam: {
      name: string;
      honeypot: string;
      openedAt: unknown;
      elapsedMs: number | null;
      reason: string | null;
    }[];
  };
  it('has vectors to run at all, so an empty file cannot pass', () => {
    expect(vectors.vectors.length).toBeGreaterThan(15);
    expect(vectors.spam.length).toBeGreaterThan(5);
  });
  for (const vector of vectors.vectors)
    it(`validates: ${vector.name}`, () => {
      const result = validateContact(vector.input);
      expect(result.errors).toEqual(vector.errors);
      if (vector.submission === null) expect(result.submission).toBeUndefined();
      else expect(result.submission).toEqual(vector.submission);
    });
  for (const vector of vectors.spam)
    it(`inspects: ${vector.name}`, () => {
      const openedAt = vector.openedAt;
      const now =
        vector.elapsedMs !== null && typeof openedAt === 'number'
          ? openedAt + vector.elapsedMs
          : 1_000_000_000;
      expect(detectSpam({ honeypot: vector.honeypot, openedAt, now })).toBe(
        vector.reason,
      );
    });
});
describe('the contract the server restates', () => {
  it('is written out exactly as the module defines it', () => {
    // `pnpm contact:contract` regenerates this. The PHP endpoint asserts its
    // own constants against the same file, so a limit changed here and not
    // there fails a build rather than reaching a reader.
    const committed = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, '../fixtures/contract.json'),
        'utf8',
      ),
    );
    expect(committed).toEqual(JSON.parse(JSON.stringify(contractFixture())));
  });
});

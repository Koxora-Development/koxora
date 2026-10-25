import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contactPolicyExtras } from './contact';
import { locales, pathFor } from '../routes';
describe('what the contact form adds to the content security policy', () => {
  const origin = 'https://koxora.app';
  it('adds nothing at all when no delivery service is configured', () => {
    // A deployment without a service renders no form, so the stricter
    // policy is correct and stays.
    expect(contactPolicyExtras(null, origin)).toEqual({});
  });
  it('allows exactly the same origin for a path on the site', () => {
    expect(contactPolicyExtras('/api/contact', origin)).toEqual({
      'form-action': ["'self'"],
      'connect-src': ["'self'"],
    });
    expect(contactPolicyExtras(`${origin}/api/contact`, origin)).toEqual({
      'form-action': ["'self'"],
      'connect-src': ["'self'"],
    });
  });
  it('names another origin rather than widening to everything', () => {
    expect(
      contactPolicyExtras('https://forms.example.org/api/contact', origin),
    ).toEqual({
      'form-action': ['https://forms.example.org'],
      'connect-src': ['https://forms.example.org'],
    });
  });
  it('widens nothing for an address that cannot be posted to', () => {
    // A `javascript:` or `data:` value in the configuration must never end
    // up as a policy source. The site configuration refuses such a value as
    // a form action too, so no form is rendered for it either.
    for (const endpoint of ['javascript:alert(1)', 'data:,x', 'mailto:a@b.co'])
      expect(contactPolicyExtras(endpoint, origin), endpoint).toEqual({});
  });
  it('treats an odd but relative value as the site itself', () => {
    expect(contactPolicyExtras('api/contact', origin)).toEqual({
      'form-action': ["'self'"],
      'connect-src': ["'self'"],
    });
  });
  it('covers both directives, because the form needs both', () => {
    // A submission without JavaScript is a form action; one with JavaScript
    // is a connection. Allowing only one would break half the readers.
    const extras = contactPolicyExtras('/api/contact', origin);
    expect(Object.keys(extras).sort()).toEqual(['connect-src', 'form-action']);
  });
});
describe('the result pages a submission without JavaScript lands on', () => {
  // A classic form post cannot show a JSON answer, so the endpoint redirects
  // to a page on the website. The endpoint is PHP and cannot import this
  // route table, so it carries the four addresses as its own defaults. If a
  // slug is renamed here and not there, a reader without JavaScript lands on
  // a page that does not exist — and nothing else would notice, because the
  // reader who hits it is the one least likely to report it.
  const config = readFileSync(
    resolve(import.meta.dirname, '../../../contact-php/src/Config.php'),
    'utf8',
  );
  for (const [id, label] of [
    ['contactSent', 'accepted'],
    ['contactProblem', 'problem'],
  ] as const)
    for (const locale of locales)
      it(`agrees with the endpoint about the ${label} page in ${locale}`, () => {
        const path = pathFor(id, locale);
        expect(path.startsWith('/') && path.endsWith('/')).toBe(true);
        expect(
          config,
          `${id} in ${locale} is ${path}, which the endpoint does not know`,
        ).toContain(`'${path}'`);
      });
  it('finds those defaults in the endpoint at all', () => {
    // So a renamed constant cannot make the assertions above vacuous.
    expect(config).toContain('KOXORA_CONTACT_RESULT_ACCEPTED_EN');
    expect(config).toContain('KOXORA_CONTACT_RESULT_PROBLEM_DE');
  });
});

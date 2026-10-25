import { describe, expect, it } from 'vitest';
import { contactPolicyExtras } from './contact';
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

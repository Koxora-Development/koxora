import { describe, expect, it } from 'vitest';
import { ConfigurationError, readConfig } from './config';
const complete = {
  KOXORA_CONTACT_ALLOWED_ORIGINS: 'https://koxora.app',
  KOXORA_CONTACT_RECIPIENT: 'support@koxora.app',
  KOXORA_CONTACT_SENDER: 'website@koxora.app',
  KOXORA_CONTACT_SMTP_HOST: 'smtp.example.invalid',
  KOXORA_CONTACT_SMTP_USER: 'website@koxora.app',
  KOXORA_CONTACT_SMTP_PASSWORD: 'placeholder-for-tests',
};
describe('the service refuses to start without what it needs', () => {
  it('names the setting that is missing', () => {
    for (const name of Object.keys(complete)) {
      const incomplete = { ...complete, [name]: undefined };
      expect(() => readConfig(incomplete), name).toThrow(ConfigurationError);
      try {
        readConfig(incomplete);
      } catch (error) {
        expect((error as Error).message, name).toContain(name);
      }
    }
  });
  it('treats an empty value as missing', () => {
    expect(() =>
      readConfig({ ...complete, KOXORA_CONTACT_SMTP_PASSWORD: '   ' }),
    ).toThrow(ConfigurationError);
  });
  it('refuses a mailbox that is not one plain address', () => {
    for (const value of [
      'Support <support@koxora.app>',
      'a@b',
      'support@koxora.app, other@example.net',
      'support@koxora.app\r\nBcc: x@example.net',
      'not-an-address',
    ])
      expect(
        () => readConfig({ ...complete, KOXORA_CONTACT_RECIPIENT: value }),
        value,
      ).toThrow(ConfigurationError);
  });
  it('refuses an origin that is not an absolute origin', () => {
    for (const value of [
      'koxora.app',
      'https://koxora.app/contact',
      '*',
      'file:///etc',
    ])
      expect(
        () =>
          readConfig({ ...complete, KOXORA_CONTACT_ALLOWED_ORIGINS: value }),
        value,
      ).toThrow(ConfigurationError);
  });
  it('refuses a limit that is not a positive number', () => {
    for (const value of ['0', '-1', 'many'])
      expect(
        () => readConfig({ ...complete, KOXORA_CONTACT_RATE_GLOBAL: value }),
        value,
      ).toThrow(ConfigurationError);
  });
});
describe('the defaults it starts with', () => {
  const config = readConfig(complete);
  it('requires transport security and a current protocol version', () => {
    // The credentials travel on this connection.
    expect(config.smtp.secure).toBe(true);
    expect(config.smtp.port).toBe(465);
    const starttls = readConfig({
      ...complete,
      KOXORA_CONTACT_SMTP_SECURE: 'false',
    });
    expect(starttls.smtp.port).toBe(587);
  });
  it('trusts no proxy header until it is told to', () => {
    expect(config.trustProxy).toBe(false);
  });
  it('bounds the body, the rate and the time a send may take', () => {
    expect(config.limits.bodyBytes).toBeGreaterThanOrEqual(16 * 1024);
    expect(config.limits.bodyBytes).toBeLessThanOrEqual(64 * 1024);
    expect(config.limits.perClient.count).toBeLessThanOrEqual(5);
    expect(config.limits.global.count).toBeLessThanOrEqual(100);
    expect(config.limits.sendTimeoutMilliseconds).toBeLessThanOrEqual(30000);
    expect(config.limits.duplicateWindowSeconds).toBeGreaterThanOrEqual(300);
  });
  it('accepts several origins, without a trailing slash', () => {
    const several = readConfig({
      ...complete,
      KOXORA_CONTACT_ALLOWED_ORIGINS:
        'https://koxora.app/, https://www.koxora.app',
    });
    expect(several.allowedOrigins).toEqual([
      'https://koxora.app',
      'https://www.koxora.app',
    ]);
  });
});

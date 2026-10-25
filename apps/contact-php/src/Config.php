<?php

declare(strict_types=1);

namespace Koxora\Contact;

/**
 * Everything the endpoint needs, and nothing it does not.
 *
 * Settings come from the environment, or from a PHP file outside every
 * document root whose path the environment names. Neither is web readable:
 * the only file Apache is allowed to execute is `public/contact.php`, and the
 * settings file is deliberately somewhere Apache does not serve from.
 *
 * There is no default for any secret and no default mailbox. A missing
 * setting makes the endpoint refuse the submission and say so in the server
 * log, rather than accept a message it cannot deliver. No value here ever
 * reaches a client.
 */
final class Config
{
    /**
     * @param list<string>           $allowedOrigins
     * @param array<string, string>  $resultAccepted
     * @param array<string, string>  $resultProblem
     */
    private function __construct(
        public readonly bool $enabled,
        public readonly array $allowedOrigins,
        public readonly string $recipient,
        public readonly string $sender,
        public readonly string $subjectPrefix,
        public readonly string $smtpHost,
        public readonly int $smtpPort,
        public readonly bool $smtpImplicitTls,
        public readonly string $smtpUser,
        public readonly string $smtpPassword,
        public readonly int $bodyBytes,
        public readonly int $perClientCount,
        public readonly int $perClientWindow,
        public readonly int $globalCount,
        public readonly int $globalWindow,
        public readonly int $duplicateWindow,
        public readonly int $sendTimeout,
        public readonly bool $trustProxy,
        public readonly string $stateDirectory,
        public readonly string $resultBase,
        public readonly array $resultAccepted,
        public readonly array $resultProblem,
    ) {
    }

    /** The two languages the website has, so both result pages exist. */
    public const LOCALES = ['en', 'de'];

    public static function isLocale(mixed $value): bool
    {
        return \is_string($value) && \in_array($value, self::LOCALES, true);
    }

    /**
     * Reads the settings. `$environment` is `$_SERVER` in production, which
     * under PHP-FPM carries what the pool passes through, and an array in a
     * test.
     *
     * @param array<string, mixed> $environment
     */
    public static function read(array $environment): self
    {
        $settings = self::merge($environment);

        $origins = [];
        foreach (explode(',', self::required($settings, 'KOXORA_CONTACT_ALLOWED_ORIGINS')) as $entry) {
            $origin = rtrim(trim($entry), '/');
            if ($origin === '') {
                continue;
            }
            if (preg_match('#^https?://[^/\s]+$#', $origin) !== 1) {
                throw new ConfigurationError(
                    'KOXORA_CONTACT_ALLOWED_ORIGINS must list absolute origins; got ' . $origin,
                );
            }
            $origins[] = $origin;
        }
        if ($origins === []) {
            throw new ConfigurationError('KOXORA_CONTACT_ALLOWED_ORIGINS must list at least one origin.');
        }

        $implicitTls = self::flag($settings, 'KOXORA_CONTACT_SMTP_IMPLICIT_TLS', true);
        $resultBase = rtrim(self::text($settings, 'KOXORA_CONTACT_RESULT_BASE', $origins[0]), '/');
        if (preg_match('#^https?://[^/\s]+$#', $resultBase) !== 1) {
            throw new ConfigurationError(
                'KOXORA_CONTACT_RESULT_BASE must be an absolute origin; got ' . $resultBase,
            );
        }

        return new self(
            // Off until the Product Owner has confirmed a working mailbox.
            // Everything else may be configured while this stays false.
            enabled: self::flag($settings, 'KOXORA_CONTACT_ENABLED', false),
            allowedOrigins: $origins,
            recipient: self::mailbox($settings, 'KOXORA_CONTACT_RECIPIENT'),
            sender: self::mailbox($settings, 'KOXORA_CONTACT_SENDER'),
            subjectPrefix: self::text($settings, 'KOXORA_CONTACT_SUBJECT_PREFIX', '[Koxora]'),
            smtpHost: self::required($settings, 'KOXORA_CONTACT_SMTP_HOST'),
            smtpPort: self::number($settings, 'KOXORA_CONTACT_SMTP_PORT', $implicitTls ? 465 : 587),
            smtpImplicitTls: $implicitTls,
            smtpUser: self::required($settings, 'KOXORA_CONTACT_SMTP_USER'),
            smtpPassword: self::required($settings, 'KOXORA_CONTACT_SMTP_PASSWORD'),
            // Comfortably more than the longest valid submission, and far
            // less than anything worth reading into memory.
            bodyBytes: self::number($settings, 'KOXORA_CONTACT_MAX_BODY_BYTES', 16 * 1024),
            perClientCount: self::number($settings, 'KOXORA_CONTACT_RATE_PER_CLIENT', 3),
            perClientWindow: self::number($settings, 'KOXORA_CONTACT_RATE_PER_CLIENT_WINDOW', 3600),
            globalCount: self::number($settings, 'KOXORA_CONTACT_RATE_GLOBAL', 60),
            globalWindow: self::number($settings, 'KOXORA_CONTACT_RATE_GLOBAL_WINDOW', 3600),
            duplicateWindow: self::number($settings, 'KOXORA_CONTACT_DUPLICATE_WINDOW', 600),
            sendTimeout: self::number($settings, 'KOXORA_CONTACT_SEND_TIMEOUT', 15),
            trustProxy: self::flag($settings, 'KOXORA_CONTACT_TRUST_PROXY', false),
            // Where the rate-limit counters live. Every PHP-FPM worker reads
            // and writes the same files under a lock, which is what makes the
            // limit a limit rather than a per-worker suggestion.
            stateDirectory: self::required($settings, 'KOXORA_CONTACT_STATE_DIR'),
            resultBase: $resultBase,
            // The localized result pages, for a submission without
            // JavaScript. A website unit test asserts these match the real
            // route table, so the two cannot drift apart unnoticed.
            resultAccepted: [
                'en' => self::path($settings, 'KOXORA_CONTACT_RESULT_ACCEPTED_EN', '/en/contact/sent/'),
                'de' => self::path($settings, 'KOXORA_CONTACT_RESULT_ACCEPTED_DE', '/de/kontakt/gesendet/'),
            ],
            resultProblem: [
                'en' => self::path($settings, 'KOXORA_CONTACT_RESULT_PROBLEM_EN', '/en/contact/problem/'),
                'de' => self::path($settings, 'KOXORA_CONTACT_RESULT_PROBLEM_DE', '/de/kontakt/problem/'),
            ],
        );
    }

    /**
     * The environment, with an optional settings file underneath it. The file
     * is how an operator keeps the SMTP password out of a process listing and
     * out of anything the web server can serve; the environment still wins,
     * so a single setting can be overridden without editing the file.
     *
     * @param array<string, mixed> $environment
     *
     * @return array<string, mixed>
     */
    private static function merge(array $environment): array
    {
        $path = isset($environment['KOXORA_CONTACT_CONFIG'])
            ? trim((string) $environment['KOXORA_CONTACT_CONFIG'])
            : '';
        if ($path === '') {
            return $environment;
        }
        if (!is_file($path) || !is_readable($path)) {
            throw new ConfigurationError('KOXORA_CONTACT_CONFIG names no readable file: ' . $path);
        }
        /** @var mixed $loaded */
        $loaded = require $path;
        if (!\is_array($loaded)) {
            throw new ConfigurationError('The settings file must return an array: ' . $path);
        }
        /** @var array<string, mixed> $loaded */
        return [...$loaded, ...$environment];
    }

    /** @param array<string, mixed> $settings */
    private static function required(array $settings, string $name): string
    {
        $value = isset($settings[$name]) ? trim((string) $settings[$name]) : '';
        if ($value === '') {
            throw new ConfigurationError($name . ' is required; the contact endpoint refuses to deliver without it.');
        }

        return $value;
    }

    /** @param array<string, mixed> $settings */
    private static function text(array $settings, string $name, string $fallback): string
    {
        $value = isset($settings[$name]) ? trim((string) $settings[$name]) : '';

        return $value === '' ? $fallback : $value;
    }

    /** @param array<string, mixed> $settings */
    private static function number(array $settings, string $name, int $fallback): int
    {
        $value = isset($settings[$name]) ? trim((string) $settings[$name]) : '';
        if ($value === '') {
            return $fallback;
        }
        if (preg_match('/^\d+$/', $value) !== 1 || (int) $value <= 0) {
            throw new ConfigurationError($name . ' must be a positive whole number.');
        }

        return (int) $value;
    }

    /** @param array<string, mixed> $settings */
    private static function flag(array $settings, string $name, bool $fallback): bool
    {
        $value = isset($settings[$name]) ? strtolower(trim((string) $settings[$name])) : '';
        if ($value === '') {
            return $fallback;
        }

        return $value === '1' || $value === 'true' || $value === 'yes';
    }

    /**
     * The configured addresses become headers too, so they are held to the
     * same rule as a reader's: one plain address and nothing else.
     *
     * @param array<string, mixed> $settings
     */
    private static function mailbox(array $settings, string $name): string
    {
        $value = self::required($settings, $name);
        if (preg_match('/^[^\s<>",;:\\\\]+@[^\s<>",;:\\\\]+\.[A-Za-z]{2,}$/', $value) !== 1) {
            throw new ConfigurationError($name . ' must be one plain email address.');
        }

        return $value;
    }

    /**
     * A site-relative path, so a configured value cannot send a reader off
     * the website. A redirect target a request could name would be an open
     * redirect; these come from configuration and a fixed table only.
     *
     * @param array<string, mixed> $settings
     */
    private static function path(array $settings, string $name, string $fallback): string
    {
        $candidate = self::text($settings, $name, $fallback);
        if (preg_match('#^/[A-Za-z0-9/_-]*/$#', $candidate) !== 1) {
            throw new ConfigurationError(
                $name . ' must be an absolute site path ending in a slash; got ' . $candidate,
            );
        }

        return $candidate;
    }
}

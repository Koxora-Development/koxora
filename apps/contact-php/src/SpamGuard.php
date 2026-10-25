<?php

declare(strict_types=1);

namespace Koxora\Contact;

/**
 * The checks that need no third party and store nothing: a field a person
 * never sees, and a submission faster than a person can type.
 *
 * A missing timestamp is not held against anyone. A reader without JavaScript
 * has none, and refusing them would be a worse failure than the one this
 * guards against — which is exactly why the fill-time rule is skipped rather
 * than defaulted when the field is absent.
 */
final class SpamGuard
{
    /** Returns 'honeypot', 'tooFast', 'stale', or null when nothing is wrong. */
    public static function inspect(mixed $honeypot, mixed $openedAt, int $now): ?string
    {
        if (\is_string($honeypot) && Text::trim($honeypot) !== '') {
            return 'honeypot';
        }

        // Absent, empty, or not a number at all: no timestamp was sent, which
        // is the no-JavaScript case and is allowed.
        if ($openedAt === null || $openedAt === '' || $openedAt === false) {
            return null;
        }
        if (!is_numeric($openedAt)) {
            return null;
        }
        $opened = (float) $openedAt;
        if ($opened <= 0) {
            return null;
        }

        $elapsed = $now - $opened;
        if ($elapsed < Contract::MINIMUM_FILL_MILLISECONDS) {
            return 'tooFast';
        }
        if ($elapsed > Contract::MAXIMUM_FILL_MILLISECONDS) {
            return 'stale';
        }

        return null;
    }
}

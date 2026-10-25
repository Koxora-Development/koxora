<?php

declare(strict_types=1);

namespace Koxora\Contact;

/**
 * The string handling the contract depends on, written so that the server
 * accepts exactly what the browser accepts.
 *
 * The rules of the contact form live in `packages/contact`, which runs in the
 * browser. This endpoint validates independently — the browser's checks are a
 * convenience for the reader and never a control — but "independently" must
 * not mean "differently": a reader told their message is fine and then told
 * by the server that it is too long has been lied to once.
 *
 * Two places where the obvious PHP function is the wrong one:
 *
 * - JavaScript's `String.length` counts UTF-16 code units, so an emoji
 *   outside the basic plane counts as two. `mb_strlen` counts one. Lengths
 *   here are therefore measured in code units.
 * - JavaScript's `String.trim` strips every Unicode space separator, the
 *   no-break space and the byte-order mark among them. PHP's `trim` strips
 *   five ASCII characters. The set is spelled out below.
 *
 * `tests/ParityTest.php` and `packages/contact/src/index.test.ts` run the same
 * vectors through both implementations, so a divergence fails a build rather
 * than reaching a reader.
 */
final class Text
{
    /**
     * Everything `String.prototype.trim` removes: the ECMAScript WhiteSpace
     * and LineTerminator productions, which are the Unicode `Zs` category
     * plus tab, vertical tab, form feed, carriage return, line feed, line
     * separator, paragraph separator and the byte-order mark.
     */
    /**
     * The character class `String.prototype.trim` strips: the ECMAScript
     * WhiteSpace and LineTerminator productions, which are the Unicode `Zs`
     * category plus tab, vertical tab, form feed, carriage return, line feed,
     * line separator, paragraph separator and the byte-order mark.
     *
     * It is a regular expression rather than a list for `trim()`, because
     * `trim()` with a character list works on bytes. Given a multi-byte
     * character in that list it strips individual bytes from the ends, which
     * silently mangles a string ending in an emoji into invalid UTF-8 — and
     * the mangled string then looks like a control character. The shared
     * vectors caught exactly that.
     */
    private const TRIM_CLASS = '[\x{0009}\x{000A}\x{000B}\x{000C}\x{000D}\x{0020}'
        . '\x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}'
        . '\x{205F}\x{3000}\x{FEFF}]';

    /** Length in UTF-16 code units, which is what the browser counts. */
    public static function length(string $value): int
    {
        $utf16 = mb_convert_encoding($value, 'UTF-16LE', 'UTF-8');

        return \strlen($utf16) >> 1;
    }

    /** `String.prototype.trim`, including the characters PHP's trim leaves. */
    public static function trim(string $value): string
    {
        $pattern = '/^(?:' . self::TRIM_CLASS . ')+|(?:' . self::TRIM_CLASS . ')+$/u';
        $trimmed = preg_replace($pattern, '', $value);

        // An invalid byte sequence makes the match fail rather than return a
        // string. Such a value is not something a reader typed, and it is
        // refused downstream by the control-character rule.
        return \is_string($trimmed) ? $trimmed : $value;
    }

    /**
     * Anything that could end a header line or smuggle a new one. A carriage
     * return or a line feed in a subject or an address is the classic header
     * injection, and the other control characters have no business in any of
     * these fields either. A message body may contain line breaks and tabs.
     */
    public static function hasControlCharacter(string $value, bool $allowLineBreaks = false): bool
    {
        foreach (mb_str_split($value, 1, 'UTF-8') as $character) {
            $code = mb_ord($character, 'UTF-8');
            if ($code === false) {
                return true;
            }
            if ($allowLineBreaks && ($code === 10 || $code === 13 || $code === 9)) {
                continue;
            }
            // C0 controls, delete, and the C1 range, which some mail software
            // interprets and which no reader types on purpose.
            if ($code < 32 || $code === 127 || ($code >= 128 && $code <= 159)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Normalizes the line endings of a message body and trims it, without
     * changing what was written. Single-line fields do not go through this:
     * they are refused when they contain a line ending rather than rewritten,
     * so a reader is never told their message was sent as typed when it was
     * not.
     */
    public static function normalize(mixed $value, bool $allowLineBreaks = false): string
    {
        if (!\is_string($value)) {
            return '';
        }
        $text = (string) preg_replace("/\r\n?/", "\n", $value);

        return $allowLineBreaks
            ? self::trim($text)
            : self::trim(str_replace("\n", ' ', $text));
    }

    /** What a single-line field is checked as: trimmed, nothing else. */
    public static function single(mixed $value): string
    {
        return \is_string($value) ? self::trim($value) : '';
    }

    /**
     * One address, nothing else. The pattern is deliberately stricter than
     * the mail standard allows: it refuses a display name, a comment, a
     * quoted local part, a second address and anything that is not a single
     * plain address, because the value becomes a `Reply-To` header and the
     * simplest value that works is the only one worth accepting.
     */
    public static function isEmail(string $value): bool
    {
        if (self::length($value) > Contract::field('email')['maxLength']) {
            return false;
        }
        if (self::hasControlCharacter($value)) {
            return false;
        }
        $local = "[A-Za-z0-9!#\$%&'*+\\/=?^_`{|}~-]+";
        $label = '[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?';

        return preg_match(
            '/^' . $local . '(?:\.' . $local . ')*@' . $label . '(?:\.' . $label . ')+$/',
            $value,
        ) === 1;
    }
}

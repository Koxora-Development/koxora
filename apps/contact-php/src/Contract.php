<?php

declare(strict_types=1);

namespace Koxora\Contact;

/**
 * The shape of the form, restated for the server.
 *
 * These are the same numbers and names as `packages/contact/src/index.ts`,
 * which the browser uses. They are restated rather than imported because
 * there is no honest way to share a TypeScript module with PHP, and because
 * the server must not depend on anything the client could change.
 *
 * They are not, however, left to agree by luck: `packages/contact` writes
 * them into `packages/contact/fixtures/contract.json` and `tests/ContractTest`
 * asserts this file matches that one field for field. A limit changed on one
 * side fails the build on the other.
 */
final class Contract
{
    public const CATEGORIES = ['general', 'feedback', 'support', 'bug'];

    /** The field that must stay empty, and the one that times the form. */
    public const HONEYPOT_FIELD = 'website';
    public const TIMESTAMP_FIELD = 'opened';

    /** A submission faster than this was not typed by a person. */
    public const MINIMUM_FILL_MILLISECONDS = 3000;

    /** A form open longer than this is stale; the reader reloads and retries. */
    public const MAXIMUM_FILL_MILLISECONDS = 12 * 60 * 60 * 1000;

    /**
     * Lengths are deliberate rather than round. A subject longer than 120
     * characters is a message in the wrong field, and a header field has to
     * stay short; 5000 characters is a long support request and still a
     * bounded body.
     *
     * @return list<array{name: string, required: bool, minLength: int, maxLength: int}>
     */
    public static function fields(): array
    {
        return [
            ['name' => 'name', 'required' => false, 'minLength' => 0, 'maxLength' => 80],
            ['name' => 'email', 'required' => true, 'minLength' => 6, 'maxLength' => 160],
            ['name' => 'category', 'required' => true, 'minLength' => 1, 'maxLength' => 20],
            ['name' => 'subject', 'required' => true, 'minLength' => 3, 'maxLength' => 120],
            ['name' => 'message', 'required' => true, 'minLength' => 20, 'maxLength' => 5000],
        ];
    }

    /** @return array{name: string, required: bool, minLength: int, maxLength: int} */
    public static function field(string $name): array
    {
        foreach (self::fields() as $field) {
            if ($field['name'] === $name) {
                return $field;
            }
        }

        throw new \InvalidArgumentException('Unknown contact field: ' . $name);
    }

    public static function isCategory(mixed $value): bool
    {
        return \is_string($value) && \in_array($value, self::CATEGORIES, true);
    }
}

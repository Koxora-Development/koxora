<?php

declare(strict_types=1);

namespace Koxora\Contact\Tests;

/**
 * Reads the shared fixtures that `packages/contact` owns. A missing or
 * unparsable file fails loudly rather than yielding an empty set of vectors
 * that every implementation would pass.
 */
final class Fixtures
{
    /**
     * @return array{
     *     vectors: list<array{name: string, input: array<string, mixed>, errors: list<array{field: string, problem: string}>, submission: ?array<string, string>}>,
     *     spam: list<array{name: string, honeypot: mixed, openedAt: mixed, elapsedMs: ?int, reason: ?string}>
     * }
     */
    public static function load(): array
    {
        /** @var array{vectors: list<mixed>, spam: list<mixed>} $decoded */
        $decoded = self::read('validation.json');
        if (!isset($decoded['vectors'], $decoded['spam'])) {
            throw new \RuntimeException('validation.json has no vectors.');
        }

        /** @phpstan-ignore-next-line the shape is asserted by the tests that read it */
        return $decoded;
    }

    /** @return array<string, mixed> */
    public static function contract(): array
    {
        return self::read('contract.json');
    }

    /** @return array<string, mixed> */
    private static function read(string $name): array
    {
        $path = \dirname(__DIR__, 3) . '/packages/contact/fixtures/' . $name;
        $raw = file_get_contents($path);
        if ($raw === false) {
            throw new \RuntimeException('The shared fixture is unreadable: ' . $path);
        }
        /** @var mixed $decoded */
        $decoded = json_decode($raw, true, 512, \JSON_THROW_ON_ERROR);
        if (!\is_array($decoded)) {
            throw new \RuntimeException('The shared fixture is not an object: ' . $path);
        }

        /** @var array<string, mixed> $decoded */
        return $decoded;
    }
}

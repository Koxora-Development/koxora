<?php

declare(strict_types=1);

namespace Koxora\Contact\Tests;

use Koxora\Contact\SpamGuard;
use Koxora\Contact\Validator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * The server validates independently of the browser. These are the vectors
 * that stop "independently" from becoming "differently".
 *
 * The same file, `packages/contact/fixtures/validation.json`, is run by
 * `packages/contact/src/index.test.ts` against the browser implementation.
 * Neither implementation is the source: the vectors are, and both have to
 * satisfy them.
 */
final class ParityTest extends TestCase
{
    /** @return array<string, array{array<string, mixed>, list<array{field: string, problem: string}>, ?array<string, string>}> */
    public static function vectors(): array
    {
        $cases = [];
        foreach (Fixtures::load()['vectors'] as $vector) {
            $cases[$vector['name']] = [$vector['input'], $vector['errors'], $vector['submission']];
        }

        return $cases;
    }

    /** @return array<string, array{mixed, mixed, ?int, ?string}> */
    public static function spamVectors(): array
    {
        $cases = [];
        foreach (Fixtures::load()['spam'] as $vector) {
            $cases[$vector['name']] = [
                $vector['honeypot'],
                $vector['openedAt'],
                $vector['elapsedMs'],
                $vector['reason'],
            ];
        }

        return $cases;
    }

    public function testThereAreVectorsToRunAtAll(): void
    {
        // An empty or unreadable fixture file must not look like a pass.
        $fixtures = Fixtures::load();
        self::assertGreaterThan(15, \count($fixtures['vectors']));
        self::assertGreaterThan(5, \count($fixtures['spam']));
    }

    /**
     * @param array<string, mixed>                       $input
     * @param list<array{field: string, problem: string}> $errors
     * @param ?array<string, string>                     $expected
     */
    #[DataProvider('vectors')]
    public function testValidatesLikeTheBrowser(array $input, array $errors, ?array $expected): void
    {
        $result = Validator::validate($input);

        self::assertSame($errors, $result['errors']);
        if ($expected === null) {
            self::assertNull($result['submission']);

            return;
        }
        $submission = $result['submission'];
        self::assertNotNull($submission);
        self::assertSame($expected['name'], $submission->name);
        self::assertSame($expected['email'], $submission->email);
        self::assertSame($expected['category'], $submission->category);
        self::assertSame($expected['subject'], $submission->subject);
        self::assertSame($expected['message'], $submission->message);
    }

    #[DataProvider('spamVectors')]
    public function testInspectsLikeTheBrowser(
        mixed $honeypot,
        mixed $openedAt,
        ?int $elapsedMs,
        ?string $reason,
    ): void {
        $now = $elapsedMs !== null && \is_int($openedAt)
            ? $openedAt + $elapsedMs
            : 1000000000;

        self::assertSame($reason, SpamGuard::inspect($honeypot, $openedAt, $now));
    }
}

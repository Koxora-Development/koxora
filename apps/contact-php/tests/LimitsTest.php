<?php

declare(strict_types=1);

namespace Koxora\Contact\Tests;

use Koxora\Contact\Limits;
use Koxora\Contact\SharedState;
use PHPUnit\Framework\TestCase;

/**
 * The abuse controls, including the part a Node service got for free.
 *
 * Under PHP-FPM each request runs in whichever worker is free, and workers
 * share no memory. A counter in a process variable would reset on every
 * request, and "three per hour" would really be "three per hour per worker".
 * `testTheLimitHoldsAcrossSeparateProcesses` is the test that would fail if
 * that mistake were made: it runs real, separate PHP processes against one
 * state directory at the same moment.
 */
final class LimitsTest extends TestCase
{
    private string $directory;

    protected function setUp(): void
    {
        $this->directory = sys_get_temp_dir() . '/koxora-limits-' . bin2hex(random_bytes(8));
        $state = new SharedState($this->directory);
        $state->prepare();
    }

    protected function tearDown(): void
    {
        foreach (glob($this->directory . '/*') ?: [] as $file) {
            @unlink($file);
        }
        @rmdir($this->directory);
    }

    private function limits(int $perClient = 3, int $global = 60): Limits
    {
        return new Limits(new SharedState($this->directory), $perClient, 3600, $global, 3600, 600);
    }

    public function testAllowsUpToTheLimitAndThenRefuses(): void
    {
        $limits = $this->limits();
        $now = 1700000000000;

        for ($attempt = 1; $attempt <= 3; $attempt++) {
            self::assertTrue($limits->admit('client', $now + $attempt)['allowed'], 'attempt ' . $attempt);
        }
        $refused = $limits->admit('client', $now + 4);
        self::assertFalse($refused['allowed']);
        self::assertSame('client', $refused['scope']);
        self::assertGreaterThan(0, $refused['retryAfter']);
    }

    public function testCountsEachClientSeparately(): void
    {
        $limits = $this->limits();
        $now = 1700000000000;

        for ($attempt = 0; $attempt < 3; $attempt++) {
            $limits->admit('one', $now + $attempt);
        }
        self::assertFalse($limits->admit('one', $now + 10)['allowed']);
        self::assertTrue($limits->admit('two', $now + 11)['allowed']);
    }

    public function testForgetsWhatHasFallenOutOfTheWindow(): void
    {
        $limits = $this->limits();
        $now = 1700000000000;

        for ($attempt = 0; $attempt < 3; $attempt++) {
            $limits->admit('client', $now + $attempt);
        }
        self::assertFalse($limits->admit('client', $now + 1000)['allowed']);
        // An hour and a second later the window is empty again.
        self::assertTrue($limits->admit('client', $now + 3601000)['allowed']);
    }

    public function testTheGlobalWindowDoesNotSpendTheClientsAttempts(): void
    {
        // A busy endpoint is not this reader's doing, so their next attempt
        // once the flood is over should still be their first of three.
        $limits = $this->limits(perClient: 3, global: 4);
        $now = 1700000000000;

        // Four different clients, one submission each, fill the global window
        // without any of them reaching their own limit.
        foreach (['a', 'b', 'c', 'd'] as $index => $client) {
            self::assertTrue($limits->admit($client, $now + $index)['allowed'], $client);
        }
        $refused = $limits->admit('mine', $now + 10);
        self::assertFalse($refused['allowed']);
        self::assertSame('global', $refused['scope']);

        // An hour later the global window is empty, and this client still has
        // all three attempts rather than two.
        for ($attempt = 1; $attempt <= 3; $attempt++) {
            self::assertTrue(
                $limits->admit('mine', $now + 3601000 + $attempt)['allowed'],
                'attempt ' . $attempt,
            );
        }
        self::assertFalse($limits->admit('mine', $now + 3601004)['allowed']);
    }

    public function testClaimsASubmissionOnceAndRecognisesTheSecond(): void
    {
        $limits = $this->limits();
        $now = 1700000000000;

        self::assertFalse($limits->claim('fingerprint', $now));
        self::assertTrue($limits->claim('fingerprint', $now + 100));
    }

    public function testForgetsAClaimSoAFailedDeliveryCanBeRetried(): void
    {
        $limits = $this->limits();
        $now = 1700000000000;

        $limits->claim('fingerprint', $now);
        $limits->forget('fingerprint');
        self::assertFalse($limits->claim('fingerprint', $now + 100));
    }

    public function testAClaimExpiresWithItsWindow(): void
    {
        $limits = $this->limits();
        $now = 1700000000000;

        $limits->claim('fingerprint', $now);
        self::assertFalse($limits->claim('fingerprint', $now + 601000));
    }

    public function testTreatsAnUnreadableStateFileAsEmptyAndSaysSo(): void
    {
        file_put_contents($this->directory . '/state.json', 'not json at all');
        $verdict = $this->limits()->admit('client', 1700000000000);

        self::assertTrue($verdict['allowed']);
        self::assertTrue($verdict['recovered']);
    }

    public function testStoresNothingThatIdentifiesAnybody(): void
    {
        $state = new SharedState($this->directory);
        $limits = $this->limits();
        $limits->admit($state->clientKey('203.0.113.7'), 1700000000000);

        $stored = (string) file_get_contents($this->directory . '/state.json');
        self::assertStringNotContainsString('203.0.113.7', $stored);
        // The same address gives the same key, so the limit works at all.
        self::assertSame($state->clientKey('203.0.113.7'), $state->clientKey('203.0.113.7'));
        self::assertNotSame($state->clientKey('203.0.113.7'), $state->clientKey('203.0.113.8'));
    }

    public function testTheKeyIsNotAPlainHashOfTheAddress(): void
    {
        // Without a salt, a stored key could be turned back into an address
        // by trying the addresses, of which there are not that many.
        $state = new SharedState($this->directory);
        self::assertNotSame(hash('sha256', '203.0.113.7'), $state->clientKey('203.0.113.7'));
    }

    /**
     * The one that matters for PHP-FPM.
     *
     * Eight separate PHP processes, started together, each try to submit as
     * the same client against one state directory. Exactly three may be
     * allowed. A limiter that kept its counters in memory would allow all
     * eight; one that read and wrote without a lock would allow somewhere
     * between three and eight depending on timing.
     */
    public function testTheLimitHoldsAcrossSeparateProcesses(): void
    {
        $worker = \dirname(__DIR__) . '/tests/worker.php';
        $processes = [];
        for ($index = 0; $index < 8; $index++) {
            $process = proc_open(
                [\PHP_BINARY, $worker, $this->directory, 'shared-client'],
                [1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
                $pipes,
            );
            self::assertIsResource($process);
            $processes[] = [$process, $pipes];
        }

        $allowed = 0;
        $refused = 0;
        foreach ($processes as [$process, $pipes]) {
            $output = trim((string) stream_get_contents($pipes[1]));
            $errors = trim((string) stream_get_contents($pipes[2]));
            fclose($pipes[1]);
            fclose($pipes[2]);
            proc_close($process);
            self::assertSame('', $errors, 'a worker failed: ' . $errors);
            if ($output === 'allowed') {
                $allowed++;
            } elseif ($output === 'refused') {
                $refused++;
            } else {
                self::fail('a worker said something unexpected: ' . $output);
            }
        }

        self::assertSame(3, $allowed, 'exactly the limit may pass');
        self::assertSame(5, $refused);
    }
}

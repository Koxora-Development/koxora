<?php

declare(strict_types=1);

namespace Koxora\Contact\Tests;

use Koxora\Contact\Mailer;
use Koxora\Contact\Submission;
use PHPUnit\Framework\TestCase;

/**
 * Properties of the code itself, rather than of its behaviour.
 *
 * Each of these is something a later change could undo quietly, and each one
 * would be a security problem rather than a bug: a second executable file in
 * the one directory the web server can reach, a mail transport chosen by
 * configuration, or PHP's own `mail()` in place of authenticated SMTP.
 */
final class SurfaceTest extends TestCase
{
    private static function root(): string
    {
        return \dirname(__DIR__);
    }

    public function testOnlyOneFileIsWebReachable(): void
    {
        // Apache is given one Alias for one path to one file. Anything else
        // in `public/` would be reachable by guessing its name.
        $files = glob(self::root() . '/public/*') ?: [];
        $names = array_map('basename', $files);
        sort($names);

        self::assertSame(['contact.php'], $names);
    }

    public function testTheCodeLivesOutsideTheWebReachableDirectory(): void
    {
        foreach (['src', 'tests', 'vendor'] as $directory) {
            self::assertDirectoryExists(self::root() . '/' . $directory);
            self::assertFileDoesNotExist(self::root() . '/public/' . $directory);
        }
    }

    public function testNoTransportIsChosenByConfiguration(): void
    {
        // `Transport::fromDsn` would let a setting select `sendmail://`,
        // which hands addresses to a command line. That is the shape of
        // CVE-2026-45068, and of PHP's own mail(). Only authenticated SMTP
        // is reachable from this code at all.
        foreach ($this->sources() as $path => $code) {
            self::assertStringNotContainsString('Transport::fromDsn', $code, $path);
            self::assertStringNotContainsString('SendmailTransport', $code, $path);
            self::assertDoesNotMatchRegularExpression('/(?<![\w>$])mail\s*\(/', $code, $path);
        }
    }

    public function testTheMailerRequiresTls(): void
    {
        $code = (string) file_get_contents(self::root() . '/src/Mailer.php');

        self::assertStringContainsString('setRequireTls(true)', $code);
        self::assertStringContainsString("'verify_peer' => true", $code);
        self::assertStringContainsString('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT', $code);
        self::assertStringNotContainsString('allow_self_signed\' => true', $code);
    }

    public function testNothingInTheSourceLooksLikeACredential(): void
    {
        // The settings have no defaults at all, so there is nothing to leave
        // behind by accident. This fails if someone adds one.
        foreach ($this->sources() as $path => $code) {
            self::assertDoesNotMatchRegularExpression(
                '/(password|secret|token)\s*[:=]\s*[\'"][^\'"]{4,}[\'"]/i',
                $code,
                $path,
            );
        }
    }

    public function testTheMailerIsConstructedWithoutTouchingTheNetwork(): void
    {
        // Constructing it must not connect; the connection happens on send.
        $harness = new Harness();
        $mailer = new Mailer($harness->config);
        $mail = $mailer->compose(new Submission(
            'Alex',
            'alex@example.org',
            'support',
            'A subject',
            'A message long enough to be a real one.',
        ));

        self::assertSame('website@koxora.app', $mail->getFrom()[0]->getAddress());
    }

    /**
     * The code, with comments removed.
     *
     * The comments have to go, or a comment explaining why something is
     * forbidden would itself trip the test that forbids it — which is exactly
     * what happened the first time this was written.
     *
     * @return array<string, string>
     */
    private function sources(): array
    {
        $sources = [];
        foreach (['src', 'public'] as $directory) {
            foreach (glob(self::root() . '/' . $directory . '/*.php') ?: [] as $path) {
                $code = '';
                foreach (token_get_all((string) file_get_contents($path)) as $token) {
                    if (\is_array($token)) {
                        if ($token[0] === \T_COMMENT || $token[0] === \T_DOC_COMMENT) {
                            continue;
                        }
                        $code .= $token[1];
                        continue;
                    }
                    $code .= $token;
                }
                $sources[$directory . '/' . basename($path)] = $code;
            }
        }
        self::assertNotEmpty($sources);

        return $sources;
    }
}

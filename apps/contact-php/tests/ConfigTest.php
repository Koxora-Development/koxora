<?php

declare(strict_types=1);

namespace Koxora\Contact\Tests;

use Koxora\Contact\Config;
use Koxora\Contact\ConfigurationError;
use PHPUnit\Framework\TestCase;

/**
 * There is no default for any secret and no default mailbox. A missing
 * setting makes the endpoint refuse the submission with a sentence in the
 * server log, rather than accept a message it cannot deliver.
 */
final class ConfigTest extends TestCase
{
    /** @return array<string, string> */
    private static function complete(): array
    {
        return [
            'KOXORA_CONTACT_ALLOWED_ORIGINS' => 'https://koxora.app',
            'KOXORA_CONTACT_RECIPIENT' => 'hello@koxora.app',
            'KOXORA_CONTACT_SENDER' => 'website@koxora.app',
            'KOXORA_CONTACT_SMTP_HOST' => 'mail.example.org',
            'KOXORA_CONTACT_SMTP_USER' => 'website@koxora.app',
            'KOXORA_CONTACT_SMTP_PASSWORD' => 'not-a-real-password',
            'KOXORA_CONTACT_STATE_DIR' => '/var/lib/koxora-contact',
        ];
    }

    public function testReadsACompleteConfiguration(): void
    {
        $config = Config::read(self::complete());

        self::assertSame(['https://koxora.app'], $config->allowedOrigins);
        self::assertSame('hello@koxora.app', $config->recipient);
        self::assertSame(465, $config->smtpPort);
        self::assertTrue($config->smtpImplicitTls);
        self::assertSame('[Koxora]', $config->subjectPrefix);
    }

    public function testIsSwitchedOffUntilSomebodySaysOtherwise(): void
    {
        // Delivery stays off until the Product Owner has confirmed a working
        // mailbox, so a half-configured host cannot start accepting messages.
        self::assertFalse(Config::read(self::complete())->enabled);
        self::assertTrue(
            Config::read([...self::complete(), 'KOXORA_CONTACT_ENABLED' => 'true'])->enabled,
        );
    }

    /** @return array<string, array{string}> */
    public static function requiredSettings(): array
    {
        $cases = [];
        foreach (array_keys(self::complete()) as $name) {
            $cases[$name] = [$name];
        }

        return $cases;
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('requiredSettings')]
    public function testRefusesToRunWithoutARequiredSetting(string $missing): void
    {
        $settings = self::complete();
        unset($settings[$missing]);

        $this->expectException(ConfigurationError::class);
        $this->expectExceptionMessageMatches('/' . preg_quote($missing, '/') . '/');
        Config::read($settings);
    }

    public function testRefusesAnOriginThatIsNotAnOrigin(): void
    {
        $this->expectException(ConfigurationError::class);
        Config::read([...self::complete(), 'KOXORA_CONTACT_ALLOWED_ORIGINS' => 'koxora.app']);
    }

    public function testRefusesARecipientThatIsNotOnePlainAddress(): void
    {
        // The configured addresses become headers too, so they are held to
        // the same rule as a reader's address.
        foreach ([
            'Koxora <hello@koxora.app>',
            "hello@koxora.app\r\nBcc: victim@example.net",
            'hello@koxora.app, second@example.net',
            'hello@localhost',
        ] as $value) {
            try {
                Config::read([...self::complete(), 'KOXORA_CONTACT_RECIPIENT' => $value]);
                self::fail('accepted a recipient it should refuse: ' . $value);
            } catch (ConfigurationError) {
                self::assertTrue(true);
            }
        }
    }

    public function testRefusesAResultPageThatCouldLeaveTheWebsite(): void
    {
        foreach ([
            'https://evil.example.net/',
            '//evil.example.net/',
            '/en/contact/sent',
            'en/contact/sent/',
        ] as $value) {
            try {
                Config::read([...self::complete(), 'KOXORA_CONTACT_RESULT_ACCEPTED_EN' => $value]);
                self::fail('accepted a result page it should refuse: ' . $value);
            } catch (ConfigurationError) {
                self::assertTrue(true);
            }
        }
    }

    public function testDefaultsTheResultBaseToTheFirstAllowedOrigin(): void
    {
        $config = Config::read(self::complete());

        self::assertSame('https://koxora.app', $config->resultBase);
        self::assertSame('/en/contact/sent/', $config->resultAccepted['en']);
        self::assertSame('/de/kontakt/gesendet/', $config->resultAccepted['de']);
        self::assertSame('/de/kontakt/problem/', $config->resultProblem['de']);
    }

    public function testRefusesANumberThatIsNotAPositiveNumber(): void
    {
        foreach (['0', '-5', 'many', '3.5'] as $value) {
            try {
                Config::read([...self::complete(), 'KOXORA_CONTACT_RATE_PER_CLIENT' => $value]);
                self::fail('accepted a count it should refuse: ' . $value);
            } catch (ConfigurationError) {
                self::assertTrue(true);
            }
        }
    }

    public function testTakesSettingsFromAFileOutsideTheDocumentRoot(): void
    {
        // How an operator keeps the SMTP password out of a process listing
        // and out of anything the web server can serve.
        $path = sys_get_temp_dir() . '/koxora-contact-settings-' . bin2hex(random_bytes(6)) . '.php';
        file_put_contents($path, "<?php return ['KOXORA_CONTACT_SMTP_PASSWORD' => 'from-the-file'];\n");
        try {
            $settings = self::complete();
            unset($settings['KOXORA_CONTACT_SMTP_PASSWORD']);
            $config = Config::read([...$settings, 'KOXORA_CONTACT_CONFIG' => $path]);
            self::assertSame('from-the-file', $config->smtpPassword);

            // The environment still wins, so one setting can be overridden
            // without editing the file.
            $override = Config::read([
                ...$settings,
                'KOXORA_CONTACT_CONFIG' => $path,
                'KOXORA_CONTACT_SMTP_PASSWORD' => 'from-the-environment',
            ]);
            self::assertSame('from-the-environment', $override->smtpPassword);
        } finally {
            @unlink($path);
        }
    }

    public function testRefusesASettingsFileThatIsNotThere(): void
    {
        $this->expectException(ConfigurationError::class);
        Config::read([...self::complete(), 'KOXORA_CONTACT_CONFIG' => '/nowhere/koxora.php']);
    }
}

<?php

declare(strict_types=1);

namespace Koxora\Contact\Tests;

use Koxora\Contact\Config;
use Koxora\Contact\Endpoint;
use Koxora\Contact\Limits;
use Koxora\Contact\Mailer;
use Koxora\Contact\Request;
use Koxora\Contact\Response;
use Koxora\Contact\SharedState;
use Symfony\Component\Mime\RawMessage;

/**
 * Builds an endpoint for a test: real configuration, real limits on a real
 * state directory, and a transport that records instead of sending.
 *
 * Nothing here stubs the validation, the limits or the request parsing. The
 * only thing replaced is the one step that would need a mail server.
 */
final class Harness
{
    public readonly RecordingTransport $transport;

    /** @var list<array<string, mixed>> */
    public array $log = [];

    public int $now = 1700000000000;

    public readonly Config $config;
    public readonly Limits $limits;
    public readonly Endpoint $endpoint;
    public readonly string $directory;

    /** @param array<string, string> $overrides */
    public function __construct(array $overrides = [], bool $failSending = false)
    {
        $this->directory = sys_get_temp_dir() . '/koxora-contact-' . bin2hex(random_bytes(8));
        $this->config = Config::read([
            'KOXORA_CONTACT_ENABLED' => 'true',
            'KOXORA_CONTACT_ALLOWED_ORIGINS' => 'https://koxora.app',
            'KOXORA_CONTACT_RECIPIENT' => 'hello@koxora.app',
            'KOXORA_CONTACT_SENDER' => 'website@koxora.app',
            'KOXORA_CONTACT_SMTP_HOST' => 'mail.example.org',
            'KOXORA_CONTACT_SMTP_USER' => 'website@koxora.app',
            'KOXORA_CONTACT_SMTP_PASSWORD' => 'not-a-real-password',
            'KOXORA_CONTACT_STATE_DIR' => $this->directory,
            ...$overrides,
        ]);
        $state = new SharedState($this->config->stateDirectory);
        $state->prepare();
        $this->limits = new Limits(
            $state,
            $this->config->perClientCount,
            $this->config->perClientWindow,
            $this->config->globalCount,
            $this->config->globalWindow,
            $this->config->duplicateWindow,
        );
        $this->transport = new RecordingTransport($failSending);
        $this->endpoint = new Endpoint(
            $this->config,
            $this->limits,
            new Mailer($this->config, $this->transport),
            function (array $entry): void {
                $this->log[] = $entry;
            },
            fn (): int => $this->now,
        );
    }

    /**
     * @param array<string, mixed>  $fields
     * @param array<string, string> $server
     */
    public function postJson(array $fields, array $server = []): Response
    {
        return $this->endpoint->handle($this->request(
            (string) json_encode($fields),
            'application/json',
            $server,
        ));
    }

    /**
     * @param array<string, string> $fields
     * @param array<string, string> $server
     */
    public function postForm(array $fields, array $server = []): Response
    {
        return $this->endpoint->handle($this->request(
            http_build_query($fields),
            'application/x-www-form-urlencoded',
            $server,
        ));
    }

    /** @param array<string, string> $server */
    public function request(
        string $body,
        string $contentType,
        array $server = [],
        string $method = 'POST',
        string $path = Endpoint::PATH,
    ): Request {
        return Request::fromServer(
            [
                'REQUEST_METHOD' => $method,
                'REQUEST_URI' => $path,
                'CONTENT_TYPE' => $contentType,
                'CONTENT_LENGTH' => (string) \strlen($body),
                'HTTP_ORIGIN' => 'https://koxora.app',
                'REMOTE_ADDR' => '203.0.113.7',
                ...$server,
            ],
            static fn (int $cap): string => substr($body, 0, $cap + 1),
            $this->config->bodyBytes,
        );
    }

    /** @return array<string, mixed> */
    public static function decode(Response $response): array
    {
        /** @var array<string, mixed> $decoded */
        $decoded = json_decode($response->body, true) ?? [];

        return $decoded;
    }

    /** @return list<RawMessage> */
    public function sent(): array
    {
        return $this->transport->sent;
    }

    /**
     * A submission that passes validation, so a test can vary one thing.
     *
     * @return array<string, string>
     */
    public static function valid(string $subject = 'A question about project files'): array
    {
        return [
            'name' => 'Alex Beispiel',
            'email' => 'alex@example.org',
            'category' => 'support',
            'subject' => $subject,
            'message' => 'I would like to know how the project archive format works.',
        ];
    }

    public function __destruct()
    {
        foreach (glob($this->directory . '/*') ?: [] as $file) {
            @unlink($file);
        }
        @rmdir($this->directory);
    }
}

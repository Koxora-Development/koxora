<?php

declare(strict_types=1);

/**
 * The endpoint, for the browser tests, with the mail server replaced.
 *
 * This file exists so the website's browser tests submit the form to the real
 * thing: the real request parsing, the real validation, the real abuse
 * controls, the real localized redirects. The single step that cannot run in
 * a test is handing the message to a mail server, so that one step — and only
 * that one — is swapped for a transport that writes to a file.
 *
 * It lives in `tests/` on purpose. `public/` holds exactly one file, the
 * production front controller, and a test-only entry point must never sit
 * next to it. Nothing deploys this, and `SurfaceTest` fails if anything but
 * `contact.php` ever appears in `public/`.
 *
 * Run it with PHP's built-in server:
 *   php -S 127.0.0.1:4178 apps/contact-php/tests/server.php
 */

namespace Koxora\Contact;

use Koxora\Contact\Tests\RecordingTransport;

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/RecordingTransport.php';

ini_set('display_errors', '0');
ini_set('log_errors', '1');

$outbox = getenv('KOXORA_CONTACT_TEST_OUTBOX') ?: sys_get_temp_dir() . '/koxora-contact-outbox.json';

// PHP's built-in server does not copy the process environment into
// `$_SERVER` the way PHP-FPM copies its pool's `env[]` entries, so the test
// harness reads both. The production front controller deliberately reads
// `$_SERVER` alone, which is what FPM fills.
$settings = [...getenv(), ...$_SERVER];
$config = Config::read($settings);
$state = new SharedState($config->stateDirectory);
$state->prepare();
$transport = new RecordingTransport();

$path = (string) (parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), \PHP_URL_PATH) ?: '/');

// What the tests read to assert what would have been delivered. Not part of
// the endpoint, and not reachable in production: this router does not exist
// there.
if ($path === '/api/contact/outbox') {
    $stored = @file_get_contents($outbox);
    Response::json(200, ['sent' => \is_string($stored) && $stored !== ''
        ? json_decode($stored, true)
        : []])->send();

    return;
}
if ($path === '/api/contact/reset' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    @unlink($outbox);
    foreach (glob($config->stateDirectory . '/state.json') ?: [] as $file) {
        @unlink($file);
    }
    Response::json(200, ['status' => 'reset'])->send();

    return;
}

$endpoint = new Endpoint(
    $config,
    new Limits(
        $state,
        $config->perClientCount,
        $config->perClientWindow,
        $config->globalCount,
        $config->globalWindow,
        $config->duplicateWindow,
    ),
    new Mailer($config, $transport),
    static function (array $entry): void {
        $encoded = json_encode($entry, \JSON_UNESCAPED_SLASHES);
        error_log('koxora-contact ' . ($encoded === false ? '{}' : $encoded));
    },
);

$readBody = static function (int $cap): string {
    $input = fopen('php://input', 'r');
    if ($input === false) {
        return '';
    }
    try {
        $body = stream_get_contents($input, $cap + 1);

        return \is_string($body) ? $body : '';
    } finally {
        fclose($input);
    }
};

$endpoint->handle(Request::fromServer($_SERVER, $readBody, $config->bodyBytes))->send();

// Append whatever the transport recorded, so a test can read it back.
if ($transport->sent !== []) {
    $stored = @file_get_contents($outbox);
    /** @var list<array<string, string>> $existing */
    $existing = \is_string($stored) && $stored !== '' ? (json_decode($stored, true) ?: []) : [];
    foreach ($transport->sent as $message) {
        $headers = $message->getHeaders();
        $existing[] = [
            'subject' => (string) $headers->getHeaderBody('Subject'),
            'to' => implode(',', array_map(
                static fn (object $address): string => (string) $address->getAddress(),
                $headers->getHeaderBody('To') ?? [],
            )),
            'from' => implode(',', array_map(
                static fn (object $address): string => (string) $address->getAddress(),
                $headers->getHeaderBody('From') ?? [],
            )),
            'replyTo' => implode(',', array_map(
                static fn (object $address): string => (string) $address->getAddress(),
                $headers->getHeaderBody('Reply-To') ?? [],
            )),
            'body' => $message instanceof \Symfony\Component\Mime\Email
                ? (string) $message->getTextBody()
                : '',
        ];
    }
    @file_put_contents($outbox, (string) json_encode($existing), \LOCK_EX);
}

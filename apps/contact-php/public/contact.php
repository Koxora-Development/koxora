<?php

declare(strict_types=1);

/**
 * The only file of this endpoint that a web server is allowed to execute.
 *
 * Everything else — the validation, the limits, the mail, the settings — lives
 * one directory up in `src/` and `vendor/`, which are deliberately outside
 * every document root. Apache is given one `Alias` for one path to this one
 * file, so there is nothing else here to reach, download or execute, and no
 * directory to list.
 *
 * It does as little as possible: wire the pieces together, hand the request
 * over, write the answer out. Every decision is in a class that a test can
 * reach without a web server.
 */

namespace Koxora\Contact;

// A visitor never sees a PHP error. Anything that goes wrong goes to the
// server log, and the reader is told only that the message was not delivered.
ini_set('display_errors', '0');
ini_set('log_errors', '1');

require_once __DIR__ . '/../vendor/autoload.php';

/** Reads the body with a hard cap, so an oversized request is refused rather than buffered. */
$readBody = static function (int $cap): string {
    $input = fopen('php://input', 'r');
    if ($input === false) {
        return '';
    }
    try {
        // One byte more than the cap, so the endpoint can tell "at the limit"
        // from "over it" without ever holding more than that.
        $body = stream_get_contents($input, $cap + 1);

        return \is_string($body) ? $body : '';
    } finally {
        fclose($input);
    }
};

try {
    $config = Config::read($_SERVER);
    $state = new SharedState($config->stateDirectory);
    $state->prepare();

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
        new Mailer($config),
        // One line per submission, with no message, no address and no secret:
        // the outcome, the category where there was a valid one, and how long
        // it took. Enough to see that the endpoint is working and to notice a
        // flood; not enough to reconstruct who wrote what.
        static function (array $entry): void {
            $encoded = json_encode($entry, \JSON_UNESCAPED_SLASHES);
            error_log('koxora-contact ' . ($encoded === false ? '{}' : $encoded));
        },
    );

    $request = Request::fromServer($_SERVER, $readBody, $config->bodyBytes);
    $endpoint->handle($request)->send();
} catch (ConfigurationError $error) {
    // A missing or impossible setting. The operator needs the detail; the
    // reader needs to know their message did not go anywhere.
    error_log('koxora-contact configuration: ' . $error->getMessage());
    Response::json(503, ['status' => 'undelivered'])->send();
} catch (\Throwable $error) {
    error_log('koxora-contact failure: ' . $error::class);
    Response::json(503, ['status' => 'undelivered'])->send();
}

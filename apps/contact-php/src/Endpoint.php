<?php

declare(strict_types=1);

namespace Koxora\Contact;

/**
 * The contact endpoint.
 *
 * It accepts one kind of request, answers in one of a few fixed shapes, and
 * tells a client nothing it does not need. Everything a reader sends is
 * validated here independently of the browser, because the browser's
 * validation is a convenience for the reader and not a control.
 *
 * What it deliberately does not do: store a message, store an address, write
 * either into a log, read a file or a URL named by a submission, or report the
 * mail server's own error text to the client.
 */
final class Endpoint
{
    public const PATH = '/api/contact';
    public const HEALTH_PATH = '/api/contact/health';

    /** @var callable(array<string, mixed>): void */
    private $log;

    /** @var callable(): int */
    private $now;

    /**
     * @param (callable(array<string, mixed>): void)|null $log  receives one entry per
     *                                                         submission; it never
     *                                                         contains personal data
     * @param (callable(): int)|null                      $now  milliseconds
     */
    public function __construct(
        private readonly Config $config,
        private readonly Limits $limits,
        private readonly Mailer $mailer,
        ?callable $log = null,
        ?callable $now = null,
    ) {
        $this->log = $log ?? static function (array $entry): void {
            unset($entry);
        };
        $this->now = $now ?? static fn (): int => (int) (microtime(true) * 1000);
    }

    public function handle(Request $request): Response
    {
        if ($request->path === self::HEALTH_PATH && $request->method === 'GET') {
            // Says the endpoint is wired up and nothing else. It does not
            // claim the mail server is reachable, because finding that out
            // means sending a message.
            return Response::json(200, ['status' => 'ok', 'enabled' => $this->config->enabled]);
        }
        if ($request->path !== self::PATH) {
            return Response::json(404, ['status' => 'notFound']);
        }
        if ($request->method !== 'POST') {
            return Response::json(405, ['status' => 'badRequest'], ['Allow' => 'POST']);
        }

        return $this->submit($request);
    }

    private function submit(Request $request): Response
    {
        $started = ($this->now)();
        $formPost = $request->isFormPost();
        $locale = 'en';

        /**
         * @param array<string, mixed>  $body
         * @param array<string, string> $extra
         */
        $finish = function (
            int $status,
            array $body,
            string $outcome,
            ?string $category = null,
            array $extra = [],
        ) use (&$locale, $formPost, $started): Response {
            ($this->log)([
                'time' => gmdate('c', intdiv($started, 1000)),
                'outcome' => $outcome,
                ...($category !== null ? ['category' => $category] : []),
                'durationMs' => ($this->now)() - $started,
            ]);
            if (!$formPost) {
                return Response::json($status, $body, $extra);
            }
            $accepted = $outcome === 'accepted' || $outcome === 'duplicate';
            $page = $accepted
                ? $this->config->resultAccepted[$locale]
                : $this->config->resultProblem[$locale];

            return Response::redirect($this->config->resultBase . $page, $extra);
        };

        if (!$request->originAllowed($this->config->allowedOrigins)) {
            return $finish(403, ['status' => 'badRequest'], 'badRequest');
        }
        if (
            $request->declaredLength !== null && $request->declaredLength > $this->config->bodyBytes
            || \strlen($request->body) > $this->config->bodyBytes
        ) {
            return $finish(413, ['status' => 'badRequest'], 'badRequest');
        }

        $input = $this->parse($request);
        if ($input === null) {
            return $finish(415, ['status' => 'badRequest'], 'badRequest');
        }
        if (Config::isLocale($input['locale'] ?? null)) {
            /** @var string $submitted */
            $submitted = $input['locale'];
            $locale = $submitted;
        }

        // Counted before the work, so a flood costs the endpoint a hash and a
        // lock and nothing else. The global window is the backstop for many
        // addresses at once.
        $verdict = $this->limits->admit(
            $this->state()->clientKey($request->clientAddress($this->config->trustProxy)),
            ($this->now)(),
        );
        if ($verdict['recovered']) {
            ($this->log)(['outcome' => 'stateRecovered', 'durationMs' => 0, 'time' => gmdate('c')]);
        }
        if (!$verdict['allowed']) {
            return $finish(
                429,
                ['status' => 'rateLimited'],
                'rateLimited',
                null,
                ['Retry-After' => (string) $verdict['retryAfter']],
            );
        }

        $spam = SpamGuard::inspect(
            $input[Contract::HONEYPOT_FIELD] ?? null,
            $input[Contract::TIMESTAMP_FIELD] ?? null,
            ($this->now)(),
        );
        if ($spam !== null) {
            return $finish(400, ['status' => 'rejected', 'reason' => $spam], 'rejected');
        }

        $validation = Validator::validate($input);
        $submission = $validation['submission'];
        if ($submission === null) {
            return $finish(400, ['status' => 'invalid', 'errors' => $validation['errors']], 'invalid');
        }

        // Only now, with a valid submission in hand, does it matter whether
        // delivery is switched on. Validation answers are useful to a reader
        // either way, and refusing earlier would tell an unconfigured host's
        // visitors nothing about their own form.
        if (!$this->config->enabled) {
            return $finish(503, ['status' => 'undelivered'], 'disabled', $submission->category);
        }

        $fingerprint = SharedState::fingerprint($submission);
        // A second press of the button is the same message, not a second one.
        if ($this->limits->claim($fingerprint, ($this->now)())) {
            return $finish(
                200,
                ['status' => 'accepted', 'duplicate' => true],
                'duplicate',
                $submission->category,
            );
        }

        if (!$this->mailer->send($submission)) {
            // The fingerprint was written before the send, so it has to go
            // again: otherwise a reader trying once more would be told their
            // message was already accepted when nothing was ever sent.
            $this->limits->forget($fingerprint);

            return $finish(503, ['status' => 'undelivered'], 'undelivered', $submission->category);
        }

        return $finish(200, ['status' => 'accepted'], 'accepted', $submission->category);
    }

    private function state(): SharedState
    {
        return new SharedState($this->config->stateDirectory);
    }

    /**
     * Reads the body of a submission. Two content types and nothing else; a
     * third is refused rather than guessed at.
     *
     * @return array<string, mixed>|null
     */
    private function parse(Request $request): ?array
    {
        $type = $request->mediaType();
        if ($type === 'application/json') {
            /** @var mixed $parsed */
            $parsed = json_decode($request->body, true);
            // An array or a primitive is not a submission.
            if (!\is_array($parsed) || array_is_list($parsed)) {
                return null;
            }
            $result = [];
            foreach ($parsed as $key => $value) {
                if (\is_string($key)) {
                    $result[$key] = $value;
                }
            }

            return $result;
        }
        if ($type === 'application/x-www-form-urlencoded') {
            // The form without JavaScript posts this. The last value of a
            // repeated field wins, which is what a browser would send anyway.
            $parsed = [];
            parse_str($request->body, $parsed);
            $result = [];
            foreach ($parsed as $key => $value) {
                if (\is_string($key) && (\is_string($value) || is_numeric($value))) {
                    $result[$key] = (string) $value;
                }
            }

            return $result;
        }

        return null;
    }
}

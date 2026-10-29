<?php

declare(strict_types=1);

namespace Koxora\Contact;

/**
 * One answer, as plain data, so a test can read it without a web server and
 * the front controller has nothing to decide.
 */
final class Response
{
    /** @param array<string, string> $headers */
    private function __construct(
        public readonly int $status,
        public readonly array $headers,
        public readonly string $body,
    ) {
    }

    /**
     * Headers every answer carries. The answer is read by a script on the
     * site itself; nothing here is meant to be embedded, framed, sniffed,
     * cached or to carry a referrer anywhere.
     *
     * @return array<string, string>
     */
    private static function common(): array
    {
        return [
            'Content-Type' => 'application/json; charset=utf-8',
            'Cache-Control' => 'no-store',
            'X-Content-Type-Options' => 'nosniff',
            'Referrer-Policy' => 'no-referrer',
            'X-Frame-Options' => 'DENY',
            'Content-Security-Policy' => "default-src 'none'; frame-ancestors 'none'",
        ];
    }

    /**
     * @param array<string, mixed>  $body
     * @param array<string, string> $extra
     */
    public static function json(int $status, array $body, array $extra = []): self
    {
        $encoded = json_encode($body, \JSON_UNESCAPED_SLASHES | \JSON_UNESCAPED_UNICODE);

        return new self($status, [...self::common(), ...$extra], $encoded === false ? '{}' : $encoded);
    }

    /**
     * A classic form post cannot show a JSON answer, so the reader is sent to
     * a page on the website. 303 so the browser follows with a GET and a
     * reload does not repeat the submission.
     *
     * @param array<string, string> $extra
     */
    public static function redirect(string $location, array $extra = []): self
    {
        return new self(303, [...self::common(), ...$extra, 'Location' => $location], '');
    }

    /** Writes the answer out. The only part that touches PHP's output. */
    public function send(): void
    {
        http_response_code($this->status);
        foreach ($this->headers as $name => $value) {
            header($name . ': ' . $value, true);
        }
        if ($this->body !== '') {
            echo $this->body;
        }
    }
}

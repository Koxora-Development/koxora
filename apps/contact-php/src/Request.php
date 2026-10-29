<?php

declare(strict_types=1);

namespace Koxora\Contact;

/**
 * One request, as plain data.
 *
 * The endpoint is given this rather than reading superglobals, so every case
 * it has to get right — a cross-site post, an oversized body, a form post
 * without JavaScript — is reachable from a test without a web server in the
 * way. `fromServer` is the only part that knows about PHP's request
 * environment, and it does nothing but copy.
 */
final class Request
{
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly string $contentType,
        public readonly string $body,
        public readonly ?int $declaredLength,
        public readonly string $origin,
        public readonly string $referer,
        public readonly string $remoteAddress,
        public readonly string $forwardedFor,
    ) {
    }

    /**
     * @param array<string, mixed> $server
     * @param callable(int): string $readBody receives the byte cap and returns
     *                                        at most that many bytes plus one,
     *                                        so an oversized body is detected
     *                                        without being held in memory
     */
    public static function fromServer(array $server, callable $readBody, int $bodyBytes): self
    {
        $text = static fn (string $key): string => isset($server[$key]) ? (string) $server[$key] : '';
        $declared = $text('CONTENT_LENGTH');

        return new self(
            method: strtoupper($text('REQUEST_METHOD')),
            // Only the path, never the query, and never anything after a
            // fragment. Apache gives the mapped request; the query string is
            // not part of how this endpoint decides anything.
            path: (string) (parse_url($text('REQUEST_URI'), \PHP_URL_PATH) ?: '/'),
            contentType: $text('CONTENT_TYPE'),
            body: $readBody($bodyBytes),
            declaredLength: preg_match('/^\d+$/', $declared) === 1 ? (int) $declared : null,
            origin: $text('HTTP_ORIGIN'),
            referer: $text('HTTP_REFERER'),
            remoteAddress: $text('REMOTE_ADDR'),
            forwardedFor: $text('HTTP_X_FORWARDED_FOR'),
        );
    }

    /** Whether this came from a form rather than from the enhancement script. */
    public function isFormPost(): bool
    {
        return $this->mediaType() === 'application/x-www-form-urlencoded';
    }

    public function mediaType(): string
    {
        $parts = explode(';', $this->contentType);

        return strtolower(trim($parts[0]));
    }

    /**
     * The address to count against, trusting a proxy header only where the
     * configuration says a known proxy sets it. Otherwise anyone could send
     * a header and reset their own counter.
     */
    public function clientAddress(bool $trustProxy): string
    {
        if ($trustProxy && $this->forwardedFor !== '') {
            $first = trim(explode(',', $this->forwardedFor)[0]);
            if ($first !== '') {
                return $first;
            }
        }

        return $this->remoteAddress === '' ? 'unknown' : $this->remoteAddress;
    }

    /**
     * Where the submission came from. A browser sends `Origin` on a
     * cross-site form post, so a mismatch is refused. A missing `Origin` is
     * accepted: the endpoint uses no cookie and no session, so there is
     * nothing for a forged request to borrow, and refusing it would only lock
     * out readers whose browser or privacy setting withholds the header.
     *
     * @param list<string> $allowed
     */
    public function originAllowed(array $allowed): bool
    {
        if ($this->origin !== '' && $this->origin !== 'null') {
            return \in_array(rtrim($this->origin, '/'), $allowed, true);
        }
        if ($this->referer !== '') {
            $parts = parse_url($this->referer);
            if (!\is_array($parts) || !isset($parts['scheme'], $parts['host'])) {
                return false;
            }
            $origin = $parts['scheme'] . '://' . $parts['host']
                . (isset($parts['port']) ? ':' . $parts['port'] : '');

            return \in_array($origin, $allowed, true);
        }

        return true;
    }
}

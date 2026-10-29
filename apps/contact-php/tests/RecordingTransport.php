<?php

declare(strict_types=1);

namespace Koxora\Contact\Tests;

use Symfony\Component\Mailer\Envelope;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\TransportInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\RawMessage;

/**
 * Records what would have been sent, or refuses to send at all.
 *
 * The one thing a test cannot do for real is reach a mail server, so this is
 * the one thing that is replaced. Everything above it — the parsing, the
 * validation, the limits, the headers — is the code that runs in production.
 */
final class RecordingTransport implements TransportInterface
{
    /** @var list<RawMessage> */
    public array $sent = [];

    public function __construct(private readonly bool $failSending = false)
    {
    }

    public function send(RawMessage $message, ?Envelope $envelope = null): ?SentMessage
    {
        if ($this->failSending) {
            throw new \RuntimeException('the mail server said no');
        }
        $this->sent[] = $message;

        return new SentMessage(
            $message,
            $envelope ?? new Envelope(
                new Address('website@koxora.app'),
                [new Address('hello@koxora.app')],
            ),
        );
    }

    public function __toString(): string
    {
        return 'recording://test';
    }
}

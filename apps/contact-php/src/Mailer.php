<?php

declare(strict_types=1);

namespace Koxora\Contact;

use Symfony\Component\Mailer\Transport\Smtp\EsmtpTransport;
use Symfony\Component\Mailer\Transport\Smtp\Stream\SocketStream;
use Symfony\Component\Mailer\Transport\TransportInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

/**
 * Hands one message to the mail server.
 *
 * Three deliberate choices:
 *
 * - The transport is constructed here, never from a DSN. `Transport::fromDsn`
 *   would let a setting choose a `sendmail://` transport, which hands
 *   addresses to a command line; that is the shape of CVE-2026-45068 and of
 *   PHP's own `mail()`. Only authenticated SMTP over TLS is reachable from
 *   this code at all.
 * - The reader's address becomes a `Reply-To` and never a `From`. Sending as
 *   the reader is a forgery that mail providers reject, and it would make the
 *   operator's domain a relay for anyone's address.
 * - "Accepted by the mail server" is all this reports, and the endpoint says
 *   no more than that to the reader. An SMTP server accepting a message is
 *   not the recipient having received it, and the page says so.
 */
final class Mailer
{
    private ?TransportInterface $transport;

    public function __construct(
        private readonly Config $config,
        ?TransportInterface $transport = null,
    ) {
        $this->transport = $transport;
    }

    /** True when the mail server accepted the message. */
    public function send(Submission $submission): bool
    {
        $mail = $this->compose($submission);
        try {
            $this->transport()->send($mail);

            return true;
        } catch (\Throwable) {
            // Nothing about the mail server's own complaint reaches the
            // caller, and therefore nothing reaches the reader.
            return false;
        }
    }

    public function compose(Submission $submission): Email
    {
        // Every field has already been refused if it contained anything that
        // could end a header line, and the category is one of four known
        // words. Symfony encodes and folds the header on top of that, so no
        // header is assembled from raw input by hand anywhere here.
        $subject = sprintf(
            '%s %s: %s',
            $this->config->subjectPrefix,
            $submission->category,
            $submission->subject,
        );

        $body = implode("\n", [
            'Category: ' . $submission->category,
            'From: ' . ($submission->name === '' ? '(no name given)' : $submission->name)
                . ' <' . $submission->email . '>',
            '',
            $submission->message,
            '',
        ]);

        return (new Email())
            ->from(new Address($this->config->sender))
            ->to(new Address($this->config->recipient))
            ->replyTo(new Address($submission->email))
            ->subject($subject)
            ->text($body);
    }

    private function transport(): TransportInterface
    {
        if ($this->transport instanceof TransportInterface) {
            return $this->transport;
        }

        $transport = new EsmtpTransport(
            $this->config->smtpHost,
            $this->config->smtpPort,
            $this->config->smtpImplicitTls,
        );
        $transport->setUsername($this->config->smtpUser);
        $transport->setPassword($this->config->smtpPassword);
        // Refuse to continue in the clear. Without this a server that simply
        // does not offer STARTTLS would be talked to anyway, and the password
        // would go over the wire in plain.
        $transport->setRequireTls(true);

        $stream = $transport->getStream();
        if ($stream instanceof SocketStream) {
            $stream->setTimeout((float) $this->config->sendTimeout);
            $stream->setStreamOptions([
                'ssl' => [
                    'verify_peer' => true,
                    'verify_peer_name' => true,
                    'allow_self_signed' => false,
                    // TLS 1.2 at the oldest; the earlier versions are broken.
                    'crypto_method' => \STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT
                        | \STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT,
                ],
            ]);
        }

        return $this->transport = $transport;
    }
}

<?php

declare(strict_types=1);

namespace Koxora\Contact\Tests;

use Koxora\Contact\Endpoint;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Mime\Email;

/**
 * What the endpoint answers, for every case it has to get right.
 *
 * These run the real request parsing, the real validation and the real
 * limits. Only the mail transport is replaced, because the alternative is a
 * mail server.
 */
final class EndpointTest extends TestCase
{
    public function testAcceptsAValidSubmissionAndSendsOneMessage(): void
    {
        $harness = new Harness();
        $response = $harness->postJson(Harness::valid());

        self::assertSame(200, $response->status);
        self::assertSame(['status' => 'accepted'], Harness::decode($response));
        self::assertCount(1, $harness->sent());
    }

    public function testTheReadersAddressBecomesReplyToAndNeverFrom(): void
    {
        $harness = new Harness();
        $harness->postJson(Harness::valid());

        $mail = $harness->sent()[0];
        self::assertInstanceOf(Email::class, $mail);
        // Sending as the reader is a forgery that mail providers reject, and
        // it would make the operator's domain a relay for anyone's address.
        self::assertSame('website@koxora.app', $mail->getFrom()[0]->getAddress());
        self::assertSame('alex@example.org', $mail->getReplyTo()[0]->getAddress());
        self::assertSame('hello@koxora.app', $mail->getTo()[0]->getAddress());
        self::assertSame('[Koxora] support: A question about project files', $mail->getSubject());
    }

    public function testReportsEveryInvalidFieldAtOnce(): void
    {
        $harness = new Harness();
        $response = $harness->postJson([
            'email' => 'not-an-address',
            'category' => 'invoice',
            'subject' => 'Hi',
            'message' => 'Short.',
        ]);

        self::assertSame(400, $response->status);
        $body = Harness::decode($response);
        self::assertSame('invalid', $body['status']);
        self::assertSame(
            [
                ['field' => 'subject', 'problem' => 'tooShort'],
                ['field' => 'message', 'problem' => 'tooShort'],
                ['field' => 'category', 'problem' => 'category'],
                ['field' => 'email', 'problem' => 'email'],
            ],
            $body['errors'],
        );
        self::assertSame([], $harness->sent());
    }

    public function testRefusesAHeaderInjectionAttemptInTheSubject(): void
    {
        $harness = new Harness();
        $response = $harness->postJson([
            ...Harness::valid(),
            'subject' => "Hello\r\nBcc: victim@example.net",
        ]);

        self::assertSame(400, $response->status);
        self::assertSame(
            [['field' => 'subject', 'problem' => 'controlCharacter']],
            Harness::decode($response)['errors'],
        );
        self::assertSame([], $harness->sent());
    }

    public function testRefusesAFilledHoneypotWithoutSayingWhy(): void
    {
        $harness = new Harness();
        $response = $harness->postJson([...Harness::valid(), 'website' => 'https://example.net']);

        self::assertSame(400, $response->status);
        self::assertSame('rejected', Harness::decode($response)['status']);
        self::assertSame([], $harness->sent());
    }

    public function testRefusesASubmissionFasterThanAPersonCanType(): void
    {
        $harness = new Harness();
        $response = $harness->postJson([
            ...Harness::valid(),
            'opened' => (string) ($harness->now - 500),
        ]);

        self::assertSame(400, $response->status);
        self::assertSame('tooFast', Harness::decode($response)['reason']);
    }

    public function testAcceptsASubmissionWithNoTimestampAtAll(): void
    {
        // The no-JavaScript case. A reader without a timestamp is not spam.
        $harness = new Harness();
        $response = $harness->postForm(Harness::valid());

        self::assertSame(303, $response->status);
        self::assertSame(
            'https://koxora.app/en/contact/sent/',
            $response->headers['Location'],
        );
        self::assertCount(1, $harness->sent());
    }

    public function testSendsAGermanFormSubmissionToTheGermanResultPage(): void
    {
        $harness = new Harness();
        $response = $harness->postForm([...Harness::valid(), 'locale' => 'de']);

        self::assertSame(303, $response->status);
        self::assertSame(
            'https://koxora.app/de/kontakt/gesendet/',
            $response->headers['Location'],
        );
    }

    public function testSendsAFailedFormSubmissionToTheProblemPage(): void
    {
        $harness = new Harness();
        $response = $harness->postForm([...Harness::valid(), 'locale' => 'de', 'subject' => 'Hi']);

        self::assertSame(303, $response->status);
        self::assertSame(
            'https://koxora.app/de/kontakt/problem/',
            $response->headers['Location'],
        );
    }

    public function testIgnoresARedirectTargetTheRequestTriesToName(): void
    {
        // A redirect a request can choose is an open redirect. The target
        // comes from configuration and a fixed table, never from the body.
        $harness = new Harness();
        $response = $harness->postForm([
            ...Harness::valid(),
            'locale' => 'https://evil.example.net/',
        ]);

        self::assertSame(303, $response->status);
        self::assertSame(
            'https://koxora.app/en/contact/sent/',
            $response->headers['Location'],
        );
    }

    public function testRefusesACrossSiteSubmission(): void
    {
        $harness = new Harness();
        $response = $harness->postJson(
            Harness::valid(),
            ['HTTP_ORIGIN' => 'https://evil.example.net'],
        );

        self::assertSame(403, $response->status);
        self::assertSame([], $harness->sent());
    }

    public function testRefusesASubmissionFromAForeignReferrerWhenNoOriginIsSent(): void
    {
        $harness = new Harness();
        $response = $harness->postJson(Harness::valid(), [
            'HTTP_ORIGIN' => '',
            'HTTP_REFERER' => 'https://evil.example.net/page',
        ]);

        self::assertSame(403, $response->status);
    }

    public function testAcceptsASubmissionWithNeitherOriginNorReferrer(): void
    {
        // Nothing here uses a cookie or a session, so there is nothing for a
        // forged request to borrow, and refusing would only lock out readers
        // whose browser withholds the header.
        $harness = new Harness();
        $response = $harness->postJson(Harness::valid(), [
            'HTTP_ORIGIN' => '',
            'HTTP_REFERER' => '',
        ]);

        self::assertSame(200, $response->status);
    }

    public function testRefusesAnOversizedBody(): void
    {
        $harness = new Harness();
        $response = $harness->postJson([
            ...Harness::valid(),
            'message' => str_repeat('a', 40000),
        ]);

        self::assertSame(413, $response->status);
        self::assertSame([], $harness->sent());
    }

    public function testRefusesAnUnknownContentType(): void
    {
        $harness = new Harness();
        $response = $harness->endpoint->handle(
            $harness->request('name=Alex', 'text/plain'),
        );

        self::assertSame(415, $response->status);
    }

    public function testRefusesAJsonArrayWhereAnObjectBelongs(): void
    {
        $harness = new Harness();
        $response = $harness->endpoint->handle(
            $harness->request('[1,2,3]', 'application/json'),
        );

        self::assertSame(415, $response->status);
    }

    public function testRefusesAnythingButPost(): void
    {
        $harness = new Harness();
        $response = $harness->endpoint->handle(
            $harness->request('', 'application/json', [], 'GET'),
        );

        self::assertSame(405, $response->status);
        self::assertSame('POST', $response->headers['Allow']);
    }

    public function testAnswersTheHealthPathWithoutClaimingMailWorks(): void
    {
        $harness = new Harness();
        $response = $harness->endpoint->handle($harness->request(
            '',
            '',
            [],
            'GET',
            Endpoint::HEALTH_PATH,
        ));

        self::assertSame(200, $response->status);
        self::assertSame(['status' => 'ok', 'enabled' => true], Harness::decode($response));
    }

    public function testAnswersAnUnknownPathWithNotFound(): void
    {
        $harness = new Harness();
        $response = $harness->endpoint->handle($harness->request(
            '',
            'application/json',
            [],
            'POST',
            '/api/contact/../secrets',
        ));

        self::assertSame(404, $response->status);
    }

    public function testTreatsASecondPressOfTheButtonAsTheSameMessage(): void
    {
        $harness = new Harness();
        $first = $harness->postJson(Harness::valid());
        $second = $harness->postJson(Harness::valid());

        self::assertSame(200, $first->status);
        self::assertSame(200, $second->status);
        self::assertTrue(Harness::decode($second)['duplicate']);
        // One message, not two.
        self::assertCount(1, $harness->sent());
    }

    public function testRefusesToClaimDeliveryWhenTheMailServerFails(): void
    {
        $harness = new Harness(failSending: true);
        $response = $harness->postJson(Harness::valid());

        self::assertSame(503, $response->status);
        self::assertSame(['status' => 'undelivered'], Harness::decode($response));
    }

    public function testLetsAReaderTryAgainAfterAFailedDelivery(): void
    {
        // The fingerprint is written before the send, so a failure has to
        // undo it: otherwise the second attempt would be called a duplicate
        // and the reader told their message was accepted when nothing was
        // ever sent.
        $harness = new Harness(failSending: true);
        $harness->postJson(Harness::valid());
        $second = $harness->postJson(Harness::valid());

        self::assertSame(503, $second->status);
        self::assertSame(['status' => 'undelivered'], Harness::decode($second));
    }

    public function testDeliversNothingWhileTheEndpointIsSwitchedOff(): void
    {
        // Off until the Product Owner has confirmed a working mailbox. The
        // reader sees the same honest answer as a delivery failure, because
        // that is what it is.
        $harness = new Harness(['KOXORA_CONTACT_ENABLED' => 'false']);
        $response = $harness->postJson(Harness::valid());

        self::assertSame(503, $response->status);
        self::assertSame(['status' => 'undelivered'], Harness::decode($response));
        self::assertSame([], $harness->sent());
        self::assertSame('disabled', $harness->log[0]['outcome']);
    }

    public function testStillChecksTheFormWhileSwitchedOff(): void
    {
        // Validation answers help a reader either way, and the website only
        // renders the form at all when an endpoint is configured.
        $harness = new Harness(['KOXORA_CONTACT_ENABLED' => 'false']);
        $response = $harness->postJson([...Harness::valid(), 'subject' => 'Hi']);

        self::assertSame(400, $response->status);
        self::assertSame('invalid', Harness::decode($response)['status']);
    }

    public function testAnswerCarriesNoCacheAndNoSniffHeaders(): void
    {
        $harness = new Harness();
        $headers = $harness->postJson(Harness::valid())->headers;

        self::assertSame('no-store', $headers['Cache-Control']);
        self::assertSame('nosniff', $headers['X-Content-Type-Options']);
        self::assertSame('no-referrer', $headers['Referrer-Policy']);
        self::assertSame('DENY', $headers['X-Frame-Options']);
        self::assertSame('application/json; charset=utf-8', $headers['Content-Type']);
    }

    public function testLogsTheOutcomeAndNothingAboutTheReader(): void
    {
        $harness = new Harness();
        $harness->postJson(Harness::valid());

        $entry = $harness->log[0];
        self::assertSame('accepted', $entry['outcome']);
        self::assertSame('support', $entry['category']);
        self::assertArrayHasKey('durationMs', $entry);
        // Nothing a person wrote may appear anywhere in the entry.
        $encoded = (string) json_encode($entry);
        foreach (['alex@example.org', 'Alex Beispiel', 'project archive', '203.0.113.7'] as $secret) {
            self::assertStringNotContainsString($secret, $encoded);
        }
    }
}

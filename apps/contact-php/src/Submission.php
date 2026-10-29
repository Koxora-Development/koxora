<?php

declare(strict_types=1);

namespace Koxora\Contact;

/**
 * A submission that has passed validation. Nothing reaches this type without
 * having been checked, so everything downstream — the fingerprint, the mail —
 * can treat its fields as known to be single-line where they must be, within
 * their lengths, and free of anything that could end a header.
 */
final class Submission
{
    public function __construct(
        public readonly string $name,
        public readonly string $email,
        public readonly string $category,
        public readonly string $subject,
        public readonly string $message,
    ) {
    }
}

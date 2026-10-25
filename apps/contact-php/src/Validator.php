<?php

declare(strict_types=1);

namespace Koxora\Contact;

/**
 * Validates one submission, independently of whatever the browser decided.
 *
 * The result names every field that is wrong, so a reader fixes the whole
 * form once instead of discovering one problem at a time, and the endpoint
 * answers with the same list the browser would have produced.
 */
final class Validator
{
    /**
     * @param array<string, mixed> $input
     *
     * @return array{errors: list<array{field: string, problem: string}>, submission: ?Submission}
     */
    public static function validate(array $input): array
    {
        $errors = [];
        $add = static function (string $field, string $problem) use (&$errors): void {
            $errors[] = ['field' => $field, 'problem' => $problem];
        };

        // A single-line field is checked as it was written, before anything
        // is normalized away: a line ending in a subject is refused rather
        // than quietly turned into a space.
        $name = Text::single($input['name'] ?? null);
        $email = Text::single($input['email'] ?? null);
        $subject = Text::single($input['subject'] ?? null);
        $category = Text::single($input['category'] ?? null);
        $message = Text::normalize($input['message'] ?? null, true);

        foreach (
            [
                ['name', $name, false],
                ['email', $email, false],
                ['subject', $subject, false],
                ['message', $message, true],
            ] as [$field, $value, $allowLineBreaks]
        ) {
            $spec = Contract::field($field);
            if ($value === '') {
                if ($spec['required']) {
                    $add($field, 'required');
                }
                continue;
            }
            if (Text::hasControlCharacter($value, $allowLineBreaks)) {
                $add($field, 'controlCharacter');
            } elseif (Text::length($value) < $spec['minLength']) {
                $add($field, 'tooShort');
            } elseif (Text::length($value) > $spec['maxLength']) {
                $add($field, 'tooLong');
            }
        }

        if ($category === '') {
            $add('category', 'required');
        } elseif (!Contract::isCategory($category)) {
            $add('category', 'category');
        }

        $emailAlreadyWrong = false;
        foreach ($errors as $error) {
            if ($error['field'] === 'email') {
                $emailAlreadyWrong = true;
            }
        }
        if ($email !== '' && !$emailAlreadyWrong && !Text::isEmail($email)) {
            $add('email', 'email');
        }

        if ($errors !== []) {
            return ['errors' => $errors, 'submission' => null];
        }

        return [
            'errors' => [],
            'submission' => new Submission($name, $email, $category, $subject, $message),
        ];
    }
}

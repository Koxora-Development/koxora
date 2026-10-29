<?php

declare(strict_types=1);

namespace Koxora\Contact;

/**
 * The little bit of state the abuse controls need, shared by every PHP-FPM
 * worker.
 *
 * This is the part a Node service got for free and PHP does not. Under
 * PHP-FPM each request runs in whichever worker is free, and workers share no
 * memory, so counters held in a process variable would reset on every request
 * and a "three per hour" limit would really be "three per hour per worker, and
 * there are twenty workers". APCu would do, but it is an extra extension to
 * require of the host and it disappears on a pool reload. A small file held
 * under an exclusive `flock` is shared by every worker, survives a reload,
 * needs no extension, and can be tested here for real.
 *
 * What is stored: a salted hash of a client address, a count of recent
 * submission times, and a hash of what was recently accepted. No address, no
 * message, no email address, nothing a person wrote. Everything is pruned to
 * its window on every write, so the file stays small and holds nothing older
 * than the limits it enforces.
 */
final class SharedState
{
    /** Beyond this many tracked clients the oldest are dropped, so a flood cannot grow the file without bound. */
    private const MAX_CLIENTS = 10000;
    private const MAX_DUPLICATES = 10000;

    public function __construct(private readonly string $directory)
    {
    }

    /**
     * Prepares the directory, or explains why it cannot be used. Called once
     * at startup so a misconfigured host fails with a sentence in the server
     * log rather than silently stopping the limits from working.
     */
    public function prepare(): void
    {
        if (!is_dir($this->directory) && !@mkdir($this->directory, 0o700, true) && !is_dir($this->directory)) {
            throw new ConfigurationError('The state directory cannot be created: ' . $this->directory);
        }
        if (!is_writable($this->directory)) {
            throw new ConfigurationError('The state directory is not writable: ' . $this->directory);
        }
    }

    /**
     * Reads the state, hands it to `$mutate`, and writes back whatever that
     * returns, all while holding an exclusive lock. Two workers submitting at
     * the same moment are serialised here, which is the whole point: without
     * it both would read "two so far" and both would be allowed.
     *
     * A file that cannot be parsed is treated as empty. The alternative,
     * refusing every submission until an operator intervenes, turns a rare
     * operational mishap into an outage of the contact form; the window is
     * short and the next writes repair it. The caller is told, so it reaches
     * the log.
     *
     * @template T
     *
     * @param callable(array<string, mixed>, bool): array{0: array<string, mixed>, 1: T} $mutate
     *
     * @return T
     */
    public function transaction(callable $mutate): mixed
    {
        $path = $this->directory . '/state.json';
        $handle = @fopen($path, 'c+');
        if ($handle === false) {
            throw new ConfigurationError('The state file cannot be opened: ' . $path);
        }

        try {
            if (!flock($handle, \LOCK_EX)) {
                throw new ConfigurationError('The state file cannot be locked: ' . $path);
            }
            $raw = stream_get_contents($handle);
            $recovered = false;
            $state = [];
            if (\is_string($raw) && $raw !== '') {
                /** @var mixed $decoded */
                $decoded = json_decode($raw, true);
                if (\is_array($decoded)) {
                    /** @var array<string, mixed> $state */
                    $state = $decoded;
                } else {
                    $recovered = true;
                }
            }

            [$next, $result] = $mutate($state, $recovered);

            $encoded = json_encode($this->bound($next), \JSON_UNESCAPED_SLASHES);
            if ($encoded === false) {
                throw new ConfigurationError('The state could not be encoded.');
            }
            rewind($handle);
            ftruncate($handle, 0);
            fwrite($handle, $encoded);
            fflush($handle);

            return $result;
        } finally {
            flock($handle, \LOCK_UN);
            fclose($handle);
            @chmod($path, 0o600);
        }
    }

    /**
     * Keeps the file bounded whatever the callers did, so one runaway caller
     * cannot make it grow for ever.
     *
     * @param array<string, mixed> $state
     *
     * @return array<string, mixed>
     */
    private function bound(array $state): array
    {
        foreach ([['clients', self::MAX_CLIENTS], ['duplicates', self::MAX_DUPLICATES]] as [$key, $limit]) {
            if (!isset($state[$key]) || !\is_array($state[$key]) || \count($state[$key]) <= $limit) {
                continue;
            }
            $entries = $state[$key];
            // Newest kept, oldest dropped. A dropped client simply starts
            // counting again, which is the safe direction for a limit that
            // exists to stop a flood rather than to punish a visitor.
            uasort($entries, static fn (mixed $a, mixed $b): int => self::newest($b) <=> self::newest($a));
            $state[$key] = \array_slice($entries, 0, $limit, true);
        }

        return $state;
    }

    private static function newest(mixed $entry): float
    {
        if (\is_array($entry)) {
            $times = array_filter($entry, 'is_numeric');

            return $times === [] ? 0.0 : (float) max($times);
        }

        return is_numeric($entry) ? (float) $entry : 0.0;
    }

    /**
     * Identifies a client without storing anything about them. The salt is
     * generated once, kept readable only by the account the workers run as,
     * and never leaves the host, so the stored value cannot be turned back
     * into an address and the keys cannot be enumerated. Delete the salt file
     * to break the link; the counters rebuild within one window.
     */
    public function clientKey(string $address): string
    {
        $digest = hash_hmac('sha256', $address, $this->salt(), true);

        // Base64 without padding and with a file-safe alphabet, so the value
        // is a plain JSON key and needs no extension beyond the core.
        return rtrim(strtr(base64_encode($digest), '+/', '-_'), '=');
    }

    private function salt(): string
    {
        $path = $this->directory . '/salt';
        $existing = @file_get_contents($path);
        if (\is_string($existing) && \strlen($existing) === 32) {
            return $existing;
        }
        $salt = random_bytes(32);
        // Exclusive create, so two workers starting at once cannot each write
        // a different salt and disagree about every client afterwards.
        $handle = @fopen($path, 'x');
        if ($handle === false) {
            $again = @file_get_contents($path);
            if (\is_string($again) && \strlen($again) === 32) {
                return $again;
            }
            throw new ConfigurationError('The client salt cannot be created: ' . $path);
        }
        fwrite($handle, $salt);
        fclose($handle);
        @chmod($path, 0o600);

        return $salt;
    }

    /** Identifies a submission by content, for the duplicate guard only. */
    public static function fingerprint(Submission $submission): string
    {
        $hash = hash_init('sha256');
        foreach ([$submission->email, $submission->category, $submission->subject, $submission->message] as $part) {
            hash_update($hash, $part);
            hash_update($hash, "\0");
        }

        return substr(hash_final($hash), 0, 32);
    }
}

<?php

declare(strict_types=1);

namespace Koxora\Contact;

/**
 * Sliding windows per client and for the endpoint as a whole, plus a short
 * memory of what was already accepted so that pressing the button twice does
 * not send two messages.
 *
 * Both windows are decided in one locked transaction, because a submission
 * that is allowed by the per-client window and refused by the global one must
 * not have been counted against the client: the reader did nothing wrong and
 * their next attempt, once the flood is over, should still be their first.
 */
final class Limits
{
    public function __construct(
        private readonly SharedState $state,
        private readonly int $perClientCount,
        private readonly int $perClientWindowSeconds,
        private readonly int $globalCount,
        private readonly int $globalWindowSeconds,
        private readonly int $duplicateWindowSeconds,
    ) {
    }

    /**
     * Counts this submission and says whether it may proceed. When it may
     * not, it also says how long to wait, which becomes `Retry-After`.
     *
     * @return array{allowed: bool, retryAfter: int, scope: ?string, recovered: bool}
     */
    public function admit(string $clientKey, int $nowMs): array
    {
        $perClientWindow = $this->perClientWindowSeconds * 1000;
        $globalWindow = $this->globalWindowSeconds * 1000;

        return $this->state->transaction(
            /**
             * @param array<string, mixed> $state
             *
             * @return array{0: array<string, mixed>, 1: array{allowed: bool, retryAfter: int, scope: ?string, recovered: bool}}
             */
            function (array $state, bool $recovered) use ($clientKey, $nowMs, $perClientWindow, $globalWindow): array {
                $clients = self::mapOfLists($state['clients'] ?? null);
                $global = self::listOfTimes($state['global'] ?? null);

                $mine = self::recent($clients[$clientKey] ?? [], $nowMs - $perClientWindow);
                $global = self::recent($global, $nowMs - $globalWindow);

                if (\count($mine) >= $this->perClientCount) {
                    $clients[$clientKey] = $mine;
                    $state['clients'] = $clients;
                    $state['global'] = $global;

                    return [$state, [
                        'allowed' => false,
                        'retryAfter' => self::retryAfter($mine[0], $perClientWindow, $nowMs),
                        'scope' => 'client',
                        'recovered' => $recovered,
                    ]];
                }

                if (\count($global) >= $this->globalCount) {
                    // Not counted against the client: the endpoint is busy,
                    // which is not this reader's doing.
                    $clients[$clientKey] = $mine;
                    $state['clients'] = $clients;
                    $state['global'] = $global;

                    return [$state, [
                        'allowed' => false,
                        'retryAfter' => self::retryAfter($global[0], $globalWindow, $nowMs),
                        'scope' => 'global',
                        'recovered' => $recovered,
                    ]];
                }

                $mine[] = $nowMs;
                $global[] = $nowMs;
                $clients[$clientKey] = $mine;
                $state['clients'] = $clients;
                $state['global'] = $global;
                $state['duplicates'] = self::prunedDuplicates(
                    $state['duplicates'] ?? null,
                    $nowMs - $this->duplicateWindowSeconds * 1000,
                );

                return [$state, [
                    'allowed' => true,
                    'retryAfter' => 0,
                    'scope' => null,
                    'recovered' => $recovered,
                ]];
            },
        );
    }

    /**
     * Whether this exact submission was already accepted a moment ago, and if
     * not, records it. One transaction, so two simultaneous presses of the
     * button cannot both find nothing and both send.
     */
    public function claim(string $fingerprint, int $nowMs): bool
    {
        $window = $this->duplicateWindowSeconds * 1000;

        return $this->state->transaction(
            /**
             * @param array<string, mixed> $state
             *
             * @return array{0: array<string, mixed>, 1: bool}
             */
            static function (array $state, bool $recovered) use ($fingerprint, $nowMs, $window): array {
                unset($recovered);
                $duplicates = self::prunedDuplicates($state['duplicates'] ?? null, $nowMs - $window);
                $seen = isset($duplicates[$fingerprint]);
                $duplicates[$fingerprint] = $nowMs;
                $state['duplicates'] = $duplicates;

                return [$state, $seen];
            },
        );
    }

    /**
     * Forgets a recorded submission. Used when the message could not be
     * delivered: the fingerprint was written before the send, so without
     * this a reader pressing the button again would be told their message
     * was accepted as a duplicate when nothing was ever sent.
     *
     * The rate-limit slot is deliberately not given back. A submission costs
     * an attempt whether or not the mail server was reachable, because
     * otherwise a failing mail server would turn the limit off exactly when a
     * flood is cheapest to send.
     */
    public function forget(string $fingerprint): void
    {
        $this->state->transaction(
            /**
             * @param array<string, mixed> $state
             *
             * @return array{0: array<string, mixed>, 1: null}
             */
            static function (array $state, bool $recovered) use ($fingerprint): array {
                unset($recovered);
                $duplicates = self::mapOfTimes($state['duplicates'] ?? null);
                unset($duplicates[$fingerprint]);
                $state['duplicates'] = $duplicates;

                return [$state, null];
            },
        );
    }

    private static function retryAfter(int $oldest, int $window, int $nowMs): int
    {
        return max(1, (int) ceil(($oldest + $window - $nowMs) / 1000));
    }

    /**
     * @param list<int> $times
     *
     * @return list<int>
     */
    private static function recent(array $times, int $since): array
    {
        $kept = [];
        foreach ($times as $time) {
            if ($time > $since) {
                $kept[] = $time;
            }
        }
        sort($kept);

        return $kept;
    }

    /**
     * @return array<string, list<int>>
     */
    private static function mapOfLists(mixed $value): array
    {
        $result = [];
        if (!\is_array($value)) {
            return $result;
        }
        foreach ($value as $key => $times) {
            if (!\is_string($key) || !\is_array($times)) {
                continue;
            }
            $result[$key] = self::listOfTimes($times);
        }

        return $result;
    }

    /**
     * @return list<int>
     */
    private static function listOfTimes(mixed $value): array
    {
        $result = [];
        if (!\is_array($value)) {
            return $result;
        }
        foreach ($value as $time) {
            if (is_numeric($time)) {
                $result[] = (int) $time;
            }
        }

        return $result;
    }

    /**
     * @return array<string, int>
     */
    private static function mapOfTimes(mixed $value): array
    {
        $result = [];
        if (!\is_array($value)) {
            return $result;
        }
        foreach ($value as $key => $time) {
            if (\is_string($key) && is_numeric($time)) {
                $result[$key] = (int) $time;
            }
        }

        return $result;
    }

    /**
     * @return array<string, int>
     */
    private static function prunedDuplicates(mixed $value, int $since): array
    {
        $kept = [];
        foreach (self::mapOfTimes($value) as $key => $time) {
            if ($time > $since) {
                $kept[$key] = $time;
            }
        }

        return $kept;
    }
}

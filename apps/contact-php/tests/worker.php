<?php

declare(strict_types=1);

/**
 * One submission, in a process of its own.
 *
 * `LimitsTest::testTheLimitHoldsAcrossSeparateProcesses` starts several of
 * these at once against one state directory, which is the situation PHP-FPM
 * actually creates: separate processes, no shared memory, arriving together.
 * It prints `allowed` or `refused` and nothing else.
 */

namespace Koxora\Contact;

require_once __DIR__ . '/../vendor/autoload.php';

$directory = $argv[1] ?? '';
$client = $argv[2] ?? 'client';
if ($directory === '') {
    fwrite(\STDERR, "a state directory is required\n");
    exit(1);
}

$state = new SharedState($directory);
$state->prepare();
$limits = new Limits($state, 3, 3600, 60, 3600, 600);

// A fixed moment, so the window cannot expire between the first worker and
// the last and make the count depend on how fast the machine is.
$verdict = $limits->admit($client, 1700000000000);

echo $verdict['allowed'] ? 'allowed' : 'refused';

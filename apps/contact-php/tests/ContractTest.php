<?php

declare(strict_types=1);

namespace Koxora\Contact\Tests;

use Koxora\Contact\Contract;
use PHPUnit\Framework\TestCase;

/**
 * The server restates the contract of the form because it cannot import a
 * TypeScript module. This is what stops a restated constant from drifting:
 * `packages/contact` writes its own definition to `fixtures/contract.json`,
 * and the numbers here have to match it exactly.
 *
 * Change a limit in `packages/contact/src/index.ts`, run
 * `pnpm contact:contract`, and this test says the server has not been changed
 * yet.
 */
final class ContractTest extends TestCase
{
    public function testTheFieldsMatchTheSharedContract(): void
    {
        $shared = Fixtures::contract();

        self::assertSame($shared['fields'], Contract::fields());
    }

    public function testTheCategoriesMatchTheSharedContract(): void
    {
        self::assertSame(Fixtures::contract()['categories'], Contract::CATEGORIES);
    }

    public function testTheHiddenFieldNamesMatchTheSharedContract(): void
    {
        $shared = Fixtures::contract();

        self::assertSame($shared['honeypotField'], Contract::HONEYPOT_FIELD);
        self::assertSame($shared['timestampField'], Contract::TIMESTAMP_FIELD);
    }

    public function testTheFillTimesMatchTheSharedContract(): void
    {
        $shared = Fixtures::contract();

        self::assertSame($shared['minimumFillMilliseconds'], Contract::MINIMUM_FILL_MILLISECONDS);
        self::assertSame($shared['maximumFillMilliseconds'], Contract::MAXIMUM_FILL_MILLISECONDS);
    }

    public function testAnUnknownFieldIsAMistakeRatherThanADefault(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        Contract::field('telephone');
    }
}

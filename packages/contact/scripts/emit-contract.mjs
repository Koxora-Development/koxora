#!/usr/bin/env node
/**
 * Writes the contract of the contact form out as JSON.
 *
 * The browser gets these numbers from `src/index.ts`. The server cannot
 * import a TypeScript module, so `apps/contact-php/src/Contract.php` restates
 * them — and a restated constant is a constant that drifts. This file is how
 * the two are held together: it is generated from the TypeScript, committed,
 * asserted to be current by `src/index.test.ts`, and asserted to match the
 * PHP by `apps/contact-php/tests/ContractTest.php`.
 *
 * Change a limit in `src/index.ts`, run `pnpm contact:contract`, and the PHP
 * test tells you the server has not been changed yet. Forget to run it and
 * the TypeScript test tells you the file is stale. There is no path where the
 * two quietly disagree.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { contractFixture } from '../src/contract-fixture.ts';

const target = resolve(import.meta.dirname, '../fixtures/contract.json');
writeFileSync(target, `${JSON.stringify(contractFixture(), null, 2)}\n`);
process.stdout.write(`WROTE: ${target}\n`);

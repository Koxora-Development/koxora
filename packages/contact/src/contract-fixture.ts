import {
  contactCategories,
  contactFields,
  honeypotField,
  maximumFillMilliseconds,
  minimumFillMilliseconds,
  timestampField,
} from './index.ts';
/**
 * The contract as plain data, for the one consumer that cannot read
 * TypeScript: the PHP endpoint.
 *
 * `scripts/emit-contract.mjs` writes this to `fixtures/contract.json`, a test
 * asserts the committed file is current, and a PHP test asserts the server
 * agrees with it field for field.
 */
export interface ContractFixture {
  categories: readonly string[];
  honeypotField: string;
  timestampField: string;
  minimumFillMilliseconds: number;
  maximumFillMilliseconds: number;
  fields: {
    name: string;
    required: boolean;
    minLength: number;
    maxLength: number;
  }[];
}
export function contractFixture(): ContractFixture {
  return {
    categories: [...contactCategories],
    honeypotField,
    timestampField,
    minimumFillMilliseconds,
    maximumFillMilliseconds,
    fields: contactFields.map((field) => ({
      name: field.name,
      required: field.required,
      minLength: field.minLength,
      maxLength: field.maxLength,
    })),
  };
}

import { describe, expect, it } from 'vitest';
import {
  claimStatuses,
  comparisonCheckedOn,
  comparisonPages,
  dimensionGroups,
  dimensions,
  productById,
  products,
  sourceById,
  sources,
  type ClaimStatus,
} from './comparison';
import { catalog } from './catalog';
import { locales, routeById } from '../routes';
const everyClaim = dimensions.flatMap((dimension) =>
  products.map((product) => ({
    dimension,
    product,
    claim: dimension.claims[product.id],
  })),
);
describe('the comparison is complete and typed', () => {
  it('answers every question for every product', () => {
    expect(dimensions).toHaveLength(10);
    expect(products).toHaveLength(6);
    expect(everyClaim).toHaveLength(60);
    for (const { dimension, product, claim } of everyClaim) {
      expect(claim, `${dimension.id}/${product.id}`).toBeDefined();
      expect(claimStatuses).toContain(claim.status);
    }
  });
  it('says every answer in both languages', () => {
    for (const locale of locales) {
      for (const { claim } of everyClaim)
        expect(
          catalog.translate(locale, claim.noteKey).trim().length,
          `${locale} ${claim.noteKey}`,
        ).toBeGreaterThan(10);
      for (const dimension of dimensions) {
        expect(
          catalog.translate(locale, dimension.labelKey).trim().length,
        ).toBeGreaterThan(0);
        expect(
          catalog.translate(locale, dimension.descriptionKey).trim().length,
        ).toBeGreaterThan(0);
      }
      for (const product of products) {
        expect(
          catalog.translate(locale, product.descriptionKey).trim().length,
        ).toBeGreaterThan(0);
        expect(
          catalog.translate(locale, product.examinedKey).trim().length,
        ).toBeGreaterThan(0);
      }
      for (const group of dimensionGroups)
        expect(
          catalog.translate(locale, group.labelKey).trim().length,
        ).toBeGreaterThan(0);
    }
  });
  it('puts every question in a group the filter offers', () => {
    const offered = new Set(dimensionGroups.map((group) => group.id));
    for (const dimension of dimensions)
      expect(offered, dimension.id).toContain(dimension.group);
  });
});
describe('every statement about another product carries evidence', () => {
  const positive: ClaimStatus[] = ['supported', 'limited', 'notSupported'];
  it('cites a source for every claim that asserts something', () => {
    for (const { dimension, product, claim } of everyClaim) {
      if (product.id === 'koxora') continue;
      if (!positive.includes(claim.status) && claim.status !== 'info') continue;
      expect(
        claim.sources.length,
        `${dimension.id}/${product.id} asserts ${claim.status} without a source`,
      ).toBeGreaterThan(0);
    }
  });
  it('resolves every cited source', () => {
    for (const { claim } of everyClaim)
      for (const id of claim.sources)
        expect(() => sourceById(id)).not.toThrow();
  });
  it('cites only absolute, secure addresses', () => {
    for (const source of sources) {
      expect(source.url, source.id).toMatch(/^https:\/\//);
      expect(source.label.trim().length, source.id).toBeGreaterThan(5);
    }
  });
  it('records a plausible read date for every source', () => {
    const today = new Date(`${comparisonCheckedOn}T00:00:00Z`);
    for (const source of sources) {
      expect(source.checked, source.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const checked = new Date(`${source.checked}T00:00:00Z`);
      expect(Number.isNaN(checked.getTime()), source.id).toBe(false);
      // A source cannot have been read after the review that cites it.
      expect(checked.getTime(), source.id).toBeLessThanOrEqual(today.getTime());
    }
  });
  it('lists no source that nothing cites', () => {
    const cited = new Set(everyClaim.flatMap(({ claim }) => claim.sources));
    for (const source of sources) expect(cited, source.id).toContain(source.id);
  });
});
describe('Koxora is held to the same rule', () => {
  it('never claims a capability for another product as planned', () => {
    // `planned` describes documented Koxora scope. Using it for someone
    // else's product would be a statement about their roadmap.
    for (const { dimension, product, claim } of everyClaim)
      if (claim.status === 'planned')
        expect(product.id, `${dimension.id}/${product.id}`).toBe('koxora');
  });
  it('backs every Koxora answer with the repository it describes', () => {
    for (const dimension of dimensions)
      expect(dimension.claims.koxora.sources, dimension.id).toContain(
        'koxora-repo',
      );
  });
  it('marks what is not implemented as planned, not as supported', () => {
    // These are documented product scope and are not in the merged version.
    for (const id of ['collaboration', 'ai', 'integration', 'desktop'] as const)
      expect(
        dimensions.find((dimension) => dimension.id === id)!.claims.koxora
          .status,
        id,
      ).toBe('planned');
  });
  it('says plainly that there is no public release', () => {
    for (const locale of locales) {
      const examined = catalog.translate(
        locale,
        productById('koxora').examinedKey,
      );
      expect(examined.toLowerCase(), locale).toMatch(
        locale === 'en' ? /no public release/ : /keine öffentliche/,
      );
    }
  });
});
describe('the pages per product', () => {
  it('names a product that exists and questions that exist', () => {
    for (const page of comparisonPages) {
      expect(() => productById(page.product)).not.toThrow();
      expect(page.highlight.length).toBeGreaterThanOrEqual(3);
      for (const id of page.highlight)
        expect(
          dimensions.map((dimension) => dimension.id),
          `${page.product}/${id}`,
        ).toContain(id);
    }
  });
  it('lives under the comparison address in both languages', () => {
    const parent = routeById('compare');
    const routes: Record<
      string,
      'compareDrawio' | 'compareMiro' | 'compareLucidchart'
    > = {
      drawio: 'compareDrawio',
      miro: 'compareMiro',
      lucidchart: 'compareLucidchart',
    };
    for (const page of comparisonPages) {
      const route = routeById(routes[page.product]!);
      for (const locale of locales)
        expect(route.slugs[locale], `${page.product}/${locale}`).toBe(
          `${parent.slugs[locale]}/${page.product}`,
        );
    }
  });
  it('describes each page in both languages', () => {
    for (const page of comparisonPages)
      for (const locale of locales)
        for (const suffix of [
          'meta.title',
          'meta.description',
          'hero.title',
          'hero.lead',
          'strengths.body',
          'koxora.body',
          'chooseOther',
          'chooseKoxora',
        ]) {
          const key = `cmp.page.${page.product}.${suffix}`;
          expect(
            catalog.translate(locale, key as never).trim().length,
            `${locale} ${key}`,
          ).toBeGreaterThan(10);
        }
  });
});
describe('the comparison makes no unsupported superlative claim', () => {
  it('avoids wording that asserts objective superiority', () => {
    // A word boundary in a regular expression is defined on ASCII letters, so
    // it falls between the "e" and the "ä" of "bestätigt" and would flag a
    // perfectly ordinary German word. These use letter lookarounds instead.
    const forbidden = [
      /(?<!\p{L})the only(?!\p{L})/iu,
      /(?<!\p{L})best(?!\p{L})/iu,
      /(?<!\p{L})superior(?!\p{L})/iu,
      /(?<!\p{L})unlike (?:every|all)(?!\p{L})/iu,
      /(?<!\p{L})einzige[rsn]?(?!\p{L})/iu,
      /(?<!\p{L})beste[rsn]?(?!\p{L})/iu,
      /(?<!\p{L})überlegen(?!\p{L})/iu,
    ];
    for (const locale of locales)
      for (const { dimension, product, claim } of everyClaim) {
        const text = catalog.translate(locale, claim.noteKey);
        for (const pattern of forbidden)
          expect(
            pattern.test(text),
            `${locale} ${dimension.id}/${product.id}: ${text}`,
          ).toBe(false);
      }
  });
});

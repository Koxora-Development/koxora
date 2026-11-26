import { DEFAULT_APPEARANCE, type DataChart } from '@koxora/editor-core';
import { describe, expect, it } from 'vitest';
import { appendDataChart } from './data-chart-svg';

class SvgPart {
  children: SvgPart[] = [];
  textContent = '';
  constructor(
    readonly tag: string,
    readonly attrs: Record<string, string | number> = {},
  ) {}
  append(...children: SvgPart[]) {
    this.children.push(...children);
  }
}

function chartSvg(
  values: DataChart['points'][number]['value'][],
  options: Partial<DataChart> = {},
  locale = 'en',
  size = { width: 480, height: 300 },
) {
  const group = new SvgPart('g');
  appendDataChart(
    group as unknown as SVGElement,
    {
      type: 'column',
      palette: 'warm',
      title: 'Monthly revenue',
      categoryLabel: 'Month',
      valueLabel: 'Revenue',
      points: values.map((value, i) => ({ value, label: `Month ${i + 1}` })),
      rowCount: values.length,
      ...options,
    },
    size.width,
    size.height,
    DEFAULT_APPEARANCE,
    locale,
    (tag, attrs) => new SvgPart(tag, attrs) as unknown as SVGElement,
  );
  return {
    description: group.children[0],
    content: group.children[1].children,
  };
}

describe('native data chart SVG', () => {
  it('uses one zero baseline for signed columns and omits missing values', () => {
    const { content } = chartSvg([25, -15, null, 0]);
    const columns = content.filter(({ attrs }) => 'data-chart-column' in attrs);
    expect(columns.map(({ attrs }) => attrs['data-chart-column'])).toEqual([
      0, 1, 3,
    ]);
    expect(+columns[0].attrs.y + +columns[0].attrs.height).toBeCloseTo(
      +columns[1].attrs.y,
    );
    expect(columns[0].attrs.fill).not.toEqual(columns[1].attrs.fill);
    expect(columns[2].attrs.height).toBe(1);
  });

  it('starts a new line after a missing value and shows isolated points', () => {
    const { content } = chartSvg([null, 1, 2, null, 4, null], { type: 'line' });
    const line = content.find(({ attrs }) => 'data-chart-line' in attrs)!;
    expect(String(line.attrs.d).match(/[ML]/g)).toEqual(['M', 'L', 'M']);
    expect(
      content.filter(({ attrs }) => 'data-chart-point' in attrs),
    ).toHaveLength(3);
  });

  it('draws finite coordinates for signed extremes, subnormals and zeroes', () => {
    for (const values of [
      [-Number.MAX_VALUE, Number.MAX_VALUE],
      [-Number.MIN_VALUE, Number.MIN_VALUE],
      [0, 0],
    ]) {
      const { content } = chartSvg(values, { type: 'line' });
      const line = content.find(({ attrs }) => 'data-chart-line' in attrs)!;
      expect(line.attrs.d).not.toMatch(/NaN|Infinity/);
      for (const { attrs } of content)
        for (const value of Object.values(attrs))
          if (typeof value === 'number')
            expect(Number.isFinite(value)).toBe(true);
    }
  });

  it('localizes the missing-value and preview notices with bounded labels', () => {
    const { description, content } = chartSvg(
      [null, null],
      { rowCount: 10000 },
      'de',
    );
    expect(description.textContent).toContain('Keine Zahlenwerte');
    expect(description.textContent).toContain('Zeigt 2 von 10.000 Zeilen');
    expect(
      content.filter(({ attrs }) => 'data-chart-axis' in attrs),
    ).toHaveLength(2);
    expect(
      chartSvg([3], {}, 'en', { width: 10, height: 10 }).content,
    ).toHaveLength(1);
  });
});

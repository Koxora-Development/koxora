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

  it('closes each signed area run against the same baseline', () => {
    const { content } = chartSvg([4, -2, null, -3, -1], { type: 'area' });
    const area = content.find(({ attrs }) => 'data-chart-area' in attrs)!;
    const runs = String(area.attrs.d).match(/M [^M]+? Z/g)!;
    const heights = runs.map((run) =>
      [...run.matchAll(/[ML] \S+ (\S+)/g)].map(([, y]) => Number(y)),
    );
    expect(heights).toHaveLength(2);
    const baseline = heights[0][0];
    expect(heights[0][1]).toBeLessThan(baseline);
    expect(heights[0][2]).toBeGreaterThan(baseline);
    expect(heights[1][1]).toBeGreaterThan(baseline);
    for (const run of heights) {
      expect(run[0]).toBe(baseline);
      expect(run.at(-1)).toBe(baseline);
    }
  });

  it('draws a full pie for one positive category and localizes its blank label', () => {
    const { content } = chartSvg(
      [null, 0, Number.MAX_VALUE],
      {
        type: 'pie',
        pie: { status: 'ready', slices: [{ label: '', share: 1 }] },
      },
      'de',
    );
    expect(content.find(({ attrs }) => 'data-chart-slice' in attrs)?.tag).toBe(
      'circle',
    );
    expect(
      content.find(({ attrs }) => 'data-chart-pie-label' in attrs)?.textContent,
    ).toBe('Leere Kategorie');
    const percent = content.find(
      ({ attrs }) => 'data-chart-pie-share' in attrs,
    )?.textContent;
    expect(percent?.replace(/\s+/gu, '')).toBe('100%');
    expect(content.some(({ attrs }) => 'data-chart-axis' in attrs)).toBe(false);
  });

  it('matches each pie segment to its legend color and labels grouped slices and truncation', () => {
    const { content } = chartSvg([1, 2, 3], {
      type: 'pie',
      rowCount: 120,
      pie: {
        status: 'ready',
        slices: [
          { label: 'Big category', share: 0.99999 },
          { label: '', share: 0.00001, grouped: true },
        ],
      },
    });
    const segments = content.filter(({ attrs }) => 'data-chart-slice' in attrs);
    expect(segments).toHaveLength(2);
    expect(String(segments[0].attrs.d).match(/A/g)).toHaveLength(2);
    expect(
      segments.every(({ attrs }) => !/NaN|Infinity/.test(String(attrs.d))),
    ).toBe(true);
    expect(segments.map(({ attrs }) => attrs.fill)).toEqual(
      content
        .filter(({ attrs }) => 'data-chart-pie-swatch' in attrs)
        .map(({ attrs }) => attrs.fill),
    );
    expect(
      content.find(({ attrs }) => 'data-chart-pie-grouped' in attrs)
        ?.textContent,
    ).toBe('Other categories');
    expect(
      content
        .filter(({ attrs }) => 'data-chart-pie-share' in attrs)
        .map(({ textContent }) => textContent),
    ).toEqual(['> 99.9%', '< 0.1%']);
    expect(
      content.find(({ attrs }) => 'data-chart-preview' in attrs)?.textContent,
    ).toBe('Showing 3 of 120 rows');
  });

  it.each([
    ['negative', [-1, 10], 'Pie charts require nonnegative values'],
    ['empty', [0, null], 'No positive values'],
  ] as const)(
    'shows a notice for %s pies and omits wedges',
    (status, values, notice) => {
      const { description, content } = chartSvg([...values], {
        type: 'pie',
        pie: { status },
      });
      expect(content.some(({ attrs }) => 'data-chart-slice' in attrs)).toBe(
        false,
      );
      expect(
        content.find(({ attrs }) => attrs['data-chart-pie-status'] === status)
          ?.textContent,
      ).toBe(notice);
      expect(description.textContent).toContain(notice);
    },
  );

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

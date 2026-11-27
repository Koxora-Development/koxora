import { CHART_PALETTES, FONT_FAMILIES } from '@koxora/editor-core';
import type { Appearance, Bounds, DataChart } from '@koxora/editor-core';
import { translate } from '@koxora/i18n';

type SvgFactory = (
  tag: string,
  attributes?: Record<string, string | number>,
) => SVGElement;
type ChartText = (
  label: string,
  attributes: Record<string, string | number>,
) => void;

/** Use decimal steps and normalize before subtraction so a finite series never overflows. */
function chartScale(points: DataChart['points']) {
  let minimum = 0;
  let maximum = 0;
  for (const { value } of points) {
    if (value === null || !Number.isFinite(value)) continue;
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  const magnitude = Math.max(-minimum, maximum);
  if (!magnitude) maximum = 1;
  const unit = magnitude
    ? 10 ** Math.floor(Math.log10(magnitude)) || magnitude
    : 1;
  const min = minimum / unit;
  const max = maximum / unit;
  const rough = (max - min) / 4;
  const decimal = 10 ** Math.floor(Math.log10(rough));
  const step =
    ([1, 2, 2.5, 5].find((factor) => factor * decimal >= rough) ?? 10) *
    decimal;
  const first = Math.floor(min / step);
  const last = Math.ceil(max / step);
  const limit = Number.MAX_VALUE / unit;
  const low = Math.max(first * step, -limit);
  const high = Math.min(last * step, limit);
  const tickValues = Array.from({ length: last - first + 1 }, (_, index) => {
    const value = (index + first) * step * unit;
    return Math.max(-Number.MAX_VALUE, Math.min(Number.MAX_VALUE, value));
  });
  return {
    ticks: [...new Set(tickValues)],
    ratio: (value: number) =>
      Math.max(0, Math.min(1, (value / unit - low) / (high - low))),
  };
}

const formatters = new Map<
  string,
  {
    axis: Intl.NumberFormat;
    scientific: Intl.NumberFormat;
    count: Intl.NumberFormat;
    percent: Intl.NumberFormat;
  }
>();
function numberFormatters(locale: string) {
  const existing = formatters.get(locale);
  if (existing) return existing;
  const format = {
    axis: new Intl.NumberFormat(locale, { maximumSignificantDigits: 4 }),
    scientific: new Intl.NumberFormat(locale, {
      notation: 'scientific',
      maximumSignificantDigits: 4,
    }),
    count: new Intl.NumberFormat(locale),
    percent: new Intl.NumberFormat(locale, {
      style: 'percent',
      maximumFractionDigits: 1,
    }),
  };
  formatters.set(locale, format);
  return format;
}

function fittedLabel(label: string, width: number, size: number) {
  const chars = Array.from(label.replace(/\s+/gu, ' ').trim());
  const limit = Math.max(1, Math.floor(width / (size * 0.65)));
  return chars.length <= limit
    ? chars.join('')
    : `${chars
        .slice(0, limit - 1)
        .join('')
        .trimEnd()}…`;
}

function appendPieChart(
  content: SVGElement,
  chart: DataChart,
  box: Bounds,
  labelSize: number,
  locale: string,
  text: ChartText,
  svg: SvgFactory,
) {
  if (chart.pie?.status !== 'ready') return;
  const { slices } = chart.pie;
  const colors = CHART_PALETTES[chart.palette];
  const rowHeight = labelSize * 1.45;
  const legendHeight = rowHeight * (slices.length + 1);
  const inset = labelSize * 0.75;
  const inline = box.width >= Math.max(labelSize * 24, box.height * 1.05);
  const legendVisible =
    box.height >= legendHeight + (inline ? 0 : labelSize * 5);
  const diskWidth = legendVisible && inline ? box.width * 0.44 : box.width;
  const diskHeight =
    legendVisible && !inline ? box.height - legendHeight : box.height;
  const radius = Math.max(0, Math.min(diskWidth, diskHeight) / 2 - inset);
  const cx = box.x + diskWidth / 2;
  const cy = box.y + diskHeight / 2;
  const edge = (turns: number) => {
    const angle = (turns - 0.25) * 2 * Math.PI;
    return `${cx + radius * Math.cos(angle)} ${cy + radius * Math.sin(angle)}`;
  };
  const arc = (turns: number) => `A ${radius} ${radius} 0 0 1 ${edge(turns)}`;
  let start = 0;
  for (const [index, { share }] of slices.entries()) {
    const end = Math.min(1, start + share);
    if (end <= start || radius <= 0) continue;
    const attrs = {
      fill: colors[index % colors.length],
      'data-chart-slice': index,
    };
    content.append(
      end - start >= 1
        ? svg('circle', { ...attrs, cx, cy, r: radius })
        : svg('path', {
            ...attrs,
            d: `M ${cx} ${cy} L ${edge(start)} ${end - start > 0.5 ? `${arc((start + end) / 2)} ` : ''}${arc(end)} Z`,
          }),
    );
    start = end;
  }
  if (!legendVisible) return;

  const legendLeft = inline ? box.x + diskWidth + inset : box.x + inset;
  const legendRight = box.x + box.width - inset;
  const legendTop = inline
    ? box.y + (box.height - legendHeight) / 2
    : box.y + diskHeight;
  const legendWidth = legendRight - legendLeft;
  const percent = numberFormatters(locale).percent;
  const shares = slices.map(({ share }) => {
    if (share < 0.001)
      return translate(locale, 'data.chartPieSmallShare', {
        value: percent.format(0.001),
      });
    if (slices.length > 1 && share > 0.999)
      return translate(locale, 'data.chartPieLargeShare', {
        value: percent.format(0.999),
      });
    return percent.format(share);
  });
  const shareWidth =
    Math.max(...shares.map((share) => share.length)) * labelSize * 0.65;
  const categoryX = legendLeft + labelSize * 1.35;
  text(
    fittedLabel(
      `${chart.categoryLabel} · ${chart.valueLabel}`,
      legendWidth,
      labelSize,
    ),
    {
      x: legendLeft,
      y: legendTop + rowHeight / 2,
      'text-anchor': 'start',
      'font-size': labelSize,
      'font-weight': 600,
      'data-chart-pie-fields': '',
    },
  );
  for (const [index, { label, grouped }] of slices.entries()) {
    const y = legendTop + rowHeight * (index + 1.5);
    content.append(
      svg('rect', {
        x: legendLeft,
        y: y - labelSize * 0.4,
        width: labelSize * 0.8,
        height: labelSize * 0.8,
        rx: 1,
        fill: colors[index % colors.length],
        'data-chart-pie-swatch': index,
      }),
    );
    const name = grouped
      ? translate(locale, 'data.chartPieOther')
      : label.trim() || translate(locale, 'data.chartPieBlank');
    text(
      fittedLabel(
        name,
        legendRight - shareWidth - categoryX - inset,
        labelSize,
      ),
      {
        x: categoryX,
        y,
        'text-anchor': 'start',
        'font-size': labelSize,
        'data-chart-pie-label': index,
        ...(grouped ? { 'data-chart-pie-grouped': '' } : {}),
      },
    );
    text(shares[index], {
      x: legendRight,
      y,
      'text-anchor': 'end',
      'font-size': labelSize,
      'data-chart-pie-share': index,
    });
  }
}

export function appendDataChart(
  group: SVGElement,
  chart: DataChart,
  width: number,
  height: number,
  appearance: Appearance,
  locale: string,
  svg: SvgFactory,
) {
  const { type, palette, title, categoryLabel, valueLabel, points, rowCount } =
    chart;
  const number = numberFormatters(locale);
  const pieStatus = type === 'pie' ? (chart.pie?.status ?? 'empty') : null;
  const noValues =
    pieStatus === 'negative'
      ? translate(locale, 'data.chartPieNegative')
      : pieStatus === 'empty'
        ? translate(locale, 'data.chartPieEmpty')
        : pieStatus === 'ready' || points.some(({ value }) => value !== null)
          ? ''
          : translate(locale, 'data.chartNoValues');
  const preview =
    rowCount > points.length
      ? translate(locale, 'data.chartPreviewRows', {
          shown: number.count.format(points.length),
          total: number.count.format(rowCount),
        })
      : '';
  const description = svg('desc');
  description.textContent = [categoryLabel, valueLabel, noValues, preview]
    .filter(Boolean)
    .join('. ');
  const content = svg('svg', {
    width,
    height,
    overflow: 'hidden',
    opacity: appearance.opacity,
    'data-chart': type,
    'data-chart-palette': palette,
    'pointer-events': 'none',
    'font-family': FONT_FAMILIES[appearance.fontFamily],
  });
  group.append(description, content);
  if (width <= 0 || height <= 0) return;

  const padding = Math.min(16, width * 0.055, height * 0.065);
  const titleSize = Math.min(
    30,
    appearance.fontSize,
    height * 0.175,
    width * 0.135,
  );
  const text = (label: string, attributes: Record<string, string | number>) => {
    const element = svg('text', {
      class: 'scene-label',
      fill: appearance.textColor,
      'dominant-baseline': 'central',
      'text-anchor': 'middle',
      ...attributes,
    });
    element.textContent = label;
    content.append(element);
  };
  const titleX =
    appearance.align === 'left'
      ? padding
      : appearance.align === 'right'
        ? width - padding
        : width / 2;
  text(fittedLabel(title, width - 2 * padding, titleSize), {
    x: titleX,
    y: padding + titleSize / 2,
    'data-chart-title': '',
    'font-size': titleSize,
    'font-weight': appearance.fontWeight,
    'font-style': appearance.fontStyle,
    'text-decoration': appearance.textDecoration,
    'text-anchor':
      appearance.align === 'left'
        ? 'start'
        : appearance.align === 'right'
          ? 'end'
          : 'middle',
  });

  const labelSize = Math.min(12, width / 30, height / 20);
  const right = width - padding;
  const top = padding + titleSize + labelSize * 1.25;
  const previewText = (left: number) => {
    if (preview) {
      text(fittedLabel(preview, right - left, labelSize), {
        x: right,
        y: height - padding - labelSize / 2,
        'text-anchor': 'end',
        'font-size': labelSize,
        'data-chart-preview': '',
      });
    }
  };
  if (pieStatus) {
    const bottom = height - padding - (preview ? labelSize * 1.65 : 0);
    if (labelSize < 5 || bottom - top < 12) return;
    previewText(padding);
    if (noValues) {
      text(fittedLabel(noValues, right - padding, labelSize), {
        x: width / 2,
        y: (top + bottom) / 2,
        'font-size': labelSize,
        'data-chart-pie-status': pieStatus,
      });
    } else {
      appendPieChart(
        content,
        chart,
        {
          x: padding,
          y: top,
          width: right - padding,
          height: bottom - top,
        },
        labelSize,
        locale,
        text,
        svg,
      );
    }
    return;
  }

  const scale = chartScale(points);
  const tickLabels = scale.ticks.map((value) => {
    const abs = Math.abs(value);
    return (
      abs >= 1e7 || (abs !== 0 && abs < 1e-4) ? number.scientific : number.axis
    ).format(value);
  });
  const tickWidth =
    Math.max(...tickLabels.map((label) => label.length)) * labelSize * 0.64;
  const left = padding + labelSize * 1.8 + tickWidth;
  const bottom = height - padding - labelSize * (preview ? 4.8 : 3.4);
  if (labelSize < 5 || right - left < 12 || bottom - top < 12) return;

  const y = (value: number) => bottom - scale.ratio(value) * (bottom - top);
  const plotHeight = bottom - top;
  const plotWidth = right - left;
  const tick = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    opacity: number,
  ) =>
    svg('line', {
      x1,
      y1,
      x2,
      y2,
      stroke: appearance.textColor,
      'stroke-opacity': opacity,
    });
  const zero = y(0);
  for (const [index, value] of scale.ticks.entries()) {
    const position = y(value);
    content.append(
      tick(left, position, right, position, value === 0 ? 0.55 : 0.17),
    );
    if (plotHeight / (scale.ticks.length - 1) > labelSize || value === 0) {
      text(tickLabels[index], {
        x: left - labelSize * 0.5,
        y: position,
        'text-anchor': 'end',
        'font-size': labelSize,
        'data-chart-tick': '',
      });
    }
  }
  content.append(tick(left, top, left, bottom, 0.5));
  const middleY = (top + bottom) / 2;
  const axisX = padding + labelSize / 2;
  text(fittedLabel(valueLabel, plotHeight, labelSize), {
    x: axisX,
    y: middleY,
    transform: `rotate(-90 ${axisX} ${middleY})`,
    'font-weight': 600,
    'font-size': labelSize,
    'data-chart-axis': 'value',
  });
  text(fittedLabel(categoryLabel, plotWidth, labelSize), {
    x: (left + right) / 2,
    y: bottom + labelSize * 2.5,
    'font-weight': 600,
    'font-size': labelSize,
    'data-chart-axis': 'category',
  });
  previewText(left);
  if (noValues) {
    text(fittedLabel(noValues, plotWidth, labelSize), {
      x: (left + right) / 2,
      y: middleY,
      'font-size': labelSize,
      'data-chart-no-values': '',
    });
    return;
  }

  const slot = plotWidth / points.length;
  const x = (index: number) => left + (index + 0.5) * slot;
  const colors = CHART_PALETTES[palette];
  const barWidth = Math.min(slot * 0.72, 46);
  const linePath: string[] = [];
  const areaPath: string[] = [];
  const dots: SVGElement[] = [];
  let connects = false;
  let runEnd: number | null = null;
  const closeAreaRun = () => {
    if (runEnd === null) return;
    areaPath.push(`L ${runEnd} ${zero} Z`);
    runEnd = null;
  };
  for (const [index, { value }] of points.entries()) {
    if (value === null) {
      closeAreaRun();
      connects = false;
      continue;
    }
    const px = x(index);
    const py = y(value);
    if (type === 'column') {
      content.append(
        svg('rect', {
          x: px - barWidth / 2,
          y: value === 0 ? Math.max(top, zero - 1) : Math.min(py, zero),
          width: barWidth,
          height: value === 0 ? 1 : Math.abs(zero - py),
          fill: colors[index % colors.length],
          'data-chart-column': index,
        }),
      );
      continue;
    }
    if (type === 'area') {
      if (!connects) areaPath.push(`M ${px} ${zero}`);
      areaPath.push(`L ${px} ${py}`);
      runEnd = px;
    }
    linePath.push(`${connects ? 'L' : 'M'} ${px} ${py}`);
    connects = true;
    dots.push(
      svg('circle', {
        cx: px,
        cy: py,
        r: Math.min(2.8, Math.max(1, slot * 0.24)),
        fill: colors[0],
        'data-chart-point': index,
      }),
    );
  }
  closeAreaRun();
  if (areaPath.length) {
    content.append(
      svg('path', {
        d: areaPath.join(' '),
        fill: colors[0],
        'fill-opacity': 0.25,
        'data-chart-area': '',
      }),
    );
  }
  if (linePath.length) {
    content.append(
      svg('path', {
        d: linePath.join(' '),
        fill: 'none',
        stroke: colors[0],
        'stroke-width': 2.4,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'data-chart-line': '',
      }),
      ...dots,
    );
  }

  const count = Math.min(
    points.length,
    12,
    Math.max(1, Math.floor(plotWidth / (labelSize * 4.8))),
  );
  const labelWidth = (plotWidth / count) * 0.9;
  for (let pick = 0; pick < count; pick++) {
    const index =
      count === 1
        ? Math.floor(points.length / 2)
        : Math.round((pick * (points.length - 1)) / (count - 1));
    const position = x(index);
    const anchor =
      position - labelWidth / 2 < left
        ? 'start'
        : position + labelWidth / 2 > right
          ? 'end'
          : 'middle';
    content.append(
      tick(position, bottom, position, bottom + labelSize * 0.27, 0.5),
    );
    text(
      fittedLabel(
        points[index].label,
        anchor === 'middle' ? labelWidth : labelWidth / 2,
        labelSize,
      ),
      {
        x: position,
        y: bottom + labelSize * 0.9,
        'font-size': labelSize,
        'text-anchor': anchor,
        'data-chart-category': index,
      },
    );
  }
}

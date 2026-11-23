import type {
  ConnectionOptions,
  EndpointMarker,
  LineStyle,
} from '@koxora/editor-core';
export type ConnectionPreset = {
  id: string;
  routing: ConnectionOptions['routing'];
  arrow: boolean;
  startArrow: boolean;
  lineStyle?: LineStyle;
  sourceMarker?: EndpointMarker;
  targetMarker?: EndpointMarker;
};
/** Named connection choices use the same portable options for attached and free ends. */
export const connectionPresets: readonly ConnectionPreset[] = [
  { id: 'straight-line', routing: 'straight', arrow: false, startArrow: false },
  { id: 'straight-arrow', routing: 'straight', arrow: true, startArrow: false },
  { id: 'straight-both', routing: 'straight', arrow: true, startArrow: true },
  { id: 'elbow-line', routing: 'orthogonal', arrow: false, startArrow: false },
  { id: 'elbow-arrow', routing: 'orthogonal', arrow: true, startArrow: false },
  { id: 'elbow-both', routing: 'orthogonal', arrow: true, startArrow: true },
  { id: 'curved-line', routing: 'curved', arrow: false, startArrow: false },
  { id: 'curved-arrow', routing: 'curved', arrow: true, startArrow: false },
  { id: 'curved-both', routing: 'curved', arrow: true, startArrow: true },
  {
    id: 'dashed-line',
    routing: 'straight',
    arrow: false,
    startArrow: false,
    lineStyle: 'dashed',
  },
  {
    id: 'dashed-arrow',
    routing: 'straight',
    arrow: true,
    startArrow: false,
    lineStyle: 'dashed',
  },
  {
    id: 'dotted-line',
    routing: 'straight',
    arrow: false,
    startArrow: false,
    lineStyle: 'dotted',
  },
  {
    id: 'dotted-arrow',
    routing: 'straight',
    arrow: true,
    startArrow: false,
    lineStyle: 'dotted',
  },
  {
    id: 'open-arrow',
    routing: 'straight',
    arrow: true,
    startArrow: false,
    targetMarker: 'open-arrow',
  },
  {
    id: 'elbow-open-arrow',
    routing: 'orthogonal',
    arrow: true,
    startArrow: false,
    targetMarker: 'open-arrow',
  },
  {
    id: 'open-diamond',
    routing: 'straight',
    arrow: false,
    startArrow: false,
    sourceMarker: 'diamond',
  },
  {
    id: 'filled-diamond',
    routing: 'straight',
    arrow: false,
    startArrow: false,
    sourceMarker: 'filled-diamond',
  },
  {
    id: 'circle-ends',
    routing: 'straight',
    arrow: false,
    startArrow: false,
    sourceMarker: 'circle',
    targetMarker: 'circle',
  },
  {
    id: 'bar-ends',
    routing: 'straight',
    arrow: false,
    startArrow: false,
    sourceMarker: 'bar',
    targetMarker: 'bar',
  },
  {
    id: 'dashed-open-arrow',
    routing: 'straight',
    arrow: true,
    startArrow: false,
    lineStyle: 'dashed',
    targetMarker: 'open-arrow',
  },
];
export function applyConnectionPreset(
  options: ConnectionOptions,
  preset: ConnectionPreset,
): ConnectionOptions {
  const next = { ...options };
  delete next.lineStyle;
  delete next.sourceMarker;
  delete next.targetMarker;
  const { id, ...appearance } = preset;
  void id;
  return { ...next, ...appearance };
}
export function connectionPresetMatches(
  options: ConnectionOptions,
  preset: ConnectionPreset,
): boolean {
  return (
    options.routing === preset.routing &&
    options.arrow === preset.arrow &&
    (options.startArrow ?? false) === preset.startArrow &&
    (options.lineStyle ?? 'solid') === (preset.lineStyle ?? 'solid') &&
    (options.sourceMarker ?? (options.startArrow ? 'arrow' : 'none')) ===
      (preset.sourceMarker ?? (preset.startArrow ? 'arrow' : 'none')) &&
    (options.targetMarker ?? (options.arrow ? 'arrow' : 'none')) ===
      (preset.targetMarker ?? (preset.arrow ? 'arrow' : 'none'))
  );
}

/** Required when portable connectors use explicit line patterns or endpoint markers. */
export const CONNECTION_DECORATIONS_FEATURE = 'connection-decorations-v1';
export const LINE_STYLES = ['solid', 'dashed', 'dotted'] as const;
export type LineStyle = (typeof LINE_STYLES)[number];
export const ENDPOINT_MARKERS = [
  'none',
  'arrow',
  'open-arrow',
  'diamond',
  'filled-diamond',
  'circle',
  'bar',
] as const;
export type EndpointMarker = (typeof ENDPOINT_MARKERS)[number];
export function isLineStyle(value: unknown): value is LineStyle {
  return typeof value === 'string' && LINE_STYLES.includes(value as LineStyle);
}
export function isEndpointMarker(value: unknown): value is EndpointMarker {
  return (
    typeof value === 'string' &&
    ENDPOINT_MARKERS.includes(value as EndpointMarker)
  );
}
/** Options and raw extension payloads both use these same optional field names. */
export function hasConnectionDecorations(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return ['lineStyle', 'sourceMarker', 'targetMarker'].some(
    (key) => data[key] !== undefined,
  );
}
export function validConnectionDecorations(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return (
    (data.lineStyle === undefined || isLineStyle(data.lineStyle)) &&
    (data.sourceMarker === undefined || isEndpointMarker(data.sourceMarker)) &&
    (data.targetMarker === undefined || isEndpointMarker(data.targetMarker))
  );
}

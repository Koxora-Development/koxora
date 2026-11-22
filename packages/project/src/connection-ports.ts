/** Required for normalized local anchors and ordinary junction nodes. */
export const CONNECTION_PORTS_FEATURE = 'connection-ports-v1';
export const LEGACY_CONNECTION_ANCHORS = [
  'auto',
  'north',
  'east',
  'south',
  'west',
] as const;
export type LegacyConnectionAnchor = (typeof LEGACY_CONNECTION_ANCHORS)[number];
/** A local direction from the element center, projected onto its visible contour. */
export type NormalizedConnectionAnchor = { x: number; y: number };
export type ConnectionAnchor =
  LegacyConnectionAnchor | NormalizedConnectionAnchor;
export function isNormalizedConnectionAnchor(
  value: unknown,
): value is NormalizedConnectionAnchor {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.x === 'number' &&
    Number.isFinite(data.x) &&
    data.x >= 0 &&
    data.x <= 1 &&
    typeof data.y === 'number' &&
    Number.isFinite(data.y) &&
    data.y >= 0 &&
    data.y <= 1 &&
    (data.x !== 0.5 || data.y !== 0.5)
  );
}
export function isConnectionAnchor(value: unknown): value is ConnectionAnchor {
  return (
    (typeof value === 'string' &&
      LEGACY_CONNECTION_ANCHORS.includes(value as LegacyConnectionAnchor)) ||
    isNormalizedConnectionAnchor(value)
  );
}
/** Callers must separately establish the supported connection extension version. */
export function hasConnectionPorts(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return (
    isNormalizedConnectionAnchor(data.sourceAnchor) ||
    isNormalizedConnectionAnchor(data.targetAnchor)
  );
}

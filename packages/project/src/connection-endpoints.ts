import type { Point } from './types';

/** Required for floating endpoints and a connector's independent start arrowhead. */
export const FLOATING_CONNECTIONS_FEATURE = 'floating-connection-endpoints-v1';
export const CONNECTION_COORDINATE_LIMIT = 1e9;

export function validConnectionPoint(value: unknown): value is Point {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const point = value as Record<string, unknown>;
  return [point.x, point.y].every(
    (coordinate) =>
      typeof coordinate === 'number' &&
      Number.isFinite(coordinate) &&
      Math.abs(coordinate) <= CONNECTION_COORDINATE_LIMIT,
  );
}

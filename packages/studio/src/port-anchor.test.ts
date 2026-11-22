import { describe, expect, it } from 'vitest';
import { parsePortAnchor, portAnchorId, portAnchorLabel } from './port-anchor';

describe('HTML connection anchor values', () => {
  it('round trips stable normalized positions and legacy directions', () => {
    for (const anchor of ['auto', 'north', { x: 0.25, y: 1 }] as const)
      expect(parsePortAnchor(portAnchorId(anchor))).toEqual(anchor);
    expect(portAnchorId({ y: 1, x: 0.25 })).toBe('{"x":0.25,"y":1}');
    expect(portAnchorLabel('en', { x: 0.25, y: 1 })).toBe(
      '25% across, 100% down',
    );
    expect(portAnchorLabel('de', 'north')).toBe('Oben');
  });

  it('refuses malformed, unbounded and directionless DOM values', () => {
    for (const value of [
      undefined,
      '',
      'future',
      '{',
      'null',
      '[]',
      '{"x":0.5,"y":0.5}',
      '{"x":2,"y":0}',
      ' '.repeat(101),
    ])
      expect(parsePortAnchor(value)).toBe('auto');
  });
});

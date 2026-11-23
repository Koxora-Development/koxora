import type { EndpointMarker } from '@koxora/editor-core';
/** Trusted marker geometry is shared by the palette and actual SVG renderer. The tip is (0,0). */
export function connectionMarkerGeometry(
  marker: EndpointMarker,
  size: number,
): { path: string; filled: boolean } {
  switch (marker) {
    case 'arrow':
      return {
        path: `M 0 0 L ${-size} ${-size / 2} L ${-size} ${size / 2} Z`,
        filled: true,
      };
    case 'open-arrow':
      return {
        path: `M ${-size} ${-size / 2} L 0 0 L ${-size} ${size / 2}`,
        filled: false,
      };
    case 'diamond':
    case 'filled-diamond':
      return {
        path: `M 0 0 L ${-size / 2} ${-size / 2} L ${-size} 0 L ${-size / 2} ${size / 2} Z`,
        filled: marker === 'filled-diamond',
      };
    case 'circle':
      return {
        path: `M 0 0 A ${size / 2} ${size / 2} 0 1 0 ${-size} 0 A ${size / 2} ${size / 2} 0 1 0 0 0 Z`,
        filled: false,
      };
    case 'bar':
      return { path: `M 0 ${-size / 2} V ${size / 2}`, filled: false };
    case 'none':
      return { path: '', filled: false };
  }
}

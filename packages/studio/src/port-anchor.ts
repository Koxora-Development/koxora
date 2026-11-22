import { isConnectionAnchor, type Anchor } from '@koxora/editor-core';
import { translate } from '@koxora/i18n';

/** Stable identifiers bridge normalized anchors and native HTML controls. */
export function portAnchorId(anchor: Anchor): string {
  return typeof anchor === 'string'
    ? anchor
    : JSON.stringify({ x: anchor.x, y: anchor.y });
}

export function parsePortAnchor(value: string | undefined): Anchor {
  if (isConnectionAnchor(value)) return value;
  if (!value || value.length > 100) return 'auto';
  try {
    const parsed: unknown = JSON.parse(value);
    return isConnectionAnchor(parsed) ? parsed : 'auto';
  } catch {
    return 'auto';
  }
}

export function portAnchorLabel(locale: string, anchor: Anchor): string {
  return typeof anchor === 'string'
    ? translate(locale, `ports.${anchor}`)
    : translate(locale, 'ports.position', {
        x: Math.round(anchor.x * 100),
        y: Math.round(anchor.y * 100),
      });
}

import type { ShapeKind } from '@koxora/editor-core';

export type LibraryElement = ShapeKind | 'freehand';
export const libraryCategories = [
  'basic',
  'flowchart',
  'symbols',
  'drawing',
  'polygons',
  'stars',
  'block-arrows',
  'callouts',
  'badges',
  'buildings',
  'communication',
  'devices',
  'network',
  'storage',
  'security',
] as const;
export type LibraryCategory = (typeof libraryCategories)[number];
export const libraryElementKinds: Readonly<
  Record<LibraryCategory, readonly string[]>
> = {
  polygons: ['kite', 'heptagon', 'nonagon', 'decagon'],
  stars: ['star-4', 'star-5', 'star-6', 'star-8', 'star-12'],
  network: [
    'network-switch',
    'router',
    'wireless-router',
    'access-point',
    'load-balancer',
    'gateway',
    'network-hub',
    'patch-panel',
    'ethernet-port',
    'cloud-network',
    'satellite',
    'antenna',
  ],
  storage: ['storage-array', 'nas', 'hard-drive', 'ssd', 'usb-drive', 'memory'],
  security: ['firewall', 'lock', 'key', 'shield-check'],
  'block-arrows': [
    'block-arrow-four-way',
    'block-arrow-three-way',
    'block-arrow-up-right',
    'block-arrow-down-right',
    'block-arrow-pentagon',
    'striped-arrow',
    'wide-chevron',
    'block-arrow-right',
    'block-arrow-left',
    'block-arrow-up',
    'block-arrow-down',
    'block-arrow-both',
    'block-arrow-vertical',
    'notched-arrow',
  ],
  callouts: ['speech-bubble', 'speech-bubble-right', 'burst'],
  badges: ['shield', 'bookmark', 'ribbon', 'ticket'],
  buildings: ['house', 'factory'],
  communication: ['envelope'],
  devices: [
    'monitor',
    'laptop',
    'phone',
    'server',
    'server-rack',
    'blade-server',
    'workstation',
    'printer',
    'tablet',
    'ip-phone',
    'cloud-server',
    'cpu',
    'camera',
    'video-camera',
    'folder',
  ],
  basic: [
    'rectangle',
    'rounded-rectangle',
    'ellipse',
    'triangle',
    'hexagon',
    'parallelogram',
    'trapezoid',
    'pentagon',
    'octagon',
    'text',
    'container',
    'table',
  ],
  flowchart: [
    'manual-input',
    'manual-operation',
    'offpage',
    'delay',
    'display',
    'internal-storage',

    'rectangle',
    'rounded-rectangle',
    'diamond',
    'parallelogram',
    'document',
    'database',
    'predefined-process',
    'trapezoid',
    'chevron',
    'text',
    'table',
  ],
  symbols: ['cloud', 'note', 'cross'],
  drawing: ['freehand'],
};
export const libraryPreferenceKey = 'koxora.element-libraries.v1';

/** Keep a predictable quick toolbar even after larger libraries are installed. */
export function quickElementKinds<T extends string>(
  elements: readonly T[],
): T[] {
  const quick = elements.slice(0, 24);
  const pen = elements.find((kind) => kind === 'freehand');
  if (pen && !quick.includes(pen)) quick[quick.length - 1] = pen;
  return quick;
}
export interface LibraryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Unknown future categories do not disable the categories this reader understands. */
export function readLibrarySelection(
  storage: Pick<LibraryStorage, 'getItem'>,
): LibraryCategory[] {
  const fallback = () => [...libraryCategories];
  try {
    const value: unknown = JSON.parse(
      storage.getItem(libraryPreferenceKey) ?? 'null',
    );
    if (typeof value !== 'object' || value === null) return fallback();
    const data = value as Record<string, unknown>;
    if (
      data.version !== 1 ||
      !Array.isArray(data.selected) ||
      data.selected.some((item) => typeof item !== 'string')
    )
      return fallback();
    const selected = libraryCategories.filter((item) =>
      (data.selected as string[]).includes(item),
    );
    return selected.length || data.selected.length === 0
      ? selected
      : fallback();
  } catch {
    return fallback();
  }
}

/** The in-memory selection remains usable if local preferences cannot be stored. */
export function writeLibrarySelection(
  storage: Pick<LibraryStorage, 'setItem' | 'removeItem'>,
  selected: readonly LibraryCategory[],
  remember: boolean,
): boolean {
  try {
    if (!remember) storage.removeItem(libraryPreferenceKey);
    else
      storage.setItem(
        libraryPreferenceKey,
        JSON.stringify({
          version: 1,
          selected: libraryCategories.filter((item) => selected.includes(item)),
        }),
      );
    return true;
  } catch {
    return false;
  }
}

import type { MessageKey } from '@koxora/i18n';

export const EDIT_KEYS = {
  a: 'selectAll',
  d: 'duplicate',
  c: 'copy',
  v: 'paste',
  z: 'undo',
  y: 'redo',
} as const;
export function editingShortcut(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}) {
  if (!event.ctrlKey && !event.metaKey) return null;
  const key = event.key.toLowerCase() as keyof typeof EDIT_KEYS;
  return key === 'z' && event.shiftKey ? 'redo' : (EDIT_KEYS[key] ?? null);
}
export const PAN_KEYS = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};
export const ZOOM_KEYS = ['+', '=', '-', '0', 'Home'];
export const PALETTE_KEYS = [
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
];
export const helpShortcut = (key: string) => key === 'F1' || key === '?';
export const isMacPlatform = (platform: string) =>
  /Mac|iPhone|iPad|iPod/i.test(platform);

export const SHORTCUT_GROUPS: {
  title: MessageKey;
  entries: { keys: MessageKey; action: MessageKey }[];
}[] = [
  {
    title: 'shortcuts.workbook',
    entries: [
      { keys: 'shortcuts.keys.tabs', action: 'shortcuts.tabs' },
      { keys: 'shortcuts.keys.moveTab', action: 'shortcuts.moveTab' },
      { keys: 'shortcuts.keys.renameTab', action: 'shortcuts.renameTab' },
      { keys: 'shortcuts.keys.formatText', action: 'shortcuts.formatText' },
      { keys: 'shortcuts.keys.stack', action: 'shortcuts.stack' },
      { keys: 'shortcuts.keys.pen', action: 'shortcuts.pen' },
    ],
  },
  {
    title: 'shortcuts.navigation',
    entries: [
      { keys: 'shortcuts.keys.pan', action: 'shortcuts.pan' },
      { keys: 'shortcuts.keys.wheel', action: 'shortcuts.wheel' },
      { keys: 'shortcuts.keys.zoomWheel', action: 'shortcuts.zoomWheel' },
      { keys: 'shortcuts.keys.arrows', action: 'shortcuts.panKeys' },
      { keys: 'shortcuts.keys.zoom', action: 'shortcuts.zoom' },
      { keys: 'shortcuts.keys.reset', action: 'shortcuts.reset' },
      { keys: 'shortcuts.keys.fit', action: 'shortcuts.fit' },
    ],
  },
  {
    title: 'shortcuts.selection',
    entries: [
      { keys: 'shortcuts.keys.select', action: 'shortcuts.select' },
      { keys: 'shortcuts.keys.all', action: 'shortcuts.all' },
      { keys: 'shortcuts.keys.tab', action: 'shortcuts.focus' },
      { keys: 'shortcuts.keys.palette', action: 'shortcuts.palette' },
      { keys: 'shortcuts.keys.activate', action: 'shortcuts.activate' },
    ],
  },
  {
    title: 'shortcuts.insertion',
    entries: [
      { keys: 'shortcuts.keys.place', action: 'shortcuts.place' },
      { keys: 'shortcuts.keys.enter', action: 'shortcuts.insertCenter' },
      { keys: 'shortcuts.keys.link', action: 'shortcuts.link' },
      { keys: 'shortcuts.keys.escape', action: 'shortcuts.cancel' },
    ],
  },
  {
    title: 'shortcuts.manipulation',
    entries: [
      { keys: 'shortcuts.keys.drag', action: 'shortcuts.moveResize' },
      { keys: 'shortcuts.keys.arrows', action: 'shortcuts.nudge' },
      { keys: 'shortcuts.keys.shiftArrows', action: 'shortcuts.nudgeFast' },
      { keys: 'shortcuts.keys.alt', action: 'shortcuts.unsnap' },
      { keys: 'shortcuts.keys.shiftDrag', action: 'shortcuts.aspect' },
      { keys: 'shortcuts.keys.delete', action: 'shortcuts.delete' },
      { keys: 'shortcuts.keys.duplicate', action: 'shortcuts.duplicate' },
    ],
  },
  {
    title: 'shortcuts.text',
    entries: [
      { keys: 'shortcuts.keys.properties', action: 'shortcuts.properties' },
      { keys: 'shortcuts.keys.enter', action: 'shortcuts.newline' },
      { keys: 'shortcuts.keys.apply', action: 'shortcuts.apply' },
      { keys: 'shortcuts.keys.escape', action: 'shortcuts.closeProperties' },
      { keys: 'shortcuts.keys.textNative', action: 'shortcuts.textNative' },
    ],
  },
  {
    title: 'shortcuts.history',
    entries: [
      { keys: 'shortcuts.keys.undo', action: 'shortcuts.undo' },
      { keys: 'shortcuts.keys.redo', action: 'shortcuts.redo' },
      { keys: 'shortcuts.keys.copy', action: 'shortcuts.copy' },
      { keys: 'shortcuts.keys.paste', action: 'shortcuts.paste' },
    ],
  },
  {
    title: 'shortcuts.project',
    entries: [
      { keys: 'shortcuts.keys.rename', action: 'shortcuts.rename' },
      { keys: 'shortcuts.keys.enterEscape', action: 'shortcuts.renameCommit' },
      { keys: 'shortcuts.keys.tab', action: 'shortcuts.projectActions' },
      { keys: 'shortcuts.keys.help', action: 'shortcuts.openHelp' },
    ],
  },
];

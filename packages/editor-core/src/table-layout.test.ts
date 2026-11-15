import { describe, expect, it } from 'vitest';
import { rotatePoint } from './shapes';
import { tableCellBoxes, textRegionAt, textRegionBox } from './table-layout';
import type { TableTextRegions } from './text-regions';

const table: TableTextRegions = {
  version: 1,
  type: 'table',
  headerRow: true,
  cells: [
    ['Header', '', 'Other'],
    ['', '', 'Tail'],
    ['Last', '', 'End'],
  ],
  merges: [{ row: 0, column: 0, rowSpan: 2, columnSpan: 2 }],
};
const geometry = { x: 100, y: 200, width: 300, height: 180, rotation: 0 };

describe('structured region layout', () => {
  it('lays out each merged anchor once while omitting its covered cells', () => {
    const cells = tableCellBoxes(table, 300, 180);
    expect(cells).toHaveLength(6);
    expect(cells[0]).toEqual({
      row: 0,
      column: 0,
      rowSpan: 2,
      columnSpan: 2,
      box: { x: 0, y: 0, width: 200, height: 120 },
    });
    expect(cells.map((cell) => [cell.row, cell.column])).toEqual([
      [0, 0],
      [0, 2],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ]);
    expect(
      textRegionBox(
        { kind: 'table', geometry, textRegions: table },
        { type: 'table-cell', row: 1, column: 1 },
      ),
    ).toEqual({ x: 6, y: 4, width: 188, height: 112 });
  });

  it.each([0, 90, 135, -45])(
    'hits rotated and mirrored merged cells at %s degrees without mirroring glyphs',
    (rotation) => {
      for (const flipX of [false, true])
        for (const flipY of [false, true]) {
          const g = { ...geometry, rotation, flipX, flipY };
          const node = { kind: 'table', geometry: g, textRegions: table };
          const logical = { x: 150, y: 90 };
          const physical = {
            x: g.x + (flipX ? g.width - logical.x : logical.x),
            y: g.y + (flipY ? g.height - logical.y : logical.y),
          };
          const world = rotatePoint(physical, { x: 250, y: 290 }, rotation);
          const corner = rotatePoint(
            { x: g.x, y: g.y },
            { x: 250, y: 290 },
            rotation,
          );
          expect(textRegionAt(node, corner)).not.toBeNull();
          expect(textRegionAt(node, world)).toEqual({
            type: 'table-cell',
            row: 0,
            column: 0,
          });
          expect(
            textRegionBox(node, { type: 'table-cell', row: 1, column: 1 }),
          ).toEqual({
            x: flipX ? 106 : 6,
            y: flipY ? 64 : 4,
            width: 188,
            height: 112,
          });
        }
    },
  );

  it('distinguishes empty container title and body hits after a vertical flip', () => {
    const node = { kind: 'container', geometry: { ...geometry, flipY: true } };
    expect(textRegionAt(node, { x: 150, y: 370 })).toEqual({
      type: 'container-title',
    });
    expect(textRegionAt(node, { x: 150, y: 220 })).toEqual({
      type: 'container-body',
    });
    expect(textRegionBox(node, { type: 'container-title' })).toEqual({
      x: 10,
      y: 143,
      width: 280,
      height: 34,
    });
    expect(textRegionAt(node, { x: 99, y: 250 })).toBeNull();
  });

  it('does not invent editable regions for opaque tables, unrelated shapes or invalid targets', () => {
    expect(
      textRegionAt({ kind: 'table', geometry }, { x: 150, y: 220 }),
    ).toBeNull();
    expect(
      textRegionAt({ kind: 'rectangle', geometry }, { x: 150, y: 220 }),
    ).toBeNull();
    expect(
      textRegionBox(
        { kind: 'table', geometry, textRegions: table },
        { type: 'table-cell', row: 20, column: 0 },
      ),
    ).toBeNull();
    expect(
      textRegionBox(
        { kind: 'container', geometry },
        { type: 'table-cell', row: 0, column: 0 },
      ),
    ).toBeNull();
  });
});

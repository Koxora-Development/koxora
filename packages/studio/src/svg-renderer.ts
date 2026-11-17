import { connectionMarkerGeometry } from './connection-marker';
import {
  gridStep,
  rotatePoint,
  shapeCenter,
  freehandPath,
  freehandTextBox,
  textColor,
  contrastingColor,
  tableCellAnchor,
  tableCellBoxes,
  tableAxisOffsets,
  evaluateTable,
  calculatedCellRichText,
  mirroredTextBox,
  type RichText,
  type EndpointMarker,
  type Appearance,
  FONT_FAMILIES,
  isDrawing,
  lineEndpoints,
  resizeHandles,
  handlePoint,
  type Bounds,
  shapeRegistry,
  containerTextBoxes,
  sceneDisplayText,
  isShapeKind,
  type SceneNode,
  type SceneConnection,
  visibleBounds,
  visibleScene,
  type CanvasState,
  type Scene,
  type Size,
  type Point,
} from '@koxora/editor-core';
const NS = 'http://www.w3.org/2000/svg';
const MAX_VISIBLE = 1500;
/** Owns only the SVG subtree passed to it. Never reads or writes project data. */
export class SvgRenderer {
  private elements = new Map<string, SVGElement>();
  private models = new Map<string, SceneNode | SceneConnection>();
  private overlay = svg('g', { class: 'selection-overlay' });
  constructor(
    private root: SVGGElement,
    private pattern: SVGPatternElement,
    private grid: SVGRectElement,
  ) {}
  render(
    scene: Scene,
    state: CanvasState,
    size: Size,
    sourceId: string | null = null,
    selected: readonly string[] = [],
    marquee: Bounds | null = null,
    snapping = false,
    targets: readonly string[] = [],
    connectionPreview: {
      start: Point;
      end: Point;
      arrow: boolean;
      startArrow?: boolean;
    } | null = null,
    linkTitles: ReadonlyMap<string, string> = new Map(),
    highlighted: string | null = null,
  ): boolean {
    const { camera, grid } = state;
    const step = gridStep(grid.spacing, camera.zoom) * camera.zoom;
    const tx = size.width / 2 - camera.x * camera.zoom,
      ty = size.height / 2 - camera.y * camera.zoom;
    this.root.setAttribute(
      'transform',
      `translate(${tx} ${ty}) scale(${camera.zoom})`,
    );
    this.pattern.setAttribute('width', String(step));
    this.pattern.setAttribute('height', String(step));
    this.pattern.setAttribute('x', String(((tx % step) + step) % step));
    this.pattern.setAttribute('y', String(((ty % step) + step) % step));
    this.grid.style.display = grid.visible ? '' : 'none';
    const visible = visibleScene(scene, visibleBounds(camera, size));
    const wanted = new Set<string>();
    const targetIds = new Set(targets);
    const add = (
      key: string,
      model: SceneNode | SceneConnection,
      create: () => SVGElement,
    ) => {
      wanted.add(key);
      if (this.models.get(key) !== model) {
        this.elements.get(key)?.remove();
        this.elements.delete(key);
      }
      this.models.set(key, model);
      if (!this.elements.has(key)) {
        const element = create();
        this.elements.set(key, element);
        this.root.append(element);
      }
      const element = this.elements.get(key)!;
      const linkTitle = linkTitles.get(model.id);
      element.toggleAttribute('data-linked', !!linkTitle);
      const title = element.querySelector('title');
      const label = sceneDisplayText(model);
      if (title)
        title.textContent = linkTitle ? `${label} — ${linkTitle}` : label;
      this.elements
        .get(key)!
        .classList.toggle('connection-source', key === `node:${sourceId}`);
      this.elements
        .get(key)!
        .classList.toggle('connection-target', targetIds.has(model.id));
    };
    const entries = [
      ...visible.connections.slice(0, MAX_VISIBLE).map((edge) => ({
        key: `edge:${edge.id}`,
        model: edge,
        order: edge.paintOrder,
        create: () => renderEdge(edge),
      })),
      ...visible.nodes.slice(0, MAX_VISIBLE).map((node) => ({
        key: `node:${node.id}`,
        model: node,
        order: node.paintOrder,
        create: () => renderNode(node),
      })),
    ].sort((a, b) => a.order - b.order);
    for (const entry of entries) add(entry.key, entry.model, entry.create);
    for (const [key, element] of this.elements)
      if (!wanted.has(key)) {
        element.remove();
        this.elements.delete(key);
        this.models.delete(key);
      }
    // Culling must not change paint order when earlier elements re-enter the view.
    let cursor = this.root.firstElementChild;
    for (const key of wanted) {
      const element = this.elements.get(key)!;
      if (element !== cursor) this.root.insertBefore(element, cursor);
      cursor = element.nextElementSibling;
    }
    this.overlay.replaceChildren();
    const target = [...scene.nodes, ...scene.connections].find(
      (item) => item.id === highlighted,
    );
    if (target) {
      const b = target.bounds,
        margin = 7 / camera.zoom;
      this.overlay.append(
        svg('rect', {
          x: b.x - margin,
          y: b.y - margin,
          width: b.width + 2 * margin,
          height: b.height + 2 * margin,
          fill: 'none',
          stroke: 'var(--accent)',
          'stroke-width': 3 / camera.zoom,
          'pointer-events': 'none',
          'data-navigation-highlight': target.id,
        }),
      );
    }
    if (connectionPreview) {
      const { start, end, arrow, startArrow } = connectionPreview;
      this.overlay.append(
        svg('path', {
          d: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
          class: 'connection-preview',
          'stroke-width': 2 / camera.zoom,
        }),
      );
      if (arrow)
        this.overlay.append(
          arrowhead(
            end.x,
            end.y,
            (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI,
            'var(--accent)',
            2 / camera.zoom,
          ),
        );
      if (startArrow)
        this.overlay.append(
          arrowhead(
            start.x,
            start.y,
            (Math.atan2(start.y - end.y, start.x - end.x) * 180) / Math.PI,
            'var(--accent)',
            2 / camera.zoom,
          ),
        );
    }
    const selection = new Set(selected);
    for (const n of visible.nodes
      .slice(0, MAX_VISIBLE)
      .filter((n) => selection.has(n.id))) {
      const g = n.geometry;
      if (isDrawing(n.kind)) {
        const [a, b] = lineEndpoints(g);
        this.overlay.append(
          svg('path', {
            d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
            class: 'selection-outline',
            'stroke-width': 5 / camera.zoom,
          }),
        );
      } else
        this.overlay.append(
          svg('rect', {
            x: g.x,
            y: g.y,
            width: g.width,
            height: g.height,
            transform: `rotate(${g.rotation} ${g.x + g.width / 2} ${g.y + g.height / 2})`,
            class: 'selection-outline',
            'stroke-width': 1.5 / camera.zoom,
          }),
        );
      if (n.editable) {
        const c = shapeCenter(g);
        const p = rotatePoint(
          { x: c.x, y: g.y - 28 / camera.zoom },
          c,
          g.rotation,
        );
        const top = rotatePoint({ x: c.x, y: g.y }, c, g.rotation);
        this.overlay.append(
          svg('path', {
            d: `M ${top.x} ${top.y} L ${p.x} ${p.y}`,
            class: 'selection-outline',
            'stroke-width': 1 / camera.zoom,
          }),
        );
        this.overlay.append(
          svg('circle', {
            cx: p.x,
            cy: p.y,
            r: 7 / camera.zoom,
            class: 'rotation-handle',
            'stroke-width': 1.5 / camera.zoom,
            'data-rotate-id': n.id,
          }),
        );
      }
      if (selected.length === 1) {
        const handles = isDrawing(n.kind)
          ? lineEndpoints(g).map((p, i) => ({ p, handle: i ? 'end' : 'start' }))
          : resizeHandles.map((handle) => ({
              p: handlePoint(g, handle),
              handle,
            }));
        for (const { p, handle } of handles)
          this.overlay.append(
            svg('rect', {
              x: p.x - 5 / camera.zoom,
              y: p.y - 5 / camera.zoom,
              width: 10 / camera.zoom,
              height: 10 / camera.zoom,
              rx: 2 / camera.zoom,
              'stroke-width': 1.5 / camera.zoom,
              class: 'resize-handle',
              'data-resize-id': n.id,
              'data-handle': handle,
            }),
          );
      }
    }
    for (const e of visible.connections
      .slice(0, MAX_VISIBLE)
      .filter((e) => selection.has(e.id))) {
      this.overlay.append(
        svg('path', {
          d: e.path,
          class: 'selection-outline',
          'stroke-width': 5 / camera.zoom,
        }),
      );
      if (selected.length === 1 && e.editable) {
        for (const [endpoint, point] of [
          ['source', e.points[0]],
          ['target', e.points.at(-1)!],
        ] as const)
          this.overlay.append(
            svg('rect', {
              x: point.x - 5 / camera.zoom,
              y: point.y - 5 / camera.zoom,
              width: 10 / camera.zoom,
              height: 10 / camera.zoom,
              rx: 2 / camera.zoom,
              'stroke-width': 1.5 / camera.zoom,
              class: 'resize-handle connection-endpoint-handle',
              'data-connection-endpoint-id': e.id,
              'data-connection-endpoint': endpoint,
            }),
          );
      }
    }
    if (marquee)
      this.overlay.append(
        svg('rect', {
          ...marquee,
          class: snapping ? 'creation-preview' : 'selection-marquee',
          'stroke-width': 1 / camera.zoom,
        }),
      );
    this.root.append(this.overlay);
    return (
      visible.nodes.length > MAX_VISIBLE ||
      visible.connections.length > MAX_VISIBLE
    );
  }
  clear() {
    this.root.replaceChildren();
    this.elements.clear();
    this.models.clear();
  }
}

function svg(
  tag: string,
  attributes: Record<string, string | number> = {},
): SVGElement {
  const element = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes))
    element.setAttribute(key, String(value));
  return element;
}
function textLines(label: string, width: number, fontSize: number): string[] {
  const length = Math.max(1, Math.floor(width / (fontSize * 0.62)));
  const lines: string[] = [];
  for (const line of label.split('\n')) {
    let chars = Array.from(line);
    while (chars.length > length && lines.length < 63) {
      // Prefer a word boundary. Only a word longer than the available line
      // may be split; ordinary phrases must never end in partial words.
      let boundary = -1;
      for (let i = 1; i <= length; i++) if (/\s/u.test(chars[i])) boundary = i;
      const end = boundary > 0 ? boundary : length;
      lines.push(chars.slice(0, end).join('').trimEnd());
      chars = chars.slice(end);
      while (chars.length && /\s/u.test(chars[0])) chars.shift();
    }
    lines.push(chars.join(''));
    if (lines.length >= 64) break;
  }
  return lines;
}
function renderNode(node: SceneNode): SVGElement {
  if (isDrawing(node.kind)) {
    const [a, b] = lineEndpoints(node.geometry);
    const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    const group = renderEdge({
      ...node,
      path: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
      points: [a, b],
      labelPoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      angle,
      arrow: !!node.endArrow,
    });
    group.removeAttribute('data-connection-id');
    group.setAttribute('data-node-id', node.id);
    return group;
  }
  const g = node.geometry,
    s = {
      ...node.style,
      textColor: textColor(
        node.style.textColor,
        ['text', 'freehand', 'line', 'arrow'].includes(node.kind)
          ? 'none'
          : node.style.fill,
      ),
    };
  const group = svg('g', {
    'data-node-id': node.id,
    transform: `translate(${g.x} ${g.y}) rotate(${g.rotation} ${g.width / 2} ${g.height / 2})`,
  });
  const title = svg('title');
  title.textContent = sceneDisplayText(node);
  group.append(title);
  const definition = isShapeKind(node.kind)
    ? shapeRegistry[node.kind]
    : shapeRegistry.rectangle;
  const path = svg('path', {
    d: node.strokePoints
      ? freehandPath(node.strokePoints, g)
      : node.textRegions?.type === 'table'
        ? shapeRegistry.rectangle.path(g.width, g.height, 0)
        : definition.path(g.width, g.height, s.cornerRadius),
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    transform: `translate(${g.flipX === true ? g.width : 0} ${g.flipY === true ? g.height : 0}) scale(${g.flipX === true ? -1 : 1} ${g.flipY === true ? -1 : 1})`,
    class: 'scene-node',
    fill: node.kind === 'text' || node.kind === 'freehand' ? 'none' : s.fill,
    stroke:
      node.kind === 'text' || node.textRegions?.type === 'table'
        ? 'none'
        : s.stroke,
    'stroke-width': s.strokeWidth,
    opacity: s.opacity,
  });
  group.append(path);
  if (node.kind === 'freehand') {
    const hit = path.cloneNode() as SVGElement;
    hit.setAttribute('stroke', 'transparent');
    hit.setAttribute('stroke-width', String(Math.max(12, s.strokeWidth)));
    hit.setAttribute('class', 'stroke-hit');
    group.append(hit);
    if (!node.label) return group;
  }
  if (node.textRegions?.type === 'table') {
    const regions = node.textRegions;
    const { cells, headerRow } = regions;
    const rows = cells.length,
      columns = cells[0].length;
    const xs = tableAxisOffsets(regions.columnWidths, columns, g.width),
      ys = tableAxisOffsets(regions.rowHeights, rows, g.height);
    const calculated = evaluateTable(regions);
    const visibleCells = tableCellBoxes(regions, g.width, g.height);
    const headerFill = tableHeaderFill(s.fill);
    for (const cell of visibleCells) {
      if (!headerRow || cell.row !== 0) continue;
      const box = mirroredTextBox(node, cell.box);
      if (box)
        group.append(
          svg('rect', {
            ...box,
            class: 'scene-table-header',
            'data-table-header': 'true',
            fill: headerFill,
            opacity: s.opacity,
          }),
        );
    }
    const lines = [shapeRegistry.rectangle.path(g.width, g.height, 0)];
    const sameAnchor = (r1: number, c1: number, r2: number, c2: number) => {
      const first = tableCellAnchor(regions, r1, c1);
      const second = tableCellAnchor(regions, r2, c2);
      return first.row === second.row && first.column === second.column;
    };
    for (let row = 1; row < rows; row++)
      for (let column = 0; column < columns; column++)
        if (!sameAnchor(row - 1, column, row, column))
          lines.push(
            `M ${xs[column]} ${ys[row]} h ${xs[column + 1] - xs[column]}`,
          );
    for (let column = 1; column < columns; column++)
      for (let row = 0; row < rows; row++)
        if (!sameAnchor(row, column - 1, row, column))
          lines.push(`M ${xs[column]} ${ys[row]} v ${ys[row + 1] - ys[row]}`);
    group.append(
      svg('path', {
        d: lines.join(' '),
        transform: `translate(${g.flipX === true ? g.width : 0} ${g.flipY === true ? g.height : 0}) scale(${g.flipX === true ? -1 : 1} ${g.flipY === true ? -1 : 1})`,
        class: 'scene-table-grid',
        fill: 'none',
        stroke: s.stroke,
        'stroke-width': s.strokeWidth,
        opacity: s.opacity,
      }),
    );
    for (const cell of visibleCells) {
      const { row, column, box } = cell;
      const paddingX = Math.min(6, box.width * 0.1),
        paddingY = Math.min(4, box.height * 0.1);
      const cellGroup = svg('g', {
        'data-table-cell': `${row}-${column}`,
        'data-rowspan': cell.rowSpan,
        'data-colspan': cell.columnSpan,
      });
      const isHeader = headerRow && row === 0;
      renderPlainRegion(
        cellGroup,
        node,
        {
          x: box.x + paddingX,
          y: box.y + paddingY,
          width: Math.max(0, box.width - paddingX * 2),
          height: Math.max(0, box.height - paddingY * 2),
        },
        calculated[row][column],
        {
          ...s,
          fontWeight: isHeader ? 700 : s.fontWeight,
          textColor:
            isHeader && node.style.textColor === 'auto'
              ? textColor('auto', headerFill)
              : s.textColor,
        },
        `cell-${row}-${column}`,
        calculatedCellRichText(regions, row, column, calculated, s.align),
        textColor('auto', isHeader ? headerFill : s.fill),
      );
      group.append(cellGroup);
    }
    return group;
  }
  if (node.kind === 'container') {
    renderPlainRegion(
      group,
      node,
      containerTextBoxes(g.width, g.height).title,
      node.textRegions?.type === 'container' ? node.textRegions.title : '',
      { ...s, fontWeight: 700 },
      'title',
      node.textRegions?.type === 'container'
        ? node.textRegions.titleRichText
        : undefined,
      textColor('auto', s.fill),
    );
  }
  const labelBox =
    node.kind === 'freehand'
      ? freehandTextBox(g)
      : mirroredTextBox(
          node,
          definition.labelBox?.(g.width, g.height) ?? {
            x: 10,
            y: 6,
            width: Math.max(1, g.width - 20),
            height: Math.max(1, g.height - 12),
          },
        );
  if (!labelBox) return group;
  if (node.richText) {
    const rich = renderRich(
      node.richText,
      s,
      labelBox.x,
      labelBox.y,
      labelBox.width,
      labelBox.height,
      true,
      textColor(
        'auto',
        ['text', 'freehand', 'line', 'arrow'].includes(node.kind)
          ? 'none'
          : node.style.fill,
      ),
    );
    rich.setAttribute('data-text-region', 'body');
    group.append(rich);
    return group;
  }
  const lines = textLines(node.label, Math.max(1, labelBox.width), s.fontSize);
  const maxLines = Math.max(
    1,
    Math.floor(labelBox.height / (s.fontSize * 1.25)),
  );
  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines) shown[shown.length - 1] += '…';
  const x =
    s.align === 'left'
      ? labelBox.x
      : s.align === 'right'
        ? labelBox.x + labelBox.width
        : labelBox.x + labelBox.width / 2;
  const clipId = `label-${node.id}`;
  const clip = svg('clipPath', { id: clipId });
  clip.append(
    svg(
      'rect',
      node.kind === 'container' || node.kind === 'freehand'
        ? {
            x: labelBox.x,
            y: labelBox.y,
            width: labelBox.width,
            height: labelBox.height,
          }
        : { x: 0, y: 0, width: g.width, height: g.height },
    ),
  );
  group.append(clip);
  const label = svg('text', {
    'clip-path': `url(#${clipId})`,
    'data-text-region': 'body',
    class:
      node.kind === 'text'
        ? 'scene-label scene-standalone-label'
        : 'scene-label',
    fill: s.textColor,
    'font-size': s.fontSize,
    'font-family': FONT_FAMILIES[s.fontFamily],
    'font-weight': s.fontWeight,
    'font-style': s.fontStyle,
    'text-decoration': s.textDecoration,
    'text-anchor':
      s.align === 'left' ? 'start' : s.align === 'right' ? 'end' : 'middle',
    opacity: s.opacity,
  });
  label.style.pointerEvents = 'auto';
  shown.forEach((line, i) => {
    const span = svg('tspan', {
      x,
      y:
        labelBox.y +
        labelBox.height / 2 +
        (i - (shown.length - 1) / 2) * s.fontSize * 1.25,
      'dominant-baseline': 'central',
    });
    span.textContent = line;
    label.append(span);
  });
  group.append(label);
  return group;
}
function renderPlainRegion(
  group: SVGElement,
  node: SceneNode,
  rawBox: Bounds,
  label: string,
  style: Appearance,
  key: string,
  richText?: RichText,
  automatic = textColor('auto', node.style.fill),
) {
  const box = mirroredTextBox(node, rawBox);
  if (!box) return;
  const { x: x0, y: y0, width, height } = box;
  if (richText) {
    const rich = renderRich(
      richText,
      style,
      x0,
      y0,
      width,
      height,
      true,
      automatic,
    );
    rich.setAttribute('data-text-region', key);
    rich.classList.add('scene-region-label');
    group.append(rich);
    return;
  }
  const lines = textLines(label, width, style.fontSize);
  const limit = Math.max(1, Math.floor(height / (style.fontSize * 1.25)));
  const shown = lines.slice(0, limit);
  if (lines.length > limit) shown[shown.length - 1] += '…';
  const id = `region-${node.id}-${key}`;
  const clip = svg('clipPath', { id });
  clip.append(svg('rect', { x: x0, y: y0, width, height }));
  group.append(clip);
  const text = svg('text', {
    class: 'scene-label scene-region-label',
    'data-text-region': key,
    'clip-path': `url(#${id})`,
    fill: style.textColor,
    'font-size': style.fontSize,
    'font-family': FONT_FAMILIES[style.fontFamily],
    'font-weight': style.fontWeight,
    'font-style': style.fontStyle,
    'text-decoration': style.textDecoration,
    opacity: style.opacity,
    'text-anchor':
      style.align === 'left'
        ? 'start'
        : style.align === 'right'
          ? 'end'
          : 'middle',
  });
  text.style.pointerEvents = 'auto';
  const x =
    style.align === 'left'
      ? x0
      : style.align === 'right'
        ? x0 + width
        : x0 + width / 2;
  shown.forEach((line, i) => {
    const span = svg('tspan', {
      x,
      y: y0 + height / 2 + (i - (shown.length - 1) / 2) * style.fontSize * 1.25,
      'dominant-baseline': 'central',
    });
    span.textContent = line;
    text.append(span);
  });
  group.append(text);
}
function renderEdge(edge: SceneConnection): SVGElement {
  const s = { ...edge.style, textColor: textColor(edge.style.textColor) },
    group = svg('g', { 'data-connection-id': edge.id, opacity: s.opacity });
  const title = svg('title');
  title.textContent = edge.label;
  group.append(title);
  group.append(
    svg('path', {
      d: edge.path,
      class: 'scene-connection',
      fill: 'none',
      ...(edge.lineStyle === 'dashed'
        ? {
            'stroke-dasharray': `${Math.max(1, s.strokeWidth) * 6} ${Math.max(1, s.strokeWidth) * 3}`,
          }
        : edge.lineStyle === 'dotted'
          ? {
              'stroke-dasharray': `0 ${Math.max(1, s.strokeWidth) * 3}`,
              'stroke-linecap': 'round',
            }
          : {}),
      stroke: s.stroke,
      'stroke-width': s.strokeWidth,
    }),
  );
  group.append(
    svg('path', {
      d: edge.path,
      fill: 'none',
      stroke: 'transparent',
      'stroke-width': Math.max(12, s.strokeWidth),
      'vector-effect': 'non-scaling-stroke',
      class: 'connection-hit',
    }),
  );
  const targetMarker = edge.targetMarker ?? (edge.arrow ? 'arrow' : 'none');
  const sourceMarker =
    edge.sourceMarker ?? (edge.startArrow ? 'arrow' : 'none');
  if (targetMarker !== 'none') {
    const end = edge.points.at(-1)!;
    const head = endpointMarker(
      targetMarker,
      end.x,
      end.y,
      edge.angle,
      s.stroke,
      s.strokeWidth,
    );
    head.setAttribute('data-marker-end', 'target');
    if (targetMarker === 'arrow' || targetMarker === 'open-arrow')
      head.setAttribute('data-arrow-end', 'target');
    group.append(head);
  }
  if (sourceMarker !== 'none') {
    const start = edge.points[0];
    const next =
      edge.points.find(
        (point) => Math.hypot(point.x - start.x, point.y - start.y) > 1e-8,
      ) ?? edge.points.at(-1)!;
    const angle =
      (Math.atan2(start.y - next.y, start.x - next.x) * 180) / Math.PI;
    const head = endpointMarker(
      sourceMarker,
      start.x,
      start.y,
      angle,
      s.stroke,
      s.strokeWidth,
    );
    head.setAttribute('data-marker-end', 'source');
    if (sourceMarker === 'arrow' || sourceMarker === 'open-arrow')
      head.setAttribute('data-arrow-end', 'source');
    group.append(head);
  }
  if (edge.richText) {
    group.append(
      renderRich(
        edge.richText,
        s,
        edge.labelPoint.x -
          (s.align === 'left' ? 0 : s.align === 'right' ? 240 : 120),
        edge.labelPoint.y - 24,
        240,
        512,
        false,
      ),
    );
    return group;
  }
  if (edge.label) {
    const label = svg('text', {
      class: 'scene-edge-label',
      x: edge.labelPoint.x,
      y: edge.labelPoint.y - 8,
      fill: s.textColor,
      'font-size': s.fontSize,
      'font-family': FONT_FAMILIES[s.fontFamily],
      'font-weight': s.fontWeight,
      'font-style': s.fontStyle,
      'text-decoration': s.textDecoration,
      'text-anchor':
        s.align === 'left' ? 'start' : s.align === 'right' ? 'end' : 'middle',
    });
    label.style.pointerEvents = 'auto';
    textLines(edge.label, 240, s.fontSize)
      .slice(0, 8)
      .forEach((line, i) => {
        const span = svg('tspan', {
          x: edge.labelPoint.x,
          dy: i ? s.fontSize * 1.25 : 0,
        });
        span.textContent = line;
        label.append(span);
      });
    group.append(label);
  }
  return group;
}

function endpointMarker(
  marker: EndpointMarker,
  x: number,
  y: number,
  angle: number,
  color: string,
  stroke: number,
): SVGElement {
  const geometry = connectionMarkerGeometry(marker, Math.max(8, stroke * 3));
  const head =
    marker === 'arrow'
      ? arrowhead(x, y, angle, color, stroke)
      : svg('path', {
          class: 'scene-marker',
          d: geometry.path,
          fill: geometry.filled
            ? color
            : marker === 'diamond' || marker === 'circle'
              ? 'var(--surface)'
              : 'none',
          stroke: color,
          'stroke-width': stroke,
          'stroke-linejoin': 'round',
          transform: `translate(${x} ${y}) rotate(${angle})`,
        });
  head.setAttribute('data-endpoint-marker', marker);
  return head;
}

function arrowhead(
  x: number,
  y: number,
  angle: number,
  color: string,
  stroke: number,
) {
  const size = Math.max(8, stroke * 3);
  return svg('path', {
    class: 'scene-arrow',
    d: `M 0 0 L ${-size} ${-size / 2} L ${-size} ${size / 2} Z`,
    fill: color,
    transform: `translate(${x} ${y}) rotate(${angle})`,
  });
}

/** Keep an empty header visible against both light and dark authored fills. */
function tableHeaderFill(background: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(background)) return 'var(--surface-muted)';
  const target = contrastingColor(background);
  return (
    '#' +
    [1, 3, 5]
      .map((offset) => {
        const source = parseInt(background.slice(offset, offset + 2), 16);
        const end = parseInt(target.slice(offset, offset + 2), 16);
        return Math.round(source * 0.86 + end * 0.14)
          .toString(16)
          .padStart(2, '0');
      })
      .join('')
  );
}

/** HTML namespace text layout uses the same safe run model and fonts as the editor. No imported markup. */
function renderRich(
  value: RichText,
  base: Appearance,
  x: number,
  y: number,
  width: number,
  height: number,
  center = true,
  automatic = textColor('auto'),
): SVGElement {
  const foreign = svg('foreignObject', {
    x,
    y,
    width,
    height,
    class: center
      ? 'scene-rich-label scene-label'
      : 'scene-rich-label scene-edge-label',
    opacity: base.opacity,
  });
  // Only painted runs take pointer input; a connector's bounded layout viewport
  // must not block unrelated elements underneath its empty trailing space.
  foreign.style.pointerEvents = 'none';
  const box = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
  Object.assign(box.style, {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: center ? 'safe center' : 'start',
    overflow: 'hidden',
    overflowWrap: 'break-word',
    wordBreak: 'normal',
    whiteSpace: 'pre-wrap',
    fontFamily: FONT_FAMILIES[base.fontFamily],
    fontSize: `${base.fontSize}px`,
    lineHeight: '1.25',
    color: textColor(base.textColor),
    fontWeight: String(base.fontWeight),
    fontStyle: base.fontStyle,
    pointerEvents: 'none',
  });
  for (const p of value.paragraphs) {
    const paragraph = document.createElementNS(
      'http://www.w3.org/1999/xhtml',
      'p',
    );
    paragraph.style.margin = '0';
    paragraph.style.textAlign = p.align;
    paragraph.style.minHeight = '1.25em';
    for (const r of p.runs) {
      const span = document.createElementNS(
        'http://www.w3.org/1999/xhtml',
        'span',
      );
      const a = { ...base, ...r.style };
      Object.assign(span.style, {
        fontFamily: FONT_FAMILIES[a.fontFamily],
        fontSize: `${a.fontSize}px`,
        fontWeight: String(a.fontWeight),
        fontStyle: a.fontStyle,
        textDecoration: a.textDecoration,
        pointerEvents: 'auto',
        color:
          r.style.textColor === 'auto' ? automatic : textColor(a.textColor),
      });
      span.textContent = r.text;
      paragraph.append(span);
    }
    box.append(paragraph);
  }
  foreign.append(box);
  return foreign;
}

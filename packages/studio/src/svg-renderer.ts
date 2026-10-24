import {
  gridStep,
  FONT_FAMILIES,
  isDrawing,
  lineEndpoints,
  resizeHandles,
  handlePoint,
  type Bounds,
  shapeRegistry,
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
    } | null = null,
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
        order: edge.layerOrder,
        create: () => renderEdge(edge),
      })),
      ...visible.nodes.slice(0, MAX_VISIBLE).map((node) => ({
        key: `node:${node.id}`,
        model: node,
        order: node.layerOrder,
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
    if (connectionPreview) {
      const { start, end, arrow } = connectionPreview;
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
      .filter((e) => selection.has(e.id)))
      this.overlay.append(
        svg('path', {
          d: e.path,
          class: 'selection-outline',
          'stroke-width': 5 / camera.zoom,
        }),
      );
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
    const chars = Array.from(line);
    if (!chars.length) lines.push('');
    for (let i = 0; i < chars.length && lines.length < 64; i += length)
      lines.push(chars.slice(i, i + length).join(''));
    if (lines.length >= 64) break;
  }
  return lines;
}
function renderNode(node: SceneNode): SVGElement {
  if (isDrawing(node.kind)) {
    const [a, b] = lineEndpoints(node.geometry);
    const angle = node.geometry.rotation;
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
    if (node.startArrow)
      group.append(
        arrowhead(
          a.x,
          a.y,
          angle + 180,
          node.style.stroke,
          node.style.strokeWidth,
        ),
      );
    return group;
  }
  const g = node.geometry,
    s = node.style;
  const group = svg('g', {
    'data-node-id': node.id,
    transform: `translate(${g.x} ${g.y}) rotate(${g.rotation} ${g.width / 2} ${g.height / 2})`,
  });
  const title = svg('title');
  title.textContent = node.label;
  group.append(title);
  const definition = isShapeKind(node.kind)
    ? shapeRegistry[node.kind]
    : shapeRegistry.rectangle;
  const path = svg('path', {
    d: definition.path(g.width, g.height, s.cornerRadius),
    class: 'scene-node',
    fill: node.kind === 'text' ? 'none' : s.fill,
    stroke: node.kind === 'text' ? 'none' : s.stroke,
    'stroke-width': s.strokeWidth,
    opacity: s.opacity,
  });
  group.append(path);
  const labelBox = definition.labelBox?.(g.width, g.height) ?? {
    x: 10,
    y: 6,
    width: Math.max(1, g.width - 20),
    height: Math.max(1, g.height - 12),
  };
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
  clip.append(svg('rect', { x: 0, y: 0, width: g.width, height: g.height }));
  group.append(clip);
  const label = svg('text', {
    'clip-path': `url(#${clipId})`,
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
function renderEdge(edge: SceneConnection): SVGElement {
  const s = edge.style,
    group = svg('g', { 'data-connection-id': edge.id, opacity: s.opacity });
  const title = svg('title');
  title.textContent = edge.label;
  group.append(title);
  group.append(
    svg('path', {
      d: edge.path,
      class: 'scene-connection',
      fill: 'none',
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
  if (edge.arrow) {
    const end = edge.points.at(-1)!;
    const size = Math.max(8, s.strokeWidth * 3);
    group.append(
      svg('path', {
        class: 'scene-arrow',
        d: `M 0 0 L ${-size} ${-size / 2} L ${-size} ${size / 2} Z`,
        fill: s.stroke,
        transform: `translate(${end.x} ${end.y}) rotate(${edge.angle})`,
      }),
    );
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

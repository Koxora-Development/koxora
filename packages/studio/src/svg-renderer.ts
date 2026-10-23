import {
  gridStep,
  shapeRegistry,
  isShapeKind,
  type SceneNode,
  type SceneConnection,
  visibleBounds,
  visibleScene,
  type CanvasState,
  type Scene,
  type Size,
} from '@koxora/editor-core';
const NS = 'http://www.w3.org/2000/svg';
const MAX_VISIBLE = 1500;
/** Owns only the SVG subtree passed to it. Never reads or writes project data. */
export class SvgRenderer {
  private elements = new Map<string, SVGElement>();
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
    const add = (key: string, create: () => SVGElement) => {
      wanted.add(key);
      if (!this.elements.has(key)) {
        const element = create();
        this.elements.set(key, element);
        this.root.append(element);
      }
      this.elements
        .get(key)!
        .classList.toggle('connection-source', key === `node:${sourceId}`);
    };
    const entries = [
      ...visible.connections.slice(0, MAX_VISIBLE).map((edge) => ({
        key: `edge:${edge.id}`,
        order: edge.layerOrder,
        create: () => renderEdge(edge),
      })),
      ...visible.nodes.slice(0, MAX_VISIBLE).map((node) => ({
        key: `node:${node.id}`,
        order: node.layerOrder,
        create: () => renderNode(node),
      })),
    ].sort((a, b) => a.order - b.order);
    for (const entry of entries) add(entry.key, entry.create);
    for (const [key, element] of this.elements)
      if (!wanted.has(key)) {
        element.remove();
        this.elements.delete(key);
      }
    // Culling must not change paint order when earlier elements re-enter the view.
    let cursor = this.root.firstElementChild;
    for (const key of wanted) {
      const element = this.elements.get(key)!;
      if (element !== cursor) this.root.insertBefore(element, cursor);
      cursor = element.nextElementSibling;
    }
    return (
      visible.nodes.length > MAX_VISIBLE ||
      visible.connections.length > MAX_VISIBLE
    );
  }
  clear() {
    this.root.replaceChildren();
    this.elements.clear();
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
      'text-anchor': 'middle',
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

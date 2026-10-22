import {
  gridStep,
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
  render(scene: Scene, state: CanvasState, size: Size): boolean {
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
    };
    for (const edge of visible.connections.slice(0, MAX_VISIBLE))
      add(`edge:${edge.id}`, () => {
        const line = document.createElementNS(NS, 'polyline');
        line.setAttribute(
          'points',
          edge.points.map((p) => `${p.x},${p.y}`).join(' '),
        );
        line.setAttribute('class', 'scene-connection');
        line.setAttribute('vector-effect', 'non-scaling-stroke');
        return line;
      });
    for (const node of visible.nodes.slice(0, MAX_VISIBLE))
      add(`node:${node.id}`, () => {
        const group = document.createElementNS(NS, 'g'),
          rect = document.createElementNS(NS, 'rect'),
          label = document.createElementNS(NS, 'text');
        const g = node.geometry;
        group.setAttribute(
          'transform',
          `rotate(${g.rotation} ${g.x + g.width / 2} ${g.y + g.height / 2})`,
        );
        rect.setAttribute('x', String(g.x));
        rect.setAttribute('y', String(g.y));
        rect.setAttribute('width', String(g.width));
        rect.setAttribute('height', String(g.height));
        rect.setAttribute('class', 'scene-node');
        rect.setAttribute('vector-effect', 'non-scaling-stroke');
        label.setAttribute('x', String(g.x + g.width / 2));
        label.setAttribute('y', String(g.y + g.height / 2));
        label.setAttribute('class', 'scene-label');
        // Text only: no HTML, SVG markup, resource URLs, or imported styles are executed.
        label.textContent = node.label.slice(
          0,
          Math.max(0, Math.floor(g.width / 8)),
        );
        group.append(rect, label);
        return group;
      });
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

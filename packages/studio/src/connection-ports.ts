import {
  anchorPoint,
  connectionPortsForNode,
  readConnection,
  isShapeKind,
  isDrawing,
  visibleBounds,
  visibleScene,
  sceneDisplayText,
  type Anchor,
  type CanvasState,
  type Point,
  type Scene,
  type Size,
} from '@koxora/editor-core';
import { translate, type MessageKey } from '@koxora/i18n';
import type { Connection } from '@koxora/project';
import { portAnchorId, portAnchorLabel } from './port-anchor';

export interface Port {
  id: string;
  anchor: Anchor;
}
export const PORT_ANCHORS = ['north', 'east', 'south', 'west'] as const;
export const MAX_VISIBLE_PORTS = 1024;
const MAX_PORT_NODES = 256;
const MAX_SAVED_PORTS_PER_NODE = 32;

/** Stable HTML buttons keep keyboard focus while the SVG scene is redrawn. */
export class ConnectionPorts {
  private buttons = new Map<string, HTMLButtonElement>();
  private positions: { port: Port; point: Point; order: number }[] = [];
  private saved = new Map<string, Map<string, Anchor>>();
  constructor(
    private root: HTMLDivElement,
    private locale: string,
    connections: readonly Connection[] = [],
  ) {
    // Saved local anchors remain available when a resize reduces candidate density.
    for (const edge of connections) {
      const options = readConnection(edge);
      for (const side of ['source', 'target'] as const) {
        const id = edge[`${side}Id`];
        const anchor = options[`${side}Anchor`];
        if (!id || anchor === 'auto') continue;
        if (!this.saved.has(id)) this.saved.set(id, new Map());
        const anchors = this.saved.get(id)!;
        if (anchors.size < MAX_SAVED_PORTS_PER_NODE)
          anchors.set(portAnchorId(anchor), anchor);
      }
    }
  }
  render(
    scene: Scene,
    state: CanvasState,
    size: Size,
    candidates: readonly string[],
    source: Port | null,
    cursor?: Point | null,
  ) {
    const wanted = new Set<string>();
    const eligible = new Set(candidates);
    if (source) eligible.add(source.id);
    this.positions = [];
    if (!eligible.size) {
      this.clear();
      return;
    }
    const camera = state.camera;
    const focusedNode = (document.activeElement as HTMLElement | null)?.dataset
      ?.portNode;
    const nearby = cursor ?? { x: size.width / 2, y: size.height / 2 };
    const nodes = visibleScene(scene, visibleBounds(camera, size))
      .nodes.map((node, order) => {
        const x =
          (node.geometry.x + node.geometry.width / 2 - camera.x) * camera.zoom +
          size.width / 2;
        const y =
          (node.geometry.y + node.geometry.height / 2 - camera.y) *
            camera.zoom +
          size.height / 2;
        return {
          node,
          order,
          distance: Math.hypot(x - nearby.x, y - nearby.y),
        };
      })
      .filter(
        ({ node }) =>
          eligible.has(node.id) &&
          node.editable &&
          isShapeKind(node.kind) &&
          !isDrawing(node.kind),
      )
      .sort((a, b) => {
        const priority = (id: string) =>
          id === source?.id ? 2 : id === focusedNode ? 1 : 0;
        return (
          priority(b.node.id) - priority(a.node.id) || a.distance - b.distance
        );
      })
      .slice(0, MAX_PORT_NODES);
    for (const { node, order } of nodes) {
      if (wanted.size >= MAX_VISIBLE_PORTS) break;
      if (
        !eligible.has(node.id) ||
        !isShapeKind(node.kind) ||
        !node.editable ||
        isDrawing(node.kind)
      )
        continue;
      const candidates = new Map<string, { anchor: Anchor; point: Point }>();
      if (
        source?.id === node.id &&
        (source.anchor !== 'auto' || node.kind === 'junction')
      )
        candidates.set(portAnchorId(source.anchor), {
          anchor: source.anchor,
          point: anchorPoint(
            node,
            node.geometry,
            source.anchor,
            node.style.cornerRadius,
          ),
        });
      for (const port of connectionPortsForNode(node, node.style.cornerRadius))
        candidates.set(portAnchorId(port.anchor), port);
      const retained = [...(this.saved.get(node.id)?.values() ?? [])];
      for (const anchor of retained) {
        if (anchor === 'auto' && node.kind !== 'junction') continue;
        const id = portAnchorId(anchor);
        if (!candidates.has(id))
          candidates.set(id, {
            anchor,
            point: anchorPoint(
              node,
              node.geometry,
              anchor,
              node.style.cornerRadius,
            ),
          });
      }
      const nodePoints: Point[] = [];
      for (const { anchor, point: p } of candidates.values()) {
        if (wanted.size >= MAX_VISIBLE_PORTS) break;
        const point = {
          x: (p.x - camera.x) * camera.zoom + size.width / 2,
          y: (p.y - camera.y) * camera.zoom + size.height / 2,
        };
        if (
          point.x < 0 ||
          point.y < 0 ||
          point.x > size.width ||
          point.y > size.height
        )
          continue;
        // At distant zoom levels dense candidate markers obscure the whole shape.
        if (
          nodePoints.some(
            (previous) =>
              Math.hypot(point.x - previous.x, point.y - previous.y) < 18,
          )
        )
          continue;
        nodePoints.push(point);
        const anchorId = portAnchorId(anchor);
        const key = `${node.id}:${anchorId}`;
        wanted.add(key);
        let button = this.buttons.get(key);
        if (!button) {
          button = document.createElement('button');
          button.type = 'button';
          button.className = 'connection-port';
          button.dataset.portNode = node.id;
          button.dataset.portAnchor = anchorId;
          button.tabIndex = -1;
          this.buttons.set(key, button);
          this.root.append(button);
        }
        button.style.left = `${point.x}px`;
        button.style.top = `${point.y}px`;
        const label = translate(this.locale, 'ports.label', {
          name:
            sceneDisplayText(node) ||
            translate(this.locale, `shape.${node.kind}` as MessageKey),
          anchor:
            node.kind === 'junction'
              ? translate(this.locale, 'ports.center')
              : portAnchorLabel(this.locale, anchor),
        });
        button.setAttribute('aria-label', label);
        button.title = label;
        button.setAttribute(
          'aria-pressed',
          String(
            source?.id === node.id && portAnchorId(source.anchor) === anchorId,
          ),
        );
        this.positions.push({ port: { id: node.id, anchor }, point, order });
      }
    }
    for (const [key, button] of this.buttons)
      if (!wanted.has(key)) {
        button.remove();
        this.buttons.delete(key);
      }
    const buttons = [...this.buttons.values()];
    const focused =
      buttons.find((b) => b === document.activeElement) ??
      buttons.find((b) => b.tabIndex === 0) ??
      buttons[0];
    for (const button of buttons) button.tabIndex = button === focused ? 0 : -1;
  }
  hit(point: Point): Port | undefined {
    // Nearest center resolves overlapping hit areas; ties prefer the topmost shape.
    let nearest: Port | undefined;
    let distance = 16;
    let order = -1;
    for (const entry of this.positions) {
      const next = Math.hypot(entry.point.x - point.x, entry.point.y - point.y);
      if (next < distance || (next === distance && entry.order >= order)) {
        distance = next;
        order = entry.order;
        nearest = entry.port;
      }
    }
    return nearest;
  }
  key(event: KeyboardEvent): boolean {
    if (
      !(event.target instanceof HTMLButtonElement) ||
      !event.target.dataset.portNode
    )
      return false;
    const buttons = [...this.buttons.values()];
    const index = buttons.indexOf(event.target);
    const direction = ['ArrowRight', 'ArrowDown'].includes(event.key)
      ? 1
      : ['ArrowLeft', 'ArrowUp'].includes(event.key)
        ? -1
        : 0;
    if (!direction && event.key !== 'Home' && event.key !== 'End') return false;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : (index + direction + buttons.length) % buttons.length;
    buttons.forEach((button, i) => {
      button.tabIndex = i === next ? 0 : -1;
    });
    buttons[next]?.focus({ preventScroll: true });
    return true;
  }
  clear() {
    this.root.replaceChildren();
    this.buttons.clear();
    this.positions = [];
  }
}

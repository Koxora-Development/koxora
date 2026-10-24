import {
  anchorPoint,
  isShapeKind,
  isDrawing,
  visibleBounds,
  visibleScene,
  type Anchor,
  type CanvasState,
  type Point,
  type Scene,
  type Size,
} from '@koxora/editor-core';
import { translate, type MessageKey } from '@koxora/i18n';

export interface Port {
  id: string;
  anchor: Anchor;
}
export const PORT_ANCHORS = ['north', 'east', 'south', 'west'] as const;

/** Stable HTML buttons keep keyboard focus while the SVG scene is redrawn. */
export class ConnectionPorts {
  private buttons = new Map<string, HTMLButtonElement>();
  private positions: { port: Port; point: Point }[] = [];
  constructor(
    private root: HTMLDivElement,
    private locale: string,
  ) {}
  render(
    scene: Scene,
    state: CanvasState,
    size: Size,
    candidates: readonly string[],
    source: Port | null,
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
    for (const node of visibleScene(
      scene,
      visibleBounds(camera, size),
    ).nodes.slice(0, 1500)) {
      if (
        !eligible.has(node.id) ||
        !isShapeKind(node.kind) ||
        !node.editable ||
        isDrawing(node.kind)
      )
        continue;
      for (const anchor of PORT_ANCHORS) {
        const p = anchorPoint(
          node,
          node.geometry,
          anchor,
          node.style.cornerRadius,
        );
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
        const key = `${node.id}:${anchor}`;
        wanted.add(key);
        let button = this.buttons.get(key);
        if (!button) {
          button = document.createElement('button');
          button.type = 'button';
          button.className = 'connection-port';
          button.dataset.portNode = node.id;
          button.dataset.portAnchor = anchor;
          button.tabIndex = -1;
          this.buttons.set(key, button);
          this.root.append(button);
        }
        button.style.left = `${point.x}px`;
        button.style.top = `${point.y}px`;
        const label = translate(this.locale, 'ports.label', {
          name:
            node.label ||
            translate(this.locale, `shape.${node.kind}` as MessageKey),
          anchor: translate(this.locale, `ports.${anchor}`),
        });
        button.setAttribute('aria-label', label);
        button.title = label;
        button.setAttribute(
          'aria-pressed',
          String(source?.id === node.id && source.anchor === anchor),
        );
        this.positions.push({ port: { id: node.id, anchor }, point });
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
    for (const entry of this.positions) {
      const next = Math.hypot(entry.point.x - point.x, entry.point.y - point.y);
      if (next <= distance) {
        distance = next;
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

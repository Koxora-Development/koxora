import { useLayoutEffect, useRef, type RefObject } from 'react';

/** Measure the actual dialog after fonts, scale and content changes. Coordinates are CSS pixels. */
export function useFloatingWindow(
  ref: RefObject<HTMLDialogElement | null>,
  anchor: { x: number; y: number },
) {
  const desired = useRef({ x: anchor.x, y: anchor.y });
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  function place() {
    const el = ref.current;
    if (!el) return;
    const viewport = window.visualViewport;
    const left = (viewport?.offsetLeft ?? 0) + 8;
    const top = (viewport?.offsetTop ?? 0) + 8;
    const width = Math.max(1, (viewport?.width ?? window.innerWidth) - 16);
    const height = Math.max(1, (viewport?.height ?? window.innerHeight) - 16);
    el.style.maxWidth = `${width}px`;
    el.style.maxHeight = `${height}px`;
    const rect = el.getBoundingClientRect();
    const x = Math.max(
      left,
      Math.min(left + width - rect.width, desired.current.x),
    );
    const y = Math.max(
      top,
      Math.min(top + height - rect.height, desired.current.y),
    );
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    desired.current = { x, y };
  }
  useLayoutEffect(() => {
    const el = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    el.show();
    place();
    const observer = new ResizeObserver(place);
    observer.observe(el);
    window.addEventListener('resize', place);
    window.visualViewport?.addEventListener('resize', place);
    window.visualViewport?.addEventListener('scroll', place);
    return () => {
      observer.disconnect();
      const restore =
        el.contains(document.activeElement) ||
        document.activeElement === document.body;
      el.close();
      if (restore) previous?.focus();
      window.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('scroll', place);
    };
  }, []);
  return {
    onPointerDown(event: React.PointerEvent<HTMLElement>) {
      if (event.button !== 0) return;
      const target = event.target as Element;
      // Keep controls, label text and editable content usable for selection.
      // The title handle is the one interactive control intended for dragging.
      if (
        target.closest(
          'input, select, textarea, a, label, summary, [contenteditable], [role="textbox"], [data-no-drag]',
        ) ||
        (target.closest('button, [role="button"]') &&
          !target.closest('.floating-window-handle'))
      )
        return;
      event.preventDefault();
      const rect = ref.current!.getBoundingClientRect();
      drag.current = {
        id: event.pointerId,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: React.PointerEvent<HTMLElement>) {
      const current = drag.current;
      if (!current || current.id !== event.pointerId) return;
      desired.current = {
        x: event.clientX - current.x,
        y: event.clientY - current.y,
      };
      place();
    },
    onPointerUp() {
      drag.current = null;
    },
    onPointerCancel() {
      drag.current = null;
    },
    onLostPointerCapture() {
      drag.current = null;
    },
    onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
      const delta = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      }[event.key];
      if (!delta) return;
      event.preventDefault();
      event.stopPropagation();
      const step = event.shiftKey ? 40 : 10;
      desired.current = {
        x: desired.current.x + delta[0] * step,
        y: desired.current.y + delta[1] * step,
      };
      place();
    },
  };
}

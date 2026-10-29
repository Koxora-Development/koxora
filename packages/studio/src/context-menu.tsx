import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import type { MenuAnchor } from './menu-anchor';

/** One viewport-clamped surface for pointer, keyboard and visible touch actions. */
export function ContextMenu({
  anchor,
  label,
  onClose,
  children,
}: {
  anchor: MenuAnchor;
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
  }, [onClose]);
  const [position, setPosition] = useState({ left: anchor.x, top: anchor.y });
  useLayoutEffect(() => {
    const element = root.current!;
    const box = element.getBoundingClientRect();
    setPosition({
      left: Math.max(8, Math.min(anchor.x, window.innerWidth - box.width - 8)),
      top: Math.max(8, Math.min(anchor.y, window.innerHeight - box.height - 8)),
    });
    element
      .querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')
      ?.focus({ preventScroll: true });
    const outside = (e: Event) => {
      if (!element.contains(e.target as Node)) close.current();
    };
    const resize = () => close.current();
    document.addEventListener('pointerdown', outside, true);
    // Dismiss on deliberate navigation, not queued layout/autofocus scrolling.
    document.addEventListener('wheel', outside, {
      capture: true,
      passive: true,
    });
    document.addEventListener('touchmove', outside, {
      capture: true,
      passive: true,
    });
    window.addEventListener('resize', resize);
    return () => {
      const restore = element.contains(document.activeElement);
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('wheel', outside, true);
      document.removeEventListener('touchmove', outside, true);
      window.removeEventListener('resize', resize);
      if (restore)
        queueMicrotask(() => {
          if (
            document.activeElement === document.body &&
            anchor.trigger.isConnected
          )
            anchor.trigger.focus({ preventScroll: true });
        });
    };
  }, [anchor]);
  return createPortal(
    <div
      ref={root}
      className="context-menu"
      role="menu"
      aria-label={label}
      style={position}
      onBlur={(e) => {
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget))
          onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          anchor.trigger.focus({ preventScroll: true });
          onClose();
        } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
          e.preventDefault();
          const items = [
            ...e.currentTarget.querySelectorAll<HTMLButtonElement>(
              '[role="menuitem"]:not(:disabled)',
            ),
          ];
          const index = items.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          const item =
            items[
              e.key === 'Home'
                ? 0
                : e.key === 'End'
                  ? items.length - 1
                  : (index + (e.key === 'ArrowDown' ? 1 : items.length - 1)) %
                    items.length
            ];
          item?.focus({ preventScroll: true });
          item?.scrollIntoView({ block: 'nearest' });
        }
      }}
    >
      {children}
    </div>,
    anchor.trigger.closest('dialog[open], [aria-modal="true"]') ??
      document.body,
  );
}

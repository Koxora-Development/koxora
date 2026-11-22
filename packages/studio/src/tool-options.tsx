import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { translate } from '@koxora/i18n';
import './tool-options.css';

/** On-demand insertion settings stay reachable without a permanent canvas row. */
export function ToolOptions({
  locale,
  children,
}: {
  locale: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  useLayoutEffect(() => {
    if (!open) return;
    const element = panel.current!;
    if (element.showPopover) element.showPopover();
    const place = () => {
      const anchor = trigger.current!.getBoundingClientRect();
      const bounds = element.getBoundingClientRect();
      element.style.left = `${Math.max(6, Math.min(anchor.right - bounds.width, innerWidth - bounds.width - 6))}px`;
      element.style.top = `${Math.max(6, Math.min(anchor.bottom + 6, innerHeight - bounds.height - 6))}px`;
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(element);
    window.addEventListener('resize', place);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
      if (element.hidePopover && element.matches(':popover-open'))
        element.hidePopover();
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !panel.current?.contains(event.target) &&
        !trigger.current?.contains(event.target)
      )
        setOpen(false);
    };
    const leave = (event: FocusEvent) => {
      if (
        event.target instanceof Node &&
        !panel.current?.contains(event.target) &&
        !trigger.current?.contains(event.target)
      )
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      trigger.current?.focus({ preventScroll: true });
    };
    window.addEventListener('pointerdown', dismiss, true);
    window.addEventListener('focusin', leave, true);
    window.addEventListener('keydown', escape, true);
    return () => {
      window.removeEventListener('pointerdown', dismiss, true);
      window.removeEventListener('focusin', leave, true);
      window.removeEventListener('keydown', escape, true);
    };
  }, [open]);
  const label = translate(locale, 'line.options');
  return (
    <div className="connection-options">
      <button
        ref={trigger}
        type="button"
        className="button compact tool-options-trigger"
        data-connection-options=""
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown') return;
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
          requestAnimationFrame(() =>
            panel.current
              ?.querySelector<HTMLElement>('input,select,button,summary')
              ?.focus(),
          );
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M 3 6 H 21 M 3 12 H 21 M 3 18 H 21 M 8 3 V 9 M 16 9 V 15 M 10 15 V 21"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </button>
      {open && (
        <div
          ref={panel}
          id={id}
          className="tool-options-panel"
          popover="manual"
          role="group"
          aria-label={label}
        >
          {children}
        </div>
      )}
    </div>
  );
}

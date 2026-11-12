import { useEffect, useRef, type ReactNode } from 'react';
import logo from './assets/logo.svg';
export function Mark() {
  return <img className="brand-mark" src={logo} alt="" aria-hidden="true" />;
}
export type IconName =
  | 'plus'
  | 'import'
  | 'export'
  | 'grid'
  | 'file'
  | 'arrow'
  | 'check'
  | 'clock'
  | 'layers'
  | 'close'
  | 'refresh'
  | 'shield'
  | 'save'
  | 'undo'
  | 'redo'
  | 'panel'
  | 'settings'
  | 'expand'
  | 'trash'
  | 'info'
  | 'more';
const paths: Record<IconName, string> = {
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  info: 'M12 11v6m0-10v1m9 4a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  expand: 'M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6',
  save: 'M4 3h13l4 4v14H3V3zM7 3v6h10V3M7 21v-8h10v8',
  undo: 'M8 5 3 10l5 5M3 10h10a7 7 0 0 1 7 7',
  redo: 'm16 5 5 5-5 5m5-5H11a7 7 0 0 0-7 7',
  panel: 'M3 4h18v16H3zM15 4v16M17 8h2M17 12h2M17 16h2',
  settings: 'M4 7h16M4 17h16M8 4v6m8 4v6',
  plus: 'M12 5v14M5 12h14',
  import: 'M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4',
  export: 'M12 15V3m-5 5 5-5 5 5M4 16v4h16v-4',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  file: 'M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  check: 'm5 12 4 4 10-10',
  clock: 'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  layers: 'm12 3 9 5-9 5-9-5 9-5m-9 9 9 5 9-5m-18 5 9 5 9-5',
  close: 'm6 6 12 12M6 18 18 6',
  refresh: 'M20 9a8 8 0 1 0 0 6M20 3v6h-6',
  shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6',
};
export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="icon"
      data-icon={name}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function Dialog({
  title,
  children,
  onCancel,
  className = '',
}: {
  title: string;
  children: ReactNode;
  onCancel: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    el.showModal();
    return () => {
      el.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`studio-dialog ${className}`}
      aria-label={title}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onCancel();
          return;
        }
        if (event.key !== 'Tab') return;
        const elements = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, a[href], [tabindex]:not([tabindex="-1"])',
          ),
        ].filter((element) => element.getClientRects().length > 0);
        const first = elements[0],
          last = elements.at(-1);
        if (!first) {
          event.preventDefault();
          event.currentTarget.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2>{title}</h2>
      {children}
    </dialog>
  );
}

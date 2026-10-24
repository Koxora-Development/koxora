import type { IconName } from '../content/data';
// Single-path line icons drawn on a 24-unit grid, inlined so that the page
// needs no icon font and no extra request.
const paths: Record<IconName, string> = {
  shapes: 'M3 4h8v8H3zm12 8.5 4.5 7.5h-9zM17.5 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6',
  canvas: 'M4 4h16v16H4zM4 10h16M10 4v16',
  cursor: 'm5 3 6 16 2.2-6.2L19.5 11z',
  history: 'M3.5 12a8.5 8.5 0 1 0 2.8-6.3M3 4.5V9h4.5M12 8.5V12l2.5 1.8',
  folder: 'M3 6h6l2 2h10v11H3z',
  file: 'M6 3h8l4 4v14H6zM14 3v5h4M9 13h6M9 17h4',
  offline:
    'M12 19h.01M4.5 11a10.5 10.5 0 0 1 15 0M8.3 15a5.2 5.2 0 0 1 7.4 0M3 3l18 18',
  text: 'M5 6.5V4h14v2.5M12 4v16M9 20h6',
  globe:
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M3.2 12h17.6M12 3c2.6 2.8 2.6 15.2 0 18M12 3c-2.6 2.8-2.6 15.2 0 18',
  contrast: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 3v18a9 9 0 0 0 0-18',
  keyboard: 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M8 14.5h8',
  shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5',
  tabs: 'M4 7h6V4h10v16H4zM10 4v3',
  desktop: 'M3 5h18v11H3zM9 20h6M12 16v4',
  template: 'M4 4h16v4.5H4zM4 11.5h7V20H4zM14 11.5h6V20h-6z',
  export: 'M12 15V3m-5 5 5-5 5 5M4 16v4h16v-4',
  import: 'M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4',
  chart: 'M4 4v16h16M8 17v-5M12 17V8M16 17v-9',
  people:
    'M8.5 11a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6M2.5 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16.5 5.4a3.3 3.3 0 0 1 0 6.2M21.5 20a6.6 6.6 0 0 0-3-5.5',
  cloud:
    'M7.5 18.5a4.2 4.2 0 0 1 .4-8.4 5.6 5.6 0 0 1 10.6 1.7 3.6 3.6 0 0 1-.5 6.7z',
  spark: 'm12 3 2.1 5.9L20 11l-5.9 2.1L12 19l-2.1-5.9L4 11l5.9-2.1z',
  plugin: 'M4 8h3.2a2.3 2.3 0 1 1 4.6 0H15v3.2a2.3 2.3 0 1 0 0 4.6V19H4z',
  server: 'M3 4.5h18V10H3zM3 14h18v5.5H3zM6.5 7.2h.01M6.5 16.8h.01',
  mobile: 'M7 3h10v18H7zM10.8 18h2.4',
};
export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function ArrowIcon() {
  return (
    <svg
      className="icon icon-inline"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 12h13m-6-6 6 6-6 6" />
    </svg>
  );
}
export function CheckIcon() {
  return (
    <svg
      className="icon icon-inline"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

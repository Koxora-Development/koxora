import type { ReactNode } from 'react';
export function Mark() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M10 8v24M30 8 18 20l12 12M10 20h8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function FeatureCard({
  title,
  children,
  index,
}: {
  title: string;
  children: ReactNode;
  index: number;
}) {
  return (
    <article className="feature-card">
      <span className="feature-index" aria-hidden="true">
        {String(index).padStart(2, '0')}
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  );
}

import type { ReactNode } from 'react';
import { Icon, ArrowIcon } from './icons';
import type { FeatureStatus, IconName } from '../content/data';
export type BadgeTone = FeatureStatus | 'concept' | 'preparation';
export function StatusBadge({
  tone,
  label,
}: {
  tone: BadgeTone;
  label: string;
}) {
  return <span className={`badge badge-${tone}`}>{label}</span>;
}
export function Section({
  id,
  tone,
  children,
}: {
  id?: string;
  tone?: 'plain' | 'panel';
  children: ReactNode;
}) {
  return (
    <section id={id} className={`section section-${tone ?? 'plain'}`}>
      <div className="wrap">{children}</div>
    </section>
  );
}
export function SectionHeader({
  kicker,
  title,
  description,
  align,
}: {
  kicker?: string;
  title: string;
  description?: string;
  align?: 'start' | 'center';
}) {
  return (
    <header className={`section-header section-header-${align ?? 'start'}`}>
      {kicker ? <p className="kicker">{kicker}</p> : null}
      <h2>{title}</h2>
      {description ? <p className="section-desc">{description}</p> : null}
    </header>
  );
}
export function Card({
  icon,
  title,
  body,
  badge,
  children,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  badge?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <article className="card">
      {icon ? (
        <p className="card-icon">
          <Icon name={icon} />
        </p>
      ) : null}
      <h3>{title}</h3>
      {badge}
      {body ? <p>{body}</p> : null}
      {children}
    </article>
  );
}
export function Grid({
  columns,
  children,
}: {
  columns: 2 | 3 | 4;
  children: ReactNode;
}) {
  return <div className={`grid grid-${columns}`}>{children}</div>;
}
export function ActionLink({
  href,
  label,
  variant,
  hint,
  external,
}: {
  href: string;
  label: string;
  variant: 'primary' | 'secondary' | 'quiet';
  hint?: string;
  external?: boolean;
}) {
  const link = (
    <a
      className={`action action-${variant}`}
      href={href}
      {...(external ? { rel: 'noopener', target: '_blank' } : {})}
    >
      <span>{label}</span>
      <ArrowIcon />
    </a>
  );
  if (!hint) return link;
  return (
    <span className="action-with-hint">
      {link}
      <span className="action-hint">{hint}</span>
    </span>
  );
}
export function Note({
  tone,
  title,
  children,
}: {
  tone: 'info' | 'warning';
  title?: string;
  children: ReactNode;
}) {
  return (
    <aside className={`note note-${tone}`}>
      {title ? <p className="note-title">{title}</p> : null}
      <div className="note-body">{children}</div>
    </aside>
  );
}
export function DefinitionList({
  items,
}: {
  items: { term: string; description: ReactNode }[];
}) {
  return (
    <dl className="definitions">
      {items.map((item) => (
        <div className="definition" key={item.term}>
          <dt>{item.term}</dt>
          <dd>{item.description}</dd>
        </div>
      ))}
    </dl>
  );
}
export function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="bullets">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

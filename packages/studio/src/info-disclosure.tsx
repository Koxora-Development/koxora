import type { ReactNode } from 'react';
import { Icon } from '@koxora/ui';

export function InfoDisclosure({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={`info-disclosure ${className}`}>
      <summary aria-label={title}>
        <Icon name="info" />
        <span>{title}</span>
      </summary>
      <div className="info-disclosure-body">{children}</div>
    </details>
  );
}

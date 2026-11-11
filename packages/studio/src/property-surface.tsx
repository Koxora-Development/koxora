import type { ReactNode } from 'react';
import { Dialog } from '@koxora/ui';
export function PropertySurface({
  title,
  panel,
  onCancel,
  children,
}: {
  title: string;
  panel: boolean;
  onCancel: () => void;
  children: ReactNode;
}) {
  return panel ? (
    <section
      className="office-property-surface"
      role="region"
      aria-label={title}
    >
      <h3>{title}</h3>
      {children}
    </section>
  ) : (
    <Dialog className="properties-dialog" title={title} onCancel={onCancel}>
      {children}
    </Dialog>
  );
}

import type { ReactNode } from 'react';
/**
 * A table that can be wider than a phone screen. The scroll container is
 * focusable and named, so the columns that sit outside the viewport — on the
 * legal pages that includes the legal basis — stay reachable by keyboard and
 * are announced instead of silently cut off.
 */
export function DataTable({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="table-scroll" role="region" aria-label={label} tabIndex={0}>
      <p className="table-hint">{hint}</p>
      <table className="data-table">{children}</table>
    </div>
  );
}

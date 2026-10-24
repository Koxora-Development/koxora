import { StatusBadge } from './ui';
import type { PageContext } from './navigation';
/** Repeats the exact meaning of every status label used on this site. */
export function StatusLegend({ t }: PageContext) {
  const entries = [
    {
      tone: 'available' as const,
      label: t('status.available'),
      body: t('status.legend.available'),
    },
    {
      tone: 'in-development' as const,
      label: t('status.inDevelopment'),
      body: t('status.legend.inDevelopment'),
    },
    {
      tone: 'planned' as const,
      label: t('status.planned'),
      body: t('status.legend.planned'),
    },
    {
      tone: 'concept' as const,
      label: t('status.concept'),
      body: t('status.legend.concept'),
    },
  ];
  return (
    <section className="legend" aria-labelledby="status-legend-title">
      <h3 id="status-legend-title">{t('status.legend.title')}</h3>
      <dl>
        {entries.map((entry) => (
          <div key={entry.tone}>
            <dt>
              <StatusBadge tone={entry.tone} label={entry.label} />
            </dt>
            <dd>{entry.body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

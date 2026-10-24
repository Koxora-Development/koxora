import { Section } from '../components/ui';
import { PageIntro } from '../components/page-intro';
import { navLabelKeys, type PageContext } from '../components/navigation';
import { navRoutes, pathFor } from '../routes';
export function NotFoundPage({ locale, t }: PageContext) {
  const suggestions = [
    ...navRoutes('primary'),
    ...navRoutes('resources'),
  ].filter(
    (entry, index, all) =>
      all.findIndex((other) => other.id === entry.id) === index,
  );
  return (
    <>
      <PageIntro
        eyebrow={t('notFound.meta.title')}
        title={t('notFound.title')}
        lead={t('notFound.lead')}
      />
      <Section>
        <h2 className="minor-heading">{t('notFound.suggestions')}</h2>
        <ul className="bullets" role="list">
          <li>
            <a href={pathFor('home', locale)}>{t('cta.backHome')}</a>
          </li>
          {suggestions.map((entry) => (
            <li key={entry.id}>
              <a href={pathFor(entry.id, locale)}>
                {t(navLabelKeys[entry.id])}
              </a>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

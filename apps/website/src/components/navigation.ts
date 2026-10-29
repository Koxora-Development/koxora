import { site } from '../site';
import { pathFor, type Locale, type RouteId } from '../routes';
import type { MessageKey, Translate } from '../content/catalog';
export interface PageContext {
  locale: Locale;
  route: RouteId;
  t: Translate;
}
export const navLabelKeys: Record<RouteId, MessageKey> = {
  home: 'nav.home',
  features: 'nav.features',
  localFirst: 'nav.localFirst',
  compare: 'nav.compare',
  compareDrawio: 'cmp.page.drawio.hero.title',
  compareMiro: 'cmp.page.miro.hero.title',
  compareLucidchart: 'cmp.page.lucidchart.hero.title',
  roadmap: 'nav.roadmap',
  download: 'nav.download',
  docs: 'nav.docs',
  releases: 'nav.releases',
  legalNotice: 'nav.legalNotice',
  privacyPolicy: 'nav.privacyPolicy',
  privacySettings: 'nav.privacySettings',
};
// Applied before first paint so a stored appearance never flashes.
export const themeScript =
  "(function(){var d=document.documentElement;d.dataset.js='on';try{var v=localStorage.getItem('koxora.website.theme');if(v==='light'||v==='dark'){d.dataset.theme=v;return}}catch(e){}try{if(matchMedia('(prefers-color-scheme: light)').matches)d.dataset.theme='light'}catch(e){}})()";
export function studioLink(locale: Locale, t: Translate) {
  return site.editorUrl
    ? {
        href: site.editorUrl,
        label: t('cta.openStudio'),
        hint: t('cta.openStudioNote'),
        external: true,
      }
    : {
        href: pathFor('download', locale),
        label: t('cta.studioPending'),
        hint: t('cta.studioPendingNote'),
        external: false,
      };
}

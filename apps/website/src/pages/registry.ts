import type { ComponentType } from 'react';
import type { RouteId } from '../routes';
import type { MessageKey } from '../content/catalog';
import type { PageContext } from '../components/navigation';
import { HomePage } from './home';
import { FeaturesPage } from './features';
import { LocalFirstPage } from './local-first';
import { ComparePage } from './compare';
import { RoadmapPage } from './roadmap';
import { DownloadPage } from './download';
import { DocsPage } from './docs';
import { ReleasesPage } from './releases';
import { LegalNoticePage } from './legal-notice';
import { PrivacyPolicyPage } from './privacy-policy';
import { PrivacySettingsPage } from './privacy-settings';
export interface PageDefinition {
  Component: ComponentType<PageContext>;
  titleKey: MessageKey;
  descriptionKey: MessageKey;
}
export const pageRegistry: Record<RouteId, PageDefinition> = {
  home: {
    Component: HomePage,
    titleKey: 'home.meta.title',
    descriptionKey: 'home.meta.description',
  },
  features: {
    Component: FeaturesPage,
    titleKey: 'features.meta.title',
    descriptionKey: 'features.meta.description',
  },
  localFirst: {
    Component: LocalFirstPage,
    titleKey: 'localFirst.meta.title',
    descriptionKey: 'localFirst.meta.description',
  },
  compare: {
    Component: ComparePage,
    titleKey: 'compare.meta.title',
    descriptionKey: 'compare.meta.description',
  },
  roadmap: {
    Component: RoadmapPage,
    titleKey: 'roadmap.meta.title',
    descriptionKey: 'roadmap.meta.description',
  },
  download: {
    Component: DownloadPage,
    titleKey: 'download.meta.title',
    descriptionKey: 'download.meta.description',
  },
  docs: {
    Component: DocsPage,
    titleKey: 'docs.meta.title',
    descriptionKey: 'docs.meta.description',
  },
  releases: {
    Component: ReleasesPage,
    titleKey: 'releases.meta.title',
    descriptionKey: 'releases.meta.description',
  },
  legalNotice: {
    Component: LegalNoticePage,
    titleKey: 'legalNotice.meta.title',
    descriptionKey: 'legalNotice.meta.description',
  },
  privacyPolicy: {
    Component: PrivacyPolicyPage,
    titleKey: 'privacyPolicy.meta.title',
    descriptionKey: 'privacyPolicy.meta.description',
  },
  privacySettings: {
    Component: PrivacySettingsPage,
    titleKey: 'privacySettings.meta.title',
    descriptionKey: 'privacySettings.meta.description',
  },
};

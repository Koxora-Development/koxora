import type { MessageKey } from './catalog';
import type { RouteId } from '../routes';
/**
 * The documentation, as a structure rather than as a page.
 *
 * The hub, the navigation between sections and the sitemap all read this, so
 * a section cannot exist in one and be missing from another. Each section
 * carries the status of what it describes, and the statuses are the ones the
 * rest of this site uses: a reader who has seen them on the features page
 * does not have to learn a second vocabulary.
 */
export type DocsStatus = 'available' | 'inDevelopment' | 'planned';
export interface DocsSection {
  route: RouteId;
  titleKey: MessageKey;
  summaryKey: MessageKey;
  /**
   * What the section describes, not whether the page itself is written. A
   * page about a planned capability says so on every claim it makes.
   */
  status: DocsStatus;
}
/**
 * The sections of the documentation, in reading order. Three of them are
 * pages this site already had: local-first, the capability list and the
 * roadmap. They are linked rather than rewritten, because two descriptions
 * of the same thing drift apart.
 */
export const docsSections: DocsSection[] = [
  {
    route: 'docsStart',
    titleKey: 'docs.section.start.title',
    summaryKey: 'docs.section.start.summary',
    status: 'available',
  },
  {
    route: 'docsEditing',
    titleKey: 'docs.section.editing.title',
    summaryKey: 'docs.section.editing.summary',
    status: 'available',
  },
  {
    route: 'localFirst',
    titleKey: 'docs.section.localFirst.title',
    summaryKey: 'docs.section.localFirst.summary',
    status: 'available',
  },
  {
    route: 'docsProjects',
    titleKey: 'docs.section.projects.title',
    summaryKey: 'docs.section.projects.summary',
    status: 'available',
  },
  {
    route: 'features',
    titleKey: 'docs.section.features.title',
    summaryKey: 'docs.section.features.summary',
    status: 'available',
  },
  {
    route: 'roadmap',
    titleKey: 'docs.section.roadmap.title',
    summaryKey: 'docs.section.roadmap.summary',
    status: 'planned',
  },
  {
    route: 'docsFaq',
    titleKey: 'docs.section.faq.title',
    summaryKey: 'docs.section.faq.summary',
    status: 'available',
  },
  {
    route: 'docsSupport',
    titleKey: 'docs.section.support.title',
    summaryKey: 'docs.section.support.summary',
    status: 'available',
  },
];
export interface DocsEntry {
  titleKey: MessageKey;
  bodyKey: MessageKey;
}
/**
 * The questions, in the order a reader is likely to have them: can I use it,
 * what does it cost me, where is my work, and what is missing.
 */
export const faqEntries: DocsEntry[] = [
  { titleKey: 'faq.account.q', bodyKey: 'faq.account.a' },
  { titleKey: 'faq.release.q', bodyKey: 'faq.release.a' },
  { titleKey: 'faq.offline.q', bodyKey: 'faq.offline.a' },
  { titleKey: 'faq.where.q', bodyKey: 'faq.where.a' },
  { titleKey: 'faq.clearing.q', bodyKey: 'faq.clearing.a' },
  { titleKey: 'faq.formats.q', bodyKey: 'faq.formats.a' },
  { titleKey: 'faq.today.q', bodyKey: 'faq.today.a' },
  { titleKey: 'faq.missing.q', bodyKey: 'faq.missing.a' },
  { titleKey: 'faq.languages.q', bodyKey: 'faq.languages.a' },
  { titleKey: 'faq.price.q', bodyKey: 'faq.price.a' },
  { titleKey: 'faq.source.q', bodyKey: 'faq.source.a' },
  { titleKey: 'faq.problem.q', bodyKey: 'faq.problem.a' },
];
/** The steps a first project takes, each one something a reader can do. */
export const startSteps: DocsEntry[] = [
  { titleKey: 'docsStart.step1.title', bodyKey: 'docsStart.step1.body' },
  { titleKey: 'docsStart.step2.title', bodyKey: 'docsStart.step2.body' },
  { titleKey: 'docsStart.step3.title', bodyKey: 'docsStart.step3.body' },
  { titleKey: 'docsStart.step4.title', bodyKey: 'docsStart.step4.body' },
];
/** What the editor does today, grouped the way a reader works. */
export const editingTopics: DocsEntry[] = [
  { titleKey: 'docsEditing.place.title', bodyKey: 'docsEditing.place.body' },
  { titleKey: 'docsEditing.select.title', bodyKey: 'docsEditing.select.body' },
  { titleKey: 'docsEditing.move.title', bodyKey: 'docsEditing.move.body' },
  {
    titleKey: 'docsEditing.connect.title',
    bodyKey: 'docsEditing.connect.body',
  },
  { titleKey: 'docsEditing.text.title', bodyKey: 'docsEditing.text.body' },
  {
    titleKey: 'docsEditing.history.title',
    bodyKey: 'docsEditing.history.body',
  },
  {
    titleKey: 'docsEditing.keyboard.title',
    bodyKey: 'docsEditing.keyboard.body',
  },
];
/** What a project is, where it lives and how it leaves. */
export const projectTopics: DocsEntry[] = [
  {
    titleKey: 'docsProjects.format.title',
    bodyKey: 'docsProjects.format.body',
  },
  { titleKey: 'docsProjects.saved.title', bodyKey: 'docsProjects.saved.body' },
  {
    titleKey: 'docsProjects.transfer.title',
    bodyKey: 'docsProjects.transfer.body',
  },
  {
    titleKey: 'docsProjects.backup.title',
    bodyKey: 'docsProjects.backup.body',
  },
  {
    titleKey: 'docsProjects.notStored.title',
    bodyKey: 'docsProjects.notStored.body',
  },
];

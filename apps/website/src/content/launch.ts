import { site } from '../site';
import type { MessageKey } from './catalog';
/**
 * Copy that has to change when this website itself goes live, kept in one
 * place so a launch cannot leave a stale sentence behind. It says nothing
 * about the studio or about downloads: those stay governed by
 * `site.editorUrl` and by the release process.
 */
export interface LaunchCopy {
  statusSummary: MessageKey;
  milestone: MessageKey;
}
export function launchCopy(published: boolean = site.published): LaunchCopy {
  return published
    ? {
        statusSummary: 'project.statusSummary.published',
        milestone: 'project.statusMilestoneValue.published',
      }
    : {
        statusSummary: 'project.statusSummary',
        milestone: 'project.statusMilestoneValue',
      };
}
/**
 * Wording that describes the website as unpublished. None of it may survive
 * in the copy a launched deployment renders; a unit test enforces that.
 */
export const preLaunchPhrases = [
  'website is in review',
  'website W1',
  'Website W1',
  'not published yet',
  'Website befindet sich in der Prüfung',
  'Website W1 in Arbeit',
  'noch nicht veröffentlicht',
];
/**
 * Notices written for the review of this branch. They explain that the legal
 * text has not yet been checked against the deployed services, which is true
 * while the site is unpublished and is addressed to the operator, not to a
 * visitor. A published build must not render them, and the page emitter fails
 * if one of these phrases survives into published output.
 */
export const internalReviewPhrases = [
  'Status of this document',
  'Status dieses Dokuments',
  'prepared content',
  'vorbereiteter Inhalt',
  'Before publication, the operator verifies',
  'Vor der Veröffentlichung prüft der Betreiber',
  'before this site is published',
  'vor der Veröffentlichung dieser Website',
];
/** Whether this build still carries the notices written for the review. */
export function showsInternalReviewNotes(
  published: boolean = site.published,
): boolean {
  return !published;
}

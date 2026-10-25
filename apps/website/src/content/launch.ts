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

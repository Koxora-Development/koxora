import type { Document, Project } from './types';

/** Older readers omit freehand labels and must not silently display an incomplete drawing. */
export const FREEHAND_TEXT_FEATURE = 'freehand-text-v1';
export const FREEHAND_TEXT_KEY = 'org.koxora.freehand-text';

/** Required by projects whose diagrams depend on visual swimlane backgrounds. */
export const SWIMLANES_FEATURE = 'swimlanes-v1';
export type SwimlaneKind = 'swimlane-horizontal' | 'swimlane-vertical';

export function isSwimlaneKind(kind: string): kind is SwimlaneKind {
  return kind === 'swimlane-horizontal' || kind === 'swimlane-vertical';
}

export function withSwimlaneFeature(project: Project): Project {
  const { manifest } = project;
  if (manifest.requiredFeatures.includes(SWIMLANES_FEATURE)) return project;

  const hasSwimlane = (document: Document) =>
    document.pages.some((page) =>
      page.nodes.some((node) => isSwimlaneKind(node.kind)),
    );
  if (
    !project.documents.some(hasSwimlane) &&
    !project.templates.some((template) => hasSwimlane(template.document))
  )
    return project;

  return {
    ...project,
    manifest: {
      ...manifest,
      requiredFeatures: [...manifest.requiredFeatures, SWIMLANES_FEATURE],
    },
  };
}

import { createContext } from 'react';
import type { Project } from '@koxora/project';
import type { ProjectSummary } from '@koxora/persistence';
import type { LinkTarget } from '@koxora/editor-core';
export const NavigationContext = createContext<{
  projects: ProjectSummary[];
  loadProject: (id: string) => Promise<Project>;
  follow: (
    target: Exclude<LinkTarget, { type: 'url' } | { type: 'page' }>,
  ) => void;
} | null>(null);

import { createProject, validateProject, type Project } from '@koxora/project';
import {
  CONNECTION_KEY,
  ELEMENT_KEY,
  MAX_TEXT,
  type ShapeKind,
} from './shapes';
import type { Routing } from './connections';

export type TemplateCategory =
  'mindmap' | 'flowchart' | 'organization' | 'planning';
export interface TemplateNode {
  readonly id: string;
  readonly kind: ShapeKind;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly textKey: string;
  readonly fill: string;
}
export interface TemplateConnection {
  readonly source: string;
  readonly target: string;
  readonly routing: Routing;
  readonly arrow: boolean;
  readonly labelKey?: string;
}
export interface BuiltInTemplate {
  readonly id: string;
  readonly category: TemplateCategory;
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly nodes: readonly TemplateNode[];
  readonly connections: readonly TemplateConnection[];
}

const colors = {
  violet: '#ede9fe',
  blue: '#dbeafe',
  green: '#dcfce7',
  amber: '#fef3c7',
  rose: '#ffe4e6',
  teal: '#ccfbf1',
  gray: '#f1f5f9',
};
function node(
  id: string,
  text: string,
  x: number,
  y: number,
  width = 200,
  height = 80,
  fill = colors.blue,
  kind: ShapeKind = 'rounded-rectangle',
): TemplateNode {
  return Object.freeze({
    id,
    kind,
    x,
    y,
    width,
    height,
    textKey: `templates.topic.${text}`,
    fill,
  });
}
function link(
  source: string,
  target: string,
  routing: Routing = 'straight',
  arrow = false,
  label?: string,
): TemplateConnection {
  return Object.freeze({
    source,
    target,
    routing,
    arrow,
    ...(label ? { labelKey: `templates.topic.${label}` } : {}),
  });
}
function template(
  id: string,
  category: TemplateCategory,
  nodes: TemplateNode[],
  connections: TemplateConnection[],
): BuiltInTemplate {
  return Object.freeze({
    id,
    category,
    titleKey: `templates.${id}.title`,
    descriptionKey: `templates.${id}.description`,
    nodes: Object.freeze(nodes),
    connections: Object.freeze(connections),
  });
}

/** Trusted bundled drawing data. Local descriptor identities never enter a created project. */
export const templateCatalog: readonly BuiltInTemplate[] = Object.freeze([
  template(
    'mindmap-radial',
    'mindmap',
    [
      node('center', 'central', 410, 250, 220, 110, colors.violet, 'ellipse'),
      node('ideas', 'ideas', 420, 20, 200, 76, colors.blue),
      node('questions', 'questions', 770, 110, 200, 76, colors.amber),
      node('resources', 'resources', 770, 420, 200, 76, colors.teal),
      node('actions', 'actions', 420, 570, 200, 76, colors.green),
      node('risks', 'risks', 70, 420, 200, 76, colors.rose),
      node('goals', 'goals', 70, 110, 200, 76, colors.blue),
    ],
    ['ideas', 'questions', 'resources', 'actions', 'risks', 'goals'].map((id) =>
      link('center', id, 'curved'),
    ),
  ),
  template(
    'mindmap-tree',
    'mindmap',
    [
      node('center', 'project', 40, 280, 200, 88, colors.violet),
      node('plan', 'plan', 340, 80, 190, 76, colors.blue),
      node('build', 'build', 340, 280, 190, 76, colors.teal),
      node('review', 'review', 340, 480, 190, 76, colors.amber),
      node('scope', 'scope', 640, 40, 190, 68, colors.blue),
      node('people', 'people', 640, 140, 190, 68, colors.blue),
      node('draft', 'draft', 640, 240, 190, 68, colors.teal),
      node('deliver', 'deliver', 640, 340, 190, 68, colors.teal),
      node('feedback', 'feedback', 640, 440, 190, 68, colors.amber),
      node('improve', 'improve', 640, 540, 190, 68, colors.amber),
    ],
    [
      link('center', 'plan', 'curved'),
      link('center', 'build', 'curved'),
      link('center', 'review', 'curved'),
      link('plan', 'scope', 'curved'),
      link('plan', 'people', 'curved'),
      link('build', 'draft', 'curved'),
      link('build', 'deliver', 'curved'),
      link('review', 'feedback', 'curved'),
      link('review', 'improve', 'curved'),
    ],
  ),
  template(
    'mindmap-study',
    'mindmap',
    [
      node('center', 'study', 390, 230, 220, 110, colors.violet, 'ellipse'),
      node('basics', 'basics', 50, 70, 240, 100, colors.blue),
      node('examples', 'examples', 710, 70, 240, 100, colors.green),
      node('practice', 'practice', 50, 400, 240, 100, colors.teal),
      node('questions', 'openQuestions', 710, 400, 240, 100, colors.amber),
    ],
    ['basics', 'examples', 'practice', 'questions'].map((id) =>
      link('center', id, 'curved'),
    ),
  ),
  template(
    'flowchart-process',
    'flowchart',
    [
      node('start', 'start', 320, 20, 160, 64, colors.green, 'ellipse'),
      node('prepare', 'prepare', 290, 150, 220, 80, colors.blue),
      node('work', 'work', 290, 310, 220, 80, colors.violet),
      node('done', 'done', 320, 470, 160, 64, colors.green, 'ellipse'),
    ],
    [
      link('start', 'prepare', 'straight', true),
      link('prepare', 'work', 'straight', true),
      link('work', 'done', 'straight', true),
    ],
  ),
  template(
    'flowchart-decision',
    'flowchart',
    [
      node('start', 'start', 330, 20, 180, 64, colors.green, 'ellipse'),
      node('prepare', 'prepare', 300, 150, 240, 76, colors.blue),
      node('decision', 'approved', 300, 290, 240, 160, colors.amber, 'diamond'),
      node('continue', 'continue', 70, 550, 220, 88, colors.green),
      node('check', 'check', 550, 550, 220, 88, colors.rose),
    ],
    [
      link('start', 'prepare', 'straight', true),
      link('prepare', 'decision', 'straight', true),
      link('decision', 'continue', 'straight', true, 'yes'),
      link('decision', 'check', 'straight', true, 'no'),
    ],
  ),
  template(
    'organization-team',
    'organization',
    [
      node('lead', 'teamLead', 365, 20, 220, 84, colors.violet),
      node('design', 'design', 90, 230, 220, 84, colors.blue),
      node('development', 'development', 365, 230, 220, 84, colors.teal),
      node('operations', 'operations', 640, 230, 220, 84, colors.amber),
    ],
    [
      link('lead', 'design', 'orthogonal'),
      link('lead', 'development', 'orthogonal'),
      link('lead', 'operations', 'orthogonal'),
    ],
  ),
  template(
    'planning-week',
    'planning',
    [
      node('monday', 'monday', 40, 30, 180, 64, colors.blue),
      node('tuesday', 'tuesday', 260, 30, 180, 64, colors.teal),
      node('wednesday', 'wednesday', 480, 30, 180, 64, colors.violet),
      node('thursday', 'thursday', 700, 30, 180, 64, colors.amber),
      node('friday', 'friday', 920, 30, 180, 64, colors.green),
      ...[40, 260, 480, 700, 920].map((x, i) =>
        node(`task-${i}`, 'priorityNotes', x, 140, 180, 180, colors.gray),
      ),
    ],
    [],
  ),
  template(
    'planning-goals',
    'planning',
    [
      node('goal', 'goal', 320, 30, 280, 100, colors.violet),
      node('first', 'firstStep', 70, 250, 220, 100, colors.blue),
      node('next', 'nextStep', 350, 250, 220, 100, colors.teal),
      node('last', 'finalStep', 630, 250, 220, 100, colors.green),
      node('success', 'successMeasure', 250, 480, 420, 100, colors.amber),
    ],
    [
      link('goal', 'first', 'straight', true),
      link('goal', 'next', 'straight', true),
      link('goal', 'last', 'straight', true),
    ],
  ),
]);

/** Instantiate a separate ordinary drawing. Templates contain no executable or remote resources. */
export function createFromTemplate(
  templateId: string,
  title: string,
  text: (key: string) => string,
  makeId: () => string,
  now: string,
): Project {
  const source = templateCatalog.find((item) => item.id === templateId);
  if (!source) throw new Error('Unknown built-in template');
  const project = createProject(title, makeId, now);
  const document = project.documents[0],
    page = document.pages[0];
  const ids = new Map(source.nodes.map((item) => [item.id, makeId()]));
  const label = (key: string): string => {
    const value = text(key);
    if (typeof value !== 'string' || value.length > MAX_TEXT)
      throw new Error('Invalid template text');
    return value;
  };
  page.nodes = source.nodes.map((item) => ({
    id: ids.get(item.id)!,
    kind: item.kind,
    layerId: page.layers[0].id,
    geometry: {
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      rotation: 0,
    },
    content: { text: label(item.textKey) },
    metadata: {},
    assetIds: [],
    dataBindings: [],
    extensions: {
      [ELEMENT_KEY]: {
        version: 1,
        style: {
          fill: item.fill,
          stroke: '#64748b',
          textColor: 'auto',
          fontSize: 16,
        },
      },
    },
  }));
  page.connections = source.connections.map((item) => ({
    id: makeId(),
    sourceId: ids.get(item.source)!,
    targetId: ids.get(item.target)!,
    layerId: page.layers[0].id,
    relationType: 'connection',
    waypoints: [],
    extensions: {
      [CONNECTION_KEY]: {
        version: 1,
        routing: item.routing,
        arrow: item.arrow,
        label: item.labelKey ? label(item.labelKey) : '',
        sourceAnchor: 'auto',
        targetAnchor: 'auto',
        style: { stroke: '#64748b' },
      },
    },
  }));
  const left = Math.min(...source.nodes.map((item) => item.x));
  const top = Math.min(...source.nodes.map((item) => item.y));
  const right = Math.max(...source.nodes.map((item) => item.x + item.width));
  const bottom = Math.max(...source.nodes.map((item) => item.y + item.height));
  page.viewport = {
    x: (left + right) / 2,
    y: (top + bottom) / 2,
    zoom: Math.min(1, 800 / (right - left + 100), 500 / (bottom - top + 100)),
  };
  validateProject(project);
  return project;
}

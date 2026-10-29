import type { MessageKey } from './catalog';
/**
 * The sourced product comparison.
 *
 * Every statement about another product carries at least one source that says
 * it, and the date that source was read. Where a source does not say
 * something, the answer is `unknown` rather than a guess: a comparison that
 * fills its own gaps is advertising.
 *
 * Statements about Koxora describe the **merged development version** of this
 * repository. Koxora has no public release, which the page says plainly, and
 * a capability that is only planned is marked `planned` and never ticked.
 */
export type ClaimStatus =
  | 'supported'
  | 'limited'
  | 'notSupported'
  | 'planned'
  | 'unknown'
  /** A descriptive answer rather than a yes or a no. */
  | 'info';
export const claimStatuses: ClaimStatus[] = [
  'supported',
  'limited',
  'notSupported',
  'planned',
  'unknown',
  'info',
];
export type ProductId =
  'koxora' | 'drawio' | 'excalidraw' | 'lucidchart' | 'miro' | 'visio';
export type DimensionId =
  | 'offline'
  | 'onDevice'
  | 'withoutAccount'
  | 'desktop'
  | 'diagramTypes'
  | 'importExport'
  | 'collaboration'
  | 'ai'
  | 'integration'
  | 'licence';
/** Groups the filter offers, so a reader can look at one question at a time. */
export type DimensionGroup = 'independence' | 'work' | 'together' | 'cost';
export interface Product {
  id: ProductId;
  /** The product name as its own maker writes it; never translated. */
  name: string;
  /** Official address, for the reader and for the source list. */
  url: string;
  descriptionKey: MessageKey;
  /** What was looked at: the plan, edition or build the answers describe. */
  examinedKey: MessageKey;
}
export interface Source {
  id: string;
  url: string;
  /** Title of the cited page, in its own language. */
  label: string;
  /** ISO date the page was read for this comparison. */
  checked: string;
}
export interface Claim {
  status: ClaimStatus;
  noteKey: MessageKey;
  /** Source identifiers; empty only for statements about Koxora itself. */
  sources: string[];
}
export interface Dimension {
  id: DimensionId;
  group: DimensionGroup;
  labelKey: MessageKey;
  descriptionKey: MessageKey;
  claims: Record<ProductId, Claim>;
}
/** The day the whole table was last reviewed against its sources. */
export const comparisonCheckedOn = '2026-10-25';
export const products: Product[] = [
  {
    id: 'koxora',
    name: 'Koxora',
    url: 'https://koxora.app',
    descriptionKey: 'cmp.product.koxora.description',
    examinedKey: 'cmp.product.koxora.examined',
  },
  {
    id: 'drawio',
    name: 'diagrams.net / draw.io',
    url: 'https://www.drawio.com/',
    descriptionKey: 'cmp.product.drawio.description',
    examinedKey: 'cmp.product.drawio.examined',
  },
  {
    id: 'excalidraw',
    name: 'Excalidraw',
    url: 'https://excalidraw.com/',
    descriptionKey: 'cmp.product.excalidraw.description',
    examinedKey: 'cmp.product.excalidraw.examined',
  },
  {
    id: 'lucidchart',
    name: 'Lucidchart',
    url: 'https://www.lucidchart.com/',
    descriptionKey: 'cmp.product.lucidchart.description',
    examinedKey: 'cmp.product.lucidchart.examined',
  },
  {
    id: 'miro',
    name: 'Miro',
    url: 'https://miro.com/',
    descriptionKey: 'cmp.product.miro.description',
    examinedKey: 'cmp.product.miro.examined',
  },
  {
    id: 'visio',
    name: 'Microsoft Visio',
    url: 'https://www.microsoft.com/microsoft-365/visio',
    descriptionKey: 'cmp.product.visio.description',
    examinedKey: 'cmp.product.visio.examined',
  },
];
export const sources: Source[] = [
  {
    id: 'koxora-repo',
    url: 'https://github.com/Koxora-Development/koxora',
    label: 'Koxora source repository, merged development version',
    checked: comparisonCheckedOn,
  },
  {
    id: 'drawio-home',
    url: 'https://www.drawio.com/',
    label: 'draw.io — Security-first diagramming',
    checked: comparisonCheckedOn,
  },
  {
    id: 'drawio-desktop',
    url: 'https://github.com/jgraph/drawio-desktop',
    label: 'jgraph/drawio-desktop — README and releases',
    checked: comparisonCheckedOn,
  },
  {
    id: 'excalidraw-repo',
    url: 'https://github.com/excalidraw/excalidraw',
    label: 'excalidraw/excalidraw — README and licence',
    checked: comparisonCheckedOn,
  },
  {
    id: 'excalidraw-plus',
    url: 'https://plus.excalidraw.com/',
    label: 'Excalidraw+ — product page',
    checked: comparisonCheckedOn,
  },
  {
    id: 'lucid-offline',
    url: 'https://help.lucid.co/hc/en-us/articles/14756313957268-Edit-offline-in-Lucid',
    label: 'Lucid Help Center — Edit offline in Lucid',
    checked: comparisonCheckedOn,
  },
  {
    id: 'lucid-requirements',
    url: 'https://help.lucid.co/hc/en-us/articles/360049892331-System-requirements-for-optimized-Lucid-performance',
    label:
      'Lucid Help Center — System requirements for optimized Lucid performance',
    checked: comparisonCheckedOn,
  },
  {
    id: 'lucid-pricing',
    url: 'https://lucid.app/pricing/lucidchart',
    label: 'Lucidchart pricing — free and premium diagramming plans',
    checked: comparisonCheckedOn,
  },
  {
    id: 'miro-pricing',
    url: 'https://miro.com/pricing/',
    label: 'Miro pricing — plans and what each includes',
    checked: comparisonCheckedOn,
  },
  {
    id: 'miro-apps',
    url: 'https://miro.com/apps/',
    label: 'Miro — download the apps',
    checked: comparisonCheckedOn,
  },
  {
    id: 'visio-plans',
    url: 'https://www.microsoft.com/en-us/microsoft-365/visio/visio-plans-and-pricing',
    label: 'Microsoft 365 Visio — compare subscription plans and pricing',
    checked: comparisonCheckedOn,
  },
  {
    id: 'visio-compare',
    url: 'https://support.microsoft.com/en-us/visio/compare-visio-versions-and-features',
    label: 'Microsoft Support — compare Visio versions and features',
    checked: comparisonCheckedOn,
  },
];
export function sourceById(id: string): Source {
  const source = sources.find((entry) => entry.id === id);
  if (!source) throw new Error(`Unknown comparison source: ${id}`);
  return source;
}
export function productById(id: ProductId): Product {
  const product = products.find((entry) => entry.id === id);
  if (!product) throw new Error(`Unknown comparison product: ${id}`);
  return product;
}
function claim(
  status: ClaimStatus,
  noteKey: MessageKey,
  sources: string[] = [],
): Claim {
  return { status, noteKey, sources };
}
export const dimensions: Dimension[] = [
  {
    id: 'offline',
    group: 'independence',
    labelKey: 'cmp.dim.offline.label',
    descriptionKey: 'cmp.dim.offline.description',
    claims: {
      koxora: claim('supported', 'cmp.offline.koxora', ['koxora-repo']),
      drawio: claim('supported', 'cmp.offline.drawio', [
        'drawio-desktop',
        'drawio-home',
      ]),
      excalidraw: claim('supported', 'cmp.offline.excalidraw', [
        'excalidraw-repo',
      ]),
      lucidchart: claim('limited', 'cmp.offline.lucidchart', ['lucid-offline']),
      miro: claim('unknown', 'cmp.offline.miro', ['miro-apps']),
      visio: claim('limited', 'cmp.offline.visio', [
        'visio-plans',
        'visio-compare',
      ]),
    },
  },
  {
    id: 'onDevice',
    group: 'independence',
    labelKey: 'cmp.dim.onDevice.label',
    descriptionKey: 'cmp.dim.onDevice.description',
    claims: {
      koxora: claim('supported', 'cmp.onDevice.koxora', ['koxora-repo']),
      drawio: claim('supported', 'cmp.onDevice.drawio', [
        'drawio-home',
        'drawio-desktop',
      ]),
      excalidraw: claim('supported', 'cmp.onDevice.excalidraw', [
        'excalidraw-repo',
      ]),
      lucidchart: claim('unknown', 'cmp.onDevice.lucidchart', [
        'lucid-offline',
      ]),
      miro: claim('unknown', 'cmp.onDevice.miro', []),
      visio: claim('limited', 'cmp.onDevice.visio', [
        'visio-plans',
        'visio-compare',
      ]),
    },
  },
  {
    id: 'withoutAccount',
    group: 'independence',
    labelKey: 'cmp.dim.withoutAccount.label',
    descriptionKey: 'cmp.dim.withoutAccount.description',
    claims: {
      koxora: claim('supported', 'cmp.withoutAccount.koxora', ['koxora-repo']),
      drawio: claim('supported', 'cmp.withoutAccount.drawio', ['drawio-home']),
      excalidraw: claim('supported', 'cmp.withoutAccount.excalidraw', [
        'excalidraw-plus',
      ]),
      lucidchart: claim('unknown', 'cmp.withoutAccount.lucidchart', [
        'lucid-pricing',
      ]),
      miro: claim('unknown', 'cmp.withoutAccount.miro', ['miro-pricing']),
      visio: claim('notSupported', 'cmp.withoutAccount.visio', ['visio-plans']),
    },
  },
  {
    id: 'desktop',
    group: 'independence',
    labelKey: 'cmp.dim.desktop.label',
    descriptionKey: 'cmp.dim.desktop.description',
    claims: {
      koxora: claim('planned', 'cmp.desktop.koxora', ['koxora-repo']),
      drawio: claim('supported', 'cmp.desktop.drawio', ['drawio-desktop']),
      excalidraw: claim('unknown', 'cmp.desktop.excalidraw', [
        'excalidraw-repo',
      ]),
      lucidchart: claim('unknown', 'cmp.desktop.lucidchart', [
        'lucid-requirements',
      ]),
      miro: claim('supported', 'cmp.desktop.miro', ['miro-apps']),
      visio: claim('limited', 'cmp.desktop.visio', [
        'visio-plans',
        'visio-compare',
      ]),
    },
  },
  {
    id: 'diagramTypes',
    group: 'work',
    labelKey: 'cmp.dim.diagramTypes.label',
    descriptionKey: 'cmp.dim.diagramTypes.description',
    claims: {
      koxora: claim('info', 'cmp.diagramTypes.koxora', ['koxora-repo']),
      drawio: claim('unknown', 'cmp.diagramTypes.drawio', ['drawio-home']),
      excalidraw: claim('info', 'cmp.diagramTypes.excalidraw', [
        'excalidraw-repo',
      ]),
      lucidchart: claim('unknown', 'cmp.diagramTypes.lucidchart', []),
      miro: claim('unknown', 'cmp.diagramTypes.miro', []),
      visio: claim('info', 'cmp.diagramTypes.visio', ['visio-compare']),
    },
  },
  {
    id: 'importExport',
    group: 'work',
    labelKey: 'cmp.dim.importExport.label',
    descriptionKey: 'cmp.dim.importExport.description',
    claims: {
      koxora: claim('limited', 'cmp.importExport.koxora', ['koxora-repo']),
      drawio: claim('unknown', 'cmp.importExport.drawio', ['drawio-home']),
      excalidraw: claim('info', 'cmp.importExport.excalidraw', [
        'excalidraw-repo',
      ]),
      lucidchart: claim('unknown', 'cmp.importExport.lucidchart', []),
      miro: claim('unknown', 'cmp.importExport.miro', []),
      visio: claim('info', 'cmp.importExport.visio', ['visio-compare']),
    },
  },
  {
    id: 'collaboration',
    group: 'together',
    labelKey: 'cmp.dim.collaboration.label',
    descriptionKey: 'cmp.dim.collaboration.description',
    claims: {
      koxora: claim('planned', 'cmp.collaboration.koxora', ['koxora-repo']),
      drawio: claim('unknown', 'cmp.collaboration.drawio', ['drawio-home']),
      excalidraw: claim('supported', 'cmp.collaboration.excalidraw', [
        'excalidraw-repo',
      ]),
      lucidchart: claim('supported', 'cmp.collaboration.lucidchart', [
        'lucid-offline',
      ]),
      miro: claim('supported', 'cmp.collaboration.miro', ['miro-pricing']),
      visio: claim('unknown', 'cmp.collaboration.visio', ['visio-compare']),
    },
  },
  {
    id: 'ai',
    group: 'together',
    labelKey: 'cmp.dim.ai.label',
    descriptionKey: 'cmp.dim.ai.description',
    claims: {
      koxora: claim('planned', 'cmp.ai.koxora', ['koxora-repo']),
      drawio: claim('unknown', 'cmp.ai.drawio', []),
      excalidraw: claim('limited', 'cmp.ai.excalidraw', ['excalidraw-plus']),
      lucidchart: claim('unknown', 'cmp.ai.lucidchart', []),
      miro: claim('limited', 'cmp.ai.miro', ['miro-pricing']),
      visio: claim('unknown', 'cmp.ai.visio', []),
    },
  },
  {
    id: 'integration',
    group: 'together',
    labelKey: 'cmp.dim.integration.label',
    descriptionKey: 'cmp.dim.integration.description',
    claims: {
      koxora: claim('planned', 'cmp.integration.koxora', ['koxora-repo']),
      drawio: claim('supported', 'cmp.integration.drawio', ['drawio-home']),
      excalidraw: claim('supported', 'cmp.integration.excalidraw', [
        'excalidraw-repo',
      ]),
      lucidchart: claim('unknown', 'cmp.integration.lucidchart', []),
      miro: claim('supported', 'cmp.integration.miro', ['miro-pricing']),
      visio: claim('unknown', 'cmp.integration.visio', []),
    },
  },
  {
    id: 'licence',
    group: 'cost',
    labelKey: 'cmp.dim.licence.label',
    descriptionKey: 'cmp.dim.licence.description',
    claims: {
      koxora: claim('info', 'cmp.licence.koxora', ['koxora-repo']),
      drawio: claim('info', 'cmp.licence.drawio', [
        'drawio-desktop',
        'drawio-home',
      ]),
      excalidraw: claim('info', 'cmp.licence.excalidraw', [
        'excalidraw-repo',
        'excalidraw-plus',
      ]),
      lucidchart: claim('limited', 'cmp.licence.lucidchart', ['lucid-pricing']),
      miro: claim('limited', 'cmp.licence.miro', ['miro-pricing']),
      visio: claim('limited', 'cmp.licence.visio', ['visio-plans']),
    },
  },
];
export const dimensionGroups: {
  id: DimensionGroup;
  labelKey: MessageKey;
}[] = [
  { id: 'independence', labelKey: 'cmp.group.independence' },
  { id: 'work', labelKey: 'cmp.group.work' },
  { id: 'together', labelKey: 'cmp.group.together' },
  { id: 'cost', labelKey: 'cmp.group.cost' },
];
/** The products that have a page of their own, and what that page compares. */
export const comparisonPages: {
  product: Exclude<ProductId, 'koxora'>;
  /** Dimensions the page highlights, in order. */
  highlight: DimensionId[];
}[] = [
  {
    product: 'drawio',
    highlight: ['offline', 'onDevice', 'withoutAccount', 'desktop', 'licence'],
  },
  {
    product: 'miro',
    highlight: [
      'offline',
      'onDevice',
      'withoutAccount',
      'collaboration',
      'licence',
    ],
  },
  {
    product: 'lucidchart',
    highlight: [
      'offline',
      'onDevice',
      'withoutAccount',
      'collaboration',
      'licence',
    ],
  },
];
export function dimensionById(id: DimensionId): Dimension {
  const dimension = dimensions.find((entry) => entry.id === id);
  if (!dimension) throw new Error(`Unknown comparison dimension: ${id}`);
  return dimension;
}
/** Every source a claim actually cites, in the order the table shows them. */
export function citedSources(): Source[] {
  const seen = new Set<string>();
  const cited: Source[] = [];
  for (const dimension of dimensions)
    for (const product of products)
      for (const id of dimension.claims[product.id].sources)
        if (!seen.has(id)) {
          seen.add(id);
          cited.push(sourceById(id));
        }
  return cited;
}

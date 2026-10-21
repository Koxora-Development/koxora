import {
  COLLECTIONS,
  type Project,
  type Document,
  type Extensible,
  type Style,
  type Json,
} from './types';
import {
  array,
  boolean,
  check,
  compatible,
  DEFAULT_LIMITS,
  id,
  isId,
  json,
  namespace,
  number,
  reader,
  record,
  text,
  version,
  type ResourceLimits,
} from './validation';
import { safePath } from './zip';
export const FEATURES = [
  'documents',
  'pages',
  'nodes',
  'connections',
  'layers',
  'relationships',
  'datasets',
  'assets',
  'styles',
  'themes',
  'templates',
  'actions',
  'animations',
  'previews',
];
export function validateProject(
  input: unknown,
  budget: ResourceLimits = { ...DEFAULT_LIMITS },
): asserts input is Project {
  record(input, '$');
  const p = input as unknown as Project;
  const jsonBudget = { left: budget.values };
  for (const key of ['manifest', ...COLLECTIONS, 'indexes'] as const)
    json(p[key], `$.${key}`, jsonBudget, 0, budget.depth);
  record(p.files, '$.files');
  const ids = new Set<string>(),
    nodes = new Set<string>(),
    pages = new Set<string>(),
    documents = new Set<string>(),
    assets = new Set<string>(),
    styles = new Set<string>();
  const datasets = new Map<string, Set<string>>(),
    pending: (() => void)[] = [];
  const register = (value: unknown, path: string) => {
    id(value, path);
    check(!ids.has(value), path, 'duplicateId');
    ids.add(value);
  };
  const ref = (value: unknown, set: Set<string>, path: string) => {
    id(value, path);
    pending.push(() => check(set.has(value), path, 'reference'));
  };
  const ext = (value: Extensible, path: string) => {
    record(value, path);
    record(value.extensions, `${path}.extensions`);
    for (const key of Object.keys(value.extensions))
      namespace(key, `${path}.extensions.${key}`);
  };
  function each<T>(
    value: T[],
    path: string,
    action: (item: T, path: string) => void,
  ) {
    array(value, path);
    value.forEach((item, i) => {
      record(item, `${path}[${i}]`);
      action(item, `${path}[${i}]`);
    });
  }
  function locale(value: unknown, path: string) {
    text(value, path, 100);
    try {
      check(Intl.getCanonicalLocales(value).length === 1, path, 'locale');
    } catch {
      check(false, path, 'locale');
    }
  }
  function stamp(value: unknown, path: string) {
    text(value, path);
    check(
      /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) &&
        Number.isFinite(Date.parse(value)) &&
        new Date(value).toISOString() === value,
      path,
      'timestamp',
    );
  }
  const manifest = p.manifest;
  ext(manifest, '$.manifest');
  check(manifest.format === 'koxora-project', '$.manifest.format');
  compatible(manifest.formatVersion, '$.manifest.formatVersion');
  compatible(manifest.schemaVersion, '$.manifest.schemaVersion');
  reader(manifest.minReaderVersion, '$.manifest.minReaderVersion');
  reader(manifest.minSchemaReaderVersion, '$.manifest.minSchemaReaderVersion');
  register(manifest.projectId, '$.manifest.projectId');
  text(manifest.title, '$.manifest.title');
  stamp(manifest.createdAt, '$.manifest.createdAt');
  stamp(manifest.updatedAt, '$.manifest.updatedAt');
  check(
    manifest.updatedAt >= manifest.createdAt,
    '$.manifest.updatedAt',
    'timestamp',
  );
  locale(manifest.locale, '$.manifest.locale');
  check(
    ['ltr', 'rtl', 'auto'].includes(manifest.direction),
    '$.manifest.direction',
  );
  array(manifest.requiredFeatures, '$.manifest.requiredFeatures');
  manifest.requiredFeatures.forEach((feature, i) => {
    text(feature, `$.manifest.requiredFeatures[${i}]`);
    check(
      FEATURES.includes(feature),
      `$.manifest.requiredFeatures[${i}]`,
      'feature',
      'unsupported',
    );
  });
  record(manifest.resources, '$.manifest.resources');
  for (const [path, resource] of Object.entries(manifest.resources)) {
    safePath(path);
    check(path !== 'manifest.json', path, 'recursiveManifest');
    ext(resource, `$.manifest.resources.${path}`);
    number(resource.size, `${path}.size`, 0);
    check(Number.isInteger(resource.size), `${path}.size`);
    check(/^[a-f0-9]{64}$/.test(resource.sha256), `${path}.sha256`);
    text(resource.mediaType, `${path}.mediaType`);
    boolean(resource.required, `${path}.required`);
  }
  record(p.indexes, '$.indexes');
  for (const name of COLLECTIONS) {
    check(
      manifest[`${name}Index`] === `${name}/index.json`,
      `$.manifest.${name}Index`,
      'indexPath',
    );
    const index = p.indexes[name];
    ext(index, `$.indexes.${name}`);
    compatible(index.schemaVersion, `$.indexes.${name}.schemaVersion`);
    array(index.items, `$.indexes.${name}.items`);
    array(p[name], `$.${name}`);
    each<unknown>(p[name], `$.${name}`, () => undefined);
    const indexIds = new Set<string>();
    each(index.items, `$.indexes.${name}.items`, (item, path) => {
      ext(item, path);
      id(item.id, `${path}.id`);
      check(!indexIds.has(item.id), path, 'duplicateIndexId');
      indexIds.add(item.id);
      text(item.path, `${path}.path`);
      safePath(item.path);
    });
    check(
      indexIds.size === p[name].length &&
        p[name].every((item) => indexIds.has(item.id)),
      `$.indexes.${name}`,
      'indexMismatch',
    );
  }
  function hierarchical<T extends { id: string; parentId?: string }>(
    items: T[],
    path: string,
  ) {
    const parents = new Map(items.map((item) => [item.id, item.parentId]));
    const complete = new Set<string>();
    for (const item of items) {
      const chain = new Set<string>();
      let next: string | undefined = item.id;
      while (next !== undefined && !complete.has(next)) {
        check(
          parents.has(next) && !chain.has(next),
          path,
          'parentCycleOrReference',
        );
        chain.add(next);
        next = parents.get(next);
      }
      for (const visited of chain) complete.add(visited);
    }
  }
  function styleList(items: Style[], path: string) {
    each(items, path, (style, at) => {
      ext(style, at);
      register(style.id, `${at}.id`);
      styles.add(style.id);
      record(style.properties, `${at}.properties`);
    });
    hierarchical(items, path);
  }
  each(p.themes, '$.themes', (theme, path) => {
    ext(theme, path);
    register(theme.id, `${path}.id`);
    compatible(theme.schemaVersion, `${path}.schemaVersion`);
    text(theme.title, `${path}.title`);
    record(theme.tokens, `${path}.tokens`);
    styleList(theme.styles, `${path}.styles`);
  });
  each(p.datasets, '$.datasets', (dataset, path) => {
    ext(dataset, path);
    register(dataset.id, `${path}.id`);
    compatible(dataset.schemaVersion, `${path}.schemaVersion`);
    text(dataset.title, `${path}.title`);
    record(dataset.source, `${path}.source`);
    const fields = new Set<string>();
    each(dataset.fields, `${path}.fields`, (field, at) => {
      ext(field, at);
      register(field.id, `${at}.id`);
      fields.add(field.id);
      text(field.name, `${at}.name`);
      check(
        ['string', 'number', 'boolean', 'date', 'json'].includes(field.type),
        `${at}.type`,
      );
      boolean(field.nullable, `${at}.nullable`);
    });
    datasets.set(dataset.id, fields);
    each(dataset.rows, `${path}.rows`, (row, at) => {
      check(
        Object.keys(row).length === fields.size &&
          Object.keys(row).every((key) => fields.has(key)),
        at,
        'rowFields',
      );
      for (const field of dataset.fields) {
        const value = row[field.id];
        if (value === null)
          check(field.nullable, `${at}.${field.id}`, 'nullable');
        else if (field.type === 'number') number(value, `${at}.${field.id}`);
        else if (field.type === 'date') {
          text(value, `${at}.${field.id}`);
          check(
            /^\d{4}-\d\d-\d\d$/.test(value) &&
              Number.isFinite(Date.parse(value)) &&
              new Date(value).toISOString().slice(0, 10) === value,
            at,
            'date',
          );
        } else if (field.type !== 'json')
          check(typeof value === field.type, `${at}.${field.id}`, 'fieldType');
      }
    });
  });
  each(p.assets, '$.assets', (asset, path) => {
    ext(asset, path);
    register(asset.id, `${path}.id`);
    assets.add(asset.id);
    check(
      asset.path === `assets/${asset.sha256}`,
      `${path}.path`,
      'contentAddress',
    );
  });
  for (const [name, entries] of [
    ['assets', p.assets],
    ['previews', p.previews],
  ] as const)
    each(entries, `$.${name}`, (asset, path) => {
      ext(asset, path);
      if (name === 'previews') register(asset.id, `${path}.id`);
      text(asset.path, `${path}.path`);
      safePath(asset.path);
      check(/^[a-f0-9]{64}$/.test(asset.sha256), `${path}.sha256`);
      number(asset.size, `${path}.size`, 0);
      text(asset.mediaType, `${path}.mediaType`);
      check(Number.isInteger(asset.size), `${path}.size`);
      check(
        p.files[asset.path] instanceof Uint8Array &&
          p.files[asset.path].length === asset.size,
        `${path}.path`,
        'resource',
      );
    });
  function binding(datasetId: unknown, fieldId: unknown, path: string) {
    id(datasetId, `${path}.datasetId`);
    id(fieldId, `${path}.fieldId`);
    pending.push(() =>
      check(datasets.get(datasetId)?.has(fieldId), path, 'datasetReference'),
    );
  }
  function document(doc: Document, path: string) {
    ext(doc, path);
    register(doc.id, `${path}.id`);
    documents.add(doc.id);
    compatible(doc.schemaVersion, `${path}.schemaVersion`);
    text(doc.type, `${path}.type`);
    text(doc.title, `${path}.title`);
    locale(doc.locale, `${path}.locale`);
    styleList(doc.styles, `${path}.styles`);
    array(doc.pages, `${path}.pages`);
    check(doc.pages.length > 0, `${path}.pages`, 'emptyDocument');
    const docNodes = new Set<string>(),
      docConnections = new Set<string>();
    each(doc.pages, `${path}.pages`, (page, at) => {
      ext(page, at);
      register(page.id, `${at}.id`);
      pages.add(page.id);
      text(page.title, `${at}.title`);
      record(page.size, `${at}.size`);
      number(page.size.width, `${at}.size.width`, 0.000001);
      number(page.size.height, `${at}.size.height`, 0.000001);
      record(page.viewport, `${at}.viewport`);
      number(page.viewport.x, `${at}.viewport.x`);
      number(page.viewport.y, `${at}.viewport.y`);
      number(page.viewport.zoom, `${at}.viewport.zoom`, 0.000001);
      record(page.layout, `${at}.layout`);
      record(page.presentation, `${at}.presentation`);
      const layerIds = new Set<string>(),
        nodeIds = new Set<string>();
      each(page.layers, `${at}.layers`, (layer, lp) => {
        ext(layer, lp);
        register(layer.id, `${lp}.id`);
        layerIds.add(layer.id);
        text(layer.title, `${lp}.title`);
        boolean(layer.visible, `${lp}.visible`);
        boolean(layer.locked, `${lp}.locked`);
      });
      check(page.layers.length > 0, `${at}.layers`, 'emptyLayers');
      hierarchical(page.layers, `${at}.layers`);
      each(page.nodes, `${at}.nodes`, (node, np) => {
        ext(node, np);
        register(node.id, `${np}.id`);
        nodes.add(node.id);
        nodeIds.add(node.id);
        docNodes.add(node.id);
        text(node.kind, `${np}.kind`);
        ref(node.layerId, layerIds, `${np}.layerId`);
        record(node.geometry, `${np}.geometry`);
        for (const key of ['x', 'y', 'rotation'] as const)
          number(node.geometry[key], `${np}.geometry.${key}`);
        for (const key of ['width', 'height'] as const)
          number(node.geometry[key], `${np}.geometry.${key}`, 0);
        record(node.content, `${np}.content`);
        record(node.metadata, `${np}.metadata`);
        if (node.styleId !== undefined)
          ref(node.styleId, styles, `${np}.styleId`);
        array(node.assetIds, `${np}.assetIds`);
        node.assetIds.forEach((value, i) =>
          ref(value, assets, `${np}.assetIds[${i}]`),
        );
        each(node.dataBindings, `${np}.dataBindings`, (item, dp) =>
          binding(item.datasetId, item.fieldId, dp),
        );
      });
      each(page.connections, `${at}.connections`, (edge, ep) => {
        ext(edge, ep);
        register(edge.id, `${ep}.id`);
        docConnections.add(edge.id);
        ref(edge.sourceId, nodeIds, `${ep}.sourceId`);
        ref(edge.targetId, nodeIds, `${ep}.targetId`);
        ref(edge.layerId, layerIds, `${ep}.layerId`);
        text(edge.relationType, `${ep}.relationType`);
        if (edge.styleId !== undefined)
          ref(edge.styleId, styles, `${ep}.styleId`);
        each(edge.waypoints, `${ep}.waypoints`, (point, wp) => {
          number(point.x, `${wp}.x`);
          number(point.y, `${wp}.y`);
        });
      });
      each(page.relationships, `${at}.relationships`, (relation, rp) => {
        ext(relation, rp);
        register(relation.id, `${rp}.id`);
        ref(relation.sourceId, nodes, `${rp}.sourceId`);
        ref(relation.targetId, nodes, `${rp}.targetId`);
        text(relation.kind, `${rp}.kind`);
        record(relation.metadata, `${rp}.metadata`);
      });
    });
    each(doc.domainModels, `${path}.domainModels`, (model, at) => {
      ext(model, at);
      namespace(model.namespace, `${at}.namespace`);
      version(model.schemaVersion, `${at}.schemaVersion`);
      boolean(model.required, `${at}.required`);
      record(model.data, `${at}.data`);
      array(model.references, `${at}.references`);
      model.references.forEach((value, i) =>
        ref(value, ids, `${at}.references[${i}]`),
      );
      const known = [
        'org.koxora.mindmap',
        'org.koxora.flowchart',
        'org.koxora.uml',
        'org.koxora.er',
      ].includes(model.namespace);
      check(
        known || !model.required,
        `${at}.namespace`,
        'requiredDomainModel',
        'unsupported',
      );
      if (
        !known ||
        (!model.required &&
          version(model.schemaVersion, `${at}.schemaVersion`)[0] !== 1)
      )
        return;
      compatible(model.schemaVersion, `${at}.schemaVersion`);
      const data = model.data;
      if (model.namespace === 'org.koxora.mindmap') {
        array(data.roots, `${at}.data.roots`);
        data.roots.forEach((value, i) =>
          ref(value, docNodes, `${at}.data.roots[${i}]`),
        );
        record(data.parents, `${at}.data.parents`);
        const pairs: { id: string; parentId?: string }[] = [];
        for (const [nodeId, parent] of Object.entries(data.parents)) {
          ref(nodeId, docNodes, `${at}.data.parents`);
          if (parent !== null)
            ref(parent, docNodes, `${at}.data.parents.${nodeId}`);
          pairs.push({
            id: nodeId,
            ...(parent === null ? {} : { parentId: parent as string }),
          });
        }
        hierarchical(pairs, `${at}.data.parents`);
        const actualRoots = new Set(
          pairs.filter((item) => !item.parentId).map((item) => item.id),
        );
        check(
          new Set(data.roots).size === data.roots.length &&
            data.roots.length === actualRoots.size &&
            data.roots.every((root) => actualRoots.has(root as string)),
          at,
          'mindmapRoots',
        );
      }
      if (model.namespace === 'org.koxora.flowchart') {
        for (const key of ['starts', 'ends']) {
          array(data[key], `${at}.data.${key}`);
          (data[key] as Json[]).forEach((value, i) =>
            ref(value, docNodes, `${at}.data.${key}[${i}]`),
          );
        }
      }
      if (model.namespace === 'org.koxora.uml') {
        array(data.classifiers, `${at}.data.classifiers`);
        data.classifiers.forEach((value, i) => {
          const cp = `${at}.data.classifiers[${i}]`;
          record(value, cp);
          ref(value.nodeId, docNodes, `${cp}.nodeId`);
          text(value.kind, `${cp}.kind`);
          for (const key of ['attributes', 'operations']) {
            array(value[key], `${cp}.${key}`);
            (value[key] as unknown[]).forEach((item, n) =>
              text(item, `${cp}.${key}[${n}]`),
            );
          }
        });
      }
      if (model.namespace === 'org.koxora.er') {
        array(data.entities, `${at}.data.entities`);
        const fields = new Set<string>();
        data.entities.forEach((value, i) => {
          const ep = `${at}.data.entities[${i}]`;
          record(value, ep);
          ref(value.nodeId, docNodes, `${ep}.nodeId`);
          array(value.fields, `${ep}.fields`);
          value.fields.forEach((field, n) => {
            const fp = `${ep}.fields[${n}]`;
            record(field, fp);
            register(field.id, `${fp}.id`);
            fields.add(field.id as string);
            text(field.name, `${fp}.name`);
            text(field.dataType, `${fp}.dataType`);
            boolean(field.primaryKey, `${fp}.primaryKey`);
            boolean(field.nullable, `${fp}.nullable`);
          });
        });
        array(data.relations, `${at}.data.relations`);
        data.relations.forEach((value, i) => {
          const rp = `${at}.data.relations[${i}]`;
          record(value, rp);
          ref(value.connectionId, docConnections, `${rp}.connectionId`);
          ref(value.sourceFieldId, fields, `${rp}.sourceFieldId`);
          ref(value.targetFieldId, fields, `${rp}.targetFieldId`);
        });
      }
    });
    each(doc.actions, `${path}.actions`, (action, at) => {
      ext(action, at);
      register(action.id, `${at}.id`);
      ref(action.targetId, nodes, `${at}.targetId`);
      check(
        ['click', 'hover', 'focus'].includes(action.trigger),
        `${at}.trigger`,
      );
      check(
        ['tooltip', 'navigate', 'filter', 'expand', 'url'].includes(
          action.operation,
        ),
        `${at}.operation`,
        'action',
        'unsupported',
      );
      record(action.parameters, `${at}.parameters`);
      const params = action.parameters;
      if (action.operation === 'tooltip')
        text(params.text, `${at}.parameters.text`, budget.jsonBytes);
      if (action.operation === 'navigate')
        ref(params.pageId, pages, `${at}.parameters.pageId`);
      if (action.operation === 'expand')
        ref(params.nodeId, nodes, `${at}.parameters.nodeId`);
      if (action.operation === 'filter') {
        binding(params.datasetId, params.fieldId, `${at}.parameters`);
        check(Object.hasOwn(params, 'value'), `${at}.parameters.value`);
      }
      if (action.operation === 'url') {
        text(params.url, `${at}.parameters.url`);
        let protocol = '';
        try {
          const url = new URL(params.url);
          protocol = url.protocol;
          check(!url.username && !url.password, at, 'urlCredentials');
        } catch {
          check(false, at, 'url');
        }
        check(
          ['https:', 'http:', 'mailto:'].includes(protocol),
          at,
          'urlProtocol',
        );
      }
    });
    each(doc.animations, `${path}.animations`, (animation, at) => {
      ext(animation, at);
      register(animation.id, `${at}.id`);
      ref(animation.targetId, nodes, `${at}.targetId`);
      number(animation.duration, `${at}.duration`, 0.000001);
      check(
        [
          'linear',
          'ease',
          'ease-in',
          'ease-out',
          'ease-in-out',
          'step-start',
          'step-end',
        ].includes(animation.easing),
        `${at}.easing`,
      );
      let last = -1;
      each(animation.keyframes, `${at}.keyframes`, (frame, fp) => {
        number(frame.time, `${fp}.time`, 0);
        check(
          frame.time > last && frame.time <= animation.duration,
          `${fp}.time`,
          'keyframeOrder',
        );
        last = frame.time;
        record(frame.properties, `${fp}.properties`);
      });
      check(animation.keyframes.length >= 2, `${at}.keyframes`, 'keyframes');
    });
  }
  check(p.documents.length > 0, '$.documents', 'emptyProject');
  each(p.documents, '$.documents', document);
  each(p.templates, '$.templates', (template, path) => {
    ext(template, path);
    register(template.id, `${path}.id`);
    compatible(template.schemaVersion, `${path}.schemaVersion`);
    text(template.title, `${path}.title`);
    document(template.document, `${path}.document`);
  });
  each(p.previews, '$.previews', (preview, path) => {
    ref(preview.documentId, documents, `${path}.documentId`);
    check(preview.path === `previews/${preview.id}`, `${path}.path`);
    check(preview.mediaType.startsWith('image/'), `${path}.mediaType`);
  });
  let total = 0;
  for (const [path, bytes] of Object.entries(p.files)) {
    safePath(path);
    check(bytes instanceof Uint8Array, path, 'binary');
    check(bytes.length <= budget.entryBytes, path, 'entryBytes', 'tooLarge');
    total += bytes.length;
  }
  check(total <= budget.expandedBytes, '$.files', 'expandedBytes', 'tooLarge');
  pending.forEach((validate) => validate());
  check(isId(manifest.projectId), '$.manifest.projectId');
}

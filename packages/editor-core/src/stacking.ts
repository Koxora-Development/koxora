import { isId, type Page } from '@koxora/project';
import { jsonObject, layerStates } from './shapes';

export const STACK_KEY = 'org.koxora.stacking';
export type StackAction = 'forward' | 'backward' | 'front' | 'back';
export function readStackOrder(
  page: Partial<Pick<Page, 'extensions'>>,
): string[] | undefined {
  const value = jsonObject(page.extensions?.[STACK_KEY]);
  if (
    value.version !== 1 ||
    Object.keys(value).some((k) => !['version', 'ids'].includes(k)) ||
    !Array.isArray(value.ids) ||
    value.ids.length > 200_000 ||
    !value.ids.every(isId) ||
    new Set(value.ids).size !== value.ids.length
  )
    return undefined;
  return value.ids as string[];
}
export function orderedElements(
  page: Pick<Page, 'nodes' | 'connections' | 'layers'> &
    Partial<Pick<Page, 'extensions'>>,
) {
  const layers = layerStates(page.layers);
  const ids = readStackOrder(page) ?? [];
  const order = new Map(ids.map((id, i) => [id, i]));
  return [...page.connections, ...page.nodes]
    .map((item, i) => ({
      item,
      order: order.get(item.id) ?? ids.length + i,
    }))
    .sort(
      (a, b) =>
        (layers.get(a.item.layerId)?.order ?? 0) -
          (layers.get(b.item.layerId)?.order ?? 0) || a.order - b.order,
    )
    .map(({ item }) => item);
}
/** Reorder only within each existing layer; retain relative order inside and outside the selection. */
export function stackOrder(
  page: Page,
  selected: readonly string[],
  action: StackAction,
): string[] {
  const ids = new Set(selected);
  const all = orderedElements(page);
  return page.layers.flatMap((layer) => {
    const items = all
      .filter((item) => item.layerId === layer.id)
      .map((item) => item.id);
    if (action === 'front')
      return [
        ...items.filter((id) => !ids.has(id)),
        ...items.filter((id) => ids.has(id)),
      ];
    if (action === 'back')
      return [
        ...items.filter((id) => ids.has(id)),
        ...items.filter((id) => !ids.has(id)),
      ];
    if (action === 'forward') {
      for (let i = items.length - 2; i >= 0; i--)
        if (ids.has(items[i]) && !ids.has(items[i + 1]))
          [items[i], items[i + 1]] = [items[i + 1], items[i]];
    } else
      for (let i = 1; i < items.length; i++)
        if (ids.has(items[i]) && !ids.has(items[i - 1]))
          [items[i - 1], items[i]] = [items[i], items[i - 1]];
    return items;
  });
}

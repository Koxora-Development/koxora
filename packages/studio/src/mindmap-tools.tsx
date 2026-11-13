import { useState } from 'react';
import { translate, type MessageKey } from '@koxora/i18n';
import type { Document, Page } from '@koxora/project';
import {
  layerStates,
  readMindMap,
  type EditCommand,
} from '@koxora/editor-core';
import { Dialog } from '@koxora/ui';
import './mindmap.css';

type Action = 'root' | 'child' | 'sibling' | 'delete' | 'layout';
/** Hierarchy authoring shares the canvas selection and immutable command history. */
export function MindMapTools({
  document,
  page,
  selected,
  locale,
  prepare,
  onSelect,
  onEdit,
}: {
  document: Document;
  page: Page;
  selected: string[];
  locale: string;
  prepare: () => boolean;
  onSelect: (ids: string[]) => void;
  onEdit: (command: EditCommand) => boolean;
}) {
  const t = (key: MessageKey) => translate(locale, key);
  const [action, setAction] = useState<Action | null>(null);
  const [text, setText] = useState('');
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(() => {
    const scale =
      Number(globalThis.document.documentElement.dataset.uiScale) || 100;
    return (
      window.innerWidth >= (1000 * scale) / 100 && window.innerHeight >= 700
    );
  });
  const map = readMindMap(document, page.id);
  if (document.type !== 'mindmap') return null;
  const supported =
    !!map ||
    !document.domainModels.some((m) => m.namespace === 'org.koxora.mindmap');
  const topics = page.nodes.filter(
    (n) => map && Object.hasOwn(map.parents, n.id),
  );
  const chosen =
    selected.length === 1
      ? topics.find((n) => n.id === selected[0])
      : undefined;
  const states = layerStates(page.layers);
  const writable = chosen && states.get(chosen.layerId)?.editable;
  const layer = page.layers.find((l) => states.get(l.id)?.editable)?.id;
  const title = action ? t(`mindmap.${action}`) : '';
  function begin(next: Action) {
    if (!prepare()) return;
    setFailed(false);
    setText('');
    setAction(next);
  }
  function apply() {
    if (!action) return;
    let command: EditCommand;
    let added: string | null = null;
    if (action === 'layout') command = { type: 'mindmapLayout' };
    else if (action === 'delete') {
      if (!chosen) return;
      command = { type: 'mindmapDeleteBranch', id: chosen.id };
    } else {
      if (
        !layer ||
        !text.trim() ||
        ((action === 'child' || action === 'sibling') && !chosen)
      )
        return;
      added = crypto.randomUUID();
      const parentId =
        action === 'root'
          ? null
          : action === 'child'
            ? chosen!.id
            : map!.parents[chosen!.id];
      command = {
        type: 'mindmapAdd',
        id: added,
        connectionId: crypto.randomUUID(),
        parentId,
        layerId: action === 'root' ? layer : chosen!.layerId,
        text: text.trim(),
      };
    }
    if (onEdit(command)) {
      setAction(null);
      if (added) onSelect([added]);
      else if (action === 'delete') onSelect([]);
    } else setFailed(true);
  }
  return (
    <details
      className="mindmap-panel"
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary>{t('mindmap.tools')}</summary>
      <div
        className="mindmap-tools"
        role="group"
        aria-label={t('mindmap.tools')}
      >
        <strong>{t('mindmap.title')}</strong>
        {!supported ? (
          <p role="status">{t('mindmap.unsupported')}</p>
        ) : (
          <>
            <label>
              {t('mindmap.selected')}
              <select
                value={chosen?.id ?? ''}
                onChange={(event) => {
                  if (prepare())
                    onSelect(event.target.value ? [event.target.value] : []);
                }}
              >
                <option value="">{t('diagram.choose')}</option>
                {topics.map((n) => (
                  <option key={n.id} value={n.id}>
                    {String(n.content.text || t('mindmap.topic')).slice(0, 120)}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button compact"
              disabled={!layer}
              onClick={() => begin('root')}
            >
              {t('mindmap.root')}
            </button>
            <button
              className="button compact"
              disabled={!writable}
              onClick={() => begin('child')}
            >
              {t('mindmap.child')}
            </button>
            <button
              className="button compact"
              disabled={!writable}
              onClick={() => begin('sibling')}
            >
              {t('mindmap.sibling')}
            </button>
            <button
              className="button compact"
              disabled={!writable}
              onClick={() => begin('delete')}
            >
              {t('mindmap.delete')}
            </button>
            <button
              className="button compact"
              disabled={!topics.length}
              onClick={() => begin('layout')}
            >
              {t('mindmap.layout')}
            </button>
            <p className="field-help">{t('mindmap.help')}</p>
          </>
        )}
        {action && (
          <Dialog title={title} onCancel={() => setAction(null)}>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                apply();
              }}
            >
              {action === 'layout' ? (
                <p>{t('mindmap.layoutHelp')}</p>
              ) : action === 'delete' ? (
                <p>
                  {translate(locale, 'mindmap.deleteHelp', {
                    topic: String(chosen?.content.text || t('mindmap.topic')),
                  })}
                </p>
              ) : (
                <label>
                  {t('mindmap.text')}
                  <input
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    required
                    maxLength={4096}
                  />
                </label>
              )}
              {failed && <p role="alert">{t('mindmap.failed')}</p>}
              <div className="dialog-actions">
                <button
                  className="button"
                  type="button"
                  onClick={() => setAction(null)}
                >
                  {t('project.cancel')}
                </button>
                <button
                  className="button primary"
                  type="submit"
                  disabled={
                    !['layout', 'delete'].includes(action) && !text.trim()
                  }
                >
                  {t(
                    action === 'layout'
                      ? 'mindmap.arrange'
                      : action === 'delete'
                        ? 'mindmap.delete'
                        : 'mindmap.add',
                  )}
                </button>
              </div>
            </form>
          </Dialog>
        )}
      </div>
    </details>
  );
}

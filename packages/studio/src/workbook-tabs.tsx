import { useLayoutEffect, useRef, useState } from 'react';
import { Dialog, Icon } from '@koxora/ui';
import { translate } from '@koxora/i18n';
import type { Document } from '@koxora/project';
import { ContextMenu } from './context-menu';
import { menuAnchor, type MenuAnchor } from './menu-anchor';
import './workbook-tabs.css';

export function WorkbookTabs({
  documents,
  document,
  pageId,
  locale,
  locked,
  onSelect,
  onCreate,
  onRename,
}: {
  documents: Document[];
  document: Document;
  pageId: string;
  locale: string;
  locked: boolean;
  onSelect: (documentId: string, pageId: string) => boolean;
  onCreate: () => void;
  onRename: (pageId: string, title: string) => boolean;
}) {
  const list = useRef<HTMLDivElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  const [menu, setMenu] = useState<{
    pageId: string;
    anchor: MenuAnchor;
  } | null>(null);
  const [rename, setRename] = useState<{
    pageId: string;
    documentId: string;
  } | null>(null);
  const [name, setName] = useState('');
  const [failed, setFailed] = useState(false);
  const submitting = useRef(false);
  function tab(id: string) {
    return [
      ...(list.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ??
        []),
    ].find((element) => element.dataset.sheetId === id);
  }
  function openRename(id: string) {
    const page = document.pages.find((item) => item.id === id);
    if (locked || !page) return;
    origin.current = tab(id) ?? null;
    setMenu(null);
    setName(page.title);
    setFailed(false);
    setRename({ pageId: id, documentId: document.id });
  }
  function closeRename() {
    setRename(null);
    requestAnimationFrame(() => {
      const target = origin.current?.isConnected ? origin.current : tab(pageId);
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }
  function applyRename() {
    if (
      !rename ||
      locked ||
      submitting.current ||
      !name.trim() ||
      name.trim().length > 1024 ||
      rename.documentId !== document.id ||
      !document.pages.some((item) => item.id === rename.pageId)
    )
      return;
    submitting.current = true;
    try {
      if (onRename(rename.pageId, name.trim())) closeRename();
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      submitting.current = false;
    }
  }
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  useLayoutEffect(() => {
    list.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [pageId, document.id]);
  function select(index: number, focus = false) {
    const page = document.pages[index];
    if (page && onSelect(document.id, page.id) && focus)
      list.current
        ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
        .item(index)
        ?.focus({ preventScroll: true });
  }
  return (
    <div className="workbook-sheetbar">
      <div className="sheet-scroll-controls">
        <button
          type="button"
          className="office-tool-button"
          aria-label={t('tabs.scrollLeft')}
          title={t('tabs.scrollLeft')}
          onClick={() => list.current?.scrollBy({ left: -220 })}
        >
          <span aria-hidden="true">‹</span>
        </button>
        <button
          type="button"
          className="office-tool-button"
          aria-label={t('tabs.scrollRight')}
          title={t('tabs.scrollRight')}
          onClick={() => list.current?.scrollBy({ left: 220 })}
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>
      {documents.length > 1 && (
        <select
          className="sheet-document"
          aria-label={t('tabs.document')}
          title={document.title}
          value={document.id}
          disabled={locked}
          onChange={(event) => {
            const next = documents.find(
              (item) => item.id === event.target.value,
            );
            if (next) onSelect(next.id, next.pages[0].id);
          }}
        >
          {documents.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      )}
      <div
        ref={list}
        role="tablist"
        aria-label={t('tabs.pages')}
        className="workbook-sheet-tabs"
        onKeyDown={(event) => {
          if (
            !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) ||
            locked
          )
            return;
          event.preventDefault();
          const tabs = [
            ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
              '[role="tab"]',
            ),
          ];
          const index = tabs.indexOf(event.target as HTMLButtonElement);
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? tabs.length - 1
                : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) %
                  tabs.length;
          select(next, true);
        }}
      >
        {document.pages.map((page, index) => (
          <button
            key={page.id}
            type="button"
            role="tab"
            title={page.title}
            data-sheet-id={page.id}
            aria-controls={`sheet-page-${page.id}`}
            aria-selected={page.id === pageId}
            aria-disabled={locked || undefined}
            tabIndex={page.id === pageId ? 0 : -1}
            onClick={() => {
              if (!locked) select(index);
            }}
            onDoubleClick={() => openRename(page.id)}
            onContextMenu={(event) => {
              event.preventDefault();
              if (!locked)
                setMenu({
                  pageId: page.id,
                  anchor: menuAnchor(event.currentTarget, event),
                });
            }}
            onKeyDown={(event) => {
              if (locked) return;
              if (event.key === 'F2') {
                event.preventDefault();
                event.stopPropagation();
                openRename(page.id);
              } else if (
                event.key === 'ContextMenu' ||
                (event.shiftKey && event.key === 'F10')
              ) {
                event.preventDefault();
                event.stopPropagation();
                setMenu({
                  pageId: page.id,
                  anchor: menuAnchor(event.currentTarget),
                });
              }
            }}
          >
            <span dir="auto">{page.title}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="office-tool-button sheet-menu-trigger"
        aria-label={t('tabs.rename')}
        title={t('tabs.rename')}
        aria-haspopup="menu"
        aria-expanded={!!menu}
        disabled={locked}
        onClick={(event) =>
          setMenu({ pageId, anchor: menuAnchor(event.currentTarget) })
        }
      >
        <Icon name="more" />
      </button>
      <button
        className="office-tool-button sheet-add"
        type="button"
        aria-label={t('tabs.addSheet')}
        title={t('tabs.addSheet')}
        disabled={locked}
        onClick={onCreate}
      >
        <Icon name="plus" />
      </button>
      {menu && (
        <ContextMenu
          anchor={menu.anchor}
          label={t('tabs.pages')}
          onClose={() => setMenu(null)}
        >
          <button
            role="menuitem"
            disabled={locked}
            onClick={() => openRename(menu.pageId)}
          >
            {t('tabs.rename')}
          </button>
        </ContextMenu>
      )}
      {rename && (
        <Dialog
          title={t('tabs.rename')}
          className="sheet-rename-dialog"
          onCancel={closeRename}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              applyRename();
            }}
          >
            <label>
              {t('tabs.name')}
              <input
                autoFocus
                required
                maxLength={1024}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setFailed(false);
                }}
              />
            </label>
            {failed && <p role="alert">{t('tabs.error.invalid')}</p>}
            <div className="dialog-actions">
              <button type="button" className="button" onClick={closeRename}>
                {t('project.cancel')}
              </button>
              <button
                type="submit"
                className="button primary"
                disabled={locked || !name.trim() || name.trim().length > 1024}
              >
                {t('diagram.apply')}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}

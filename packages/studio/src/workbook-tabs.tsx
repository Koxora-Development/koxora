import { useLayoutEffect, useRef } from 'react';
import { Icon } from '@koxora/ui';
import { translate } from '@koxora/i18n';
import type { Document } from '@koxora/project';

export function WorkbookTabs({
  documents,
  document,
  pageId,
  locale,
  locked,
  onSelect,
  onCreate,
}: {
  documents: Document[];
  document: Document;
  pageId: string;
  locale: string;
  locked: boolean;
  onSelect: (documentId: string, pageId: string) => boolean;
  onCreate: () => void;
}) {
  const list = useRef<HTMLDivElement>(null);
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
            aria-controls={`sheet-page-${page.id}`}
            aria-selected={page.id === pageId}
            aria-disabled={locked || undefined}
            tabIndex={page.id === pageId ? 0 : -1}
            onClick={() => {
              if (!locked) select(index);
            }}
          >
            <span dir="auto">{page.title}</span>
          </button>
        ))}
      </div>
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
    </div>
  );
}

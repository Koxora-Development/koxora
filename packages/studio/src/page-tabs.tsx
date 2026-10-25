import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@koxora/ui';
import { translate, type MessageKey } from '@koxora/i18n';
import type { Project } from '@koxora/project';
import type { WorkbookCommand } from '@koxora/editor-core';

export function PageTabs({
  project,
  saved,
  pageId,
  locale,
  onSelect,
  onCommand,
  errorMessage,
}: {
  errorMessage?: MessageKey | null;
  project: Project;
  saved: Project | null;
  pageId: string;
  locale: string;
  onSelect: (doc: string, page: string) => void;
  onCommand: (command: WorkbookCommand) => boolean;
}) {
  const t = (k: MessageKey) => translate(locale, k);
  const doc = project.documents.find((d) =>
    d.pages.some((p) => p.id === pageId),
  )!;
  const [renaming, setRenaming] = useState<string | null>(null),
    [name, setName] = useState('');
  const [menu, setMenu] = useState<string | null>(null),
    [dialog, setDialog] = useState<
      'delete' | 'move' | 'newDocument' | 'renameDocument' | null
    >(null);
  const [target, setTarget] = useState(doc.id);
  const [position, setPosition] = useState(1);
  const [failed, setFailed] = useState(false);
  const strip = useRef<HTMLDivElement>(null),
    menuRef = useRef<HTMLDivElement>(null);
  const dragged = useRef<string | null>(null);
  useEffect(() => {
    strip.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [pageId, project.documents]);
  useEffect(() => {
    menuRef.current?.querySelector<HTMLElement>('button')?.focus();
  }, [menu]);
  const focus = (id: string) =>
    requestAnimationFrame(() => {
      const target =
        strip.current?.querySelector<HTMLElement>(`[data-page-id="${id}"]`) ??
        strip.current?.querySelector<HTMLElement>('[aria-selected="true"]');
      target?.focus();
    });
  const close = () => {
    setMenu(null);
    setDialog(null);
    setFailed(false);
    focus(pageId);
  };
  const rename = (id: string) => {
    setName(doc.pages.find((p) => p.id === id)!.title);
    setRenaming(id);
    setMenu(null);
  };
  const newPage = () =>
    onCommand({
      type: 'newPage',
      documentId: doc.id,
      title: translate(locale, 'tabs.newPageName', {
        number: doc.pages.length + 1,
      }),
    });
  function move(id: string, index: number) {
    onCommand({ type: 'movePage', pageId: id, documentId: doc.id, index });
    focus(id);
  }
  return (
    <div
      className="workbook"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setRenaming(null);
          close();
        }
      }}
    >
      <div className="workbook-documents">
        <label>
          {t('tabs.document')}
          <select
            aria-label={t('tabs.document')}
            value={doc.id}
            onChange={(e) => {
              const d = project.documents.find((d) => d.id === e.target.value)!;
              onSelect(d.id, d.pages[0].id);
            }}
          >
            {project.documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button compact"
          onClick={() => {
            setName(
              translate(locale, 'tabs.newDocumentName', {
                number: project.documents.length + 1,
              }),
            );
            setDialog('newDocument');
          }}
        >
          {t('tabs.newDocument')}
        </button>
        <button
          className="button compact"
          onClick={() => {
            setName(doc.title);
            setDialog('renameDocument');
          }}
        >
          {t('tabs.renameDocument')}
        </button>
      </div>
      <div className="workbook-row">
        <button
          className="button compact"
          aria-label={t('tabs.scrollLeft')}
          onClick={() =>
            strip.current?.scrollBy({ left: -220, behavior: 'smooth' })
          }
        >
          ‹
        </button>
        <div
          ref={strip}
          className="page-tabs"
          role="tablist"
          aria-label={t('tabs.pages')}
          onWheel={(e) => {
            if (e.deltaY) e.currentTarget.scrollLeft += e.deltaY;
          }}
        >
          {doc.pages.map((page, index) => {
            const old = saved?.documents
              .find((d) => d.id === doc.id)
              ?.pages.find((p) => p.id === page.id);
            const dirty =
              JSON.stringify(old) !== JSON.stringify(page) ||
              saved?.documents.find((d) => d.id === doc.id)?.pages[index]
                ?.id !== page.id;
            return (
              <div
                className="page-tab-wrap"
                key={page.id}
                onDragOver={(e) => {
                  if (dragged.current) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragged.current) move(dragged.current, index);
                  dragged.current = null;
                }}
              >
                {renaming === page.id ? (
                  <input
                    className="tab-rename"
                    aria-label={t('tabs.name')}
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => setRenaming(null)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (
                        e.key === 'Enter' &&
                        onCommand({
                          type: 'renamePage',
                          pageId: page.id,
                          title: name,
                        })
                      ) {
                        setRenaming(null);
                        focus(page.id);
                      }
                      if (e.key === 'Escape') {
                        setRenaming(null);
                        focus(page.id);
                      }
                    }}
                  />
                ) : (
                  <button
                    role="tab"
                    type="button"
                    className="page-tab"
                    data-page-id={page.id}
                    aria-selected={page.id === pageId}
                    tabIndex={page.id === pageId ? 0 : -1}
                    title={
                      dirty
                        ? `${page.title} · ${t('project.unsaved')}`
                        : page.title
                    }
                    draggable
                    onDragStart={(e) => {
                      dragged.current = page.id;
                      e.dataTransfer.setData('text/plain', page.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => {
                      dragged.current = null;
                    }}
                    onClick={() => onSelect(doc.id, page.id)}
                    onDoubleClick={() => rename(page.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setMenu(page.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'F2') {
                        e.preventDefault();
                        rename(page.id);
                        return;
                      }
                      if (
                        e.key === 'ContextMenu' ||
                        (e.shiftKey && e.key === 'F10')
                      ) {
                        e.preventDefault();
                        setMenu(page.id);
                        return;
                      }
                      if (
                        !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(
                          e.key,
                        )
                      )
                        return;
                      e.preventDefault();
                      const next =
                        e.key === 'Home'
                          ? 0
                          : e.key === 'End'
                            ? doc.pages.length - 1
                            : Math.max(
                                0,
                                Math.min(
                                  doc.pages.length - 1,
                                  index + (e.key === 'ArrowLeft' ? -1 : 1),
                                ),
                              );
                      if (e.altKey) move(page.id, next);
                      else {
                        onSelect(doc.id, doc.pages[next].id);
                        focus(doc.pages[next].id);
                      }
                    }}
                  >
                    <span dir="auto">{page.title}</span>
                    {dirty && (
                      <span
                        className="tab-dirty"
                        aria-label={t('project.unsaved')}
                      >
                        •
                      </span>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button
          className="button compact"
          aria-label={t('tabs.scrollRight')}
          onClick={() =>
            strip.current?.scrollBy({ left: 220, behavior: 'smooth' })
          }
        >
          ›
        </button>
        <button
          className="button compact"
          aria-label={t('tabs.newPage')}
          title={t('tabs.newPage')}
          onClick={newPage}
        >
          {'＋'}
        </button>
        <button
          className="button compact"
          aria-label={t('tabs.actions')}
          onClick={() => setMenu(pageId)}
        >
          {'⋯'}
        </button>
      </div>
      {menu && !dialog && (
        <div
          className="page-menu"
          role="menu"
          aria-label={t('tabs.actions')}
          ref={menuRef}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setMenu(null);
          }}
          onKeyDown={(e) => {
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
              e.preventDefault();
              const b = [
                ...e.currentTarget.querySelectorAll<HTMLButtonElement>(
                  'button:not(:disabled)',
                ),
              ];
              const i = b.indexOf(document.activeElement as HTMLButtonElement);
              b[
                e.key === 'Home'
                  ? 0
                  : e.key === 'End'
                    ? b.length - 1
                    : (i + (e.key === 'ArrowDown' ? 1 : b.length - 1)) %
                      b.length
              ]?.focus();
            }
          }}
        >
          <button
            role="menuitem"
            onClick={() => {
              newPage();
              close();
            }}
          >
            {t('tabs.newPage')}
          </button>
          <button role="menuitem" onClick={() => rename(menu)}>
            {t('tabs.rename')}
          </button>
          <button
            role="menuitem"
            onClick={() => {
              onCommand({
                type: 'duplicatePage',
                pageId: menu,
                title: translate(locale, 'tabs.copyName', {
                  name: doc.pages.find((p) => p.id === menu)!.title,
                }),
              });
              close();
            }}
          >
            {t('tabs.duplicate')}
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setTarget(doc.id);
              setPosition(doc.pages.findIndex((p) => p.id === menu) + 1);
              setDialog('move');
            }}
          >
            {t('tabs.move')}
          </button>
          <button
            role="menuitem"
            disabled={doc.pages.length === 1}
            onClick={() => setDialog('delete')}
          >
            {t('tabs.delete')}
          </button>
          <button role="menuitem" onClick={close}>
            {t('project.cancel')}
          </button>
        </div>
      )}
      {dialog && (
        <Dialog title={t(`tabs.${dialog}`)} onCancel={close}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const ok =
                dialog === 'delete'
                  ? onCommand({ type: 'deletePage', pageId: menu! })
                  : dialog === 'move'
                    ? onCommand({
                        type: 'movePage',
                        pageId: menu!,
                        documentId: target,
                        index: position - 1,
                      })
                    : dialog === 'newDocument'
                      ? onCommand({ type: 'newDocument', title: name })
                      : onCommand({
                          type: 'renameDocument',
                          documentId: doc.id,
                          title: name,
                        });
              if (ok) close();
              else setFailed(true);
            }}
          >
            {dialog === 'delete' ? (
              <p>{t('tabs.deleteWarning')}</p>
            ) : dialog === 'move' ? (
              <div className="element-fields">
                <label>
                  {t('tabs.document')}
                  <select
                    aria-label={t('tabs.document')}
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                  >
                    {project.documents.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('tabs.position')}
                  <input
                    type="number"
                    min={1}
                    max={
                      (project.documents.find((d) => d.id === target)?.pages
                        .length ?? 1) + (target === doc.id ? 0 : 1)
                    }
                    value={position}
                    onChange={(e) => setPosition(e.target.valueAsNumber)}
                    required
                  />
                </label>
              </div>
            ) : (
              <label>
                {t('tabs.name')}
                <input
                  autoFocus
                  required
                  maxLength={1024}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            {failed && (
              <p role="alert">{t(errorMessage ?? 'tabs.error.invalid')}</p>
            )}
            <div className="dialog-actions">
              <button type="button" className="button" onClick={close}>
                {t('project.cancel')}
              </button>
              <button className="button primary" type="submit">
                {t(dialog === 'delete' ? 'tabs.delete' : 'diagram.apply')}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}

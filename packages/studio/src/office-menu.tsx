import {
  useId,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ContextMenu } from './context-menu';
import { menuAnchor, type MenuAnchor } from './menu-anchor';
export type OfficeMenuItem = {
  label: string;
  action?: () => void;
  disabled?: boolean;
  checked?: boolean;
  shortcut?: string;
  children?: OfficeMenuItem[];
  separator?: boolean;
  preview?: (active: boolean) => void;
};
const menuItems = (root: HTMLElement) =>
  [
    ...root.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]:not(:disabled), [role="menuitemcheckbox"]:not(:disabled)',
    ),
  ].filter(
    (el) => el.closest('[role="menu"]') === root && el.getClientRects().length,
  );
export function Submenu({
  label,
  children,
  disabled = false,
}: {
  label: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const trigger = useRef<HTMLButtonElement>(null),
    panel = useRef<HTMLDivElement>(null);
  const id = useId();
  useLayoutEffect(() => {
    if (!open) return;
    const a = trigger.current!.getBoundingClientRect(),
      b = panel.current!.getBoundingClientRect();
    setPosition({
      left: Math.max(
        6,
        Math.min(
          a.right + b.width > innerWidth - 6 ? a.left - b.width : a.right - 1,
          innerWidth - b.width - 6,
        ),
      ),
      top: Math.max(6, Math.min(a.top, innerHeight - b.height - 6)),
    });
  }, [open]);
  function enter() {
    setOpen(true);
    requestAnimationFrame(() => {
      if (panel.current) menuItems(panel.current)[0]?.focus();
    });
  }
  return (
    <div
      className="office-submenu"
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse' && !disabled) setOpen(true);
      }}
      onPointerLeave={() => {
        if (!panel.current?.contains(document.activeElement)) setOpen(false);
      }}
    >
      <button
        type="button"
        ref={trigger}
        role="menuitem"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={enter}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            event.stopPropagation();
            enter();
          }
        }}
      >
        <span>{label}</span>
        <span aria-hidden="true">›</span>
      </button>
      <div
        id={id}
        ref={panel}
        role="menu"
        aria-label={label}
        className="context-menu office-submenu-panel"
        hidden={!open}
        style={position}
        onKeyDown={(event) => {
          if (['ArrowLeft', 'Escape'].includes(event.key)) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
            trigger.current?.focus();
          } else if (
            ['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)
          ) {
            event.preventDefault();
            event.stopPropagation();
            const items = menuItems(event.currentTarget),
              index = items.indexOf(
                document.activeElement as HTMLButtonElement,
              );
            items[
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? items.length - 1
                  : (index +
                      (event.key === 'ArrowDown' ? 1 : items.length - 1)) %
                    items.length
            ]?.focus();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
function Entry({ item, close }: { item: OfficeMenuItem; close: () => void }) {
  const preview = useRef(item.preview);
  useLayoutEffect(() => {
    preview.current = item.preview;
  }, [item.preview]);
  useEffect(() => () => preview.current?.(false), []);
  return (
    <button
      type="button"
      role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
      aria-label={item.label}
      aria-keyshortcuts={item.shortcut?.replace('Ctrl+', 'Control+')}
      aria-checked={item.checked}
      disabled={item.disabled}
      onFocus={() => item.preview?.(true)}
      onBlur={() => item.preview?.(false)}
      onMouseEnter={() => item.preview?.(true)}
      onMouseLeave={() => item.preview?.(false)}
      onClick={() => {
        close();
        item.action?.();
      }}
    >
      <span>
        {item.checked && <span aria-hidden="true">{'✓ '}</span>}
        {item.label}
      </span>
      {item.shortcut && <kbd>{item.shortcut}</kbd>}
    </button>
  );
}
function Entries({
  items,
  close,
}: {
  items: OfficeMenuItem[];
  close: () => void;
}) {
  return items.map((item, index) =>
    item.separator ? (
      <div key={index} role="separator" />
    ) : item.children ? (
      <Submenu key={index} label={item.label} disabled={item.disabled}>
        <Entries items={item.children} close={close} />
      </Submenu>
    ) : (
      <Entry key={index} item={item} close={close} />
    ),
  );
}
export function OfficeMenubar({
  label,
  menus,
}: {
  label: string;
  menus: { label: string; disabled?: boolean; items: OfficeMenuItem[] }[];
}) {
  const [opened, setOpened] = useState<{
    index: number;
    anchor: MenuAnchor;
  } | null>(null);
  const root = useRef<HTMLElement>(null);
  const [focused, setFocused] = useState(0);
  const activeIndex = menus[focused]?.disabled
    ? menus.findIndex((menu) => !menu.disabled)
    : focused;
  function show(index: number) {
    const button =
      root.current?.querySelectorAll<HTMLButtonElement>(':scope > button')[
        index
      ];
    if (button && !button.disabled) {
      setFocused(index);
      setOpened({ index, anchor: menuAnchor(button) });
    }
  }
  function traverse(direction: number) {
    const buttons = [
      ...root.current!.querySelectorAll<HTMLButtonElement>(':scope > button'),
    ];
    let index =
      opened?.index ??
      buttons.indexOf(document.activeElement as HTMLButtonElement);
    for (let n = 0; n < buttons.length; n++) {
      index = (index + direction + buttons.length) % buttons.length;
      if (!buttons[index].disabled) {
        buttons[index].focus();
        setFocused(index);
        if (opened) show(index);
        break;
      }
    }
  }
  return (
    <>
      <nav
        className="office-menubar"
        role="menubar"
        aria-label={label}
        ref={root}
        onKeyDown={(event) => {
          if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
            event.preventDefault();
            traverse(event.key === 'ArrowRight' ? 1 : -1);
          }
          if (['Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const buttons = [
              ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                ':scope > button',
              ),
            ];
            const index =
              event.key === 'Home'
                ? buttons.findIndex((button) => !button.disabled)
                : buttons.findLastIndex((button) => !button.disabled);
            buttons[index]?.focus();
            setFocused(index);
            if (opened) show(index);
          }
          if (['ArrowDown', 'Enter', ' '].includes(event.key)) {
            event.preventDefault();
            show(
              [...event.currentTarget.children].indexOf(
                document.activeElement!,
              ),
            );
          }
          if (event.key === 'Escape') setOpened(null);
        }}
      >
        {menus.map((menu, index) => (
          <button
            key={menu.label}
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={opened?.index === index}
            disabled={menu.disabled}
            tabIndex={activeIndex === index ? 0 : -1}
            onFocus={() => setFocused(index)}
            onPointerEnter={(event) => {
              if (opened && event.pointerType === 'mouse') show(index);
            }}
            onClick={() =>
              opened?.index === index ? setOpened(null) : show(index)
            }
          >
            {menu.label}
          </button>
        ))}
      </nav>
      {opened && (
        <ContextMenu
          label={menus[opened.index].label}
          anchor={opened.anchor}
          onClose={() => setOpened(null)}
          onTraverse={traverse}
          keepTrigger
        >
          <Entries
            items={menus[opened.index].items}
            close={() => {
              opened.anchor.trigger.focus({ preventScroll: true });
              setOpened(null);
            }}
          />
        </ContextMenu>
      )}
    </>
  );
}

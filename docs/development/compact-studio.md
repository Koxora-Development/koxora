# Compact Studio surfaces and discoverable AppImage integration

The Product Owner's 2026-11-10 AppImage feedback authorizes a consistent compact presentation for settings, element properties and context menus. The tested functional scope mostly worked in the combined AppImage, but Koxora did not appear in Open With because standalone AppImages are not registered automatically. This is a refinement of integration PR #55 at `201d73fdd1c2e2e2a191ac3df4c9d052584c13d9`; original PRs #52–54 remain separate and unmerged. The new review build includes all three blocks. No merge or release is authorized.

References: CORE-001–006/010/015–017, EDIT-011, OPS-001/003/007–009; [combined acceptance](studio-integration-review.md), [native opening](native-opening.md), [storage](desktop-storage.md).

## Presentation

Shared semantic tokens define 32px desktop controls, 30px context-menu rows, consistent borders/radii and compact spacing. The header/sidebar/toolbars share those metrics; diagram content and portable viewport data are not rescaled. Fine-pointer density remains keyboard accessible; coarse-pointer controls, menu rows, summaries and checkbox labels use at least 44px hit targets. Light/dark and EN/DE use the same components.

Properties use a bounded 680px surface with grouped text, link and geometry controls rather than the former narrow, long form. Explanatory text remains available in native expandable help; validation and unavailable-target feedback stay visible. Existing draft/Apply/Cancel behavior, keyboard shortcuts, native rich-text editing, history and optional link metadata are retained. An explicit Export/Save As intent during autosave is source-scoped and resumed once after the write, preventing a timer from cancelling the click between pointer down and up. Failed local saves still leave in-memory work exportable for recovery. Context-menu separators distinguish action groups; Arrow/Home/End/Escape and viewport clamping remain unchanged.

Storage settings show a selectable wrapping path, space diagnostic, explicit restore checkbox and retained-source notice. Longer support guidance is expandable. Restore mode stays visible and changes the primary action label. Onboarding retains its language selector. Shared dialog focus handling includes native summaries, and responsive layouts/actions remain reachable in small windows and at reduced CSS viewport sizes corresponding to zoomed desktop use.

## Explicit AppImage setup

In the native AppImage, open **Settings · Storage → Open With · AppImage → Set up Open With**. German: **Einstellungen · Speicher → Öffnen mit · AppImage → Öffnen mit einrichten**. This registers only the current OS user's menu/MIME entry. It does not set the default application. Then choose Koxora in Dolphin's Open With dialog; set a default there only if desired. Repeat setup after moving the AppImage; Remove integration leaves all project data intact.

Direct file-manager launch still requires a functioning AppImage/FUSE environment. If using `--appimage-extract-and-run` or isolated XDG variables, use a stable executable wrapper and the supplied helper as described in [native opening](native-opening.md). In-app setup records the current AppImage path, not a profile wrapper. Browser builds do not expose OS registration. Installed DEB/Windows/macOS associations remain owned by their packaging.

The optional setup requires host `/usr/bin/python3`; core editing/opening does not. Missing Python, cache refresh and current-path problems have localized feedback. `shared-mime-info` and `desktop-file-utils` supply the desktop cache commands. A matching registration proves file evidence, not that every desktop shell has refreshed its menu; missing/failing cache tools or timeout after publication yields a refresh notice. Sign out/in or retry setup after installing missing tools.

## Native boundary

The only new IPC is `appimage_integration` with a deserialized `status/register/remove` action enum. No caller-supplied executable, project path or command string is accepted. The native side derives APPIMAGE, validates the absolute executable for registration, and permits stale integration removal after the image disappears. A process-wide mutex serializes status/mutations so closing/reopening Settings cannot race helpers.

The embedded, previously reviewed Python helper runs from a private temporary directory on a blocking worker with `-I`, sanitized AppImage host-library environment and a 30-second process-group deadline. It receives the executable as one argv item, never through a shell. Only four fixed owned user files are changed: desktop entry, MIME XML, icon and registration evidence JSON. Atomic same-directory replacement prevents following a destination leaf symlink; preflight rejects nonregular/symlink leaves. Ancestor XDG directory configuration remains the OS user's trust boundary. Existing default-app files are untouched.

Status does not require Python. Bounded nonblocking/no-follow reads verify the current path and complete desktop/XML/icon evidence; partial, oversized, stale or symlinked records are not reported as matching. The JSON record stores the exact desktop bytes and canonical AppImage path, is published last and contains no project data. Remove requires confirmed NotFound for every owned leaf, rather than treating unreadable paths as absent. Native errors do not expose raw helper output. Timeout/failing cache refresh is distinguished from already published registration/removal.

## Acceptance

1. At 1280×900 in Firefox and the AppImage, open properties and right-click menus. Check grouped controls, compact rows, visible focus and keyboard navigation. Expand help and geometry, edit fields, Apply/Cancel, undo/redo and follow links.
2. Repeat dark theme/German, a narrow window, keyboard-only use and a reduced viewport representing 200% browser zoom. No horizontal form overflow; lower fields and Apply/Cancel remain reachable. Check touch/coarse targets separately.
3. In the combined AppImage on CachyOS, open settings, confirm the real path and explicitly register Open With. Check Dolphin now offers Koxora, another default remains unchanged, and cold/warm opening still works. This requires real desktop acceptance; IPC mocks alone do not prove Dolphin behavior.
4. Move a disposable AppImage and reopen it: old evidence must not be shown as current; update registration. Remove integration and retain projects. Test unavailable Python/cache tools with disposable configuration only. Existing wrapper-based test profiles remain supported by the CLI helper.
5. Check storage migration, restore opt-in, failure retention, offline restart, native Save As, missing project links, focused drafts and queued warm requests as in the combined guide.

Final actual local/CI results and exact-head unsigned packages belong in the refinement PR and handover. Independent review covers UI safety/accessibility and native registration; no unrun OS acceptance is claimed. No public website content, project schema, interactive exports or default-app policy change is part of this refinement.

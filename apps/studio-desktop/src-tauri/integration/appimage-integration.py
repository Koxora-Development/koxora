#!/usr/bin/env python3
"""Explicit, per-user AppImage association. Never chooses the user's default app."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

DESKTOP_ID = "app.koxora.studio-appimage.desktop"
MIME_ICON_NAME = "application-x-koxora"
MIME_ICON = "icons/hicolor/scalable/mimetypes/" + MIME_ICON_NAME + ".svg"

def exec_quote(value):
    """Desktop Entry Exec quoting has two escaping passes; it is not shell quoting."""
    value = value.replace("%", "%%")
    for char in ("\\", '"', "`", "$"):
        value = value.replace(char, "\\" + char)
    return '"' + value.replace("\\", "\\\\") + '"'

def refresh(data):
    # Theme-directory timestamps also invalidate Qt/KDE icon lookups.
    theme = data / "icons/hicolor"
    if theme.is_dir():
        os.utime(theme, None)
        if shutil.which("gtk-update-icon-cache"):
            subprocess.run(["gtk-update-icon-cache", "--force", "--ignore-theme-index", str(theme)], check=True)
    for command, directory in (("update-mime-database", data / "mime"), ("update-desktop-database", data / "applications")):
        if shutil.which(command):
            subprocess.run([command, str(directory)], check=True)

def publish(path, content):
    """Replace an owned leaf atomically without following a symlink destination."""
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as output:
            temporary = Path(output.name)
            output.write(content)
            output.flush()
            os.fsync(output.fileno())
        temporary.chmod(0o644)
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)

def main():
    parser = argparse.ArgumentParser(description="Register Koxora AppImage in Open With; no default association is changed. / Koxora-AppImage für Öffnen mit registrieren; Standardzuordnung bleibt unverändert.")
    parser.add_argument("appimage", nargs="?", type=Path)
    parser.add_argument("--appimage", dest="appimage_option", type=Path, help="Current AppImage / Aktuelles AppImage")
    parser.add_argument("--icon", type=Path, help="Application icon / Anwendungssymbol")
    parser.add_argument("--mime", type=Path, help="MIME declaration / MIME-Beschreibung")
    parser.add_argument("--file-icon", type=Path, help="Project document icon / Projektdateisymbol")
    parser.add_argument("--remove", action="store_true", help="Remove this integration / Diese Integration entfernen")
    args = parser.parse_args()
    data = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local/share"))
    if not data.is_absolute():
        parser.error("XDG_DATA_HOME must be absolute / XDG_DATA_HOME muss absolut sein")
    files = [data / "applications" / DESKTOP_ID, data / "mime/packages/koxora-appimage.xml", data / "icons/hicolor/256x256/apps/koxora-appimage.png", data / "applications/app.koxora.studio-appimage.json", data / MIME_ICON]
    if args.remove:
        for file in files:
            file.unlink(missing_ok=True)
        refresh(data)
        return
    if args.appimage is not None and args.appimage_option is not None:
        parser.error("Specify the AppImage once / AppImage nur einmal angeben")
    selected_appimage = args.appimage_option or args.appimage
    if selected_appimage is None:
        parser.error("Specify the AppImage / AppImage angeben")
    app = selected_appimage.resolve(strict=True)
    if not app.is_file() or not os.access(app, os.X_OK) or any(ord(c) < 32 for c in str(app)):
        parser.error("Choose an executable regular AppImage / Ausführbare reguläre AppImage wählen")
    source = Path(__file__).resolve().parent
    icon = args.icon or source / "icon.png"
    if args.icon is None and not icon.exists():
        icon = source.parent / "icons/icon.png"
    declaration = args.mime or source / "koxora.xml"
    document_icon = args.file_icon or source / "project-file.svg"
    if args.file_icon is None and not document_icon.exists():
        document_icon = source.parent / "icons/project-file.svg"
    try:
        # Check all resources before publishing any registration leaf. Missing
        # files in an old helper package must not corrupt an existing setup.
        resources = [declaration.read_bytes(), icon.read_bytes(), document_icon.read_bytes()]
    except OSError:
        parser.error("Integration resource missing or unreadable / Integrationsdatei fehlt oder ist nicht lesbar")
    for file in files:
        file.parent.mkdir(parents=True, exist_ok=True)
    desktop = "\n".join([
        "[Desktop Entry]", "Type=Application", "Name=Koxora Studio", "Comment=Open local Koxora projects",
        "Comment[de]=Lokale Koxora-Projekte öffnen", "Exec=/usr/bin/env -- " + exec_quote(str(app)) + " %F",
        "Icon=koxora-appimage", "Terminal=false", "Categories=Graphics;", "MimeType=application/x-koxora;", ""
    ])
    for file in files:
        if file.is_symlink() or (file.exists() and not file.is_file()):
            parser.error("Integration file is not regular / Integrationsdatei ist nicht regulär")
    publish(files[0], desktop.encode("utf-8"))
    publish(files[1], resources[0])
    publish(files[2], resources[1])
    publish(files[4], resources[2])
    # Write evidence last: older setups remain detectably stale until all
    # current registration resources, including the MIME document icon, exist.
    publish(files[3], json.dumps({"version": 2, "appimage": str(app), "desktop": desktop, "mimeIcon": MIME_ICON_NAME}).encode("utf-8"))
    refresh(data)

if __name__ == "__main__":
    main()

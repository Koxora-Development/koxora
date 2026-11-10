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

def exec_quote(value):
    """Desktop Entry Exec quoting has two escaping passes; it is not shell quoting."""
    value = value.replace("%", "%%")
    for char in ("\\", '"', "`", "$"):
        value = value.replace(char, "\\" + char)
    return '"' + value.replace("\\", "\\\\") + '"'

def refresh(data):
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
    parser.add_argument("--remove", action="store_true", help="Remove this integration / Diese Integration entfernen")
    args = parser.parse_args()
    data = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local/share"))
    if not data.is_absolute():
        parser.error("XDG_DATA_HOME must be absolute / XDG_DATA_HOME muss absolut sein")
    files = [data / "applications" / DESKTOP_ID, data / "mime/packages/koxora-appimage.xml", data / "icons/hicolor/256x256/apps/koxora-appimage.png", data / "applications/app.koxora.studio-appimage.json"]
    if args.remove:
        for file in files:
            file.unlink(missing_ok=True)
        refresh(data)
        return
    if args.appimage is None:
        parser.error("Specify the AppImage / AppImage angeben")
    app = args.appimage.resolve(strict=True)
    if not app.is_file() or not os.access(app, os.X_OK) or any(ord(c) < 32 for c in str(app)):
        parser.error("Choose an executable regular AppImage / Ausführbare reguläre AppImage wählen")
    source = Path(__file__).resolve().parent
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
    publish(files[1], (source / "koxora.xml").read_bytes())
    icon = source / "icon.png"
    if not icon.exists():
        icon = source.parent / "icons/icon.png"
    publish(files[2], icon.read_bytes())
    publish(files[3], json.dumps({"appimage": str(app), "desktop": desktop}).encode("utf-8"))
    refresh(data)

if __name__ == "__main__":
    main()

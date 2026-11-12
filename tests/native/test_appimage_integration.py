"""Association setup and actual Desktop Entry launcher contract (no GUI needed)."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
HELPER = ROOT / "apps/studio-desktop/src-tauri/integration/appimage-integration.py"
NATIVE = ROOT / "apps/studio-desktop/src-tauri"
MIME_ICON = "icons/hicolor/scalable/mimetypes/application-x-koxora.svg"

class AppImageIntegration(unittest.TestCase):
    def test_registration_is_per_user_reversible_and_never_changes_defaults(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            app = root / "App 世界.AppImage"
            app.write_text("#!/bin/sh\nexit 0\n")
            app.chmod(0o755)
            data = root / "data"
            env = {**os.environ, "XDG_DATA_HOME": str(data)}
            subprocess.run(["python3", str(HELPER), str(app)], env=env, check=True)
            desktop = data / "applications/app.koxora.studio-appimage.desktop"
            self.assertIn(" %F", desktop.read_text())
            self.assertIn("MimeType=application/x-koxora;", desktop.read_text())
            self.assertFalse((data / "applications/mimeapps.list").exists())
            self.assertEqual((data / MIME_ICON).read_bytes(), (NATIVE / "icons/project-file.svg").read_bytes())
            self.assertEqual((data / MIME_ICON).stat().st_mode & 0o777, 0o644)
            subprocess.run(["python3", str(HELPER), "--remove"], env=env, check=True)
            self.assertFalse(desktop.exists())
            self.assertFalse((data / "mime/packages/koxora-appimage.xml").exists())
            self.assertFalse((data / MIME_ICON).exists())

    def test_registration_evidence_matches_files_and_symlinks_never_overwrite_targets(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            app = root / "Koxora.AppImage"
            app.write_text("#!/bin/sh\nexit 0\n")
            app.chmod(0o755)
            data = root / "data"
            env = {**os.environ, "XDG_DATA_HOME": str(data)}
            subprocess.run(["python3", "-I", str(HELPER), str(app)], env=env, check=True)
            record = json.loads((data / "applications/app.koxora.studio-appimage.json").read_text())
            self.assertEqual(record["appimage"], str(app.resolve()))
            desktop = data / "applications/app.koxora.studio-appimage.desktop"
            self.assertEqual(record["desktop"], desktop.read_text())
            sentinel = root / "sentinel"
            sentinel.write_text("retain this data")
            desktop.unlink()
            desktop.symlink_to(sentinel)
            result = subprocess.run(["python3", "-I", str(HELPER), str(app)], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(sentinel.read_text(), "retain this data")
            subprocess.run(["python3", str(HELPER), "--remove"], env=env, check=True)
            self.assertEqual(sentinel.read_text(), "retain this data")
            self.assertFalse((data / "applications/app.koxora.studio-appimage.json").exists())

    def test_existing_registration_upgrades_with_explicit_current_helper_resource_flags(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            app = root / "Old setup 世界.AppImage"
            app.write_text("#!/bin/sh\nexit 0\n")
            app.chmod(0o755)
            data = root / "data"
            applications = data / "applications"
            applications.mkdir(parents=True)
            desktop = applications / "app.koxora.studio-appimage.desktop"
            desktop.write_text("old registration")
            record = applications / "app.koxora.studio-appimage.json"
            record.write_text(json.dumps({"appimage": str(app), "desktop": desktop.read_text()}))
            defaults = applications / "mimeapps.list"
            defaults.write_text("[Default Applications]\napplication/x-koxora=another.desktop;\n")
            env = {**os.environ, "XDG_DATA_HOME": str(data)}
            subprocess.run([
                "python3", "-I", str(HELPER), "--appimage", str(app),
                "--icon", str(NATIVE / "icons/icon.png"),
                "--mime", str(NATIVE / "integration/koxora.xml"),
                "--file-icon", str(NATIVE / "icons/project-file.svg"),
            ], env=env, check=True)
            evidence = json.loads(record.read_text())
            self.assertEqual(evidence["version"], 2)
            self.assertEqual(evidence["appimage"], str(app.resolve()))
            self.assertEqual(evidence["desktop"], desktop.read_text())
            self.assertEqual(evidence["mimeIcon"], "application-x-koxora")
            self.assertEqual((data / MIME_ICON).read_bytes(), (NATIVE / "icons/project-file.svg").read_bytes())
            self.assertIn("another.desktop", defaults.read_text())
            subprocess.run(["python3", "-I", str(HELPER), "--remove"], env=env, check=True)
            self.assertFalse(record.exists())
            self.assertFalse((data / MIME_ICON).exists())
            self.assertIn("another.desktop", defaults.read_text())

    def test_packaged_helper_finds_sibling_file_icon_and_missing_asset_keeps_prior_setup(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            package = root / "integration"
            package.mkdir()
            packaged_helper = package / HELPER.name
            shutil.copyfile(HELPER, packaged_helper)
            shutil.copyfile(NATIVE / "icons/icon.png", package / "icon.png")
            shutil.copyfile(NATIVE / "integration/koxora.xml", package / "koxora.xml")
            app = root / "Packaged.AppImage"
            app.write_text("#!/bin/sh\nexit 0\n")
            app.chmod(0o755)
            data = root / "data"
            desktop = data / "applications/app.koxora.studio-appimage.desktop"
            desktop.parent.mkdir(parents=True)
            desktop.write_text("prior registration")
            env = {**os.environ, "XDG_DATA_HOME": str(data)}
            result = subprocess.run(["python3", "-I", str(packaged_helper), str(app)], env=env, capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("Integration resource missing or unreadable", result.stderr.decode())
            self.assertEqual(desktop.read_text(), "prior registration")
            shutil.copyfile(NATIVE / "icons/project-file.svg", package / "project-file.svg")
            subprocess.run(["python3", "-I", str(packaged_helper), str(app)], env=env, check=True)
            self.assertEqual((data / MIME_ICON).read_bytes(), (package / "project-file.svg").read_bytes())
            sentinel = root / "sentinel"
            sentinel.write_text("keep")
            (data / MIME_ICON).unlink()
            (data / MIME_ICON).symlink_to(sentinel)
            result = subprocess.run(["python3", "-I", str(packaged_helper), str(app)], env=env, capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(sentinel.read_text(), "keep")
            subprocess.run(["python3", "-I", str(packaged_helper), "--remove"], env=env, check=True)
            self.assertEqual(sentinel.read_text(), "keep")
            self.assertFalse((data / MIME_ICON).is_symlink())

    def test_linux_package_maps_dedicated_document_icon_matching_mime_declaration(self):
        config = json.loads((NATIVE / "tauri.conf.json").read_text())
        self.assertEqual(config["bundle"]["linux"]["deb"]["files"]["/usr/share/" + MIME_ICON], "icons/project-file.svg")
        namespace = {"mime": "http://www.freedesktop.org/standards/shared-mime-info"}
        declaration = ET.parse(NATIVE / "integration/koxora.xml").getroot()
        content_type = declaration.find("mime:mime-type", namespace)
        self.assertEqual(content_type.attrib["type"], "application/x-koxora")
        self.assertEqual(content_type.find("mime:icon", namespace).attrib["name"], "application-x-koxora")
        document = ET.parse(NATIVE / "icons/project-file.svg").getroot()
        self.assertEqual(document.tag, "{http://www.w3.org/2000/svg}svg")
        self.assertNotEqual((NATIVE / "icons/project-file.svg").read_bytes(), (NATIVE / "icons/source.svg").read_bytes())
        self.assertFalse(document.findall(".//{http://www.w3.org/2000/svg}image"))

    @unittest.skipUnless(shutil.which("gio") and shutil.which("update-mime-database"), "GLib/shared-mime-info unavailable")
    def test_real_mime_database_exposes_koxora_document_icon_for_project_files(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            app = root / "Koxora.AppImage"
            app.write_text("#!/bin/sh\nexit 0\n")
            app.chmod(0o755)
            data = root / "data"
            env = {**os.environ, "XDG_DATA_HOME": str(data), "LC_ALL": "C"}
            subprocess.run(["python3", "-I", str(HELPER), str(app)], env=env, check=True)
            project = root / "Diagram.koxora"
            project.write_bytes(b"PK\x05\x06" + b"\x00" * 18)
            result = subprocess.run(["gio", "info", "--attributes=standard::content-type,standard::icon", str(project)], env=env, check=True, capture_output=True, text=True)
            self.assertIn("standard::content-type: application/x-koxora", result.stdout)
            self.assertIn("standard::icon: application-x-koxora", result.stdout)
            self.assertIn("application/x-koxora:application-x-koxora", (data / "mime/icons").read_text())
            if shutil.which("gtk-update-icon-cache"):
                self.assertTrue((data / "icons/hicolor/icon-theme.cache").is_file())

    @unittest.skipUnless(shutil.which("gio"), "GLib Desktop Entry launcher unavailable")
    def test_real_desktop_launcher_preserves_punctuation_and_filename_arguments(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            app = root / 'App 世界 $`"\\% image.AppImage'
            app.write_text("#!/usr/bin/python3\nimport json, os, sys\nopen(os.environ['KOXORA_TEST_RESULT'], 'w').write(json.dumps(sys.argv))\n")
            app.chmod(0o755)
            result = root / "result.json"
            data = root / "data"
            env = {**os.environ, "XDG_DATA_HOME": str(data), "KOXORA_TEST_RESULT": str(result)}
            document = root / "Plan 世界 ; $(not-executed).koxora"
            document.write_bytes(b"test")
            subprocess.run(["python3", str(HELPER), str(app)], env=env, check=True)
            desktop = data / "applications/app.koxora.studio-appimage.desktop"
            subprocess.run(["gio", "launch", str(desktop), str(document)], env=env, check=True)
            for _ in range(50):
                if result.exists(): break
                time.sleep(0.05)
            self.assertEqual(json.loads(result.read_text()), [str(app), str(document)])

if __name__ == "__main__":
    unittest.main()

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

ROOT = Path(__file__).resolve().parents[2]
HELPER = ROOT / "apps/studio-desktop/src-tauri/integration/appimage-integration.py"

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
            subprocess.run(["python3", str(HELPER), "--remove"], env=env, check=True)
            self.assertFalse(desktop.exists())
            self.assertFalse((data / "mime/packages/koxora-appimage.xml").exists())

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

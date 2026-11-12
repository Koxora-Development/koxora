"""Consent-sensitive registration contract and optional real NSIS compilation."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
HOOK = ROOT / "apps/studio-desktop/src-tauri/integration/windows-associations.nsh"

class WindowsAssociations(unittest.TestCase):
    def test_installer_registers_open_with_without_assigning_defaults(self):
        config = json.loads((ROOT / "apps/studio-desktop/src-tauri/tauri.conf.json").read_text())
        self.assertEqual(config["bundle"]["windows"]["nsis"]["installerHooks"], "integration/windows-associations.nsh")
        manifest = json.loads((ROOT / "apps/studio-desktop/package.json").read_text())
        self.assertEqual(manifest["devDependencies"]["@tauri-apps/cli"], "2.12.3", "Re-review upstream macro ordering/signatures on CLI upgrade")
        text = HOOK.read_text()
        install = text.split("!macro APP_ASSOCIATE ", 1)[1].split("!macroend", 1)[0]
        self.assertIn('Software\\Classes\\.${EXT}\\OpenWithProgids', install)
        self.assertNotIn('"Software\\Classes\\.${EXT}"', install)
        self.assertNotIn("UserChoice", install)
        self.assertIn('ReadRegStr $R0 SHCTX', text)
        self.assertIn('${If} $R0 == "${FILECLASS}"', text)
        self.assertIn('"$INSTDIR', text.replace('$\\"', '"'))

    @unittest.skipUnless(shutil.which("makensis"), "NSIS compiler unavailable")
    def test_real_nsis_compiles_install_and_uninstall_macro_replacements(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            script = root / "contract.nsi"
            script.write_text('''Unicode true
Name "Koxora association contract"
OutFile "OUTPUT"
InstallDir "$LOCALAPPDATA\\Koxora Test"
RequestExecutionLevel user
!define MAINBINARYNAME "koxora-desktop"
!macro APP_ASSOCIATE EXT FILECLASS DESCRIPTION ICON COMMANDTEXT COMMAND
!macroend
!macro APP_UNASSOCIATE EXT FILECLASS
!macroend
!macro UPDATEFILEASSOC
!macroend
!include "HOOK"
Section "Install"
  !insertmacro APP_ASSOCIATE "koxora" "Koxora.Project" "Koxora project" "icon.ico" "Open" '"$INSTDIR\\koxora-desktop.exe" "%1"'
  WriteUninstaller "$INSTDIR\\uninstall.exe"
SectionEnd
Section "Uninstall"
  !insertmacro APP_UNASSOCIATE "koxora" "Koxora.Project"
SectionEnd
'''.replace("OUTPUT", str(root / "contract.exe")).replace("HOOK", str(HOOK)))
            subprocess.run([shutil.which("makensis"), str(script)], check=True, capture_output=True)
            self.assertTrue((root / "contract.exe").is_file())

if __name__ == "__main__":
    unittest.main()

//! Explicit current-AppImage registration; no caller-controlled filesystem path or default app.
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Action {
    Status,
    Register,
    Remove,
}
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    available: bool,
    can_register: bool,
    registered: bool,
    path: Option<String>,
    refresh_needed: bool,
}

pub fn run(action: Action) -> Result<Status, String> {
    #[cfg(target_os = "linux")]
    {
        linux::run(action)
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = action;
        Ok(Status {
            available: false,
            can_register: false,
            registered: false,
            path: None,
            refresh_needed: false,
        })
    }
}

#[cfg(target_os = "linux")]
mod linux {
    use super::*;
    use std::os::unix::{
        fs::{OpenOptionsExt, PermissionsExt},
        process::CommandExt,
    };
    use std::{
        env, fs,
        path::{Path, PathBuf},
        process::{Command, Stdio},
        time::{Duration, Instant},
    };
    const DESKTOP: &str = "applications/app.koxora.studio-appimage.desktop";
    const RECORD: &str = "applications/app.koxora.studio-appimage.json";
    const MIME: &[u8] = include_bytes!("../integration/koxora.xml");
    const ICON: &[u8] = include_bytes!("../icons/icon.png");
    const FILE_ICON: &[u8] = include_bytes!("../icons/project-file.svg");
    const FILE_ICON_PATH: &str = "icons/hicolor/scalable/mimetypes/application-x-koxora.svg";
    static MUTATION: std::sync::Mutex<()> = std::sync::Mutex::new(());
    #[derive(serde::Deserialize)]
    struct Record {
        appimage: String,
        desktop: String,
    }
    fn appimage(value: Option<std::ffi::OsString>) -> Option<PathBuf> {
        let value = PathBuf::from(value?);
        if !value.is_absolute() {
            return None;
        }
        let path = fs::canonicalize(value).ok()?;
        let text = path.to_str()?;
        let metadata = fs::metadata(&path).ok()?;
        (metadata.is_file()
            && metadata.permissions().mode() & 0o111 != 0
            && !text.chars().any(|c| c.is_control()))
        .then_some(path)
    }
    fn read_regular(path: &Path, limit: usize) -> Option<Vec<u8>> {
        use std::io::Read;
        let metadata = fs::symlink_metadata(path).ok()?;
        if !metadata.is_file() || metadata.len() > limit as u64 {
            return None;
        }
        let file = fs::OpenOptions::new()
            .read(true)
            .custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK)
            .open(path)
            .ok()?;
        if !file.metadata().ok()?.is_file() {
            return None;
        }
        let mut bytes = Vec::new();
        file.take(limit as u64 + 1).read_to_end(&mut bytes).ok()?;
        (bytes.len() <= limit).then_some(bytes)
    }
    fn registered(data: &Path, app: &Path) -> bool {
        let Some(record) = read_regular(&data.join(RECORD), 262144)
            .and_then(|bytes| serde_json::from_slice::<Record>(&bytes).ok())
        else {
            return false;
        };
        Path::new(&record.appimage) == app
            && read_regular(&data.join(DESKTOP), 65536).as_deref()
                == Some(record.desktop.as_bytes())
            && read_regular(&data.join("mime/packages/koxora-appimage.xml"), MIME.len()).as_deref()
                == Some(MIME)
            && read_regular(
                &data.join("icons/hicolor/256x256/apps/koxora-appimage.png"),
                ICON.len(),
            )
            .as_deref()
                == Some(ICON)
            && read_regular(&data.join(FILE_ICON_PATH), FILE_ICON.len()).as_deref()
                == Some(FILE_ICON)
    }
    fn data_directory() -> Result<PathBuf, String> {
        let path = env::var_os("XDG_DATA_HOME")
            .map(PathBuf::from)
            .or_else(|| env::var_os("HOME").map(|home| PathBuf::from(home).join(".local/share")))
            .ok_or("integrationFailed")?;
        if !path.is_absolute() {
            return Err("integrationFailed".into());
        }
        Ok(path)
    }
    fn execute(mut command: Command, timeout: Duration) -> Result<bool, String> {
        command
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .process_group(0);
        let mut child = command.spawn().map_err(|error| {
            if error.kind() == std::io::ErrorKind::NotFound {
                "integrationPython"
            } else {
                "integrationFailed"
            }
            .to_owned()
        })?;
        let start = Instant::now();
        loop {
            match child.try_wait() {
                Ok(Some(status)) => return Ok(status.success()),
                Ok(None) if start.elapsed() < timeout => {
                    std::thread::sleep(Duration::from_millis(20))
                }
                _ => {
                    if let Ok(group) = i32::try_from(child.id()) {
                        // The child owns this process group, including cache updater descendants.
                        unsafe {
                            libc::kill(-group, libc::SIGKILL);
                        }
                    }
                    let _ = child.kill();
                    let _ = child.wait();
                    return Err("integrationFailed".into());
                }
            }
        }
    }
    pub(super) fn run(action: Action) -> Result<Status, String> {
        let _guard = MUTATION.try_lock().map_err(|_| "integrationBusy")?;
        let Some(raw) = env::var_os("APPIMAGE")
            .map(PathBuf::from)
            .filter(|path| path.is_absolute())
        else {
            return Ok(Status {
                available: false,
                can_register: false,
                registered: false,
                path: None,
                refresh_needed: false,
            });
        };
        let app = appimage(Some(raw.clone().into_os_string()));
        let data = data_directory()?;
        let mut refresh_needed = false;
        if !matches!(action, Action::Status) {
            if matches!(action, Action::Register) && app.is_none() {
                return Err("integrationFailed".into());
            }
            let temp = tempfile::tempdir().map_err(|_| "integrationFailed")?;
            let script = temp.path().join("integration.py");
            fs::write(
                &script,
                include_bytes!("../integration/appimage-integration.py"),
            )
            .map_err(|_| "integrationFailed")?;
            fs::write(temp.path().join("koxora.xml"), MIME).map_err(|_| "integrationFailed")?;
            fs::write(temp.path().join("icon.png"), ICON).map_err(|_| "integrationFailed")?;
            fs::write(temp.path().join("project-file.svg"), FILE_ICON)
                .map_err(|_| "integrationFailed")?;
            let mut command = Command::new("/usr/bin/python3");
            command.arg("-I").arg(script);
            match action {
                Action::Remove => {
                    command.arg("--remove");
                }
                _ => {
                    command.arg(app.as_ref().ok_or("integrationFailed")?);
                }
            }
            let environment: Vec<_> = env::vars_os().collect();
            if let Some(app_dir) = env::var_os("APPDIR")
                .map(PathBuf::from)
                .filter(|p| p.is_absolute() && p.parent().is_some())
            {
                crate::links::linux::host_environment(&mut command, &app_dir, &environment);
            }
            refresh_needed = match execute(command, Duration::from_secs(30)) {
                Ok(success) => !success,
                Err(code) if code == "integrationPython" => return Err(code),
                Err(_) => true,
            } || !Path::new("/usr/bin/update-mime-database").is_file()
                || !Path::new("/usr/bin/update-desktop-database").is_file();
            if matches!(action, Action::Remove) {
                for name in [
                    DESKTOP,
                    RECORD,
                    "mime/packages/koxora-appimage.xml",
                    "icons/hicolor/256x256/apps/koxora-appimage.png",
                    FILE_ICON_PATH,
                ] {
                    match data.join(name).symlink_metadata() {
                        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
                        _ => return Err("integrationFailed".into()),
                    }
                }
            }
            if matches!(action, Action::Register)
                && !app.as_ref().is_some_and(|app| registered(&data, app))
            {
                return Err("integrationFailed".into());
            }
        }
        Ok(Status {
            available: true,
            can_register: app.is_some(),
            registered: app.as_ref().is_some_and(|app| registered(&data, app)),
            path: Some(app.as_ref().unwrap_or(&raw).to_string_lossy().into_owned()),
            refresh_needed,
        })
    }
    #[cfg(test)]
    mod tests {
        use super::*;
        #[test]
        fn current_appimage_requires_a_real_absolute_executable() {
            let dir = tempfile::tempdir().unwrap();
            let path = dir.path().join("App 世界.AppImage");
            fs::write(&path, "test").unwrap();
            fs::set_permissions(&path, fs::Permissions::from_mode(0o600)).unwrap();
            assert!(appimage(Some(path.clone().into_os_string())).is_none());
            fs::set_permissions(&path, fs::Permissions::from_mode(0o700)).unwrap();
            assert_eq!(appimage(Some(path.clone().into_os_string())), Some(path));
            assert!(appimage(Some("relative.AppImage".into())).is_none());
            assert!(appimage(None).is_none());
        }
        #[test]
        fn registration_evidence_rejects_stale_or_partial_files() {
            let dir = tempfile::tempdir().unwrap();
            let data = dir.path();
            fs::create_dir_all(data.join("applications")).unwrap();
            fs::create_dir_all(data.join("mime/packages")).unwrap();
            fs::create_dir_all(data.join("icons/hicolor/256x256/apps")).unwrap();
            let app = Path::new("/tmp/App 世界.AppImage");
            fs::write(
                data.join(RECORD),
                serde_json::json!({"appimage": app, "desktop": "desktop"}).to_string(),
            )
            .unwrap();
            fs::write(data.join(DESKTOP), "desktop").unwrap();
            fs::write(data.join("mime/packages/koxora-appimage.xml"), MIME).unwrap();
            assert!(!registered(data, app));
            fs::write(
                data.join("icons/hicolor/256x256/apps/koxora-appimage.png"),
                ICON,
            )
            .unwrap();
            assert!(!registered(data, app));
            fs::create_dir_all(data.join("icons/hicolor/scalable/mimetypes")).unwrap();
            fs::write(data.join(FILE_ICON_PATH), FILE_ICON).unwrap();
            assert!(registered(data, app));
            fs::write(data.join(FILE_ICON_PATH), "stale document icon").unwrap();
            assert!(!registered(data, app));
            fs::write(data.join(FILE_ICON_PATH), FILE_ICON).unwrap();
            assert!(!registered(data, Path::new("/tmp/moved.AppImage")));
            fs::write(data.join(DESKTOP), "changed").unwrap();
            assert!(!registered(data, app));
        }
        #[test]
        fn evidence_reads_reject_oversized_and_symlinked_files() {
            let dir = tempfile::tempdir().unwrap();
            let path = dir.path().join("record");
            fs::write(&path, [0u8; 33]).unwrap();
            assert!(read_regular(&path, 32).is_none());
            std::os::unix::fs::symlink(&path, dir.path().join("link")).unwrap();
            assert!(read_regular(&dir.path().join("link"), 64).is_none());
            assert!(read_regular(dir.path(), 64).is_none());
        }
        #[test]
        fn helper_timeout_is_bounded_and_exit_failures_are_reported() {
            let mut command = Command::new("/bin/sh");
            command.args(["-c", "sleep 30"]);
            assert_eq!(
                execute(command, Duration::from_millis(30)),
                Err("integrationFailed".into())
            );
            let mut command = Command::new("/bin/sh");
            command.args(["-c", "exit 1"]);
            assert_eq!(execute(command, Duration::from_secs(1)), Ok(false));
        }
    }
}

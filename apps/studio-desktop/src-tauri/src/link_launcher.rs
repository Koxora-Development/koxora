use std::{
    env,
    ffi::OsString,
    io,
    path::Path,
    process::{Child, Command, Stdio},
    thread,
    time::{Duration, Instant},
};

pub fn open(url: &str) -> io::Result<()> {
    let Some(app_dir) = env::var_os("APPDIR") else {
        return open::that_detached(url);
    };
    let app_dir = Path::new(&app_dir);
    if !app_dir.is_absolute() || app_dir.parent().is_none() {
        return open::that_detached(url);
    }
    let environment: Vec<_> = env::vars_os().collect();
    let commands = open::commands(url).into_iter().map(|mut command| {
        host_environment(&mut command, app_dir, &environment);
        command
    });
    launch(commands, Duration::from_millis(250))
}

/// Remove only AppImage-owned paths, on the child. Keep host handler and session settings.
pub(crate) fn host_environment(
    command: &mut Command,
    app_dir: &Path,
    environment: &[(OsString, OsString)],
) {
    const LISTS: &[&str] = &[
        "PATH",
        "LD_LIBRARY_PATH",
        "GTK_PATH",
        "GI_TYPELIB_PATH",
        "XDG_DATA_DIRS",
        "GIO_EXTRA_MODULES",
    ];
    const PATHS: &[&str] = &[
        "GTK_DATA_PREFIX",
        "GTK_EXE_PREFIX",
        "GSETTINGS_SCHEMA_DIR",
        "GIO_MODULE_DIR",
        "GTK_IM_MODULE_FILE",
        "GDK_PIXBUF_MODULE_FILE",
        "GDK_PIXBUF_MODULEDIR",
    ];
    for (key, value) in environment {
        if LISTS.iter().any(|name| key == name) {
            let paths: Vec<_> = env::split_paths(value).collect();
            if !paths.iter().any(|path| path.starts_with(app_dir)) {
                continue;
            }
            let host_paths: Vec<_> = paths
                .into_iter()
                .filter(|path| !path.as_os_str().is_empty() && !path.starts_with(app_dir))
                .collect();
            if host_paths.is_empty() {
                if key == "PATH" {
                    command.env(key, "/usr/local/bin:/usr/bin:/bin");
                } else {
                    command.env_remove(key);
                }
            } else {
                // These entries came from split_paths, so they cannot contain a separator.
                command.env(
                    key,
                    env::join_paths(host_paths).expect("split path entries"),
                );
            }
        } else if PATHS.iter().any(|name| key == name) && Path::new(value).starts_with(app_dir) {
            command.env_remove(key);
        }
    }
    command.env_remove("APPDIR").env_remove("APPIMAGE");
}

/// Keep Linux's default-handler fallback order and observe immediate launcher failures.
/// A live launcher at the deadline is handed off once and reaped in the background.
fn launch(commands: impl IntoIterator<Item = Command>, timeout: Duration) -> io::Result<()> {
    use std::os::unix::process::CommandExt;
    let mut first_exit = None;
    let mut last_spawn = None;
    for mut command in commands {
        command
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .process_group(0);
        // Allocate the waiter first; a thread-creation failure must not orphan a child.
        let (sender, receiver) = std::sync::mpsc::sync_channel::<Child>(1);
        thread::Builder::new()
            .name("koxora-link-launcher".into())
            .stack_size(64 * 1024)
            .spawn(move || {
                if let Ok(mut child) = receiver.recv() {
                    let _ = child.wait();
                }
            })?;
        let mut child = match command.spawn() {
            Ok(child) => child,
            Err(error) => {
                last_spawn = Some(error);
                continue;
            }
        };
        let start = Instant::now();
        let result = loop {
            match child.try_wait() {
                Ok(Some(status)) if status.success() => return Ok(()),
                Ok(Some(_)) => {
                    first_exit.get_or_insert_with(|| io::Error::other("URL launcher failed"));
                    break None;
                }
                Err(error) => break Some(Err(error)),
                Ok(None) => {}
            }
            let remaining = timeout.saturating_sub(start.elapsed());
            if remaining.is_zero() {
                break Some(Ok(()));
            }
            thread::sleep(remaining.min(Duration::from_millis(10)));
            if start.elapsed() >= timeout {
                break Some(Ok(()));
            }
        };
        if let Some(result) = result {
            // Do not retry after a successful handoff or an unknown wait status.
            let _ = sender.send(child);
            return result;
        }
    }
    Err(first_exit
        .or(last_spawn)
        .unwrap_or_else(|| io::Error::new(io::ErrorKind::NotFound, "No URL launcher")))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{fs, os::unix::ffi::OsStringExt, os::unix::fs::PermissionsExt};

    fn script(path: &Path, body: &str) {
        fs::write(path, format!("#!/bin/sh\n{body}\n")).unwrap();
        fs::set_permissions(path, fs::Permissions::from_mode(0o700)).unwrap();
    }

    fn configured_commands(url: &str, environment: &[(OsString, OsString)]) -> Vec<Command> {
        open::commands(url)
            .into_iter()
            .map(|mut command| {
                command.env_clear().envs(environment.iter().cloned());
                command
            })
            .collect()
    }

    #[test]
    fn appimage_handoff_uses_host_handlers_for_web_and_mail_without_changing_parent() {
        let dir = tempfile::tempdir().unwrap();
        let app_dir = dir.path().join("Koxora.AppDir");
        let bundled_bin = app_dir.join("usr/bin");
        let host_bin = dir.path().join("host-bin");
        fs::create_dir_all(&bundled_bin).unwrap();
        fs::create_dir(&host_bin).unwrap();
        script(&bundled_bin.join("xdg-open"), "exit 23");
        script(
            &host_bin.join("xdg-open"),
            r#"case "$LD_LIBRARY_PATH:$GIO_MODULE_DIR:$XDG_DATA_DIRS" in
                *"$TEST_APPDIR"*) exit 24;;
            esac
            [ -z "$APPDIR$APPIMAGE" ] || exit 25
            [ "$DBUS_SESSION_BUS_ADDRESS" = "unix:path=/run/user/test/bus" ] || exit 26
            [ "$XDG_CURRENT_DESKTOP" = "KDE" ] || exit 27
            printf '%s\n' "$@" > "$OUTPUT""#,
        );
        let output = dir.path().join("opened-url");
        let environment = vec![
            ("APPDIR".into(), app_dir.clone().into_os_string()),
            ("APPIMAGE".into(), "/test/Koxora.AppImage".into()),
            ("TEST_APPDIR".into(), app_dir.clone().into_os_string()),
            (
                "PATH".into(),
                env::join_paths([&bundled_bin, &host_bin]).unwrap(),
            ),
            (
                "LD_LIBRARY_PATH".into(),
                env::join_paths([app_dir.join("usr/lib"), "/host/lib".into()]).unwrap(),
            ),
            ("GIO_MODULE_DIR".into(), app_dir.join("usr/lib/gio").into()),
            (
                "XDG_DATA_DIRS".into(),
                env::join_paths([app_dir.join("usr/share"), "/host/share".into()]).unwrap(),
            ),
            (
                "DBUS_SESSION_BUS_ADDRESS".into(),
                "unix:path=/run/user/test/bus".into(),
            ),
            ("XDG_CURRENT_DESKTOP".into(), "KDE".into()),
            ("OUTPUT".into(), output.clone().into_os_string()),
        ];
        let parent: Vec<_> = env::vars_os().collect();
        for url in [
            "https://example.com/path?q=one&other=two#fragment",
            "mailto:test@example.com?subject=Hello%20world",
        ] {
            // The old inherited environment fails before a host handler receives the URL.
            assert!(launch(
                configured_commands(url, &environment),
                Duration::from_secs(1)
            )
            .is_err());
            assert!(!output.exists());
            let commands = configured_commands(url, &environment)
                .into_iter()
                .map(|mut command| {
                    host_environment(&mut command, &app_dir, &environment);
                    command
                });
            launch(commands, Duration::from_secs(1)).unwrap();
            assert_eq!(fs::read_to_string(&output).unwrap(), format!("{url}\n"));
            fs::remove_file(&output).unwrap();
        }
        assert!(env::vars_os().eq(parent), "parent environment changed");
    }

    #[test]
    fn cleanup_preserves_host_paths_non_utf8_values_and_session_settings() {
        let app_dir = Path::new("/tmp/app");
        let host_path = OsString::from_vec(b"/host/\xff".to_vec());
        let environment: Vec<(OsString, OsString)> = vec![
            (
                "PATH".into(),
                "/tmp/app/usr/bin:/tmp/application/bin:/usr/bin".into(),
            ),
            (
                "LD_LIBRARY_PATH".into(),
                env::join_paths([OsString::from("/tmp/app/usr/lib"), host_path.clone()]).unwrap(),
            ),
            ("GTK_PATH".into(), "/tmp/app/usr/lib/gtk-3.0:".into()),
            (
                "GSETTINGS_SCHEMA_DIR".into(),
                "/tmp/app/usr/share/glib-2.0/schemas".into(),
            ),
            (
                "GDK_PIXBUF_MODULE_FILE".into(),
                "/host/loaders.cache".into(),
            ),
            ("DISPLAY".into(), ":1".into()),
            ("WAYLAND_DISPLAY".into(), "wayland-0".into()),
            ("XDG_CONFIG_HOME".into(), "/host/config".into()),
        ];
        let mut command = Command::new("xdg-open");
        command.envs(environment.iter().cloned());
        host_environment(&mut command, app_dir, &environment);
        let vars: std::collections::HashMap<_, _> = command.get_envs().collect();
        let value = |name: &str| vars.get(std::ffi::OsStr::new(name)).copied().flatten();
        assert_eq!(
            value("PATH"),
            Some(std::ffi::OsStr::new("/tmp/application/bin:/usr/bin"))
        );
        assert_eq!(value("LD_LIBRARY_PATH"), Some(host_path.as_os_str()));
        assert_eq!(value("GTK_PATH"), None);
        assert_eq!(value("GSETTINGS_SCHEMA_DIR"), None);
        for name in [
            "GDK_PIXBUF_MODULE_FILE",
            "DISPLAY",
            "WAYLAND_DISPLAY",
            "XDG_CONFIG_HOME",
        ] {
            assert_eq!(
                value(name),
                Some(
                    environment
                        .iter()
                        .find(|(key, _)| key == name)
                        .unwrap()
                        .1
                        .as_os_str()
                )
            );
        }
    }

    #[test]
    fn bundled_only_paths_use_system_defaults() {
        let environment = vec![
            ("PATH".into(), "/tmp/app/usr/bin:".into()),
            ("LD_LIBRARY_PATH".into(), "/tmp/app/usr/lib:".into()),
            ("XDG_DATA_DIRS".into(), "/tmp/app/usr/share:".into()),
        ];
        let mut command = Command::new("xdg-open");
        host_environment(&mut command, Path::new("/tmp/app"), &environment);
        let vars: std::collections::HashMap<_, _> = command.get_envs().collect();
        assert_eq!(
            vars[std::ffi::OsStr::new("PATH")],
            Some(std::ffi::OsStr::new("/usr/local/bin:/usr/bin:/bin"))
        );
        assert_eq!(vars[std::ffi::OsStr::new("LD_LIBRARY_PATH")], None);
        assert_eq!(vars[std::ffi::OsStr::new("XDG_DATA_DIRS")], None);
    }

    #[test]
    fn bundled_library_collision_does_not_break_the_host_launcher() {
        let dir = tempfile::tempdir().unwrap();
        let app_dir = dir.path().join("Koxora.AppDir");
        let bundled_lib = app_dir.join("usr/lib");
        let host_lib = dir.path().join("host-lib");
        fs::create_dir_all(&bundled_lib).unwrap();
        fs::create_dir(&host_lib).unwrap();
        let source = dir.path().join("library.c");
        for (directory, code) in [
            (&bundled_lib, "int old_api(void) { return 0; }"),
            (&host_lib, "int host_api(void) { return 0; }"),
        ] {
            fs::write(&source, code).unwrap();
            assert!(Command::new("cc")
                .args(["-shared", "-fPIC"])
                .arg(&source)
                .arg("-o")
                .arg(directory.join("libkoxora_link_probe.so"))
                .status()
                .unwrap()
                .success());
        }
        fs::write(
            &source,
            "int host_api(void); int main(void) { return host_api(); }",
        )
        .unwrap();
        let launcher = dir.path().join("host-launcher");
        assert!(Command::new("cc")
            .arg(&source)
            .arg("-L")
            .arg(&host_lib)
            .arg("-lkoxora_link_probe")
            .arg("-o")
            .arg(&launcher)
            .status()
            .unwrap()
            .success());
        let environment = vec![(
            "LD_LIBRARY_PATH".into(),
            env::join_paths([bundled_lib, host_lib]).unwrap(),
        )];
        let mut inherited = Command::new(&launcher);
        inherited.envs(environment.iter().cloned());
        let failed = inherited.output().unwrap();
        assert!(!failed.status.success());
        assert!(String::from_utf8_lossy(&failed.stderr).contains("host_api"));

        let mut clean = Command::new(launcher);
        clean.envs(environment.iter().cloned());
        host_environment(&mut clean, &app_dir, &environment);
        launch([clean], Duration::from_secs(1)).unwrap();
    }

    #[test]
    fn retries_failed_launchers_and_reports_failure_if_none_accept() {
        let mut failed = Command::new("/bin/sh");
        failed.args(["-c", "exit 7"]);
        assert!(launch([failed], Duration::from_secs(1)).is_err());
        let mut failed = Command::new("/bin/sh");
        failed.args(["-c", "exit 7"]);
        let missing = Command::new("/nonexistent/koxora-test-opener");
        let mut success = Command::new("/bin/sh");
        success.args(["-c", "exit 0"]);
        launch([failed, missing, success], Duration::from_secs(1)).unwrap();
    }

    #[test]
    fn running_handler_is_handed_off_once_without_waiting_for_it_to_close() {
        let dir = tempfile::tempdir().unwrap();
        let output = dir.path().join("handoff");
        let mut slow = Command::new("/bin/sh");
        slow.args(["-c", "/bin/sleep 0.2; printf done > \"$1\"", "test"])
            .arg(&output);
        let mut duplicate = Command::new("/bin/sh");
        duplicate
            .args(["-c", "printf duplicate > \"$1\"", "test"])
            .arg(&output);
        launch([slow, duplicate], Duration::from_millis(20)).unwrap();
        let deadline = Instant::now() + Duration::from_secs(3);
        while fs::read_to_string(&output).ok().as_deref() != Some("done")
            && Instant::now() < deadline
        {
            thread::sleep(Duration::from_millis(10));
        }
        assert_eq!(fs::read_to_string(output).unwrap(), "done");
    }
}

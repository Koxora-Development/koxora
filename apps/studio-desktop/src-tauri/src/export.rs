//! Portable-file export is separate from internal project snapshots.
//! Only a path returned by the native dialog reaches this module.
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
const MAX_EXPORT: usize = 64 * 1024 * 1024;

fn storage<T>(result: std::io::Result<T>) -> Result<T, String> {
    result.map_err(|_| "storage".to_owned())
}

pub fn suggested_filename(title: &str) -> String {
    let name: String = title
        .chars()
        .take(100)
        .map(|c| {
            if c.is_control() || "<>:\"/\\|?*".contains(c) {
                '_'
            } else {
                c
            }
        })
        .collect();
    let name = name.trim().trim_matches('.');
    // A prefix also avoids Windows device names such as CON and NUL.
    format!(
        "koxora-{}.koxora",
        if name.is_empty() { "project" } else { name }
    )
}

fn destination(mut path: PathBuf) -> Result<PathBuf, String> {
    if !path.is_absolute() || path.file_name().is_none() {
        return Err("storage".into());
    }
    // Check the normalized destination, not the dialog's pre-normalized name.
    path.set_extension("koxora");
    Ok(path)
}

#[derive(PartialEq)]
struct Existing {
    bytes: Vec<u8>,
    modified: std::time::SystemTime,
}
fn snapshot(path: &Path) -> Result<Option<Existing>, String> {
    let metadata = match fs::symlink_metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(_) => return Err("storage".into()),
    };
    // Do not follow a symlink, overwrite a directory, or read an unbounded file.
    if !metadata.is_file() || metadata.len() > MAX_EXPORT as u64 {
        return Err("storage".into());
    }
    let mut bytes = Vec::new();
    storage(File::open(path))?
        .take(MAX_EXPORT as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| "storage")?;
    if bytes.len() > MAX_EXPORT {
        return Err("storage".into());
    }
    Ok(Some(Existing {
        bytes,
        modified: storage(metadata.modified())?,
    }))
}

pub fn save_as(
    bytes: &[u8],
    choose: impl FnOnce() -> Result<Option<PathBuf>, String>,
    confirm: impl FnOnce(&Path) -> bool,
) -> Result<Option<PathBuf>, String> {
    if bytes.len() > MAX_EXPORT {
        return Err("invalid".into());
    }
    let Some(chosen) = choose()? else {
        return Ok(None);
    };
    let path = destination(chosen)?;
    let original = snapshot(&path)?;
    if original.is_some() && !confirm(&path) {
        return Ok(None);
    }
    publish(&path, bytes, original)?;
    Ok(Some(path))
}

fn publish(path: &Path, bytes: &[u8], original: Option<Existing>) -> Result<(), String> {
    let parent = path.parent().ok_or("storage")?;
    // Random, exclusive, same-directory staging. Drop cleans up every failed write.
    let mut temporary = storage(tempfile::NamedTempFile::new_in(parent))?;
    storage(temporary.write_all(bytes))?;
    storage(temporary.as_file().sync_all())?;
    if snapshot(path)? != original {
        return Err("conflict".into());
    }
    if original.is_some() {
        // tempfile provides atomic replacement on Unix and Windows.
        temporary.persist(path).map_err(|_| "storage")?;
    } else {
        // A file created while the dialog was open must never be replaced.
        temporary.persist_noclobber(path).map_err(|error| {
            if error.error.kind() == std::io::ErrorKind::AlreadyExists {
                "conflict"
            } else {
                "storage"
            }
        })?;
    }
    #[cfg(unix)]
    storage(File::open(parent).and_then(|file| file.sync_all()))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn cancel_and_declined_overwrite_write_nothing() {
        let dir = tempfile::tempdir().unwrap();
        assert_eq!(save_as(b"data", || Ok(None), |_| panic!()), Ok(None));
        let path = dir.path().join("existing.koxora");
        fs::write(&path, b"original").unwrap();
        assert_eq!(
            save_as(b"new", || Ok(Some(path.clone())), |_| false),
            Ok(None)
        );
        assert_eq!(fs::read(&path).unwrap(), b"original");
        assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 1);
    }
    #[test]
    fn chosen_directory_extension_and_binary_round_trip() {
        let dir = tempfile::tempdir().unwrap();
        let bytes = include_bytes!("../../../../packages/project/fixtures/complete-v1.koxora");
        let chosen = dir.path().join("My project.other");
        let path = save_as(bytes, || Ok(Some(chosen)), |_| panic!())
            .unwrap()
            .unwrap();
        assert_eq!(path, dir.path().join("My project.koxora"));
        assert_eq!(fs::read(path).unwrap(), bytes);
        assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 1);
    }
    #[test]
    fn normalized_existing_name_requires_confirmation_and_replaces_atomically() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("project.koxora");
        fs::write(&path, b"original").unwrap();
        save_as(
            b"replacement",
            || Ok(Some(path.with_extension("txt"))),
            |actual| {
                assert_eq!(actual, path);
                assert_eq!(fs::read(actual).unwrap(), b"original");
                true
            },
        )
        .unwrap();
        assert_eq!(fs::read(&path).unwrap(), b"replacement");
        assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 1);
    }
    #[test]
    fn external_change_during_confirmation_is_not_lost() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("project.koxora");
        fs::write(&path, b"original").unwrap();
        let result = save_as(
            b"replacement",
            || Ok(Some(path.clone())),
            |actual| {
                fs::write(actual, b"external edit").unwrap();
                true
            },
        );
        assert_eq!(result, Err("conflict".into()));
        assert_eq!(fs::read(&path).unwrap(), b"external edit");
        assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 1);
    }
    #[test]
    fn new_file_race_never_overwrites_and_cleans_staging() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("project.koxora");
        fs::write(&path, b"other writer").unwrap();
        assert_eq!(publish(&path, b"replacement", None), Err("conflict".into()));
        assert_eq!(fs::read(&path).unwrap(), b"other writer");
        assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 1);
    }
    #[test]
    fn storage_failures_and_invalid_destinations_are_explicit() {
        let dir = tempfile::tempdir().unwrap();
        let missing = dir.path().join("missing/project.koxora");
        assert_eq!(
            save_as(b"data", || Ok(Some(missing.clone())), |_| true),
            Err("storage".into())
        );
        assert!(!missing.exists());
        let directory = dir.path().join("directory.koxora");
        fs::create_dir(&directory).unwrap();
        assert_eq!(
            save_as(b"data", || Ok(Some(directory.clone())), |_| true),
            Err("storage".into())
        );
        assert!(directory.is_dir());
        assert!(destination(PathBuf::from("relative.koxora")).is_err());
        assert_eq!(
            save_as(b"data", || Err("storage".into()), |_| true),
            Err("storage".into())
        );
    }
    #[cfg(unix)]
    #[test]
    fn symbolic_link_is_rejected_without_changing_its_target() {
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("target");
        let link = dir.path().join("link.koxora");
        fs::write(&target, b"untouched").unwrap();
        std::os::unix::fs::symlink(&target, &link).unwrap();
        assert_eq!(
            save_as(b"data", || Ok(Some(link)), |_| panic!()),
            Err("storage".into())
        );
        assert_eq!(fs::read(target).unwrap(), b"untouched");
    }
    #[test]
    fn title_is_only_a_safe_suggested_name() {
        assert_eq!(suggested_filename("Roadmap"), "koxora-Roadmap.koxora");
        assert_eq!(suggested_filename("../CON:\n"), "koxora-_CON__.koxora");
        assert_eq!(suggested_filename("..."), "koxora-project.koxora");
    }
}

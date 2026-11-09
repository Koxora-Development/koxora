//! Bootstrap configuration is independent of project data and WebView profiles.
use serde::{Deserialize, Serialize};
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::path::{Component, Path, PathBuf};

fn io<T>(value: std::io::Result<T>) -> Result<T, String> {
    value.map_err(|_| "storage".into())
}
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Config {
    version: u8,
    directory: PathBuf,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub directory: String,
    pub first_run: bool,
}
pub struct Location {
    config: PathBuf,
    default: PathBuf,
    _lock: File,
}
/// Every repository operation takes the same per-user lock, then rereads config.
impl Location {
    pub fn acquire(config: &Path, default: &Path) -> Result<Self, String> {
        io(fs::create_dir_all(config))?;
        safe_path(config)?;
        let lock_path = config.join("storage.lock");
        if lock_path.exists() && !io(fs::symlink_metadata(&lock_path))?.is_file() {
            return Err("storage".into());
        }
        let lock = io(OpenOptions::new()
            .create(true)
            .truncate(false)
            .write(true)
            .open(lock_path))?;
        lock.try_lock().map_err(|_| "conflict".to_owned())?;
        Ok(Self {
            config: config.join("storage-v1.json"),
            default: default.into(),
            _lock: lock,
        })
    }
    pub fn root(&self) -> Result<PathBuf, String> {
        let root = if self.config.exists() {
            safe_path(&self.config)?;
            let file = io(File::open(&self.config))?;
            if io(file.metadata())?.len() > 16384 {
                return Err("storage".into());
            }
            let config: Config = serde_json::from_reader(file).map_err(|_| "storage".to_owned())?;
            if config.version != 1 {
                return Err("storage".into());
            }
            // An unplugged configured drive must never produce a new empty repository.
            if !config.directory.is_dir() {
                return Err("storage".into());
            }
            config.directory
        } else {
            io(fs::create_dir_all(&self.default))?;
            self.default.clone()
        };
        safe_path(&root)?;
        Ok(root)
    }
    pub fn status(&self) -> Result<Status, String> {
        let root = self.root()?;
        Ok(Status {
            directory: root.to_string_lossy().into_owned(),
            first_run: !self.config.exists() && io(fs::read_dir(root))?.next().is_none(),
        })
    }
    fn commit(&self, root: &Path) -> Result<(), String> {
        let mut temp = io(tempfile::NamedTempFile::new_in(
            self.config.parent().ok_or("storage")?,
        ))?;
        let bytes = serde_json::to_vec(&Config {
            version: 1,
            directory: root.into(),
        })
        .map_err(|_| "storage")?;
        io(temp.write_all(&bytes))?;
        io(temp.as_file().sync_all())?;
        temp.persist(&self.config)
            .map_err(|_| "storage".to_owned())?;
        // Publication is the commit point; a post-commit durability failure must
        // not report an unchanged repository to the caller.
        let _ = sync_dir(self.config.parent().ok_or("storage")?);
        Ok(())
    }
    pub fn keep(&self) -> Result<(), String> {
        self.commit(&self.root()?)
    }
    /// The chosen parent receives a dedicated repository; existing data never gets merged.
    pub fn change(&self, parent: &Path, restore: bool) -> Result<(), String> {
        safe_path(parent)?;
        if !parent.is_dir() {
            return Err("storage".into());
        }
        let parent = io(fs::canonicalize(parent))?;
        let parent = parent.as_path();
        let target = parent.join("projects-v1");
        if restore {
            safe_path(&target)?;
            validate_tree(&target)?;
            if crate::storage::list(&target)?.is_empty() {
                return Err("invalid".into());
            }
            return self.commit(&target);
        }
        let source = io(fs::canonicalize(self.root()?))?;
        if target == source {
            return self.keep();
        }
        if target.starts_with(&source) || source.starts_with(&target) {
            return Err("invalid".into());
        }
        if target.exists() {
            return Err("conflict".into());
        }
        // Hold legacy writer locks during copying; close older builds before switching.
        let mut legacy_locks = Vec::new();
        for id in crate::storage::list(&source)? {
            let path = source.join(id).join("write.lock");
            if path.exists() {
                safe_path(&path)?;
            }
            let lock = io(OpenOptions::new()
                .create(true)
                .truncate(false)
                .write(true)
                .open(path))?;
            lock.try_lock().map_err(|_| "conflict".to_owned())?;
            legacy_locks.push(lock);
        }
        let reservation = parent.join(".koxora-migration.lock");
        if reservation.exists() {
            safe_path(&reservation)?;
        }
        let guard = io(OpenOptions::new()
            .create(true)
            .truncate(false)
            .write(true)
            .open(&reservation))?;
        guard.try_lock().map_err(|_| "conflict".to_owned())?;
        // Random staging stays on the destination volume; source remains authoritative
        // until one atomic config replacement. A killed copy cannot become active.
        let staging = io(tempfile::Builder::new()
            .prefix(".koxora-migration-")
            .tempdir_in(parent))?;
        copy_tree(&source, staging.path())?;
        verify_tree(&source, staging.path())?;
        sync_dir(staging.path())?;
        let result = (|| {
            if target.exists() {
                return Err("conflict".into());
            }
            io(fs::rename(staging.path(), &target))?;
            sync_dir(parent)?;
            self.commit(&target)
        })();
        drop(guard);
        // Keep the lock inode: unlinking permits split locks.
        result
    }
}
/// Reject symlinks, relative paths and parent traversal, including ancestors.
pub fn safe_path(path: &Path) -> Result<(), String> {
    if !path.is_absolute() {
        return Err("invalid".into());
    }
    let mut current = PathBuf::new();
    for part in path.components() {
        if matches!(part, Component::ParentDir | Component::CurDir) {
            return Err("invalid".into());
        }
        current.push(part);
        if matches!(part, Component::Prefix(_)) {
            continue;
        }
        if io(fs::symlink_metadata(&current))?.file_type().is_symlink() {
            return Err("invalid".into());
        }
    }
    Ok(())
}
fn validate_tree(path: &Path) -> Result<(), String> {
    validate_tree_at(path, 0)
}
fn validate_tree_at(path: &Path, depth: usize) -> Result<(), String> {
    if depth > 8 {
        return Err("invalid".into());
    }
    safe_path(path)?;
    if !path.is_dir() {
        return Err("invalid".into());
    }
    for entry in io(fs::read_dir(path))? {
        let entry = io(entry)?;
        let kind = io(entry.file_type())?;
        if kind.is_dir() {
            validate_tree_at(&entry.path(), depth + 1)?;
        } else if !kind.is_file() {
            return Err("invalid".into());
        }
    }
    Ok(())
}
fn coordination_file(path: &Path, root: &Path) -> bool {
    path.file_name().is_some_and(|name| name == "write.lock")
        && path.parent().is_some_and(|parent| {
            parent.parent() == Some(root)
                && parent
                    .file_name()
                    .and_then(|name| name.to_str())
                    .is_some_and(crate::storage::valid_id)
        })
}
fn copy_tree(from: &Path, to: &Path) -> Result<(), String> {
    validate_tree(from)?;
    copy_tree_at(from, to, from)
}
fn copy_tree_at(from: &Path, to: &Path, root: &Path) -> Result<(), String> {
    for entry in io(fs::read_dir(from))? {
        let entry = io(entry)?;
        let target = to.join(entry.file_name());
        if io(entry.file_type())?.is_dir() {
            io(fs::create_dir(&target))?;
            copy_tree_at(&entry.path(), &target, root)?;
            sync_dir(&target)?;
        } else if !coordination_file(&entry.path(), root) {
            io(fs::copy(entry.path(), &target))?;
            io(OpenOptions::new()
                .write(true)
                .open(target)
                .and_then(|f| f.sync_all()))?;
        }
    }
    Ok(())
}
fn verify_tree(from: &Path, to: &Path) -> Result<(), String> {
    verify_tree_at(from, to, from)
}
fn verify_tree_at(from: &Path, to: &Path, root: &Path) -> Result<(), String> {
    for entry in io(fs::read_dir(from))? {
        let entry = io(entry)?;
        let target = to.join(entry.file_name());
        if io(entry.file_type())?.is_dir() {
            verify_tree_at(&entry.path(), &target, root)?;
        } else if !coordination_file(&entry.path(), root) {
            let mut a = io(File::open(entry.path()))?;
            let mut b = io(File::open(target))?;
            let mut left = [0; 65536];
            let mut right = [0; 65536];
            loop {
                let n = io(a.read(&mut left))?;
                let m = io(b.read(&mut right))?;
                if n != m || left[..n] != right[..m] {
                    return Err("integrity".into());
                }
                if n == 0 {
                    break;
                }
            }
        }
    }
    Ok(())
}
fn sync_dir(path: &Path) -> Result<(), String> {
    #[cfg(unix)]
    {
        io(File::open(path).and_then(|f| f.sync_all()))?;
    }
    let _ = path;
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    fn setup() -> (tempfile::TempDir, PathBuf, PathBuf) {
        let temp = tempfile::tempdir_in(fs::canonicalize(std::env::temp_dir()).unwrap()).unwrap();
        let config = temp.path().join("config");
        let default = temp.path().join("old");
        (temp, config, default)
    }
    #[test]
    fn migration_preserves_all_bytes_and_recovery_and_restart() {
        let (temp, config, default) = setup();
        let dest = temp.path().join("Unicode 世界");
        fs::create_dir(&dest).unwrap();
        {
            let location = Location::acquire(&config, &default).unwrap();
            assert!(location.status().unwrap().first_run);
            crate::storage::write(
                &location.root().unwrap(),
                "00000000-0000-4000-8000-000000000001",
                None,
                "one",
            )
            .unwrap();
            crate::storage::write(
                &default,
                "00000000-0000-4000-8000-000000000001",
                Some("one"),
                "two",
            )
            .unwrap();
            assert!(!location.status().unwrap().first_run);
            location.change(&dest, false).unwrap();
            verify_tree(&default, &dest.join("projects-v1")).unwrap();
        }
        let location = Location::acquire(&config, &default).unwrap();
        assert_eq!(location.root().unwrap(), dest.join("projects-v1"));
        assert!(!location.status().unwrap().first_run);
        assert_eq!(
            crate::storage::read_previous(
                &location.root().unwrap(),
                "00000000-0000-4000-8000-000000000001"
            )
            .unwrap()
            .as_deref(),
            Some("one")
        );
    }
    #[test]
    fn collision_and_missing_media_never_switch_or_recreate() {
        let (temp, config, default) = setup();
        let location = Location::acquire(&config, &default).unwrap();
        location.keep().unwrap();
        let dest = temp.path().join("disk");
        fs::create_dir_all(dest.join("projects-v1")).unwrap();
        assert!(location.change(&dest, false).is_err());
        assert_eq!(location.root().unwrap(), default);
        fs::remove_dir(&default).unwrap();
        assert!(location.root().is_err());
        assert!(!default.exists());
    }
    #[test]
    fn lock_and_nested_destinations_fail_without_changes() {
        let (_, config, default) = setup();
        let location = Location::acquire(&config, &default).unwrap();
        location.keep().unwrap();
        assert!(Location::acquire(&config, &default).is_err());
        let nested = default.join("nested");
        fs::create_dir(&nested).unwrap();
        assert!(location.change(&nested, false).is_err());
    }
    #[cfg(unix)]
    #[test]
    fn symlink_in_data_is_rejected_before_commit() {
        let (temp, config, default) = setup();
        let location = Location::acquire(&config, &default).unwrap();
        location.keep().unwrap();
        std::os::unix::fs::symlink(temp.path(), default.join("escape")).unwrap();
        let dest = temp.path().join("dest");
        fs::create_dir(&dest).unwrap();
        assert!(location.change(&dest, false).is_err());
        assert_eq!(location.root().unwrap(), default);
        assert!(!dest.join("projects-v1").exists());
    }
    #[test]
    fn published_copy_without_config_commit_can_be_restored() {
        let (temp, config, default) = setup();
        let location = Location::acquire(&config, &default).unwrap();
        location.keep().unwrap();
        let id = "00000000-0000-4000-8000-000000000001";
        crate::storage::write(&default, id, None, "recoverable").unwrap();
        let parent = temp.path().join("disk");
        let target = parent.join("projects-v1");
        fs::create_dir_all(&target).unwrap();
        copy_tree(&default, &target).unwrap();
        // Simulates termination after destination publication, before config commit.
        fs::write(parent.join(".koxora-migration.lock"), "").unwrap();
        assert_eq!(location.root().unwrap(), default);
        fs::remove_dir_all(&default).unwrap();
        location.change(&parent, true).unwrap();
        assert_eq!(
            crate::storage::read(&location.root().unwrap(), id)
                .unwrap()
                .as_deref(),
            Some("recoverable")
        );
    }
    #[test]
    fn completed_or_abandoned_lock_file_does_not_block_new_migration() {
        let (temp, config, default) = setup();
        let location = Location::acquire(&config, &default).unwrap();
        location.keep().unwrap();
        let parent = temp.path().join("disk");
        fs::create_dir(&parent).unwrap();
        fs::write(parent.join(".koxora-migration.lock"), "").unwrap();
        location.change(&parent, false).unwrap();
    }
    #[test]
    fn coordination_locks_are_recreated_and_unknown_nested_lock_data_is_preserved() {
        let (temp, config, default) = setup();
        let location = Location::acquire(&config, &default).unwrap();
        location.keep().unwrap();
        let id = "00000000-0000-4000-8000-000000000001";
        crate::storage::write(&default, id, None, "one").unwrap();
        fs::create_dir(default.join(id).join("recovery")).unwrap();
        fs::write(
            default.join(id).join("recovery/write.lock"),
            "opaque recovery bytes",
        )
        .unwrap();
        let parent = temp.path().join("dest");
        fs::create_dir(&parent).unwrap();
        location.change(&parent, false).unwrap();
        let target = location.root().unwrap();
        assert!(!target.join(id).join("write.lock").exists());
        assert_eq!(
            fs::read(target.join(id).join("recovery/write.lock")).unwrap(),
            b"opaque recovery bytes"
        );
        crate::storage::write(&target, id, Some("one"), "two").unwrap();
        assert!(target.join(id).join("write.lock").is_file());
        assert_eq!(
            crate::storage::read_previous(&target, id)
                .unwrap()
                .as_deref(),
            Some("one")
        );
    }
}

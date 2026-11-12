//! Immutable generations make an interrupted write invisible until its rename commits.
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
const MAX_RECORD: u64 = 256 * 1024 * 1024;
fn storage<T>(result: std::io::Result<T>) -> Result<T, String> {
    result.map_err(|_| "storage".to_owned())
}
pub(crate) fn valid_id(id: &str) -> bool {
    id.len() == 36
        && id.bytes().enumerate().all(|(i, c)| {
            if [8, 13, 18, 23].contains(&i) {
                c == b'-'
            } else {
                c.is_ascii_hexdigit() && !c.is_ascii_uppercase()
            }
        })
}
fn directory(root: &Path, id: &str) -> Result<PathBuf, String> {
    if !valid_id(id) {
        return Err("invalid".into());
    }
    Ok(root.join(id))
}
fn generations(dir: &Path) -> Result<Vec<PathBuf>, String> {
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut paths = vec![];
    for entry in storage(fs::read_dir(dir))? {
        let path = storage(entry)?.path();
        if path.extension().and_then(|s| s.to_str()) == Some("snapshot") {
            paths.push(path);
        }
    }
    paths.sort();
    Ok(paths)
}
pub fn list(root: &Path) -> Result<Vec<String>, String> {
    if !root.exists() {
        return Ok(vec![]);
    }
    let mut ids = vec![];
    for entry in storage(fs::read_dir(root))? {
        let entry = storage(entry)?;
        if let Some(id) = entry.file_name().to_str() {
            // Keep a damaged project visible for recovery without hiding healthy peers.
            if valid_id(id)
                && generations(&entry.path())
                    .map(|paths| !paths.is_empty())
                    .unwrap_or(true)
            {
                ids.push(id.to_owned());
            }
        }
    }
    ids.sort();
    Ok(ids)
}
pub fn read(root: &Path, id: &str) -> Result<Option<String>, String> {
    read_generation(root, id, false)
}
pub fn read_previous(root: &Path, id: &str) -> Result<Option<String>, String> {
    read_generation(root, id, true)
}
fn read_generation(root: &Path, id: &str, previous: bool) -> Result<Option<String>, String> {
    let paths = generations(&directory(root, id)?)?;
    match paths.iter().rev().nth(usize::from(previous)) {
        None => Ok(None),
        Some(path) => {
            let file = storage(File::open(path))?;
            if storage(file.metadata())?.len() > MAX_RECORD {
                return Err("storage".into());
            }
            let mut text = String::new();
            storage(file.take(MAX_RECORD + 1).read_to_string(&mut text))?;
            if text.len() as u64 > MAX_RECORD {
                return Err("storage".into());
            }
            Ok(Some(text))
        }
    }
}
pub fn write(root: &Path, id: &str, expected: Option<&str>, value: &str) -> Result<(), String> {
    if value.len() as u64 > MAX_RECORD {
        return Err("storage".into());
    }
    let dir = directory(root, id)?;
    storage(fs::create_dir_all(&dir))?;
    let lock = storage(
        OpenOptions::new()
            .create(true)
            .truncate(false)
            .write(true)
            .open(dir.join("write.lock")),
    )?;
    storage(lock.lock())?; // OS lock is released on process death, including interrupted writes.
    if read(root, id)?.as_deref() != expected {
        return Err("conflict".into());
    }
    let paths = generations(&dir)?;
    let sequence = match paths.last() {
        Some(path) => path
            .file_stem()
            .and_then(|s| s.to_str())
            .and_then(|s| s.parse::<u64>().ok())
            .and_then(|n| n.checked_add(1))
            .ok_or("storage")?,
        None => 1,
    };
    let temp = dir.join("pending.tmp");
    let mut file = storage(File::create(&temp))?;
    storage(file.write_all(value.as_bytes()))?;
    storage(file.sync_all())?;
    drop(file);
    storage(fs::rename(
        &temp,
        dir.join(format!("{sequence:020}.snapshot")),
    ))?;
    // Directory synchronization is supported on Unix; a power-loss durability guarantee
    // for Windows/filesystem controllers requires native acceptance testing.
    #[cfg(unix)]
    storage(File::open(&dir).and_then(|file| file.sync_all()))?;
    for path in paths.iter().rev().skip(1) {
        let _ = fs::remove_file(path);
    }
    Ok(())
}
/// Keep the stable writer-lock inode so concurrent stale writers cannot split locks.
/// Recovery generations and pending bytes are removed before the trashed head; unlinking
/// that head is the commit point. A crash before it leaves a trashed head for retry.
pub fn remove(root: &Path, id: &str, expected: &str) -> Result<(), String> {
    let dir = directory(root, id)?;
    if !matches!(id.as_bytes()[14], b'1'..=b'8')
        || !matches!(id.as_bytes()[19], b'8' | b'9' | b'a' | b'b')
    {
        return Err("invalid".into());
    }
    crate::location::safe_path(&dir)?;
    if !storage(fs::symlink_metadata(&dir))?.is_dir() {
        return Err("invalid".into());
    }
    purge_files(&dir)?;
    let mut options = OpenOptions::new();
    options.create(true).truncate(false).write(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK);
    }
    let lock = storage(options.open(dir.join("write.lock")))?;
    if !storage(lock.metadata())?.is_file() {
        return Err("invalid".into());
    }
    storage(lock.lock())?;
    let files = purge_files(&dir)?;
    if read(root, id)?.as_deref() != Some(expected) {
        return Err("conflict".into());
    }
    let data: serde_json::Value = serde_json::from_str(expected).map_err(|_| "invalid")?;
    let data = data.as_object().ok_or("invalid")?;
    if !data.get("current").is_some_and(|value| value.is_string())
        || !data
            .get("previous")
            .is_some_and(|value| value.is_null() || value.is_string())
        || data
            .get("recoverySource")
            .is_some_and(|value| !value.is_string())
    {
        return Err("invalid".into());
    }
    if data.get("deleted").and_then(|value| value.as_bool()) != Some(true) {
        return Err("conflict".into());
    }
    let head = generations(&dir)?.pop().ok_or("conflict")?;
    for path in files.iter().filter(|path| **path != head) {
        storage(fs::remove_file(path))?;
    }
    // Make removal of older generations durable before removing the head. If
    // this fails, the matching head stays trashed and can be purged again.
    #[cfg(unix)]
    storage(File::open(&dir).and_then(|file| file.sync_all()))?;
    storage(fs::remove_file(&head))?;
    // Publication already committed. Do not falsely report a retained project
    // if the final directory synchronization fails after successful deletion.
    #[cfg(unix)]
    let _ = File::open(&dir).and_then(|file| file.sync_all());
    Ok(())
}

/// Never recurse or remove an unknown leaf from a user-controlled repository.
fn purge_files(dir: &Path) -> Result<Vec<PathBuf>, String> {
    let mut files = Vec::new();
    for (index, entry) in storage(fs::read_dir(dir))?.enumerate() {
        if index >= 4096 {
            return Err("storage".into());
        }
        let entry = storage(entry)?;
        if !storage(entry.file_type())?.is_file() {
            return Err("invalid".into());
        }
        let name = entry.file_name();
        let name = name.to_str().ok_or("invalid")?;
        if name == "write.lock" {
            continue;
        }
        let snapshot = name.strip_suffix(".snapshot").is_some_and(|sequence| {
            sequence.len() == 20 && sequence.bytes().all(|value| value.is_ascii_digit())
        });
        if name != "pending.tmp" && !snapshot {
            return Err("invalid".into());
        }
        files.push(entry.path());
    }
    Ok(files)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Barrier,
    };
    const ID: &str = "00000000-0000-4000-8000-000000000001";
    static NEXT_TEST: AtomicU64 = AtomicU64::new(0);
    struct TestDirectory(PathBuf);
    impl TestDirectory {
        fn new() -> Self {
            let stamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos();
            let root = std::env::temp_dir().join(format!(
                "koxora-test-{}-{stamp}-{}",
                std::process::id(),
                NEXT_TEST.fetch_add(1, Ordering::Relaxed)
            ));
            fs::create_dir(&root).unwrap();
            Self(root)
        }
    }
    impl Drop for TestDirectory {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }
    #[test]
    fn atomic_snapshots_conflicts_and_interrupted_writes() {
        let directory = TestDirectory::new();
        let root = &directory.0;
        assert!(read(root, "../escape").is_err());
        write(root, ID, None, "first").unwrap();
        fs::write(root.join(ID).join("pending.tmp"), "interrupted").unwrap();
        assert_eq!(read(root, ID).unwrap().as_deref(), Some("first"));
        assert_eq!(write(root, ID, None, "lost"), Err("conflict".into()));
        write(root, ID, Some("first"), "second").unwrap();
        assert_eq!(read(root, ID).unwrap().as_deref(), Some("second"));
        assert_eq!(list(root).unwrap(), vec![ID]);
    }
    #[test]
    fn malformed_head_retains_an_explicit_generation_backup() {
        let directory = TestDirectory::new();
        let root = &directory.0;
        write(root, ID, None, "{\"current\":\"first\",\"previous\":null}").unwrap();
        let original = read(root, ID).unwrap().unwrap();
        write(root, ID, Some(&original), "{broken").unwrap();
        assert_eq!(read(root, ID).unwrap().as_deref(), Some("{broken"));
        assert_eq!(
            read_previous(root, ID).unwrap().as_deref(),
            Some(original.as_str())
        );
    }
    #[test]
    fn concurrent_compare_and_swap_has_exactly_one_winner() {
        let directory = TestDirectory::new();
        let root = &directory.0;
        write(root, ID, None, "original").unwrap();
        let barrier = Arc::new(Barrier::new(2));
        let threads: Vec<_> = ["left", "right"]
            .into_iter()
            .map(|text| {
                let root = root.clone();
                let barrier = barrier.clone();
                std::thread::spawn(move || {
                    barrier.wait();
                    write(&root, ID, Some("original"), text)
                })
            })
            .collect();
        let results: Vec<_> = threads
            .into_iter()
            .map(|thread| thread.join().unwrap())
            .collect();
        assert_eq!(results.iter().filter(|result| result.is_ok()).count(), 1);
        assert_eq!(
            results
                .iter()
                .filter(|result| **result == Err("conflict".into()))
                .count(),
            1
        );
        assert_eq!(
            read_previous(root, ID).unwrap().as_deref(),
            Some("original")
        );
    }
    #[test]
    fn failed_write_keeps_the_previous_committed_snapshot() {
        let directory = TestDirectory::new();
        let root = &directory.0;
        write(root, ID, None, "original").unwrap();
        fs::create_dir(root.join(ID).join("pending.tmp")).unwrap();
        assert_eq!(
            write(root, ID, Some("original"), "lost"),
            Err("storage".into())
        );
        assert_eq!(read(root, ID).unwrap().as_deref(), Some("original"));
    }
    #[test]
    fn damaged_project_directory_does_not_hide_healthy_projects() {
        let directory = TestDirectory::new();
        let root = &directory.0;
        const DAMAGED: &str = "00000000-0000-4000-8000-000000000002";
        write(root, ID, None, "healthy").unwrap();
        fs::write(root.join(DAMAGED), "not a directory").unwrap();
        assert_eq!(list(root).unwrap(), vec![ID, DAMAGED]);
        assert!(read(root, DAMAGED).is_err());
        assert_eq!(read(root, ID).unwrap().as_deref(), Some("healthy"));
    }
    const TRASHED: &str = "{\"current\":\"current data\",\"previous\":\"previous data\",\"recoverySource\":\"damaged source\",\"deleted\":true}";
    const ACTIVE: &str = "{\"current\":\"current data\",\"previous\":null,\"deleted\":false}";
    #[test]
    fn purge_removes_all_snapshot_and_pending_payloads_but_preserves_unrelated_data_and_lock() {
        let directory = TestDirectory::new();
        let root = fs::canonicalize(&directory.0).unwrap();
        const OTHER: &str = "00000000-0000-4000-8000-000000000002";
        write(&root, ID, None, ACTIVE).unwrap();
        write(&root, ID, Some(ACTIVE), TRASHED).unwrap();
        write(&root, OTHER, None, "keep").unwrap();
        fs::write(root.join(ID).join("pending.tmp"), "pending archive").unwrap();
        #[cfg(unix)]
        let inode = {
            use std::os::unix::fs::MetadataExt;
            fs::metadata(root.join(ID).join("write.lock"))
                .unwrap()
                .ino()
        };
        remove(&root, ID, TRASHED).unwrap();
        assert_eq!(read(&root, ID).unwrap(), None);
        assert_eq!(read_previous(&root, ID).unwrap(), None);
        assert_eq!(list(&root).unwrap(), vec![OTHER]);
        assert_eq!(read(&root, OTHER).unwrap().as_deref(), Some("keep"));
        let remaining: Vec<_> = fs::read_dir(root.join(ID))
            .unwrap()
            .map(|entry| entry.unwrap().file_name())
            .collect();
        assert_eq!(remaining, vec![std::ffi::OsString::from("write.lock")]);
        assert_eq!(
            write(&root, ID, Some(TRASHED), ACTIVE),
            Err("conflict".into())
        );
        write(&root, ID, None, ACTIVE).unwrap();
        assert_eq!(read(&root, ID).unwrap().as_deref(), Some(ACTIVE));
        #[cfg(unix)]
        {
            use std::os::unix::fs::MetadataExt;
            assert_eq!(
                fs::metadata(root.join(ID).join("write.lock"))
                    .unwrap()
                    .ino(),
                inode
            );
        }
    }
    #[test]
    fn purge_conflicts_with_restore_and_never_removes_an_active_or_unrecognized_record() {
        let directory = TestDirectory::new();
        let root = fs::canonicalize(&directory.0).unwrap();
        write(&root, ID, None, ACTIVE).unwrap();
        assert_eq!(remove(&root, ID, ACTIVE), Err("conflict".into()));
        write(&root, ID, Some(ACTIVE), TRASHED).unwrap();
        write(&root, ID, Some(TRASHED), ACTIVE).unwrap();
        assert_eq!(remove(&root, ID, TRASHED), Err("conflict".into()));
        assert_eq!(read(&root, ID).unwrap().as_deref(), Some(ACTIVE));
        assert!(remove(&root, "../outside", TRASHED).is_err());
        assert!(remove(&root, "00000000-0000-0000-0000-000000000000", TRASHED).is_err());
        write(&root, ID, Some(ACTIVE), "{broken").unwrap();
        assert_eq!(remove(&root, ID, "{broken"), Err("invalid".into()));
        assert_eq!(read(&root, ID).unwrap().as_deref(), Some("{broken"));
    }
    #[test]
    fn purge_preflights_unknown_leaves_and_can_retry_after_interrupted_backup_cleanup() {
        let directory = TestDirectory::new();
        let root = fs::canonicalize(&directory.0).unwrap();
        write(&root, ID, None, ACTIVE).unwrap();
        write(&root, ID, Some(ACTIVE), TRASHED).unwrap();
        let unrelated = root.join(ID).join("do-not-delete.txt");
        fs::write(&unrelated, "sentinel").unwrap();
        assert_eq!(remove(&root, ID, TRASHED), Err("invalid".into()));
        assert_eq!(fs::read_to_string(&unrelated).unwrap(), "sentinel");
        assert_eq!(read_previous(&root, ID).unwrap().as_deref(), Some(ACTIVE));
        fs::remove_file(unrelated).unwrap();
        // An interrupted attempt may have removed an older native generation;
        // the intact trashed head keeps its exact token and embedded recovery.
        fs::remove_file(generations(&root.join(ID)).unwrap().first().unwrap()).unwrap();
        assert_eq!(read(&root, ID).unwrap().as_deref(), Some(TRASHED));
        remove(&root, ID, TRASHED).unwrap();
        assert_eq!(read(&root, ID).unwrap(), None);
    }
    #[test]
    fn purge_and_restore_share_one_lock_and_have_exactly_one_winner() {
        let directory = TestDirectory::new();
        let root = fs::canonicalize(&directory.0).unwrap();
        write(&root, ID, None, TRASHED).unwrap();
        let barrier = Arc::new(Barrier::new(2));
        let deleting = {
            let root = root.clone();
            let barrier = barrier.clone();
            std::thread::spawn(move || {
                barrier.wait();
                remove(&root, ID, TRASHED)
            })
        };
        let restoring = {
            let root = root.clone();
            let barrier = barrier.clone();
            std::thread::spawn(move || {
                barrier.wait();
                write(&root, ID, Some(TRASHED), ACTIVE)
            })
        };
        let results = [deleting.join().unwrap(), restoring.join().unwrap()];
        assert_eq!(results.iter().filter(|result| result.is_ok()).count(), 1);
        assert_eq!(
            results
                .iter()
                .filter(|result| **result == Err("conflict".into()))
                .count(),
            1
        );
        let current = read(&root, ID).unwrap();
        assert!(current.is_none() || current.as_deref() == Some(ACTIVE));
    }
    #[cfg(unix)]
    #[test]
    fn purge_rejects_symlinked_projects_snapshots_and_nested_files_without_following_them() {
        let directory = TestDirectory::new();
        let root = fs::canonicalize(&directory.0).unwrap();
        write(&root, ID, None, TRASHED).unwrap();
        let sentinel = root.join("sentinel");
        fs::write(&sentinel, "keep").unwrap();
        let pending = root.join(ID).join("pending.tmp");
        std::os::unix::fs::symlink(&sentinel, &pending).unwrap();
        assert_eq!(remove(&root, ID, TRASHED), Err("invalid".into()));
        assert_eq!(fs::read_to_string(&sentinel).unwrap(), "keep");
        fs::remove_file(pending).unwrap();
        let directory_link = root.join("00000000-0000-4000-8000-000000000002");
        std::os::unix::fs::symlink(root.join(ID), &directory_link).unwrap();
        assert_eq!(
            remove(&root, "00000000-0000-4000-8000-000000000002", TRASHED),
            Err("invalid".into())
        );
        let nested = root.join(ID).join("nested");
        fs::create_dir(&nested).unwrap();
        fs::write(nested.join("sentinel"), "keep").unwrap();
        assert_eq!(remove(&root, ID, TRASHED), Err("invalid".into()));
        assert_eq!(read(&root, ID).unwrap().as_deref(), Some(TRASHED));
    }
}

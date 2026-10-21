//! Immutable generations make an interrupted write invisible until its rename commits.
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
const MAX_RECORD: u64 = 40 * 1024 * 1024;
fn storage<T>(result: std::io::Result<T>) -> Result<T, String> {
    result.map_err(|_| "storage".to_owned())
}
fn valid_id(id: &str) -> bool {
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
pub fn export(directory: &Path, id: &str, text: &str) -> Result<String, String> {
    if !valid_id(id) || text.len() > 8 * 1024 * 1024 {
        return Err("invalid".into());
    }
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| "storage")?
        .as_nanos();
    let path = directory.join(format!("koxora-{id}-{stamp}.koxora"));
    publish_export(&path, text)?;
    Ok(path.to_string_lossy().into_owned())
}
fn publish_export(path: &Path, text: &str) -> Result<(), String> {
    let temp = path.with_extension("koxora.tmp");
    let mut file = storage(OpenOptions::new().write(true).create_new(true).open(&temp))?;
    if file
        .write_all(text.as_bytes())
        .and_then(|()| file.sync_all())
        .is_err()
    {
        drop(file);
        let _ = fs::remove_file(&temp);
        return Err("storage".into());
    }
    drop(file);
    // Creating a hard link publishes only complete bytes and never replaces an
    // existing export. Filesystems without hard-link support fail explicitly;
    // they are not given a non-atomic overwrite fallback.
    let result = storage(fs::hard_link(&temp, path));
    let _ = fs::remove_file(&temp);
    result?;
    #[cfg(unix)]
    storage(File::open(path.parent().ok_or("storage")?).and_then(|file| file.sync_all()))?;
    Ok(())
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
        let path = export(root, ID, "portable").unwrap();
        assert_eq!(fs::read_to_string(path).unwrap(), "portable");
        assert!(export(&root.join("missing"), ID, "data").is_err());
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
    fn export_publication_is_complete_and_never_overwrites_existing_files() {
        let directory = TestDirectory::new();
        let path = directory.0.join("existing.koxora");
        publish_export(&path, "original").unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "original");
        assert_eq!(publish_export(&path, "replacement"), Err("storage".into()));
        assert_eq!(fs::read_to_string(&path).unwrap(), "original");
        assert!(!path.with_extension("koxora.tmp").exists());
        let interrupted = directory.0.join("interrupted.koxora");
        fs::write(interrupted.with_extension("koxora.tmp"), "partial").unwrap();
        assert!(!interrupted.exists());
        assert!(publish_export(&interrupted, "replacement").is_err());
        assert!(!interrupted.exists());
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
}

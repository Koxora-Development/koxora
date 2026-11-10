//! OS paths remain native. The webview can consume queued requests but cannot read arbitrary paths.
use std::collections::VecDeque;
use std::ffi::OsString;
use std::fs::{self, File};
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
const MAX_FILE: u64 = 64 * 1024 * 1024;
const MAX_QUEUE: usize = 32;
#[derive(Default)]
pub struct Requests(Mutex<Queue>);
#[derive(Default)]
struct Queue {
    next_id: u64,
    paths: VecDeque<(u64, PathBuf, bool)>,
    overflow: bool,
}
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Request {
    id: u64,
    name: String,
    bytes: Vec<u8>,
    error: Option<String>,
    copy: bool,
}
impl Requests {
    pub fn enqueue(&self, paths: impl IntoIterator<Item = PathBuf>) {
        self.enqueue_copy(paths, false);
    }
    pub fn enqueue_copy(&self, paths: impl IntoIterator<Item = PathBuf>, copy: bool) {
        let Ok(mut queue) = self.0.lock() else {
            return;
        };
        for path in paths {
            if queue.paths.len() >= MAX_QUEUE {
                queue.overflow = true;
                break;
            }
            queue.next_id += 1;
            let id = queue.next_id;
            queue.paths.push_back((id, path, copy));
        }
    }
    pub fn arguments(&self, args: impl IntoIterator<Item = OsString>, cwd: &Path) {
        self.enqueue(args.into_iter().filter_map(|arg| {
            let path = PathBuf::from(arg);
            if !path
                .extension()
                .is_some_and(|ext| ext.eq_ignore_ascii_case("koxora"))
            {
                return None;
            }
            Some(if path.is_absolute() {
                path
            } else {
                cwd.join(path)
            })
        }));
    }
    pub fn next(&self) -> Result<Option<Request>, String> {
        let mut queue = self.0.lock().map_err(|_| "storage")?;
        if queue.paths.is_empty() && queue.overflow {
            queue.next_id += 1;
            let id = queue.next_id;
            queue.paths.push_back((id, PathBuf::new(), false));
            queue.overflow = false;
        }
        let request = queue.paths.front().cloned();
        drop(queue);
        let Some((id, path, copy)) = request else {
            return Ok(None);
        };
        let result = read_file(&path);
        let (bytes, error) = match result {
            Ok(bytes) => (bytes, None),
            Err(error) => (Vec::new(), Some(error)),
        };
        Ok(Some(Request {
            id,
            name: path
                .file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .unwrap_or_default(),
            bytes,
            error,
            copy,
        }))
    }
    pub fn ack(&self, id: u64) -> Result<(), String> {
        let mut queue = self.0.lock().map_err(|_| "storage")?;
        if queue.paths.front().is_some_and(|(head, _, _)| *head == id) {
            queue.paths.pop_front();
            Ok(())
        } else {
            Err("conflict".into())
        }
    }
}
fn read_file(path: &Path) -> Result<Vec<u8>, String> {
    if path.as_os_str().is_empty() {
        return Err("tooMany".into());
    }
    if !path.is_absolute()
        || !path
            .extension()
            .is_some_and(|e| e.eq_ignore_ascii_case("koxora"))
    {
        return Err("invalid".into());
    }
    // Shell symlinks are deliberately rejected. Users can open the regular target.
    let metadata = fs::symlink_metadata(path).map_err(|_| "storage")?;
    if !metadata.is_file() {
        return Err("invalid".into());
    }
    if metadata.len() > MAX_FILE {
        return Err("tooLarge".into());
    }
    let mut bytes = Vec::new();
    File::open(path)
        .map_err(|_| "storage")?
        .take(MAX_FILE + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| "storage")?;
    if bytes.len() as u64 > MAX_FILE {
        return Err("tooLarge".into());
    }
    Ok(bytes)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn queue_preserves_order_until_explicit_ack_and_does_not_execute_arguments() {
        let temp = tempfile::tempdir().unwrap();
        let file = temp.path().join("Plan 世界 ; $(no).koxora");
        fs::write(&file, b"archive").unwrap();
        let requests = Requests::default();
        requests.arguments(
            [OsString::from("--flag"), file.file_name().unwrap().into()],
            temp.path(),
        );
        let first = requests.next().unwrap().unwrap();
        assert_eq!(first.bytes, b"archive");
        assert!(first.error.is_none());
        assert!(!first.copy);
        assert_eq!(requests.next().unwrap().unwrap().id, first.id);
        assert!(requests.ack(first.id + 1).is_err());
        requests.ack(first.id).unwrap();
        assert!(requests.next().unwrap().is_none());
    }
    #[test]
    fn bad_files_and_bounded_queue_are_actionable() {
        let temp = tempfile::tempdir().unwrap();
        let requests = Requests::default();
        requests.enqueue((0..40).map(|i| temp.path().join(format!("{i}.koxora"))));
        for _ in 0..MAX_QUEUE {
            let next = requests.next().unwrap().unwrap();
            assert_eq!(next.error.as_deref(), Some("storage"));
            requests.ack(next.id).unwrap();
        }
        let overflow = requests.next().unwrap().unwrap();
        assert_eq!(overflow.error.as_deref(), Some("tooMany"));
        requests.ack(overflow.id).unwrap();
        assert!(requests.next().unwrap().is_none());
        let huge = temp.path().join("huge.koxora");
        File::create(&huge).unwrap().set_len(MAX_FILE + 1).unwrap();
        assert_eq!(read_file(&huge), Err("tooLarge".into()));
    }
    #[cfg(unix)]
    #[test]
    fn rejects_shell_symlinks_and_non_files() {
        let temp = tempfile::tempdir().unwrap();
        let link = temp.path().join("link.koxora");
        std::os::unix::fs::symlink(temp.path(), &link).unwrap();
        assert_eq!(read_file(&link), Err("invalid".into()));
        assert!(read_file(Path::new("relative.koxora")).is_err());
    }
}

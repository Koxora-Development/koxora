#[cfg(target_os = "linux")]
#[path = "link_launcher.rs"]
pub(crate) mod linux;

pub fn open_external_url(value: &str) -> Result<(), String> {
    let safe = safe_external_url(value)?;
    #[cfg(target_os = "linux")]
    let result = linux::open(&safe);
    #[cfg(not(target_os = "linux"))]
    let result = open::that_detached(safe);
    result.map_err(|_| "openUrl".to_owned())
}

/// Only the native, configured repository supplies this path; no general path IPC exists.
pub fn open_folder(path: &std::path::Path) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    let result = linux::open(path.to_str().ok_or("storage")?);
    #[cfg(not(target_os = "linux"))]
    let result = open::that_detached(path);
    result.map_err(|_| "storage".to_owned())
}

/// Match Studio's URL allowlist at the IPC boundary before invoking the OS.
pub fn safe_external_url(value: &str) -> Result<String, String> {
    if value.is_empty()
        || value.len() > 2048
        || value
            .chars()
            .any(|c| c <= ' ' || c == '\u{7f}' || c == '\\')
        || value.to_ascii_lowercase().contains("%0a")
        || value.to_ascii_lowercase().contains("%0d")
    {
        return Err("invalidUrl".into());
    }
    let url = url::Url::parse(value).map_err(|_| "invalidUrl".to_owned())?;
    if !url.username().is_empty() || url.password().is_some() || url.as_str().len() > 2048 {
        return Err("invalidUrl".into());
    }
    match url.scheme() {
        "http" | "https"
            if value
                .to_ascii_lowercase()
                .starts_with(&format!("{}://", url.scheme()))
                && url.host_str().is_some() =>
        {
            Ok(url.to_string())
        }
        "mailto" if !url.path().is_empty() && !url.path().starts_with("//") => Ok(url.to_string()),
        _ => Err("invalidUrl".into()),
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_unsafe_destinations_before_starting_a_handler() {
        for value in [
            "file:///tmp/test",
            "javascript:alert(1)",
            "https://user:pass@example.com",
            "",
        ] {
            assert_eq!(open_external_url(value), Err("invalidUrl".into()));
        }
    }
    #[test]
    fn permits_only_explicit_web_and_mail_destinations() {
        for value in [
            "https://example.com/help?q=one#two",
            "http://localhost:8080/",
            "mailto:hello@example.com?subject=Hello%20world",
        ] {
            assert!(safe_external_url(value).is_ok(), "{value}");
        }
        for value in [
            "javascript:alert(1)",
            "data:text/html,test",
            "file:///tmp/a",
            "https://user:pass@example.com",
            "https://user@example.com",
            "//example.com",
            "https:example.com",
            " https://example.com",
            "https://exa\nmple.com",
            "https://example.com\\a",
            "mailto:",
            "mailto://example.com",
            "mailto:a@example.com?subject=hi%0d%0aBcc:test@example.com",
        ] {
            assert!(safe_external_url(value).is_err(), "{value}");
        }
        assert!(safe_external_url(&format!("https://example.com/{}", "界".repeat(500))).is_err());
        assert!(safe_external_url(&format!("https://example.com/{}", "x".repeat(2048))).is_err());
    }
}

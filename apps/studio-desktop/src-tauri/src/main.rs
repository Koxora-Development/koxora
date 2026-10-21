#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod storage;
use tauri::Manager;
fn root(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.join("projects-v1"))
        .map_err(|_| "storage".into())
}
#[tauri::command]
fn project_list(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    storage::list(&root(&app)?)
}
#[tauri::command]
fn project_read(app: tauri::AppHandle, id: String) -> Result<Option<String>, String> {
    storage::read(&root(&app)?, &id)
}
#[tauri::command]
fn project_read_previous(app: tauri::AppHandle, id: String) -> Result<Option<String>, String> {
    storage::read_previous(&root(&app)?, &id)
}
#[tauri::command]
fn project_write(
    app: tauri::AppHandle,
    id: String,
    expected: Option<String>,
    value: String,
) -> Result<(), String> {
    storage::write(&root(&app)?, &id, expected.as_deref(), &value)
}
#[tauri::command]
fn project_export(app: tauri::AppHandle, id: String, bytes: Vec<u8>) -> Result<String, String> {
    storage::export(
        &app.path().download_dir().map_err(|_| "storage")?,
        &id,
        &bytes,
    )
}
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            project_list,
            project_read,
            project_read_previous,
            project_write,
            project_export
        ])
        .run(tauri::generate_context!())
        .expect("failed to run the desktop shell");
}

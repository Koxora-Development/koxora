#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod export;
mod storage;
use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
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
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportLabels {
    title: String,
    filter: String,
    overwrite_title: String,
    overwrite_message: String,
    overwrite: String,
    cancel: String,
}
#[tauri::command]
async fn project_export(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    suggested_name: String,
    bytes: Vec<u8>,
    labels: ExportLabels,
) -> Result<Option<String>, String> {
    // Blocking dialog APIs run on a worker; the main event loop stays responsive.
    tauri::async_runtime::spawn_blocking(move || {
        export::save_as(
            &bytes,
            || {
                app.dialog()
                    .file()
                    .set_parent(&window)
                    .set_title(&labels.title)
                    .add_filter(&labels.filter, &["koxora"])
                    .set_file_name(export::suggested_filename(&suggested_name))
                    .blocking_save_file()
                    .map(|file| file.into_path().map_err(|_| "storage".to_owned()))
                    .transpose()
            },
            |path| {
                app.dialog()
                    .message(format!(
                        "{}\n\n{}",
                        labels.overwrite_message,
                        path.display()
                    ))
                    .title(&labels.overwrite_title)
                    .parent(&window)
                    .kind(MessageDialogKind::Warning)
                    .buttons(MessageDialogButtons::OkCancelCustom(
                        labels.overwrite.clone(),
                        labels.cancel.clone(),
                    ))
                    .blocking_show()
            },
        )
        .map(|path| path.map(|path| path.to_string_lossy().into_owned()))
    })
    .await
    .map_err(|_| "storage".to_owned())?
}
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
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

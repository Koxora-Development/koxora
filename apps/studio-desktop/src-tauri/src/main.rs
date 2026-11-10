#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod export;
mod links;
mod location;
mod storage;
use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
fn location(app: &tauri::AppHandle) -> Result<location::Location, String> {
    location::Location::acquire(
        &app.path().app_config_dir().map_err(|_| "storage")?,
        &app.path()
            .app_data_dir()
            .map_err(|_| "storage")?
            .join("projects-v1"),
    )
}
#[tauri::command]
fn storage_status(app: tauri::AppHandle) -> Result<location::Status, String> {
    location(&app)?.status()
}
#[tauri::command]
fn storage_keep(app: tauri::AppHandle) -> Result<(), String> {
    location(&app)?.keep()
}
#[tauri::command]
fn storage_open(app: tauri::AppHandle) -> Result<(), String> {
    links::open_folder(&location(&app)?.root()?)
}
#[tauri::command]
async fn storage_change(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    title: String,
    restore: bool,
) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let chosen = app
            .dialog()
            .file()
            .set_parent(&window)
            .set_title(title)
            .blocking_pick_folder();
        let Some(chosen) = chosen else {
            return Ok(false);
        };
        let path = chosen.into_path().map_err(|_| "storage")?;
        location(&app)?.change(&path, restore)?;
        Ok(true)
    })
    .await
    .map_err(|_| "storage".to_owned())?
}
#[tauri::command]
fn project_list(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    {
        let location = location(&app)?;
        storage::list(&location.root()?)
    }
}
#[tauri::command]
fn project_read(app: tauri::AppHandle, id: String) -> Result<Option<String>, String> {
    {
        let location = location(&app)?;
        storage::read(&location.root()?, &id)
    }
}
#[tauri::command]
fn project_read_previous(app: tauri::AppHandle, id: String) -> Result<Option<String>, String> {
    {
        let location = location(&app)?;
        storage::read_previous(&location.root()?, &id)
    }
}
#[tauri::command]
fn project_write(
    app: tauri::AppHandle,
    id: String,
    expected: Option<String>,
    value: String,
) -> Result<(), String> {
    {
        let location = location(&app)?;
        storage::write(&location.root()?, &id, expected.as_deref(), &value)
    }
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
#[tauri::command]
async fn open_external_url(url: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || links::open_external_url(&url))
        .await
        .map_err(|_| "openUrl".to_owned())?
}
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            storage_status,
            storage_keep,
            storage_open,
            storage_change,
            project_list,
            project_read,
            project_read_previous,
            project_write,
            project_export,
            open_external_url
        ])
        .run(tauri::generate_context!())
        .expect("failed to run the desktop shell");
}

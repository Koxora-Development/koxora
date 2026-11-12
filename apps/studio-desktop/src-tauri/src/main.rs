#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod export;
mod integration;
mod links;
mod location;
mod opening;
mod storage;
use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
#[tauri::command]
async fn appimage_integration(action: integration::Action) -> Result<integration::Status, String> {
    tauri::async_runtime::spawn_blocking(move || integration::run(action))
        .await
        .map_err(|_| "integrationFailed".to_owned())?
}
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
#[tauri::command]
async fn project_remove(app: tauri::AppHandle, id: String, expected: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let location = location(&app)?;
        storage::remove(&location.root()?, &id, &expected)
    })
    .await
    .map_err(|_| "storage".to_owned())?
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
#[tauri::command]
async fn project_open_next(app: tauri::AppHandle) -> Result<Option<opening::Request>, String> {
    tauri::async_runtime::spawn_blocking(move || app.state::<opening::Requests>().next())
        .await
        .map_err(|_| "storage".to_owned())?
}
#[tauri::command]
fn project_open_ack(requests: tauri::State<opening::Requests>, id: u64) -> Result<(), String> {
    requests.ack(id)
}
#[tauri::command]
async fn project_open_choose(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    title: String,
    filter: String,
    as_copy: bool,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        if let Some(files) = app
            .dialog()
            .file()
            .set_parent(&window)
            .set_title(title)
            .add_filter(filter, &["koxora"])
            .blocking_pick_files()
        {
            let paths = files
                .into_iter()
                .map(|file| file.into_path().map_err(|_| "storage".to_owned()))
                .collect::<Result<Vec<_>, _>>()?;
            app.state::<opening::Requests>()
                .enqueue_copy(paths, as_copy);
        }
        Ok(())
    })
    .await
    .map_err(|_| "storage".to_owned())?
}
fn focus(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}
fn main() {
    let requests = opening::Requests::default();
    requests.arguments(
        std::env::args_os().skip(1),
        &std::env::current_dir().unwrap_or_default(),
    );
    tauri::Builder::default()
        .manage(requests)
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            app.state::<opening::Requests>().arguments(
                args.into_iter().skip(1).map(Into::into),
                std::path::Path::new(&cwd),
            );
            focus(app);
        }))
        .plugin(tauri_plugin_dialog::init())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::DragDrop(tauri::DragDropEvent::Drop { paths, .. }) = event {
                window.state::<opening::Requests>().enqueue(paths.clone());
            }
        })
        .invoke_handler(tauri::generate_handler![
            appimage_integration,
            storage_status,
            storage_keep,
            storage_open,
            storage_change,
            project_open_next,
            project_open_ack,
            project_open_choose,
            project_list,
            project_read,
            project_read_previous,
            project_write,
            project_remove,
            project_export,
            open_external_url
        ])
        .build(tauri::generate_context!())
        .expect("failed to build the desktop shell")
        .run(|app, event| {
            #[cfg(any(target_os = "macos", target_os = "ios"))]
            if let tauri::RunEvent::Opened { urls } = &event {
                app.state::<opening::Requests>()
                    .enqueue(urls.iter().filter_map(|url| url.to_file_path().ok()));
                focus(app);
            }
            let _ = (app, event);
        });
}

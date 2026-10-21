fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "project_list",
            "project_read",
            "project_read_previous",
            "project_write",
            "project_export",
        ]),
    ))
    .expect("failed to build desktop permissions");
}

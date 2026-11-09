fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "project_open_next",
            "project_open_ack",
            "project_open_choose",
            "project_list",
            "project_read",
            "project_read_previous",
            "project_write",
            "project_export",
            "open_external_url",
        ]),
    ))
    .expect("failed to build desktop permissions");
}

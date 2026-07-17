use std::fs;
use std::path::Path;

// Etiquetas estrictas para evitar el "undefined" en JavaScript
#[derive(serde::Serialize)]
struct FolderSection {
    #[serde(rename = "name")]
    name: String,
    #[serde(rename = "count")]
    count: usize,
    #[serde(rename = "tracks")]
    tracks: Vec<String>,
}

#[derive(serde::Serialize)]
struct ScanResult {
    #[serde(rename = "path")]
    path: String,
    #[serde(rename = "sections")]
    sections: Vec<FolderSection>,
}

fn perform_scan(base_path: &Path) -> Vec<FolderSection> {
    let mut sections = Vec::new();

    if let Ok(entries) = fs::read_dir(base_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let folder_name = path.file_name().unwrap_or_default().to_string_lossy().into_owned();
                let mut tracks = Vec::new();

                if let Ok(sub_entries) = fs::read_dir(&path) {
                    for sub_entry in sub_entries.flatten() {
                        let sub_path = sub_entry.path();
                        if sub_path.is_file() {
                            if let Some(extension) = sub_path.extension() {
                                if extension == "opus" {
                                    if let Some(name) = sub_path.file_name() {
                                        tracks.push(name.to_string_lossy().into_owned());
                                    }
                                }
                            }
                        }
                    }
                }

                if !tracks.is_empty() {
                    sections.push(FolderSection {
                        name: folder_name,
                        count: tracks.len(),
                        tracks,
                    });
                }
            }
        }
    }

    let mut root_tracks = Vec::new();
    if let Ok(entries) = fs::read_dir(base_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(extension) = path.extension() {
                    if extension == "opus" {
                        if let Some(name) = path.file_name() {
                            root_tracks.push(name.to_string_lossy().into_owned());
                        }
                    }
                }
            }
        }
    }

    if !root_tracks.is_empty() {
        sections.insert(0, FolderSection {
            name: "Canciones sueltas".to_string(),
            count: root_tracks.len(),
            tracks: root_tracks,
        });
    }

    sections
}

#[tauri::command]
fn select_and_scan_music() -> Option<ScanResult> {
    let result = rfd::FileDialog::new()
        .set_title("Selecciona tu carpeta de Música")
        .pick_folder();

    let base_path = match result {
        Some(path) => path,
        None => return None,
    };

    let sections = perform_scan(&base_path);
    let path_str = base_path.to_string_lossy().into_owned();

    Some(ScanResult { path: path_str, sections })
}

#[tauri::command]
fn refresh_music_folder(folder_path: &str) -> Vec<FolderSection> {
    let base_path = Path::new(folder_path);
    perform_scan(base_path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![select_and_scan_music, refresh_music_folder])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
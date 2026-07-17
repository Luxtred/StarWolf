use std::fs;
use std::path::Path;
use base64::{Engine as _, engine::general_purpose};

#[derive(serde::Serialize, Clone)]
struct FolderSection {
    name: String,
    count: usize,
    tracks: Vec<String>,
    cover_image: Option<String>, // Nuevo: Guarda la carátula en Base64
}

#[derive(serde::Serialize)]
struct ScanResult {
    path: String,
    sections: Vec<FolderSection>,
}

// Función que busca la imagen en la carpeta
fn find_cover_in_folder(path: &Path) -> Option<String> {
    let cover_names = ["cover.jpg", "cover.png", "folder.jpg", "folder.png"];
    for name in cover_names {
        let img_path = path.join(name);
        if img_path.exists() {
            if let Ok(bytes) = fs::read(&img_path) {
                let encoded = general_purpose::STANDARD.encode(&bytes);
                let mime = if name.ends_with("png") { "image/png" } else { "image/jpeg" };
                return Some(format!("data:{};base64,{}", mime, encoded));
            }
        }
    }
    None
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
                                if extension == "opus" || extension == "mp3" || extension == "flac" {
                                    if let Some(name) = sub_path.file_name() {
                                        tracks.push(name.to_string_lossy().into_owned());
                                    }
                                }
                            }
                        }
                    }
                }

                if !tracks.is_empty() {
                    let cover = find_cover_in_folder(&path);
                    sections.push(FolderSection {
                        name: folder_name,
                        count: tracks.len(),
                        tracks,
                        cover_image: cover,
                    });
                }
            }
        }
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
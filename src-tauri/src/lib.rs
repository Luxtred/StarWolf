use std::fs;
use std::path::Path;
use lofty::probe::Probe;
use lofty::file::TaggedFileExt;
use lofty::prelude::*;
use base64::Engine;

// Etiquetas estrictas para evitar el "undefined" en JavaScript
#[derive(serde::Serialize)]
struct FolderSection {
    #[serde(rename = "name")]
    name: String,
    #[serde(rename = "count")]
    count: usize,
    #[serde(rename = "tracks")]
    tracks: Vec<String>,
    #[serde(rename = "dirPath")]
    dir_path: String,
    #[serde(rename = "cover")]
    cover: Option<String>,
}

#[derive(serde::Serialize)]
struct ScanResult {
    #[serde(rename = "path")]
    path: String,
    #[serde(rename = "sections")]
    sections: Vec<FolderSection>,
}

const IMAGE_EXTENSIONS: [&str; 4] = ["jpg", "jpeg", "png", "webp"];
const PRIORITY_COVER_NAMES: [&str; 6] = ["cover", "folder", "art", "artwork", "portada", "caratula"];

fn extract_embedded_cover(track_path: &Path) -> Option<String> {
    let tagged_file = Probe::open(track_path).ok()?.read().ok()?;
    let tag = tagged_file.primary_tag().or_else(|| tagged_file.first_tag())?;
    let picture = tag.pictures().first()?;
    let mime = picture.mime_type().map(|m| m.to_string()).unwrap_or_else(|| "image/jpeg".to_string());
    let b64 = base64::engine::general_purpose::STANDARD.encode(picture.data());
    Some(format!("data:{};base64,{}", mime, b64))
}

fn find_cover(dir: &Path) -> Option<String> {
    let entries = fs::read_dir(dir).ok()?;
    let mut fallback: Option<String> = None;
    let mut first_track: Option<std::path::PathBuf> = None;

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() { continue; }
        let extension = match path.extension() {
            Some(ext) => ext.to_string_lossy().to_lowercase(),
            None => continue,
        };

        if extension == "opus" && first_track.is_none() {
            first_track = Some(path.clone());
        }

        if !IMAGE_EXTENSIONS.contains(&extension.as_str()) { continue; }

        let stem = path.file_stem().map(|s| s.to_string_lossy().to_lowercase()).unwrap_or_default();
        if PRIORITY_COVER_NAMES.iter().any(|name| stem == *name) {
            return Some(path.to_string_lossy().into_owned());
        }
        if fallback.is_none() {
            fallback = Some(path.to_string_lossy().into_owned());
        }
    }

    // Si no hay una imagen suelta en la carpeta, intentamos con la carátula
    // incrustada (METADATA_BLOCK_PICTURE) del primer track encontrado.
    fallback.or_else(|| first_track.and_then(|track| extract_embedded_cover(&track)))
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
                        dir_path: path.to_string_lossy().into_owned(),
                        cover: find_cover(&path),
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
            dir_path: base_path.to_string_lossy().into_owned(),
            cover: find_cover(base_path),
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

// Carátula incrustada de UNA pista puntual (cada canción puede traer una
// portada distinta dentro de su propio archivo .opus, a diferencia de
// `find_cover`, que solo mira la primera pista de la carpeta).
#[tauri::command]
fn get_track_cover(path: &str) -> Option<String> {
    extract_embedded_cover(Path::new(path))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![select_and_scan_music, refresh_music_folder, get_track_cover])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
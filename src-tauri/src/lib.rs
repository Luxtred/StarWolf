use base64::Engine;
use lofty::file::TaggedFileExt;
use lofty::probe::Probe;
use std::fs;
use std::path::{Path};

// =====================================================================
// 1. CONSTANTES DE CONFIGURACIÓN
// =====================================================================
const IMAGE_EXTENSIONS: [&str; 4] = ["jpg", "jpeg", "png", "webp"];
const AUDIO_EXTENSIONS: [&str; 6] = ["opus", "m4a", "mp3", "ogg", "flac", "wav"];
const PRIORITY_COVER_NAMES: [&str; 6] = ["cover", "folder", "art", "artwork", "portada", "caratula"];

// =====================================================================
// 2. ESTRUCTURAS DE DATOS (API PARA EL FRONTEND)
// =====================================================================
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")] // Transforma automáticamente 'dir_path' a 'dirPath' en el JSON
struct FolderSection {
    name: String,
    count: usize,
    tracks: Vec<String>,
    dir_path: String,
    cover: Option<String>,
}

#[derive(serde::Serialize)]
struct ScanResult {
    path: String,
    sections: Vec<FolderSection>,
}

// =====================================================================
// 3. FUNCIONES AUXILIARES (HELPERS)
// =====================================================================

/// Verifica si un archivo tiene una extensión de audio válida
fn is_audio_file(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| AUDIO_EXTENSIONS.contains(&ext.to_lowercase().as_str()))
        .unwrap_or(false)
}

/// Extrae metadatos y carátula incrustada (ID3, MP4, FLAC) usando Lofty
fn extract_embedded_cover(track_path: &Path) -> Option<String> {
    let tagged_file = Probe::open(track_path).ok()?.read().ok()?;
    let tag = tagged_file.primary_tag().or_else(|| tagged_file.first_tag())?;
    let picture = tag.pictures().first()?;
    
    let mime = picture.mime_type().map(|m| m.to_string()).unwrap_or_else(|| "image/jpeg".to_string());
    let b64 = base64::engine::general_purpose::STANDARD.encode(picture.data());
    
    Some(format!("data:{};base64,{}", mime, b64))
}

/// Busca una imagen de portada dentro de una carpeta o usa la incrustada en la primera pista
fn find_cover(dir: &Path) -> Option<String> {
    let entries = fs::read_dir(dir).ok()?;
    let mut fallback = None;
    let mut first_track = None;

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() { continue; }

        let extension = match path.extension().and_then(|e| e.to_str()) {
            Some(ext) => ext.to_lowercase(),
            None => continue,
        };

        // Guardar la primera canción en caso de necesitar su carátula interna
        if first_track.is_none() && AUDIO_EXTENSIONS.contains(&extension.as_str()) {
            first_track = Some(path.clone());
        }

        if !IMAGE_EXTENSIONS.contains(&extension.as_str()) { continue; }

        let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_lowercase();
        
        // Si el archivo tiene un nombre prioritario, lo devolvemos inmediatamente
        if PRIORITY_COVER_NAMES.contains(&stem.as_str()) {
            return Some(path.to_string_lossy().into_owned());
        }
        
        // Guardamos cualquier otra imagen como plan de respaldo
        if fallback.is_none() {
            fallback = Some(path.to_string_lossy().into_owned());
        }
    }

    // Prioridad de retorno: 1. Imagen encontrada, 2. Portada incrustada, 3. None
    fallback.or_else(|| first_track.and_then(|track| extract_embedded_cover(&track)))
}

/// Analiza un directorio específico y extrae solo los nombres de pistas de audio válidas
fn get_tracks_in_dir(dir: &Path) -> Vec<String> {
    let mut tracks = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && is_audio_file(&path) {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    tracks.push(name.to_owned());
                }
            }
        }
    }
    tracks
}

// =====================================================================
// 4. LÓGICA PRINCIPAL DE ESCANEO
// =====================================================================
fn perform_scan(base_path: &Path) -> Vec<FolderSection> {
    let mut sections = Vec::new();

    if let Ok(entries) = fs::read_dir(base_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            
            // 1. Procesar todas las subcarpetas encontradas
            if path.is_dir() {
                let tracks = get_tracks_in_dir(&path);
                if !tracks.is_empty() {
                    sections.push(FolderSection {
                        name: path.file_name().unwrap_or_default().to_string_lossy().into_owned(),
                        count: tracks.len(),
                        tracks,
                        dir_path: path.to_string_lossy().into_owned(),
                        cover: find_cover(&path),
                    });
                }
            }
        }
    }

    // 2. Procesar archivos de audio "sueltos" directamente en la raíz
    let root_tracks = get_tracks_in_dir(base_path);
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

// =====================================================================
// 5. COMANDOS DE TAURI (EXPUESTOS A JAVASCRIPT)
// =====================================================================
#[tauri::command]
fn select_and_scan_music() -> Option<ScanResult> {
    let base_path = rfd::FileDialog::new()
        .set_title("Selecciona tu carpeta de Música")
        .pick_folder()?; // Retorno temprano automático si el usuario cancela

    Some(ScanResult {
        path: base_path.to_string_lossy().into_owned(),
        sections: perform_scan(&base_path),
    })
}

#[tauri::command]
fn refresh_music_folder(folder_path: &str) -> Vec<FolderSection> {
    perform_scan(Path::new(folder_path))
}

#[tauri::command]
fn get_track_cover(path: &str) -> Option<String> {
    extract_embedded_cover(Path::new(path))
}

// =====================================================================
// 6. PUNTO DE ENTRADA (MAIN)
// =====================================================================
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 🔥 PLAN B: Servidor web local en un hilo secundario de forma segura
    std::thread::spawn(|| {
        if let Ok(rt) = tokio::runtime::Runtime::new() {
            rt.block_on(async {
                let app = axum::Router::new()
                    .fallback_service(tower_http::services::ServeDir::new("/"))
                    .layer(tower_http::cors::CorsLayer::permissive());
                
                // Binding seguro al puerto
                if let Ok(listener) = tokio::net::TcpListener::bind("127.0.0.1:18543").await {
                    println!("🚀 Servidor local de audio activo en http://127.0.0.1:18543");
                    let _ = axum::serve(listener, app).await;
                } else {
                    eprintln!("⚠️ No se pudo iniciar el servidor local de audio en el puerto 18543.");
                }
            });
        }
    });

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            select_and_scan_music, 
            refresh_music_folder, 
            get_track_cover
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
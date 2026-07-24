// =========================================================
// 1. VARIABLES DEL DOM (INTERFAZ)
// =========================================================
const appContainer = document.getElementById("app-container");
const folderList = document.getElementById("folder-list");
const centerTrackList = document.getElementById("center-track-list");
const upNextList = document.getElementById("up-next-list");

// Vistas y Paneles
const nowPlayingView = document.getElementById("now-playing-view");
const folderTracksView = document.getElementById("folder-tracks-view");
const nowPlayingLayout = document.getElementById("now-playing-layout");
const settingsModal = document.getElementById("settings-modal");
const eqModal = document.getElementById("eq-modal");
const lyricsModal = document.getElementById("lyrics-modal");
const lyricsPanelMain = document.getElementById("lyrics-panel-main");
const sideLyricsView = document.getElementById("side-lyrics-view");
const sideTrackNormal = document.getElementById("side-track-normal");
const lyricsPanelBg = document.getElementById("lyrics-panel-bg");

// Botones de Navegación y Herramientas
const btnScan = document.getElementById("btn-scan");
const btnRefresh = document.getElementById("btn-refresh");
const btnToggleSidebar = document.getElementById("btn-toggle-sidebar");
const btnViewQueue = document.getElementById("btn-view-queue");
const toastMsg = document.getElementById("toast-msg");
const btnSettings = document.getElementById("btn-settings");
const btnCloseSettings = document.getElementById("btn-close-settings");
const btnBackToPlayer = document.getElementById("btn-back-to-player");
const btnBackToFolders = document.getElementById("btn-back-to-folders");
const btnThemeDark = document.getElementById("btn-theme-dark");
const btnThemeLight = document.getElementById("btn-theme-light");
const spectrumStyleSelect = document.getElementById("spectrum-style-select");

// Textos e Imágenes
const selectedFolderTitle = document.getElementById("selected-folder-title");
const trackTitle = document.getElementById("track-title");
const trackArtist = document.getElementById("track-artist");
const trackAlbum = document.getElementById("track-album");
const sideTitle = document.getElementById("side-title");
const sideArtist = document.getElementById("side-artist");
const sideAlbum = document.getElementById("side-album");
const coverArtImg = document.getElementById("cover-art-img");
const coverArtPlaceholder = document.getElementById("cover-art-placeholder");
const sideCoverImg = document.getElementById("side-cover-img");
const sideCoverPlaceholder = document.getElementById("side-cover-placeholder");

// Letras (UI)
const btnLyrics = document.getElementById("btn-lyrics");
const btnLyricsSide = document.getElementById("btn-lyrics-side");
const btnLyricsMain = document.getElementById("btn-lyrics-main");
const btnCloseLyrics = document.getElementById("btn-close-lyrics");
const btnCloseLyricsMain = document.getElementById("btn-close-lyrics-main");
const btnCloseLyricsSide = document.getElementById("btn-close-lyrics-side");
const btnEditLyricsMain = document.getElementById("btn-edit-lyrics-main");
const btnEditLyricsSide = document.getElementById("btn-edit-lyrics-side");
const btnSaveLyrics = document.getElementById("btn-save-lyrics");
const btnLikeLyrics = document.getElementById("btn-like-lyrics");
const lyricsTextarea = document.getElementById("lyrics-textarea");
const lyricsTrackName = document.getElementById("lyrics-track-name");
const lyricsTextMain = document.getElementById("lyrics-text-main");
const lyricsPanelTitleMain = document.getElementById("lyrics-panel-title-main");
const lyricsPanelArtistMain = document.getElementById("lyrics-panel-artist-main");
const lyricsTextSide = document.getElementById("lyrics-text-side");
const lyricsPanelTitleSide = document.getElementById("lyrics-panel-title-side");

// Motor de Audio y Controles
const audioPlayer = document.getElementById("audio-player");
const btnPlay = document.getElementById("btn-play");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnShuffle = document.getElementById("btn-shuffle");
const btnRepeat = document.getElementById("btn-repeat");
const btnAutoplay = document.getElementById("btn-autoplay");
const btnLike = document.getElementById("btn-like");
const btnEq = document.getElementById("btn-eq");
const btnCloseEq = document.getElementById("btn-close-eq");
const btnResetEq = document.getElementById("btn-reset-eq");
const volumeSlider = document.getElementById("volume-slider");
const crossfadeSlider = document.getElementById('crossfade-slider');
const crossfadeValueLabel = document.getElementById('crossfade-value');
const progressBar = document.getElementById("progress-bar");
const spectrumCanvas = document.getElementById("spectrum-canvas");
const timeCurrentEl = document.getElementById("time-current");
const timeDurationEl = document.getElementById("time-duration");

// Mini Reproductor Flotante (PiP)
const btnPipPlayer = document.getElementById("btn-pip-player");
const pipCanvas = document.getElementById("pip-canvas");
const pipVideo = document.getElementById("pip-video");
const pipCtx = pipCanvas?.getContext("2d");

// =========================================================
// 2. ESTADO GLOBAL
// =========================================================
let activePlaylist = []; 
let currentFolderActive = "";
let savedFolderPath = ""; 
let currentTrackIndex = -1;
let sectionsByName = {};

let isShuffleOn = false;
let repeatMode = "off"; 
let isAutoplayOn = true;
let isFadingOut = false; 

// Contexto Audio & Visualizador
let audioCtx = null, analyser = null, sourceNode = null, freqData = null;
let masterGain = null;
let eqBands = [];
let coverRequestToken = 0;

// Variables de Efectos Visuales (Onda / Espectro)
let spectrumStyle = localStorage.getItem("starwolf-spectrum-style") || "bars";
let waveformCache = new Map();
let currentWaveformData = null;
let waveformLoadToken = 0;
const WAVEFORM_SEGMENTS = 64;

// =========================================================
// 3. UTILIDADES Y FORMATO
// =========================================================
function toAssetUrl(path) {
    if (!path) return null;
    try { return window.__TAURI__.core.convertFileSrc(path); } 
    catch (e) { return null; }
}

function resolveCoverSrc(cover) {
    if (!cover) return null;
    return cover.startsWith("data:") ? cover : toAssetUrl(cover);
}

function toMediaUrl(path) {
    return path ? `http://127.0.0.1:18543${path}` : null;
}

function cleanTrackName(filename) {
    return filename
        .replace(/\.[a-zA-Z0-9]+$/, "")
        .replace(/\[.*?\]/g, "")
        .replace(/\(.*?(downloader|y2mate|kbps).*?\)/gi, "")
        .replace(/[-_]?\s*\d{2,3}\s*kbps/gi, "")
        .replace(/[a-zA-Z0-9-]+\.[a-zA-Z]{2,4}\s*-\s*/gi, "")
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .replace(/^[-]+|[-]+$/g, "")
        .trim() || "Pista Desconocida";
}

function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    let mins = Math.floor(seconds / 60);
    let secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function showToast(msg) {
    if (!toastMsg) return;
    toastMsg.textContent = msg;
    toastMsg.classList.add("show");
    setTimeout(() => toastMsg.classList.remove("show"), 3000);
}

const folderIconSvg = () => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>`;
const heartIconSvg = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg>`;

// =========================================================
// 4. INICIALIZACIÓN Y CACHÉ
// =========================================================
window.addEventListener("DOMContentLoaded", () => {
    applyTheme(localStorage.getItem("starwolf-theme") || "dark");
    
    // Cargar caché de biblioteca
    let cachedPath = localStorage.getItem("starwolf-path");
    let cachedLibrary = localStorage.getItem("starwolf-library");
    if (cachedPath && cachedLibrary) {
        try {
            savedFolderPath = cachedPath;
            btnRefresh.classList.remove("hidden");
            processAndRenderFolders(JSON.parse(cachedLibrary));
        } catch (error) {
            console.error("Error leyendo caché:", error);
        }
    }

    // Configurar ajustes persistentes
    loadCrossfadeSettings();
    if (spectrumStyleSelect) spectrumStyleSelect.value = spectrumStyle;
});

// =========================================================
// 5. GESTIÓN DE BIBLIOTECA (RUST/TAURI)
// =========================================================
btnScan.addEventListener("click", async () => {
    try {
        folderList.innerHTML = "<p style='color: #888; font-size: 13px; padding: 10px;'>⏳ Analizando...</p>";
        const result = await window.__TAURI__.core.invoke("select_and_scan_music");
        if (!result) { folderList.innerHTML = ""; return; }

        savedFolderPath = result.path;
        btnRefresh.classList.remove("hidden");
        localStorage.setItem("starwolf-path", savedFolderPath);
        localStorage.setItem("starwolf-library", JSON.stringify(result.sections));
        processAndRenderFolders(result.sections);
    } catch (error) { console.error(error); }
});

btnRefresh.addEventListener("click", async () => {
    if (!savedFolderPath) return;
    try {
        folderList.innerHTML = "<p style='color: #888; font-size: 13px; padding: 10px;'>⏳ Actualizando...</p>";
        const sections = await window.__TAURI__.core.invoke("refresh_music_folder", { folderPath: savedFolderPath });
        localStorage.setItem("starwolf-library", JSON.stringify(sections));
        processAndRenderFolders(sections);
    } catch (error) { console.error(error); }
});

function processAndRenderFolders(sections) {
    folderList.innerHTML = "";
    sectionsByName = {};
    if (sections.length === 0) {
        folderList.innerHTML = "<p style='color: #888; font-size: 13px; padding: 10px;'>Vacío</p>";
        renderLikedCard();
        return;
    }

    sections.forEach(section => {
        sectionsByName[section.name] = section;
        let card = document.createElement("div");
        card.className = "folder-card";
        let coverUrl = resolveCoverSrc(section.cover);
        
        card.innerHTML = `
            <div class="folder-cover-placeholder">${coverUrl ? `<img src="${coverUrl}" alt="${section.name}" />` : folderIconSvg()}</div>
            <div class="folder-card-info">
                <span class="folder-card-name">${section.name}</span>
                <span class="folder-card-count">${section.count} pistas</span>
            </div>
        `;
        card.addEventListener("click", () => openFolderSection(section.name, section.tracks.map(name => ({ name, dirPath: section.dirPath, folder: section.name }))));
        folderList.appendChild(card);
    });
    renderLikedCard();
}

function openFolderSection(folderName, tracks) {
    nowPlayingView.classList.add("hidden");
    folderTracksView.classList.remove("hidden");
    selectedFolderTitle.textContent = folderName;
    currentFolderActive = folderName;
    activePlaylist = tracks;
    btnBackToFolders.classList.remove("hidden");
    sideLyricsView.classList.remove("active");
    sideTrackNormal.classList.remove("hidden");
    updateSideCoverArt(sectionsByName[folderName]);
    renderPlaylistUI();
}

// =========================================================
// 6. FAVORITOS (ME GUSTA)
// =========================================================
function getLikedTracks() {
    try { return JSON.parse(localStorage.getItem("starwolf-likes") || "[]"); }
    catch (e) { return []; }
}

function trackKey(track) { return `${track.dirPath}/${track.name}`; }

function isLiked(track) {
    return getLikedTracks().some((t) => trackKey(t) === trackKey(track));
}

function toggleLike(track) {
    let liked = getLikedTracks();
    let key = trackKey(track);
    let existingIndex = liked.findIndex((t) => trackKey(t) === key);
    if (existingIndex >= 0) liked.splice(existingIndex, 1);
    else liked.push(track);
    localStorage.setItem("starwolf-likes", JSON.stringify(liked));
    
    if (document.getElementById("liked-folder-card")) renderLikedCard();
    renderPlaylistUI();
    renderUpNextList();
    updateLikeButton();
}

function renderLikedCard() {
    document.getElementById("liked-folder-card")?.remove();
    let liked = getLikedTracks();
    let card = document.createElement("div");
    card.className = "folder-card";
    card.id = "liked-folder-card";
    card.innerHTML = `
        <div class="folder-cover-placeholder" style="color:#ff4d6d;">${heartIconSvg()}</div>
        <div class="folder-card-info">
            <span class="folder-card-name">Me gusta</span>
            <span class="folder-card-count">${liked.length} pistas</span>
        </div>
    `;
    card.addEventListener("click", () => openFolderSection("Me gusta", getLikedTracks()));
    folderList.prepend(card);
}

function updateLikeButton() {
    let track = activePlaylist[currentTrackIndex];
    let liked = !!track && isLiked(track);
    btnLike.classList.toggle("liked", liked);
    btnLikeLyrics.classList.toggle("liked", liked);
}

btnLike.addEventListener("click", () => toggleLike(activePlaylist[currentTrackIndex]));
btnLikeLyrics.addEventListener("click", () => toggleLike(activePlaylist[currentTrackIndex]));

// =========================================================
// 7. MOTOR DE AUDIO Y EQ
// =========================================================
function ensureAudioGraph() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        audioCtx.onstatechange = () => {
            if (audioCtx.state === "suspended" && !audioPlayer.paused) audioCtx.resume();
        };

        setInterval(() => {
            if (audioCtx && audioCtx.state === "suspended" && !audioPlayer.paused) audioCtx.resume();
        }, 1000);

        document.addEventListener("visibilitychange", () => {
            if (audioCtx && audioCtx.state === "suspended" && !audioPlayer.paused) audioCtx.resume();
        });

        sourceNode = audioCtx.createMediaElementSource(audioPlayer);
        masterGain = audioCtx.createGain();
        masterGain.gain.value = volumeSlider.value / 100;

        const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
        let prevNode = sourceNode;
        const eqContainer = document.getElementById("equalizer-container");
        eqContainer.innerHTML = "";
        
        let savedEqValues = JSON.parse(localStorage.getItem("starwolf_eq") || "[]");

        frequencies.forEach((freq, index) => {
            let filter = audioCtx.createBiquadFilter();
            filter.type = freq < 500 ? "lowshelf" : (freq > 4000 ? "highshelf" : "peaking");
            filter.frequency.value = freq;
            
            let savedValue = savedEqValues[index] || 0;
            filter.gain.value = savedValue;
            
            prevNode.connect(filter);
            prevNode = filter;
            eqBands.push(filter);

            let wrapper = document.createElement("div");
            wrapper.style.display = "flex"; wrapper.style.flexDirection = "column"; wrapper.style.alignItems = "center";
            
            let valueLabel = document.createElement("div");
            valueLabel.className = "eq-val-display";
            valueLabel.innerText = `${savedValue > 0 ? '+' : ''}${savedValue.toFixed(1)} dB`;
            valueLabel.style.fontSize = "11px"; 
            valueLabel.style.color = savedValue === 0 ? "var(--text-muted)" : "var(--accent)"; 
            valueLabel.style.marginBottom = "8px"; 
            valueLabel.style.fontWeight = "bold";

            let slider = document.createElement("input");
            slider.type = "range"; 
            slider.min = "-12"; slider.max = "12"; slider.step = "0.1";
            slider.value = savedValue;
            slider.style.writingMode = "vertical-lr";
            slider.style.direction = "rtl";
            slider.style.appearance = "slider-vertical";
            slider.style.width = "20px"; slider.style.height = "130px";
            slider.style.accentColor = "var(--accent)";
            
            slider.addEventListener("input", (e) => {
                let val = parseFloat(e.target.value);
                filter.gain.value = val;
                valueLabel.innerText = `${val > 0 ? '+' : ''}${val.toFixed(1)} dB`;
                valueLabel.style.color = val === 0 ? "var(--text-muted)" : "var(--accent)";
            });

            slider.addEventListener("change", (e) => {
                savedEqValues[index] = parseFloat(e.target.value);
                localStorage.setItem("starwolf_eq", JSON.stringify(savedEqValues));
            });
            
            let typeText = freq <= 125 ? "Graves" : (freq <= 1000 ? "Medios" : "Agudos");
            let freqText = freq >= 1000 ? (freq / 1000) + 'k' : freq;
            let label = document.createElement("div");
            label.innerText = typeText + "\n" + freqText;
            label.style.fontSize = "10px"; label.style.color = "var(--text-muted)"; label.style.marginTop = "8px"; label.style.textAlign = "center"; label.style.whiteSpace = "pre-line";
            
            wrapper.appendChild(valueLabel);
            wrapper.appendChild(slider); 
            wrapper.appendChild(label);
            eqContainer.appendChild(wrapper);
        });

        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;
        freqData = new Uint8Array(analyser.frequencyBinCount);
        
        prevNode.connect(analyser);
        analyser.connect(masterGain);
        masterGain.connect(audioCtx.destination);
    } catch (e) { console.error("No se pudo iniciar el analizador:", e); }
}

volumeSlider.addEventListener("input", () => {
    if (masterGain) masterGain.gain.value = volumeSlider.value / 100;
    else audioPlayer.volume = volumeSlider.value / 100;
});

// Lógica del Crossfade
let fadeInterval = null; 
function triggerFade(isIn, callback = null) {
    if (!masterGain || !audioCtx) {
        if (callback) callback();
        return;
    }
    
    let fadeTime = parseFloat(crossfadeSlider ? crossfadeSlider.value : 1.5);
    let targetVolume = volumeSlider.value / 100;
    
    clearInterval(fadeInterval); 
    
    if (fadeTime === 0 || document.hidden || audioCtx.state === "suspended") {
        masterGain.gain.value = isIn ? targetVolume : 0;
        if (callback) callback();
        return;
    }

    let intervalTime = 50; 
    let totalSteps = fadeTime * (1000 / intervalTime);
    let currentStep = 0;
    
    let startVol = masterGain.gain.value;
    let endVol = isIn ? targetVolume : 0;
    let volumeChange = (endVol - startVol) / totalSteps;

    fadeInterval = setInterval(() => {
        currentStep++;
        let nextVol = startVol + (volumeChange * currentStep);
        
        if (nextVol < 0) nextVol = 0;
        if (nextVol > targetVolume) nextVol = targetVolume;
        
        masterGain.gain.value = nextVol;

        if (currentStep >= totalSteps || (isIn && nextVol >= targetVolume) || (!isIn && nextVol <= 0)) {
            clearInterval(fadeInterval);
            masterGain.gain.value = endVol;
            if (callback) callback(); 
        }
    }, intervalTime);
}

function loadCrossfadeSettings() {
    const savedCrossfade = localStorage.getItem('starwolf_crossfade') || "1.5";
    if (crossfadeSlider && crossfadeValueLabel) {
        crossfadeSlider.value = savedCrossfade;
        crossfadeValueLabel.textContent = `${savedCrossfade}s`;
    }
}

crossfadeSlider?.addEventListener('input', (e) => {
    const currentVal = e.target.value;
    crossfadeValueLabel.textContent = `${currentVal}s`;
    localStorage.setItem('starwolf_crossfade', currentVal);
});

// =========================================================
// 8. LOGICA DE REPRODUCCIÓN (PLAYBACK CORE)
// =========================================================
async function playTrack(index) {
    currentTrackIndex = index;
    let track = activePlaylist[index];
    let cleanName = cleanTrackName(track.name);
    let section = sectionsByName[track.folder];

    trackTitle.textContent = sideTitle.textContent = cleanName;
    trackArtist.textContent = sideArtist.textContent = `Artista: ${track.folder}`;
    trackAlbum.textContent = sideAlbum.textContent = `Álbum: ${track.folder}`;

    applyCoverToBothSlots(section ? resolveCoverSrc(section.cover) : null);
    updateLikeButton();
    refreshLyricsDisplays();
    loadTrackCover(track, section);
    ensureAudioGraph();
    
    let safePath = `${track.dirPath.split('/').map(encodeURIComponent).join('/')}/${encodeURIComponent(track.name)}`;
    let finalAudioUrl = toMediaUrl(safePath);

    if (finalAudioUrl) {
        if (masterGain && audioCtx) {
            masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
            masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
        }
        
        audioPlayer.src = finalAudioUrl;
        audioPlayer.play().catch(e => console.error(e));
    }

    if (typeof fetchLyricsFromLRCLib === "function") fetchLyricsFromLRCLib(cleanName, track.folder);
    
    // Dibujar la Onda de Audio si está seleccionada
    if (spectrumStyle === "waveform") loadWaveformForTrack(track); 
    else currentWaveformData = null;
    
    // Conectar al sistema operativo y ventanita flotante
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: cleanName,
            artist: track.folder,
            album: track.folder,
            artwork: (section && resolveCoverSrc(section.cover)) 
                ? [{ src: resolveCoverSrc(section.cover), sizes: '512x512', type: 'image/jpeg' }] 
                : []
        });

        navigator.mediaSession.setActionHandler('play', () => btnPlay.click());
        navigator.mediaSession.setActionHandler('pause', () => btnPlay.click());
        navigator.mediaSession.setActionHandler('previoustrack', () => btnPrev.click());
        navigator.mediaSession.setActionHandler('nexttrack', () => btnNext.click());
    }

    renderPlaylistUI();
    renderUpNextList();
}

let isManuallyPausing = false;

btnPlay.addEventListener("click", () => {
    if (!audioPlayer.src) return;
    
    if (audioPlayer.paused) {
        isManuallyPausing = false;
        audioPlayer.play(); 
    } else {
        isManuallyPausing = true;
        btnPlay.textContent = "▶"; 
        
        triggerFade(false, () => {
            if (isManuallyPausing) {
                audioPlayer.pause();
                isManuallyPausing = false;
            }
        });
    }
});

btnNext.addEventListener("click", () => {
    isFadingOut = false;
    goToNextTrack();
});

btnPrev.addEventListener("click", () => {
    if (!activePlaylist || activePlaylist.length === 0) return;
    isFadingOut = false;
    
    if (audioPlayer.currentTime > 3) {
        audioPlayer.currentTime = 0;
    } else {
        let prevIndex = currentTrackIndex - 1 < 0 ? activePlaylist.length - 1 : currentTrackIndex - 1;
        playTrack(isShuffleOn ? getNextIndex() : prevIndex);
    }
});

btnShuffle.addEventListener("click", () => {
    isShuffleOn = !isShuffleOn;
    btnShuffle.style.color = isShuffleOn ? "var(--accent)" : "";
});

btnRepeat.addEventListener("click", () => {
    if (repeatMode === "off") { repeatMode = "all"; btnRepeat.style.color = "var(--accent)"; }
    else if (repeatMode === "all") { repeatMode = "one"; btnRepeat.textContent = "🔂"; }
    else { repeatMode = "off"; btnRepeat.textContent = "🔁"; btnRepeat.style.color = ""; }
});

function getNextIndex() {
    if (!activePlaylist || activePlaylist.length <= 1) return 0;
    let randomIndex;
    do { randomIndex = Math.floor(Math.random() * activePlaylist.length); } 
    while (randomIndex === currentTrackIndex);
    return randomIndex;
}

document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !["INPUT", "TEXTAREA"].includes(e.target.tagName)) {
        e.preventDefault();
        if (document.activeElement?.tagName === "BUTTON") document.activeElement.blur();
        btnPlay.click();
    }
});

audioPlayer.addEventListener("timeupdate", () => {
    timeCurrentEl.textContent = formatTime(audioPlayer.currentTime);

    let fadeTime = parseFloat(localStorage.getItem('starwolf_crossfade') || 1.5);
    if (fadeTime > 0 && audioPlayer.duration > 0 && repeatMode !== "one") {
        let timeRemaining = audioPlayer.duration - audioPlayer.currentTime;
        
        if (timeRemaining <= fadeTime && timeRemaining > 0.1 && !isFadingOut) {
            isFadingOut = true;
            if (!document.hidden) triggerFade(false);
        }
    }
});

audioPlayer.addEventListener("play", () => {
    btnPlay.textContent = "⏸";
    isFadingOut = false; 
    if (audioCtx?.state === "suspended") audioCtx.resume().then(() => triggerFade(true));
    else triggerFade(true);
});

audioPlayer.addEventListener("pause", () => btnPlay.textContent = "▶");
audioPlayer.addEventListener("loadedmetadata", () => timeDurationEl.textContent = formatTime(audioPlayer.duration));
audioPlayer.addEventListener("emptied", () => { timeCurrentEl.textContent = "0:00"; timeDurationEl.textContent = "0:00"; });
audioPlayer.addEventListener("ended", () => {
    isFadingOut = false;
    if (repeatMode === "one") { audioPlayer.currentTime = 0; audioPlayer.play(); return; }
    goToNextTrack();
});

function goToNextTrack() {
    if (!activePlaylist || activePlaylist.length === 0) return;
    if (isShuffleOn) { playTrack(getNextIndex()); return; }

    if (currentTrackIndex >= activePlaylist.length - 1) {
        if (repeatMode === "all") { playTrack(0); return; }
        if (isAutoplayOn) {
            let folderNames = Object.keys(sectionsByName);
            let currentIndex = folderNames.indexOf(currentFolderActive);
            if (currentIndex !== -1 && currentIndex < folderNames.length - 1) {
                let nextFolder = folderNames[currentIndex + 1];
                openFolderSection(nextFolder, sectionsByName[nextFolder].tracks.map(name => ({ name, dirPath: sectionsByName[nextFolder].dirPath, folder: nextFolder })));
                playTrack(0);
                return; 
            }
        }
    } else {
        playTrack(currentTrackIndex + 1);
    }
}

// =========================================================
// 9. LETRAS (LYRICS API)
// =========================================================
function lyricsKey() {
    let track = activePlaylist[currentTrackIndex];
    return track ? `starwolf-lyrics:${track.dirPath}/${track.name}` : null;
}

function refreshLyricsDisplays() {
    let track = activePlaylist[currentTrackIndex];
    let text = track ? (localStorage.getItem(lyricsKey()) || "") : "";
    let title = track ? cleanTrackName(track.name) : "";
    let artist = track ? track.folder : "";

    lyricsTextMain.textContent = lyricsTextSide.textContent = text;
    lyricsPanelTitleMain.textContent = lyricsPanelTitleSide.textContent = title;
    lyricsPanelArtistMain.textContent = artist ? `Artista: ${artist}` : "";
}

async function fetchLyricsFromLRCLib(trackName, artistName) {
    try {
        let tEnc = encodeURIComponent(trackName), aEnc = encodeURIComponent(artistName);
        let res = await fetch(`https://lrclib.net/api/get?track_name=${tEnc}&artist_name=${aEnc}`);
        
        if (!res.ok) {
            let searchRes = await fetch(`https://lrclib.net/api/search?q=${tEnc}`);
            let searchData = await searchRes.json();
            if (searchData && searchData.length > 0) {
                let key = lyricsKey(); 
                if (key) { localStorage.setItem(key, searchData[0].syncedLyrics || searchData[0].plainLyrics || ""); refreshLyricsDisplays(); }
            }
            return;
        }
        
        let data = await res.json();
        let key = lyricsKey(); 
        if (key) { localStorage.setItem(key, data.syncedLyrics || data.plainLyrics || ""); refreshLyricsDisplays(); }
    } catch (e) { console.error("Error LRCLib:", e); }
}

function openLyricsModal() {
    let track = activePlaylist[currentTrackIndex];
    if (!track) { lyricsTrackName.textContent = "Selecciona una canción primero"; lyricsTextarea.value = ""; }
    else {
        lyricsTrackName.textContent = `Letras — ${cleanTrackName(track.name)}`;
        lyricsTextarea.value = localStorage.getItem(lyricsKey()) || "";
    }
    lyricsModal.classList.remove("hidden");
}

btnSaveLyrics.addEventListener("click", () => {
    let key = lyricsKey();
    if (!key) return;
    localStorage.setItem(key, lyricsTextarea.value);
    lyricsModal.classList.add("hidden");
    refreshLyricsDisplays(); 
});

// =========================================================
// 10. RENDERIZADO VISUAL Y LISTAS DE REPRODUCCIÓN
// =========================================================
function applyCoverToBothSlots(coverUrl) {
    setCoverSlot(coverArtImg, coverArtPlaceholder, coverUrl);
    setCoverSlot(sideCoverImg, sideCoverPlaceholder, coverUrl);
    lyricsPanelBg.style.backgroundImage = coverUrl ? `url("${coverUrl}")` : "none";
}

function setCoverSlot(imgEl, placeholderEl, coverUrl) {
    if (coverUrl) { imgEl.src = coverUrl; imgEl.classList.remove("hidden"); placeholderEl.classList.add("hidden"); } 
    else { imgEl.classList.add("hidden"); placeholderEl.classList.remove("hidden"); }
}

function updateSideCoverArt(section) {
    setCoverSlot(sideCoverImg, sideCoverPlaceholder, section ? resolveCoverSrc(section.cover) : null);
}

async function loadTrackCover(track, section) {
    let myToken = ++coverRequestToken;
    let trackCover = null;
    try { trackCover = await window.__TAURI__.core.invoke("get_track_cover", { path: `${track.dirPath}/${track.name}` }); } 
    catch (e) { console.error(e); }
    
    if (myToken !== coverRequestToken) return;
    applyCoverToBothSlots(trackCover || (section ? resolveCoverSrc(section.cover) : null));
}

function renderPlaylistUI() {
    centerTrackList.innerHTML = "";
    activePlaylist.forEach((track, index) => {
        let li = document.createElement("li");
        li.className = "center-track-item";
        li.draggable = true; li.dataset.index = index; 
        if (index === currentTrackIndex) li.classList.add("playing-now");

        let cleanName = cleanTrackName(track.name);
        let ext = track.name.split('.').pop();
        let prefix = (index === currentTrackIndex) ? "▶" : (index + 1);
        let liked = isLiked(track);

        li.innerHTML = `
            <span class="track-index">${prefix}</span>
            <span class="track-name" title="${cleanName}">${cleanName}</span>
            <span class="track-badge">${ext.toUpperCase()}</span>
            <button class="track-like-btn ${liked ? "liked" : ""}" title="Me gusta">${heartIconSvg()}</button>
        `;

        li.addEventListener("click", () => playTrack(index));
        li.querySelector(".track-like-btn").addEventListener("click", (e) => { e.stopPropagation(); toggleLike(track); });

        li.addEventListener("dragstart", (e) => { li.classList.add("dragging"); e.dataTransfer.setData("text/plain", index); e.dataTransfer.effectAllowed = "move"; });
        li.addEventListener("dragover", (e) => {
            e.preventDefault(); e.dataTransfer.dropEffect = "move";
            let draggingItem = centerTrackList.querySelector(".dragging") || upNextList.querySelector(".dragging");
            if (!draggingItem || draggingItem === li) return;
            let offset = e.clientY - li.getBoundingClientRect().top - li.getBoundingClientRect().height / 2;
            let placeholder = document.querySelector(".drag-placeholder") || Object.assign(document.createElement("li"), {className: "drag-placeholder"});
            offset > 0 ? li.after(placeholder) : li.before(placeholder);
        });
        li.addEventListener("drop", (e) => handleDrop(e, li, index));
        li.addEventListener("dragend", () => { li.classList.remove("dragging"); document.querySelector(".drag-placeholder")?.remove(); });
        
        centerTrackList.appendChild(li);
    });
}

function renderUpNextList() {
    upNextList.innerHTML = "";
    if (activePlaylist.length === 0) { upNextList.innerHTML = "<li class='empty-msg'>Cola vacía</li>"; return; }

    activePlaylist.forEach((track, i) => {
        let li = document.createElement("li");
        li.className = "up-next-item";
        li.draggable = true; li.dataset.index = i;
        if (i === currentTrackIndex) li.classList.add("playing-now");

        let prefix = (i === currentTrackIndex) ? "▶" : `${i + 1}.`;
        li.innerHTML = `<span class="up-next-title" title="${cleanTrackName(track.name)}">${prefix} ${cleanTrackName(track.name)}</span><span class="up-next-artist">${track.folder}</span>`;
        
        li.addEventListener("click", () => playTrack(i));
        li.addEventListener("dragstart", (e) => { li.classList.add("dragging"); e.dataTransfer.setData("text/plain", i); });
        li.addEventListener("dragover", (e) => {
            e.preventDefault();
            let draggingItem = upNextList.querySelector(".dragging");
            if (draggingItem && draggingItem !== li) {
                let offset = e.clientY - li.getBoundingClientRect().top - li.getBoundingClientRect().height / 2;
                offset > 0 ? li.after(draggingItem) : li.before(draggingItem);
            }
        });
        li.addEventListener("drop", (e) => handleDrop(e, li, i));
        li.addEventListener("dragend", () => li.classList.remove("dragging"));
        upNextList.appendChild(li);
    });
}

function handleDrop(e, li, targetIndex) {
    e.preventDefault();
    document.querySelector(".drag-placeholder")?.remove();
    let sourceIndex = parseInt(e.dataTransfer.getData("text/plain"));
    if (sourceIndex !== targetIndex && !isNaN(sourceIndex) && !isNaN(targetIndex)) {
        let [moved] = activePlaylist.splice(sourceIndex, 1);
        activePlaylist.splice(targetIndex, 0, moved);
        if (sourceIndex === currentTrackIndex) currentTrackIndex = targetIndex;
        else if (sourceIndex < currentTrackIndex && targetIndex >= currentTrackIndex) currentTrackIndex--;
        else if (sourceIndex > currentTrackIndex && targetIndex <= currentTrackIndex) currentTrackIndex++;
        renderPlaylistUI(); renderUpNextList();
    }
}

// =========================================================
// 11. ESPECTRO VISUAL Y FORMA DE ONDA
// =========================================================
let spectrumCtx = spectrumCanvas.getContext("2d");
window.addEventListener("resize", () => {
    let rect = spectrumCanvas.getBoundingClientRect();
    spectrumCanvas.width = rect.width * devicePixelRatio;
    spectrumCanvas.height = rect.height * devicePixelRatio;
});
window.dispatchEvent(new Event("resize"));

async function loadWaveformForTrack(track) {
    if (!track) { currentWaveformData = null; return; }
    let key = trackKey(track);
    if (waveformCache.has(key)) { currentWaveformData = waveformCache.get(key); return; }

    currentWaveformData = null;
    let myToken = ++waveformLoadToken;
    try {
        let safePath = `${track.dirPath.split('/').map(encodeURIComponent).join('/')}/${encodeURIComponent(track.name)}`;
        let url = toMediaUrl(safePath);
        if (!url) return;

        let res = await fetch(url);
        let arrayBuffer = await res.arrayBuffer();
        if (myToken !== waveformLoadToken) return; 

        let tempCtx = new (window.AudioContext || window.webkitAudioContext)();
        let audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
        tempCtx.close();
        if (myToken !== waveformLoadToken) return;

        let raw = audioBuffer.getChannelData(0);
        let blockSize = Math.max(1, Math.floor(raw.length / WAVEFORM_SEGMENTS));
        let peaks = [];
        for (let i = 0; i < WAVEFORM_SEGMENTS; i++) {
            let start = i * blockSize;
            let max = 0;
            for (let j = 0; j < blockSize; j += 8) {
                let v = Math.abs(raw[start + j] || 0);
                if (v > max) max = v;
            }
            peaks.push(max);
        }
        let peakMax = Math.max(...peaks, 0.01);
        let normalized = peaks.map(v => Math.max(0.08, v / peakMax));

        waveformCache.set(key, normalized);
        if (myToken === waveformLoadToken) currentWaveformData = normalized;
    } catch (err) {
        console.error("No se pudo generar la forma de onda:", err);
    }
}

function drawSpectrum() {
    requestAnimationFrame(drawSpectrum);
    let w = spectrumCanvas.width, h = spectrumCanvas.height;
    if (!w || !h) return;
    spectrumCtx.clearRect(0, 0, w, h);
    
    let accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#bb86fc";
    let progressRatio = audioPlayer.duration ? audioPlayer.currentTime / audioPlayer.duration : 0;

    // DIBUJAR ONDA FIJA
    if (spectrumStyle === "waveform" && currentWaveformData) {
        let barCount = currentWaveformData.length;
        let gap = 2;
        let barWidth = Math.max(1, (w / barCount) - gap);
        for (let i = 0; i < barCount; i++) {
            let barHeight = Math.max(h * 0.08, currentWaveformData[i] * h * 0.9);
            spectrumCtx.fillStyle = (i / barCount) <= progressRatio ? accent : "rgba(150,150,150,0.25)";
            spectrumCtx.fillRect(i * (barWidth + gap), (h - barHeight) / 2, barWidth, barHeight);
        }
        return;
    }

    // DIBUJAR BARRAS REACTIVAS (ESPECTRO)
    if (analyser) analyser.getByteFrequencyData(freqData);
    let barCount = 48, barWidth = w / barCount;
    for (let i = 0; i < barCount; i++) {
        let value = freqData ? freqData[i] / 255 : 0;
        let barHeight = Math.max(h * 0.06, value * h);
        spectrumCtx.fillStyle = (i / barCount) <= progressRatio ? accent : "rgba(150,150,150,0.25)";
        spectrumCtx.fillRect(i * barWidth + 1, h - barHeight, barWidth - 2, barHeight);
    }
}
requestAnimationFrame(drawSpectrum);

progressBar.addEventListener("click", (e) => {
    if (!audioPlayer.duration) return;
    audioPlayer.currentTime = ((e.clientX - progressBar.getBoundingClientRect().left) / progressBar.getBoundingClientRect().width) * audioPlayer.duration;
});

if (spectrumStyleSelect) {
    spectrumStyleSelect.addEventListener("change", (e) => {
        spectrumStyle = e.target.value;
        localStorage.setItem("starwolf-spectrum-style", spectrumStyle);
        if (spectrumStyle === "waveform") {
            let track = activePlaylist[currentTrackIndex];
            if (track) loadWaveformForTrack(track); else currentWaveformData = null;
        }
    });
}

// =========================================================
// 12. EVENTOS DE UI (MENÚS Y VISTAS)
// =========================================================
btnToggleSidebar.addEventListener("click", () => appContainer.classList.toggle("hide-sidebar"));

btnViewQueue.addEventListener("click", () => {
    let inFolderView = !folderTracksView.classList.contains("hidden");
    if (inFolderView) {
        showToast("La cola de reproducción solo está disponible en la vista de reproductor");
        return; 
    }
    nowPlayingLayout.classList.toggle("hide-queue");
});

btnBackToPlayer.addEventListener("click", () => { folderTracksView.classList.add("hidden"); nowPlayingView.classList.remove("hidden"); });
btnBackToFolders.addEventListener("click", () => { nowPlayingView.classList.add("hidden"); folderTracksView.classList.remove("hidden"); });

[btnSettings, btnCloseSettings, settingsModal].forEach(el => el.addEventListener("click", (e) => { if(e.target === el || el !== settingsModal) settingsModal.classList.toggle("hidden"); }));
if (btnEq) btnEq.addEventListener("click", () => { ensureAudioGraph(); eqModal.classList.remove("hidden"); });

btnResetEq?.addEventListener("click", () => {
    if (!eqBands.length) return;
    const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    eqBands.forEach(filter => { filter.gain.value = 0; });
    localStorage.setItem("starwolf_eq", JSON.stringify(frequencies.map(() => 0)));
    document.querySelectorAll("#equalizer-container input[type='range']").forEach(slider => { slider.value = 0; });
    document.querySelectorAll("#equalizer-container .eq-val-display").forEach(label => {
        label.innerText = "0.0 dB";
        label.style.color = "var(--text-muted)";
    });
});

[btnCloseEq, eqModal].forEach(el => el?.addEventListener("click", (e) => { if(e.target === el || el !== eqModal) eqModal.classList.add("hidden"); }));
[btnLyricsMain, btnLyricsSide, btnLyrics].forEach(b => b.addEventListener("click", () => { refreshLyricsDisplays(); if(b===btnLyricsMain) lyricsPanelMain.classList.add("active"); else if(b===btnLyricsSide){ sideTrackNormal.classList.add("hidden"); sideLyricsView.classList.add("active");} else openLyricsModal(); }));
[btnCloseLyricsMain, btnCloseLyricsSide, btnCloseLyrics, lyricsModal].forEach(b => b?.addEventListener("click", (e) => { if(e.target===lyricsModal || b!==lyricsModal){ lyricsPanelMain.classList.remove("active"); sideLyricsView.classList.remove("active"); sideTrackNormal.classList.remove("hidden"); lyricsModal.classList.add("hidden"); }}));
[btnEditLyricsMain, btnEditLyricsSide].forEach(b => b.addEventListener("click", openLyricsModal));

document.querySelectorAll(".swatch").forEach(swatch => swatch.addEventListener("click", () => { 
    document.documentElement.style.setProperty("--accent", swatch.dataset.color); 
    document.querySelectorAll(".swatch").forEach(s => s.classList.remove("active")); 
    swatch.classList.add("active"); 
}));

function applyTheme(theme) {
    document.body.classList.toggle("light-theme", theme === "light");
    btnThemeDark.classList.toggle("active", theme === "dark");
    btnThemeLight.classList.toggle("active", theme === "light");
    localStorage.setItem("starwolf-theme", theme);
}
btnThemeDark.addEventListener("click", () => applyTheme("dark"));
btnThemeLight.addEventListener("click", () => applyTheme("light"));

// =========================================================
// 13. MINI REPRODUCTOR FLOTANTE (PICTURE-IN-PICTURE)
// =========================================================

// Configurar el puente de video
if (pipCanvas && pipVideo) {
    const pipStream = pipCanvas.captureStream(30); // 30 FPS
    pipVideo.srcObject = pipStream;
}

// Bucle de dibujo para la ventana flotante
function drawPipFrame() {
    if (!document.pictureInPictureElement) return; // Si no está abierto, no gastar CPU
    requestAnimationFrame(drawPipFrame);

    // 1. Dibujar Carátula o Fondo
    if (!coverArtImg.classList.contains("hidden") && coverArtImg.src) {
        pipCtx.drawImage(coverArtImg, 0, 0, 500, 500);
    } else {
        pipCtx.fillStyle = "#1e1e1e";
        pipCtx.fillRect(0, 0, 500, 500);
        pipCtx.fillStyle = "#bb86fc";
        pipCtx.font = "120px sans-serif";
        pipCtx.textAlign = "center";
        pipCtx.textBaseline = "middle";
        pipCtx.fillText("🎶", 250, 250);
    }

    // 2. Dibujar Espectro inferior
    if (analyser) {
        analyser.getByteFrequencyData(freqData);
        let accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#bb86fc";
        
        pipCtx.fillStyle = "rgba(0, 0, 0, 0.6)"; // Sombra inferior para destacar barras
        pipCtx.fillRect(0, 400, 500, 100);
        
        let barCount = 32, barWidth = 500 / barCount;
        for (let i = 0; i < barCount; i++) {
            let value = freqData ? freqData[i] / 255 : 0;
            let barHeight = Math.max(5, value * 90);
            pipCtx.fillStyle = accent;
            pipCtx.fillRect(i * barWidth + 2, 500 - barHeight, barWidth - 4, barHeight);
        }
    }
}

// Evento del Botón
if (btnPipPlayer) {
    btnPipPlayer.addEventListener("click", async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await pipVideo.play();
                drawPipFrame(); // Iniciar animación
                await pipVideo.requestPictureInPicture();
            }
        } catch (error) {
            console.error("Error al abrir reproductor flotante:", error);
            showToast("El reproductor flotante no está soportado o fue bloqueado.");
        }
    });
}

// Reiniciar animación si el usuario pausa y vuelve a reproducir mientras PiP está activo
pipVideo?.addEventListener('enterpictureinpicture', () => {
    drawPipFrame();
});
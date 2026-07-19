let scanBtn = document.getElementById("btn-scan");
let refreshBtn = document.getElementById("btn-refresh");
let folderList = document.getElementById("folder-list");
let centerTrackList = document.getElementById("center-track-list");
let upNextList = document.getElementById("up-next-list");

// Vistas y botones
let nowPlayingView = document.getElementById("now-playing-view");
let folderTracksView = document.getElementById("folder-tracks-view");
let selectedFolderTitle = document.getElementById("selected-folder-title");
let btnBackToPlayer = document.getElementById("btn-back-to-player");
let btnBackToFolders = document.getElementById("btn-back-to-folders");

// Botones de Ocultamiento de paneles
let appContainer = document.getElementById("app-container");
let nowPlayingLayout = document.getElementById("now-playing-layout");
let btnToggleSidebar = document.getElementById("btn-toggle-sidebar");
let btnViewQueue = document.getElementById("btn-view-queue");
let btnSettings = document.getElementById("btn-settings");
let btnCloseSettings = document.getElementById("btn-close-settings");
let settingsModal = document.getElementById("settings-modal");

// Textos del reproductor
let trackTitle = document.getElementById("track-title");
let trackArtist = document.getElementById("track-artist");
let trackAlbum = document.getElementById("track-album");
let sideTitle = document.getElementById("side-title");
let sideArtist = document.getElementById("side-artist");
let sideAlbum = document.getElementById("side-album");

// Carátulas
let coverArtImg = document.getElementById("cover-art-img");
let coverArtPlaceholder = document.getElementById("cover-art-placeholder");
let btnLike = document.getElementById("btn-like");

// Letras
let btnLyrics = document.getElementById("btn-lyrics");
let btnLyricsSide = document.getElementById("btn-lyrics-side");
let btnLyricsMain = document.getElementById("btn-lyrics-main");
let lyricsModal = document.getElementById("lyrics-modal");
let btnCloseLyrics = document.getElementById("btn-close-lyrics");
let lyricsTextarea = document.getElementById("lyrics-textarea");
let lyricsTrackName = document.getElementById("lyrics-track-name");
let btnSaveLyrics = document.getElementById("btn-save-lyrics");

// Letras — overlay difuminado en la vista principal
let lyricsPanelMain = document.getElementById("lyrics-panel-main");
let lyricsTextMain = document.getElementById("lyrics-text-main");
let lyricsPanelTitleMain = document.getElementById("lyrics-panel-title-main");
let lyricsPanelArtistMain = document.getElementById("lyrics-panel-artist-main");
let btnCloseLyricsMain = document.getElementById("btn-close-lyrics-main");
let btnEditLyricsMain = document.getElementById("btn-edit-lyrics-main");

// Letras — panel inline debajo de la carátula en la vista de carpeta
let sideTrackNormal = document.getElementById("side-track-normal");
let sideLyricsView = document.getElementById("side-lyrics-view");
let lyricsTextSide = document.getElementById("lyrics-text-side");
let lyricsPanelTitleSide = document.getElementById("lyrics-panel-title-side");
let btnCloseLyricsSide = document.getElementById("btn-close-lyrics-side");
let btnEditLyricsSide = document.getElementById("btn-edit-lyrics-side");

// Carátula del panel lateral (vista de carpeta)
let sideCoverImg = document.getElementById("side-cover-img");
let sideCoverPlaceholder = document.getElementById("side-cover-placeholder");

// Motor de audio
let audioPlayer = document.getElementById("audio-player");
let btnPlay = document.getElementById("btn-play");
let btnPrev = document.getElementById("btn-prev");
let btnNext = document.getElementById("btn-next");
let btnShuffle = document.getElementById("btn-shuffle");
let btnRepeat = document.getElementById("btn-repeat");
let btnAutoplay = document.getElementById("btn-autoplay");
let volumeSlider = document.getElementById("volume-slider");
let progressBar = document.getElementById("progress-bar");
let spectrumCanvas = document.getElementById("spectrum-canvas");

let isShuffleOn = false;
let repeatMode = "off"; // off -> all -> one -> off
let isAutoplayOn = true;
let sectionsByName = {};

// ESTADO GLOBAL
let activePlaylist = []; 
let currentFolderActive = "";
let savedFolderPath = ""; 
let currentTrackIndex = -1;

function toAssetUrl(path) {
    if (!path) return null;
    try {
        return window.__TAURI__.core.convertFileSrc(path);
    } catch (error) {
        console.error("No se pudo convertir la ruta a URL de asset:", error);
        return null;
    }
}

// Las carátulas pueden venir como ruta de archivo (imagen suelta) o como
// data:URI (carátula incrustada extraída del propio track). Solo las rutas
// de archivo deben pasar por convertFileSrc; el data:URI se usa tal cual.
function resolveCoverSrc(cover) {
    if (!cover) return null;
    if (cover.startsWith("data:")) return cover;
    return toAssetUrl(cover);
}

function folderIconSvg() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>`;
}

function heartIconSvg() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg>`;
}

// ME GUSTA (persistente en localStorage)
function getLikedTracks() {
    try { return JSON.parse(localStorage.getItem("starwolf-likes") || "[]"); }
    catch (error) { return []; }
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
    refreshLikedCard();
}

function cleanTrackName(filename) {
    let name = filename;
    name = name.replace(/\.[a-zA-Z0-9]+$/, ""); 
    name = name.replace(/\[.*?\]/g, ""); 
    name = name.replace(/\(.*?(downloader|y2mate|kbps).*?\)/gi, "");
    name = name.replace(/[-_]?\s*\d{2,3}\s*kbps/gi, ""); 
    name = name.replace(/[a-zA-Z0-9-]+\.[a-zA-Z]{2,4}\s*-\s*/gi, "");
    name = name.replace(/_/g, " "); 
    name = name.replace(/\s+/g, " ").trim();
    name = name.replace(/^[-]+|[-]+$/g, "").trim(); 
    return name || "Pista Desconocida";
}

// LÓGICA DE PANELES OCULTABLES
btnToggleSidebar.addEventListener("click", () => {
    appContainer.classList.toggle("hide-sidebar");
});
// Botón del footer: única fuente de verdad para mostrar/ocultar la cola
btnViewQueue.addEventListener("click", () => {
    const comingFromFolderView = !folderTracksView.classList.contains("hidden");
    folderTracksView.classList.add("hidden");
    nowPlayingView.classList.remove("hidden");
    if (comingFromFolderView) {
        nowPlayingLayout.classList.remove("hide-queue");
    } else {
        nowPlayingLayout.classList.toggle("hide-queue");
    }
});

// AJUSTES
btnSettings.addEventListener("click", () => settingsModal.classList.remove("hidden"));
btnCloseSettings.addEventListener("click", () => settingsModal.classList.add("hidden"));
settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) settingsModal.classList.add("hidden");
});
document.querySelectorAll(".swatch").forEach((swatch) => {
    swatch.addEventListener("click", () => {
        document.documentElement.style.setProperty("--accent", swatch.dataset.color);
        document.querySelectorAll(".swatch").forEach((s) => s.classList.remove("active"));
        swatch.classList.add("active");
    });
});

// TEMA CLARO / OSCURO
let btnThemeDark = document.getElementById("btn-theme-dark");
let btnThemeLight = document.getElementById("btn-theme-light");

function applyTheme(theme) {
    document.body.classList.toggle("light-theme", theme === "light");
    btnThemeDark.classList.toggle("active", theme === "dark");
    btnThemeLight.classList.toggle("active", theme === "light");
    localStorage.setItem("starwolf-theme", theme);
}
btnThemeDark.addEventListener("click", () => applyTheme("dark"));
btnThemeLight.addEventListener("click", () => applyTheme("light"));
applyTheme(localStorage.getItem("starwolf-theme") || "dark");

scanBtn.addEventListener("click", async () => {
    try {
        const { invoke } = window.__TAURI__.core;
        folderList.innerHTML = "<p style='color: #888; font-size: 13px; padding: 10px;'>⏳ Analizando...</p>";
        const result = await invoke("select_and_scan_music");
        if (!result) { folderList.innerHTML = ""; return; }

        savedFolderPath = result.path;
        refreshBtn.classList.remove("hidden");
        processAndRenderFolders(result.sections);
    } catch (error) { console.error(error); }
});

refreshBtn.addEventListener("click", async () => {
    if (!savedFolderPath) return;
    try {
        const { invoke } = window.__TAURI__.core;
        const sections = await invoke("refresh_music_folder", { folderPath: savedFolderPath });
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
        let coverHtml = coverUrl
            ? `<img src="${coverUrl}" alt="${section.name}" />`
            : folderIconSvg();

        card.innerHTML = `
            <div class="folder-cover-placeholder">${coverHtml}</div>
            <div class="folder-card-info">
                <span class="folder-card-name">${section.name}</span>
                <span class="folder-card-count">${section.count} pistas</span>
            </div>
        `;

        card.addEventListener("click", () => {
            openFolderSection(section.name, section.tracks.map(name => ({ name, dirPath: section.dirPath, folder: section.name })));
        });

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

// Tarjeta especial "Me gusta" que se antepone a la biblioteca
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
function refreshLikedCard() {
    if (document.getElementById("liked-folder-card")) renderLikedCard();
    renderPlaylistUI();
    renderUpNextList();
    updateLikeButton();
}

async function playTrack(index) {
    currentTrackIndex = index;
    let track = activePlaylist[index];
    let cleanName = cleanTrackName(track.name);
    let section = sectionsByName[track.folder];

    trackTitle.textContent = cleanName;
    trackArtist.textContent = `Artista: ${track.folder}`;
    trackAlbum.textContent = `Álbum: ${track.folder}`;
    sideTitle.textContent = cleanName;
    sideArtist.textContent = `Artista: ${track.folder}`;
    sideAlbum.textContent = `Álbum: ${track.folder}`;

    applyCoverToBothSlots(section ? resolveCoverSrc(section.cover) : null); // provisional, mientras llega la de la pista
    updateLikeButton();
    refreshLyricsDisplays(); // si el overlay o el panel lateral están abiertos, se actualizan a la nueva canción
    loadTrackCover(track, section); // async: reemplaza por la carátula propia de ESTA canción si existe

    ensureAudioGraph();
    let assetUrl = toAssetUrl(`${track.dirPath}/${track.name}`);
    if (assetUrl) {
        audioPlayer.src = assetUrl;
        audioPlayer.play().catch((error) => console.error("No se pudo reproducir:", error));
    }

    // RE-DIBUJAMOS AMBAS LISTAS PARA APLICAR EL EFECTO NEÓN A LA CANCIÓN ACTUAL
    renderPlaylistUI();
    renderUpNextList();
    
    folderTracksView.classList.add("hidden");
    nowPlayingView.classList.remove("hidden");
}

// Cada canción puede traer su propia carátula incrustada (distinta a la de
// sus hermanas de carpeta). La pedimos al backend de forma asíncrona y,
// si existe, sustituye a la portada "provisional" de la carpeta.
let coverRequestToken = 0;
async function loadTrackCover(track, section) {
    let myToken = ++coverRequestToken;
    let trackCover = null;
    try {
        const { invoke } = window.__TAURI__.core;
        trackCover = await invoke("get_track_cover", { path: `${track.dirPath}/${track.name}` });
    } catch (error) {
        console.error("No se pudo leer la carátula de la pista:", error);
    }
    if (myToken !== coverRequestToken) return; // el usuario ya cambió de canción, ignorar respuesta vieja

    let coverUrl = trackCover || (section ? resolveCoverSrc(section.cover) : null);
    applyCoverToBothSlots(coverUrl);
}

function applyCoverToBothSlots(coverUrl) {
    setCoverSlot(coverArtImg, coverArtPlaceholder, coverUrl);
    setCoverSlot(sideCoverImg, sideCoverPlaceholder, coverUrl);
}

function setCoverSlot(imgEl, placeholderEl, coverUrl) {
    if (coverUrl) {
        imgEl.src = coverUrl;
        imgEl.classList.remove("hidden");
        placeholderEl.classList.add("hidden");
    } else {
        imgEl.classList.add("hidden");
        placeholderEl.classList.remove("hidden");
    }
}

function updateCoverArt(section) {
    setCoverSlot(coverArtImg, coverArtPlaceholder, section ? resolveCoverSrc(section.cover) : null);
}

function updateSideCoverArt(section) {
    setCoverSlot(sideCoverImg, sideCoverPlaceholder, section ? resolveCoverSrc(section.cover) : null);
}

function updateLikeButton() {
    let track = activePlaylist[currentTrackIndex];
    btnLike.classList.toggle("liked", !!track && isLiked(track));
}
btnLike.addEventListener("click", () => {
    let track = activePlaylist[currentTrackIndex];
    if (!track) return;
    toggleLike(track);
});

function renderUpNextList() {
    upNextList.innerHTML = "";
    if (activePlaylist.length === 0) {
        upNextList.innerHTML = "<li class='empty-msg'>Cola vacía</li>";
        return;
    }

    // Dibujamos TODAS las canciones de la cola para que puedas explorarla
    activePlaylist.forEach((track, i) => {
        let cleanName = cleanTrackName(track.name);
        let li = document.createElement("li");
        li.className = "up-next-item";
        
        // Magia Neón si es la actual
        if (i === currentTrackIndex) {
            li.classList.add("playing-now");
        }
        
        // Usamos un ícono de ▶ si es la actual, si no, su número de lista
        let prefix = (i === currentTrackIndex) ? "▶" : `${i + 1}.`;

        li.innerHTML = `
            <span class="up-next-title" title="${cleanName}">${prefix} ${cleanName}</span>
            <span class="up-next-artist">${track.folder}</span>
        `;
        li.addEventListener("click", () => playTrack(i));
        upNextList.appendChild(li);
    });

    // Auto-scroll para que la canción actual siempre se vea al abrir la lista
    setTimeout(() => {
        let playingItem = upNextList.querySelector(".playing-now");
        if(playingItem) playingItem.scrollIntoView({behavior: "smooth", block: "center"});
    }, 100);
}

function renderPlaylistUI() {
    centerTrackList.innerHTML = "";
    activePlaylist.forEach((track, index) => {
        let li = document.createElement("li");
        li.className = "center-track-item";
        li.draggable = true; li.dataset.index = index; 

        // Magia Neón si es la actual
        if (index === currentTrackIndex) {
            li.classList.add("playing-now");
        }

        let cleanName = cleanTrackName(track.name);
        let ext = track.name.split('.').pop();
        let simulatedDuration = ["3:12", "4:05", "2:45", "3:58", "5:21"][index % 5];
        
        let prefix = (index === currentTrackIndex) ? "▶" : (index + 1);
        let liked = isLiked(track);

        li.innerHTML = `
            <span class="track-index">${prefix}</span>
            <span class="track-name" title="${cleanName}">${cleanName}</span>
            <span class="track-badge">${ext.toUpperCase()}</span>
            <span class="track-duration">${simulatedDuration}</span>
            <button class="track-like-btn ${liked ? "liked" : ""}" title="Me gusta">${heartIconSvg()}</button>
        `;

        li.addEventListener("click", () => playTrack(index));
        li.querySelector(".track-like-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            toggleLike(track);
        });

        li.addEventListener("dragstart", (e) => { li.classList.add("dragging"); e.dataTransfer.setData("text/plain", index); });
        li.addEventListener("dragover", (e) => {
            e.preventDefault();
            let draggingItem = centerTrackList.querySelector(".dragging");
            if (draggingItem && draggingItem !== li) {
                let bounding = li.getBoundingClientRect();
                let offset = e.clientY - bounding.top - bounding.height / 2;
                if (offset > 0) li.after(draggingItem); else li.before(draggingItem);
            }
        });
        li.addEventListener("drop", (e) => {
            e.preventDefault();
            let sourceIndex = parseInt(e.dataTransfer.getData("text/plain"));
            let targetIndex = parseInt(li.dataset.index);
            if (sourceIndex !== targetIndex) {
                let [movedTrack] = activePlaylist.splice(sourceIndex, 1);
                activePlaylist.splice(targetIndex, 0, movedTrack);
                
                if (sourceIndex === currentTrackIndex) currentTrackIndex = targetIndex;
                else if (sourceIndex < currentTrackIndex && targetIndex >= currentTrackIndex) currentTrackIndex--;
                else if (sourceIndex > currentTrackIndex && targetIndex <= currentTrackIndex) currentTrackIndex++;
                
                renderPlaylistUI();
                renderUpNextList();
            }
        });
        li.addEventListener("dragend", () => { li.classList.remove("dragging"); });
        centerTrackList.appendChild(li);
    });
}

btnBackToPlayer.addEventListener("click", () => {
    folderTracksView.classList.add("hidden");
    nowPlayingView.classList.remove("hidden");
});

btnBackToFolders.addEventListener("click", () => {
    nowPlayingView.classList.add("hidden");
    folderTracksView.classList.remove("hidden");
});

// MOTOR DE AUDIO

function setPlayIcon(isPlaying) {
    btnPlay.textContent = isPlaying ? "⏸" : "▶";
}

btnPlay.addEventListener("click", () => {
    if (!audioPlayer.src) return;
    if (audioPlayer.paused) {
        audioPlayer.play().catch((error) => console.error("No se pudo reproducir:", error));
    } else {
        audioPlayer.pause();
    }
});
audioPlayer.addEventListener("play", () => setPlayIcon(true));
audioPlayer.addEventListener("pause", () => setPlayIcon(false));

btnPrev.addEventListener("click", () => {
    if (activePlaylist.length === 0) return;
    let prevIndex = currentTrackIndex - 1;
    if (prevIndex < 0) prevIndex = activePlaylist.length - 1;
    playTrack(prevIndex);
});

btnNext.addEventListener("click", () => {
    if (activePlaylist.length === 0) return;
    playTrack(getNextIndex());
});

function getNextIndex() {
    if (isShuffleOn && activePlaylist.length > 1) {
        let randomIndex;
        do { randomIndex = Math.floor(Math.random() * activePlaylist.length); }
        while (randomIndex === currentTrackIndex);
        return randomIndex;
    }
    return (currentTrackIndex + 1) % activePlaylist.length;
}

audioPlayer.addEventListener("ended", () => {
    if (repeatMode === "one") {
        audioPlayer.currentTime = 0;
        audioPlayer.play();
        return;
    }
    if (!isAutoplayOn) return;
    if (activePlaylist.length === 0) return;
    if (!isShuffleOn && currentTrackIndex >= activePlaylist.length - 1) {
        if (repeatMode === "all") playTrack(0);
        return;
    }
    playTrack(getNextIndex());
});

// ALEATORIO / REPETIR / AUTOPLAY
btnShuffle.addEventListener("click", () => {
    isShuffleOn = !isShuffleOn;
    btnShuffle.classList.toggle("active", isShuffleOn);
});
const REPEAT_MODES = ["off", "all", "one"];
const REPEAT_TITLES = { off: "Repetir desactivado", all: "Repetir carpeta", one: "Repetir canción" };
btnRepeat.addEventListener("click", () => {
    let nextIndex = (REPEAT_MODES.indexOf(repeatMode) + 1) % REPEAT_MODES.length;
    repeatMode = REPEAT_MODES[nextIndex];
    btnRepeat.classList.toggle("active", repeatMode !== "off");
    btnRepeat.classList.toggle("repeat-one", repeatMode === "one");
    btnRepeat.title = REPEAT_TITLES[repeatMode];
});
btnAutoplay.addEventListener("click", () => {
    isAutoplayOn = !isAutoplayOn;
    btnAutoplay.classList.toggle("active", isAutoplayOn);
});

// VOLUMEN
audioPlayer.volume = volumeSlider.value / 100;
volumeSlider.addEventListener("input", () => {
    audioPlayer.volume = volumeSlider.value / 100;
});

// ESPECTRO DE AUDIO (bajos/altos) COMO BARRA DE PROGRESO
let audioCtx = null, analyser = null, sourceNode = null, freqData = null;

function ensureAudioGraph() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        sourceNode = audioCtx.createMediaElementSource(audioPlayer);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;
        freqData = new Uint8Array(analyser.frequencyBinCount);
        sourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);
    } catch (error) {
        console.error("No se pudo iniciar el analizador de audio:", error);
    }
}
audioPlayer.addEventListener("play", () => { if (audioCtx && audioCtx.state === "suspended") audioCtx.resume(); });

function resizeSpectrumCanvas() {
    let rect = spectrumCanvas.getBoundingClientRect();
    spectrumCanvas.width = rect.width * devicePixelRatio;
    spectrumCanvas.height = rect.height * devicePixelRatio;
}
window.addEventListener("resize", resizeSpectrumCanvas);
resizeSpectrumCanvas();

let spectrumCtx = spectrumCanvas.getContext("2d");
function drawSpectrum() {
    requestAnimationFrame(drawSpectrum);
    let w = spectrumCanvas.width, h = spectrumCanvas.height;
    if (!w || !h) return;
    spectrumCtx.clearRect(0, 0, w, h);

    let accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#bb86fc";
    let progressRatio = (audioPlayer.duration) ? audioPlayer.currentTime / audioPlayer.duration : 0;

    if (analyser) analyser.getByteFrequencyData(freqData);

    let barCount = 48;
    let barWidth = w / barCount;
    for (let i = 0; i < barCount; i++) {
        let value = freqData ? freqData[i] / 255 : 0;
        let barHeight = Math.max(h * 0.06, value * h);
        let x = i * barWidth;
        let isPast = (i / barCount) <= progressRatio;
        spectrumCtx.fillStyle = isPast ? accent : "rgba(150,150,150,0.25)";
        spectrumCtx.fillRect(x + 1, h - barHeight, barWidth - 2, barHeight);
    }
}
requestAnimationFrame(drawSpectrum);

progressBar.addEventListener("click", (e) => {
    if (!audioPlayer.duration) return;
    let rect = progressBar.getBoundingClientRect();
    let ratio = (e.clientX - rect.left) / rect.width;
    audioPlayer.currentTime = ratio * audioPlayer.duration;
});

// LETRAS
function lyricsKey() {
    let track = activePlaylist[currentTrackIndex];
    return track ? `starwolf-lyrics:${track.dirPath}/${track.name}` : null;
}

// Mantiene sincronizado el texto mostrado (overlay principal + panel lateral)
// con la canción actual. Se llama al abrir cualquiera de las dos vistas, al
// guardar desde el modal de edición, y al cambiar de canción.
function refreshLyricsDisplays() {
    let track = activePlaylist[currentTrackIndex];
    let text = track ? (localStorage.getItem(lyricsKey()) || "") : "";
    let title = track ? cleanTrackName(track.name) : "";
    let artist = track ? track.folder : "";

    lyricsTextMain.textContent = text;
    lyricsPanelTitleMain.textContent = title;
    lyricsPanelArtistMain.textContent = artist ? `Artista: ${artist}` : "";

    lyricsTextSide.textContent = text;
    lyricsPanelTitleSide.textContent = title;
}

// Overlay difuminado sobre la carátula (vista "Ver Reproductor")
btnLyricsMain.addEventListener("click", () => {
    refreshLyricsDisplays();
    lyricsPanelMain.classList.add("active");
});
btnCloseLyricsMain.addEventListener("click", () => lyricsPanelMain.classList.remove("active"));
btnEditLyricsMain.addEventListener("click", () => openLyricsModal());

// Panel inline debajo de la carátula (vista de carpeta)
btnLyricsSide.addEventListener("click", () => {
    refreshLyricsDisplays();
    sideTrackNormal.classList.add("hidden");
    sideLyricsView.classList.add("active");
});
btnCloseLyricsSide.addEventListener("click", () => {
    sideLyricsView.classList.remove("active");
    sideTrackNormal.classList.remove("hidden");
});
btnEditLyricsSide.addEventListener("click", () => openLyricsModal());

// Acceso rápido del footer: sigue abriendo directamente el editor
btnLyrics.addEventListener("click", () => openLyricsModal());

function openLyricsModal() {
    let track = activePlaylist[currentTrackIndex];
    if (!track) { lyricsTrackName.textContent = "Selecciona una canción primero"; lyricsTextarea.value = ""; }
    else {
        lyricsTrackName.textContent = `Letras — ${cleanTrackName(track.name)}`;
        lyricsTextarea.value = localStorage.getItem(lyricsKey()) || "";
    }
    lyricsModal.classList.remove("hidden");
}
btnCloseLyrics.addEventListener("click", () => lyricsModal.classList.add("hidden"));
lyricsModal.addEventListener("click", (e) => { if (e.target === lyricsModal) lyricsModal.classList.add("hidden"); });
btnSaveLyrics.addEventListener("click", () => {
    let key = lyricsKey();
    if (!key) return;
    localStorage.setItem(key, lyricsTextarea.value);
    lyricsModal.classList.add("hidden");
    refreshLyricsDisplays(); // si el overlay/panel siguen abiertos, se actualizan sin tener que reabrirlos
});
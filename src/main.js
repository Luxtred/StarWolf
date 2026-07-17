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
let btnToggleQueue = document.getElementById("btn-toggle-queue");

// Textos del reproductor
let trackTitle = document.getElementById("track-title");
let trackArtist = document.getElementById("track-artist");
let trackAlbum = document.getElementById("track-album");
let sideTitle = document.getElementById("side-title");
let sideArtist = document.getElementById("side-artist");
let sideAlbum = document.getElementById("side-album");

// ESTADO GLOBAL
let activePlaylist = []; 
let currentFolderActive = "";
let savedFolderPath = ""; 
let currentTrackIndex = -1;

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
btnToggleQueue.addEventListener("click", () => {
    nowPlayingLayout.classList.toggle("hide-queue");
});

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
    if (sections.length === 0) {
        folderList.innerHTML = "<p style='color: #888; font-size: 13px; padding: 10px;'>Vacío</p>";
        return;
    }

    sections.forEach(section => {
        let card = document.createElement("div");
        card.className = "folder-card";
        card.innerHTML = `
            <div class="folder-cover-placeholder">📁</div>
            <div class="folder-card-info">
                <span class="folder-card-name">${section.name}</span>
                <span class="folder-card-count">${section.count} pistas</span>
            </div>
        `;

        card.addEventListener("click", () => {
            nowPlayingView.classList.add("hidden");
            folderTracksView.classList.remove("hidden");
            selectedFolderTitle.textContent = section.name;
            currentFolderActive = section.name;
            activePlaylist = [...section.tracks];
            btnBackToFolders.classList.remove("hidden");
            renderPlaylistUI();
        });

        folderList.appendChild(card);
    });
}

function playTrack(index) {
    currentTrackIndex = index;
    let track = activePlaylist[index];
    let cleanName = cleanTrackName(track);

    trackTitle.textContent = cleanName;
    trackArtist.textContent = `Artista: OMA / ${currentFolderActive}`;
    trackAlbum.textContent = `Álbum: ${currentFolderActive}`;
    sideTitle.textContent = cleanName;
    sideArtist.textContent = `Artista: OMA / ${currentFolderActive}`;
    sideAlbum.textContent = `Álbum: ${currentFolderActive}`;
    
    // RE-DIBUJAMOS AMBAS LISTAS PARA APLICAR EL EFECTO NEÓN A LA CANCIÓN ACTUAL
    renderPlaylistUI();
    renderUpNextList();
    
    folderTracksView.classList.add("hidden");
    nowPlayingView.classList.remove("hidden");
}

function renderUpNextList() {
    upNextList.innerHTML = "";
    if (activePlaylist.length === 0) {
        upNextList.innerHTML = "<li class='empty-msg'>Cola vacía</li>";
        return;
    }

    // Dibujamos TODAS las canciones de la cola para que puedas explorarla
    activePlaylist.forEach((track, i) => {
        let cleanName = cleanTrackName(track);
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
            <span class="up-next-artist">${currentFolderActive}</span>
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

        let cleanName = cleanTrackName(track);
        let ext = track.split('.').pop();
        let simulatedDuration = ["3:12", "4:05", "2:45", "3:58", "5:21"][index % 5];
        
        let prefix = (index === currentTrackIndex) ? "▶" : (index + 1);

        li.innerHTML = `
            <span class="track-index">${prefix}</span>
            <span class="track-name" title="${cleanName}">${cleanName}</span>
            <span class="track-badge">${ext.toUpperCase()}</span>
            <span class="track-duration">${simulatedDuration}</span>
        `;

        li.addEventListener("click", () => playTrack(index));

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
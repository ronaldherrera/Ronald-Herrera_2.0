console.log("INICIO SCRIPT v5.4 (Simulado)");
var appMode = 'manual'; 

function setAppMode(mode, sendToServer = true) {
    appMode = mode;
    var manualView = document.getElementById('manual-view');
    var autoView = document.getElementById('auto-view');
    var btnManual = document.getElementById('btn-manual');
    var btnAuto = document.getElementById('btn-auto');
    var pill = document.getElementById('mode-pill');
    
    if(!manualView || !autoView || !btnManual || !btnAuto || !pill) return;
    
    if(mode === 'auto') {
        manualView.classList.add('hidden');
        autoView.classList.remove('hidden');
        btnManual.classList.remove('active');
        btnAuto.classList.add('active');
        pill.style.transform = 'translateX(100%)';
    } else {
        manualView.classList.remove('hidden');
        autoView.classList.add('hidden');
        btnManual.classList.add('active');
        btnAuto.classList.remove('active');
        pill.style.transform = 'translateX(0%)';
    }

    if(sendToServer) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "/set_mode?val=" + (mode === 'auto' ? 1 : 0), true);
        xhr.send();
    }
}

var globalData = [];
var globalStatus = null;
var PWM_MAX = 1023;
var loadTimer = null; 
var isScanning = false; 

function log(msg) {
    console.log("[App Log]:", msg);
}

function pwmToSlider(pwm) {
    if(pwm == 0) return 0;
    if(pwm < 30) return 1; 
    var val = (pwm - 30) * 99.0 / (PWM_MAX - 30) + 1;
    if(val > 100) val = 100;
    return Math.round(val);
}

function createCard(c) {
    var percent = pwmToSlider(c.target);
    var actualP = pwmToSlider(c.actual);
    return `
    <div class="channel-card" id="card-${c.id}" style="--ch-color: ${c.color}; --ch-glow: ${c.color}66;">
        <div class="card-header">
            <span class="channel-name" id="name-${c.id}" onclick="editChannel(${c.id})">${c.name}</span>
            <div class="info-btn" onclick="toggleInfo(${c.id})">i</div>
        </div>
        <div class="slider-wrapper">
            <div class="track-bg"></div>
            <div class="track-fill" id="track-${c.id}" style="width: ${percent}%;"></div>
            <div class="thumb-shadow" id="thumb-${c.id}" style="left: calc(9px + (100% - 18px) * (${actualP} / 100));"></div>
            <input type="range" min="0" max="100" value="${percent}" class="slider-target" id="slider-${c.id}" oninput="updateSlider(${c.id}, this.value)" onchange="saveBrightness(${c.id}, this.value)">
        </div>
        <div style="display: flex; justify-content: flex-end; margin-top: -5px;">
            <span class="channel-perc" id="perc-${c.id}">${percent}%</span>
        </div>
        <div class="info-panel" id="info-${c.id}">
             <div style="display: flex; gap: 10px; align-items: center;">
                <span style="color:#aaa;">GPIO ${c.pin}</span>
                <span style="color:#fff;">PWM: <span id="val-${c.id}">${c.target} / ${c.actual}</span></span>
             </div>
             <div class="info-close" onclick="toggleInfo(${c.id})">✕</div>
        </div>
    </div>`;
}

window.onload = function() {
    log("JS v5.4 Cargado - Simulación");
    startDataLoop();
};

function startDataLoop() {
    if(loadTimer) clearInterval(loadTimer);
    loadData();
    loadTimer = setInterval(loadData, 1000); // 1s en simulación para más fluidez
}

function stopDataLoop() {
    if(loadTimer) clearInterval(loadTimer);
    loadTimer = null;
}

function updateWifiUI(ssid, ip) {
    var divConn = document.getElementById("wifi_connected");
    var divDisc = document.getElementById("wifi_disconnected");
    if(ssid && ip !== "---") {
        if(divConn) divConn.style.display = "block";
        if(divDisc) divDisc.style.display = "none";
        document.getElementById("curr_ssid").innerText = ssid;
        document.getElementById("wifi_ip").innerText = ip;
    } else {
        if(divConn) divConn.style.display = "none";
        if(divDisc) divDisc.style.display = "block";
    }
}

function loadData() {
    if(isScanning) return; 
    
    // Persistencia de Sesión: Cargar de LocalStorage
    var localStatus = localStorage.getItem("aquarium_status");
    var currentPid = 0;
    if(localStatus) {
        try { currentPid = JSON.parse(localStatus).currentProfile || 0; } catch(e){}
    }
    var localDataStr = localStorage.getItem("aquarium_profile_" + currentPid + "_data");

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            try {
                var response = JSON.parse(this.responseText);
                
                // SOLO sobreescribir globalData si NO estamos editando el modal de programación
                if(!isEditingSched) {
                    globalStatus = response;
                    globalData = response.channels;
                } else {
                    // Si estamos editando, solo actualizamos datos de sistema (temp, fan) que no afectan a los canales
                    if(globalStatus) {
                        globalStatus.temp = response.temp;
                        globalStatus.fan = response.fan;
                        globalStatus.time = response.time;
                    }
                }
                
                // Parchear con datos locales si existen
                if(localStatus) {
                    var saved = JSON.parse(localStatus);
                    if(!isEditingSched) {
                        response.currentProfile = saved.currentProfile;
                        if(saved.profileNames) response.profileNames = saved.profileNames;
                        if(saved.profileClouds) response.profileClouds = saved.profileClouds;
                    }
                    if(response) {
                        response.threshold = saved.threshold;
                        response.fanManual = saved.fanManual;
                        // Forzar el ID de perfil si ha cambiado localmente
                        currentPid = response.currentProfile;
                    }
                }
                
                // Cargar datos específicos del perfil actual
                var profileDataKey = "aquarium_profile_" + currentPid + "_data";
                var pDataStr = localStorage.getItem(profileDataKey);

                if(pDataStr && !isEditingSched) {
                    var savedData = JSON.parse(pDataStr);
                    globalData.forEach(ch => {
                        var s = savedData.find(ld => ld.id === ch.id);
                        if(s) {
                            ch.points = s.points;
                            ch.name = s.name;
                            ch.color = s.color;
                            ch.target = s.target; 
                        }
                    });
                }
                
                // Temp & Fan
                var tempEl = document.getElementById("sys_temp");
                if(tempEl) tempEl.innerText = response.temp.toFixed(1) + "°C";
                var fanEl = document.getElementById("sys_fan");
                if(fanEl) fanEl.innerText = response.fan + "%";
                var fsvg = document.getElementById("fan_svg");
                if(fsvg) {
                    if(response.fan > 0) fsvg.classList.add("fan-spinning");
                    else fsvg.classList.remove("fan-spinning");
                }

                // Profile Grid
                var grid = document.getElementById("profile_grid");
                if (grid && response.profileNames) {
                    var html = "";
                    for (var p = 0; p < 12; p++) {
                        var isActive = (p === response.currentProfile);
                        if(isActive) {
                            html += `<div class="rainbow-border" style="height: 50px;" data-content="${p+1}"></div>`;
                        } else {
                            html += `<button class="profile-btn" onclick="selectProfile(${p})">${p+1}</button>`;
                        }
                    }
                    grid.innerHTML = html;
                    document.getElementById("btn_profile_name").innerText = response.profileNames[response.currentProfile] || "PERFIL " + (response.currentProfile + 1);
                }
               // Channels Card Render
                var container = document.getElementById("channels_root");
                if(container) {
                    if(container.innerHTML.indexOf("channel-card") === -1) {
                         var html = "";
                         for(var i=0; i<globalData.length; i++) html += createCard(globalData[i]);
                         container.innerHTML = html;
                    } else {
                        // Update existing
                        for(var i=0; i<globalData.length; i++) {
                            var ch = globalData[i];
                            var perc = pwmToSlider(ch.target);
                            var actualP = pwmToSlider(ch.actual);
                            
                            document.getElementById("name-"+ch.id).innerText = ch.name;
                            document.getElementById("val-"+ch.id).innerText = ch.target + " / " + ch.actual;
                            document.getElementById("perc-"+ch.id).innerText = perc + "%";
                            
                            var slider = document.getElementById("slider-"+ch.id);
                            if(slider && document.activeElement !== slider) slider.value = perc;
                            
                            var track = document.getElementById("track-"+ch.id);
                            if(track) track.style.width = perc + "%";
                            
                            var thumb = document.getElementById("thumb-"+ch.id);
                            if(thumb) thumb.style.left = `calc(11px + (100% - 22px) * (${actualP} / 100))`;
                            
                            var card = document.getElementById("card-"+ch.id);
                            if(card) {
                                card.style.setProperty('--ch-color', ch.color);
                                card.style.setProperty('--ch-glow', ch.color + '44');
                            }
                        }
                    }
                }
                
                if(globalData.length > 0) updateWifiUI(globalData[0].ssid, globalData[0].ip);
                
                requestAnimationFrame(drawMasterGraph);

            } catch(e) { console.error("JSON Err", e); }
        }
    };
    xhr.open("GET", "/status", true);
    xhr.send();
}

function updateSlider(id, val) {
    document.getElementById("perc-"+id).innerText = val + "%";
    document.getElementById("track-"+id).style.width = val + "%";
    
    // Reactividad inmediata para el simulador
    if(globalData) {
        var ch = globalData.find(c => c.id == id);
        if(ch) ch.target = Math.round(val * (PWM_MAX / 100));
    }

    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/set?id=" + id + "&val=" + val, true);
    xhr.send();
}

function saveBrightness(id, val) {
    if(globalData) {
        var ch = globalData.find(c => c.id == id);
        if(ch) ch.target = parseInt(val * (PWM_MAX/100));
    }
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/set?id=" + id + "&val=" + val + "&save=1", true);
    xhr.send();
    saveSession();
}

function updateSpeedName(val) {
    var names = ["Instantáneo", "Normal", "Muy Lento"];
    document.getElementById("speed_text").innerText = names[val];
}

function sendSpeed(val) {
    var ms = [0, 3, 30][val];
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/speed?val=" + ms, true);
    xhr.send();
}

function openVentModal() { 
    if(globalStatus) {
        document.getElementById("v_th").value = globalStatus.threshold;
        document.getElementById("v_th_val").innerText = globalStatus.threshold + "°C";
        document.getElementById("v_hyst").value = globalStatus.fanHyst;
        document.getElementById("v_hyst_val").innerText = globalStatus.fanHyst + "°C";
        document.getElementById("v_max").value = globalStatus.fanMax || 38;
        document.getElementById("v_max_val").innerText = (globalStatus.fanMax || 38) + "°C";
        document.getElementById("v_min").value = globalStatus.fanMin || 60;
        document.getElementById("v_min_val").innerText = (globalStatus.fanMin || 60) + "%";
        document.getElementById("v_freq").value = globalStatus.fanFreq || 30;
        document.getElementById("v_freq_val").innerText = (globalStatus.fanFreq || 30) + " Hz";
        
        updateFanManualButton(globalStatus.fanManual);
    }
    document.getElementById("ventModal").classList.add("open"); 
}
function closeVentModal() { document.getElementById("ventModal").classList.remove("open"); }
function markChanged() { document.querySelector("#ventModal .btn-save").style.background = "#3498db"; }
function saveVent() {
    var v1 = document.getElementById("v_th").value;
    var v2 = document.getElementById("v_hyst").value;
    var v3 = document.getElementById("v_max").value;
    var v4 = document.getElementById("v_min").value;
    var v5 = document.getElementById("v_freq").value;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", `/set_temp?val=${v1}&fhyst=${v2}&fmax=${v3}&fmin=${v4}&ffreq=${v5}`, true);
    xhr.send();
    closeVentModal();
}

function toggleFanManual() {
    globalStatus.fanManual = !globalStatus.fanManual;
    updateFanManualButton(globalStatus.fanManual);
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/set_temp?fman=" + (globalStatus.fanManual ? 1 : 0), true);
    xhr.send();
}

function updateFanManualButton(isActive) {
    var btn = document.getElementById("btn_fan_manual");
    if(!btn) return;
    if(isActive) {
        btn.innerText = "Apagar manual";
        btn.style.background = "#e74c3c";
    } else {
        btn.innerText = "Encender manual";
        btn.style.background = "#333";
    }
}

function openSafetyModal() {
    if(globalStatus) {
        document.getElementById("s_th").value = globalStatus.safetyTh || 40;
        document.getElementById("s_th_val").innerText = (globalStatus.safetyTh || 40) + "°C";
        document.getElementById("s_rec").value = globalStatus.safetyRec || 30;
        document.getElementById("s_rec_val").innerText = (globalStatus.safetyRec || 30) + "°C";
        document.getElementById("s_max").value = globalStatus.safetyMax || 30;
        document.getElementById("s_max_val").innerText = (globalStatus.safetyMax || 30) + "%";
    }
    document.getElementById("safetyModal").classList.add("open");
}
function closeSafetyModal() { document.getElementById("safetyModal").classList.remove("open"); }
function saveSafety() {
    var th = document.getElementById("s_th").value;
    var rec = document.getElementById("s_rec").value;
    var max = document.getElementById("s_max").value;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", `/set_safety?th=${th}&rec=${rec}&max=${max}`, true);
    xhr.send();
    closeSafetyModal();
}

function toggleMenu() {
    document.getElementById("mainMenu").classList.toggle("open");
    document.getElementById("menuOverlay").classList.toggle("open");
    document.querySelector(".settings-icon").classList.toggle("active");
}

function toggleInfo(id) { document.getElementById("info-"+id).classList.toggle("open"); }

function editChannel(id) {
    var ch = globalData.find(c => c.id == id);
    if(ch) {
        document.getElementById("editId").value = id;
        document.getElementById("editName").value = ch.name;
        document.getElementById("editColor").value = ch.color;
        document.getElementById("colorHex").value = ch.color;
        document.getElementById("editModal").classList.add("open");
    }
}
function closeEditModal() { document.getElementById("editModal").classList.remove("open"); }
function updateColorHex(v) { document.getElementById("colorHex").value = v; }
function updateColorPicker(v) { if(v.startsWith("#") && v.length==7) document.getElementById("editColor").value = v; }
function saveEdit() {
    var id = document.getElementById("editId").value;
    var n = document.getElementById("editName").value;
    var c = document.getElementById("editColor").value;
    var ch = globalData.find(ch => ch.id == id);
    if(ch) { ch.name = n; ch.color = c; }
    
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/save?id="+id+"&name="+encodeURIComponent(n)+"&color="+encodeURIComponent(c), true);
    xhr.send();
    closeEditModal();
    saveSession();
}

function selectProfile(id) {
    console.log("Cambiando a perfil:", id);
    if(globalStatus) {
        if(globalStatus.currentProfile !== id) {
            saveSession(); // Guardar datos del perfil antiguo
            globalStatus.currentProfile = id; // Cambiar ID en memoria
            // Persistir inmediatamente para que loadData lo vea
            localStorage.setItem("aquarium_status", JSON.stringify(globalStatus));
            
            // Actualizar el botón de nombre de perfil inmediatamente para feedback visual
            var btnName = document.getElementById("btn_profile_name");
            if(btnName && globalStatus.profileNames) {
                btnName.innerText = globalStatus.profileNames[id] || "PERFIL " + (id + 1);
            }
            
            loadData(); // Forzar carga de datos del nuevo perfil
        }
    }
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/set_profile?id=" + id, true);
    xhr.send();
}

// --- LOGICA MODO AUTO & GRAPH ---
function drawMasterGraph() {
    var canvas = document.getElementById("masterCanvas");
    if(!canvas || globalData.length === 0) return;
    var ctx = canvas.getContext("2d");
    var w = canvas.width = canvas.offsetWidth * 2;
    var h = canvas.height = canvas.offsetHeight * 2;
    ctx.clearRect(0,0,w,h);
    
    var offsetL = 40;
    var offsetB = 30;
    var offsetT = 20;
    var graphW = w - offsetL;
    var graphH = h - offsetB - offsetT;

    // Grid vertical (Horas)
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.font = "16px monospace";
    ctx.fillStyle = "#444";
    for(var i=0; i<=24; i+=2) {
        var x = offsetL + (i/24)*graphW;
        ctx.beginPath(); ctx.moveTo(x, offsetT); ctx.lineTo(x, h - offsetB); ctx.stroke();
        
        // Labels X
        ctx.textAlign = "center";
        ctx.fillText(i, x, h - 8);
    }
    
    // Grid horizontal (%)
    for(var j=0; j<=100; j+=25) {
        var y = h - offsetB - (j/100)*graphH;
        ctx.beginPath(); ctx.moveTo(offsetL, y); ctx.lineTo(w, y); ctx.stroke();
        
        // Labels Y
        ctx.textAlign = "right";
        var lblY = j === 0 ? "0%" : (j === 50 ? "19%" : (j === 100 ? "38%" : ""));
        if(lblY) ctx.fillText(lblY, offsetL - 8, y + 5);
    }
    
    // Dibujar Curvas
    globalData.forEach(ch => {
        var pValues = new Array(25).fill(0); // 24 + 1 para cierre suave
        if(ch.points) ch.points.forEach(pt => pValues[pt.h] = pt.v);
        pValues[24] = pValues[0]; // Ciclo

        ctx.beginPath();
        ctx.strokeStyle = ch.color;
        ctx.lineWidth = 3;
        
        var startX = offsetL;
        var startY = h - offsetB - (pValues[0]/100) * graphH;
        ctx.moveTo(startX, startY);

        for(var i=0; i<24; i++) {
            var x1 = offsetL + (i/24) * graphW;
            var y1 = h - offsetB - (pValues[i]/100) * graphH;
            var x2 = offsetL + ((i+1)/24) * graphW;
            var y2 = h - offsetB - (pValues[i+1]/100) * graphH;

            var xc = (x1 + x2) / 2;
            var yc = (y1 + y2) / 2;
            
            // Usamos quadraticCurveTo para suavizar entre puntos medios
            ctx.quadraticCurveTo(x1, y1, xc, yc);
        }
        ctx.stroke();
        
        // Fill gradient
        var grad = ctx.createLinearGradient(0, offsetT, 0, h - offsetB);
        grad.addColorStop(0, ch.color + "55");
        grad.addColorStop(1, ch.color + "00");
        
        ctx.lineTo(offsetL + graphW, h - offsetB);
        ctx.lineTo(offsetL, h - offsetB);
        ctx.fillStyle = grad;
        ctx.fill();
    });

    // Time Marker
    if(globalStatus && globalStatus.time) {
        var t = globalStatus.time.split(':');
        var hours = parseInt(t[0]);
        var mins = parseInt(t[1]);
        var totalHours = hours + mins/60;
        var x = offsetL + (totalHours/24) * graphW;
        
        ctx.strokeStyle = "#e74c3c";
        ctx.lineWidth = 2;
        ctx.setLineDash([8,6]);
        ctx.beginPath(); ctx.moveTo(x, offsetT); ctx.lineTo(x, h - offsetB); ctx.stroke();
        ctx.setLineDash([]);
        
        var lbl = document.getElementById("time-marker-label");
        if(lbl) {
            lbl.innerText = t[0]+":"+t[1];
            lbl.style.left = (x/w)*100 + "%";
        }
    }
}

// --- LOGICA MODAL PROGRAMACION (NUEVA) ---
var currentEditChannelIdx = 0;
var isEditingSched = false; // Bloquea loadData para evitar sobreescritura
var schedPreviewActive = false;
var schedInterval = null;
var isDrawingSched = false;
var lastHourDraw = -1;
var lastIntensityDraw = -1;
var currentSchedMins = 720;

function openGlobalSched() {
    isEditingSched = true; 
    if(!globalData || globalData.length === 0) {
        log("No hay canales cargados para programar");
        return;
    }
    
    // Generar botones de selección de canales
    var root = document.getElementById("chan_select_root");
    if(!root) {
        log("Error: No se encontró chan_select_root");
        return;
    }
    
    var html = "";
    globalData.forEach((ch, idx) => {
        var active = (idx === currentEditChannelIdx) ? "active" : "";
        html += `
            <button class="chan-btn ${active}" onclick="selectEditChannel(${idx})" style="--ch-color: ${ch.color}; --ch-glow: ${ch.color}44">
                <div class="chan-dot" style="background:${ch.color}"></div>
                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${ch.name}</span>
            </button>
        `;
    });
    
    // Botones de acción integrados en la rejilla
    html += `
        <button class="btn-play grid-action" onclick="previewSchedule()">
            <svg viewBox="0 0 24 24" style="width:24px; height:24px; fill:currentColor;"><path d="M8,5.14V19.14L19,12.14L8,5.14Z"/></svg>
        </button>
        <button class="btn-clear grid-action" onclick="clearSchedule()">
            <svg viewBox="0 0 24 24" style="width:24px; height:24px; fill:currentColor;"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19V4M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>
        </button>
    `;
    
    root.innerHTML = html;
    
    // Posicionar el marcador en la hora real actual
    var _now = new Date();
    currentSchedMins = _now.getHours() * 60 + _now.getMinutes();

    // Sincronizar Sliders
    syncSchedSliders();
    
    var modal = document.getElementById("schedModal");
    if(modal) {
        modal.classList.add("open");
        initSchedEvents(); // Inicializar eventos táctiles
        requestAnimationFrame(drawSchedCanvas);
    }
}

function initSchedEvents() {
    var canvas = document.getElementById("schedCanvas");
    if(!canvas || canvas.dataset.events) return;
    
    canvas.dataset.events = "true";
    
    const handleAction = (e) => {
        var rect = canvas.getBoundingClientRect();
        var clientX = e.touches ? e.touches[0].clientX : e.clientX;
        var clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        var xNorm = (clientX - rect.left) / rect.width;
        var yNorm = 1.0 - (clientY - rect.top) / rect.height;
        
        if(xNorm < 0) xNorm = 0; if(xNorm > 1) xNorm = 1;
        if(yNorm < 0) yNorm = 0; if(yNorm > 1) yNorm = 1;

        if (isDrawingSched) {
            // Modo dibujo: modificar curva (24 horas)
            var hour = Math.round(xNorm * 23); 
            var intensity = Math.round(yNorm * 100);
            
            var ch = globalData[currentEditChannelIdx];
            if(!ch.points) ch.points = [];

            // Interpolación para llenar huecos
            if(lastHourDraw !== -1 && Math.abs(lastHourDraw - hour) > 1) {
                var start = Math.min(lastHourDraw, hour);
                var end = Math.max(lastHourDraw, hour);
                var vStart = (lastHourDraw < hour) ? lastIntensityDraw : intensity;
                var vEnd = (lastHourDraw < hour) ? intensity : lastIntensityDraw;
                for(var h = start + 1; h < end; h++) {
                    var weight = (h - start) / (end - start);
                    var interpV = Math.round(vStart + (vEnd - vStart) * weight);
                    var pIdx = ch.points.findIndex(pt => pt.h === h);
                    if(pIdx >= 0) ch.points[pIdx].v = interpV;
                    else ch.points.push({h: h, v: interpV});
                }
            }

            var pIdx = ch.points.findIndex(pt => pt.h === hour);
            if(pIdx >= 0) ch.points[pIdx].v = intensity;
            else ch.points.push({h: hour, v: intensity});
            
            lastHourDraw = hour;
            lastIntensityDraw = intensity;
            currentSchedMins = hour * 60; // Sincroniza el marcador con el dibujo
        } else {
            // Modo selección: solo mover el marcador
            currentSchedMins = Math.round(xNorm * 1439);
        }
        
        syncSchedSliders(); // Actualiza etiquetas y slider de intensidad
    };

    canvas.addEventListener("mousedown", (e) => { 
        var rect = canvas.getBoundingClientRect();
        var yNorm = 1.0 - (e.clientY - rect.top) / rect.height;
        // Si clica arriba, dibuja. Si clica muy abajo (Timeline), solo selecciona hora.
        isDrawingSched = (yNorm > 0.1); 
        lastHourDraw = -1; 
        handleAction(e); 
    });
    canvas.addEventListener("touchstart", (e) => { 
        var rect = canvas.getBoundingClientRect();
        var yNorm = 1.0 - (e.touches[0].clientY - rect.top) / rect.height;
        isDrawingSched = (yNorm > 0.1);
        lastHourDraw = -1; 
        handleAction(e); 
        e.preventDefault(); 
    }, {passive: false});
    
    window.addEventListener("mousemove", (e) => { if(isDrawingSched || e.buttons === 1) handleAction(e); });
    window.addEventListener("touchmove", (e) => { handleAction(e); if(isDrawingSched) e.preventDefault(); }, {passive: false});
    
    window.addEventListener("mouseup", () => { isDrawingSched = false; lastHourDraw = -1; });
    window.addEventListener("touchend", () => { isDrawingSched = false; lastHourDraw = -1; });
}

function selectEditChannel(idx) {
    saveSession(); 
    currentEditChannelIdx = idx;
    openGlobalSched(); 
}

function syncSchedSliders() {
    var ch = globalData[currentEditChannelIdx];
    var valSlider = document.getElementById("sched_val_slider");
    if(!valSlider) return;

    // Sincronizar checkbox de nubes
    var cloudsCheck = document.getElementById("clouds_check");
    if(cloudsCheck && globalStatus && globalStatus.profileClouds) {
        cloudsCheck.checked = globalStatus.profileClouds[globalStatus.currentProfile] || false;
    }

    // Obtener valor actual para la hora seleccionada
    var h = Math.floor(currentSchedMins / 60);
    var v = 0;
    if(ch.points) {
        var p = ch.points.find(pt => pt.h === h);
        if(p) v = p.v;
    }
    
    valSlider.value = v;
    valSlider.style.setProperty("--edit-color", ch.color);
    
    updateSchedUI(false); 
}

function updateSchedUI(savePoint = true) {
    var valSlider = document.getElementById("sched_val_slider");
    if(!valSlider) return;

    var h = Math.floor(currentSchedMins / 60);
    var m = currentSchedMins % 60;
    
    document.getElementById("sched_hour_lbl").innerText = (h<10?'0':'')+h + ":" + (m<10?'0':'')+m;
    document.getElementById("sched_perc_lbl").innerText = valSlider.value + "%";
    document.getElementById("sched_perc_lbl").style.color = globalData[currentEditChannelIdx].color;
    
    if(savePoint) {
        var ch = globalData[currentEditChannelIdx];
        if(!ch.points) ch.points = [];
        var pIdx = ch.points.findIndex(pt => pt.h === h);
        if(pIdx >= 0) ch.points[pIdx].v = parseInt(valSlider.value);
        else ch.points.push({h: h, v: parseInt(valSlider.value)});
    }
    
    drawSchedCanvas();
    // Enviar actualización a la lámpara en tiempo real
    sendAquariumUpdate(currentSchedMins);
}

function sendAquariumUpdate(mins) {
    if(!window.parent || typeof window.parent.postMessage !== "function") return;
    
    var h = Math.floor(mins / 60);
    var updateData = globalData.map((ch, idx) => {
        var v = 0;
        if(ch.points) {
            var pt = ch.points.find(p => p.h === h);
            if(pt) v = pt.v;
        }
        return {
            id: ch.id || idx,
            brightness: v,
            color: ch.color
        };
    });

    try {
        window.parent.postMessage({
            type: 'AQUARIUM_UPDATE',
            channels: updateData
        }, '*');
    } catch(e) { }
}

function drawSchedCanvas() {
    var canvas = document.getElementById("schedCanvas");
    if(!canvas) return;
    var ctx = canvas.getContext("2d");
    var w = canvas.width = canvas.offsetWidth * 2;
    var h = canvas.height = canvas.offsetHeight * 2;
    ctx.clearRect(0,0,w,h);
    
    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for(var i=0; i<=24; i+=2) {
        var x = (i/24)*w;
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke();
    }
    for(var j=0; j<=100; j+=25) {
        var y = h - (j/100)*h;
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
    }
    
    // Dibujar todas las curvas
    globalData.forEach((ch, idx) => {
        var isCurrent = (idx === currentEditChannelIdx);
        var pValues = new Array(25).fill(0);
        if(ch.points) ch.points.forEach(pt => pValues[pt.h] = pt.v);
        pValues[24] = pValues[0];

        ctx.beginPath();
        // Los canales inactivos se ven con su propio color pero muy atenuados (33)
        ctx.strokeStyle = isCurrent ? ch.color : ch.color + "33";
        ctx.lineWidth = isCurrent ? 5 : 2; 
        ctx.moveTo(0, h - (pValues[0]/100)*h);
        
        for(var i=0; i<24; i++) {
            var x1 = (i/24)*w;
            var y1 = h - (pValues[i]/100)*h;
            var x2 = ((i+1)/24)*w;
            var y2 = h - (pValues[i+1]/100)*h;
            var xc = (x1+x2)/2;
            var yc = (y1+y2)/2;
            ctx.quadraticCurveTo(x1, y1, xc, yc);
        }
        ctx.stroke();
        
        if (isCurrent) {
            var grad = ctx.createLinearGradient(0,0,0,h);
            grad.addColorStop(0, ch.color + "66");
            grad.addColorStop(1, ch.color + "00");
            ctx.lineTo(w, h); ctx.lineTo(0,h);
            ctx.fillStyle = grad;
            ctx.fill();
        }
    });
    
    // Marcador de hora actual (rojo fuerte)
    var markerX = (currentSchedMins/1440)*w;
    ctx.strokeStyle = "#ff3333";
    ctx.lineWidth = 3;
    ctx.setLineDash([]); // Línea sólida para el marcador principal rojo
    ctx.beginPath(); ctx.moveTo(markerX, 0); ctx.lineTo(markerX, h); ctx.stroke();
    
    // Punto rojo en el marcador (altura de la curva actual)
    var selCh = globalData[currentEditChannelIdx];
    var selH = Math.floor(currentSchedMins / 60);
    var vAt = 0;
    if(selCh.points) {
        var pt = selCh.points.find(p => p.h === selH);
        if(pt) vAt = pt.v;
    }
    var markerY = h - (vAt/100)*h;
    ctx.fillStyle = "#ff3333";
    ctx.beginPath(); ctx.arc(markerX, markerY, 7, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();

    // Actualizar Badge de Hora (HTML encima del canvas)
    var badge = document.getElementById("sched_marker_badge");
    if(badge) {
        var hh = Math.floor(currentSchedMins / 60);
        var mm = currentSchedMins % 60;
        badge.innerText = (hh<10?'0':'')+hh+":"+(mm<10?'0':'')+mm;
        // Ajustar posición del badge para que siga la línea roja
        badge.style.left = (currentSchedMins/1440)*100 + "%";
    }

    // Enviar al SVG del acuario la intensidad de cada canal en la hora actual de la barrita
    sendAquariumUpdate(currentSchedMins);
}

function clearSchedule() {
    if(confirm("¿Limpiar programación de este canal?")) {
        globalData[currentEditChannelIdx].points = [];
        syncSchedSliders();
        drawSchedCanvas();
    }
}

function previewSchedule() {
    var originalVal = currentSchedMins;
    var currentVal = 0;
    
    if(schedInterval) clearInterval(schedInterval);
    
    schedInterval = setInterval(() => {
        currentVal += 20; 
        if(currentVal >= 1440) {
            clearInterval(schedInterval);
            currentSchedMins = originalVal;
            syncSchedSliders();
            return;
        }
        currentSchedMins = currentVal;
        syncSchedSliders();
    }, 50);
}

function closeSchedModal() { 
    isEditingSched = false; 
    document.getElementById("schedModal").classList.remove("open"); 
    if(schedInterval) clearInterval(schedInterval);
    saveSession();
}

function saveSched() {
    var ch = globalData[currentEditChannelIdx];
    var clouds = document.getElementById("clouds_check").checked;
    
    // En simulación, actualizamos el estado global
    if(globalStatus) {
        if(!globalStatus.profileClouds) globalStatus.profileClouds = new Array(12).fill(false);
        globalStatus.profileClouds[globalStatus.currentProfile] = clouds;
    }

    var xhr = new XMLHttpRequest();
    xhr.open("GET", `/save_sched?id=${ch.id}&clouds=${clouds ? 1 : 0}`, true);
    xhr.send();
    
    closeSchedModal();
    saveSession();
}

function saveSession() {
    if(globalData && globalStatus) {
        var pid = globalStatus.currentProfile || 0;
        localStorage.setItem("aquarium_profile_" + pid + "_data", JSON.stringify(globalData));
    }
    if(globalStatus) localStorage.setItem("aquarium_status", JSON.stringify(globalStatus));
}

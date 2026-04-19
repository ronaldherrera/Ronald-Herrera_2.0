/**
 * SIMULADOR DE HARDWARE ESP32
 * Intercepta peticiones AJAX y simula el comportamiento del firmware.
 */
(function() {
    const PWM_MAX = 1023;
    
    // Estado inicial simulado
    const state = {
        temp: 26.4,
        fan: 15,
        mode: 0, // 0 manual, 1 auto
        currentProfile: 0,
        profileNames: ["Principal", "Azul Intenso", "LPS/Soft", "SPS Pro", "Noche", "Perfil 6", "Perfil 7", "Perfil 8", "Perfil 9", "Perfil 10", "Perfil 11", "Perfil 12"],
        profileClouds: new Array(12).fill(false),
        threshold: 40,
        fanHyst: 35,
        fanMax: 38,
        fanMin: 60,
        fanFreq: 30,
        fanManual: false,
        safetyTh: 40,
        safetyRec: 30,
        safetyMax: 30,
        safetyActive: false,
        channels: [
            { id: 0, pin: 5, target: 194, actual: 194, name: "Ambiente marino", color: "#21e2e2", points: generateDefaultPoints() },
            { id: 1, pin: 18, target: 410, actual: 410, name: "Azul derecha", color: "#0024ff", points: generateDefaultPoints() },
            { id: 2, pin: 19, target: 327, actual: 327, name: "Azul izquierda", color: "#0066ff", points: generateDefaultPoints() },
            { id: 3, pin: 21, target: 368, actual: 368, name: "Blancos", color: "#ffffcf", points: generateDefaultPoints() },
            { id: 4, pin: 22, target: 450, actual: 450, name: "Ultravioleta", color: "#8819ff", points: generateDefaultPoints() }
        ]
    };

    function generateDefaultPoints() {
    var p = [];
    // Simular un ciclo de día realista para la captura
    for(var i=0; i<24; i++) {
        var val = 0;
        if(i >= 6 && i <= 22) {
            // Curva de campana con pico desplazado
            val = Math.sin((i-6)/16 * Math.PI) * (70 + Math.random()*30);
        }
        p.push({h: i, v: Math.max(0, Math.round(val))});
    }
    return p;
}

    // Interceptar XMLHttpRequest
    const XHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
        const xhr = new XHR();
        const open = xhr.open;
        const send = xhr.send;
        let method, url;

        xhr.open = function(m, u) {
            method = m;
            url = u;
            return open.apply(this, arguments);
        };

        xhr.send = function(data) {
            console.log("[Simulator] Request:", method, url);
            
            // Simular respuesta asíncrona
            setTimeout(() => {
                let responseText = "OK";
                let status = 200;

                if (url.includes("/status")) {
                    responseText = JSON.stringify({
                        temp: state.temp + (Math.random() * 0.2 - 0.1),
                        fan: state.fan,
                        mode: state.mode,
                        time: new Date().toLocaleTimeString('es-ES', {hour12: false}),
                        threshold: state.threshold,
                        fanHyst: state.fanHyst,
                        fanMax: state.fanMax,
                        fanMin: state.fanMin,
                        fanFreq: state.fanFreq,
                        fanManual: state.fanManual,
                        currentProfile: state.currentProfile,
                        profileNames: state.profileNames,
                        profileClouds: state.profileClouds,
                        channels: state.channels.map(ch => ({
                            ...ch,
                            actual: calculateActual(ch)
                        })),
                        safetyTh: state.safetyTh,
                        safetyRec: state.safetyRec,
                        safetyMax: state.safetyMax,
                        safetyActive: state.safetyActive,
                        safetyMult: 1.0,
                    });
                } else if (url.includes("/set_safety?")) {
                    const params = new URLSearchParams(url.split('?')[1]);
                    if(params.has("th")) state.safetyTh = parseInt(params.get("th"));
                    if(params.has("rec")) state.safetyRec = parseInt(params.get("rec"));
                    if(params.has("max")) state.safetyMax = parseInt(params.get("max"));
                } else if (url.includes("/set_temp?")) {
                    const params = new URLSearchParams(url.split('?')[1]);
                    if(params.has("val")) state.threshold = parseInt(params.get("val"));
                    if(params.has("fhyst")) state.fanHyst = parseInt(params.get("fhyst"));
                    if(params.has("fmax")) state.fanMax = parseInt(params.get("fmax"));
                    if(params.has("fmin")) state.fanMin = parseInt(params.get("fmin"));
                    if(params.has("ffreq")) state.fanFreq = parseInt(params.get("ffreq"));
                    if(params.has("fman")) state.fanManual = params.get("fman") === "1";
                } else if (url.includes("/set?")) {
                    const params = new URLSearchParams(url.split('?')[1]);
                    const id = parseInt(params.get("id"));
                    const val = parseInt(params.get("val"));
                    if(state.channels[id]) {
                        state.channels[id].target = Math.round((val/100) * PWM_MAX);
                        syncWithSVG();
                    }
                } else if (url.includes("/set_mode")) {
                    const params = new URLSearchParams(url.split('?')[1]);
                    state.mode = parseInt(params.get("val"));
                    syncWithSVG();
                } else if (url.includes("/save?")) {
                    const params = new URLSearchParams(url.split('?')[1]);
                    const id = parseInt(params.get("id"));
                    if(state.channels[id]) {
                        state.channels[id].name = decodeURIComponent(params.get("name"));
                        state.channels[id].color = decodeURIComponent(params.get("color"));
                        syncWithSVG();
                    }
                } else if (url.includes("/set_profile")) {
                    const params = new URLSearchParams(url.split('?')[1]);
                    state.currentProfile = parseInt(params.get("id"));
                }

                // Definir propiedades de respuesta
                Object.defineProperty(xhr, 'readyState', { value: 4 });
                Object.defineProperty(xhr, 'status', { value: status });
                Object.defineProperty(xhr, 'responseText', { value: responseText });

                if (xhr.onreadystatechange) xhr.onreadystatechange();
                if (xhr.onload) xhr.onload();
            }, 50); 
        };

        return xhr;
    };


        function calculateActual(ch) {
        // PRIORIDAD: Datos reales de la App (globalData) si están disponibles en el scope
        let activePoints = ch.points || [];
        let activeTarget = ch.target || 0;

        if (window.globalData && window.globalData[ch.id]) {
            const realCh = window.globalData[ch.id];
            if (realCh.points) activePoints = realCh.points;
            // Corregido: realCh.target YA es PWM.
            if (realCh.target !== undefined) activeTarget = realCh.target;
        }

        if (state.mode === 0) return activeTarget;


        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();
        const hNext = (h + 1) % 24;

        const currentP = activePoints.find(p => p.h === h) || {v: 0};
        const nextP = activePoints.find(p => p.h === hNext) || {v: 0};

        const weight = m / 60.0;
        const val = currentP.v + (nextP.v - currentP.v) * weight;
        return Math.round((val/100) * PWM_MAX);
    }

    // Comunicar cambios al padre (SVG)
    function syncWithSVG() {
        if (window.parent) {
            window.parent.postMessage({
                type: 'AQUARIUM_UPDATE',
                channels: state.channels.map(ch => {
                    const actualValue = calculateActual(ch);
                    return {
                        id: ch.id,
                        brightness: (actualValue / PWM_MAX) * 100,
                        color: ch.color
                    };
                })
            }, '*');
        }
    }

    window.addEventListener('load', syncWithSVG);
    setInterval(syncWithSVG, 1000);

})();

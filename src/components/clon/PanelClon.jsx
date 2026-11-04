import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AvatarClon from './AvatarClon';
import { llamadaDeProyecto, proyectoDeBusqueda } from './proyectos-clon';

const GUARDADO = 'rh-clon';
const VOZ = 'rh-clon-voz';
const ESCENA = 'rh-clon-escena';

// En desarrollo no hay PHP: el chat y la voz van por los de Vite (/chat-local y /voz-local, ver vite.config.js)
const URL_CHAT = import.meta.env.DEV ? '/chat-local' : '/chat.php';
const URL_VOZ = import.meta.env.DEV ? '/voz-local' : '/voz.php';

function leerPreferencia(clave, porDefecto) {
  try { const v = localStorage.getItem(clave); return v === null ? porDefecto : v === '1'; } catch { return porDefecto; }
}
function guardarPreferencia(clave, valor) {
  try { localStorage.setItem(clave, valor ? '1' : '0'); } catch { /* sin almacenamiento */ }
}

// Pide el audio de un trozo de la respuesta (texto firmado por chat.php). null si no hay voz
async function pedirVoz({ texto, firma }) {
  const respuesta = await fetch(URL_VOZ, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto, firma }),
  });
  const json = await respuesta.json();
  return json.ok && json.audio ? json : null;
}

// WAV vacío: el iPhone solo deja sonar audio que empezó con un toque, así que el altavoz se «desbloquea» al pulsar
// (enviar, activar la voz) y luego se reutiliza para la respuesta, que llega segundos después
const SILENCIO = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

// Cómo hablarle: el botón principal hace una cosa u otra según el modo elegido en su menú
const MODO = 'rh-clon-modo';
const MODOS = [
  ['escribir', 'Escribir', 'Escribes y envías', 'enviar'],
  ['pulsar', 'Hablar pulsando', 'Mantén pulsado mientras hablas', 'micro'],
  ['conversacion', 'Conversación', 'Hablamos sin pulsar nada', 'conversacion'],
];

// Dictado del navegador (Chrome, Edge, Safari): null si no lo hay (Firefox)
const Reconocimiento = typeof window === 'undefined' ? null : (window.SpeechRecognition || window.webkitSpeechRecognition || null);
const reloj = () => performance.now();

const SALUDO ='Hola, soy Ronald… bueno, mi versión IA. Me sé mi CV y todos mis proyectos: pregúntame por mi experiencia, mi stack o cómo trabajo. Y si te encajo, le paso tu contacto al Ronald de verdad.';

// Primeras preguntas según la página en la que está el visitante
function sugerenciasIniciales(ruta) {
  if (ruta.startsWith('/lab')) return ['¿Qué proyecto tiene usuarios reales?', '¿Cómo está hecho Fycheo?', '¿Qué hiciste tú en cada uno?'];
  if (ruta.startsWith('/contacto')) return ['¿Buscas remoto o presencial?', '¿Qué tal tu inglés?', 'Quiero que me contactes'];
  return ['¿Qué stack dominas?', '¿Cuál es tu proyecto más complejo?', '¿Cuándo podrías incorporarte?'];
}

function nuevaConversacion(ruta) {
  return {
    id: crypto.randomUUID(),
    mensajes: [{ rol: 'asistente', texto: SALUDO }],
    sugerencias: sugerenciasIniciales(ruta),
    avisado: false,
  };
}

function recuperar(ruta) {
  try {
    const previo = JSON.parse(sessionStorage.getItem(GUARDADO) || 'null');
    if (previo?.id && Array.isArray(previo.mensajes) && previo.mensajes.some((m) => m.rol === 'visitante')) return previo;
  } catch { /* sin almacenamiento: conversación nueva */ }
  return nuevaConversacion(ruta);
}

// Pide al servidor que mande a Ronald la conversación guardada (solo si el visitante escribió algo)
function avisarFin(conversacion) {
  if (import.meta.env.DEV || !conversacion.mensajes.some((m) => m.rol === 'visitante')) return;
  const datos = new Blob([JSON.stringify({ id: conversacion.id })], { type: 'application/json' });
  navigator.sendBeacon?.('/chat-fin.php', datos);
}

// Enlaces del modelo, sin HTML crudo: [texto](/ruta), URL sueltas y correos
const ENLACES = /\[([^\]]+)\]\((\/[^\s)]*|https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)|([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/gi;

function ConEnlaces({ texto }) {
  const partes = [];
  let desde = 0;
  for (const m of texto.matchAll(ENLACES)) {
    const [entero, etiqueta, destino, url, correo] = m;
    partes.push(texto.slice(desde, m.index));
    if (etiqueta && destino.startsWith('/') && !destino.endsWith('.pdf')) {
      partes.push(<Link key={m.index} to={destino}>{etiqueta}</Link>);
    } else if (etiqueta) {
      partes.push(<a key={m.index} href={destino} target={destino.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">{etiqueta}</a>);
    } else if (correo) {
      partes.push(<a key={m.index} href={`mailto:${correo}`}>{correo}</a>);
    } else {
      const limpio = url.replace(/[.,;:]+$/, '');
      partes.push(<a key={m.index} href={limpio} target="_blank" rel="noopener noreferrer">{limpio.replace(/^https?:\/\//, '')}</a>, url.slice(limpio.length));
    }
    desde = m.index + entero.length;
  }
  partes.push(texto.slice(desde));
  return partes;
}

// Iconos de la cabecera: de línea, del mismo grosor y tamaño (trazos de Lucide, licencia ISC)
const TRAZOS = {
  vozSi: <><path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M19 5a10 10 0 0 1 0 14" /></>,
  vozNo: <><path d="M11 5 6 9H2v6h4l5 4z" /><path d="m22 9-6 6" /><path d="m16 9 6 6" /></>,
  avatar: <><rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M7 21v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" /></>,
  nueva: <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></>,
  micro: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><path d="M12 19v3" /></>,
  conversacion: <><path d="M2 10v3" /><path d="M6 6v11" /><path d="M10 3v18" /><path d="M14 8v7" /><path d="M18 5v13" /><path d="M22 10v3" /></>,
  enviar: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
  cerrar: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  flecha: <path d="m18 15-6-6-6 6" />,
  marca: <path d="M20 6 9 17l-5-5" />,
  ampliar: <><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></>,
  reducir: <><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" /></>,
};
const Icono = ({ nombre }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{TRAZOS[nombre]}</svg>
);

// El escenario del avatar: en su habitación, también en el móvil
function alMontarAvatar(e) {
  e.mirada('auto');
  e.entorno('habitacion');
}

export default function PanelClon({ onCerrar, saliendo = false, sugerencias: tema = null }) {
  const { pathname, search } = useLocation();
  // En el Lab, la presentación de proyecto que se está viendo: el clon sabe de qué le hablan
  const proyecto = pathname.startsWith('/lab') ? proyectoDeBusqueda(search) : null;
  // Si la conversación está empezando, sus primeras sugerencias son las del bocadillo con el que se abrió o, si no,
  // las del proyecto que se está viendo
  const [conversacion, setConversacion] = useState(() => {
    const c = recuperar(pathname);
    const propias = tema?.length ? tema : proyecto ? llamadaDeProyecto(proyecto).sugerencias : null;
    return propias && !c.mensajes.some((m) => m.rol === 'visitante') ? { ...c, sugerencias: propias } : c;
  });
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  // Voz de Ronald: apagada hasta que el visitante la activa (se recuerda en este navegador)
  const [conVoz, setConVoz] = useState(() => leerPreferencia(VOZ, false));
  // El avatar grande encima de la conversación: se puede plegar (se recuerda)
  const [conEscena, setConEscena] = useState(() => leerPreferencia(ESCENA, true));
  const [habla, setHabla] = useState(null);
  const [preparandoVoz, setPreparandoVoz] = useState(false);
  // El avatar 3D se monta cuando la caja ya se ha abierto: montarlo (modelo, esqueleto, sombreadores) bloquea la
  // página casi un segundo y, en mitad de la apertura, la animación saltaba
  const [con3d, setCon3d] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setCon3d(true), 620);
    return () => clearTimeout(t);
  }, []);
  // Hablarle por el micrófono: pulsar para hablar o conversación (sin pulsar: escucha, envía al callarte y vuelve a
  // escuchar cuando termina de responder)
  const [escuchando, setEscuchando] = useState(false);
  const [conversando, setConversando] = useState(false);
  const [avisoVoz, setAvisoVoz] = useState('');
  // Un solo botón y un menú para elegir cómo hablarle: escribir, hablar pulsando o conversación (se recuerda)
  const [modo, setModo] = useState(() => {
    try { const m = localStorage.getItem(MODO); return MODOS.some(([id]) => id === m) ? m : 'escribir'; } catch { return 'escribir'; }
  });
  const [menuModo, setMenuModo] = useState('cerrado');   // 'cerrado' | 'abierto' | 'saliendo' (se aplasta y se va)
  // Pantalla completa: el avatar grande y la conversación al lado (debajo en el móvil). Si el navegador deja, también
  // a pantalla completa de verdad (sin sus barras); si no (iPhone), ocupa toda la ventana
  // En el móvil, el chat se abre directamente a pantalla completa (no hay botón para ampliarlo)
  const esMovil = useRef(window.matchMedia('(max-width: 560px)').matches).current;
  const [completa, setCompleta] = useState(esMovil);
  const panel = useRef(null);
  const avatarApi = useRef(null);   // el avatar del escenario, cuando ya está montado
  const menuRef = useRef(null);
  // El aviso legal completo, en un globo que se abre al tocar «Aviso» (la línea entera ocupaba demasiado)
  const [legal, setLegal] = useState('cerrado');   // 'cerrado' | 'abierto' | 'saliendo'
  const legalRef = useRef(null);
  const terminarEscucha = useRef(null);
  const pulsado = useRef(null);   // cuándo se apoyó el dedo en el micro (null si no está pulsado)
  const enConversacion = useRef(false);
  const callado = useRef(0);      // desde cuándo nadie habla en la conversación (se pone en pausa a los 90 s)
  // Las llamadas que llegan de eventos del micro o del audio guardan las funciones de su render: estas son las de ahora
  const funciones = useRef({});
  const pensandoRef = useRef(pensando);
  pensandoRef.current = pensando;
  const conVozRef = useRef(conVoz);
  conVozRef.current = conVoz;
  const altavoz = useRef(null);
  const turnoVoz = useRef(0);
  const lista = useRef(null);
  const campo = useRef(null);
  const actual = useRef(conversacion);
  actual.current = conversacion;

  const { mensajes, sugerencias, avisado } = conversacion;
  const ultimaRespuesta = [...mensajes].reverse().find((m) => m.rol === 'asistente') || null;

  useEffect(() => {
    if (!window.matchMedia('(max-width: 560px)').matches) campo.current?.focus();
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem(GUARDADO, JSON.stringify(conversacion)); } catch { /* sin almacenamiento */ }
    lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: 'smooth' });
  }, [conversacion, pensando]);

  // Al cambiar de modo, la conversación cambia de alto (en el móvil, más pequeña hablándole): que se vea lo último
  useEffect(() => {
    const t = setTimeout(() => lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: 'smooth' }), 560);
    return () => clearTimeout(t);
  }, [modo]);

  // Al entrar o salir de pantalla completa la lista cambia de tamaño y perdía su sitio: al último mensaje
  useEffect(() => {
    const id = requestAnimationFrame(() => { if (lista.current) lista.current.scrollTop = lista.current.scrollHeight; });
    return () => cancelAnimationFrame(id);
  }, [completa]);

  // Al salir de la página, Ronald recibe la conversación
  useEffect(() => {
    const alSalir = () => avisarFin(actual.current);
    window.addEventListener('pagehide', alSalir);
    return () => window.removeEventListener('pagehide', alSalir);
  }, []);

  // En el móvil la página de detrás no se desplaza mientras el chat está abierto
  useEffect(() => {
    if (!window.matchMedia('(max-width: 560px)').matches) return;
    const antes = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = antes; };
  }, []);

  // Al cerrar el chat se corta la voz y se deja de escuchar
  useEffect(() => () => {
    turnoVoz.current++;
    altavoz.current?.pause();
    enConversacion.current = false;
    terminarEscucha.current?.(false);
  }, []);

  function desbloquearAltavoz() {
    if (altavoz.current) return altavoz.current;
    const a = new Audio();
    altavoz.current = a;
    a.src = SILENCIO;
    a.play().catch(() => {});
    return a;
  }

  // Corta lo que esté diciendo (nueva pregunta, voz apagada)
  function callar() {
    turnoVoz.current++;
    altavoz.current?.pause();
    setHabla(null);
    setPreparandoVoz(false);
  }

  function cambiarVoz() {
    const nueva = !conVoz;
    setConVoz(nueva);
    if (nueva) desbloquearAltavoz();
    else {
      callar();
      if (enConversacion.current) pararConversacion();   // sin voz no hay conversación
    }
    guardarPreferencia(VOZ, nueva);
  }

  function cambiarEscena() {
    setConEscena(!conEscena);
    guardarPreferencia(ESCENA, !conEscena);
  }

  // Dice la respuesta con mi voz, por trozos: la primera frase suena mientras se genera el resto, y cada trozo
  // lleva las marcas del cuerpo que le tocan
  // alEmpezar: se llama una vez, justo cuando empieza a sonar (o si no va a sonar): ahí aparece el texto escrito
  async function decir(voz, marcas = [], alEmpezar = () => {}) {
    let empezado = false;
    const empezar = () => { if (!empezado) { empezado = true; alEmpezar(); } };
    if (!voz || !conVozRef.current) { empezar(); seguirConversacion(1500); return; }
    const miTurno = ++turnoVoz.current;
    const trozos = voz.trozos?.length ? voz.trozos : [{ texto: voz.texto, firma: voz.firma, desde: 0 }];
    const pedidos = trozos.map((t) => pedirVoz(t).catch(() => null));
    const a = desbloquearAltavoz();
    setPreparandoVoz(true);
    for (let i = 0; i < trozos.length; i++) {
      const sonido = await pedidos[i];
      if (miTurno !== turnoVoz.current || !conVozRef.current) { empezar(); return; }
      setPreparandoVoz(false);
      if (!sonido) { empezar(); seguirConversacion(2500); return; }   // sin voz (sin créditos, error): sale escrita
      const desde = trozos[i].desde || 0;
      const hasta = trozos[i + 1]?.desde ?? Infinity;
      const suyas = marcas
        .filter((m) => (m.posVoz ?? m.pos) >= desde && (m.posVoz ?? m.pos) < hasta)
        .map((m) => ({ ...m, posVoz: (m.posVoz ?? m.pos) - desde }));
      a.src = `data:audio/mpeg;base64,${sonido.audio}`;
      empezar();   // el texto, la voz y los gestos, a la vez
      setHabla({ audio: a, tiempos: sonido.tiempos, inicios: sonido.inicios, marcas: suyas, ultimo: i === trozos.length - 1 });
      try { await a.play(); } catch { return; }
      // Siguiente trozo al acabar este (o nada si se corta)
      await new Promise((fin) => {
        a.addEventListener('ended', fin, { once: true });
        a.addEventListener('pause', fin, { once: true });
      });
      if (!a.ended) return;
    }
    seguirConversacion();
  }

  // --- Micrófono ------------------------------------------------------------------------------------------------
  // Escucha con el dictado del navegador. Pulsado: mientras mantienes el botón; con un toque o en conversación, hasta
  // que te callas un momento. Lo que dices se ve en la caja de texto y al terminar se envía
  function empezarEscucha() {
    if (!Reconocimiento) { setAvisoVoz('Este navegador no permite dictar: prueba con Chrome o Safari'); return; }
    callar();   // con el altavoz ocupado, el móvil no le da el micro al dictado
    setAvisoVoz('');
    const rec = new Reconocimiento();
    rec.lang = 'es-ES';
    rec.interimResults = true;
    rec.continuous = true;
    let previo = '';   // lo dicho antes de que el navegador cortara por su cuenta (y se reanudara)
    let dicho = '';
    let hecho = false;
    let silencio = null;
    let ultimoError = '';
    const tope = setTimeout(() => terminar(), 60000);
    const terminar = (enviarlo = true) => {
      if (hecho) return;
      hecho = true;
      clearTimeout(silencio);
      clearTimeout(tope);
      terminarEscucha.current = null;
      try { rec.stop(); } catch { /* ya estaba parado */ }
      setEscuchando(false);
      if (!enviarlo) return;
      if (dicho.trim()) { callado.current = 0; funciones.current.enviar(dicho); return; }
      // En conversación, si no se oyó nada, vuelve a escuchar (hasta 90 s de silencio)
      if (enConversacion.current && ultimoError !== 'not-allowed') {
        if (!callado.current) callado.current = Date.now();
        if (Date.now() - callado.current < 90000) {
          setTimeout(() => { if (enConversacion.current) funciones.current.empezarEscucha(); }, 300);
          return;
        }
        funciones.current.pararConversacion('Conversación en pausa: no te oía');
        return;
      }
      if (enConversacion.current) funciones.current.pararConversacion();
      setAvisoVoz(ultimoError === 'not-allowed' ? 'Sin permiso para el micrófono' : 'No te he oído');
    };
    rec.onresult = (ev) => {
      dicho = `${previo} ${[...ev.results].map((x) => x[0].transcript).join('')}`.trim();
      setTexto(dicho);
      clearTimeout(silencio);
      if (!pulsado.current) silencio = setTimeout(terminar, enConversacion.current ? 1400 : 1300);
    };
    rec.onerror = (ev) => {
      ultimoError = ev.error;
      if (ev.error === 'aborted' || ev.error === 'no-speech') return;
      terminar();
    };
    rec.onend = () => {
      // El móvil corta en las pausas: si sigues pulsando, se reanuda sin perder lo dicho
      if (!hecho && pulsado.current) {
        previo = dicho;
        try { rec.start(); return; } catch { /* no se pudo reanudar */ }
      }
      terminar();
    };
    terminarEscucha.current = terminar;
    setTexto('');
    setEscuchando(true);
    try { rec.start(); } catch (error) { ultimoError = error.name; terminar(); }
  }

  function alPulsarMic(e) {
    if (e.button > 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    campo.current?.blur();   // que no se abra el teclado
    if (enConversacion.current || escuchando) return;
    pulsado.current = reloj();
    empezarEscucha();
  }

  function alSoltarMic() {
    // En conversación, un toque: si escucha, envía ya; si piensa o habla, le cortas y hablas tú
    if (enConversacion.current) {
      if (escuchando) terminarEscucha.current?.();
      else empezarEscucha();
      return;
    }
    const desde = pulsado.current;
    pulsado.current = null;
    // Al soltar el dedo el navegador deja sonar audio (el iPhone no lo deja al apoyarlo)
    if (conVozRef.current) desbloquearAltavoz();
    if (desde === null) { terminarEscucha.current?.(); return; }
    if (reloj() - desde > 350) terminarEscucha.current?.();
    else setAvisoVoz('Te escucho… toca otra vez para enviar');
  }

  function empezarConversacion() {
    campo.current?.blur();
    desbloquearAltavoz();
    // Sin voz no hay conversación: se activa
    if (!conVozRef.current) { setConVoz(true); conVozRef.current = true; guardarPreferencia(VOZ, true); }
    enConversacion.current = true;
    callado.current = 0;
    setConversando(true);
    empezarEscucha();
  }

  function pararConversacion(motivo = '') {
    enConversacion.current = false;
    setConversando(false);
    terminarEscucha.current?.(false);
    setAvisoVoz(motivo);
  }

  // --- Menú del modo ------------------------------------------------------------------------------------------
  function cerrarMenu() {
    setMenuModo((m) => (m === 'abierto' ? 'saliendo' : m));
    setTimeout(() => setMenuModo((m) => (m === 'saliendo' ? 'cerrado' : m)), 200);
  }

  function cerrarLegal() {
    setLegal((m) => (m === 'abierto' ? 'saliendo' : m));
    setTimeout(() => setLegal((m) => (m === 'saliendo' ? 'cerrado' : m)), 200);
  }

  function elegirModo(id) {
    cerrarMenu();
    setModo(id);
    try { localStorage.setItem(MODO, id); } catch { /* sin almacenamiento */ }
    if (id === 'conversacion') { if (!enConversacion.current) empezarConversacion(); }
    else if (enConversacion.current) pararConversacion();
  }

  // Cuando termina de responder, vuelve a escuchar (con un respiro para no oír el final de su voz)
  function seguirConversacion(espera = 250) {
    if (!enConversacion.current) return;
    setTimeout(() => { if (enConversacion.current && !pensandoRef.current) funciones.current.empezarEscucha(); }, espera);
  }

  function cerrar() {
    avisarFin(actual.current);
    enConversacion.current = false;
    terminarEscucha.current?.(false);
    onCerrar();
  }

  function cambiarCompleta() {
    if (completa) {
      avatarApi.current?.tamanoFijo(null);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      setCompleta(false);
      return;
    }
    // Sin trompicones: el avatar se prepara ya al tamaño que tendrá a pantalla completa (lo que mide la pantalla menos
    // la columna de la conversación) y no se redibuja mientras el chat crece y el navegador pasa a pantalla completa.
    // Ese redibujado pesado va antes, dos fotogramas antes de que empiece la animación
    const ancho = Math.round(window.screen.width - Math.min(440, window.screen.width * 0.38));
    avatarApi.current?.tamanoFijo([ancho, window.screen.height]);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setCompleta(true);
      // Primero el chat crece hasta ocupar la ventana (0,45 s, ver .clon-completa) y luego el navegador pasa a
      // pantalla completa: a la vez, el navegador ganaba y se veía antes la web en grande que el chat
      setTimeout(() => {
        const soltar = () => setTimeout(() => avatarApi.current?.tamanoFijo(null), 500);
        if (!panel.current?.classList.contains('clon-completa') || document.fullscreenElement) { soltar(); return; }
        const pedido = panel.current.requestFullscreen?.();
        if (pedido) pedido.then(soltar, soltar);   // si no deja, se queda ocupando la ventana
        else soltar();
      }, 460);
    }));
  }

  // Si se sale de la pantalla completa del navegador (Escape, gesto), el chat vuelve a su tamaño
  useEffect(() => {
    const alCambiar = () => { if (!document.fullscreenElement) setCompleta(false); };
    document.addEventListener('fullscreenchange', alCambiar);
    return () => document.removeEventListener('fullscreenchange', alCambiar);
  }, []);

  // En el móvil, el chat ocupa solo lo que se ve: con el teclado abierto, el iPhone no encoge la página y la caja de
  // escribir quedaba debajo del teclado. Así la conversación queda justo encima y el avatar detrás
  useEffect(() => {
    const vv = window.visualViewport;
    if (!esMovil || !vv) return undefined;
    const ajustar = () => {
      panel.current?.style.setProperty('--alto-visible', `${vv.height}px`);
      panel.current?.style.setProperty('--arriba-visible', `${vv.offsetTop}px`);
    };
    ajustar();
    vv.addEventListener('resize', ajustar);
    vv.addEventListener('scroll', ajustar);
    return () => { vv.removeEventListener('resize', ajustar); vv.removeEventListener('scroll', ajustar); };
  }, [esMovil]);

  // A pantalla completa, la página de detrás no se desplaza
  useEffect(() => {
    if (!completa) return undefined;
    const antes = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = antes; };
  }, [completa]);

  // Escape cierra lo de más arriba: el menú del modo, la conversación por voz, la pantalla completa y, si no, el chat
  const alEscape = useRef(cerrar);
  alEscape.current = () => {
    if (menuModo === 'abierto') cerrarMenu();
    else if (legal === 'abierto') cerrarLegal();
    else if (enConversacion.current) pararConversacion();
    else if (completa && !esMovil) cambiarCompleta();
    else cerrar();
  };
  useEffect(() => {
    const alPulsar = (e) => { if (e.key === 'Escape') alEscape.current(); };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, []);

  // Un clic fuera del aviso legal lo cierra
  useEffect(() => {
    if (legal !== 'abierto') return undefined;
    const fuera = (e) => { if (!legalRef.current?.contains(e.target)) cerrarLegal(); };
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, [legal]);

  // Un clic fuera del menú lo cierra
  useEffect(() => {
    if (menuModo !== 'abierto') return undefined;
    const fuera = (e) => { if (!menuRef.current?.contains(e.target)) cerrarMenu(); };
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, [menuModo]);

  async function enviar(contenido) {
    const limpio = contenido.trim();
    if (!limpio || pensandoRef.current) return;
    callar();
    setAvisoVoz('');
    if (conVozRef.current) desbloquearAltavoz();   // con el toque de enviar, para que luego pueda sonar
    // La conversación de ahora (también si se envía desde el micro, cuyo evento guarda un render anterior)
    const { id, mensajes: previos } = actual.current;
    const nuevos = [...previos, { rol: 'visitante', texto: limpio }];
    setConversacion((c) => ({ ...c, mensajes: nuevos, sugerencias: [] }));
    setTexto('');
    setPensando(true);
    let esperaTexto = false;   // con voz, el texto espera a que empiece a sonar
    try {
      const respuesta = await fetch(URL_CHAT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // El saludo no se envía: el servidor solo acepta conversaciones que empiezan por el visitante
        body: JSON.stringify({
          id, mensajes: nuevos.slice(1), pagina: window.location.pathname, hablado: conVozRef.current,
          ...(proyecto && { proyecto: proyecto.titulo, ficha: proyecto.ficha }),
        }),
      });
      const json = await respuesta.json();
      if (!json.respuesta) throw new Error('sin respuesta');
      const marcas = Array.isArray(json.marcas) ? json.marcas : [];
      const mostrar = () => {
        setPensando(false);
        setConversacion((c) => ({
          ...c,
          mensajes: [...c.mensajes, { rol: 'asistente', texto: json.respuesta, gesto: json.gesto || null, marcas }],
          sugerencias: Array.isArray(json.sugerencias) ? json.sugerencias.slice(0, 3) : [],
          avisado: c.avisado || Boolean(json.avisado),
        }));
      };
      // Con voz, sigue «escribiendo» (los puntos) hasta que empieza a sonar, y el texto sale a la vez que el audio.
      // Si la voz no llega en 12 s, el texto sale igualmente
      if (conVozRef.current && json.voz) {
        esperaTexto = true;
        let mostrado = false;
        const unaVez = () => { if (!mostrado) { mostrado = true; mostrar(); } };
        setTimeout(unaVez, 12000);
        decir(json.voz, marcas, unaVez);
      } else {
        mostrar();
        decir(json.voz, marcas);
      }
    } catch {
      if (enConversacion.current) pararConversacion();
      setConversacion((c) => ({
        ...c,
        mensajes: [...c.mensajes, {
          rol: 'asistente',
          texto: 'Se me ha cruzado un cable y ahora no puedo responder. Escríbeme desde [contacto](/contacto) o a hola@ronaldherrera.es y te contesto yo en persona.',
        }],
      }));
    } finally {
      if (!esperaTexto) setPensando(false);   // con voz, se quita cuando empieza a sonar
      // En el móvil no (abriría el teclado en cada respuesta), ni hablando por el micro
      if (!enConversacion.current && !window.matchMedia('(max-width: 560px)').matches) campo.current?.focus();
    }
  }

  function reiniciar() {
    avisarFin(actual.current);
    callar();
    setConversacion(nuevaConversacion(pathname));
  }

  useEffect(() => { funciones.current = { enviar, empezarEscucha, pararConversacion }; });

  // A pantalla completa el avatar se ve siempre, aunque estuviera plegado
  const verEscena = conEscena || completa;
  const avatar = { pensando, respuesta: ultimaRespuesta, escuchando: escuchando || Boolean(texto.trim()), conVoz, habla };
  // Qué está haciendo: escuchándote, pensando la respuesta o generando su voz
  const [fase, tipoFase] = escuchando ? ['Te escucho', 'escuchando'] : preparandoVoz ? ['Preparando mi voz', 'voz'] : pensando ? ['Pensando', 'pensando'] : ['', ''];
  const avisoFase = (fase || conversando) && (
    <div className="clon-fase-grupo">
      {fase && <p className={`clon-fase clon-fase-${tipoFase}`} role="status">{fase}<span className="clon-puntos" aria-hidden="true"><i /><i /><i /></span></p>}
      {conversando && <button type="button" className="clon-terminar" onClick={() => pararConversacion()}>Terminar</button>}
    </div>
  );
  const hayTexto = Boolean(texto.trim()) && !escuchando;
  const accion = !Reconocimiento || hayTexto || modo === 'escribir' ? 'enviar'
    : modo === 'pulsar' ? 'pulsar'
      : conversando ? (escuchando ? 'enviar-ya' : 'interrumpir') : 'empezar';

  return (
    <>
      <section ref={panel} className={`clon-panel${verEscena ? ' clon-con-escena' : ''}${completa ? ' clon-completa' : ''}${Reconocimiento && modo !== 'escribir' ? ' clon-modo-voz' : ''}${saliendo ? ' saliendo' : ''}`} role="dialog" aria-label="Chat con la versión IA de Ronald" aria-modal={completa}>
        <header className="clon-cabecera">
          <div className="clon-identidad">
            {!verEscena && con3d && <span className="clon-avatar"><AvatarClon tamano={46} {...avatar} /><span className="clon-ia">IA</span></span>}
            <div>
              <b>Ronald</b>
              <span className="clon-estado">Versión IA · entrenada con mi CV</span>
            </div>
          </div>
          <div className="clon-acciones">
            <button
              type="button"
              onClick={cambiarVoz}
              aria-pressed={conVoz}
              aria-label={conVoz ? 'Silenciar mi voz' : 'Escuchar mis respuestas con mi voz'}
              title={conVoz ? 'Silenciar mi voz' : 'Escuchar con mi voz'}
            >
              <Icono nombre={conVoz ? 'vozSi' : 'vozNo'} />
            </button>
            {!completa && (
              <button
                type="button"
                onClick={cambiarEscena}
                aria-pressed={conEscena}
                aria-label={conEscena ? 'Plegar el avatar' : 'Ver el avatar'}
                title={conEscena ? 'Plegar el avatar' : 'Ver el avatar'}
              >
                <Icono nombre="avatar" />
              </button>
            )}
            {mensajes.length > 1 && <button type="button" onClick={reiniciar} aria-label="Empezar una conversación nueva" title="Nueva conversación"><Icono nombre="nueva" /></button>}
            <button type="button" onClick={cerrar} aria-label="Cerrar el chat" title="Cerrar"><Icono nombre="cerrar" /></button>
          </div>
        </header>

        {verEscena && (
          <div className="clon-escena">
            {con3d && <AvatarClon tamano="100%" encuadre="medio" alMontar={(e) => { avatarApi.current = e; alMontarAvatar(e); }} className="clon-escena-av" {...avatar} />}
            <span className="clon-ia clon-escena-ia">IA</span>
            {!esMovil && <button
              type="button"
              className="clon-ampliar"
              onClick={cambiarCompleta}
              aria-pressed={completa}
              aria-label={completa ? 'Salir de pantalla completa' : 'Ver a pantalla completa'}
              title={completa ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              <Icono nombre={completa ? 'reducir' : 'ampliar'} />
            </button>}
            {avisoFase}
          </div>
        )}

        <div className="clon-mensajes" ref={lista} aria-live="polite">
          {mensajes.map((m, i) => (
            <p key={`${i}-${m.texto.slice(0, 24)}`} className={`clon-msj clon-msj-${m.rol}`}>
              <ConEnlaces texto={m.texto} />
            </p>
          ))}
          {pensando && <p className="clon-msj clon-msj-asistente clon-escribiendo" aria-label="Escribiendo"><span /><span /><span /></p>}
          {avisado && <p className="clon-aviso">✓ Hecho: el Ronald de verdad ya tiene tu contacto y te escribirá personalmente.</p>}
          {!pensando && sugerencias.length > 0 && (
            <div className="clon-sugerencias">
              {sugerencias.map((s) => <button key={s} type="button" onClick={() => enviar(s)}>{s}</button>)}
            </div>
          )}
        </div>

        {/* Sin el avatar a la vista, lo que está haciendo va encima de la caja de escribir */}
        {!verEscena && avisoFase && <div className="clon-fase-linea">{avisoFase}</div>}
        {avisoVoz && <p className="clon-aviso-voz" role="status">{avisoVoz}</p>}

        <form className="clon-form" onSubmit={(e) => { e.preventDefault(); enviar(texto); }}>
          <label className="clon-oculto" htmlFor="clon-texto">Escribe tu pregunta</label>
          <textarea
            id="clon-texto"
            ref={campo}
            rows={1}
            maxLength={1000}
            value={texto}
            readOnly={escuchando}
            placeholder={escuchando ? 'Te escucho…' : 'Pregúntame lo que quieras…'}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(texto); } }}
          />
          {/* Un solo botón: hace lo que toca según el modo (y si hay texto escrito, siempre enviar) */}
          {accion === 'enviar' && (
            <button type="submit" className="clon-principal" disabled={pensando || !texto.trim()} aria-label="Enviar"><Icono nombre="enviar" /></button>
          )}
          {accion === 'pulsar' && (
            <button
              type="button"
              className={`clon-principal clon-mic${escuchando ? ' escuchando' : ''}`}
              aria-pressed={escuchando}
              aria-label={escuchando ? 'Te escucho: suelta para enviar' : 'Mantén pulsado para hablar'}
              title="Mantén pulsado para hablar"
              onPointerDown={alPulsarMic}
              onPointerUp={alSoltarMic}
              onPointerCancel={alSoltarMic}
              onContextMenu={(e) => e.preventDefault()}
              onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); alPulsarMic(e); } }}
              onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); alSoltarMic(); } }}
            >
              <Icono nombre="micro" />
            </button>
          )}
          {accion === 'enviar-ya' && (
            <button type="button" className="clon-principal clon-en-conversacion escuchando" onClick={() => terminarEscucha.current?.()} aria-label="En conversación: enviar ya lo que he dicho" title="Enviar ya"><Icono nombre="conversacion" /></button>
          )}
          {accion === 'interrumpir' && (
            <button type="button" className="clon-principal clon-en-conversacion" onClick={() => empezarEscucha()} aria-label="En conversación: interrumpir y hablar" title="Interrumpir y hablar"><Icono nombre="conversacion" /></button>
          )}
          {accion === 'empezar' && (
            <button type="button" className="clon-principal" onClick={empezarConversacion} aria-label="Empezar la conversación por voz" title="Empezar la conversación"><Icono nombre="conversacion" /></button>
          )}
          {Reconocimiento && (
            <span className="clon-modo" ref={menuRef}>
              <button
                type="button"
                className="clon-modo-abrir"
                aria-haspopup="menu"
                aria-expanded={menuModo === 'abierto'}
                aria-label="Elegir cómo hablarme"
                title="Cómo hablarme"
                onClick={() => (menuModo === 'abierto' ? cerrarMenu() : setMenuModo('abierto'))}
              >
                <Icono nombre="flecha" />
              </button>
              {menuModo !== 'cerrado' && (
                <span className={`clon-menu-modo${menuModo === 'saliendo' ? ' saliendo' : ''}`} role="menu" aria-label="Cómo hablarme">
                  {MODOS.map(([id, titulo, detalle, icono]) => (
                    <button key={id} type="button" role="menuitemradio" aria-checked={modo === id} className={id === 'conversacion' && conversando ? 'en-curso' : undefined} onClick={() => elegirModo(id)}>
                      <Icono nombre={icono} />
                      <span><b>{titulo}</b><small>{detalle}</small></span>
                      {modo === id && <Icono nombre="marca" />}
                    </button>
                  ))}
                </span>
              )}
            </span>
          )}
        </form>
        {/* Que es una IA se ve siempre; el resto del aviso, al tocar «Aviso» */}
        <div className="clon-legal" ref={legalRef}>
          <span>Soy una IA y puedo equivocarme · </span>
          <button type="button" className="clon-legal-boton" aria-expanded={legal === 'abierto'} aria-controls="clon-aviso-legal" onClick={() => (legal === 'abierto' ? cerrarLegal() : setLegal('abierto'))}>Aviso</button>
          {legal !== 'cerrado' && (
            <p id="clon-aviso-legal" className={`clon-legal-globo${legal === 'saliendo' ? ' saliendo' : ''}`}>
              Soy una IA y puedo equivocarme.{conVoz && ' Mi voz es sintética, clonada de la de Ronald.'} Ronald recibe una copia de esta conversación. No compartas datos sensibles. <Link to="/privacidad">Privacidad</Link>
            </p>
          )}
        </div>
      </section>
    </>
  );
}

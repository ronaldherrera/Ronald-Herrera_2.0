import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { GRUPOS, SKILLS } from './skillsData';
import { crearSonido } from './sonido';
import './Despliegue.css';

// «A producción»: caen habilidades y bugs. El servidor de producción recoge las habilidades,
// que llenan la barra de despliegue, y dispara a los bugs. Cada bug que llega a producción
// (o que recoges) tumba la última habilidad desplegada, que vuelve a caer. Se gana con la barra
// llena y se pierde si un bug llega con la barra a cero. Modo cine (pantalla completa); Esc sale.
// El juego vive en un canvas con su propio bucle; React solo pinta el marcador,
// los avisos y las pantallas de inicio y final.
// Niveles: velocidad de caída, ritmo de aparición (más alto, más espaciado), proporción de bugs
// y amplitud de su zigzag. Normal es el ajuste original del juego.
const NIVELES = {
  facil: { nombre: 'Fácil', velocidad: 0.75, ritmo: 1.25, bugs: 0.3, zigzag: 0.8 },
  normal: { nombre: 'Normal', velocidad: 1, ritmo: 1, bugs: 0.42, zigzag: 1 },
  dificil: { nombre: 'Difícil', velocidad: 1.3, ritmo: 0.8, bugs: 0.5, zigzag: 1.3 },
};

// Música y efectos se activan por separado y se recuerdan en este navegador (por defecto, activados)
const leerPreferencia = (clave) => {
  try { return localStorage.getItem(clave) !== 'no'; } catch { return true; }
};

// El nivel elegido se recuerda en este navegador (si no se puede guardar, se usa Normal)
const leerNivel = () => {
  try {
    const guardado = localStorage.getItem('despliegue-nivel');
    return NIVELES[guardado] ? guardado : 'normal';
  } catch {
    return 'normal';
  }
};
const CADENCIA = 0.22; // segundos entre disparos (dispara solo)

function pastilla(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function dibujarBug(ctx, b, t) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(Math.sin(t * 6 + b.fase) * 0.25);
  const patas = Math.sin(t * 22 + b.fase) * 3;
  ctx.strokeStyle = '#7a1f22';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const lado of [-1, 1]) {
    for (const [dy, d] of [[-5, patas], [1, -patas], [7, patas]]) {
      ctx.beginPath();
      ctx.moveTo(lado * 7, dy);
      ctx.lineTo(lado * 15, dy + d - 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(lado * 3, -14);
    ctx.quadraticCurveTo(lado * 6, -22, lado * 10, -23);
    ctx.stroke();
  }
  ctx.fillStyle = '#e5484d';
  ctx.beginPath();
  ctx.ellipse(0, 2, 10, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a1f22';
  ctx.beginPath();
  ctx.arc(0, -12, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-0.75, -9, 1.5, 22);
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath();
  ctx.ellipse(-4, -2, 2.5, 4, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Dónde están las manos del robot: la izquierda lleva la bandeja de desplegar (donde caen
// las habilidades) y la derecha, la pistola que dispara a los bugs.
function manos(j) {
  const e = j.ancho / 180;
  return { e, bandejaX: j.x - 70 * e, bandejaW: 120 * e, pistolaX: j.x + 62 * e };
}

// Hasta dónde llega cada mano, con el robot pegado a uno u otro borde. Las habilidades solo caen
// donde llega la bandeja y los bugs solo bajan donde llega la pistola.
function alcance(j) {
  const e = j.ancho / 180;
  const robotMin = 130 * e + 4;
  const robotMax = j.w - 76 * e;
  return {
    e, robotMin, robotMax,
    bandejaDer: robotMax - 70 * e + 60 * e,
    pistolaMin: robotMin + 62 * e,
    pistolaMax: robotMax + 62 * e,
  };
}

// El personaje: un servidor con ruedas y pantalla por cara, con la bandeja en una mano y la
// pistola en la otra. Parpadea, sonríe al recoger y se asusta con los bugs.
function dibujarRobot(ctx, j, suelo) {
  const { e, bandejaX, bandejaW, pistolaX } = manos(j);
  const cuerpoW = 78 * e;
  const cuerpoH = 62 * e;
  const cuerpoY = suelo + 26 * e;
  const base = cuerpoY + cuerpoH;
  const crema = j.flash ? '#F2B8B5' : '#EAE5CA';
  const cara = j.cara && j.cara.hasta > j.t ? j.cara.tipo : (j.t % 3.4 < 0.12 ? 'parpadeo' : 'normal');
  const inclinacion = Math.max(-0.14, Math.min(0.14, (j.objetivo - j.x) / 500));

  ctx.save();
  // Sombra en el suelo
  ctx.fillStyle = 'rgba(0, 0, 0, .45)';
  ctx.beginPath();
  ctx.ellipse(j.x, base + 12 * e, cuerpoW * 0.6, 4 * e, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(j.x, base + 4 * e);
  ctx.rotate(inclinacion);
  ctx.translate(-j.x, -(base + 4 * e));

  // Ruedas, que giran al moverse
  for (const lado of [-1, 1]) {
    const rx = j.x + lado * cuerpoW * 0.3;
    const ry = base + 4 * e;
    ctx.fillStyle = '#2A2A2A';
    ctx.beginPath();
    ctx.arc(rx, ry, 8 * e, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a8470';
    ctx.lineWidth = 1.5 * e;
    ctx.beginPath();
    const giro = j.x / (8 * e);
    ctx.moveTo(rx + Math.cos(giro) * 6 * e, ry + Math.sin(giro) * 6 * e);
    ctx.lineTo(rx - Math.cos(giro) * 6 * e, ry - Math.sin(giro) * 6 * e);
    ctx.stroke();
  }

  // Brazos: el izquierdo sube a la bandeja y el derecho sujeta la pistola
  ctx.strokeStyle = crema;
  ctx.lineWidth = 4 * e;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(j.x - cuerpoW / 2 + 2 * e, cuerpoY + 18 * e);
  ctx.quadraticCurveTo(j.x - cuerpoW / 2 - 22 * e, cuerpoY + 12 * e, bandejaX + 14 * e, suelo + 9 * e);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(j.x + cuerpoW / 2 - 2 * e, cuerpoY + 18 * e);
  ctx.quadraticCurveTo(j.x + cuerpoW / 2 + 18 * e, cuerpoY + 16 * e, pistolaX - 2 * e, suelo + 28 * e);
  ctx.stroke();

  // Cuerpo
  ctx.shadowColor = j.flash ? '#e5484d' : 'rgba(167, 213, 245, .45)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = crema;
  pastilla(ctx, j.x - cuerpoW / 2, cuerpoY, cuerpoW, cuerpoH, 14 * e);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Pantalla con la cara
  const px = j.x - cuerpoW / 2 + 8 * e;
  const py = cuerpoY + 7 * e;
  const pw = cuerpoW - 16 * e;
  const ph = 30 * e;
  ctx.fillStyle = '#151515';
  pastilla(ctx, px, py, pw, ph, 8 * e);
  ctx.fill();
  const ojoY = py + ph * 0.45;
  const azul = '#A7D5F5';
  for (const lado of [-1, 1]) {
    const ox = j.x + lado * 12 * e;
    if (cara === 'feliz') {
      ctx.strokeStyle = azul;
      ctx.lineWidth = 2.5 * e;
      ctx.beginPath();
      ctx.arc(ox, ojoY + 3 * e, 5 * e, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (cara === 'susto') {
      ctx.fillStyle = '#e5484d';
      ctx.beginPath();
      ctx.arc(ox, ojoY, 5 * e, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = azul;
      const alto = cara === 'parpadeo' ? 2 * e : 11 * e;
      pastilla(ctx, ox - 3.5 * e, ojoY - alto / 2, 7 * e, alto, 3 * e);
      ctx.fill();
    }
  }
  ctx.strokeStyle = cara === 'susto' ? '#e5484d' : azul;
  ctx.lineWidth = 2 * e;
  ctx.beginPath();
  if (cara === 'susto') ctx.arc(j.x, py + ph * 0.8, 2.5 * e, 0, Math.PI * 2);
  else if (cara === 'feliz') ctx.arc(j.x, py + ph * 0.66, 5 * e, 0.15 * Math.PI, 0.85 * Math.PI);
  else { ctx.moveTo(j.x - 4 * e, py + ph * 0.8); ctx.lineTo(j.x + 4 * e, py + ph * 0.8); }
  ctx.stroke();

  // Ranuras de servidor y su luz
  ctx.fillStyle = 'rgba(16, 16, 16, .25)';
  for (let i = 0; i < 2; i++) ctx.fillRect(px + 14 * e, py + ph + 7 * e + i * 7 * e, pw - 20 * e, 2.5 * e);
  ctx.fillStyle = j.flash ? '#e5484d' : '#3ECF8E';
  ctx.beginPath();
  ctx.arc(px + 6 * e, py + ph + 9 * e, 2.6 * e, 0, Math.PI * 2);
  ctx.fill();

  // Bandeja de desplegar, con un borde a cada lado para que no se caiga nada
  ctx.shadowColor = 'rgba(167, 213, 245, .5)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = crema;
  pastilla(ctx, bandejaX - bandejaW / 2, suelo, bandejaW, 9 * e, 4.5 * e);
  ctx.fill();
  ctx.shadowBlur = 0;
  for (const lado of [-1, 1]) {
    pastilla(ctx, bandejaX + lado * (bandejaW / 2 - 3 * e) - 3 * e, suelo - 7 * e, 6 * e, 12 * e, 3 * e);
    ctx.fill();
  }

  // Pistola: empuñadura, cuerpo con su célula de energía y cañón, que brilla al disparar
  const recienDisparado = j.t - (j.ultimoDisparo ?? -1) < 0.08;
  ctx.fillStyle = '#2A2A2A';
  pastilla(ctx, pistolaX - 4 * e, suelo + 20 * e, 8 * e, 13 * e, 3 * e);
  ctx.fill();
  ctx.fillStyle = '#3A3A3A';
  pastilla(ctx, pistolaX - 8 * e, suelo + 2 * e, 16 * e, 20 * e, 5 * e);
  ctx.fill();
  ctx.fillStyle = '#A7D5F5';
  ctx.beginPath();
  ctx.arc(pistolaX, suelo + 12 * e, 3.5 * e, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4A4A4A';
  pastilla(ctx, pistolaX - 4 * e, suelo - 12 * e, 8 * e, 16 * e, 3 * e);
  ctx.fill();
  ctx.shadowColor = '#A7D5F5';
  ctx.shadowBlur = recienDisparado ? 20 : 6;
  ctx.fillStyle = recienDisparado ? '#FFFFFF' : '#A7D5F5';
  pastilla(ctx, pistolaX - 4 * e, suelo - 14 * e, 8 * e, 4 * e, 2 * e);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

const pantallaCompleta = () => document.fullscreenElement || document.webkitFullscreenElement;

const API_RANKING = '/ranking.php';

// 48,2 s · 1:23,4
const formatoTiempo = (s) => {
  if (s == null || Number.isNaN(s)) return '—';
  const min = Math.floor(s / 60);
  const resto = (s - min * 60).toFixed(1).replace('.', ',');
  return min ? `${min}:${resto.padStart(4, '0')}` : `${resto} s`;
};

const pedirRanking = async (datos) => {
  const opciones = datos ? { method: 'POST', body: new URLSearchParams(datos) } : undefined;
  const respuesta = await fetch(API_RANKING, opciones);
  const json = await respuesta.json();
  if (!respuesta.ok && !json.ranking) throw new Error(json.error || 'Ranking no disponible');
  return json;
};

// ¿Este tiempo entra en el top 10 del nivel?
const entraEnTop = (lista, tiempo) => lista.length < 10 || tiempo < lista[lista.length - 1].tiempo;

const IconoSonido = ({ activo }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 5 6 9H2v6h4l5 4V5z" />
    {activo
      ? <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
      : <path d="m23 9-6 6M17 9l6 6" />}
  </svg>
);

const IconoMusica = ({ activo }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
    {!activo && <path d="M3 3l18 18" />}
  </svg>
);

const SelectorNivel = ({ nivel, onCambio, etiqueta = 'Nivel' }) => (
  <div className="niveles" role="radiogroup" aria-label={etiqueta} style={{ '--i': Object.keys(NIVELES).indexOf(nivel) }}>
    {Object.entries(NIVELES).map(([id, n]) => (
      <button key={id} type="button" role="radio" aria-checked={nivel === id} className={nivel === id ? 'activo' : ''} onClick={() => onCambio(id)}>
        {n.nombre}
      </button>
    ))}
  </div>
);

const TablaRanking = ({ lista, destacada }) => (
  lista.length ? (
    <ol className="tabla-ranking">
      {lista.map((fila, i) => (
        <li key={`${fila.nombre}-${fila.tiempo}`} className={destacada === i + 1 ? 'tuyo' : ''}>
          <span className="puesto">{i + 1}</span>
          <span className="quien">
            {fila.linkedin
              ? <a href={fila.linkedin} target="_blank" rel="nofollow ugc noopener noreferrer">{fila.nombre}</a>
              : fila.nombre}
          </span>
          <span className="tiempo">{formatoTiempo(fila.tiempo)}</span>
        </li>
      ))}
    </ol>
  ) : (
    <p className="ranking-vacio">Todavía nadie ha completado este nivel. El primer puesto está libre.</p>
  )
);

const Despliegue = () => {
  const lienzoRef = useRef(null);
  const cajaRef = useRef(null);
  const juego = useRef(null);
  const [fase, setFase] = useState('inicio'); // inicio | jugando | ganado | rollback
  const [cine, setCine] = useState(false); // pantalla completa, también en el resumen final
  const [recogidas, setRecogidas] = useState([]);
  const [aplastados, setAplastados] = useState(0);
  const [maximo, setMaximo] = useState(0);
  const [aviso, setAviso] = useState(null); // { tipo: 'bug', skill }
  const [golpe, setGolpe] = useState(false);
  const [nivel, setNivel] = useState(leerNivel);
  const temporizador = useRef(null);
  const [registro, setRegistro] = useState([]); // habilidades recién desplegadas, con su explicación
  // Ranking: datos públicos, la partida en el servidor y el récord de quien acaba de ganar
  const [ranking, setRanking] = useState(null); // { facil: [], normal: [], dificil: [] }
  const [rankingError, setRankingError] = useState(false);
  const [nivelRanking, setNivelRanking] = useState(leerNivel);
  const partida = useRef(null); // { token, nivel } (promesa del servidor)
  const [resumen, setResumen] = useState(null); // { tiempo, nivel, registrada }
  const [record, setRecord] = useState({ estado: 'nada' }); // nada | comprobando | puede | guardando | guardado | error
  const jugando = fase === 'jugando';
  const sonido = useRef(null); // se crea con el primer clic en «Desplegar» (el navegador lo exige)
  const [conMusica, setConMusica] = useState(() => leerPreferencia('despliegue-musica'));
  const [conEfectos, setConEfectos] = useState(() => leerPreferencia('despliegue-efectos'));

  const cambiarMusica = () => {
    const si = !conMusica;
    setConMusica(si);
    sonido.current?.activarMusica(si);
    try { localStorage.setItem('despliegue-musica', si ? 'si' : 'no'); } catch { /* no se recuerda */ }
  };

  // Los atajos M y N usan siempre la versión actual de estas funciones
  const cambiarMusicaRef = useRef(null);
  const cambiarEfectosRef = useRef(null);

  const cambiarEfectos = () => {
    const si = !conEfectos;
    setConEfectos(si);
    sonido.current?.activarEfectos(si);
    try { localStorage.setItem('despliegue-efectos', si ? 'si' : 'no'); } catch { /* no se recuerda */ }
  };
  cambiarMusicaRef.current = cambiarMusica;
  cambiarEfectosRef.current = cambiarEfectos;

  const cargarRanking = useCallback(async () => {
    try {
      const datos = await pedirRanking();
      setRanking(datos.ranking);
      setRankingError(false);
      return datos.ranking;
    } catch {
      setRankingError(true);
      return null;
    }
  }, []);

  useEffect(() => { cargarRanking(); }, [cargarRanking]);

  // Registro de despliegue: cada habilidad recogida se queda un rato en la esquina para poder leerla
  const anotar = useCallback((skill) => {
    const clave = `${skill.id}-${Date.now()}`;
    setRegistro((r) => [{ clave, skill }, ...r].slice(0, 3));
    setTimeout(() => setRegistro((r) => r.filter((x) => x.clave !== clave)), 7000);
  }, []);

  const avisar = useCallback((nuevo, ms) => {
    clearTimeout(temporizador.current);
    setAviso(nuevo);
    temporizador.current = setTimeout(() => setAviso(null), ms);
  }, []);

  // Tamaño del lienzo según la caja, con la densidad de la pantalla
  const medir = useCallback(() => {
    const lienzo = lienzoRef.current;
    const caja = cajaRef.current;
    if (!lienzo || !caja) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = caja.clientWidth;
    const h = caja.clientHeight;
    lienzo.width = w * dpr;
    lienzo.height = h * dpr;
    const j = juego.current;
    if (j) {
      j.w = w; j.h = h; j.dpr = dpr;
      j.ancho = w < 600 ? 120 : 180;
      j.letra = w < 600 ? 13 : 16;
      if (!j.x) j.x = j.objetivo = w / 2;
    }
  }, []);

  const salirDePantallaCompleta = () => {
    if (!pantallaCompleta()) return;
    (document.exitFullscreen || document.webkitExitFullscreen)?.call(document).catch?.(() => {});
  };

  // Sale del modo cine. Si la partida estaba en marcha, se abandona y vuelve al inicio;
  // si ya había terminado, el resumen se queda en la página.
  const salirDelCine = useCallback(() => {
    salirDePantallaCompleta();
    sonido.current?.pararMusica();
    setCine(false);
    setAviso(null);
    setFase((f) => {
      if (f !== 'jugando') return f;
      if (juego.current) juego.current.terminado = true;
      return 'inicio';
    });
  }, []);

  // Fin de partida: se queda en pantalla completa con el resumen. Si ha ganado, el servidor
  // apunta la hora de fin y se comprueba si el tiempo entra en el top 10 del nivel.
  const terminar = useCallback(async (siguiente) => {
    const j = juego.current;
    if (j) j.terminado = true;
    setAviso(null);
    sonido.current?.pararMusica();
    if (siguiente === 'ganado') sonido.current?.ganar();
    if (siguiente === 'rollback') sonido.current?.perder();
    const tiempoLocal = j ? (performance.now() - j.inicioMs) / 1000 : null;
    const nivelPartida = j?.nivelId ?? 'normal';
    setResumen({ tiempo: tiempoLocal, nivel: nivelPartida, registrada: false });
    setRecord({ estado: siguiente === 'ganado' ? 'comprobando' : 'nada' });
    setFase(siguiente);
    if (siguiente !== 'ganado') return;

    try {
      const datos = await partida.current;
      if (!datos?.token) throw new Error();
      const fin = await pedirRanking({ accion: 'terminar', token: datos.token });
      if (!fin.ok) throw new Error();
      setResumen({ tiempo: fin.tiempo, nivel: nivelPartida, registrada: true });
      const actual = (await cargarRanking()) ?? { facil: [], normal: [], dificil: [] };
      setNivelRanking(nivelPartida);
      setRecord({ estado: entraEnTop(actual[nivelPartida] ?? [], fin.tiempo) ? 'puede' : 'nada', token: datos.token });
    } catch {
      setRecord({ estado: 'sin-servidor' });
    }
  }, [cargarRanking]);

  const guardarRecord = async (e) => {
    e.preventDefault();
    const formulario = new FormData(e.currentTarget);
    setRecord((r) => ({ ...r, estado: 'guardando', error: '' }));
    try {
      const datos = await pedirRanking({
        accion: 'guardar',
        token: record.token,
        nombre: formulario.get('nombre'),
        linkedin: formulario.get('linkedin'),
      });
      if (datos.ranking) setRanking(datos.ranking);
      if (!datos.ok) throw new Error(datos.error);
      setRecord({ estado: 'guardado', posicion: datos.posicion });
    } catch (err) {
      setRecord((r) => ({ ...r, estado: 'puede', error: err.message || 'No se ha podido guardar.' }));
    }
  };

  const elegirNivel = (id) => {
    setNivel(id);
    setNivelRanking(id);
    try { localStorage.setItem('despliegue-nivel', id); } catch { /* sin almacenamiento: no se recuerda */ }
  };

  const empezar = useCallback(() => {
    juego.current = {
      nivel: NIVELES[nivel], nivelId: nivel, inicioMs: performance.now(),
      w: 0, h: 0, dpr: 1, x: 0, objetivo: 0, ancho: 180, letra: 16, teclas: 0,
      recarga: 0, balas: [],
      objetos: [], particulas: [], recogidas: new Set(), orden: [], aplastados: 0, maximo: 0,
      siguiente: 0.6, primero: true, t: 0, ultimo: null, flash: 0, terminado: false,
    };
    if (!sonido.current) sonido.current = crearSonido();
    sonido.current?.reanudar();
    sonido.current?.activarMusica(conMusica);
    sonido.current?.activarEfectos(conEfectos);
    sonido.current?.iniciarMusica(nivel);
    // El servidor apunta la hora de inicio; si no responde, se juega igual pero sin ranking
    partida.current = pedirRanking({ accion: 'empezar', nivel }).catch(() => null);
    setRecogidas([]);
    setMaximo(0);
    setAplastados(0);
    setAviso(null);
    setRegistro([]);
    setResumen(null);
    setRecord({ estado: 'nada' });
    setFase('jugando');
    // Modo cine: pantalla completa si el navegador la permite (en iPhone basta con la capa fija)
    if (!cine) {
      setCine(true);
      const caja = cajaRef.current;
      const pedir = caja?.requestFullscreen || caja?.webkitRequestFullscreen;
      if (pedir) {
        try { pedir.call(caja)?.catch?.(() => {}); } catch { /* sin pantalla completa: se queda la capa fija */ }
      }
    }
  }, [nivel, cine, conMusica, conEfectos]);

  // Bucle del juego
  useEffect(() => {
    if (!jugando) return undefined;
    const lienzo = lienzoRef.current;
    const ctx = lienzo.getContext('2d');
    const fuente = getComputedStyle(document.documentElement).getPropertyValue('--font-body').trim() || 'sans-serif';
    let id;

    const estallido = (j, x, y, color, n, fuerza) => {
      for (let i = 0; i < n; i++) {
        j.particulas.push({ x, y, vx: (Math.random() - 0.5) * fuerza, vy: -Math.random() * fuerza, vida: 0.7, color });
      }
    };

    // Un bug en producción tumba la última habilidad desplegada, que vuelve a caer.
    // Si tumba la última que quedaba, la barra se queda a cero: rollback.
    const bugEnProduccion = (j) => {
      j.flash = 0.35;
      j.cara = { tipo: 'susto', hasta: j.t + 0.9 };
      sonido.current?.golpe();
      setGolpe(true);
      setTimeout(() => setGolpe(false), 400);
      const caida = j.orden.pop();
      if (!caida) {
        avisar({ tipo: 'bug' }, 1400);
        return;
      }
      j.recogidas.delete(caida.id);
      setRecogidas([...j.recogidas]);
      avisar({ tipo: 'bug', skill: caida }, 1800);
      if (!j.orden.length) {
        j.terminado = true;
        setTimeout(() => terminar('rollback'), 700);
      }
    };

    const paso = (ahora) => {
      const j = juego.current;
      if (!j || j.terminado) return;
      if (!j.w) medir();
      const dt = j.ultimo == null ? 0 : Math.min((ahora - j.ultimo) / 1000, 0.05);
      j.ultimo = ahora;
      j.t += dt;
      const progreso = j.recogidas.size / SKILLS.length;
      const suelo = j.h - 14 - 100 * (j.ancho / 180); // borde de la bandeja

      // Servidor: sigue al puntero o a las flechas
      if (j.teclas) j.objetivo += j.teclas * 680 * dt;
      const m = alcance(j);
      j.objetivo = Math.max(m.robotMin, Math.min(m.robotMax, j.objetivo));
      j.x += (j.objetivo - j.x) * Math.min(1, dt * 16);

      // Disparo
      j.recarga -= dt;
      if (j.recarga <= 0) {
        j.recarga = CADENCIA;
        j.balas.push({ x: manos(j).pistolaX, y: suelo - 18 * m.e });
        j.ultimoDisparo = j.t;
        sonido.current?.disparo();
      }
      j.balas = j.balas.filter((b) => (b.y -= 760 * dt) > -20);

      // Aparición de habilidades y bugs
      j.siguiente -= dt;
      if (j.siguiente <= 0) {
        j.siguiente = (0.85 - progreso * 0.3 + Math.random() * 0.25) * j.nivel.ritmo;
        const cayendo = new Set(j.objetos.filter((o) => o.skill).map((o) => o.skill.id));
        const libres = SKILLS.filter((s) => !j.recogidas.has(s.id) && !cayendo.has(s.id));
        const bug = !j.primero && (!libres.length || Math.random() < j.nivel.bugs + progreso * 0.12);
        j.primero = false;
        const vel = (120 + progreso * 110 + Math.random() * 45) * j.nivel.velocidad;
        if (bug) {
          const x0 = m.pistolaMin + 6 + Math.random() * (m.pistolaMax - m.pistolaMin - 12);
          j.objetos.push({ tipo: 'bug', x0, x: x0, y: -30, vy: vel * 0.9, fase: Math.random() * 6, zigzag: (20 + Math.random() * 40) * j.nivel.zigzag });
        } else {
          const skill = libres[Math.floor(Math.random() * libres.length)];
          ctx.font = `600 ${j.letra}px ${fuente}`;
          const ancho = ctx.measureText(skill.nombre).width + j.letra * 2;
          j.objetos.push({ tipo: 'skill', skill, ancho, x: ancho / 2 + 8 + Math.random() * Math.max(0, m.bandejaDer - 12 - (ancho / 2 + 8)), y: -24, vy: vel, giro: (Math.random() - 0.5) * 0.3 });
        }
      }

      // Caída, disparos y recogida
      const { bandejaX, bandejaW } = manos(j);
      const izq = bandejaX - bandejaW / 2;
      const der = bandejaX + bandejaW / 2;
      j.objetos = j.objetos.filter((o) => {
        o.y += o.vy * dt;
        if (o.tipo === 'bug') {
          o.x = Math.max(m.pistolaMin + 4, Math.min(m.pistolaMax - 4, o.x0 + Math.sin(j.t * 2.2 + o.fase) * o.zigzag));
          const bala = j.balas.find((b) => Math.abs(b.x - o.x) < 16 && Math.abs(b.y - o.y) < 18);
          if (bala) {
            j.balas.splice(j.balas.indexOf(bala), 1);
            j.aplastados += 1;
            sonido.current?.aplastar();
            setAplastados(j.aplastados);
            estallido(j, o.x, o.y, '#e5484d', 12, 220);
            return false;
          }
        }
        const mitad = o.tipo === 'bug' ? 12 : o.ancho / 2;
        const abajo = o.y + (o.tipo === 'bug' ? 14 : j.letra + 2);
        if (abajo >= suelo && o.y <= suelo + 8 && o.x + mitad > izq && o.x - mitad < der) {
          if (o.tipo === 'skill') {
            j.recogidas.add(o.skill.id);
            j.orden.push(o.skill);
            j.maximo = Math.max(j.maximo, j.recogidas.size);
            estallido(j, o.x, suelo, o.skill.fondo, 14, 260);
            j.cara = { tipo: 'feliz', hasta: j.t + 0.8 };
            setRecogidas([...j.recogidas]);
            setMaximo(j.maximo);
            anotar(o.skill);
            sonido.current?.recoger();
            if (j.recogidas.size === SKILLS.length) {
              j.terminado = true;
              setTimeout(() => terminar('ganado'), 500);
            }
          } else {
            bugEnProduccion(j);
          }
          return false;
        }
        // Un bug que llega al suelo también entra en producción
        if (o.tipo === 'bug' && o.y >= j.h - 14) {
          bugEnProduccion(j);
          return false;
        }
        return o.y < j.h + 40;
      });

      j.particulas = j.particulas.filter((p) => {
        p.vida -= dt;
        p.vy += 600 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        return p.vida > 0;
      });
      j.flash = Math.max(0, j.flash - dt);

      // Dibujo
      ctx.setTransform(j.dpr, 0, 0, j.dpr, 0, 0);
      ctx.clearRect(0, 0, j.w, j.h);
      ctx.fillStyle = 'rgba(234, 229, 202, 0.05)';
      for (let gx = 20; gx < j.w; gx += 40) for (let gy = 20; gy < j.h; gy += 40) ctx.fillRect(gx, gy, 1.5, 1.5);

      // Línea de producción: lo que la cruza ya está publicado
      ctx.fillStyle = j.flash ? 'rgba(229, 72, 77, .5)' : 'rgba(167, 213, 245, .12)';
      ctx.fillRect(0, j.h - 14, j.w, 1);

      for (const o of j.objetos) {
        if (o.tipo === 'bug') { dibujarBug(ctx, o, j.t); continue; }
        ctx.save();
        ctx.translate(o.x, o.y);
        ctx.rotate(o.giro * Math.sin(j.t * 2 + o.x));
        ctx.shadowColor = o.skill.fondo;
        ctx.shadowBlur = 14;
        ctx.fillStyle = o.skill.fondo;
        pastilla(ctx, -o.ancho / 2, -(j.letra + 2), o.ancho, (j.letra + 2) * 2, j.letra + 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        if (o.skill.fondo === '#000000' || o.skill.fondo === '#2A2A2A') {
          ctx.strokeStyle = 'rgba(234,229,202,.35)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.fillStyle = o.skill.texto;
        ctx.font = `600 ${j.letra}px ${fuente}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(o.skill.nombre, 0, 1);
        ctx.restore();
      }

      ctx.shadowColor = '#A7D5F5';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#EAE5CA';
      for (const b of j.balas) {
        pastilla(ctx, b.x - 2, b.y - 9, 4, 18, 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      for (const p of j.particulas) {
        ctx.globalAlpha = Math.max(0, p.vida / 0.7);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2.5, p.y - 2.5, 5, 5);
      }
      ctx.globalAlpha = 1;

      dibujarRobot(ctx, j, suelo);

      id = requestAnimationFrame(paso);
    };

    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [jugando, avisar, anotar, medir, terminar]);

  // Controles: el puntero (ratón o dedo) mueve el robot en toda la pantalla, también las flechas.
  // Dispara solo.
  useEffect(() => {
    if (!jugando) return undefined;
    const lienzo = lienzoRef.current;
    const mover = (e) => {
      const r = lienzo.getBoundingClientRect();
      if (juego.current) juego.current.objetivo = e.clientX - r.left;
    };
    const teclaAbajo = (e) => {
      const j = juego.current;
      if (!j) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') { j.teclas = -1; e.preventDefault(); }
      if (e.key === 'ArrowRight' || e.key === 'd') { j.teclas = 1; e.preventDefault(); }
    };
    const teclaArriba = (e) => {
      const j = juego.current;
      if (j && ['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) j.teclas = 0;
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerdown', mover);
    window.addEventListener('keydown', teclaAbajo);
    window.addEventListener('keyup', teclaArriba);
    return () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerdown', mover);
      window.removeEventListener('keydown', teclaAbajo);
      window.removeEventListener('keyup', teclaArriba);
    };
  }, [jugando]);

  // Modo cine: Esc (o salir de la pantalla completa del navegador) lo cierra
  useEffect(() => {
    if (!cine) return undefined;
    const tecla = (e) => {
      // Mientras se escribe el récord, las teclas no hacen nada más
      if (e.target.closest?.('input')) return;
      if (e.key === 'Escape') salirDelCine();
      if (e.key === 'm' || e.key === 'M') cambiarMusicaRef.current();
      if (e.key === 'n' || e.key === 'N') cambiarEfectosRef.current();
    };
    const cambioPantalla = () => { if (!pantallaCompleta()) salirDelCine(); };
    const observador = new ResizeObserver(medir);
    observador.observe(cajaRef.current);
    window.addEventListener('keydown', tecla);
    document.addEventListener('fullscreenchange', cambioPantalla);
    document.addEventListener('webkitfullscreenchange', cambioPantalla);
    document.body.classList.add('despliegue-cine');
    return () => {
      observador.disconnect();
      window.removeEventListener('keydown', tecla);
      document.removeEventListener('fullscreenchange', cambioPantalla);
      document.removeEventListener('webkitfullscreenchange', cambioPantalla);
      document.body.classList.remove('despliegue-cine');
    };
  }, [cine, medir, salirDelCine]);

  useEffect(() => () => {
    clearTimeout(temporizador.current);
    salirDePantallaCompleta();
    sonido.current?.cerrar();
  }, []);

  const irA = (id) => {
    salirDelCine();
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 150);
  };
  const total = SKILLS.length;
  const gano = fase === 'ganado';
  const listaRanking = ranking?.[nivelRanking] ?? [];

  return (
    <div className="despliegue">
      <header className="despliegue-cabecera">
        <span className="despliegue-etiqueta">SKILLS</span>
        <h1>A producción<span className="punto">.</span></h1>
        <p>Mis habilidades van camino de producción, y con ellas, algún bug. Recoge las habilidades, dispara a los bugs y cada una te contará dónde la he usado.</p>
      </header>

      <div className={`despliegue-juego ${cine ? 'cine' : ''} ${golpe ? 'golpe' : ''}`} ref={cajaRef}>
        <canvas ref={lienzoRef} className="despliegue-lienzo" aria-label="Juego: recoge habilidades con el robot y dispara a los bugs" />

        {jugando && (
          <div className="despliegue-marcador" aria-live="polite">
            <span className="etiqueta-barra">DESPLIEGUE</span>
            <div className={`barra ${golpe ? 'golpe' : ''}`} aria-label={`Despliegue: ${recogidas.length} de ${total} habilidades`}>
              <span style={{ width: `${(recogidas.length / total) * 100}%` }} />
            </div>
            <span className="cuenta">{recogidas.length}/{total}</span>
            <span className="nivel-actual">{NIVELES[nivel].nombre.toUpperCase()}</span>
            <span className="cazados" aria-label={`${aplastados} bugs eliminados`}>BUGS {aplastados}</span>
            <button type="button" className={`despliegue-salir ${conMusica ? '' : 'apagado'}`} onClick={cambiarMusica} aria-pressed={conMusica} aria-label="Música (tecla M)" title="Música (tecla M)">
              <kbd>M</kbd> <IconoMusica activo={conMusica} />
            </button>
            <button type="button" className={`despliegue-salir ${conEfectos ? '' : 'apagado'}`} onClick={cambiarEfectos} aria-pressed={conEfectos} aria-label="Efectos de sonido (tecla N)" title="Efectos de sonido (tecla N)">
              <kbd>N</kbd> <IconoSonido activo={conEfectos} />
            </button>
            <button type="button" className="despliegue-salir" onClick={salirDelCine}>
              <kbd>ESC</kbd> SALIR
            </button>
          </div>
        )}

        {jugando && registro.length > 0 && (
          <ol className="despliegue-registro" aria-live="polite">
            {registro.map(({ clave, skill }) => (
              <li key={clave}>
                <b style={{ background: skill.fondo, color: skill.texto }}>{skill.nombre}</b>
                <span>{skill.uso}</span>
              </li>
            ))}
          </ol>
        )}

        {jugando && aviso && (
          <div className="despliegue-aviso bug" key={`bug-${aviso.skill?.id ?? 'vacio'}-${recogidas.length}`}>
            <span>¡Bug en producción!{aviso.skill ? ` Se ha caído ${aviso.skill.nombre}.` : ''}</span>
          </div>
        )}

        {fase === 'inicio' && (
          <div className="despliegue-pantalla">
            <h2>¿Lo llevamos a producción?</h2>
            <p>Mueve el robot con el ratón, el dedo o las flechas: dispara solo a los bugs. Recoge las {total} habilidades hasta llenar la barra. Cada bug que llega a producción tumba una, y si te dejan la barra a cero, rollback.</p>
            <SelectorNivel nivel={nivel} onCambio={elegirNivel} />
            <div className="acciones">
              <button type="button" className="principal" onClick={empezar}>DESPLEGAR</button>
              <button type="button" onClick={() => irA('ranking')}>VER EL RANKING</button>
            </div>
            <div className="sonido-inicio">
              <button type="button" className={conMusica ? '' : 'apagado'} onClick={cambiarMusica} aria-pressed={conMusica}>
                <IconoMusica activo={conMusica} /> Música
              </button>
              <button type="button" className={conEfectos ? '' : 'apagado'} onClick={cambiarEfectos} aria-pressed={conEfectos}>
                <IconoSonido activo={conEfectos} /> Efectos
              </button>
            </div>
            <small className="pista">Se juega a pantalla completa. Esc para salir; M y N, música y efectos. <button type="button" className="enlace" onClick={() => irA('todas-las-skills')}>Ver mis skills sin jugar</button></small>
          </div>
        )}

        {(gano || fase === 'rollback') && resumen && (
          <div className="despliegue-pantalla resumen">
            <h2>{gano ? 'Desplegado.' : 'Rollback.'}</h2>
            <p>{gano
              ? 'Las 17 habilidades están en producción. Ahora mira dónde las he usado.'
              : 'Los bugs han dejado la barra a cero.'}</p>

            <dl className="resumen-datos">
              <div><dt>Tiempo</dt><dd>{formatoTiempo(resumen.tiempo)}</dd></div>
              <div><dt>Habilidades</dt><dd>{gano ? total : maximo}/{total}</dd></div>
              <div><dt>Bugs eliminados</dt><dd>{aplastados}</dd></div>
              <div><dt>Nivel</dt><dd>{NIVELES[resumen.nivel].nombre}</dd></div>
            </dl>

            {gano && record.estado === 'comprobando' && <p className="resumen-nota">Comprobando el ranking…</p>}
            {gano && record.estado === 'sin-servidor' && <p className="resumen-nota">Esta partida no se ha podido registrar en el ranking.</p>}
            {gano && (record.estado === 'puede' || record.estado === 'guardando') && (
              <form className="resumen-record" onSubmit={guardarRecord}>
                <strong>¡Entras en el top 10 del nivel {NIVELES[resumen.nivel].nombre}!</strong>
                <div className="campos">
                  <input name="nombre" placeholder="Tu nombre" maxLength={24} required autoComplete="name" aria-label="Tu nombre" />
                  <input name="linkedin" type="text" inputMode="url" autoCapitalize="off" spellCheck={false} placeholder="linkedin.com/in/… (opcional)" maxLength={200} aria-label="Enlace a tu perfil de LinkedIn (opcional)" />
                  <button type="submit" className="principal" disabled={record.estado === 'guardando'}>
                    {record.estado === 'guardando' ? 'GUARDANDO…' : 'GUARDAR'}
                  </button>
                </div>
                {record.error && <p className="error">{record.error}</p>}
                <small>Tu nombre y tu LinkedIn aparecerán en el ranking público de esta página.</small>
              </form>
            )}
            {gano && record.estado === 'guardado' && (
              <div className="resumen-ranking">
                <strong>Puesto {record.posicion} del nivel {NIVELES[resumen.nivel].nombre}.</strong>
                <TablaRanking lista={ranking?.[resumen.nivel] ?? []} destacada={record.posicion} />
              </div>
            )}

            <SelectorNivel nivel={nivel} onCambio={elegirNivel} />
            <div className="acciones">
              <button type="button" className="principal" onClick={empezar}>{gano ? 'JUGAR OTRA VEZ' : 'REINTENTAR'}</button>
              {gano
                ? <Link to="/lab" className="boton">VER LOS PROYECTOS</Link>
                : <button type="button" onClick={() => irA('todas-las-skills')}>VER TODAS</button>}
              <button type="button" onClick={() => irA('ranking')}>VER EL RANKING</button>
            </div>
            {cine && <small className="pista">Pulsa Esc para salir de la pantalla completa.</small>}
          </div>
        )}
      </div>

      <section className="despliegue-ranking" id="ranking">
        <div className="ranking-cabecera">
          <h2>Top 10: los despliegues más rápidos</h2>
          <SelectorNivel nivel={nivelRanking} onCambio={setNivelRanking} etiqueta="Nivel del ranking" />
        </div>
        {rankingError && !ranking
          ? <p className="ranking-vacio">El ranking no está disponible ahora mismo.</p>
          : ranking
            ? <TablaRanking lista={listaRanking} destacada={record.estado === 'guardado' && resumen?.nivel === nivelRanking ? record.posicion : null} />
            : <p className="ranking-vacio">Cargando el ranking…</p>}
      </section>

      <section className="despliegue-lista" id="todas-las-skills">
        <h2>Todas mis habilidades</h2>
        <div className="grupos">
          {GRUPOS.map((g) => (
            <div className="grupo" key={g.id}>
              <h3>{g.nombre}</h3>
              <ul>
                {SKILLS.filter((s) => s.grupo === g.id).map((s) => (
                  <li key={s.id} className={recogidas.includes(s.id) ? 'recogida' : ''}>
                    <b style={{ background: s.fondo, color: s.texto }}>{s.nombre}</b>
                    <span>{s.uso}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Despliegue;

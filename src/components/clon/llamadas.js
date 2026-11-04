// Llamadas de atención del clon con el chat cerrado: el avatar del botón crece y saca un bocadillo según dónde está el
// visitante y qué hace. Sin agobiar: como mucho 5 cada media hora de las que salen por iniciativa del clon (las reacciones a
// algo que hace el visitante no cuentan), al menos 25 s entre una y otra, ninguna si pidió «No
// molestes», ni mientras desplaza la página, escribe o juega al juego de skills. Cada una sale una sola vez por visita.
import { useEffect, useRef } from 'react';
import { llamadaDeProyecto } from './proyectos-clon';

// Textos aprobados por Ronald (4/11/2026). cara / cuerpo / gesto: lo que hace el avatar al salir (expresión, gesto de
// cuerpo entero y gesto de cabeza); sugerencias: las primeras preguntas del chat si se abre desde el bocadillo
export const LLAMADAS = {
  bienvenida: { texto: 'Psst… aquí abajo. Soy yo, Ronald, en versión IA. ¿Te cuento algo?', cuerpo: 'saludar' },
  vuelta: { texto: '¡Hola otra vez! ¿Seguimos donde lo dejamos?', cara: 'alegre', cuerpo: 'saludar' },
  noche: { texto: '¿Trabajando a estas horas? Yo también, no duermo nunca.', cuerpo: 'bostezo' },
  proyectos: {
    texto: '¿Ves esos proyectos? Los hice yo solo, de principio a fin. Pregúntame cómo.',
    cuerpo: 'asentir',
    sugerencias: ['¿Cuál es tu proyecto más complejo?', '¿Qué proyecto tiene usuarios reales?', '¿Cómo está hecho Fycheo?'],
  },
  lab: {
    texto: 'Esto es el Lab: todos mis proyectos, cada uno con su presentación. Detrás de cada uno hay una historia, ¿te la cuento?',
    cuerpo: 'saludar',
    sugerencias: ['¿Qué fue lo más difícil de Tankily?', '¿Qué hiciste tú en cada proyecto?', '¿Cómo nació Walkiton?'],
  },
  contacto: {
    texto: 'Aquí puedes escribirme y te contesto en menos de 24 horas. Si antes tienes dudas, pregúntame ahora.',
    cuerpo: 'saludar',
    sugerencias: ['¿Buscas remoto o presencial?', '¿Cuándo podrías incorporarte?', 'Quiero que me contactes'],
  },
  skills: { texto: 'Esto es mi juego de skills: un robot recoge mis habilidades y dispara a los bugs. ¿Te atreves?', cara: '😏', cuerpo: 'saludar', sugerencias: ['¿Qué stack dominas?', '¿Qué estás aprendiendo ahora?'] },
  privacidad: { texto: 'Aquí te cuento qué datos se guardan y para qué. Si algo no queda claro, pregúntame.', cuerpo: 'asentir', sugerencias: ['¿Qué haces con mis datos?', '¿Guardas esta conversación?'] },
  quieto: { texto: 'Sigo aquí, por si te apetece hablar.', cuerpo: 'mirar-a-otro-lado' },
  salida: { texto: '¿Ya te vas? Déjame tu contacto y te escribo yo.', cuerpo: 'encogerse', sugerencias: ['Quiero que me contactes', '¿Cómo puedo contactarte?'] },
  cv: { texto: 'Buena elección. Aunque yo te lo cuento más rápido.', cara: '😏', gesto: 'ladear' },
  cvDescargado: { texto: '¡Gracias por llevártelo! Si te surge alguna duda, aquí estoy.', cuerpo: 'gracias' },
  rapido: { texto: 'Ey, más despacio, que me mareo.', cara: '😬', gesto: 'negar' },
  final: { texto: '¿Ya lo has visto todo? Aún me quedan cosas por contarte.', cuerpo: 'encogerse' },
  casi: { texto: '¿Ibas a decirme algo?', cara: 'duda', gesto: 'ladear' },
  copiado: { texto: '¿Copiando algo? Si es para tu informe, pregúntame y te lo resumo.', cara: '😉' },
  vuelves: { texto: '¡Has vuelto! Te estaba esperando.', cara: 'alegre', cuerpo: 'celebrar' },
};

const SESION = 'rh-clon-llamadas';   // { vistas: [ids], ultima: ms, cerrado: bool, inicio: ms } de esta visita
const VISITANTE = 'rh-clon-visto';   // ya vino otro día
const MAXIMO = 5;
// Cada media hora se empieza de cero: vuelven a poder salir todas (el «No molestes» se mantiene toda la visita)
const RENOVAR = 30 * 60 * 1000;
// Reacciones a algo que hace el visitante: no cuentan en el máximo (sí respetan los 25 s entre una y otra)
const REACCIONES = new Set(['cv', 'cvDescargado', 'rapido', 'final', 'casi', 'copiado', 'vuelves']);
// Las que cuentan qué es cada sección, la primera vez que se entra en la visita: tampoco cuentan, y solo salen si el
// visitante sigue en esa sección (si se fue antes, ya no)
const PAGINAS = { lab: '/lab', contacto: '/contacto', skills: '/skills', privacidad: '/privacidad' };
// Y las de cada presentación de proyecto del Lab (proyecto-<id>): solo mientras se está viendo ese proyecto
const esDeProyecto = (id) => id.startsWith('proyecto-');
const sinMaximo = (id) => REACCIONES.has(id) || id in PAGINAS || esDeProyecto(id);
const ENTRE = 25000;

function leer() {
  const vacio = { vistas: [], ultima: 0, cerrado: false, inicio: Date.now() };
  let estado = vacio;
  try { estado = { ...vacio, ...JSON.parse(sessionStorage.getItem(SESION) || '{}') }; } catch { /* sin almacenamiento */ }
  if (Date.now() - estado.inicio > RENOVAR) estado = { ...vacio, cerrado: estado.cerrado };
  return estado;
}
function guardar(estado) {
  try { sessionStorage.setItem(SESION, JSON.stringify(estado)); } catch { /* sin almacenamiento */ }
}

// ¿Ya vino otro día? Se decide una vez por visita (si no, la segunda página de hoy ya contaría como «otro día»)
function esOtroDia() {
  try {
    const hoy = sessionStorage.getItem('rh-clon-otro-dia');
    if (hoy !== null) return hoy === '1';
    const otro = Boolean(localStorage.getItem(VISITANTE));
    localStorage.setItem(VISITANTE, '1');
    sessionStorage.setItem('rh-clon-otro-dia', otro ? '1' : '0');
    return otro;
  } catch { return false; }
}

// «No molestes»: ya no sale ninguna llamada ni gesto en esta visita
export function cerrarLlamadas() {
  guardar({ ...leer(), cerrado: true });
}
export function llamadasCerradas() {
  return leer().cerrado;
}
// Jugando al juego de skills (lo marca Skills.jsx)
export const jugando = () => document.documentElement.hasAttribute('data-jugando');

// Avisa con alMostrar(id, llamada) cuando toca una llamada. activo: el chat está cerrado y el botón a la vista;
// proyecto: el del Lab cuya presentación se está viendo (proyectos-clon.js), o null
export function useLlamadas({ activo, ruta, proyecto = null, alMostrar }) {
  const alMostrarRef = useRef(alMostrar);
  useEffect(() => { alMostrarRef.current = alMostrar; });
  const activoRef = useRef(activo);
  useEffect(() => { activoRef.current = activo; }, [activo]);
  const movimiento = useRef({ scroll: 0, actividad: 0 });
  const rutaRef = useRef(ruta);
  useEffect(() => { rutaRef.current = ruta; }, [ruta]);
  const proyectoRef = useRef(proyecto);
  useEffect(() => { proyectoRef.current = proyecto; }, [proyecto]);

  // Intenta mostrar una llamada; si ahora no se puede (desplazando, escribiendo, muy seguida), lo reintenta luego.
  // conScroll: las que salen precisamente al desplazar (bajar muy rápido, llegar al final)
  const intentar = useRef(() => {});
  useEffect(() => {
    intentar.current = function probar(id, { reintentos = 3, conScroll = false } = {}) {
      const estado = leer();
      const propias = estado.vistas.filter((v) => !sinMaximo(v)).length;
      if (!activoRef.current || estado.cerrado || estado.vistas.includes(id) || (!sinMaximo(id) && propias >= MAXIMO)) return;
      if (id in PAGINAS && (!rutaRef.current.startsWith(PAGINAS[id]) || proyectoRef.current)) return;
      if (esDeProyecto(id) && `proyecto-${proyectoRef.current?.id}` !== id) return;
      const ahora = Date.now();
      const escribiendo = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
      const desplazando = !conScroll && ahora - movimiento.current.scroll < 1500;
      const seguida = ahora - estado.ultima < ENTRE;
      if (escribiendo || desplazando || seguida || jugando()) {
        if (reintentos > 0) setTimeout(() => intentar.current(id, { reintentos: reintentos - 1, conScroll }), seguida ? estado.ultima + ENTRE - ahora + 500 : 3000);
        return;
      }
      guardar({ ...estado, vistas: [...estado.vistas, id], ultima: ahora });
      alMostrarRef.current(id, esDeProyecto(id) ? llamadaDeProyecto(proyectoRef.current) : LLAMADAS[id]);
    };
  }, []);

  // Lo que hace el visitante
  useEffect(() => {
    const m = movimiento.current;
    m.actividad = Date.now();
    let ultimoY = window.scrollY;
    let ultimoT = performance.now();
    const alDesplazar = () => {
      m.scroll = Date.now();
      m.actividad = Date.now();
      // Muy rápido (más de 4.000 px por segundo)
      const t = performance.now();
      const velocidad = (Math.abs(window.scrollY - ultimoY) / Math.max(1, t - ultimoT)) * 1000;
      if (t - ultimoT > 60) { ultimoY = window.scrollY; ultimoT = t; }
      if (velocidad > 4000) intentar.current('rapido', { reintentos: 0, conScroll: true });
      // Al final de una página larga
      const alto = document.documentElement.scrollHeight;
      if (alto > window.innerHeight * 2 && window.scrollY + window.innerHeight >= alto - 40) intentar.current('final', { reintentos: 1, conScroll: true });
    };
    // Cerca del botón y se va sin abrirlo (ratón): «¿Ibas a decirme algo?»
    let cercaDesde = 0;
    const alMover = (e) => {
      m.actividad = Date.now();
      if (e.pointerType !== 'mouse') return;
      const distancia = Math.hypot(window.innerWidth - 90 - e.clientX, window.innerHeight - 50 - e.clientY);
      if (distancia < 150) cercaDesde = Date.now();
      else if (cercaDesde && distancia > 350) {
        if (Date.now() - cercaDesde < 4000) intentar.current('casi', { reintentos: 0 });
        cercaDesde = 0;
      }
    };
    const alActuar = () => { m.actividad = Date.now(); };
    // El CV: pasar el ratón por el botón de descarga y descargarlo
    const esCv = (e) => e.target.closest?.('a[href$="ronald-herrera-cv.pdf"]');
    const alPasar = (e) => { if (e.pointerType === 'mouse' && esCv(e)) intentar.current('cv', { reintentos: 0 }); };
    const alPulsar = (e) => { if (esCv(e)) intentar.current('cvDescargado'); };
    // Copiar texto de la página (no del chat)
    const alCopiar = (e) => { if (!e.target.closest?.('.clon-panel')) intentar.current('copiado', { reintentos: 0 }); };
    // Vuelve a la pestaña tras irse a otra un rato
    let oculta = 0;
    const alCambiarPestana = () => {
      if (document.hidden) oculta = Date.now();
      else if (oculta && Date.now() - oculta > 20000) intentar.current('vuelves', { reintentos: 1 });
    };
    // 40 s sin hacer nada
    const quieto = setInterval(() => {
      if (Date.now() - m.actividad > 40000) { intentar.current('quieto', { reintentos: 0 }); m.actividad = Date.now(); }
    }, 5000);
    // A punto de irse (ordenador): el ratón sale de la página por arriba
    const alSalir = (e) => { if (!e.relatedTarget && e.clientY <= 0) intentar.current('salida', { reintentos: 0 }); };

    window.addEventListener('scroll', alDesplazar, { passive: true });
    window.addEventListener('pointermove', alMover, { passive: true });
    window.addEventListener('keydown', alActuar);
    document.addEventListener('pointerover', alPasar);
    document.addEventListener('click', alPulsar);
    document.addEventListener('copy', alCopiar);
    document.addEventListener('visibilitychange', alCambiarPestana);
    document.addEventListener('mouseout', alSalir);
    return () => {
      window.removeEventListener('scroll', alDesplazar);
      window.removeEventListener('pointermove', alMover);
      window.removeEventListener('keydown', alActuar);
      document.removeEventListener('pointerover', alPasar);
      document.removeEventListener('click', alPulsar);
      document.removeEventListener('copy', alCopiar);
      document.removeEventListener('visibilitychange', alCambiarPestana);
      document.removeEventListener('mouseout', alSalir);
      clearInterval(quieto);
    };
  }, []);

  // Al entrar en una página: la de esa página (Lab, Contacto, juego) o la bienvenida (de noche, la de la noche).
  // En el Lab, con una presentación abierta, la de ese proyecto
  useEffect(() => {
    if (proyecto) {
      const t = setTimeout(() => intentar.current(`proyecto-${proyecto.id}`), 4000);
      return () => clearTimeout(t);
    }
    const propia = Object.keys(PAGINAS).find((id) => ruta.startsWith(PAGINAS[id])) || null;
    const hora = new Date().getHours();
    const id = propia || (hora >= 22 || hora < 7 ? 'noche' : esOtroDia() ? 'vuelta' : 'bienvenida');
    const t = setTimeout(() => intentar.current(id), propia ? 4000 : 8000);
    return () => clearTimeout(t);
  }, [ruta, proyecto?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  // En la portada, al llegar a la sección de proyectos
  useEffect(() => {
    if (ruta !== '/') return undefined;
    let observador = null;
    const buscar = setTimeout(() => {
      const seccion = document.getElementById('proyectos');
      if (!seccion) return;
      observador = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { observador.disconnect(); setTimeout(() => intentar.current('proyectos'), 1800); }
      }, { threshold: 0.35 });
      observador.observe(seccion);
    }, 1000);
    return () => { clearTimeout(buscar); observador?.disconnect(); };
  }, [ruta]);
}

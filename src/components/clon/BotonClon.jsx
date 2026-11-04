import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AvatarClon from './AvatarClon';
import { cerrarLlamadas, jugando, llamadasCerradas, useLlamadas } from './llamadas';
import { proyectoDeBusqueda } from './proyectos-clon';
import retrato from '../../assets/clon-avatar-3d.webp';
import './Clon.css';

// El panel no se descarga hasta que alguien muestra intención de abrirlo. Se guarda aquí (y no con lazy) para
// que al abrir ya esté listo y brote desde el primer fotograma
let Panel = null;
const cargarPanel = () => import('./PanelClon').then((m) => { Panel = m.default; return Panel; });

const ABIERTO = 'rh-clon-abierto';
// Lo que duran en Clon.css la entrada del panel (muelle) y su salida (se aplasta y se recoge)
const MS_ENTRAR = 520;
const MS_SALIR = 220;
const MS_LLAMADA = 7000;   // lo que se queda a la vista un bocadillo (si no tienes el ratón encima)

// Como en Tankily: el panel brota del botón como una gota y, al cerrar, se aplasta y se recoge hacia él.
// Mientras sale sigue montado (clase .saliendo) para que se vea cómo se va
export default function BotonClon() {
  // Si el chat estaba abierto, sigue abierto al recargar (en móvil no: taparía la página)
  const [abierto, setAbierto] = useState(() => {
    try { return Boolean(sessionStorage.getItem(ABIERTO)) && window.innerWidth > 560; } catch { return false; }
  });
  const [saliendo, setSaliendo] = useState(false);
  // El botón queda debajo del panel mientras este brota; luego se desmonta (su avatar 3D no gasta con el chat abierto)
  const [conBoton, setConBoton] = useState(!abierto);
  // Al cerrar, el botón vuelve con el retrato fijo y su avatar 3D se monta cuando el panel ya se ha ido
  // (montarlo bloquea la página y la salida saltaba)
  const [boton3d, setBoton3d] = useState(true);
  const [, setCargado] = useState(Boolean(Panel));
  const espera = useRef(0);
  // Llamadas de atención con el chat cerrado: el avatar crece, saluda y saca un bocadillo (ver llamadas.js)
  const { pathname, search } = useLocation();
  // En el Lab, la presentación de proyecto que se está viendo (?p=…)
  const proyecto = pathname.startsWith('/lab') ? proyectoDeBusqueda(search) : null;
  const [llamada, setLlamada] = useState(null);   // { id, texto, sugerencias, saliendo }
  const [tema, setTema] = useState(null);         // las sugerencias del bocadillo con el que se abrió el chat
  const avatarBoton = useRef(null);
  const esperaLlamada = useRef(0);

  function ocultarLlamada() {
    clearTimeout(esperaLlamada.current);
    setLlamada((l) => (l ? { ...l, saliendo: true } : l));
    esperaLlamada.current = setTimeout(() => setLlamada(null), MS_SALIR);
    avatarBoton.current?.camara('busto');   // vuelve a la cara, en su círculo
  }

  function mostrarLlamada(id, datos) {
    clearTimeout(esperaLlamada.current);
    const { cara = 'sonrisa', cuerpo, gesto } = datos;
    setLlamada({ id, ...datos, saliendo: false });
    // Crece a un recuadro con el avatar a medio cuerpo y hace el gesto de esa llamada
    avatarBoton.current?.camara('medio');
    setTimeout(() => {
      const e = avatarBoton.current;
      e?.expresion(cara, 0.85);
      if (cuerpo) e?.movimiento(cuerpo);
      if (gesto) e?.gesto(gesto, 1200);
    }, 250);
    esperaLlamada.current = setTimeout(ocultarLlamada, MS_LLAMADA);
  }

  // Con el chat cerrado y sin bocadillo, de vez en cuando un gesto pequeño, sin decir nada: un guiño, mirar a un lado,
  // asentir, encogerse… Si llevas 2 minutos quieto, bosteza; y alguna vez da dos golpecitos («toc, toc»)
  const [toc, setToc] = useState(false);
  const llamadaRef = useRef(llamada);
  useEffect(() => { llamadaRef.current = llamada; }, [llamada]);
  useEffect(() => {
    if (abierto || !conBoton || !boton3d) return undefined;
    let actividad = Date.now();
    let bostezado = false;
    let siguiente = Date.now() + 45000 + Math.random() * 45000;
    const alActuar = () => { actividad = Date.now(); };
    window.addEventListener('pointermove', alActuar, { passive: true });
    window.addEventListener('scroll', alActuar, { passive: true });
    window.addEventListener('keydown', alActuar);
    const reloj = setInterval(() => {
      const e = avatarBoton.current;
      if (!e || llamadaRef.current || document.hidden || llamadasCerradas() || jugando()) return;
      const ahora = Date.now();
      if (!bostezado && ahora - actividad > 120000) { bostezado = true; e.movimiento('bostezo'); return; }
      if (ahora < siguiente) return;
      siguiente = ahora + 60000 + Math.random() * 60000;
      const gestos = [
        () => { e.expresion('😉', 0.9); setTimeout(() => e.expresion('neutral'), 1300); },
        () => e.movimiento('mirar-a-otro-lado'),
        () => e.gesto('asentir', 1000),
        () => e.gesto('encogerse', 1100),
        () => { e.expresion('sonrisa', 0.7); e.gesto('ladear', 1200); setTimeout(() => e.expresion('neutral'), 1600); },
        () => { setToc(true); setTimeout(() => setToc(false), 900); },
      ];
      gestos[Math.floor(Math.random() * gestos.length)]();
    }, 5000);
    return () => {
      clearInterval(reloj);
      window.removeEventListener('pointermove', alActuar);
      window.removeEventListener('scroll', alActuar);
      window.removeEventListener('keydown', alActuar);
    };
  }, [abierto, conBoton, boton3d]);

  useLlamadas({ activo: !abierto && conBoton && boton3d, ruta: pathname, proyecto, alMostrar: mostrarLlamada });
  useEffect(() => () => clearTimeout(esperaLlamada.current), []);

  useEffect(() => {
    if (abierto && !Panel) cargarPanel().then(() => setCargado(true)).catch(() => {});
  }, [abierto]);
  useEffect(() => () => clearTimeout(espera.current), []);

  async function abrir(sugerencias = null) {
    setTema(sugerencias);
    if (llamada) ocultarLlamada();
    await cargarPanel().catch(() => {});
    clearTimeout(espera.current);
    setSaliendo(false);
    setAbierto(true);
    espera.current = setTimeout(() => setConBoton(false), MS_ENTRAR);
    try { sessionStorage.setItem(ABIERTO, '1'); } catch { /* sin almacenamiento */ }
  }

  function cerrar() {
    clearTimeout(espera.current);
    setBoton3d(false);
    setConBoton(true);
    setSaliendo(true);
    espera.current = setTimeout(() => {
      setAbierto(false);
      setSaliendo(false);
      espera.current = setTimeout(() => setBoton3d(true), 400);
    }, MS_SALIR);
    try { sessionStorage.removeItem(ABIERTO); } catch { /* sin almacenamiento */ }
  }

  return (
    <>
      {conBoton && (
        <button
          type="button"
          className={`clon-boton${llamada && !llamada.saliendo ? ' llamando' : ''}${toc ? ' toc' : ''}`}
          onClick={() => abrir(llamada?.sugerencias || null)}
          onMouseEnter={cargarPanel}
          onFocus={cargarPanel}
          aria-expanded={abierto && !saliendo}
          aria-label="Abrir el chat con la versión IA de Ronald"
          tabIndex={abierto && !saliendo ? -1 : 0}
        >
          <span className="clon-avatar">
            {boton3d ? <AvatarClon tamano={44} alMontar={(e) => { avatarBoton.current = e; }} /> : <span className="av" style={{ width: 44, height: 44 }} aria-hidden="true"><img src={retrato} alt="" /></span>}
            <span className="clon-ia">IA</span>
          </span>
          <span className="clon-boton-texto">Pregúntame <b>lo que quieras</b></span>
        </button>
      )}
      {llamada && (
        <div
          className={`clon-llamada${llamada.saliendo ? ' saliendo' : ''}`}
          role="status"
          onMouseEnter={() => clearTimeout(esperaLlamada.current)}
          onMouseLeave={() => { if (!llamada.preguntando) esperaLlamada.current = setTimeout(ocultarLlamada, 3000); }}
        >
          {llamada.preguntando ? (
            // Con la ×, antes de dejar de avisar, se lo pregunta
            <div className="clon-llamada-pregunta">
              <p>¿Prefieres que no te moleste más mientras miras la web?</p>
              <div>
                <button type="button" className="clon-llamada-si" onClick={() => { cerrarLlamadas(); ocultarLlamada(); }}>No molestes</button>
                <button type="button" onClick={ocultarLlamada}>Puedes avisarme</button>
              </div>
            </div>
          ) : (
            <>
              <button type="button" className="clon-llamada-texto" onClick={() => abrir(llamada.sugerencias || null)}>{llamada.texto}</button>
              <button
                type="button"
                className="clon-llamada-cerrar"
                aria-label="Cerrar el aviso"
                title="Cerrar"
                onClick={() => { clearTimeout(esperaLlamada.current); setLlamada((l) => (l ? { ...l, preguntando: true } : l)); }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </>
          )}
        </div>
      )}
      {abierto && <button type="button" className={`clon-fondo${saliendo ? ' saliendo' : ''}`} onClick={cerrar} aria-label="Cerrar el chat" tabIndex={-1} />}
      {abierto && Panel && <Panel onCerrar={cerrar} saliendo={saliendo} sugerencias={tema} />}
    </>
  );
}

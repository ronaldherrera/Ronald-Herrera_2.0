// TEMPORAL: banco de pruebas del avatar 3D (visor a media pantalla con cámara libre + panel de controles).
// Borrar (y su ruta en App.jsx) al terminar.
import { useEffect, useRef, useState } from 'react';
import AvatarClon from '../components/clon/AvatarClon';
import '../components/clon/Clon.css';
import './AvatarPrueba.css';

const ENCUADRES = [['auto', 'Automático'], ['cara', 'Cara'], ['busto', 'Busto'], ['medio', 'Medio cuerpo'], ['completo', 'Cuerpo entero']];
const ENTORNOS = [['habitacion', 'Habitación'], ['liso', 'Fondo liso']];
const MIRADAS = [['auto', 'Automático'], ['camara', 'A ti'], ['raton', 'Al ratón'], ['libre', 'Alrededor']];
const ACTITUDES = [['enamorado', '😍', 'Enamorado'], ['estrellas', '🤩', 'Estrellas'], ['santo', '😇', 'Santo'], ['pensativo', '🤔', 'Pensativo'], ['dormir', '😴', 'Dormido'], ['triste', '😢', 'Triste'], ['normal', '🙂', 'Normal']];
const ACCIONES = [['gafas', '😎', 'Gafas'], ['llorar', '😭', 'Llorar'], ['reir', '😂', 'Reír'], ['bostezar', '🥱', 'Bostezar'], ['taparse', '🤭', 'Taparse'], ['cara-palma', '🤦', 'Cara-palma'], ['saludar', '👋', 'Saludar']];
const EXPRESIONES = [['neutral', 'Neutral'], ['sonrisa', 'Sonrisa'], ['alegre', 'Alegre'], ['duda', 'Duda'], ['sorpresa', 'Sorpresa'], ['preocupado', 'Preocupado'], ['atento', 'Atento']];
const EMOJIS = ['🙂', '😀', '😁', '😂', '😊', '😇', '😉', '😍', '🤩', '😘', '😋', '😛', '😜', '🤔', '🤨', '😐', '😑', '🙄', '😏', '😮', '😲', '😳', '🥺', '😢', '😭', '😡', '😤', '😬', '🤭', '🤦', '😴', '🥱', '😎'];
const GESTOS = [['asentir', 'Asentir'], ['negar', 'Negar'], ['ladear', 'Ladear'], ['encogerse', 'Encogerse'], ['reir', 'Reírse'], ['cabecear', 'Cabecear']];
const VISEMAS = ['sil', 'aa', 'E', 'I', 'O', 'U', 'PP', 'FF', 'TH', 'SS', 'RR', 'kk', 'nn', 'CH', 'DD'];

// Milisegundos desde que se abrió la página (para medir lo que tarda la voz)
const reloj = () => performance.now();

// WAV vacío para desbloquear el audio en el iPhone
// Corta el texto hablado tras la primera frase (si queda bastante detrás): [frase, resto, posición del resto]
function partirVoz(hablado) {
  const letras = [...hablado];
  for (let i = 25; i < letras.length - 20; i++) {
    if ('.!?'.includes(letras[i]) && letras[i + 1] === ' ') return [letras.slice(0, i + 1).join(''), letras.slice(i + 2).join(''), i + 2];
  }
  return [hablado, '', 0];
}

const SILENCIO = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

// En el móvil el panel se ve por pestañas (una sección cada vez); en pantallas grandes, todas seguidas
const PESTANAS = [['actitudes', 'Actitudes'], ['acciones', 'Acciones'], ['caras', 'Caras'], ['cuerpo', 'Cuerpo'], ['clon', 'Clon'], ['voz', 'Voz']];

function Seccion({ titulo, nota, activa, children }) {
  return (
    <section className={activa ? 'ap-seccion activa' : 'ap-seccion'}>
      <h2>{titulo}{nota && <span>{nota}</span>}</h2>
      {children}
    </section>
  );
}

export default function AvatarPrueba() {
  const [pensando, setPensando] = useState(false);
  const [pestana, setPestana] = useState('actitudes');
  const [escuchando, setEscuchando] = useState(false);
  const terminarEscucha = useRef(null);
  const pulsado = useRef(null);
  // En qué está el clon entre tu pregunta y su voz: 'pensando' (Claude) o 'voz' (generando el audio)
  const [fase, setFase] = useState(null);   // momento en que se apoyó el dedo en el micrófono (null si no está pulsado)
  const altavoz = useRef(null);
  const historial = useRef(null);
  const turno = useRef(0);
  const [sugerencias, setSugerencias] = useState([]);
  // Conversación: sin pulsar para hablar. Escucha, envía al callarte y vuelve a escuchar cuando el clon acaba
  const [conversando, setConversando] = useState(false);
  const enConversacion = useRef(false);
  const callado = useRef(0);   // desde cuándo nadie habla en la conversación (se pone en pausa a los 90 s)
  const [hablandoClon, setHablandoClon] = useState(false);
  const charlaActual = useRef([]);
  const idCharla = useRef(null);   // como en la web: cada charla con su id, para verla en el panel
  const funciones = useRef({});
  const [encuadre, setEncuadre] = useState('auto');
  const [mirada, setMirada] = useState('auto');
  const [entorno, setEntorno] = useState('habitacion');
  const [animaciones, setAnimaciones] = useState([]);
  const [ahora, setAhora] = useState('Neutral');
  const [frase, setFrase] = useState('Hola, soy Ronald. Bueno, mi versión IA. Pregúntame por mis proyectos, mi stack o cómo trabajo.');
  const [voz, setVoz] = useState('');
  const [modeloVoz, setModeloVoz] = useState('eleven_v4');
  const [velocidadVoz, setVelocidadVoz] = useState(1);
  const sonando = useRef(null);
  const [pregunta, setPregunta] = useState('');
  const [charla, setCharla] = useState([]);
  const [estadoCharla, setEstadoCharla] = useState('');
  const avatar = useRef(null);
  useEffect(() => { charlaActual.current = charla; }, [charla]);

  // La charla siempre muestra lo último
  useEffect(() => {
    const h = historial.current;
    if (h) h.scrollTop = h.scrollHeight;
  }, [charla, pestana, fase]);

  useEffect(() => {
    fetch('/avatar/animaciones/indice.json').then((r) => r.json()).then(setAnimaciones).catch(() => {});
    document.title = 'Banco de pruebas del avatar';

  }, []);

  const usar = (texto, f) => () => { setAhora(texto); f(avatar.current); };

  // Habla con el clon: Claude responde (/chat-local), con marcas que mueven el cuerpo, y lo dice con mi voz
  // El iPhone solo deja sonar audio que empezó con un toque: el altavoz se «desbloquea» al pulsar
  // (con un silencio) y luego se reutiliza para la respuesta, que llega segundos después
  // (solo la primera vez: reproducirlo otra vez mientras arranca el micro le quita el micrófono al dictado)
  function desbloquearAltavoz() {
    if (altavoz.current) return altavoz.current;
    const a = new Audio();
    altavoz.current = a;
    a.src = SILENCIO;
    a.play().catch(() => {});
    return a;
  }

  // Suelta el audio del todo antes de escuchar: con el altavoz ocupado, el móvil no le da el micro al dictado
  function callarAltavoz() {
    const a = sonando.current;
    if (!a) return;
    a.pause();
    a.removeAttribute('src');
    a.load();
    // Sin el evento ended el avatar seguiría moviendo la boca y esperando las marcas que faltan
    avatar.current?.hablar(false);
    avatar.current?.marcas(null);
  }

  function preguntarClon(e) {
    e.preventDefault();
    enviarAlClon(pregunta);
  }

  // Micrófono: dictado del navegador (Chrome, Edge, Safari). Pulsar para hablar: escucha mientras mantienes
  // el botón y al soltar envía. Con un toque corto escucha hasta otro toque o hasta un silencio corto.
  function empezarEscucha() {
    const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Reconocimiento) { setEstadoCharla('Este navegador no permite dictar: prueba con Chrome o Safari'); return; }
    callarAltavoz();
    turno.current++;   // si el clon estaba a mitad de respuesta, que no siga con el resto
    setFase(null);
    avatar.current?.pensar(false);
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
    const terminar = (enviar = true) => {
      if (hecho) return;
      hecho = true;
      clearTimeout(silencio);
      clearTimeout(tope);
      terminarEscucha.current = null;
      try { rec.stop(); } catch { /* ya estaba parado */ }
      setEscuchando(false);
      avatar.current?.escuchar(false);
      if (!enviar) { setEstadoCharla(''); return; }
      if (dicho.trim()) { callado.current = 0; enviarAlClon(dicho, true); return; }
      if (enConversacion.current && ultimoError !== 'not-allowed') {
        if (!callado.current) callado.current = reloj();
        if (reloj() - callado.current < 90000) { setTimeout(() => { if (enConversacion.current) funciones.current.empezarEscucha(); }, 300); return; }
        pararConversacion('Conversación en pausa: nadie hablaba');
        return;
      }
      if (enConversacion.current) pararConversacion();
      setEstadoCharla(ultimoError === 'not-allowed' ? 'Sin permiso para el micrófono' : `No te he oído${ultimoError ? ` (micro: ${ultimoError})` : ''}`);
    };
    rec.onresult = (ev) => {
      dicho = `${previo} ${[...ev.results].map((x) => x[0].transcript).join('')}`.trim();
      setPregunta(dicho);
      clearTimeout(silencio);
      // Con el botón pulsado manda quien habla; con un toque, un silencio corto cierra
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
    setPregunta('');
    setEscuchando(true);
    setEstadoCharla(enConversacion.current ? '' : 'Te escucho…');
    setHablandoClon(false);
    avatar.current?.escuchar(true);
    try { rec.start(); } catch (error) { ultimoError = error.name; terminar(); }
  }

  // Que no se quede el foco en la caja de texto (en el móvil abriría el teclado al hablar o al responder)
  function soltarTeclado() {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  function alPulsarMic(e) {
    if (e.button > 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    soltarTeclado();
    if (escuchando) return;   // segundo toque del modo toque: se cierra al soltar
    pulsado.current = reloj();
    empezarEscucha();
  }

  function alSoltarMic() {
    const desde = pulsado.current;
    pulsado.current = null;
    // Al soltar el dedo el navegador deja sonar audio (el iPhone no lo deja al apoyarlo)
    desbloquearAltavoz();
    if (desde === null) { terminarEscucha.current?.(); return; }
    if (reloj() - desde > 350) terminarEscucha.current?.();
    else setEstadoCharla('Te escucho… (toca otra vez para enviar)');
  }

  function empezarConversacion() {
    soltarTeclado();
    desbloquearAltavoz();   // con el toque, para que luego pueda sonar la voz
    enConversacion.current = true;
    callado.current = 0;
    setConversando(true);
    empezarEscucha();
  }

  function pararConversacion(motivo = '') {
    enConversacion.current = false;
    setConversando(false);
    terminarEscucha.current?.(false);
    setEstadoCharla(motivo);
  }

  // Cuando el clon termina de hablar, vuelve a escucharte (con un respiro para no oír el final de su voz)
  function seguirConversacion(espera = 250) {
    setHablandoClon(false);
    if (enConversacion.current) setTimeout(() => { if (enConversacion.current) funciones.current.empezarEscucha(); }, espera);
  }

  // Toque en el micro durante la conversación: si escucha, envía ya; si piensa o habla, le cortas y hablas tú
  function tocarMicConversando() {
    if (escuchando) terminarEscucha.current?.();
    else empezarEscucha();
  }

  async function enviarAlClon(pregunta, yaDesbloqueado = false) {
    const texto = pregunta.trim();
    if (!texto) return;
    sonando.current?.pause();
    const miTurno = ++turno.current;
    soltarTeclado();
    const audio = yaDesbloqueado ? altavoz.current : desbloquearAltavoz();
    const historia = [...charlaActual.current, { rol: 'visitante', texto }];
    charlaActual.current = historia;
    setCharla(historia);
    setSugerencias([]);
    setPregunta('');
    setEstadoCharla('');
    setFase('pensando');
    avatar.current?.pensar(true);
    const inicio = reloj();
    const pedirVoz = (t) => fetch('/voz-local', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: t, modelo: modeloVoz, velocidad: velocidadVoz }) }).then((r) => r.json());
    try {
      const r = await fetch('/chat-local', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensajes: historia, hablado: true, id: (idCharla.current ||= crypto.randomUUID()) }) });
      const json = await r.json();
      if (miTurno !== turno.current) return;
      if (!json.ok) { avatar.current?.pensar(false); setFase(null); if (enConversacion.current) pararConversacion(); setEstadoCharla(json.error || 'Sin respuesta'); return; }
      const msClaude = Math.round(reloj() - inicio);
      setFase('voz');
      // El texto aparece cuando empieza a hablar, como en una videollamada
      const mostrar = () => {
        avatar.current?.pensar(false);
        setFase(null);
        setCharla((c) => [...c, { rol: 'asistente', texto: json.respuesta, marcas: json.marcas }]);
        setSugerencias(json.sugerencias || []);
      };

      // La primera frase se pide aparte: se genera antes y suena mientras llega el resto
      const [texto1, texto2, corte] = partirVoz(json.voz.texto);
      const voz2 = texto2 ? pedirVoz(texto2) : null;
      const voz1 = await pedirVoz(texto1);
      if (miTurno !== turno.current) return;
      if (!voz1.ok) {
        mostrar();
        avatar.current?.marcas(json.marcas);
        setEstadoCharla(`Claude ${msClaude} ms · sin voz: ${voz1.error}`);
        seguirConversacion(3000);
        return;
      }
      const marcas1 = texto2 ? json.marcas.filter((m) => m.posVoz < corte) : json.marcas;
      const marcas2 = texto2 ? json.marcas.filter((m) => m.posVoz >= corte).map((m) => ({ ...m, posVoz: m.posVoz - corte })) : [];
      const sonar = async (voz, marcas) => {
        audio.src = `data:audio/mpeg;base64,${voz.audio}`;
        sonando.current = audio;
        setHablandoClon(true);
        avatar.current?.hablarCon(audio, voz.tiempos);
        avatar.current?.marcas(marcas, { audio, inicios: voz.inicios });
        await audio.play();
      };
      const acabar = () => audio.addEventListener('ended', () => {
        if (miTurno !== turno.current) return;
        avatar.current?.expresion('neutral');
        seguirConversacion();
      }, { once: true });
      mostrar();
      await sonar(voz1, marcas1);
      setEstadoCharla(`Claude ${msClaude} ms · empieza a hablar en ${Math.round(reloj() - inicio)} ms · ${json.marcas.length} marcas`);
      if (!voz2) { acabar(); return; }
      audio.addEventListener('ended', async () => {
        const v = await voz2;
        if (miTurno !== turno.current) return;
        if (!v.ok) { seguirConversacion(); return; }
        await sonar(v, marcas2);
        acabar();
      }, { once: true });
    } catch {
      avatar.current?.pensar(false);
      setFase(null);
      if (enConversacion.current) pararConversacion();
      setEstadoCharla('No se pudo hablar con el clon');
    }
  }

  // Mi voz clonada (solo en desarrollo, por /voz-local; la clave va en .env.local)
  async function probarVoz() {
    sonando.current?.pause();
    setVoz('Generando…');
    const inicio = reloj();
    try {
      const r = await fetch('/voz-local', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: frase, modelo: modeloVoz, velocidad: velocidadVoz }) });
      const json = await r.json();
      if (!json.ok) { setVoz(json.error || 'No se pudo generar'); return; }
      const audio = new Audio(`data:audio/mpeg;base64,${json.audio}`);
      sonando.current = audio;
      avatar.current?.hablarCon(audio, json.tiempos);
      await audio.play();
      setAhora('Hablando con mi voz');
      setVoz(`Lista en ${Math.round(reloj() - inicio)} ms · ${frase.length} caracteres`);
    } catch {
      setVoz('No se pudo generar');
    }
  }

  // Automático: lo que verá el visitante (medio cuerpo, la IA mueve la cámara al hablar y no se puede girar).
  // A mano: la cámara se queda en el encuadre elegido aunque la IA pida otro
  function elegirEncuadre(id) {
    setEncuadre(id);
    avatar.current?.camaraAuto(id === 'auto');
    avatar.current?.camara(id === 'auto' ? 'medio' : id);
  }

  // Para llamadas desde eventos del audio o del micro, que guardan las funciones del render de entonces
  useEffect(() => { funciones.current = { empezarEscucha, enviarAlClon }; });

  return (
    <div className={pestana === 'clon' ? 'ap ap-charlando' : 'ap'}>
      <div className="ap-visor">
        <AvatarClon tamano="100%" encuadre="medio" libre pensando={pensando} className="ap-lienzo" alMontar={(e) => { avatar.current = e; e.entorno(entorno); e.camaraAuto(encuadre === 'auto'); e.mirada(mirada); e.alTocar = (zona) => setAhora(`Toque: ${zona}`); }} />
        <div className="ap-visor-barra">
          <div className="ap-segmentos" role="group" aria-label="Encuadre">
            {ENCUADRES.map(([id, t]) => (
              <button key={id} type="button" className={encuadre === id ? 'activo' : ''} onClick={() => elegirEncuadre(id)}>{t}</button>
            ))}
          </div>
          <div className="ap-segmentos" role="group" aria-label="Entorno">
            {ENTORNOS.map(([id, t]) => (
              <button key={id} type="button" className={entorno === id ? 'activo' : ''} onClick={() => { setEntorno(id); avatar.current?.entorno(id); }}>{t}</button>
            ))}
          </div>
          <div className="ap-segmentos" role="group" aria-label="Mirada">
            {MIRADAS.map(([id, t]) => (
              <button key={id} type="button" className={mirada === id ? 'activo' : ''} onClick={() => { setMirada(id); avatar.current?.mirada(id); }}>{id === 'auto' ? t : `Mira ${t.toLowerCase()}`}</button>
            ))}
          </div>
        </div>
        <p className="ap-ayuda">{encuadre === 'auto' ? 'Así te verá el visitante: la cámara la mueve la inteligencia artificial al hablar' : 'Arrastra para girar · rueda para acercar · clic derecho para desplazar'}</p>
        <p className="ap-ahora"><span>Ahora</span>{ahora}</p>
        {(fase || escuchando) && (
          <p className={`ap-fase ap-fase-${escuchando ? 'escuchando' : fase}`} role="status">
            {escuchando ? 'Te escucho' : fase === 'pensando' ? 'Pensando' : 'Preparando mi voz'}
            <span className="ap-puntos" aria-hidden="true"><i /><i /><i /></span>
          </p>
        )}
      </div>

      <aside className="ap-panel">
        <header>
          <h1>Banco de pruebas</h1>
          <p>Prueba expresiones, actitudes y animaciones. Lo que montemos aquí es lo que usará el avatar en el chat y en la entrevista.</p>
        </header>
        <nav className="ap-pestanas" aria-label="Secciones">
          {PESTANAS.map(([id, t]) => (
            <button key={id} type="button" className={pestana === id ? 'activo' : ''} aria-pressed={pestana === id} onClick={(e) => { setPestana(id); if (id === 'clon') { elegirEncuadre('auto'); setMirada('auto'); avatar.current?.mirada('auto'); } e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }}>{t}</button>
          ))}
        </nav>

        <Seccion activa={pestana === 'actitudes'} titulo="Actitudes" nota="se mantienen">
          <div className="ap-tarjetas">
            {ACTITUDES.map(([id, e, t]) => (
              <button key={id} type="button" onClick={usar(`${e} ${t}`, (a) => a?.accion(id))}><span>{e}</span>{t}</button>
            ))}
          </div>
        </Seccion>

        <Seccion activa={pestana === 'acciones'} titulo="Acciones" nota="animadas, una vez">
          <div className="ap-tarjetas">
            {ACCIONES.map(([id, e, t]) => (
              <button key={id} type="button" onClick={usar(`${e} ${t}`, (a) => a?.accion(id))}><span>{e}</span>{t}</button>
            ))}
          </div>
        </Seccion>

        <Seccion activa={pestana === 'caras'} titulo="Caras">
          <div className="ap-emojis">
            {EMOJIS.map((e) => <button key={e} type="button" aria-label={`Cara ${e}`} onClick={usar(e, (a) => a?.expresion(e))}>{e}</button>)}
          </div>
          <div className="ap-chips">
            {EXPRESIONES.map(([id, t]) => <button key={id} type="button" onClick={usar(t, (a) => a?.expresion(id))}>{t}</button>)}
          </div>
        </Seccion>

        <Seccion activa={pestana === 'cuerpo'} titulo="Cuerpo">
          <div className="ap-chips">
            {GESTOS.map(([id, t]) => <button key={id} type="button" onClick={usar(t, (a) => a?.gesto(id))}>{t}</button>)}
          </div>
          <div className="ap-chips">
            {animaciones.map((n) => <button key={n} type="button" onClick={usar(`Animación: ${n}`, (a) => a?.animar(n))}>▶ {n}</button>)}
            <button type="button" onClick={usar('Reposo', (a) => a?.parar())}>■ Parar animación</button>
          </div>
          {animaciones.length < 2 && <p className="ap-nota">Las animaciones de Mixamo (andar, bailar, sentarse…) aparecerán aquí cuando las convirtamos.</p>}
        </Seccion>

        <Seccion activa={pestana === 'clon'} titulo="Habla con mi clon" nota="Claude + mi voz + su cuerpo">
          <div className="ap-charla" ref={historial}>
            {charla.map((m, i) => (
              <p key={i} className={m.rol === 'asistente' ? 'ap-ia' : 'ap-tu'}>
                {m.texto}
                {m.marcas?.length > 0 && <small>{m.marcas.map((x) => `${x.tipo}:${x.valor}`).join(' · ')}</small>}
              </p>
            ))}
            {fase && <p className="ap-ia ap-escribiendo" aria-hidden="true"><span className="ap-puntos"><i /><i /><i /></span></p>}
          </div>
          {sugerencias.length > 0 && (
            <div className="ap-sugerencias">
              {sugerencias.map((t) => <button key={t} type="button" onClick={() => enviarAlClon(t)}>{t}</button>)}
            </div>
          )}
          <form className="ap-voz" onSubmit={preguntarClon}>
            <textarea rows={2} readOnly={escuchando || Boolean(fase)} value={pregunta} onChange={(e) => setPregunta(e.target.value)} placeholder="Pregúntale algo como un reclutador…" aria-label="Pregunta para el clon" />
            <div className="ap-voz-botones">
              <button type="button" className={conversando ? 'ap-conversa activa' : 'ap-conversa'} aria-pressed={conversando} onClick={() => (conversando ? pararConversacion() : empezarConversacion())}>
                {conversando ? 'Terminar conversación' : '🗣️ Conversación'}
              </button>
              {conversando ? (
                <button type="button" className={escuchando ? 'ap-mic escuchando' : 'ap-mic'} onClick={tocarMicConversando}>
                  {escuchando ? '🎙️ Te escucho… (toca para enviar ya)' : fase || hablandoClon ? '✋ Interrumpir' : '🎙️ Hablar'}
                </button>
              ) : (
              <button
                type="button"
                className={escuchando ? 'ap-mic escuchando' : 'ap-mic'}
                aria-pressed={escuchando}
                onPointerDown={alPulsarMic}
                onPointerUp={alSoltarMic}
                onPointerCancel={alSoltarMic}
                onContextMenu={(e) => e.preventDefault()}
                onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); alPulsarMic(e); } }}
                onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); alSoltarMic(); } }}
              >
                {escuchando ? '🎙️ Te escucho… suelta para enviar' : '🎙️ Mantén pulsado para hablar'}
              </button>
              )}
              <button type="submit" disabled={!pregunta.trim() || escuchando}>Preguntar</button>
            </div>
            {estadoCharla && <span>{estadoCharla}</span>}
          </form>
        </Seccion>

        <Seccion activa={pestana === 'voz'} titulo="Boca y voz">
          <div className="ap-chips">
            <button type="button" onClick={usar('Hablando', (a) => a?.hablar(true))}>Hablar</button>
            <button type="button" onClick={usar('Callado', (a) => a?.hablar(false))}>Callar</button>
            <button type="button" onClick={() => { setPensando((p) => !p); setAhora(pensando ? 'Neutral' : 'Pensando'); }}>{pensando ? 'Dejar de pensar' : 'Pensar'}</button>
          </div>
          <div className="ap-voz">
            <textarea rows={3} value={frase} onChange={(e) => setFrase(e.target.value)} aria-label="Frase para decir con mi voz" />
            <div className="ap-chips">
              {[['eleven_flash_v2_5', 'Flash (rápido)'], ['eleven_multilingual_v2', 'Multilingual v2'], ['eleven_v3', 'v3 (expresivo)'], ['eleven_v4', 'v4 (el de ElevenLabs)']].map(([id, t]) => (
                <button key={id} type="button" className={modeloVoz === id ? 'activo' : ''} onClick={() => setModeloVoz(id)}>{t}</button>
              ))}
            </div>
            <div className="ap-chips">
              {[0.85, 0.9, 1].map((v) => (
                <button key={v} type="button" className={velocidadVoz === v ? 'activo' : ''} onClick={() => setVelocidadVoz(v)}>Velocidad {v}</button>
              ))}
            </div>
            <button type="button" onClick={probarVoz} disabled={!frase.trim()}>🔊 Probar mi voz</button>
            {voz && <span>{voz}</span>}
          </div>
          <div className="ap-chips ap-visemas">
            {VISEMAS.map((v) => <button key={v} type="button" onClick={usar(`Boca: ${v}`, (a) => a?.visema(v))}>{v}</button>)}
          </div>
        </Seccion>
      </aside>
    </div>
  );
}

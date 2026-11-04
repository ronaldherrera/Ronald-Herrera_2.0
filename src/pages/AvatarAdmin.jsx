// Panel del clon (/avatar-admin), solo para Ronald: conversaciones de los visitantes, enseñarle cosas, que te
// entreviste para aprender, lo que propone aprender de las conversaciones y el banco de pruebas del avatar.
// En la web habla con public/admin-clon.php (con contraseña); en desarrollo, con /admin-clon-local (sin contraseña).
import { lazy, Suspense, useEffect, useState } from 'react';
import './AvatarAdmin.css';

const AvatarPrueba = lazy(() => import('./AvatarPrueba'));

const URL_PANEL = import.meta.env.DEV ? '/admin-clon-local' : '/admin-clon.php';
async function panel(accion, datos = {}) {
  try {
    const r = await fetch(URL_PANEL, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Panel-Clon': '1' },
      body: JSON.stringify({ accion, ...datos }),
    });
    return await r.json();
  } catch {
    return { ok: false, error: 'No hay conexión con el servidor' };
  }
}

const PESTANAS = [['conversaciones', 'Conversaciones'], ['ensenar', 'Enséñale'], ['entrevista', 'Entrevista'], ['evolucion', 'Evolución'], ['banco', 'Banco de pruebas']];
const fecha = (s) => (s ? new Date(s * 1000).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const ORIGENES = { manual: 'Me lo contaste', entrevista: 'Entrevista', conversaciones: 'De las conversaciones' };

export default function AvatarAdmin() {
  const [dentro, setDentro] = useState(null);   // null: comprobando
  const [pestana, setPestana] = useState('conversaciones');
  const [aprendido, setAprendido] = useState(null);

  useEffect(() => {
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    document.title = 'Panel del clon';
    panel('sesion').then((j) => setDentro(Boolean(j.dentro)));
    return () => robots.remove();
  }, []);

  useEffect(() => {
    if (dentro) panel('aprendido').then((j) => j.ok && setAprendido(j.aprendido));
  }, [dentro]);

  if (dentro === null) return <div className="aa aa-centro"><p className="aa-nota">Cargando…</p></div>;
  if (!dentro) return <Entrar alEntrar={() => setDentro(true)} />;

  return (
    <div className="aa">
      <header className="aa-barra">
        <strong>Mi clon</strong>
        <nav className="aa-pestanas" aria-label="Secciones del panel">
          {PESTANAS.map(([id, t]) => (
            <button key={id} type="button" className={pestana === id ? 'activa' : ''} aria-current={pestana === id ? 'page' : undefined} onClick={() => setPestana(id)}>
              {t}
              {id === 'evolucion' && aprendido?.propuestas.length > 0 && <span className="aa-globo">{aprendido.propuestas.length}</span>}
            </button>
          ))}
        </nav>
        {!import.meta.env.DEV && <button type="button" className="aa-salir" onClick={() => panel('salir').then(() => setDentro(false))}>Salir</button>}
      </header>
      {pestana === 'banco' ? (
        <div className="aa-banco">
          {import.meta.env.DEV
            ? <Suspense fallback={<p className="aa-nota">Cargando el avatar…</p>}><AvatarPrueba /></Suspense>
            : <main className="aa-contenido"><p className="aa-nota">El banco de pruebas usa el chat y la voz de desarrollo: ábrelo en local con <code>npm run dev</code>.</p></main>}
        </div>
      ) : (
        <main className="aa-contenido">
          {pestana === 'conversaciones' && <Conversaciones />}
          {pestana === 'ensenar' && <Ensenar aprendido={aprendido} setAprendido={setAprendido} />}
          {pestana === 'entrevista' && <Entrevista setAprendido={setAprendido} />}
          {pestana === 'evolucion' && <Evolucion aprendido={aprendido} setAprendido={setAprendido} />}
        </main>
      )}
    </div>
  );
}

function Entrar({ alEntrar }) {
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  async function entrar(e) {
    e.preventDefault();
    setEnviando(true);
    const j = await panel('entrar', { clave });
    setEnviando(false);
    setClave('');
    if (j.ok) alEntrar();
    else setError(j.error || 'No se pudo entrar');
  }
  return (
    <div className="aa aa-centro">
      <form className="aa-entrar" onSubmit={entrar}>
        <h1>Panel del clon</h1>
        <label htmlFor="aa-clave">Contraseña</label>
        <input id="aa-clave" type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} required autoFocus />
        {error && <p className="aa-error" role="alert">{error}</p>}
        <button type="submit" className="aa-primario" disabled={enviando || !clave}>{enviando ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  );
}

function Conversaciones() {
  const [lista, setLista] = useState(null);
  const [abierta, setAbierta] = useState(null);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState('');

  const cargar = () => panel('conversaciones').then((j) => (j.ok ? setLista(j.conversaciones) : setError(j.error || 'No se pudieron cargar')));
  useEffect(() => { cargar(); }, []);

  async function abrir(id) {
    setBorrando(false);
    const j = await panel('conversacion', { id });
    if (j.ok) setAbierta({ id, ...j.conversacion });
  }
  async function borrar() {
    await panel('borrar-conversacion', { id: abierta.id });
    setAbierta(null);
    setBorrando(false);
    cargar();
  }

  if (error) return <p className="aa-error">{error}</p>;
  if (!lista) return <p className="aa-nota">Cargando conversaciones…</p>;
  if (abierta) {
    return (
      <section>
        <div className="aa-fila-acciones">
          <button type="button" onClick={() => setAbierta(null)}>← Todas</button>
          {borrando
            ? <><span className="aa-nota">¿Borrarla para siempre?</span><button type="button" className="aa-peligro" onClick={borrar}>Sí, borrar</button><button type="button" onClick={() => setBorrando(false)}>No</button></>
            : <button type="button" onClick={() => setBorrando(true)}>Borrar</button>}
        </div>
        <p className="aa-nota">Empezó el {fecha(abierta.inicio)} · última el {fecha(abierta.ultima)}{abierta.paginas?.length ? ` · desde ${abierta.paginas.join(', ')}` : ''}</p>
        {abierta.contacto && <p className="aa-aviso">Dejó su contacto: {Object.entries(abierta.contacto).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>}
        {abierta.contactoDado && <p className="aa-aviso">Le di tu correo y tu teléfono a: {Object.entries(abierta.contactoDado).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>}
        <div className="aa-charla">
          {(abierta.mensajes || []).map((m, i) => <p key={i} className={m.rol === 'assistant' ? 'aa-clon' : 'aa-visitante'}>{m.texto}</p>)}
        </div>
      </section>
    );
  }
  return (
    <section>
      <h1>Conversaciones</h1>
      {import.meta.env.DEV
        ? <p className="aa-aviso">Estás en la copia de tu ordenador: aquí solo salen tus charlas del banco de pruebas. Las de los visitantes las ves en ronaldherrera.es/avatar-admin.</p>
        : <p className="aa-nota">Las de los visitantes de la web. Se borran solas a los 30 días.</p>}
      {!lista.length && <p className="aa-vacio">Todavía no hay conversaciones.</p>}
      <ul className="aa-lista">
        {lista.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => abrir(c.id)}>
              <span className="aa-lista-texto">{c.primera || '(sin texto)'}</span>
              <span className="aa-lista-meta">
                {fecha(c.ultima)} · {c.mensajes} mensajes
                {c.contacto && <span className="aa-etiqueta aa-etiqueta-oro">Dejó contacto</span>}
                {c.contactoDado && <span className="aa-etiqueta aa-etiqueta-oro">Le di tu contacto</span>}
                {c.sinDato > 0 && <span className="aa-etiqueta">{c.sinDato} sin saber qué decir</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Ensenar({ aprendido, setAprendido }) {
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState('dato');
  const [editando, setEditando] = useState(null);   // { id, texto }
  const [error, setError] = useState('');
  // Antes de guardar, el clon puede pedirte más contexto: la charla, y cómo lo guardaría (para revisarlo)
  const [charla, setCharla] = useState([]);
  const [propuesta, setPropuesta] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  // Lo que sabe de base (currículum, proyectos, personalidad), para verlo junto a lo que le enseñas
  const [base, setBase] = useState(null);
  useEffect(() => { panel('base').then((j) => j.ok && setBase(j.base)); }, []);

  async function guardar(datos) {
    const j = await panel('guardar-dato', datos);
    if (!j.ok) { setError(j.error || 'No se pudo guardar'); return false; }
    setError('');
    setAprendido(j.aprendido);
    return true;
  }
  async function enviar(e) {
    e.preventDefault();
    const nueva = [...charla, { rol: 'ronald', texto: texto.trim() }];
    setCharla(nueva);
    setTexto('');
    setOcupado(true);
    const j = await panel('revisar-dato', { tipo, charla: nueva });
    setOcupado(false);
    if (!j.ok) { setError(j.error || 'No se pudo revisar'); return; }
    setError('');
    if (j.pregunta) setCharla([...nueva, { rol: 'clon', texto: j.pregunta }]);
    else setPropuesta(j.texto || nueva.map((m) => m.texto).join(' '));
  }
  // Sin más preguntas: lo que has escrito tal cual (y lo revisas antes de guardar)
  function sinMas() {
    setPropuesta([...charla.filter((m) => m.rol === 'ronald').map((m) => m.texto), texto.trim()].filter(Boolean).join(' '));
    setTexto('');
  }
  function empezarDeNuevo() {
    setCharla([]);
    setPropuesta(null);
    setTexto('');
  }
  async function guardarPropuesta() {
    if (await guardar({ texto: propuesta, tipo, origen: 'manual' })) empezarDeNuevo();
  }
  async function borrar(id) {
    const j = await panel('borrar-dato', { id });
    if (j.ok) setAprendido(j.aprendido);
  }

  // Lo de base, plegado por temas y solo para leer (sale de los archivos del clon)
  const verBase = (temas, titulo) => temas?.length > 0 && (
    <details className="aa-base">
      <summary>{titulo} ({temas.reduce((n, t) => n + t.puntos.length, 0)})</summary>
      {temas.map((t) => (
        <div key={t.titulo}>
          <h3>{t.titulo}</h3>
          <ul>{t.puntos.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </div>
      ))}
      <p className="aa-nota">Esto es su base: no se cambia desde aquí. Si algo no es correcto, enséñale la versión buena arriba.</p>
    </details>
  );
  const grupo = (t) => (aprendido?.datos || []).filter((d) => d.tipo === t).slice().reverse();
  const lista = (datos) => (
    <ul className="aa-datos">
      {datos.map((d) => (
        <li key={d.id}>
          {editando?.id === d.id ? (
            <form onSubmit={async (e) => { e.preventDefault(); if (await guardar({ id: d.id, texto: editando.texto })) setEditando(null); }}>
              <textarea value={editando.texto} onChange={(e) => setEditando({ ...editando, texto: e.target.value })} rows={3} />
              <div className="aa-fila-acciones"><button type="submit" className="aa-primario">Guardar</button><button type="button" onClick={() => setEditando(null)}>Cancelar</button></div>
            </form>
          ) : (
            <>
              <p>{d.texto}</p>
              <span className="aa-lista-meta">
                <span className="aa-etiqueta">{ORIGENES[d.origen] || d.origen}</span> {fecha(d.fecha)}
                <button type="button" className="aa-enlace" onClick={() => setEditando({ id: d.id, texto: d.texto })}>Editar</button>
                <button type="button" className="aa-enlace" onClick={() => borrar(d.id)}>Quitar</button>
              </span>
            </>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <section>
      <h1>Enséñale</h1>
      <p className="aa-nota">Lo que escribas aquí lo sabrá en su próxima respuesta, además de tu currículum y tus proyectos. Escríbelo como lo dirías tú, en primera persona.</p>
      <div className="aa-tarjeta">
        <div className="aa-segmentos" role="group" aria-label="Qué le enseñas">
          <button type="button" className={tipo === 'dato' ? 'activo' : ''} aria-pressed={tipo === 'dato'} disabled={charla.length > 0} onClick={() => setTipo('dato')}>Algo sobre mí</button>
          <button type="button" className={tipo === 'leccion' ? 'activo' : ''} aria-pressed={tipo === 'leccion'} disabled={charla.length > 0} onClick={() => setTipo('leccion')}>Cómo debe responder</button>
        </div>
        {charla.length > 0 && (
          <div className="aa-charla">
            {charla.map((m, i) => <p key={i} className={m.rol === 'clon' ? 'aa-clon' : 'aa-visitante'}>{m.texto}</p>)}
          </div>
        )}
        {ocupado && <p className="aa-nota" role="status">Leyéndolo…</p>}
        {propuesta !== null ? (
          <>
            <p className="aa-nota">Así lo guardaré (puedes corregirlo):</p>
            <textarea value={propuesta} onChange={(e) => setPropuesta(e.target.value)} rows={4} maxLength={2000} />
            {error && <p className="aa-error" role="alert">{error}</p>}
            <div className="aa-fila-acciones">
              <button type="button" className="aa-primario" disabled={!propuesta.trim()} onClick={guardarPropuesta}>Guardar</button>
              <button type="button" onClick={empezarDeNuevo}>Descartar</button>
            </div>
          </>
        ) : !ocupado && (
          <form onSubmit={enviar}>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={charla.length ? 'Contéstale…' : tipo === 'dato' ? 'Ej.: En Fycheo lo que más me costó fue el fichaje sin conexión, y lo resolví…' : 'Ej.: Con el sueldo, no doy cifras: prefiero hablarlo en una llamada según el puesto.'}
            />
            {error && <p className="aa-error" role="alert">{error}</p>}
            <div className="aa-fila-acciones">
              <button type="submit" className="aa-primario" disabled={!texto.trim()}>{charla.length ? 'Responder' : 'Enseñárselo'}</button>
              {charla.length > 0 && <button type="button" onClick={sinMas}>Guardarlo ya, sin más</button>}
              {charla.length > 0 && <button type="button" onClick={empezarDeNuevo}>Cancelar</button>}
            </div>
          </form>
        )}
      </div>
      {!aprendido ? <p className="aa-nota">Cargando…</p> : (
        <>
          <h2>Lo que sabe de ti</h2>
          {grupo('dato').length ? lista(grupo('dato')) : <p className="aa-vacio">Aún no le has enseñado nada aparte del currículum.</p>}
          {verBase(base?.conocimiento, 'Lo que ya sabía: tu currículum y tus proyectos')}
          <h2>Cómo responde</h2>
          {grupo('leccion').length ? lista(grupo('leccion')) : <p className="aa-vacio">Aún no le has enseñado criterios propios.</p>}
          {verBase(base?.forma, 'Lo que ya sabía: su personalidad y su forma de responder')}
        </>
      )}
    </section>
  );
}

function Entrevista({ setAprendido }) {
  const [pregunta, setPregunta] = useState(null);
  const [respuesta, setRespuesta] = useState('');
  const [propuesta, setPropuesta] = useState(null);   // cómo lo guardaría, para revisarlo
  const [ocupado, setOcupado] = useState('Pensando una pregunta…');
  const [error, setError] = useState('');
  const [dictando, setDictando] = useState(null);

  async function siguiente() {
    setOcupado('Pensando una pregunta…');
    setError('');
    setRespuesta('');
    setPropuesta(null);
    const j = await panel('pregunta');
    setOcupado('');
    if (j.ok) setPregunta(j.pregunta);
    else setError(j.error || 'No se pudo preparar la pregunta');
  }
  useEffect(() => {
    panel('pregunta').then((j) => {
      setOcupado('');
      if (j.ok) setPregunta(j.pregunta);
      else setError(j.error || 'No se pudo preparar la pregunta');
    });
  }, []);

  async function convertir(e) {
    e.preventDefault();
    setOcupado('Resumiéndolo…');
    const j = await panel('convertir-respuesta', { pregunta: pregunta.texto, respuesta });
    setOcupado('');
    if (j.ok) setPropuesta(j.texto);
    else setError(j.error || 'No se pudo resumir');
  }
  async function guardar() {
    const j = await panel('guardar-dato', { texto: propuesta, tipo: 'dato', origen: 'entrevista', pregunta: pregunta.id });
    if (!j.ok) { setError(j.error || 'No se pudo guardar'); return; }
    setAprendido(j.aprendido);
    siguiente();
  }
  async function saltar() {
    await panel('saltar-pregunta', { id: pregunta.id });
    siguiente();
  }

  // Dictar la respuesta con el micrófono (dictado del navegador)
  function dictar() {
    if (dictando) { dictando.stop(); return; }
    const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Reconocimiento) { setError('Este navegador no permite dictar: prueba con Chrome o Safari'); return; }
    const rec = new Reconocimiento();
    rec.lang = 'es-ES';
    rec.continuous = true;
    rec.interimResults = false;
    const antes = respuesta ? `${respuesta.trim()} ` : '';
    rec.onresult = (ev) => setRespuesta(antes + [...ev.results].map((x) => x[0].transcript).join(' ').trim());
    rec.onend = () => setDictando(null);
    rec.start();
    setDictando(rec);
  }

  return (
    <section>
      <h1>Entrevista</h1>
      <p className="aa-nota">Tu clon te pregunta lo que necesita saber, empezando por lo que le han preguntado y no supo contestar. Revisas cómo lo guarda antes de que lo aprenda.</p>
      {error && <p className="aa-error" role="alert">{error}</p>}
      {ocupado && <p className="aa-nota" role="status">{ocupado}</p>}
      {pregunta && !ocupado && (
        <div className="aa-tarjeta">
          <p className="aa-pregunta">{pregunta.texto}</p>
          {pregunta.motivo && <p className="aa-nota">Por qué te lo pregunto: {pregunta.motivo}</p>}
          {propuesta === null ? (
            <form onSubmit={convertir}>
              <textarea value={respuesta} onChange={(e) => setRespuesta(e.target.value)} rows={5} maxLength={2000} placeholder="Contéstale como si hablaras con alguien…" />
              <div className="aa-fila-acciones">
                <button type="submit" className="aa-primario" disabled={!respuesta.trim()}>Responder</button>
                <button type="button" className={dictando ? 'aa-dictando' : ''} onClick={dictar}>{dictando ? 'Parar de dictar' : '🎙️ Dictar'}</button>
                <button type="button" onClick={saltar}>Saltar pregunta</button>
              </div>
            </form>
          ) : (
            <>
              <p className="aa-nota">Así lo guardaré (puedes corregirlo):</p>
              <textarea value={propuesta} onChange={(e) => setPropuesta(e.target.value)} rows={4} />
              <div className="aa-fila-acciones">
                <button type="button" className="aa-primario" disabled={!propuesta.trim()} onClick={guardar}>Guardar y seguir</button>
                <button type="button" onClick={() => setPropuesta(null)}>Volver a mi respuesta</button>
                <button type="button" onClick={siguiente}>Descartar</button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function Evolucion({ aprendido, setAprendido }) {
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');
  const [textos, setTextos] = useState({});

  async function analizar() {
    setOcupado(true);
    setAviso('');
    const j = await panel('analizar');
    setOcupado(false);
    if (!j.ok) { setAviso(j.error || 'No se pudo analizar'); return; }
    setAprendido(j.aprendido);
    setAviso(j.nuevas ? `He leído ${j.nuevas} conversaciones nuevas.` : 'No hay conversaciones nuevas desde el último análisis.');
  }
  async function decidir(pr, aceptar) {
    const j = await panel(aceptar ? 'aceptar-propuesta' : 'rechazar-propuesta', { id: pr.id, texto: textos[pr.id] ?? pr.texto });
    if (j.ok) setAprendido(j.aprendido);
  }

  const propuestas = aprendido?.propuestas || [];
  return (
    <section>
      <h1>Evolución</h1>
      <p className="aa-nota">Tu clon lee las conversaciones nuevas y te propone qué aprender: lo que le faltó saber (pasa a la entrevista) y cómo responder mejor. Nada entra sin tu visto bueno.</p>
      <div className="aa-fila-acciones">
        <button type="button" className="aa-primario" disabled={ocupado} onClick={analizar}>{ocupado ? 'Leyendo conversaciones…' : 'Analizar conversaciones nuevas'}</button>
        <span className="aa-nota">Último análisis: {aprendido?.analizadoHasta ? fecha(aprendido.analizadoHasta) : 'nunca'}</span>
      </div>
      {aviso && <p className="aa-nota" role="status">{aviso}</p>}
      {!propuestas.length && <p className="aa-vacio">No hay propuestas pendientes.</p>}
      <ul className="aa-datos">
        {propuestas.map((pr) => (
          <li key={pr.id} className="aa-tarjeta">
            <span className={pr.tipo === 'leccion' ? 'aa-etiqueta aa-etiqueta-oro' : 'aa-etiqueta'}>{pr.tipo === 'leccion' ? 'Cómo responder mejor' : 'Le faltó saber'}</span>
            <textarea value={textos[pr.id] ?? pr.texto} onChange={(e) => setTextos({ ...textos, [pr.id]: e.target.value })} rows={3} />
            {pr.motivo && <p className="aa-nota">{pr.motivo}</p>}
            <div className="aa-fila-acciones">
              <button type="button" className="aa-primario" onClick={() => decidir(pr, true)}>{pr.tipo === 'leccion' ? 'Aprenderlo' : 'Preguntármelo en la entrevista'}</button>
              <button type="button" onClick={() => decidir(pr, false)}>Descartar</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

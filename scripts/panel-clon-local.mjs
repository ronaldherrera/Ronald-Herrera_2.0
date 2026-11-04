// Solo en desarrollo: /admin-clon-local hace lo mismo que public/admin-clon.php (en local no hay PHP) para probar el
// panel del clon (/avatar-admin) sin contraseña, solo desde este ordenador. Los datos van en datos-clon.local/
// (no se sube a git): las conversaciones del banco de pruebas y lo aprendido. Mismas tareas (public/_lib/aprender-clon.json).
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'

const MAX_DATOS = 300
const MAX_TEXTO = 2000

export function rutasClonLocal(raiz) {
  const carpeta = resolve(raiz, 'datos-clon.local')
  return { carpeta, conversaciones: resolve(carpeta, 'conversaciones'), aprendido: resolve(carpeta, 'clon-aprendido.json'), lib: resolve(raiz, 'public/_lib') }
}

export function leerAprendido(rutas) {
  const vacio = { datos: [], propuestas: [], preguntas: [], analizadoHasta: 0 }
  if (!existsSync(rutas.aprendido)) return vacio
  try { return { ...vacio, ...JSON.parse(readFileSync(rutas.aprendido, 'utf-8')) } } catch { return vacio }
}

function guardarAprendido(rutas, datos) {
  mkdirSync(rutas.carpeta, { recursive: true })
  writeFileSync(rutas.aprendido, JSON.stringify(datos, null, 2))
}

// Igual que textoAprendido() de public/_lib/aprendido.php
export function textoAprendido(aprendido) {
  const datos = aprendido.datos.filter((d) => d.tipo === 'dato')
  const lecciones = aprendido.datos.filter((d) => d.tipo === 'leccion')
  let texto = ''
  if (datos.length) texto += `\n\n## Más cosas sobre mí (me las ha contado Ronald; si algo choca con lo de arriba, vale esto, que es más reciente)\n${datos.map((d) => `- ${d.texto.replace(/\n/g, ' ')}\n`).join('')}`
  if (lecciones.length) texto += `\n## Criterios que he aprendido para responder mejor (ideas que aplico con mis palabras, no frases para repetir)\n${lecciones.map((d) => `- ${d.texto.replace(/\n/g, ' ')}\n`).join('')}`
  return texto
}

// Igual que baseClon() de public/_lib/aprendido.php: lo que sabe de base, por temas, para verlo en el panel
function baseClon(lib) {
  const temas = (texto, titulo) => {
    const lista = []
    let actual = null
    for (const bruta of texto.split(/\r?\n/)) {
      const linea = bruta.trim()
      if (!linea) continue
      if (linea.startsWith('- ')) { if (actual) actual.puntos.push(linea.slice(2)); continue }
      const t = titulo(linea)
      actual = t === null ? null : { titulo: t, puntos: [] }
      if (actual) lista.push(actual)
    }
    return lista.filter((s) => s.puntos.length)
  }
  const NOMBRES = { 'Tu personaje': 'Su personalidad', 'Preguntas típicas': 'Preguntas típicas', 'Cómo respondes': 'Cómo responde' }
  return {
    conocimiento: temas(readFileSync(resolve(lib, 'conocimiento-clon.md'), 'utf-8'), (l) => (l.startsWith('## ') ? l.slice(3) : null)),
    forma: temas(readFileSync(resolve(lib, 'instrucciones-clon.md'), 'utf-8'), (l) => {
      const inicio = Object.keys(NOMBRES).find((n) => l.startsWith(n) && l.endsWith(':'))
      return inicio ? NOMBRES[inicio] : null
    }),
  }
}

// Guarda la conversación del banco de pruebas como lo hace el servidor (guardarConversacion de _lib/conversaciones.php)
export function guardarConversacionLocal(rutas, id, mensajes, respuesta, pagina, contactoDado = null) {
  if (!/^[a-f0-9-]{36}$/.test(id || '')) return
  mkdirSync(rutas.conversaciones, { recursive: true })
  const ruta = resolve(rutas.conversaciones, `${id}.json`)
  const previa = existsSync(ruta) ? JSON.parse(readFileSync(ruta, 'utf-8')) : { inicio: Math.floor(Date.now() / 1000), enviados: 0, contacto: null, paginas: [] }
  if (pagina && !previa.paginas.includes(pagina)) previa.paginas.push(pagina)
  const lista = [...mensajes.map((m) => ({ rol: m.role, texto: m.content })), { rol: 'assistant', texto: respuesta }]
  if (contactoDado && !previa.contactoDado) previa.contactoDado = contactoDado
  writeFileSync(ruta, JSON.stringify({ ...previa, ultima: Math.floor(Date.now() / 1000), mensajes: lista }))
}

const SIN_DATO = /no lo tengo aquí|no tengo (ese|eso|ese dato)|(contártelo|te lo cuento|lo hablo|hablarlo|lo hablamos)( yo)? en persona|eso no lo sé/iu
const nuevoId = () => randomBytes(8).toString('hex')
const limpiar = (t, n = MAX_TEXTO) => String(t ?? '').replace(/<[^>]*>/g, '').slice(0, n).trim()

function conversacionesGuardadas(rutas) {
  if (!existsSync(rutas.conversaciones)) return []
  return readdirSync(rutas.conversaciones)
    .filter((f) => f.endsWith('.json'))
    .map((f) => { try { return [f.slice(0, -5), JSON.parse(readFileSync(resolve(rutas.conversaciones, f), 'utf-8'))] } catch { return null } })
    .filter(Boolean)
    .sort((a, b) => (b[1].ultima || 0) - (a[1].ultima || 0))
}

export function panelClonLocal(env, loadEnv) {
  return {
    name: 'panel-clon-local',
    apply: 'serve',
    configureServer(server) {
      const rutas = rutasClonLocal(server.config.root)
      server.middlewares.use('/admin-clon-local', async (req, res) => {
        const enviar = (codigo, datos) => { res.statusCode = codigo; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(datos)) }
        const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)
        if (req.method !== 'POST' || !local) return enviar(403, { ok: false })
        let cuerpo = ''
        for await (const trozo of req) cuerpo += trozo
        const entrada = JSON.parse(cuerpo || '{}')
        const accion = String(entrada.accion || '')
        const aprendido = leerAprendido(rutas)
        const conocimiento = () => readFileSync(resolve(rutas.lib, 'conocimiento-clon.md'), 'utf-8') + textoAprendido(aprendido)

        const tareaClaude = async (tarea, pedido) => {
          const clave = env.ANTHROPIC_API_KEY || loadEnv(server.config.mode, server.config.root, 'ANTHROPIC_').ANTHROPIC_API_KEY
          if (!clave) throw new Error('Falta ANTHROPIC_API_KEY en .env.local')
          const tareas = JSON.parse(readFileSync(resolve(rutas.lib, 'aprender-clon.json'), 'utf-8'))
          const { default: Anthropic } = await import('@anthropic-ai/sdk')
          const respuesta = await new Anthropic({ apiKey: clave }).messages.create({
            model: env.ANTHROPIC_MODELO_ADMIN || 'claude-sonnet-5-5',
            max_tokens: 4000,
            system: [
              { type: 'text', text: `${tareas.comun}\n\n${tareas[tarea]}` },
              { type: 'text', text: `Lo que el clon sabe ahora:\n\n${conocimiento()}` },
            ],
            messages: [{ role: 'user', content: pedido }],
          })
          const texto = respuesta.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
          const json = JSON.parse(texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1))
          if (!json || typeof json !== 'object') throw new Error('Claude no devolvió JSON')
          return json
        }

        try {
          switch (accion) {
            case 'sesion': case 'entrar': return enviar(200, { ok: true, dentro: true, local: true })
            case 'salir': return enviar(200, { ok: true, dentro: true, local: true })
            case 'conversaciones':
              return enviar(200, {
                ok: true,
                analizadoHasta: aprendido.analizadoHasta,
                conversaciones: conversacionesGuardadas(rutas).map(([id, c]) => ({
                  id, inicio: c.inicio || 0, ultima: c.ultima || 0, mensajes: (c.mensajes || []).length,
                  primera: String((c.mensajes || []).find((m) => m.rol === 'user')?.texto || '').slice(0, 140),
                  contacto: Boolean(c.contacto), contactoDado: Boolean(c.contactoDado), paginas: c.paginas || [],
                  sinDato: (c.mensajes || []).filter((m) => m.rol === 'assistant' && SIN_DATO.test(m.texto || '')).length,
                })),
              })
            case 'conversacion': {
              const c = conversacionesGuardadas(rutas).find(([id]) => id === entrada.id)
              return c ? enviar(200, { ok: true, conversacion: c[1] }) : enviar(404, { ok: false, error: 'No existe' })
            }
            case 'borrar-conversacion':
              if (/^[a-f0-9-]{36}$/.test(entrada.id || '')) { try { unlinkSync(resolve(rutas.conversaciones, `${entrada.id}.json`)) } catch { /* ya no estaba */ } }
              return enviar(200, { ok: true })
            case 'aprendido': return enviar(200, { ok: true, aprendido })
            case 'base': return enviar(200, { ok: true, base: baseClon(rutas.lib) })
            case 'guardar-dato': {
              const texto = limpiar(entrada.texto)
              if (!texto) return enviar(400, { ok: false, error: 'Texto vacío' })
              if (aprendido.datos.length >= MAX_DATOS) return enviar(400, { ok: false, error: 'Ya hay demasiados datos: borra o junta alguno' })
              const existente = aprendido.datos.find((d) => d.id === entrada.id)
              if (existente) existente.texto = texto
              else aprendido.datos.push({ id: nuevoId(), tipo: entrada.tipo === 'leccion' ? 'leccion' : 'dato', texto, origen: ['manual', 'entrevista', 'conversaciones'].includes(entrada.origen) ? entrada.origen : 'manual', fecha: Math.floor(Date.now() / 1000) })
              for (const p of aprendido.preguntas) if (p.id === entrada.pregunta) p.estado = 'respondida'
              guardarAprendido(rutas, aprendido)
              return enviar(200, { ok: true, aprendido })
            }
            case 'borrar-dato':
              aprendido.datos = aprendido.datos.filter((d) => d.id !== entrada.id)
              guardarAprendido(rutas, aprendido)
              return enviar(200, { ok: true, aprendido })
            case 'pregunta': {
              const pendiente = aprendido.preguntas.find((p) => p.estado === 'pendiente')
              if (pendiente) return enviar(200, { ok: true, pregunta: pendiente })
              const hechas = aprendido.preguntas.slice(-60).map((p) => p.texto)
              const json = await tareaClaude('pregunta', `Preguntas que ya le he hecho:\n${hechas.length ? `- ${hechas.join('\n- ')}` : '(ninguna)'}`)
              const p = { id: nuevoId(), texto: limpiar(json.pregunta, 400), motivo: limpiar(json.motivo, 300), fecha: Math.floor(Date.now() / 1000), estado: 'pendiente' }
              if (!p.texto) throw new Error('Pregunta vacía')
              aprendido.preguntas.push(p)
              guardarAprendido(rutas, aprendido)
              return enviar(200, { ok: true, pregunta: p })
            }
            case 'saltar-pregunta':
              for (const p of aprendido.preguntas) if (p.id === entrada.id) p.estado = 'saltada'
              guardarAprendido(rutas, aprendido)
              return enviar(200, { ok: true })
            case 'convertir-respuesta': {
              const respuesta = limpiar(entrada.respuesta)
              if (!respuesta) return enviar(400, { ok: false, error: 'Respuesta vacía' })
              const json = await tareaClaude('dato', `Pregunta: ${limpiar(entrada.pregunta, 400)}\n\nRespuesta de Ronald: ${respuesta}`)
              return enviar(200, { ok: true, texto: limpiar(json.texto) })
            }
            case 'revisar-dato': {
              const charla = (entrada.charla || []).slice(0, 6).map((x) => `${x.rol === 'clon' ? 'CLON' : 'RONALD'}: ${limpiar(x.texto)}`).join('\n')
              if (!charla.trim()) return enviar(400, { ok: false, error: 'Texto vacío' })
              const json = await tareaClaude('revisar', `Tipo: ${entrada.tipo === 'leccion' ? 'leccion' : 'dato'}\n\n${charla}`)
              return enviar(200, { ok: true, pregunta: limpiar(json.pregunta, 400), texto: limpiar(json.texto) })
            }
            case 'analizar': {
              const nuevas = conversacionesGuardadas(rutas).filter(([, c]) => (c.ultima || 0) > aprendido.analizadoHasta)
              if (!nuevas.length) return enviar(200, { ok: true, nuevas: 0, aprendido })
              const texto = nuevas.slice(0, 40).map(([, c]) => `<conversacion>\n${(c.mensajes || []).map((m) => `${m.rol === 'assistant' ? 'CLON' : 'VISITANTE'}: ${m.texto}`).join('\n').slice(0, 4000)}\n</conversacion>`).join('\n')
              const json = await tareaClaude('analizar', texto)
              for (const pr of (json.propuestas || []).slice(0, 8)) {
                const t = limpiar(pr.texto, 600)
                if (t) aprendido.propuestas.push({ id: nuevoId(), tipo: pr.tipo === 'leccion' ? 'leccion' : 'dato-que-falta', texto: t, motivo: limpiar(pr.motivo, 400), fecha: Math.floor(Date.now() / 1000) })
              }
              aprendido.analizadoHasta = Math.floor(Date.now() / 1000)
              guardarAprendido(rutas, aprendido)
              return enviar(200, { ok: true, nuevas: nuevas.length, aprendido })
            }
            case 'aceptar-propuesta': case 'rechazar-propuesta': {
              const pos = aprendido.propuestas.findIndex((p) => p.id === entrada.id)
              if (pos < 0) return enviar(404, { ok: false, error: 'No existe' })
              const [pr] = aprendido.propuestas.splice(pos, 1)
              if (accion === 'aceptar-propuesta') {
                const texto = limpiar(entrada.texto ?? pr.texto, 600) || pr.texto
                const fecha = Math.floor(Date.now() / 1000)
                if (pr.tipo === 'leccion') aprendido.datos.push({ id: nuevoId(), tipo: 'leccion', texto, origen: 'conversaciones', fecha })
                else aprendido.preguntas.push({ id: nuevoId(), texto, motivo: pr.motivo || 'Lo preguntaron visitantes', fecha, estado: 'pendiente' })
              }
              guardarAprendido(rutas, aprendido)
              return enviar(200, { ok: true, aprendido })
            }
            default: return enviar(400, { ok: false, error: 'Acción desconocida' })
          }
        } catch (error) {
          enviar(502, { ok: false, error: `No se pudo completar: ${error.message}` })
        }
      })
    },
  }
}

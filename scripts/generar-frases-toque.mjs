// Graba con mi voz (ElevenLabs, por /voz-local del servidor de desarrollo) las frases que el avatar dice al tocarle
// y las deja en public/avatar/frases: un mp3 por frase y frases.json con el ritmo de la boca de cada una.
// Solo graba las frases nuevas o cambiadas (el nombre del archivo sale del texto), así que no gasta de más.
// Uso: con `npm run dev` encendido (la clave va en .env.local), `npm run frases-toque`.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const TEXTOS = 'scripts/frases-toque.json';
const SALIDA = 'public/avatar/frases';
const SERVIDOR = process.env.SERVIDOR || 'http://localhost:5200';
const MODELO = 'eleven_v4';

const textos = JSON.parse(readFileSync(TEXTOS, 'utf8'));
mkdirSync(SALIDA, { recursive: true });
const indicePath = `${SALIDA}/frases.json`;
const anterior = existsSync(indicePath) ? JSON.parse(readFileSync(indicePath, 'utf8')) : {};
const yaGrabadas = new Map(Object.values(anterior).flat().map((f) => [f.archivo, f]));

const indice = {};
let grabadas = 0;
for (const [zona, lista] of Object.entries(textos)) {
  if (zona.startsWith('_')) continue;   // notas
  indice[zona] = [];
  for (const texto of lista) {
    const archivo = `${zona}-${createHash('sha1').update(`${MODELO}|${texto}`).digest('hex').slice(0, 8)}.mp3`;
    const previa = yaGrabadas.get(archivo);
    if (previa && existsSync(`${SALIDA}/${archivo}`)) { indice[zona].push(previa); continue; }
    const r = await fetch(`${SERVIDOR}/voz-local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto, modelo: MODELO, velocidad: 1 }),
    });
    const json = await r.json().catch(() => ({}));
    if (!json.ok) { console.error(`No se pudo grabar «${texto}»: ${json.error || r.status}`); process.exitCode = 1; continue; }
    writeFileSync(`${SALIDA}/${archivo}`, Buffer.from(json.audio, 'base64'));
    indice[zona].push({ texto, archivo, tiempos: json.tiempos });
    grabadas++;
    console.log(`Grabada: ${zona} · ${texto}`);
  }
}
writeFileSync(indicePath, JSON.stringify(indice));
const caracteres = Object.entries(textos).filter(([z]) => !z.startsWith("_")).flatMap(([, l]) => l).join("").length;
console.log(`${grabadas} frases nuevas · ${Object.values(indice).flat().length} en total (${caracteres} caracteres si se grabaran todas)`);

// Compila public/AR-CV/cv-target.png -> public/AR-CV/targets.mind con el compilador
// de MindAR incluido en public/AR-CV/vendor, ejecutado en Chrome sin interfaz.
// Alternativa local al compilador web oficial. Uso: npm run ar:compile
// Requiere Google Chrome instalado (o la variable CHROME_PATH) y Node 22+.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const AR_DIR = resolve('public/AR-CV');
const INPUT = join(AR_DIR, process.argv[2] || 'cv-target.png');
const OUTPUT = join(AR_DIR, 'targets.mind');
const CHROME = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find(existsSync);

if (!existsSync(INPUT)) throw new Error(`No existe ${INPUT}`);
if (!CHROME) throw new Error('No se encuentra Chrome. Indica su ruta en CHROME_PATH.');

const PAGE = `<!doctype html><script src="/vendor/aframe-1.5.0.min.js"></script>
<script src="/vendor/mindar-image-aframe-1.2.5.prod.js"></script>
<script>
window.compile = async () => {
  const img = new Image(); img.src = '/input'; await img.decode();
  // Aplana la transparencia sobre blanco, como se verá impreso.
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0);
  const flat = new Image(); flat.src = canvas.toDataURL('image/png'); await flat.decode();
  const compiler = new window.MINDAR.IMAGE.Compiler();
  await compiler.compileImageTargets([flat], () => {});
  const data = new Uint8Array(await compiler.exportData());
  let s = ''; for (let i = 0; i < data.length; i += 0x8000) s += String.fromCharCode.apply(null, data.subarray(i, i + 0x8000));
  const d = compiler.data[0];
  return {
    b64: btoa(s),
    points: d.trackingData.map((t) => t.points.length),
    matching: d.matchingData.reduce((n, m) => n + m.maximaPoints.length + m.minimaPoints.length, 0),
    size: [img.naturalWidth, img.naturalHeight],
  };
};
</script>`;

const server = createServer((req, res) => {
  if (req.url === '/') return res.end(PAGE);
  if (req.url === '/input') return res.end(readFileSync(INPUT));
  const file = join(AR_DIR, req.url.replace(/^\/+/, ''));
  if (req.url.startsWith('/vendor/') && existsSync(file)) {
    res.setHeader('Content-Type', 'text/javascript');
    return res.end(readFileSync(file));
  }
  res.statusCode = 404;
  res.end();
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const url = `http://127.0.0.1:${server.address().port}/`;

const profile = mkdtempSync(join(tmpdir(), 'mindar-compile-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', url,
], { stdio: ['ignore', 'ignore', 'pipe'] });

try {
  const wsUrl = await new Promise((ok, ko) => {
    let buf = '';
    chrome.stderr.on('data', (d) => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) ok(m[1]);
    });
    chrome.once('exit', () => ko(new Error('Chrome se cerró inesperadamente')));
  });
  const targets = await (await fetch(wsUrl.replace('ws://', 'http://').replace(/\/devtools\/browser\/.*/, '/json/list'))).json();
  const ws = new WebSocket(targets.find((t) => t.type === 'page' && t.url === url).webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  const call = (expression) => new Promise((ok, ko) => {
    const id = Math.floor(Math.random() * 1e9);
    ws.addEventListener('message', function onMsg(ev) {
      const msg = JSON.parse(ev.data);
      if (msg.id !== id) return;
      ws.removeEventListener('message', onMsg);
      const r = msg.result;
      if (msg.error || r.exceptionDetails) ko(new Error(JSON.stringify(msg.error || r.exceptionDetails.exception?.description)));
      else ok(r.result.value);
    });
    ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
  });

  for (let i = 0; i < 100 && !(await call('typeof window.MINDAR === "object" && typeof window.compile === "function"')); i++) {
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log(`Compilando ${INPUT}…`);
  const { b64, points, matching, size } = await call('window.compile()');
  writeFileSync(OUTPUT, Buffer.from(b64, 'base64'));
  console.log(`✔ ${OUTPUT} (${size[0]}×${size[1]} px)`);
  console.log(`  Puntos de detección: ${matching} · puntos de seguimiento: ${points.join(' + ')}`);
  // El seguimiento siempre trabaja con la imagen reducida a 256/128 px: sus puntos
  // dependen del contraste y la textura del diseño, no de la resolución.
  ws.close();
} finally {
  chrome.kill();
  server.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome puede tardar en soltar el perfil */ }
}

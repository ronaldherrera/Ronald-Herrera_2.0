// Texturas en canvas para la escena 3D (modo cámara). Mismo lenguaje visual
// que la web: superficies #111, texto crema, acentos, mayúsculas espaciadas.
import { CONTACT, PALETTE } from './arCvData';

const FONT = '"Brother 1816", "Helvetica Neue", Arial, sans-serif';
const SURFACE = '#111111';
const MUTED = 'rgba(234, 229, 202, 0.62)';

let fontsReady = null;
export const loadWorldFonts = () => {
  if (!fontsReady) {
    fontsReady = document.fonts
      ? Promise.all([
          document.fonts.load(`800 64px ${FONT}`),
          document.fonts.load(`400 28px ${FONT}`),
          document.fonts.load(`italic 400 40px ${FONT}`),
        ]).catch(() => null)
      : Promise.resolve();
  }
  return fontsReady;
};

export const accentColor = (name) => PALETTE[name] || PALETTE.gold;

const canvasOf = (w, h) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w);
  canvas.height = Math.round(h);
  return { canvas, ctx: canvas.getContext('2d') };
};

export const roundRectPath = (ctx, x, y, w, h, r) => {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
};

const fitFont = (ctx, text, weight, size, maxWidth, style = '') => {
  let current = size;
  do {
    ctx.font = `${style} ${weight} ${current}px ${FONT}`.trim();
    if (ctx.measureText(text).width <= maxWidth) break;
    current -= 2;
  } while (current > 10);
  return current;
};

const spacedText = (ctx, text, x, y, spacing, align = 'left') => {
  const chars = [...text];
  const width = chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);
  let cursor = align === 'center' ? x - width / 2 : x;
  for (const char of chars) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + spacing;
  }
  return width;
};

const drawShape = (ctx, shape, cx, cy, size, color) => {
  const h = size / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  if (shape === 'circle') ctx.arc(cx, cy, h, 0, Math.PI * 2);
  else if (shape === 'triangle') {
    ctx.moveTo(cx, cy - h);
    ctx.lineTo(cx + h, cy + h);
    ctx.lineTo(cx - h, cy + h);
  } else if (shape === 'rhombus') {
    ctx.moveTo(cx, cy - h * 1.15);
    ctx.lineTo(cx + h * 1.15, cy);
    ctx.lineTo(cx, cy + h * 1.15);
    ctx.lineTo(cx - h * 1.15, cy);
  } else ctx.rect(cx - h, cy - h, size, size);
  ctx.closePath();
  ctx.fill();
};

// Iconos de trazo (Lucide, ISC) como trazados SVG para Path2D.
const ICONS = {
  phone: ['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z'],
  chat: ['M7.9 20A9 9 0 1 0 4 16.1L2 22Z'],
  mail: ['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'm22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'],
  contact: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M5 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0', 'M19 8v6', 'M22 11h-6'],
  linkedin: ['M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z', 'M2 9h4v12H2z', 'M2 4a2 2 0 1 0 4 0a2 2 0 1 0-4 0'],
  github: ['M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4', 'M9 18c-4.51 2-5-2-7-2'],
  globe: ['M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0', 'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20', 'M2 12h20'],
};

const drawIcon = (ctx, name, cx, cy, size, color) => {
  const scale = size / 24;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  (ICONS[name] || []).forEach((d) => ctx.stroke(new Path2D(d)));
  ctx.restore();
};

// Cara de una placa: superficie oscura con esquinas redondeadas.
const slabFace = (wPx, hPx, radiusPx) => {
  const { canvas, ctx } = canvasOf(wPx, hPx);
  roundRectPath(ctx, 0, 0, wPx, hPx, radiusPx);
  ctx.fillStyle = SURFACE;
  ctx.fill();
  ctx.save();
  ctx.clip();
  return { canvas, ctx, done: () => ctx.restore() };
};

// Pared del portal: del borde (arriba, #141414) a la oscuridad del fondo (abajo).
export const drawTunnelWall = () => {
  const { canvas, ctx } = canvasOf(8, 512);
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#161616');
  g.addColorStop(0.45, '#0b0b0b');
  g.addColorStop(1, '#000000');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 8, 512);
  return canvas;
};

// Antetítulo y lema flotando en la boca del portal.
export const drawTagline = () => {
  const { canvas, ctx } = canvasOf(1024, 170);
  const W = canvas.width;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `800 26px ${FONT}`;
  const kickerW = spacedText(ctx, 'CV INTERACTIVO', W / 2 + 22, 30, 8, 'center');
  ctx.fillRect(W / 2 - kickerW / 2 - 26, 29, 30, 3);
  ctx.fillStyle = PALETTE.cream;
  ctx.textAlign = 'center';
  fitFont(ctx, CONTACT.tagline, 400, 44, W * 0.9, 'italic');
  ctx.fillText(CONTACT.tagline, W / 2, 104);
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.coral;
  ctx.fillRect(W / 2 - 30, 150, 60, 3);
  return canvas;
};

// Celda de la rejilla dorada (se repite y se desplaza: efecto cascada).
export const drawGridCell = () => {
  const { canvas, ctx } = canvasOf(128, 128);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(0, 0, 128, 7);
  ctx.fillRect(0, 0, 7, 128);
  return canvas;
};

// Máscara de la cascada: visible arriba y desvanecida hacia abajo (como la web).
export const drawGridFade = () => {
  const { canvas, ctx } = canvasOf(4, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#fff');
  g.addColorStop(0.35, '#fff');
  g.addColorStop(0.8, '#555');
  g.addColorStop(1, '#111');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  return canvas;
};

// Portada de proyecto para el carrusel. `image` puede ser null (portada tipográfica).
export const drawCard = (item, index, total, w, h, px, image) => {
  const { canvas, ctx, done } = slabFace(w * px, h * px, 0.018 * px);
  const W = canvas.width;
  const H = canvas.height;
  const accent = accentColor(item.accent);
  const mediaH = H * 0.66;

  if (image) {
    const scale = Math.max(W / image.width, mediaH / image.height);
    const iw = image.width * scale;
    const ih = image.height * scale;
    ctx.drawImage(image, (W - iw) / 2, (mediaH - ih) / 2, iw, ih);
  } else {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, mediaH);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, mediaH); ctx.stroke(); }
    for (let y = 0; y < mediaH; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    fitFont(ctx, item.name.toUpperCase(), 800, Math.round(H * 0.2), W * 0.85);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.strokeText(item.name.toUpperCase(), W - 28, mediaH - 26);
    ctx.textAlign = 'left';
  }

  // Degradado inferior y banda de acento.
  const grad = ctx.createLinearGradient(0, mediaH * 0.55, 0, mediaH);
  grad.addColorStop(0, 'rgba(17,17,17,0)');
  grad.addColorStop(1, 'rgba(17,17,17,0.85)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, mediaH);
  ctx.fillStyle = accent;
  ctx.fillRect(0, mediaH - 4, W, 4);

  // Índice sobre la imagen.
  ctx.fillStyle = 'rgba(16,16,16,0.75)';
  roundRectPath(ctx, 20, 20, 104, 44, 22);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.textBaseline = 'middle';
  ctx.font = `800 24px ${FONT}`;
  spacedText(ctx, `${String(index + 1).padStart(2, '0')}/${String(total).padStart(2, '0')}`, 72, 43, 2, 'center');

  // Nombre y pie.
  const left = 26;
  ctx.fillStyle = PALETTE.cream;
  ctx.textBaseline = 'alphabetic';
  fitFont(ctx, item.name.toUpperCase(), 800, Math.round(H * 0.12), W - left * 2);
  ctx.fillText(item.name.toUpperCase(), left, mediaH + H * 0.15);
  ctx.fillStyle = MUTED;
  const caption = item.caption.toUpperCase();
  const size = fitFont(ctx, caption, 400, Math.round(H * 0.055), W - left * 2 - caption.length * 3);
  ctx.font = `400 ${size}px ${FONT}`;
  spacedText(ctx, caption, left, mediaH + H * 0.27, 3);
  done();
  return canvas;
};

// Rótulo bajo el carrusel: proyecto actual + indicador de posición.
export const drawPlaque = (item, index, total) => {
  const { canvas, ctx } = canvasOf(900, 150);
  const W = canvas.width;
  roundRectPath(ctx, 2, 2, W - 4, 146, 73);
  ctx.fillStyle = 'rgba(24,24,24,0.95)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(234,229,202,0.18)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = MUTED;
  ctx.textBaseline = 'middle';
  ctx.font = `800 26px ${FONT}`;
  spacedText(ctx, '←  DESLIZA  →', W / 2, 44, 4, 'center');

  // Puntos de posición.
  const gap = 26;
  const start = W / 2 - ((total - 1) * gap) / 2;
  for (let i = 0; i < total; i++) {
    ctx.beginPath();
    ctx.arc(start + i * gap, 104, i === index ? 8 : 5, 0, Math.PI * 2);
    ctx.fillStyle = i === index ? accentColor(item.accent) : 'rgba(234,229,202,0.3)';
    ctx.fill();
  }
  return canvas;
};

// Rótulo sobre la hoja bajo cada sólido 3D (Sobre mí, Ronald Lab, Hablemos).
export const drawSolidLabel = (tile) => {
  const { canvas, ctx } = canvasOf(420, 90);
  const label = tile.label.toUpperCase();
  ctx.font = `800 32px ${FONT}`;
  const textW = [...label].reduce((s, c) => s + ctx.measureText(c).width, 0) + 5 * (label.length - 1);
  const w = Math.min(414, textW + 90);
  roundRectPath(ctx, (420 - w) / 2, 8, w, 74, 37);
  ctx.fillStyle = 'rgba(24,24,24,0.95)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(234,229,202,0.2)';
  ctx.lineWidth = 3;
  ctx.stroke();
  drawShape(ctx, tile.shape, (420 - w) / 2 + 40, 45, 20, accentColor(tile.color));
  ctx.fillStyle = PALETTE.cream;
  ctx.textBaseline = 'middle';
  spacedText(ctx, label, (420 - w) / 2 + 64, 47, 5);
  return canvas;
};

// Botón flotante circular con icono.
export const drawButton = (button, sizePx) => {
  const { canvas, ctx } = canvasOf(sizePx, sizePx);
  const r = sizePx / 2;
  ctx.beginPath();
  ctx.arc(r, r, r - 2, 0, Math.PI * 2);
  ctx.fillStyle = SURFACE;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(234,229,202,0.16)';
  ctx.stroke();
  drawIcon(ctx, button.icon, r, r, sizePx * 0.42, accentColor(button.color));
  return canvas;
};

// Etiqueta bajo cada botón flotante (grande para leerse a distancia).
export const drawButtonLabel = (label) => {
  const { canvas, ctx } = canvasOf(460, 110);
  const text = label.toUpperCase();
  ctx.font = `800 44px ${FONT}`;
  const textW = [...text].reduce((s, c) => s + ctx.measureText(c).width, 0) + 5 * (text.length - 1);
  const w = Math.min(454, textW + 56);
  roundRectPath(ctx, (460 - w) / 2, 8, w, 94, 47);
  ctx.fillStyle = 'rgba(20,20,20,0.95)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(234,229,202,0.28)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = PALETTE.cream;
  ctx.textBaseline = 'middle';
  spacedText(ctx, text, 230, 58, 5, 'center');
  return canvas;
};

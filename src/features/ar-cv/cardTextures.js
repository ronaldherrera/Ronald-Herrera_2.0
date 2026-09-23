// Dibujo en canvas de las tarjetas ancladas al CV, con el lenguaje visual de la
// web: superficie oscura, borde sutil, etiquetas en mayúsculas espaciadas,
// formas geométricas de acento. Texto corto y grande: nada de párrafos en 3D.
import { PALETTE } from './arCvData';

export const PX_PER_UNIT = 1500;
export const CARD_PAD = 0.02; // margen (unidades de escena) para la sombra
const FONT = '"Brother 1816", "Helvetica Neue", Arial, sans-serif';
const SURFACE = '#111111';
const BORDER = 'rgba(234, 229, 202, 0.18)';
const MUTED = 'rgba(234, 229, 202, 0.62)';

let fontsReady = null;
export const loadCardFonts = () => {
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

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

// Reduce el tamaño de fuente hasta que el texto quepa en maxWidth.
const fitFont = (ctx, text, weight, size, maxWidth, style = '') => {
  let current = size;
  do {
    ctx.font = `${style} ${weight} ${current}px ${FONT}`.trim();
    if (ctx.measureText(text).width <= maxWidth) break;
    current -= 2;
  } while (current > 12);
  return current;
};

// Texto con espaciado entre letras (compatible con navegadores sin ctx.letterSpacing).
const spacedText = (ctx, text, x, y, spacing) => {
  let cursor = x;
  for (const char of text) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + spacing;
  }
  return cursor - spacing;
};

const createCanvas = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round((width + CARD_PAD * 2) * PX_PER_UNIT);
  canvas.height = Math.round((height + CARD_PAD * 2) * PX_PER_UNIT);
  const ctx = canvas.getContext('2d');
  const pad = CARD_PAD * PX_PER_UNIT;
  const box = { x: pad, y: pad, w: width * PX_PER_UNIT, h: height * PX_PER_UNIT };
  return { canvas, ctx, box };
};

// Superficie como las tarjetas de la web (#111 + borde de 1px muy sutil) con
// una sombra difusa para separarla del papel.
const drawShell = (ctx, box) => {
  const radius = Math.min(box.h * 0.08, 22);
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = SURFACE;
  roundRect(ctx, box.x, box.y, box.w, box.h, radius);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.strokeStyle = BORDER;
  roundRect(ctx, box.x, box.y, box.w, box.h, radius);
  ctx.stroke();
};

// Formas de la sección «Valor»: círculo, cuadrado, triángulo y rombo.
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
    ctx.moveTo(cx, cy - h * 1.1);
    ctx.lineTo(cx + h * 1.1, cy);
    ctx.lineTo(cx, cy + h * 1.1);
    ctx.lineTo(cx - h * 1.1, cy);
  } else ctx.rect(cx - h, cy - h, size, size);
  ctx.closePath();
  ctx.fill();
};

const drawArrow = (ctx, cx, cy, size, color) => {
  const a = size / 2;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - a, cy + a);
  ctx.lineTo(cx + a, cy - a);
  ctx.moveTo(cx - a * 0.3, cy - a);
  ctx.lineTo(cx + a, cy - a);
  ctx.lineTo(cx + a, cy + a * 0.3);
  ctx.stroke();
};

export const drawNavCard = ({ width, height, index, title, hint, accent, shape }) => {
  const { canvas, ctx, box } = createCanvas(width, height);
  drawShell(ctx, box);
  const inset = box.h * 0.13;
  const left = box.x + inset;
  const right = box.x + box.w - inset;
  const top = box.y + inset;

  // Fila superior: forma + índice en color de acento, flecha a la derecha.
  const shapeSize = box.h * 0.1;
  drawShape(ctx, shape, left + shapeSize / 2, top + shapeSize / 2, shapeSize, accent);
  ctx.fillStyle = accent;
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(box.h * 0.085)}px ${FONT}`;
  spacedText(ctx, String(index).padStart(2, '0'), left + shapeSize * 1.8, top + shapeSize / 2 + 2, 4);
  drawArrow(ctx, right - box.h * 0.05, top + shapeSize / 2, box.h * 0.1, MUTED);

  // Título en mayúsculas y pista.
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = PALETTE.cream;
  fitFont(ctx, title.toUpperCase(), 800, Math.round(box.h * 0.17), box.w - inset * 2);
  const titleY = box.y + box.h - inset - box.h * 0.2;
  ctx.fillText(title.toUpperCase(), left, titleY);

  // Línea corta de acento bajo el título (como los subtítulos de la web).
  ctx.fillStyle = accent;
  ctx.fillRect(left, titleY + box.h * 0.06, box.h * 0.16, 4);

  ctx.fillStyle = MUTED;
  const hintSize = fitFont(ctx, hint.toUpperCase(), 400, Math.round(box.h * 0.07), box.w - inset * 2 - 40);
  ctx.font = `400 ${hintSize}px ${FONT}`;
  spacedText(ctx, hint.toUpperCase(), left, box.y + box.h - inset + 2, 3);
  return canvas;
};

export const drawHeaderCard = ({ width, height, title, tagline }) => {
  const { canvas, ctx, box } = createCanvas(width, height);
  drawShell(ctx, box);
  const inset = box.h * 0.16;
  const left = box.x + inset;
  const maxWidth = box.w - inset * 2;

  // Etiqueta con línea previa, en dorado (como «SALA DE JUEGOS» en The Lab).
  const labelY = box.y + inset + box.h * 0.04;
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(left, labelY - 2, box.h * 0.12, 3);
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(box.h * 0.068)}px ${FONT}`;
  spacedText(ctx, 'CV INTERACTIVO', left + box.h * 0.17, labelY, 7);

  // Nombre en mayúsculas con punto coral final.
  ctx.textBaseline = 'alphabetic';
  const name = title.toUpperCase();
  fitFont(ctx, `${name}.`, 800, Math.round(box.h * 0.27), maxWidth);
  const nameY = box.y + box.h * 0.6;
  ctx.fillStyle = PALETTE.cream;
  ctx.fillText(name, left, nameY);
  ctx.fillStyle = PALETTE.coral;
  ctx.fillText('.', left + ctx.measureText(name).width, nameY);

  ctx.fillStyle = MUTED;
  fitFont(ctx, tagline, 400, Math.round(box.h * 0.105), maxWidth, 'italic');
  ctx.fillText(tagline, left, box.y + box.h - inset);
  return canvas;
};

// Contorno de la hoja con un trazo de luz dorado que la recorre (detección).
export const drawOutline = (canvas, progress, fade) => {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  const inset = 10;
  const w = width - inset * 2;
  const h = height - inset * 2;
  const r = 10;
  const perimeter = 2 * (w + h) - (8 - 2 * Math.PI) * r;

  ctx.globalAlpha = 0.55 * fade;
  ctx.lineWidth = 3;
  ctx.strokeStyle = PALETTE.cream;
  roundRect(ctx, inset, inset, w, h, r);
  ctx.stroke();

  if (progress < 1) {
    ctx.globalAlpha = fade;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.strokeStyle = PALETTE.gold;
    ctx.shadowColor = PALETTE.gold;
    ctx.shadowBlur = 14;
    ctx.setLineDash([perimeter * 0.28, perimeter]);
    ctx.lineDashOffset = -perimeter * progress;
    roundRect(ctx, inset, inset, w, h, r);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
};

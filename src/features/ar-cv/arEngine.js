import { AR_ENGINE, AR_TARGET } from './arCvData';
import { registerArComponents } from './arComponents';

// Códigos de error internos. La interfaz los traduce a mensajes comprensibles
// (ver ERROR_MESSAGES en ARExperience.jsx); nunca se muestran al usuario tal cual.
export class ArError extends Error {
  constructor(code, cause) {
    super(code);
    this.code = code;
    this.cause = cause;
  }
}

export const supportsWebGL = () => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
};

const cameraErrorCode = (error) => {
  switch (error?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'denied';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'no-camera';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'camera-busy';
    default:
      return 'camera-failed';
  }
};

export const mapCameraError = cameraErrorCode;

// Pide el permiso de cámara justo después de la acción del usuario y libera el
// stream en cuanto se concede: MindAR abrirá su propio stream más tarde sin
// volver a preguntar (el permiso ya está concedido para esta página).
export const requestCameraPermission = async () => {
  if (!window.isSecureContext) throw new ArError('insecure');
  if (!navigator.mediaDevices?.getUserMedia) throw new ArError('unsupported');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' } },
    });
    stream.getTracks().forEach((track) => track.stop());
  } catch (error) {
    throw new ArError(cameraErrorCode(error), error);
  }
};

// Con el fallback SPA del hosting, un archivo inexistente devuelve index.html
// con estado 200: se detecta por el content-type.
const looksLikeHtml = (response) =>
  (response.headers.get('content-type') || '').includes('text/html');

export const isTargetAvailable = async () => {
  try {
    const response = await fetch(AR_TARGET.mind, { method: 'HEAD', cache: 'no-cache' });
    return response.ok && !looksLikeHtml(response);
  } catch {
    return false;
  }
};

const fetchWithProgress = async (url, expectedBytes, onProgress) => {
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new ArError('network', error);
  }
  if (!response.ok || looksLikeHtml(response)) throw new ArError('network');

  const headerLength = Number(response.headers.get('content-length')) || 0;
  const encoded = Boolean(response.headers.get('content-encoding'));
  const total = Math.max(encoded ? 0 : headerLength, expectedBytes || 0) || headerLength || 1;

  if (!response.body?.getReader) {
    const blob = await response.blob();
    onProgress(1);
    return blob;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(Math.min(received / total, 0.99));
  }
  onProgress(1);
  return new Blob(chunks, { type: response.headers.get('content-type') || 'application/octet-stream' });
};

const injectScript = (blob) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([blob], { type: 'text/javascript' }));
    const script = document.createElement('script');
    script.src = url;
    script.async = false;
    script.onload = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    script.onerror = (error) => {
      URL.revokeObjectURL(url);
      reject(new ArError('network', error));
    };
    document.head.appendChild(script);
  });

let enginePromise = null;

// Descarga A-Frame y MindAR una sola vez por sesión (nunca duplicados).
// onProgress recibe un valor 0..1 basado en los bytes realmente recibidos.
export const loadArEngine = (onProgress = () => {}) => {
  if (window.AFRAME?.systems?.['mindar-image-system']) {
    onProgress(1);
    registerArComponents(window.AFRAME);
    return Promise.resolve(window.AFRAME);
  }
  if (enginePromise) return enginePromise;

  const totalBytes = AR_ENGINE.reduce((sum, file) => sum + file.bytes, 0);
  const loaded = AR_ENGINE.map(() => 0);
  const report = () => onProgress(loaded.reduce((a, b) => a + b, 0) / totalBytes);

  enginePromise = (async () => {
    // Descargas en paralelo; ejecución en orden (MindAR necesita window.AFRAME).
    const blobs = await Promise.all(
      AR_ENGINE.map((file, index) =>
        fetchWithProgress(file.src, file.bytes, (ratio) => {
          loaded[index] = ratio * file.bytes;
          report();
        })
      )
    );
    for (const blob of blobs) await injectScript(blob);
    if (!window.AFRAME?.systems?.['mindar-image-system']) throw new ArError('init');
    registerArComponents(window.AFRAME);
    return window.AFRAME;
  })().catch((error) => {
    enginePromise = null;
    throw error instanceof ArError ? error : new ArError('init', error);
  });

  return enginePromise;
};

// Descarga targets.mind con progreso y devuelve una URL local (blob:) para MindAR.
export const loadTarget = async (onProgress = () => {}) => {
  const blob = await fetchWithProgress(AR_TARGET.mind, 0, onProgress);
  return URL.createObjectURL(blob);
};

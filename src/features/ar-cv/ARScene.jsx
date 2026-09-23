import { useEffect, useEffectEvent, useRef } from 'react';
import { CONTACT, PALETTE, SECTIONS, AR_TARGET } from './arCvData';

// Posiciones sobre la hoja (ancho = 1). `fy` es la fracción de media altura
// del CV, así el diseño se adapta a la proporción real del target.
const HEADER = { fy: 0.52, width: 0.8, height: 0.21, lift: 0.05 };
const GRID = [
  { x: -0.2, fy: 0.1, lift: 0.085 },
  { x: 0.2, fy: 0.1, lift: 0.1 },
  { x: -0.2, fy: -0.3, lift: 0.095 },
  { x: 0.2, fy: -0.3, lift: 0.11 },
];
const CARD = { width: 0.37, height: 0.21 };
const TAP_SLOP = 14; // px de movimiento tolerado para considerar un toque
const TAP_WINDOW = 700; // ms máximos entre soltar el dedo y el click

// Los valores se insertan en atributos A-Frame («clave: valor; …»).
const attr = (value) => String(value).replace(/[;:]/g, ' ');

const buildSceneMarkup = () => {
  const half = AR_TARGET.fallbackAspect / 2;
  const cards = SECTIONS.map((section, i) => {
    const slot = GRID[i];
    const accent = PALETTE[section.color] || PALETTE.gold;
    return `<a-entity data-fy="${slot.fy}" position="${slot.x} ${slot.fy * half} 0"
      rh-card="section: ${section.id}; index: ${i + 1}; title: ${attr(section.title)}; hint: ${attr(section.hint)};
      accent: ${accent}; shape: ${section.shape}; width: ${CARD.width}; height: ${CARD.height}; lift: ${slot.lift}"></a-entity>`;
  }).join('');

  return `
    <a-camera position="0 0 0" look-controls="enabled: false" wasd-controls="enabled: false"></a-camera>
    <a-entity id="rh-anchor" mindar-image-target="targetIndex: 0"></a-entity>
    <a-entity id="rh-follow" rh-follow="anchor: #rh-anchor; hold: 800">
      <a-entity position="0 0 0.003" rh-outline="aspect: ${AR_TARGET.fallbackAspect}"></a-entity>
      <a-entity data-fy="${HEADER.fy}" position="0 ${HEADER.fy * half} 0"
        rh-card="variant: header; title: ${attr(CONTACT.name)}; hint: ${attr(CONTACT.tagline)};
        width: ${HEADER.width}; height: ${HEADER.height}; lift: ${HEADER.lift}"></a-entity>
      ${cards}
    </a-entity>`;
};

const ARScene = ({ targetSrc, disabled, onCameraReady, onReady, onFound, onLost, onError, onSelect }) => {
  const containerRef = useRef(null);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const emitCameraReady = useEffectEvent(() => onCameraReady?.());
  const emitReady = useEffectEvent(() => onReady?.());
  const emitFound = useEffectEvent((detail) => onFound?.(detail));
  const emitLost = useEffectEvent(() => onLost?.());
  const emitError = useEffectEvent((detail) => onError?.(detail));
  const emitSelect = useEffectEvent((section) => onSelect?.(section));

  useEffect(() => {
    const container = containerRef.current;
    const AFRAME = window.AFRAME;
    if (!container || !AFRAME || !targetSrc) return undefined;
    const THREE = AFRAME.THREE;

    const scene = document.createElement('a-scene');
    scene.setAttribute('embedded', '');
    scene.setAttribute(
      'mindar-image',
      'autoStart: false; uiLoading: no; uiScanning: no; uiError: no; filterMinCF: 0.0001; filterBeta: 0.001; missTolerance: 6; warmupTolerance: 3'
    );
    scene.setAttribute('renderer', 'colorManagement: true; alpha: true; antialias: true; precision: medium');
    scene.setAttribute('vr-mode-ui', 'enabled: false');
    scene.setAttribute('device-orientation-permission-ui', 'enabled: false');
    scene.setAttribute('loading-screen', 'enabled: false');
    scene.innerHTML = buildSceneMarkup();
    container.appendChild(scene);

    const getSystem = () => scene.systems?.['mindar-image-system'];
    let disposed = false;

    const start = () => {
      const system = getSystem();
      if (disposed || !system) return;
      // Se asigna directamente para no pasar la URL blob: por el parser de atributos.
      system.imageTargetSrc = targetSrc;
      system.start();
    };

    const handleReady = () => {
      // Proporción real del CV (alto/ancho) a partir de la matriz del marcador.
      const anchor = scene.querySelector('#rh-anchor')?.components['mindar-image-target'];
      const m = anchor?.postMatrix?.elements;
      if (m && m[12] > 0) {
        scene.querySelector('#rh-follow')?.components['rh-follow']?.setAspect(m[13] / m[12]);
      }
      emitReady();
    };
    const handleCamera = () => emitCameraReady();
    const handleError = (event) => emitError(event.detail || {});
    const handleFound = (event) => emitFound(event.detail || {});
    const handleLost = () => emitLost();

    scene.addEventListener('rh-camera-ready', handleCamera);
    scene.addEventListener('arReady', handleReady);
    scene.addEventListener('arError', handleError);
    scene.addEventListener('rh-found', handleFound);
    scene.addEventListener('rh-lost', handleLost);

    if (scene.hasLoaded) start();
    else scene.addEventListener('loaded', start, { once: true });

    // Toques: pointer events para el estado pulsado y `click` para activar.
    // El navegador emite un único click tanto con toque como con ratón, y como
    // llega después del toque no puede caer sobre el panel recién abierto.
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let press = null;
    let tap = null;

    const cardAt = (event) => {
      const camera = scene.camera;
      if (!camera) return null;
      const rect = container.getBoundingClientRect();
      ndc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      const cards = Array.from(scene.querySelectorAll('[rh-card]'))
        .map((el) => el.components['rh-card'])
        .filter((card) => card?.data.section && card.isInteractive());
      const hits = raycaster.intersectObjects(cards.map((card) => card.hitMesh), false);
      return hits[0]?.object.userData.card || null;
    };

    const releasePress = () => {
      press?.card.setPressed(false);
      press = null;
    };

    const onPointerDown = (event) => {
      tap = null;
      if (disabledRef.current || !event.isPrimary) return;
      const card = cardAt(event);
      if (!card) return;
      card.setPressed(true);
      press = { card, x: event.clientX, y: event.clientY };
    };

    const onPointerMove = (event) => {
      if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > TAP_SLOP) releasePress();
    };

    const onPointerUp = (event) => {
      if (!press) return;
      const { card } = press;
      releasePress();
      if (cardAt(event) === card) tap = { card, time: performance.now() };
    };

    const onClick = () => {
      const current = tap;
      tap = null;
      if (!current || disabledRef.current || performance.now() - current.time > TAP_WINDOW) return;
      emitSelect(current.card.data.section);
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', releasePress);
    container.addEventListener('pointerleave', releasePress);
    container.addEventListener('click', onClick);

    // Pausa de la pestaña y regreso.
    const onVisibility = () => {
      const system = getSystem();
      if (!system) return;
      if (document.hidden) system.pause();
      else system.unpause();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Cambio de orientación: se reajusta cuando el navegador termina de rotar.
    let resizeTimer = 0;
    const onOrientation = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => window.dispatchEvent(new Event('resize')), 350);
    };
    window.addEventListener('orientationchange', onOrientation);
    screen.orientation?.addEventListener?.('change', onOrientation);

    // Cierre de la página: libera la cámara aunque React no llegue a desmontar.
    const onPageHide = () => getSystem()?.stop();
    window.addEventListener('pagehide', onPageHide);

    return () => {
      disposed = true;
      window.clearTimeout(resizeTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('orientationchange', onOrientation);
      screen.orientation?.removeEventListener?.('change', onOrientation);
      window.removeEventListener('pagehide', onPageHide);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', releasePress);
      container.removeEventListener('pointerleave', releasePress);
      container.removeEventListener('click', onClick);
      scene.removeEventListener('loaded', start);
      scene.removeEventListener('rh-camera-ready', handleCamera);
      scene.removeEventListener('arReady', handleReady);
      scene.removeEventListener('arError', handleError);
      scene.removeEventListener('rh-found', handleFound);
      scene.removeEventListener('rh-lost', handleLost);

      getSystem()?.stop();
      const renderer = scene.renderer;
      scene.parentNode?.removeChild(scene);
      try {
        renderer?.forceContextLoss();
      } catch {
        // El contexto ya estaba liberado.
      }
      container.querySelectorAll('video').forEach((video) => video.remove());
    };
  }, [targetSrc]);

  return <div ref={containerRef} className="arcv-scene" />;
};

export default ARScene;

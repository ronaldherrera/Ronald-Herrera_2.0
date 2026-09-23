import { useEffect, useEffectEvent, useRef } from 'react';

const TAP_SLOP = 12; // px de movimiento tolerado para considerar un toque
const TAP_WINDOW = 700; // ms máximos entre soltar el dedo y el click
// main.jsx cancela los toques seguidos (<300 ms) para bloquear el zoom y con ello
// el click; si no llega, se activa igualmente tras este margen.
const CLICK_FALLBACK = 350;

const SCENE_MARKUP = `
  <a-camera position="0 0 0" look-controls="enabled: false" wasd-controls="enabled: false"></a-camera>
  <a-entity id="rh-anchor" mindar-image-target="targetIndex: 0"></a-entity>
  <a-entity id="rh-follow" rh-follow="anchor: #rh-anchor; hold: 800" rh-world></a-entity>`;

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
  const emitSelect = useEffectEvent((action) => onSelect?.(action));

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
    // La escena 3D trae su propia luz, fija respecto a la hoja.
    scene.setAttribute('light', 'defaultLightsEnabled: false');
    scene.innerHTML = SCENE_MARKUP;
    container.appendChild(scene);

    const getSystem = () => scene.systems?.['mindar-image-system'];
    const getWorld = () => scene.querySelector('#rh-follow')?.components['rh-world'];
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
      if (m && m[12] > 0) getWorld()?.setAspect(m[13] / m[12]);
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

    // Interacción: pointer events para pulsar y arrastrar, y `click` para
    // activar (un único click por toque en Android e iOS, sin dobles activaciones).
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let gesture = null;
    let tap = null;

    const targetAt = (event) => {
      const camera = scene.camera;
      const world = getWorld();
      if (!camera || !world) return null;
      const rect = container.getBoundingClientRect();
      ndc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      return world.hitTest(raycaster);
    };

    const releasePress = () => {
      if (gesture?.target) getWorld()?.setPressed(gesture.target, false);
    };

    const clearTap = () => {
      if (tap) window.clearTimeout(tap.timer);
      tap = null;
    };

    const activateTap = () => {
      const current = tap;
      clearTap();
      if (!current || disabledRef.current || performance.now() - current.time > TAP_WINDOW) return;
      const action = getWorld()?.activate(current.target);
      if (action) emitSelect(action);
    };

    const onPointerDown = (event) => {
      clearTap();
      if (disabledRef.current || !event.isPrimary) return;
      getWorld()?.touch();
      const target = targetAt(event);
      if (target) getWorld()?.setPressed(target, true);
      gesture = {
        target,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastT: performance.now(),
        velocity: 0,
        dragging: false,
      };
    };

    const onPointerMove = (event) => {
      if (!gesture || !event.isPrimary) return;
      const world = getWorld();
      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;
      if (!gesture.dragging) {
        if (Math.hypot(dx, dy) <= TAP_SLOP) return;
        releasePress();
        gesture.target = null;
        // Solo los gestos horizontales giran el carrusel.
        if (Math.abs(dx) < Math.abs(dy)) {
          gesture = null;
          return;
        }
        gesture.dragging = true;
        world?.beginDrag();
      }
      const width = container.clientWidth || 1;
      const now = performance.now();
      const step = (event.clientX - gesture.lastX) / width;
      const elapsed = Math.max(1, now - gesture.lastT);
      gesture.velocity = gesture.velocity * 0.6 + (step / elapsed) * 0.4;
      gesture.lastX = event.clientX;
      gesture.lastT = now;
      world?.dragBy(step);
    };

    const onPointerUp = (event) => {
      if (!gesture) return;
      const current = gesture;
      gesture = null;
      if (current.dragging) {
        getWorld()?.endDrag(current.velocity);
        return;
      }
      if (current.target) {
        getWorld()?.setPressed(current.target, false);
        if (targetAt(event) === current.target) {
          tap = { target: current.target, time: performance.now(), timer: window.setTimeout(activateTap, CLICK_FALLBACK) };
        }
      }
    };

    const onPointerCancel = () => {
      if (gesture?.dragging) getWorld()?.endDrag(0);
      releasePress();
      gesture = null;
    };

    const onClick = () => activateTap();

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerCancel);
    container.addEventListener('pointerleave', onPointerCancel);
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
      clearTap();
      window.clearTimeout(resizeTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('orientationchange', onOrientation);
      screen.orientation?.removeEventListener?.('change', onOrientation);
      window.removeEventListener('pagehide', onPageHide);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerCancel);
      container.removeEventListener('pointerleave', onPointerCancel);
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

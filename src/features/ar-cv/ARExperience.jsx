import { useEffect, useRef, useState } from 'react';
import { PAGE_META, PALETTE, SECTIONS } from './arCvData';
import {
  ArError,
  isTargetAvailable,
  loadArEngine,
  loadTarget,
  mapCameraError,
  requestCameraPermission,
  supportsWebGL,
} from './arEngine';
import { trackArEvent } from './analytics';
import { usePageMeta } from './usePageMeta';
import WelcomeScreen from './WelcomeScreen';
import TrackingGuide from './TrackingGuide';
import ARScene from './ARScene';
import BottomSheet from './BottomSheet';
import FloatingMenu from './FloatingMenu';
import FallbackExperience from './FallbackExperience';
import { PANELS } from './panels';
import './arCv.css';

const RETRY = 'Intentar de nuevo';

// Mensajes para el usuario: sin términos técnicos.
const NOTICES = {
  desktop: {
    title: 'La experiencia con cámara está pensada para el móvil',
    text: 'Escanea el código QR de tu CV impreso con el teléfono. Mientras tanto, aquí tienes todo el contenido.',
    retry: 'Probar con la cámara de este equipo',
  },
  'target-missing': {
    title: 'La experiencia con cámara estará disponible muy pronto',
    text: 'Mientras tanto, aquí tienes todo el contenido del CV.',
  },
  denied: {
    title: 'No tenemos acceso a la cámara',
    text: 'Puedes permitirlo desde los ajustes del navegador y volver a intentarlo. Mientras tanto, aquí tienes todo el contenido.',
    retry: RETRY,
  },
  insecure: {
    title: 'Este navegador no permite usar la cámara aquí',
    text: 'Prueba a abrir la página en Chrome o Safari actualizados. Aquí tienes todo el contenido.',
  },
  unsupported: {
    title: 'Este navegador no permite usar la cámara',
    text: 'Prueba a abrir la página en Chrome o Safari actualizados. Aquí tienes todo el contenido.',
  },
  webgl: {
    title: 'Este dispositivo no es compatible con la experiencia',
    text: 'No pasa nada: aquí tienes todo el contenido del CV.',
  },
  'no-camera': {
    title: 'No encontramos ninguna cámara',
    text: 'Aquí tienes todo el contenido del CV.',
    retry: RETRY,
  },
  'camera-busy': {
    title: 'La cámara está ocupada',
    text: 'Cierra otras aplicaciones que la estén usando y vuelve a intentarlo.',
    retry: RETRY,
  },
  network: {
    title: 'No hemos podido cargar la experiencia',
    text: 'Revisa tu conexión y vuelve a intentarlo. Mientras tanto, aquí tienes todo el contenido.',
    retry: RETRY,
  },
  init: {
    title: 'No hemos podido iniciar la experiencia',
    text: 'Vuelve a intentarlo o explora aquí todo el contenido.',
    retry: RETRY,
  },
};

const SLOW_SCAN_MS = 20000;
const TAP_HINT_MS = 3500;

const isDesktop = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia?.('(any-pointer: coarse)').matches;

const ARExperience = () => {
  usePageMeta(PAGE_META);

  const [mode, setMode] = useState(() => (isDesktop() ? 'web' : 'welcome'));
  const [noticeCode, setNoticeCode] = useState(() => (isDesktop() ? 'desktop' : null));
  const [phase, setPhase] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [targetSrc, setTargetSrc] = useState(null);
  const [panel, setPanel] = useState(null);
  const [slow, setSlow] = useState(false);
  const [tapHint, setTapHint] = useState(false);
  const sessionRef = useRef(0);
  const foundOnceRef = useRef(false);

  // Fondo y color de interfaz propios mientras la ruta está activa.
  useEffect(() => {
    const { body } = document;
    const previous = body.style.backgroundColor;
    body.style.backgroundColor = PALETTE.bg;
    return () => {
      body.style.backgroundColor = previous;
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== 'ar') return undefined;
    window.scrollTo(0, 0);
    const { documentElement: html, body } = document;
    const previous = [html.style.overflow, body.style.overflow];
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      [html.style.overflow, body.style.overflow] = previous;
    };
  }, [mode]);

  // Revoca la URL local del target al cambiarla o al salir.
  useEffect(() => () => targetSrc && URL.revokeObjectURL(targetSrc), [targetSrc]);

  useEffect(() => {
    if (phase !== 'scanning' || foundOnceRef.current) return undefined;
    const timer = window.setTimeout(() => setSlow(true), SLOW_SCAN_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (!tapHint) return undefined;
    const timer = window.setTimeout(() => setTapHint(false), TAP_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [tapHint]);

  const resetAr = () => {
    sessionRef.current += 1;
    setTargetSrc(null);
    setPhase('idle');
    setProgress(0);
    setPanel(null);
    setSlow(false);
    setTapHint(false);
  };

  const fallBack = (code) => {
    resetAr();
    setNoticeCode(code);
    setMode('web');
    window.scrollTo(0, 0);
    trackArEvent('ar_cv_fallback', { reason: code });
  };

  const startAR = async () => {
    resetAr();
    const session = sessionRef.current;
    const alive = () => sessionRef.current === session;
    foundOnceRef.current = false;
    setNoticeCode(null);
    setMode('ar');
    setPhase('permission');
    trackArEvent('ar_cv_start');

    try {
      if (!supportsWebGL()) throw new ArError('webgl');
      if (!(await isTargetAvailable())) throw new ArError('target-missing');
      if (!alive()) return;

      await requestCameraPermission();
      if (!alive()) return;
      setPhase('loading');

      await loadArEngine((ratio) => alive() && setProgress(ratio * 0.8));
      if (!alive()) return;
      const url = await loadTarget((ratio) => alive() && setProgress(0.8 + ratio * 0.12));
      if (!alive()) {
        URL.revokeObjectURL(url);
        return;
      }
      setProgress(0.92);
      setPhase('starting');
      setTargetSrc(url);
    } catch (error) {
      if (alive()) fallBack(error instanceof ArError ? error.code : 'init');
    }
  };

  const exitAR = (to) => {
    resetAr();
    setNoticeCode(null);
    setMode(to);
    window.scrollTo(0, 0);
  };

  const openPanel = (id) => {
    setPanel(id);
    setTapHint(false);
    trackArEvent('ar_cv_section_open', { section: id, mode });
  };

  const handleCameraReady = () => {
    setPhase('initializing');
    setProgress(0.96);
  };

  const handleReady = () => {
    setProgress(1);
    setPhase('scanning');
    trackArEvent('ar_cv_camera_ready');
  };

  const handleFound = ({ quick }) => {
    setPhase('tracking');
    setSlow(false);
    if (quick) return;
    if (!foundOnceRef.current) {
      foundOnceRef.current = true;
      setTapHint(true);
      trackArEvent('ar_cv_target_found');
    }
    try {
      navigator.vibrate?.(30);
    } catch {
      // Vibración no disponible.
    }
  };

  const handleLost = () => setPhase('lost');

  const handleSceneError = ({ error, reason }) => {
    fallBack(error === 'VIDEO_FAIL' && reason ? mapCameraError({ name: reason }) : 'init');
  };

  const notice = noticeCode ? NOTICES[noticeCode] : null;
  const activePanel = panel ? PANELS[panel] : null;
  const ActivePanel = activePanel?.Component;
  const panelIndex = SECTIONS.findIndex((section) => section.id === panel);
  const panelColor = SECTIONS[panelIndex]?.color;

  return (
    <div className={`arcv arcv--${mode}`}>
      {mode === 'welcome' && <WelcomeScreen onStart={startAR} onExplore={() => exitAR('web')} />}

      {mode === 'web' && (
        <FallbackExperience
          notice={notice}
          onTryAR={() => exitAR('welcome')}
          onRetry={notice?.retry ? startAR : undefined}
        />
      )}

      {mode === 'ar' && (
        <div className="arcv-ar">
          {targetSrc && (
            <ARScene
              targetSrc={targetSrc}
              disabled={Boolean(panel)}
              onCameraReady={handleCameraReady}
              onReady={handleReady}
              onFound={handleFound}
              onLost={handleLost}
              onError={handleSceneError}
              onSelect={openPanel}
            />
          )}
          <TrackingGuide
            phase={phase}
            progress={progress}
            slow={slow}
            lost={phase === 'lost' && !panel}
            tapHint={tapHint && !panel}
            onClose={() => exitAR('welcome')}
            onSwitchToWeb={() => exitAR('web')}
          />
          {(phase === 'tracking' || phase === 'lost') && <FloatingMenu onSelect={openPanel} />}
          <BottomSheet
            open={Boolean(activePanel)}
            title={activePanel?.title}
            kicker={panelIndex >= 0 ? `${String(panelIndex + 1).padStart(2, '0')} / ${String(SECTIONS.length).padStart(2, '0')}` : undefined}
            accent={panelColor}
            onClose={() => setPanel(null)}
          >
            {ActivePanel && <ActivePanel />}
          </BottomSheet>
        </div>
      )}
    </div>
  );
};

export default ARExperience;

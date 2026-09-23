import { useEffect, useRef, useState } from 'react';
import Icon from './Icons';

const CLOSE_DISTANCE = 110;
const CLOSE_VELOCITY = 0.6; // px/ms
const EXIT_MS = 220;
const BACKDROP_GUARD_MS = 400; // ignora clics fantasma justo después de abrir

const useScrollLock = (active) => {
  useEffect(() => {
    if (!active) return undefined;
    const { documentElement: html, body } = document;
    const previous = [html.style.overflow, body.style.overflow];
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      [html.style.overflow, body.style.overflow] = previous;
    };
  }, [active]);
};

// Panel inferior: se cierra con el botón, con Escape, tocando fuera o
// deslizando la cabecera hacia abajo.
const BottomSheet = ({ open, title, kicker, accent = 'cream', onClose, children }) => {
  const [closing, setClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const drag = useRef(null);
  const closeButtonRef = useRef(null);
  const sheetRef = useRef(null);
  const returnFocusRef = useRef(null);
  const openedAtRef = useRef(0);
  const titleId = 'arcv-sheet-title';

  useScrollLock(open);

  const requestClose = () => {
    if (closing) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      onClose();
      return;
    }
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      setDragY(0);
      onClose();
    }, EXIT_MS);
  };

  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement;
    openedAtRef.current = performance.now();
    closeButtonRef.current?.focus({ preventScroll: true });
    return () => {
      const target = returnFocusRef.current;
      if (target && document.contains(target)) target.focus?.({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        requestClose();
        return;
      }
      // Mantiene el foco dentro del panel mientras está abierto.
      if (event.key !== 'Tab' || !sheetRef.current) return;
      const focusable = sheetRef.current.querySelectorAll('a[href], button:not([disabled])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!open) return null;

  const onPointerDown = (event) => {
    if (event.target.closest('button')) return;
    drag.current = { startY: event.clientY, startT: performance.now(), id: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    setDragY(Math.max(0, event.clientY - drag.current.startY));
  };

  const onPointerUp = (event) => {
    if (!drag.current) return;
    const distance = Math.max(0, event.clientY - drag.current.startY);
    const velocity = distance / Math.max(1, performance.now() - drag.current.startT);
    drag.current = null;
    if (distance > CLOSE_DISTANCE || (distance > 30 && velocity > CLOSE_VELOCITY)) requestClose();
    else setDragY(0);
  };

  const sheetStyle = dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined;

  return (
    <div className={`arcv-sheet-layer ${closing ? 'is-closing' : ''}`}>
      <div
        className="arcv-sheet-backdrop"
        onClick={() => performance.now() - openedAtRef.current > BACKDROP_GUARD_MS && requestClose()}
        aria-hidden="true"
      />
      <section
        ref={sheetRef}
        className={`arcv-sheet arcv-accent--${accent}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={sheetStyle}
      >
        <header
          className="arcv-sheet__header"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="arcv-sheet__handle" aria-hidden="true" />
          <div className="arcv-sheet__heading">
            {kicker && <p className="arcv-sheet__kicker">{kicker}</p>}
            <h2 id={titleId} className="arcv-sheet__title">{title}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="arcv-icon-btn"
            onClick={requestClose}
            aria-label={`Cerrar ${title}`}
          >
            <Icon name="close" size={22} />
          </button>
        </header>
        <div className="arcv-sheet__body">{children}</div>
      </section>
    </div>
  );
};

export default BottomSheet;

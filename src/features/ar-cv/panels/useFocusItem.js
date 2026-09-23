import { useEffect, useRef } from 'react';

// Lleva a la vista el elemento abierto desde el carrusel 3D y lo resalta.
export const useFocusItem = (focusId) => {
  const listRef = useRef(null);
  useEffect(() => {
    if (!focusId || !listRef.current) return undefined;
    const el = listRef.current.querySelector(`[data-item="${focusId}"]`);
    if (!el) return undefined;
    const timer = window.setTimeout(() => {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    }, 380);
    return () => window.clearTimeout(timer);
  }, [focusId]);
  return listRef;
};

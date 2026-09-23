// Eventos anónimos sobre la analítica ya existente (gtag en index.html).
// Nunca se envían imágenes, datos de cámara ni datos personales.
export const trackArEvent = (name, params = {}) => {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', name, { event_category: 'ar_cv', ...params });
    }
  } catch {
    // La analítica nunca debe romper la experiencia.
  }
};

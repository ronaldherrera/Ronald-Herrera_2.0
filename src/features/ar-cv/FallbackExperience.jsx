import { useEffect, useRef } from 'react';
import Icon, { Shape } from './Icons';
import logo from '../../assets/Logotio-blanco.svg';
import { CONTACT, SECTIONS } from './arCvData';
import { PANELS } from './panels';

// Versión navegable completa, sin cámara. También es el contenido indexable.
const FallbackExperience = ({ notice, onTryAR, onRetry }) => {
  const noticeRef = useRef(null);

  useEffect(() => {
    if (notice) noticeRef.current?.focus({ preventScroll: false });
  }, [notice]);

  const goTo = (id) => {
    const heading = document.getElementById(`arcv-h-${id}`);
    if (!heading) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    heading.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    heading.focus({ preventScroll: true });
  };

  return (
    <div className="arcv-web">
      <header className="arcv-web__top">
        <a className="arcv-web__brand" href="/" aria-label={`${CONTACT.name}: ir a la web`}>
          <img src={logo} alt="" className="arcv-logo" width="139" height="24" />
        </a>
        {onTryAR && (
          <button type="button" className="arcv-chip arcv-chip--solid" onClick={onTryAR}>
            <Icon name="camera" size={18} />
            <span>Usar cámara</span>
          </button>
        )}
      </header>

      <div className="arcv-grid-bg arcv-grid-bg--top" aria-hidden="true" />
      <main className="arcv-web__main">
        {notice && (
          <div className="arcv-notice" role="status" tabIndex={-1} ref={noticeRef}>
            <p className="arcv-notice__title">{notice.title}</p>
            <p className="arcv-notice__text">{notice.text}</p>
            {notice.retry && onRetry && (
              <button type="button" className="arcv-btn arcv-btn--secondary" onClick={onRetry}>
                <span className="arcv-btn__label">{notice.retry}</span>
                <Icon name="camera" size={18} />
              </button>
            )}
          </div>
        )}

        <section className="arcv-web__hero" aria-labelledby="arcv-web-title">
          <p className="arcv-kicker">CV interactivo</p>
          <h1 id="arcv-web-title" className="arcv-display">
            {CONTACT.name}<span className="arcv-dot-accent">.</span>
          </h1>
          <p className="arcv-lead">{CONTACT.tagline}</p>
          <p className="arcv-web__role">{CONTACT.role}</p>
        </section>

        <nav className="arcv-web__nav" aria-label="Secciones del CV">
          {SECTIONS.map((section, i) => (
            <button
              key={section.id}
              type="button"
              className={`arcv-nav-card arcv-accent--${section.color}`}
              onClick={() => goTo(section.id)}
            >
              <span className="arcv-nav-card__index">
                <Shape shape={section.shape} size={12} />
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="arcv-nav-card__title">{section.title}</span>
              <span className="arcv-nav-card__hint">{section.hint}</span>
            </button>
          ))}
        </nav>

        {SECTIONS.map((section) => {
          const { title, Component } = PANELS[section.id];
          return (
            <section key={section.id} className="arcv-web__section" aria-labelledby={`arcv-h-${section.id}`}>
              <h2 id={`arcv-h-${section.id}`} className="arcv-section-title" tabIndex={-1}>
                <span className={`arcv-section-title__mark arcv-accent--${section.color}`}>
                  <Shape shape={section.shape} size={16} />
                </span>
                {title}
              </h2>
              <Component />
            </section>
          );
        })}
      </main>

      <footer className="arcv-web__footer">
        <a className="arcv-btn arcv-btn--secondary" href="/">
          <Icon name="back" size={18} />
          <span className="arcv-btn__label">Ir a {CONTACT.webDisplay}</span>
        </a>
        <p className="arcv-privacy">
          <Icon name="lock" size={16} />
          <span>La cámara se procesa en tu dispositivo. No se graban ni se envían imágenes.</span>
        </p>
      </footer>
    </div>
  );
};

export default FallbackExperience;

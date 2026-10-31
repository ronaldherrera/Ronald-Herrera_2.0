import React, { useEffect, useRef, useState } from 'react';
import createGlobe from 'cobe';
import './ContactPage.css';

// Mensajes del formulario según cómo vaya el envío
const ESTADOS = {
  enviado: 'Mensaje enviado. Te respondo en cuanto lo lea.',
  error: 'No se ha podido enviar.',
};

// Errores del servidor que sí ayudan a quien escribe; el resto se muestran como un fallo genérico
const ERRORES_VISIBLES = ['Faltan datos', 'El email no es válido', 'Demasiados envíos. Inténtalo más tarde.'];

const ContactPage = () => {
  const canvasRef = useRef();
  const [estado, setEstado] = useState('listo'); // listo | enviando | enviado | error
  const [error, setError] = useState('');

  const enviar = async (e) => {
    e.preventDefault();
    const formulario = e.currentTarget;
    setEstado('enviando');
    setError('');
    try {
      const respuesta = await fetch('/send-mail.php', { method: 'POST', body: new FormData(formulario) });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok || !datos.ok) throw new Error(datos.error || '');
      formulario.reset();
      setEstado('enviado');
    } catch (err) {
      setError(err.message);
      setEstado('error');
    }
  };

  useEffect(() => {
    let phi = 0;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 600 * 2,
      height: 600 * 2,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.03, 0.03, 0.03],
      markerColor: [0.1, 0.8, 1],
      glowColor: [0.1, 0.1, 0.1],
      markers: [
        // Coordenadas de Santander, España
        { location: [43.4623, -3.8099], size: 0.1 }
      ],
      onRender: (state) => {
        state.phi = phi;
        phi += 0.005;
      }
    });

    return () => {
      globe.destroy();
    };
  }, []);

  return (
    <div className="contact-page">
      <div className="contact-hero">
        <div className="contact-globe-container">
          <canvas
            ref={canvasRef}
            style={{ width: 600, height: 600, maxWidth: "100%", aspectRatio: 1 }}
          />
        </div>
        
        <div className="contact-content">
          <span className="contact-tag">ESTABLECIDO EN EL NORTE DE ESPAÑA</span>
          <h1 className="contact-title">SANTANDER<span className="dot">.</span></h1>
          <p className="contact-desc">
            Desde la costa de Cantabria para el mundo digital. <br />
            Especializado en crear productos con alma y propósito técnico.
          </p>
          
          <div className="contact-grid">
            <div className="contact-form-container">
              <form className="contact-form" onSubmit={enviar}>
                <div className="form-group">
                  <label htmlFor="name">NOMBRE</label>
                  <input type="text" id="name" name="nombre" placeholder="Tu nombre" maxLength={120} required />
                </div>
                <div className="form-group">
                  <label htmlFor="email">EMAIL</label>
                  <input type="email" id="email" name="email" placeholder="tu@email.com" maxLength={160} required />
                </div>
                <div className="form-group">
                  <label htmlFor="message">MENSAJE</label>
                  <textarea id="message" name="mensaje" rows="4" placeholder="¿En qué puedo ayudarte?" maxLength={3000} required></textarea>
                </div>
                {/* Campo trampa para robots: las personas no lo ven */}
                <input type="text" name="web" tabIndex={-1} autoComplete="off" aria-hidden="true" className="campo-trampa" />
                <button type="submit" className="btn-send-contact" disabled={estado === 'enviando'}>
                  {estado === 'enviando' ? 'ENVIANDO…' : 'ENVIAR MENSAJE'}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
                <p className={`form-estado ${estado}`} role="status" aria-live="polite">
                  {estado === 'enviado' && ESTADOS.enviado}
                  {estado === 'error' && (
                    <>
                      {ERRORES_VISIBLES.includes(error) ? `${error.replace(/\.$/, '')}. ` : `${ESTADOS.error} `}
                      Escríbeme directamente a <a href="mailto:hola@ronaldherrera.es">hola@ronaldherrera.es</a>.
                    </>
                  )}
                </p>
                <p className="form-privacidad">Uso tus datos solo para responderte. No los guardo ni los comparto.</p>
              </form>
            </div>
            
            <div className="contact-info-lateral">
              <div className="info-block">
                <h3>CONECTAR</h3>
                <a href="https://linkedin.com/in/ronald-herrera" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                <a href="https://github.com/ronaldherrera" target="_blank" rel="noopener noreferrer">GitHub</a>
                <a href="https://behance.net/ronald-herrera" target="_blank" rel="noopener noreferrer">Behance</a>
              </div>
              <div className="info-block">
                <h3>DIRECTO</h3>
                <a href="mailto:hola@ronaldherrera.es">hola@ronaldherrera.es</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;

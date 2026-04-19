import React, { useEffect, useRef } from 'react';
import createGlobe from 'cobe';
import './ContactPage.css';

const ContactPage = () => {
  const canvasRef = useRef();

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
              <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
                <div className="form-group">
                  <label htmlFor="name">NOMBRE</label>
                  <input type="text" id="name" placeholder="Tu nombre" />
                </div>
                <div className="form-group">
                  <label htmlFor="email">EMAIL</label>
                  <input type="email" id="email" placeholder="tu@email.com" />
                </div>
                <div className="form-group">
                  <label htmlFor="message">MENSAJE</label>
                  <textarea id="message" rows="4" placeholder="¿En qué puedo ayudarte?"></textarea>
                </div>
                <button type="submit" className="btn-send-contact">
                  ENVIAR MENSAJE
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </form>
            </div>
            
            <div className="contact-info-lateral">
              <div className="info-block">
                <h3>CONECTAR</h3>
                <a href="https://linkedin.com/in/ronald-herrera" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                <a href="https://github.com/ronald-herrera" target="_blank" rel="noopener noreferrer">GitHub</a>
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

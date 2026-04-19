import React, { useState, useEffect } from 'react';
import './Footer.css';

const Footer = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatLocalTime = (date) => {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit', 
      timeZone: 'Europe/Madrid',
      hour12: false 
    });
  };

  return (
    <footer className="footer section-padding" id="contact">
      <div className="container">
        <div className="footer-watermark">RH</div>
        
        <div className="footer-content">
          <div className="footer-top-info">
            <div className="info-item">
              <span className="info-label">LOCAL_TIME:</span>
              <span className="info-value">{formatLocalTime(time)} SANTANDER, ES</span>
            </div>
            <div className="info-item">
              <span className="info-label">STATUS:</span>
              <span className="info-value status-online">AVAILABLE FOR PROJECTS</span>
            </div>
          </div>

          <h2 className="footer-title">
            ¿Hablamos de tu próximo <br/>
            <span className="text-highlight-blue">PRODUCTO?</span>
          </h2>
          
          <div className="footer-main-actions">
            <a href="mailto:hola@ronaldherrera.es" className="btn-contact-main">
              ENVIAR UN CORREO
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </a>
          </div>

          
          <div className="footer-bottom">
            <p className="footer-copyright">
              © {new Date().getFullYear()} Ronald Herrera — Diseño y Estrategia Visual.
            </p>
            <p className="footer-motto">
              HECHO CON 
              <span className="heart-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

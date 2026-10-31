import React from 'react';
import { Link } from 'react-router-dom';
import './FinalCTA.css';

const FinalCTA = () => {
  return (
    <section className="final-cta-section section-padding">
      <div className="container">
        <div className="final-cta-content">
          <h2 className="final-cta-title">
            ¿Buscas a alguien que no solo diseñe, sino que sea capaz de <span className="text-highlight-red">construirlo</span>?
          </h2>
          <p className="final-cta-subtitle">
            Busco un puesto en remoto como desarrollador de producto. Si encajo en tu equipo, escríbeme.
          </p>
          <div className="final-cta-acciones">
            <Link to="/contacto" className="btn btn-primary btn-cta">HABLEMOS</Link>
            <a href="/AR-CV/ronald-herrera-cv.pdf" className="btn btn-secondary btn-cta" download="Ronald-Herrera-CV.pdf">DESCARGAR CV</a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;

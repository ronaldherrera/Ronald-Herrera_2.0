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
            Si te interesa mi enfoque pragmático para tu próximo proyecto, hablemos.
          </p>
          <Link to="/contacto" className="btn btn-primary btn-cta">HABLEMOS</Link>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;

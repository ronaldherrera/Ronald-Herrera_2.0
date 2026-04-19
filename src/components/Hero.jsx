import React from 'react';
import './Hero.css';

const Hero = () => {
  return (
    <section className="hero section-padding" id="hero">
      <div className="hero-vector-bg">
        <div className="grid-perspective">
          <div className="grid-lines"></div>
        </div>
      </div>
      
      <div className="container hero-container relative-z">
        <div className="hero-content">
          <p className="text-accent hero-greeting">RONALD HERRERA — CREATIVIDAD, TECNOLOGÍA & UX.</p>
          <h1 className="hero-title">
            Diseño y construyo <br/>
            <span className="text-outline">experiencias digitales</span> <br/>
            <span className="text-highlight-blue">con criterio visual.</span>
          </h1>
          <p className="text-body-large hero-subtitle">
            Combino arte y ciencia de los entornos digitales para estructurar <br/> estrategias que "conectan" ideas con alta calidad y resultados <br/> de negocio.
          </p>
          
          <div className="hero-actions">
            <a href="#proyectos" className="btn btn-primary">VER PROYECTOS</a>
            <a href="#contacto" className="btn btn-secondary">TE CUENTO</a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

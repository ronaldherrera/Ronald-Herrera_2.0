import React from 'react';
import { Link } from 'react-router-dom';
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
          <p className="text-accent hero-greeting">RONALD HERRERA — PRODUCTO, DISEÑO & FRONT-END</p>
          <h1 className="hero-title">
            Diseño y construyo <br/>
            <span className="text-outline">productos digitales que</span> <br/>
            <span className="text-highlight-blue">funcionan de verdad.</span>
          </h1>
          <p className="text-body-large hero-subtitle">
            Híbrido entre diseño UX/UI y Front-end. Creo interfaces que <br/> no solo se ven bien: se usan, convierten y resuelven problemas <br/> de negocio reales.
          </p>
          
          <div className="hero-actions">
            <a href="#proyectos" className="btn btn-primary">VER PROYECTOS</a>
            <Link to="/contacto" className="btn btn-secondary">CONTACTAR</Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

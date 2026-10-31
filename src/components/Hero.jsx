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
          <p className="text-accent hero-greeting">RONALD HERRERA — DESARROLLADOR FULL-STACK DE PRODUCTO</p>
          <h1 className="hero-title">
            Diseño y construyo <br/>
            <span className="text-outline">productos digitales que</span> <br/>
            <span className="text-highlight-blue">funcionan de verdad.</span>
          </h1>
          <p className="text-body-large hero-subtitle">
            Llevo productos completos a producción: base de datos, seguridad, <br/> interfaz, app móvil y despliegue. Trabajo con React, Next.js, Supabase <br/> y React Native, y vengo de diez años de diseño gráfico, web y UX/UI.
          </p>

          <div className="hero-actions">
            <a href="#proyectos" className="btn btn-primary">VER PROYECTOS</a>
            <a href="/AR-CV/ronald-herrera-cv.pdf" className="btn btn-secondary" download="Ronald-Herrera-CV.pdf">DESCARGAR CV</a>
            <Link to="/contacto" className="btn btn-secondary">CONTACTAR</Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

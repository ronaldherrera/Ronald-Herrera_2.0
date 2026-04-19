import React from 'react';
import './ValueProposition.css';

const features = [
  {
    title: 'VISIÓN VISUAL',
    description: 'Cuido mucho el detalle, la consistencia y la jerarquía. Desarrollo interfaces que son limpias con una estética muy cuidada.',
    iconClass: 'abstract-icon-1', /* Cuadrado a Rombo */
    iconColor: 'icon-blue'
  },
  {
    title: 'PENSAMIENTO UX',
    description: 'Si algo no se entiende o precisa de largos manuales, hay un problema. Priorizo siempre la utilidad y la usabilidad funcional.',
    iconClass: 'abstract-icon-2', /* Triángulo a Cuadrado */
    iconColor: 'icon-gold'
  },
  {
    title: 'EJECUCIÓN REAL',
    description: 'Paso del lienzo a la vida. Tengo capacidad de construir mediante front-end lo que diseño sin que el concepto original se pierda.',
    iconClass: 'abstract-icon-3', /* Pentágono a Triángulo */
    iconColor: 'icon-orange'
  },
  {
    title: 'INICIATIVA',
    description: 'La proactividad en el equipo, ser capaz de dar un paso adelante que traiga resoluciones con rapidez y sin cuellos de botella.',
    iconClass: 'abstract-icon-4', /* Rombo a Pentágono */
    iconColor: 'icon-cream'
  }
];

const ValueProposition = () => {
  return (
    <section className="value-prop section-padding" id="valor">
      <div className="container">
        
        <div className="value-grid">
          {features.map((feature, index) => (
            <div key={index} className="value-card">
              <div className="title-with-icon">
                <div className={`abstract-icon ${feature.iconClass} ${feature.iconColor}`}>
                  <div className="shape"></div>
                </div>
                <h3 className="value-title">{feature.title}</h3>
              </div>
              <p className="value-desc">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ValueProposition;

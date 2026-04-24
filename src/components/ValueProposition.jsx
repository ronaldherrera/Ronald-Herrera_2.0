import React from 'react';
import './ValueProposition.css';

const features = [
  {
    title: 'DISEÑO ENFOCADO AL USO REAL',
    description: 'Interfaces intuitivas sin fricciones. Priorizo la funcionalidad y la experiencia de usuario por encima de modas estéticas.',
    iconClass: 'abstract-icon-1',
    iconColor: 'icon-blue'
  },
  {
    title: 'DESARROLLO FRONT-END',
    description: 'Paso del diseño a código limpio y escalable. Construyo componentes funcionales que respetan la visión original del producto.',
    iconClass: 'abstract-icon-2',
    iconColor: 'icon-gold'
  },
  {
    title: 'VISIÓN DE PRODUCTO',
    description: 'Alineo las necesidades del usuario con los objetivos de negocio. Cada decisión técnica o de diseño tiene un porqué estratégico.',
    iconClass: 'abstract-icon-3',
    iconColor: 'icon-orange'
  },
  {
    title: 'RESOLUCIÓN DE PROBLEMAS',
    description: 'Detección de cuellos de botella y enfoque en la mejora continua. Me gusta entender el reto técnico para proponer soluciones simples.',
    iconClass: 'abstract-icon-4',
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

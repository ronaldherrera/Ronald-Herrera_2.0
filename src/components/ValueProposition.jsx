import React from 'react';
import './ValueProposition.css';

const features = [
  {
    title: 'DISEÑO QUE SE PUEDE CONSTRUIR',
    description: 'Diseño sabiendo cómo se va a programar. Marcas completas, interfaces y sistemas de diseño que luego implemento yo mismo.',
    iconClass: 'abstract-icon-1',
    iconColor: 'icon-blue'
  },
  {
    title: 'PRODUCTO COMPLETO',
    description: 'Base de datos, seguridad, interfaz, pagos, apps móviles y despliegue. Sé llevar una idea hasta producción sin que nadie me la termine.',
    iconClass: 'abstract-icon-2',
    iconColor: 'icon-gold'
  },
  {
    title: 'REGLAS DONDE IMPORTAN',
    description: 'La lógica crítica va en la base de datos, con RLS y funciones en Postgres, para que ninguna pantalla pueda saltársela.',
    iconClass: 'abstract-icon-3',
    iconColor: 'icon-orange'
  },
  {
    title: 'QUE TE ENCUENTREN',
    description: 'SEO técnico a escala: páginas prerenderizadas, datos estructurados y sitemaps. Protop publica 1.608 páginas listas para Google.',
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

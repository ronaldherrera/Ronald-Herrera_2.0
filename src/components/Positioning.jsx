import React from 'react';
import './Positioning.css';

const Positioning = () => {
  return (
    <section className="positioning-section section-padding">
      <div className="container">
        <div className="positioning-content">
          <p className="positioning-label">MI ENFOQUE</p>
          <h2 className="positioning-text">
            Pienso como <span className="text-highlight-gold">diseñador</span>, <br className="hide-mobile" />
            construyo como <span className="text-highlight-blue">desarrollador</span>.
          </h2>
          <p className="positioning-subtext">
            Me enfoco en el producto final. Si una interfaz es bonita pero no resuelve un problema real o es difícil de implementar, no sirve. Ejecuto ideas con pragmatismo y visión funcional.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Positioning;

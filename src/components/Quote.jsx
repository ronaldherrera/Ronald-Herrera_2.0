import React from 'react';
import './Quote.css';

const Quote = () => {
  return (
    <section className="quote-section section-padding">
      <div className="container">
        <div className="quote-content">
          <p className="quote-label">ENFOQUE / MANIFIESTO</p>
          <h2 className="quote-text">
            "No diseño por diseñar, me interesa 
            <span className="text-highlight-gold"> resolver</span>. Si algo necesita demasiada 
            explicación, hay un problema de UX."
          </h2>
        </div>
      </div>
    </section>
  );
};

export default Quote;

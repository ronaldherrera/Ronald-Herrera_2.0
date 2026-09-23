import { SECTIONS } from './arCvData';

// Equivalente HTML de las tarjetas flotantes para teclado y lectores de pantalla.
// Permanece oculto visualmente hasta que recibe el foco.
const FloatingMenu = ({ onSelect }) => (
  <nav className="arcv-floating-menu" aria-label="Secciones del CV">
    {SECTIONS.map((section) => (
      <button key={section.id} type="button" className="arcv-btn arcv-btn--secondary" onClick={() => onSelect(section.id)}>
        {section.title}
      </button>
    ))}
  </nav>
);

export default FloatingMenu;

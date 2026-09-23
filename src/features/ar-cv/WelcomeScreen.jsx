import Icon, { Shape } from './Icons';
import { SECTIONS } from './arCvData';
import logo from '../../assets/Logotio-blanco.svg';

const WelcomeScreen = ({ onStart, onExplore }) => (
  <main className="arcv-welcome" aria-labelledby="arcv-welcome-title">
    <div className="arcv-grid-bg" aria-hidden="true" />

    <header className="arcv-welcome__brand">
      <img src={logo} alt="Ronald Herrera" className="arcv-logo" width="139" height="24" />
      <span className="arcv-welcome__brand-role">CV interactivo</span>
    </header>

    <div className="arcv-welcome__art" aria-hidden="true">
      <div className="arcv-sheet-art">
        <span className="arcv-sheet-art__line" />
        <span className="arcv-sheet-art__line arcv-sheet-art__line--short" />
        {SECTIONS.map((section) => (
          <span key={section.id} className={`arcv-sheet-art__tab arcv-accent--${section.color}`}>
            <Shape shape={section.shape} size={12} />
          </span>
        ))}
        <span className="arcv-sheet-art__scan" />
      </div>
    </div>

    <div className="arcv-welcome__copy">
      <p className="arcv-kicker">Ronald Herrera — Producto, diseño & front-end</p>
      <h1 id="arcv-welcome-title" className="arcv-display">
        Este CV no termina <span className="arcv-outline">en el</span>{' '}
        <span className="arcv-highlight--blue">papel.</span>
      </h1>
      <p className="arcv-lead">Apunta hacia él para descubrir qué hay detrás.</p>
    </div>

    <div className="arcv-welcome__actions">
      <button type="button" className="arcv-btn arcv-btn--primary arcv-btn--xl" onClick={onStart}>
        <Icon name="camera" size={20} />
        <span className="arcv-btn__label">Activar experiencia</span>
      </button>
      <p className="arcv-help">Necesitaremos acceso a la cámara. No se guardará ninguna imagen.</p>
      <button type="button" className="arcv-btn arcv-btn--secondary arcv-btn--xl" onClick={onExplore}>
        <Icon name="grid" size={18} />
        <span className="arcv-btn__label">Explorar sin cámara</span>
      </button>
    </div>

    <p className="arcv-privacy">
      <Icon name="lock" size={16} />
      <span>La cámara se procesa en tu dispositivo. No se graban ni se envían imágenes.</span>
    </p>
  </main>
);

export default WelcomeScreen;

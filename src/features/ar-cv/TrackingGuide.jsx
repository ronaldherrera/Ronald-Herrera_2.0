import Icon from './Icons';

const LOADING_TEXT = {
  permission: 'Esperando permiso de cámara…',
  loading: 'Preparando la experiencia…',
  starting: 'Iniciando la cámara…',
  initializing: 'Preparando el reconocimiento…',
};

// Capa de interfaz sobre la cámara. Solo sus botones capturan toques; el resto
// deja pasar la interacción a las tarjetas de la escena.
const TrackingGuide = ({ phase, progress, slow, lost, tapHint, onClose, onSwitchToWeb }) => {
  const loading = phase in LOADING_TEXT;
  const scanning = phase === 'scanning' || phase === 'tracking' || phase === 'lost';
  const percent = Math.round(progress * 100);

  return (
    <div className="arcv-hud">
      <div className="arcv-hud__top">
        <button type="button" className="arcv-icon-btn arcv-icon-btn--float" onClick={onClose} aria-label="Cerrar la experiencia">
          <Icon name="close" size={22} />
        </button>
        <button type="button" className="arcv-chip" onClick={onSwitchToWeb} aria-label="Cambiar a la versión sin cámara">
          <Icon name="grid" size={18} />
          <span>Sin cámara</span>
        </button>
      </div>

      {loading && (
        <div className="arcv-loader" role="status" aria-live="polite">
          <span className="arcv-spinner" aria-hidden="true" />
          <p className="arcv-loader__text">{LOADING_TEXT[phase]}</p>
          {phase !== 'permission' && (
            <>
              <div
                className="arcv-progress"
                role="progressbar"
                aria-label="Progreso de carga"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
              >
                <span style={{ transform: `scaleX(${progress})` }} />
              </div>
              <p className="arcv-loader__percent">{percent}%</p>
            </>
          )}
          <p className="arcv-loader__privacy">
            La cámara se procesa en tu dispositivo. No se graban ni se envían imágenes.
          </p>
        </div>
      )}

      {scanning && (
        <div className={`arcv-scan ${phase === 'scanning' ? '' : 'is-hidden'}`} aria-hidden={phase !== 'scanning'}>
          <div className="arcv-scan__frame">
            <span /><span /><span /><span />
          </div>
          <div className="arcv-scan__msg" role="status">
            <h2>Apunta la cámara hacia el CV</h2>
            <p>Procura que la hoja completa aparezca dentro del encuadre, con algo de espacio alrededor.</p>
            {slow && (
              <p className="arcv-scan__tip">
                ¿No lo detecta? Busca buena luz, deja la hoja plana y aléjate un poco.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="arcv-hud__bottom" aria-live="polite">
        {lost && <p className="arcv-pill">Vuelve a enfocar el CV</p>}
        {!lost && tapHint && <p className="arcv-pill">Aléjate para verlo todo · Desliza los proyectos</p>}
      </div>
    </div>
  );
};

export default TrackingGuide;

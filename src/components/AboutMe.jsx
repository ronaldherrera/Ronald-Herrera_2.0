import { Link } from 'react-router-dom';
import './AboutMe.css';
import myPhoto from '../assets/yo con mi moto.png';

const AboutMe = () => {
  return (
    <section className="about section-padding" id="sobre-mi">
      <div className="container">
        <div className="about-grid">
          
          <div className="about-image-wrapper">
            <div className="about-image-container">
              <img 
                src={myPhoto} 
                alt="Ronald Herrera con su moto" 
                className="about-image"
              />
              <div className="about-badge">
                <span className="badge-title">RONALD HERRERA</span>
                <span className="badge-subtitle">Busco la simplicidad funcional en cada proceso, servicio o producto digital.</span>
              </div>
            </div>
          </div>
          
          <div className="about-text-wrapper">
            <h2 className="about-title">
              Perfil <span className="text-highlight-red">Evolutivo.</span>
            </h2>
            
            <div className="about-content">
              <p>
                Mi recorrido es una transición natural desde el <span className="text-bold">diseño gráfico</span>, explorando hacia el mundo digital, donde encontré el verdadero poder de crear en ecosistemas complejos.
              </p>
              <p>
                Como diseñador <span className="text-highlight-blue">UX/UI y Front-end</span> busco conectarlo creativamente con la analítica. No me conformo con interfaces bonitas, me obsesiona la lógica detrás de cada dato y lograr eficiencias con bases funcionales.
              </p>
              <p>
                Me muevo por la <span className="text-highlight-gold">curiosidad</span> y sigo el Diseño participando o formándome en metodologías ágiles (Agile) como UX Research, Metodologías Lean UX, Desarrollo Front-end entre otros.
              </p>
            </div>

            <div className="skills-cta-wrapper">
              <Link to="/skills" className="btn-skills-lab">
                <span className="btn-label">EXPLORAR SKILLS</span>
                <span className="btn-icon">→</span>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default AboutMe;

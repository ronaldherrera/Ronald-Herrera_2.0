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
                Mi recorrido es una evolución constante desde el <span className="text-bold">diseño visual</span> hacia la construcción de ecosistemas digitales completos.
              </p>
              <p>
                Como <span className="text-highlight-blue">UX/UI & Front-end</span>, mi motivación no es solo hacer que las cosas se vean bien, sino hacer que <span className="text-bold">funcionen mejor</span>. Me obsesiona la lógica detrás de la interfaz, la eficiencia y crear soluciones tangibles.
              </p>
              <p>
                Me mueve la <span className="text-highlight-gold">curiosidad</span> por entender cómo están construidas las herramientas que usamos. Aprender continuamente es parte de mi método para construir productos útiles y con sentido.
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

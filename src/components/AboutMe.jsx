import { Link } from 'react-router-dom';
import './AboutMe.css';
import myPhoto from '../assets/yo-con-mi-moto.webp';

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
                <span className="badge-subtitle">Santander. Diseñador desde 2016, desarrollador desde 2022.</span>
              </div>
            </div>
          </div>
          
          <div className="about-text-wrapper">
            <h2 className="about-title">
              Del diseño <span className="text-highlight-red">al código.</span>
            </h2>

            <div className="about-content">
              <p>
                Empecé en 2016 como <span className="text-bold">diseñador gráfico y web</span>: marcas, carteles y escenarios en 3D. Cuanto más diseñaba, más quería que aquello funcionara de verdad, así que en 2022 hice el bootcamp full stack de Hack a Boss, y en 2023 me formé en <span className="text-highlight-blue">UX/UI</span> en Coderhouse, que puse en práctica como diseñador UX/UI en Neonexus.
              </p>
              <p>
                Hoy hago las dos cosas en el mismo proyecto: pienso el producto, diseño la marca y la interfaz, modelo la base de datos, programo y lo publico. Así he sacado adelante Fycheo, Tankily, Protop y eSolar Cantabria, <span className="text-bold">yo solo y de principio a fin</span>.
              </p>
              <p>
                Busco un equipo en remoto donde aportar esa mezcla y seguir <span className="text-highlight-gold">aprendiendo</span> de gente que sabe más que yo.
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

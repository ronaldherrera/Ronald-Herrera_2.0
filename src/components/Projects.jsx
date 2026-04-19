import React from 'react';
import './Projects.css';

const projects = [
  {
    title: 'SNAPSTORE',
    category: 'DEVELOPER TOOL',
    colorClass: 'color-gold',
    problem: 'Descargar imágenes, recursos y archivos de producto desde múltiples fuentes requiere tiempo, esfuerzo manual y herramientas externas dispersas.',
    solution: 'Herramienta de escritorio que automatiza la captura y descarga masiva de activos desde cualquier web, con un monitor de progreso en tiempo real.',
    role: 'Full Stack Developer',
    value: 'Reducción de horas de trabajo manual a segundos. Escalable y adaptable a cualquier e-commerce o plataforma de contenidos.',
    imageRight: true,
    image: '/presentacion/Snapstore/assets/portada.png',
    link: '/presentacion/Snapstore/index.html'
  },
  {
    title: 'LÁMPARA PARA ACUARIO',
    category: 'IOT / HARDWARE',
    colorClass: 'color-blue',
    problem: 'El control de iluminación LED en acuarios requería ajustes manuales constantes o firmware propietario costoso y sin personalización.',
    solution: 'Sistema de control LED basado en ESP32 con interfaz web en tiempo real que permite programar ciclos de luz personalizados para cada especie.',
    role: 'Full Stack Developer / Hardware Engineer',
    value: 'Control total del ecosistema lumínico desde cualquier dispositivo, con ciclos automáticos que mejoran el bienestar de los animales.',
    imageRight: false,
    image: '/presentacion/aquarium-led/assets/lampara encendida.JPG',
    link: '/presentacion/aquarium-led/index.html'
  },
  {
    title: 'SOCIAL ACUARIOFILIA',
    category: 'PRODUCT DESIGN',
    colorClass: 'color-red',
    problem: 'Las comunidades de acuaristas estaban dispersas en foros antiguos con una experiencia de uso deficiente en móvil.',
    solution: 'Plataforma moderna, visual e intuitiva donde los usuarios pueden compartir sus acuarios y recibir ayuda.',
    role: 'UX / Frontend Developer & UI Designer',
    value: 'Adopción de un espacio dedicado seguro, alta retención de usuarios gracias a una UI limpia y componentes sociales.',
    imageRight: true
  }
];

const Projects = () => {
  return (
    <section className="projects section-padding" id="proyectos">
      <div className="container">
        <h2 className="projects-header-title">Proyectos Destacados</h2>
        <div className="projects-header-subtitle">UNA BREVE SELECCIÓN DE TRABAJO, DEL LADO FUNCIONAL AL VISUAL.</div>
        
        <div className="projects-list">
          {projects.map((project, index) => (
            <article key={index} className={`project-card ${project.imageRight ? 'img-right' : 'img-left'}`}>
              
              <div className="project-image-container">
                {project.image ? (
                  <img
                    src={project.image}
                    alt={project.title}
                    className="project-real-image"
                  />
                ) : (
                  <div className={`project-image-placeholder bg-${project.colorClass.replace('color-', '')}`}>
                    <div className="technical-mark">0{index + 1}</div>
                  </div>
                )}
              </div>

              <div className="project-content">
                <div className="project-category">{project.category}</div>
                <h3 className={`project-title ${project.colorClass}`}>{project.title}</h3>
                
                <div className="project-grid">
                  <div className="project-grid-item">
                    <h4>EL PROBLEMA</h4>
                    <p>{project.problem}</p>
                  </div>
                  <div className="project-grid-item">
                    <h4>LA SOLUCIÓN</h4>
                    <p>{project.solution}</p>
                  </div>
                  <div className="project-grid-item">
                    <h4>ROL</h4>
                    <p>{project.role}</p>
                  </div>
                  <div className="project-grid-item">
                    <h4>VALOR</h4>
                    <p>{project.value}</p>
                  </div>
                </div>

                {project.link && (
                  <a href={project.link} className="project-link-btn" target="_blank" rel="noopener noreferrer">
                    <span>Ver Proyecto</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 17L17 7M17 7H7M17 7V17"/>
                    </svg>
                  </a>
                )}
              </div>
              
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Projects;

import React from 'react';
import './Projects.css';

const projects = [
  {
    title: 'TANKILY',
    category: 'RED SOCIAL · PRODUCTO EN PRODUCCIÓN',
    colorClass: 'color-blue',
    problem: 'Los acuaristas apuntan sus mediciones en libretas, preguntan en foros envejecidos y compran peces sin saber si podrán convivir en su acuario.',
    solution: 'Una red social en 8 idiomas que gira alrededor del tanque: parámetros del agua, habitantes, diario y recordatorios, con foro, mercado, tiendas y WikiTank, una enciclopedia de 1.847 especies.',
    role: 'Producto, marca, diseño y desarrollo',
    value: 'Motor de compatibilidad entre especies, más de 16.000 páginas indexables generadas con Next.js, Supabase con RLS en todas las tablas y plan Pro con Stripe.',
    imageRight: false,
    image: '/presentacion/tankily/assets/portada.webp',
    link: '/presentacion/tankily/index.html'
  },
  {
    title: 'FYCHEO',
    category: 'ECOSISTEMA B2B SAAS',
    colorClass: 'color-red',
    problem: 'El registro de jornada y control de turnos en las empresas suele ser complejo, ineficiente para el departamento de RR.HH. y tedioso para el empleado.',
    solution: 'Un ecosistema multiplataforma (web, móvil, kiosko y panel maestro) sincronizado en tiempo real con Supabase, con recordatorios y tips de productividad para empleados y Wallet de pago.',
    role: 'Producto, diseño y desarrollo',
    value: 'Automatización completa de saldos horarios de plantilla mediante PostgreSQL Triggers, reparto masivo de nóminas a cada empleado y pasarela de cobros segura integrada con Stripe.',
    imageRight: true,
    image: '/presentacion/fycheo/assets/portada.webp',
    link: '/presentacion/fycheo/index.html'
  },
  {
    title: 'PROTOP',
    category: 'DIRECTORIO · PRODUCTO EN PRODUCCIÓN',
    colorClass: 'color-gold',
    problem: 'En Obramat, donde trabajo, hay un tablón de corcho en el que los profesionales de reformas clavan su tarjeta. Funciona, pero solo lo ve quien pasa por la tienda, y nadie sabe si ese profesional trabaja bien.',
    solution: 'Protop lleva ese tablón a internet: 1.219 profesionales de toda España, con fichas por oficio y localidad, solicitudes de presupuesto que solo llegan a quien encaja y valoraciones respaldadas por factura.',
    role: 'Producto, diseño y desarrollo',
    value: 'React 19 y TypeScript sobre Supabase, con las reglas de acceso en la base de datos (RLS), facturas en almacenamiento privado con enlaces que caducan y unas 1.600 páginas prerenderizadas para SEO.',
    imageRight: false,
    image: '/presentacion/protop/assets/portada.webp',
    link: '/presentacion/protop/index.html'
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
            <article 
              key={index} 
              className={`project-card ${project.imageRight ? 'img-right' : 'img-left'}`}
              style={{
                '--project-color': project.colorClass === 'color-red' ? 'var(--color-accent-red)' :
                                   project.colorClass === 'color-blue' ? 'var(--color-accent-blue)' :
                                   project.colorClass === 'color-gold' ? 'var(--color-accent-gold)' : 'var(--color-text)'
              }}
            >
              
              <div className="project-image-col">
                <div className="project-category">{project.category}</div>
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
                {project.link && (
                  <a href={project.link} className="project-link-btn" target="_blank" rel="noopener noreferrer">
                    <span>Ver Proyecto</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 17L17 7M17 7H7M17 7V17"/>
                    </svg>
                  </a>
                )}
              </div>

              <div className="project-content">
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
              </div>
              
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Projects;

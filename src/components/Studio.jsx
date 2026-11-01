import './Studio.css';

const Studio = () => {
  return (
    <section className="studio section-padding" id="studio">
      <div className="container">
        <div className="studio-grid">

          <div className="studio-text">
            <h2 className="studio-title">
              También hago webs para <em>negocios</em>.
            </h2>
            <p>
              En <span className="text-bold">ronaldherrera.studio</span> diseño, programo y posiciono webs y herramientas a medida para pymes de toda España. Es mi propio estudio y, a la vez, otro producto que mantengo en producción.
            </p>
            <ul className="studio-puntos">
              <li><b>Next.js + Supabase</b> exportado en estático y desplegado con GitHub Actions.</li>
              <li><b>Más de 40 páginas para Google:</b> sectores, servicios y guías, con datos estructurados.</li>
              <li><b>DeD</b>, un asistente con IA que sigue lo que lee el visitante y le ayuda a pedir presupuesto.</li>
            </ul>
            <a
              href="https://ronaldherrera.studio"
              className="studio-boton"
              target="_blank"
              rel="noopener noreferrer"
            >
              VISITAR EL ESTUDIO <span aria-hidden="true">↗</span>
            </a>
          </div>

          <a
            href="https://ronaldherrera.studio"
            className="studio-captura"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir ronaldherrera.studio"
          >
            <span className="studio-barra" aria-hidden="true">
              <i></i><i></i><i></i>
              <span>ronaldherrera.studio</span>
            </span>
            <img
              src="/proyectos/studio/portada.webp"
              alt="Portada de ronaldherrera.studio: webs que trabajan para tu negocio"
              loading="lazy"
              width="1280"
              height="800"
            />
          </a>

        </div>
      </div>
    </section>
  );
};

export default Studio;

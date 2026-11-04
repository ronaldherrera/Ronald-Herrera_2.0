import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './PrivacidadPage.css';

const PrivacidadPage = () => {
  useEffect(() => { document.title = 'Privacidad | Ronald Herrera'; }, []);

  return (
    <div className="privacidad-page">
      <article className="privacidad container">
        <h1>Privacidad</h1>
        <p>
          Esta web es el portfolio personal de Ronald Herrera (Santander, España). Aquí te cuento qué datos se recogen,
          para qué y cómo puedes pedir que se borren. Para cualquier cosa, escríbeme a{' '}
          <a href="mailto:hola@ronaldherrera.es">hola@ronaldherrera.es</a>.
        </p>

        <h2>Formulario de contacto</h2>
        <p>
          Tu nombre, tu email y tu mensaje me llegan por correo para poder responderte. No se guardan en ninguna base de
          datos ni se usan para nada más.
        </p>

        <h2>Chat con mi versión IA</h2>
        <p>
          El chat es una inteligencia artificial entrenada con mi CV y mis proyectos; no soy yo escribiendo en directo.
          Para generar las respuestas, tus mensajes se envían a Anthropic (el proveedor del modelo Claude), que no los usa
          para entrenar sus modelos.
        </p>
        <p>
          Cada conversación se guarda en el servidor de esta web durante un máximo de 30 días y me llega una copia por
          correo, para poder leer qué te interesa y mejorar el chat. Si en el chat das tu nombre, empresa y un email o
          teléfono para que te contacte, también me llegan por correo y los uso solo para responderte.
        </p>
        <p>No compartas en el chat datos sensibles (salud, documentos de identidad, contraseñas o datos bancarios).</p>

        <h2>Ranking del juego de skills</h2>
        <p>
          Si guardas un récord en <Link to="/skills">el juego</Link>, se publica el nombre que escribas, tu tiempo, la fecha
          y, si lo pones, tu perfil de LinkedIn. Para controlar las partidas se guarda una huella cifrada de tu IP durante
          unas horas.
        </p>

        <h2>Analítica</h2>
        <p>
          Uso Google Analytics para saber cuántas personas visitan la web y qué páginas leen. Google puede usar cookies
          para ello.
        </p>

        <h2>Tus derechos</h2>
        <p>
          Puedes pedirme acceder a tus datos, corregirlos o borrarlos (por ejemplo, una conversación del chat o un récord
          del ranking) escribiendo a <a href="mailto:hola@ronaldherrera.es">hola@ronaldherrera.es</a>. Si crees que no los
          he tratado bien, puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">aepd.es</a>).
        </p>

        <p className="privacidad-fecha">Actualizado el 1 de noviembre de 2026.</p>
      </article>
    </div>
  );
};

export default PrivacidadPage;

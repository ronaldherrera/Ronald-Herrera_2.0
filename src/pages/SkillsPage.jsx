import { Link } from 'react-router-dom';
import Despliegue from '../components/Despliegue';

const SkillsPage = () => {
  return (
    <div className="skills-page-wrapper">
      <Link to="/" className="btn-back-home">
        <span className="back-icon">←</span>
        <span className="back-label">SALIR</span>
      </Link>
      <Despliegue />
    </div>
  );
};

export default SkillsPage;

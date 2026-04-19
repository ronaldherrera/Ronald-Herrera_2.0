import { Link } from 'react-router-dom';
import Skills from '../components/Skills';

const SkillsPage = () => {
  return (
    <div className="skills-page-wrapper">
      <Link to="/" className="btn-back-home">
        <span className="back-icon">←</span>
        <span className="back-label">SALIR</span>
      </Link>
      <Skills />
    </div>
  );
};

export default SkillsPage;

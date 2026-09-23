import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import CustomScrollbar from './components/CustomScrollbar';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import SkillsPage from './pages/SkillsPage';
import LabPage from './pages/LabPage';
import ContactPage from './pages/ContactPage';
import LabScrollbar from './components/LabScrollbar';
import Footer from './components/Footer';

// Experiencia AR del CV impreso: se carga solo al visitar /cv o /ar-cv.
const ARExperience = lazy(() => import('./features/ar-cv/ARExperience'));
const AR_CV_PATHS = ['/cv', '/ar-cv'];

// Componente para manejar la visibilidad condicional de elementos comunes
const AppContent = () => {
  const location = useLocation();
  const isSkillsPage = location.pathname === '/skills';
  const isLabPage = location.pathname === '/lab';
  const isContactPage = location.pathname === '/contacto';
  const isArCvPage = AR_CV_PATHS.includes(location.pathname.replace(/\/+$/, '') || '/');
  const hideUiElements = isSkillsPage || isArCvPage;

  return (
    <>
      {!hideUiElements && !isLabPage && !isContactPage && <CustomScrollbar />}
      {(isLabPage || isContactPage) && <LabScrollbar />}
      {!hideUiElements && <Navbar />}
      <Routes>
        <Route path="/" element={<><Home /><Footer /></>} />
        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/lab" element={<LabPage />} />
        <Route path="/contacto" element={<ContactPage />} />
        {AR_CV_PATHS.map((path) => (
          <Route
            key={path}
            path={path}
            element={<Suspense fallback={<div style={{ minHeight: '100dvh', background: '#101010' }} />}><ARExperience /></Suspense>}
          />
        ))}
      </Routes>
    </>
  );
};

function App() {
  return (
    <Router>
      <Layout>
        <AppContent />
      </Layout>
    </Router>
  );
}

export default App;

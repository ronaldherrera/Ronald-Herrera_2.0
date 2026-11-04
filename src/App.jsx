import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import CustomScrollbar from './components/CustomScrollbar';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import SkillsPage from './pages/SkillsPage';
import LabPage from './pages/LabPage';
import ContactPage from './pages/ContactPage';
import LabScrollbar from './components/LabScrollbar';
import Footer from './components/Footer';
import BotonClon from './components/clon/BotonClon';
import PrivacidadPage from './pages/PrivacidadPage';

// Experiencia AR del CV impreso: se carga solo al visitar /cv o /ar-cv.
const ARExperience = lazy(() => import('./features/ar-cv/ARExperience'));
// Panel del clon, solo para Ronald (con contraseña en la web; incluye el banco de pruebas del avatar)
const AvatarAdmin = lazy(() => import('./pages/AvatarAdmin'));
const AR_CV_PATHS = ['/cv', '/ar-cv'];

// Componente para manejar la visibilidad condicional de elementos comunes
const AppContent = () => {
  const location = useLocation();
  const isSkillsPage = location.pathname === '/skills';
  const isLabPage = location.pathname === '/lab';
  const isContactPage = location.pathname === '/contacto';
  const isArCvPage = AR_CV_PATHS.includes(location.pathname.replace(/\/+$/, '') || '/');
  // El panel del clon va solo, sin menú, barra ni botón del clon
  const isPanelClon = location.pathname === '/avatar-admin' || location.pathname === '/avatar-prueba';
  const hideUiElements = isSkillsPage || isArCvPage || isPanelClon;

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
        <Route path="/privacidad" element={<PrivacidadPage />} />
        <Route path="/avatar-admin" element={<Suspense fallback={null}><AvatarAdmin /></Suspense>} />
        <Route path="/avatar-prueba" element={<Navigate to="/avatar-admin" replace />} />
        {AR_CV_PATHS.map((path) => (
          <Route
            key={path}
            path={path}
            element={<Suspense fallback={<div style={{ minHeight: '100dvh', background: '#101010' }} />}><ARExperience /></Suspense>}
          />
        ))}
      </Routes>
      {/* La versión IA de Ronald, en todas las páginas menos el juego de skills y el CV en realidad aumentada */}
      {/* En el juego de skills también, salvo mientras se juega (se esconde solo) */}
      {(!hideUiElements || isSkillsPage) && <BotonClon />}
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

import ProjectsPanel from './ProjectsPanel';
import LabPanel from './LabPanel';
import AboutPanel from './AboutPanel';
import ContactPanel from './ContactPanel';

// Mismo contenido para el panel inferior (AR) y para la versión sin cámara.
export const PANELS = {
  projects: { title: 'Proyectos', Component: ProjectsPanel },
  lab: { title: 'Ronald Lab', Component: LabPanel },
  about: { title: 'Sobre mí', Component: AboutPanel },
  contact: { title: 'Hablemos', Component: ContactPanel },
};

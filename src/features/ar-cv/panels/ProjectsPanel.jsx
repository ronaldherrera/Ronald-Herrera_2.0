import { FEATURED_PROJECTS } from '../arCvData';
import ActionLink from './ActionLink';
import { useFocusItem } from './useFocusItem';

const actionIcon = (label) => (/vídeo|funcionamiento/i.test(label) ? 'play' : 'arrow');

const ProjectsPanel = ({ focusId }) => {
  const listRef = useFocusItem(focusId);
  return (
    <div className="arcv-panel">
      <p className="arcv-panel__intro">No son solo diseños. Son soluciones a problemas reales.</p>
      <ul className="arcv-projects" ref={listRef}>
        {FEATURED_PROJECTS.map((project, index) => {
          const actions = project.actions.filter((action) => action.href);
          return (
            <li
              key={project.id}
              data-item={project.id}
              className={`arcv-project arcv-accent--${project.accent} ${project.id === focusId ? 'is-focus' : ''}`}
            >
              {project.image ? (
                <img
                  className="arcv-project__media"
                  src={project.image}
                  alt=""
                  width="640"
                  height="400"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="arcv-project__band" aria-hidden="true">
                  <span>{String(index + 1).padStart(2, '0')} / {String(FEATURED_PROJECTS.length).padStart(2, '0')}</span>
                  <span className="arcv-project__band-name">{project.name}</span>
                </div>
              )}
              <div className="arcv-project__body">
                <h3 className="arcv-project__title">{project.name}</h3>
                <p className="arcv-project__desc">{project.description}</p>
                <ul className="arcv-tags" aria-label={`Tecnologías de ${project.name}`}>
                  {project.tags.map((tag) => (
                    <li key={tag} className="arcv-tag">{tag}</li>
                  ))}
                </ul>
                {actions.length > 0 && (
                  <div className="arcv-actions">
                    {actions.map((action, index) => (
                      <ActionLink
                        key={action.label}
                        href={action.href}
                        icon={actionIcon(action.label)}
                        variant={index === 0 ? 'primary' : 'secondary'}
                        event="ar_cv_project_open"
                        eventParams={{ project: project.id, action: action.label }}
                      >
                        {action.label}
                      </ActionLink>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ProjectsPanel;

import { LAB_PROJECTS } from '../arCvData';
import ActionLink from './ActionLink';
import { useFocusItem } from './useFocusItem';

const LabPanel = ({ focusId }) => {
  const listRef = useFocusItem(focusId);
  return (
    <div className="arcv-panel">
      <p className="arcv-panel__intro">Productos propios y experimentos en construcción.</p>
      <ul className="arcv-lab" ref={listRef}>
        {LAB_PROJECTS.map((item) => (
          <li key={item.id} data-item={item.id} className={`arcv-lab__card ${item.id === focusId ? 'is-focus' : ''}`}>
            {item.image && (
              <img
                className="arcv-lab__media"
                src={item.image}
                alt=""
                width="640"
                height="400"
                loading="lazy"
                decoding="async"
              />
            )}
            <div className="arcv-lab__body">
              <div className="arcv-lab__meta">
                <span className="arcv-lab__category">{item.category}</span>
                {item.status && <span className="arcv-badge">Estado: {item.status}</span>}
              </div>
              <h3 className="arcv-lab__title">{item.name}</h3>
              <p className="arcv-lab__desc">{item.description}</p>
              <ul className="arcv-tags" aria-label={`Tecnologías de ${item.name}`}>
                {item.tags.map((tag) => (
                  <li key={tag} className="arcv-tag">{tag}</li>
                ))}
              </ul>
              <ActionLink
                href={item.href}
                event="ar_cv_project_open"
                eventParams={{ project: item.id, action: 'lab' }}
                ariaLabel={`Ver proyecto ${item.name}`}
              >
                Ver proyecto
              </ActionLink>
            </div>
          </li>
        ))}
      </ul>
      <div className="arcv-actions arcv-actions--center">
        <ActionLink href="/lab" variant="primary" event="ar_cv_project_open" eventParams={{ project: 'lab' }}>
          Ver todo en The Lab
        </ActionLink>
      </div>
    </div>
  );
};

export default LabPanel;

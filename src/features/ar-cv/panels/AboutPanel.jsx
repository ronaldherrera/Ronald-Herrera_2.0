import { ABOUT } from '../arCvData';
import ActionLink from './ActionLink';

const ICONS = { web: 'globe', cv: 'download', experience: 'arrow', path: 'arrow' };

const AboutPanel = () => (
  <div className="arcv-panel">
    <h3 className="arcv-about__title">{ABOUT.title}</h3>
    <p className="arcv-about__intro">{ABOUT.intro}</p>
    <blockquote className="arcv-quote">
      <p>“{ABOUT.thought}”</p>
    </blockquote>
    <div className="arcv-actions arcv-actions--grid">
      {ABOUT.actions.map((action, index) => (
        <ActionLink
          key={action.id}
          href={action.href}
          icon={ICONS[action.id]}
          download={action.download}
          variant={index === 0 ? 'primary' : 'secondary'}
          event="ar_cv_about_action"
          eventParams={{ action: action.id }}
        >
          {action.label}
        </ActionLink>
      ))}
    </div>
  </div>
);

export default AboutPanel;

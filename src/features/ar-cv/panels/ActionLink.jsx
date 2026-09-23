import Icon from '../Icons';
import { trackArEvent } from '../analytics';

const isSameTabScheme = (href) => /^(tel:|mailto:)/.test(href);

// Enlace con aspecto de botón. Las páginas se abren en otra pestaña para no
// interrumpir la experiencia AR (y liberar la cámara) al volver.
const ActionLink = ({
  href,
  children,
  icon = 'arrow',
  variant = 'secondary',
  download = false,
  event,
  eventParams,
  className = '',
  ariaLabel,
}) => {
  if (!href) return null;
  const newTab = !download && !isSameTabScheme(href);
  return (
    <a
      href={href}
      className={`arcv-btn arcv-btn--${variant} ${className}`.trim()}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
      download={download ? '' : undefined}
      aria-label={ariaLabel}
      onClick={() => event && trackArEvent(event, eventParams)}
    >
      <span className="arcv-btn__label">{children}</span>
      <Icon name={icon} size={18} />
    </a>
  );
};

export default ActionLink;

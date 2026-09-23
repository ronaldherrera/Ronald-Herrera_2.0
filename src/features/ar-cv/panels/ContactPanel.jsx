import { CONTACT, SOCIAL_LINKS } from '../arCvData';
import Icon from '../Icons';
import { trackArEvent } from '../analytics';

const ContactButton = ({ href, icon, title, detail, channel, download, color }) => {
  const external = /^https?:/.test(href);
  return (
    <a
      className={`arcv-contact__btn arcv-accent--${color}`}
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      download={download ? 'ronald-herrera.vcf' : undefined}
      onClick={() => trackArEvent('ar_cv_contact', { channel })}
    >
      <span className="arcv-contact__icon">
        <Icon name={icon} size={22} />
      </span>
      <span className="arcv-contact__text">
        <span className="arcv-contact__title">{title}</span>
        {detail && <span className="arcv-contact__detail">{detail}</span>}
      </span>
    </a>
  );
};

const SOCIAL_ICONS = { linkedin: 'linkedin', github: 'github', behance: 'link' };

const ContactPanel = () => (
  <div className="arcv-panel">
    <p className="arcv-panel__intro">¿Hablamos de tu próximo producto?</p>
    <div className="arcv-contact">
      <ContactButton href={CONTACT.phoneHref} icon="phone" title="Llamar" detail={CONTACT.phoneDisplay} channel="phone" color="coral" />
      <ContactButton href={CONTACT.whatsappHref} icon="chat" title="Escribir por WhatsApp" detail={CONTACT.phoneDisplay} channel="whatsapp" color="blue" />
      <ContactButton href={CONTACT.emailHref} icon="mail" title="Enviar correo" detail={CONTACT.email} channel="email" color="gold" />
      <ContactButton href={CONTACT.vcard} icon="contact" title="Guardar contacto" detail="Tarjeta vCard" channel="vcard" download color="cream" />
    </div>

    <h3 className="arcv-subheading">Redes y web</h3>
    <div className="arcv-social">
      {SOCIAL_LINKS.map((social) => (
        <a
          key={social.id}
          className="arcv-btn arcv-btn--secondary"
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackArEvent('ar_cv_contact', { channel: social.id })}
        >
          <Icon name={SOCIAL_ICONS[social.id] || 'link'} size={18} />
          <span className="arcv-btn__label">{social.label}</span>
        </a>
      ))}
      <a
        className="arcv-btn arcv-btn--primary"
        href={CONTACT.web}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackArEvent('ar_cv_contact', { channel: 'web' })}
      >
        <Icon name="globe" size={18} />
        <span className="arcv-btn__label">Visitar {CONTACT.webDisplay}</span>
      </a>
    </div>
  </div>
);

export default ContactPanel;

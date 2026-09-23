import { useEffect } from 'react';

// Aplica título, descripción, Open Graph, canonical y theme-color mientras la
// ruta está montada y restaura los valores previos al salir.
const upsert = (selector, create) => {
  let el = document.head.querySelector(selector);
  const existed = Boolean(el);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return { el, existed };
};

const metaTag = (attr, key) => () => {
  const el = document.createElement('meta');
  el.setAttribute(attr, key);
  return el;
};

export const usePageMeta = ({ title, description, canonical, image, themeColor }) => {
  useEffect(() => {
    const restorers = [];
    const setAttr = (selector, create, attr, value) => {
      const { el, existed } = upsert(selector, create);
      const previous = el.getAttribute(attr);
      el.setAttribute(attr, value);
      restorers.push(() => {
        if (existed) {
          if (previous === null) el.removeAttribute(attr);
          else el.setAttribute(attr, previous);
        } else {
          el.remove();
        }
      });
    };

    const previousTitle = document.title;
    document.title = title;
    restorers.push(() => { document.title = previousTitle; });

    const metas = [
      ['name', 'description', description],
      ['name', 'theme-color', themeColor],
      ['property', 'og:type', 'website'],
      ['property', 'og:title', title],
      ['property', 'og:description', description],
      ['property', 'og:url', canonical],
      ['property', 'og:image', image],
      ['name', 'twitter:card', 'summary_large_image'],
    ];
    metas.forEach(([attr, key, value]) => {
      setAttr(`meta[${attr}="${key}"]`, metaTag(attr, key), 'content', value);
    });

    setAttr('link[rel="canonical"]', () => {
      const el = document.createElement('link');
      el.setAttribute('rel', 'canonical');
      return el;
    }, 'href', canonical);

    return () => restorers.reverse().forEach((restore) => restore());
  }, [title, description, canonical, image, themeColor]);
};

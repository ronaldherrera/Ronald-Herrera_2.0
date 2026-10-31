// Configuración central de la experiencia AR del CV (/cv y /ar-cv).
// Todos los textos, enlaces y recursos se editan aquí. Un enlace con valor
// `null` oculta automáticamente su botón (no se muestran acciones vacías).

const AR_BASE = '/AR-CV';

export const PAGE_META = {
  title: 'CV interactivo de Ronald Herrera | Desarrollador full-stack de producto',
  description:
    'Explora el currículum interactivo de Ronald Herrera, desarrollador full-stack de producto: Fycheo, Tankily, Protop y otros productos llevados a producción con React, Next.js, Supabase y React Native.',
  canonical: 'https://ronaldherrera.es/cv',
  image: `https://ronaldherrera.es${AR_BASE}/og-cv.jpg`,
  themeColor: '#101010',
};

// Recursos del reconocimiento de imagen.
// `cv-target.png`: exportación exacta del CV definitivo (sin perspectiva ni márgenes).
// `targets.mind`: compilado a partir de esa imagen con el compilador oficial de MindAR.
export const AR_TARGET = {
  image: `${AR_BASE}/cv-target.png`,
  mind: `${AR_BASE}/targets.mind`,
  // Proporción alto/ancho de reserva (A4). En ejecución se sustituye por la real del target.
  fallbackAspect: 297 / 210,
};

// Builds oficiales auto-alojados (misma pareja de versiones que documenta MindAR).
// `bytes` = tamaño descomprimido, usado para calcular el progreso real de descarga.
export const AR_ENGINE = [
  { id: 'aframe', src: `${AR_BASE}/vendor/aframe-1.5.0.min.js`, bytes: 1389963 },
  { id: 'mindar', src: `${AR_BASE}/vendor/mindar-image-aframe-1.2.5.prod.js`, bytes: 1758446 },
];

export const CONTACT = {
  name: 'Ronald Herrera',
  role: 'Desarrollador full-stack de producto',
  tagline: 'Construyo productos completos, del diseño a producción.',
  phoneDisplay: '+34 671 987 372',
  phoneHref: 'tel:+34671987372',
  email: 'hola@ronaldherrera.es',
  emailHref: 'mailto:hola@ronaldherrera.es',
  whatsappHref: `https://wa.me/34671987372?text=${encodeURIComponent(
    'Hola Ronald, he visto tu currículum y me gustaría hablar contigo.'
  )}`,
  web: 'https://ronaldherrera.es',
  webDisplay: 'ronaldherrera.es',
  vcard: `${AR_BASE}/ronald-herrera.vcf`,
};

// Redes profesionales.
// - GitHub: cuenta propietaria de este repositorio (remote origin).
// - LinkedIn: confirmado por el propietario (29/10/2026).
// - Behance: perfil «Ronald Herrera, Santander» comprobado el 31/10/2026.
export const SOCIAL_LINKS = [
  { id: 'linkedin', label: 'LinkedIn', href: 'https://linkedin.com/in/ronald-herrera', verified: true },
  { id: 'github', label: 'GitHub', href: 'https://github.com/ronaldherrera', verified: true },
  { id: 'behance', label: 'Behance', href: 'https://behance.net/ronald-herrera', verified: true },
];

// Proyectos destacados (panel «Proyectos»): los mismos tres del CV impreso, en
// el mismo orden y con el mismo color de tarjeta.
export const FEATURED_PROJECTS = [
  {
    id: 'fycheo',
    name: 'Fycheo',
    description:
      'SaaS de control horario: 7 aplicaciones sobre una base de datos Supabase (empleado, panel, quiosco, web y apps móviles), con fichaje geolocalizado, turnos, chat en tiempo real y pagos con Stripe.',
    tags: ['Supabase', 'Expo', 'Stripe'],
    image: `${AR_BASE}/proyectos/fycheo.webp`,
    accent: 'coral',
    actions: [
      { label: 'Ver proyecto', href: '/presentacion/fycheo/index.html' },
      { label: 'Visitar fycheo.es', href: 'https://fycheo.es/' },
    ],
  },
  {
    id: 'tankily',
    name: 'Tankily',
    description:
      'Red social para acuaristas en 8 idiomas, con usuarios reales: diario de cada tanque, motor de compatibilidad entre especies, foro, mercado y WikiTank con 1.847 fichas. Despliegue que no publica si fallan los tests.',
    tags: ['Next.js', 'Supabase', 'i18n'],
    image: `${AR_BASE}/proyectos/tankily.webp`,
    accent: 'gold',
    actions: [
      { label: 'Ver proyecto', href: '/presentacion/tankily/index.html' },
      { label: 'Visitar tankily.com', href: 'https://tankily.com/' },
    ],
  },
  {
    id: 'protop',
    name: 'Protop',
    description:
      'Directorio de 1.219 profesionales de reformas de toda España, con solicitudes de presupuesto y valoraciones respaldadas por factura. Las reglas de acceso viven en la base de datos (RLS).',
    tags: ['React', 'TypeScript', 'SEO'],
    image: `${AR_BASE}/proyectos/protop.webp`,
    accent: 'blue',
    actions: [
      { label: 'Ver proyecto', href: '/presentacion/protop/index.html' },
      { label: 'Visitar protop.es', href: 'https://protop.es/' },
    ],
  },
];

// Ronald Lab: productos propios y experimentos (los destacados ya están en «Proyectos»).
// Flox no tiene todavía textos, imagen ni enlace reales: añádelo aquí con el mismo
// formato cuando los tenga.
export const LAB_PROJECTS = [
  {
    id: 'esolar',
    name: 'eSolar Cantabria',
    category: 'Web de captación / Energía solar',
    description:
      'Web para una red de instaladores: una página por cada uno de los 102 municipios con datos de PVGIS, 6 calculadoras y 25 artículos con fuentes oficiales.',
    status: null,
    tags: ['Astro', 'JavaScript', 'SEO'],
    image: `${AR_BASE}/proyectos/esolar.webp`,
    href: 'https://esolarcantabria.es/',
  },
  {
    id: 'pathrix',
    name: 'Pathrix',
    category: 'Juego móvil / Estrategia',
    description:
      'Juego de estrategia por turnos para iOS y Android, con motor de reglas propio, IA con MCTS en 4 niveles y partidas online.',
    status: null,
    tags: ['React Native', 'Expo', 'Firebase'],
    image: `${AR_BASE}/proyectos/pathrix.webp`,
    href: null,
  },
  {
    id: 'aquarium-led',
    name: 'Lámpara Aquarium LED',
    category: 'Hardware / IoT',
    description: 'Lámpara inteligente personalizada, desde el modelado 3D hasta el control por app.',
    status: null,
    tags: ['ESP32', '3D Model', 'UX'],
    image: `${AR_BASE}/proyectos/aquarium-led.webp`,
    href: '/presentacion/aquarium-led/index.html',
  },
  {
    id: 'protecciones-electricas',
    name: 'Protecciones Eléctricas',
    category: 'Herramienta / Formación',
    description: 'Aplicación interactiva para la formación interna sobre protecciones y cuadros eléctricos.',
    status: null,
    tags: ['HTML5', 'UX/UI', 'Gamificación'],
    image: `${AR_BASE}/proyectos/protecciones-electricas.webp`,
    href: '/presentacion/formacion-protecciones-electricas/index.html',
  },
  {
    id: 'imagym',
    name: 'IMAGYM',
    category: 'UX/UI · Estudio de caso',
    description: 'Rediseño de la app de una cadena de gimnasios: research real, tree testing, sistema de diseño y prototipo.',
    status: null,
    tags: ['Figma', 'UX Research', 'Mobile'],
    image: `${AR_BASE}/proyectos/imagym.webp`,
    href: '/presentacion/Imagym/index.html',
  },
];

export const ABOUT = {
  title: 'Diseño y construyo productos digitales',
  intro:
    'Llevo productos completos a producción: base de datos, seguridad, interfaz, app móvil y despliegue. Vengo de diez años de diseño UX/UI, así que pienso en el usuario y en el negocio, no solo en el código. Busco un puesto en remoto en un equipo de producto.',
  thought:
    'No siempre tengo la respuesta cuando empiezo. Tengo algo que me parece más valioso: la incomodidad de no aceptar que «siempre se ha hecho así» sea una explicación. Observo, pregunto, pruebo y construyo. A veces el resultado es una interfaz; otras, un producto digital o físico. La forma cambia. La intención no: conseguir que las cosas funcionen mejor.',
  actions: [
    { id: 'web', label: 'Visitar mi web', href: 'https://ronaldherrera.es' },
    // Exportación del CV impreso desde Figma.
    { id: 'cv', label: 'Descargar CV', href: `${AR_BASE}/ronald-herrera-cv.pdf`, download: true },
    { id: 'experience', label: 'Ver experiencia', href: '/skills' },
    { id: 'path', label: 'Conocer mi trayectoria', href: '/#sobre-mi' },
  ],
};

// Las cuatro tarjetas flotantes. `color` es el acento (tokens de arCv.css) y
// `shape` la forma geométrica de la sección «Valor» de la web.
export const SECTIONS = [
  { id: 'projects', title: 'Proyectos', hint: 'Tres destacados', color: 'coral', shape: 'circle' },
  { id: 'lab', title: 'Ronald Lab', hint: 'Productos propios', color: 'blue', shape: 'square' },
  { id: 'about', title: 'Sobre mí', hint: 'Cómo trabajo', color: 'gold', shape: 'triangle' },
  { id: 'contact', title: 'Hablemos', hint: 'Contacto y redes', color: 'cream', shape: 'rhombus' },
];

// Colores de la web (src/index.css).
export const PALETTE = {
  bg: '#101010',
  surface: '#111111',
  cream: '#EAE5CA',
  coral: '#ED8E6A',
  blue: '#A7D5F5',
  gold: '#C4AB57',
};

// --------------------------------------------------------------------------
// Escena 3D (modo cámara)
// --------------------------------------------------------------------------

const LAB_ACCENTS = ['blue', 'coral', 'gold', 'cream'];
const socialHref = (id) => SOCIAL_LINKS.find((s) => s.id === id)?.href || null;

// Carrusel: proyectos destacados + Ronald Lab. Al tocar el del centro se abre
// su ficha en el panel correspondiente. El primero es el que se ve al aparecer,
// y los del Lab que ya están entre los destacados no se repiten.
const featuredIds = new Set(FEATURED_PROJECTS.map((p) => p.id));
export const CAROUSEL_ITEMS = [
  ...FEATURED_PROJECTS.map((p) => ({
    id: p.id,
    section: 'projects',
    name: p.name,
    caption: p.tags.join(' · '),
    image: p.image,
    accent: p.accent,
  })),
  ...LAB_PROJECTS.filter((p) => !featuredIds.has(p.id)).map((p, i) => ({
    id: p.id,
    section: 'lab',
    name: p.name,
    caption: p.status ? `${p.category} · ${p.status}` : p.category,
    image: p.image,
    accent: LAB_ACCENTS[i % LAB_ACCENTS.length],
  })),
];

// Sólidos 3D que abren paneles (formas de la sección «Valor»):
// triangle → pirámide, square → cubo, rhombus → octaedro.
export const WORLD_TILES = [
  { id: 'about', label: 'Sobre mí', color: 'gold', shape: 'triangle' },
  { id: 'lab', label: 'Ronald Lab', color: 'blue', shape: 'square' },
  { id: 'contact', label: 'Hablemos', color: 'cream', shape: 'rhombus' },
];

// Botones flotantes: acción directa al tocarlos. `null` en href lo oculta.
export const LINK_BUTTONS = [
  { id: 'phone', label: 'Llamar', icon: 'phone', href: CONTACT.phoneHref, color: 'coral' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'chat', href: CONTACT.whatsappHref, color: 'blue' },
  { id: 'email', label: 'Correo', icon: 'mail', href: CONTACT.emailHref, color: 'gold' },
  { id: 'vcard', label: 'Guardar', icon: 'contact', href: CONTACT.vcard, download: true, color: 'cream' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin', href: socialHref('linkedin'), color: 'blue' },
  { id: 'github', label: 'GitHub', icon: 'github', href: socialHref('github'), color: 'cream' },
  { id: 'web', label: 'Web', icon: 'globe', href: CONTACT.web, color: 'coral' },
].filter((b) => b.href);

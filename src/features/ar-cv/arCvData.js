// Configuración central de la experiencia AR del CV (/cv y /ar-cv).
// Todos los textos, enlaces y recursos se editan aquí. Un enlace con valor
// `null` oculta automáticamente su botón (no se muestran acciones vacías).

const AR_BASE = '/AR-CV';

export const PAGE_META = {
  title: 'CV interactivo de Ronald Herrera | Producto digital, UX/UI y Front-end',
  description:
    'Explora el currículum interactivo de Ronald Herrera y descubre proyectos de producto digital, UX/UI, desarrollo front-end y tecnología aplicada.',
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
  role: 'Diseño de producto digital, UX/UI y Front-end',
  tagline: 'Ideas que terminan convertidas en cosas que funcionan.',
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
// - LinkedIn y Behance: enlaces ya publicados en /contacto y /skills.
//   Pendientes de verificar por el propietario (`verified: false`).
export const SOCIAL_LINKS = [
  { id: 'linkedin', label: 'LinkedIn', href: 'https://linkedin.com/in/ronald-herrera', verified: false },
  { id: 'github', label: 'GitHub', href: 'https://github.com/ronaldherrera', verified: true },
  { id: 'behance', label: 'Behance', href: 'https://behance.net/ronald-herrera', verified: false },
];

// Proyectos destacados (panel «Proyectos»).
export const FEATURED_PROJECTS = [
  {
    id: 'walkiton',
    name: 'WALKITON',
    description:
      'Sistema físico y digital para controlar la entrega, devolución y disponibilidad de walkie-talkies mediante pantalla táctil, NFC y ESP32.',
    tags: ['ESP32', 'NFC', 'UX/UI'],
    image: null,
    accent: 'blue',
    actions: [
      { label: 'Ver proyecto', href: null },
      { label: 'Ver vídeo', href: null },
      { label: 'Ver caso de estudio', href: null },
    ],
  },
  {
    id: 'control-rupturas',
    name: 'Control de rupturas',
    description:
      'Herramienta para digitalizar el control de stock, ventas, recepciones y AVS, con validaciones, persistencia e informes en PDF.',
    tags: ['Apps Script', 'JavaScript', 'PDF'],
    image: null,
    accent: 'gold',
    actions: [
      { label: 'Ver proyecto', href: null },
      { label: 'Ver funcionamiento', href: null },
      { label: 'Ver caso de estudio', href: null },
    ],
  },
  {
    id: 'fycheo',
    name: 'Fycheo',
    description:
      'Plataforma SaaS para gestionar equipos, fichajes, turnos, permisos, alertas, informes y documentación.',
    tags: ['PWA', 'APIs', 'UX/UI'],
    image: `${AR_BASE}/proyectos/fycheo.webp`,
    accent: 'coral',
    actions: [
      { label: 'Ver proyecto', href: '/presentacion/fycheo/index.html' },
      { label: 'Visitar fycheo.es', href: 'https://fycheo.es/' },
    ],
  },
];

// Ronald Lab: proyectos que ya existen en /lab (textos sintetizados de LabPage.jsx).
// Protop, Flox, Pathrix y Sam no existen todavía en el repositorio: añádelos aquí
// con el mismo formato cuando tengan textos, imagen y enlace reales.
export const LAB_PROJECTS = [
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
    id: 'snapstore',
    name: 'SnapStore',
    category: 'Herramienta / Automatización',
    description: 'Descargador inteligente de activos visuales para e-commerce con monitor de progreso en tiempo real.',
    status: null,
    tags: ['Electron', 'Puppeteer', 'Scraping'],
    image: `${AR_BASE}/proyectos/snapstore.webp`,
    href: '/presentacion/Snapstore/index.html',
  },
  {
    id: 'tankily',
    name: 'Tankily',
    category: 'Social / Comunidad',
    description: 'Plataforma social para amantes de la acuariofilia: gestión de acuarios y comunidad activa.',
    status: 'En desarrollo',
    tags: ['Next.js', 'Supabase', 'UX'],
    image: `${AR_BASE}/proyectos/tankily.webp`,
    href: null,
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
    'Combino diseño UX/UI, desarrollo front-end y pensamiento de producto para detectar problemas reales, simplificar procesos y construir herramientas claras, útiles y eficientes.',
  thought:
    'No siempre tengo la respuesta cuando empiezo. Tengo algo que me parece más valioso: la incomodidad de no aceptar que «siempre se ha hecho así» sea una explicación. Observo, pregunto, pruebo y construyo. A veces el resultado es una interfaz; otras, un producto digital o físico. La forma cambia. La intención no: conseguir que las cosas funcionen mejor.',
  actions: [
    { id: 'web', label: 'Visitar mi web', href: 'https://ronaldherrera.es' },
    // Todavía no hay un PDF del CV en el proyecto. Indica aquí su ruta (p. ej. '/AR-CV/ronald-herrera-cv.pdf').
    { id: 'cv', label: 'Descargar CV', href: null, download: true },
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
// su ficha en el panel correspondiente.
export const CAROUSEL_ITEMS = [
  ...FEATURED_PROJECTS.map((p) => ({
    id: p.id,
    section: 'projects',
    name: p.name,
    caption: p.tags.join(' · '),
    image: p.image,
    accent: p.accent,
  })),
  ...LAB_PROJECTS.map((p, i) => ({
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

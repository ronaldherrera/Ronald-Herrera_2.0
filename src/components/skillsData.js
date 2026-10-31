// Habilidades del juego «A producción» y de la lista de la página de Skills.
// Cada una dice dónde la he usado de verdad: todo comprobable en los proyectos del Lab.
export const GRUPOS = [
  { id: 'front', nombre: 'Front-end' },
  { id: 'back', nombre: 'Back-end y datos' },
  { id: 'movil', nombre: 'Móvil' },
  { id: 'entrega', nombre: 'Entrega y SEO' },
  { id: 'diseno', nombre: 'Diseño' },
  { id: 'forma', nombre: 'Forma de trabajar' },
];

export const SKILLS = [
  { id: 'react', nombre: 'React', grupo: 'front', fondo: '#20232A', texto: '#61DAFB', uso: 'Las interfaces de Tankily, Protop y Fycheo.' },
  { id: 'ts', nombre: 'TypeScript', grupo: 'front', fondo: '#3178C6', texto: '#FFFFFF', uso: 'Protop entero y los paneles de Fycheo.' },
  { id: 'next', nombre: 'Next.js', grupo: 'front', fondo: '#000000', texto: '#FFFFFF', uso: 'Tankily: export estático con más de 16.000 URLs en 8 idiomas.' },
  { id: 'js', nombre: 'JavaScript', grupo: 'front', fondo: '#F7DF1E', texto: '#1A1A1A', uso: 'Las calculadoras de eSolar y el motor de compatibilidad de Tankily.' },
  { id: 'astro', nombre: 'Astro', grupo: 'front', fondo: '#BC52EE', texto: '#FFFFFF', uso: 'eSolar Cantabria: 148 páginas estáticas.' },
  { id: 'supabase', nombre: 'Supabase', grupo: 'back', fondo: '#3ECF8E', texto: '#0B1D14', uso: 'Auth, Storage, Realtime y Edge Functions en Tankily, Protop y Fycheo.' },
  { id: 'postgres', nombre: 'PostgreSQL', grupo: 'back', fondo: '#336791', texto: '#FFFFFF', uso: 'RLS, triggers y funciones SQL. En Fycheo, cada fichaje se valida en la base de datos.' },
  { id: 'node', nombre: 'Node.js', grupo: 'back', fondo: '#339933', texto: '#FFFFFF', uso: 'Scripts de build: el prerender de Protop y los datos de PVGIS de eSolar.' },
  { id: 'stripe', nombre: 'Stripe', grupo: 'back', fondo: '#635BFF', texto: '#FFFFFF', uso: 'El plan Pro de Tankily y el monedero de Fycheo.' },
  { id: 'rn', nombre: 'React Native y Expo', grupo: 'movil', fondo: '#61DAFB', texto: '#20232A', uso: 'Las apps de Fycheo y Pathrix.' },
  { id: 'seo', nombre: 'SEO técnico', grupo: 'entrega', fondo: '#ED8E6A', texto: '#101010', uso: 'Prerender, datos estructurados y sitemaps: 1.608 páginas en Protop.' },
  { id: 'actions', nombre: 'GitHub Actions', grupo: 'entrega', fondo: '#2088FF', texto: '#FFFFFF', uso: 'Despliegues automáticos a Hostinger por rsync y FTPS.' },
  { id: 'uxui', nombre: 'UX/UI', grupo: 'diseno', fondo: '#A7D5F5', texto: '#101010', uso: 'Formación en Coderhouse y diseñador UX/UI en Neonexus.' },
  { id: 'marca', nombre: 'Diseño de marca', grupo: 'diseno', fondo: '#C4AB57', texto: '#101010', uso: 'Las identidades de Protop, Tankily, Fycheo y eSolar.' },
  { id: 'figma', nombre: 'Figma', grupo: 'diseno', fondo: '#F24E1E', texto: '#FFFFFF', uso: 'Diseño de interfaces y mi CV.' },
  { id: 'autonomia', nombre: 'Autonomía', grupo: 'forma', fondo: '#EAE5CA', texto: '#101010', uso: 'Cuatro productos llevados yo solo hasta producción.' },
  { id: 'aprender', nombre: 'Aprender rápido', grupo: 'forma', fondo: '#2A2A2A', texto: '#EAE5CA', uso: 'De diseñador gráfico a desarrollador full-stack desde 2022.' },
];

// Los proyectos del Lab que reconoce el clon cuando el visitante está viendo su presentación (/lab?p=<id>, mismos ids
// que en LabPage.jsx). ficha: archivo con su ficha técnica en public/_lib/proyectos/<ficha>.md, si la tiene.
// Fuera queda la formación de protecciones eléctricas (de Obramat, sin permiso para salir con la marca).
const PROYECTOS = {
  100: { nombre: 'Tankily', ficha: 'tankily' },
  10: { nombre: 'Fycheo', ficha: 'fycheo' },
  101: { nombre: 'Protop', ficha: 'protop' },
  102: { nombre: 'eSolar Cantabria', ficha: 'esolar' },
  103: { nombre: 'Ronald Herrera Studio', ficha: 'studio' },
  61: { nombre: 'Protop', marca: true, ficha: 'marca-protop' },
  62: { nombre: 'Tankily', marca: true, ficha: 'marca-tankily' },
  63: { nombre: 'eSolar', marca: true, ficha: 'marca-esolar' },
  64: { nombre: 'Fycheo', marca: true, ficha: 'marca-fycheo' },
  60: { nombre: 'Imagym', ficha: 'imagym' },
  31: { nombre: 'Pathrix', ficha: 'pathrix' },
  21: { nombre: 'SnapStore', ficha: 'snapstore' },
  0: { nombre: 'la lámpara LED de mi acuario', ficha: 'lampara', sugerencias: ['¿Cómo funciona la lámpara?', '¿Qué placa y qué componentes usa?', '¿Por qué la hiciste tú?'] },
  1: { nombre: 'Walkiton', ficha: 'walkiton' },
  50: { nombre: 'mi portfolio anterior', ficha: 'portfolio-anterior', sugerencias: ['¿Qué cambiaste respecto al anterior?', '¿Con qué estaba hecho?'] },
};

// El proyecto que se está viendo, a partir de la dirección (?p=100). null si no hay o no es de los que reconoce
export function proyectoDeBusqueda(busqueda) {
  const id = new URLSearchParams(busqueda).get('p');
  const p = id !== null ? PROYECTOS[id] : null;
  return p ? { id, ...p, titulo: p.marca ? `la identidad de ${p.nombre}` : p.nombre } : null;
}

// El bocadillo al abrir su presentación y las primeras preguntas del chat
export function llamadaDeProyecto(p) {
  if (p.marca) {
    return {
      texto: `Estás viendo la identidad de ${p.nombre}. Si quieres, te cuento cómo la diseñé.`,
      cuerpo: 'asentir',
      sugerencias: [`¿Cómo diseñaste la identidad de ${p.nombre}?`, '¿Por qué esos colores y esa tipografía?', '¿Qué herramientas usaste?'],
    };
  }
  return {
    texto: `Estás viendo ${p.nombre}. Lo hice yo: si quieres, te cuento cómo está hecho por dentro o cualquier detalle.`,
    cuerpo: 'asentir',
    sugerencias: p.sugerencias || [`¿Cómo está hecho ${p.nombre}?`, `¿Qué fue lo más difícil de ${p.nombre}?`, `¿Qué tecnologías usa ${p.nombre}?`],
  };
}

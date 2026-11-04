// Marcas del cuerpo del clon ({cara:sonrisa} Claro… {gesto:asentir} …): las separa del texto y guarda en qué
// carácter del texto visible (pos) y del texto hablado (posVoz) ocurre cada una.
// Es la misma lógica que public/_lib/cuerpo.php y public/_lib/voz.php (aquí la usa el chat de desarrollo de
// vite.config.js): si cambias una, cambia la otra.

const MARCA = /\{(cara|gesto|cuerpo|accion|camara):([a-z0-9-]+)\}/u;

// Lo que se lee en voz alta de un trozo: los enlaces por su texto, sin deletrear URL ni correos
export function textoParaVozTrozo(texto) {
  return texto
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, '$1')
    .replace(/https?:\/\/\S+/gu, 'el enlace')
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/gu, 'mi correo')
    // Los teléfonos tampoco se recitan: quedan escritos en el chat
    .replace(/\b(?:al|el) (?=\+?\d[\d ]{7,}\d)/gu, 'a ')
    .replace(/\+?\d[\d ]{7,}\d/gu, 'mi teléfono')
    .replace(/[*_#`>]+/gu, '')
    .replace(/\bCVs?\b/gu, 'currículum')
    .replace(/\bIAs\b/gu, 'inteligencias artificiales')
    .replace(/\bIA\b/gu, 'inteligencia artificial')
    .replace(/[ \t]+/gu, ' ');
}

function valorMarca(vocabulario, tipo, valor) {
  const lista = vocabulario[tipo];
  if (!lista) return null;
  if (Array.isArray(lista)) return lista.includes(valor) ? valor : null;
  return lista[valor] ?? null;
}

// Pega un trozo sin dejar espacios dobles donde estaba la marca
function pegar(base, trozo) {
  if (base === '') return trozo.trimStart();
  return /\s$/u.test(base) ? base + trozo.replace(/^[ \t]+/u, '') : base + trozo;
}

const largo = (t) => [...t].length;

export function separarMarcas(texto, vocabulario) {
  const trozos = texto.split(new RegExp(MARCA.source, 'gu'));
  let limpio = '';
  let hablado = '';
  const marcas = [];
  for (let i = 0; i < trozos.length; i += 3) {
    limpio = pegar(limpio, trozos[i]);
    hablado = pegar(hablado, textoParaVozTrozo(trozos[i]));
    if (trozos[i + 1] === undefined) break;
    const valor = valorMarca(vocabulario, trozos[i + 1], trozos[i + 2]);
    if (valor !== null && marcas.length < 8) {
      marcas.push({ tipo: trozos[i + 1], valor, pos: largo(limpio), posVoz: largo(hablado) });
    }
  }
  limpio = limpio.trimEnd();
  hablado = hablado.trimEnd();
  for (const m of marcas) {
    m.pos = Math.min(m.pos, largo(limpio));
    m.posVoz = Math.min(m.posVoz, largo(hablado));
  }
  return { texto: limpio, hablado, marcas };
}

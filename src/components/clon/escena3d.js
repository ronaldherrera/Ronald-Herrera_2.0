// Ronald en 3D: su modelo de Blender sobre el esqueleto de Mixamo, con huesos para los ojos y
// shape keys con nombres de ARKit (párpados, cejas, boca, mejillas). Se carga solo cuando hace falta.
//
// API (pensada también para la futura entrevista por voz):
//   pensar(bool)              mientras genera la respuesta: mira de lado, cejas, boca cerrada
//   hablar(bool)              mueve la boca con visemas aleatorios (cuando no hay voz)
//   hablarCon(audio, tiempos) mueve la boca al ritmo de la voz real (tiempos por carácter de ElevenLabs)
//   marcas(lista, {audio, inicios}) ejecuta lo que la IA pidió ({cara:…} {gesto:…} {cuerpo:…} {accion:…}) a su tiempo
//   visema(nombre, peso)      pone la boca en un sonido concreto (aa, E, I, O, U, PP, FF, TH, SS, RR, nn, sil)
//   expresion(nombre, peso)   neutral, sonrisa, alegre, duda, sorpresa, preocupado, atento y caras de emoji (😀😂😉🤔🙄…)
//   gesto(nombre)             asentir, negar, ladear, encogerse
//   accion(nombre)            secuencias y actitudes con manos y accesorios (ver ACCIONES)
//   escuchar(bool)            mientras el visitante escribe: reposo tranquilo y atento
//   movimiento(nombre)        un gesto de cuerpo entero de Mixamo (asentir, reir, saludar, celebrar…, ver
//                             public/avatar/animaciones); al acabar vuelve solo a reposo o a hablar
//   animar(nombre, opciones)  reproduce una animación de Mixamo una vez (banco de pruebas) y vuelve al reposo
//   parar()                   vuelve al director (reposo, hablar, pensar según el estado)
//   mirada(modo)              'auto' (lo que ve el visitante: sigue al ratón o al dedo; quieto, te mira y aparta la vista de vez en cuando) | 'raton' |
//                             'camara' (te mira mientras giras la cámara) | 'libre' (mira alrededor)
//   camara(encuadre)          lleva la cámara a 'cara' | 'busto' | 'medio' | 'completo' (y lo deja como encuadre de base)
//   camaraAuto(activa)        true (por defecto): la IA mueve la cámara al hablar; false: se queda donde la pongas.
//                             Con cámara libre, en automático no se puede girar (se ve como la verá el visitante)
//   entorno(nombre)           'liso' (fondo de la página) | 'habitacion' (el setup de Ronald)
//   tamanoFijo([ancho, alto])  dibuja a ese tamaño aunque su caja cambie (centrado y recortado por ella); null lo
//                             suelta. Para transiciones: el redibujado pesado se hace una vez antes y no a cada paso
//   tocar(zona)               reacciona como si le tocaras ahí (ojo-izq, ojo-dcha, nariz, boca, mejilla, oreja, cabeza,
//                             barbilla, barriga, costado, pecho, brazo, mano, piernas). Un clic o toque sin arrastrar
//                             sobre el avatar hace lo mismo; alTocar(zona), si la página lo pone, se entera de cada toque.
//                             Dice una frase grabada de public/avatar/frases (si no está respondiendo); con muchos
//                             toques seguidos se harta y, si sigues, te pide que pares
//   destruir()
import {
  ACESFilmicToneMapping, AmbientLight, AnimationMixer, CanvasTexture, CircleGeometry, Color, Mesh, MeshBasicMaterial, MeshLambertMaterial, DirectionalLight, Group, SpotLight, HemisphereLight, LoopOnce, LoopRepeat, MathUtils,
  PCFShadowMap, PerspectiveCamera, PMREMGenerator, Quaternion, Raycaster, Scene, Vector2, SRGBColorSpace, Vector3, WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { clone as clonarEsqueleto } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { crearAccesorios } from './accesorios';
import { crearAnclaPies } from './pies';
import { crearHabitacion } from './habitacion';
import { crearPosproceso } from './posproceso';

const RUTA_MODELO = '/avatar/ronald.glb';
const RUTA_ANIMACIONES = '/avatar/animaciones/';

// Encuadres de cámara: [posición, punto al que mira, apertura]
const ENCUADRES = {
  busto: [[0, 1.74, 1.35], [0, 1.70, 0], 17],
  medio: [[0, 1.62, 2.3], [0, 1.52, 0], 24],
  completo: [[0, 1.05, 5.2], [0, 0.95, 0], 26],
  cara: [[0, 1.72, 0.75], [0, 1.69, 0], 24],
};
const X = new Vector3(1, 0, 0);
const Y = new Vector3(0, 1, 0);
const Z = new Vector3(0, 0, 1);

// Bocas de cada sonido (visemas de Oculus) como mezcla de shape keys
const VISEMAS = {
  sil: {},
  PP: { mouthRollLower: 0.25 },
  FF: { mouthRollLower: 0.9, jawOpen: 0.08 },
  TH: { jawOpen: 0.18, mouthStretchLeft: 0.2, mouthStretchRight: 0.2 },
  DD: { jawOpen: 0.25 },
  kk: { jawOpen: 0.3, mouthStretchLeft: 0.25, mouthStretchRight: 0.25 },
  CH: { jawOpen: 0.12, mouthFunnel: 0.55 },
  SS: { jawOpen: 0.1, mouthStretchLeft: 0.45, mouthStretchRight: 0.45 },
  nn: { jawOpen: 0.15 },
  RR: { jawOpen: 0.2, mouthFunnel: 0.3 },
  aa: { jawOpen: 0.75 },
  E: { jawOpen: 0.4, mouthStretchLeft: 0.5, mouthStretchRight: 0.5 },
  I: { jawOpen: 0.22, mouthSmileLeft: 0.45, mouthSmileRight: 0.45 },
  O: { jawOpen: 0.32, mouthFunnel: 1 },
  U: { jawOpen: 0.12, mouthPucker: 0.95 },
};
const SECUENCIA_HABLA = ['aa', 'E', 'nn', 'O', 'SS', 'I', 'DD', 'aa', 'PP', 'E', 'kk', 'U', 'RR', 'aa', 'FF', 'E', 'TH', 'O', 'sil'];

// Con voz real: la boca de cada letra del español (ElevenLabs dice cuándo suena cada carácter). La «h» no suena:
// se usa la letra siguiente; «ch» y «ll» van juntas; la «c» suena como «k» o como «z» según la vocal
const BOCA_LETRA = {
  a: 'aa', á: 'aa', e: 'E', é: 'E', i: 'I', í: 'I', y: 'I', o: 'O', ó: 'O', u: 'U', ú: 'U', ü: 'U',
  p: 'PP', b: 'PP', m: 'PP', v: 'PP', f: 'FF', s: 'SS', x: 'SS', z: 'TH', k: 'kk', q: 'kk', g: 'kk', j: 'kk',
  r: 'RR', d: 'DD', t: 'DD', l: 'nn', n: 'nn', ñ: 'nn',
};
// Al hablar no se ve cada letra: la boca marca las vocales y solo las consonantes que se notan por fuera (labios
// que se cierran o se apoyan en los dientes); el resto toma la forma de la vocal que viene, como en una sílaba
const VOCALES = new Set(['aa', 'E', 'I', 'O', 'U']);
const CONSONANTES_VISIBLES = new Set(['PP', 'FF']);
function bocaHablando(letras, i) {
  const boca = bocaDeLetra(letras, i);
  if (boca === 'sil' || VOCALES.has(boca) || CONSONANTES_VISIBLES.has(boca)) return boca;
  for (let k = i + 1; k <= i + 2; k++) {
    const sig = bocaDeLetra(letras, k);
    if (VOCALES.has(sig)) return sig;
  }
  return boca;
}
function bocaDeLetra(letras, i) {
  const c = (letras[i] || '').toLowerCase();
  const sig = (letras[i + 1] || '').toLowerCase();
  const ant = (letras[i - 1] || '').toLowerCase();
  if (c === 'h') return ant === 'c' ? 'CH' : (BOCA_LETRA[sig] || 'sil');
  if (c === 'c') return sig === 'h' ? 'CH' : /[eéií]/.test(sig) ? 'TH' : 'kk';
  return BOCA_LETRA[c] || 'sil';
}

// Ritmo de lectura cuando no hay voz: unos 22 caracteres por segundo, como habla una persona
const SEGUNDOS_POR_LETRA = 0.045;

// Las dos mitades de la cara a la vez (p. ej. ambos('mouthSmile', 0.8))
const ambos = (forma, v) => ({ [forma + 'Left']: v, [forma + 'Right']: v });

// Expresiones: shape keys + (opcional) hacia dónde miran los ojos [arriba(-)/abajo(+), izq/dcha] y un gesto de cabeza
export const EXPRESIONES = {
  neutral: { formas: {} },
  sonrisa: { formas: { ...ambos('mouthSmile', 0.55), ...ambos('eyeSquint', 0.2) } },
  alegre: { formas: { ...ambos('mouthSmile', 0.95), ...ambos('eyeSquint', 0.45), ...ambos('cheekSquint', 0.6), browInnerUp: 0.2 } },
  duda: { formas: { browOuterUpLeft: 0.9, browDownRight: 0.4, mouthFrownRight: 0.25, mouthSmileLeft: 0.15 } },
  sorpresa: { formas: { browInnerUp: 0.9, ...ambos('browOuterUp', 0.8), ...ambos('eyeWide', 0.8), jawOpen: 0.2 } },
  preocupado: { formas: { browInnerUp: 0.7, ...ambos('mouthFrown', 0.4) } },
  atento: { formas: { browInnerUp: 0.25, ...ambos('eyeWide', 0.2), ...ambos('mouthSmile', 0.15) } },

  // Caras de los emojis (sin adornos: ni corazones, ni lágrimas, ni gafas)
  '🙂': { formas: { ...ambos('mouthSmile', 0.4), ...ambos('cheekSquint', 0.2) } },
  '😀': { formas: { ...ambos('mouthSmile', 0.9), jawOpen: 0.2, ...ambos('mouthUpperUp', 0.4), ...ambos('mouthLowerDown', 0.5), browInnerUp: 0.2 } },
  '😁': { formas: { ...ambos('mouthSmile', 1), ...ambos('mouthUpperUp', 0.6), ...ambos('mouthLowerDown', 0.6), ...ambos('eyeSquint', 0.6), ...ambos('cheekSquint', 0.8), jawOpen: 0.05 } },
  '😂': { formas: { ...ambos('mouthSmile', 1), jawOpen: 0.5, ...ambos('mouthUpperUp', 0.5), ...ambos('eyeSquint', 0.9), ...ambos('eyeBlink', 0.55), ...ambos('cheekSquint', 1), browInnerUp: 0.5 }, gesto: ['reir', 1800] },
  '😊': { formas: { ...ambos('mouthSmile', 0.65), ...ambos('eyeSquint', 0.75), ...ambos('cheekSquint', 0.9), ...ambos('eyeBlink', 0.25) } },
  '😇': { formas: { ...ambos('mouthSmile', 0.5), browInnerUp: 0.5, ...ambos('eyeSquint', 0.3) }, ojos: [-0.15, 0] },
  '😉': { formas: { eyeBlinkLeft: 1, cheekSquintLeft: 0.8, mouthSmileLeft: 0.75, mouthSmileRight: 0.35, browDownLeft: 0.3, browOuterUpRight: 0.3 } },
  '😍': { formas: { ...ambos('mouthSmile', 0.9), jawOpen: 0.15, browInnerUp: 0.6, ...ambos('eyeWide', 0.3) } },
  '😘': { formas: { mouthPucker: 1, eyeBlinkRight: 1, cheekSquintRight: 0.6, browOuterUpLeft: 0.3 } },
  '😋': { formas: { ...ambos('mouthSmile', 0.6), tongueOut: 0.7, jawOpen: 0.12, mouthLowerDownLeft: 0.5, mouthLeft: 0.5, ...ambos('eyeSquint', 0.4) } },
  '😛': { formas: { tongueOut: 1, jawOpen: 0.32, ...ambos('mouthLowerDown', 0.6), ...ambos('mouthSmile', 0.25) } },
  '😜': { formas: { tongueOut: 1, jawOpen: 0.32, ...ambos('mouthLowerDown', 0.6), eyeBlinkLeft: 1, cheekSquintLeft: 0.6, browOuterUpRight: 0.8, eyeWideRight: 0.5 }, gesto: ['ladear', 1400] },
  '🤔': { formas: { browDownLeft: 0.6, browOuterUpRight: 0.8, mouthRight: 0.6, ...ambos('mouthPress', 0.4), mouthShrugLower: 0.3 }, ojos: [-0.2, 0.25], gesto: ['ladear', 1600] },
  '🤨': { formas: { browOuterUpLeft: 1, browDownRight: 0.7, eyeSquintRight: 0.3, ...ambos('mouthPress', 0.4) } },
  '😐': { formas: { ...ambos('mouthPress', 0.6) } },
  '😑': { formas: { ...ambos('mouthPress', 0.7), ...ambos('eyeBlink', 0.65) } },
  '🙄': { formas: { mouthLeft: 0.4, ...ambos('mouthPress', 0.3), ...ambos('browOuterUp', 0.4), browInnerUp: 0.3 }, ojos: [-0.38, 0.15] },
  '😏': { formas: { mouthSmileLeft: 0.8, mouthLeft: 0.4, eyeSquintLeft: 0.35, browDownRight: 0.35, ...ambos('eyeBlink', 0.15) }, ojos: [0, 0.2], gesto: ['ladear', 1200] },
  '😮': { formas: { jawOpen: 0.45, mouthFunnel: 0.6, browInnerUp: 0.8, ...ambos('browOuterUp', 0.5), ...ambos('eyeWide', 0.6) } },
  '😲': { formas: { jawOpen: 0.85, mouthFunnel: 0.3, browInnerUp: 1, ...ambos('browOuterUp', 1), ...ambos('eyeWide', 1) } },
  '😳': { formas: { ...ambos('eyeWide', 0.9), browInnerUp: 0.6, ...ambos('mouthPress', 0.5), ...ambos('cheekSquint', 0.3) } },
  '🥺': { formas: { browInnerUp: 1, ...ambos('eyeWide', 0.4), ...ambos('mouthFrown', 0.35), mouthShrugLower: 0.6, ...ambos('mouthPress', 0.3) }, ojos: [-0.12, 0] },
  '😢': { formas: { browInnerUp: 1, ...ambos('mouthFrown', 0.8), mouthShrugLower: 0.7, ...ambos('eyeSquint', 0.3) }, ojos: [0.2, 0] },
  '😭': { formas: { browInnerUp: 1, ...ambos('eyeBlink', 0.75), ...ambos('eyeSquint', 1), jawOpen: 0.45, ...ambos('mouthFrown', 1), ...ambos('mouthStretch', 0.6), ...ambos('mouthLowerDown', 0.4) } },
  '😡': { formas: { ...ambos('browDown', 1), ...ambos('noseSneer', 0.8), ...ambos('eyeSquint', 0.4), ...ambos('mouthPress', 0.5), ...ambos('mouthFrown', 0.5) } },
  '😤': { formas: { ...ambos('browDown', 0.8), ...ambos('noseSneer', 1), ...ambos('mouthPress', 0.9), mouthShrugLower: 0.4 }, gesto: ['asentir', 700] },
  '😬': { formas: { ...ambos('mouthStretch', 1), ...ambos('mouthUpperUp', 0.6), ...ambos('mouthLowerDown', 0.8), browInnerUp: 0.4, ...ambos('eyeWide', 0.2) } },
  '😴': { formas: { ...ambos('eyeBlink', 1), ...ambos('eyeSquint', 0.6), jawOpen: 0.15, browInnerUp: 0.2 }, gesto: ['cabecear', 2600] },
  '🥱': { formas: { jawOpen: 1, mouthFunnel: 0.35, ...ambos('eyeSquint', 0.8), ...ambos('eyeBlink', 0.5), browInnerUp: 0.6 }, gesto: ['bostezar', 2200] },
  '🤩': { formas: { ...ambos('mouthSmile', 1), jawOpen: 0.25, ...ambos('mouthUpperUp', 0.4), ...ambos('mouthLowerDown', 0.5), ...ambos('eyeWide', 0.5), browInnerUp: 0.5 } },
  '🤭': { formas: { ...ambos('mouthSmile', 0.6), ...ambos('eyeSquint', 0.55), ...ambos('cheekSquint', 0.7), browInnerUp: 0.3 }, ojos: [0.05, 0.15] },
  '🤦': { formas: { ...ambos('eyeBlink', 0.85), ...ambos('browDown', 0.3), ...ambos('mouthFrown', 0.35), ...ambos('mouthPress', 0.4) } },
  '😎': { formas: { ...ambos('mouthSmile', 0.5), mouthLeft: 0.2, ...ambos('eyeSquint', 0.35), browDownRight: 0.2 } },

  // Reacciones a los toques (ver tocar())
  ay: { formas: { ...ambos('browDown', 0.8), browInnerUp: 0.4, ...ambos('noseSneer', 0.6), ...ambos('eyeSquint', 0.8), ...ambos('eyeBlink', 0.6), ...ambos('mouthStretch', 0.6), ...ambos('mouthUpperUp', 0.3), jawOpen: 0.08 } },
  arrugar: { formas: { ...ambos('noseSneer', 1), ...ambos('browDown', 0.5), ...ambos('eyeSquint', 0.6), ...ambos('mouthUpperUp', 0.45), ...ambos('cheekSquint', 0.5) } },
};

let modeloPromesa = null;
const cargarModelo = () => (modeloPromesa ||= new GLTFLoader().loadAsync(RUTA_MODELO));

// Nombre de hueso comparable (sin «:» ni puntos; los números se conservan: Spine1 ≠ Spine2, Index1 ≠ Index2)
const limpio = (n) => n.replace(/[^a-z0-9]/gi, '').toLowerCase();
function buscarHueso(raiz, nombre) {
  let hallado = null;
  const n = limpio(nombre);
  raiz.traverse((o) => { if (!hallado && o.isBone && limpio(o.name) === n) hallado = o; });
  return hallado;
}

// Controla un hueso girándolo alrededor de ejes del mundo, a partir de su postura de reposo
// (o, si hay una animación sonando, encima de la postura que pone la animación)
function controlar(hueso) {
  if (!hueso) return () => {};
  const reposo = hueso.quaternion.clone();
  const inversa = hueso.getWorldQuaternion(new Quaternion()).invert();
  const ejes = [X, Y, Z].map((e) => e.clone().applyQuaternion(inversa));
  const q = new Quaternion();
  return (x = 0, y = 0, z = 0, sobreAnimacion = false) => {
    if (!sobreAnimacion) hueso.quaternion.copy(reposo);
    hueso.quaternion
      .multiply(q.setFromAxisAngle(ejes[1], y))
      .multiply(q.setFromAxisAngle(ejes[0], x))
      .multiply(q.setFromAxisAngle(ejes[2], z));
  };
}

const ruido = (t, s) => Math.sin(t * 1.3 + s) * 0.5 + Math.sin(t * 2.7 + s * 1.7) * 0.3 + Math.sin(t * 0.6 + s * 0.3) * 0.2;

export async function montarAvatar(canvas, { encuadre = 'busto', libre = false, entorno = 'liso', alListo } = {}) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  const RATIO_MAXIMO = Math.min(window.devicePixelRatio || 1, 2.5);
  renderer.setPixelRatio(RATIO_MAXIMO);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;   // solo hay luces con sombra en la habitación
  renderer.shadowMap.type = PCFShadowMap;

  const escena = new Scene();
  // El reflejo de entorno solo lo usan los ojos (en la piel y el pelo apagaba el color y daba brillo)
  const pmrem = new PMREMGenerator(renderer);
  escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const [pos, mira, apertura] = ENCUADRES[encuadre] || ENCUADRES.busto;
  const camara = new PerspectiveCamera(apertura, 1, 0.1, 30);
  camara.position.set(...pos);
  camara.lookAt(...mira);

  // Cámara libre (banco de pruebas): girar, acercar y desplazar
  let controles = null;
  let viaje = null;
  const miraCamara = new Vector3(...mira);   // adónde mira la cámara cuando no hay controles
  let encuadreBase = encuadre;               // el que eligió la página; la IA lo cambia solo mientras habla
  let encuadreIA = null;
  let volverCamaraEn = 0;
  let camaraIA = true;                       // si las marcas {camara:x} de la IA mueven la cámara
  if (libre) {
    controles = new OrbitControls(camara, canvas);
    controles.target.set(...mira);
    controles.enableDamping = true;
    // Inercia corta: al soltar el ratón la cámara se para casi enseguida (con poca fluidez se alargaba)
    controles.dampingFactor = 0.3;
    controles.minDistance = 0.25;
    controles.maxDistance = 9;
    controles.update();
  }

  const cielo = new HemisphereLight(0xeaf4ff, 0x4a3b30, 1.1);
  const ambiente = new AmbientLight(0xffffff, 0.25);
  escena.add(cielo, ambiente);
  const principal = new DirectionalLight(0xfff1e0, 2.4);
  principal.position.set(-0.9, 2.3, 1.4);
  // Sombra suave del avatar sobre el suelo y el escritorio (se activa en la habitación)
  principal.shadow.mapSize.set(2048, 2048);
  principal.shadow.radius = 5;
  principal.shadow.bias = -0.0004;
  principal.shadow.normalBias = 0.02;
  Object.assign(principal.shadow.camera, { left: -1.6, right: 1.6, top: 2.3, bottom: -1.2, near: 0.5, far: 7 });
  escena.add(principal);
  const contra = new DirectionalLight(0xcfe6ff, 1.6);
  contra.position.set(0.8, 2.2, -1.2);
  escena.add(contra);
  // Luz de retrato para la habitación: sin ella la piel quedaba gris y verdosa (solo la tocaban el
  // contraluz turquesa y una luz tenue). Focos con alcance corto para no aclarar la pared del fondo.
  const retrato = new Group();
  const foco = (color, intensidad, x, y, z, apertura, alto = 1.45) => {
    const luz = new SpotLight(color, intensidad, 5, apertura, 1, 2);
    luz.position.set(x, y, z);
    luz.target.position.set(0, alto, 0);
    retrato.add(luz, luz.target);
    return luz;
  };
  // principal: cálida, alta y lateral para dar volumen a la cara; cerrada sobre la cabeza para no quemar la sudadera
  foco(0xffe2c8, 4.5, -1.55, 2.3, 1.25, 0.3, 1.62);
  foco(0xffeedd, 1.2, 1.4, 1.55, 1.9, 0.5);   // relleno suave a la derecha
  foco(0xffd2a8, 1.8, 0.95, 1.9, -0.9, 0.5);    // borde cálido desde la lámpara, separa del fondo
  retrato.visible = false;
  escena.add(retrato);

  const gltf = await cargarModelo();
  const modelo = clonarEsqueleto(gltf.scene);
  const mallas = [];
  modelo.traverse((o) => {
    if (!o.isMesh) return;
    o.frustumCulled = false;
    o.castShadow = true;
    o.material.envMapIntensity = /ojo/i.test(o.name) ? 0.3 : 0;
    // Ojos: un brillo pequeño y suave; con el reflejo del entorno a tope y rugosidad 0,12, cada foco dejaba
    // una mancha blanca grande en la pupila
    if (/ojo/i.test(o.name)) o.material.roughness = 0.32;
    // Todo opaco: algunas texturas traen canal alfa y el modelo llegaba como transparente («rayos X» en la sudadera)
    if (o.material.transparent) {
      o.material.transparent = false;
      o.material.depthWrite = true;
      o.material.alphaTest = 0.5;
    }
    // La textura de la piel es muy pálida (rosa blanquecino, la frente casi blanca): un tono algo más tostado
    if (/^cuerpo/i.test(o.name)) o.material.color.setRGB(1, 0.86, 0.74);
    if (/pelo/i.test(o.name)) {
      // Castaño como la barba y mate. Lambert no tiene reflejo especular: con el material PBR, aun con rugosidad 1,
      // las facetas del mapa de normales devolvían un brillo gris con las luces de la habitación
      const { normalMap, side } = o.material;
      o.material = new MeshLambertMaterial({ color: new Color(0.052, 0.038, 0.029), normalMap, side });
    }
    if (o.morphTargetDictionary) mallas.push(o);
  });
  escena.add(modelo);
  modelo.updateMatrixWorld(true);

  // Postura de los brazos (el reposo del modelo es en A): caídos con un poco de aire entre el codo y el cuerpo, con las palmas
  // mirando al muslo (no apoyadas delante) y los dedos algo curvados, como al estar de pie relajado
  const postura = { brazoX: 0.05, brazoY: 0, brazoZ: 0.48, anteX: 0, anteY: 0, anteZ: 0.05, manoX: 0, manoY: -0.8, manoZ: 0, dedos: 0.35 };
  const h = (n) => controlar(buscarHueso(modelo, n));
  const hueso = {
    columna: h('mixamorig:Spine1'), pecho: h('mixamorig:Spine2'), cuello: h('mixamorig:Neck'), cabeza: h('mixamorig:Head'),
    hombroI: h('mixamorig:LeftShoulder'), hombroD: h('mixamorig:RightShoulder'),
    brazoI: h('mixamorig:LeftArm'), brazoD: h('mixamorig:RightArm'),
    anteI: h('mixamorig:LeftForeArm'), anteD: h('mixamorig:RightForeArm'),
    manoI: h('mixamorig:LeftHand'), manoD: h('mixamorig:RightHand'),
    ojoI: h('OjoL'), ojoD: h('OjoR'),
  };
  const globos = ['OjoL', 'OjoR'].map((n) => buscarHueso(modelo, n)).filter(Boolean);

  // Dedos (índice a meñique, tres falanges por lado), con su giro de reposo
  const dedos = [];
  for (const lado of ['Left', 'Right']) {
    for (const dedo of ['Index', 'Middle', 'Ring', 'Pinky']) {
      for (const f of [1, 2, 3]) {
        const b = buscarHueso(modelo, `mixamorig:${lado}Hand${dedo}${f}`);
        if (b) dedos.push({ b, reposo: b.quaternion.clone() });
      }
    }
  }
  const _qd = new Quaternion();
  function curvarDedos() {
    for (const { b, reposo } of dedos) b.quaternion.copy(reposo).multiply(_qd.setFromAxisAngle(X, postura.dedos));
  }

  // Animaciones de cuerpo (Mixamo): se cargan al pedirlas y se funden entre sí
  const mezclador = new AnimationMixer(modelo);
  // El mezclador solo reescribe un hueso cuando su valor cambia. Con una pose quieta (p. ej. «manos a la espalda»)
  // no cambia nunca, y los retoques que se hacen encima (mirar a cámara, hombros, espacio de brazos) se sumaban
  // fotograma a fotograma hasta retorcer el cuerpo. Se guarda lo que dejó el mezclador y se repone antes de cada paso
  const piesAnclados = crearAnclaPies((n) => buscarHueso(modelo, n));
  const PIES_LIBRES = new Set(['baile-hiphop', 'baile-samba', 'baile-gangnam', 'baile-escritorio', 'vuelta', 'celebrar', 'emocionado']);
  const huesosMezcla = [];
  modelo.traverse((o) => { if (o.isBone) huesosMezcla.push({ o, q: o.quaternion.clone(), p: o.position.clone() }); });
  function pasoMezclador(dt) {
    for (const h of huesosMezcla) { h.o.quaternion.copy(h.q); h.o.position.copy(h.p); }
    mezclador.update(dt);
    for (const h of huesosMezcla) { h.q.copy(h.o.quaternion); h.p.copy(h.o.position); }
  }
  const clips = {};
  let accion = null;
  // Clavículas: la del avatar descansa inclinada (brazos en «A») y la del muñeco de Mixamo horizontal (en «T»),
  // ≈29° de diferencia. Copiando su giro tal cual, la clavícula del avatar se ponía horizontal y levantaba los
  // hombros (como encogidos e hinchados). Aquí la clavícula gira lo mismo que la de Mixamo pero desde su propio
  // reposo, y el brazo se compensa para que la mano acabe en el mismo sitio.
  const reposoClavicula = {};
  for (const lado of ['Left', 'Right']) {
    const c = buscarHueso(modelo, `mixamorig:${lado}Shoulder`);
    if (c) reposoClavicula[lado] = c.quaternion.clone();
  }
  function corregirClaviculas(clip, escenaClip) {
    const pista = (n) => clip.tracks.find((t) => limpio(t.name) === limpio(`mixamorig:${n}.quaternion`));
    const qC = new Quaternion();
    const qA = new Quaternion();
    const qC2 = new Quaternion();
    for (const lado of ['Left', 'Right']) {
      const tc = pista(`${lado}Shoulder`);
      const ta = pista(`${lado}Arm`);
      const fuente = escenaClip.getObjectByProperty('isBone', true) && (() => {
        let b = null;
        escenaClip.traverse((o) => { if (!b && o.isBone && limpio(o.name) === limpio(`mixamorig:${lado}Shoulder`)) b = o; });
        return b;
      })();
      if (!tc || !ta || !fuente || !reposoClavicula[lado] || tc.times.length !== ta.times.length) continue;
      const delta = reposoClavicula[lado].clone().multiply(fuente.quaternion.clone().invert());
      for (let i = 0; i < tc.values.length; i += 4) {
        qC.fromArray(tc.values, i);
        qA.fromArray(ta.values, i);
        qC2.copy(delta).multiply(qC);
        // brazo nuevo = clavícula nueva⁻¹ · clavícula de Mixamo · brazo de Mixamo (misma orientación en el mundo)
        qA.premultiply(qC).premultiply(qC2.clone().invert());
        qC2.toArray(tc.values, i);
        qA.toArray(ta.values, i);
      }
    }
  }

  const MANO_RELAJADA = { 'reposo-pie': { lado: 'right', de: 'reposo-normal' } };
  function cargarClip(nombre) {
    clips[nombre] ||= new GLTFLoader().loadAsync(RUTA_ANIMACIONES + nombre + '.glb').then(async (g) => {
      const clip = g.animations[0];
      clip.name = nombre;
      // Los FBX de Mixamo sin malla llegan con la armadura en centímetros y con Z hacia arriba (escala 0,01 y
      // giro de 90°). Ese giro y esa escala se pasan a la cadera, que es lo único que cuelga de la armadura
      const armadura = g.scene.getObjectByName('Armature');
      if (armadura && (Math.abs(armadura.scale.x - 1) > 1e-4 || armadura.quaternion.w < 0.9999)) {
        const giro = armadura.quaternion;
        const escala = armadura.scale.x;
        const p = new Vector3();
        const q = new Quaternion();
        for (const t of clip.tracks) {
          if (!/hips\.(position|quaternion)$/i.test(t.name)) continue;
          const v = t.values;
          if (t.name.endsWith('position')) {
            for (let i = 0; i < v.length; i += 3) p.fromArray(v, i).applyQuaternion(giro).multiplyScalar(escala).toArray(v, i);
          } else {
            for (let i = 0; i < v.length; i += 4) q.fromArray(v, i).premultiply(giro).toArray(v, i);
          }
        }
      }
      // Solo giros (y la posición de la cadera): las demás posiciones y escalas de huesos son las del muñeco de
      // Mixamo, que tiene otras proporciones (y vienen en centímetros); así se respetan las del avatar
      clip.tracks = clip.tracks.filter((t) => /hips\.position$/i.test(t.name) || !/\.(position|scale)$/.test(t.name));
      corregirClaviculas(clip, g.scene);
      // En el sitio: se quita solo el avance acumulado de la cadera (lo que se ha desplazado del primer al último
      // fotograma, repartido a lo largo del clip). El vaivén se conserva: si se fijara la cadera, al cargar el peso
      // en una pierna o dar un paso los pies patinarían por el suelo
      const cadera = clip.tracks.find((t) => /hips\.position$/i.test(t.name));
      if (cadera && cadera.values.length >= 6) {
        const v = cadera.values;
        const n = v.length / 3 - 1;
        const dx = v[n * 3] - v[0];
        const dz = v[n * 3 + 2] - v[2];
        for (let i = 0; i <= n; i++) { v[i * 3] -= dx * (i / n); v[i * 3 + 2] -= dz * (i / n); }
      }
      // Manos que en Mixamo agarran algo que el avatar no lleva (el maletín): se les ponen los dedos relajados de
      // otra animación, para que no quede el puño cerrado en el aire
      const relajar = MANO_RELAJADA[nombre];
      if (relajar) {
        const modeloDedos = await cargarClip(relajar.de);
        const dedo = new RegExp(`^mixamorig${relajar.lado}hand(thumb|index|middle|ring|pinky)\\dquaternion$`);
        for (const t of clip.tracks) {
          if (!dedo.test(limpio(t.name))) continue;
          const fuente = modeloDedos.tracks.find((f) => limpio(f.name) === limpio(t.name));
          if (!fuente) continue;
          for (let i = 0; i < t.values.length; i += 4) for (let k = 0; k < 4; k++) t.values[i + k] = fuente.values[k];
        }
      }
      return clip;
    });
    return clips[nombre];
  }

  // Director del cuerpo: siempre suena una animación de base según el estado (reposo, escuchando, pensando o
  // hablando), que cambia sola cada cierto tiempo para no repetir el mismo balanceo, y encima, de vez en cuando,
  // un gesto que vuelve solo a la base al acabar. Todo con fundidos.
  const BASES = {
    // De pie neutral, las que eligió Ronald en Mixamo: la principal es «Standard Idle» y de vez en cuando
    // «Standing W/Briefcase Idle» o «Male Standing Pose» (manos a la espalda), para volver luego a la principal
    reposo: ['reposo-normal', 'reposo-pie', 'reposo-manos-atras'],
    escuchando: ['reposo-normal', 'reposo-pie', 'reposo-manos-atras'],
    // Pensando: el reposo normal (la de Mixamo, mano en la barbilla, no le gustó a Ronald, y con las manos a la
    // espalda, al empezar a hablar los brazos cruzaban el cuerpo); la cara, las cejas y la mirada perdida ya dicen
    // que está pensando
    pensando: ['reposo-normal'],
    hablando: ['hablar-2', 'hablar-3', 'hablar-4'],
  };
  // Bases con una principal (la primera de la lista): las demás son variaciones cortas y ocasionales
  const CON_PRINCIPAL = new Set(['reposo', 'escuchando']);
  // La cara que acompaña a cada gesto de cuerpo (al acabar el gesto vuelve a la de antes)
  const CARAS = {
    alivio: 'sonrisa', aplaudir: '😁', asentir: 'sonrisa', 'asentir-fuerte': '😀', 'asentir-ironico': '😏', 'asentir-largo': 'atento',
    'baile-hiphop': '😁', 'baile-samba': '😁', 'baile-gangnam': '😜', 'baile-escritorio': '😁', bostezo: '🥱', 'buscar-bolsillos': '🤨', celebrar: '🤩',
    chulesco: '😏', 'de-acuerdo': 'sonrisa', decepcionado: 'preocupado', emocionado: '😀', encogerse: 'duda', enfadado: '😡',
    entendido: 'atento', 'gesto-alegre': '😊', 'gesto-enfado': '😤', gracias: '😊', 'mirar-a-otro-lado': '😬', negar: '🤨',
    'negar-molesto': '😤', 'negar-pensativo': '🤔', pensar: '🤔', 'quitar-importancia': '🙄', reir: '😂', reverencia: 'sonrisa',
    saludar: '😀', 'saludo-formal': 'sonrisa', triste: '😢', vuelta: '😁',
  };
  // Actitudes que se mantienen (botones del banco de pruebas): su animación de base mientras duran
  const BASE_ACTITUD = {
    triste: 'triste', pensativo: 'reposo-manos-atras', dormir: 'reposo-dormir', enamorado: 'reposo-contento', estrellas: 'reposo-contento',
    santo: 'reposo-pie',
  };
  const director = { base: null, nombreBase: null, accionBase: null, cambio: 0, gesto: null, cara: null };
  let escuchando = false;
  async function reproducir(nombre, { bucle = true, fundido = 0.6, veces = 1 } = {}) {
    const nueva = mezclador.clipAction(await cargarClip(nombre));
    nueva.reset();
    if (bucle) nueva.setLoop(LoopRepeat, Infinity);
    else nueva.setLoop(veces > 1 ? LoopRepeat : LoopOnce, veces);
    nueva.clampWhenFinished = !bucle;
    nueva.play();
    if (accion && accion !== nueva) nueva.crossFadeFrom(accion, fundido, true);
    else nueva.fadeIn(fundido);
    accion = nueva;
    return nueva;
  }
  const estadoBase = () => (hablando ? 'hablando' : pensando ? 'pensando' : escuchando ? 'escuchando'
    : BASE_ACTITUD[actitud] ? `actitud-${actitud}` : 'reposo');
  function ponerBase(ahora = performance.now()) {
    if (director.gesto) return;
    const base = estadoBase();
    const lista = BASES[base] || [BASE_ACTITUD[actitud]];
    const otras = lista.length > 1 ? lista.filter((n) => n !== director.nombreBase) : lista;
    const azar = (l) => l[Math.floor(Math.random() * l.length)];
    let nombre;
    let dura = base === 'hablando' ? 5000 + Math.random() * 3000 : 12000 + Math.random() * 10000;
    if (CON_PRINCIPAL.has(base)) {
      // Desde la principal, a veces (1 de cada 3) una variación de 8–12 s; desde una variación, se vuelve a la principal
      const enPrincipal = director.nombreBase === lista[0] || !lista.includes(director.nombreBase);
      const variar = enPrincipal && base === director.base && Math.random() < 1 / 3;
      nombre = variar ? azar(lista.slice(1)) : lista[0];
      if (variar) dura = 8000 + Math.random() * 4000;
    } else {
      nombre = base === director.base && lista.length === 1 ? director.nombreBase : azar(otras);
    }
    director.base = base;
    director.cambio = ahora + dura;
    // Si ya está sonando esa misma base, no se reinicia (pero sí tras un gesto: entonces suena el gesto)
    if (nombre === director.nombreBase && accion && accion === director.accionBase) return;
    director.nombreBase = nombre;
    reproducir(nombre, { fundido: base === 'hablando' ? 0.5 : 0.9 }).then((a) => { director.accionBase = a; }).catch(() => {});
  }
  function dirigir(ahora) {
    if (director.gesto) return;
    if (estadoBase() !== director.base || ahora > director.cambio) ponerBase(ahora);
  }
  mezclador.addEventListener('finished', (e) => {
    if (e.action !== director.gesto) return;
    director.gesto = null;
    // Si nadie ha cambiado la cara mientras tanto, vuelve a la de antes del gesto
    if (director.cara && expr.destino === director.cara.puesta) api.expresion(director.cara.antes);
    director.cara = null;
    director.base = null;   // vuelve a la base que toque ahora, con fundido
    ponerBase();
  });

  const acc = crearAccesorios(escena, (n) => buscarHueso(modelo, n));
  const huesoCabeza = buscarHueso(modelo, 'mixamorig:Head');
  const huesoCadera = buscarHueso(modelo, 'mixamorig:Hips');
  const huesoBrazoI = buscarHueso(modelo, 'mixamorig:LeftArm');
  const huesoBrazoD = buscarHueso(modelo, 'mixamorig:RightArm');
  const ESPACIO_BRAZOS = 0.12;
  const reposoCaderaInv = huesoCadera.getWorldQuaternion(new Quaternion()).invert();
  const _qBrazo = new Quaternion();
  const _qBrazoPadre = new Quaternion();
  const _qGiroBrazo = new Quaternion();
  const _ejeBrazo = new Vector3();
  // Gira el brazo hacia fuera alrededor del eje delante-atrás del cuerpo (sigue al cuerpo si se gira)
  function abrirBrazo(hueso, angulo) {
    huesoCadera.getWorldQuaternion(_qBrazo).multiply(reposoCaderaInv);
    _ejeBrazo.copy(Z).applyQuaternion(_qBrazo);
    hueso.updateWorldMatrix(true, false);
    hueso.getWorldQuaternion(_qBrazo);
    _qBrazo.premultiply(_qGiroBrazo.setFromAxisAngle(_ejeBrazo, angulo));
    hueso.parent.getWorldQuaternion(_qBrazoPadre).invert();
    hueso.quaternion.copy(_qBrazoPadre.multiply(_qBrazo));
  }
  // Al hablar mira a cámara: tras la animación, se gira la cabeza (y algo el cuello) hacia la cámara.
  // «Delante» de la cabeza en su propio espacio, sacado de la postura de reposo (el modelo mira a +Z)
  const huesoCuello = buscarHueso(modelo, 'mixamorig:Neck');
  const adelanteCabeza = Z.clone().applyQuaternion(huesoCabeza.getWorldQuaternion(new Quaternion()).invert());
  const _qMundo = new Quaternion();
  const _qPadre = new Quaternion();
  const _qGiro = new Quaternion();
  const _delante = new Vector3();
  const _haciaCamara = new Vector3();
  const _posCabeza = new Vector3();
  let pesoCamara = 0;
  let pesoCabezaCamara = 1;
  const ojoCharla = { x: 0, y: 0 };
  // Mirada viva al hablar: pequeños saltos de ojos (sacadas) alrededor de la cámara y, de vez en cuando, una
  // mirada breve a un lado (como al buscar una palabra o recordar algo) antes de volver a mirarte
  const charla = { sacada: { x: 0, y: 0 }, proximaSacada: 0, aparte: null, proximoAparte: 0 };
  function miradaCharla(ahora) {
    if (ahora > charla.proximaSacada) {
      charla.sacada = { x: (Math.random() - 0.5) * 0.06, y: (Math.random() - 0.5) * 0.09 };
      charla.proximaSacada = ahora + 350 + Math.random() * 900;
    }
    if (charla.aparte && ahora > charla.aparte.hasta) charla.aparte = null;
    if (!charla.aparte && ahora > charla.proximoAparte) {
      if (charla.proximoAparte) {
        // Arriba a un lado (recordar) o abajo a un lado (pensar), nunca muy lejos
        const lado = Math.random() < 0.5 ? -1 : 1;
        charla.aparte = { x: Math.random() < 0.6 ? -0.12 : 0.1, y: lado * (0.15 + Math.random() * 0.1), hasta: ahora + 500 + Math.random() * 900 };
      }
      charla.proximoAparte = ahora + 2500 + Math.random() * 3500;
    }
    const a = charla.aparte;
    return { x: (a ? a.x : 0) + charla.sacada.x, y: (a ? a.y : 0) + charla.sacada.y, aparte: Boolean(a) };
  }
  function girarHaciaCamara(hueso, fraccion) {
    huesoCabeza.updateWorldMatrix(true, false);
    hueso.getWorldQuaternion(_qMundo);
    huesoCabeza.getWorldPosition(_posCabeza);
    _delante.copy(adelanteCabeza).applyQuaternion(huesoCabeza.getWorldQuaternion(_qGiro));
    _haciaCamara.subVectors(camara.position, _posCabeza).normalize();
    // Como mucho unos 40°: más allá parece que se retuerce el cuello
    const angulo = Math.min(_delante.angleTo(_haciaCamara), 0.7) * fraccion;
    if (angulo < 1e-4) return;
    _qGiro.setFromAxisAngle(_delante.clone().cross(_haciaCamara).normalize(), angulo);
    hueso.parent.getWorldQuaternion(_qPadre);
    hueso.quaternion.copy(_qPadre.invert().multiply(_qGiro).multiply(_qMundo));
  }

  // Con cámara libre, una sombra suave en el suelo para orientarse
  if (libre) {
    const lienzoSombra = document.createElement('canvas');
    lienzoSombra.width = lienzoSombra.height = 128;
    const g = lienzoSombra.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(20,30,45,0.45)');
    grad.addColorStop(1, 'rgba(20,30,45,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const sombra = new Mesh(new CircleGeometry(0.55, 48), new MeshBasicMaterial({ map: new CanvasTexture(lienzoSombra), transparent: true, depthWrite: false }));
    sombra.rotation.x = -Math.PI / 2;
    sombra.position.y = 0.002;
    escena.add(sombra);
  }
  let actitud = null;

  // Mezcla de shape keys: cada fuente aporta pesos y se suman
  const pesos = {};
  function aplicarFormas(fuentes) {
    for (const k in pesos) pesos[k] = 0;
    for (const f of fuentes) for (const k in f.formas) pesos[k] = (pesos[k] || 0) + f.formas[k] * f.peso;
    for (const m of mallas) {
      for (const k in m.morphTargetDictionary) {
        m.morphTargetInfluences[m.morphTargetDictionary[k]] = Math.min(1, Math.max(0, pesos[k] || 0));
      }
    }
  }

  // Estado
  const objetivo = { x: 0, y: 0 };
  const cab = { x: 0, y: 0 };
  const ojo = { x: 0, y: 0 };
  let ultimoMovimiento = performance.now();
  let modoMirada = libre ? 'camara' : 'raton';
  // Mirada automática: cuándo aparta la vista, hasta cuándo y hacia dónde
  let proximaMiradaFuera = performance.now() + 4000;
  let miradaFueraHasta = 0;
  const desvio = { x: 0, y: 0 };
  const _cab = new Vector3();
  let pensando = false;
  let hablando = false;
  const expr = { actual: 'neutral', peso: 0, destino: 'neutral', pesoDestino: 0 };
  const boca = { formas: {}, actual: {} };
  let visemaManual = null;
  let voz = null;   // { audio, tiempos, i }: boca sincronizada con la voz real
  let guion = null;   // { marcas, audio, inicio }: lo que la IA pidió hacer y cuándo (ver marcas())
  let siguienteVisema = 0;
  let indiceVisema = 0;
  let gestoActivo = null;
  let proximoParpadeo = performance.now() + 1200;
  let parpadeo = 0;
  let cuadro = 0;
  let habitacion = null;
  let posproceso = null;
  let anterior = performance.now();

  // Toques: un clic o un toque con el dedo sin arrastrar sobre el avatar. La zona sale de dónde cae el toque
  // respecto a los ojos y a los huesos del cuerpo (el cuerpo mira hacia +Z, a la cámara)
  const rayo = new Raycaster();
  const _ndc = new Vector2();
  const _p = new Vector3();
  const _q = new Vector3();
  const huesosToque = Object.fromEntries(['OjoL', 'OjoR', 'mixamorig:Hips', 'mixamorig:Spine', 'mixamorig:Spine2', 'mixamorig:Neck',
    'mixamorig:LeftArm', 'mixamorig:RightArm', 'mixamorig:LeftForeArm', 'mixamorig:RightForeArm', 'mixamorig:LeftHand', 'mixamorig:RightHand']
    .map((n) => [n.replace('mixamorig:', ''), buscarHueso(modelo, n)]));
  const posHueso = (n) => huesosToque[n]?.getWorldPosition(new Vector3());
  let ojoTocado = null;   // { lado: 'Left' | 'Right', hasta }: ese ojo se cierra un momento
  let caraToque = null;   // { antes, puesta, hasta }: la cara de la reacción, y la que había antes
  const toques = [];      // momentos de los últimos toques (con muchos seguidos se molesta)
  let ultimoHarto = 0;    // si vuelve a hartarse poco después, ya te pide que pares
  // Frases grabadas una sola vez con mi voz (npm run frases-toque): se cargan al montar, para que al tocar suenen
  // en el mismo gesto (el iPhone no deja sonar audio que empieza después de esperar a la red)
  const frasesToque = {};
  const ultimaFrase = {};
  fetch('/avatar/frases/frases.json').then((r) => (r.ok ? r.json() : {})).then((f) => Object.assign(frasesToque, f)).catch(() => {});
  const GRUPO_FRASES = { 'ojo-izq': 'ojo', 'ojo-dcha': 'ojo', barriga: 'cosquillas', costado: 'cosquillas' };
  function decir(zona) {
    if (hablando || guion) return;   // respondiendo (o ya diciendo otra frase): solo el gesto
    const lista = frasesToque[GRUPO_FRASES[zona] || zona];
    if (!lista?.length) return;
    // Al azar, sin repetir la última de esa zona
    let i = Math.floor(Math.random() * lista.length);
    if (lista.length > 1 && i === ultimaFrase[zona]) i = (i + 1) % lista.length;
    ultimaFrase[zona] = i;
    const audio = new Audio(`/avatar/frases/${lista[i].archivo}`);
    api.hablarCon(audio, lista[i].tiempos);
    audio.play().catch(() => { voz = null; hablando = false; });
  }

  function zonaTocada(p, malla) {
    const eI = posHueso('OjoL');
    const eD = posHueso('OjoR');
    if (eI && p.distanceTo(eI) < 0.028) return 'ojo-izq';
    if (eD && p.distanceTo(eD) < 0.028) return 'ojo-dcha';
    const ojos = eI && eD ? _q.addVectors(eI, eD).multiplyScalar(0.5) : huesoCabeza.getWorldPosition(_q);
    const dx = p.x - ojos.x;
    const dy = p.y - ojos.y;
    const cuello = posHueso('Neck');
    if (p.y > (cuello ? cuello.y + 0.05 : ojos.y - 0.13)) {
      if (/pelo/i.test(malla.name) || dy > 0.06) return 'cabeza';
      if (Math.abs(dx) > 0.065) return 'oreja';
      if (dy < -0.085) return 'barbilla';
      if (dy < -0.035 && Math.abs(dx) < 0.035) return 'boca';
      if (dy < 0.005 && Math.abs(dx) < 0.022) return 'nariz';
      if (dy < 0.01) return 'mejilla';
      return 'cabeza';
    }
    // Cuerpo: manos, brazos, y el tronco por alturas (los costados, lejos del eje, son cosquillas)
    const cerca = (n, d) => { const b = posHueso(n); return b && p.distanceTo(b) < d; };
    if (cerca('LeftHand', 0.11) || cerca('RightHand', 0.11)) return 'mano';
    const cadera = posHueso('Hips');
    const pecho = posHueso('Spine2');
    if (cadera && p.y < cadera.y - 0.06) return 'piernas';
    const brazoI = posHueso('LeftArm');
    const brazoD = posHueso('RightArm');
    const anchoTronco = brazoI && brazoD ? Math.abs(brazoI.x - brazoD.x) / 2 - 0.03 : 0.16;
    const lado = Math.abs(p.x - (cadera ? cadera.x : 0));
    // Los brazos caen tapando los costados: tocarlos a la altura de la cintura también son cosquillas
    const cintura = posHueso('Spine');
    if (lado > anchoTronco) return cintura && p.y < cintura.y + 0.06 ? 'costado' : 'brazo';
    if (pecho && p.y > pecho.y + 0.12) return 'brazo';   // hombros
    if (pecho && p.y > pecho.y - 0.04) return 'pecho';
    return lado > anchoTronco * 0.6 ? 'costado' : 'barriga';
  }

  // Reacción: cara un momento (luego vuelve la de antes), gesto de cabeza o de cuerpo y, en el ojo, cerrarlo
  const REACCIONES = {
    'ojo-izq': { cara: 'ay', gesto: 'retroceder', lado: 1, ojo: 'Left' },
    'ojo-dcha': { cara: 'ay', gesto: 'retroceder', lado: -1, ojo: 'Right' },
    nariz: { cara: 'arrugar', gesto: 'retroceder' },
    boca: { cara: '😳', gesto: 'retroceder' },
    mejilla: { cara: '😊', gesto: 'ladear' },
    oreja: { cara: '😬', gesto: 'encogerse' },
    cabeza: { cara: '🤨', gesto: 'negar' },
    barbilla: { cara: '🤔' },
    barriga: { cara: '😂', cuerpo: 'reir' },
    costado: { cara: '😂', cuerpo: 'reir' },
    pecho: { cara: 'sorpresa', gesto: 'retroceder' },
    brazo: { cara: 'sorpresa', gesto: 'encogerse' },
    mano: { cara: 'sonrisa', cuerpo: 'saludar' },
    piernas: { cara: '😳', gesto: 'retroceder' },
    harto: { cara: '😤', cuerpo: 'negar-molesto' },
    para: { cara: '😡', cuerpo: 'enfadado' },
  };
  function tocar(zona) {
    const ahora = performance.now();
    toques.push(ahora);
    while (toques.length && ahora - toques[0] > 8000) toques.shift();
    // Muchos toques seguidos: ya está bien; y si vuelve a pasar enseguida, que pares
    let reaccion = zona;
    if (toques.length >= 6) {
      reaccion = ahora - ultimoHarto < 20000 ? 'para' : 'harto';
      ultimoHarto = reaccion === 'para' ? 0 : ahora;
      toques.length = 0;
    }
    const re = REACCIONES[reaccion];
    if (!re) return;
    const antes = caraToque && ahora < caraToque.hasta && expr.destino === caraToque.puesta ? caraToque.antes : expr.destino;
    api.expresion(re.cara, 0.95);
    caraToque = { antes, puesta: re.cara, hasta: ahora + (re.cuerpo ? 2600 : 1500) };
    if (re.ojo) ojoTocado = { lado: re.ojo, hasta: ahora + 1100 };
    if (re.gesto === 'retroceder') gestoActivo = { nombre: 'retroceder', lado: re.lado ?? (Math.random() < 0.5 ? -1 : 1), inicio: ahora, duracion: 750 };
    else if (re.gesto) api.gesto(re.gesto, 900);
    // Las cosquillas no reinician la risa si ya se está riendo
    if (re.cuerpo && !(director.gesto && accion?.getClip().name === re.cuerpo)) api.movimiento(re.cuerpo);
    decir(reaccion);
    api.alTocar?.(reaccion);
  }

  let toqueDesde = null;
  const alApoyar = (e) => { toqueDesde = { x: e.clientX, y: e.clientY, t: performance.now() }; };
  const alSoltar = (e) => {
    const d = toqueDesde;
    toqueDesde = null;
    // Solo un toque: si arrastras (girar la cámara) o mantienes, no cuenta
    if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8 || performance.now() - d.t > 500) return;
    const r = canvas.getBoundingClientRect();
    _ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(_ndc, camara);
    const golpe = rayo.intersectObject(modelo, true).find((g) => g.object.isMesh && g.object.visible);
    if (golpe) tocar(zonaTocada(_p.copy(golpe.point), golpe.object));
  };
  canvas.addEventListener('pointerdown', alApoyar);
  canvas.addEventListener('pointerup', alSoltar);

  const alMover = (e) => {
    if (modoMirada !== 'raton' && modoMirada !== 'auto') return;
    const r = canvas.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
    const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
    objetivo.y = MathUtils.clamp(dx * 1.5, -0.7, 0.7);
    objetivo.x = MathUtils.clamp(dy * 0.8, -0.3, 0.28);
    ultimoMovimiento = performance.now();
  };
  window.addEventListener('pointermove', alMover, { passive: true });
  window.addEventListener('pointerdown', alMover, { passive: true });   // en el móvil, al tocar la pantalla

  let tamanoFijo = null;
  function ajustarTamano() {
    const w = tamanoFijo ? tamanoFijo[0] : canvas.clientWidth;
    const alto = tamanoFijo ? tamanoFijo[1] : canvas.clientHeight;
    // Como mucho unos 500.000 píxeles por fotograma: la habitación, sus sombras, el desenfoque y el halo se calculan
    // píxel a píxel y a pantalla completa (1,3 millones) iba a 25 fps. En lienzos grandes se dibuja a algo menos de
    // resolución y se escala; en el chat normal no cambia nada
    const ratioDeseado = Math.min(RATIO_MAXIMO, Math.sqrt(500000 / Math.max(1, w * alto)));
    if (Math.abs(renderer.getPixelRatio() - ratioDeseado) > 0.01) renderer.setPixelRatio(ratioDeseado);
    // Ancho y alto: en el móvil el visor cambia de alto (modo charla) sin cambiar de ancho
    const ratio = renderer.getPixelRatio();
    if (canvas.width !== Math.floor(w * ratio) || canvas.height !== Math.floor(alto * ratio)) {  // floor, como three.js en setSize
      renderer.setSize(w, alto, false);
      posproceso?.tamano(w, alto);
      camara.aspect = w / alto;
      camara.updateProjectionMatrix();
    }
  }

  function animar(ahora) {
    cuadro = requestAnimationFrame(animar);
    if (document.hidden) return;
    const dt = Math.min(0.05, (ahora - anterior) / 1000);
    anterior = ahora;
    dirigir(ahora);
    const t = ahora / 1000;

    // Mirada: al ratón o al dedo; quieto, te mira (auto) o mira alrededor con calma (ratón); pensando, a un lado
    const autoQuieto = modoMirada === 'auto' && ahora - ultimoMovimiento > 2500;
    if (modoMirada === 'auto' && !autoQuieto && !pensando) {
      // Sigue al ratón o al dedo (lo pone alMover)
    } else if ((modoMirada === 'camara' || autoQuieto) && !pensando) {
      // Te mira a ti (a la cámara) mientras la mueves
      huesoCabeza?.getWorldPosition(_cab);
      const dx = camara.position.x - _cab.x;
      const dy = camara.position.y - _cab.y;
      const dz = camara.position.z - _cab.z;
      objetivo.y = MathUtils.clamp(Math.atan2(dx, Math.max(dz, 0.15)), -0.75, 0.75);
      objetivo.x = MathUtils.clamp(-Math.atan2(dy, Math.hypot(dx, dz)) * 0.9, -0.35, 0.3);
      if (modoMirada === 'camara') ultimoMovimiento = ahora;
      if (autoQuieto) {
        // Sin ratón ni dedo te mira, como una persona en una videollamada, y de vez en cuando aparta la vista (más al hablar)
        if (ahora >= proximaMiradaFuera) {
          const lado = Math.random() < 0.5 ? -1 : 1;
          desvio.y = lado * (0.18 + Math.random() * 0.17);
          desvio.x = (Math.random() < 0.6 ? -1 : 1) * (0.03 + Math.random() * 0.07);
          miradaFueraHasta = ahora + 500 + Math.random() * 900;
          proximaMiradaFuera = ahora + (hablando ? 2500 + Math.random() * 3500 : 5000 + Math.random() * 5000);
        }
        if (ahora < miradaFueraHasta) { objetivo.y += desvio.y; objetivo.x += desvio.x; }
      }
    } else if (modoMirada === 'libre' && !pensando) {
      objetivo.y = ruido(t * 0.25, 3) * 0.35;
      objetivo.x = ruido(t * 0.2, 4) * 0.08;
    } else if (pensando) {
      objetivo.y = 0.28 + ruido(t * 0.4, 1) * 0.08;
      objetivo.x = -0.16 + ruido(t * 0.5, 2) * 0.04;
    } else if (ahora - ultimoMovimiento > 4000) {
      objetivo.y = ruido(t * 0.25, 3) * 0.35;
      objetivo.x = ruido(t * 0.2, 4) * 0.08;
    }
    const k = 1 - Math.exp(-dt * 4);
    cab.x += (objetivo.x - cab.x) * k;
    cab.y += (objetivo.y - cab.y) * k;
    const ko = 1 - Math.exp(-dt * 16);
    ojo.x += (objetivo.x - ojo.x) * ko;
    ojo.y += (objetivo.y - ojo.y) * ko;

    // Gestos de cabeza y hombros
    let gx = 0; let gy = 0; let gz = 0; let hombros = 0;
    if (gestoActivo) {
      const p = (ahora - gestoActivo.inicio) / gestoActivo.duracion;
      if (p >= 1) gestoActivo = null;
      else {
        const env = Math.sin(p * Math.PI);
        if (gestoActivo.nombre === 'asentir') gx = Math.sin(p * Math.PI * 4) * 0.12 * env;
        if (gestoActivo.nombre === 'negar') gy = Math.sin(p * Math.PI * 4) * 0.2 * env;
        if (gestoActivo.nombre === 'ladear') gz = 0.14 * env;
        if (gestoActivo.nombre === 'encogerse') { hombros = 0.22 * env; gz = 0.06 * env; }
        if (gestoActivo.nombre === 'reir') { gx = -0.08 * env + Math.sin(p * Math.PI * 10) * 0.035 * env; hombros = Math.abs(Math.sin(p * Math.PI * 10)) * 0.07 * env; }
        if (gestoActivo.nombre === 'cabecear') gx = 0.28 * Math.sin(Math.min(1, p * 1.6) * Math.PI / 2) * (p > 0.85 ? (1 - p) / 0.15 : 1);
        if (gestoActivo.nombre === 'bostezar') { gx = -0.18 * env; hombros = 0.1 * env; }
        if (gestoActivo.nombre === 'retroceder') {
          const golpe = p < 0.12 ? p / 0.12 : (1 - p) / 0.88;
          gx = -0.14 * golpe;
          gy = 0.16 * golpe * gestoActivo.lado;
          hombros = 0.06 * golpe;
        }
      }
    }

    // «Sad Idle» ya baja la cabeza: solo un cabeceo leve encima
    if (actitud === 'dormir') gx += 0.06 + Math.sin(t * 1.1) * 0.03;

    // Cuerpo: con una animación sonando manda ella; si no, brazos relajados, respiración y leve balanceo
    const respira = Math.sin(t * 1.5);
    const animando = Boolean(accion);
    if (animando) {
      pasoMezclador(dt);
      modelo.updateMatrixWorld(true);
      // Pies clavados al suelo entre posturas, salvo en las animaciones que se desplazan o giran a propósito
      piesAnclados.actualizar(dt, !PIES_LIBRES.has(accion.getClip().name));
    }
    else {
      const balanceo = ruido(t * 0.3, 5);
      hueso.columna(0.015 * respira, balanceo * 0.03, balanceo * 0.015);
      hueso.pecho(0.02 * respira, cab.y * 0.12, 0);
    }
    hueso.hombroI(0, 0, 0.05 * respira + hombros, animando);
    hueso.hombroD(0, 0, -0.05 * respira - hombros, animando);
    if (!animando) {
      hueso.brazoI(postura.brazoX, postura.brazoY, -postura.brazoZ);
      hueso.brazoD(postura.brazoX, -postura.brazoY, postura.brazoZ);
      hueso.anteI(postura.anteX, -postura.anteY, -postura.anteZ);
      hueso.anteD(postura.anteX, postura.anteY, postura.anteZ);
      hueso.manoI(postura.manoX, -postura.manoY, -postura.manoZ);
      hueso.manoD(postura.manoX, postura.manoY, postura.manoZ);
      curvarDedos();
    } else {
      // «Espacio de brazos» (como el ajuste Character Arm-Space de Mixamo): el muñeco de Mixamo es más estrecho
      // que el avatar con sudadera, así que con sus brazos las manos y los antebrazos se metían en el cuerpo
      abrirBrazo(huesoBrazoI, ESPACIO_BRAZOS);
      abrirBrazo(huesoBrazoD, -ESPACIO_BRAZOS);
    }
    // La mirada se suma a la animación (más suave, para no pelearse con ella)
    const m = animando ? 0.5 : 1;
    hueso.cuello((cab.x * 0.35 + 0.01 * respira) * m, cab.y * 0.4 * m, 0, animando);
    hueso.cabeza((cab.x * 0.55 + ruido(t * 0.7, 6) * 0.01) * m + gx, cab.y * 0.5 * m + gy, gz + ruido(t * 0.5, 7) * 0.015, animando);
    // Hablando, mira a cámara (entra y sale con suavidad): primero el cuello un poco, luego la cabeza
    pesoCamara += ((hablando ? 1 : 0) - pesoCamara) * Math.min(1, dt * 4);
    const charlando = hablando ? miradaCharla(ahora) : null;
    // Al mirar a un lado, la cabeza también se suelta un poco de la cámara
    pesoCabezaCamara += ((charlando?.aparte ? 0.55 : 1) - pesoCabezaCamara) * Math.min(1, dt * 5);
    if (pesoCamara > 0.01) {
      girarHaciaCamara(huesoCuello, 0.35 * pesoCamara);
      girarHaciaCamara(huesoCabeza, 0.85 * pesoCamara * pesoCabezaCamara);
    }
    // Giro de ojos contenido: el ojo es solo la parte delantera de una esfera y, si gira mucho, su borde asoma por los párpados
    let ox = MathUtils.clamp((ojo.x - cab.x) * 0.9 + cab.x * 0.3, -0.16, 0.14);
    let oy = MathUtils.clamp((ojo.y - cab.y) * 0.9 + cab.y * 0.35, -0.28, 0.28);
    // Hablando, la cabeza ya apunta a cámara: los ojos al frente, para mirarte a ti
    ox *= 1 - pesoCamara * 0.85;
    oy *= 1 - pesoCamara * 0.85;
    if (charlando) {
      // Los ojos saltan rápido (como de verdad), no se deslizan
      ojoCharla.x += (charlando.x - ojoCharla.x) * Math.min(1, dt * 25);
      ojoCharla.y += (charlando.y - ojoCharla.y) * Math.min(1, dt * 25);
    }
    ox += ojoCharla.x * pesoCamara;
    oy += ojoCharla.y * pesoCamara;
    const miradaExpresion = EXPRESIONES[expr.actual]?.ojos;
    if (miradaExpresion) {
      ox = MathUtils.lerp(ox, miradaExpresion[0], expr.peso);
      oy = MathUtils.lerp(oy, miradaExpresion[1], expr.peso);
    }
    // Límite final (también para la mirada al hablar y las expresiones): más allá, el borde del globo asoma por
    // los párpados y parece que el ojo se sale
    // Dormido: los ojos quietos en su sitio (girados, el globo asoma por el párpado cerrado)
    if (actitud === 'dormir') { ox = 0; oy = 0; }
    // Le has tocado un ojo: los aprieta mirando al frente (mirando arriba, el párpado tapaba el iris y se veía blanco)
    if (ojoTocado) { ox = 0.04; oy = 0; }
    ox = MathUtils.clamp(ox, -0.14, 0.12);
    oy = MathUtils.clamp(oy, -0.15, 0.15);  // de lado (0,28) el blanco asomaba por el rabillo del ojo
    hueso.ojoI(ox, oy, 0);
    hueso.ojoD(ox, oy, 0);

    // Parpadeo natural (a veces doble) y los párpados acompañan a la mirada
    if (ahora > proximoParpadeo) {
      parpadeo = 1;
      proximoParpadeo = ahora + (Math.random() < 0.18 ? 280 : 2400 + Math.random() * 3600);
    }
    if (parpadeo > 0) parpadeo = Math.max(0, parpadeo - dt * 6.5);
    const cierre = Math.sin(parpadeo * Math.PI);
    // Dormido: ojos cerrados del todo (con la cabeza baja la mirada sube y, si no, abría los párpados); el
    // entrecerrado junta el borde de los párpados, que con solo el parpadeo dejaba una rendija clara
    const parpados = actitud === 'dormir'
      ? { eyeBlinkLeft: 1, eyeBlinkRight: 1, eyeWideLeft: 0, eyeWideRight: 0, eyeSquintLeft: 0.6, eyeSquintRight: 0.6 }
      : { eyeBlinkLeft: cierre, eyeBlinkRight: cierre, eyeWideLeft: Math.max(0, -ox) * 0.35, eyeWideRight: Math.max(0, -ox) * 0.35 };
    // El párpado cerrado queda casi a ras del globo del ojo: visto desde arriba (cabeza baja) el ojo lo atravesaba.
    // Al cerrar, el globo se encoge en su sitio (sobre todo al final del cierre); tapado por el párpado no se nota
    if (ojoTocado && ahora < ojoTocado.hasta) {
      parpados[`eyeBlink${ojoTocado.lado}`] = 1;
      parpados[`eyeSquint${ojoTocado.lado}`] = 0.6;
    } else ojoTocado = null;
    // Cara de la reacción a un toque: pasado su rato vuelve la de antes (si nadie la ha cambiado)
    if (caraToque && ahora >= caraToque.hasta) {
      if (expr.destino === caraToque.puesta) api.expresion(caraToque.antes);
      caraToque = null;
    }
    globos.forEach((o, i) => {
      const lado = i === 0 ? 'Left' : 'Right';
      const cerrado = Math.min(1, (EXPRESIONES[expr.actual]?.formas?.[`eyeBlink${lado}`] || 0) * expr.peso + (parpados[`eyeBlink${lado}`] || 0));
      o.scale.setScalar(1 - 0.3 * cerrado ** 2);
    });

    // Expresión: transición suave entre la actual y la de destino
    if (expr.destino !== expr.actual) {
      expr.peso = Math.max(0, expr.peso - dt * 4);
      if (expr.peso === 0) expr.actual = expr.destino;
    } else {
      expr.peso += (expr.pesoDestino - expr.peso) * (1 - Math.exp(-dt * 6));
    }
    const pensar = pensando ? { browInnerUp: 0.3 + ruido(t, 8) * 0.1, browDownRight: 0.25, mouthPucker: 0.12 } : {};

    // Boca: visema manual, o habla simulada
    let destinoBoca = {};
    if (guion) {
      // Cuerpo dirigido por la IA: cada marca se dispara cuando el audio (o el ritmo de lectura) llega a su sitio
      const ahoraGuion = guion.audio ? guion.audio.currentTime : (ahora - guion.inicio) / 1000;
      while (guion.marcas.length && guion.marcas[0].t <= ahoraGuion) ejecutarMarca(guion.marcas.shift());
      // Con voz, el guion dura lo que el audio (también si se corta); sin voz, hasta la última marca
      const { audio } = guion;
      if (audio ? audio.ended || (audio.paused && audio.currentTime > 0) : !guion.marcas.length) {
        guion = null;
        if (encuadreIA) volverCamaraEn = ahora + (audio ? 1800 : 4000);
      }
    }
    if (volverCamaraEn && ahora >= volverCamaraEn) {
      volverCamaraEn = 0;
      encuadreIA = null;
      moverCamara(encuadreBase, 1300);
    }
    if (voz) {
      // La letra que suena ahora mismo en el audio (avanza desde la última, sin buscar desde el principio)
      const { audio, tiempos } = voz;
      const t = audio.currentTime;
      let i = voz.i;
      while (i < tiempos.finales.length - 1 && tiempos.finales[i] < t) i++;
      while (i > 0 && tiempos.inicios[i] > t) i--;
      voz.i = i;
      destinoBoca = audio.paused || t < tiempos.inicios[0] ? {} : VISEMAS[bocaHablando(tiempos.caracteres, i)];
    } else if (visemaManual) destinoBoca = VISEMAS[visemaManual.nombre] && Object.fromEntries(Object.entries(VISEMAS[visemaManual.nombre]).map(([kk, v]) => [kk, v * visemaManual.peso]));
    else if (hablando) {
      if (ahora > siguienteVisema) {
        indiceVisema = (indiceVisema + 1 + Math.floor(Math.random() * 3)) % SECUENCIA_HABLA.length;
        siguienteVisema = ahora + 70 + Math.random() * 90;
      }
      destinoBoca = VISEMAS[SECUENCIA_HABLA[indiceVisema]];
    }
    // Con voz real, transición más suave entre sílabas (a 22 la boca parecía nerviosa)
    const kb = 1 - Math.exp(-dt * (voz ? 13 : 22));
    for (const nombre of new Set([...Object.keys(boca.actual), ...Object.keys(destinoBoca || {})])) {
      boca.actual[nombre] = (boca.actual[nombre] || 0) + (((destinoBoca || {})[nombre] || 0) - (boca.actual[nombre] || 0)) * kb;
    }

    aplicarFormas([
      { formas: EXPRESIONES[expr.actual]?.formas || {}, peso: expr.peso },
      { formas: pensar, peso: 1 },
      { formas: boca.actual, peso: 1 },
      { formas: parpados, peso: 1 },
    ]);

    modelo.updateMatrixWorld(true);
    acc.actualizar(dt, t);

    if (viaje) {
      const k = Math.min(1, (ahora - viaje.inicio) / viaje.duracion);
      const e = k * k * (3 - 2 * k);
      camara.position.lerpVectors(viaje.desdePos, viaje.haciaPos, e);
      (controles ? controles.target : miraCamara).lerpVectors(viaje.desdeMira, viaje.haciaMira, e);
      if (!controles) camara.lookAt(miraCamara);
      camara.fov = MathUtils.lerp(viaje.desdeFov, viaje.haciaFov, e);
      camara.updateProjectionMatrix();
      if (k >= 1) viaje = null;
    }
    controles?.update();

    ajustarTamano();
    if (posproceso && habitacion?.visible) {
      // Enfoque a la altura de la cara en el sitio del avatar, no en la cabeza: al moverse o bailar cambiaría
      // en cada fotograma y obligaría a recalcular el fondo guardado
      _cab.set(modelo.position.x, 1.65, modelo.position.z);
      posproceso.render(camara.position.distanceTo(_cab));
    } else {
      renderer.render(escena, camara);
    }
  }
  cuadro = requestAnimationFrame(animar);
  alListo?.();

  // Secuencias (pasos con manos y accesorios) y actitudes (se mantienen hasta pedir otra)
  const espera = (ms) => new Promise((r) => { setTimeout(r, ms); });
  let turno = 0;
  function dejarActitud() {
    actitud = null;
    for (const a of ['corazones', 'estrellas', 'aureola', 'zzz']) acc.activar(a, false);
    acc.llorar(0);
    acc.mano('D', null);
    acc.mano('I', null);
  }
  const ACCIONES = {
    async llorar(vivo) {
      api.movimiento('triste');
      api.expresion('😭'); acc.llorar(5);
      await espera(4500); if (!vivo()) return;
      acc.llorar(0); api.expresion('😢');
      await espera(1800); if (vivo()) api.expresion('neutral');
    },
    async reir(vivo) {
      api.movimiento('reir');   // pone la cara de 😂 y, al acabar, la de antes
      acc.llorar(2.5);
      await espera(2200); if (!vivo()) return;
      acc.llorar(0);
    },
    async gafas(vivo) {
      if (!acc.gafasPuestas) {
        acc.mano('D', 'bolsillo', { velocidad: 2.4 });
        await espera(950); if (!vivo()) return;
        acc.gafas('mano');
        acc.mano('D', 'cara', { velocidad: 2.2 });
        await espera(1000); if (!vivo()) return;
        acc.gafas('cara');
        await espera(250);
        acc.mano('D', null, { velocidad: 2 });
        api.expresion('😎');
        gestoActivo = { nombre: 'ladear', inicio: performance.now(), duracion: 1500 };
      } else {
        api.expresion('neutral');
        acc.mano('D', 'cara', { velocidad: 2.4 });
        await espera(900); if (!vivo()) return;
        acc.gafas('mano');
        acc.mano('D', 'bolsillo', { velocidad: 2.2 });
        await espera(1000); if (!vivo()) return;
        acc.gafas('oculto');
        acc.mano('D', null, { velocidad: 2 });
      }
    },
    bostezar() { api.movimiento('bostezo'); },   // la animación ya se lleva la mano a la boca
    async taparse(vivo) {
      api.expresion('🤭');
      acc.mano('D', 'boca', { velocidad: 3 });
      await espera(1800); if (!vivo()) return;
      acc.mano('D', null, { velocidad: 2 });
      await espera(500); if (vivo()) api.expresion('sonrisa');
    },
    async 'cara-palma'(vivo) {
      api.expresion('🤦');
      acc.mano('D', 'frente', { velocidad: 2.8 });
      gestoActivo = { nombre: 'negar', inicio: performance.now() + 400, duracion: 1300 };
      await espera(2200); if (!vivo()) return;
      acc.mano('D', null, { velocidad: 2 });
      await espera(500); if (vivo()) api.expresion('neutral');
    },
    saludar() { api.movimiento('saludar', { veces: 3 }); },
    // Actitudes
    enamorado() { actitud = 'enamorado'; api.expresion('😍'); acc.activar('corazones', true); },
    estrellas() { actitud = 'estrellas'; api.expresion('🤩'); acc.activar('estrellas', true); },
    santo() { actitud = 'santo'; api.expresion('😇'); acc.activar('aureola', true); },
    pensativo() { actitud = 'pensativo'; api.expresion('🤔'); },   // la animación «pensar» lleva la mano a la barbilla
    dormir() { actitud = 'dormir'; api.expresion('😴'); acc.activar('zzz', true); },
    triste() { actitud = 'triste'; api.expresion('😢'); acc.llorar(0.8); },
    normal() { api.expresion('neutral'); },
  };
  function ejecutarAccion(nombre) {
    const f = ACCIONES[nombre];
    if (!f) return undefined;
    const mio = ++turno;
    if (nombre !== 'gafas') dejarActitud();
    // Las gafas taparían lo que pasa en los ojos
    if (['llorar', 'reir', 'enamorado', 'estrellas', 'dormir', 'triste', 'cara-palma'].includes(nombre)) acc.quitarGafasYa();
    return f(() => mio === turno);
  }

  // Entorno: fondo liso (transparente, se ve el de la página) o la habitación del setup
  function ponerEntorno(nombre) {
    const enHabitacion = nombre === 'habitacion';
    if (enHabitacion && !habitacion) {
      habitacion = crearHabitacion(escena);
      posproceso = crearPosproceso(renderer, escena, camara, habitacion);
      posproceso.tamano(canvas.clientWidth, canvas.clientHeight);
    }
    principal.castShadow = enHabitacion;
    if (habitacion) habitacion.visible = enHabitacion;
    escena.background = enHabitacion ? new Color(0x0e1112) : null;
    retrato.visible = enHabitacion;
    // En la habitación la sudadera blanca se veía demasiado blanca y brillante: crema apagado, mate, y recibe
    // sombra (los brazos y pliegues sobre el cuerpo)
    modelo.traverse((o) => {
      if (!o.isMesh || !/sudadera/i.test(o.name)) return;
      if (enHabitacion) o.material.color.setRGB(0.4, 0.355, 0.285);
      else o.material.color.setScalar(1);
      o.material.roughness = enHabitacion ? 1 : 0.5;
      o.receiveShadow = enHabitacion;
    });
    renderer.toneMappingExposure = enHabitacion ? 0.84 : 0.95;   // la foto es oscura y con ambiente
    // En la habitación, luz más tenue y cálida (manda la lámpara y el resplandor de los monitores)
    cielo.intensity = enHabitacion ? 0.5 : 1.1;
    cielo.color.set(enHabitacion ? 0xf6f1ec : 0xeaf4ff);
    ambiente.intensity = enHabitacion ? 0.1 : 0.25;
    principal.intensity = enHabitacion ? 1.3 : 2.4;
    principal.color.set(enHabitacion ? 0xffe2c4 : 0xfff1e0);
    contra.intensity = enHabitacion ? 0.6 : 1.6;
    contra.color.set(enHabitacion ? 0x8fe3dc : 0xcfe6ff);
  }
  if (entorno !== 'liso') ponerEntorno(entorno);

  // Una marca de la IA: cara (se queda), gesto de cabeza, gesto de cuerpo entero o acción con las manos
  // Viaje suave de la cámara a un encuadre (con o sin controles de ratón)
  function moverCamara(nombre, duracion = 650) {
    const [p2, m2, f2] = ENCUADRES[nombre] || ENCUADRES.busto;
    viaje = {
      inicio: performance.now(), duracion, desdePos: camara.position.clone(), haciaPos: new Vector3(...p2),
      desdeMira: (controles ? controles.target : miraCamara).clone(), haciaMira: new Vector3(...m2), desdeFov: camara.fov, haciaFov: f2,
    };
  }

  function ejecutarMarca({ tipo, valor }) {
    if (tipo === 'cara') api.expresion(valor, valor === 'neutral' ? 1 : 0.85);
    else if (tipo === 'gesto') api.gesto(valor);
    else if (tipo === 'cuerpo') api.movimiento(valor);
    else if (tipo === 'accion') api.accion(valor);
    else if (tipo === 'camara' && camaraIA && valor !== (encuadreIA || encuadreBase)) {
      // La IA acerca o aleja la cámara para enfatizar o enseñar algo; al acabar de hablar vuelve sola
      encuadreIA = valor;
      moverCamara(valor, 1100);
    }
  }

  const api = {
    entorno: ponerEntorno,
    pensar(v) { pensando = v; },
    escuchar(v) { escuchando = v; },
    // Gesto de cuerpo con su cara; veces: cuántas veces se repite (saludar con la mano, por ejemplo)
    async movimiento(nombre, { veces = 1 } = {}) {
      const cara = CARAS[nombre];
      if (cara) {
        director.cara = { antes: expr.destino === cara ? 'neutral' : expr.destino, puesta: cara };
        api.expresion(cara);
      }
      director.gesto = await reproducir(nombre, { bucle: false, fundido: 0.45, veces }).catch(() => null);
    },
    hablar(v) { hablando = v; if (!v) { visemaManual = null; voz = null; } },
    // Lo que la IA quiere hacer mientras habla: [{ tipo, valor, pos, posVoz }] (ver public/_lib/cuerpo.php).
    // Con voz, cada marca suena en su carácter del audio (inicios: segundo en que empieza cada carácter del texto
    // hablado); sin voz, al ritmo de lectura de la respuesta escrita
    marcas(lista, { audio = null, inicios = null } = {}) {
      volverCamaraEn = 0;
      if (!lista?.length && !audio) { guion = null; return; }
      lista = lista || [];
      const enSegundos = (m) => (audio && inicios?.length
        ? inicios[Math.min(m.posVoz, inicios.length - 1)] ?? 0
        : m.pos * SEGUNDOS_POR_LETRA);
      guion = { marcas: lista.map((m) => ({ ...m, t: enSegundos(m) })).sort((a, b) => a.t - b.t), audio, inicio: performance.now() };
    },
    // Habla con la voz real: la boca sigue al audio (que reproduce quien llama) hasta que acaba
    hablarCon(audio, tiempos) {
      if (!tiempos?.inicios?.length) { hablando = true; audio.addEventListener('ended', () => { hablando = false; }, { once: true }); return; }
      voz = { audio, tiempos, i: 0 };
      hablando = true;
      const acabar = () => { if (voz?.audio === audio) { voz = null; hablando = false; } };
      audio.addEventListener('ended', acabar, { once: true });
      audio.addEventListener('error', acabar, { once: true });
    },
    visema(nombre, peso = 1) { visemaManual = nombre ? { nombre, peso } : null; },
    expresion(nombre = 'neutral', peso = 1) {
      expr.destino = nombre;
      expr.pesoDestino = peso;
      const gesto = EXPRESIONES[nombre]?.gesto;
      if (gesto) gestoActivo = { nombre: gesto[0], inicio: performance.now(), duracion: gesto[1] };
    },
    gesto(nombre, duracion = 1100) { gestoActivo = { nombre, inicio: performance.now(), duracion }; },
    accion(nombre) { return ejecutarAccion(nombre); },
    mirada(modo) { modoMirada = modo; ultimoMovimiento = performance.now(); },
    camara(nombre) {
      encuadreBase = nombre;
      encuadreIA = null;
      volverCamaraEn = 0;
      moverCamara(nombre);
    },
    tocar,
    tamanoFijo(medida) {
      tamanoFijo = medida;
      // Fijo: el lienzo mide eso y va centrado en su caja; suelto, vuelve a ocupar la caja
      Object.assign(canvas.style, medida
        ? { width: `${medida[0]}px`, height: `${medida[1]}px`, inset: 'auto', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
        : { width: '', height: '', inset: '', left: '', top: '', transform: '' });
      ajustarTamano();
    },
    alTocar: null,
    camaraAuto(activa) {
      camaraIA = activa;
      if (controles) controles.enabled = !activa;
      if (!activa && encuadreIA) { encuadreIA = null; volverCamaraEn = 0; moverCamara(encuadreBase); }
    },
    // Banco de pruebas: cualquier animación suena una vez (con su cara) y vuelve sola al reposo con un fundido
    async animar(nombre, opciones = {}) {
      await api.movimiento(nombre, opciones);
    },
    parar() {
      mezclador.stopAllAction();
      accion = null;
      Object.assign(director, { gesto: null, base: null, nombreBase: null, accionBase: null });
    },
    destruir() {
      cancelAnimationFrame(cuadro);
      window.removeEventListener('pointermove', alMover);
      window.removeEventListener('pointerdown', alMover);
      canvas.removeEventListener('pointerdown', alApoyar);
      canvas.removeEventListener('pointerup', alSoltar);
      controles?.dispose();
      posproceso?.destruir();
      renderer.dispose();
    },
  };
  return api;
}

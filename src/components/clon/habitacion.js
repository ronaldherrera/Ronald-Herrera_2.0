// La habitación del setup de Ronald (la foto del Lab) en 3D: pared gris azulado, suelo de tablas, carril de focos,
// cuadro de la moto, escritorio de nogal con elevador, dos monitores con brazo, barra de luz, lámpara Edison,
// altavoces, reloj, amplificador, auriculares, silla ergonómica y planta de hojas grandes.
// La luz sale de los propios objetos (bombilla, pantallas, tira LED, focos) y todo proyecta sombra.
// El avatar queda de pie delante del escritorio (z = 0).
import {
  AdditiveBlending, CanvasTexture, CatmullRomCurve3, CircleGeometry, Color, CylinderGeometry, DoubleSide, Group,
  InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, PointLight, RectAreaLight,
  RepeatWrapping, SphereGeometry, SpotLight, SRGBColorSpace, TextureLoader, TorusGeometry, TubeGeometry, Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

const RUTA = '/avatar/habitacion/';
const PARED_Z = -1.65;
const ALTO = 2.7;

// Generador pseudoaleatorio con semilla: la habitación sale igual cada vez
let semilla = 7;
const azar = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };

function lienzo(ancho, alto, pintar, color = true) {
  const c = document.createElement('canvas');
  c.width = ancho; c.height = alto;
  pintar(c.getContext('2d'), ancho, alto);
  const t = new CanvasTexture(c);
  if (color) t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Vetas de madera a lo largo de x
function vetas(g, x, y, w, h, densidad) {
  for (let v = 0; v < densidad; v++) {
    const y0 = y + azar() * h;
    const amp = 1 + azar() * 4;
    const fase = azar() * 6;
    g.strokeStyle = `rgba(${azar() < 0.5 ? '15,7,2' : '120,80,45'}, ${0.04 + azar() * 0.1})`;
    g.lineWidth = 0.6 + azar() * 1.8;
    g.beginPath();
    for (let px = 0; px <= w; px += 16) {
      const py = y0 + Math.sin(px / (60 + amp * 20) + fase) * amp;
      if (px === 0) g.moveTo(x + px, py); else g.lineTo(x + px, py);
    }
    g.stroke();
  }
}

// Suelo de tablas oscuras con juntas al tresbolillo
function texturaSuelo() {
  const t = lienzo(1024, 1024, (g, w, h) => {
    const filas = 8;
    const alto = h / filas;
    for (let f = 0; f < filas; f++) {
      const y = f * alto;
      let x = -azar() * w * 0.5;
      while (x < w) {
        const largo = w * (0.45 + azar() * 0.4);
        const b = 46 + azar() * 22;
        g.fillStyle = `rgb(${b + 18}, ${b - 4}, ${b - 22})`;
        g.fillRect(x, y, largo, alto);
        g.save();
        g.beginPath(); g.rect(x, y, largo, alto); g.clip();
        vetas(g, x, y, largo, alto, 26);
        g.restore();
        g.fillStyle = 'rgba(8, 4, 1, 0.75)';
        g.fillRect(x, y, 2, alto);
        x += largo;
      }
      g.fillStyle = 'rgba(8, 4, 1, 0.8)';
      g.fillRect(0, y, w, 2);
    }
  });
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(3.75, 3.75);   // tablas de unos 20 cm
  return t;
}

// Nogal del escritorio, vetas largas
function texturaNogal() {
  const t = lienzo(1024, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#5b3620'); grad.addColorStop(0.5, '#4a2b18'); grad.addColorStop(1, '#5a341d');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    vetas(g, 0, 0, w, h, 140);
  });
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

// Pintura mate con manchas suaves (también sirve de relieve)
function texturaPared() {
  const t = lienzo(512, 512, (g, w, h) => {
    g.fillStyle = '#222c2d';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = azar() * w; const y = azar() * h; const r = 30 + azar() * 90;
      const m = g.createRadialGradient(x, y, 0, x, y, r);
      m.addColorStop(0, `rgba(${azar() < 0.5 ? '255,255,255' : '0,0,0'}, ${0.02 + azar() * 0.03})`);
      m.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = m;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `rgba(${azar() < 0.5 ? '255,255,255' : '0,0,0'}, ${azar() * 0.05})`;
      g.fillRect(azar() * w, azar() * h, 1.5, 1.5);
    }
  });
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(3, 1.6);
  return t;
}

// Degradado radial (resplandores y sombras de contacto)
function mancha(color, tam, aditivo = true) {
  const t = lienzo(128, 128, (g) => {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  });
  const m = new Mesh(new PlaneGeometry(tam[0], tam[1]), new MeshBasicMaterial({
    map: t, transparent: true, depthWrite: false, ...(aditivo ? { blending: AdditiveBlending } : {}),
  }));
  m.userData.sinSombra = true;
  return m;
}

// Sombra de contacto en el suelo
function sombraSuelo(x, z, ancho, fondo, opacidad = 0.55) {
  const s = mancha(`rgba(0,0,0,${opacidad})`, [ancho, fondo], false);
  s.rotation.x = -Math.PI / 2;
  s.position.set(x, 0.003, z);
  return s;
}

// Hoja alargada con nervio central, curvada hacia fuera
function geometriaHoja(largo, ancho) {
  const geo = new PlaneGeometry(ancho, largo, 6, 14);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = Math.min(1, Math.max(0, p.getY(i) / largo + 0.5));   // el redondeo de float32 puede dar -0.0000001
    const perfil = Math.max(0.04, Math.sin(Math.PI * Math.min(0.97, v)) ** 0.75 * (1 - 0.25 * v));
    const x = p.getX(i) * perfil;
    p.setXYZ(i, x, v * largo, Math.abs(x) * 0.45 + v * v * largo * 0.32);
  }
  geo.computeVertexNormals();
  return geo;
}

const redonda = (w, h, d, r, mat) => new Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);

export function crearHabitacion(escena) {
  RectAreaLightUniformsLib.init();
  semilla = 7;
  const g = new Group();
  const cargar = new TextureLoader();
  const imagen = (nombre) => { const t = cargar.load(RUTA + nombre); t.colorSpace = SRGBColorSpace; t.anisotropy = 4; return t; };

  const pared = texturaPared();
  const nogal = texturaNogal();
  const est = (o) => new MeshStandardMaterial({ envMapIntensity: 0.35, ...o });
  const mat = {
    pared: est({ map: pared, bumpMap: pared, bumpScale: 0.6, roughness: 0.92, envMapIntensity: 0.15 }),
    suelo: est({ map: texturaSuelo(), roughness: 0.55, envMapIntensity: 0.5 }),
    techo: est({ color: 0x1e2324, roughness: 1 }),
    nogal: est({ map: nogal, bumpMap: nogal, bumpScale: 0.4, roughness: 0.42, envMapIntensity: 0.55 }),
    negro: est({ color: 0x111112, roughness: 0.38, metalness: 0.55 }),
    negroMate: est({ color: 0x18181a, roughness: 0.85 }),
    tela: est({ color: 0x1b1c1e, roughness: 0.95, envMapIntensity: 0.1 }),
    malla: est({ color: 0x161719, roughness: 0.9, side: DoubleSide, envMapIntensity: 0.1 }),
    blanco: est({ color: 0xdedbd4, roughness: 0.38 }),
    aluminio: est({ color: 0xb9bcc0, roughness: 0.28, metalness: 0.9 }),
    gris: est({ color: 0x2e2f33, roughness: 0.6, metalness: 0.2 }),
    cono: est({ color: 0x0c0c0d, roughness: 0.55 }),
    maceta: est({ color: 0x2a2826, roughness: 0.75 }),
  };

  // --- Habitación ---
  const suelo = new Mesh(new PlaneGeometry(7, 7), mat.suelo);
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.set(0, 0, 1.6);
  const fondo = new Mesh(new PlaneGeometry(7, ALTO), mat.pared);
  fondo.position.set(0, ALTO / 2, PARED_Z);
  const izq = new Mesh(new PlaneGeometry(7, ALTO), mat.pared);
  izq.rotation.y = Math.PI / 2;
  izq.position.set(-2.6, ALTO / 2, 1.6);
  const dcha = izq.clone();
  dcha.rotation.y = -Math.PI / 2;
  dcha.position.x = 2.6;
  const techo = new Mesh(new PlaneGeometry(7, 7), mat.techo);
  techo.rotation.x = Math.PI / 2;
  techo.position.set(0, ALTO, 1.6);
  const rodapie = redonda(5.2, 0.07, 0.016, 0.004, mat.negroMate);
  rodapie.position.set(0, 0.035, PARED_Z + 0.008);
  for (const m of [suelo, fondo, izq, dcha, techo]) m.userData.soloRecibe = true;
  g.add(suelo, fondo, izq, dcha, techo, rodapie);
  // Penumbra donde la pared se junta con el suelo
  const zocalo = new Mesh(new PlaneGeometry(5.2, 0.5), new MeshBasicMaterial({
    transparent: true, depthWrite: false,
    map: lienzo(4, 128, (c, w, h) => {
      const grad = c.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.55)');
      c.fillStyle = grad; c.fillRect(0, 0, w, h);
    }),
  }));
  zocalo.position.set(0, 0.25, PARED_Z + 0.003);
  zocalo.userData.sinSombra = true;
  g.add(zocalo);

  // --- Carril de focos en el techo ---
  const carril = redonda(3.4, 0.03, 0.045, 0.01, mat.blanco);
  carril.position.set(0, ALTO - 0.02, -0.9);
  g.add(carril);
  const lente = new MeshBasicMaterial({ color: new Color(22, 20, 17) });
  for (const x of [-1.1, 0, 1.1]) {
    const foco = new Group();
    const brazo = new Mesh(new CylinderGeometry(0.01, 0.01, 0.07), mat.blanco);
    brazo.position.y = -0.035;
    const cuerpo = new Group();
    const lata = new Mesh(new CylinderGeometry(0.034, 0.034, 0.12, 24), mat.blanco);
    const luz = new Mesh(new CircleGeometry(0.027, 24), lente);
    luz.rotation.x = Math.PI / 2;
    luz.position.y = -0.061;
    luz.userData.sinSombra = true;
    cuerpo.add(lata, luz);
    cuerpo.rotation.x = 0.75;   // apuntan a la pared
    cuerpo.position.set(0, -0.1, -0.03);
    foco.add(brazo, cuerpo);
    foco.position.set(x, ALTO - 0.03, -0.9);
    g.add(foco);
  }

  // --- Cuadro de la moto ---
  const marco = redonda(1.5, 0.92, 0.035, 0.006, mat.negro);
  marco.position.set(0.15, 1.98, PARED_Z + 0.02);
  const cuadro = new Mesh(new PlaneGeometry(1.44, 0.86), est({ map: imagen('cuadro.webp'), roughness: 0.6, envMapIntensity: 0.2 }));
  cuadro.position.set(0.15, 1.98, PARED_Z + 0.0385);
  g.add(marco, cuadro);

  // --- Escritorio de nogal con patas negras ---
  const mesa = new Group();
  const tablero = redonda(1.8, 0.038, 0.74, 0.012, mat.nogal);
  tablero.position.y = 0.74;
  mesa.add(tablero);
  for (const x of [-0.8, 0.8]) {
    const pata = redonda(0.07, 0.7, 0.05, 0.01, mat.negroMate);
    pata.position.set(x, 0.37, -0.08);
    const pie = redonda(0.07, 0.03, 0.66, 0.01, mat.negroMate);
    pie.position.set(x, 0.015, -0.08);
    mesa.add(pata, pie);
  }
  const travesano = redonda(1.55, 0.05, 0.04, 0.008, mat.negroMate);
  travesano.position.set(0, 0.68, -0.22);
  mesa.add(travesano);

  // Elevador de monitores
  const elevador = redonda(1.34, 0.026, 0.24, 0.006, mat.nogal);
  elevador.position.set(0, 0.875, -0.22);
  mesa.add(elevador);
  for (const x of [-0.6, 0.6]) {
    const soporte = redonda(0.03, 0.11, 0.2, 0.004, mat.negroMate);
    soporte.position.set(x, 0.81, -0.22);
    mesa.add(soporte);
  }
  // Mini PC bajo el elevador
  const miniPc = redonda(0.42, 0.05, 0.16, 0.006, mat.gris);
  miniPc.position.set(0, 0.785, -0.22);
  mesa.add(miniPc);

  // Alfombrilla, teclado (con teclas) y ratón
  const alfombrilla = redonda(0.92, 0.005, 0.34, 0.0015, mat.tela);
  alfombrilla.position.set(0.02, 0.761, 0.1);
  const teclado = redonda(0.38, 0.018, 0.13, 0.006, mat.negro);
  teclado.position.set(-0.06, 0.772, 0.09);
  const teclas = new InstancedMesh(new RoundedBoxGeometry(0.019, 0.01, 0.019, 1, 0.003), mat.negroMate, 75);
  const mtx = new Matrix4();
  let n = 0;
  for (let fila = 0; fila < 5; fila++) {
    for (let col = 0; col < 15; col++) {
      mtx.makeTranslation(-0.06 - 0.168 + col * 0.024, 0.784, 0.09 - 0.048 + fila * 0.024);
      teclas.setMatrixAt(n++, mtx);
    }
  }
  const raton = new Mesh(new SphereGeometry(0.034, 20, 12), mat.negro);
  raton.scale.set(0.85, 0.42, 1.3);
  raton.position.set(0.3, 0.774, 0.1);
  mesa.add(alfombrilla, teclado, teclas, raton);

  // Soporte de portátil (aluminio) y amplificador con rueda
  const atril = redonda(0.2, 0.007, 0.17, 0.002, mat.aluminio);
  atril.position.set(-0.36, 0.91, -0.2);
  atril.rotation.x = -0.35;
  const dac = redonda(0.16, 0.05, 0.12, 0.006, mat.gris);
  dac.position.set(0.35, 0.913, -0.18);
  const rueda = new Mesh(new CylinderGeometry(0.014, 0.014, 0.012, 20), mat.aluminio);
  rueda.rotation.x = Math.PI / 2;
  rueda.position.set(0.39, 0.913, -0.117);
  mesa.add(atril, dac, rueda);

  // Monitores con brazo doble
  const pantallas = [];
  const poste = new Mesh(new CylinderGeometry(0.016, 0.016, 0.2, 16), mat.negro);
  poste.position.set(0, 0.99, -0.31);
  mesa.add(poste);
  for (const [x, foto] of [[-0.325, 'monitor-izq.webp'], [0.325, 'monitor-der.webp']]) {
    const monitor = new Group();
    const carcasa = redonda(0.645, 0.38, 0.022, 0.006, mat.negro);
    const trasera = redonda(0.4, 0.24, 0.03, 0.02, mat.negro);
    trasera.position.z = -0.02;
    const pantalla = new Mesh(new PlaneGeometry(0.63, 0.357), new MeshBasicMaterial({ map: imagen(foto), color: new Color(1.05, 1.05, 1.05) }));
    pantalla.position.set(0, 0.004, 0.0115);
    pantalla.userData.sinSombra = true;
    monitor.add(carcasa, trasera, pantalla);
    monitor.position.set(x, 1.2, -0.26);
    monitor.rotation.y = -x * 0.18;
    const brazo = redonda(0.3, 0.03, 0.035, 0.01, mat.negro);
    brazo.position.set(x / 2, 1.09, -0.3);
    brazo.rotation.z = x > 0 ? 0.35 : -0.35;
    mesa.add(monitor, brazo);
    pantallas.push(pantalla);
  }
  // Barra de luz sobre los monitores (la parte de abajo brilla)
  const barra = redonda(0.6, 0.022, 0.05, 0.008, mat.negro);
  barra.position.set(0, 1.405, -0.24);
  const ledBarra = new Mesh(new PlaneGeometry(0.56, 0.02), new MeshBasicMaterial({ color: new Color(12, 11, 9.5) }));
  ledBarra.rotation.x = Math.PI / 2;
  ledBarra.position.set(0, 1.393, -0.235);
  ledBarra.userData.sinSombra = true;
  const pinza = redonda(0.02, 0.06, 0.04, 0.005, mat.negro);
  pinza.position.set(0, 1.39, -0.27);
  mesa.add(barra, ledBarra, pinza);

  // Lámpara Edison: base de madera, casquillo negro y bombilla con filamento
  const baseLampara = new Mesh(new CylinderGeometry(0.052, 0.058, 0.045, 28), mat.nogal);
  baseLampara.position.set(-0.75, 0.78, -0.14);
  const tubo = new Mesh(new CylinderGeometry(0.02, 0.02, 0.07, 18), mat.nogal);
  tubo.position.set(-0.75, 0.835, -0.14);
  const casquillo = new Mesh(new CylinderGeometry(0.019, 0.016, 0.035, 18), mat.negro);
  casquillo.position.set(-0.75, 0.885, -0.14);
  const cristal = new Mesh(new SphereGeometry(0.048, 28, 20), new MeshBasicMaterial({ color: new Color(2.6, 0.95, 0.22) }));
  cristal.scale.set(1, 1.12, 1);
  cristal.position.set(-0.75, 0.948, -0.14);
  const filamento = new Mesh(new SphereGeometry(0.018, 14, 10), new MeshBasicMaterial({ color: new Color(15, 6.5, 1.6) }));
  filamento.scale.set(0.7, 1.4, 0.7);
  filamento.position.copy(cristal.position);
  cristal.userData.sinSombra = true;
  filamento.userData.sinSombra = true;
  mesa.add(baseLampara, tubo, casquillo, cristal, filamento);

  // Altavoces (negro a la izquierda, blanco con lateral de madera a la derecha)
  for (const x of [-0.56, 0.56]) {
    const izquierdo = x < 0;
    const altavoz = redonda(0.14, 0.22, 0.17, 0.01, izquierdo ? mat.negro : mat.blanco);
    altavoz.position.set(x, 0.905, -0.1);
    const woofer = new Mesh(new CylinderGeometry(0.046, 0.03, 0.012, 32), mat.cono);
    woofer.rotation.x = Math.PI / 2;
    woofer.position.set(0, -0.035, 0.083);
    const aro = new Mesh(new TorusGeometry(0.048, 0.005, 10, 32), izquierdo ? mat.aluminio : mat.gris);
    aro.position.set(0, -0.035, 0.087);
    const tweeter = new Mesh(new SphereGeometry(0.016, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat.cono);
    tweeter.rotation.x = Math.PI / 2;
    tweeter.position.set(0, 0.06, 0.084);
    altavoz.add(woofer, aro, tweeter);
    if (!izquierdo) {
      const lateral = redonda(0.005, 0.2, 0.15, 0.0015, mat.nogal);
      lateral.position.set(0.071, 0, 0);
      altavoz.add(lateral);
    }
    const peana = redonda(0.15, 0.025, 0.16, 0.006, mat.blanco);
    peana.position.set(x, 0.772, -0.1);
    peana.rotation.x = -0.06;
    mesa.add(altavoz, peana);
  }

  // Reloj «12:07»
  const reloj = redonda(0.15, 0.085, 0.045, 0.008, mat.negro);
  reloj.position.set(0.22, 0.93, -0.17);
  const digitos = new Mesh(new PlaneGeometry(0.13, 0.065), new MeshBasicMaterial({
    color: new Color(7, 7.6, 8.4),
    transparent: true,
    map: lienzo(256, 128, (c, w, h) => {
      c.fillStyle = '#e8f6ff'; c.font = 'bold 86px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('12:07', w / 2, h / 2 + 4);
    }),
  }));
  digitos.position.set(0, 0, 0.0231);
  digitos.userData.sinSombra = true;
  reloj.add(digitos);
  mesa.add(reloj);

  // Auriculares en su soporte de madera
  const baseAuris = redonda(0.13, 0.02, 0.09, 0.006, mat.nogal);
  baseAuris.position.set(0.76, 0.769, -0.1);
  const soporteAuris = new Mesh(new CylinderGeometry(0.007, 0.007, 0.25, 12), mat.negro);
  soporteAuris.position.set(0.76, 0.895, -0.1);
  const diadema = new Mesh(new TorusGeometry(0.085, 0.013, 12, 36, Math.PI), mat.tela);
  diadema.position.set(0.76, 0.95, -0.1);
  diadema.rotation.y = Math.PI / 2;
  mesa.add(baseAuris, soporteAuris, diadema);
  for (const z of [-0.185, -0.015]) {
    const almohadilla = new Mesh(new CylinderGeometry(0.048, 0.048, 0.04, 28), mat.tela);
    almohadilla.rotation.x = Math.PI / 2;
    almohadilla.scale.set(1, 1, 1.25);
    almohadilla.position.set(0.76, 0.92, z);
    mesa.add(almohadilla);
  }

  // Cable rizado colgando bajo la mesa
  const espiral = [];
  for (let i = 0; i <= 260; i++) {
    const a = i * 0.45;
    espiral.push(new Vector3(0.7 + Math.cos(a) * 0.012, 0.72 - i * 0.0018, 0.25 + Math.sin(a) * 0.012));
  }
  mesa.add(new Mesh(new TubeGeometry(new CatmullRomCurve3(espiral), 520, 0.0025, 5), mat.negroMate));

  mesa.position.set(0.15, 0, PARED_Z + 0.42);
  g.add(mesa);
  g.add(sombraSuelo(0.15, PARED_Z + 0.42, 2.1, 1.0, 0.6));

  // --- Silla ergonómica de malla (de lado, a la izquierda) ---
  const silla = new Group();
  const arco = (r, a0, a1, y, z0) => {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const a = a0 + ((a1 - a0) * i) / 12;
      pts.push(new Vector3(r * Math.sin(a), y, r * Math.cos(a) + z0));
    }
    return pts;
  };
  const respaldoGeo = new CylinderGeometry(0.42, 0.42, 0.58, 20, 1, true, Math.PI - 0.6, 1.2);
  const respaldo = new Mesh(respaldoGeo, mat.malla);
  respaldo.position.set(0, 0.92, 0.17);
  respaldo.rotation.x = -0.1;
  silla.add(respaldo);
  for (const y of [0.63, 1.21]) {
    silla.add(new Mesh(new TubeGeometry(new CatmullRomCurve3(arco(0.425, Math.PI - 0.6, Math.PI + 0.6, y, 0.17 + (y - 0.92) * 0.1)), 24, 0.013, 8), mat.negro));
  }
  for (const s of [-1, 1]) {
    const lado = redonda(0.025, 0.6, 0.03, 0.01, mat.negro);
    lado.position.set(Math.sin(Math.PI + s * 0.6) * 0.425, 0.92, Math.cos(Math.PI + s * 0.6) * 0.425 + 0.17);
    lado.rotation.x = -0.1;
    silla.add(lado);
  }
  const cabecero = new Mesh(new CylinderGeometry(0.3, 0.3, 0.13, 16, 1, true, Math.PI - 0.5, 1.0), mat.tela);
  cabecero.position.set(0, 1.37, 0.03);
  const varillaCab = redonda(0.03, 0.18, 0.02, 0.008, mat.negro);
  varillaCab.position.set(0, 1.25, -0.26);
  silla.add(cabecero, varillaCab);
  const asiento = redonda(0.5, 0.075, 0.48, 0.03, mat.tela);
  asiento.position.set(0, 0.5, 0.02);
  const bajoAsiento = redonda(0.3, 0.05, 0.3, 0.01, mat.negro);
  bajoAsiento.position.set(0, 0.445, 0.02);
  const columna = new Mesh(new CylinderGeometry(0.025, 0.03, 0.34, 18), mat.negro);
  columna.position.y = 0.26;
  silla.add(asiento, bajoAsiento, columna);
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    const pata = redonda(0.3, 0.035, 0.045, 0.012, mat.negro);
    pata.position.set(Math.cos(a) * 0.15, 0.085, Math.sin(a) * 0.15);
    pata.rotation.y = -a;
    const rueda = new Mesh(new CylinderGeometry(0.025, 0.025, 0.03, 16), mat.negroMate);
    rueda.rotation.z = Math.PI / 2;
    rueda.position.set(Math.cos(a) * 0.29, 0.03, Math.sin(a) * 0.29);
    silla.add(pata, rueda);
  }
  for (const x of [-0.27, 0.27]) {
    const brazoSilla = redonda(0.03, 0.2, 0.03, 0.01, mat.negro);
    brazoSilla.position.set(x, 0.6, -0.02);
    const apoyo = redonda(0.07, 0.03, 0.26, 0.012, mat.tela);
    apoyo.position.set(x, 0.71, 0.01);
    silla.add(brazoSilla, apoyo);
  }
  silla.position.set(-0.98, 0, -0.62);
  silla.rotation.y = 1.05;
  g.add(silla, sombraSuelo(-0.98, -0.62, 0.9, 0.9, 0.5));

  // --- Planta de hojas grandes (ave del paraíso) ---
  const planta = new Group();
  const maceta = new Mesh(new CylinderGeometry(0.19, 0.15, 0.4, 32), mat.maceta);
  maceta.position.y = 0.2;
  const tierra = new Mesh(new CircleGeometry(0.18, 24), est({ color: 0x1a120b, roughness: 1 }));
  tierra.rotation.x = -Math.PI / 2;
  tierra.position.y = 0.38;
  planta.add(maceta, tierra);
  for (let i = 0; i < 11; i++) {
    const verde = new Color().setHSL(0.27 + azar() * 0.06, 0.38 + azar() * 0.2, 0.13 + azar() * 0.08);
    const matHoja = est({ color: verde, roughness: 0.55, side: DoubleSide, envMapIntensity: 0.3 });
    const alto = 0.55 + azar() * 0.75;
    const tallo = new Group();
    const varilla = new Mesh(new CylinderGeometry(0.006, 0.009, alto, 8), matHoja);
    varilla.position.y = alto / 2;
    const hoja = new Mesh(geometriaHoja(0.5 + azar() * 0.25, 0.2 + azar() * 0.08), matHoja);
    hoja.position.y = alto;
    hoja.rotation.x = -0.15;
    tallo.add(varilla, hoja);
    tallo.rotation.set(0.12 + azar() * 0.4, (i / 11) * Math.PI * 2 + azar() * 0.4, 0, 'YXZ');
    tallo.position.y = 0.36;
    planta.add(tallo);
  }
  planta.position.set(-1.35, 0, PARED_Z + 0.32);
  g.add(planta, sombraSuelo(-1.35, PARED_Z + 0.32, 0.8, 0.6, 0.5));

  // --- Luz ---
  // Resplandores suaves en la pared (complementan a las luces de área)
  const turquesa = mancha('rgba(70, 215, 205, 0.4)', [2.0, 1.0]);
  turquesa.position.set(0.15, 1.2, PARED_Z + 0.04);
  const calido = mancha('rgba(255, 165, 80, 0.24)', [1.4, 1.2]);
  calido.position.set(-0.6, 1.0, PARED_Z + 0.042);
  const bajoBarra = mancha('rgba(255, 210, 160, 0.22)', [1.1, 0.35]);
  bajoBarra.position.set(0.15, 1.5, PARED_Z + 0.043);
  g.add(turquesa, calido, bajoBarra);

  // Bombilla: luz cálida real
  const bombillaLuz = new PointLight(0xff9a40, 1.5, 4, 2);
  bombillaLuz.position.set(-0.6, 0.98, PARED_Z + 0.3);
  // Tira LED detrás de los monitores, hacia la pared
  const led = new RectAreaLight(0x40e0d0, 7, 1.1, 0.25);
  led.position.set(0.15, 1.18, PARED_Z + 0.2);
  led.lookAt(0.15, 1.18, PARED_Z);
  // Las pantallas iluminan la mesa y la espalda del avatar
  const pantallaLuz = new RectAreaLight(0x9fc4ff, 1.6, 1.25, 0.36);
  pantallaLuz.position.set(0.15, 1.2, PARED_Z + 0.2);
  pantallaLuz.lookAt(0.15, 1.1, 1);
  // Barra de luz: hacia abajo, sobre el teclado
  const barraLuz = new RectAreaLight(0xffe2c0, 3, 0.56, 0.05);
  barraLuz.position.set(0.15, 1.39, PARED_Z + 0.185);
  barraLuz.lookAt(0.15, 0.7, PARED_Z + 0.5);
  g.add(bombillaLuz, led, pantallaLuz, barraLuz);
  // La tira LED (mira a la pared), las pantallas (alumbran la mesa y la espalda) y la barra (mira al teclado)
  // apenas llegan a lo que se ve del avatar: solo cuentan para el fondo
  for (const luz of [led, pantallaLuz, barraLuz]) luz.userData.soloFondo = true;
  // Focos del techo sobre el cuadro
  for (const x of [-0.55, 0.85]) {
    const foco = new SpotLight(0xfff0d8, 2.6, 4.5, 0.42, 0.85, 1.4);
    foco.position.set(x, ALTO - 0.15, -0.9);
    foco.target.position.set(x * 0.55 + 0.1, 1.85, PARED_Z);
    foco.userData.soloFondo = true;   // apuntan al cuadro
    g.add(foco, foco.target);
  }

  // Sombras: los muebles proyectan y reciben; paredes y suelo solo reciben
  g.traverse((o) => {
    if (!o.isMesh || o.userData.sinSombra) return;
    o.receiveShadow = true;
    o.castShadow = !o.userData.soloRecibe;
  });

  escena.add(g);
  g.userData.pantallas = pantallas;
  return g;
}

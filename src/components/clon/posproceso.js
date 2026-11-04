// Acabado de cámara para la habitación: halo en las luces (bombilla, focos, pantallas), fondo desenfocado
// como en el modo retrato de una videollamada y una viñeta suave. Solo se usa con el entorno «habitacion».
//
// El desenfoque solo toca la habitación: se pinta el fondo sin el avatar, se desenfoca y el avatar se pinta
// nítido encima. Si se desenfocara la escena entera, el borde del avatar se emborronaba y la sudadera blanca
// dejaba un halo sobre la pared.
//
// Para que pese poco: la habitación no se mueve, así que el fondo (habitación + desenfoque + halo + viñeta) se
// calcula una vez, se guarda y se pone como imagen de fondo de la escena; solo se rehace cuando se mueve la
// cámara o cambia el tamaño. En cada fotograma se dibuja el avatar directamente en pantalla, igual que con el
// fondo liso, sin pasadas de imagen completa, y sin las luces y sombras que solo sirven a la habitación.
// Mientras la cámara se mueve, el fondo se rehace en cada fotograma pero a un tercio de resolución (va
// desenfocado y en movimiento, no se nota); al pararse se rehace una vez a resolución completa.
import {
  BackSide, BufferGeometry, DirectionalLight, DoubleSide, FrontSide, HalfFloatType, Matrix4, Mesh, MeshBasicMaterial, Vector2, WebGLRenderTarget,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Silueta de profundidad de la habitación: todas sus piezas opacas en una sola malla (una por cara: delantera,
// trasera o ambas) que solo escribe profundidad. Se dibuja con el avatar para que lo que está delante de él
// (la planta, la silla…) lo tape, aunque el color de esos objetos venga de la imagen de fondo.
function siluetaDe(fondo) {
  fondo.updateMatrixWorld(true);
  const porCara = { [FrontSide]: [], [BackSide]: [], [DoubleSide]: [] };
  fondo.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || o.material.transparent || !o.material.depthWrite) return;
    const geo = new BufferGeometry();
    const fuente = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
    geo.setAttribute('position', fuente.getAttribute('position').clone());
    // un espejo da la vuelta a las caras
    const cara = o.matrixWorld.determinant() < 0 && o.material.side !== DoubleSide
      ? (o.material.side === FrontSide ? BackSide : FrontSide) : o.material.side;
    porCara[cara].push(geo.applyMatrix4(o.matrixWorld));
  });
  return Object.entries(porCara).filter(([, geos]) => geos.length).map(([cara, geos]) => {
    const silueta = new Mesh(mergeGeometries(geos), new MeshBasicMaterial({
      colorWrite: false,
      side: Number(cara),
      // un pelín hacia atrás, para no pelearse con lo que está apoyado (la sombra bajo los pies)
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    }));
    Object.assign(silueta, { renderOrder: -1, visible: false, frustumCulled: false });
    return silueta;
  });
}

const distinta = (a, b) => a.elements.some((v, i) => Math.abs(v - b.elements[i]) > 1e-4);

// Oculta unos objetos mientras se ejecuta fn
function sin(objetos, fn) {
  const ocultos = objetos.filter((o) => o.visible);
  ocultos.forEach((o) => { o.visible = false; });
  fn();
  ocultos.forEach((o) => { o.visible = true; });
}

export function crearPosproceso(renderer, escena, camara, fondo) {
  // Todo lo que no es la habitación ni una luz: avatar, accesorios, su sombra de contacto
  const primerPlano = () => escena.children.filter((o) => o !== fondo && !o.isLight);
  // Lo que no se dibuja ni se calcula con el avatar: los muebles (ya están en la imagen de fondo) y las luces
  // que solo alumbran la habitación
  const soloFondo = [];
  fondo.traverse((o) => { if (o.isMesh || o.userData.soloFondo) soloFondo.push(o); });
  const siluetas = siluetaDe(fondo);
  escena.add(...siluetas);
  // Luces con sombra: la sombra de los muebles va en la imagen de fondo. Para el avatar, cada una tiene una
  // gemela con la misma luz pero con un mapa de sombras pequeño y ceñido a él (pliegues de la sudadera, brazos
  // sobre el cuerpo), que cuesta poco
  const conSombra = () => escena.children.filter((o) => o.isLight && o.castShadow && !o.userData.gemela);
  const gemelas = new Map();
  function gemelaDe(luz) {
    let g = gemelas.get(luz);
    if (!g) {
      g = new DirectionalLight();
      g.userData.gemela = true;
      g.castShadow = true;
      g.shadow.mapSize.set(1024, 1024);
      g.shadow.radius = 3;
      g.shadow.bias = -0.0005;
      g.shadow.normalBias = 0.015;
      Object.assign(g.shadow.camera, { left: -0.7, right: 0.7, top: 1.05, bottom: -1.05, near: 0.1, far: 8 });
      g.visible = false;
      escena.add(g, g.target);
      gemelas.set(luz, g);
    }
    // Misma luz, apuntando al centro del avatar (de pies a cabeza)
    g.color.copy(luz.color);
    g.intensity = luz.intensity;
    g.target.position.set(0, 0.9, 0);
    g.position.copy(luz.position).sub(luz.target.position).normalize().multiplyScalar(4).add(g.target.position);
    return g;
  }

  // Cadena del fondo: 1) la habitación sin el avatar, 2) desenfocada, 3) halo en las luces, 4) un punto de
  // saturación y la viñeta. El resultado se queda en compositor.readBuffer
  let sombrasHechas = false;
  function cadenaFondo(muestras) {
    const tam = renderer.getDrawingBufferSize(new Vector2());
    // Con antialias (samples), si no los bordes de los muebles salen dentados
    const compositor = new EffectComposer(renderer, new WebGLRenderTarget(tam.x, tam.y, { type: HalfFloatType, samples: muestras }));
    compositor.renderToScreen = false;
    const pasoFondo = new RenderPass(escena, camara);
    const pintarFondo = pasoFondo.render.bind(pasoFondo);
    pasoFondo.render = (...args) => {
      // La habitación no se mueve: su mapa de sombras se calcula la primera vez y se reutiliza
      renderer.shadowMap.autoUpdate = !sombrasHechas;
      sin(primerPlano(), () => pintarFondo(...args));
      renderer.shadowMap.autoUpdate = true;
      sombrasHechas = true;
    };
    compositor.addPass(pasoFondo);
    const desenfoque = new BokehPass(escena, camara, { focus: 1.4, aperture: 0.008, maxblur: 0.03 });
    const desenfocar = desenfoque.render.bind(desenfoque);
    desenfoque.render = (...args) => {
      renderer.shadowMap.autoUpdate = false;   // su pasada de profundidad no necesita sombras
      sin(primerPlano(), () => desenfocar(...args));
      renderer.shadowMap.autoUpdate = true;
    };
    compositor.addPass(desenfoque);
    const halo = new UnrealBloomPass(new Vector2(tam.x, tam.y), 0.4, 0.3, 6);
    compositor.addPass(halo);
    compositor.addPass(new ShaderPass({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
        void main() {
          vec4 c = texture2D(tDiffuse, vUv);
          float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
          vec3 r = max(mix(vec3(l), c.rgb, 1.1), 0.0);
          vec2 d = (vUv - 0.5) * 0.95;
          gl_FragColor = vec4(r * (1.0 - 1.1 * dot(d, d)), 1.0);
        }`,
    }));
    return {
      render(foco) {
        desenfoque.uniforms.focus.value = foco;
        // Como una cámara real: cuanto más cerca del avatar, más se desenfoca el fondo (crece rápido al acercarse)
        desenfoque.uniforms.aperture.value = 0.045 / Math.max(foco, 0.5) ** 1.5;
        compositor.render();
        return compositor.readBuffer.texture;
      },
      tamano(ancho, alto, escala) {
        compositor.setPixelRatio(renderer.getPixelRatio() * escala);
        compositor.setSize(ancho, alto);
      },
      destruir() {
        compositor.dispose();
        desenfoque.dispose?.();
        halo.dispose();
      },
    };
  }
  const fondoNitido = cadenaFondo(4);
  const fondoRapido = cadenaFondo(0);   // mientras se mueve la cámara

  const vistaAnterior = new Matrix4();
  const proyeccionAnterior = new Matrix4();
  let focoAnterior = -1;
  let rehacer = true;
  let moviendo = false;
  let imagenFondo = null;

  return {
    // foco: distancia de la cámara al avatar
    render(foco) {
      camara.updateMatrixWorld();
      // Con tolerancia: la inercia de la cámara sigue moviéndola cantidades ínfimas durante un buen rato
      const cambia = distinta(camara.matrixWorld, vistaAnterior) || distinta(camara.projectionMatrix, proyeccionAnterior)
        || Math.abs(foco - focoAnterior) > 0.02 * focoAnterior;
      if (cambia) {
        vistaAnterior.copy(camara.matrixWorld);
        proyeccionAnterior.copy(camara.projectionMatrix);
        focoAnterior = foco;
        imagenFondo = fondoRapido.render(foco);
        moviendo = true;
      } else if (moviendo || rehacer) {
        // La cámara se acaba de parar (o cambió el tamaño): fondo definitivo a resolución completa
        imagenFondo = fondoNitido.render(focoAnterior);
        moviendo = false;
        rehacer = false;
      }

      // El avatar, directo a pantalla, sobre la imagen guardada
      const color = escena.background;
      escena.background = imagenFondo;
      const sombras = conSombra();
      const suyas = sombras.map(gemelaDe);
      suyas.forEach((g) => { g.visible = true; });
      renderer.setRenderTarget(null);
      siluetas.forEach((m) => { m.visible = true; });
      sin([...soloFondo, ...sombras], () => renderer.render(escena, camara));
      siluetas.forEach((m) => { m.visible = false; });
      suyas.forEach((g) => { g.visible = false; });
      escena.background = color;
    },
    tamano(ancho, alto) {
      fondoNitido.tamano(ancho, alto, 1);
      fondoRapido.tamano(ancho, alto, 1 / 3);
      rehacer = true;
    },
    destruir() {
      siluetas.forEach((m) => { m.removeFromParent(); m.geometry.dispose(); m.material.dispose(); });
      gemelas.forEach((g) => { g.removeFromParent(); g.target.removeFromParent(); g.shadow.dispose(); });
      fondoNitido.destruir();
      fondoRapido.destruir();
    },
  };
}

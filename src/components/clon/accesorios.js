// Accesorios y manos del avatar: lágrimas, gafas, corazones, estrellas, aureola, «Zzz»
// y un IK de dos huesos para llevar la mano a la boca, la cara, la barbilla o el bolsillo.
// Todo se coloca relativo a los huesos en cada fotograma (no se cuelga de ellos: así da igual la escala del esqueleto).
import {
  CanvasTexture, CatmullRomCurve3, Color, DoubleSide, ExtrudeGeometry, Float32BufferAttribute, Group, MathUtils,
  Matrix4, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Quaternion, Shape, ShapeGeometry, SphereGeometry,
  Sprite, SpriteMaterial, TorusGeometry, TubeGeometry, Vector3,
} from 'three';

// Puntos de la cara en reposo (metros, Y arriba, el personaje mira hacia +Z). Su izquierda es +X.
const CARA = {
  ojoI: new Vector3(0.0298, 1.7368, 0.0497),
  ojoD: new Vector3(-0.0296, 1.7368, 0.0497),
  boca: new Vector3(0, 1.668, 0.078),
  barbilla: new Vector3(0, 1.628, 0.078),
  frente: new Vector3(0, 1.775, 0.085),
};

const v = (x, y, z) => new Vector3(x, y, z);
const limitar = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------- IK de dos huesos (hombro-codo-muñeca) ----------
const _a = new Vector3(); const _b = new Vector3(); const _c = new Vector3();
const _q = new Quaternion(); const _qp = new Quaternion(); const _qw = new Quaternion();

function girarHacia(hueso, desde, hacia) {
  // Gira el hueso (en el mundo) para que la dirección «desde» pase a ser «hacia»
  _q.setFromUnitVectors(desde.clone().normalize(), hacia.clone().normalize());
  hueso.getWorldQuaternion(_qw);
  hueso.parent.getWorldQuaternion(_qp).invert();
  hueso.quaternion.copy(_qp.multiply(_q.multiply(_qw)));
  hueso.updateMatrixWorld(true);
}

function crearBrazo(brazo, ante, mano, lado) {
  const pista = v(0.55 * lado, -1, -0.35).normalize();   // el codo tiende hacia fuera, abajo y atrás
  const guardado = [new Quaternion(), new Quaternion()];
  const resuelto = [new Quaternion(), new Quaternion()];
  return {
    mano,
    resolver(objetivo, peso, codoHacia = null) {
      if (!brazo || !ante || !mano || peso <= 0.001) return;
      guardado[0].copy(brazo.quaternion);
      guardado[1].copy(ante.quaternion);
      brazo.getWorldPosition(_a); ante.getWorldPosition(_b); mano.getWorldPosition(_c);
      const lab = _a.distanceTo(_b);
      const lbc = _b.distanceTo(_c);
      const haciaObj = objetivo.clone().sub(_a);
      const dist = limitar(haciaObj.length(), 0.05, lab + lbc - 0.002);
      const dir = haciaObj.normalize();
      const angA = Math.acos(limitar((lab * lab + dist * dist - lbc * lbc) / (2 * lab * dist), -1, 1));
      const p0 = codoHacia ? v(codoHacia.x * lado * -1, codoHacia.y, codoHacia.z).normalize() : pista;
      const perp = p0.clone().sub(dir.clone().multiplyScalar(p0.dot(dir))).normalize();
      const codo = _a.clone().add(dir.clone().multiplyScalar(Math.cos(angA) * lab)).add(perp.multiplyScalar(Math.sin(angA) * lab));
      girarHacia(brazo, _b.clone().sub(_a), codo.clone().sub(_a));
      ante.getWorldPosition(_b); mano.getWorldPosition(_c);
      const fin = _a.clone().add(dir.multiplyScalar(dist));
      girarHacia(ante, _c.clone().sub(_b), fin.sub(_b));
      // Mezcla con la postura anterior según el peso
      resuelto[0].copy(brazo.quaternion); resuelto[1].copy(ante.quaternion);
      brazo.quaternion.copy(guardado[0]).slerp(resuelto[0], peso);
      ante.quaternion.copy(guardado[1]).slerp(resuelto[1], peso);
      brazo.updateMatrixWorld(true);
    },
  };
}

// ---------- Formas ----------
function corazon(tam) {
  const s = new Shape();
  const x = 0; const y = 0;
  s.moveTo(x, y + 0.25);
  s.bezierCurveTo(x, y + 0.25, x - 0.05, y + 0.5, x - 0.25, y + 0.5);
  s.bezierCurveTo(x - 0.55, y + 0.5, x - 0.55, y + 0.15, x - 0.55, y + 0.15);
  s.bezierCurveTo(x - 0.55, y - 0.05, x - 0.35, y - 0.27, x, y - 0.45);
  s.bezierCurveTo(x + 0.35, y - 0.27, x + 0.55, y - 0.05, x + 0.55, y + 0.15);
  s.bezierCurveTo(x + 0.55, y + 0.15, x + 0.55, y + 0.5, x + 0.25, y + 0.5);
  s.bezierCurveTo(x + 0.1, y + 0.5, x, y + 0.25, x, y + 0.25);
  const g = new ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3, curveSegments: 16 });
  g.center();
  g.scale(tam, tam, tam);
  return g;
}

function estrella(tam) {
  const s = new Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.42 : 1;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  const g = new ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 2 });
  g.center();
  g.scale(tam, tam, tam);
  return g;
}

// Gafas de sol de metal fino con cristales tintados en degradado (estilo «Tony Stark»):
// cristal rectangular de esquinas suaves, algo curvado, doble puente, plaquetas y patillas finas.
function gafas() {
  const grupo = new Group();
  const metal = new MeshStandardMaterial({ color: 0x5c5c62, metalness: 0.9, roughness: 0.28 });
  // Material estándar (el físico añadía un barniz que, de frente a la luz, aclaraba el cristal)
  const cristal = new MeshStandardMaterial({
    vertexColors: true, transparent: true, opacity: 0.9, roughness: 0.35, metalness: 0,
    envMapIntensity: 0.1, side: DoubleSide, depthWrite: false,
  });

  // Contorno del cristal: un poco más ancho arriba que abajo, esquinas redondeadas
  const W = 0.027; const H = 0.02; const R = 0.008;
  const contorno = new Shape();
  contorno.moveTo(-W + R, H);
  contorno.lineTo(W - R, H); contorno.quadraticCurveTo(W, H, W, H - R);
  contorno.lineTo(W - 0.002, -H + R); contorno.quadraticCurveTo(W - 0.003, -H, W - R - 0.003, -H);
  contorno.lineTo(-W + R + 0.003, -H); contorno.quadraticCurveTo(-W + 0.003, -H, -W + 0.002, -H + R);
  contorno.lineTo(-W, H - R); contorno.quadraticCurveTo(-W, H, -W + R, H);
  const puntos2d = contorno.getSpacedPoints(64);
  const curva = (x) => -1.6 * x * x;   // el cristal se curva hacia atrás por los lados

  for (const lado of [-1, 1]) {
    const cx = 0.0335 * lado;
    // Cristal con degradado: más oscuro arriba, más claro abajo
    const geo = new ShapeGeometry(contorno, 24);
    const pos = geo.attributes.position;
    const colores = [];
    const arriba = new Color(0x040d1f); const abajo = new Color(0x173a62);   // azul oscuro en degradado
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i); const y = pos.getY(i);
      pos.setZ(i, curva(x + cx * 0.6));
      const k = MathUtils.clamp((y + H) / (2 * H), 0, 1);
      const c = abajo.clone().lerp(arriba, k * k);
      colores.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new Float32BufferAttribute(colores, 3));
    geo.computeVertexNormals();
    const c = new Mesh(geo, cristal);
    c.position.set(cx, 0, 0);
    c.renderOrder = 2;
    grupo.add(c);

    // Aro de metal alrededor del cristal
    const aro = new CatmullRomCurve3(puntos2d.map((p) => new Vector3(p.x, p.y, curva(p.x + cx * 0.6) + 0.0004)), true);
    const marco = new Mesh(new TubeGeometry(aro, 96, 0.0009, 6, true), metal);
    marco.position.set(cx, 0, 0);
    grupo.add(marco);

    // Plaqueta de la nariz
    const plaqueta = new Mesh(new SphereGeometry(0.0028, 10, 8), new MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.3, transparent: true, opacity: 0.8 }));
    plaqueta.scale.set(0.6, 1.2, 0.5);
    plaqueta.position.set(0.0095 * lado, -0.009, -0.003);   // apoyada en el lateral de la nariz
    grupo.add(plaqueta);

    // Patilla: va pegada a la sien (sin atravesar la cabeza), se apoya encima de la oreja y baja por detrás.
    // Medidas sacadas del modelo: ancho de la cabeza a esa altura y raíz de la oreja a unos 7,5 cm del centro.
    const ex = cx + (W + 0.0005) * lado;
    const patilla = new CatmullRomCurve3([
      new Vector3(ex, H - 0.004, curva(W + cx * 0.6 * lado) - 0.001),
      new Vector3(0.0655 * lado, H - 0.005, -0.028),
      new Vector3(0.0715 * lado, H - 0.007, -0.063),
      new Vector3(0.0758 * lado, H - 0.008, -0.093),   // encima de la oreja
      new Vector3(0.0735 * lado, H - 0.02, -0.113),
      new Vector3(0.07 * lado, H - 0.038, -0.123),
    ]);
    grupo.add(new Mesh(new TubeGeometry(patilla, 24, 0.0009, 6, false), metal));
  }
  // Doble puente
  for (const [y, curvatura] of [[H - 0.002, 0.003], [H - 0.009, 0.0015]]) {
    const puente = new CatmullRomCurve3([
      new Vector3(-0.0335 + W - 0.0005, y, curva(W - 0.02) + 0.0004),
      new Vector3(0, y + curvatura, 0.0012),
      new Vector3(0.0335 - W + 0.0005, y, curva(W - 0.02) + 0.0004),
    ]);
    grupo.add(new Mesh(new TubeGeometry(puente, 16, 0.0008, 6, false), metal));
  }
  return grupo;
}

function textoSprite(texto, color = '#ffffff') {
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 128;
  const ctx = lienzo.getContext('2d');
  ctx.font = 'bold 96px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 10;
  ctx.strokeStyle = 'rgba(30,40,60,0.6)';
  ctx.strokeText(texto, 64, 68);
  ctx.fillStyle = color;
  ctx.fillText(texto, 64, 68);
  const tex = new CanvasTexture(lienzo);
  return new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
}

// ---------- Montaje ----------
export function crearAccesorios(escena, buscarHueso) {
  const cabeza = buscarHueso('mixamorig:Head');
  const brazos = {
    D: crearBrazo(buscarHueso('mixamorig:RightArm'), buscarHueso('mixamorig:RightForeArm'), buscarHueso('mixamorig:RightHand'), -1),
    I: crearBrazo(buscarHueso('mixamorig:LeftArm'), buscarHueso('mixamorig:LeftForeArm'), buscarHueso('mixamorig:LeftHand'), 1),
  };
  const raiz = new Group();
  escena.add(raiz);

  // En reposo: matriz inversa de la cabeza y de la mano derecha, para guardar posiciones relativas
  const invCabeza = cabeza.matrixWorld.clone().invert();
  const enCabeza = (pos, rot = new Quaternion(), escala = 1) => invCabeza.clone().multiply(new Matrix4().compose(pos, rot, new Vector3(escala, escala, escala)));
  const enCabezaPunto = (p) => p.clone().applyMatrix4(invCabeza);
  const manoD = brazos.D.mano;

  const _m = new Matrix4();
  const _pos = new Vector3(); const _rot = new Quaternion(); const _esc = new Vector3();
  function colocar(obj, local, hueso = cabeza) {
    _m.multiplyMatrices(hueso.matrixWorld, local).decompose(_pos, _rot, _esc);
    obj.position.copy(_pos); obj.quaternion.copy(_rot); obj.scale.copy(_esc);
  }

  // Objetivos de la mano (muñeca), relativos a la cabeza o al cuerpo
  const OBJETIVOS = {
    // La muñeca llega desde un lado para que los dedos crucen la cara en horizontal (no hacia arriba)
    // (codo: hacia dónde va el codo; con el codo alto y hacia fuera los dedos cruzan la cara en horizontal)
    boca: { local: enCabezaPunto(CARA.boca.clone().add(v(-0.1, -0.045, 0.05))), codo: v(-1, -0.15, -0.25) },
    cara: { local: enCabezaPunto(CARA.ojoD.clone().add(v(-0.085, -0.06, 0.06))) },
    frente: { local: enCabezaPunto(CARA.frente.clone().add(v(-0.01, -0.11, 0.06))) },
    barbilla: { local: enCabezaPunto(CARA.barbilla.clone().add(v(-0.07, -0.08, 0.06))), codo: v(-0.5, -1, 0.15) },
    bolsillo: { mundo: v(-0.07, 1.04, 0.16) },
    saludo: { mundo: v(-0.33, 1.62, 0.06) },
  };
  const manos = { D: { objetivo: null, peso: 0, destino: 0, velocidad: 3, extra: v() }, I: { objetivo: null, peso: 0, destino: 0, velocidad: 3, extra: v() } };
  function objetivoMundo(nombre, extra) {
    const o = OBJETIVOS[nombre];
    const p = o.local ? o.local.clone().applyMatrix4(cabeza.matrixWorld) : o.mundo.clone();
    return p.add(extra);
  }

  // --- Gafas ---
  const objGafas = gafas();
  objGafas.visible = false;
  raiz.add(objGafas);
  // Centro de las gafas: con las plaquetas sobre la nariz y el doble puente sobre el puente de la nariz
  const gafasEnCara = enCabeza(v(0, 1.729, 0.083));   // cristales a ~12 mm del ojo, como unas gafas reales
  let gafasEnMano = null;   // se calcula al cogerlas
  const gafasEstado = { donde: 'oculto', anterior: null, mezcla: 1 };

  // --- Corazones / estrellas en los ojos ---
  const matCorazon = new MeshStandardMaterial({ color: 0xff2d55, emissive: 0xc0102a, emissiveIntensity: 0.6, roughness: 0.3 });
  const matEstrella = new MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffa800, emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.2 });
  const ojosObjetos = [];
  for (const ojo of [CARA.ojoI, CARA.ojoD]) {
    const c = new Mesh(corazon(0.034), matCorazon);
    const e = new Mesh(estrella(0.019), matEstrella);
    c.visible = e.visible = false;
    raiz.add(c, e);
    ojosObjetos.push({ corazon: c, estrella: e, local: enCabeza(ojo.clone().add(v(0, 0, 0.038))) });
  }
  const corazonesFlotantes = Array.from({ length: 6 }, () => {
    const m = new Mesh(corazon(0.022), matCorazon);
    m.visible = false;
    raiz.add(m);
    return { m, t: Math.random() };
  });

  // --- Aureola ---
  const aureola = new Mesh(new TorusGeometry(0.075, 0.007, 12, 48), new MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffc94a, emissiveIntensity: 1.1, roughness: 0.3 }));
  aureola.visible = false;
  raiz.add(aureola);
  const aureolaLocal = enCabeza(v(0, 1.93, 0.0), new Quaternion().setFromAxisAngle(v(1, 0, 0), Math.PI / 2 - 0.25));

  // --- Lágrimas ---
  const matLagrima = new MeshPhysicalMaterial({ color: 0xbfe6ff, roughness: 0.02, metalness: 0, transmission: 0.6, transparent: true, opacity: 0.85, envMapIntensity: 2, clearcoat: 1 });
  const geoLagrima = new SphereGeometry(0.0035, 12, 10);
  geoLagrima.scale(1, 1.5, 0.8);
  const lagrimas = Array.from({ length: 24 }, () => {
    const m = new Mesh(geoLagrima, matLagrima);
    m.visible = false;
    raiz.add(m);
    return { m, vida: -1, lado: 1, velocidad: 1 };
  });
  // Recorrido por la mejilla (relativo a la cabeza), del párpado de abajo a la mandíbula
  const recorrido = (lado) => [
    v(0.026 * lado, 1.724, 0.071), v(0.033 * lado, 1.705, 0.077), v(0.037 * lado, 1.68, 0.074),
    v(0.039 * lado, 1.655, 0.066), v(0.038 * lado, 1.62, 0.05),
  ].map(enCabezaPunto);
  const recorridos = { 1: recorrido(1), [-1]: recorrido(-1) };
  let llanto = 0;        // lágrimas por segundo
  let acumulado = 0;

  // --- Zzz ---
  const zetas = Array.from({ length: 3 }, (_, i) => {
    const s = textoSprite('Z', '#e8f4ff');
    s.visible = false;
    raiz.add(s);
    return { s, t: i / 3 };
  });
  const origenZ = enCabezaPunto(v(0.07, 1.82, 0.04));

  const activos = { corazones: false, estrellas: false, aureola: false, zzz: false };
  let mezclaOjos = 0;

  function actualizar(dt, t) {
    // Manos (IK), con transición suave del peso
    for (const lado of ['D', 'I']) {
      const m = manos[lado];
      m.peso += (m.destino - m.peso) * (1 - Math.exp(-dt * m.velocidad * 2));
      if (m.objetivo && m.peso > 0.001) brazos[lado].resolver(objetivoMundo(m.objetivo, m.extra), MathUtils.smoothstep(m.peso, 0, 1), OBJETIVOS[m.objetivo].codo);
      else if (m.destino === 0 && m.peso < 0.01) m.objetivo = null;
    }

    // Gafas: en la cara, en la mano o fundiéndose de una a otra
    if (gafasEstado.donde !== 'oculto') {
      const destino = gafasEstado.donde === 'cara' ? cabeza.matrixWorld.clone().multiply(gafasEnCara) : manoD.matrixWorld.clone().multiply(gafasEnMano);
      gafasEstado.mezcla = Math.min(1, gafasEstado.mezcla + dt * 4);
      if (gafasEstado.anterior && gafasEstado.mezcla < 1) {
        const a = new Vector3(); const qa = new Quaternion(); const ea = new Vector3();
        gafasEstado.anterior.decompose(a, qa, ea);
        destino.decompose(_pos, _rot, _esc);
        const k = MathUtils.smoothstep(gafasEstado.mezcla, 0, 1);
        objGafas.position.copy(a.lerp(_pos, k)); objGafas.quaternion.copy(qa.slerp(_rot, k)); objGafas.scale.copy(ea.lerp(_esc, k));
      } else {
        destino.decompose(objGafas.position, objGafas.quaternion, objGafas.scale);
      }
    }

    // Ojos de corazón o de estrella (laten / giran)
    const quiereOjos = activos.corazones || activos.estrellas;
    mezclaOjos += ((quiereOjos ? 1 : 0) - mezclaOjos) * (1 - Math.exp(-dt * 8));
    for (const o of ojosObjetos) {
      for (const [obj, activo] of [[o.corazon, activos.corazones], [o.estrella, activos.estrellas]]) {
        obj.visible = activo && mezclaOjos > 0.02;
        if (!obj.visible) continue;
        colocar(obj, o.local);
        const latido = obj === o.corazon ? 1 + Math.max(0, Math.sin(t * 7)) * 0.18 : 1;
        obj.scale.multiplyScalar(mezclaOjos * latido);
        if (obj === o.estrella) obj.rotateZ(t * 2.5);
      }
    }
    // Corazoncitos que suben alrededor de la cabeza
    for (const [i, c] of corazonesFlotantes.entries()) {
      c.m.visible = activos.corazones;
      if (!activos.corazones) continue;
      c.t = (c.t + dt * 0.35) % 1;
      const ang = i * 1.05 + t * 0.4;
      const p = v(Math.cos(ang) * 0.16, 1.66 + c.t * 0.32, 0.03 + Math.sin(ang) * 0.12).applyMatrix4(invCabeza).applyMatrix4(cabeza.matrixWorld);
      c.m.position.copy(p);
      c.m.quaternion.setFromAxisAngle(v(0, 0, 1), Math.sin(t * 2 + i) * 0.3);
      c.m.scale.setScalar(Math.sin(c.t * Math.PI));
    }

    // Aureola
    aureola.visible = activos.aureola;
    if (activos.aureola) {
      colocar(aureola, aureolaLocal);
      aureola.position.y += Math.sin(t * 2) * 0.006;
    }

    // Lágrimas: nacen bajo el ojo y bajan por la mejilla
    acumulado += llanto * dt;
    while (acumulado >= 1) {
      acumulado -= 1;
      const libre = lagrimas.find((l) => l.vida < 0);
      if (libre) { libre.vida = 0; libre.lado = Math.random() < 0.5 ? 1 : -1; libre.velocidad = 0.55 + Math.random() * 0.35; }
    }
    for (const l of lagrimas) {
      if (l.vida < 0) { l.m.visible = false; continue; }
      l.vida += dt * l.velocidad;
      if (l.vida >= 1.25) { l.vida = -1; l.m.visible = false; continue; }
      const puntos = recorridos[l.lado];
      const f = Math.min(l.vida, 0.999) * (puntos.length - 1);
      const i = Math.floor(f);
      const local = puntos[i].clone().lerp(puntos[Math.min(i + 1, puntos.length - 1)], f - i);
      if (l.vida > 1) local.y -= (l.vida - 1) * 0.25;   // cae al final
      l.m.position.copy(local.applyMatrix4(cabeza.matrixWorld));
      l.m.quaternion.copy(cabeza.getWorldQuaternion(_rot));
      l.m.visible = true;
      const crece = Math.min(1, l.vida * 6);
      l.m.scale.setScalar(crece * (l.vida > 1 ? 1 - (l.vida - 1) * 3 : 1));
    }

    // Zzz
    for (const [i, z] of zetas.entries()) {
      z.s.visible = activos.zzz;
      if (!activos.zzz) continue;
      z.t = (z.t + dt * 0.28) % 1;
      const p = origenZ.clone().add(v(z.t * 0.08 + Math.sin(t * 2 + i) * 0.01, z.t * 0.16, 0)).applyMatrix4(cabeza.matrixWorld);
      z.s.position.copy(p);
      z.s.scale.setScalar(0.03 + z.t * 0.045);
      z.s.material.opacity = Math.sin(z.t * Math.PI);
    }
  }

  return {
    actualizar,
    mano(lado, objetivo, { velocidad = 3, extra = v() } = {}) {
      const m = manos[lado];
      if (objetivo) { m.objetivo = objetivo; m.destino = 1; } else m.destino = 0;
      m.velocidad = velocidad;
      m.extra = extra;
    },
    moverExtra(lado, x, y, z) { manos[lado].extra.set(x, y, z); },
    gafas(donde) {
      if (donde === 'mano' && !gafasEnMano) {
        // Las gafas «en la mano»: delante de la palma, en reposo
        const delante = manoD.matrixWorld.clone().invert().multiply(new Matrix4().compose(manoD.getWorldPosition(new Vector3()).add(v(0.02, 0.07, 0.04)), new Quaternion(), new Vector3(1, 1, 1)));
        gafasEnMano = delante;
      }
      gafasEstado.anterior = gafasEstado.donde === 'oculto' ? null : objGafas.matrix.clone().compose(objGafas.position, objGafas.quaternion, objGafas.scale);
      gafasEstado.mezcla = gafasEstado.anterior ? 0 : 1;
      gafasEstado.donde = donde;
      objGafas.visible = donde !== 'oculto';
    },
    get gafasPuestas() { return gafasEstado.donde === 'cara'; },
    quitarGafasYa() { gafasEstado.donde = 'oculto'; objGafas.visible = false; },
    activar(nombre, valor) { activos[nombre] = valor; },
    llorar(porSegundo) { llanto = porSegundo; },
  };
}

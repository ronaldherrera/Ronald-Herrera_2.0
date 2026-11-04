// Pies anclados al suelo. Al fundir una animación con otra (callar → hablar, reposo → gesto…) three.js mezcla
// también la cadera y las piernas, y los pies se deslizaban por el suelo hasta su sitio nuevo. Aquí cada pie se
// queda clavado donde estaba y las piernas se ajustan con cinemática inversa (cadera-rodilla-tobillo); si la
// animación lo pide lejos, el pie da un pasito corto (se levanta y se posa) en vez de patinar. Los dos pies no
// pasan a la vez. La altura del pie sí sigue a la animación (talones que se levantan, apoyos).
import { MathUtils, Quaternion, Vector3 } from 'three';

const UMBRAL_PASO = 0.05;      // m que puede separarse el pie de su ancla antes de dar un paso
const DURACION_PASO = 0.32;    // s
const ALTURA_PASO = 0.035;     // m

const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();
const _v1 = new Vector3();
const _v2 = new Vector3();
const _eje = new Vector3();
const _q = new Quaternion();
const _qMundo = new Quaternion();
const _qPadre = new Quaternion();
const _qPie = new Quaternion();

const angulo = (centro, p1, p2) => _v1.subVectors(p1, centro).angleTo(_v2.subVectors(p2, centro));

// Gira un hueso en el espacio del mundo (premultiplica su giro mundial por q)
function girarEnMundo(hueso, q) {
  hueso.getWorldQuaternion(_qMundo).premultiply(q);
  hueso.parent.getWorldQuaternion(_qPadre).invert();
  hueso.quaternion.copy(_qPadre.multiply(_qMundo));
  hueso.updateMatrixWorld(true);
}

// Cadera (muslo), rodilla y tobillo: deja el tobillo en «objetivo» sin cambiar hacia dónde apunta el pie
function resolverPierna({ muslo, rodilla, pie }, objetivo) {
  pie.getWorldQuaternion(_qPie);
  muslo.getWorldPosition(_a);
  rodilla.getWorldPosition(_b);
  pie.getWorldPosition(_c);
  const largoA = _a.distanceTo(_b);
  const largoB = _b.distanceTo(_c);
  const d = MathUtils.clamp(_a.distanceTo(objetivo), Math.abs(largoA - largoB) + 1e-3, (largoA + largoB) * 0.999);
  // 1) Rodilla: el ángulo que da esa distancia entre cadera y tobillo
  const deseado = Math.acos(MathUtils.clamp((largoA * largoA + largoB * largoB - d * d) / (2 * largoA * largoB), -1, 1));
  const actual = angulo(_b, _a, _c);
  const cambio = deseado - actual;
  if (Math.abs(cambio) > 1e-4) {
    // Eje de doblez: el del plano de la pierna; con la pierna recta, el eje X de la rodilla (dobla hacia delante)
    _eje.crossVectors(_v1.subVectors(_a, _b), _v2.subVectors(_c, _b));
    if (_eje.lengthSq() < 1e-8) _eje.set(1, 0, 0).applyQuaternion(rodilla.getWorldQuaternion(_q));
    _eje.normalize();
    girarEnMundo(rodilla, _q.setFromAxisAngle(_eje, -cambio));
    pie.getWorldPosition(_c);
    if (Math.abs(angulo(_b, _a, _c) - deseado) > Math.abs(cambio) * 0.5) {
      girarEnMundo(rodilla, _q.setFromAxisAngle(_eje, 2 * cambio));
      pie.getWorldPosition(_c);
    }
  }
  // 2) Muslo: apunta la pierna hacia el objetivo
  _v1.subVectors(_c, _a).normalize();
  _v2.subVectors(objetivo, _a).normalize();
  girarEnMundo(muslo, _q.setFromUnitVectors(_v1, _v2));
  // 3) El pie conserva su orientación
  pie.parent.getWorldQuaternion(_qPadre).invert();
  pie.quaternion.copy(_qPadre.multiply(_qPie));
  pie.updateMatrixWorld(true);
}

export function crearAnclaPies(buscarHueso) {
  const piernas = ['Left', 'Right'].map((lado) => ({
    muslo: buscarHueso(`mixamorig:${lado}UpLeg`),
    rodilla: buscarHueso(`mixamorig:${lado}Leg`),
    pie: buscarHueso(`mixamorig:${lado}Foot`),
    ancla: null,
    paso: null,
    deseado: new Vector3(),
    objetivo: new Vector3(),
  }));
  if (piernas.some((p) => !p.muslo || !p.rodilla || !p.pie)) return { actualizar() {}, soltar() {} };
  let peso = 0;

  return {
    // Tras el mezclador (con las matrices del mundo al día). activo: si se anclan (no en bailes ni giros)
    actualizar(dt, activo) {
      peso = MathUtils.clamp(peso + (activo ? dt : -dt) * 3, 0, 1);
      for (const p of piernas) p.pie.getWorldPosition(p.deseado);
      if (peso === 0) {
        for (const p of piernas) { p.ancla = null; p.paso = null; }
        return;
      }
      for (const p of piernas) {
        p.ancla ||= p.deseado.clone();
        const otraPasando = piernas.some((o) => o !== p && o.paso);
        const lejos = Math.hypot(p.deseado.x - p.ancla.x, p.deseado.z - p.ancla.z) > UMBRAL_PASO;
        if (!p.paso && lejos && !otraPasando) p.paso = { desde: p.ancla.clone(), t: 0 };
        if (p.paso) {
          p.paso.t += dt / DURACION_PASO;
          const e = MathUtils.smoothstep(Math.min(1, p.paso.t), 0, 1);
          p.objetivo.lerpVectors(p.paso.desde, p.deseado, e);
          p.objetivo.y = p.deseado.y + Math.sin(Math.min(1, p.paso.t) * Math.PI) * ALTURA_PASO;
          if (p.paso.t >= 1) { p.ancla.copy(p.deseado); p.paso = null; }
        } else {
          p.objetivo.set(p.ancla.x, p.deseado.y, p.ancla.z);
        }
        p.objetivo.lerp(p.deseado, 1 - peso);
        if (p.objetivo.distanceToSquared(p.deseado) > 1e-8) resolverPierna(p, p.objetivo);
      }
    },
    // Olvida dónde estaban los pies (p. ej. si el avatar se recoloca)
    soltar() { for (const p of piernas) { p.ancla = null; p.paso = null; } },
  };
}

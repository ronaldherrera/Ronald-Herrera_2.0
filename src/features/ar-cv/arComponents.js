// Componentes A-Frame propios y ajustes de ciclo de vida de MindAR 1.2.5.
// Se registran una única vez, después de cargar los scripts del motor.
import { registerWorld } from './arWorld';

// MindAR 1.2.5 no contempla salir a mitad de arranque, pedir la cámara con
// preferencia (no obligación) de cámara trasera ni limpiar su listener de resize.
// Estos ajustes hacen stop()/pause() idempotentes y garantizan que la cámara
// siempre se libera.
const patchMindarSystem = (AFRAME) => {
  const proto = AFRAME.systems['mindar-image-system']?.prototype;
  if (!proto || proto.__rhPatched) return;
  proto.__rhPatched = true;

  proto._startVideo = function startVideo() {
    const video = document.createElement('video');
    this.video = video;
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.muted = true;
    Object.assign(video.style, { position: 'absolute', top: '0px', left: '0px', zIndex: '-2' });
    this.container.appendChild(video);

    if (!navigator.mediaDevices?.getUserMedia) {
      this.el.emit('arError', { error: 'VIDEO_FAIL', reason: 'unsupported' });
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } })
      .then((stream) => {
        if (this.__rhStopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.addEventListener(
          'loadedmetadata',
          () => {
            if (this.__rhStopped) return;
            video.setAttribute('width', video.videoWidth);
            video.setAttribute('height', video.videoHeight);
            video.play?.()?.catch?.(() => {});
            this.el.emit('rh-camera-ready');
            this._startAR();
          },
          { once: true }
        );
        video.srcObject = stream;
      })
      .catch((error) => {
        if (!this.__rhStopped) this.el.emit('arError', { error: 'VIDEO_FAIL', reason: error?.name });
      });
  };

  const originalStartAR = proto._startAR;
  proto._startAR = async function startAR() {
    if (this.__rhStopped) return;
    this.__rhStarting = true;
    try {
      await originalStartAR.call(this);
    } catch (error) {
      if (!this.__rhStopped) this.el.emit('arError', { error: 'AR_FAIL', reason: error?.name });
    } finally {
      this.__rhStarting = false;
      if (this.__rhStopped && this.controller) {
        try {
          this.controller.stopProcessVideo();
          this.controller.dispose();
        } catch {
          // Ya liberado.
        }
      }
    }
  };

  proto.stop = function stop() {
    if (this.__rhStopped) return;
    this.__rhStopped = true;
    try {
      this.controller?.stopProcessVideo();
    } catch {
      // Ignorado: el controlador puede no existir todavía.
    }
    const video = this.video;
    if (video) {
      try {
        video.pause();
      } catch {
        // Ignorado.
      }
      const stream = video.srcObject;
      if (stream) stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
      video.remove();
    }
    if (this.controller && !this.__rhStarting) {
      try {
        this.controller.dispose();
      } catch {
        // Ignorado.
      }
    }
  };

  proto.pause = function pause(keepVideo = false) {
    if (this.__rhStopped || this.__rhStarting || !this.controller || this.__rhPaused) return;
    this.__rhPaused = true;
    if (!keepVideo) this.video?.pause();
    this.controller.stopProcessVideo();
  };

  proto.unpause = function unpause() {
    if (this.__rhStopped || !this.controller || !this.__rhPaused) return;
    this.__rhPaused = false;
    this.video?.play?.()?.catch?.(() => {});
    this.controller.processVideo(this.video);
  };

  const originalResize = proto._resize;
  proto._resize = function resize() {
    if (this.__rhStopped || !this.controller || !this.video) return;
    if (!this.container?.getElementsByTagName('a-camera')[0]) return;
    originalResize.call(this);
  };
};

export const registerArComponents = (AFRAME) => {
  patchMindarSystem(AFRAME);
  registerWorld(AFRAME);
  if (AFRAME.components['rh-follow']) return;

  const THREE = AFRAME.THREE;

  // Filtro One Euro (Casiez et al.): mucho suavizado en reposo y casi ninguno
  // cuando el valor cambia deprisa. Se aplica a cada lectura de MindAR.
  const lowPass = (prev, value, alpha) => prev + alpha * (value - prev);
  const alphaFor = (cutoff, dt) => {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  };
  class OneEuro {
    constructor(size, minCutoff, beta, dCutoff = 1) {
      this.minCutoff = minCutoff;
      this.beta = beta;
      this.dCutoff = dCutoff;
      this.x = new Float64Array(size);
      this.dx = new Float64Array(size);
      this.ready = false;
    }

    reset(values) {
      this.x.set(values);
      this.dx.fill(0);
      this.ready = true;
    }

    filter(values, dt) {
      if (!this.ready) {
        this.reset(values);
        return this.x;
      }
      const aD = alphaFor(this.dCutoff, dt);
      let speed = 0;
      for (let i = 0; i < values.length; i++) {
        this.dx[i] = lowPass(this.dx[i], (values[i] - this.x[i]) / dt, aD);
        speed += this.dx[i] * this.dx[i];
      }
      const a = alphaFor(this.minCutoff + this.beta * Math.sqrt(speed), dt);
      for (let i = 0; i < values.length; i++) this.x[i] = lowPass(this.x[i], values[i], a);
      return this.x;
    }
  }

  // Sigue la pose del ancla de MindAR:
  // 1) cada lectura nueva pasa por un filtro One Euro para la posición (en anchos
  //    de hoja) y otro para la rotación, cada uno con sus propias unidades;
  // 2) la escena recorre de forma continua el tramo entre las dos últimas lecturas
  //    filtradas, así el movimiento se reparte en todos los fotogramas aunque
  //    MindAR dé pocas lecturas por segundo en el móvil.
  // Además mantiene la escena unos instantes si se pierde el CV (sin parpadeos).
  AFRAME.registerComponent('rh-follow', {
    schema: {
      anchor: { type: 'selector' },
      hold: { type: 'int', default: 800 },
      posCutoff: { type: 'number', default: 0.4 }, // Hz en reposo (más bajo = menos temblor)
      posBeta: { type: 'number', default: 3 }, // respuesta al moverse (anchos de hoja/s)
      rotCutoff: { type: 'number', default: 0.4 },
      rotBeta: { type: 'number', default: 1.5 }, // respuesta al girar/inclinar
    },

    init() {
      this.state = 'hidden';
      this.lastSeen = 0;
      this.hiddenAt = 0;
      const obj = this.el.object3D;
      obj.matrixAutoUpdate = false;
      obj.visible = false;
      const sample = () => ({ p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(1, 1, 1), t: 0 });
      this.prev = sample();
      this.last = sample();
      this.raw = sample();
      this.lastElements = new Float32Array(16);
      this.interval = 50;
      this.posFilter = new OneEuro(3, this.data.posCutoff, this.data.posBeta);
      this.rotFilter = new OneEuro(4, this.data.rotCutoff, this.data.rotBeta);
      this.pos = new THREE.Vector3();
      this.quat = new THREE.Quaternion();
      this.scl = new THREE.Vector3(1, 1, 1);
      this.hasPose = false;
    },

    // Registra y filtra una lectura nueva de MindAR si la matriz ha cambiado.
    readAnchor(anchor, now, reset) {
      const e = anchor.matrix.elements;
      let changed = reset;
      for (let i = 0; i < 16 && !changed; i++) changed = e[i] !== this.lastElements[i];
      if (!changed) return;
      this.lastElements.set(e);
      const { prev, last, raw } = this;
      const d = this.data;
      Object.assign(this.posFilter, { minCutoff: d.posCutoff, beta: d.posBeta });
      Object.assign(this.rotFilter, { minCutoff: d.rotCutoff, beta: d.rotBeta });
      anchor.matrix.decompose(raw.p, raw.q, raw.s);
      const unit = Math.abs(raw.s.x) || 1; // ancho de la hoja en unidades de la escena
      if (!reset && raw.q.dot(last.q) < 0) raw.q.set(-raw.q.x, -raw.q.y, -raw.q.z, -raw.q.w);

      const posIn = [raw.p.x / unit, raw.p.y / unit, raw.p.z / unit];
      const rotIn = [raw.q.x, raw.q.y, raw.q.z, raw.q.w];
      if (reset) {
        this.posFilter.reset(posIn);
        this.rotFilter.reset(rotIn);
      }
      const gap = reset ? this.interval : Math.min(250, Math.max(12, now - last.t));
      const dt = gap / 1000;
      const fp = this.posFilter.filter(posIn, dt);
      const fq = this.rotFilter.filter(rotIn, dt);

      prev.p.copy(last.p);
      prev.q.copy(last.q);
      prev.s.copy(last.s);
      prev.t = last.t;
      last.p.set(fp[0] * unit, fp[1] * unit, fp[2] * unit);
      last.q.set(fq[0], fq[1], fq[2], fq[3]).normalize();
      last.s.copy(raw.s);
      last.t = now;
      if (reset) {
        prev.p.copy(last.p);
        prev.q.copy(last.q);
        prev.s.copy(last.s);
        prev.t = now - this.interval;
      } else {
        this.interval += (gap - this.interval) * 0.25;
      }
    },

    // Pose mostrada: recorrido continuo de la penúltima a la última lectura.
    interpolate(now) {
      const { prev, last } = this;
      const a = Math.min(1, Math.max(0, (now - last.t) / this.interval));
      this.pos.copy(prev.p).lerp(last.p, a);
      this.quat.copy(prev.q).slerp(last.q, a);
      this.scl.copy(prev.s).lerp(last.s, a);
    },

    world() {
      return this.el.components['rh-world'];
    },

    show() {
      const quick = this.state === 'hiding' && performance.now() - this.hiddenAt < 600;
      this.state = 'visible';
      this.el.object3D.visible = true;
      this.world()?.show(quick);
      this.el.emit('rh-found', { quick });
    },

    tick(time) {
      const anchor = this.data.anchor?.object3D;
      if (!anchor) return;
      const obj = this.el.object3D;

      if (anchor.visible) {
        // Al reaparecer tras perder el CV se coloca directamente (sin deslizarse).
        const reset = this.state === 'hidden' || !this.hasPose;
        const now = performance.now();
        this.readAnchor(anchor, now, reset);
        this.interpolate(now);
        this.hasPose = true;
        obj.matrix.compose(this.pos, this.quat, this.scl);
        obj.matrixWorldNeedsUpdate = true;
        this.lastSeen = time;
        if (this.state !== 'visible') this.show();
        return;
      }

      if (this.state === 'visible' && time - this.lastSeen > this.data.hold) {
        this.state = 'hiding';
        this.hiddenAt = performance.now();
        this.world()?.hide();
        this.el.emit('rh-lost');
      } else if (this.state === 'hiding' && performance.now() - this.hiddenAt > 320) {
        this.state = 'hidden';
        obj.visible = false;
      }
    },
  });
};

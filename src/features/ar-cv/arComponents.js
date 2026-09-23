// Componentes A-Frame propios y ajustes de ciclo de vida de MindAR 1.2.5.
// Se registran una única vez, después de cargar los scripts del motor.
import { PALETTE } from './arCvData';
import {
  CARD_PAD,
  drawHeaderCard,
  drawNavCard,
  drawOutline,
  loadCardFonts,
} from './cardTextures';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => {
  const c = 1.2;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

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
  if (AFRAME.components['rh-card']) return;
  const THREE = AFRAME.THREE;

  // Tarjeta anclada: plano con textura de canvas + área táctil ampliada.
  AFRAME.registerComponent('rh-card', {
    schema: {
      variant: { default: 'nav' },
      section: { default: '' },
      index: { type: 'int', default: 1 },
      title: { default: '' },
      hint: { default: '' },
      accent: { default: PALETTE.gold },
      shape: { default: 'square' },
      width: { type: 'number', default: 0.4 },
      height: { type: 'number', default: 0.22 },
      lift: { type: 'number', default: 0.08 },
    },

    init() {
      const { width, height } = this.data;
      this.state = 'hidden';
      this.startAt = 0;
      this.pressed = 0;
      this.pressTarget = 0;
      this.opacity = 0;
      this.reduced = prefersReducedMotion();

      this.group = new THREE.Group();
      this.group.visible = false;

      this.material = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      this.mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width + CARD_PAD * 2, height + CARD_PAD * 2),
        this.material
      );
      this.mesh.renderOrder = 2;
      this.group.add(this.mesh);

      // Área táctil un 15–20 % mayor que la tarjeta visible.
      this.hitMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width * 1.15, height * 1.2),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      this.hitMesh.userData.card = this;
      this.group.add(this.hitMesh);

      this.el.setObject3D('mesh', this.group);
      loadCardFonts().then(() => this.drawTexture());
    },

    drawTexture() {
      if (!this.material) return;
      const d = this.data;
      const canvas =
        d.variant === 'header'
          ? drawHeaderCard({ width: d.width, height: d.height, title: d.title, tagline: d.hint })
          : drawNavCard({
              width: d.width,
              height: d.height,
              index: d.index,
              title: d.title,
              hint: d.hint,
              accent: d.accent,
              shape: d.shape,
            });
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const renderer = this.el.sceneEl.renderer;
      if (renderer) texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      this.material.map = texture;
      this.material.needsUpdate = true;
    },

    appear(delay = 0) {
      this.state = 'appearing';
      this.startAt = performance.now() + (this.reduced ? 0 : delay);
      this.group.visible = true;
    },

    hide() {
      if (this.state === 'hidden') return;
      this.state = 'hiding';
      this.startAt = performance.now();
      this.pressTarget = 0;
    },

    setPressed(value) {
      this.pressTarget = value ? 1 : 0;
    },

    isInteractive() {
      return this.state === 'shown' || (this.state === 'appearing' && this.opacity > 0.6);
    },

    tick() {
      if (this.state === 'hidden') return;
      const now = performance.now();
      const d = this.data;
      let progress = 1;
      let z = d.lift;
      let scale = 1;
      let tilt = 0;

      if (this.state === 'appearing') {
        const duration = this.reduced ? 180 : 620;
        progress = clamp01((now - this.startAt) / duration);
        if (this.reduced) {
          this.opacity = progress;
        } else {
          const eased = easeOutCubic(progress);
          this.opacity = clamp01(progress * 1.8);
          z = d.lift * eased;
          scale = 0.84 + 0.16 * easeOutBack(progress);
          tilt = -0.45 * (1 - eased);
        }
        if (progress >= 1) this.state = 'shown';
      } else if (this.state === 'hiding') {
        progress = clamp01((now - this.startAt) / (this.reduced ? 120 : 240));
        this.opacity = 1 - progress;
        z = d.lift * (1 - progress);
        if (progress >= 1) {
          this.state = 'hidden';
          this.group.visible = false;
        }
      } else {
        this.opacity = 1;
      }

      this.pressed += (this.pressTarget - this.pressed) * 0.35;
      scale *= 1 - 0.06 * this.pressed;
      z -= 0.025 * this.pressed;

      this.material.opacity = this.opacity;
      this.group.position.z = z;
      this.group.rotation.x = tilt;
      this.group.scale.setScalar(scale);
    },

    remove() {
      this.material?.map?.dispose();
      this.material?.dispose();
      this.mesh?.geometry.dispose();
      this.hitMesh?.geometry.dispose();
      this.hitMesh?.material.dispose();
      this.el.removeObject3D('mesh');
      this.material = null;
    },
  });

  // Contorno de la hoja con barrido de luz al detectar el CV.
  AFRAME.registerComponent('rh-outline', {
    schema: { aspect: { type: 'number', default: 1.414 } },

    init() {
      this.canvas = document.createElement('canvas');
      this.texture = new THREE.CanvasTexture(this.canvas);
      this.texture.colorSpace = THREE.SRGBColorSpace;
      this.material = new THREE.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        depthWrite: false,
      });
      this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material);
      this.mesh.renderOrder = 1;
      this.mesh.visible = false;
      this.el.setObject3D('mesh', this.mesh);
      this.playing = false;
    },

    update() {
      const margin = 0.03;
      const w = 1 + margin;
      const h = this.data.aspect + margin;
      this.mesh.geometry.dispose();
      this.mesh.geometry = new THREE.PlaneGeometry(w, h);
      this.canvas.width = 512;
      this.canvas.height = Math.round(512 * (h / w));
      this.texture.dispose();
      this.texture = new THREE.CanvasTexture(this.canvas);
      this.texture.colorSpace = THREE.SRGBColorSpace;
      this.material.map = this.texture;
      this.material.needsUpdate = true;
    },

    sweep() {
      this.reduced = prefersReducedMotion();
      this.startAt = performance.now();
      this.duration = this.reduced ? 500 : 1150;
      this.playing = true;
      this.mesh.visible = true;
    },

    tick() {
      if (!this.playing) return;
      const t = (performance.now() - this.startAt) / this.duration;
      if (t >= 1) {
        this.playing = false;
        this.mesh.visible = false;
        return;
      }
      const progress = this.reduced ? 1 : clamp01(t / 0.75);
      const fade = t < 0.15 ? t / 0.15 : t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
      drawOutline(this.canvas, progress, fade);
      this.texture.needsUpdate = true;
    },

    remove() {
      this.texture.dispose();
      this.material.dispose();
      this.mesh.geometry.dispose();
      this.el.removeObject3D('mesh');
    },
  });

  // Copia la pose del ancla de MindAR y retiene las tarjetas unos instantes
  // cuando se pierde el seguimiento, para evitar parpadeos.
  AFRAME.registerComponent('rh-follow', {
    schema: {
      anchor: { type: 'selector' },
      hold: { type: 'int', default: 800 },
    },

    init() {
      this.state = 'hidden';
      this.lastSeen = 0;
      this.hiddenAt = 0;
      const obj = this.el.object3D;
      obj.matrixAutoUpdate = false;
      obj.visible = false;
    },

    cards() {
      return Array.from(this.el.querySelectorAll('[rh-card]'))
        .map((el) => el.components['rh-card'])
        .filter(Boolean);
    },

    setAspect(aspect) {
      const half = aspect / 2;
      this.el.querySelectorAll('[data-fy]').forEach((el) => {
        const pos = el.object3D.position;
        pos.y = Number(el.dataset.fy) * half;
      });
      this.el.querySelector('[rh-outline]')?.setAttribute('rh-outline', 'aspect', aspect);
    },

    show() {
      const quick = this.state === 'hiding' && performance.now() - this.hiddenAt < 600;
      this.state = 'visible';
      this.el.object3D.visible = true;
      const cards = this.cards();
      if (!quick) this.el.querySelector('[rh-outline]')?.components['rh-outline']?.sweep();
      const base = quick ? 0 : 420;
      cards.forEach((card, i) => card.appear(base + (i === 0 ? 0 : 260 + (i - 1) * 110)));
      this.el.emit('rh-found', { quick });
    },

    tick(time) {
      const anchor = this.data.anchor?.object3D;
      if (!anchor) return;
      const obj = this.el.object3D;

      if (anchor.visible) {
        obj.matrix.copy(anchor.matrix);
        obj.matrixWorldNeedsUpdate = true;
        this.lastSeen = time;
        if (this.state !== 'visible') this.show();
        return;
      }

      if (this.state === 'visible' && time - this.lastSeen > this.data.hold) {
        this.state = 'hiding';
        this.hiddenAt = performance.now();
        this.cards().forEach((card) => card.hide());
        this.el.emit('rh-lost');
      } else if (this.state === 'hiding' && performance.now() - this.hiddenAt > 320) {
        this.state = 'hidden';
        obj.visible = false;
      }
    },
  });
};

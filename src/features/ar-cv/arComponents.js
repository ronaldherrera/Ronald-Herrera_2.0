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

  // Copia la pose del ancla de MindAR y mantiene la escena unos instantes
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
        obj.matrix.copy(anchor.matrix);
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

// Escena 3D anclada al CV (componente A-Frame `rh-world`).
// Coordenadas de la hoja: ancho = 1, alto = proporción del CV, +z hacia la cámara.
//
// La hoja se convierte en la boca de un portal que se hunde en el papel (paredes
// y fondo con la rejilla dorada en movimiento: paralaje real). Una máscara
// invisible alrededor de la boca oculta el túnel fuera de ella. Sobre el portal
// flotan objetos con volumen, todos paralelos a la hoja: logotipo extruido,
// carrusel de bloques, sólidos de sección y botones-moneda. La luz se adapta a
// la luz real que ve la cámara.
import logoSvg from '../../assets/Logotio-blanco.svg?raw';
import { AR_TARGET, CAROUSEL_ITEMS, LINK_BUTTONS, PALETTE, WORLD_TILES } from './arCvData';
import {
  accentColor,
  drawButton,
  drawButtonLabel,
  drawCard,
  drawGridCell,
  drawGridFade,
  drawPlaque,
  drawSolidLabel,
  drawTagline,
  drawTunnelWall,
  loadWorldFonts,
} from './worldTextures';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => {
  const c = 1.5;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
const mod = (n, m) => ((n % m) + m) % m;
const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// Medidas (unidades de la hoja) y alturas sobre el papel (z > 0 fuera, z < 0 dentro del portal).
const PORTAL = { margin: 1.03, depth: 0.85, cellsPerUnit: 11.25, secondsPerCell: 2.2, gridOpacity: 0.85 };
const LOGO = { w: 0.94, depth: 0.045, z: 0.08, fy: 0.72 };
// Profundidad desde la que emergen los elementos en la animación de entrada.
const EMERGE_FROM = -0.78;
const TAGLINE = { w: 0.9, fy: 0.5, z: 0.02 };
// Carrusel con recorrido circular dentro del portal: las tarjetas siempre miran al
// frente (paralelas a la hoja) y se mueven por un círculo que entra en el túnel.
// Cada una va a una profundidad distinta, así no chocan entre sí ni con las paredes.
const CARD = { w: 0.36, h: 0.255, depth: 0.0175, fy: 0.08, radius: 0.3, front: 0.15, backOpacity: 0.55, scaleFront: 1.25, scaleBack: 0.55 };
const PLAQUE = { w: 0.5, h: 0.083, fy: -0.27, z: 0.03 };
const SOLID = { size: 0.09, z: 0.12, fy: -0.5, gap: 0.31, labelFy: -0.645, labelZ: 0.03 };
const COIN = { r: 0.08, depth: 0.018, z: 0.09, spread: 0.66, fyEnds: -0.74, fyDip: 0.3 };
const AUTO_ROTATE_WAIT = 4000;
const AUTO_ROTATE_EVERY = 3000;
const LIGHT_SAMPLE_MS = 400; // análisis de la luz real (miniatura de la cámara, en el dispositivo)

// Convierte los trazados del SVG del logotipo (comandos absolutos M L H V C Z)
// en un THREE.ShapePath con el eje Y invertido.
const svgToShapePath = (THREE, svg) => {
  const sp = new THREE.ShapePath();
  const paths = [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);
  for (const d of paths) {
    const tokens = d.match(/[MLHVCZ]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) || [];
    let i = 0;
    let cmd = '';
    let x = 0;
    let y = 0;
    let sx = 0;
    let sy = 0;
    const num = () => parseFloat(tokens[i++]);
    while (i < tokens.length) {
      if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++];
      switch (cmd) {
        case 'M':
          x = num(); y = num(); sx = x; sy = y;
          sp.moveTo(x, -y);
          cmd = 'L';
          break;
        case 'L':
          x = num(); y = num();
          sp.lineTo(x, -y);
          break;
        case 'H':
          x = num();
          sp.lineTo(x, -y);
          break;
        case 'V':
          y = num();
          sp.lineTo(x, -y);
          break;
        case 'C': {
          const x1 = num(); const y1 = num(); const x2 = num(); const y2 = num();
          x = num(); y = num();
          sp.bezierCurveTo(x1, -y1, x2, -y2, x, -y);
          break;
        }
        case 'Z':
        case 'z':
          sp.lineTo(sx, -sy);
          x = sx; y = sy;
          cmd = '';
          break;
        default:
          i++;
      }
    }
  }
  return sp;
};

// Agrupa los contornos en letras y agujeros según cuántos otros contornos los
// contienen (par = letra, impar = agujero), sin depender del sentido de giro.
const contoursToShapes = (THREE, shapePath) => {
  const contours = shapePath.subPaths
    .map((sub) => sub.getPoints(6))
    .filter((pts) => pts.length > 2)
    .map((pts) => ({ pts, area: Math.abs(THREE.ShapeUtils.area(pts)) }));
  const inside = (p, poly) => {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i];
      const b = poly[j];
      if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
    }
    return hit;
  };
  const parents = contours.map((c) =>
    contours.filter((o) => o !== c && o.area > c.area && inside(c.pts[0], o.pts))
  );
  const shapes = new Map();
  contours.forEach((c, i) => {
    if (parents[i].length % 2 === 0) {
      const pts = THREE.ShapeUtils.isClockWise(c.pts) ? [...c.pts].reverse() : c.pts;
      shapes.set(c, new THREE.Shape(pts));
    }
  });
  contours.forEach((c, i) => {
    if (parents[i].length % 2 === 1) {
      const owner = parents[i].filter((p) => shapes.has(p)).sort((a, b) => a.area - b.area)[0];
      if (!owner) return;
      const pts = THREE.ShapeUtils.isClockWise(c.pts) ? c.pts : [...c.pts].reverse();
      shapes.get(owner).holes.push(new THREE.Path(pts));
    }
  });
  return [...shapes.values()];
};

export const registerWorld = (AFRAME) => {
  if (AFRAME.components['rh-world']) return;
  const THREE = AFRAME.THREE;
  const color = (hex) => new THREE.Color(hex);

  const roundedShape = (w, h, r) => {
    const x = -w / 2;
    const y = -h / 2;
    const rr = Math.min(r, w / 2, h / 2);
    const s = new THREE.Shape();
    s.moveTo(x + rr, y);
    s.lineTo(x + w - rr, y);
    s.quadraticCurveTo(x + w, y, x + w, y + rr);
    s.lineTo(x + w, y + h - rr);
    s.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    s.lineTo(x + rr, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - rr);
    s.lineTo(x, y + rr);
    s.quadraticCurveTo(x, y, x + rr, y);
    return s;
  };

  const lit = (hex, opts = {}) =>
    new THREE.MeshStandardMaterial({ color: color(hex), roughness: 0.5, metalness: 0.1, transparent: true, ...opts });

  // Cara con texto/imagen que recibe la luz de la escena pero conserva un mínimo
  // de luz propia para seguir siendo legible en sitios oscuros.
  const litFace = (texture, opts = {}) =>
    new THREE.MeshStandardMaterial({
      map: texture,
      color: color('#737373'), // atenúa la luz recibida: mantiene los negros
      emissive: color('#ffffff'),
      emissiveMap: texture,
      emissiveIntensity: 0.55,
      roughness: 0.9,
      metalness: 0,
      transparent: true,
      ...opts,
    });

  // Cuadrilátero con UV explícitas: v = 1 en el borde de la boca, v = 0 al fondo.
  const quad = (a, b, c, d) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...d], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    return g;
  };

  AFRAME.registerComponent('rh-world', {
    init() {
      this.root = new THREE.Group();
      this.root.visible = false;
      this.el.setObject3D('world', this.root);
      this.aspect = AR_TARGET.fallbackAspect;
      this.built = false;
      this.active = false;
      this.hitMeshes = [];
      this.gridTextures = [];
      this.car = { offset: 0, target: 0, dragging: false, lastInteraction: 0, lastAuto: 0, center: -1 };
      loadWorldFonts().then(() => this.build());
    },

    texture(canvas) {
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.SRGBColorSpace;
      const renderer = this.el.sceneEl.renderer;
      if (renderer) t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return t;
    },

    track(group, materials) {
      group.userData.materials = materials;
      group.userData.pressed = 0;
      return group;
    },

    // Plano flotante (texto o rótulo) que no recibe luz.
    floatingPlane(canvas, w, h) {
      const mat = new THREE.MeshBasicMaterial({ map: this.texture(canvas), transparent: true, depthWrite: false, opacity: 0 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      mesh.renderOrder = 2;
      this.root.add(mesh);
      return mesh;
    },

    addHit(meshes, target) {
      meshes.forEach((mesh) => {
        mesh.userData.target = target;
        this.hitMeshes.push(mesh);
      });
    },

    build() {
      if (this.built || this.removed) return;
      const root = this.root;

      // Luz propia de la escena, fija respecto a la hoja.
      const ambient = new THREE.AmbientLight(0xffffff, 0.45);
      const sun = new THREE.DirectionalLight(0xffffff, 0.9);
      sun.position.set(-0.5, 0.9, 1.4);
      const sunTarget = new THREE.Object3D();
      sun.target = sunTarget;
      const rim = new THREE.DirectionalLight(0xfff1d6, 0.3);
      rim.position.set(0.8, -0.6, 0.6);
      rim.target = sunTarget;
      root.add(ambient, sun, rim, sunTarget);
      this.lights = { ambient, sun, rim };
      this.env = { lum: 0.45, color: new THREE.Color(1, 1, 1), dir: new THREE.Vector3(-0.35, 0.6, 1).normalize() };
      this.envTarget = { lum: 0.45, color: new THREE.Color(1, 1, 1), dir: this.env.dir.clone() };

      this.buildPortal();
      this.buildLogo();
      this.tagline = this.floatingPlane(drawTagline(), TAGLINE.w, TAGLINE.w * (170 / 1024));

      // Carrusel: bloques gruesos paralelos a la hoja.
      const total = CAROUSEL_ITEMS.length;
      this.cards = CAROUSEL_ITEMS.map((item, index) => {
        const group = new THREE.Group();
        const cap = lit('#0e0e0e', { roughness: 0.8 });
        const side = lit(accentColor(item.accent), { roughness: 0.55, metalness: 0.15 });
        const body = new THREE.Mesh(
          new THREE.ExtrudeGeometry(roundedShape(CARD.w, CARD.h, 0.02), { depth: CARD.depth, bevelEnabled: false, curveSegments: 6 }),
          [cap, side]
        );
        const faceMat = litFace(this.texture(drawCard(item, index, total, CARD.w, CARD.h, 1000, null)), { alphaTest: 0.05 });
        const face = new THREE.Mesh(new THREE.PlaneGeometry(CARD.w, CARD.h), faceMat);
        face.position.z = CARD.depth + 0.0008;
        group.add(body, face);
        this.track(group, [cap, side, faceMat]);
        root.add(group);
        this.addHit([body, face], { kind: 'card', index, group });
        if (item.image) {
          const img = new Image();
          img.decoding = 'async';
          img.onload = () => {
            if (this.removed) return;
            faceMat.map.image = drawCard(item, index, total, CARD.w, CARD.h, 1000, img);
            faceMat.map.needsUpdate = true;
          };
          img.src = item.image;
        }
        return { item, group };
      });

      // Rótulo del carrusel.
      this.plaqueMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 });
      this.plaque = new THREE.Mesh(new THREE.PlaneGeometry(PLAQUE.w, PLAQUE.h), this.plaqueMat);
      this.plaque.renderOrder = 2;
      root.add(this.plaque);

      // Sólidos de sección: mate (sin brillos) y con aristas marcadas.
      this.solids = WORLD_TILES.map((tile) => {
        const s = SOLID.size;
        let geometry;
        if (tile.shape === 'triangle') {
          geometry = new THREE.ConeGeometry(s * 0.72, s * 1.15, 4);
          geometry.rotateX(Math.PI / 2); // vértice hacia la cámara
        } else if (tile.shape === 'rhombus') {
          geometry = new THREE.OctahedronGeometry(s * 0.68);
        } else {
          geometry = new THREE.BoxGeometry(s * 0.9, s * 0.9, s * 0.9);
        }
        const mat = new THREE.MeshLambertMaterial({ color: color(accentColor(tile.color)), flatShading: true, transparent: true });
        const mesh = new THREE.Mesh(geometry, mat);
        const edgeMat = new THREE.LineBasicMaterial({ color: color('#101010'), transparent: true, opacity: 0.55 });
        mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMat));
        const group = this.track(new THREE.Group(), [mat, edgeMat]);
        group.add(mesh);
        root.add(group);
        const label = this.floatingPlane(drawSolidLabel(tile), 0.28, 0.06);
        this.addHit([mesh, label], { kind: 'panel', id: tile.id, group });
        return { tile, group, mesh, label };
      });

      // Botones como monedas gruesas con el icono en su cara y etiqueta grande.
      this.coins = LINK_BUTTONS.map((button, index) => {
        const side = lit(accentColor(button.color), { roughness: 0.5, metalness: 0.2 });
        const caps = lit('#0e0e0e', { roughness: 0.8 });
        const geometry = new THREE.CylinderGeometry(COIN.r, COIN.r, COIN.depth, 48);
        geometry.rotateX(Math.PI / 2); // eje perpendicular a la hoja
        geometry.translate(0, 0, COIN.depth / 2);
        const mesh = new THREE.Mesh(geometry, [side, caps, caps]);
        const faceMat = litFace(this.texture(drawButton(button, 256)));
        const face = new THREE.Mesh(new THREE.CircleGeometry(COIN.r * 0.98, 48), faceMat);
        face.position.z = COIN.depth + 0.0008;
        const labelMat = new THREE.MeshBasicMaterial({ map: this.texture(drawButtonLabel(button.label)), transparent: true, depthWrite: false });
        const label = new THREE.Mesh(new THREE.PlaneGeometry(COIN.r * 2.6, COIN.r * 2.6 * (110 / 460)), labelMat);
        label.position.set(0, -COIN.r * 1.32, COIN.depth / 2);
        const group = this.track(new THREE.Group(), [side, caps, faceMat, labelMat]);
        group.add(mesh, face, label);
        root.add(group);
        this.addHit([mesh, face, label], { kind: 'link', button, group });
        return { button, group, phase: index * 0.9 };
      });

      this.built = true;
      this.layout();
      if (this.pendingShow) this.show(this.pendingShow.quick);
    },

    // Portal: túnel con paredes y fondo, rejilla dorada que se desliza hacia
    // dentro y máscara invisible alrededor de la boca.
    buildPortal() {
      const root = this.root;
      this.portal = new THREE.Group();
      this.portalParts = [];
      root.add(this.portal);

      const wallTex = this.texture(drawTunnelWall());
      const fadeTex = this.texture(drawGridFade());
      const cell = drawGridCell();
      const makeGrid = () => {
        const t = this.texture(cell);
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        this.gridTextures.push(t);
        return t;
      };

      this.walls = ['left', 'right', 'top', 'bottom'].map((side) => {
        const base = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ map: wallTex, side: THREE.DoubleSide }));
        const gridTex = makeGrid();
        const grid = new THREE.Mesh(
          new THREE.BufferGeometry(),
          new THREE.MeshBasicMaterial({
            map: gridTex,
            alphaMap: fadeTex,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending, // las líneas brillan sobre el negro
            opacity: 0,
          })
        );
        grid.renderOrder = 1;
        this.portal.add(base, grid);
        return { side, base, grid, gridTex };
      });

      // Fondo: negro, sin líneas (las paredes se funden a negro hacia el centro).
      this.floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: color('#000000') }));
      this.portal.add(this.floor);

      // Máscara invisible alrededor de la boca: oculta lo que hay bajo el papel
      // fuera del portal y deja ver la cámara.
      this.occluderMat = new THREE.MeshBasicMaterial({ colorWrite: false });
      this.occluder = new THREE.Mesh(new THREE.BufferGeometry(), this.occluderMat);
      this.occluder.renderOrder = -1;
      root.add(this.occluder);

      // Borde dorado de la boca.
      this.rimMat = new THREE.MeshBasicMaterial({ color: color(PALETTE.gold), transparent: true, depthWrite: false, opacity: 0 });
      this.rim = new THREE.Mesh(new THREE.BufferGeometry(), this.rimMat);
      this.rim.renderOrder = 3;
      root.add(this.rim);
    },

    layoutPortal() {
      const W = PORTAL.margin;
      const H = this.aspect * PORTAL.margin;
      const D = PORTAL.depth;
      const x = W / 2;
      const y = H / 2;
      const corners = {
        left: [[-x, y, 0], [-x, -y, 0], [-x, -y, -D], [-x, y, -D]],
        right: [[x, -y, 0], [x, y, 0], [x, y, -D], [x, -y, -D]],
        top: [[x, y, 0], [-x, y, 0], [-x, y, -D], [x, y, -D]],
        bottom: [[-x, -y, 0], [x, -y, 0], [x, -y, -D], [-x, -y, -D]],
      };
      const cells = PORTAL.cellsPerUnit;
      this.walls.forEach((w) => {
        const geo = quad(...corners[w.side]);
        w.base.geometry.dispose();
        w.grid.geometry.dispose();
        w.base.geometry = geo;
        w.grid.geometry = geo.clone();
        const along = w.side === 'left' || w.side === 'right' ? H : W;
        w.gridTex.repeat.set(Math.round(along * cells), D * cells);
      });
      this.floor.scale.set(W, H, 1);
      this.floor.position.z = -D;

      const outer = 6;
      const shape = new THREE.Shape();
      shape.moveTo(-outer, -outer);
      shape.lineTo(outer, -outer);
      shape.lineTo(outer, outer);
      shape.lineTo(-outer, outer);
      shape.lineTo(-outer, -outer);
      const hole = new THREE.Path();
      hole.moveTo(-x, -y);
      hole.lineTo(-x, y);
      hole.lineTo(x, y);
      hole.lineTo(x, -y);
      hole.lineTo(-x, -y);
      shape.holes.push(hole);
      this.occluder.geometry.dispose();
      this.occluder.geometry = new THREE.ShapeGeometry(shape);

      const t = 0.01;
      const frame = new THREE.Shape();
      frame.moveTo(-x - t, -y - t);
      frame.lineTo(x + t, -y - t);
      frame.lineTo(x + t, y + t);
      frame.lineTo(-x - t, y + t);
      frame.lineTo(-x - t, -y - t);
      frame.holes.push(hole);
      this.rim.geometry.dispose();
      this.rim.geometry = new THREE.ShapeGeometry(frame);
      this.rim.position.z = 0.001;
    },

    // Logotipo «RonaldHerrera» extruido a partir del SVG de la web.
    buildLogo() {
      const shapes = contoursToShapes(THREE, svgToShapePath(THREE, logoSvg));
      const geometry = new THREE.ExtrudeGeometry(shapes, {
        depth: 18,
        bevelEnabled: true,
        bevelThickness: 2.5,
        bevelSize: 1.2,
        bevelSegments: 1,
        curveSegments: 4,
      });
      geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      const scale = LOGO.w / (box.max.x - box.min.x);
      geometry.translate(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, -box.min.z);
      geometry.scale(scale, scale, LOGO.depth / (box.max.z - box.min.z));
      this.logoH = (box.max.y - box.min.y) * scale;

      const face = lit(PALETTE.cream, { roughness: 0.55, metalness: 0.02 });
      const side = lit(PALETTE.gold, { roughness: 0.4, metalness: 0.4 });
      const mesh = new THREE.Mesh(geometry, [face, side]);
      this.logo = this.track(new THREE.Group(), [face, side]);
      this.logo.add(mesh);
      this.root.add(this.logo);
      const hitArea = new THREE.Mesh(
        new THREE.PlaneGeometry(LOGO.w * 1.05, this.logoH * 1.6),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitArea.position.z = LOGO.depth;
      this.logo.add(hitArea);
      this.addHit([mesh, hitArea], { kind: 'panel', id: 'about', group: this.logo });
    },

    // Posiciones base según la proporción real del CV.
    layout() {
      if (!this.built) return;
      const halfH = this.aspect / 2;
      this.layoutPortal();
      this.logoY = LOGO.fy * halfH;
      this.tagline.position.set(0, TAGLINE.fy * halfH, TAGLINE.z);
      this.carouselY = CARD.fy * halfH;
      this.plaque.position.set(0, PLAQUE.fy * halfH, PLAQUE.z);
      this.solids.forEach((s, i) => {
        s.base = new THREE.Vector3((i - 1) * SOLID.gap, SOLID.fy * halfH, SOLID.z);
        s.label.position.set(s.base.x, SOLID.labelFy * halfH, SOLID.labelZ);
      });
      const n = this.coins.length;
      this.coins.forEach((c, i) => {
        const x = n > 1 ? -COIN.spread + (2 * COIN.spread * i) / (n - 1) : 0;
        const u = x / COIN.spread;
        c.base = new THREE.Vector3(x, (COIN.fyEnds - COIN.fyDip * (1 - u * u)) * halfH, COIN.z);
      });
    },

    setAspect(aspect) {
      if (!aspect || Math.abs(aspect - this.aspect) < 0.001) return;
      this.aspect = aspect;
      this.layout();
    },

    show(quick = false) {
      if (!this.built) {
        this.pendingShow = { quick };
        return;
      }
      this.pendingShow = null;
      this.reduced = prefersReducedMotion();
      this.quick = quick;
      this.active = true;
      this.hiding = false;
      this.root.visible = true;
      this.shownAt = performance.now();
      if (!quick) this.car.lastInteraction = this.shownAt;
      this.car.center = -1;
    },

    hide() {
      this.pendingShow = null;
      if (!this.active || this.hiding) return;
      this.hiding = true;
      this.hideAt = performance.now();
    },

    setOpacity(group, value) {
      group.userData.materials.forEach((m) => {
        if (m.userData.baseOpacity === undefined) m.userData.baseOpacity = m.opacity;
        m.opacity = value * m.userData.baseOpacity;
      });
      group.visible = value > 0.01;
    },

    pressScale(group) {
      const u = group.userData;
      u.pressed += ((u.pressTarget || 0) - u.pressed) * 0.35;
      return 1 - 0.08 * u.pressed;
    },

    // ------------------------------------------------------------------
    // Luz real: se analiza una miniatura de la cámara (32×24 px) en el propio
    // dispositivo para estimar intensidad, tono y dirección de la luz. No se
    // guarda ni se envía ninguna imagen.
    // ------------------------------------------------------------------
    sampleAmbient(now) {
      if (now - (this.lastSample || 0) < LIGHT_SAMPLE_MS) return;
      this.lastSample = now;
      const video = this.el.sceneEl.systems['mindar-image-system']?.video;
      if (!video || video.readyState < 2 || !video.videoWidth) return;
      if (!this.sampleCtx) {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 24;
        this.sampleCtx = canvas.getContext('2d', { willReadFrequently: true });
      }
      const ctx = this.sampleCtx;
      try {
        ctx.drawImage(video, 0, 0, 32, 24);
      } catch {
        return;
      }
      const data = ctx.getImageData(0, 0, 32, 24).data;
      let r = 0;
      let g = 0;
      let b = 0;
      let lum = 0;
      let gx = 0;
      let gy = 0;
      for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 32; x++) {
          const i = (y * 32 + x) * 4;
          const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          lum += l;
          gx += l * (x / 31 - 0.5);
          gy += l * (0.5 - y / 23);
        }
      }
      const n = 32 * 24;
      const t = this.envTarget;
      t.lum = lum / n / 255;
      const max = Math.max(r, g, b, 1);
      t.color.setRGB(r / max, g / max, b / max).lerp(new THREE.Color(1, 1, 1), 0.45);

      // Dirección: del lado más iluminado de la imagen, llevada al espacio de la hoja.
      const camera = this.el.sceneEl.camera;
      if (camera && lum > 0) {
        const sx = Math.max(-1, Math.min(1, (gx / lum) * 6));
        const sy = Math.max(-1, Math.min(1, (gy / lum) * 6));
        const dir = new THREE.Vector3(sx, sy, 0.9).normalize();
        dir.applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));
        dir.applyQuaternion(this.root.getWorldQuaternion(new THREE.Quaternion()).invert());
        if (dir.z < 0.35) dir.z = 0.35; // la luz siempre llega desde encima del papel
        t.dir.copy(dir.normalize());
      }
    },

    applyAmbient(dt) {
      const k = 1 - Math.exp(-dt / 500);
      const e = this.env;
      const t = this.envTarget;
      e.lum += (t.lum - e.lum) * k;
      e.color.lerp(t.color, k);
      e.dir.lerp(t.dir, k).normalize();
      const level = clamp01((e.lum - 0.06) / 0.55);
      const { ambient, sun, rim } = this.lights;
      ambient.intensity = 0.15 + 0.45 * level;
      sun.intensity = 0.25 + 0.8 * level;
      rim.intensity = 0.08 + 0.25 * level;
      ambient.color.copy(e.color);
      sun.color.copy(e.color);
      sun.position.copy(e.dir).multiplyScalar(2);
    },

    // ------------------------------------------------------------------
    // Carrusel: arrastre, inercia y navegación
    // ------------------------------------------------------------------
    touch() {
      this.car.lastInteraction = performance.now();
    },

    beginDrag() {
      this.car.dragging = true;
      this.car.lastInteraction = performance.now();
    },

    dragBy(fraction) {
      this.car.offset -= fraction * 2.4;
      this.car.target = this.car.offset;
    },

    endDrag(velocity) {
      const c = this.car;
      c.dragging = false;
      c.target = Math.round(c.offset - velocity * 2.4 * 220);
      c.lastInteraction = performance.now();
    },

    goTo(index) {
      const c = this.car;
      const n = this.cards.length;
      const base = Math.round(c.offset);
      const delta = mod(index - mod(base, n) + Math.floor(n / 2), n) - Math.floor(n / 2);
      c.target = base + delta;
      c.lastInteraction = performance.now();
    },

    // ------------------------------------------------------------------
    // Interacción
    // ------------------------------------------------------------------
    hitTest(raycaster) {
      if (!this.active || this.hiding) return null;
      const candidates = this.hitMeshes.filter((m) => {
        const g = m.userData.target.group;
        return g.visible && g.userData.materials[0].opacity > 0.5;
      });
      const hit = raycaster.intersectObjects(candidates, false)[0];
      return hit ? hit.object.userData.target : null;
    },

    setPressed(target, pressed) {
      if (target?.group) target.group.userData.pressTarget = pressed ? 1 : 0;
    },

    // Devuelve la acción a ejecutar o null si solo se ha movido el carrusel.
    activate(target) {
      if (!target) return null;
      if (target.kind === 'card') {
        const n = this.cards.length;
        const rel = mod(target.index - this.car.offset + n / 2, n) - n / 2;
        if (Math.abs(rel) > 0.5) {
          this.goTo(target.index);
          return null;
        }
        const { item } = this.cards[target.index];
        return { type: 'project', section: item.section, id: item.id };
      }
      if (target.kind === 'panel') return { type: 'panel', id: target.id };
      if (target.kind === 'link') return { type: 'link', ...target.button };
      return null;
    },

    // ------------------------------------------------------------------
    // Animación
    // ------------------------------------------------------------------
    tick(time, dt = 16) {
      if (!this.built || !this.active) return;
      const now = performance.now();
      const t = now - this.shownAt;
      const instant = this.reduced || this.quick;
      const still = this.reduced;
      const at = (start, dur) => (instant ? clamp01(t / (this.reduced ? 200 : 220)) : clamp01((t - start) / dur));
      const fade = this.hiding ? 1 - clamp01((now - this.hideAt) / 250) : 1;
      const sec = now / 1000;
      // Sube desde dentro del portal (z negativo) hasta su altura.
      const rise = (from, to, e) => from + (to - from) * e;

      // 1) El papel se hunde: el túnel crece en profundidad y aparece la rejilla.
      const pp = at(0, 900);
      const pe = easeOutCubic(pp);
      this.portal.scale.z = Math.max(0.001, pe);
      this.portal.visible = fade > 0.01;
      this.occluder.visible = fade > 0.01;
      const gridAlpha = fade * clamp01((pp - 0.15) * 2);
      this.walls.forEach((w) => { w.grid.material.opacity = PORTAL.gridOpacity * gridAlpha; });
      this.rimMat.opacity = fade * clamp01(pp * 2) * (still ? 0.8 : 0.65 + 0.2 * Math.sin(sec * 2));
      if (!still) {
        // Las líneas se deslizan hacia el fondo: sensación de ser absorbidas.
        const flow = (sec / PORTAL.secondsPerCell) % 1;
        this.gridTextures.forEach((tex) => { tex.offset.y = flow; });
      }

      // Luz de la escena según la luz real de la habitación.
      this.sampleAmbient(now);
      this.applyAmbient(dt);

      // 2) El logotipo emerge del portal.
      const lp = at(450, 950);
      const le = instant ? lp : easeOutBack(lp);
      const lz = rise(EMERGE_FROM, LOGO.z, le) + (still || lp < 1 ? 0 : 0.008 * Math.sin(sec * 1.2));
      this.logo.position.set(0, this.logoY, lz);
      this.logo.scale.setScalar(this.pressScale(this.logo));
      this.setOpacity(this.logo, fade * clamp01(lp * 3));
      const tp = at(650, 900);
      this.tagline.position.z = rise(EMERGE_FROM, TAGLINE.z, instant ? tp : easeOutCubic(tp));
      this.tagline.material.opacity = fade * clamp01(tp * 2);

      // 3) Carrusel.
      this.updateCarousel(dt, at(800, 850), fade, now, instant);

      // 4) Sólidos de sección.
      this.solids.forEach((s, i) => {
        const p = at(1200 + i * 110, 800);
        const e = instant ? p : easeOutBack(p);
        const g = s.group;
        const z = rise(EMERGE_FROM, s.base.z, e) + (still || p < 1 ? 0 : 0.01 * Math.sin(sec * 1.5 + i));
        g.position.set(s.base.x, s.base.y, z);
        g.scale.setScalar(this.pressScale(g));
        if (!still) {
          if (s.tile.shape === 'square') s.mesh.rotation.set(sec * 0.6, sec * 0.8, 0);
          else if (s.tile.shape === 'rhombus') s.mesh.rotation.set(0.5, sec * 0.9, sec * 0.3);
          else s.mesh.rotation.set(0.35, 0, sec * 0.7);
        }
        const alpha = fade * clamp01(p * 3);
        this.setOpacity(g, alpha);
        s.label.material.opacity = alpha;
        s.label.position.z = rise(EMERGE_FROM, SOLID.labelZ, instant ? p : easeOutCubic(p));
      });

      // 5) Monedas: salen del portal y se colocan en arco, flotando.
      this.coins.forEach((c, i) => {
        const p = at(1400 + i * 75, 850);
        const move = easeOutCubic(p);
        const pop = instant ? p : easeOutBack(p);
        const bob = still || p < 1 ? 0 : 1;
        const g = c.group;
        const z = rise(EMERGE_FROM, c.base.z, pop) + bob * 0.012 * Math.sin(sec * 1.7 + c.phase);
        g.position.set(c.base.x * move, this.carouselY + (c.base.y - this.carouselY) * move, z);
        g.scale.setScalar(this.pressScale(g));
        this.setOpacity(g, fade * clamp01(p * 3));
      });

      if (fade <= 0) {
        this.active = false;
        this.hiding = false;
        this.root.visible = false;
      }
    },

    updateCarousel(dt, appear, fade, now, instant) {
      const c = this.car;
      const n = this.cards.length;
      if (!c.dragging) {
        if (!this.reduced && appear >= 1 && now - c.lastInteraction > AUTO_ROTATE_WAIT && now - c.lastAuto > AUTO_ROTATE_EVERY) {
          c.target = Math.round(c.target) + 1;
          c.lastAuto = now;
        }
        c.offset += (c.target - c.offset) * (1 - Math.exp(-dt / 110));
      }

      const center = mod(Math.round(c.offset), n);
      if (center !== c.center) {
        c.center = center;
        const canvas = drawPlaque(this.cards[center].item, center, n);
        if (this.plaqueMat.map) {
          this.plaqueMat.map.image = canvas;
          this.plaqueMat.map.needsUpdate = true;
        } else {
          this.plaqueMat.map = this.texture(canvas);
          this.plaqueMat.needsUpdate = true;
        }
      }

      // El tambor sube desde el fondo del portal dando un giro durante la entrada.
      const ae = instant ? appear : easeOutCubic(appear);
      const ringZ = CARD.front - CARD.radius;
      const centerZ = EMERGE_FROM + (ringZ - EMERGE_FROM) * ae;
      const spin = instant ? 0 : (1 - ae) * 1.5;
      const step = (Math.PI * 2) / n;
      this.cards.forEach((card, i) => {
        const rel = mod(i - c.offset + spin + n / 2, n) - n / 2;
        const theta = rel * step;
        const g = card.group;
        const facing = Math.cos(theta); // 1 = de frente, -1 = detrás
        const hover = !this.reduced && appear >= 1 ? Math.max(0, facing) ** 8 * 0.01 * Math.sin(now / 520) : 0;
        g.position.set(CARD.radius * Math.sin(theta), this.carouselY, centerZ + CARD.radius * facing + hover);
        g.rotation.set(0, 0, 0); // siempre mirando al frente
        // Tamaño según la posición: la de delante es la mayor, las contiguas algo
        // menores y las de atrás las más pequeñas (cambia de forma continua al girar).
        const nearFront = ((facing + 1) / 2) ** 2;
        const size = CARD.scaleBack + (CARD.scaleFront - CARD.scaleBack) * nearFront;
        g.scale.setScalar(size * this.pressScale(g));
        // Las de atrás se atenúan: sensación de profundidad dentro del túnel.
        const depthFade = CARD.backOpacity + (1 - CARD.backOpacity) * (facing + 1) / 2;
        this.setOpacity(g, depthFade * clamp01(appear * 2.5) * fade);
      });
      this.plaqueMat.opacity = fade * clamp01((appear - 0.5) * 2);
      this.plaque.position.z = EMERGE_FROM + (PLAQUE.z - EMERGE_FROM) * (instant ? appear : easeOutCubic(appear));
    },

    remove() {
      this.removed = true;
      this.root.traverse((obj) => {
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
        mats.forEach((m) => {
          m.map?.dispose();
          m.alphaMap?.dispose();
          m.dispose();
        });
      });
      this.el.removeObject3D('world');
    },
  });
};

import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import './Skills.css';

const SKILLS_DATA = [
  // Hard Skills (7)
  { id: 'react', label: 'React', type: 'hard', color: '#20232A', textColor: '#61DAFB' },
  { id: 'js', label: 'JavaScript', type: 'hard', color: '#F7DF1E', textColor: '#000' },
  { id: 'css3', label: 'CSS 3', type: 'hard', color: '#1572B6', textColor: '#fff' },
  { id: 'node', label: 'Node.js', type: 'hard', color: '#339933', textColor: '#fff' },
  { id: 'figma', label: 'Figma', type: 'hard', color: '#F24E1E', textColor: '#fff' },
  { id: 'ai', label: 'Illustrator', type: 'hard', color: '#FF9A00', textColor: '#fff' },
  { id: 'ae', label: 'After Effects', type: 'hard', color: '#CF96FD', textColor: '#000' },
  
  // Soft Skills (7)
  { id: 'uxr', label: 'UX Research', type: 'soft', color: '#6C63FF', textColor: '#fff' },
  { id: 'agile', label: 'Agile', type: 'soft', color: '#FFD700', textColor: '#000' },
  { id: 'lean', label: 'Lean UX', type: 'soft', color: '#00ff88', textColor: '#000' },
  { id: 'analytics', label: 'Analítica', type: 'soft', color: '#FF4B2B', textColor: '#fff' },
  { id: 'empatia', label: 'Empatía', type: 'soft', color: '#FF69B4', textColor: '#fff' },
  { id: 'resolucion', label: 'Resolutivo', type: 'soft', color: '#20B2AA', textColor: '#fff' },
  { id: 'adaptabilidad', label: 'Adaptabilidad', type: 'soft', color: '#FFA500', textColor: '#000' },
];

const Skills = () => {
  const sceneRef = useRef(null);
  const engineRef = useRef(Matter.Engine.create({ 
    gravity: { x: 0, y: 1.2 },
    enableSleeping: true, // Crucial para estabilidad: congela piezas en reposo
    positionIterations: 20,
    velocityIterations: 12,
    constraintIterations: 10
  }));
  const [isGameActive, setIsGameActive] = useState(false);
  const [chipPositions, setChipPositions] = useState({});
  const [injectedSkills, setInjectedSkills] = useState(new Set());
  const [showContactModal, setShowContactModal] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [flashType, setFlashType] = useState(null); // 'hard' o 'soft'
  const isGameActiveRef = useRef(isGameActive);

  useEffect(() => {
    isGameActiveRef.current = isGameActive;
  }, [isGameActive]);


  const bodiesRef = useRef({});
  const racksRef   = useRef(null);
  const arcInnerSvgRef = useRef(null);
  const arcMidASvgRef  = useRef(null);
  const arcMidBSvgRef  = useRef(null);
  const arcOuterSvgRef = useRef(null);
  const [physicsCenter, setPhysicsCenter] = useState(null);

  const getChipDims = (skill) => {
    const isLarge = skill.size === 'large';
    const width = isLarge ? 110 : Math.max(45, skill.label.length * 4.5 + 20);
    const height = isLarge ? 35 : 22;
    return { width, height };
  };

  // Cronómetro: solo avanza si el juego está activo y no se ha completado
  useEffect(() => {
    let interval;
    if (isGameActive && injectedSkills.size < SKILLS_DATA.length) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isGameActive, injectedSkills.size]);

  const handleReset = () => {
    // Resetear estados react
    setInjectedSkills(new Set());
    setSeconds(0);
    setChipPositions({});
    setShowContactModal(false);
    
    // Forzar re-ejecución del motor de física
    setResetKey(prev => prev + 1);
  };

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };


  useEffect(() => {
    if (!sceneRef.current) return;

    const engine = engineRef.current;
    const { world } = engine;
    const width = sceneRef.current.clientWidth;
    const height = sceneRef.current.clientHeight;

    const render = Matter.Render.create({
      element: sceneRef.current,
      engine: engine,
      options: { width, height, wireframes: false, background: 'transparent' }
    });

    // Suelo alineado justo encima del contenedor de racks
    const wallThickness = 100;
    const racksHeight = racksRef.current ? racksRef.current.clientHeight : 100;
    const groundY = height - racksHeight;
    const ground = Matter.Bodies.rectangle(width / 2, groundY + wallThickness / 2, width, wallThickness, { 
      isStatic: true, 
      render: { visible: false },
      label: 'ground'
    });
    
    const leftWall = Matter.Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height * 2, { 
      isStatic: true, 
      render: { visible: false } 
    });
    
    const rightWall = Matter.Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height * 2, { 
      isStatic: true, 
      render: { visible: false } 
    });
    
    const ceiling = Matter.Bodies.rectangle(width / 2, -wallThickness / 2, width * 2, wallThickness, { 
      isStatic: true, 
      render: { visible: false } 
    });

    const centerX = width / 2;
    const isMobile = width < 600;
    // En móvil, subir el núcleo y usar radios más pequeños
    const centerY = isMobile ? height * 0.38 : height / 2 - 50;
    const r_inner = isMobile ? 65  : 140;
    const r_mid   = isMobile ? 110 : 230;
    const r_outer = isMobile ? 150 : 325; // solo desktop

    // Guardar centro y radios para el SVG overlay
    setPhysicsCenter({ x: centerX, y: centerY, w: width, h: height, rInner: r_inner, rMid: r_mid, rOuter: r_outer, isMobile });

    // ── ARCOS FÍSICOS GIRATORIOS ──────────────────────────────────────────
    // Función: crea un array de segmentos estáticos en forma de arco arc
    // que se rotarán manualmente cada frame
    const createRotatingArc = (radius, segCount, arcFraction, segWidth, segHeight) => {
      const segs = [];
      const totalAngle = Math.PI * 2 * arcFraction;
      for (let i = 0; i < segCount; i++) {
        const angle = (i / segCount) * totalAngle;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        const seg = Matter.Bodies.rectangle(x, y, segWidth, segHeight, {
          isStatic: true,
          angle: angle + Math.PI / 2,
          render: { visible: false },
          friction: 0.1,
          restitution: 0.2,
          label: 'arc'
        });
        segs.push(seg);
      }
      return segs;
    };

    // Arcos: radios responsivos, móvil sin arco exterior
    const arcInner = createRotatingArc(r_inner, 10, 0.3,  Math.max(20, r_inner*0.2), 12);
    const arcMidA  = createRotatingArc(r_mid,    7, 0.18, Math.max(24, r_mid*0.14),   12);
    const arcMidB  = createRotatingArc(r_mid,    7, 0.18, Math.max(24, r_mid*0.14),   12);

    rotateArcBodiesInit(arcMidB, r_mid, 0.18, Math.PI);

    const bodiesToAdd = [ground, leftWall, rightWall, ceiling, ...arcInner, ...arcMidA, ...arcMidB];

    if (!isMobile) {
      const arcOuter = createRotatingArc(r_outer, 16, 0.3, Math.max(32, r_outer*0.12), 12);
      bodiesToAdd.push(...arcOuter);
      // Guardar ref para rotar en update
      window.__arcOuter__ = arcOuter;
    } else {
      window.__arcOuter__ = null;
    }
    window.__arcInner__ = arcInner;
    window.__arcMidA__ = arcMidA;
    window.__arcMidB__ = arcMidB;
    window.__rInner__ = r_inner;
    window.__rMid__ = r_mid;
    window.__rOuter__ = r_outer;

    Matter.Composite.add(world, bodiesToAdd);

    // Ángulos de rotación por arco (rad)
    let angInner = 0;
    let angMidA  = 0;
    let angMidB  = Math.PI; // empieza opuesto
    let angOuter = 0;
    const speedInner = 0.012;
    const speedMidA  = -0.007;
    const speedMidB  = -0.007; // mismo sentido, pareados
    const speedOuter = 0.004;

    // Función utilitaria para posición inicial de arco B
    function rotateArcBodiesInit(segs, radius, arcFraction, baseAngle) {
      const segCount = segs.length;
      const totalAngle = Math.PI * 2 * arcFraction;
      segs.forEach((seg, i) => {
        const a = baseAngle + (i / segCount) * totalAngle;
        const x = centerX + Math.cos(a) * radius;
        const y = centerY + Math.sin(a) * radius;
        Matter.Body.setPosition(seg, { x, y });
        Matter.Body.setAngle(seg, a + Math.PI / 2);
      });
    }

    const rotateArcBodies = (segs, radius, arcFraction, baseAngle) => {
      const segCount = segs.length;
      const totalAngle = Math.PI * 2 * arcFraction;
      segs.forEach((seg, i) => {
        const a = baseAngle + (i / segCount) * totalAngle;
        const x = centerX + Math.cos(a) * radius;
        const y = centerY + Math.sin(a) * radius;
        Matter.Body.setPosition(seg, { x, y });
        Matter.Body.setAngle(seg, a + Math.PI / 2);
        Matter.Body.setVelocity(seg, { x: 0, y: 0 }); // Aseg. que el motor los trate como estáticos
      });
    };

    // Crear chips: aparecen por los lados y caen al centro
    SKILLS_DATA.forEach((skill, index) => {
      const { width: chipWidth, height: chipHeight } = getChipDims(skill);
      const isLarge = skill.size === 'large';
      const side = index % 2 === 0 ? 'left' : 'right';
      const x = side === 'left'
        ? 30 + Math.random() * 60
        : width - 30 - Math.random() * 60;
      // Aparecer en la mitad inferior (60% al 85% de la altura)
      const y = (height * 0.6) + (index * 35) % (height * 0.25);
      
      const body = Matter.Bodies.rectangle(x, y, chipWidth, chipHeight, {
        restitution: 0.3, // Menos rebote para que se asienten antes
        friction: 0.5,    // Más agarre para evitar deslizamientos constantes
        frictionAir: 0.012, // Un poco más de resistencia al aire para suavizar
        density: 0.002,
        label: skill.id,
        render: { fillStyle: skill.color },
        sleepThreshold: 60 // Segundos/frames antes de dormir
      });
      // Impulso inicial: fuerte hacia el centro (vx) y sutil salto (vy)
      const vx = side === 'left' ? 4 + Math.random() * 4 : -(4 + Math.random() * 4);
      const vy = -1 - Math.random() * 3; // Impulso hacia arriba
      Matter.Body.setVelocity(body, { x: vx, y: vy });
      Matter.Body.setAngle(body, (Math.random() - 0.5) * 0.8);
      bodiesRef.current[skill.id] = body;
      Matter.Composite.add(world, body);
    });

    // ── DRAG PERSONALIZADO (sin MouseConstraint) ────────────────────────────
    // El límite de arrastre es el arco azul (r_mid): 110px móvil / 230px desktop
    const ARC_LIMIT = r_mid;
    let dragConstraint = null;
    let dragBody = null;

    const getCanvasPos = (e) => {
      const rect = render.canvas.getBoundingClientRect();
      const scaleX = render.canvas.width / rect.width;
      const scaleY = render.canvas.height / rect.height;
      const src = e.touches ? e.touches[0] : e;
      return {
        x: (src.clientX - rect.left) * scaleX,
        y: (src.clientY - rect.top) * scaleY
      };
    };

    const releaseDrag = () => {
      if (dragConstraint) {
        Matter.Composite.remove(world, dragConstraint);
        dragConstraint = null;
      }
      dragBody = null;
    };

    const onStart = (e) => {
      if (!isGameActiveRef.current) return; // Bloquear interacción si el juego no ha "empezado"
      e.preventDefault();
      const pos = getCanvasPos(e);
      const d = Math.hypot(pos.x - centerX, pos.y - centerY);
      if (d >= ARC_LIMIT) { // Solo fuera del círculo
        const found = Matter.Query.point(Matter.Composite.allBodies(world), pos)
          .find(b => !b.isStatic && b.label !== 'arc');
        if (found) {
          dragBody = found;
          dragConstraint = Matter.Constraint.create({
            pointA: { x: pos.x, y: pos.y },
            bodyB: found,
            pointB: Matter.Vector.sub(pos, found.position),
            stiffness: 0.15,
            damping: 0.1,
            render: { visible: false }
          });
          Matter.Composite.add(world, dragConstraint);
        }
      }
    };

    const onMove = (e) => {
      if (!dragConstraint) return;
      e.preventDefault();
      const pos = getCanvasPos(e);
      const d = Math.hypot(pos.x - centerX, pos.y - centerY);
      if (d < ARC_LIMIT) {
        releaseDrag(); // ¡Suelta el chip al cruzar el límite!
      } else {
        dragConstraint.pointA = { x: pos.x, y: pos.y };
      }
    };

    render.canvas.addEventListener('mousedown',  onStart, { passive: false });
    render.canvas.addEventListener('mousemove',  onMove,  { passive: false });
    render.canvas.addEventListener('mouseup',    releaseDrag);
    render.canvas.addEventListener('touchstart', onStart, { passive: false });
    render.canvas.addEventListener('touchmove',  onMove,  { passive: false });
    render.canvas.addEventListener('touchend',   releaseDrag);

    const update = () => {
      // Rotar arcos físicos Y sincronizar SVG
      angInner += speedInner;
      angMidA  += speedMidA;
      angMidB  += speedMidB;
      angOuter += speedOuter;

      const ai = window.__arcInner__, ama = window.__arcMidA__, amb = window.__arcMidB__, ao = window.__arcOuter__;
      const ri = window.__rInner__, rm = window.__rMid__, ro = window.__rOuter__;

      if (ai) rotateArcBodies(ai,  ri, 0.3,  angInner);
      if (ama) rotateArcBodies(ama, rm, 0.18, angMidA);
      if (amb) rotateArcBodies(amb, rm, 0.18, angMidB);
      if (ao)  rotateArcBodies(ao,  ro, 0.3,  angOuter);

      // Sincronizar SVG
      const toDeg = r => (r * 180 / Math.PI).toFixed(2);
      const cx = centerX, cy = centerY;
      if (arcInnerSvgRef.current) arcInnerSvgRef.current.setAttribute('transform', `rotate(${toDeg(angInner)}, ${cx}, ${cy})`);
      if (arcMidASvgRef.current)  arcMidASvgRef.current.setAttribute('transform',  `rotate(${toDeg(angMidA)},  ${cx}, ${cy})`);
      if (arcMidBSvgRef.current)  arcMidBSvgRef.current.setAttribute('transform',  `rotate(${toDeg(angMidB)},  ${cx}, ${cy})`);
      if (arcOuterSvgRef.current) arcOuterSvgRef.current.setAttribute('transform', `rotate(${toDeg(angOuter)}, ${cx}, ${cy})`);

      const newPositions = {};
      Object.keys(bodiesRef.current).forEach(id => {
        const body = bodiesRef.current[id];
        if (!body) return;

        newPositions[id] = {
          x: body.position.x,
          y: body.position.y,
          angle: body.angle
        };

        // ── COLISIÓN UNIDIRECCIONAL EN ARCOS ──────────────────────────────
        const dist = Matter.Vector.magnitude(Matter.Vector.sub(body.position, { x: centerX, y: centerY }));

        if (dist < 50) {
          if (!injectedSkills.has(id)) {
            const skill = SKILLS_DATA.find(s => s.id === id);
            setInjectedSkills(prev => new Set(prev).add(id));
            setFlashType(skill.type === 'hard' ? 'hard' : 'soft');
            setTimeout(() => setFlashType(null), 400);
            
            Matter.Composite.remove(world, body);
            delete bodiesRef.current[id];
          }
        }
      });
      setChipPositions(newPositions);
      requestAnimationFrame(update);
    };

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);
    update();

    return () => {
      Matter.Engine.clear(engine);
      Matter.Runner.stop(runner);
      Matter.Composite.clear(world);
    };
  }, [resetKey]);

  useEffect(() => {
    if (injectedSkills.size === SKILLS_DATA.length && isGameActive) {
      setTimeout(() => setShowContactModal(true), 1000);
    }
  }, [injectedSkills, isGameActive]);

  const hardSkills = SKILLS_DATA.filter(s => s.type === 'hard');
  const softSkills = SKILLS_DATA.filter(s => s.type === 'soft');
  const hardActiveCount = hardSkills.filter(s => injectedSkills.has(s.id)).length;
  const softActiveCount = softSkills.filter(s => injectedSkills.has(s.id)).length;

  return (
    <section className="skills-section" id="skills">
      <div className="skills-game-container">
        <div className={`global-flash-overlay ${flashType ? `active flash-${flashType}` : ''}`}></div>
        {!isGameActive && (
          <div className="skills-overlay">
            <div className="overlay-content instruction-modal">
              <div className="modal-scanline"></div>
              <div className="terminal-header">
                <span className="terminal-title">SKILLS CORE</span>
              </div>
              
              <div className="instruction-lore">
                <p>Interactúa con mis habilidades lanzándolas al núcleo central. Tu misión es llenar los racks de Hard y Soft Skills para completar la sincronización total de mi perfil.</p>
              </div>

              <div className="instruction-grid">
                <div className="instruction-item">
                  <div className="inst-icon">01</div>
                  <div className="inst-text">
                    <h3>NÓDULOS DE DATOS</h3>
                    <p>Cada bloque representa una habilidad real. Arrástralos y lánzalos al núcleo central.</p>
                  </div>
                </div>
                <div className="instruction-item">
                  <div className="inst-icon">02</div>
                  <div className="inst-text">
                    <h3>SINCRONIZACIÓN</h3>
                    <p>Evita las barreras rotativas. El tiempo de respuesta es un factor crítico en el archivado.</p>
                  </div>
                </div>
              </div>

              <div className="instruction-quote">
                <p>"Porque, al fin y al cabo, <span>un juego sin un objetivo claro es solo un juguete</span>. Y yo no diseño juguetes; construyo productos con propósito."</p>
              </div>

              <div className="modal-footer">
                <button className="btn-start-game pulse-button" onClick={() => setIsGameActive(true)}>
                  INICIAR
                </button>
              </div>
            </div>
          </div>
        )}

        {showContactModal && (
          <div className="skills-overlay">
            <div className="overlay-content instruction-modal victory-modal">
              <div className="terminal-header">
                <span className="terminal-title">MISIÓN COMPLETADA</span>
              </div>

              <div className="victory-message">
                <h2>¡ENHORABUENA!</h2>
                <p>Has sincronizado con éxito todos los módulos de conocimiento en el núcleo central.</p>
              </div>

              <div className="victory-stats">
                <div className="confetti-container">
                  {[...Array(15)].map((_, i) => (
                    <div key={i} className="confetti-piece"></div>
                  ))}
                </div>
                <div className="stat-item">
                  <span className="stat-label">TIEMPO_TOTAL:</span>
                  <span className="stat-value">{formatTime(seconds)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">MODULOS_SYNC:</span>
                  <span className="stat-value">{SKILLS_DATA.length}/{SKILLS_DATA.length}</span>
                </div>
              </div>

              <div className="instruction-quote">
                <p>"Ahora que conoces mi stack técnico, <span>¿hablamos de cómo aplicarlo en tu próximo proyecto?</span>"</p>
              </div>

              <div className="modal-footer victory-actions">
                <button 
                  className="btn-start-game" 
                  onClick={() => window.open('mailto:hola@ronaldherrera.es')}
                >
                  ENVIAR EMAIL
                </button>
                <button 
                  className="btn-start-game secondary-action" 
                  onClick={() => window.open('https://linkedin.com/in/ronald-herrera', '_blank')}
                >
                  LINKEDIN
                </button>
              </div>
            </div>
          </div>
        )}

        {isGameActive && (
          <div className="game-controls-top">
            <div className="timer-display">
              <span className="timer-value">{formatTime(seconds)}</span>
            </div>
            <button className="btn-reset-game" onClick={handleReset} title="Reiniciar Partida">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6"></path>
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                <path d="M3 22v-6h6"></path>
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
              </svg>
            </button>
          </div>
        )}

        <div className="archive-racks-bottom" ref={racksRef}>
          <div className={`rack-panel hard-rack ${hardActiveCount === hardSkills.length ? 'completed' : ''}`}>
            <div className="rack-label">HARD_SKILLS</div>
            <div className="slots-container">
              {hardSkills.map((skill, index) => (
                <div 
                  key={skill.id} 
                  className={`archive-slot ${index < hardActiveCount ? 'active' : ''}`}
                ></div>
              ))}
            </div>
          </div>
          
          <div className={`rack-panel soft-rack ${softActiveCount === softSkills.length ? 'completed' : ''}`}>
            <div className="rack-label">SOFT_SKILLS</div>
            <div className="slots-container">
              {softSkills.map((skill, index) => (
                <div 
                  key={skill.id} 
                  className={`archive-slot ${index < softActiveCount ? 'active' : ''}`}
                ></div>
              ))}
            </div>
          </div>
        </div>

        <div className="core-environment" style={physicsCenter ? {
            position: 'absolute',
            left: physicsCenter.x,
            top: physicsCenter.y,
            transform: 'translate(-50%, -50%)',
            width: 100, height: 100
          } : {}}>
          <div className="visual-core">
            <div className="core-inner-static"></div>
            <div className={`core-glow-active ${injectedSkills.size > 0 ? 'pulse' : ''}`} key={injectedSkills.size}></div>
          </div>
        </div>

        {/* SVG Overlay: arcos sólidos sincronizados con la física */}
        {physicsCenter && (() => {
          const { x: cx, y: cy, w, h, rInner: ri, rMid: rm, rOuter: ro, isMobile } = physicsCenter;
          const arcPath = (r, fraction) => {
            const end = fraction * 2 * Math.PI;
            const x1 = cx + r * Math.cos(0);
            const y1 = cy + r * Math.sin(0);
            const x2 = cx + r * Math.cos(end);
            const y2 = cy + r * Math.sin(end);
            const large = fraction > 0.5 ? 1 : 0;
            return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
          };
          return (
            <svg className="arcs-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
                 style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:5 }}>
              <g ref={arcInnerSvgRef}>
                <path d={arcPath(ri, 0.3)} stroke="var(--color-accent-red)" strokeWidth="3" fill="none" opacity="0.8"/>
              </g>
              <g ref={arcMidASvgRef}>
                <path d={arcPath(rm, 0.18)} stroke="var(--color-accent-blue)" strokeWidth="3" fill="none" opacity="0.8"/>
              </g>
              <g ref={arcMidBSvgRef}>
                <path d={arcPath(rm, 0.18)} stroke="var(--color-accent-blue)" strokeWidth="3" fill="none" opacity="0.8"/>
              </g>
              {/* Arco exterior solo en desktop */}
              {!isMobile && (
                <g ref={arcOuterSvgRef}>
                  <path d={arcPath(ro, 0.3)} stroke="var(--color-accent-gold)" strokeWidth="3" fill="none" opacity="0.9"/>
                </g>
              )}
            </svg>
          );
        })()}

        <div className="physics-scene" ref={sceneRef}>
          {SKILLS_DATA.map(skill => (
            chipPositions[skill.id] && (
              <div 
                key={skill.id} 
                className={`skill-chip pop-style ${skill.type} ${skill.size || ''}`}
                style={{ 
                  left: chipPositions[skill.id].x, 
                  top: chipPositions[skill.id].y, 
                  width: getChipDims(skill).width,
                  height: getChipDims(skill).height,
                  transform: `translate(-50%, -50%) rotate(${chipPositions[skill.id].angle}rad)`,
                  backgroundColor: skill.color,
                  color: skill.textColor,
                  borderColor: skill.textColor + '22'
                }}
              >
                <div className="chip-content">
                  {skill.icon && <span className="chip-icon">{skill.icon}</span>}
                  <span className="chip-label">{skill.label}</span>
                </div>
              </div>
            )
          ))}
        </div>

        <div className="floor-line" style={racksRef.current ? { bottom: racksRef.current.clientHeight } : {}}></div>
      </div>
    </section>
  );
};

export default Skills;

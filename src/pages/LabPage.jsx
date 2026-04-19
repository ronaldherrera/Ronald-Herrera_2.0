import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import setupImg from '../assets/setup.png';
import portfolioV1Img from '../assets/portfolio-v1.png';
import tankilyConceptImg from '../assets/tankily-concept.png';
import './LabPage.css';

const LabRow = ({ title, items, onProjectClick }) => {
  const rowRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [showArrows, setShowArrows] = useState(false);
  const [canScroll, setCanScroll] = useState(false);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);

  const updateScrollStates = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setIsAtStart(scrollLeft <= 5);
      setIsAtEnd(scrollLeft + clientWidth >= scrollWidth - 5);
      setCanScroll(scrollWidth > clientWidth);
    }
  };

  // Detectar cambios en tamaño y contenido
  useEffect(() => {
    updateScrollStates();
    window.addEventListener('resize', updateScrollStates);
    return () => window.removeEventListener('resize', updateScrollStates);
  }, [items]);

  // Scroll con botones
  const scroll = (direction) => {
    if (rowRef.current) {
      const scrollAmount = window.innerWidth * 0.8;
      rowRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Dragging logic
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - rowRef.current.offsetLeft);
    setScrollLeft(rowRef.current.scrollLeft);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - rowRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Multiplicador de velocidad
    rowRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="lab-row" onMouseEnter={() => setShowArrows(true)} onMouseLeave={() => { setShowArrows(false); handleMouseUp(); }}>
      <h2 className="lab-row-title">{title}</h2>
      
      <div className="lab-row-wrapper">
        <button className={`nav-arrow left ${showArrows && canScroll && !isAtStart ? 'visible' : ''}`} onClick={() => scroll('left')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>

        <div 
          ref={rowRef}
          className={`lab-cards-container ${isDragging ? 'is-dragging' : ''}`}
          onScroll={updateScrollStates}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {items.length > 0 ? (
            items.map(item => (
              <div 
                key={item.id} 
                className={`lab-card ${item.inDevelopment ? 'is-development' : ''}`} 
                onClick={() => !item.inDevelopment && onProjectClick(item)}
              >
                <img src={item.image} alt={item.title} className="lab-card-img" />
                <div className="lab-card-overlay">
                  <div className="lab-card-header">
                    <div className="lab-card-header-top">
                      <span className="lab-card-category">{item.category}</span>
                      {item.inDevelopment && <span className="dev-badge">EN DESARROLLO</span>}
                    </div>
                    <h3 className="lab-card-title">{item.title}</h3>
                  </div>
                  <div className="lab-card-body">
                    <p className="lab-card-desc">{item.description}</p>
                    <div className="lab-card-tags">
                      {item.tags.map((tag, i) => (
                        <span key={i} className="lab-tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="lab-card is-placeholder">
              <div className="placeholder-content">
                <div className="placeholder-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                </div>
                <span className="placeholder-text">PRÓXIMAMENTE...</span>
              </div>
            </div>
          )}
        </div>

        <button className={`nav-arrow right ${showArrows && canScroll && !isAtEnd ? 'visible' : ''}`} onClick={() => scroll('right')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
    </div>
  );
};

const ProjectViewer = ({ project, onClose }) => {
  const [pos, setPos] = useState({ x: 32, y: 32 }); // 2rem = 32px aprox
  const [isDragging, setIsDragging] = useState(false);
  const [rel, setRel] = useState(null); // Posición relativa del click dentro del botón
  const [hasMoved, setHasMoved] = useState(false);
  const [isPrototypeActive, setIsPrototypeActive] = useState(false);

  const DRAG_THRESHOLD = 8; // Píxeles de margen para distinguir click de drag
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  if (!project) return null;

  const startDrag = (x, y, target) => {
    setIsDragging(true);
    setHasMoved(false);
    setStartPos({ x, y });
    const rect = target.getBoundingClientRect();
    setRel({
      x: x - rect.left,
      y: y - rect.top
    });
  };

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    startDrag(e.pageX, e.pageY, e.currentTarget);
    e.stopPropagation();
  };

  const onTouchStart = (e) => {
    const touch = e.touches[0];
    startDrag(touch.pageX, touch.pageY, e.currentTarget);
    // No prevenimos default aquí para permitir clics normales si no hay drag
  };

  const handleMove = (x, y) => {
    if (!isDragging) return;
    
    // Calcular distancia desde el inicio del drag
    const dx = x - startPos.x;
    const dy = y - startPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > DRAG_THRESHOLD) {
      setHasMoved(true);
    }

    if (hasMoved) {
      let newX = x - rel.x;
      let newY = y - rel.y;

      const padding = 20;
      newX = Math.max(padding, Math.min(window.innerWidth - 120, newX));
      newY = Math.max(padding, Math.min(window.innerHeight - 60, newY));

      setPos({ x: newX, y: newY });
    }
  };

  const onMouseMove = (e) => {
    handleMove(e.pageX, e.pageY);
  };

  const onTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    handleMove(touch.pageX, touch.pageY);
    
    // Si ya estamos moviendo, prevenimos el scroll de la página
    if (hasMoved) {
      if (e.cancelable) e.preventDefault();
    }
  };

  const stopDrag = () => {
    setIsDragging(false);
  };

  const onMouseUp = () => {
    stopDrag();
  };

  const onTouchEnd = () => {
    stopDrag();
  };

  const handleClick = (e) => {
    // Solo cerramos si el ratón no se ha movido significativamente (es un click, no un drag)
    if (!hasMoved) {
      onClose();
    }
  };

  // Escuchar mousemove y mouseup en window para que el drag sea fluido aunque el puntero salga del botón
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);
    } else {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, hasMoved, rel, startPos]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'AQUARIUM_PROTOTYPE_STATE') {
        setIsPrototypeActive(event.data.active);
      }
      if (event.data.type === 'CLOSE_PROJECT') {
        onClose();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="project-viewer-overlay">
      <button 
        className={`back-to-lab-btn ${isDragging ? 'dragging' : ''} ${isPrototypeActive ? 'hidden' : ''}`}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={handleClick}
        style={{ 
          left: `${pos.x}px`, 
          top: `${pos.y}px`,
          position: 'fixed',
          touchAction: 'none' // Importante para evitar scroll del navegador durante el inicio del touch
        }}
        title="Arrastra para mover, click para volver"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        <span>LAB</span>
      </button>
      <iframe 
        src={`${window.location.origin}${project.url}`} 
        title={project.title}
        className={`project-iframe ${isDragging ? 'is-dragging-btn' : ''}`}
        frameBorder="0"
        allowFullScreen
      ></iframe>
    </div>
  );
};

const LabPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedProject, setSelectedProject] = useState(null);

  // Memorizar categorías para evitar recreaciones innecesarias y loops en useEffect
  const categories = useMemo(() => [
    {
      title: "CREACIONES DEL MUNDO REAL",
      items: [
        { 
          id: 0, 
          title: "LÁMPARA AQUARIUM LED", 
          category: "HARDWARE / IOT", 
          tags: ["ESP32", "3D MODEL", "UX"], 
          description: "Diseño y fabricación de una lámpara inteligente personalizada, desde el modelado 3D hasta el control por app.", 
          url: "/presentacion/aquarium-led/index.html", 
          image: "/presentacion/aquarium-led/assets/lampara encendida.JPG" 
        }
      ]
    },
    {
      title: "PROTOTIPOS Y HERRAMIENTAS",
      items: [
        { 
          id: 21, 
          title: "SnapStore", 
          category: "HERRAMIENTA / AUTOMATIZACIÓN", 
          tags: ["ELECTRON", "PUPPETEER", "SCRAPING"], 
          description: "Descargador inteligente de activos visuales para e-commerce con motor de navegación indetectable.", 
          url: "/presentacion/Snapstore/index.html", 
          image: "/presentacion/Snapstore/assets/portada.png" 
        },
        { 
          id: 100, 
          title: "Tankily", 
          category: "SOCIAL / COMUNIDAD", 
          tags: ["NEXT.JS", "SUPABASE", "UX"], 
          description: "Plataforma social para amantes de la acuariofilia. Gestión de acuarios y comunidad activa.", 
          inDevelopment: true,
          image: tankilyConceptImg 
        }
      ]
    },
    {
      title: "DISEÑO Y SISTEMAS",
      items: []
    },
    {
      title: "PATIO DE EXPERIMENTACIÓN",
      items: []
    },
    {
      title: "ARCHIVO E HISTORIAL",
      items: [
        { 
          id: 50, 
          title: "PORTFOLIO V1 (2024-2025)", 
          category: "ARCHIVO / PORTFOLIO", 
          tags: ["VITE", "TAILWIND", "CV"], 
          description: "La versión previa de mi portfolio personal. Un registro de mi evolución técnica y de diseño antes de saltar a la v2.0.", 
          url: "https://ronald-herrera-cv-24-25.vercel.app/", 
          image: portfolioV1Img,
          external: true
        }
      ]
    }
  ], []);

  // Función para manejar la selección de proyectos actualizando la URL
  const handleProjectSelect = (project) => {
    if (project) {
      if (project.external) {
        window.open(project.url, '_blank');
      } else {
        setSearchParams({ p: project.id });
      }
    } else {
      setSearchParams({});
    }
  };

  // Efecto para sincronizar el estado selectedProject con searchParams
  useEffect(() => {
    const projectId = searchParams.get('p');
    if (projectId) {
      let found = null;
      for (const cat of categories) {
        found = cat.items.find(item => item.id.toString() === projectId);
        if (found) break;
      }
      setSelectedProject(found || null);
    } else {
      setSelectedProject(null);
    }
  }, [searchParams, categories]);

  // Bloqueo de scroll al abrir el visor
  useEffect(() => {
    if (selectedProject) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [selectedProject]);

  return (
    <div className="lab-page">
      <div className="lab-hero" style={{ backgroundImage: `url(${setupImg})` }}>
        <div className="lab-hero-content">
          <span className="lab-hero-tag">SALA DE JUEGOS-</span>
          <h1 className="lab-hero-title">
            <span className="text-outline">THE</span>
            <span className="text-solid">LAB.</span>
          </h1>
          <p className="lab-hero-desc">
            No es una galería de productos terminados. Es mi caja de arena personal; un registro de evolución técnica donde el objetivo no es la perfección, sino la curiosidad. Aquí verás experimentos que nacen de la duda, herramientas que creé para solucionar mis propios retos y prototipos que exploran los límites de lo que puedo construir.
          </p>
        </div>
      </div>

      <div className="lab-rows">
        {categories.map((cat, index) => (
          <LabRow 
            key={index} 
            title={cat.title} 
            items={cat.items} 
            onProjectClick={handleProjectSelect}
          />
        ))}
      </div>

      {selectedProject && (
        <ProjectViewer 
          project={selectedProject} 
          onClose={() => handleProjectSelect(null)} 
        />
      )}
    </div>
  );
};

export default LabPage;

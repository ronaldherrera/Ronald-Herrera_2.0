import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useScrollProgress } from '../hooks/useScrollProgress';
import './CustomScrollbar.css';

const CustomScrollbar = () => {
  const progress = useScrollProgress();
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Manejo del arrastre
  const handleMouseDown = (e) => {
    setIsDragging(true);
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging) return;

    // Desactivar scroll suave en HTML mientras arrastramos
    document.documentElement.classList.add('no-smooth-scroll');

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;
      const newProgress = Math.max(0, Math.min(1, y / height));
      
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const targetScroll = newProgress * (scrollHeight - clientHeight);
      
      // Scroll instantáneo directo
      document.documentElement.scrollTop = targetScroll;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.documentElement.classList.remove('no-smooth-scroll');
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.documentElement.classList.remove('no-smooth-scroll');
    };
  }, [isDragging]);
  
  // Generamos el path del SVG dinámicamente
  const pathData = useMemo(() => {
    const height = 1000; 
    const width = 40;    
    const centerX = width / 2;
    const currentAmplitude = 6 * progress;
    const frequency = 0.15; 
    
    let d = `M ${centerX} 0`;
    for (let y = 0; y <= 1000; y += 5) {
      const x = centerX + Math.sin(y * frequency) * currentAmplitude;
      d += ` L ${x} ${y}`;
    }
    return d;
  }, [progress]);

  // Cálculo de la posición X actual del círculo
  const currentX = useMemo(() => {
    const centerX = 20;
    const currentAmplitude = 6 * progress;
    const y = 1000 * progress;
    return centerX + Math.sin(y * 0.15) * currentAmplitude;
  }, [progress]);

  return (
    <div 
      ref={containerRef}
      className={`custom-scrollbar-container ${isDragging ? 'is-dragging' : ''}`}
      onMouseDown={handleMouseDown}
    >
      <svg 
        className="custom-scrollbar-svg" 
        viewBox="0 0 40 1000" 
        preserveAspectRatio="none"
      >
        <path d={pathData} className="scrollbar-path" />
      </svg>

      {/* Círculo indicador (HTML para evitar distorsión de SVG) */}
      <div 
        className="scrollbar-thumb-circle"
        style={{
          left: `${currentX}px`,
          top: `${progress * 100}%`
        }}
      />
    </div>
  );
};

export default CustomScrollbar;

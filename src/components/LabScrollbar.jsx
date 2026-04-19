import React, { useRef, useState, useEffect } from 'react';
import { useScrollProgress } from '../hooks/useScrollProgress';
import './LabScrollbar.css';

const LabScrollbar = () => {
  const progress = useScrollProgress();
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const handleMouseDown = (e) => {
    setIsDragging(true);
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging) return;

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

  return (
    <div 
      ref={containerRef}
      className={`lab-scrollbar-container ${isDragging ? 'is-dragging' : ''}`}
      onMouseDown={handleMouseDown}
    >
      <div className="lab-scrollbar-track">
        <div 
          className="lab-scrollbar-thumb"
          style={{
            top: `${progress * 100}%`
          }}
        />
      </div>
    </div>
  );
};

export default LabScrollbar;

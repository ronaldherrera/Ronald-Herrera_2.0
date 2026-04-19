import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';
import LogoDesktop from '../assets/Logotio-blanco.svg';
import LogoMobile from '../assets/Icono-blanco.svg';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const isLabPage = location.pathname === '/lab' || location.pathname === '/contacto';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    if (!isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    document.body.style.overflow = 'unset';
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''} ${isMenuOpen ? 'menu-open' : ''} ${isLabPage ? 'is-lab-route' : ''}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-logo-link" onClick={closeMenu}>
          <img src={LogoDesktop} alt="Ronald Herrera Logo" className="logo-desktop" />
          <img src={LogoMobile} alt="Ronald Icon" className="logo-mobile" />
        </Link>
        
        <button 
          className={`nav-toggle ${isMenuOpen ? 'active' : ''}`} 
          onClick={toggleMenu}
          aria-label="Abrir menú"
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <line x1="1.4" y1="5" x2="22.6" y2="5" className="line-1" />
            <line x1="1.8" y1="12" x2="22.2" y2="12" className="line-2" />
            <line x1="2.3" y1="19" x2="21.7" y2="19" className="line-3" />
          </svg>
        </button>

        <div className={`navbar-menu ${isMenuOpen ? 'is-open' : ''}`}>
          <Link to="/" className="nav-link nav-home-link" onClick={closeMenu}>Inicio</Link>
          <a href="/#valor" className="nav-link nav-link-anchor" onClick={closeMenu}>Valor</a>
          <a href="/#sobre-mi" className="nav-link nav-link-anchor" onClick={closeMenu}>Sobre Mí</a>
          <a href="/#proyectos" className="nav-link nav-link-anchor" onClick={closeMenu}>Proyectos</a>
          <Link to="/skills" className="nav-link nav-link-lab" onClick={closeMenu}>SKILLS</Link>
          <Link to="/lab" className="nav-link nav-link-lab" onClick={closeMenu}>THE LAB</Link>
          <Link to="/contacto" className="nav-link btn-nav-contact" onClick={closeMenu}>Contactar →</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ChevronDown, Grid3x3 } from 'lucide-react';
import { mockCategories } from '../utils/mockData';
import { useIsMobile } from '../hooks/useMediaQuery';
import './CategoriesDropdown.css';

const CategoriesDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const isMobile = useIsMobile();

  // Calcular posición del menú cuando se abre o cambia el scroll/ventana
  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX
        });
      }
    };

    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  // Cerrar el dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current && 
        !buttonRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const dropdownMenu = isOpen ? (
    <div 
      ref={menuRef}
      className="categories-dropdown-menu"
      onMouseEnter={() => !isMobile && setIsOpen(true)}
      onMouseLeave={() => !isMobile && setIsOpen(false)}
      style={{
        position: 'fixed',
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
        zIndex: 99999
      }}
    >
      {mockCategories.map((category) => (
        <Link
          key={category.id}
          to={`/tienda?category=${category.id}`}
          className="categories-dropdown-item"
          onClick={() => setIsOpen(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.75rem',
            color: 'var(--text-primary)',
            textDecoration: 'none',
            transition: 'all 0.2s',
            fontSize: '0.9375rem'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-secondary)';
            e.currentTarget.style.color = 'var(--primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>{category.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{category.name}</div>
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--text-secondary)',
              marginTop: '0.125rem'
            }}>
              {category.description}
            </div>
          </div>
        </Link>
      ))}
    </div>
  ) : null;

  return (
    <div className="categories-dropdown" ref={dropdownRef}>
      <button
        ref={buttonRef}
        className="categories-dropdown-button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => !isMobile && setIsOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '0.2rem' : '0.5rem',
          padding: isMobile ? '0.35rem 0.5rem' : '0.625rem 1rem',
          background: isOpen ? 'var(--primary)' : 'transparent',
          color: isOpen ? 'white' : 'var(--text-primary)',
          border: `1px solid ${isOpen ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: '0.75rem',
          cursor: 'pointer',
          transition: 'all 0.2s',
          fontWeight: 500,
          fontSize: isMobile ? '0.625rem' : '0.9375rem',
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}
        onMouseLeave={() => {
          // No cerrar automáticamente en desktop, solo en mobile
        }}
      >
        <Grid3x3 size={isMobile ? 12 : 18} />
        <span>{isMobile ? 'Cat.' : 'Categorías'}</span>
        <ChevronDown 
          size={isMobile ? 10 : 16} 
          style={{ 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }} 
        />
      </button>

      {dropdownMenu && createPortal(dropdownMenu, document.body)}
    </div>
  );
};

export default CategoriesDropdown;


import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Grid3x3 } from 'lucide-react';
import { mockCategories } from '../utils/mockData';
import { useIsMobile } from '../hooks/useMediaQuery';
import './CategoriesDropdown.css';

const CategoriesDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Cerrar el dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  return (
    <div className="categories-dropdown" ref={dropdownRef}>
      <button
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

      {isOpen && (
        <div 
          className="categories-dropdown-menu"
          onMouseEnter={() => !isMobile && setIsOpen(true)}
          onMouseLeave={() => !isMobile && setIsOpen(false)}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '0.5rem',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: '1rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            minWidth: '250px',
            maxWidth: isMobile ? 'calc(100vw - 2rem)' : '300px',
            maxHeight: '400px',
            overflowY: 'auto',
            zIndex: 1000,
            padding: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
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
      )}
    </div>
  );
};

export default CategoriesDropdown;


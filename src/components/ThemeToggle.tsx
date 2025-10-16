import { Sun, Moon } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useEffect } from 'react';
import './ThemeToggle.css';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <button 
      onClick={toggleTheme} 
      className="theme-toggle"
      aria-label="Cambiar tema"
    >
      {theme === 'light' ? (
        <Moon size={20} />
      ) : (
        <Sun size={20} />
      )}
    </button>
  );
};

export default ThemeToggle;

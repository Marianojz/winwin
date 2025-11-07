import { Sun, Moon, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useEffect } from 'react';
import './ThemeToggle.css';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const getIcon = () => {
    if (theme === 'light') {
      return <Moon size={20} />;
    } else if (theme === 'dark') {
      return <Sparkles size={20} />;
    } else {
      return <Sun size={20} />;
    }
  };

  const getLabel = () => {
    if (theme === 'light') {
      return 'Cambiar a modo oscuro';
    } else if (theme === 'dark') {
      return 'Cambiar a modo experimental';
    } else {
      return 'Cambiar a modo claro';
    }
  };

  return (
    <button 
      onClick={toggleTheme} 
      className="theme-toggle"
      aria-label={getLabel()}
      title={getLabel()}
    >
      {getIcon()}
    </button>
  );
};

export default ThemeToggle;

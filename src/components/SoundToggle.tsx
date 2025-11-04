import { Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../utils/sounds';
import { useState, useEffect } from 'react';
import './SoundToggle.css';

const SoundToggle = () => {
  const [enabled, setEnabled] = useState(soundManager.isEnabled());

  useEffect(() => {
    // Cargar preferencia guardada
    const saved = localStorage.getItem('soundEnabled');
    if (saved !== null) {
      const isEnabled = saved === 'true';
      setEnabled(isEnabled);
      if (isEnabled) {
        soundManager.enable();
      } else {
        soundManager.disable();
      }
    }
  }, []);

  const toggleSound = () => {
    const newState = !enabled;
    setEnabled(newState);
    localStorage.setItem('soundEnabled', String(newState));
    
    if (newState) {
      soundManager.enable();
    } else {
      soundManager.disable();
    }
  };

  return (
    <button 
      onClick={toggleSound} 
      className="sound-toggle"
      aria-label={enabled ? 'Desactivar sonidos' : 'Activar sonidos'}
      title={enabled ? 'Sonidos activados' : 'Sonidos desactivados'}
    >
      {enabled ? (
        <Volume2 size={20} />
      ) : (
        <VolumeX size={20} />
      )}
    </button>
  );
};

export default SoundToggle;


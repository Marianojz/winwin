import { Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../utils/sounds';
import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { loadUserPreferences, updateUserPreference } from '../utils/userPreferences';
import './SoundToggle.css';

const SoundToggle = () => {
  const { user } = useStore();
  const [enabled, setEnabled] = useState(soundManager.isEnabled());

  useEffect(() => {
    // Cargar preferencia desde Firebase si hay usuario
    const loadPreference = async () => {
      if (user) {
        try {
          const preferences = await loadUserPreferences(user.id);
          if (preferences.soundEnabled !== undefined) {
            const isEnabled = preferences.soundEnabled;
            setEnabled(isEnabled);
            if (isEnabled) {
              soundManager.enable();
            } else {
              soundManager.disable();
            }
          }
        } catch (error) {
          console.error('❌ Error cargando preferencia de sonido:', error);
        }
      } else {
        // Si no hay usuario, usar valor por defecto
        const defaultEnabled = soundManager.isEnabled();
        setEnabled(defaultEnabled);
      }
    };

    loadPreference();
  }, [user]);

  const toggleSound = async () => {
    const newState = !enabled;
    setEnabled(newState);
    
    // Guardar en Firebase si hay usuario
    if (user) {
      try {
        await updateUserPreference(user.id, 'soundEnabled', newState);
      } catch (error) {
        console.error('❌ Error guardando preferencia de sonido:', error);
      }
    }
    
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


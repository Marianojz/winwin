import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

const Cleanup = () => {
  const navigate = useNavigate();
  const { setUser } = useStore();

  useEffect(() => {
    console.log('🧹 Limpiando sistema...');
    
    // Limpiar localStorage
    localStorage.clear();
    
    // Limpiar state de Zustand
    setUser(null);
    
    console.log('✅ Sistema limpio');
    console.log('localStorage.user:', localStorage.getItem('user'));
    
    // Redirigir después de 2 segundos
    setTimeout(() => {
      navigate('/registro');
    }, 2000);
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <h1>🧹 Limpiando sistema...</h1>
      <p>Serás redirigido al registro en 2 segundos</p>
    </div>
  );
};

export default Cleanup;

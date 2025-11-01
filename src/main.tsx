import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { attachAuthListener } from './config/firebase'
import { useStore } from './store/useStore'
import './index.css'

function Root() {
  const setUser = useStore(s => s.setUser)
  
  React.useEffect(() => {
    const unsubscribe = attachAuthListener((user) => {
      // Solo actualizar si el usuario en localStorage es diferente
      const currentUser = useStore.getState().user;
      if (!user && currentUser) {
        console.log('🔐 Usuario deslogueado de Firebase, limpiando estado');
        const { clearNotifications } = useStore.getState();
        clearNotifications(); // Limpiar notificaciones al desloguearse
        setUser(null);
      } else if (user && (!currentUser || currentUser.id !== user.uid)) {
        console.log('🔐 Usuario autenticado en Firebase, actualizando estado');
        setUser(user);
        // Cargar notificaciones cuando el usuario se autentica
        setTimeout(() => {
          const { loadUserNotifications } = useStore.getState();
          if (loadUserNotifications) {
            loadUserNotifications();
          }
        }, 500);
      }
    });
    return () => unsubscribe();
  }, [setUser]);
  
  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />)
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
      const currentUser = useStore.getState().user;
      if (!user && currentUser) {
        console.log('🔐 Usuario deslogueado de Firebase, limpiando estado');
        const { clearNotifications } = useStore.getState();
        clearNotifications(); // Limpiar notificaciones al desloguearse
        setUser(null);
      } else if (user) {
        // Si el usuario actual no existe, o es diferente, o tiene datos más completos
        const shouldUpdate = !currentUser || 
                            currentUser.id !== user.id || 
                            (user.isAdmin !== undefined && user.isAdmin !== currentUser.isAdmin) ||
                            (user.username && user.username !== currentUser.username);
        
        if (shouldUpdate) {
          console.log('🔐 Usuario autenticado en Firebase, actualizando estado');
          // Si el usuario actual tiene isAdmin pero el nuevo no lo tiene aún, preservar isAdmin
          if (currentUser?.isAdmin && user.isAdmin === undefined) {
            user.isAdmin = currentUser.isAdmin;
          }
          // Guardar en localStorage para persistencia
          if (user.id) {
            localStorage.setItem('user', JSON.stringify(user));
          }
          setUser(user);
          // NO cargar notificaciones aquí - App.tsx lo hará para evitar duplicados
        }
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
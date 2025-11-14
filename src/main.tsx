import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { attachAuthListener } from './config/firebase'
import { useStore } from './store/useStore'
import { initializeLocalStorageCleanup } from './utils/localStorageCleaner'
import './index.css'

function Root() {
  const setUser = useStore(s => s.setUser)
  const isMountedRef = React.useRef(true);
  
  // Limpiar localStorage obsoleto al iniciar la aplicación
  React.useEffect(() => {
    console.log('🧹 [MAIN] Limpiando localStorage obsoleto al iniciar...');
    initializeLocalStorageCleanup();
  }, []);
  
  React.useEffect(() => {
    isMountedRef.current = true;
    
    const unsubscribe = attachAuthListener((user) => {
      // Verificar si el componente aún está montado antes de actualizar estado
      if (!isMountedRef.current) return;
      
      const currentUser = useStore.getState().user;
      
      console.log('🔐 [MAIN] Auth listener callback:', {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        hasCurrentUser: !!currentUser,
        currentUserId: currentUser?.id
      });
      
      if (!user && currentUser) {
        console.log('🔐 [MAIN] Usuario deslogueado de Firebase, limpiando estado');
        const { clearNotifications } = useStore.getState();
        clearNotifications(); // Limpiar notificaciones al desloguearse
        if (isMountedRef.current) {
          setUser(null);
        }
      } else if (user) {
        // Si el usuario actual no existe, o es diferente, o tiene datos más completos
        const shouldUpdate = !currentUser || 
                            currentUser.id !== user.id || 
                            (user.isAdmin !== undefined && user.isAdmin !== currentUser.isAdmin) ||
                            (user.username && user.username !== currentUser.username);
        
        console.log('🔐 [MAIN] Evaluando actualización de usuario:', {
          shouldUpdate,
          hasCurrentUser: !!currentUser,
          sameId: currentUser?.id === user.id,
          isAdminChanged: user.isAdmin !== undefined && user.isAdmin !== currentUser?.isAdmin
        });
        
        if (shouldUpdate && isMountedRef.current) {
          console.log('🔐 [MAIN] Usuario autenticado en Firebase, actualizando estado');
          // Si el usuario actual tiene isAdmin pero el nuevo no lo tiene aún, preservar isAdmin
          if (currentUser?.isAdmin && user.isAdmin === undefined) {
            user.isAdmin = currentUser.isAdmin;
          }
          // NO guardar en localStorage - Firebase es la fuente de verdad
          setUser(user);
          // NO cargar notificaciones aquí - App.tsx lo hará para evitar duplicados
        } else {
          console.log('🔐 [MAIN] No se actualiza usuario (ya está actualizado o no es necesario)');
        }
      }
    });
    
    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [setUser]);
  
  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />)
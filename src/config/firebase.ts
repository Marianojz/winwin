import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase, ref, set } from 'firebase/database';  // <- NUEVA IMPORTACIÓN

// ⚠️ IMPORTANTE: Actualiza estas credenciales con las del nuevo proyecto Firebase
// Sigue la guía en: GUIA_CAMBIO_DOMINIO_CLICKIO.md
// Reemplaza TODO este objeto con las credenciales del nuevo proyecto "clickio"
const firebaseConfig = {
  apiKey: "AIzaSyDhJldFdxpezX2MCANk67PBIWPbZacevEc",
  authDomain: "clikio-773fa.firebaseapp.com",
  projectId: "clikio-773fa",
  storageBucket: "clikio-773fa.firebasestorage.app",
  messagingSenderId: "930158513107",
  appId: "1:930158513107:web:685ebe622ced3398e8bd26",
  databaseURL: "https://clikio-773fa-default-rtdb.firebaseio.com",
  measurementId: "G-13J0SJPW40"  // <- NUEVA LÍNEA
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios
export const auth = getAuth(app);
// Persistencia: mantener sesión tras refresh y en móvil
setPersistence(auth, browserLocalPersistence).catch(() => {/* ignore */});
export const db = getFirestore(app);
export const storage = getStorage(app);
export const realtimeDb = getDatabase(app);  // <- NUEVA EXPORTACIÓN

export default app;

// Helper para sincronizar datos del usuario de Firestore a Realtime Database
// Esto es necesario porque las reglas de Realtime Database verifican isAdmin en Realtime DB
export async function syncUserToRealtimeDb(userId: string, isAdmin: boolean, email?: string, username?: string) {
  try {
    const userRef = ref(realtimeDb, `users/${userId}`);
    
    // Verificar si ya existe para no sobrescribir datos importantes
    const { get: firebaseGet } = await import('firebase/database');
    const snapshot = await firebaseGet(userRef);
    
    if (snapshot.exists()) {
      const existingData = snapshot.val();
      // Actualizar isAdmin si cambió y último login, preservar otros datos
      const updates: any = {
        lastSynced: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      if (existingData.isAdmin !== isAdmin) {
        updates.isAdmin = isAdmin;
        console.log('✅ Usuario actualizado en Realtime Database:', userId, 'isAdmin:', isAdmin, '(cambió de', existingData.isAdmin, 'a', isAdmin + ')');
      } else {
        console.log('✅ Usuario ya está sincronizado en Realtime Database:', userId, 'isAdmin:', isAdmin);
      }
      await set(userRef, {
        ...existingData,
        ...updates
      });
    } else {
      // Crear nuevo registro
      await set(userRef, {
        isAdmin: isAdmin,
        email: email || '',
        username: username || 'Usuario',
        lastSynced: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      });
      console.log('✅ Usuario creado en Realtime Database:', userId, 'isAdmin:', isAdmin);
    }
  } catch (error: any) {
    console.error('❌ Error sincronizando usuario a Realtime Database:', error);
    if (error?.code === 'PERMISSION_DENIED') {
      console.error('🔒 Error de permisos al sincronizar. Verifica las reglas de Firebase para users/{userId}');
      console.error('   Las reglas deben permitir que el usuario escriba en users/{auth.uid}');
    }
    // No fallar silenciosamente, pero no bloquear el flujo
  }
}

// Helper para inicializar usuario desde Firebase Auth
export function attachAuthListener(onUser: (user: any | null) => void) {
  return onAuthStateChanged(auth, (firebaseUser) => {
    if (!firebaseUser) {
      console.log('🔐 [AUTH LISTENER] Usuario deslogueado');
      onUser(null);
      return;
    }
    
    console.log('🔐 [AUTH LISTENER] Usuario autenticado detectado:', { uid: firebaseUser.uid, email: firebaseUser.email });
    
    // Cargar datos completos del usuario desde Firestore de forma asíncrona
    (async () => {
      try {
        // Intentar cargar datos completos del usuario desde Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Priorizar siempre el avatar de Google si está disponible
          const googleAvatar = firebaseUser.photoURL || '';
          const savedAvatar = userData.avatar || '';
          const finalAvatar = googleAvatar || savedAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username || firebaseUser.displayName || 'U')}&size=200&background=FF6B00&color=fff&bold=true`;
          
          // Si hay avatar de Google y es diferente al guardado, actualizarlo en Firestore
          if (googleAvatar && googleAvatar !== savedAvatar) {
            updateDoc(userDocRef, { avatar: googleAvatar }).catch(err => 
              console.warn('Error actualizando avatar en Firestore:', err)
            );
          }
          
          const isAdmin = userData.role === 'admin' || userData.isAdmin === true;
          
          // Asegurar que isAdmin esté sincronizado en Firestore (necesario para reglas de Storage)
          if (userData.isAdmin !== isAdmin) {
            updateDoc(userDocRef, { isAdmin: isAdmin }).catch(err => 
              console.warn('Error actualizando isAdmin en Firestore:', err)
            );
          }
          
          const fullUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            username: userData.username || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
            avatar: finalAvatar,
            isAdmin: isAdmin,
            dni: userData.dni || '',
            phone: userData.phone || '',
            createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
            address: userData.address ? {
              street: userData.address,
              locality: userData.locality,
              province: userData.province,
              location: {
                lat: userData.latitude || 0,
                lng: userData.longitude || 0
              }
            } : undefined
          };
          
          console.log('✅ [AUTH LISTENER] Usuario cargado desde Firestore:', { id: fullUser.id, email: fullUser.email, isAdmin: fullUser.isAdmin });
          
          // Sincronizar isAdmin a Realtime Database para que las reglas funcionen
          syncUserToRealtimeDb(
            firebaseUser.uid,
            fullUser.isAdmin,
            fullUser.email,
            fullUser.username
          ).catch(err => console.warn('Error sincronizando usuario:', err));
          
          onUser(fullUser);
        } else {
          // Si no existe en Firestore, usar datos básicos de Auth
          console.warn('⚠️ [AUTH LISTENER] Usuario no existe en Firestore, usando datos básicos');
          const basicUser = {
            id: firebaseUser.uid,
            username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
            email: firebaseUser.email || '',
            avatar: firebaseUser.photoURL || '',
            isAdmin: false,
            dni: '',
            phone: '',
            createdAt: new Date()
          };
          onUser(basicUser);
        }
      } catch (error) {
        console.error('❌ [AUTH LISTENER] Error cargando datos del usuario desde Firestore:', error);
        // En caso de error, usar datos básicos de Auth
        const basicUser = {
          id: firebaseUser.uid,
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
          email: firebaseUser.email || '',
          avatar: firebaseUser.photoURL || '',
          isAdmin: false,
          dni: '',
          phone: '',
          createdAt: new Date()
        };
        onUser(basicUser);
      }
    })();
  });
}

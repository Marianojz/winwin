import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase, ref, set } from 'firebase/database';  // <- NUEVA IMPORTACIÓN

// ⚠️ IMPORTANTE: Las credenciales ahora se cargan desde variables de entorno
// Crea un archivo .env en la raíz del proyecto con las variables necesarias
// Ver .env.example para referencia
// 
// Para desarrollo local:
// 1. Copia .env.example a .env
// 2. Completa las variables con tus credenciales de Firebase
// 3. Reinicia el servidor de desarrollo

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

// Validar que las credenciales estén configuradas
const requiredVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_DATABASE_URL'
];

const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Variables de entorno de Firebase faltantes:', missingVars);
  if (import.meta.env.DEV) {
    console.error('   Crea un archivo .env con las variables necesarias (ver .env.example)');
  } else {
    console.error('   ⚠️ PRODUCCIÓN: Configura las variables de entorno en Vercel:');
    console.error('   1. Ve a https://vercel.com/dashboard');
    console.error('   2. Selecciona tu proyecto → Settings → Environment Variables');
    console.error('   3. Agrega todas las variables que empiecen con VITE_FIREBASE_');
    console.error('   4. Haz un nuevo deploy después de agregar las variables');
  }
} else {
  console.log('✅ Todas las variables de entorno de Firebase están configuradas');
}

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
export async function syncUserToRealtimeDb(userId: string, isAdmin: boolean, email?: string, username?: string, avatar?: string) {
  try {
    const userRef = ref(realtimeDb, `users/${userId}`);
    
    // Verificar si ya existe para no sobrescribir datos importantes
    const { get: firebaseGet } = await import('firebase/database');
    const snapshot = await firebaseGet(userRef);
    
    if (snapshot.exists()) {
      const existingData = snapshot.val();
      // Actualizar isAdmin si cambió, avatar si cambió, y último login, preservar otros datos
      const updates: any = {
        lastSynced: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      if (existingData.isAdmin !== isAdmin) {
        updates.isAdmin = isAdmin;
        console.log('✅ Usuario actualizado en Realtime Database:', userId, 'isAdmin:', isAdmin, '(cambió de', existingData.isAdmin, 'a', isAdmin + ')');
      }
      if (avatar && existingData.avatar !== avatar) {
        updates.avatar = avatar;
        console.log('✅ Avatar actualizado en Realtime Database para usuario:', userId);
      }
      if (email && existingData.email !== email) {
        updates.email = email;
      }
      if (username && existingData.username !== username) {
        updates.username = username;
      }
      await set(userRef, {
        ...existingData,
        ...updates
      });
      if (!updates.isAdmin && !updates.avatar && !updates.email && !updates.username) {
        console.log('✅ Usuario ya está sincronizado en Realtime Database:', userId, 'isAdmin:', isAdmin);
      }
    } else {
      // Crear nuevo registro
      await set(userRef, {
        isAdmin: isAdmin,
        email: email || '',
        username: username || 'Usuario',
        avatar: avatar || '',
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
          
          // Si hay avatar de Google y es diferente al guardado, actualizarlo en Firestore y Realtime Database
          if (googleAvatar && googleAvatar !== savedAvatar) {
            updateDoc(userDocRef, { avatar: googleAvatar }).catch(err => 
              console.warn('Error actualizando avatar en Firestore:', err)
            );
            // También sincronizar inmediatamente con Realtime Database
            syncUserToRealtimeDb(
              firebaseUser.uid,
              userData.role === 'admin' || userData.isAdmin === true,
              firebaseUser.email || '',
              userData.username || firebaseUser.displayName || 'Usuario',
              googleAvatar
            ).catch(err => console.warn('Error sincronizando avatar a Realtime Database:', err));
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
          
          // Sincronizar isAdmin y avatar a Realtime Database para que esté disponible para todos
          // Esto asegura que el avatar se guarde en Realtime Database para todos los usuarios
          syncUserToRealtimeDb(
            firebaseUser.uid,
            fullUser.isAdmin,
            fullUser.email,
            fullUser.username,
            fullUser.avatar
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

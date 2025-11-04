import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';  // <- NUEVA IMPORTACIÓN

// Tu configuración actual (NO LA CAMBIES)
const firebaseConfig = {
  apiKey: "AIzaSyDZjD0_YSivgYk2Kta4sFyV6ZFKM-RUYCM",
  authDomain: "subasta-argenta-winwin.firebaseapp.com",
  projectId: "subasta-argenta-winwin",
  storageBucket: "subasta-argenta-winwin.firebasestorage.app",
  messagingSenderId: "126111072135",
  appId: "1:126111072135:web:ebcf4453a8a358c4d91d22",
  databaseURL: "https://subasta-argenta-winwin-default-rtdb.firebaseio.com/"  // <- NUEVA LÍNEA
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

// Helper para inicializar usuario desde Firebase Auth
export function attachAuthListener(onUser: (user: any | null) => void) {
  return onAuthStateChanged(auth, (firebaseUser) => {
    if (!firebaseUser) {
      onUser(null);
      return;
    }
    
    // Cargar datos completos del usuario desde Firestore de forma asíncrona
    (async () => {
      try {
        // Intentar cargar datos completos del usuario desde Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const fullUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            username: userData.username || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
            avatar: userData.avatar || firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username || 'U')}&size=200&background=FF6B00&color=fff&bold=true`,
            isAdmin: userData.role === 'admin' || userData.isAdmin === true,
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
          onUser(fullUser);
        } else {
          // Si no existe en Firestore, usar datos básicos de Auth
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
        console.error('Error cargando datos del usuario desde Firestore:', error);
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

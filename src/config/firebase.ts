import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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
    const user = {
      id: firebaseUser.uid,
      username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
      email: firebaseUser.email || '',
      avatar: firebaseUser.photoURL || '',
      createdAt: new Date()
    } as any;
    onUser(user);
  });
}

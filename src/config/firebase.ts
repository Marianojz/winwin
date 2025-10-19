import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// IMPORTANTE: Reemplaza TODOS estos valores con los de TU proyecto Firebase
// Ve a: https://console.firebase.google.com/ → Tu proyecto → Configuración
const firebaseConfig = {
  apiKey: "AIzaSyDZjD0_YSivgYk2Kta4sFyV6ZFKM-RUYCM",
  authDomain: "subasta-argenta-winwin.firebaseapp.com",
  projectId: "subasta-argenta-winwin",
  storageBucket: "subasta-argenta-winwin.firebasestorage.app",
  messagingSenderId: "126111072135",
  appId: "1:126111072135:web:ebcf4453a8a358c4d91d22"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios
export const auth = getAuth(app);
export const db = getFirestore(app);

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCx1234567890abcdefghijklmnopqr",
  authDomain: "subasta-argenta-474019.firebaseapp.com",
  projectId: "subasta-argenta-474019",
  storageBucket: "subasta-argenta-474019.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios
export const auth = getAuth(app);
export const db = getFirestore(app);

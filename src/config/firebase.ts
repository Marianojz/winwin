import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// PEGAR AQUÍ TUS CREDENCIALES DE FIREBASE (del paso 4)
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

// ⚠️ PLANTILLA: Reemplaza estos valores con los de tu nuevo proyecto Firebase
// Después de obtener las credenciales del Paso 1.7 de la guía, copia este contenido
// y reemplaza TODO el objeto firebaseConfig en src/config/firebase.ts

const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",                    // ← Copia de Firebase Console
  authDomain: "clickio.firebaseapp.com",        // ← Se genera automáticamente
  projectId: "clickio",                          // ← El nombre de tu proyecto
  storageBucket: "clickio.firebasestorage.app", // ← Se genera automáticamente
  messagingSenderId: "TU_SENDER_ID_AQUI",        // ← Copia de Firebase Console
  appId: "TU_APP_ID_AQUI",                       // ← Copia de Firebase Console
  databaseURL: "https://clickio-default-rtdb.firebaseio.com/",  // ← URL de Realtime Database
  measurementId: "G-XXXXXXXXXX"  // ← OPCIONAL: Solo si habilitaste Google Analytics
};

// 📝 INSTRUCCIONES:
// 1. Ve a Firebase Console → Configuración del proyecto
// 2. Copia los valores del objeto firebaseConfig
// 3. Reemplaza TODO el objeto firebaseConfig en src/config/firebase.ts
// 4. Asegúrate de incluir el databaseURL de Realtime Database
// 5. Si copiaste measurementId de Firebase Console, inclúyelo también
//    (Si no aparece measurementId, no es necesario agregarlo)


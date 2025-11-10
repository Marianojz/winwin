// Configuración de Google Maps API
// Obtén tu API key en: https://console.cloud.google.com/google/maps-apis/credentials

// ⚠️ IMPORTANTE: 
// 1. Crea un archivo .env en la raíz del proyecto
// 2. Agrega: VITE_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
// 3. Reinicia el servidor de desarrollo después de agregar la variable

// Cargar API key desde variables de entorno
// Vite carga variables de .env, .env.local, .env.development, etc.
let apiKeyFromEnv = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();

// Debug: mostrar todas las variables de entorno que empiezan con VITE_ (solo en desarrollo)
if (import.meta.env.DEV) {
  const viteEnvKeys = Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'));
  console.log('🔍 Variables de entorno VITE_ encontradas:', viteEnvKeys);
  console.log('🔍 VITE_GOOGLE_MAPS_API_KEY:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '(no definida)');
}

// SOLUCIÓN TEMPORAL PARA DESARROLLO:
// Si no hay key en las variables de entorno, usar la key directamente (solo en desarrollo)
// ⚠️ IMPORTANTE: Esto es solo para desarrollo. En producción, la key DEBE venir de .env
// ⚠️ ELIMINA ESTA LÍNEA después de reiniciar el servidor y verificar que funciona
if (!apiKeyFromEnv && import.meta.env.DEV) {
  console.warn('⚠️ Usando API key temporal para desarrollo (el servidor necesita reiniciarse)');
  apiKeyFromEnv = 'AIzaSyDqrLcDMRPASXE7dJO7OsqaGa63VLLayJw'; // Key temporal solo para desarrollo
  console.warn('   ⚠️ RECUERDA: Reinicia el servidor (Ctrl+C y luego npm run dev) para cargar desde .env');
}

export const GOOGLE_MAPS_API_KEY = apiKeyFromEnv;

// Debug: mostrar si la key se está cargando (solo en desarrollo)
if (import.meta.env.DEV) {
  if (GOOGLE_MAPS_API_KEY) {
    console.log('✅ Google Maps API Key cargada correctamente');
  } else {
    console.error('❌ Google Maps API Key NO está disponible');
    console.error('   El servidor de desarrollo DEBE reiniciarse para cargar variables de .env');
  }
}

// Restricción de país por defecto (Argentina)
export const DEFAULT_COUNTRY_RESTRICTION = 'ar';

// Configuración de la API
export const GOOGLE_MAPS_CONFIG = {
  apiKey: GOOGLE_MAPS_API_KEY,
  countryRestriction: DEFAULT_COUNTRY_RESTRICTION,
  language: 'es',
  region: 'ar'
};


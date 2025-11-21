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

// ⚠️ SEGURIDAD: La API key DEBE venir de variables de entorno
// No se permite hardcodear la API key en el código fuente
if (!apiKeyFromEnv) {
  if (import.meta.env.DEV) {
    console.error('❌ VITE_GOOGLE_MAPS_API_KEY no está configurada');
    console.error('   Crea un archivo .env en la raíz del proyecto y agrega:');
    console.error('   VITE_GOOGLE_MAPS_API_KEY=tu_api_key_aqui');
    console.error('   Luego reinicia el servidor de desarrollo');
  } else {
    console.error('❌ VITE_GOOGLE_MAPS_API_KEY no está configurada en producción');
  }
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


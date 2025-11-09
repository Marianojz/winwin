// Configuración de Google Maps API
// Obtén tu API key en: https://console.cloud.google.com/google/maps-apis/credentials

// ⚠️ IMPORTANTE: 
// 1. Crea un archivo .env en la raíz del proyecto
// 2. Agrega: VITE_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
// 3. O reemplaza directamente el valor de abajo

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Restricción de país por defecto (Argentina)
export const DEFAULT_COUNTRY_RESTRICTION = 'ar';

// Configuración de la API
export const GOOGLE_MAPS_CONFIG = {
  apiKey: GOOGLE_MAPS_API_KEY,
  countryRestriction: DEFAULT_COUNTRY_RESTRICTION,
  language: 'es',
  region: 'ar'
};


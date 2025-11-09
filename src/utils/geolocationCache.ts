// Cache de resultados de geolocalización (30 días)

interface CachedGeolocation {
  address: string;
  coordinates: { lat: number; lng: number };
  timestamp: number;
  expiresAt: number;
}

const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 días en milisegundos
const CACHE_KEY_PREFIX = 'geolocation_cache_';

// Generar clave de cache basada en la dirección
const generateCacheKey = (address: string): string => {
  return `${CACHE_KEY_PREFIX}${address.toLowerCase().trim().replace(/\s+/g, '_')}`;
};

// Guardar en cache
export const cacheGeolocation = (
  address: string,
  coordinates: { lat: number; lng: number }
): void => {
  try {
    const now = Date.now();
    const cached: CachedGeolocation = {
      address,
      coordinates,
      timestamp: now,
      expiresAt: now + CACHE_DURATION
    };
    
    const key = generateCacheKey(address);
    localStorage.setItem(key, JSON.stringify(cached));
  } catch (error) {
    console.warn('Error guardando geolocalización en cache:', error);
  }
};

// Obtener del cache
export const getCachedGeolocation = (
  address: string
): { lat: number; lng: number } | null => {
  try {
    const key = generateCacheKey(address);
    const cachedStr = localStorage.getItem(key);
    
    if (!cachedStr) return null;
    
    const cached: CachedGeolocation = JSON.parse(cachedStr);
    
    // Verificar si expiró
    if (Date.now() > cached.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    
    return cached.coordinates;
  } catch (error) {
    console.warn('Error leyendo geolocalización del cache:', error);
    return null;
  }
};

// Limpiar cache expirado
export const cleanExpiredCache = (): void => {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const cached: CachedGeolocation = JSON.parse(localStorage.getItem(key) || '{}');
          if (now > cached.expiresAt) {
            localStorage.removeItem(key);
          }
        } catch {
          // Si hay error parseando, eliminar la entrada corrupta
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.warn('Error limpiando cache expirado:', error);
  }
};

// Limpiar todo el cache
export const clearGeolocationCache = (): void => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Error limpiando cache:', error);
  }
};


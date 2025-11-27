/**
 * Utilidades para geocoding (convertir direcciones en coordenadas)
 * Usa Nominatim de OpenStreetMap (gratuito, sin API key)
 */

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

/**
 * Busca coordenadas para una dirección usando Nominatim (OpenStreetMap)
 */
export const geocodeAddress = async (address: string): Promise<GeocodingResult[]> => {
  try {
    if (!address || address.trim().length < 3) {
      return [];
    }

    // Usar Nominatim de OpenStreetMap (gratuito, sin API key)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5&countrycodes=ar&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WinWin E-commerce App' // Nominatim requiere User-Agent
      }
    });

    if (!response.ok) {
      throw new Error(`Error en geocoding: ${response.statusText}`);
    }

    const data = await response.json();

    return data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      displayName: item.display_name,
      address: {
        street: item.address?.road || item.address?.street,
        city: item.address?.city || item.address?.town || item.address?.village,
        state: item.address?.state,
        country: item.address?.country
      }
    }));
  } catch (error) {
    console.error('Error en geocoding:', error);
    throw error;
  }
};

/**
 * Reverse geocoding: convierte coordenadas en dirección
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<GeocodingResult | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WinWin E-commerce App'
      }
    });

    if (!response.ok) {
      throw new Error(`Error en reverse geocoding: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lon),
      displayName: data.display_name,
      address: {
        street: data.address?.road || data.address?.street,
        city: data.address?.city || data.address?.town || data.address?.village,
        state: data.address?.state,
        country: data.address?.country
      }
    };
  } catch (error) {
    console.error('Error en reverse geocoding:', error);
    return null;
  }
};


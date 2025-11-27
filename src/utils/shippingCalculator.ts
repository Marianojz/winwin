// Calculadora de costos de envío basada en distancia y zonas
// Versión inicial: usa distancia en línea recta (Haversine) y un límite de 100 km
// Más adelante se puede reemplazar la distancia por una API de rutas (OpenRouteService, Mapbox, etc.)

export interface ShippingCoordinates {
  lat: number;
  lng: number;
}

export interface ShippingZone {
  id: string;
  name: string;
  maxDistanceKm: number;
  basePrice: number;
  pricePerKm: number;
  minPrice: number;
  description?: string;
}

export interface ShippingCalculationInput {
  origin: ShippingCoordinates;
  destination: ShippingCoordinates;
  zones?: ShippingZone[];
  maxRadiusKm?: number;
}

export interface ShippingCalculationResult {
  ok: boolean;
  reason?: 'OUT_OF_RADIUS' | 'NO_ZONE_MATCH' | 'INVALID_COORDINATES';
  distanceKm: number;
  zone?: ShippingZone;
  cost?: number;
  breakdown?: {
    basePrice: number;
    variablePrice: number;
    appliedMinPrice: boolean;
  };
}

// Zonas por defecto pensadas para un radio de hasta 100 km
// Se puede sobreescribir desde la UI si necesitás otros valores
export const DEFAULT_SHIPPING_ZONES: ShippingZone[] = [
  {
    id: 'zone-1',
    name: 'Zona A (Local / Cercana)',
    maxDistanceKm: 10,
    basePrice: 1200,
    pricePerKm: 0,
    minPrice: 1200,
    description: 'Envíos muy cercanos (hasta 10 km). Ideal para radio urbano inmediato.'
  },
  {
    id: 'zone-2',
    name: 'Zona B (Intermedia)',
    maxDistanceKm: 30,
    basePrice: 1500,
    pricePerKm: 40,
    minPrice: 1800,
    description: 'Envíos dentro del área metropolitana / ciudades cercanas.'
  },
  {
    id: 'zone-3',
    name: 'Zona C (Extendida)',
    maxDistanceKm: 100,
    basePrice: 2000,
    pricePerKm: 55,
    minPrice: 2600,
    description: 'Envíos hasta 100 km. Cubre combustible + tiempo de viaje.'
  }
];

const toRad = (value: number): number => (value * Math.PI) / 180;

// Distancia aproximada en km entre dos coordenadas (línea recta)
export const haversineDistanceKm = (a: ShippingCoordinates, b: ShippingCoordinates): number => {
  if (
    a.lat === undefined ||
    a.lng === undefined ||
    b.lat === undefined ||
    b.lng === undefined ||
    Number.isNaN(a.lat) ||
    Number.isNaN(a.lng) ||
    Number.isNaN(b.lat) ||
    Number.isNaN(b.lng)
  ) {
    return NaN;
  }

  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return R * c;
};

export const calculateShippingCost = (input: ShippingCalculationInput): ShippingCalculationResult => {
  const zones = input.zones && input.zones.length > 0 ? input.zones : DEFAULT_SHIPPING_ZONES;
  const maxRadiusKm = input.maxRadiusKm ?? 100;

  const distanceKm = haversineDistanceKm(input.origin, input.destination);

  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    return {
      ok: false,
      reason: 'INVALID_COORDINATES',
      distanceKm: 0
    };
  }

  if (distanceKm > maxRadiusKm) {
    return {
      ok: false,
      reason: 'OUT_OF_RADIUS',
      distanceKm
    };
  }

  // Buscar la primera zona cuyo maxDistanceKm cubra la distancia
  const zone = zones.find((z) => distanceKm <= z.maxDistanceKm);

  if (!zone) {
    return {
      ok: false,
      reason: 'NO_ZONE_MATCH',
      distanceKm
    };
  }

  const variablePrice = Math.max(0, distanceKm) * (zone.pricePerKm || 0);
  const rawCost = zone.basePrice + variablePrice;
  const cost = Math.max(rawCost, zone.minPrice);

  return {
    ok: true,
    distanceKm,
    zone,
    cost,
    breakdown: {
      basePrice: zone.basePrice,
      variablePrice,
      appliedMinPrice: cost === zone.minPrice && rawCost < zone.minPrice
    }
  };
};



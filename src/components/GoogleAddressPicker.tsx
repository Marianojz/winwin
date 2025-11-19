import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, Loader, CheckCircle, AlertCircle, Navigation } from 'lucide-react';
import { cacheGeolocation, getCachedGeolocation } from '../utils/geolocationCache';
import './GoogleAddressPicker.css';

// Tipos para la dirección
export interface AddressComponents {
  street: string;
  streetNumber: string;
  floor: string;
  apartment: string;
  crossStreets: string;
  locality: string;
  province: string;
  postalCode: string;
  country: string;
}

export interface AddressData {
  formatted: string;
  components: AddressComponents;
  coordinates: {
    lat: number;
    lng: number;
  };
  placeId?: string;
}

interface GoogleAddressPickerProps {
  onAddressSelect: (address: AddressData) => void;
  initialAddress?: AddressData;
  apiKey: string;
  countryRestriction?: string; // Ej: 'ar' para Argentina
  className?: string;
  mapContainerId?: string; // ID del contenedor donde renderizar el mapa
  showAddressFields?: boolean; // Si mostrar los campos de dirección desglosados
  showMap?: boolean; // Si mostrar el mapa
}

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
    __googleMapsLoading?: Promise<void>;
    __googleMapsLoaded?: boolean;
    __googleMapsApiKeyLogged?: boolean; // Para evitar logs repetitivos
  }
}

const GoogleAddressPicker = ({
  onAddressSelect,
  initialAddress,
  apiKey,
  countryRestriction = 'ar',
  className = '',
  mapContainerId,
  showAddressFields = true,
  showMap = true
}: GoogleAddressPickerProps) => {
  // Estados
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addressData, setAddressData] = useState<AddressData | null>(initialAddress || null);
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [geocoder, setGeocoder] = useState<any>(null);
  const [autocompleteService, setAutocompleteService] = useState<any>(null);
  const [placesService, setPlacesService] = useState<any>(null);
  const [apiError, setApiError] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);

  // Refs
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const predictionsRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Componentes de dirección
  const [components, setComponents] = useState<AddressComponents>({
    street: initialAddress?.components.street || '',
    streetNumber: initialAddress?.components.streetNumber || '',
    floor: initialAddress?.components.floor || '',
    apartment: initialAddress?.components.apartment || '',
    crossStreets: initialAddress?.components.crossStreets || '',
    locality: initialAddress?.components.locality || '',
    province: initialAddress?.components.province || '',
    postalCode: initialAddress?.components.postalCode || '',
    country: initialAddress?.components.country || 'Argentina'
  });

  // Refs para evitar múltiples inicializaciones
  const servicesInitializedRef = useRef(false);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Inicializar servicios de Google Maps
  const initializeServices = useCallback(() => {
    // Evitar inicializar múltiples veces
    if (servicesInitializedRef.current && autocompleteServiceRef.current && placesServiceRef.current && geocoderRef.current) {
      return;
    }

    if (!window.google || !window.google.maps) {
      // Log eliminado para reducir ruido en consola
      return;
    }

    // Función para intentar inicializar con retry
    const tryInitialize = (attempt = 0, maxAttempts = 10) => {
      try {
        // Verificar que los servicios estén disponibles
        if (!window.google.maps.places) {
          if (attempt < maxAttempts) {
            // Esperar un poco más y reintentar
            setTimeout(() => tryInitialize(attempt + 1, maxAttempts), 100);
            return;
          } else {
            console.error('❌ Google Maps Places API no está disponible después de varios intentos.');
            console.error('   Verifica que la librería "places" esté habilitada en la URL de carga de la API.');
            return;
          }
        }

        // Si llegamos aquí, places está disponible
        try {
          // Verificar nuevamente antes de crear instancias
          if (servicesInitializedRef.current && autocompleteServiceRef.current && placesServiceRef.current && geocoderRef.current) {
            return;
          }

          // Intentar usar la nueva API primero, luego fallback a legacy
          let autocomplete: any = null;
          let places: any = null;
          
          // Intentar nueva API (AutocompleteSuggestion)
          if (window.google.maps.places.AutocompleteSuggestion) {
            try {
              // La nueva API funciona diferente, pero por ahora usamos legacy como fallback
              // Log eliminado para reducir ruido en consola
            } catch (e) {
              // Log eliminado para reducir ruido en consola
            }
          }
          
          // Usar API legacy (aún funciona para proyectos existentes)
          // Nota: Google recomienda migrar a la nueva API, pero la legacy sigue funcionando
          try {
            autocomplete = new window.google.maps.places.AutocompleteService();
            places = new window.google.maps.places.PlacesService(document.createElement('div'));
          } catch (legacyError: any) {
            if (legacyError?.message?.includes('not available to new customers') || 
                legacyError?.message?.includes('AutocompleteService')) {
              console.error('❌ Places API (legacy) no disponible para nuevos clientes. Necesitas migrar a la nueva API.');
              setApiError('Places API (legacy) no está disponible. Por favor, contacta al administrador para migrar a la nueva API de Google Places.');
              return;
            }
            throw legacyError;
          }
          
          const geocoderInstance = new window.google.maps.Geocoder();

          // Guardar en refs y estados
          autocompleteServiceRef.current = autocomplete;
          placesServiceRef.current = places;
          geocoderRef.current = geocoderInstance;
          setAutocompleteService(autocomplete);
          setPlacesService(places);
          setGeocoder(geocoderInstance);
          servicesInitializedRef.current = true;
          
          // Log eliminado para reducir ruido en consola
        } catch (error: any) {
          if (error?.message?.includes('legacy') || error?.message?.includes('not enabled')) {
            setApiError('Places API (legacy) no está habilitada. Habilita "Places API" en Google Cloud Console.');
          }
          throw error;
        }
      } catch (error) {
        console.error('❌ Error inicializando servicios de Google Maps:', error);
        // Reintentar si es un error de inicialización
        if (attempt < maxAttempts) {
          setTimeout(() => tryInitialize(attempt + 1, maxAttempts), 100);
        }
      }
    };

    // Iniciar el proceso de inicialización
    tryInitialize();
  }, [apiKey, countryRestriction]);

  // Inicializar mapa solo cuando Google Maps esté completamente cargado
  useEffect(() => {
    // Si ya hay un mapa, no hacer nada
    if (map) {
      return;
    }

    // Función para inicializar el mapa cuando esté listo
    const initMap = () => {
      // Verificar que Google Maps esté completamente cargado
      if (!window.google || !window.google.maps || typeof window.google.maps.Map !== 'function') {
        return false;
      }

      // Usar el contenedor externo si se proporciona, sino usar el ref interno
      const mapContainer = mapContainerId 
        ? document.getElementById(mapContainerId) 
        : mapRef.current;
      
      // Verificar que el contenedor exista
      if (!mapContainer) {
        return false;
      }

      const initialCenter = initialAddress?.coordinates || { lat: -34.6037, lng: -58.3816 };
      
      try {
        const mapInstance = new window.google.maps.Map(mapContainer, {
        center: initialCenter,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      const markerInstance = new window.google.maps.Marker({
        map: mapInstance,
        draggable: true,
        position: initialCenter,
        animation: window.google.maps.Animation.DROP,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="#FF6B00" stroke="#FFFFFF" stroke-width="2"/>
              <circle cx="16" cy="16" r="6" fill="#FFFFFF"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32),
          anchor: new window.google.maps.Point(16, 32)
        }
      });

      // Función para geocodificación inversa (definida localmente para evitar dependencias)
      const handleReverseGeocode = (lat: number, lng: number) => {
        const currentGeocoder = geocoderRef.current;
        if (!currentGeocoder) return;
        setLoading(true);
        
        // Actualizar posición del marcador inmediatamente (feedback visual instantáneo)
        if (markerInstance) {
          markerInstance.setPosition({ lat, lng });
        }
        if (mapInstance) {
          mapInstance.panTo({ lat, lng });
        }
        
        currentGeocoder.geocode(
          { location: { lat, lng } },
          (results: any[], status: string) => {
            if (status === 'OK' && results && results.length > 0) {
              const place = results[0];
              // Parsear componentes directamente aquí
              const addressComponents = place.address_components || [];
              const newComponents: AddressComponents = {
                street: '',
                streetNumber: '',
                floor: '',
                apartment: '',
                crossStreets: '',
                locality: '',
                province: '',
                postalCode: '',
                country: 'Argentina'
              };

              addressComponents.forEach((component: any) => {
                const types = component.types;
                if (types.includes('route')) {
                  newComponents.street = component.long_name;
                } else if (types.includes('street_number')) {
                  newComponents.streetNumber = component.long_name;
                } else if (types.includes('locality') || types.includes('administrative_area_level_2')) {
                  newComponents.locality = component.long_name;
                } else if (types.includes('administrative_area_level_1')) {
                  newComponents.province = component.long_name;
                } else if (types.includes('postal_code')) {
                  newComponents.postalCode = component.long_name;
                } else if (types.includes('country')) {
                  newComponents.country = component.long_name;
                }
              });

              setComponents(newComponents);
              const addressData: AddressData = {
                formatted: place.formatted_address,
                components: newComponents,
                coordinates: {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng()
                },
                placeId: place.place_id
              };
              setAddressData(addressData);
              setIsValidAddress(true);
              setSearchQuery(place.formatted_address);
              onAddressSelect(addressData);
            }
            setLoading(false);
          }
        );
      };

      // Evento al arrastrar marcador
      markerInstance.addListener('dragend', () => {
        const position = markerInstance.getPosition();
        if (position) {
          handleReverseGeocode(position.lat(), position.lng());
        }
      });

      // Evento al hacer clic en el mapa
      mapInstance.addListener('click', (e: any) => {
        markerInstance.setPosition(e.latLng);
        handleReverseGeocode(e.latLng.lat(), e.latLng.lng());
      });

      setMap(mapInstance);
      setMarker(markerInstance);
      setMapReady(true);

      // Si hay dirección inicial, centrar el mapa
      if (initialAddress) {
        mapInstance.setCenter(initialAddress.coordinates);
        markerInstance.setPosition(initialAddress.coordinates);
      }
      return true;
    } catch (error: any) {
      console.error('❌ Error inicializando mapa de Google Maps:', error);
      // No mostrar error al usuario si el mapa no es crítico (solo se muestra si showMap es true)
      return false;
    }
  };

  // Intentar inicializar inmediatamente si ya está listo
  if (initMap()) {
    return;
  }

  // Si no está listo, esperar a que se cargue
  if (window.__googleMapsLoading) {
    window.__googleMapsLoading.then(() => {
      initMap();
    }).catch(() => {
      // Error silencioso
    });
    return;
  }

  // Si no hay promesa de carga, verificar periódicamente (máximo 5 segundos)
  let attempts = 0;
  const maxAttempts = 50; // 50 intentos * 100ms = 5 segundos
  const checkInterval = setInterval(() => {
    attempts++;
    if (initMap() || attempts >= maxAttempts) {
      clearInterval(checkInterval);
    }
  }, 100);

  return () => {
    clearInterval(checkInterval);
  };
}, [initialAddress, onAddressSelect, mapContainerId, map]);

  // Cargar Google Maps API (solo una vez globalmente)
  useEffect(() => {
    // Evitar logs repetitivos - solo mostrar una vez globalmente
    // Logs de API Key eliminados para reducir ruido en consola

    // Validar que la API key esté configurada
    if (!apiKey || apiKey.trim() === '') {
      console.error('❌ Google Maps API Key no configurada.');
      console.error('   Valor recibido:', apiKey || '(vacío)');
      console.error('   Por favor, configura VITE_GOOGLE_MAPS_API_KEY en tu archivo .env y reinicia el servidor.');
      return;
    }

    // Si ya está cargada, inicializar servicios inmediatamente
    if (window.__googleMapsLoaded && window.google && window.google.maps) {
      initializeServices();
      return;
    }

    // Si ya hay una carga en progreso, esperar a que termine
    if (window.__googleMapsLoading) {
      window.__googleMapsLoading.then(() => {
        if (window.google && window.google.maps) {
          initializeServices();
        }
      }).catch((error) => {
        console.error('❌ Error cargando Google Maps API:', error);
      });
      return;
    }

    // Verificar si ya existe el script en el DOM
    const existingScript = document.querySelector('script#google-maps-script');
    if (existingScript) {
      // El script existe, esperar a que cargue
      const loadPromise = new Promise<void>((resolve, reject) => {
        if (window.google && window.google.maps) {
          window.__googleMapsLoaded = true;
          resolve();
        } else {
          existingScript.addEventListener('load', () => {
            if (window.google && window.google.maps) {
              window.__googleMapsLoaded = true;
              resolve();
            } else {
              reject(new Error('Google Maps API no se cargó correctamente'));
            }
          });
          existingScript.addEventListener('error', reject);
        }
      });
      
      window.__googleMapsLoading = loadPromise;
      loadPromise.then(() => initializeServices()).catch(console.error);
      return;
    }

    // Crear nueva promesa de carga
    const loadPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&language=es&region=${countryRestriction}&loading=async`;
      script.async = true;
      script.defer = true;
      script.id = 'google-maps-script';
      
      script.onload = () => {
        if (window.google && window.google.maps) {
          window.__googleMapsLoaded = true;
          
          resolve();
        } else {
          reject(new Error('Google Maps API no se inicializó correctamente'));
        }
      };
      
      script.onerror = () => {
        reject(new Error('Error cargando Google Maps API. Verifica tu API key y las restricciones en Google Cloud Console.'));
      };
      
      document.head.appendChild(script);
    });

    window.__googleMapsLoading = loadPromise;
    loadPromise.then(() => initializeServices()).catch((error) => {
      console.error('❌', error.message);
    });

    return () => {
      // No remover el script al desmontar
    };
  }, [apiKey, countryRestriction, initializeServices]);

  // Parsear componentes de dirección (definir primero para evitar dependencia circular)
  const parseAddressComponents = useCallback((place: any) => {
    if (!place) {
      console.error('❌ parseAddressComponents: place es null o undefined');
      return;
    }

    const addressComponents = place.address_components || [];
    const newComponents: AddressComponents = {
      street: '',
      streetNumber: '',
      floor: '',
      apartment: '',
      crossStreets: '',
      locality: '',
      province: '',
      postalCode: '',
      country: 'Argentina'
    };

    addressComponents.forEach((component: any) => {
      const types = component.types || [];
      
      if (types.includes('route')) {
        newComponents.street = component.long_name || component.short_name || '';
      } else if (types.includes('street_number')) {
        newComponents.streetNumber = component.long_name || component.short_name || '';
      } else if (types.includes('locality') || types.includes('administrative_area_level_2')) {
        if (!newComponents.locality) {
          newComponents.locality = component.long_name || component.short_name || '';
        }
      } else if (types.includes('administrative_area_level_1')) {
        newComponents.province = component.long_name || component.short_name || '';
      } else if (types.includes('postal_code')) {
        newComponents.postalCode = component.long_name || component.short_name || '';
      } else if (types.includes('country')) {
        newComponents.country = component.long_name || 'Argentina';
      }
    });

    // Si no hay calle pero sí hay formatted_address, intentar extraerla
    if (!newComponents.street && place.formatted_address) {
      const parts = place.formatted_address.split(',');
      if (parts.length > 0) {
        const firstPart = parts[0].trim();
        // Intentar separar calle y número
        const streetMatch = firstPart.match(/^(.+?)\s+(\d+)/);
        if (streetMatch) {
          newComponents.street = streetMatch[1].trim();
          newComponents.streetNumber = streetMatch[2].trim();
        } else {
          newComponents.street = firstPart;
        }
      }
    }

    setComponents(newComponents);
    
    const location = place.geometry?.location;
    if (!location) {
      console.error('❌ parseAddressComponents: place.geometry.location es null o undefined');
      return;
    }

    const addressData: AddressData = {
      formatted: place.formatted_address || place.name || '',
      components: newComponents,
      coordinates: {
        lat: typeof location.lat === 'function' ? location.lat() : location.lat,
        lng: typeof location.lng === 'function' ? location.lng() : location.lng
      },
      placeId: place.place_id || ''
    };

    setAddressData(addressData);
    setIsValidAddress(true);
    setSearchQuery(addressData.formatted);
    
    // Llamar al callback para notificar al componente padre
    try {
      onAddressSelect(addressData);
      // Log eliminado para reducir ruido en consola
    } catch (error) {
      console.error('❌ Error en onAddressSelect:', error);
    }
  }, [onAddressSelect]);

  // Autocompletado predictivo
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    
    // Verificar que Google Maps esté cargado
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      // Log eliminado para reducir ruido en consola
      // Reintentar después de un breve delay (usar el valor actual del input)
      setTimeout(() => {
        const currentValue = autocompleteInputRef.current?.value || value;
        if (window.google && window.google.maps && window.google.maps.places && currentValue.trim()) {
          // Llamar directamente a la lógica sin recursión
          const currentAutocompleteService = autocompleteServiceRef.current;
          if (currentAutocompleteService) {
            const request = {
              input: currentValue,
              componentRestrictions: { country: countryRestriction },
              language: 'es',
              types: ['address'] as any[]
            };
            currentAutocompleteService.getPlacePredictions(request, (predictions: any[], status: string) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                setPredictions(predictions);
                setShowPredictions(true);
                setApiError('');
              }
            });
          }
        }
      }, 500);
      return;
    }
    
    // Usar el ref en lugar del estado para asegurar que siempre tengamos el servicio más reciente
    const currentAutocompleteService = autocompleteServiceRef.current || autocompleteService;
    if (!value.trim() || !currentAutocompleteService) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    const request = {
      input: value,
      componentRestrictions: { country: countryRestriction },
      language: 'es',
      types: ['address']
    };

    // Logs eliminados para reducir ruido en consola

    currentAutocompleteService.getPlacePredictions(request, (predictions: any[], status: string) => {
      // Logs eliminados para reducir ruido en consola

      if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
        setPredictions(predictions);
        setShowPredictions(true);
        setApiError(''); // Limpiar error si funciona
        
        // En móvil, hacer scroll para que las predicciones sean visibles
        if (isMobile && autocompleteInputRef.current) {
          setTimeout(() => {
            // Scroll suave para que el input quede visible con espacio para las predicciones
            autocompleteInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
        }
        // Logs eliminados para reducir ruido en consola
      } else {
        setPredictions([]);
        setShowPredictions(false);
        
        // Mostrar mensaje de error si es un problema de API
        if (status === window.google.maps.places.PlacesServiceStatus.REQUEST_DENIED) {
          const errorMsg = 'Places API no está habilitada. Habilita "Places API" en Google Cloud Console.';
          setApiError(errorMsg);
          console.error('❌', errorMsg);
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          // No hay resultados, no es un error
          setApiError('');
          // Logs eliminados para reducir ruido en consola
        } else {
          // Otros errores
          if (import.meta.env.DEV) {
            console.warn('⚠️ Estado de Places API:', status);
            if (status === 'OVER_QUERY_LIMIT') {
              setApiError('Límite de consultas excedido. Verifica tu facturación en Google Cloud Console.');
            } else if (status === 'INVALID_REQUEST') {
              setApiError('Solicitud inválida. Verifica la configuración de la API.');
            }
          }
        }
      }
    });
  }, [autocompleteService, countryRestriction, isMobile]);

  // Seleccionar predicción
  const selectPrediction = useCallback((placeId: string) => {
    // Usar el ref en lugar del estado para asegurar que siempre tengamos el servicio más reciente
    const currentPlacesService = placesServiceRef.current || placesService;
    if (!currentPlacesService) {
      // Log eliminado para reducir ruido en consola
      // Reintentar después de un breve delay
      setTimeout(() => {
        const retryService = placesServiceRef.current || placesService;
        if (retryService) {
          selectPrediction(placeId);
        } else {
          setApiError('Servicio de direcciones no disponible. Por favor, recarga la página.');
          setLoading(false);
        }
      }, 500);
      return;
    }

    setLoading(true);
    setShowPredictions(false);

    const request = {
      placeId: placeId,
      fields: [
        'formatted_address',
        'address_components',
        'geometry',
        'place_id',
        'name'
      ]
    };

    currentPlacesService.getDetails(request, (place: any, status: string) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
        parseAddressComponents(place);
        // Actualizar mapa instantáneamente
        if (map && marker) {
          const location = place.geometry.location;
          // Usar panTo para transición suave
          map.panTo(location);
          marker.setPosition(location);
          // Zoom más cercano para mejor precisión
          map.setZoom(18);
        }
      } else {
        console.error('❌ Error obteniendo detalles del lugar:', status);
        setApiError('Error al obtener los detalles de la dirección seleccionada.');
      }
      setLoading(false);
    });
  }, [placesService, map, marker, parseAddressComponents]);

  // Geocodificación inversa
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (!geocoder) return;

    setLoading(true);

    geocoder.geocode(
      { location: { lat, lng } },
      (results: any[], status: string) => {
        if (status === 'OK' && results && results.length > 0) {
          const place = results[0];
          parseAddressComponents({
            formatted_address: place.formatted_address,
            address_components: place.address_components,
            geometry: place.geometry,
            place_id: place.place_id
          });
        } else {
          setIsValidAddress(false);
        }
        setLoading(false);
      }
    );
  }, [geocoder, parseAddressComponents]);

  // Validar dirección
  const validateAddress = useCallback(async () => {
    if (!addressData || !geocoder) {
      setIsValidAddress(false);
      return;
    }

    const addressString = [
      components.street,
      components.streetNumber,
      components.locality,
      components.province
    ].filter(Boolean).join(', ');

    if (!addressString) {
      setIsValidAddress(false);
      return;
    }

    // Verificar cache primero
    const cachedCoords = getCachedGeolocation(addressString);
    if (cachedCoords) {
      setIsValidAddress(true);
      if (map && marker) {
        map.setCenter(cachedCoords);
        marker.setPosition(cachedCoords);
      }
      setAddressData(prev => prev ? {
        ...prev,
        coordinates: cachedCoords
      } : null);
      return;
    }

    // Si no hay cache, geocodificar
    geocoder.geocode(
      { address: addressString },
      (results: any[], status: string) => {
        if (status === 'OK' && results && results.length > 0) {
          setIsValidAddress(true);
          // Actualizar coordenadas si cambió la dirección
          const location = results[0].geometry.location;
          const coords = {
            lat: location.lat(),
            lng: location.lng()
          };
          
          // Guardar en cache
          cacheGeolocation(addressString, coords);
          
          if (map && marker) {
            map.setCenter(coords);
            marker.setPosition(coords);
          }
          setAddressData(prev => prev ? {
            ...prev,
            coordinates: coords
          } : null);
        } else {
          setIsValidAddress(false);
        }
      }
    );
  }, [addressData, components, geocoder, map, marker]);

  // Actualizar componentes manualmente
  const handleComponentChange = useCallback((field: keyof AddressComponents, value: string) => {
    setComponents(prev => ({ ...prev, [field]: value }));
    setIsValidAddress(false);
  }, []);

  // Efecto para validar cuando cambian los componentes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (components.street && components.streetNumber) {
        validateAddress();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [components.street, components.streetNumber, components.locality, validateAddress]);

  // Ajuste automático al enfocar inputs - para todos los dispositivos
  useEffect(() => {
    const inputs = formRef.current?.querySelectorAll('input, select, textarea');
    inputs?.forEach(input => {
      const handleFocus = (e: Event) => {
        const target = e.target as HTMLElement;
        const fieldGroup = target.closest('.field-group');
        
        // Scroll suave al campo con offset para header sticky
        setTimeout(() => {
          if (fieldGroup) {
            fieldGroup.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
          } else {
            target.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
          }
        }, 100);
      };

      input.addEventListener('focus', handleFocus);
      
      return () => {
        input.removeEventListener('focus', handleFocus);
      };
    });
  }, []);

  // Detectar errores de API legacy en la consola
  useEffect(() => {
    const originalError = console.error;
    const errorHandler = (...args: any[]) => {
      const errorMsg = args.join(' ');
      if (errorMsg.includes('legacy API') && errorMsg.includes('not enabled')) {
        setApiError('Places API (legacy) no está habilitada en Google Cloud Console. Habilita "Places API" para usar el autocompletado.');
      }
      originalError.apply(console, args);
    };
    
    console.error = errorHandler;
    
    return () => {
      console.error = originalError;
    };
  }, []);

  // Cerrar predicciones al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        predictionsRef.current &&
        !predictionsRef.current.contains(event.target as Node) &&
        autocompleteInputRef.current &&
        !autocompleteInputRef.current.contains(event.target as Node)
      ) {
        setShowPredictions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`google-address-picker ${className}`} ref={formRef}>
      {/* Mensaje de error de API */}
      {apiError && (
        <div className="api-error-message" style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
          color: 'white',
          borderRadius: '0.75rem',
          fontSize: '0.95rem',
          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
          border: '2px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <AlertCircle size={24} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '1.05rem', display: 'block', marginBottom: '0.5rem' }}>
                ⚠️ Error de configuración de Google Maps
              </strong>
              <div style={{ marginBottom: '0.75rem', lineHeight: '1.5' }}>
                {apiError}
              </div>
              <div style={{ 
                marginTop: '0.75rem', 
                padding: '0.75rem', 
                background: 'rgba(0, 0, 0, 0.2)', 
                borderRadius: '0.5rem',
                fontSize: '0.9rem',
                lineHeight: '1.6'
              }}>
                <strong>⚠️ IMPORTANTE: Google está deprecando "Places API" (legacy)</strong>
                <p style={{ margin: '0.5rem 0', color: '#ffd700' }}>
                  Desde marzo 2025, Google no permite "Places API" (legacy) para nuevos clientes. 
                  Si tu proyecto es nuevo, necesitas usar "Places API (New)".
                </p>
                <ol style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
                  <li><strong>Si tu proyecto es ANTIGUO (antes de marzo 2025):</strong>
                    <ul style={{ margin: '0.25rem 0 0.5rem 1.5rem', padding: 0 }}>
                      <li>La API legacy debería seguir funcionando</li>
                      <li>Verifica que "Places API" esté habilitada en{' '}
                        <a 
                          href="https://console.cloud.google.com/apis/library?q=places%20api" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#ffd700', textDecoration: 'underline', fontWeight: 'bold' }}
                        >
                          Google Cloud Console
                        </a>
                      </li>
                      <li>Verifica que tu API key tenga acceso a "Places API" (legacy)</li>
                    </ul>
                  </li>
                  <li><strong>Si tu proyecto es NUEVO (después de marzo 2025):</strong>
                    <ul style={{ margin: '0.25rem 0 0.5rem 1.5rem', padding: 0 }}>
                      <li>Necesitas habilitar <strong>"Places API (New)"</strong> en Google Cloud Console</li>
                      <li>El código necesita ser migrado a la nueva API (AutocompleteSuggestion)</li>
                      <li>Por ahora, el código usa la API legacy que puede no funcionar para proyectos nuevos</li>
                    </ul>
                  </li>
                  <li><strong>SOLUCIÓN:</strong> Contacta al desarrollador para migrar el código a "Places API (New)"</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buscador con autocompletado */}
      <div className="address-search-container">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={20} />
          <input
            ref={autocompleteInputRef}
            type="text"
            className="address-search-input"
            placeholder="Buscar dirección..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => {
              if (predictions.length > 0) setShowPredictions(true);
              // En móvil, hacer scroll para que el input y las predicciones sean visibles
              if (isMobile && autocompleteInputRef.current) {
                setTimeout(() => {
                  // Scroll para que el input quede en la parte superior visible
                  autocompleteInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }
            }}
            onInput={(e) => {
              // Asegurar que el evento se propaga correctamente en móvil
              const value = (e.target as HTMLInputElement).value;
              handleSearchChange(value);
            }}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
            inputMode="text"
          />
          {loading && <Loader className="search-loader" size={18} />}
        </div>

        {/* Overlay oscuro en móvil cuando hay predicciones - ahora opcional ya que las predicciones están debajo del input */}
        {showPredictions && predictions.length > 0 && isMobile && (
          <div 
            className="predictions-overlay"
            onClick={() => setShowPredictions(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.2)', /* Más transparente ya que las predicciones están cerca */
              zIndex: 99, /* Debajo de las predicciones (100) pero por encima del contenido */
              animation: 'fadeIn 0.2s ease',
              pointerEvents: 'auto' /* Permitir clicks para cerrar */
            }}
          />
        )}

        {/* Lista de predicciones */}
        {showPredictions && predictions.length > 0 && (
          <div ref={predictionsRef} className="predictions-list">
            {predictions.map((prediction) => (
              <button
                key={prediction.place_id}
                type="button"
                className="prediction-item"
                onClick={() => {
                  selectPrediction(prediction.place_id);
                  setShowPredictions(false);
                }}
                onTouchStart={(e) => {
                  // Mejorar respuesta táctil en móvil
                  e.currentTarget.style.opacity = '0.7';
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                <MapPin size={16} />
                <div className="prediction-content">
                  <div className="prediction-main-text">{prediction.structured_formatting.main_text}</div>
                  <div className="prediction-secondary-text">{prediction.structured_formatting.secondary_text}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Campos desglosados - solo si showAddressFields es true */}
      {showAddressFields && (
      <div className="address-fields-section">
        <h3 className="section-title">
          <Navigation size={18} />
          Detalles de la dirección
        </h3>

        <div className="address-fields-grid">
          {/* Calle */}
          <div className="field-group field-group-full">
            <label className="field-label">Calle *</label>
            <input
              type="text"
              className="address-field"
              placeholder="Av. Corrientes"
              value={components.street}
              onChange={(e) => handleComponentChange('street', e.target.value)}
            />
          </div>

          {/* Número */}
          <div className="field-group">
            <label className="field-label">Número *</label>
            <input
              type="text"
              className="address-field"
              placeholder="1234"
              value={components.streetNumber}
              onChange={(e) => handleComponentChange('streetNumber', e.target.value)}
            />
          </div>

          {/* Piso */}
          <div className="field-group">
            <label className="field-label">Piso</label>
            <input
              type="text"
              className="address-field"
              placeholder="2"
              value={components.floor}
              onChange={(e) => handleComponentChange('floor', e.target.value)}
            />
          </div>

          {/* Departamento */}
          <div className="field-group">
            <label className="field-label">Depto</label>
            <input
              type="text"
              className="address-field"
              placeholder="A"
              value={components.apartment}
              onChange={(e) => handleComponentChange('apartment', e.target.value)}
            />
          </div>

          {/* Calles laterales */}
          <div className="field-group field-group-full">
            <label className="field-label">Calles laterales</label>
            <input
              type="text"
              className="address-field"
              placeholder="Entre Av. Santa Fe y Av. Córdoba"
              value={components.crossStreets}
              onChange={(e) => handleComponentChange('crossStreets', e.target.value)}
            />
          </div>

          {/* Localidad */}
          <div className="field-group">
            <label className="field-label">Localidad *</label>
            <input
              type="text"
              className="address-field"
              placeholder="Buenos Aires"
              value={components.locality}
              onChange={(e) => handleComponentChange('locality', e.target.value)}
            />
          </div>

          {/* Provincia */}
          <div className="field-group">
            <label className="field-label">Provincia *</label>
            <input
              type="text"
              className="address-field"
              placeholder="CABA"
              value={components.province}
              onChange={(e) => handleComponentChange('province', e.target.value)}
            />
          </div>

          {/* Código Postal */}
          <div className="field-group">
            <label className="field-label">Código Postal</label>
            <input
              type="text"
              className="address-field"
              placeholder="C1425"
              value={components.postalCode}
              onChange={(e) => handleComponentChange('postalCode', e.target.value)}
            />
          </div>
        </div>

        {/* Indicador de validación */}
        {addressData && (
          <div className={`validation-indicator ${isValidAddress ? 'valid' : 'invalid'}`}>
            {isValidAddress ? (
              <>
                <CheckCircle size={18} />
                <span>Dirección válida</span>
              </>
            ) : (
              <>
                <AlertCircle size={18} />
                <span>Verificando dirección...</span>
              </>
            )}
          </div>
        )}
      </div>
      )}

      {/* Mapa interactivo - solo si showMap es true y no hay mapContainerId externo */}
      {/* En móvil, si hay mapContainerId, no renderizar esta sección para evitar espacio vacío */}
      {showMap && !mapContainerId && !isMobile && (
      <div className="map-section">
        <h3 className="section-title">
          <MapPin size={18} />
          Ubicación en el mapa
        </h3>
        <div ref={mapRef} className="google-map-container" id="address-map" />
        <p className="map-hint">
          💡 Arrastrá el marcador o hacé clic en el mapa para ajustar la ubicación exacta
        </p>
      </div>
      )}
      
      {/* Mapa en contenedor externo - se renderiza automáticamente si mapContainerId está definido */}

      {/* Dirección formateada */}
      {addressData && (
        <div className="formatted-address">
          <strong>Dirección completa:</strong>
          <p>{addressData.formatted}</p>
        </div>
      )}
    </div>
  );
};

export default GoogleAddressPicker;


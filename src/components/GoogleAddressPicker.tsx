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

  // Inicializar servicios de Google Maps
  const initializeServices = useCallback(() => {
    if (!window.google || !window.google.maps) {
      console.warn('⚠️ Google Maps API aún no está disponible');
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
          const autocomplete = new window.google.maps.places.AutocompleteService();
          const places = new window.google.maps.places.PlacesService(document.createElement('div'));
          const geocoderInstance = new window.google.maps.Geocoder();

          setAutocompleteService(autocomplete);
          setPlacesService(places);
          setGeocoder(geocoderInstance);
          
          if (import.meta.env.DEV) {
            console.log('✅ Servicios de Google Maps inicializados correctamente');
          }
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

    // Inicializar mapa solo una vez
    // Usar el contenedor externo si se proporciona, sino usar el ref interno
    const mapContainer = mapContainerId 
      ? document.getElementById(mapContainerId) 
      : mapRef.current;
    
    if (mapContainer && !map) {
      const initialCenter = initialAddress?.coordinates || { lat: -34.6037, lng: -58.3816 };
      
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
        if (!geocoder) return;
        setLoading(true);
        
        // Actualizar posición del marcador inmediatamente (feedback visual instantáneo)
        if (markerInstance) {
          markerInstance.setPosition({ lat, lng });
        }
        if (mapInstance) {
          mapInstance.panTo({ lat, lng });
        }
        
        geocoder.geocode(
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
    }
  }, [initialAddress, onAddressSelect, mapContainerId]);

  // Cargar Google Maps API (solo una vez globalmente)
  useEffect(() => {
    // Debug: verificar qué se está recibiendo
    if (import.meta.env.DEV) {
      console.log('🔍 [GoogleAddressPicker] API Key recibida:', apiKey ? `${apiKey.substring(0, 10)}...` : 'VACÍA');
      console.log('🔍 [GoogleAddressPicker] import.meta.env.VITE_GOOGLE_MAPS_API_KEY:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? `${import.meta.env.VITE_GOOGLE_MAPS_API_KEY.substring(0, 10)}...` : 'VACÍA');
    }

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

  // Autocompletado predictivo
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    
    if (!value.trim() || !autocompleteService) {
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

    autocompleteService.getPlacePredictions(request, (predictions: any[], status: string) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
        setPredictions(predictions);
        setShowPredictions(true);
        setApiError(''); // Limpiar error si funciona
      } else {
        setPredictions([]);
        setShowPredictions(false);
        
        // Mostrar mensaje de error si es un problema de API
        if (status === window.google.maps.places.PlacesServiceStatus.REQUEST_DENIED) {
          const errorMsg = 'Places API no está habilitada. Habilita "Places API" en Google Cloud Console.';
          setApiError(errorMsg);
          console.error('❌', errorMsg);
          console.error('   Pasos para habilitar:');
          console.error('   1. Ve a: https://console.cloud.google.com/google/maps-apis/api-list');
          console.error('   2. Busca "Places API" (NO "Places API (New)")');
          console.error('   3. Haz clic en "Habilitar"');
          console.error('   4. Verifica que la facturación esté activa');
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          // No hay resultados, no es un error
          setApiError('');
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
  }, [autocompleteService, countryRestriction]);

  // Seleccionar predicción
  const selectPrediction = useCallback((placeId: string) => {
    if (!placesService) return;

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

    placesService.getDetails(request, (place: any, status: string) => {
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
      }
      setLoading(false);
    });
  }, [placesService, map, marker]);

  // Parsear componentes de dirección
  const parseAddressComponents = useCallback((place: any) => {
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
      formatted: place.formatted_address || place.name,
      components: newComponents,
      coordinates: {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      },
      placeId: place.place_id
    };

    setAddressData(addressData);
    setIsValidAddress(true);
    setSearchQuery(place.formatted_address || place.name);
    onAddressSelect(addressData);
  }, [onAddressSelect]);

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
                <strong>⚠️ IMPORTANTE: El código usa "Places API" (legacy), no "Places API (New)"</strong>
                <ol style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
                  <li><strong>PASO 1 - Habilitar "Places API" (legacy) en el proyecto:</strong>
                    <ul style={{ margin: '0.25rem 0 0.5rem 1.5rem', padding: 0 }}>
                      <li>Ve a{' '}
                        <a 
                          href="https://console.cloud.google.com/apis/library?q=places%20api" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#ffd700', textDecoration: 'underline', fontWeight: 'bold' }}
                        >
                          Biblioteca de APIs - Buscar "Places API"
                        </a>
                      </li>
                      <li>Busca específicamente <strong>"Places API"</strong> (sin "New")</li>
                      <li>Si NO aparece "Places API" (legacy), significa que Google ya no la permite para proyectos nuevos</li>
                      <li>En ese caso, necesitamos migrar el código a "Places API (New)"</li>
                    </ul>
                  </li>
                  <li><strong>PASO 2 - Si "Places API" (legacy) NO está disponible:</strong>
                    <ul style={{ margin: '0.25rem 0 0.5rem 1.5rem', padding: 0 }}>
                      <li>Marca la casilla de <strong>"Places API (New)"</strong> en las restricciones de tu API key</li>
                      <li>El código necesita ser actualizado para usar la nueva API</li>
                      <li>Esto requiere cambios en el código (migración de AutocompleteService a AutocompleteSuggestion)</li>
                    </ul>
                  </li>
                  <li><strong>SOLUCIÓN TEMPORAL:</strong> Si no puedes habilitar "Places API" (legacy), puedes usar "Places API (New)" pero el código necesita actualizarse</li>
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
            }}
          />
          {loading && <Loader className="search-loader" size={18} />}
        </div>

        {/* Lista de predicciones */}
        {showPredictions && predictions.length > 0 && (
          <div ref={predictionsRef} className="predictions-list">
            {predictions.map((prediction) => (
              <button
                key={prediction.place_id}
                type="button"
                className="prediction-item"
                onClick={() => selectPrediction(prediction.place_id)}
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
      {showMap && !mapContainerId && (
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


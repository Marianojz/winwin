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

  // Cargar Google Maps API
  useEffect(() => {
    if (window.google) {
      initializeServices();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&language=es&region=${countryRestriction}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      initializeServices();
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup si es necesario
    };
  }, [apiKey, countryRestriction]);

  // Inicializar servicios de Google Maps
  const initializeServices = useCallback(() => {
    if (!window.google) return;

    const autocomplete = new window.google.maps.places.AutocompleteService();
    const places = new window.google.maps.places.PlacesService(document.createElement('div'));
    const geocoderInstance = new window.google.maps.Geocoder();

    setAutocompleteService(autocomplete);
    setPlacesService(places);
    setGeocoder(geocoderInstance);

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
        if (!geocoderInstance) return;
        setLoading(true);
        geocoderInstance.geocode(
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
      } else {
        setPredictions([]);
        setShowPredictions(false);
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
        if (map && marker) {
          const location = place.geometry.location;
          map.setCenter(location);
          marker.setPosition(location);
          map.setZoom(17);
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


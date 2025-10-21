import { useState, useEffect, useRef } from 'react';

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialPosition?: [number, number];
  locality?: string;
  province?: string;
}

declare global {
  interface Window {
    L: any;
  }
}

const MapPicker = ({ onLocationSelect, initialPosition = [-34.6037, -58.3816], locality, province }: MapPickerProps) => {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [address, setAddress] = useState('');
  const [mapReady, setMapReady] = useState(false);

  // Verificar que Leaflet esté cargado
  useEffect(() => {
    const checkLeaflet = setInterval(() => {
      if (window.L) {
        console.log('✅ Leaflet cargado correctamente');
        setMapReady(true);
        clearInterval(checkLeaflet);
      }
    }, 100);

    return () => clearInterval(checkLeaflet);
  }, []);

  // Inicializar mapa cuando Leaflet esté listo
  useEffect(() => {
    if (!mapReady || mapRef.current) return;

    const initMap = async () => {
      let centerPosition = initialPosition || [-34.6037, -58.3816];
      
      // Geocodificar si hay localidad y provincia
      if (locality && province) {
        try {
          const searchQuery = `${locality}, ${province}, Argentina`;
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
            {
              headers: {
                'User-Agent': 'SubastaArgenta/1.0'
              }
            }
          );
          const data = await response.json();
          
          if (data && data.length > 0) {
            centerPosition = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            console.log('📍 Mapa centrado en:', locality, province, centerPosition);
          }
        } catch (error) {
          console.error('Error al geocodificar:', error);
        }
      }

      const mapContainer = document.getElementById('map');
      if (!mapContainer) {
        console.error('❌ No se encontró el contenedor del mapa');
        return;
      }

      const L = window.L;

      // Crear el mapa
      const map = L.map('map').setView(centerPosition, 13);
      
      // Agregar capa de tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Crear icono personalizado
      const markerIcon = L.divIcon({
        html: '<div style="font-size: 2rem;">📍</div>',
        className: 'custom-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });

      // Crear marcador
      const marker = L.marker(centerPosition, { 
        icon: markerIcon,
        draggable: true 
      }).addTo(map);

      // Evento al arrastrar el marcador
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        updateLocation(position.lat, position.lng);
      });

      // Evento al hacer clic en el mapa
      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng);
        updateLocation(e.latlng.lat, e.latlng.lng);
      });

      // Seleccionar ubicación inicial
      updateLocation(centerPosition[0], centerPosition[1]);

      mapRef.current = map;
      markerRef.current = marker;

      console.log('✅ Mapa inicializado correctamente');
    };

    initMap();

    // Cleanup al desmontar
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapReady, locality, province]);

  const updateLocation = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'es',
            'User-Agent': 'SubastaArgenta/1.0'
          }
        }
      );
      const data = await response.json();
      const addr = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setAddress(addr);
      onLocationSelect(lat, lng, addr);
    } catch (error) {
      console.error('Error al obtener dirección:', error);
      const addr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setAddress(addr);
      onLocationSelect(lat, lng, addr);
    }
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div 
        id="map" 
        style={{ 
          height: '350px', 
          width: '100%', 
          borderRadius: '0.75rem', 
          marginBottom: '0.75rem',
          border: '2px solid var(--border-color)'
        }}
      />
      {address && (
        <div style={{ 
          padding: '0.75rem', 
          background: 'var(--bg-tertiary)', 
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          color: 'var(--text-secondary)'
        }}>
          <strong>📍 Ubicación seleccionada:</strong><br />
          {address}
        </div>
      )}
      <p style={{ 
        fontSize: '0.8rem', 
        color: 'var(--text-secondary)', 
        marginTop: '0.5rem',
        fontStyle: 'italic'
      }}>
        💡 Hacé click en el mapa o arrastrá el marcador para seleccionar tu ubicación exacta
      </p>
    </div>
  );
};

export default MapPicker;

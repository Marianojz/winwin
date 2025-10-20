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

const MapPicker = ({ onLocationSelect, initialPosition = [-34.6037, -58.3816] }: MapPickerProps) => {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [address, setAddress] = useState('');
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    // Esperar a que Leaflet esté disponible
    const checkLeaflet = setInterval(() => {
      if (window.L) {
        clearInterval(checkLeaflet);
        setMapReady(true);
      }
    }, 100);

    return () => clearInterval(checkLeaflet);
  }, []);

  useEffect(() => {
    if (!mapReady || mapRef.current) return;

    const L = window.L;

    // Crear mapa
    const map = L.map('map').setView(initialPosition, 13);
    
    // Agregar tiles de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Crear marcador
    const marker = L.marker(initialPosition, { draggable: true }).addTo(map);

    // Evento al mover el marcador
    marker.on('dragend', async function(e: any) {
      const position = e.target.getLatLng();
      await updateLocation(position.lat, position.lng);
    });

    // Evento al hacer click en el mapa
    map.on('click', async function(e: any) {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      await updateLocation(lat, lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Cleanup
    return () => {
      map.remove();
    };
  }, [mapReady]);

  const updateLocation = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'es'
          }
        }
      );
      const data = await response.json();
      const addr = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setAddress(addr);
      onLocationSelect(lat, lng, addr);
    } catch (error) {
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

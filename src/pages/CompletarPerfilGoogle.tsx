import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Loader } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useStore } from '../store/useStore';
import GoogleAddressPicker, { AddressData } from '../components/GoogleAddressPicker';
import { GOOGLE_MAPS_CONFIG } from '../config/googleMaps';

const CompletarPerfilGoogle = () => {
  const navigate = useNavigate();
  const { user, setUser } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dni, setDni] = useState('');
  const [addressData, setAddressData] = useState<AddressData | null>(null);

  const handleAddressSelect = (address: AddressData) => {
    setAddressData(address);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!dni.trim() || dni.length < 7) {
      setError('DNI inválido');
      return;
    }

    if (!addressData) {
      setError('Por favor, seleccioná una dirección válida');
      return;
    }

    setLoading(true);

    try {
      if (!user) {
        setError('No hay usuario autenticado');
        setLoading(false);
        return;
      }

      // Preparar datos de dirección
      const addressComponents = addressData.components;
      const fullAddress = [
        addressComponents.street,
        addressComponents.streetNumber,
        addressComponents.floor && `Piso ${addressComponents.floor}`,
        addressComponents.apartment && `Depto ${addressComponents.apartment}`,
        addressComponents.crossStreets && `Entre ${addressComponents.crossStreets}`
      ].filter(Boolean).join(', ');

      // Actualizar Firestore
      await updateDoc(doc(db, 'users', user.id), {
        dni: dni,
        address: fullAddress,
        addressDetails: {
          street: addressComponents.street,
          streetNumber: addressComponents.streetNumber,
          floor: addressComponents.floor,
          apartment: addressComponents.apartment,
          crossStreets: addressComponents.crossStreets,
          locality: addressComponents.locality,
          province: addressComponents.province,
          postalCode: addressComponents.postalCode,
          country: addressComponents.country
        },
        locality: addressComponents.locality,
        province: addressComponents.province,
        latitude: addressData.coordinates.lat,
        longitude: addressData.coordinates.lng,
        mapAddress: addressData.formatted,
        placeId: addressData.placeId
      });

      // Actualizar el estado local
      const updatedUser = {
        ...user,
        dni: dni,
        address: {
          street: addressComponents.street,
          streetNumber: addressComponents.streetNumber,
          floor: addressComponents.floor,
          apartment: addressComponents.apartment,
          crossStreets: addressComponents.crossStreets,
          locality: addressComponents.locality,
          province: addressComponents.province,
          location: {
            lat: addressData.coordinates.lat,
            lng: addressData.coordinates.lng
          }
        }
      };

      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      navigate('/');
    } catch (err) {
      console.error('Error al actualizar perfil:', err);
      setError('Error al guardar los datos. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: 'calc(100vh - 80px)', 
      padding: '2rem 1rem',
      background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary))',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      <div style={{ 
        maxWidth: '900px', 
        margin: '0 auto', 
        background: 'var(--bg-primary)', 
        borderRadius: '1.5rem', 
        padding: '2rem',
        boxShadow: '0 20px 60px var(--shadow-lg)',
        width: '100%'
      }}>
        
        <h1 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Completar Perfil</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Para realizar compras y envíos, necesitamos algunos datos adicionales
        </p>

        {error && (
          <div style={{ 
            padding: '1rem', 
            background: 'var(--error)', 
            color: 'white', 
            borderRadius: '0.75rem', 
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* DNI */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              <FileText size={18} /> DNI
            </label>
            <input 
              type="text" 
              placeholder="12345678" 
              value={dni} 
              onChange={(e) => setDni(e.target.value)} 
              required 
              maxLength={8}
              style={{ width: '100%', padding: '0.875rem 1.25rem', borderRadius: '0.75rem', border: '2px solid var(--border)' }} 
            />
          </div>

          {/* Componente de dirección con Google Maps */}
          <div>
            <GoogleAddressPicker
              onAddressSelect={handleAddressSelect}
              apiKey={GOOGLE_MAPS_CONFIG.apiKey}
              countryRestriction={GOOGLE_MAPS_CONFIG.countryRestriction}
            />
          </div>

          {/* Botón de envío */}
          <button 
            type="submit"
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={loading || !addressData}
          >
            {loading ? <Loader className="animate-spin" /> : '✓'}
            Guardar y Continuar
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompletarPerfilGoogle;


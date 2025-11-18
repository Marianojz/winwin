import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, FileText, Loader } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useStore } from '../store/useStore';
import MapPicker from '../components/MapPicker';

const CompletarPerfil = () => {
  const navigate = useNavigate();
  const { user, setUser } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    dni: '',
    address: '',
    locality: '',
    province: '',
    latitude: 0,
    longitude: 0,
    mapAddress: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      mapAddress: address
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!formData.dni.trim() || formData.dni.length < 7) {
      setError('DNI inválido');
      return;
    }

    if (!formData.address.trim() || !formData.locality.trim() || !formData.province) {
      setError('Completá todos los campos de dirección');
      return;
    }

    if (formData.latitude === 0 || formData.longitude === 0) {
      setError('Por favor, marcá tu ubicación en el mapa');
      return;
    }

    setLoading(true);

    try {
      if (!user) {
        setError('No hay usuario autenticado');
        setLoading(false);
        return;
      }

      // Actualizar Firestore
      await updateDoc(doc(db, 'users', user.id), {
        dni: formData.dni,
        address: formData.address,
        locality: formData.locality,
        province: formData.province,
        latitude: formData.latitude,
        longitude: formData.longitude,
        mapAddress: formData.mapAddress
      });

      // Actualizar el estado local
      const updatedUser = {
        ...user,
        dni: formData.dni,
        address: {
          street: formData.address,
          locality: formData.locality,
          province: formData.province,
          location: {
            lat: formData.latitude,
            lng: formData.longitude
          }
        }
      };

      // Firebase es la fuente de verdad - NO guardar en localStorage
      setUser(updatedUser);

      navigate('/');
    } catch (err) {
      console.error('Error al actualizar perfil:', err);
      setError('Error al guardar los datos. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', padding: '3rem 1rem', background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary))' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', background: 'var(--bg-primary)', borderRadius: '1.5rem', padding: '3rem', boxShadow: '0 20px 60px var(--shadow-lg)' }}>
        
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
              name="dni" 
              type="text" 
              placeholder="12345678" 
              value={formData.dni} 
              onChange={handleChange} 
              required 
              maxLength={8}
              style={{ width: '100%', padding: '0.875rem 1.25rem', borderRadius: '0.75rem' }} 
            />
          </div>

          {/* Dirección */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              <MapPin size={18} /> Dirección Completa
            </label>
            <input 
              name="address" 
              type="text" 
              placeholder="Av. Corrientes 1234" 
              value={formData.address} 
              onChange={handleChange} 
              required 
              style={{ width: '100%', padding: '0.875rem 1.25rem', borderRadius: '0.75rem', marginBottom: '0.5rem' }} 
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <input 
                name="locality" 
                type="text" 
                placeholder="Localidad" 
                value={formData.locality} 
                onChange={handleChange} 
                required 
                style={{ padding: '0.875rem 1.25rem', borderRadius: '0.75rem' }} 
              />
              <select 
                name="province" 
                value={formData.province} 
                onChange={handleChange} 
                required 
                style={{ 
                  padding: '0.875rem 1.25rem', 
                  borderRadius: '0.75rem',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '2px solid var(--border)'
                }}
              >
                <option value="">Provincia</option>
                <option value="Buenos Aires">Buenos Aires</option>
                <option value="CABA">CABA</option>
                <option value="Catamarca">Catamarca</option>
                <option value="Chaco">Chaco</option>
                <option value="Chubut">Chubut</option>
                <option value="Córdoba">Córdoba</option>
                <option value="Corrientes">Corrientes</option>
                <option value="Entre Ríos">Entre Ríos</option>
                <option value="Formosa">Formosa</option>
                <option value="Jujuy">Jujuy</option>
                <option value="La Pampa">La Pampa</option>
                <option value="La Rioja">La Rioja</option>
                <option value="Mendoza">Mendoza</option>
                <option value="Misiones">Misiones</option>
                <option value="Neuquén">Neuquén</option>
                <option value="Río Negro">Río Negro</option>
                <option value="Salta">Salta</option>
                <option value="San Juan">San Juan</option>
                <option value="San Luis">San Luis</option>
                <option value="Santa Cruz">Santa Cruz</option>
                <option value="Santa Fe">Santa Fe</option>
                <option value="Santiago del Estero">Santiago del Estero</option>
                <option value="Tierra del Fuego">Tierra del Fuego</option>
                <option value="Tucumán">Tucumán</option>
              </select>
            </div>
          </div>

          {/* Mapa */}
          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>📍 Ubicación de tu Domicilio</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Marcá en el mapa la ubicación exacta de tu domicilio para calcular costos de envío
            </p>
            
            <MapPicker 
              onLocationSelect={handleLocationSelect}
              initialPosition={[-34.6037, -58.3816]}
              locality={formData.locality}
              province={formData.province}
            />
          </div>

          {/* Botón de envío */}
          <button 
            type="submit"
            className="btn btn-primary" 
            style={{ width: '100%' }}
            disabled={loading || formData.latitude === 0}
          >
            {loading ? <Loader className="animate-spin" /> : '✓'}
            Guardar y Continuar
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompletarPerfil;

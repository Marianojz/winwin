import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, MapPin, FileText, Loader } from 'lucide-react';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import MapPicker from '../components/MapPicker';

const Registro = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    dni: '',
    address: '',
    locality: '',
    province: '',
    latitude: 0,
    longitude: 0,
    mapAddress: '',
    termsAccepted: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      mapAddress: address
    }));
  };

  const validateStep1 = () => {
    setError('');

    if (!formData.username.trim()) {
      setError('El nombre es obligatorio');
      return false;
    }

    if (!formData.dni.trim() || formData.dni.length < 7) {
      setError('DNI inválido');
      return false;
    }

    if (!formData.email.includes('@')) {
      setError('Email inválido');
      return false;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }

    if (!formData.address.trim() || !formData.locality.trim() || !formData.province) {
      setError('Completá todos los campos de dirección');
      return false;
    }

    if (!formData.termsAccepted) {
      setError('Debes aceptar los términos y condiciones');
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    if (formData.latitude === 0 || formData.longitude === 0) {
      setError('Por favor, marcá tu ubicación en el mapa');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    console.log('🔍 handleNextStep - Step actual:', step);
    console.log('🔍 Datos del formulario:', formData);
    
    if (step === 1) {
      const isValid = validateStep1();
      console.log('🔍 Validación paso 1:', isValid);
      
      if (isValid) {
        console.log('✅ Pasando al paso 2');
        setStep(2);
        setError('');
      } else {
        console.log('❌ Validación falló');
      }
    } else if (step === 2 && validateStep2()) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;

      await sendEmailVerification(user);

      await setDoc(doc(db, 'users', user.uid), {
        username: formData.username,
        email: formData.email,
        dni: formData.dni,
        address: formData.address,
        locality: formData.locality,
        province: formData.province,
        latitude: formData.latitude,
        longitude: formData.longitude,
        mapAddress: formData.mapAddress,
        createdAt: new Date().toISOString(),
        emailVerified: false,
        role: 'user',
        active: true
      });

      setSuccess('¡Cuenta creada exitosamente! Te enviamos un email de verificación.');
      setStep(3);

      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err: any) {
      console.error('Error en registro:', err);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('Este email ya está registrado');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email inválido');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña es muy débil');
      } else {
        setError('Error al crear la cuenta. Intentá nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', padding: '3rem 1rem', background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary))' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', background: 'var(--bg-primary)', borderRadius: '1.5rem', padding: '3rem', boxShadow: '0 20px 60px var(--shadow-lg)' }}>
        
        <h1 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Crear Cuenta</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          {step === 1 && 'Paso 1 de 2: Datos Personales'}
          {step === 2 && 'Paso 2 de 2: Ubicación de tu Domicilio'}
          {step === 3 && '¡Registro Completado!'}
        </p>

        <div style={{ marginBottom: '2rem', background: 'var(--bg-tertiary)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ 
            width: step === 1 ? '50%' : step === 2 ? '100%' : '100%',
            height: '100%',
            background: 'var(--primary)',
            transition: 'width 0.3s ease'
          }} />
        </div>

        {error && (
          <div style={{ background: 'var(--error)', color: 'white', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ background: 'var(--success)', color: 'white', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            {success}
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  <User size={18} /> Nombre Completo
                </label>
                <input 
                  name="username" 
                  type="text" 
                  placeholder="Juan Pérez" 
                  value={formData.username} 
                  onChange={handleChange} 
                  required 
                  style={{ width: '100%', padding: '0.875rem 1.25rem', borderRadius: '0.75rem' }} 
                />
              </div>
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
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                <Mail size={18} /> Email
              </label>
              <input 
                name="email" 
                type="email" 
                placeholder="tu@email.com" 
                value={formData.email} 
                onChange={handleChange} 
                required 
                style={{ width: '100%', padding: '0.875rem 1.25rem', borderRadius: '0.75rem' }} 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  <Lock size={18} /> Contraseña
                </label>
                <input 
                  name="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={formData.password} 
                  onChange={handleChange} 
                  required 
                  style={{ width: '100%', padding: '0.875rem 1.25rem', borderRadius: '0.75rem' }} 
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  <Lock size={18} /> Confirmar
                </label>
                <input 
                  name="confirmPassword" 
                  type="password" 
                  placeholder="••••••••" 
                  value={formData.confirmPassword} 
                  onChange={handleChange} 
                  required 
                  style={{ width: '100%', padding: '0.875rem 1.25rem', borderRadius: '0.75rem' }} 
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                <MapPin size={18} /> Dirección
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
                  style={{ padding: '0.875rem 1.25rem', borderRadius: '0.75rem' }}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
              <input 
                name="termsAccepted" 
                type="checkbox" 
                checked={formData.termsAccepted} 
                onChange={handleChange} 
                required 
                style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
              />
              <label style={{ margin: 0, fontSize: '0.9375rem', cursor: 'pointer' }}>
                Acepto los términos y condiciones y la política de privacidad
              </label>
            </div>

            <button 
              type="button"
              onClick={handleNextStep}
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={loading}
            >
              Continuar al Mapa
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>📍 Ubicación de tu Domicilio</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                Por favor, marcá en el mapa la ubicación exacta de tu domicilio. Esto nos ayuda a calcular costos de envío.
              </p>
            </div>

            <MapPicker 
              onLocationSelect={handleLocationSelect}
              initialPosition={[-34.6037, -58.3816]}
            />

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-secondary" 
                style={{ flex: 1 }}
                disabled={loading}
              >
                Volver
              </button>
              <button 
                type="button"
                onClick={handleNextStep}
                className="btn btn-primary" 
                style={{ flex: 1 }}
                disabled={loading || formData.latitude === 0}
              >
                {loading ? (
                  <>
                    <Loader size={20} className="spin" />
                    Creando cuenta...
                  </>
                ) : (
                  'Finalizar Registro'
                )}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ color: 'var(--success)', marginBottom: '1rem' }}>¡Registro Exitoso!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Te enviamos un email de verificación a <strong>{formData.email}</strong>
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Por favor, verificá tu email antes de iniciar sesión.
              <br />
              Serás redirigido al login en unos segundos...
            </p>
          </div>
        )}

        {step === 1 && (
          <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>¿Ya tenés cuenta? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Iniciá sesión</Link></p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Registro;

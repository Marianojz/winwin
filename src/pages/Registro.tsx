import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, MapPin, FileText, Loader, Phone, Eye, EyeOff, CheckCircle, X } from 'lucide-react';
import { createUserWithEmailAndPassword, sendEmailVerification, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import GoogleAddressPicker, { AddressData } from '../components/GoogleAddressPicker';
import { GOOGLE_MAPS_CONFIG } from '../config/googleMaps';
import EmailVerificationModal from '../components/EmailVerificationModal';

const Registro = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<FirebaseUser | null>(null);
  const [addressData, setAddressData] = useState<AddressData | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    dni: '',
    phone: '',
    address: '',
    locality: '',
    province: '',
    latitude: 0,
    longitude: 0,
    mapAddress: '',
    termsAccepted: false
  });

  // Estados de validación en tiempo real
  const [fieldValidation, setFieldValidation] = useState<{
    username: 'valid' | 'invalid' | 'neutral';
    dni: 'valid' | 'invalid' | 'neutral';
    phone: 'valid' | 'invalid' | 'neutral';
    email: 'valid' | 'invalid' | 'neutral';
    password: 'valid' | 'invalid' | 'neutral';
    confirmPassword: 'valid' | 'invalid' | 'neutral';
    address: 'valid' | 'invalid' | 'neutral';
  }>({
    username: 'neutral',
    dni: 'neutral',
    phone: 'neutral',
    email: 'neutral',
    password: 'neutral',
    confirmPassword: 'neutral',
    address: 'neutral'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  // Validación en tiempo real
  useEffect(() => {
    // Validar nombre
    if (formData.username.trim()) {
      setFieldValidation(prev => ({ ...prev, username: formData.username.trim().length >= 2 ? 'valid' : 'invalid' }));
    } else {
      setFieldValidation(prev => ({ ...prev, username: 'neutral' }));
    }

    // Validar DNI
    if (formData.dni.trim()) {
      setFieldValidation(prev => ({ ...prev, dni: formData.dni.length >= 7 && formData.dni.length <= 8 ? 'valid' : 'invalid' }));
    } else {
      setFieldValidation(prev => ({ ...prev, dni: 'neutral' }));
    }

    // Validar teléfono
    if (formData.phone.trim()) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      const digits = formData.phone.replace(/\D/g, '');
      setFieldValidation(prev => ({ 
        ...prev, 
        phone: phoneRegex.test(formData.phone) && digits.length >= 10 ? 'valid' : 'invalid' 
      }));
    } else {
      setFieldValidation(prev => ({ ...prev, phone: 'neutral' }));
    }

    // Validar email
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const emailParts = formData.email.split('@');
      const isValid = emailRegex.test(formData.email) && 
                      emailParts.length === 2 && 
                      emailParts[1].includes('.') && 
                      emailParts[1].split('.')[1]?.length >= 2;
      setFieldValidation(prev => ({ ...prev, email: isValid ? 'valid' : 'invalid' }));
    } else {
      setFieldValidation(prev => ({ ...prev, email: 'neutral' }));
    }

    // Validar contraseña
    if (formData.password) {
      setFieldValidation(prev => ({ ...prev, password: formData.password.length >= 6 ? 'valid' : 'invalid' }));
    } else {
      setFieldValidation(prev => ({ ...prev, password: 'neutral' }));
    }

    // Validar confirmación de contraseña
    if (formData.confirmPassword) {
      setFieldValidation(prev => ({ 
        ...prev, 
        confirmPassword: formData.password === formData.confirmPassword && formData.confirmPassword.length >= 6 ? 'valid' : 'invalid' 
      }));
    } else {
      setFieldValidation(prev => ({ ...prev, confirmPassword: 'neutral' }));
    }

    // Validar dirección
    if (addressData) {
      const hasRequired = addressData.components.street && addressData.components.streetNumber;
      const { lat, lng } = addressData.coordinates;
      const inRange = lat >= -55 && lat <= -21 && lng >= -73 && lng <= -53;
      setFieldValidation(prev => ({ ...prev, address: hasRequired && inRange ? 'valid' : 'invalid' }));
    } else {
      setFieldValidation(prev => ({ ...prev, address: 'neutral' }));
    }
  }, [formData, addressData]);

  const handleAddressSelect = (address: AddressData) => {
    setAddressData(address);
    setFormData(prev => ({
      ...prev,
      address: address.formatted,
      locality: address.components.locality || '',
      province: address.components.province || '',
      latitude: address.coordinates.lat,
      longitude: address.coordinates.lng,
      mapAddress: address.formatted
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

    if (!formData.phone.trim() || formData.phone.length < 10) {
      setError('Teléfono inválido (mínimo 10 dígitos)');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Email inválido');
      return false;
    }
    
    // Validar que el email tenga un dominio válido
    const emailParts = formData.email.split('@');
    if (emailParts.length !== 2 || !emailParts[1].includes('.') || emailParts[1].split('.')[1]?.length < 2) {
      setError('Email inválido: dominio no válido');
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

    if (!addressData || !addressData.components.street || !addressData.components.streetNumber) {
      setError('Por favor, seleccioná una dirección válida usando el buscador');
      return false;
    }
    
    // Validar coordenadas dentro de rangos geográficos permitidos (Argentina)
    const { lat, lng } = addressData.coordinates;
    if (lat < -55 || lat > -21 || lng < -73 || lng > -53) {
      setError('La dirección debe estar dentro de Argentina');
      return false;
    }

    if (!formData.termsAccepted) {
      setError('Debes aceptar los términos y condiciones');
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    if (!addressData || fieldValidation.address !== 'valid') {
      setError('Por favor, verificá que la dirección sea válida');
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

      // Preparar datos de dirección
      const addressComponents: {
        street?: string;
        streetNumber?: string;
        floor?: string;
        apartment?: string;
        crossStreets?: string;
        locality?: string;
        province?: string;
        postalCode?: string;
        country?: string;
      } = addressData?.components || {};
      const fullAddress = addressData?.formatted || formData.address;

      await setDoc(doc(db, 'users', user.uid), {
        username: formData.username,
        email: formData.email,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.username)}&size=200&background=FF6B00&color=fff&bold=true`,
        dni: formData.dni,
        phone: formData.phone,
        address: fullAddress,
        addressDetails: addressData ? {
          street: addressComponents.street || '',
          streetNumber: addressComponents.streetNumber || '',
          floor: addressComponents.floor || '',
          apartment: addressComponents.apartment || '',
          crossStreets: addressComponents.crossStreets || '',
          locality: addressComponents.locality || '',
          province: addressComponents.province || '',
          postalCode: addressComponents.postalCode || '',
          country: addressComponents.country || 'Argentina'
        } : undefined,
        locality: formData.locality || addressComponents.locality || '',
        province: formData.province || addressComponents.province || '',
        latitude: formData.latitude || addressData?.coordinates.lat || 0,
        longitude: formData.longitude || addressData?.coordinates.lng || 0,
        mapAddress: formData.mapAddress || fullAddress,
        placeId: addressData?.placeId,
        createdAt: new Date().toISOString(),
        emailVerified: false,
        role: 'user',
        isAdmin: false,
        active: true
      });

      // Enviar email de verificación
      try {
        await sendEmailVerification(user, {
          url: `${window.location.origin}/login?verified=true`,
          handleCodeInApp: false
        });
        
        // Mostrar modal de verificación
        setRegisteredUser(user);
        setShowVerificationModal(true);
        setSuccess('¡Cuenta creada exitosamente! Verificá tu email para activar tu cuenta.');
      } catch (verificationError: any) {
        console.error('Error enviando email de verificación:', verificationError);
        // Aún así mostrar el modal, el usuario puede reenviar
        setRegisteredUser(user);
        setShowVerificationModal(true);
        setError('Cuenta creada, pero hubo un problema al enviar el email. Podés reenviarlo desde el modal.');
      }

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
                <div style={{ position: 'relative' }}>
                  <input 
                    name="username" 
                    type="text" 
                    placeholder="Juan Pérez" 
                    value={formData.username} 
                    onChange={handleChange} 
                    required 
                    style={{ 
                      width: '100%', 
                      padding: '0.875rem 1.25rem', 
                      paddingRight: fieldValidation.username !== 'neutral' ? '2.75rem' : '1.25rem',
                      borderRadius: '0.75rem',
                      border: `2px solid ${fieldValidation.username === 'valid' ? 'var(--success)' : fieldValidation.username === 'invalid' ? 'var(--error)' : 'var(--border)'}`
                    }} 
                  />
                  {fieldValidation.username === 'valid' && (
                    <CheckCircle size={18} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--success)' }} />
                  )}
                  {fieldValidation.username === 'invalid' && formData.username.trim() && (
                    <X size={18} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--error)' }} />
                  )}
                </div>
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  <FileText size={18} /> DNI
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    name="dni" 
                    type="text" 
                    placeholder="12345678" 
                    value={formData.dni} 
                    onChange={handleChange} 
                    required 
                    maxLength={8}
                    style={{ 
                      width: '100%', 
                      padding: '0.875rem 1.25rem',
                      paddingRight: fieldValidation.dni !== 'neutral' ? '2.75rem' : '1.25rem',
                      borderRadius: '0.75rem',
                      border: `2px solid ${fieldValidation.dni === 'valid' ? 'var(--success)' : fieldValidation.dni === 'invalid' ? 'var(--error)' : 'var(--border)'}`
                    }} 
                  />
                  {fieldValidation.dni === 'valid' && (
                    <CheckCircle size={18} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--success)' }} />
                  )}
                  {fieldValidation.dni === 'invalid' && formData.dni.trim() && (
                    <X size={18} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--error)' }} />
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  <Mail size={18} /> Email
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    name="email" 
                    type="email" 
                    placeholder="tu@email.com" 
                    value={formData.email} 
                    onChange={handleChange} 
                    required 
                    style={{ 
                      width: '100%', 
                      padding: '0.875rem 1.25rem',
                      paddingRight: fieldValidation.email !== 'neutral' ? '2.75rem' : '1.25rem',
                      borderRadius: '0.75rem',
                      border: `2px solid ${fieldValidation.email === 'valid' ? 'var(--success)' : fieldValidation.email === 'invalid' ? 'var(--error)' : 'var(--border)'}`
                    }} 
                  />
                  {fieldValidation.email === 'valid' && (
                    <CheckCircle size={18} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--success)' }} />
                  )}
                  {fieldValidation.email === 'invalid' && formData.email.trim() && (
                    <X size={18} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--error)' }} />
                  )}
                </div>
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  <Phone size={18} /> Teléfono *
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    name="phone" 
                    type="tel" 
                    placeholder="11 1234-5678" 
                    value={formData.phone} 
                    onChange={handleChange} 
                    required 
                    style={{ 
                      width: '100%', 
                      padding: '0.875rem 1.25rem',
                      paddingRight: fieldValidation.phone !== 'neutral' ? '2.75rem' : '1.25rem',
                      borderRadius: '0.75rem',
                      border: `2px solid ${fieldValidation.phone === 'valid' ? 'var(--success)' : fieldValidation.phone === 'invalid' ? 'var(--error)' : 'var(--border)'}`
                    }} 
                  />
                  {fieldValidation.phone === 'valid' && (
                    <CheckCircle size={18} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--success)' }} />
                  )}
                  {fieldValidation.phone === 'invalid' && formData.phone.trim() && (
                    <X size={18} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--error)' }} />
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  <Lock size={18} /> Contraseña
                </label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input 
                    name="password" 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    value={formData.password} 
                    onChange={handleChange} 
                    required 
                    style={{ 
                      width: '100%', 
                      padding: '0.875rem 3.5rem 0.875rem 1.25rem', 
                      borderRadius: '0.75rem',
                      border: `2px solid ${fieldValidation.password === 'valid' ? 'var(--success)' : fieldValidation.password === 'invalid' ? 'var(--error)' : 'var(--border)'}`
                    }} 
                  />
                  <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {fieldValidation.password === 'valid' && (
                      <CheckCircle size={18} style={{ color: 'var(--success)' }} />
                    )}
                    {fieldValidation.password === 'invalid' && formData.password && (
                      <X size={18} style={{ color: 'var(--error)' }} />
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-secondary)'
                      }}
                      title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  <Lock size={18} /> Confirmar
                </label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input 
                    name="confirmPassword" 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    value={formData.confirmPassword} 
                    onChange={handleChange} 
                    required 
                    style={{ 
                      width: '100%', 
                      padding: '0.875rem 3.5rem 0.875rem 1.25rem', 
                      borderRadius: '0.75rem',
                      border: `2px solid ${fieldValidation.confirmPassword === 'valid' ? 'var(--success)' : fieldValidation.confirmPassword === 'invalid' ? 'var(--error)' : 'var(--border)'}`
                    }} 
                  />
                  <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {fieldValidation.confirmPassword === 'valid' && (
                      <CheckCircle size={18} style={{ color: 'var(--success)' }} />
                    )}
                    {fieldValidation.confirmPassword === 'invalid' && formData.confirmPassword && (
                      <X size={18} style={{ color: 'var(--error)' }} />
                    )}
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-secondary)'
                      }}
                      title={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                <MapPin size={18} /> Dirección
              </label>
              <GoogleAddressPicker
                onAddressSelect={handleAddressSelect}
                apiKey={GOOGLE_MAPS_CONFIG.apiKey}
                countryRestriction={GOOGLE_MAPS_CONFIG.countryRestriction}
                className="address-picker-desktop"
                showAddressFields={false}
                showMap={false}
              />
              {addressData && (
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '1rem', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '0.75rem',
                  border: `2px solid ${fieldValidation.address === 'valid' ? 'var(--success)' : 'var(--border)'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <strong>Dirección seleccionada:</strong>
                    {fieldValidation.address === 'valid' && <CheckCircle size={18} style={{ color: 'var(--success)' }} />}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {addressData.formatted}
                  </div>
                  {addressData.components.province && (
                    <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem', textAlign: 'center' }}>
                      <strong>Provincia:</strong> {addressData.components.province}
                    </div>
                  )}
                </div>
              )}
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
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>📍 Verificar Ubicación en el Mapa</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                Verificá que la ubicación en el mapa sea correcta. Podés arrastrar el marcador para ajustarla.
              </p>
            </div>

            {addressData && (
              <GoogleAddressPicker
                onAddressSelect={handleAddressSelect}
                initialAddress={addressData}
                apiKey={GOOGLE_MAPS_CONFIG.apiKey}
                countryRestriction={GOOGLE_MAPS_CONFIG.countryRestriction}
                className="address-picker-desktop"
                showAddressFields={false}
                showMap={true}
              />
            )}

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
                disabled={loading || !addressData || fieldValidation.address !== 'valid'}
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
            </p>
          </div>
        )}

        {/* Modal de Verificación de Email */}
        <EmailVerificationModal
          isOpen={showVerificationModal}
          onClose={() => {
            setShowVerificationModal(false);
            navigate('/login');
          }}
          user={registeredUser}
          userEmail={formData.email}
          platformName="Clikio"
        />

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

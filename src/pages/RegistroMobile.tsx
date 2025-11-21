import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Phone, Eye, EyeOff, Loader, CheckCircle, AlertCircle, X } from 'lucide-react';
import { createUserWithEmailAndPassword, sendEmailVerification, User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, syncUserToRealtimeDb } from '../config/firebase';
import GoogleAddressPicker, { AddressData } from '../components/GoogleAddressPicker';
import { GOOGLE_MAPS_CONFIG } from '../config/googleMaps';
import EmailVerificationModal from '../components/EmailVerificationModal';
import { PASSWORD_INPUT_ATTRIBUTES, EMAIL_INPUT_ATTRIBUTES, PHONE_INPUT_ATTRIBUTES, NAME_INPUT_ATTRIBUTES } from '../utils/passwordManagerOptimization';
import { useStore } from '../store/useStore';
import { processGoogleAuthResult } from '../utils/googleAuthHelper';
import { toast } from '../utils/toast';
import './RegistroMobile.css';

const RegistroMobile = () => {
  const navigate = useNavigate();
  const { setUser } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<FirebaseUser | null>(null);
  const [hasGoogleAuth, setHasGoogleAuth] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false
  });

  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const [addressFields, setAddressFields] = useState({
    street: '',
    number: '',
    floor: '',
    apartment: '',
    crossStreets: ''
  });

  // Estados de validación en tiempo real
  const [fieldValidation, setFieldValidation] = useState<{
    name: 'valid' | 'invalid' | 'neutral';
    phone: 'valid' | 'invalid' | 'neutral';
    email: 'valid' | 'invalid' | 'neutral';
    password: 'valid' | 'invalid' | 'neutral';
    confirmPassword: 'valid' | 'invalid' | 'neutral';
    address: 'valid' | 'invalid' | 'neutral';
  }>({
    name: 'neutral',
    phone: 'neutral',
    email: 'neutral',
    password: 'neutral',
    confirmPassword: 'neutral',
    address: 'neutral'
  });

  // Validación en tiempo real
  useEffect(() => {
    // Validar nombre
    if (formData.name.trim()) {
      setFieldValidation(prev => ({ ...prev, name: formData.name.trim().length >= 2 ? 'valid' : 'invalid' }));
    } else {
      setFieldValidation(prev => ({ ...prev, name: 'neutral' }));
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

  // Detectar si el usuario se autenticó con Google mientras completaba el formulario
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Solo actuar si hay un usuario autenticado y es con Google
      if (firebaseUser && !hasGoogleAuth) {
        const isGoogleAuth = firebaseUser.providerData?.some(
          (provider: any) => provider.providerId === 'google.com'
        );

        if (isGoogleAuth) {
          setHasGoogleAuth(true);
          
          // Verificar si el usuario ya existe en Firestore
          try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            
            if (userDoc.exists()) {
              // Usuario ya existe, procesar y redirigir
              const { fullUser, needsCompleteProfile } = await processGoogleAuthResult(firebaseUser);
              setUser(fullUser);
              
              toast.success('¡Ya tenés una cuenta con Google! Redirigiendo...', 3000);
              
              // Esperar un momento antes de redirigir
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              if (needsCompleteProfile) {
                navigate('/completar-perfil', { replace: true });
              } else if (fullUser.isAdmin) {
                navigate('/admin', { replace: true });
              } else {
                navigate('/', { replace: true });
              }
            } else {
              // Usuario nuevo con Google, redirigir a completar perfil
              toast.info('¡Cuenta creada con Google! Completá tu perfil para continuar.', 4000);
              
              await new Promise(resolve => setTimeout(resolve, 1000));
              navigate('/completar-perfil', { replace: true });
            }
          } catch (error: any) {
            console.error('Error procesando autenticación Google:', error);
            toast.error('Error al procesar tu cuenta de Google', 5000);
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [hasGoogleAuth, navigate, setUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));

    // Scroll suave al siguiente campo en mobile
    if (type !== 'checkbox') {
      setTimeout(() => {
        const nextInput = e.target.closest('.form-group')?.nextElementSibling?.querySelector('input');
        if (nextInput && window.innerWidth <= 768) {
          nextInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const handleAddressSelect = (address: AddressData) => {
    setAddressData(address);
  };

  const validateForm = () => {
    setError('');

    // Validación personalizada optimizada para password managers
    // Evita triggers innecesarios que puedan confundir a los gestores de contraseñas
    
    if (!formData.name.trim()) {
      setError('El nombre completo es obligatorio');
      return false;
    }

    // Validación de teléfono sin triggers agresivos
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!formData.phone.trim() || !phoneRegex.test(formData.phone) || formData.phone.replace(/\D/g, '').length < 10) {
      setError('Teléfono inválido (mínimo 10 dígitos)');
      return false;
    }

    // Validación de email estándar con verificación de dominio
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Email inválido');
      return false;
    }
    
    // Validar que el email tenga un dominio válido (al menos 2 caracteres después del punto)
    const emailParts = formData.email.split('@');
    if (emailParts.length !== 2 || !emailParts[1].includes('.') || emailParts[1].split('.')[1]?.length < 2) {
      setError('Email inválido: dominio no válido');
      return false;
    }

    // Validación de contraseña - evita advertencias innecesarias
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }

    // Validación de coincidencia de contraseñas
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }

    // Validación de dirección - debe ser válida y existente
    if (!addressData) {
      setError('Por favor, seleccioná una dirección válida');
      return false;
    }
    
    // Validar que tenga calle y número mínimo
    if (!addressData.components.street || !addressData.components.streetNumber) {
      setError('Por favor, completá al menos la calle y el número');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validación antes de enviar - optimizada para password managers
    if (!validateForm()) {
      // Prevenir envío si hay errores, pero sin triggers agresivos
      e.stopPropagation();
      return;
    }

    setLoading(true);

    try {
      // Verificar si el usuario ya está autenticado con Google antes de crear cuenta manual
      const currentUser = auth.currentUser;
      if (currentUser) {
        const isGoogleAuth = currentUser.providerData?.some(
          (provider: any) => provider.providerId === 'google.com'
        );
        
        if (isGoogleAuth) {
          setError('Ya tenés una cuenta creada con Google. Por favor, iniciá sesión con Google o cerrá sesión primero.');
          setLoading(false);
          return;
        }
      }

      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;

      // Preparar datos de dirección
      const addressComponents = addressData.components;
      const fullAddress = [
        addressComponents.street,
        addressComponents.streetNumber,
        addressComponents.floor && `Piso ${addressComponents.floor}`,
        addressComponents.apartment && `Depto ${addressComponents.apartment}`,
        addressComponents.crossStreets && `Entre ${addressComponents.crossStreets}`
      ].filter(Boolean).join(', ');

      const avatarUrl =
        user.photoURL ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'Usuario')}&size=200&background=FF6B00&color=fff&bold=true`;

      // Guardar datos en Firestore (alineado con Registro web)
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        username: formData.name,
        email: formData.email,
        avatar: avatarUrl,
        dni: '', // En mobile no se pide DNI; queda listo para completarse luego
        phone: formData.phone,
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
        placeId: addressData.placeId,
        createdAt: new Date().toISOString(),
        emailVerified: false,
        role: 'user',
        isAdmin: false,
        active: true
      });

      // Sincronizar usuario a Realtime Database para que las reglas funcionen igual que en web
      await syncUserToRealtimeDb(
        user.uid,
        false,
        formData.email,
        formData.name,
        avatarUrl
      );

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
      console.error('Error al registrar:', err);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('Este email ya está registrado');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña es muy débil');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email inválido');
      } else {
        setError('Error al crear la cuenta. Intentá nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="form-section">
        <div className="form-header">
          <h1>Crear Cuenta</h1>
          <p>Completá tus datos para comenzar</p>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <CheckCircle size={18} />
            {success}
          </div>
        )}

        <form 
          id="register-form"
          name="register-form"
          onSubmit={handleSubmit} 
          className="register-form"
          autoComplete="on"
          data-password-manager-friendly="true"
        >
          {/* Información Personal */}
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              <User size={18} />
              Nombre completo *
            </label>
            <div className="input-wrapper">
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Nombre completo"
                value={formData.name}
                onChange={handleChange}
                required
                className={`form-input ${fieldValidation.name === 'valid' ? 'input-valid' : fieldValidation.name === 'invalid' ? 'input-invalid' : ''}`}
                {...NAME_INPUT_ATTRIBUTES}
              />
              {fieldValidation.name === 'valid' && <CheckCircle className="validation-icon icon-valid" size={18} />}
              {fieldValidation.name === 'invalid' && formData.name.trim() && <X className="validation-icon icon-invalid" size={18} />}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="form-label">
              <Phone size={18} />
              Teléfono *
            </label>
            <div className="input-wrapper">
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="11 5610 1104"
                value={formData.phone}
                onChange={handleChange}
                required
                className={`form-input ${fieldValidation.phone === 'valid' ? 'input-valid' : fieldValidation.phone === 'invalid' ? 'input-invalid' : ''}`}
                {...PHONE_INPUT_ATTRIBUTES}
              />
              {fieldValidation.phone === 'valid' && <CheckCircle className="validation-icon icon-valid" size={18} />}
              {fieldValidation.phone === 'invalid' && formData.phone.trim() && <X className="validation-icon icon-invalid" size={18} />}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              <Mail size={18} />
              Email *
            </label>
            <div className="input-wrapper">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                className={`form-input ${fieldValidation.email === 'valid' ? 'input-valid' : fieldValidation.email === 'invalid' ? 'input-invalid' : ''}`}
                {...EMAIL_INPUT_ATTRIBUTES}
              />
              {fieldValidation.email === 'valid' && <CheckCircle className="validation-icon icon-valid" size={18} />}
              {fieldValidation.email === 'invalid' && formData.email.trim() && <X className="validation-icon icon-invalid" size={18} />}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              <Lock size={18} />
              Contraseña *
            </label>
            <div className="password-input-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className={`form-input ${fieldValidation.password === 'valid' ? 'input-valid' : fieldValidation.password === 'invalid' ? 'input-invalid' : ''}`}
                {...PASSWORD_INPUT_ATTRIBUTES.newPassword}
              />
              <div className="password-input-icons">
                {fieldValidation.password === 'valid' && <CheckCircle className="validation-icon icon-valid" size={18} />}
                {fieldValidation.password === 'invalid' && formData.password && <X className="validation-icon icon-invalid" size={18} />}
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              <Lock size={18} />
              Confirmar contraseña *
            </label>
            <div className="password-input-wrapper">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Repetí tu contraseña"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength={6}
                className={`form-input ${fieldValidation.confirmPassword === 'valid' ? 'input-valid' : fieldValidation.confirmPassword === 'invalid' ? 'input-invalid' : ''}`}
                {...PASSWORD_INPUT_ATTRIBUTES.confirmPassword}
              />
              <div className="password-input-icons">
                {fieldValidation.confirmPassword === 'valid' && <CheckCircle className="validation-icon icon-valid" size={18} />}
                {fieldValidation.confirmPassword === 'invalid' && formData.confirmPassword && <X className="validation-icon icon-invalid" size={18} />}
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Dirección Inteligente - Mobile-First Optimizado */}
          <div className="address-section">
            <h2 className="section-title">Dirección de Envío</h2>
            <p className="section-description">
              Buscá tu dirección o completá los campos manualmente
            </p>
            
            {/* Buscador de direcciones con Google Maps */}
            <GoogleAddressPicker
              onAddressSelect={(address) => {
                handleAddressSelect(address);
                // Sincronizar campos manuales con la dirección seleccionada
                setAddressFields({
                  street: address.components.street || '',
                  number: address.components.streetNumber || '',
                  floor: address.components.floor || '',
                  apartment: address.components.apartment || '',
                  crossStreets: address.components.crossStreets || ''
                });
              }}
              apiKey={GOOGLE_MAPS_CONFIG.apiKey}
              countryRestriction={GOOGLE_MAPS_CONFIG.countryRestriction}
              className="address-picker-mobile"
              mapContainerId="address-map"
              showAddressFields={false}
              showMap={true}
            />
            
            {/* Campos principales de dirección - Primera línea */}
            <div style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
                Completá tu dirección
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Si buscaste una dirección arriba, estos campos se completaron automáticamente. Podés editarlos si es necesario.
              </p>
            </div>
            <div className="address-main-fields">
              <div className="address-field-primary">
                <label htmlFor="street" className="address-label">Calle *</label>
                <input
                  id="street"
                  type="text"
                  autoComplete="address-line1"
                  placeholder="Av. Corrientes"
                  value={addressFields.street}
                  onChange={(e) => {
                    setAddressFields(prev => ({ ...prev, street: e.target.value }));
                    if (addressData) {
                      const updated = {
                        ...addressData,
                        components: { ...addressData.components, street: e.target.value }
                      };
                      setAddressData(updated);
                      handleAddressSelect(updated);
                    }
                  }}
                  className="address-input address-input-primary"
                  required
                />
              </div>
              <div className="address-field-primary">
                <label htmlFor="number" className="address-label">Número *</label>
                <input
                  id="number"
                  type="text"
                  autoComplete="address-line2"
                  placeholder="1234"
                  value={addressFields.number}
                  onChange={(e) => {
                    setAddressFields(prev => ({ ...prev, number: e.target.value }));
                    if (addressData) {
                      const updated = {
                        ...addressData,
                        components: { ...addressData.components, streetNumber: e.target.value }
                      };
                      setAddressData(updated);
                      handleAddressSelect(updated);
                    }
                  }}
                  className="address-input address-input-primary"
                  required
                />
              </div>
            </div>
            
            {/* Información adicional opcional - Recuadro aparte */}
            <details className="address-additional-info">
              <summary className="address-additional-summary">
                <span>Información adicional (opcional)</span>
              </summary>
              <div className="address-additional-fields">
                <div className="address-field-secondary">
                  <label htmlFor="floor" className="address-label">Piso</label>
                  <input
                    id="floor"
                    type="text"
                    placeholder="Ej: 4"
                    value={addressFields.floor}
                    onChange={(e) => {
                      setAddressFields(prev => ({ ...prev, floor: e.target.value }));
                      if (addressData) {
                        const updated = {
                          ...addressData,
                          components: { ...addressData.components, floor: e.target.value }
                        };
                        setAddressData(updated);
                        handleAddressSelect(updated);
                      }
                    }}
                    className="address-input address-input-secondary"
                  />
                </div>
                <div className="address-field-secondary">
                  <label htmlFor="apartment" className="address-label">Departamento</label>
                  <input
                    id="apartment"
                    type="text"
                    placeholder="Ej: A, B, 1, 2"
                    value={addressFields.apartment}
                    onChange={(e) => {
                      setAddressFields(prev => ({ ...prev, apartment: e.target.value }));
                      if (addressData) {
                        const updated = {
                          ...addressData,
                          components: { ...addressData.components, apartment: e.target.value }
                        };
                        setAddressData(updated);
                        handleAddressSelect(updated);
                      }
                    }}
                    className="address-input address-input-secondary"
                  />
                </div>
                <div className="address-field-secondary address-field-full">
                  <label htmlFor="crossStreets" className="address-label">Entre calles</label>
                  <input
                    id="crossStreets"
                    type="text"
                    placeholder="Ej: Entre Av. Corrientes y Av. Córdoba"
                    value={addressFields.crossStreets}
                    onChange={(e) => {
                      setAddressFields(prev => ({ ...prev, crossStreets: e.target.value }));
                      if (addressData) {
                        const updated = {
                          ...addressData,
                          components: { ...addressData.components, crossStreets: e.target.value }
                        };
                        setAddressData(updated);
                        handleAddressSelect(updated);
                      }
                    }}
                    className="address-input address-input-secondary"
                  />
                </div>
              </div>
            </details>
            
            {/* Provincia siempre visible y centrada */}
            {addressData && (
              <div className="address-province-display">
                <label className="address-label">Provincia</label>
                <div className="province-value">
                  {addressData.components.province || 'No especificada'}
                </div>
              </div>
            )}
            
            {/* Mapa en tiempo real - se renderiza dentro de GoogleAddressPicker */}
            <div id="address-map" className="interactive-map-container">
              {/* El mapa se renderiza automáticamente por GoogleAddressPicker */}
            </div>
          </div>

          {/* Términos y condiciones */}
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                name="termsAccepted"
                type="checkbox"
                checked={formData.termsAccepted}
                onChange={handleChange}
                required
                className="checkbox-input"
              />
              <span>
                Acepto los <Link to="/terminos" target="_blank">términos y condiciones</Link>
              </span>
            </label>
          </div>

          {/* Botón de envío */}
          <button
            type="submit"
            className="btn btn-primary btn-submit"
            disabled={loading || !addressData}
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={18} />
                Creando cuenta...
              </>
            ) : (
              'Crear Cuenta'
            )}
          </button>

          <div className="form-footer">
            <p>
              ¿Ya tenés cuenta? <Link to="/login">Iniciar sesión</Link>
            </p>
          </div>
        </form>
      </div>

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
    </div>
  );
};

export default RegistroMobile;


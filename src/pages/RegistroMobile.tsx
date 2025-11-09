import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Phone, Eye, EyeOff, Loader, CheckCircle } from 'lucide-react';
import { createUserWithEmailAndPassword, sendEmailVerification, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import GoogleAddressPicker, { AddressData } from '../components/GoogleAddressPicker';
import { GOOGLE_MAPS_CONFIG } from '../config/googleMaps';
import EmailVerificationModal from '../components/EmailVerificationModal';
import { PASSWORD_INPUT_ATTRIBUTES, EMAIL_INPUT_ATTRIBUTES, PHONE_INPUT_ATTRIBUTES, NAME_INPUT_ATTRIBUTES } from '../utils/passwordManagerOptimization';
import './RegistroMobile.css';

const RegistroMobile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<FirebaseUser | null>(null);

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

    // Validación de email estándar
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Email inválido');
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

    if (!addressData) {
      setError('Por favor, seleccioná una dirección válida');
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

      // Guardar datos en Firestore
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        email: formData.email,
        username: formData.name,
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
        isAdmin: false,
        emailVerified: false
      });

      // Enviar email de verificación
      await sendEmailVerification(user, {
        url: `${window.location.origin}/login?verified=true`,
        handleCodeInApp: false
      });

      // Mostrar modal de verificación
      setRegisteredUser(user);
      setShowVerificationModal(true);

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
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Nombre completo"
              value={formData.name}
              onChange={handleChange}
              required
              className="form-input"
              {...NAME_INPUT_ATTRIBUTES}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="form-label">
              <Phone size={18} />
              Teléfono *
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="11 1234-5678"
              value={formData.phone}
              onChange={handleChange}
              required
              className="form-input"
              {...PHONE_INPUT_ATTRIBUTES}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              <Mail size={18} />
              Email *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={handleChange}
              required
              className="form-input"
              {...EMAIL_INPUT_ATTRIBUTES}
            />
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
                className="form-input"
                {...PASSWORD_INPUT_ATTRIBUTES.newPassword}
              />
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
                className="form-input"
                {...PASSWORD_INPUT_ATTRIBUTES.confirmPassword}
              />
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

          {/* Dirección Inteligente */}
          <div className="address-section">
            <h2 className="section-title">Dirección de Envío</h2>
            <p className="section-description">
              Buscá tu dirección y completá los detalles
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
            
            {/* Campos de dirección integrados - estructura mobile-first */}
            <div className="address-group">
              <input
                type="text"
                autoComplete="address-line1"
                placeholder="Calle"
                value={addressFields.street}
                onChange={(e) => {
                  setAddressFields(prev => ({ ...prev, street: e.target.value }));
                  // Actualizar addressData si existe
                  if (addressData) {
                    const updated = {
                      ...addressData,
                      components: { ...addressData.components, street: e.target.value }
                    };
                    setAddressData(updated);
                    handleAddressSelect(updated);
                  }
                }}
                className="address-input"
              />
              <input
                type="text"
                autoComplete="address-line2"
                placeholder="Número"
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
                className="address-input"
              />
              <input
                type="text"
                placeholder="Piso (opcional)"
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
                className="address-input"
              />
              <input
                type="text"
                placeholder="Departamento (opcional)"
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
                className="address-input"
              />
              <input
                type="text"
                placeholder="Entre calles (opcional)"
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
                className="address-input"
              />
            </div>
            
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


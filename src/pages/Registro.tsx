import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, MapPin, FileText } from 'lucide-react';

const Registro = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    dni: '',
    address: '',
    locality: '',
    province: '',
    termsAccepted: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password === formData.confirmPassword && formData.termsAccepted) {
      navigate('/login');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', padding: '3rem 1rem', background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary))' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', background: 'var(--bg-primary)', borderRadius: '1.5rem', padding: '3rem', boxShadow: '0 20px 60px var(--shadow-lg)' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Crear Cuenta</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2rem' }}>Únete a Subasta Argenta</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                <User size={18} /> Nombre
              </label>
              <input name="username" type="text" placeholder="Juan Pérez" value={formData.username} onChange={handleChange} required style={{ width: '100%', padding: '0.875rem 1.25rem', borderRadius: '0.75rem' }} />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                <FileText size={18} /> DNI
              </label>
              <input name="dni" type="text" placeholder="12345678" value={formData.dni} onChange={handleChange} required style={{ width: '100%', padding: '0.875rem 1.25rem', borderRadius: '0.75rem' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              <Mail size={18} /> Email
            </label>
            <input name="email" type="email" placeholder="tu@email.com" value={formData.email} onChange={handleChange} required style={{ width: '100%', padding: '0.875rem 1.25rem', borderRadius: '0.75rem' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                <Lock size={18} /> Contraseña
              </label>
              <input name="password" type="password" placeholder="••••••••" value={formData.password} onChange={handleChange} required style={{ width: '100%', padding: '0.875rem 1.25rem', borderRadius: '0.75rem' }} />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                <Lock size={18} /> Confirmar
              </label>
              <input name="confirmPassword" type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required style={{ width: '100%', padding: '0.875rem 1.25rem', borderRadius: '0.75rem' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              <MapPin size={18} /> Dirección
            </label>
            <input name="address" type="text" placeholder="Av. Corrientes 1234" value={formData.address} onChange={handleChange} required style={{ width: '100%', padding: '0.875rem 1.25rem', borderRadius: '0.75rem', marginBottom: '0.5rem' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <input name="locality" type="text" placeholder="Localidad" value={formData.locality} onChange={handleChange} required style={{ padding: '0.875rem 1.25rem', borderRadius: '0.75rem' }} />
              <select name="province" value={formData.province} onChange={handleChange} required style={{ padding: '0.875rem 1.25rem', borderRadius: '0.75rem' }}>
                <option value="">Provincia</option>
                <option value="Buenos Aires">Buenos Aires</option>
                <option value="CABA">CABA</option>
                <option value="Córdoba">Córdoba</option>
                <option value="Santa Fe">Santa Fe</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
            <input name="termsAccepted" type="checkbox" checked={formData.termsAccepted} onChange={handleChange} required style={{ width: '20px', height: '20px' }} />
            <label style={{ margin: 0, fontSize: '0.9375rem' }}>Acepto los términos y condiciones</label>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
            Crear Cuenta
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p>¿Ya tenés cuenta? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Iniciá sesión</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Registro;

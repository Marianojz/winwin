import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { createContactMessage } from '../utils/tickets';
import { useStore } from '../store/useStore';

const Contacto = () => {
  const { user } = useStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    subject: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validaciones
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.message.trim()) {
      setError('Por favor, completá todos los campos obligatorios.');
      setLoading(false);
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Por favor, ingresá un email válido.');
      setLoading(false);
      return;
    }

    // Validar teléfono (mínimo 8 caracteres)
    if (formData.phone.trim().length < 8) {
      setError('Por favor, ingresá un teléfono válido.');
      setLoading(false);
      return;
    }

    try {
      await createContactMessage({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        subject: formData.subject.trim() || 'Consulta desde formulario de contacto',
        message: formData.message.trim()
      });

      setSuccess('✅ Mensaje enviado exitosamente. Te responderemos pronto.');
      setFormData({
        name: user?.username || '',
        email: user?.email || '',
        phone: user?.phone || '',
        subject: '',
        message: ''
      });
    } catch (err: any) {
      console.error('Error enviando mensaje:', err);
      setError('Error al enviar el mensaje. Por favor, intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '2rem 0' }}>
      <div className="container" style={{ maxWidth: '1000px' }}>
        {/* Encabezado */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '3rem',
          background: 'var(--bg-secondary)',
          padding: '2rem',
          borderRadius: '1rem'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginBottom: '1rem',
            color: 'var(--primary)' 
          }}>
            <Mail size={48} />
          </div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            Contactanos
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
            Enviá un mensaje y nuestro equipo te responderá a la brevedad
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
          {/* Información de contacto */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '2rem',
            borderRadius: '1rem'
          }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Información de Contacto</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <Mail size={24} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '0.25rem' }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Email</strong>
                  <a href="mailto:soporte@clikio.com" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                    soporte@clikio.com
                  </a>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <Phone size={24} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '0.25rem' }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Teléfono</strong>
                  <a href="tel:+541112345678" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                    +54 11 1234-5678
                  </a>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <MapPin size={24} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '0.25rem' }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Dirección</strong>
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                    Buenos Aires, Argentina
                  </p>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              background: 'var(--bg-tertiary)',
              borderRadius: '0.75rem'
            }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Horario de Atención</strong>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9375rem' }}>
                Lunes a Viernes: 9:00 - 18:00<br />
                Sábados: 10:00 - 14:00<br />
                Domingos: Cerrado
              </p>
            </div>
          </div>

          {/* Formulario */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '2rem',
            borderRadius: '1rem'
          }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Enviar Mensaje</h2>

            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{
                  background: '#FEE2E2',
                  color: '#DC2626',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <AlertCircle size={20} />
                  {error}
                </div>
              )}

              {success && (
                <div style={{
                  background: '#D1FAE5',
                  color: '#059669',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <CheckCircle size={20} />
                  {success}
                </div>
              )}

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Nombre completo <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--bg-tertiary)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Email <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--bg-tertiary)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Teléfono <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+54 9 11 1234-5678"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--bg-tertiary)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Asunto
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Ej: Consulta sobre productos"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--bg-tertiary)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Mensaje <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Escribí tu mensaje aquí..."
                  required
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--bg-tertiary)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? (
                  <>⏳ Enviando...</>
                ) : (
                  <>
                    <Send size={18} />
                    Enviar Mensaje
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contacto;


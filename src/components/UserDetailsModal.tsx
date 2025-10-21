import { useState } from 'react';
import { X, Mail, FileText, MapPin, Calendar, Shield, Ban, Trash2, Key, Edit2, Save } from 'lucide-react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';

interface UserData {
  id: string;
  username: string;
  email: string;
  avatar: string;
  dni: string;
  address: string;
  locality: string;
  province: string;
  latitude: number;
  longitude: number;
  mapAddress?: string;
  createdAt: string;
  role: string;
  active: boolean;
}

interface UserDetailsModalProps {
  user: UserData;
  onClose: () => void;
  onUpdate: () => void;
}

const UserDetailsModal = ({ user, onClose, onUpdate }: UserDetailsModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editedUser, setEditedUser] = useState({
    username: user.username,
    dni: user.dni,
    address: user.address,
    locality: user.locality,
    province: user.province
  });

  // Función para guardar cambios
  const handleSave = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        username: editedUser.username,
        dni: editedUser.dni,
        address: editedUser.address,
        locality: editedUser.locality,
        province: editedUser.province
      });
      alert('✅ Usuario actualizado correctamente');
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      alert('❌ Error al actualizar usuario');
    } finally {
      setLoading(false);
    }
  };

  // Función para suspender/activar usuario
  const handleToggleStatus = async () => {
    const newStatus = !user.active;
    const confirmMessage = newStatus 
      ? `¿Activar el usuario ${user.username}?`
      : `¿Suspender el usuario ${user.username}?\n\nEl usuario no podrá acceder a su cuenta.`;
    
    if (window.confirm(confirmMessage)) {
      setLoading(true);
      try {
        await updateDoc(doc(db, 'users', user.id), {
          active: newStatus
        });
        alert(newStatus ? '✅ Usuario activado' : '⚠️ Usuario suspendido');
        onUpdate();
      } catch (error) {
        console.error('Error al cambiar estado:', error);
        alert('❌ Error al cambiar estado del usuario');
      } finally {
        setLoading(false);
      }
    }
  };

  // Función para cambiar rol
  const handleToggleAdmin = async () => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const confirmMessage = newRole === 'admin'
      ? `¿Otorgar permisos de administrador a ${user.username}?`
      : `¿Remover permisos de administrador a ${user.username}?`;
    
    if (window.confirm(confirmMessage)) {
      setLoading(true);
      try {
        await updateDoc(doc(db, 'users', user.id), {
          role: newRole,
          isAdmin: newRole === 'admin'
        });
        alert('✅ Rol actualizado correctamente');
        onUpdate();
      } catch (error) {
        console.error('Error al cambiar rol:', error);
        alert('❌ Error al cambiar rol');
      } finally {
        setLoading(false);
      }
    }
  };

  // Función para restablecer contraseña
  const handleResetPassword = async () => {
    if (window.confirm(`¿Enviar email de restablecimiento de contraseña a ${user.email}?`)) {
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, user.email);
        alert('✅ Email de restablecimiento enviado correctamente');
      } catch (error) {
        console.error('Error al enviar email:', error);
        alert('❌ Error al enviar email de restablecimiento');
      } finally {
        setLoading(false);
      }
    }
  };

  // Función para eliminar usuario
  const handleDeleteUser = async () => {
    if (window.confirm(`⚠️ ADVERTENCIA: ¿Eliminar permanentemente el usuario ${user.username}?\n\nEsta acción NO se puede deshacer.`)) {
      if (window.confirm('🔴 ÚLTIMA CONFIRMACIÓN\n\n¿Confirmas la eliminación del usuario?')) {
        setLoading(true);
        try {
          await deleteDoc(doc(db, 'users', user.id));
          alert('🗑️ Usuario eliminado correctamente');
          onUpdate();
          onClose();
        } catch (error) {
          console.error('Error al eliminar usuario:', error);
          alert('❌ Error al eliminar usuario');
        } finally {
          setLoading(false);
        }
      }
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        background: 'var(--bg-primary)',
        borderRadius: '1.5rem',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: '2rem',
          borderBottom: '2px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          background: 'var(--bg-primary)',
          zIndex: 10
        }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img 
              src={user.avatar} 
              alt={user.username} 
              style={{ 
                width: '50px', 
                height: '50px', 
                borderRadius: '50%',
                border: '3px solid var(--primary)'
              }} 
            />
            Detalles del Usuario
          </h2>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              color: 'var(--text-secondary)',
              transition: 'color 0.2s'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '2rem' }}>
          {/* Información Personal */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '1.5rem',
            borderRadius: '1rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} />
              Información Personal
            </h3>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* Nombre */}
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                  Nombre Completo
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedUser.username}
                    onChange={(e) => setEditedUser({ ...editedUser, username: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)'
                    }}
                  />
                ) : (
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{user.username}</p>
                )}
              </div>

              {/* Email */}
              <div>
 <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={16} />
                  Email
                </label>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{user.email}</p>
              </div>

              {/* DNI */}
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                  DNI
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedUser.dni}
                    onChange={(e) => setEditedUser({ ...editedUser, dni: e.target.value })}
                    maxLength={8}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)'
                    }}
                  />
                ) : (
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{user.dni}</p>
                )}
              </div>

              {/* Fecha de Registro */}
              <div>
                <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={16} />
                  Fecha de Registro
                </label>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  {new Date(user.createdAt).toLocaleDateString('es-AR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              {/* Estado y Rol */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                    Estado
                  </label>
                  <span style={{
                    display: 'inline-block',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    background: user.active ? 'var(--success)' : 'var(--error)',
                    color: 'white',
                    fontWeight: 600
                  }}>
                    {user.active ? '✓ Activo' : '⚠ Suspendido'}
                  </span>
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                    Rol
                  </label>
                  <span style={{
                    display: 'inline-block',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    background: user.role === 'admin' ? 'var(--warning)' : 'var(--secondary)',
                    color: 'white',
                    fontWeight: 600
                  }}>
                    {user.role === 'admin' ? '👑 Administrador' : '👤 Usuario'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '1.5rem',
            borderRadius: '1rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={20} />
              Dirección y Ubicación
            </h3>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* Dirección */}
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                  Calle y Número
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedUser.address}
                    onChange={(e) => setEditedUser({ ...editedUser, address: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)'
                    }}
                  />
                ) : (
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{user.address}</p>
                )}
              </div>

              {/* Localidad y Provincia */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                    Localidad
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedUser.locality}
                      onChange={(e) => setEditedUser({ ...editedUser, locality: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)'
                      }}
                    />
                  ) : (
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{user.locality}</p>
                  )}
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                    Provincia
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedUser.province}
                      onChange={(e) => setEditedUser({ ...editedUser, province: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)'
                      }}
                    />
                  ) : (
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{user.province}</p>
                  )}
                </div>
              </div>

              {/* Mapa */}
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                  Ubicación en el Mapa
                </label>
                {user.mapAddress && (
                  <p style={{ 
                    margin: '0 0 0.5rem 0', 
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    fontStyle: 'italic'
                  }}>
                    📍 {user.mapAddress}
                  </p>
                )}
                <div style={{ 
                  height: '300px', 
                  borderRadius: '0.75rem', 
                  overflow: 'hidden',
                  border: '2px solid var(--border)'
                }}>
                  <iframe
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${user.longitude-0.01},${user.latitude-0.01},${user.longitude+0.01},${user.latitude+0.01}&layer=mapnik&marker=${user.latitude},${user.longitude}`}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                </div>
                <p style={{ 
                  margin: '0.5rem 0 0 0', 
                  fontSize: '0.75rem', 
                  color: 'var(--text-secondary)',
                  textAlign: 'center'
                }}>
                  Coordenadas: {user.latitude.toFixed(6)}, {user.longitude.toFixed(6)}
                </p>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginTop: '2rem'
          }}>
            {/* Editar / Guardar */}
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  style={{
                    padding: '0.875rem',
                    background: 'var(--success)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.75rem',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Save size={18} />
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                  style={{
                    padding: '0.875rem',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.75rem',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  padding: '0.875rem',
                  background: 'var(--secondary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <Edit2 size={18} />
                Editar Datos
              </button>
            )}

            {/* Restablecer Contraseña */}
            <button
              onClick={handleResetPassword}
              disabled={loading}
              style={{
                padding: '0.875rem',
                background: 'var(--warning)',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <Key size={18} />
              Restablecer Contraseña
            </button>

            {/* Cambiar Rol */}
            <button
              onClick={handleToggleAdmin}
              disabled={loading}
              style={{
                padding: '0.875rem',
                background: user.role === 'admin' ? 'var(--bg-tertiary)' : 'var(--primary)',
                color: user.role === 'admin' ? 'var(--text-primary)' : 'white',
                border: user.role === 'admin' ? '1px solid var(--border)' : 'none',
                borderRadius: '0.75rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <Shield size={18} />
              {user.role === 'admin' ? 'Quitar Admin' : 'Hacer Admin'}
            </button>

            {/* Suspender/Activar */}
            <button
              onClick={handleToggleStatus}
              disabled={loading}
              style={{
                padding: '0.875rem',
                background: user.active ? 'var(--error)' : 'var(--success)',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <Ban size={18} />
              {user.active ? 'Suspender Usuario' : 'Activar Usuario'}
            </button>

            {/* Eliminar */}
            <button
              onClick={handleDeleteUser}
              disabled={loading}
              style={{
                padding: '0.875rem',
                background: 'transparent',
                color: 'var(--error)',
                border: '2px solid var(--error)',
                borderRadius: '0.75rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <Trash2 size={18} />
              Eliminar Usuario
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;

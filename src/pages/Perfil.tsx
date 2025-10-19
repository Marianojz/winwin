import { Mail, MapPin, FileText, Award, ShoppingBag, Gavel } from 'lucide-react';
import { useStore } from '../store/useStore';

const Perfil = () => {
  const { user, auctions } = useStore();

  if (!user) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Debes iniciar sesión</div>;
  }

  const myBids = auctions.filter(a => a.bids.some(b => b.userId === user.id));

  // Generar avatar URL (Gravatar con fallback a ui-avatars)
  const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'U')}&size=200&background=FF6B00&color=fff&bold=true`;

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', padding: '3rem 0' }}>
      <div className="container" style={{ maxWidth: '1000px' }}>
        <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <img 
            src={avatarUrl} 
            alt={user.username} 
            style={{ 
              width: '120px', 
              height: '120px', 
              borderRadius: '50%', 
              objectFit: 'cover', 
              border: '4px solid var(--primary)' 
            }} 
          />
          <div style={{ flex: 1 }}>
            <h1 style={{ marginBottom: '0.5rem' }}>{user.username}</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={18} />
                <span>{user.email}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} />
                <span>DNI: {user.dni}</span>
              </div>
              {user.address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={18} />
                  <span>{user.address.street}, {user.address.locality}, {user.address.province}</span>
                </div>
              )}
            </div>
          </div>
          {user.isAdmin && (
            <div style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white', borderRadius: '0.75rem', fontWeight: 600 }}>
              <Award size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Administrador
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', textAlign: 'center' }}>
            <Gavel size={32} color="var(--primary)" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>{myBids.length}</div>
            <div style={{ color: 'var(--text-secondary)' }}>Subastas Participadas</div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', textAlign: 'center' }}>
            <ShoppingBag size={32} color="var(--success)" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)', marginBottom: '0.25rem' }}>0</div>
            <div style={{ color: 'var(--text-secondary)' }}>Compras Realizadas</div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', textAlign: 'center' }}>
            <Award size={32} color="var(--warning)" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)', marginBottom: '0.25rem' }}>0</div>
            <div style={{ color: 'var(--text-secondary)' }}>Subastas Ganadas</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Mis Ofertas Recientes</h2>
          {myBids.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {myBids.map(auction => (
                <div key={auction.id} style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4>{auction.title}</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      Mi oferta: ${auction.bids.find(b => b.userId === user.id)?.amount.toLocaleString()}
                    </p>
                  </div>
                  <span className="badge badge-success">Activa</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
              No has participado en ninguna subasta aún
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Perfil;

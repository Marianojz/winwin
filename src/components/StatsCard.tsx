import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
  subtitle?: string;
  isMobile?: boolean;
}

// Función helper para convertir colores CSS a gradientes para móvil
const getMobileGradient = (color: string): string => {
  const colorMap: { [key: string]: string } = {
    'var(--primary)': 'linear-gradient(135deg, #3b82f6, #2563eb)',
    'var(--success)': 'linear-gradient(135deg, #10b981, #059669)',
    'var(--warning)': 'linear-gradient(135deg, #f59e0b, #d97706)',
    'var(--info)': 'linear-gradient(135deg, #06b6d4, #0891b2)',
    'var(--secondary)': 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    'var(--error)': 'linear-gradient(135deg, #ef4444, #dc2626)',
  };
  
  return colorMap[color] || 'linear-gradient(135deg, #3b82f6, #2563eb)';
};

const StatsCard = ({ title, value, icon: Icon, trend, color = 'var(--primary)', subtitle, isMobile = false }: StatsCardProps) => {
  if (isMobile) {
    // Estilo compacto para móvil - similar al dashboard de pedidos
    return (
      <div style={{
        background: getMobileGradient(color),
        padding: '0.625rem',
        borderRadius: '0.75rem',
        color: 'white',
        aspectRatio: '1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        minWidth: 0,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <Icon size={16} style={{ marginBottom: '0.25rem', flexShrink: 0, opacity: 0.9, color: 'white' }} />
        <span style={{ 
          fontSize: '0.625rem', 
          opacity: 0.9, 
          marginBottom: '0.25rem',
          lineHeight: '1.2',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          width: '100%'
        }}>
          {title}
        </span>
        <div style={{ fontSize: '1.125rem', fontWeight: 700, lineHeight: '1' }}>
          {value}
        </div>
      </div>
    );
  }

  // Estilo original para desktop
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      padding: '1.5rem',
      borderRadius: '1rem',
      boxShadow: '0 2px 8px var(--shadow)',
      border: '1px solid var(--border)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'default'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 8px 16px var(--shadow)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 2px 8px var(--shadow)';
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, marginBottom: '0.5rem' }}>
            {title}
          </p>
          <h3 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            {value}
          </h3>
          {subtitle && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, marginTop: '0.25rem' }}>
              {subtitle}
            </p>
          )}
        </div>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={24} color={color} />
        </div>
      </div>
      
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: trend.isPositive ? 'var(--success)' : 'var(--error)'
          }}>
            {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
          </span>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            vs mes anterior
          </span>
        </div>
      )}
    </div>
  );
};

export default StatsCard;

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
}

const StatsCard = ({ title, value, icon: Icon, trend, color = 'var(--primary)', subtitle }: StatsCardProps) => {
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

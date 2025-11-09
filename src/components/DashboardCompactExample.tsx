import { Users, Gavel, Package, ShoppingCart, DollarSign, Bot, TrendingUp, Plus, RefreshCw } from 'lucide-react';
import DashboardCompact, { DashboardMetric, QuickAction, DashboardCard } from './DashboardCompact';
import { formatCurrency } from '../utils/helpers';

interface DashboardCompactExampleProps {
  stats: {
    users: { total: number; active: number };
    auctions: { active: number; ended: number };
    products: { total: number; active: number };
    orders: { total: number; delivered: number };
    revenue: { total: number; month: number };
    bots: { active: number; total: number; totalBalance: number };
  };
  onQuickAction?: (action: string) => void;
}

const DashboardCompactExample = ({ stats, onQuickAction }: DashboardCompactExampleProps) => {
  // Métricas para el dashboard
  const metrics: DashboardMetric[] = [
    {
      label: 'Usuarios Totales',
      value: stats.users.total,
      icon: <Users size={20} />,
      trend: 'up',
      trendValue: '+12%'
    },
    {
      label: 'Subastas Activas',
      value: stats.auctions.active,
      icon: <Gavel size={20} />,
      trend: 'neutral'
    },
    {
      label: 'Productos',
      value: stats.products.total,
      icon: <Package size={20} />,
      trend: 'up',
      trendValue: '+5%'
    },
    {
      label: 'Pedidos Totales',
      value: stats.orders.total,
      icon: <ShoppingCart size={20} />,
      trend: 'up',
      trendValue: '+8%'
    },
    {
      label: 'Ingresos Totales',
      value: formatCurrency(stats.revenue.total),
      icon: <DollarSign size={20} />,
      trend: 'up',
      trendValue: '+15%'
    },
    {
      label: 'Bots Activos',
      value: stats.bots.active,
      icon: <Bot size={20} />,
      trend: 'down',
      trendValue: '-2'
    }
  ];

  // Acciones rápidas
  const quickActions: QuickAction[] = [
    {
      label: 'Nueva Subasta',
      icon: <Gavel size={18} />,
      onClick: () => onQuickAction?.('new-auction'),
      variant: 'primary'
    },
    {
      label: 'Nuevo Producto',
      icon: <Package size={18} />,
      onClick: () => onQuickAction?.('new-product'),
      variant: 'primary'
    },
    {
      label: 'Actualizar',
      icon: <RefreshCw size={18} />,
      onClick: () => onQuickAction?.('refresh'),
      variant: 'secondary'
    },
    {
      label: 'Ver Reportes',
      icon: <TrendingUp size={18} />,
      onClick: () => onQuickAction?.('reports'),
      variant: 'success'
    }
  ];

  // Tarjetas personalizadas
  const cards: DashboardCard[] = [
    {
      title: 'Resumen Financiero',
      content: (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Ingresos del Mes:</span>
            <strong style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(stats.revenue.month)}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Pedidos Entregados:</span>
            <strong style={{ color: 'var(--text-primary)' }}>
              {stats.orders.delivered}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Subastas Finalizadas:</span>
            <strong style={{ color: 'var(--text-primary)' }}>
              {stats.auctions.ended}
            </strong>
          </div>
        </div>
      ),
      footer: (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Última actualización: {new Date().toLocaleTimeString('es-AR')}
        </div>
      )
    },
    {
      title: 'Estado del Sistema',
      content: (
        <div>
          <div style={{ 
            padding: '0.75rem', 
            background: 'var(--bg-tertiary)', 
            borderRadius: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Usuarios Activos:</span>
              <strong style={{ color: 'var(--success)' }}>{stats.users.active}</strong>
            </div>
          </div>
          <div style={{ 
            padding: '0.75rem', 
            background: 'var(--bg-tertiary)', 
            borderRadius: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Productos Activos:</span>
              <strong style={{ color: 'var(--success)' }}>{stats.products.active}</strong>
            </div>
          </div>
          <div style={{ 
            padding: '0.75rem', 
            background: 'var(--bg-tertiary)', 
            borderRadius: '0.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Balance Bots:</span>
              <strong style={{ color: 'var(--primary)' }}>
                {formatCurrency(stats.bots.totalBalance)}
              </strong>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <DashboardCompact
      metrics={metrics}
      quickActions={quickActions}
      cards={cards}
    />
  );
};

export default DashboardCompactExample;


import { ReactNode } from 'react';
import './DashboardCompact.css';

export interface DashboardMetric {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export interface QuickAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

export interface DashboardCard {
  title: string;
  content: ReactNode;
  footer?: ReactNode;
  className?: string;
}

interface DashboardCompactProps {
  cards?: DashboardCard[];
  metrics?: DashboardMetric[];
  quickActions?: QuickAction[];
  className?: string;
}

const DashboardCompact = ({ 
  cards, 
  metrics, 
  quickActions, 
  className = '' 
}: DashboardCompactProps) => {
  return (
    <div className={`dashboard-compact ${className}`}>
      {/* Métricas */}
      {metrics && metrics.length > 0 && (
        <div className="dashboard-card metrics-card">
          <h3 className="card-title">Métricas</h3>
          <div className="metrics-grid">
            {metrics.map((metric, index) => (
              <div key={index} className="metric-item">
                {metric.icon && (
                  <div className="metric-icon">{metric.icon}</div>
                )}
                <div className="metric-content">
                  <div className="metric-value">{metric.value}</div>
                  <div className="metric-label">{metric.label}</div>
                  {metric.trend && (
                    <div className={`metric-trend trend-${metric.trend}`}>
                      {metric.trend === 'up' && '↑'}
                      {metric.trend === 'down' && '↓'}
                      {metric.trend === 'neutral' && '→'}
                      {metric.trendValue && ` ${metric.trendValue}`}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tarjetas personalizadas */}
      {cards && cards.map((card, index) => (
        <div key={index} className={`dashboard-card ${card.className || ''}`}>
          <h3 className="card-title">{card.title}</h3>
          <div className="card-content">
            {card.content}
          </div>
          {card.footer && (
            <div className="card-footer">
              {card.footer}
            </div>
          )}
        </div>
      ))}

      {/* Acciones Rápidas */}
      {quickActions && quickActions.length > 0 && (
        <div className="dashboard-card actions-card">
          <h3 className="card-title">Acciones Rápidas</h3>
          <div className="quick-actions">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className={`quick-action-btn btn-${action.variant || 'primary'}`}
                onClick={action.onClick}
              >
                {action.icon && <span className="action-icon">{action.icon}</span>}
                <span className="action-label">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardCompact;


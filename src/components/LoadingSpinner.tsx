import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', text }) => {
  const sizeClasses = {
    sm: '20px',
    md: '40px',
    lg: '60px'
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      gap: '1rem',
      padding: '2rem'
    }}>
      <div 
        className="spinner"
        style={{
          width: sizeClasses[size],
          height: sizeClasses[size],
          borderWidth: size === 'sm' ? '2px' : '3px'
        }}
      />
      {text && (
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '0.875rem',
          margin: 0
        }}>
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;


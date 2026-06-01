import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'muted';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary', className = '' }) => {
  const baseClass = 'neo-badge';
  const variantClass = variant === 'secondary' ? 'neo-badge-secondary' : variant === 'muted' ? 'neo-badge-muted' : '';
  const classes = `${baseClass} ${variantClass} ${className}`.trim();

  return (
    <span className={classes}>
      {children}
    </span>
  );
};

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hover = true }) => {
  const classes = `neo-card ${className}`.trim();
  const style = hover ? {} : { transform: 'none', boxShadow: 'var(--shadow-md)' };

  return (
    <div className={classes} style={style}>
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => {
  return (
    <div className={`neo-card-header ${className}`.trim()}>
      {children}
    </div>
  );
};

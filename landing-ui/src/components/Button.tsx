import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'default' | 'large';
  children: React.ReactNode;
  asLink?: boolean;
  href?: string;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'default',
  children, 
  asLink = false,
  href,
  className = '',
  ...props 
}) => {
  const baseClass = 'neo-button';
  const variantClass = variant === 'secondary' ? 'neo-button-secondary' : variant === 'outline' ? 'neo-button-outline' : '';
  const sizeClass = size === 'large' ? 'neo-button-large' : '';
  const classes = `${baseClass} ${variantClass} ${sizeClass} ${className}`.trim();

  if (asLink && href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
};

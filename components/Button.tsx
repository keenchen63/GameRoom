import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "py-3 px-6 rounded-xl font-semibold transition-all active:scale-95 flex items-center justify-center gap-2";
  
  const variants = {
    primary: "text-white shadow-lg",
    secondary: "bg-white shadow-sm border hover:bg-gray-50",
    outline: "bg-transparent border-2",
    danger: "bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100",
    ghost: "bg-transparent hover:bg-gray-100",
  };
  
  const getVariantStyle = (variant: string) => {
    if (variant === 'primary') {
      return {
        backgroundColor: '#2F5D8C',
        boxShadow: '0 10px 15px -3px rgba(47, 93, 140, 0.1), 0 4px 6px -2px rgba(47, 93, 140, 0.05)',
      };
    }
    if (variant === 'secondary') {
      return {
        color: '#5B6E80',
        borderColor: '#DCE8F5',
      };
    }
    if (variant === 'outline') {
      return {
        borderColor: '#2F5D8C',
        color: '#2F5D8C',
      };
    }
    if (variant === 'ghost') {
      return {
        color: '#5B6E80',
      };
    }
    return {};
  };

  const variantStyle = getVariantStyle(variant);
  
  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant === 'primary') {
      e.currentTarget.style.backgroundColor = '#3A6EA5';
    } else if (variant === 'outline') {
      e.currentTarget.style.backgroundColor = 'rgba(47, 93, 140, 0.05)';
    }
  };
  
  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant === 'primary') {
      e.currentTarget.style.backgroundColor = '#2F5D8C';
    } else if (variant === 'outline') {
      e.currentTarget.style.backgroundColor = 'transparent';
    }
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={variantStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </button>
  );
};

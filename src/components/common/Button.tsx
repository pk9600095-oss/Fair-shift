/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'warning' | 'ghost' | 'highlight';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-medium transition-none border rounded-[2px] focus-visible:outline-2 focus-visible:outline-[#00796B] focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-left';

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3.5 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const variantClasses = {
    primary:
      'bg-[#00796B] text-[#FAF8F3] border-[#00796B] hover:bg-[#006357]',
    secondary:
      'bg-[#FAF8F3] text-[#1D2926] border-[#E2DDD1] hover:bg-[#EFECE3]',
    accent:
      'bg-[#2457C5] text-white border-[#2457C5] hover:bg-[#1C45A3]',
    highlight:
      'bg-[#F4CF57] text-[#1D2926] border-[#E5BC35] hover:bg-[#E5BF42] font-semibold',
    warning:
      'bg-[#A63D24] text-[#FAF8F3] border-[#A63D24] hover:bg-[#8F331D]',
    ghost:
      'bg-transparent text-[#1D2926] border-transparent hover:bg-[#EFECE3]',
  };

  return (
    <button
      className={`${base} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

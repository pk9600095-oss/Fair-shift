/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'muted' | 'alert' | 'highlight';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
}) => {
  const variantStyles = {
    default: 'bg-[#FAF8F3] border-[#E2DDD1]',
    muted: 'bg-[#EFECE3] border-[#E2DDD1]',
    alert: 'bg-[#FBECE8] border-[#A63D24]',
    highlight: 'bg-[#FDF9ED] border-[#F4CF57]',
  };

  return (
    <div
      className={`border rounded-[2px] p-4 sm:p-6 ${variantStyles[variant]} ${className}`}
    >
      {children}
    </div>
  );
};

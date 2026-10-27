/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export type BadgeVariant = 'neutral' | 'teal' | 'rust' | 'yellow' | 'blue' | 'subtle';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  prefix?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
  prefix,
}) => {
  const variantStyles = {
    neutral: 'border-[#E2DDD1] bg-[#EFECE3] text-[#1D2926]',
    teal: 'border-[#00796B] bg-[#E0F2F1] text-[#006357]',
    rust: 'border-[#A63D24] bg-[#FBECE8] text-[#A63D24]',
    yellow: 'border-[#D9B436] bg-[#F4CF57] text-[#1D2926] font-bold',
    blue: 'border-[#2457C5] bg-[#E8EFFF] text-[#1C45A3]',
    subtle: 'border-[#E2DDD1] bg-[#FAF8F3] text-[#4A5652]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-[2px] ${variantStyles[variant]} ${className}`}
    >
      {prefix && <span className="opacity-75">{prefix}</span>}
      <span>{children}</span>
    </span>
  );
};

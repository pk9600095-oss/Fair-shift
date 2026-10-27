/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Button } from './Button.tsx';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`border border-dashed border-[#B8B2A2] bg-[#FAF8F5] p-6 text-center rounded-xs ${className}`}
    >
      <h3 className="text-base font-semibold text-[#20251F]">{title}</h3>
      <p className="mt-1 text-sm text-[#525950] max-w-md mx-auto">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

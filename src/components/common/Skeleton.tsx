/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = 'h-4 w-full', lines = 1 }) => {
  return (
    <div role="status" aria-label="Loading content" aria-busy="true" className="space-y-2">
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={idx}
          className={`bg-[#EAE6DC] animate-pulse border border-[#D3CEBE] rounded-xs ${className}`}
        />
      ))}
      <span className="sr-only">Loading content...</span>
    </div>
  );
};

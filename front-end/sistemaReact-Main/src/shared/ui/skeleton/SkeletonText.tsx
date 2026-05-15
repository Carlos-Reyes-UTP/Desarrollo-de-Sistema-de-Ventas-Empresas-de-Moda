import React from 'react';
import { Skeleton } from './Skeleton';

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
  lineClassName?: string;
}

const DEFAULT_WIDTHS = ['w-full', 'w-4/5', 'w-3/5', 'w-2/3'];

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 2,
  className = '',
  lineClassName = 'h-3',
}) => (
  <div className={`space-y-2 ${className}`} aria-hidden>
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton
        key={i}
        className={`${lineClassName} ${DEFAULT_WIDTHS[i % DEFAULT_WIDTHS.length]}`}
      />
    ))}
  </div>
);

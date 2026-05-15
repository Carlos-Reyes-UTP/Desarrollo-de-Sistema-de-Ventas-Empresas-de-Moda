import React from 'react';
import { Skeleton } from './Skeleton';

export interface CardGridSkeletonProps {
  count?: number;
  className?: string;
  gridClassName?: string;
}

export const CardGridSkeleton: React.FC<CardGridSkeletonProps> = ({
  count = 6,
  className = '',
  gridClassName = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8',
}) => (
  <div className={gridClassName} aria-busy aria-label="Cargando catálogo">
    {Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        className={`rounded-[2rem] border border-gray-100 bg-white p-6 ${className}`}
      >
        <Skeleton className="mb-4 h-4 w-3/4" />
        <Skeleton className="mb-6 h-3 w-1/2" variant="muted" />
        <div className="mb-6 flex gap-2">
          <Skeleton className="h-6 w-16 rounded-lg" variant="muted" />
          <Skeleton className="h-6 w-14 rounded-lg" />
        </div>
        <div className="flex justify-between border-t border-gray-50 pt-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    ))}
  </div>
);

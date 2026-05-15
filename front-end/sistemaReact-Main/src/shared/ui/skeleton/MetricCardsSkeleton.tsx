import React from 'react';
import { Skeleton } from './Skeleton';

export interface MetricCardsSkeletonProps {
  count?: number;
  className?: string;
}

export const MetricCardsSkeleton: React.FC<MetricCardsSkeletonProps> = ({
  count = 4,
  className = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6',
}) => (
  <div className={className} aria-busy aria-label="Cargando métricas">
    {Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        className="rounded-[2.5rem] border border-[#1F1F1F] bg-[#0D0D0D] p-8"
      >
        <div className="flex items-start justify-between">
          <Skeleton variant="dark" className="h-14 w-14 rounded-2xl" />
          <div className="space-y-2 text-right">
            <Skeleton variant="dark" className="ml-auto h-3 w-24" />
            <Skeleton variant="dark" className="ml-auto h-8 w-28" />
          </div>
        </div>
        <Skeleton variant="dark" className="mt-6 h-3 w-32" />
      </div>
    ))}
  </div>
);

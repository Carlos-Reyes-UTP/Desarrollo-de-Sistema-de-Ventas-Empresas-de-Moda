import React from 'react';
import { Skeleton } from './Skeleton';

export interface ChartSkeletonProps {
  height?: string;
  className?: string;
  barCount?: number;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  height = 'h-[300px]',
  className = '',
  barCount = 7,
}) => (
  <div
    className={`flex flex-col rounded-[2.5rem] border border-[#E5E7EB] bg-white p-8 ${className}`}
    aria-busy
    aria-label="Cargando gráfico"
  >
    <div className="mb-8 flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-28" variant="muted" />
      </div>
      <Skeleton className="h-8 w-24 rounded-xl" variant="muted" />
    </div>
    <div className={`${height} flex items-end justify-between gap-3 px-2`}>
      {Array.from({ length: barCount }, (_, i) => (
        <Skeleton
          key={i}
          variant="muted"
          className="w-full max-w-[3rem] rounded-t-md"
          style={{ height: `${35 + (i % 4) * 15}%` }}
        />
      ))}
    </div>
  </div>
);

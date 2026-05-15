import React from 'react';
import { Skeleton } from './Skeleton';

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
  showHeader?: boolean;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 8,
  columns = 4,
  className = '',
  showHeader = true,
}) => (
  <div
    className={`w-full overflow-hidden rounded-[2rem] border border-gray-100 bg-white ${className}`}
    aria-busy
    aria-label="Cargando datos"
  >
    {showHeader && (
      <div className="flex gap-4 border-b border-gray-50 px-8 py-6">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={`h-${i}`} className="h-3 flex-1 max-w-[8rem]" />
        ))}
      </div>
    )}
    <div className="divide-y divide-gray-50">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-4 px-8 py-6">
          {Array.from({ length: columns }, (_, col) => (
            <Skeleton
              key={`${row}-${col}`}
              className={`h-4 flex-1 ${col === 0 ? 'max-w-[12rem]' : 'max-w-[6rem]'}`}
            />
          ))}
        </div>
      ))}
    </div>
  </div>
);

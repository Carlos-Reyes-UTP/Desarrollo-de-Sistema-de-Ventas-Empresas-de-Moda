import React from 'react';
import { Skeleton } from './Skeleton';

export interface ListItemSkeletonProps {
  count?: number;
  className?: string;
  showAvatar?: boolean;
}

export const ListItemSkeleton: React.FC<ListItemSkeletonProps> = ({
  count = 5,
  className = '',
  showAvatar = true,
}) => (
  <div className={`space-y-3 ${className}`} aria-busy aria-label="Cargando lista">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="flex items-center gap-4 rounded-2xl p-3">
        {showAvatar && <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />}
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3 max-w-xs" />
          <Skeleton className="h-3 w-1/2 max-w-[10rem]" variant="muted" />
        </div>
      </div>
    ))}
  </div>
);

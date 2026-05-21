import React from 'react';
import { Skeleton } from './Skeleton';

export interface SearchResultSkeletonProps {
  className?: string;
}

export const SearchResultSkeleton: React.FC<SearchResultSkeletonProps> = ({
  className = 'app-panel space-y-2 rounded-3xl border p-4 shadow-sm backdrop-blur-md',
}) => (
  <div className={className} aria-busy aria-label="Buscando">
    <Skeleton className="h-4 w-[60%] max-w-xs" />
    <Skeleton className="h-4 w-[40%] max-w-[10rem]" variant="muted" />
    <Skeleton className="h-24 rounded-2xl" variant="muted" />
  </div>
);

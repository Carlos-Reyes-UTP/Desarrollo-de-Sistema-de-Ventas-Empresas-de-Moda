import React from 'react';
import { Skeleton } from './Skeleton';

export const AppShellSkeleton: React.FC = () => (
  <div className="flex min-h-screen app-layout-bg" aria-busy aria-label="Cargando aplicación">
    <aside className="hidden w-64 shrink-0 border-r border-[var(--app-border)] bg-[var(--app-surface)] p-6 md:flex md:flex-col md:gap-4">
      <Skeleton className="mb-6 h-10 w-32" />
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-xl" variant="muted" />
      ))}
    </aside>
    <main className="flex-1 p-8 md:p-10">
      <Skeleton className="mb-4 h-10 w-64" />
      <Skeleton className="mb-8 h-4 w-96 max-w-full" variant="muted" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-[2rem]" variant="muted" />
        ))}
      </div>
      <Skeleton className="mt-8 h-[320px] w-full rounded-[2.5rem]" variant="muted" />
    </main>
  </div>
);

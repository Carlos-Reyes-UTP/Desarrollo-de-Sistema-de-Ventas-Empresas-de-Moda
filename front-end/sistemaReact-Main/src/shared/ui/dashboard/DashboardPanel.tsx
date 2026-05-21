import type { ReactNode } from 'react';

export interface DashboardPanelProps {
  children: ReactNode;
  className?: string;
}

export const DashboardPanel = ({ children, className = '' }: DashboardPanelProps) => (
  <div
    className={`app-panel flex flex-col rounded-[2.5rem] p-8 border text-left transition-all ${className}`}
  >
    {children}
  </div>
);

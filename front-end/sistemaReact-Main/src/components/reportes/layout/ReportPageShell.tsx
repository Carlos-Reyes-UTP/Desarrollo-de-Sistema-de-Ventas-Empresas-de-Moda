import type { ReactNode } from 'react';
import { ReportCommandDeck } from '@/components/reportes/layout/ReportCommandDeck';

export interface ReportTabConfig {
  id: string;
  nombre: string;
  icon: string;
  descripcion: string;
}

interface ReportPageShellProps {
  tabs: ReportTabConfig[];
  tabActiva: string;
  onTabChange: (id: string) => void;
  children: ReactNode;
}

export const ReportPageShell = ({
  tabs,
  tabActiva,
  onTabChange,
  children,
}: ReportPageShellProps) => (
  <div className="mx-auto max-w-[1600px] space-y-5 sm:space-y-6">
    <ReportCommandDeck tabs={tabs} tabActiva={tabActiva} onTabChange={onTabChange} />
    <div className="min-h-[320px]">{children}</div>
  </div>
);

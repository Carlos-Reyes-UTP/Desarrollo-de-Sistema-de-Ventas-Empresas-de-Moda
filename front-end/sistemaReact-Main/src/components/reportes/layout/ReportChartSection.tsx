import type { ReactNode } from 'react';
import { DashboardPanel } from '@/shared/ui/dashboard/DashboardPanel';
import { SectionHeader } from '@/shared/ui';

interface ReportChartSectionProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  insight?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const ReportChartSection = ({
  title,
  subtitle,
  action,
  insight,
  children,
  className = '',
}: ReportChartSectionProps) => (
  <div className={`space-y-4 ${className}`}>
    {insight}
    <DashboardPanel>
      <SectionHeader title={title} action={action} />
      {subtitle ? (
        <p className="text-[10px] font-bold app-text-muted -mt-4 mb-4">{subtitle}</p>
      ) : null}
      {children}
    </DashboardPanel>
  </div>
);

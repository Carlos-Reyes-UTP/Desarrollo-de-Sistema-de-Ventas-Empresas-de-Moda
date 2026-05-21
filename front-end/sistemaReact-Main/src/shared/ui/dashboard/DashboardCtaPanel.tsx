import type { ReactNode } from 'react';

export interface DashboardCtaPanelProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export const DashboardCtaPanel = ({ title, subtitle, children }: DashboardCtaPanelProps) => (
  <div className="app-cta-panel rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group text-left">
    <div className="app-cta-panel-glow absolute -right-10 -bottom-10 h-40 w-40 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
    <h3 className="text-lg font-black mb-1 relative z-10 uppercase tracking-tighter app-cta-title">
      {title}
    </h3>
    <p className="text-[10px] font-bold mb-8 relative z-10 uppercase tracking-widest app-cta-subtitle">
      {subtitle}
    </p>
    <div className="space-y-3 relative z-10">{children}</div>
  </div>
);

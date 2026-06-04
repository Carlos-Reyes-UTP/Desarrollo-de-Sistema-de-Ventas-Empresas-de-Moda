import type { ReactNode } from "react";

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

/** Encabezado compacto para bloques internos (cards, tablas, dashboards). */
const SectionHeader = ({ title, subtitle, action, className = "" }: SectionHeaderProps) => (
  <div
    className={`flex items-start sm:items-center justify-between gap-3 mb-3 sm:mb-4 min-w-0 ${className}`}
  >
    <div className="min-w-0">
      <h2 className="text-base sm:text-lg font-bold app-heading truncate">{title}</h2>
      {subtitle ? (
        <p className="text-[10px] font-bold app-text-muted mt-0.5">{subtitle}</p>
      ) : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);

export default SectionHeader;

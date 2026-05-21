import type { ReactNode } from "react";

export interface SectionHeaderProps {
  title: string;
  action?: ReactNode;
  className?: string;
}

/** Encabezado compacto para bloques internos (cards, tablas, dashboards). */
const SectionHeader = ({ title, action, className = "" }: SectionHeaderProps) => (
  <div
    className={`flex items-start sm:items-center justify-between gap-3 mb-3 sm:mb-4 min-w-0 ${className}`}
  >
    <h2 className="text-base sm:text-lg font-bold app-heading min-w-0 truncate">{title}</h2>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);

export default SectionHeader;

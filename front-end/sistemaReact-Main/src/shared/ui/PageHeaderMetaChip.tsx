import type { ReactNode } from 'react';
import { MaterialIcon } from './MaterialIcon';

export type PageHeaderMetaChipVariant = 'stat' | 'muted' | 'context';

export interface PageHeaderMetaChipProps {
  children: ReactNode;
  variant?: PageHeaderMetaChipVariant;
  icon?: string;
  className?: string;
}

const variantClass: Record<PageHeaderMetaChipVariant, string> = {
  stat: 'app-header-meta-chip app-header-meta-chip--stat',
  muted: 'app-header-meta-chip app-header-meta-chip--muted',
  context: 'app-header-meta-chip app-header-meta-chip--context',
};

const PageHeaderMetaChip = ({
  children,
  variant = 'stat',
  icon,
  className = '',
}: PageHeaderMetaChipProps) => (
  <span className={`${variantClass[variant]} ${className}`.trim()}>
    {icon ? (
      <MaterialIcon icon={icon} className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
    ) : null}
    {children}
  </span>
);

export default PageHeaderMetaChip;

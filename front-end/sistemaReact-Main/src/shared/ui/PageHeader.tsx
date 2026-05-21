import type { ReactNode } from "react";
import { MaterialIcon } from "./MaterialIcon";

export type PageHeaderVariant = "default" | "dashboard" | "almacen" | "cajero" | "embedded";
export type PageHeaderSurface = "flat" | "elevated";

export interface PageHeaderProps {
  title: ReactNode;
  /** Opt-in; evitar salvo necesidad UX concreta. */
  subtitle?: string;
  /** Micro-label sobre el título (ej. "Módulo · Catálogo"). */
  eyebrow?: string;
  icon?: string;
  actions?: ReactNode;
  /** Chips o meta breve bajo el título. */
  belowTitle?: ReactNode;
  /** Tabs, sectores o breadcrumbs dentro del mismo chrome. */
  toolbar?: ReactNode;
  variant?: PageHeaderVariant;
  /** `elevated` alinea con tarjetas premium; `flat` para vistas embebidas. */
  surface?: PageHeaderSurface;
  /** Acento lateral en dashboard (desktop). */
  accent?: boolean;
  className?: string;
}

const titleByVariant: Record<PageHeaderVariant, string> = {
  default: "app-heading text-xl lg:text-2xl font-bold tracking-tight leading-tight",
  dashboard: "app-heading text-xl lg:text-2xl font-black tracking-tight leading-tight",
  almacen: "app-heading text-xl lg:text-2xl font-bold leading-tight",
  cajero: "caj-heading text-xl lg:text-2xl font-bold tracking-tight leading-tight",
  embedded: "app-heading text-lg sm:text-xl font-bold leading-tight",
};

const wrapperByVariant: Record<PageHeaderVariant, string> = {
  default: "mb-4 sm:mb-5",
  dashboard: "mb-4 sm:mb-6",
  almacen: "mb-4 sm:mb-5",
  cajero: "mb-4 sm:mb-5",
  embedded: "mb-3 sm:mb-4",
};

const elevatedShell =
  "app-card-glass rounded-2xl lg:rounded-[1.5rem] border shadow-[0_4px_20px_rgba(0,0,0,0.03)] px-5 py-4 lg:px-8 lg:py-5";

const elevatedShellCajero =
  "caj-card rounded-2xl lg:rounded-[1.5rem] border caj-border shadow-sm px-5 py-4 lg:px-8 lg:py-5";

const elevatedShellDashboard =
  "app-dashboard-header-shell backdrop-blur-md rounded-2xl lg:rounded-[1.5rem] border shadow-[0_4px_20px_rgba(0,0,0,0.03)] px-5 py-4 lg:px-8 lg:py-5 lg:border-l-4 lg:pl-6";

/**
 * Chrome de página: título, acciones y toolbar opcional.
 * En desktop (`elevated`) comparte superficie con el filter deck premium.
 */
const PageHeader = ({
  title,
  subtitle,
  eyebrow,
  icon,
  actions,
  belowTitle,
  toolbar,
  variant = "default",
  surface,
  accent = false,
  className = "",
}: PageHeaderProps) => {
  const resolvedSurface: PageHeaderSurface =
    surface ?? (variant === "embedded" ? "flat" : "elevated");

  const subtitleClass =
    variant === "cajero"
      ? "text-xs caj-text-muted font-medium mt-1 line-clamp-1"
      : "text-xs app-text-muted font-medium mt-1 line-clamp-1";

  const eyebrowClass =
    variant === "cajero"
      ? "text-[10px] font-bold uppercase tracking-[0.15em] caj-text-muted mb-1"
      : "text-[10px] font-bold uppercase tracking-[0.15em] app-text-faint mb-1";

  const shellClass =
    resolvedSurface === "elevated"
      ? variant === "cajero"
        ? elevatedShellCajero
        : variant === "dashboard" || accent
          ? elevatedShellDashboard
          : elevatedShell
      : "";

  const content = (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 min-w-0">
        <div className="min-w-0 flex-1">
          {eyebrow ? <p className={eyebrowClass}>{eyebrow}</p> : null}
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-input)]">
                <MaterialIcon icon={icon} className="h-5 w-5 text-[var(--app-text)]" aria-hidden />
              </span>
            )}
            <h1 className={`min-w-0 max-lg:truncate ${titleByVariant[variant]}`}>{title}</h1>
          </div>
          {subtitle ? <p className={subtitleClass}>{subtitle}</p> : null}
          {belowTitle ? (
            <div className="mt-2.5 min-w-0 flex flex-wrap items-center gap-2">{belowTitle}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 shrink-0 w-full lg:w-auto lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
      {toolbar ? (
        <div className="mt-4 pt-4 border-t border-[var(--app-border)] min-w-0">{toolbar}</div>
      ) : null}
    </>
  );

  return (
    <header className={`min-w-0 ${wrapperByVariant[variant]} ${className}`}>
      {resolvedSurface === "elevated" ? <div className={shellClass}>{content}</div> : content}
    </header>
  );
};

export default PageHeader;

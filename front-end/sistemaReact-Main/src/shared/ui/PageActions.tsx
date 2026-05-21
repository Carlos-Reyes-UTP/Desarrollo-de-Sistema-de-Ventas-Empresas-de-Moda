import type { ButtonHTMLAttributes, ReactNode } from "react";

type PageActionVariant = "primary" | "secondary";

export interface PageActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PageActionVariant;
  /** Dentro de PageActionGroup: estilos segmented sin doble borde. */
  grouped?: boolean;
  children: ReactNode;
}

export interface PageActionGroupProps {
  children: ReactNode;
  className?: string;
}

const baseStandalone =
  "inline-flex min-h-10 lg:h-10 items-center justify-center gap-2 px-4 lg:px-5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

const baseGrouped =
  "inline-flex min-h-10 lg:h-10 items-center justify-center gap-2 px-4 lg:px-5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-200 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

const variantsStandalone: Record<PageActionVariant, string> = {
  primary: "app-btn-primary shadow-sm",
  secondary: "app-btn-secondary border shadow-sm",
};

const variantsGrouped: Record<PageActionVariant, string> = {
  primary: "app-btn-primary",
  secondary: "app-btn-secondary border-transparent",
};

/** Contenedor segmented para acciones del header (desktop premium). */
export const PageActionGroup = ({ children, className = "" }: PageActionGroupProps) => (
  <div
    className={`inline-flex flex-wrap items-center gap-1 p-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-muted)] ${className}`}
    role="group"
  >
    {children}
  </div>
);

/** Botón de acción alineado con PageHeader. */
export const PageActionButton = ({
  variant = "primary",
  grouped = false,
  className = "",
  children,
  type = "button",
  ...rest
}: PageActionButtonProps) => (
  <button
    type={type}
    className={`${grouped ? baseGrouped : baseStandalone} ${grouped ? variantsGrouped[variant] : variantsStandalone[variant]} ${className}`}
    {...rest}
  >
    {children}
  </button>
);

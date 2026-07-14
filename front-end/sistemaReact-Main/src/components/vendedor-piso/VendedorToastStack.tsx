import { useEffect, useRef } from "react";
import { MaterialIcon } from "@/shared/ui";

export interface VendedorToastInfo {
  id: string;
  tipo: "success" | "error" | "info";
  titulo: string;
  mensaje: string;
  producto?: string;
  talla?: string;
  color?: string;
  cantidad?: number;
  autoDismissMs?: number;
}

interface VendedorToastStackProps {
  toasts: VendedorToastInfo[];
  onDismiss: (id: string) => void;
}

export const VendedorToastStack = ({ toasts, onDismiss }: VendedorToastStackProps) => {
  // En móvil solo mostramos las 2 más recientes para no tapar la UI.
  const visibles = toasts.slice(-2);

  return (
    <>
      <style>{`
        @keyframes toastSlideInMobile {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes toastSlideInDesktop {
          from {
            opacity: 0;
            transform: translateX(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes toastShrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-toastIn {
          animation: toastSlideInMobile 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @media (min-width: 640px) {
          .animate-toastIn {
            animation-name: toastSlideInDesktop;
          }
        }
      `}</style>

      <div
        aria-live="polite"
        className="fixed top-[3.75rem] inset-x-3 z-[120] flex flex-col gap-1.5 pointer-events-none sm:inset-x-auto sm:left-auto sm:right-4 sm:top-16 sm:w-full sm:max-w-[22rem]"
      >
        {visibles.map((toast) => (
          <VendedorToastCard
            key={toast.id}
            toast={toast}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </>
  );
};

interface VendedorToastCardProps {
  toast: VendedorToastInfo;
  onDismiss: (id: string) => void;
}

function detalleCompacto(toast: VendedorToastInfo): string | null {
  const partes: string[] = [];
  if (toast.producto) partes.push(toast.producto);
  const meta: string[] = [];
  if (toast.talla) meta.push(`T${toast.talla}`);
  if (toast.color) meta.push(toast.color);
  if (toast.cantidad !== undefined) meta.push(`×${toast.cantidad}`);
  if (meta.length) partes.push(meta.join(" · "));
  return partes.length ? partes.join(" · ") : null;
}

const VendedorToastCard = ({ toast, onDismiss }: VendedorToastCardProps) => {
  const { id, tipo, titulo, mensaje, autoDismissMs = 3200 } = toast;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (autoDismissMs <= 0) return undefined;
    const timer = setTimeout(() => {
      onDismissRef.current(id);
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [id, autoDismissMs]);

  const config = {
    success: {
      shell: "border-emerald-500/25 bg-[var(--app-surface)]/95 shadow-[0_8px_24px_rgba(16,185,129,0.10)]",
      iconWrap: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
      accentBar: "bg-emerald-500",
      icon: "check_circle",
      titleColor: "text-emerald-800 dark:text-emerald-300",
    },
    error: {
      shell: "border-red-500/25 bg-[var(--app-surface)]/95 shadow-[0_8px_24px_rgba(239,68,68,0.10)]",
      iconWrap: "bg-red-500/12 text-red-600 dark:text-red-400",
      accentBar: "bg-red-500",
      icon: "error",
      titleColor: "text-red-800 dark:text-red-300",
    },
    info: {
      shell: "border-sky-500/25 bg-[var(--app-surface)]/95 shadow-[0_8px_24px_rgba(59,130,246,0.10)]",
      iconWrap: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
      accentBar: "bg-sky-500",
      icon: "info",
      titleColor: "text-sky-800 dark:text-sky-300",
    },
  }[tipo];

  const detalle = detalleCompacto(toast);
  const mostrarMensaje = !detalle && Boolean(mensaje);

  return (
    <div
      role="status"
      className={`pointer-events-auto relative overflow-hidden w-full rounded-2xl border backdrop-blur-md px-3 py-2.5 sm:px-3.5 sm:py-3 animate-toastIn ${config.shell}`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${config.iconWrap}`}
          aria-hidden
        >
          <MaterialIcon icon={config.icon} className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-black uppercase tracking-wide leading-none ${config.titleColor}`}>
            {titulo}
          </p>
          {detalle ? (
            <p className="mt-1 truncate text-[12px] font-semibold leading-snug text-[var(--app-text)]">
              {detalle}
            </p>
          ) : null}
          {mostrarMensaje ? (
            <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-snug text-[var(--app-text-muted)] sm:line-clamp-2">
              {mensaje}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onDismiss(id)}
          className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-[var(--app-text-faint)] transition-colors hover:bg-[var(--app-hover-overlay)] hover:text-[var(--app-text)]"
          aria-label="Cerrar notificación"
        >
          <MaterialIcon icon="close" className="h-3.5 w-3.5" />
        </button>
      </div>

      {autoDismissMs > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--app-border)]/60">
          <div
            className={`h-full ${config.accentBar}`}
            style={{
              animation: `toastShrink ${autoDismissMs}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
};

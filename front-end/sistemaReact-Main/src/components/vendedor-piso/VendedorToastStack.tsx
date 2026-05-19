import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useEffect, useRef } from "react";

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
  return (
    <>
      <style>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(100%) scale(0.9);
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
          animation: toastSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="fixed top-16 right-4 z-[120] flex flex-col gap-3 w-full max-w-sm pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
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

const VendedorToastCard = ({ toast, onDismiss }: VendedorToastCardProps) => {
  const { id, tipo, titulo, mensaje, producto, talla, color, cantidad, autoDismissMs = 5000 } = toast;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (autoDismissMs <= 0) return undefined;
    const timer = setTimeout(() => {
      onDismissRef.current(id);
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [id, autoDismissMs]);

  // Styling maps based on premium Dakani design aesthetics
  const config = {
    success: {
      bg: "bg-white/95 border-emerald-100 shadow-[0_15px_40px_rgba(16,185,129,0.12)]",
      badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-100",
      accentBar: "bg-emerald-500",
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" strokeWidth={2.5} />,
      titleColor: "text-emerald-950",
    },
    error: {
      bg: "bg-white/95 border-red-100 shadow-[0_15px_40px_rgba(239,68,68,0.12)]",
      badgeBg: "bg-red-50 text-red-700 border-red-100",
      accentBar: "bg-red-500",
      icon: <AlertTriangle className="h-5 w-5 text-red-500" strokeWidth={2.5} />,
      titleColor: "text-red-950",
    },
    info: {
      bg: "bg-white/95 border-blue-100 shadow-[0_15px_40px_rgba(59,130,246,0.12)]",
      badgeBg: "bg-blue-50 text-blue-700 border-blue-100",
      accentBar: "bg-blue-500",
      icon: <Info className="h-5 w-5 text-blue-500" strokeWidth={2.5} />,
      titleColor: "text-blue-950",
    },
  }[tipo];

  return (
    <div
      role="alert"
      className={`pointer-events-auto relative overflow-hidden w-full rounded-[2rem] border backdrop-blur-md p-4 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] animate-toastIn ${config.bg}`}
    >
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className="mt-0.5 shrink-0">
          {config.icon}
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <h4 className={`text-xs font-black uppercase tracking-wider leading-none mb-1 ${config.titleColor}`}>
            {titulo}
          </h4>
          <p className="text-xs font-semibold text-gray-500 leading-relaxed">
            {mensaje}
          </p>

          {/* Rich details about variants if provided */}
          {producto && (
            <div className="mt-2.5 flex flex-col gap-1">
              <span className="text-xs font-black text-black leading-tight block truncate">
                {producto}
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {talla && (
                  <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${config.badgeBg}`}>
                    Talla {talla}
                  </span>
                )}
                {color && (
                  <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${config.badgeBg}`}>
                    {color}
                  </span>
                )}
                {cantidad !== undefined && (
                  <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${config.badgeBg}`}>
                    Cant. {cantidad}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={() => onDismiss(id)}
          className="shrink-0 flex h-7 w-7 items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-black transition-colors"
          aria-label="Cerrar notificación"
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>

      {/* Shrinking visual countdown bar */}
      {autoDismissMs > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100/50">
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

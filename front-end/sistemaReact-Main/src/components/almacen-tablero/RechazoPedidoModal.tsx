import type { MotivoRechazoApi } from "../../types/AlmacenSolicitudes";
import { useModalMotion } from "@/shared/ui";

interface RechazoPedidoModalProps {
  nombreVendedor: string;
  abierto: boolean;
  cargando: boolean;
  onCerrar: () => void;
  onElegirMotivo: (m: MotivoRechazoApi) => void;
}

export function RechazoPedidoModal({
  nombreVendedor,
  abierto,
  cargando,
  onCerrar,
  onElegirMotivo,
}: RechazoPedidoModalProps) {
  const { overlayClass, panelClass, shouldRender, requestClose } = useModalMotion({ open: abierto });

  const handleCerrar = () => requestClose(onCerrar);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm ${overlayClass}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rechazo-titulo"
      onClick={handleCerrar}
    >
      <div
        className={`w-full max-w-lg rounded-3xl border border-app-border bg-app-surface/90 p-6 shadow-md backdrop-blur-md md:p-10 ${panelClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="rechazo-titulo"
          className="text-center text-xl font-bold leading-tight text-black md:text-2xl"
        >
          ¿Por qué rechazas el pedido de{" "}
          <span className="text-black underline decoration-gray-300 decoration-2 underline-offset-4">
            {nombreVendedor}
          </span>
          ?
        </h2>
        <div className="mt-8 flex flex-col gap-4">
          <button
            type="button"
            disabled={cargando}
            onClick={() => onElegirMotivo("SIN_STOCK_FISICO")}
            className="min-h-[64px] rounded-2xl bg-app-accent py-4 text-lg font-semibold text-app-accent-fg shadow-sm transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
          >
            No hay stock físico
          </button>
          <button
            type="button"
            disabled={cargando}
            onClick={() => onElegirMotivo("PRENDA_DEFECTUOSA")}
            className="min-h-[64px] rounded-2xl border border-app-border-strong bg-app-surface py-4 text-lg font-semibold text-app-text shadow-sm transition-all hover:bg-app-bg-muted active:scale-[0.99] disabled:opacity-50"
          >
            Prenda defectuosa
          </button>
          <button
            type="button"
            disabled={cargando}
            onClick={handleCerrar}
            className="mt-2 text-center text-sm font-semibold text-gray-600 underline-offset-2 transition-all hover:text-black hover:underline"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}

import type { MotivoRechazoApi } from "../../types/AlmacenCola";

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
  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rechazo-titulo"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white/90 p-6 shadow-md backdrop-blur-md md:p-10"
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
            className="min-h-[64px] rounded-2xl bg-black py-4 text-lg font-semibold text-white shadow-sm transition-all hover:bg-gray-800 active:scale-[0.99] disabled:opacity-50"
          >
            No hay stock físico
          </button>
          <button
            type="button"
            disabled={cargando}
            onClick={() => onElegirMotivo("PRENDA_DEFECTUOSA")}
            className="min-h-[64px] rounded-2xl border border-gray-200 bg-white py-4 text-lg font-semibold text-gray-900 shadow-sm transition-all hover:bg-gray-100 active:scale-[0.99] disabled:opacity-50"
          >
            Prenda defectuosa
          </button>
          <button
            type="button"
            disabled={cargando}
            onClick={onCerrar}
            className="mt-2 text-center text-sm font-semibold text-gray-600 underline-offset-2 transition-all hover:text-black hover:underline"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}

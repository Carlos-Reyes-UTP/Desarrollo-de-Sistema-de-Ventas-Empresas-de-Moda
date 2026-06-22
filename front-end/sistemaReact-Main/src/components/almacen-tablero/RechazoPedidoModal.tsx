import { useState } from "react";
import type { RechazoBody } from "../../types/AlmacenSolicitudes";
import { MaterialIcon, useModalMotion } from "@/shared/ui";

interface RechazoPedidoModalProps {
  nombreVendedor: string;
  abierto: boolean;
  cargando: boolean;
  onCerrar: () => void;
  onElegirMotivo: (body: RechazoBody) => void;
}

export function RechazoPedidoModal({
  nombreVendedor,
  abierto,
  cargando,
  onCerrar,
  onElegirMotivo,
}: RechazoPedidoModalProps) {
  const { overlayClass, panelClass, shouldRender, requestClose } = useModalMotion({ open: abierto });
  const [mostrarCustom, setMostrarCustom] = useState(false);
  const [comentario, setComentario] = useState("");
  const [motivoSeleccionado, setMotivoSeleccionado] = useState<RechazoBody | null>(null);

  const handleCerrar = () => {
    setMostrarCustom(false);
    setComentario("");
    setMotivoSeleccionado(null);
    requestClose(onCerrar);
  };

  const handleCustomConfirm = () => {
    const trimmed = comentario.trim();
    if (!trimmed) return;
    setMotivoSeleccionado({ motivo: "OTRO", comentario: trimmed });
    setComentario("");
    setMostrarCustom(false);
  };

  const handleConfirmRechazo = () => {
    if (motivoSeleccionado) {
      onElegirMotivo(motivoSeleccionado);
    }
  };

  if (!shouldRender) return null;

  if (motivoSeleccionado && !cargando) {
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
            {`¿Estás seguro de rechazar el pedido de ${nombreVendedor}?`}
          </h2>

          <div className="mt-8 flex flex-col gap-4">
            <button
              type="button"
              onClick={handleConfirmRechazo}
              className="min-h-[64px] rounded-2xl bg-app-accent py-4 text-lg font-semibold text-app-accent-fg shadow-sm transition-all hover:opacity-90 active:scale-[0.99]"
            >
              Sí, rechazar pedido
            </button>
            <button
              type="button"
              onClick={() => setMotivoSeleccionado(null)}
              className="text-center text-base font-semibold text-gray-600 underline-offset-2 transition-all hover:text-black hover:underline"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cargando) {
    return (
      <div
        className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm ${overlayClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rechazo-titulo"
      >
        <div
          className={`w-full max-w-lg rounded-3xl border border-app-border bg-app-surface/90 p-6 shadow-md backdrop-blur-md md:p-10 ${panelClass}`}
          onClick={(e) => e.stopPropagation()}
        >
          <h2
            id="rechazo-titulo"
            className="text-center text-xl font-bold leading-tight text-black md:text-2xl"
          >
            Rechazando pedido...
          </h2>

          <div className="mt-8 flex flex-col gap-4">
            <div className="flex items-center justify-center py-8">
              <MaterialIcon icon="sync" className="w-10 h-10 animate-spin text-app-accent" />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          {mostrarCustom
            ? "Describe el motivo"
            : `¿Por qué rechazas el pedido de ${nombreVendedor}?`
          }
        </h2>

        {mostrarCustom ? (
          <div className="mt-8 flex flex-col gap-4">
            <textarea
              autoFocus
              value={comentario}
              onChange={(e) => {
                if (e.target.value.length <= 200) {
                  setComentario(e.target.value);
                }
              }}
              placeholder="Escribe el motivo del rechazo..."
              className="w-full min-h-[120px] rounded-2xl border border-app-border-strong bg-app-input p-4 text-sm font-medium text-app-text resize-none outline-none focus:ring-2 focus:ring-[var(--app-ring)] transition-all"
              disabled={cargando}
            />
            <p className="text-[10px] font-bold text-gray-400 text-right -mt-2">
              {comentario.length}/200
            </p>
            <button
              type="button"
              disabled={!comentario.trim()}
              onClick={handleCustomConfirm}
              className="min-h-[56px] rounded-2xl bg-app-accent py-4 text-lg font-semibold text-app-accent-fg shadow-sm transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
            >
              Rechazar pedido
            </button>
            <button
              type="button"
              onClick={() => { setMostrarCustom(false); setComentario(""); }}
              className="text-center text-sm font-semibold text-gray-600 underline-offset-2 transition-all hover:text-black hover:underline"
            >
              Volver
            </button>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setMotivoSeleccionado({ motivo: "SIN_STOCK_FISICO" })}
              className="min-h-[64px] rounded-2xl border border-app-border-strong bg-app-surface py-4 text-lg font-semibold text-app-text shadow-sm transition-all hover:bg-app-bg-muted active:scale-[0.99]"
            >
              No hay stock físico
            </button>
            <button
              type="button"
              onClick={() => setMotivoSeleccionado({ motivo: "PRENDA_DEFECTUOSA" })}
              className="min-h-[64px] rounded-2xl border border-app-border-strong bg-app-surface py-4 text-lg font-semibold text-app-text shadow-sm transition-all hover:bg-app-bg-muted active:scale-[0.99]"
            >
              Prenda defectuosa
            </button>
            <button
              type="button"
              onClick={() => { setMostrarCustom(true); setComentario(""); }}
              className="min-h-[64px] rounded-2xl bg-app-accent py-4 text-lg font-semibold text-app-accent-fg shadow-sm transition-all hover:opacity-90 active:scale-[0.99]"
            >
              Otro motivo
            </button>
            <button
              type="button"
              onClick={handleCerrar}
              className="mt-5 text-center text-base font-semibold text-gray-600 underline-offset-2 transition-all hover:text-black hover:underline"
            >
              Volver
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import type { AlmacenSolicitud } from "../../types/AlmacenSolicitudes";

const SLA_SEC = 120;

function segundosEspera(iso: string): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 1000));
}

function formatoMmSs(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface AlmacenPedidoCardProps {
  card: AlmacenSolicitud;
  resaltar: boolean;
  modoVenta: boolean;
  onConfirmar: () => void;
  onRechazar: () => void;
  procesando: boolean;
}

export function AlmacenPedidoCard({
  card,
  resaltar,
  modoVenta,
  onConfirmar,
  onRechazar,
  procesando,
}: AlmacenPedidoCardProps) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const esperaSec = useMemo(
    () => segundosEspera(card.fechaCreacion),
    [card.fechaCreacion, tick]
  );
  const enAlerta = modoVenta && esperaSec >= SLA_SEC;

  const primera = card.lineas[0];
  const cantidadTotal = card.lineas.reduce((a, l) => a + l.cantidad, 0);
  const skuTxt = primera?.sku ?? "—";
  const descTxt = primera?.descripcion ?? "—";

  const baseCard =
    "relative flex flex-col rounded-2xl border p-4 shadow-sm backdrop-blur-md transition-all sm:p-5 " +
    (modoVenta
      ? "border-gray-200 bg-white/80"
      : "border-gray-200 bg-white/70");

  const resaltarClass =
    resaltar && modoVenta
      ? " ring-2 ring-black/20 ring-offset-1 ring-offset-[#fafafa] animate-pulse"
      : "";

  return (
    <article className={`${baseCard}${resaltarClass}`}>
      <header className="mb-3 border-b border-gray-200 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
          Venta para
        </p>
        <h2 className="mt-0.5 break-words text-2xl font-bold leading-tight tracking-tight text-black sm:text-3xl">
          {card.nombreVendedor}
        </h2>
      </header>

      <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0 space-y-1.5 text-left">
          <p className="font-mono text-xs font-semibold text-gray-600 sm:text-sm">
            SKU: <span className="text-black">{skuTxt}</span>
          </p>
          <p className="text-sm font-semibold leading-snug text-gray-900 sm:text-base">
            {descTxt}
          </p>
          {card.lineas.length > 1 && (
            <p className="text-xs text-gray-500">
              +{card.lineas.length - 1} línea(s) adicional(es)
            </p>
          )}
        </div>

        <div className="flex flex-col items-stretch justify-center gap-3 sm:min-w-[140px] sm:items-end">
          <div
            className="flex w-full flex-col items-center rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-center sm:w-auto sm:min-w-[132px]"
            role="group"
            aria-label={`Cantidad solicitada: ${cantidadTotal} unidades`}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Cantidad solicitada
            </p>
            <p className="mt-1 text-3xl font-black tabular-nums leading-none text-black sm:text-4xl">
              {cantidadTotal}
            </p>
            <p className="mt-1 text-xs font-semibold text-gray-600">
              {cantidadTotal === 1 ? "unidad" : "unidades"}
            </p>
          </div>
          <p
            className={`text-center text-xs font-semibold sm:text-right sm:text-sm ${
              enAlerta ? "text-red-500" : "text-gray-700"
            }`}
          >
            Espera:{" "}
            <span className="font-mono tabular-nums text-black">
              {formatoMmSs(esperaSec)}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={procesando}
          onClick={onConfirmar}
          className="min-h-[52px] rounded-xl bg-black py-3 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition-all hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50 sm:min-h-[56px] sm:text-base"
        >
          Confirmar
        </button>
        <button
          type="button"
          disabled={procesando}
          onClick={onRechazar}
          className="min-h-[48px] rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold uppercase tracking-wide text-gray-900 shadow-sm transition-all hover:bg-gray-100 active:scale-[0.98] disabled:opacity-50 sm:min-h-[52px]"
        >
          Rechazar
        </button>
      </div>
    </article>
  );
}

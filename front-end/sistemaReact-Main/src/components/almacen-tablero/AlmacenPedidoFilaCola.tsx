import type { AlmacenSolicitudCard } from "../../types/AlmacenCola";

interface AlmacenPedidoFilaColaProps {
  card: AlmacenSolicitudCard;
  urgente: boolean;
  seleccionado: boolean;
  resaltar: boolean;
  onClick: () => void;
}

function resumenLinea(card: AlmacenSolicitudCard): string {
  const l = card.lineas[0];
  if (!l) return "—";
  const d = l.descripcion.length > 48 ? `${l.descripcion.slice(0, 46)}…` : l.descripcion;
  return `${l.sku || "—"} · ${d}`;
}

export function AlmacenPedidoFilaCola({
  card,
  urgente,
  seleccionado,
  resaltar,
  onClick,
}: AlmacenPedidoFilaColaProps) {
  const cant = card.lineas.reduce((a, ln) => a + ln.cantidad, 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex w-full items-start gap-2 rounded-xl border p-2 text-left shadow-sm transition-all " +
        (seleccionado
          ? "border-black bg-gray-50 ring-1 ring-black/10"
          : "border-gray-200 bg-white/90 hover:bg-gray-100") +
        (resaltar ? " ring-2 ring-black/20 animate-pulse" : "")
      }
    >
      <span
        className={
          "mt-2 h-2 w-2 shrink-0 rounded-full " +
          (urgente ? "bg-black" : "bg-gray-300")
        }
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-black">
          {card.nombreVendedor}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-gray-600">
          {resumenLinea(card)}
        </p>
      </div>
      <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-bold tabular-nums text-black">
        {cant}
      </span>
    </button>
  );
}

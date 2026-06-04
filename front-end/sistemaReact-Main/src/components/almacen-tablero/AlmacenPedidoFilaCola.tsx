import type { AlmacenSolicitud } from "../../types/AlmacenSolicitudes";

interface AlmacenPedidoFilaColaProps {
  card: AlmacenSolicitud;
  urgente: boolean;
  seleccionado: boolean;
  resaltar: boolean;
  onClick: () => void;
}

function resumenLinea(card: AlmacenSolicitud): string {
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
        ? "border-app-border-strong bg-app-bg-muted ring-1 ring-app-ring"
        : "border-app-border bg-app-surface/90 hover:bg-app-bg-muted") +
      (resaltar ? " ring-2 ring-app-ring animate-pulse" : "")
      }
    >
      <span
        className={
          "mt-2 h-2 w-2 shrink-0 rounded-full " +
          (urgente ? "bg-app-accent" : "bg-app-border-strong")
        }
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-app-text">
          {card.nombreVendedor}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-app-text-muted">
          {resumenLinea(card)}
        </p>
      </div>
      <span className="shrink-0 rounded-full border border-app-border-strong bg-app-bg-muted px-2 py-0.5 text-xs font-bold tabular-nums text-app-text">
        {cant}
      </span>
    </button>
  );
}

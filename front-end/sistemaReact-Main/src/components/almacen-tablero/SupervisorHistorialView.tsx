import { MaterialIcon } from "@/shared/ui";
import type { SupervisorHistorialSolicitudItem } from "@/types/AlmacenSolicitudes";

interface Props {
  items: SupervisorHistorialSolicitudItem[];
  seleccionId: number | null;
  cargando: boolean;
  onSelect: (id: number) => void;
  onRefresh: () => void;
}

function formatearFecha(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const anio = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dia}/${mes}/${anio} ${hora}:${min}`;
  } catch {
    return iso;
  }
}

export function SupervisorHistorialView({
  items,
  seleccionId,
  cargando,
  onSelect,
  onRefresh,
}: Props) {
  if (cargando && items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <MaterialIcon icon="hourglass_top" className="w-8 h-8 app-text-faint animate-spin" />
          <p className="text-[10px] font-black app-text-faint uppercase tracking-[0.2em]">
            Cargando...
          </p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="h-16 w-16 rounded-[1.5rem] bg-[var(--app-surface)] border border-[var(--app-border)] shadow-sm flex items-center justify-center mb-4">
          <MaterialIcon icon="history" className="w-8 h-8 app-text-faint" />
        </div>
        <p className="text-[10px] font-black app-text-faint uppercase tracking-[0.2em] text-center">
          No hay solicitudes para esta fecha
        </p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-4 text-[9px] font-black text-[var(--app-accent)] uppercase tracking-widest hover:underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
      {items.map((item) => {
        const seleccionado = item.idSolicitud === seleccionId;
        const esAtendido = item.estado === "ATENDIDO";
        const totalUds = item.lineas.reduce((s, l) => s + l.cantidad, 0);

        return (
          <button
            key={item.idSolicitud}
            type="button"
            onClick={() => onSelect(item.idSolicitud)}
            className={`group relative w-full flex flex-col gap-2.5 p-4 rounded-[2rem] border-2 transition-all duration-300 text-left overflow-hidden ${
              seleccionado
                ? "bg-app-accent border-app-accent shadow-xl scale-[1.01] pl-7"
                : esAtendido
                  ? "bg-emerald-50/70 border-emerald-100/80 shadow-[0_4px_12px_rgba(16,185,129,0.01)] hover:border-emerald-300 hover:bg-emerald-50 active:scale-[0.99]"
                  : "bg-red-50/75 border-red-100/90 shadow-[0_4px_18px_rgba(239,68,68,0.05)] hover:border-red-300 hover:bg-red-50 active:scale-[0.99]"
            }`}
          >
            {seleccionado && (
              <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-9 rounded-full animate-fadeIn ${
                esAtendido ? "bg-emerald-400" : "bg-red-400"
              }`} />
            )}

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full ${
                seleccionado
                  ? "bg-app-surface/20 text-app-accent-fg/70"
                  : "bg-app-text-muted/10 text-app-text-muted"
              }`}>
                {item.tipoSolicitud === "VENTA" ? "VENTA" : "REPOSICIÓN"}
              </span>
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${
                seleccionado
                  ? esAtendido ? "bg-emerald-500/30 text-emerald-300" : "bg-red-500/30 text-red-300"
                  : esAtendido
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
              }`}>
                {item.estado}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                seleccionado
                  ? "bg-app-surface/10 text-app-accent-fg"
                  : esAtendido
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-red-100 text-red-600"
              }`}>
                <MaterialIcon icon="person" className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-black uppercase tracking-tight truncate ${
                  seleccionado ? "text-app-accent-fg" : "text-app-text"
                }`}>
                  {item.nombreVendedor || "Sin vendedor"}
                </p>
                <div className={`flex items-center gap-1.5 mt-0.5 flex-wrap ${
                  seleccionado ? "text-app-accent-fg/50" : "text-app-text-muted"
                }`}>
                  <span className="text-[11px] font-bold">{totalUds} uds · {item.lineas.length} líneas</span>
                  <span className="text-[11px] opacity-60">·</span>
                  <span className="text-[11px] font-bold">{formatearFecha(item.fechaCreacion)}</span>
                </div>
              </div>
            </div>

            {item.motivoRechazo && !esAtendido && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                seleccionado
                  ? "bg-red-500/20 border-red-400/30 text-red-300"
                  : "bg-red-50 border-red-100 text-red-600"
              }`}>
                <MaterialIcon icon="info" className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[9px] font-bold uppercase tracking-wider">
                  {item.motivoRechazo === "SIN_STOCK_FISICO"
                    ? "Sin stock"
                    : item.motivoRechazo === "PRENDA_DEFECTUOSA"
                      ? "Defectuosa"
                      : "Otro motivo"}
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

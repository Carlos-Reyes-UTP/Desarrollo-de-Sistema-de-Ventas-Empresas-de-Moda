import { MaterialIcon } from "@/shared/ui";
import type { SupervisorHistorialSolicitudItem } from "../../types/AlmacenSolicitudes";
import { AlmacenSolicitudRuta } from "./AlmacenSolicitudRuta";
import {
  resumenDestinoDeSolicitud,
  resumenOrigenDeSolicitud,
} from "../../utils/solicitudUbicacion";

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

interface Props {
  item: SupervisorHistorialSolicitudItem;
}

export function SupervisorHistorialDetailView({ item }: Props) {
  const esAtendido = item.estado === "ATENDIDO";

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col gap-5 mb-6 shrink-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-stretch gap-5 min-w-0 flex-1 flex-wrap">
            <div className="flex items-center gap-4 min-w-0 shrink-0">
              <div className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center ${
                esAtendido ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
              }`}>
                <MaterialIcon
                  icon={esAtendido ? "check_circle" : "cancel"}
                  className="w-6 h-6"
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl font-black text-app-text leading-tight uppercase tracking-tight truncate">
                  {item.nombreVendedor}
                </h2>
                <p className="text-sm font-bold text-gray-500 mt-0.5">
                  {formatearFecha(item.fechaCreacion)}
                </p>
              </div>
            </div>

            <div className="w-px bg-app-border self-stretch shrink-0 hidden sm:block" />

            <div className="flex items-center gap-3 min-w-0 shrink-0">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-app-text-muted/10 flex items-center justify-center">
                <MaterialIcon icon="person" className="w-6 h-6 text-app-text-muted" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] leading-none">
                  Atendido por
                </p>
                <p className="text-sm font-bold text-gray-700 truncate mt-1">
                  {item.nombreUsuarioAtendio || "—"}
                </p>
              </div>
            </div>

            <div className="w-px bg-app-border self-stretch shrink-0 hidden sm:block" />

            <div className="flex flex-col gap-1.5 justify-center shrink-0">
              <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] leading-none">
                Tipo de solicitud
              </p>
              <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-app-surface border border-app-border text-app-text-muted self-start">
                {item.tipoSolicitud}
              </span>
            </div>
          </div>
          <span className={`shrink-0 px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider border-2 ${
            esAtendido
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}>
            {item.estado}
          </span>
        </div>

        <AlmacenSolicitudRuta
          origen={resumenOrigenDeSolicitud(item)}
          destino={resumenDestinoDeSolicitud(item)}
        />

        {!esAtendido && item.motivoRechazo && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <MaterialIcon icon="info" className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">
                Motivo de rechazo
              </p>
            </div>
            <p className="text-sm font-bold text-red-800">
              {item.motivoRechazo === "SIN_STOCK_FISICO"
                ? "Sin stock físico"
                : item.motivoRechazo === "PRENDA_DEFECTUOSA"
                  ? "Prenda defectuosa"
                  : item.motivoRechazo}
            </p>
            {item.comentarioRechazo && (
              <div className="mt-2 pt-2 border-t border-red-100">
                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">
                  Comentario del almacenero
                </p>
                <p className="text-sm text-red-700 italic">
                  "{item.comentarioRechazo}"
                </p>
              </div>
            )}
          </div>
        )}

        {item.codigoLote && (
          <div className="bg-gray-100/50 rounded-2xl p-4 flex items-center gap-3 border border-gray-100">
            <MaterialIcon icon="package" className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest truncate">
              Lote: {item.codigoLote}
            </span>
          </div>
        )}
      </div>

        <div className="flex-1 min-h-0 space-y-3 pb-8">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
          Ítems solicitados
        </p>

        {item.lineas.map((linea, idx) => (
          <div
            key={`hd-${idx}-${linea.idVariante}`}
            className="w-full flex items-center justify-between p-5 rounded-[2rem] border-2 bg-app-surface border-app-border shadow-sm"
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-app-bg-muted text-app-text-muted shrink-0">
                <span className="text-lg font-black">{linea.cantidad}</span>
              </div>
              <div className="min-w-0">
                <h4 className="font-black text-app-text text-sm uppercase leading-tight line-clamp-2">
                  {linea.descripcion}
                </h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5 truncate">
                  SKU: {linea.sku || "—"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

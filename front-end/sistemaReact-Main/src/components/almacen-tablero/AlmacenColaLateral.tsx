import type { ReactNode } from "react";
import type { AlmacenSolicitudCard } from "../../types/AlmacenCola";
import { AlmacenPedidoFilaCola } from "./AlmacenPedidoFilaCola";

interface AlmacenColaLateralProps {
  ventas: AlmacenSolicitudCard[];
  repos: AlmacenSolicitudCard[];
  seleccionId: number | null;
  pulsando: Set<number>;
  onSelect: (id: number) => void;
  /** Encabezado opcional (p. ej. cerrar en móvil) */
  encabezadoExtra?: ReactNode;
}

export function AlmacenColaLateral({
  ventas,
  repos,
  seleccionId,
  pulsando,
  onSelect,
  encabezadoExtra,
}: AlmacenColaLateralProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {encabezadoExtra}
      <div className="flex min-h-0 max-h-[46%] flex-col border-b border-gray-200">
        <div className="shrink-0 border-b border-gray-100 bg-gray-50/90 px-2 py-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
            Venta en piso
          </p>
          <p className="text-xs font-medium text-gray-700">
            {ventas.length} pendiente{ventas.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {ventas.length === 0 ? (
            <p className="px-1 py-4 text-center text-[11px] text-gray-500">
              Sin pedidos urgentes.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {ventas.map((c) => (
                <li key={c.idSolicitud}>
                  <AlmacenPedidoFilaCola
                    card={c}
                    urgente
                    seleccionado={seleccionId === c.idSolicitud}
                    resaltar={pulsando.has(c.idSolicitud)}
                    onClick={() => onSelect(c.idSolicitud)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-gray-100 bg-white px-2 py-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
            Reposición
          </p>
          <p className="text-xs font-medium text-gray-700">
            {repos.length} en cola
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {repos.length === 0 ? (
            <p className="px-1 py-4 text-center text-[11px] text-gray-500">
              Cola vacía.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {repos.map((c) => (
                <li key={c.idSolicitud}>
                  <AlmacenPedidoFilaCola
                    card={c}
                    urgente={false}
                    seleccionado={seleccionId === c.idSolicitud}
                    resaltar={false}
                    onClick={() => onSelect(c.idSolicitud)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

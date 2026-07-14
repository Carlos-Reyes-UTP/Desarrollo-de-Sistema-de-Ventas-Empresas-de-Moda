import { MaterialIcon, SectionHeader } from '@/shared/ui';
import { DashboardPanel } from '@/shared/ui/dashboard/DashboardPanel';
import type { Venta } from '@/types/Venta';
import { etiquetaMetodoPago } from '@/utils/dashboardMes';

const formatterMonedaPE = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

export interface DashboardRecentSalesTableProps {
  ventas: Venta[];
  onVerHistorial?: () => void;
}

export function DashboardRecentSalesTable({ ventas, onVerHistorial }: DashboardRecentSalesTableProps) {
  return (
    <DashboardPanel>
      <SectionHeader
        title={`Últimas ventas (${ventas.length})`}
        action={
          onVerHistorial ? (
            <button
              type="button"
              onClick={onVerHistorial}
              className="app-btn-primary rounded-xl px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)]"
            >
              Ver historial
            </button>
          ) : undefined
        }
      />
      {ventas.length === 0 ? (
        <div className="py-10 flex flex-col items-center gap-2 text-center">
          <MaterialIcon icon="receipt_long" className="w-8 h-8 app-text-faint" />
          <p className="text-sm font-bold app-heading">Aún no hay ventas registradas</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--app-border)]">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">
                  Hora
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">
                  Detalle
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">
                  Método
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-black app-text-faint uppercase tracking-wider">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--app-border)]">
              {ventas.map((v) => {
                const fecha = new Date(v.fechaVenta);
                const hora = Number.isNaN(fecha.getTime())
                  ? '—'
                  : fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
                const items = v.detalles?.reduce((s, d) => s + (d.cantidad ?? 0), 0) ?? 0;
                return (
                  <tr key={v.idVenta ?? `${v.fechaVenta}-${v.totalVentas}`}>
                    <td className="px-4 py-3 text-sm tabular-nums app-heading">{hora}</td>
                    <td className="px-4 py-3 text-sm app-heading">
                      {v.tipoComprobante || 'Venta'}
                      {v.idVenta != null ? ` #${v.idVenta}` : ''}
                      <span className="app-text-muted"> · {items} ítems</span>
                    </td>
                    <td className="px-4 py-3 text-sm app-text-muted">{etiquetaMetodoPago(v.metodoPago)}</td>
                    <td className="px-4 py-3 text-sm font-bold tabular-nums text-right app-heading">
                      {formatterMonedaPE.format(v.totalVentas ?? 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardPanel>
  );
}

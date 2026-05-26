import { MaterialIcon } from '@/shared/ui';
import type { DatosVentaBoleta } from './types';

interface VentaCompletadaModalProps {
  open: boolean;
  datos: DatosVentaBoleta | null;
  onPrint: () => void;
  onClose: () => void;
}

export const VentaCompletadaModal = ({
  open,
  datos,
  onPrint,
  onClose,
}: VentaCompletadaModalProps) => {
  if (!open || !datos) return null;

  return (
    <div className="caj-modal-overlay fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="caj-modal-panel rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn border caj-border">

        <div className="caj-banner px-8 py-6 flex items-center gap-4">
          <div className="w-10 h-10 caj-banner-icon-wrap rounded-2xl flex items-center justify-center flex-shrink-0">
            <MaterialIcon icon="check_circle" className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[11px] font-bold tracking-[0.3em] uppercase">Venta Registrada</h3>
            <p className="caj-banner-muted text-[10px] font-medium uppercase tracking-widest mt-0.5">Transacción completada exitosamente</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full caj-pulse-dot animate-pulse"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest">OK</span>
          </div>
        </div>

        <div className="px-8 pt-7 pb-4 text-center">
          <span className="caj-text-faint block text-[10px] font-bold uppercase tracking-[0.3em] mb-1">Total cobrado</span>
          <span className="caj-heading text-[44px] font-extrabold tracking-tighter leading-none">
            S/{datos.totalGeneral.toFixed(2)}
          </span>
        </div>

        <div className="px-8 pb-2 grid grid-cols-1 gap-3">
          <div className="caj-detail-tile rounded-[1.5rem] p-5 border flex items-center gap-4">
            <div className="w-8 h-8 caj-icon-chip rounded-xl flex items-center justify-center flex-shrink-0">
              <MaterialIcon icon="person" className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="caj-text-faint block text-[9px] font-bold uppercase tracking-[0.3em] mb-0.5">Cliente</span>
              <span className="caj-heading text-[13px] font-bold truncate block">{datos.cliente}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="caj-detail-tile rounded-[1.5rem] p-5 border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 caj-icon-chip rounded-lg flex items-center justify-center">
                  <MaterialIcon icon="credit_card" className="h-3.5 w-3.5" />
                </div>
              </div>
              <span className="caj-text-faint block text-[9px] font-bold uppercase tracking-[0.25em] mb-1">Método de Pago</span>
              <span className="caj-heading text-[12px] font-bold capitalize">{datos.metodoPago}</span>
            </div>

            <div className="caj-detail-tile rounded-[1.5rem] p-5 border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 caj-icon-chip rounded-lg flex items-center justify-center">
                  <MaterialIcon icon="badge" className="h-3.5 w-3.5" />
                </div>
              </div>
              <span className="caj-text-faint block text-[9px] font-bold uppercase tracking-[0.25em] mb-1">Vendedor</span>
              <span className="caj-heading text-[12px] font-bold">{datos.usuarioVendedor}</span>
            </div>
          </div>
        </div>

        <div className="px-8 py-7 flex gap-3">
          <button
            onClick={onPrint}
            className="flex-1 flex items-center justify-center gap-2 py-4 caj-surface-muted border caj-border rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] caj-text-muted hover:opacity-80 transition-all"
          >
            <MaterialIcon icon="print" className="w-4 h-4" />
            Imprimir Boleta
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-4 caj-btn-primary rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] transition-all shadow-[0_8px_24px_rgba(0,0,0,0.15)] active:scale-[0.97]"
          >
            Nueva Venta
          </button>
        </div>
      </div>
    </div>
  );
};

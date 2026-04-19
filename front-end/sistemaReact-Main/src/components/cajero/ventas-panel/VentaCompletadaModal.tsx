import { CheckCircle, Printer, User, CreditCard, UserCheck } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm w-full max-w-md overflow-hidden animate-scaleIn">

        {/* Header */}
        <div className="bg-black px-8 py-6 flex items-center gap-4">
          <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-[11px] font-bold tracking-[0.3em] text-white uppercase">Venta Registrada</h3>
            <p className="text-gray-400 text-[10px] font-medium uppercase tracking-widest mt-0.5">Transacción completada exitosamente</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">OK</span>
          </div>
        </div>

        {/* Total destacado */}
        <div className="px-8 pt-7 pb-4 text-center">
          <span className="block text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em] mb-1">Total cobrado</span>
          <span className="text-[44px] font-extrabold text-black tracking-tighter leading-none">
            S/{datos.totalGeneral.toFixed(2)}
          </span>
        </div>

        {/* Info grid */}
        <div className="px-8 pb-2 grid grid-cols-1 gap-3">
          <div className="bg-[#fafafa] rounded-[1.5rem] p-5 border border-gray-50 flex items-center gap-4">
            <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <span className="block text-[9px] font-bold text-gray-300 uppercase tracking-[0.3em] mb-0.5">Cliente</span>
              <span className="text-[13px] font-bold text-black truncate block">{datos.cliente}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#fafafa] rounded-[1.5rem] p-5 border border-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
                  <CreditCard className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
              <span className="block text-[9px] font-bold text-gray-300 uppercase tracking-[0.25em] mb-1">Método de Pago</span>
              <span className="text-[12px] font-bold text-black capitalize">{datos.metodoPago}</span>
            </div>

            <div className="bg-[#fafafa] rounded-[1.5rem] p-5 border border-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
                  <UserCheck className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
              <span className="block text-[9px] font-bold text-gray-300 uppercase tracking-[0.25em] mb-1">Vendedor</span>
              <span className="text-[12px] font-bold text-black">{datos.usuarioVendedor}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-8 py-7 flex gap-3">
          <button
            onClick={onPrint}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#f8f8f8] border border-gray-100 rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] text-gray-600 hover:bg-gray-100 transition-all"
          >
            <Printer className="w-4 h-4" />
            Imprimir Boleta
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-black text-white rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-gray-800 transition-all shadow-[0_8px_24px_rgba(0,0,0,0.15)] active:scale-[0.97]"
          >
            Nueva Venta
          </button>
        </div>
      </div>
    </div>
  );
};

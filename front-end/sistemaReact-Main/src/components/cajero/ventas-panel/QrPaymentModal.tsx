import { CheckCircle, Loader2, Smartphone, X } from 'lucide-react';

interface QrPaymentModalProps {
  open: boolean;
  tipo: string;
  qrUrl: string;
  total: number;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const QrPaymentModal = ({
  open,
  tipo,
  qrUrl,
  total,
  loading,
  onCancel,
  onConfirm,
}: QrPaymentModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm w-full max-w-sm overflow-hidden animate-scaleIn">

        {/* Header */}
        <div className="bg-black px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-[11px] font-bold tracking-[0.3em] text-white uppercase">Pago con {tipo}</h3>
              <p className="text-gray-400 text-[10px] font-medium uppercase tracking-widest mt-0.5">Escanea el código QR</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Total */}
        <div className="px-8 pt-7 pb-2 text-center">
          <span className="block text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em] mb-1">Total a pagar</span>
          <span className="text-[38px] font-extrabold text-black tracking-tighter leading-none">S/{total.toFixed(2)}</span>
        </div>

        {/* QR Code */}
        <div className="px-8 py-5">
          <div className="bg-[#fafafa] rounded-[2rem] p-5 border border-gray-100">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrUrl)}`}
              alt="Código QR de pago"
              className="w-full h-auto rounded-xl"
            />
          </div>
          <p className="text-center text-[11px] text-gray-400 font-medium mt-4">
            Abre la aplicación <span className="text-black font-bold">{tipo}</span> y escanea el código
          </p>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-4 bg-[#f8f8f8] border border-gray-100 rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:bg-gray-100 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-4 bg-black text-white rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-gray-800 transition-all shadow-[0_8px_24px_rgba(0,0,0,0.15)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="animate-spin w-4 h-4" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            <span>Confirmar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

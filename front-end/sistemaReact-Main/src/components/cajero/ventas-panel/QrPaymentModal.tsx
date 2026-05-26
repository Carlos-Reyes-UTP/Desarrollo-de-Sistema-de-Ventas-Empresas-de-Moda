import { MaterialIcon } from '@/shared/ui';

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
    <div className="caj-modal-overlay fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="caj-modal-panel rounded-[3rem] shadow-2xl w-full max-w-sm overflow-hidden animate-scaleIn border caj-border">

        <div className="caj-banner px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 caj-banner-icon-wrap rounded-2xl flex items-center justify-center flex-shrink-0">
              <MaterialIcon icon="smartphone" className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[11px] font-bold tracking-[0.3em] uppercase">Pago con {tipo}</h3>
              <p className="caj-banner-muted text-[10px] font-medium uppercase tracking-widest mt-0.5">Escanea el código QR</p>
            </div>
          </div>
          <button type="button" onClick={onCancel} className="w-8 h-8 caj-banner-icon-wrap rounded-xl flex items-center justify-center hover:opacity-80 transition-all">
            <MaterialIcon icon="close" className="w-4 h-4" />
          </button>
        </div>

        <div className="px-8 pt-7 pb-2 text-center">
          <span className="caj-text-faint block text-[10px] font-bold uppercase tracking-[0.3em] mb-1">Total a pagar</span>
          <span className="caj-heading text-[38px] font-extrabold tracking-tighter leading-none">S/{total.toFixed(2)}</span>
        </div>

        <div className="px-8 py-5">
          <div className="caj-detail-tile rounded-[2rem] p-5 border">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrUrl)}`}
              alt="Código QR de pago"
              className="w-full h-auto rounded-xl"
            />
          </div>
          <p className="text-center text-[11px] caj-text-muted font-medium mt-4">
            Abre la aplicación <span className="caj-heading font-bold">{tipo}</span> y escanea el código
          </p>
        </div>

        <div className="px-8 pb-8 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-4 caj-surface-muted border caj-border rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] caj-text-muted hover:opacity-80 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-4 caj-btn-primary rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] transition-all shadow-[0_8px_24px_rgba(0,0,0,0.15)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <MaterialIcon icon="progress_activity" className="animate-spin w-4 h-4" />
            ) : (
              <MaterialIcon icon="check_circle" className="w-4 h-4" />
            )}
            <span>Confirmar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

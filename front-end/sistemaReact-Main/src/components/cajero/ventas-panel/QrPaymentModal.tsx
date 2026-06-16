import { MaterialIcon, useModalMotion } from '@/shared/ui';

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
  const { overlayClass, panelClass, shouldRender, requestClose } = useModalMotion({ open });

  if (!shouldRender) return null;

  const handleCancel = () => requestClose(onCancel);

  return (
    <div className={`caj-modal-overlay fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${overlayClass}`}>
      <div className={`caj-modal-panel rounded-[3rem] shadow-2xl w-full max-w-sm overflow-hidden border caj-border ${panelClass}`}>

        <div className="caj-banner px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 caj-banner-icon-wrap rounded-2xl flex items-center justify-center flex-shrink-0">
              <MaterialIcon icon="qr_code_2" className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[11px] font-bold tracking-[0.3em] uppercase">Pago con {tipo}</h3>
              <p className="caj-banner-muted text-[10px] font-medium uppercase tracking-widest mt-0.5">Escanea el código QR</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="w-9 h-9 caj-banner-icon-wrap rounded-xl flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-40"
            aria-label="Cerrar"
          >
            <MaterialIcon icon="close" className="w-4 h-4" />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center gap-6">
          {qrUrl ? (
            <img src={qrUrl} alt={`QR de pago ${tipo}`} className="w-48 h-48 rounded-2xl border caj-border object-contain bg-white" />
          ) : (
            <div className="w-48 h-48 rounded-2xl border caj-border flex items-center justify-center caj-text-faint text-xs font-bold uppercase tracking-widest">
              Generando QR...
            </div>
          )}
          <p className="caj-heading text-3xl font-black tracking-tighter">
            S/{total.toFixed(2)}
          </p>
        </div>

        <div className="px-8 pb-8 flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 py-4 caj-btn-secondary rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !qrUrl}
            className="flex-1 py-4 caj-btn-primary rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] transition-all disabled:opacity-50"
          >
            {loading ? 'Verificando...' : 'Confirmar pago'}
          </button>
        </div>
      </div>
    </div>
  );
};

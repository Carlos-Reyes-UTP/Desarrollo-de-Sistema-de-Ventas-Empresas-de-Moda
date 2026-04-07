import { CheckCircle, Loader2, Smartphone } from 'lucide-react';

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
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full animate-scaleIn">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Pagar con {tipo}</h3>
          <p className="text-gray-600">Escanea el código QR para pagar</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">S/{total.toFixed(2)}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border-2 border-gray-100 mb-6">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
              qrUrl
            )}`}
            alt="QR Code"
            className="w-full h-auto rounded-lg"
          />
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Abre la aplicación {tipo} y escanea el código
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 px-4 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-gray-400 transition-colors font-medium flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Confirmar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


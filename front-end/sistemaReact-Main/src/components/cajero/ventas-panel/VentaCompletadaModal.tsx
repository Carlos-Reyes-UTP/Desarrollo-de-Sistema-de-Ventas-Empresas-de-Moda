import { CheckCircle, Printer } from 'lucide-react';
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
  if (!open || !datos) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full animate-scaleIn">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">¡Venta Completada!</h3>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Cliente:</span>
                <span className="font-medium text-gray-900">{datos.cliente}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Método de pago:</span>
                <span className="font-medium text-gray-900 capitalize">{datos.metodoPago}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Vendedor:</span>
                <span className="font-medium text-gray-900">{datos.usuarioVendedor}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total Pagado:</span>
                  <span className="text-2xl font-bold text-green-600">
                    S/{datos.totalGeneral.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onPrint}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Printer className="w-5 h-5" />
            Imprimir Boleta
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};


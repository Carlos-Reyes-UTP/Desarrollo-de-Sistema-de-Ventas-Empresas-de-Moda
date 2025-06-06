import { useState } from 'react';

interface CierreCajaProps {
  onCierreCompleto: () => void;
}

const CierreCaja = ({ onCierreCompleto }: CierreCajaProps) => {
  const [montoFinal, setMontoFinal] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [cargando, setCargando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Datos simulados - en una implementación real vendrían de la API
  const datosSimulados = {
    fechaApertura: new Date().toISOString().split('T')[0],
    fechaCierre: new Date().toISOString().split('T')[0],
    montoInicial: 800,
    totalVentas: 6860,
    efectivo: 3250,
    tarjeta: 2860,
    yape: 750,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!montoFinal || parseFloat(montoFinal) <= 0) {
      setError('Por favor ingrese un monto final válido');
      return;
    }

    try {
      setCargando(true);
      // Aquí iría la lógica para registrar el cierre de caja
      // Por ahora solo simulamos un delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Al completar exitosamente
      onCierreCompleto();
    } catch (err) {
      setError('Ocurrió un error al registrar el cierre de caja');
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Cierre de Caja</h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-600 text-sm">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cajero
              </label>
              <input
                type="text"
                value="Cajero 1"
                readOnly
                className="w-full px-4 py-2 border rounded-md bg-gray-100"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de apertura
                </label>
                <input
                  type="date"
                  value={datosSimulados.fechaApertura}
                  readOnly
                  className="w-full px-4 py-2 border rounded-md bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de cierre
                </label>
                <input
                  type="date"
                  value={datosSimulados.fechaCierre}
                  readOnly
                  className="w-full px-4 py-2 border rounded-md bg-gray-100"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monto inicial
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">S/</span>
                  </div>
                  <input
                    type="text"
                    value={datosSimulados.montoInicial.toFixed(2)}
                    readOnly
                    className="w-full pl-10 py-2 border rounded-md bg-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total ventas
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">S/</span>
                  </div>
                  <input
                    type="text"
                    value={datosSimulados.totalVentas.toFixed(2)}
                    readOnly
                    className="w-full pl-10 py-2 border rounded-md bg-gray-100"
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Efectivo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">S/</span>
                  </div>
                  <input
                    type="text"
                    value={datosSimulados.efectivo.toFixed(2)}
                    readOnly
                    className="w-full pl-10 py-2 border rounded-md bg-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tarjeta
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">S/</span>
                  </div>
                  <input
                    type="text"
                    value={datosSimulados.tarjeta.toFixed(2)}
                    readOnly
                    className="w-full pl-10 py-2 border rounded-md bg-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yape/Plin
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">S/</span>
                  </div>
                  <input
                    type="text"
                    value={datosSimulados.yape.toFixed(2)}
                    readOnly
                    className="w-full pl-10 py-2 border rounded-md bg-gray-100"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto final en caja (efectivo contado)
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">S/</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={montoFinal}
                  onChange={(e) => setMontoFinal(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                rows={3}
                className="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ingrese cualquier observación sobre el cierre de caja..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              ></textarea>
            </div>
            
            <div className="mt-6">
              <button
                type="submit"
                disabled={cargando}
                className={`w-full px-4 py-2 ${
                  cargando ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                } text-white rounded-md transition-colors`}
              >
                {cargando ? 'Procesando...' : 'Cerrar Caja'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CierreCaja;
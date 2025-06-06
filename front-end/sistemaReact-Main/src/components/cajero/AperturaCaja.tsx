import { useState } from 'react';

interface AperturaCajaProps {
  onAperturaCompleta: () => void;
}

const AperturaCaja = ({ onAperturaCompleta }: AperturaCajaProps) => {
  const [montoApertura, setMontoApertura] = useState<string>('');
  const [fechaApertura, setFechaApertura] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [cargando, setCargando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!montoApertura || parseFloat(montoApertura) <= 0) {
      setError('Por favor ingrese un monto válido');
      return;
    }

    try {
      setCargando(true);
  
      await new Promise(resolve => setTimeout(resolve, 1000));
      

      onAperturaCompleta();
    } catch (err) {
      setError('Ocurrió un error al registrar la apertura de caja');
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Apertura de Caja</h2>
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
                Usuario
              </label>
              <input
                type="text"
                value="Cajero 1"
                readOnly
                className="w-full px-4 py-2 border rounded-md bg-gray-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha
              </label>
              <input
                type="date"
                value={fechaApertura}
                onChange={(e) => setFechaApertura(e.target.value)}
                className="w-full px-4 py-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto de apertura
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
                  value={montoApertura}
                  onChange={(e) => setMontoApertura(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="mt-6">
              <button
                type="submit"
                disabled={cargando}
                className={`w-full px-4 py-2 ${
                  cargando ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                } text-white rounded-md transition-colors`}
              >
                {cargando ? 'Procesando...' : 'Aceptar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AperturaCaja;
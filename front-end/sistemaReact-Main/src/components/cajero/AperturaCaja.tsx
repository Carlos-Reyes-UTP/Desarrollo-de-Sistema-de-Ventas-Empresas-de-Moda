import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Printer, CheckCircle, Clock, User, DollarSign } from 'lucide-react';

interface AperturaCajaProps {
  onAperturaCompleta: () => void;
}

const AperturaCaja = ({ onAperturaCompleta }: AperturaCajaProps) => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [montoApertura, setMontoApertura] = useState<string>('');
  const [fechaHoraApertura, setFechaHoraApertura] = useState<string>('');
  const [cargando, setCargando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [aperturaExitosa, setAperturaExitosa] = useState<boolean>(false);
  const [datosApertura, setDatosApertura] = useState<any>(null);

  // Función para obtener fecha y hora actual en formato dd/mm/yyyy - hh:mm:ss
  const obtenerFechaHoraActual = () => {
    const ahora = new Date();
    const dia = ahora.getDate().toString().padStart(2, '0');
    const mes = (ahora.getMonth() + 1).toString().padStart(2, '0');
    const año = ahora.getFullYear();
    const horas = ahora.getHours().toString().padStart(2, '0');
    const minutos = ahora.getMinutes().toString().padStart(2, '0');
    const segundos = ahora.getSeconds().toString().padStart(2, '0');
    
    return `${dia}/${mes}/${año} - ${horas}:${minutos}:${segundos}`;
  };

  // Inicializar fecha y hora actual
  useEffect(() => {
    setFechaHoraApertura(obtenerFechaHoraActual());
    
    // Actualizar cada segundo
    const intervalo = setInterval(() => {
      setFechaHoraApertura(obtenerFechaHoraActual());
    }, 1000);
    
    return () => clearInterval(intervalo);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!montoApertura || parseFloat(montoApertura) <= 0) {
      setError('Por favor ingrese un monto válido');
      return;
    }

    try {
      setCargando(true);
      
      // Simular procesamiento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Guardar datos para el comprobante
      const datos = {
        usuario: usuario?.usuario ?? 'Usuario desconocido',
        fechaHora: fechaHoraApertura,
        monto: parseFloat(montoApertura),
        numeroOperacion: `APT-${Date.now()}`, // Número único de operación
        timestamp: new Date().toISOString() // Timestamp para el cierre automático
      };
      
      // Guardar datos de apertura en localStorage para el cierre de caja
      const datosAperturaCaja = {
        usuario: datos.usuario,
        fechaHoraApertura: datos.fechaHora,
        timestampApertura: datos.timestamp,
        montoApertura: datos.monto,
        numeroOperacionApertura: datos.numeroOperacion,
        fechaApertura: new Date().toLocaleDateString('es-ES'),
        horaApertura: new Date().toLocaleTimeString('es-ES')
      };
      
      localStorage.setItem('datosAperturaCaja', JSON.stringify(datosAperturaCaja));
      
      setDatosApertura(datos);
      setAperturaExitosa(true);
    } catch (err) {
      setError('Ocurrió un error al registrar la apertura de caja');
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const imprimirComprobante = () => {
    if (!datosApertura) return;
    
    const comprobanteHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Comprobante de Apertura de Caja</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              margin: 0;
              padding: 20px;
              background: white;
            }
            .comprobante {
              width: 300px;
              margin: 0 auto;
              border: 2px dashed #333;
              padding: 15px;
              background: white;
            }
            .header {
              text-align: center;
              border-bottom: 1px solid #333;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .company-name {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .title {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              padding: 2px 0;
            }
            .info-label {
              font-weight: bold;
            }
            .info-value {
              text-align: right;
            }
            .separator {
              border-top: 1px dashed #333;
              margin: 15px 0;
            }
            .monto-section {
              text-align: center;
              padding: 10px 0;
              border: 1px solid #333;
              margin: 15px 0;
              background: #f9f9f9;
            }
            .monto-label {
              font-size: 10px;
              margin-bottom: 5px;
            }
            .monto-valor {
              font-size: 18px;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              font-size: 10px;
              border-top: 1px solid #333;
              padding-top: 10px;
            }
            .operacion {
              text-align: center;
              font-size: 10px;
              margin: 10px 0;
            }
            @media print {
              body { 
                background: white;
                padding: 0;
              }
              .comprobante {
                border: none;
                width: 100%;
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="comprobante">
            <div class="header">
              <div class="company-name">SISTEMA DE VENTAS</div>
              <div class="title">COMPROBANTE DE APERTURA</div>
            </div>
            
            <div class="info-row">
              <span class="info-label">Fecha y Hora:</span>
              <span class="info-value">${datosApertura.fechaHora}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">Usuario:</span>
              <span class="info-value">${datosApertura.usuario}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">Operación:</span>
              <span class="info-value">${datosApertura.numeroOperacion}</span>
            </div>
            
            <div class="separator"></div>
            
            <div class="monto-section">
              <div class="monto-label">MONTO DE APERTURA</div>
              <div class="monto-valor">S/ ${datosApertura.monto.toFixed(2)}</div>
            </div>
            
            <div class="separator"></div>
            
            <div class="footer">
              <div>CAJA ABIERTA CORRECTAMENTE</div>
              <div style="margin-top: 5px;">Conserve este comprobante</div>
              <div>para el cierre de caja</div>
            </div>
            
            <div class="operacion">
              ${datosApertura.numeroOperacion}
            </div>
          </div>
          
          <script>
            setTimeout(() => { 
              window.print(); 
            }, 500);
          </script>
        </body>
      </html>`;
    
    const ventanaImpresion = window.open('', '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes,left=' + (screen.width/2 - 200) + ',top=' + (screen.height/2 - 300));
    if (ventanaImpresion) {
      ventanaImpresion.document.body.innerHTML = comprobanteHtml;
    }
  };

  const finalizarApertura = () => {
    setAperturaExitosa(false);
    setDatosApertura(null);
    setMontoApertura('');
    // NO eliminar datosAperturaCaja del localStorage aquí
    // Los datos se mantendrán hasta el cierre de caja
    
    // Navegar al sistema de ventas con el estado correcto para actualizar el sidebar
    navigate('/pages/CajeroSistemaVentas', { 
      state: { view: 'ventas' },
      replace: true 
    });
    
    onAperturaCompleta();
  };

  // Vista de éxito con comprobante
  if (aperturaExitosa && datosApertura) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          {/* Cabecera de éxito */}
          <div className="mb-8 text-center">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">¡Apertura Exitosa!</h1>
            <p className="text-gray-600">La caja ha sido abierta correctamente y está lista para operar</p>
          </div>

          {/* Card de resumen mejorada */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            {/* Header del resumen */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Resumen de Apertura</h2>
              <p className="text-sm text-gray-600 mt-1">Detalles de la operación realizada</p>
            </div>

            {/* Contenido del resumen */}
            <div className="p-6">
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Usuario Responsable</span>
                      <p className="font-semibold text-gray-900">{datosApertura.usuario}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Clock className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Fecha y Hora</span>
                      <p className="font-semibold text-gray-900 font-mono">{datosApertura.fechaHora}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Monto de Apertura</span>
                      <p className="text-2xl font-bold text-green-700">S/ {datosApertura.monto.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011 1v2m0 0h4a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h4M9 12l2 2 4-4" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Número de Operación</span>
                      <p className="font-semibold text-gray-900 font-mono text-sm">{datosApertura.numeroOperacion}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción mejorados */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={imprimirComprobante}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Printer size={20} />
              Imprimir Comprobante
            </button>
            <button
              onClick={finalizarApertura}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <CheckCircle size={20} />
              Continuar al Sistema
            </button>
          </div>

          {/* Nota informativa */}
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-amber-900">Recuerda</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Conserva el comprobante de apertura hasta el cierre de caja. 
                  Este documento será necesario para cuadrar las operaciones del día.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vista principal del formulario
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Cabecera mejorada */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2 pl-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Apertura de Caja</h1>
              <p className="text-gray-600 mt-1">Inicia tu jornada de trabajo registrando el monto inicial</p>
            </div>
          </div>
        </div>

        {/* Notificación de errores mejorada */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error en la apertura</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Card principal mejorada */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header del card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Datos de Apertura</h2>
            <p className="text-sm text-gray-600 mt-1">Completa la información para abrir la caja</p>
          </div>

          {/* Contenido del formulario */}
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Campo Usuario */}
              <div>
                <label htmlFor="usuario-input" className="block text-sm font-semibold text-gray-700 mb-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    Usuario Responsable
                  </div>
                </label>
                <div className="relative">
                  <input
                    id="usuario-input"
                    type="text"
                    value={usuario?.usuario ?? 'Usuario desconocido'}
                    readOnly
                    className="w-full px-4 py-3 pl-12 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none"
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
              
              {/* Campo Fecha y Hora */}
              <div>
                <label htmlFor="fecha-hora-input" className="block text-sm font-semibold text-gray-700 mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    Fecha y Hora de Apertura
                  </div>
                </label>
                <div className="relative">
                  <input
                    id="fecha-hora-input"
                    type="text"
                    value={fechaHoraApertura}
                    readOnly
                    className="w-full px-4 py-3 pl-12 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-mono text-center tracking-wide focus:outline-none"
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Clock className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
              
              {/* Campo Monto */}
              <div>
                <label htmlFor="monto-input" className="block text-sm font-semibold text-gray-700 mb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    Monto de Apertura
                  </div>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500 font-medium text-lg">S/</span>
                  </div>
                  <input
                    id="monto-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-lg font-semibold text-gray-900 placeholder-gray-400"
                    value={montoApertura}
                    onChange={(e) => setMontoApertura(e.target.value)}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Ingresa el monto en efectivo con el que inicias la caja
                </p>
              </div>
              
              {/* Botón de envío mejorado */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={cargando || !montoApertura}
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-3 ${
                    cargando || !montoApertura
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                  }`}
                >
                  {cargando ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      Procesando Apertura...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-6 w-6" />
                      Abrir Caja
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-900">Importante</h3>
              <p className="text-sm text-blue-700 mt-1">
                Verifica que el monto ingresado coincida exactamente con el dinero físico en la caja. 
                Este será tu monto base para el cierre de caja.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Función utilitaria para obtener datos de apertura guardados
export const obtenerDatosApertura = () => {
  const datos = localStorage.getItem('datosAperturaCaja');
  return datos ? JSON.parse(datos) : null;
};

// Función utilitaria para limpiar datos de apertura después del cierre
export const limpiarDatosApertura = () => {
  localStorage.removeItem('datosAperturaCaja');
};

export default AperturaCaja;
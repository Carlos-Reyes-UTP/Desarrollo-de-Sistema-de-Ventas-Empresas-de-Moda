import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { VentaService } from '../../services/VentaServices';
import { Printer, CheckCircle, Clock, User, DollarSign, Calculator, CreditCard, Smartphone } from 'lucide-react';

interface CierreCajaProps {
  onCierreCompleto: () => void;
}

const CierreCaja = ({ onCierreCompleto }: CierreCajaProps) => {
  const { usuario } = useAuth();
  const [fechaApertura, setFechaApertura] = useState<string>('');
  const [fechaCierre, setFechaCierre] = useState<string>('');
  const [montoInicial, setMontoInicial] = useState<string>('');
  const [totalVentas, setTotalVentas] = useState<number>(0);
  const [efectivoVentas, setEfectivoVentas] = useState<number>(0);
  const [tarjetaVentas, setTarjetaVentas] = useState<number>(0);
  const [yapeVentas, setYapeVentas] = useState<number>(0);
  const [efectivoContado, setEfectivoContado] = useState<string>('');
  const [tarjetaContado, setTarjetaContado] = useState<string>('');
  const [yapeContado, setYapeContado] = useState<string>('');
  const [montoFinalCaja, setMontoFinalCaja] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [cargando, setCargando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cierreExitoso, setCierreExitoso] = useState<boolean>(false);
  const [datosCierre, setDatosCierre] = useState<any>(null);

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

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        // Obtener ventas del día usando el mismo enfoque del dashboard
        const fechaActual = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
        console.log('Cargando ventas del día para cierre:', fechaActual);
        
        let ventasDelDia: any[] = [];
        
        try {
          const ventasResponse = await VentaService.obtenerVentasPorFecha(fechaActual);
          ventasDelDia = Array.isArray(ventasResponse) ? ventasResponse : [];
          console.log(`Ventas del día cargadas: ${ventasDelDia.length}`);
        } catch (error) {
          console.log('Error al cargar ventas por fecha, intentando cargar todas las ventas');
          const todasLasVentas = await VentaService.obtenerTodasVentas();
          const todasVentasArray = Array.isArray(todasLasVentas) ? todasLasVentas : [];
          
          // Filtrar solo las ventas del día actual
          const fechaHoy = new Date();
          ventasDelDia = todasVentasArray.filter(venta => {
            const fechaVenta = new Date(venta.fechaVenta);
            return fechaVenta.toDateString() === fechaHoy.toDateString();
          });
          console.log(`Ventas del día filtradas: ${ventasDelDia.length}`);
        }
        
        // Calcular totales usando la misma lógica del dashboard
        const totalVentasCalculado = ventasDelDia.reduce((sum, venta) => sum + (venta.totalVentas ?? 0), 0);
        setTotalVentas(totalVentasCalculado);
        
        // Calcular ventas por método de pago
        let efectivoVentasCalc = 0;
        let tarjetaVentasCalc = 0;
        let yapeVentasCalc = 0;
        
        ventasDelDia.forEach(venta => {
          if (venta.metodoPago?.nombre) {
            const metodo = venta.metodoPago.nombre.toLowerCase();
            const monto = venta.totalVentas ?? 0;
            
            if (metodo.includes('efectivo') || metodo.includes('cash')) {
              efectivoVentasCalc += monto;
            } else if (metodo.includes('tarjeta') || metodo.includes('visa') || metodo.includes('mastercard') || metodo.includes('card')) {
              tarjetaVentasCalc += monto;
            } else if (metodo.includes('yape') || metodo.includes('plin') || metodo.includes('digital')) {
              yapeVentasCalc += monto;
            } else {
              // Si no se puede clasificar, asumimos efectivo por defecto
              efectivoVentasCalc += monto;
            }
          } else {
            // Si no hay método de pago, asumimos efectivo por defecto
            efectivoVentasCalc += (venta.totalVentas ?? 0);
          }
        });
        
        setEfectivoVentas(efectivoVentasCalc);
        setTarjetaVentas(tarjetaVentasCalc);
        setYapeVentas(yapeVentasCalc);

        // Inicializar fechas
        setFechaCierre(obtenerFechaHoraActual());
        
        // Fecha de apertura editable (por defecto hoy a las 08:00:00)
        const hoy = new Date();
        const dia = hoy.getDate().toString().padStart(2, '0');
        const mes = (hoy.getMonth() + 1).toString().padStart(2, '0');
        const año = hoy.getFullYear();
        setFechaApertura(`${dia}/${mes}/${año} - 08:00:00`);
        
        // Monto inicial por defecto
        setMontoInicial('500.00');
        
        console.log('Datos iniciales cargados:', {
          totalVentas: totalVentasCalculado,
          efectivo: efectivoVentasCalc,
          tarjeta: tarjetaVentasCalc,
          yape: yapeVentasCalc
        });
        
      } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
        setError('Error al cargar los datos de ventas del día');
        
        // Valores por defecto en caso de error
        setTotalVentas(0);
        setEfectivoVentas(0);
        setTarjetaVentas(0);
        setYapeVentas(0);
        
        // Inicializar fechas aunque haya error
        setFechaCierre(obtenerFechaHoraActual());
        const hoy = new Date();
        const dia = hoy.getDate().toString().padStart(2, '0');
        const mes = (hoy.getMonth() + 1).toString().padStart(2, '0');
        const año = hoy.getFullYear();
        setFechaApertura(`${dia}/${mes}/${año} - 08:00:00`);
        setMontoInicial('500.00');
      }
    };

    cargarDatosIniciales();

    // Actualizar fecha de cierre cada segundo
    const intervalo = setInterval(() => {
      setFechaCierre(obtenerFechaHoraActual());
    }, 1000);

    return () => clearInterval(intervalo);
  }, []);

  const validarCampos = () => {
    if (!fechaApertura.trim()) {
      setError('La fecha de apertura es obligatoria');
      return false;
    }
    if (!montoInicial || parseFloat(montoInicial) < 0) {
      setError('El monto inicial debe ser un valor válido');
      return false;
    }
    if (!efectivoContado || parseFloat(efectivoContado) < 0) {
      setError('El efectivo contado debe ser un valor válido');
      return false;
    }
    if (!tarjetaContado || parseFloat(tarjetaContado) < 0) {
      setError('El monto de tarjeta debe ser un valor válido');
      return false;
    }
    if (!yapeContado || parseFloat(yapeContado) < 0) {
      setError('El monto de Yape/Plin debe ser un valor válido');
      return false;
    }
    if (!montoFinalCaja || parseFloat(montoFinalCaja) < 0) {
      setError('El monto final en caja debe ser un valor válido');
      return false;
    }
    return true;
  };

  const calcularDiferencias = () => {
    const efecContado = parseFloat(efectivoContado) || 0;
    const tarjContado = parseFloat(tarjetaContado) || 0;
    const yapeContadoNum = parseFloat(yapeContado) || 0;
    const montoInicialNum = parseFloat(montoInicial) || 0;
    const montoFinal = parseFloat(montoFinalCaja) || 0;

    const diferenciasEfectivo = efecContado - efectivoVentas;
    const diferenciasTarjeta = tarjContado - tarjetaVentas;
    const diferenciasYape = yapeContadoNum - yapeVentas;
    
    const efectivoEsperado = montoInicialNum + efectivoVentas;
    const diferenciaCaja = montoFinal - efectivoEsperado;

    return {
      diferenciasEfectivo,
      diferenciasTarjeta,
      diferenciasYape,
      diferenciaCaja,
      efectivoEsperado
    };
  };

  // Función helper para determinar color de diferencias
  const getDifferenceColor = (diferencia: number) => {
    if (diferencia === 0) return 'text-green-600';
    if (diferencia > 0) return 'text-blue-600';
    return 'text-red-600';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validarCampos()) {
      return;
    }

    try {
      setCargando(true);
      
      const diferencias = calcularDiferencias();
      
      // Crear objeto con datos de cierre
      const datosCierreCalculados = {
        usuario: usuario?.usuario ?? 'Usuario actual',
        fechaApertura,
        fechaCierre,
        montoInicial: parseFloat(montoInicial),
        totalVentas,
        efectivoVentas,
        tarjetaVentas,
        yapeVentas,
        efectivoContado: parseFloat(efectivoContado),
        tarjetaContado: parseFloat(tarjetaContado),
        yapeContado: parseFloat(yapeContado),
        montoFinalCaja: parseFloat(montoFinalCaja),
        observaciones,
        diferencias
      };

      // Aquí iría la llamada a la API para registrar el cierre
      // Por ahora solo simulamos un delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setDatosCierre(datosCierreCalculados);
      setCierreExitoso(true);
    } catch (err) {
      setError('Ocurrió un error al registrar el cierre de caja');
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const imprimirComprobante = () => {
    if (!datosCierre) return;

    const contenidoImpresion = `
      <div style="font-family: 'Courier New', monospace; width: 300px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px;">
          <h2 style="margin: 0; font-size: 18px;">COMPROBANTE DE CIERRE</h2>
          <h3 style="margin: 5px 0; font-size: 16px;">SISTEMA DE VENTAS</h3>
        </div>
        
        <div style="margin-bottom: 15px;">
          <p style="margin: 3px 0;"><strong>Cajero:</strong> ${datosCierre.usuario}</p>
          <p style="margin: 3px 0;"><strong>Fecha Apertura:</strong> ${datosCierre.fechaApertura}</p>
          <p style="margin: 3px 0;"><strong>Fecha Cierre:</strong> ${datosCierre.fechaCierre}</p>
        </div>
        
        <div style="border-top: 1px solid #333; border-bottom: 1px solid #333; padding: 10px 0; margin: 15px 0;">
          <h4 style="margin: 0 0 10px 0; text-align: center;">RESUMEN DE CAJA</h4>
          <p style="margin: 3px 0;">Monto Inicial: S/ ${datosCierre.montoInicial.toFixed(2)}</p>
          <p style="margin: 3px 0;">Total Ventas: S/ ${datosCierre.totalVentas.toFixed(2)}</p>
          <p style="margin: 3px 0;">Monto Final: S/ ${datosCierre.montoFinalCaja.toFixed(2)}</p>
        </div>
        
        <div style="margin: 15px 0;">
          <h4 style="margin: 0 0 10px 0;">VENTAS POR MÉTODO</h4>
          <p style="margin: 3px 0;">Efectivo: S/ ${datosCierre.efectivoVentas.toFixed(2)}</p>
          <p style="margin: 3px 0;">Tarjeta: S/ ${datosCierre.tarjetaVentas.toFixed(2)}</p>
          <p style="margin: 3px 0;">Yape/Plin: S/ ${datosCierre.yapeVentas.toFixed(2)}</p>
        </div>
        
        <div style="margin: 15px 0;">
          <h4 style="margin: 0 0 10px 0;">CONTEO REALIZADO</h4>
          <p style="margin: 3px 0;">Efectivo: S/ ${datosCierre.efectivoContado.toFixed(2)}</p>
          <p style="margin: 3px 0;">Tarjeta: S/ ${datosCierre.tarjetaContado.toFixed(2)}</p>
          <p style="margin: 3px 0;">Yape/Plin: S/ ${datosCierre.yapeContado.toFixed(2)}</p>
        </div>
        
        <div style="border-top: 1px solid #333; padding-top: 10px; margin-top: 15px;">
          <h4 style="margin: 0 0 10px 0;">DIFERENCIAS</h4>
          <p style="margin: 3px 0;">Efectivo: S/ ${datosCierre.diferencias.diferenciasEfectivo.toFixed(2)}</p>
          <p style="margin: 3px 0;">Tarjeta: S/ ${datosCierre.diferencias.diferenciasTarjeta.toFixed(2)}</p>
          <p style="margin: 3px 0;">Yape/Plin: S/ ${datosCierre.diferencias.diferenciasYape.toFixed(2)}</p>
          <p style="margin: 3px 0;"><strong>Caja: S/ ${datosCierre.diferencias.diferenciaCaja.toFixed(2)}</strong></p>
        </div>
        
        ${datosCierre.observaciones ? `
          <div style="margin-top: 15px; border-top: 1px solid #333; padding-top: 10px;">
            <h4 style="margin: 0 0 5px 0;">OBSERVACIONES</h4>
            <p style="margin: 0; font-size: 12px;">${datosCierre.observaciones}</p>
          </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 20px; border-top: 2px solid #333; padding-top: 10px;">
          <p style="margin: 0; font-size: 12px;">Gracias por usar nuestro sistema</p>
          <p style="margin: 5px 0 0 0; font-size: 10px;">${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;

    const ventanaImpresion = window.open('', '_blank');
    if (ventanaImpresion) {
      ventanaImpresion.document.write(`
        <html>
          <head>
            <title>Comprobante de Cierre de Caja</title>
            <style>
              @media print {
                body { margin: 0; }
                @page { size: auto; margin: 0mm; }
              }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            ${contenidoImpresion}
          </body>
        </html>
      `);
      ventanaImpresion.document.close();
    }
  };

  if (cierreExitoso && datosCierre) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          {/* Card de éxito */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-green-100">
            <div className="text-center mb-8">
              <div className="mx-auto w-20 h-20 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">¡Cierre Exitoso!</h2>
              <p className="text-gray-600">El cierre de caja se ha registrado correctamente</p>
            </div>

            {/* Resumen del cierre */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Calculator className="h-5 w-5 mr-2 text-blue-600" />
                Resumen del Cierre
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Cajero:</p>
                  <p className="font-semibold text-gray-800">{datosCierre.usuario}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Ventas:</p>
                  <p className="font-semibold text-green-600">S/ {datosCierre.totalVentas.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Monto Final:</p>
                  <p className="font-semibold text-blue-600">S/ {datosCierre.montoFinalCaja.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Diferencia Caja:</p>
                  <p className={`font-semibold ${getDifferenceColor(datosCierre.diferencias.diferenciaCaja)}`}>
                    S/ {datosCierre.diferencias.diferenciaCaja.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={imprimirComprobante}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Printer className="h-5 w-5 mr-2" />
                Imprimir Comprobante
              </button>
              <button
                onClick={onCierreCompleto}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Finalizar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Cierre de Caja
          </h1>
          <p className="text-gray-600">Registre el cierre diario de operaciones</p>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del cajero y fechas */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
              <User className="h-6 w-6 mr-3 text-blue-600" />
              Información General
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Usuario */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Cajero
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={usuario?.usuario ?? 'Usuario actual'}
                    readOnly
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none font-medium text-gray-700"
                  />
                </div>
              </div>

              {/* Fecha de apertura */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Fecha de Apertura
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={fechaApertura}
                    onChange={(e) => setFechaApertura(e.target.value)}
                    placeholder="dd/mm/yyyy - hh:mm:ss"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Fecha de cierre */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Fecha de Cierre
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={fechaCierre}
                    readOnly
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 font-medium text-gray-700"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Montos iniciales y ventas */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
              <Calculator className="h-6 w-6 mr-3 text-green-600" />
              Resumen de Ventas
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Monto inicial */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Monto Inicial
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <span className="absolute left-8 top-3 text-gray-500 text-sm">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={montoInicial}
                    onChange={(e) => setMontoInicial(e.target.value)}
                    className="w-full pl-14 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Total ventas */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Total Ventas del Día
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <span className="absolute left-8 top-3 text-gray-500 text-sm">S/</span>
                  <input
                    type="text"
                    value={totalVentas.toFixed(2)}
                    readOnly
                    className="w-full pl-14 pr-4 py-3 border border-gray-200 rounded-xl bg-green-50 font-medium text-green-700"
                  />
                </div>
              </div>

              {/* Efectivo ventas */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Efectivo (Ventas)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <span className="absolute left-8 top-3 text-gray-500 text-sm">S/</span>
                  <input
                    type="text"
                    value={efectivoVentas.toFixed(2)}
                    readOnly
                    className="w-full pl-14 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 font-medium text-gray-700"
                  />
                </div>
              </div>

              {/* Tarjeta ventas */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Tarjeta (Ventas)
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <span className="absolute left-8 top-3 text-gray-500 text-sm">S/</span>
                  <input
                    type="text"
                    value={tarjetaVentas.toFixed(2)}
                    readOnly
                    className="w-full pl-14 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 font-medium text-gray-700"
                  />
                </div>
              </div>

              {/* Yape ventas */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Yape/Plin (Ventas)
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <span className="absolute left-8 top-3 text-gray-500 text-sm">S/</span>
                  <input
                    type="text"
                    value={yapeVentas.toFixed(2)}
                    readOnly
                    className="w-full pl-14 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 font-medium text-gray-700"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Conteo realizado */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
              <Calculator className="h-6 w-6 mr-3 text-purple-600" />
              Conteo Realizado
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Efectivo contado */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Efectivo Contado
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <span className="absolute left-8 top-3 text-gray-500 text-sm">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={efectivoContado}
                    onChange={(e) => setEfectivoContado(e.target.value)}
                    className="w-full pl-14 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Tarjeta contado */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Tarjeta Contado
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <span className="absolute left-8 top-3 text-gray-500 text-sm">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tarjetaContado}
                    onChange={(e) => setTarjetaContado(e.target.value)}
                    className="w-full pl-14 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Yape contado */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Yape/Plin Contado
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <span className="absolute left-8 top-3 text-gray-500 text-sm">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={yapeContado}
                    onChange={(e) => setYapeContado(e.target.value)}
                    className="w-full pl-14 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Monto final en caja */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Monto Final en Caja
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <span className="absolute left-8 top-3 text-gray-500 text-sm">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={montoFinalCaja}
                    onChange={(e) => setMontoFinalCaja(e.target.value)}
                    className="w-full pl-14 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Observaciones
            </h2>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Comentarios adicionales (opcional)
              </label>
              <textarea
                rows={4}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ingrese cualquier observación sobre el cierre de caja..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
              />
            </div>
          </div>

          {/* Botón de envío */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={cargando}
              className={`px-8 py-4 rounded-2xl font-semibold text-white transition-all duration-200 flex items-center shadow-lg hover:shadow-xl transform hover:scale-105 ${
                cargando
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
              }`}
            >
              {cargando ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-3" />
                  Cerrar Caja
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CierreCaja;
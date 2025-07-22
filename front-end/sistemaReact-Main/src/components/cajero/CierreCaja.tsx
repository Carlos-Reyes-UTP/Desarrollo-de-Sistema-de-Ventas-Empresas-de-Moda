import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { VentaService } from '../../services/VentaServices';
import { Printer, CheckCircle, Clock, User, Calculator } from 'lucide-react';
import { obtenerDatosApertura, limpiarDatosApertura } from './AperturaCaja';

const CierreCaja = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
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
        // Cargar datos de apertura guardados automáticamente
        const datosApertura = obtenerDatosApertura();
        if (datosApertura) {
          setFechaApertura(datosApertura.fechaHoraApertura);
          setMontoInicial(datosApertura.montoApertura.toString());
          console.log('Datos de apertura cargados automáticamente:', datosApertura);
        } else {
          console.log('No se encontraron datos de apertura guardados');
          // Si no hay datos de apertura, mostrar fecha actual como fallback
          setFechaApertura(obtenerFechaHoraActual());
        }
        
        // Establecer fecha de cierre actual
        setFechaCierre(obtenerFechaHoraActual());
        
        // Obtener ventas del día usando el formato del backend 'YYYY-MM-DD HH:mm:ss.000000'
        const fechaActual = new Date();
        const yyyy = fechaActual.getFullYear();
        const mm = String(fechaActual.getMonth() + 1).padStart(2, '0');
        const dd = String(fechaActual.getDate()).padStart(2, '0');
        const fechaFiltro = `${yyyy}-${mm}-${dd}`; // Solo la parte de la fecha
        console.log('Cargando ventas del día para cierre:', fechaFiltro);

        let ventasDelDia: import('../../interfaces/Venta').Venta[] = [];
        try {
          // Traer todas las ventas del día según el backend
          const ventasResponse = await VentaService.obtenerVentasPorFecha(fechaFiltro);
          ventasDelDia = Array.isArray(ventasResponse) ? ventasResponse : [];
          // Si la respuesta está vacía, intentar filtrar manualmente por la fecha
          if (ventasDelDia.length === 0) {
            const todasLasVentas = await VentaService.obtenerTodasVentas();
            ventasDelDia = todasLasVentas.filter(venta => {
              // venta.fechaVenta: '2025-07-16 20:03:56.000000'
              if (!venta.fechaVenta) return false;
              // Extraer la parte de la fecha
              const fechaVentaStr = venta.fechaVenta.split(' ')[0];
              return fechaVentaStr === fechaFiltro;
            });
            console.log(`Ventas del día filtradas manualmente: ${ventasDelDia.length}`);
          } else {
            console.log(`Ventas del día cargadas: ${ventasDelDia.length}`);
          }
        } catch (error) {
          console.error('Error al cargar ventas por fecha:', error);
          ventasDelDia = [];
        }
        
        // Calcular totales usando la misma lógica del dashboard
        const totalVentasCalculado = ventasDelDia.reduce((sum, venta) => sum + (venta.totalVentas ?? 0), 0);
        setTotalVentas(totalVentasCalculado);
        
        // Calcular ventas por método de pago
        let efectivoVentasCalc = 0;
        let tarjetaVentasCalc = 0;
        let yapeVentasCalc = 0;
        
        ventasDelDia.forEach(venta => {
          // Soportar método de pago como string o como objeto
          let metodoPagoStr = '';
          if (typeof venta.metodoPago === 'string') {
            metodoPagoStr = venta.metodoPago;
          } else if (venta.metodoPago?.nombre) {
            metodoPagoStr = venta.metodoPago.nombre;
          }
          metodoPagoStr = metodoPagoStr.toUpperCase().replace(/\s+/g, '');
          const monto = venta.totalVentas ?? 0;
          if (metodoPagoStr.includes('EFECTIVO') || metodoPagoStr.includes('CASH')) {
            efectivoVentasCalc += monto;
          } else if (metodoPagoStr.includes('TARJETA') || metodoPagoStr.includes('VISA') || metodoPagoStr.includes('MASTERCARD') || metodoPagoStr.includes('CARD')) {
            tarjetaVentasCalc += monto;
          } else if (metodoPagoStr.includes('YAPE') || metodoPagoStr.includes('PLIN') || metodoPagoStr.includes('DIGITAL')) {
            yapeVentasCalc += monto;
          } else {
            // Si no se puede clasificar, asumimos efectivo por defecto
            efectivoVentasCalc += monto;
          }
        });
        
        setEfectivoVentas(efectivoVentasCalc);
        setTarjetaVentas(tarjetaVentasCalc);
        setYapeVentas(yapeVentasCalc);

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
    // Validar que todos los campos de conteo estén completos
    if (!efectivoContado || efectivoContado.trim() === '') {
      setError('Debe completar el conteo de efectivo');
      return false;
    }
    if (!tarjetaContado || tarjetaContado.trim() === '') {
      setError('Debe completar el conteo de tarjeta');
      return false;
    }
    if (!yapeContado || yapeContado.trim() === '') {
      setError('Debe completar el conteo de Yape/Plin');
      return false;
    }
    // Validar que sean valores numéricos válidos
    if (parseFloat(efectivoContado) < 0) {
      setError('El efectivo contado debe ser un valor válido');
      return false;
    }
    if (parseFloat(tarjetaContado) < 0) {
      setError('El monto de tarjeta debe ser un valor válido');
      return false;
    }
    if (parseFloat(yapeContado) < 0) {
      setError('El monto de Yape/Plin debe ser un valor válido');
      return false;
    }
    return true;
  };

  const calcularDiferencias = () => {
    const efecContado = parseFloat(efectivoContado) || 0;
    const tarjContado = parseFloat(tarjetaContado) || 0;
    const yapeContadoNum = parseFloat(yapeContado) || 0;
    const montoInicialNum = parseFloat(montoInicial) || 0;

    const diferenciasEfectivo = efecContado - efectivoVentas;
    const diferenciasTarjeta = tarjContado - tarjetaVentas;
    const diferenciasYape = yapeContadoNum - yapeVentas;
    
    // Efectivo esperado = monto inicial + ventas en efectivo
    const efectivoEsperado = montoInicialNum + efectivoVentas;
    
    // Discrepancia en caja = efectivo contado - efectivo esperado
    const discrepanciaCaja = efecContado - efectivoEsperado;

    return {
      diferenciasEfectivo,
      diferenciasTarjeta,
      diferenciasYape,
      efectivoEsperado,
      discrepanciaCaja
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
        observaciones,
        diferencias
      };

      // Aquí iría la llamada a la API para registrar el cierre
      // Por ahora solo simulamos un delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setDatosCierre(datosCierreCalculados);
      setCierreExitoso(true);
      
      // Limpiar datos de apertura del localStorage después del cierre exitoso
      limpiarDatosApertura();
      console.log('Datos de apertura limpiados después del cierre exitoso');
    } catch (err) {
      setError('Ocurrió un error al registrar el cierre de caja');
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  // Función para finalizar el cierre y navegar a apertura
  const finalizarCierre = () => {
    // Limpiar datos de apertura para permitir una nueva apertura
    limpiarDatosApertura();
    
    // Navegar a apertura de caja con el estado correspondiente
    navigate('/pages/CajeroSistemaVentas', { state: { view: 'apertura' } });
  };

  const imprimirComprobante = () => {
    if (!datosCierre) return;
    
    const comprobanteHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Comprobante de Cierre de Caja</title>
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
              margin-bottom: 3px;
              padding: 2px 0;
            }
            .info-label {
              font-weight: normal;
            }
            .info-value {
              font-weight: bold;
            }
            .separator {
              border-top: 1px dashed #333;
              margin: 10px 0;
            }
            .section {
              margin: 15px 0;
            }
            .section-title {
              font-weight: bold;
              text-align: center;
              margin-bottom: 8px;
              border-bottom: 1px solid #333;
              padding-bottom: 3px;
            }
            .resultado-final {
              text-align: center;
              font-size: 14px;
              font-weight: bold;
              padding: 8px;
              border: 2px solid #333;
              margin: 10px 0;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              font-size: 11px;
              border-top: 1px solid #333;
              padding-top: 10px;
            }
            .operacion {
              text-align: center;
              font-size: 10px;
              margin-top: 10px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="comprobante">
            <div class="header">
              <div class="company-name">SISTEMA DE VENTAS</div>
              <div class="title">COMPROBANTE DE CIERRE</div>
              <div>${new Date().toLocaleDateString()}</div>
            </div>
            
            <div class="info-row">
              <span class="info-label">Cajero:</span>
              <span class="info-value">${datosCierre.usuario}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">F. Apertura:</span>
              <span class="info-value">${datosCierre.fechaApertura}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">F. Cierre:</span>
              <span class="info-value">${datosCierre.fechaCierre}</span>
            </div>
            
            <div class="separator"></div>
            
            <div class="section">
              <div class="section-title">RESUMEN DE CAJA</div>
              <div class="info-row">
                <span class="info-label">Monto Inicial:</span>
                <span class="info-value">S/ ${datosCierre.montoInicial.toFixed(2)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Total Ventas:</span>
                <span class="info-value">S/ ${datosCierre.totalVentas.toFixed(2)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Efectivo Esperado:</span>
                <span class="info-value">S/ ${datosCierre.diferencias.efectivoEsperado.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="separator"></div>
            
            <div class="section">
              <div class="section-title">VENTAS POR MÉTODO</div>
              <div class="info-row">
                <span class="info-label">Efectivo:</span>
                <span class="info-value">S/ ${datosCierre.efectivoVentas.toFixed(2)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Tarjeta:</span>
                <span class="info-value">S/ ${datosCierre.tarjetaVentas.toFixed(2)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Yape/Plin:</span>
                <span class="info-value">S/ ${datosCierre.yapeVentas.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="separator"></div>
            
            <div class="section">
              <div class="section-title">CONTEO REALIZADO</div>
              <div class="info-row">
                <span class="info-label">Efectivo:</span>
                <span class="info-value">S/ ${datosCierre.efectivoContado.toFixed(2)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Tarjeta:</span>
                <span class="info-value">S/ ${datosCierre.tarjetaContado.toFixed(2)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Yape/Plin:</span>
                <span class="info-value">S/ ${datosCierre.yapeContado.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="separator"></div>
            
            <div class="section">
              <div class="section-title">DIFERENCIAS</div>
              <div class="info-row">
                <span class="info-label">Efectivo:</span>
                <span class="info-value">S/ ${datosCierre.diferencias.diferenciasEfectivo.toFixed(2)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Tarjeta:</span>
                <span class="info-value">S/ ${datosCierre.diferencias.diferenciasTarjeta.toFixed(2)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Yape/Plin:</span>
                <span class="info-value">S/ ${datosCierre.diferencias.diferenciasYape.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="resultado-final">
              ${(() => {
                if (datosCierre.diferencias.discrepanciaCaja === 0) {
                  return 'CAJA CUADRADA ✓';
                } else if (datosCierre.diferencias.discrepanciaCaja > 0) {
                  return `SOBRANTE: S/ ${datosCierre.diferencias.discrepanciaCaja.toFixed(2)}`;
                } else {
                  return `FALTANTE: S/ ${Math.abs(datosCierre.diferencias.discrepanciaCaja).toFixed(2)}`;
                }
              })()}
            </div>
            
            ${datosCierre.observaciones ? `
              <div class="section">
                <div class="section-title">OBSERVACIONES</div>
                <div style="font-size: 11px; text-align: justify;">${datosCierre.observaciones}</div>
              </div>
            ` : ''}
            
            <div class="footer">
              <div>CAJA CERRADA CORRECTAMENTE</div>
              <div style="margin-top: 5px;">Conserve este comprobante</div>
              <div>para sus registros</div>
            </div>
            
            <div class="operacion">
              ${new Date().toLocaleString()}
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
                  <p className="text-gray-600">Efectivo Esperado:</p>
                  <p className="font-semibold text-blue-600">S/ {datosCierre.diferencias.efectivoEsperado.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Discrepancia Caja:</p>
                  <p className={`font-semibold ${getDifferenceColor(datosCierre.diferencias.discrepanciaCaja)}`}>
                    S/ {datosCierre.diferencias.discrepanciaCaja.toFixed(2)}
                    {datosCierre.diferencias.discrepanciaCaja > 0 && ' (Sobrante)'}
                    {datosCierre.diferencias.discrepanciaCaja < 0 && ' (Faltante)'}
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
                onClick={finalizarCierre}
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Cabecera mejorada */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-green-100 rounded-xl">
              <Calculator className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cierre de Caja</h1>
              <p className="text-gray-600 mt-1">Registre el cierre diario de operaciones</p>
            </div>
          </div>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error en el cierre</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del cajero y fechas */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header del card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Información General</h2>
              <p className="text-sm text-gray-600 mt-1">Datos del cajero y fechas de operación</p>
            </div>
            
            {/* Contenido del card */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Usuario */}
                <div className="space-y-2">
                  <label htmlFor="usuario-cajero" className="block text-sm font-semibold text-gray-700 mb-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      Cajero
                    </div>
                  </label>
                  <div className="relative">
                    <input
                      id="usuario-cajero"
                      type="text"
                      value={usuario?.usuario ?? 'Usuario actual'}
                      readOnly
                      className="w-full px-4 py-3 pl-12 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none"
                    />
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Fecha de apertura */}
                <div className="space-y-2">
                  <label htmlFor="fecha-apertura" className="block text-sm font-semibold text-gray-700 mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      Fecha de Apertura
                    </div>
                  </label>
                  <div className="relative">
                    <input
                      id="fecha-apertura"
                      type="text"
                      value={fechaApertura}
                      onChange={(e) => setFechaApertura(e.target.value)}
                      placeholder="dd/mm/yyyy - hh:mm:ss"
                      className="w-full px-4 py-3 pl-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono text-center tracking-wide"
                      required
                    />
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Fecha de cierre */}
                <div className="space-y-2">
                  <label htmlFor="fecha-cierre" className="block text-sm font-semibold text-gray-700 mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      Fecha de Cierre
                      <div className="flex items-center gap-1 ml-auto">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600 font-medium">Tiempo real</span>
                      </div>
                    </div>
                  </label>
                  <div className="relative">
                    <input
                      id="fecha-cierre"
                      type="text"
                      value={fechaCierre}
                      readOnly
                      className="w-full px-4 py-3 pl-12 pr-4 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-mono text-center tracking-wide focus:outline-none"
                    />
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Montos iniciales y ventas */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header del card */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Resumen de Ventas</h2>
              <p className="text-sm text-gray-600 mt-1">Ventas registradas durante la jornada</p>
            </div>
            
            {/* Contenido del card */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Monto inicial */}
                <div className="space-y-2">
                  <label htmlFor="monto-inicial" className="block text-sm font-semibold text-gray-700 mb-3">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-gray-500" />
                      Monto Inicial
                    </div>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-gray-500 font-medium text-lg">S/</span>
                    </div>
                    <input
                      id="monto-inicial"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={montoInicial}
                      onChange={(e) => setMontoInicial(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-semibold text-gray-900"
                      required
                    />
                  </div>
                </div>

                {/* Total ventas */}
                <div className="space-y-2">
                  <label htmlFor="total-ventas" className="block text-sm font-medium text-gray-700">
                    Total Ventas del Día
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-base font-medium">S/</span>
                    <input
                      id="total-ventas"
                      type="text"
                      value={totalVentas.toFixed(2)}
                      readOnly
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-green-50 font-medium text-green-700"
                    />
                  </div>
                </div>

                {/* Efectivo ventas */}
                <div className="space-y-2">
                  <label htmlFor="efectivo-ventas" className="block text-sm font-medium text-gray-700">
                    Efectivo (Ventas)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-base font-medium">S/</span>
                    <input
                      id="efectivo-ventas"
                      type="text"
                      value={efectivoVentas.toFixed(2)}
                      readOnly
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 font-medium text-gray-700"
                    />
                  </div>
                </div>

                {/* Tarjeta ventas - Segunda fila */}
                <div className="space-y-2">
                  <label htmlFor="tarjeta-ventas" className="block text-sm font-medium text-gray-700">
                    Tarjeta (Ventas)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-base font-medium">S/</span>
                    <input
                      id="tarjeta-ventas"
                      type="text"
                      value={tarjetaVentas.toFixed(2)}
                      readOnly
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 font-medium text-gray-700"
                    />
                  </div>
                </div>

                {/* Yape ventas */}
                <div className="space-y-2">
                  <label htmlFor="yape-ventas" className="block text-sm font-medium text-gray-700">
                    Yape/Plin (Ventas)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-base font-medium">S/</span>
                    <input
                      id="yape-ventas"
                      type="text"
                      value={yapeVentas.toFixed(2)}
                      readOnly
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 font-medium text-gray-700"
                    />
                  </div>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Efectivo contado */}
              <div className="space-y-2">
                <label htmlFor="efectivo-contado" className="block text-sm font-medium text-gray-700">
                  Efectivo Contado
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-base font-medium">S/</span>
                  <input
                    id="efectivo-contado"
                    type="number"
                    step="0.01"
                    min="0"
                    value={efectivoContado}
                    onChange={(e) => setEfectivoContado(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Tarjeta contado */}
              <div className="space-y-2">
                <label htmlFor="tarjeta-contado" className="block text-sm font-medium text-gray-700">
                  Tarjeta Contado
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-base font-medium">S/</span>
                  <input
                    id="tarjeta-contado"
                    type="number"
                    step="0.01"
                    min="0"
                    value={tarjetaContado}
                    onChange={(e) => setTarjetaContado(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Yape contado */}
              <div className="space-y-2">
                <label htmlFor="yape-contado" className="block text-sm font-medium text-gray-700">
                  Yape/Plin Contado
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-base font-medium">S/</span>
                  <input
                    id="yape-contado"
                    type="number"
                    step="0.01"
                    min="0"
                    value={yapeContado}
                    onChange={(e) => setYapeContado(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Resumen de diferencias en tiempo real */}
          {(efectivoContado || tarjetaContado || yapeContado) && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Calculator className="h-5 w-5 mr-2 text-purple-600" />
                Resumen de Diferencias
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-gray-600 font-medium">Efectivo Esperado</p>
                  <p className="text-lg font-bold text-blue-600">
                    S/ {((parseFloat(montoInicial) || 0) + efectivoVentas).toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 font-medium">Efectivo Contado</p>
                  <p className="text-lg font-bold text-purple-600">
                    S/ {(parseFloat(efectivoContado) || 0).toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 font-medium">Discrepancia</p>
                  <p className={`text-lg font-bold ${
                    (() => {
                      const discrepancia = (parseFloat(efectivoContado) || 0) - ((parseFloat(montoInicial) || 0) + efectivoVentas);
                      if (discrepancia === 0) return 'text-green-600';
                      if (discrepancia > 0) return 'text-blue-600';
                      return 'text-red-600';
                    })()
                  }`}>
                    {(() => {
                      const discrepancia = (parseFloat(efectivoContado) || 0) - ((parseFloat(montoInicial) || 0) + efectivoVentas);
                      if (discrepancia === 0) return '✓ Cuadrada';
                      return `S/ ${discrepancia.toFixed(2)} ${discrepancia > 0 ? '(Sobrante)' : '(Faltante)'}`;
                    })()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 font-medium">Estado</p>
                  <p className={`text-sm font-medium px-3 py-1 rounded-full inline-block ${
                    (() => {
                      const discrepancia = (parseFloat(efectivoContado) || 0) - ((parseFloat(montoInicial) || 0) + efectivoVentas);
                      return discrepancia === 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
                    })()
                  }`}>
                    {(() => {
                      const discrepancia = (parseFloat(efectivoContado) || 0) - ((parseFloat(montoInicial) || 0) + efectivoVentas);
                      return discrepancia === 0 ? 'Correcto' : 'Revisar';
                    })()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Observaciones
            </h2>
            
            <div className="space-y-2">
              <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700">
                Comentarios adicionales (opcional)
              </label>
              <textarea
                id="observaciones"
                rows={4}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ingrese cualquier observación sobre el cierre de caja..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
              />
            </div>
          </div>

          {/* Botón de envío */}
          <div className="flex flex-col items-center space-y-4">
            {/* Mensaje de validación */}
            {(!efectivoContado.trim() || !tarjetaContado.trim() || !yapeContado.trim()) && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-md">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-blue-900">Completa el conteo</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Debe ingresar todos los montos del conteo realizado (efectivo, tarjeta y Yape/Plin) para poder cerrar la caja.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <button
              type="submit"
              disabled={cargando || !efectivoContado.trim() || !tarjetaContado.trim() || !yapeContado.trim()}
              className={`px-8 py-4 rounded-2xl font-semibold text-white transition-all duration-200 flex items-center shadow-lg hover:shadow-xl transform hover:scale-105 ${
                cargando || !efectivoContado.trim() || !tarjetaContado.trim() || !yapeContado.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
              }`}
            >
              {cargando ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  Procesando Cierre...
                </>
              ) : (
                <>
                  <CheckCircle className="h-6 w-6 mr-3" />
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
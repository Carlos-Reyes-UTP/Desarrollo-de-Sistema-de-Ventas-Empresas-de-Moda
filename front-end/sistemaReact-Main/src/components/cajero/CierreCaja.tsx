import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { VentaService } from '../../services/VentaService';
import { CajaService, type CierreCajaRequest } from '../../services/CajaService';
import { Printer, CheckCircle, Clock, User, Calculator, Loader2, ArrowRight, TrendingDown, AlertCircle } from 'lucide-react';
import { obtenerDatosApertura, limpiarDatosApertura, guardarDatosApertura } from './AperturaCaja';
import { APP_PATHS } from '../../shared/layout/navigationConfig';
import { CajeroThemeToggle } from './CajeroThemeToggle';

interface DiferenciasCierreCaja {
  diferenciasEfectivo: number;
  diferenciasTarjeta: number;
  diferenciasYape: number;
  efectivoEsperado: number;
  discrepanciaCaja: number;
}

interface DatosCierreCaja {
  usuario: string;
  fechaApertura: string;
  fechaCierre: string;
  montoInicial: number;
  totalVentas: number;
  efectivoVentas: number;
  tarjetaVentas: number;
  yapeVentas: number;
  efectivoContado: number;
  tarjetaContado: number;
  yapeContado: number;
  observaciones: string;
  diferencias: DiferenciasCierreCaja;
}

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
  const [datosCierre, setDatosCierre] = useState<DatosCierreCaja | null>(null);

  const obtenerFechaHoraActual = () => {
    const ahora = new Date();
    const dia = ahora.getDate().toString().padStart(2, '0');
    const mes = (ahora.getMonth() + 1).toString().padStart(2, '0');
    const año = ahora.getFullYear();
    const horas = ahora.getHours().toString().padStart(2, '0');
    const minutos = ahora.getMinutes().toString().padStart(2, '0');
    const segundos = ahora.getSeconds().toString().padStart(2, '0');
    return `${dia}/${mes}/${año} — ${horas}:${minutos}:${segundos}`;
  };

  useEffect(() => {
    const cargarDatosIniciales = async () => {
      let datosApertura: any = null;
      try {
        datosApertura = obtenerDatosApertura();

        if (datosApertura?.idCaja) {
          const caja = await CajaService.obtenerCajaPorId(datosApertura.idCaja);
          if (caja && caja.estado === 'ABIERTA') {
            setFechaApertura(new Date(caja.fechaApertura).toLocaleString('es-ES'));
            setMontoInicial(caja.montoApertura.toString());
            setTotalVentas(caja.totalVentas || 0);
            setEfectivoVentas(caja.montoVentasEfectivo || 0);
            setTarjetaVentas(caja.montoVentasTarjeta || 0);
            setYapeVentas(caja.montoVentasYape || 0);
            return;
          }
        }

        const cajaAbierta = await CajaService.obtenerCajaAbierta();
        if (cajaAbierta) {
          setFechaApertura(new Date(cajaAbierta.fechaApertura).toLocaleString('es-ES'));
          setMontoInicial(cajaAbierta.montoApertura.toString());
          setTotalVentas(cajaAbierta.totalVentas || 0);
          setEfectivoVentas(cajaAbierta.montoVentasEfectivo || 0);
          setTarjetaVentas(cajaAbierta.montoVentasTarjeta || 0);
          setYapeVentas(cajaAbierta.montoVentasYape || 0);
          const datosAperturaActualizados = {
            usuario: cajaAbierta.usuario,
            fechaHoraApertura: new Date(cajaAbierta.fechaApertura).toLocaleString('es-ES'),
            timestampApertura: new Date(cajaAbierta.fechaApertura).toISOString(),
            montoApertura: cajaAbierta.montoApertura,
            numeroOperacionApertura: cajaAbierta.numeroOperacion,
            idCaja: cajaAbierta.idCaja,
            fechaApertura: new Date(cajaAbierta.fechaApertura).toLocaleDateString('es-ES'),
            horaApertura: new Date(cajaAbierta.fechaApertura).toLocaleTimeString('es-ES'),
          };
          guardarDatosApertura(datosAperturaActualizados);
        } else if (datosApertura) {
          setFechaApertura(datosApertura.fechaHoraApertura);
          setMontoInicial(datosApertura.montoApertura?.toString() || '0');
        } else {
          setFechaApertura(obtenerFechaHoraActual());
        }

        // Cargar ventas del día
        try {
          setFechaCierre(obtenerFechaHoraActual());
          const fechaActual = new Date();
          const yyyy = fechaActual.getFullYear();
          const mm = String(fechaActual.getMonth() + 1).padStart(2, '0');
          const dd = String(fechaActual.getDate()).padStart(2, '0');
          const fechaFiltro = `${yyyy}-${mm}-${dd}`;

          let ventasDelDia: import('../../types/Venta').Venta[] = [];
          try {
            const ventasResponse = await VentaService.obtenerVentasPorFecha(fechaFiltro);
            ventasDelDia = Array.isArray(ventasResponse) ? ventasResponse : [];
            if (ventasDelDia.length === 0) {
              const todasLasVentas = await VentaService.obtenerTodasVentas();
              ventasDelDia = todasLasVentas.filter((venta) => {
                if (!venta.fechaVenta) return false;
                const fechaVentaStr = venta.fechaVenta.split(/[ T]/)[0];
                return fechaVentaStr === fechaFiltro;
              });
            }
          } catch {
            ventasDelDia = [];
          }

          const totalVentasCalculado = ventasDelDia.reduce((sum, venta) => sum + (venta.totalVentas ?? 0), 0);
          setTotalVentas(totalVentasCalculado);

          let efectivoVentasCalc = 0;
          let tarjetaVentasCalc = 0;
          let yapeVentasCalc = 0;

          ventasDelDia.forEach((venta) => {
            let metodoPagoStr = '';
            if (typeof venta.metodoPago === 'string') metodoPagoStr = venta.metodoPago;
            else if (venta.metodoPago?.nombre) metodoPagoStr = venta.metodoPago.nombre;
            metodoPagoStr = metodoPagoStr.toUpperCase().replace(/\s+/g, '');
            const monto = venta.totalVentas ?? 0;
            if (metodoPagoStr.includes('EFECTIVO') || metodoPagoStr.includes('CASH')) efectivoVentasCalc += monto;
            else if (metodoPagoStr.includes('TARJETA') || metodoPagoStr.includes('VISA') || metodoPagoStr.includes('MASTERCARD') || metodoPagoStr.includes('CARD')) tarjetaVentasCalc += monto;
            else if (metodoPagoStr.includes('YAPE') || metodoPagoStr.includes('PLIN') || metodoPagoStr.includes('DIGITAL')) yapeVentasCalc += monto;
            else efectivoVentasCalc += monto;
          });

          setEfectivoVentas(efectivoVentasCalc);
          setTarjetaVentas(tarjetaVentasCalc);
          setYapeVentas(yapeVentasCalc);
        } catch {
          // silently fail
        }
      } catch {
        if (datosApertura) {
          setFechaApertura(datosApertura.fechaHoraApertura);
          setMontoInicial(datosApertura.montoApertura?.toString() || '0');
        } else {
          setFechaApertura(obtenerFechaHoraActual());
        }
        setTotalVentas(0);
        setEfectivoVentas(0);
        setTarjetaVentas(0);
        setYapeVentas(0);
        setFechaCierre(obtenerFechaHoraActual());
      }
    };

    cargarDatosIniciales();
    const intervalo = setInterval(() => setFechaCierre(obtenerFechaHoraActual()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  const validarCampos = () => {
    if (!fechaApertura.trim()) { setError('La fecha de apertura es obligatoria.'); return false; }
    if (!montoInicial || parseFloat(montoInicial) < 0) { setError('El monto inicial debe ser un valor válido.'); return false; }
    if (!efectivoContado.trim()) { setError('Complete el conteo de efectivo.'); return false; }
    if (!tarjetaContado.trim()) { setError('Complete el conteo de tarjeta.'); return false; }
    if (!yapeContado.trim()) { setError('Complete el conteo de Yape/Plin.'); return false; }
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
    const efectivoEsperado = montoInicialNum + efectivoVentas;
    const discrepanciaCaja = efecContado - efectivoEsperado;
    return { diferenciasEfectivo, diferenciasTarjeta, diferenciasYape, efectivoEsperado, discrepanciaCaja };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validarCampos()) return;
    try {
      setCargando(true);
      const diferencias = calcularDiferencias();
      const datosApertura = obtenerDatosApertura();
      const idCaja = datosApertura?.idCaja;
      if (!idCaja) { setError('No se encontró el ID de caja. Debe abrir la caja primero.'); setCargando(false); return; }
      const cierreRequest: CierreCajaRequest = {
        efectivoContado: parseFloat(efectivoContado),
        tarjetaContado: parseFloat(tarjetaContado),
        yapeContado: parseFloat(yapeContado),
        observaciones: observaciones || undefined,
      };
      await CajaService.cerrarCaja(idCaja, cierreRequest);
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
        diferencias,
      };
      setDatosCierre(datosCierreCalculados);
      setCierreExitoso(true);
      limpiarDatosApertura();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al registrar el cierre de caja.');
    } finally {
      setCargando(false);
    }
  };

  const finalizarCierre = () => {
    limpiarDatosApertura();
    navigate(APP_PATHS.caja, { state: { view: 'apertura' } });
  };

  const imprimirComprobante = () => {
    if (!datosCierre) return;
    const discrepancia = datosCierre.diferencias.discrepanciaCaja;
    const estadoCaja = discrepancia === 0 ? 'CAJA CUADRADA ✓' : discrepancia > 0 ? `SOBRANTE: S/ ${discrepancia.toFixed(2)}` : `FALTANTE: S/ ${Math.abs(discrepancia).toFixed(2)}`;
    const comprobanteHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Comprobante de Cierre</title><style>body{font-family:'Courier New',monospace;font-size:12px;line-height:1.4;margin:0;padding:20px;background:white}.comprobante{width:300px;margin:0 auto;border:2px dashed #333;padding:15px;background:white}.header{text-align:center;border-bottom:1px solid #333;padding-bottom:10px;margin-bottom:15px}.company-name{font-size:16px;font-weight:bold;margin-bottom:5px}.title{font-size:14px;font-weight:bold;margin-bottom:5px}.info-row{display:flex;justify-content:space-between;margin-bottom:3px;padding:2px 0}.info-label{font-weight:normal}.info-value{font-weight:bold}.separator{border-top:1px dashed #333;margin:10px 0}.section{margin:15px 0}.section-title{font-weight:bold;text-align:center;margin-bottom:8px;border-bottom:1px solid #333;padding-bottom:3px}.resultado-final{text-align:center;font-size:14px;font-weight:bold;padding:8px;border:2px solid #333;margin:10px 0}.footer{text-align:center;margin-top:15px;font-size:11px;border-top:1px solid #333;padding-top:10px}.operacion{text-align:center;font-size:10px;margin-top:10px;color:#666}</style></head><body><div class="comprobante"><div class="header"><div class="company-name">DAKANI SYSTEM</div><div class="title">CIERRE DE CAJA</div><div>${new Date().toLocaleDateString()}</div></div><div class="info-row"><span class="info-label">Cajero:</span><span class="info-value">${datosCierre.usuario}</span></div><div class="info-row"><span class="info-label">F. Apertura:</span><span class="info-value">${datosCierre.fechaApertura}</span></div><div class="info-row"><span class="info-label">F. Cierre:</span><span class="info-value">${datosCierre.fechaCierre}</span></div><div class="separator"></div><div class="section"><div class="section-title">RESUMEN DE CAJA</div><div class="info-row"><span class="info-label">Monto Inicial:</span><span class="info-value">S/ ${datosCierre.montoInicial.toFixed(2)}</span></div><div class="info-row"><span class="info-label">Total Ventas:</span><span class="info-value">S/ ${datosCierre.totalVentas.toFixed(2)}</span></div><div class="info-row"><span class="info-label">Efectivo Esperado:</span><span class="info-value">S/ ${datosCierre.diferencias.efectivoEsperado.toFixed(2)}</span></div></div><div class="separator"></div><div class="section"><div class="section-title">VENTAS POR MÉTODO</div><div class="info-row"><span class="info-label">Efectivo:</span><span class="info-value">S/ ${datosCierre.efectivoVentas.toFixed(2)}</span></div><div class="info-row"><span class="info-label">Tarjeta:</span><span class="info-value">S/ ${datosCierre.tarjetaVentas.toFixed(2)}</span></div><div class="info-row"><span class="info-label">Yape/Plin:</span><span class="info-value">S/ ${datosCierre.yapeVentas.toFixed(2)}</span></div></div><div class="separator"></div><div class="section"><div class="section-title">CONTEO REALIZADO</div><div class="info-row"><span class="info-label">Efectivo:</span><span class="info-value">S/ ${datosCierre.efectivoContado.toFixed(2)}</span></div><div class="info-row"><span class="info-label">Tarjeta:</span><span class="info-value">S/ ${datosCierre.tarjetaContado.toFixed(2)}</span></div><div class="info-row"><span class="info-label">Yape/Plin:</span><span class="info-value">S/ ${datosCierre.yapeContado.toFixed(2)}</span></div></div><div class="resultado-final">${estadoCaja}</div>${datosCierre.observaciones ? `<div class="section"><div class="section-title">OBSERVACIONES</div><div style="font-size:11px;text-align:justify">${datosCierre.observaciones}</div></div>` : ''}<div class="footer"><div>CAJA CERRADA CORRECTAMENTE</div><div style="margin-top:5px">Conserve este comprobante</div><div>para sus registros</div></div><div class="operacion">${new Date().toLocaleString()}</div></div><script>setTimeout(()=>{window.print();},500);</script></body></html>`;
    const ventanaImpresion = window.open('', '_blank', `width=400,height=600,scrollbars=yes,resizable=yes,left=${screen.width / 2 - 200},top=${screen.height / 2 - 300}`);
    if (ventanaImpresion) ventanaImpresion.document.body.innerHTML = comprobanteHtml;
  };

  // ── VISTA ÉXITO ───────────────────────────────────────────────────────────────
  if (cierreExitoso && datosCierre) {
    const discrepancia = datosCierre.diferencias.discrepanciaCaja;
    return (
      <div className="p-10 max-w-[900px] mx-auto caj-page min-h-screen animate-fadeIn text-left font-sans">
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
          <h1 className="text-[2.25rem] font-bold tracking-tight caj-heading leading-none mb-2">CIERRE DE CAJA</h1>
          <p className="caj-label text-sm font-medium uppercase tracking-[0.1em]">Final de turno — Resumen de la caja del día</p>
          </div>
          <CajeroThemeToggle />
        </div>

        <div className="caj-card rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden mb-8">
          {/* Banner */}
          <div className="bg-black px-10 py-8 flex items-center gap-6">
            <div className="w-12 h-12 caj-card rounded-2xl flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-6 w-6 caj-heading" />
            </div>
            <div>
              <h2 className="text-[11px] font-bold tracking-[0.4em] text-white uppercase mb-1">¡Turno finalizado!</h2>
              <p className="text-gray-400 text-[11px] font-medium uppercase tracking-widest">La caja ha sido cerrada correctamente</p>
            </div>
            <div className="ml-auto">
              <span className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest ${discrepancia === 0 ? 'caj-card caj-heading' : discrepancia > 0 ? 'bg-gray-600 text-white' : 'bg-gray-700 text-white'}`}>
                {discrepancia === 0 ? 'CAJA CUADRADA' : discrepancia > 0 ? 'HAY SOBRANTE' : 'HAY FALTANTE'}
              </span>
            </div>
          </div>

          {/* Summary Grid */}
          <div className="p-10 grid grid-cols-2 gap-6">
            <div className="caj-page rounded-[2rem] p-7 border border-gray-50">
              <span className="block text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em] mb-3">Cajero</span>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="text-[14px] font-bold caj-heading uppercase tracking-tight">{datosCierre.usuario}</span>
              </div>
            </div>

            <div className="caj-page rounded-[2rem] p-7 border border-gray-50">
              <span className="block text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em] mb-3">Ventas realizadas</span>
              <span className="text-[28px] font-extrabold caj-heading tracking-tighter">S/{datosCierre.totalVentas.toFixed(2)}</span>
            </div>

            <div className="caj-page rounded-[2rem] p-7 border border-gray-50">
              <span className="block text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em] mb-3">Efectivo Esperado</span>
              <span className="text-[24px] font-extrabold caj-heading tracking-tighter">S/{datosCierre.diferencias.efectivoEsperado.toFixed(2)}</span>
            </div>

            <div className={`rounded-[2rem] p-7 border transition-all ${discrepancia === 0 ? 'bg-[#fcfcfc] border-black shadow-sm' : 'caj-page border-gray-50'}`}>
              <span className={`block text-[10px] font-bold uppercase tracking-[0.3em] mb-3 ${discrepancia === 0 ? 'text-gray-400' : 'text-gray-300'}`}>Diferencia de dinero</span>
              <span className={`text-[28px] font-extrabold tracking-tighter caj-heading`}>
                {discrepancia === 0 ? (
                  <span className="flex items-center gap-2"><CheckCircle className="h-7 w-7 caj-heading" /> Cuadrada</span>
                ) : `S/${Math.abs(discrepancia).toFixed(2)}`}
              </span>
              {discrepancia !== 0 && (
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{discrepancia > 0 ? 'Hay un sobrante' : 'Hay un faltante'}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="px-10 pb-10 flex gap-4">
            <button
              onClick={imprimirComprobante}
              className="flex items-center gap-3 px-7 py-4 caj-input border border-gray-100 rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.25em] text-gray-600 hover:bg-gray-100 transition-all"
            >
              <Printer size={16} />
              Imprimir recibo
            </button>
            <button
              onClick={finalizarCierre}
              className="flex-1 flex items-center justify-center gap-3 py-4 bg-black text-white rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-gray-800 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.15)] active:scale-[0.98] group"
            >
              Siguiente turno
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── FORMULARIO DE CIERRE ──────────────────────────────────────────────────────
  const discrepanciaPreview = (parseFloat(efectivoContado) || 0) - ((parseFloat(montoInicial) || 0) + efectivoVentas);
  const hayConteo = efectivoContado || tarjetaContado || yapeContado;

  return (
    <div className="p-10 max-w-[1100px] mx-auto caj-page min-h-screen animate-fadeIn text-left font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-[2.25rem] font-bold tracking-tight caj-heading leading-none mb-2">CIERRE DE CAJA</h1>
          <p className="caj-label text-sm font-medium uppercase tracking-[0.08em]">Resumen del día — Ingrese el dinero contado</p>
        </div>
        <div className="flex items-center gap-3">
          <CajeroThemeToggle />
        <div className="px-6 py-3 caj-card border caj-border rounded-2xl shadow-sm">
          <span className="caj-label text-[9px] font-bold uppercase tracking-widest block mb-1">Terminal</span>
          <span className="text-xs font-bold caj-heading uppercase">Caja Principal 01</span>
        </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-8 px-8 py-5 bg-black text-white rounded-[2rem] flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-gray-400 hover:text-white transition-colors text-[11px] font-bold uppercase tracking-widest">Cerrar</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ─ SECCIÓN A: INFORMACIÓN GENERAL ─────────────────────────────────── */}
        <div className="caj-card rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-10 py-8 border-b border-gray-50 flex items-center gap-4">
            <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center shadow-lg">
              <User className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-[12px] font-bold tracking-[0.3em] caj-heading uppercase">Datos del Cajero</h2>
          </div>

          <div className="p-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Operador */}
            <div>
              <label className="block text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase mb-4 pl-1">Cajero actual</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <User size={16} className="text-gray-300" />
                </div>
                <input type="text" value={usuario?.usuario ?? 'Usuario actual'} readOnly
                  className="w-full pl-12 pr-5 py-4 caj-input border-none rounded-[1.5rem] text-sm font-bold caj-heading tracking-wider focus:outline-none shadow-inner" />
              </div>
            </div>

            {/* Fecha Apertura */}
            <div>
              <label className="block text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase mb-4 pl-1">Fecha de Apertura</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <Clock size={16} className="text-gray-300" />
                </div>
                <input id="fecha-apertura" type="text" value={fechaApertura}
                  onChange={(e) => setFechaApertura(e.target.value)}
                  placeholder="dd/mm/yyyy — hh:mm:ss" required
                  className="w-full pl-12 pr-5 py-4 caj-input border-none rounded-[1.5rem] text-sm font-bold caj-heading font-mono tracking-wider focus:caj-card focus:ring-[4px] focus:ring-gray-100 transition-all shadow-inner" />
              </div>
            </div>

            {/* Fecha Cierre */}
            <div>
              <label className="block text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase mb-4 pl-1">
                <span className="flex items-center gap-2">Fecha de Cierre <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse"></span><span className="text-[8px]">Hora actual</span></span></span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <Clock size={16} className="text-gray-300" />
                </div>
                <input id="fecha-cierre" type="text" value={fechaCierre} readOnly
                  className="w-full pl-12 pr-5 py-4 caj-input border-none rounded-[1.5rem] text-sm font-bold caj-heading font-mono tracking-wider focus:outline-none shadow-inner" />
              </div>
            </div>
          </div>
        </div>

        {/* ─ SECCIÓN B: RESUMEN DE VENTAS ────────────────────────────────────── */}
        <div className="caj-card rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-10 py-8 border-b border-gray-50 flex items-center gap-4">
            <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center shadow-lg">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-[12px] font-bold tracking-[0.3em] caj-heading uppercase">Ventas del turno</h2>
            <span className="ml-auto text-[10px] font-bold text-gray-300 uppercase tracking-widest caj-page px-4 py-2 rounded-xl border border-gray-100">Calculado automáticamente</span>
          </div>

          <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Monto Inicial */}
            <div>
              <label htmlFor="monto-inicial" className="block text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase mb-4 pl-1">Dinero inicial</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><span className="text-gray-400 font-extrabold text-base">S/</span></div>
                <input id="monto-inicial" type="number" min="0" step="0.01" placeholder="0.00" value={montoInicial}
                  onChange={(e) => setMontoInicial(e.target.value)} required
                  className="w-full pl-12 pr-5 py-4 caj-input border-none rounded-[1.5rem] text-base font-bold caj-heading focus:caj-card focus:ring-[4px] focus:ring-gray-100 transition-all shadow-inner" />
              </div>
            </div>

            {/* Total Ventas */}
            <div>
              <label htmlFor="total-ventas" className="block text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase mb-4 pl-1">Ventas totales</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><span className="text-gray-400 font-extrabold text-base">S/</span></div>
                <input id="total-ventas" type="text" value={totalVentas.toFixed(2)} readOnly
                  className="w-full pl-12 pr-5 py-4 caj-input border-none rounded-[1.5rem] text-base font-bold caj-heading focus:outline-none shadow-inner" />
              </div>
            </div>

            {/* Efectivo Ventas */}
            <div>
              <label htmlFor="efectivo-ventas" className="block text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase mb-4 pl-1">En Efectivo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><span className="text-gray-400 font-extrabold text-base">S/</span></div>
                <input id="efectivo-ventas" type="text" value={efectivoVentas.toFixed(2)} readOnly
                  className="w-full pl-12 pr-5 py-4 caj-input border-none rounded-[1.5rem] text-base font-bold caj-heading focus:outline-none shadow-inner" />
              </div>
            </div>

            {/* Tarjeta Ventas */}
            <div>
              <label htmlFor="tarjeta-ventas" className="block text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase mb-4 pl-1">En Tarjeta</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><span className="text-gray-400 font-extrabold text-base">S/</span></div>
                <input id="tarjeta-ventas" type="text" value={tarjetaVentas.toFixed(2)} readOnly
                  className="w-full pl-12 pr-5 py-4 caj-input border-none rounded-[1.5rem] text-base font-bold caj-heading focus:outline-none shadow-inner" />
              </div>
            </div>

            {/* Yape Ventas */}
            <div>
              <label htmlFor="yape-ventas" className="block text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase mb-4 pl-1">En Yape / Plin</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><span className="text-gray-400 font-extrabold text-base">S/</span></div>
                <input id="yape-ventas" type="text" value={yapeVentas.toFixed(2)} readOnly
                  className="w-full pl-12 pr-5 py-4 caj-input border-none rounded-[1.5rem] text-base font-bold caj-heading focus:outline-none shadow-inner" />
              </div>
            </div>
          </div>
        </div>

        {/* ─ SECCIÓN C: CONTEO FÍSICO ────────────────────────────────────────── */}
        <div className="caj-card rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-10 py-8 border-b border-gray-50 flex items-center gap-4">
            <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center shadow-lg">
              <TrendingDown className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-[12px] font-bold tracking-[0.3em] caj-heading uppercase">Dinero contado</h2>
            <span className="ml-auto text-[10px] font-bold text-gray-300 uppercase tracking-widest caj-page px-4 py-2 rounded-xl border border-gray-100">Completar manualmente</span>
          </div>

          <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Efectivo */}
            <div>
              <label htmlFor="efectivo-contado" className="block text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase mb-4 pl-1">Efectivo físico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><span className="text-gray-400 font-extrabold text-base">S/</span></div>
                <input id="efectivo-contado" type="number" step="0.01" min="0" value={efectivoContado}
                  onChange={(e) => setEfectivoContado(e.target.value)} placeholder="0.00" required
                  className="w-full pl-12 pr-5 py-5 caj-input border-none rounded-[1.5rem] text-lg font-extrabold caj-heading placeholder:text-gray-200 focus:caj-card focus:ring-[4px] focus:ring-gray-100 transition-all shadow-inner" />
              </div>
            </div>

            {/* Tarjeta */}
            <div>
              <label htmlFor="tarjeta-contado" className="block text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase mb-4 pl-1">Vouchers de Tarjeta</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><span className="text-gray-400 font-extrabold text-base">S/</span></div>
                <input id="tarjeta-contado" type="number" step="0.01" min="0" value={tarjetaContado}
                  onChange={(e) => setTarjetaContado(e.target.value)} placeholder="0.00" required
                  className="w-full pl-12 pr-5 py-5 caj-input border-none rounded-[1.5rem] text-lg font-extrabold caj-heading placeholder:text-gray-200 focus:caj-card focus:ring-[4px] focus:ring-gray-100 transition-all shadow-inner" />
              </div>
            </div>

            {/* Yape */}
            <div>
              <label htmlFor="yape-contado" className="block text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase mb-4 pl-1">Vouchers de Yape / Plin</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><span className="text-gray-400 font-extrabold text-base">S/</span></div>
                <input id="yape-contado" type="number" step="0.01" min="0" value={yapeContado}
                  onChange={(e) => setYapeContado(e.target.value)} placeholder="0.00" required
                  className="w-full pl-12 pr-5 py-5 caj-input border-none rounded-[1.5rem] text-lg font-extrabold caj-heading placeholder:text-gray-200 focus:caj-card focus:ring-[4px] focus:ring-gray-100 transition-all shadow-inner" />
              </div>
            </div>
          </div>
        </div>

        {/* ─ SECCIÓN D: PREVIEW DISCREPANCIA ────────────────────────────────── */}
        {hayConteo && (
          <div className={`rounded-[3rem] border overflow-hidden transition-all duration-500 ${discrepanciaPreview === 0 ? 'bg-[#fcfcfc] border-black shadow-lg translate-y-[-4px]' : 'caj-card border-gray-100'}`}>
            <div className="px-10 py-8 flex items-center justify-between">
              <div>
                <span className={`block text-[10px] font-bold uppercase tracking-[0.3em] mb-3 text-gray-400`}>
                  Diferencia de dinero
                </span>
                <span className={`text-[36px] font-extrabold tracking-tighter leading-none caj-heading`}>
                  {discrepanciaPreview === 0 ? (
                    <span className="flex items-center gap-3"><CheckCircle className="h-8 w-8 caj-heading" /> CAJA CUADRADA</span>
                  ) : `S/${Math.abs(discrepanciaPreview).toFixed(2)}`}
                </span>
                {discrepanciaPreview !== 0 && (
                  <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                    {discrepanciaPreview > 0 ? 'Hay un sobrante' : 'Hay un faltante'} — Verifique el conteo
                  </span>
                )}
              </div>
              <div className={`px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 ${discrepanciaPreview === 0 ? 'bg-black text-white' : 'caj-page text-gray-600 border border-gray-100'}`}>
                {discrepanciaPreview === 0 ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {discrepanciaPreview === 0 ? 'Correcto' : 'Revisar'}
              </div>
            </div>
          </div>
        )}

        {/* ─ SECCIÓN E: OBSERVACIONES ────────────────────────────────────────── */}
        <div className="caj-card rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-10 py-8 border-b border-gray-50">
            <h2 className="text-[12px] font-bold tracking-[0.3em] caj-heading uppercase">Observaciones</h2>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-1">Opcional — algún comentario adicional</p>
          </div>
          <div className="p-10">
            <textarea
              id="observaciones"
              rows={4}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ingrese cualquier observación sobre el cierre de caja..."
              className="w-full px-7 py-5 caj-input border-none rounded-[1.5rem] text-sm font-medium caj-heading placeholder:text-gray-300 focus:caj-card focus:ring-[4px] focus:ring-gray-100 transition-all resize-none shadow-inner leading-relaxed"
            />
          </div>
        </div>

        {/* ─ SUBMIT ──────────────────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={cargando || !efectivoContado.trim() || !tarjetaContado.trim() || !yapeContado.trim()}
          className="w-full py-6 bg-black text-white rounded-[2rem] text-[12px] font-bold uppercase tracking-[0.4em] shadow-[0_30px_60px_rgba(0,0,0,0.2)] hover:bg-gray-800 transition-all active:scale-[0.97] disabled:opacity-20 disabled:cursor-not-allowed group flex items-center justify-center gap-4 relative overflow-hidden"
        >
          <div className="absolute inset-0 caj-card/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          {cargando ? <Loader2 className="animate-spin h-5 w-5" /> : <CheckCircle className="w-5 h-5" />}
          <span className="relative z-10">{cargando ? 'CERRANDO...' : 'CERRAR CAJA'}</span>
        </button>
      </form>
    </div>
  );
};

export default CierreCaja;

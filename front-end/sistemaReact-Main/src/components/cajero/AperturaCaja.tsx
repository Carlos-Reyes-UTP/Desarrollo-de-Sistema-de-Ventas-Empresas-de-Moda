import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Printer, CheckCircle, Clock, User, Loader2, ArrowRight, TrendingUp } from 'lucide-react';
import { CajaService, type AperturaCajaRequest } from '../../services/CajaService';
import { APP_PATHS } from '../../shared/layout/navigationConfig';
import { Skeleton } from '@/shared/ui';
import { CajeroThemeToggle } from './CajeroThemeToggle';

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
  const [verificandoCaja, setVerificandoCaja] = useState<boolean>(true);

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

  const formatearFechaISO = (isoString: string) => {
    const fecha = new Date(isoString);
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const año = fecha.getFullYear();
    const horas = fecha.getHours().toString().padStart(2, '0');
    const minutos = fecha.getMinutes().toString().padStart(2, '0');
    const segundos = fecha.getSeconds().toString().padStart(2, '0');
    return `${dia}/${mes}/${año} — ${horas}:${minutos}:${segundos}`;
  };

  useEffect(() => {
    const verificarCajaActiva = async () => {
      try {
        setVerificandoCaja(true);
        // Primero intentar recuperar de localStorage para rapidez
        const locales = obtenerDatosApertura();
        
        // Consultar al backend por seguridad
        const cajaAbierta = await CajaService.obtenerCajaAbierta();
        
        if (cajaAbierta) {
          const datos = {
            usuario: cajaAbierta.usuario,
            fechaHora: formatearFechaISO(cajaAbierta.fechaApertura),
            monto: cajaAbierta.montoApertura,
            numeroOperacion: cajaAbierta.numeroOperacion,
            timestamp: cajaAbierta.fechaApertura,
            idCaja: cajaAbierta.idCaja,
          };
          
          if (!locales || locales.idCaja !== cajaAbierta.idCaja) {
            guardarDatosApertura(datos);
          }
          
          setDatosApertura(datos);
          setAperturaExitosa(true);
        } else if (locales) {
          // Si el backend dice que no hay caja pero local sí, limpiar local
          limpiarDatosApertura();
        }
      } catch (err) {
        console.error("Error al verificar caja activa:", err);
      } finally {
        setVerificandoCaja(false);
      }
    };

    verificarCajaActiva();

    setFechaHoraApertura(obtenerFechaHoraActual());
    const intervalo = setInterval(() => {
      setFechaHoraApertura(obtenerFechaHoraActual());
    }, 1000);
    return () => clearInterval(intervalo);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!montoApertura || parseFloat(montoApertura) <= 0) {
      setError('Ingrese un monto inicial válido para continuar.');
      return;
    }
    try {
      setCargando(true);
      const aperturaRequest: AperturaCajaRequest = { montoApertura: parseFloat(montoApertura) };
      const response = await CajaService.abrirCaja(aperturaRequest.montoApertura);
      const datos = {
        usuario: usuario?.usuario ?? 'Usuario desconocido',
        fechaHora: fechaHoraApertura,
        monto: parseFloat(montoApertura),
        numeroOperacion: response.numeroOperacion,
        timestamp: new Date().toISOString(),
        idCaja: response.idCaja,
      };
      guardarDatosApertura(datos);
      setDatosApertura(datos);
      setAperturaExitosa(true);
    } catch (err: any) {
      const mensajeError = err.response?.data?.message || err.message || 'Error al registrar la apertura de caja.';
      setError(mensajeError);
    } finally {
      setCargando(false);
    }
  };

  const imprimirComprobante = () => {
    if (!datosApertura) return;
    const comprobanteHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Comprobante de Apertura</title><style>body{font-family:'Courier New',monospace;font-size:12px;line-height:1.4;margin:0;padding:20px;background:white}.comprobante{width:300px;margin:0 auto;border:2px dashed #333;padding:15px;background:white}.header{text-align:center;border-bottom:1px solid #333;padding-bottom:10px;margin-bottom:15px}.company-name{font-size:16px;font-weight:bold;margin-bottom:5px}.title{font-size:14px;font-weight:bold;margin-bottom:5px}.info-row{display:flex;justify-content:space-between;margin-bottom:8px;padding:2px 0}.info-label{font-weight:bold}.info-value{text-align:right}.separator{border-top:1px dashed #333;margin:15px 0}.monto-section{text-align:center;padding:10px 0;border:1px solid #333;margin:15px 0;background:#f9f9f9}.monto-label{font-size:10px;margin-bottom:5px}.monto-valor{font-size:18px;font-weight:bold}.footer{text-align:center;margin-top:15px;font-size:10px;border-top:1px solid #333;padding-top:10px}@media print{body{background:white;padding:0}.comprobante{border:none;width:100%;margin:0}}</style></head><body><div class="comprobante"><div class="header"><div class="company-name">DAKANI SYSTEM</div><div class="title">APERTURA DE CAJA</div></div><div class="info-row"><span class="info-label">Fecha y Hora:</span><span class="info-value">${datosApertura.fechaHora}</span></div><div class="info-row"><span class="info-label">Usuario:</span><span class="info-value">${datosApertura.usuario}</span></div><div class="info-row"><span class="info-label">Operación N°:</span><span class="info-value">${datosApertura.numeroOperacion}</span></div><div class="separator"></div><div class="monto-section"><div class="monto-label">MONTO DE APERTURA</div><div class="monto-valor">S/ ${datosApertura.monto.toFixed(2)}</div></div><div class="separator"></div><div class="footer"><div>CAJA ABIERTA CORRECTAMENTE</div><div style="margin-top:5px">Conserve este comprobante</div><div>para el cierre de caja</div></div></div><script>setTimeout(()=>{window.print();},500);</script></body></html>`;
    const ventanaImpresion = window.open('', '_blank', `width=400,height=600,scrollbars=yes,resizable=yes,left=${screen.width / 2 - 200},top=${screen.height / 2 - 300}`);
    if (ventanaImpresion) {
      ventanaImpresion.document.body.innerHTML = comprobanteHtml;
    }
  };

  const finalizarApertura = () => {
    setAperturaExitosa(false);
    setDatosApertura(null);
    setMontoApertura('');
    navigate(APP_PATHS.caja, { state: { view: 'ventas' }, replace: true });
    onAperturaCompleta();
  };

  if (verificandoCaja) {
    return (
      <div className="p-10 max-w-[900px] mx-auto caj-page min-h-screen animate-fadeIn text-left font-sans">
        <Skeleton className="mb-2 h-10 w-72" />
        <Skeleton className="mb-10 h-4 w-96 max-w-full" variant="muted" />
        <div className="overflow-hidden rounded-[3rem] border border-gray-100 caj-card shadow-sm">
          <div className="border-b border-gray-50 px-10 py-8">
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="space-y-8 p-10">
            <Skeleton className="h-16 w-full rounded-[1.5rem]" variant="muted" />
            <Skeleton className="h-16 w-full rounded-[1.5rem]" variant="muted" />
            <Skeleton className="h-16 w-full rounded-[1.5rem]" variant="muted" />
            <Skeleton className="h-14 w-full rounded-[1.5rem]" />
          </div>
        </div>
      </div>
    );
  }

  // ── VISTA DE ÉXITO ────────────────────────────────────────────────────────────
  if (aperturaExitosa && datosApertura) {
    return (
      <div className="p-10 max-w-[900px] mx-auto caj-page min-h-screen animate-fadeIn text-left font-sans">
        {/* Header */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
          <h1 className="text-[2.25rem] font-bold tracking-tight caj-heading leading-none mb-2">CAJA ACTIVA</h1>
          <p className="caj-label text-sm font-medium uppercase tracking-[0.1em]">Sesión de turno en curso — Detalles del inicio</p>
          </div>
          <CajeroThemeToggle />
        </div>

        {/* Success Card */}
        <div className="caj-card rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden mb-8">
          {/* Confirmation Banner */}
          <div className="bg-black px-10 py-8 flex items-center gap-6">
            <div className="w-12 h-12 caj-card rounded-2xl flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-6 w-6 caj-heading" />
            </div>
            <div>
              <h2 className="text-[11px] font-bold tracking-[0.4em] text-white uppercase mb-1">Caja Verificada</h2>
              <p className="text-gray-400 text-[11px] font-medium uppercase tracking-widest">Actualmente operando con normalidad</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-2 h-2 rounded-full caj-card animate-pulse"></div>
              <h3 className="text-lg font-bold text-white uppercase tracking-[0.25em]">¡Caja abierta con éxito!</h3>
            </div>
          </div>

          {/* Details Grid */}
          <div className="p-10 grid grid-cols-2 gap-6">
            <div className="caj-page rounded-[2rem] p-7 border border-gray-50">
              <span className="block text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em] mb-3">Cajero de turno</span>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="text-[15px] font-bold caj-heading uppercase tracking-tight">{datosApertura.usuario}</span>
              </div>
            </div>

            <div className="caj-page rounded-[2rem] p-7 border border-gray-50">
              <span className="block text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em] mb-3">Fecha y Hora de Inicio</span>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <span className="text-[13px] font-bold caj-heading font-mono tracking-tight">{datosApertura.fechaHora}</span>
              </div>
            </div>

            <div className="col-span-2 bg-[#fcfcfc] border border-gray-100 rounded-[2rem] p-8 flex items-center justify-between shadow-sm">
              <div>
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">Monto inicial en caja</span>
                <span className="text-[42px] font-extrabold caj-heading tracking-tighter leading-none">S/{datosApertura.monto.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">N° de Operación</span>
                <span className="text-[13px] font-bold text-gray-400 font-mono tracking-wider">{datosApertura.numeroOperacion}</span>
              </div>
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
              onClick={finalizarApertura}
              className="flex-1 flex items-center justify-center gap-3 py-4 bg-black text-white rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-gray-800 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.15)] active:scale-[0.98] group"
            >
              Empezar a vender
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Note */}
        <div className="px-8 py-5 caj-card border border-gray-100 rounded-[2rem] flex items-start gap-4">
          <div className="w-1.5 h-1.5 rounded-full bg-black mt-2 flex-shrink-0"></div>
          <p className="text-[11px] font-medium text-gray-400 leading-relaxed">
            Conserve el comprobante de apertura hasta el <span className="caj-heading font-bold">cierre de caja</span>. Este documento será necesario para cuadrar las operaciones del día.
          </p>
        </div>
      </div>
    );
  }

  // ── VISTA DE FORMULARIO ───────────────────────────────────────────────────────
  return (
    <div className="p-10 max-w-[900px] mx-auto caj-page min-h-screen animate-fadeIn text-left font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-[2.25rem] font-bold tracking-tight caj-heading leading-none mb-2">APERTURA DE CAJA</h1>
          <p className="caj-label text-sm font-medium uppercase tracking-[0.08em]">Inicio de turno — Ingrese el monto con el que arranca la caja</p>
        </div>
        <div className="flex items-center gap-3">
          <CajeroThemeToggle />
        <div className="px-6 py-3 caj-card border caj-border rounded-2xl shadow-sm">
          <span className="caj-label text-[9px] font-bold uppercase tracking-widest block mb-1">Caja</span>
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

      {/* Main Card */}
      <div className="caj-card rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="px-10 py-8 border-b border-gray-50 flex items-center gap-4">
          <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center shadow-lg">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-[12px] font-bold tracking-[0.3em] caj-heading uppercase">Información de inicio</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          {/* Operador */}
          <div>
            <label className="block text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase mb-4 pl-1">Cajero de turno</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <User size={18} className="text-gray-300" />
              </div>
              <input
                type="text"
                value={usuario?.usuario ?? 'Usuario desconocido'}
                readOnly
                className="w-full pl-14 pr-5 py-5 caj-input border-none rounded-[1.5rem] text-sm font-bold caj-heading tracking-wider focus:outline-none shadow-inner"
              />
            </div>
          </div>

          {/* Fecha y Hora */}
          <div>
            <label className="block text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase mb-4 pl-1">Fecha y hora</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <Clock size={18} className="text-gray-300" />
              </div>
              <input
                type="text"
                value={fechaHoraApertura}
                readOnly
                className="w-full pl-14 pr-16 py-5 caj-input border-none rounded-[1.5rem] text-sm font-bold caj-heading font-mono tracking-wider focus:outline-none shadow-inner"
              />
              <div className="absolute inset-y-0 right-0 pr-6 flex items-center gap-2">
                <div className="w-2 h-2 bg-black rounded-full animate-pulse"></div>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Hora actual</span>
              </div>
            </div>
          </div>

          {/* Monto */}
          <div>
            <label className="block text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase mb-4 pl-1">Dinero para iniciar</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <span className="text-gray-400 font-extrabold text-xl">S/</span>
              </div>
              <input
                id="monto-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full pl-16 pr-6 py-5 caj-input border-none rounded-[1.5rem] text-[22px] font-extrabold caj-heading placeholder:text-gray-200 focus:ring-[4px] focus:ring-[var(--caj-ring)] transition-all shadow-inner tracking-tight"
                value={montoApertura}
                onChange={(e) => setMontoApertura(e.target.value)}
                required
              />
            </div>
            <p className="text-[10px] text-gray-400 font-medium mt-3 pl-1">
              Ingrese el monto en efectivo con el que inicia la caja hoy.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={cargando || !montoApertura || parseFloat(montoApertura) <= 0}
            className="w-full py-6 bg-black text-white rounded-[2rem] text-[12px] font-bold uppercase tracking-[0.4em] shadow-[0_30px_60px_rgba(0,0,0,0.2)] hover:bg-gray-800 transition-all active:scale-[0.97] disabled:opacity-20 disabled:cursor-not-allowed group flex items-center justify-center gap-4 relative overflow-hidden"
          >
            <div className="absolute inset-0 caj-card/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            {cargando ? <Loader2 className="animate-spin h-5 w-5" /> : <CheckCircle className="w-5 h-5" />}
            <span className="relative z-10">{cargando ? 'ABRIENDO...' : 'ABRIR CAJA'}</span>
          </button>
        </form>
      </div>

      {/* Info Footer */}
      <div className="mt-8 px-8 py-5 caj-card border border-gray-100 rounded-[2rem] flex items-start gap-4">
        <div className="w-1.5 h-1.5 rounded-full bg-black mt-2 flex-shrink-0"></div>
        <p className="text-[11px] font-medium text-gray-400 leading-relaxed">
          Verifique que el monto coincida exactamente con el efectivo físico en caja. Este valor será el <span className="caj-heading font-bold">monto base</span> para el cuadre al cierre del turno.
        </p>
      </div>
    </div>
  );
};

// Función utilitaria para guardar datos de apertura
export const guardarDatosApertura = (datos: any) => {
  localStorage.setItem('datosAperturaCaja:v1', JSON.stringify(datos));
};

// Función utilitaria para obtener datos de apertura guardados
export const obtenerDatosApertura = () => {
  const datos = localStorage.getItem('datosAperturaCaja:v1');
  return datos ? JSON.parse(datos) : null;
};

// Función utilitaria para limpiar datos de apertura después del cierre
export const limpiarDatosApertura = () => {
  localStorage.removeItem('datosAperturaCaja:v1');
};

export default AperturaCaja;

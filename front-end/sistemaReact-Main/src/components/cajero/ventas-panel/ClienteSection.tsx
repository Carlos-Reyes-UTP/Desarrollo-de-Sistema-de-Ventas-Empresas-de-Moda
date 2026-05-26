import { MaterialIcon } from '@/shared/ui';
import type { Cliente } from '../../../types/Cliente';
import { useRef, useEffect, useState } from 'react';
import { UMBRAL_DNI_OBLIGATORIO } from '../../../utils/validarIdentificacionCliente';

interface ClienteSectionProps {
  tipoDocumento: 'DNI' | 'RUC';
  setTipoDocumento: (tipo: 'DNI' | 'RUC') => void;
  documentoCliente: string;
  setDocumentoCliente: (doc: string) => void;
  cliente: string;
  setCliente: (cliente: string) => void;
  clienteSeleccionado: Cliente | null;
  esMayorista: boolean;
  cargandoBusquedaCliente: boolean;
  errorBusquedaCliente: string | null;
  setErrorBusquedaCliente: (error: string | null) => void;
  handleBuscarCliente: () => void;
  handleRegistrarClienteRapido: () => void;
  limpiarCliente: () => void;
  inputNombreDebeParpadear: boolean;
  setInputNombreDebeParpadear: (val: boolean) => void;
  inputDocumentoDebeParpadear: boolean;
  setInputDocumentoDebeParpadear: (val: boolean) => void;
  handleActualizarClienteNombre: (nombre: string) => Promise<void>;
  clienteCreadoManualmente: boolean;
  totalGeneralVenta: number;
  requiereDocumentoCliente: boolean;
  clienteValidoParaVenta: boolean;
  identificacionMensaje: string | null;
  tieneProductosEnCarrito: boolean;
  compact?: boolean;
}

export const ClienteSection = ({
  tipoDocumento,
  setTipoDocumento,
  documentoCliente,
  setDocumentoCliente,
  cliente,
  setCliente,
  clienteSeleccionado,
  esMayorista,
  cargandoBusquedaCliente,
  errorBusquedaCliente,
  setErrorBusquedaCliente,
  handleBuscarCliente,
  handleRegistrarClienteRapido,
  limpiarCliente,
  inputNombreDebeParpadear,
  setInputNombreDebeParpadear,
  inputDocumentoDebeParpadear,
  setInputDocumentoDebeParpadear,
  handleActualizarClienteNombre,
  clienteCreadoManualmente,
  totalGeneralVenta,
  requiereDocumentoCliente,
  clienteValidoParaVenta,
  identificacionMensaje,
  tieneProductosEnCarrito,
  compact = false,
}: ClienteSectionProps) => {
  const nombreInputRef = useRef<HTMLInputElement>(null);
  const documentoInputRef = useRef<HTMLInputElement>(null);
  const [editandoCliente, setEditandoCliente] = useState(false);
  const [nombreEditado, setNombreEditado] = useState('');

  useEffect(() => {
    if (inputNombreDebeParpadear && nombreInputRef.current) {
      nombreInputRef.current.focus();
      nombreInputRef.current.select();
    }
  }, [inputNombreDebeParpadear]);

  useEffect(() => {
    if (inputDocumentoDebeParpadear && documentoInputRef.current) {
      documentoInputRef.current.focus();
      documentoInputRef.current.select();
    }
  }, [inputDocumentoDebeParpadear]);

  useEffect(() => {
    setEditandoCliente(false);
  }, [clienteSeleccionado]);
  return (
    <div
      id="pos-cliente-cobro"
      className={`caj-card shadow-sm border transition-all duration-300 ${
        compact ? 'rounded-[1.25rem] p-4' : 'rounded-[2.5rem] p-10 mb-10'
      }`}
    >
      <style>{`
        @keyframes glow-pulse {
          0%, 100% {
            box-shadow: 0 0 0 2px color-mix(in srgb, var(--caj-accent) 25%, transparent),
                        0 0 10px color-mix(in srgb, var(--caj-accent) 15%, transparent);
            border-color: color-mix(in srgb, var(--caj-accent) 50%, transparent);
          }
          50% {
            box-shadow: 0 0 0 6px color-mix(in srgb, var(--caj-accent) 40%, transparent),
                        0 0 35px color-mix(in srgb, var(--caj-accent) 90%, transparent),
                        0 0 15px var(--caj-accent);
            border-color: var(--caj-accent);
          }
        }
        .caj-glow-pulse {
          animation: glow-pulse 1.5s infinite ease-in-out !important;
          border: 2.5px solid var(--caj-accent) !important;
          outline: none !important;
          background-color: color-mix(in srgb, var(--caj-accent) 3%, transparent) !important;
        }
        .caj-glow-pulse:focus {
          animation: glow-pulse 1.5s infinite ease-in-out !important;
          border: 2.5px solid var(--caj-accent) !important;
          outline: none !important;
          box-shadow: 0 0 0 6px color-mix(in srgb, var(--caj-accent) 40%, transparent),
                      0 0 35px color-mix(in srgb, var(--caj-accent) 90%, transparent),
                      0 0 15px var(--caj-accent) !important;
        }
      `}</style>
      <div className={`flex items-center gap-3 ${compact ? 'mb-4' : 'mb-10'}`}>
        <div className={`caj-btn-primary rounded-xl flex items-center justify-center shadow-md ${compact ? 'w-9 h-9' : 'w-12 h-12 rounded-2xl'}`}>
          <MaterialIcon icon="group" className={`caj-accent-fg ${compact ? 'h-5 w-5' : 'h-6 w-6'}`} />
        </div>
        <div>
          <h2 className="caj-heading text-[11px] font-bold tracking-[0.2em] uppercase">Datos del cliente</h2>
          <p className="caj-label text-[9px] font-medium uppercase tracking-widest mt-0.5">
            Complete al cobrar según el total de la venta
          </p>
        </div>
      </div>



      {tieneProductosEnCarrito &&
        requiereDocumentoCliente &&
        !clienteValidoParaVenta &&
        identificacionMensaje && (
        <div className={`${compact ? 'mb-3 px-3 py-2' : 'mb-8 px-6 py-3'} rounded-xl border border-amber-300/60 bg-amber-100/40 dark:bg-amber-950/30 text-[9px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-100`}>
          {identificacionMensaje}
        </div>
      )}
      
      <div className={`grid grid-cols-1 gap-4 items-end ${compact ? '' : 'md:grid-cols-12 gap-10'}`}>
        <div className={compact ? '' : 'md:col-span-3'}>
          <label className={`caj-label block text-[10px] font-bold tracking-[0.2em] uppercase pl-1 ${compact ? 'mb-2' : 'mb-4'}`}>Tipo de Documento</label>
          <div className="caj-segment grid grid-cols-2 gap-2 p-1.5 rounded-xl">
            <button 
              onClick={() => { setTipoDocumento('DNI'); setDocumentoCliente(''); }}
              className={`${compact ? 'py-2' : 'py-3'} rounded-lg text-[10px] font-bold transition-all uppercase tracking-[0.2em] ${tipoDocumento === 'DNI' ? 'caj-segment-active shadow-lg' : 'caj-segment-inactive'}`}
            >
              DNI
            </button>
            <button 
              onClick={() => { setTipoDocumento('RUC'); setDocumentoCliente(''); }}
              className={`${compact ? 'py-2' : 'py-3'} rounded-lg text-[10px] font-bold transition-all uppercase tracking-[0.2em] ${tipoDocumento === 'RUC' ? 'caj-segment-active shadow-lg' : 'caj-segment-inactive'}`}
            >
              RUC
            </button>
          </div>
        </div>
        
        <div className={compact ? '' : 'md:col-span-4'}>
          <label className={`caj-label block text-[10px] font-bold tracking-[0.2em] uppercase pl-1 ${compact ? 'mb-2' : 'mb-4'}`}>
            Número de documento
            <span className={`ml-2 ${requiereDocumentoCliente ? 'text-amber-600' : 'caj-text-faint'}`}>
              {requiereDocumentoCliente ? '(obligatorio)' : '(opcional)'}
            </span>
          </label>
          <div className="relative group flex items-center">
            <input 
              ref={documentoInputRef}
              type="text" 
              autoComplete="off"
              className={`caj-input w-full pl-4 pr-14 border-none rounded-xl text-sm font-bold focus:ring-[3px] focus:ring-[var(--caj-ring)] transition-all placeholder:caj-text-faint tracking-[0.1em] ${compact ? 'py-2.5' : 'py-4 pl-6 pr-16 rounded-[1.25rem]'} ${
                inputDocumentoDebeParpadear ? 'caj-glow-pulse' : ''
              }`}
              value={documentoCliente}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                if ((tipoDocumento === 'DNI' && value.length <= 8) || (tipoDocumento === 'RUC' && value.length <= 11)) {
                  setDocumentoCliente(value);
                  if (value.length > 0) {
                    setInputDocumentoDebeParpadear(false);
                  }
                }
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleBuscarCliente();
              }}
              placeholder={tipoDocumento === 'DNI' ? "00000000" : "00000000000"} 
            />
            <button 
              onClick={handleBuscarCliente}
              disabled={cargandoBusquedaCliente || !documentoCliente.trim()}
              className="absolute right-1.5 top-1.5 bottom-1.5 w-11 flex items-center justify-center caj-btn-primary rounded-[0.95rem] disabled:opacity-40 transition-all shadow-md active:scale-95"
            >
              {cargandoBusquedaCliente ? <MaterialIcon icon="progress_activity" className="animate-spin h-[18px] w-[18px]" /> : <MaterialIcon icon="search" className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </div>
        
        <div className={compact ? '' : 'md:col-span-5'}>
          <label className={`caj-label block text-[10px] font-bold tracking-[0.2em] uppercase pl-1 ${compact ? 'mb-2' : 'mb-4'}`}>
            Nombre del cliente
            <span className="ml-2 text-amber-600">(obligatorio)</span>
          </label>
          <input 
            ref={nombreInputRef}
            type="text" 
            className={`caj-input w-full px-4 border-none rounded-xl text-sm font-bold focus:ring-[3px] focus:ring-[var(--caj-ring)] transition-all uppercase placeholder:caj-text-faint tracking-wide ${compact ? 'py-2.5' : 'px-6 py-4 rounded-[1.25rem]'} ${
              inputNombreDebeParpadear ? 'caj-glow-pulse' : ''
            }`}
            value={cliente} 
            onChange={(e) => {
              const val = e.target.value;
              setCliente(val);
              if (val.trim().length > 0) {
                setInputNombreDebeParpadear(false);
              }
            }} 
            placeholder="EJ: MARIA (OPCIONALMENTE APELLIDO)" 
          />
          {tieneProductosEnCarrito && !requiereDocumentoCliente && !documentoCliente.trim() && !cliente.trim() && (
            <p className="mt-2 pl-1 text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Ingrese al menos un nombre del cliente
            </p>
          )}
        </div>
      </div>
      
      {/* Estado de carga de búsqueda de cliente inline */}
      {cargandoBusquedaCliente && (
        <div className={`${compact ? 'mt-3 p-4' : 'mt-10 p-8'} rounded-xl border border-dashed border-[var(--caj-border)] bg-[var(--caj-card-bg)] animate-pulse flex flex-col sm:flex-row items-center justify-between gap-4`}>
          <div className="flex items-center gap-6 w-full">
            <div className="w-14 h-14 rounded-2xl caj-surface-muted flex items-center justify-center shadow-inner">
              <MaterialIcon icon="progress_activity" className="animate-spin h-6 w-6 caj-icon-muted" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="h-4 caj-surface-muted rounded-lg w-1/3"></div>
              <div className="h-3 caj-surface-muted rounded-lg w-1/4"></div>
            </div>
          </div>
        </div>
      )}

      {/* Alerta de error de búsqueda inline */}
      {errorBusquedaCliente && !cargandoBusquedaCliente && (
        <div className={`${compact ? 'mt-3 p-3' : 'mt-10 p-6'} rounded-xl border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10 animate-fadeIn flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 shadow-sm">
              <MaterialIcon icon="info" className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider">
                {errorBusquedaCliente}
              </p>
              <p className="text-[10px] text-red-600 dark:text-red-400 font-medium mt-0.5 uppercase tracking-wide">
                Verifique el documento o ingrese el nombre manualmente a la derecha
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            {errorBusquedaCliente.toLowerCase().includes("no encontrado") && (
              <button
                onClick={handleRegistrarClienteRapido}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap"
              >
                <MaterialIcon icon="person_add" className="h-4 w-4" />
                Registrar Cliente
              </button>
            )}
            <button 
              onClick={() => setErrorBusquedaCliente(null)} 
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1.5 transition-colors rounded-lg hover:bg-red-100/50 dark:hover:bg-red-900/20"
            >
              <MaterialIcon icon="close" className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {clienteSeleccionado && !cargandoBusquedaCliente && (
        <div className={`${compact ? 'mt-3 p-4 rounded-xl' : 'mt-10 p-8 rounded-[2rem]'} border animate-fadeIn transition-all duration-500 overflow-hidden relative ${esMayorista ? 'caj-banner shadow-2xl' : 'caj-detail-tile caj-border-subtle border'}`}>
          {esMayorista && (
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <MaterialIcon icon="add" className="w-32 h-32 caj-banner-muted" />
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10 w-full">
            <div className="flex items-center gap-6 flex-1 w-full sm:w-auto">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${esMayorista ? 'caj-banner-icon-wrap animate-pulse' : 'caj-icon-chip'}`}>
                <MaterialIcon icon="check_circle" className="h-8 w-8" />
              </div>
              <div className="text-left flex-1 w-full">
                {editandoCliente ? (
                  <div className="flex flex-col gap-3 w-full max-w-lg">
                    <input
                      type="text"
                      className={`px-4 py-2.5 border rounded-xl text-sm font-bold uppercase tracking-wider focus:outline-none focus:ring-[3px] transition-all w-full ${
                        inputNombreDebeParpadear ? 'caj-glow-pulse' : (
                          esMayorista 
                            ? 'bg-zinc-900 border-zinc-700 text-white focus:ring-white focus:border-transparent' 
                            : 'caj-input focus:ring-[var(--caj-ring)] focus:border-transparent'
                        )
                      }`}
                      value={nombreEditado}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNombreEditado(val);
                        if (val.trim().length > 0) {
                          setInputNombreDebeParpadear(false);
                        } else {
                          setInputNombreDebeParpadear(true);
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleActualizarClienteNombre(nombreEditado);
                          setEditandoCliente(false);
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-lg ${esMayorista ? 'caj-badge-on-banner' : 'caj-surface-muted caj-text-muted'}`}>
                        {tipoDocumento}: {documentoCliente}
                      </span>
                      {esMayorista && (
                        <span className="text-[10px] font-bold caj-banner-icon-wrap px-3 py-1 rounded-lg uppercase tracking-[0.2em] shadow-xl animate-pulse">
                          TARIFA MAYORISTA ACTIVA
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className={`text-lg font-bold uppercase tracking-widest ${esMayorista ? '' : 'caj-heading'}`}>
                      {clienteSeleccionado.nombreCliente}
                    </h3>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-lg ${esMayorista ? 'caj-badge-on-banner' : 'caj-surface-muted caj-text-muted'}`}>
                        {tipoDocumento}: {documentoCliente}
                      </span>
                      {esMayorista && (
                        <span className="text-[10px] font-bold caj-banner-icon-wrap px-3 py-1 rounded-lg uppercase tracking-[0.2em] shadow-xl animate-pulse">
                          TARIFA MAYORISTA ACTIVA
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {editandoCliente ? (
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  onClick={async () => {
                    await handleActualizarClienteNombre(nombreEditado);
                    setEditandoCliente(false);
                  }}
                  className={`flex items-center gap-2 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] rounded-xl transition-all shadow-sm active:scale-95 ${
                    esMayorista
                      ? 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-800/50'
                      : 'bg-emerald-50/80 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 shadow-inner'
                  }`}
                >
                  <MaterialIcon icon="done" className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                  Guardar
                </button>
                <button
                  onClick={() => setEditandoCliente(false)}
                  className={`flex items-center gap-2 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] rounded-xl transition-all shadow-sm active:scale-95 ${
                    esMayorista
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-gray-200 border border-zinc-700'
                      : 'caj-btn-secondary border shadow-inner'
                  }`}
                >
                  <MaterialIcon icon="close" className="h-4 w-4 caj-icon-muted" />
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {clienteCreadoManualmente && (
                  <button
                    onClick={() => {
                      setNombreEditado(clienteSeleccionado.nombreCliente);
                      setEditandoCliente(true);
                    }}
                    className={`flex items-center gap-2 px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.25em] rounded-xl transition-all shadow-sm active:scale-95 ${
                      esMayorista
                        ? 'bg-blue-950/40 hover:bg-blue-900/60 text-blue-200 border border-blue-900/50 shadow-inner'
                        : 'bg-blue-50/80 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 shadow-inner'
                    }`}
                  >
                    <MaterialIcon icon="edit" className={`h-4 w-4 ${esMayorista ? 'text-blue-400' : 'text-blue-700 dark:text-blue-300'}`} />
                    Editar
                  </button>
                )}
                <button
                  onClick={limpiarCliente}
                  className={`flex items-center gap-2 px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.25em] rounded-xl transition-all shadow-sm active:scale-95 ${
                    esMayorista 
                      ? 'bg-red-950/40 hover:bg-red-900/60 text-red-200 border border-red-900/50' 
                      : 'bg-red-50/80 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 shadow-inner'
                  }`}
                >
                  <MaterialIcon 
                    icon="close" 
                    className={`h-4 w-4 ${esMayorista ? 'text-red-400' : 'text-red-700 dark:text-red-300'}`} 
                  />
                  Quitar cliente
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import { MaterialIcon } from '@/shared/ui';
import type { Cliente } from '../../../types/Cliente';
import { useRef, useEffect, useState } from 'react';

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
  handleActualizarClienteNombre: (nombre: string) => Promise<void>;
  clienteCreadoManualmente: boolean;
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
  handleActualizarClienteNombre,
  clienteCreadoManualmente
}: ClienteSectionProps) => {
  const nombreInputRef = useRef<HTMLInputElement>(null);
  const [editandoCliente, setEditandoCliente] = useState(false);
  const [nombreEditado, setNombreEditado] = useState('');

  useEffect(() => {
    if (inputNombreDebeParpadear && nombreInputRef.current) {
      nombreInputRef.current.focus();
      nombreInputRef.current.select();
    }
  }, [inputNombreDebeParpadear]);

  useEffect(() => {
    setEditandoCliente(false);
  }, [clienteSeleccionado]);
  return (
    <div className="caj-card rounded-[2.5rem] p-10 mb-10 shadow-sm border transition-all duration-300">
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
      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 caj-btn-primary rounded-2xl flex items-center justify-center shadow-[0_10px_20px_rgba(0,0,0,0.1)]">
          <MaterialIcon icon="group" className="h-6 w-6 text-[var(--caj-accent-fg)]" />
        </div>
        <div>
          <h2 className="caj-heading text-[12px] font-bold tracking-[0.25em] uppercase">Datos del Cliente</h2>
          <p className="caj-label text-[10px] font-medium uppercase tracking-widest mt-1">Busca o registra al cliente aquí</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-end">
        <div className="md:col-span-3">
          <label className="caj-label block text-[10px] font-bold tracking-[0.2em] uppercase mb-4 pl-1">Tipo de Documento</label>
          <div className="caj-segment grid grid-cols-2 gap-2 p-1.5 rounded-[1.25rem]">
            <button 
              onClick={() => { setTipoDocumento('DNI'); setDocumentoCliente(''); }}
              className={`py-3 rounded-xl text-[10px] font-bold transition-all uppercase tracking-[0.2em] ${tipoDocumento === 'DNI' ? 'caj-segment-active shadow-lg' : 'caj-segment-inactive'}`}
            >
              DNI
            </button>
            <button 
              onClick={() => { setTipoDocumento('RUC'); setDocumentoCliente(''); }}
              className={`py-3 rounded-xl text-[10px] font-bold transition-all uppercase tracking-[0.2em] ${tipoDocumento === 'RUC' ? 'caj-segment-active shadow-lg' : 'caj-segment-inactive'}`}
            >
              RUC
            </button>
          </div>
        </div>
        
        <div className="md:col-span-4">
          <label className="caj-label block text-[10px] font-bold tracking-[0.2em] uppercase mb-4 pl-1">Número de documento</label>
          <div className="relative group flex items-center">
            <input 
              type="text" 
              autoComplete="off"
              className="caj-input w-full pl-6 pr-16 py-4 border-none rounded-[1.25rem] text-sm font-bold focus:ring-[3px] focus:ring-[var(--caj-ring)] transition-all placeholder:caj-text-faint tracking-[0.1em]"
              value={documentoCliente}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                if ((tipoDocumento === 'DNI' && value.length <= 8) || (tipoDocumento === 'RUC' && value.length <= 11)) {
                  setDocumentoCliente(value);
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
        
        <div className="md:col-span-5">
          <label className="caj-label block text-[10px] font-bold tracking-[0.2em] uppercase mb-4 pl-1">Nombre del Cliente</label>
          <input 
            ref={nombreInputRef}
            type="text" 
            className={`caj-input w-full px-6 py-4 border-none rounded-[1.25rem] text-sm font-bold focus:ring-[3px] focus:ring-[var(--caj-ring)] transition-all uppercase placeholder:caj-text-faint tracking-wide ${
              inputNombreDebeParpadear ? 'caj-glow-pulse' : ''
            }`}
            value={cliente} 
            onChange={(e) => {
              const val = e.target.value;
              setCliente(val);
              if (val.trim().length > 0) {
                setInputNombreDebeParpadear(false);
              } else {
                setInputNombreDebeParpadear(true);
              }
            }} 
            placeholder="ESCRIBIR NOMBRE DEL CLIENTE..." 
          />
        </div>
      </div>
      
      {/* Estado de carga de búsqueda de cliente inline */}
      {cargandoBusquedaCliente && (
        <div className="mt-10 p-8 rounded-[2rem] border border-dashed border-[var(--caj-border)] bg-[var(--caj-card-bg)] animate-pulse flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6 w-full">
            <div className="w-14 h-14 rounded-2xl bg-gray-200 dark:bg-gray-800 flex items-center justify-center shadow-inner">
              <MaterialIcon icon="progress_activity" className="animate-spin h-6 w-6 text-gray-400" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-lg w-1/3"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-lg w-1/4"></div>
            </div>
          </div>
        </div>
      )}

      {/* Alerta de error de búsqueda inline */}
      {errorBusquedaCliente && !cargandoBusquedaCliente && (
        <div className="mt-10 p-6 rounded-[2rem] border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10 animate-fadeIn flex items-center justify-between gap-4">
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
        <div className={`mt-10 p-8 rounded-[2rem] border animate-fadeIn transition-all duration-500 overflow-hidden relative ${esMayorista ? 'bg-black border-gray-800 text-white shadow-2xl' : 'caj-page caj-border-subtle border'}`}>
          {esMayorista && (
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <MaterialIcon icon="add" className="w-32 h-32 text-white" />
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10 w-full">
            <div className="flex items-center gap-6 flex-1 w-full sm:w-auto">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${esMayorista ? 'bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)] animate-pulse' : 'caj-btn-primary shadow-lg'}`}>
                <MaterialIcon icon="check_circle" className={`h-8 w-8 ${esMayorista ? 'text-black' : 'text-[var(--caj-accent-fg)]'}`} />
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
                      <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-lg ${esMayorista ? 'bg-white/10 text-gray-300' : 'caj-surface-muted caj-text-muted'}`}>
                        {tipoDocumento}: {documentoCliente}
                      </span>
                      {esMayorista && (
                        <span className="text-[10px] font-bold bg-white text-black px-3 py-1 rounded-lg uppercase tracking-[0.2em] shadow-xl animate-pulse">
                          TARIFA MAYORISTA ACTIVA
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className={`text-lg font-bold uppercase tracking-widest ${esMayorista ? 'text-white' : 'caj-heading'}`}>
                      {clienteSeleccionado.nombreCliente}
                    </h3>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-lg ${esMayorista ? 'bg-white/10 text-gray-300' : 'caj-surface-muted caj-text-muted'}`}>
                        {tipoDocumento}: {documentoCliente}
                      </span>
                      {esMayorista && (
                        <span className="text-[10px] font-bold bg-white text-black px-3 py-1 rounded-lg uppercase tracking-[0.2em] shadow-xl animate-pulse">
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
                      : 'bg-gray-50/80 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700/30 shadow-inner'
                  }`}
                >
                  <MaterialIcon icon="close" className="h-4 w-4 text-gray-600 dark:text-gray-400" />
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

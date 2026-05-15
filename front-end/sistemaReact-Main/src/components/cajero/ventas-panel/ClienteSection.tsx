import { Search, Users, CheckCircle, Plus, X, Loader2 } from 'lucide-react';
import type { Cliente } from '../../../types/Cliente';

interface ClienteSectionProps {
  tipoDocumento: 'DNI' | 'RUC';
  setTipoDocumento: (tipo: 'DNI' | 'RUC') => void;
  documentoCliente: string;
  setDocumentoCliente: (doc: string) => void;
  cliente: string;
  setCliente: (cliente: string) => void;
  clienteSeleccionado: Cliente | null;
  esMayorista: boolean;
  cargandoBusquedaAccion: boolean;
  handleBuscarCliente: () => void;
  limpiarCliente: () => void;
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
  cargandoBusquedaAccion,
  handleBuscarCliente,
  limpiarCliente
}: ClienteSectionProps) => {
  return (
    <div className="caj-card rounded-[2.5rem] p-10 mb-10 shadow-sm border transition-all duration-300">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 caj-btn-primary rounded-2xl flex items-center justify-center shadow-[0_10px_20px_rgba(0,0,0,0.1)]">
          <Users className="h-6 w-6 text-[var(--caj-accent-fg)]" />
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
          <div className="relative group">
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
              disabled={cargandoBusquedaAccion || !documentoCliente.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-3 caj-btn-primary rounded-xl disabled:opacity-40 transition-all shadow-md group-active:scale-95"
            >
              {cargandoBusquedaAccion ? <Loader2 className="animate-spin" size={18}/> : <Search size={18}/>}
            </button>
          </div>
        </div>
        
        <div className="md:col-span-5">
          <label className="caj-label block text-[10px] font-bold tracking-[0.2em] uppercase mb-4 pl-1">Nombre del Cliente</label>
          <input 
            type="text" 
            className="caj-input w-full px-6 py-4 border-none rounded-[1.25rem] text-sm font-bold focus:ring-[3px] focus:ring-[var(--caj-ring)] transition-all uppercase placeholder:caj-text-faint tracking-wide"
            value={cliente} 
            onChange={(e) => setCliente(e.target.value)} 
            placeholder="ESCRIBIR NOMBRE DEL CLIENTE..." 
          />
        </div>
      </div>
      
      {clienteSeleccionado && (
        <div className={`mt-10 p-8 rounded-[2rem] border animate-fadeIn transition-all duration-500 overflow-hidden relative ${esMayorista ? 'bg-black border-gray-800 text-white shadow-2xl' : 'caj-page caj-border-subtle border'}`}>
          {esMayorista && (
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <Plus className="w-32 h-32 text-white" />
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${esMayorista ? 'bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)] animate-pulse' : 'caj-btn-primary shadow-lg'}`}>
                <CheckCircle className={`h-8 w-8 ${esMayorista ? 'text-black' : 'text-[var(--caj-accent-fg)]'}`} />
              </div>
              <div>
                <h3 className={`text-lg font-bold uppercase tracking-widest ${esMayorista ? 'text-white' : 'caj-heading'}`}>
                  {clienteSeleccionado.nombreCliente}
                </h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-lg ${esMayorista ? 'bg-white/10 text-gray-300' : 'caj-surface-muted caj-text-muted'}`}>
                    {tipoDocumento}: {documentoCliente}
                  </span>
                  {esMayorista && (
                    <span className="text-[10px] font-bold bg-white text-black px-3 py-1 rounded-lg uppercase tracking-[0.2em] shadow-xl">
                      TARIFA MAYORISTA ACTIVA
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <button
              onClick={limpiarCliente}
              className={`flex items-center gap-2 px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.25em] rounded-xl transition-all shadow-sm ${esMayorista ? 'bg-white/10 hover:bg-white text-white hover:text-black border border-white/20' : 'caj-card hover:bg-red-50/10 caj-text-muted hover:text-red-400 border'}`}
            >
              <X className="h-4 w-4" />
              Quitar cliente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

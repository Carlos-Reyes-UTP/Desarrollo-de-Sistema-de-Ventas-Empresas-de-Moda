import type { ProductoVariante } from '../../../types/ProductoVariante';
import { BorderBeam } from 'border-beam';
import { Card, CardGridSkeleton, MaterialIcon } from '@/shared/ui';

interface CatalogoSectionProps {
  variantesFiltradas: ProductoVariante[];
  tipoBusqueda: 'nombre' | 'codigo';
  setTipoBusqueda: (tipo: 'nombre' | 'codigo') => void;
  busqueda: string;
  setBusqueda: (val: string) => void;
  handleBuscarPorCodigoExacto: (codigo: string) => void;
  handleBuscarEnServicio: () => void;
  cargandoBusquedaAccion: boolean;
  setMensajeInfoVista: (msg: string | null) => void;
  cargandoProductosIniciales: boolean;
  variantesPaginadas: ProductoVariante[];
  clienteValidoParaVenta: boolean;
  handleSeleccionarVarianteDeLista: (v: ProductoVariante) => void;
  totalPaginas: number;
  paginaActual: number;
  totalElementos: number;
  handleCambiarPagina: (page: number) => void;
}

export const CatalogoSection = ({
  variantesFiltradas,
  tipoBusqueda,
  setTipoBusqueda,
  busqueda,
  setBusqueda,
  handleBuscarPorCodigoExacto,
  handleBuscarEnServicio,
  cargandoBusquedaAccion,
  setMensajeInfoVista,
  cargandoProductosIniciales,
  variantesPaginadas,
  clienteValidoParaVenta,
  handleSeleccionarVarianteDeLista,
  totalPaginas,
  paginaActual,
  totalElementos,
  handleCambiarPagina
}: CatalogoSectionProps) => {
  return (
    <div className="lg:col-span-7 caj-card rounded-[3rem] shadow-sm border flex flex-col relative overflow-hidden h-[900px]">
      <div className="px-10 py-8 border-b caj-border-subtle flex items-center justify-between caj-card relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center shadow-lg">
            <MaterialIcon icon="search" className="h-5 w-5 text-white" />
          </div>
          <h2 className="caj-heading text-[12px] font-bold tracking-[0.3em] uppercase">Búsqueda de Productos</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="caj-text-faint text-[10px] font-bold uppercase tracking-widest px-4 py-2 caj-surface-elevated rounded-xl border caj-border">
            {variantesFiltradas.length} Ítems Disponibles
          </span>
        </div>
      </div>
      
      <div className="p-10 flex-1 flex flex-col pt-4">
        {/* Selector de tipo de búsqueda */}
        <div className="mb-10">
          <label className="caj-label block text-[10px] font-bold tracking-[0.25em] uppercase mb-5 pl-1">Buscar por:</label>
          <div className="caj-segment grid grid-cols-2 gap-4 p-1.5 rounded-2xl max-w-sm">
            <button
              onClick={() => setTipoBusqueda('nombre')}
              className={`py-3.5 rounded-xl text-[10px] font-bold transition-all uppercase tracking-[0.25em] flex items-center justify-center gap-3 ${tipoBusqueda === 'nombre' ? 'caj-segment-active shadow-xl translate-y-[-2px]' : 'caj-segment-inactive'}`}
            >
              <MaterialIcon icon="label" className="h-3.5 w-3.5" />
              Nombre
            </button>
            <button
              onClick={() => setTipoBusqueda('codigo')}
              className={`py-3.5 rounded-xl text-[10px] font-bold transition-all uppercase tracking-[0.25em] flex items-center justify-center gap-3 ${tipoBusqueda === 'codigo' ? 'caj-segment-active shadow-xl translate-y-[-2px]' : 'caj-segment-inactive'}`}
            >
              <MaterialIcon icon="barcode" className="h-3.5 w-3.5" />
              Código de barras
            </button>
          </div>
        </div>
        
        {/* Barra de búsqueda profesional con BorderBeam */}
        <div className="mb-12">
          <BorderBeam size="line" colorVariant="colorful" duration={2.4} strength={0.83}>
            <Card className="relative">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <MaterialIcon icon="search" className="h-5 w-5 text-gray-300" />
              </div>
              <input 
                type="text" 
                className="caj-input w-full pl-14 pr-40 py-5 border-none rounded-[1.5rem] text-sm font-bold focus:ring-[4px] focus:ring-[var(--caj-ring)] transition-all placeholder:caj-text-faint tracking-wider shadow-inner"
                placeholder={tipoBusqueda === 'nombre' ? "Búsqueda por nombre de producto..." : "Escanear código de barras..."} 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && busqueda.trim()) {
                    const esPosibleCodigo = tipoBusqueda === 'codigo' || (/^[A-Za-z0-9-_]{6,}$/.test(busqueda.trim()) && !busqueda.trim().includes(" "));
                    if (esPosibleCodigo) handleBuscarPorCodigoExacto(busqueda.trim());
                    else handleBuscarEnServicio();
                  }
                }} 
              />
              
              <div className="absolute inset-y-0 right-3 flex items-center gap-2">
                {busqueda && (
                  <button
                    className="p-2 text-gray-300 hover:text-black transition-colors flex items-center justify-center"
                    onClick={() => { setBusqueda(''); setMensajeInfoVista(null); }}
                  >
                    <MaterialIcon icon="close" className="h-[18px] w-[18px]" />
                  </button>
                )}
                <button 
                  className="px-6 py-2.5 caj-btn-primary rounded-[1rem] text-[10px] font-bold uppercase tracking-widest disabled:opacity-40 transition-all shadow-lg active:scale-95"
                  onClick={handleBuscarEnServicio} 
                  disabled={cargandoBusquedaAccion || !busqueda.trim()}
                >
                  {cargandoBusquedaAccion ? <MaterialIcon icon="progress_activity" className="animate-spin h-4 w-4" /> : 'Buscar'}
                </button>
              </div>
            </Card>
          </BorderBeam>
        </div>
        
        {/* Catalog Grid */}
        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
          {cargandoProductosIniciales ? (
            <CardGridSkeleton count={6} />
          ) : variantesFiltradas.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8 pb-10">
              {variantesPaginadas.map(v => (
                <div
                  key={v.idProductoVariante} 
                  className={`group caj-product-card border rounded-[2rem] p-6 transition-all duration-500 relative ${
                    clienteValidoParaVenta
                      ? 'cursor-pointer hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:-translate-y-1' 
                      : 'cursor-not-allowed grayscale opacity-50'
                  }`}
                  onClick={() => clienteValidoParaVenta && handleSeleccionarVarianteDeLista(v)}
                >
                  <div className="mb-6">
                    <div className="flex justify-between items-start gap-4">
                       <h3 className="caj-heading text-[14px] font-bold leading-tight uppercase line-clamp-2 tracking-tight">
                        {v.producto?.nombre}
                      </h3>
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 transition-all shadow-sm ${v.cantidad > 0 ? 'bg-green-500 shadow-green-200' : 'bg-red-500 shadow-red-200'}`}></div>
                    </div>
                    <span className="caj-text-faint text-[10px] font-bold font-mono tracking-[0.2em] mt-2 block">
                      {v.codigoBarrasVariante || v.producto?.codigoIdentificacion || 'SIN CÓDIGO'}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2.5 mb-6">
                    <span className="px-3 py-1 caj-surface-elevated border caj-border rounded-lg text-[10px] font-bold caj-text-muted uppercase tracking-widest">
                      {v.color?.nombre}
                    </span>
                    <span className="px-3 py-1 bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-[0.2em]">
                       {v.talla?.nombreTalla}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-end mt-auto pt-4 border-t caj-border-subtle">
                    <div>
                      <span className="block text-[9px] font-bold text-gray-300 uppercase tracking-[0.15em] mb-1">Unidades</span>
                      <span className={`text-[12px] font-extrabold ${v.cantidad > 5 ? 'caj-heading' : 'text-red-500'}`}>
                        {v.cantidad} DISP.
                      </span>
                    </div>
                    
                    <div className="text-right">
                       <span className="block text-[9px] font-bold text-gray-300 uppercase tracking-[0.15em] mb-1">Precio</span>
                       <span className="caj-heading text-[18px] font-extrabold tracking-tighter">
                          S/{(v.producto?.precioUnitario ?? 0).toFixed(2)}
                       </span>
                    </div>
                  </div>
                  
                  {/* Overlay Hover Effect */}
                  <div className="absolute inset-0 bg-black/[0.02] opacity-0 group-hover:opacity-100 rounded-[2rem] transition-opacity pointer-events-none flex items-center justify-center">
                     <div className="bg-black text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center scale-50 group-hover:scale-100 transition-all duration-300 shadow-black/20">
                        <MaterialIcon icon="add" className="w-6 h-6" />
                     </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col justify-center items-center h-full text-center py-20">
               <div className="w-20 h-20 caj-page rounded-full flex items-center justify-center mb-8 border caj-border-subtle">
                  <MaterialIcon icon="search" className="h-10 w-10 text-gray-200" />
               </div>
               <h3 className="caj-heading text-[13px] font-bold uppercase tracking-[0.3em] mb-4">No hay resultados</h3>
               <p className="caj-text-muted text-[11px] font-medium max-w-[250px] mb-8 leading-relaxed">Prueba buscando con otro nombre o código de barras.</p>
               <button onClick={() => { setBusqueda(''); setMensajeInfoVista(null); }} className="caj-heading text-[11px] font-bold uppercase tracking-[0.2em] border-b-2 border-[var(--caj-accent)] pb-1 hover:opacity-50 transition-opacity">Limpiar búsqueda</button>
            </div>
          )}
        </div>
      </div>

      {/* PAGINACIÓN - Server-side */}
      {totalPaginas > 1 && (
        <div className="px-10 py-6 border-t caj-border-subtle flex items-center justify-between caj-card text-left relative z-10 transition-all">
          <span className="caj-label text-[10px] font-bold uppercase tracking-[0.2em]">Página {paginaActual + 1} / {totalPaginas} · {totalElementos} productos</span>
          <div className="caj-segment flex gap-2 p-1.5 rounded-2xl">
            <button onClick={() => handleCambiarPagina(paginaActual - 1)} disabled={paginaActual === 0} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-sm text-gray-400 hover:text-black transition-all disabled:opacity-20 disabled:hover:bg-transparent">
              <MaterialIcon icon="chevron_left" className="h-[18px] w-[18px]" />
            </button>
            {[...Array(Math.min(totalPaginas, 5))].map((_, i) => {
              let n: number;
              if (totalPaginas <= 5) {
                n = i;
              } else if (paginaActual <= 2) {
                n = i;
              } else if (paginaActual >= totalPaginas - 3) {
                n = totalPaginas - 5 + i;
              } else {
                n = paginaActual - 2 + i;
              }
              return (
                <button 
                  key={n} 
                  onClick={() => handleCambiarPagina(n)} 
                  className={`caj-pagination-btn w-10 h-10 rounded-xl text-[11px] font-bold transition-all ${paginaActual === n ? 'caj-segment-active shadow-xl' : 'caj-segment-inactive'}`}
                >
                  {n + 1}
                </button>
              );
            })}
            <button onClick={() => handleCambiarPagina(paginaActual + 1)} disabled={paginaActual >= totalPaginas - 1} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-sm text-gray-400 hover:text-black transition-all disabled:opacity-20 disabled:hover:bg-transparent">
              <MaterialIcon icon="chevron_right" className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

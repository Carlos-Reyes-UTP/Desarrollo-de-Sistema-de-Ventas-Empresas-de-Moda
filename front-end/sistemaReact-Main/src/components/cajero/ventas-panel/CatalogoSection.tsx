import type { ProductoVariante } from '../../../types/ProductoVariante';
import { BorderBeam } from 'border-beam';
import { Card, CardGridSkeleton, MaterialIcon } from '@/shared/ui';

/** Unidades a partir de las cuales se considera stock bajo en el catálogo del POS. */
const UMBRAL_STOCK_BAJO = 5;

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
          <div className="w-10 h-10 caj-icon-chip rounded-2xl flex items-center justify-center shadow-lg">
            <MaterialIcon icon="search" className="h-5 w-5" />
          </div>
          <h2 className="caj-heading text-[12px] font-bold tracking-[0.3em] uppercase">Búsqueda de Productos</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="caj-text-faint text-[10px] font-bold uppercase tracking-widest px-4 py-2 caj-surface-elevated rounded-xl border caj-border">
            {variantesFiltradas.length} Ítems Disponibles
          </span>
        </div>
      </div>
      
      <div className="p-8 flex-1 flex flex-col pt-4">
        {/* Selector de tipo de búsqueda */}
        <div className="mb-10">
          <label className="caj-label block text-[10px] font-bold tracking-[0.25em] uppercase mb-5 pl-1">Buscar por:</label>
          <div className="caj-segment grid grid-cols-2 gap-4 p-1.5 rounded-2xl max-w-sm">
            <button
              onClick={() => setTipoBusqueda('nombre')}
              className={`py-3.5 rounded-xl text-[10px] font-bold transition-google uppercase tracking-[0.25em] flex items-center justify-center gap-3 ${tipoBusqueda === 'nombre' ? 'caj-segment-active shadow-xl translate-y-[-2px]' : 'caj-segment-inactive'}`}
            >
              <MaterialIcon icon="label" className="h-3.5 w-3.5" />
              Nombre
            </button>
            <button
              onClick={() => setTipoBusqueda('codigo')}
              className={`py-3.5 rounded-xl text-[10px] font-bold transition-google uppercase tracking-[0.25em] flex items-center justify-center gap-3 ${tipoBusqueda === 'codigo' ? 'caj-segment-active shadow-xl translate-y-[-2px]' : 'caj-segment-inactive'}`}
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
                <MaterialIcon icon="search" className="h-5 w-5 caj-icon-muted" />
              </div>
              <input 
                type="text" 
                className="caj-input w-full pl-14 pr-40 py-5 border-none rounded-[1.5rem] text-sm font-bold focus:ring-[4px] focus:ring-[var(--caj-ring)] transition-google placeholder:caj-text-faint tracking-wider shadow-inner"
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
                    className="p-2 caj-icon-muted hover:caj-heading transition-colors flex items-center justify-center"
                    onClick={() => { setBusqueda(''); setMensajeInfoVista(null); }}
                  >
                    <MaterialIcon icon="close" className="h-[18px] w-[18px]" />
                  </button>
                )}
                <button 
                  className="px-6 py-2.5 caj-btn-primary rounded-[1rem] text-[10px] font-bold uppercase tracking-widest disabled:opacity-40 transition-google shadow-lg active:scale-95"
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
        <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar relative">
          {cargandoProductosIniciales ? (
            <CardGridSkeleton count={6} />
          ) : variantesFiltradas.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
              {variantesPaginadas.map(v => {
                const sinStock = (v.cantidad ?? 0) <= 0;
                const stockBajo = !sinStock && (v.cantidad ?? 0) <= UMBRAL_STOCK_BAJO;
                return (
                <div
                  key={v.idProductoVariante} 
                  className={`group caj-product-card border rounded-[1.5rem] p-4 transition-google duration-500 relative ${
                    sinStock
                      ? 'cursor-not-allowed grayscale opacity-50'
                      : 'cursor-pointer hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:-translate-y-1'
                  }`}
                  onClick={() => !sinStock && handleSeleccionarVarianteDeLista(v)}
                >
                  <div className="mb-4">
                    <div className="flex justify-between items-start gap-4">
                       <h3 className="caj-heading text-[13px] font-bold leading-tight uppercase line-clamp-2 tracking-tight">
                        {v.producto?.nombre}
                      </h3>
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 transition-google shadow-sm ${v.cantidad > 0 ? 'bg-green-500 shadow-green-200' : 'bg-red-500 shadow-red-200'}`}></div>
                    </div>
                    <span className="caj-text-faint text-[9px] font-bold font-mono tracking-[0.18em] mt-2 block">
                      {v.codigoBarrasVariante || v.producto?.codigoIdentificacion || 'SIN CÓDIGO'}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2.5 py-1 caj-surface-elevated border caj-border rounded-lg text-[9px] font-bold caj-text-muted uppercase tracking-widest">
                      {v.color?.nombre}
                    </span>
                    <span className="px-2.5 py-1 caj-icon-chip rounded-lg text-[9px] font-bold uppercase tracking-[0.2em]">
                       {v.talla?.nombreTalla}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-end mt-auto pt-3 border-t caj-border-subtle">
                    <div>
                      <span className="caj-label block text-[8px] font-bold uppercase tracking-[0.15em] mb-1">Unidades</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-extrabold ${v.cantidad > UMBRAL_STOCK_BAJO ? 'caj-heading' : 'text-red-500'}`}>
                          {v.cantidad} DISP.
                        </span>
                        {stockBajo && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/40 border border-amber-300/70 dark:border-amber-700/50 text-amber-700 dark:text-amber-300 text-[8px] font-bold uppercase tracking-wider">
                            <MaterialIcon icon="warning" className="h-2.5 w-2.5" />
                            Bajo stock
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                       <span className="caj-label block text-[8px] font-bold uppercase tracking-[0.15em] mb-1">Precio</span>
                       <span className="caj-heading text-[16px] font-extrabold tracking-tighter">
                          S/{(v.producto?.precioUnitario ?? 0).toFixed(2)}
                       </span>
                    </div>
                  </div>
                  
                  {/* Overlay Hover Effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 rounded-[1.5rem] transition-opacity pointer-events-none flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--caj-accent) 8%, transparent)' }}>
                     <div className="caj-icon-chip w-12 h-12 rounded-full shadow-2xl flex items-center justify-center scale-50 group-hover:scale-100 transition-google duration-300">
                        <MaterialIcon icon="add" className="w-5 h-5" />
                     </div>
                  </div>
                </div>
              );
              })}
            </div>
          ) : (
            <div className="flex flex-col justify-center items-center h-full text-center py-20">
               <div className="w-20 h-20 caj-page rounded-full flex items-center justify-center mb-8 border caj-border-subtle">
                  <MaterialIcon icon="search" className="h-10 w-10 caj-icon-muted" />
               </div>
               <h3 className="caj-heading text-[13px] font-bold uppercase tracking-[0.3em] mb-4">No hay resultados</h3>
               <p className="caj-text-muted text-[11px] font-medium max-w-[250px] mb-8 leading-relaxed">Prueba buscando con otro nombre o código de barras.</p>
               <button onClick={() => { setBusqueda(''); setMensajeInfoVista(null); }} className="caj-heading text-[11px] font-bold uppercase tracking-[0.2em] border-b-2 border-[var(--caj-accent)] pb-1 hover:opacity-50 transition-opacity">Limpiar búsqueda</button>
            </div>
          )}

          {/* PAGINACIÓN - Server-side */}
          {totalPaginas > 1 && (
            <div className="sticky bottom-0 px-10 py-6 border-t caj-border-subtle flex items-center justify-between caj-card z-10" style={{ backgroundColor: 'var(--caj-card-bg)' }}>
              <span className="caj-label text-[10px] font-bold uppercase tracking-[0.2em]">Página {paginaActual + 1} / {totalPaginas} · {totalElementos} productos</span>
              <div className="caj-segment flex gap-2 p-1.5 rounded-2xl shrink-0">
                <button onClick={() => handleCambiarPagina(paginaActual - 1)} disabled={paginaActual === 0} className="caj-pagination-btn w-10 h-10 flex items-center justify-center rounded-xl transition-google disabled:opacity-20">
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
                      className={`caj-pagination-btn w-10 h-10 rounded-xl text-[11px] font-bold transition-google ${paginaActual === n ? 'caj-segment-active shadow-xl' : 'caj-segment-inactive'}`}
                    >
                      {n + 1}
                    </button>
                  );
                })}
                <button onClick={() => handleCambiarPagina(paginaActual + 1)} disabled={paginaActual >= totalPaginas - 1} className="caj-pagination-btn w-10 h-10 flex items-center justify-center rounded-xl transition-google disabled:opacity-20">
                  <MaterialIcon icon="chevron_right" className="h-[18px] w-[18px]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

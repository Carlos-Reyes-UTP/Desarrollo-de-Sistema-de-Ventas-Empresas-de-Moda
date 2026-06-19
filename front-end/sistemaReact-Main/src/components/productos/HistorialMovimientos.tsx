import React, { useState, useEffect, useRef } from 'react';
import { AlmacenService } from '../../services/AlmacenService';
import { AccesoAreaAlmacenService } from '../../services/AccesoAreaAlmacenService';
import { MaterialIcon, ModalPortal, ModalMotionOverlay, useModalBodyScrollLock, useModalMotion } from '@/shared/ui';
import type { MovimientoHistorialItem, MovimientoDetalle, UbicacionArea } from '../../types/Almacen';

const PAGE_SIZE = 20;

const HistorialMovimientos: React.FC = () => {
  const [items, setItems] = useState<MovimientoHistorialItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detalleModal, setDetalleModal] = useState<MovimientoHistorialItem | null>(null);

  const [areas, setAreas] = useState<UbicacionArea[]>([]);

  const [idArea, setIdArea] = useState<number | undefined>(undefined);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [isAreaFocused, setIsAreaFocused] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);

  const hoy = new Date();
  const mes = hoy.getMonth() + 1;
  const anio = hoy.getFullYear();
  const mesStr = String(mes).padStart(2, '0');
  const primerDiaMes = `${anio}-${mesStr}-01`;
  const ultimoDiaMes = new Date(anio, mes, 0).toISOString().split('T')[0];

  useEffect(() => {
    AccesoAreaAlmacenService.listarAreasAlmacen().then(setAreas).catch(() => {});
  }, []);

  const cargarDatos = async (pagina: number) => {
    setLoading(true);
    try {
      const data = await AlmacenService.getHistorialMovimientos(
        mes, anio, pagina, PAGE_SIZE,
        idArea,
        fechaDesde || undefined,
        fechaHasta || undefined
      );
      setItems(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
      setPage(data.number ?? data.pageNumber ?? 0);
    } catch {
      setItems([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos(0);
  }, [idArea, fechaDesde, fechaHasta]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (areaRef.current && !areaRef.current.contains(event.target as Node)) {
        setIsAreaFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const limpiarFiltros = () => {
    setIdArea(undefined);
    setFechaDesde('');
    setFechaHasta('');
  };

  const handlePaginaAnterior = () => {
    if (page > 0) cargarDatos(page - 1);
  };

  const handlePaginaSiguiente = () => {
    if (page < totalPages - 1) cargarDatos(page + 1);
  };

  const abrirDetalle = (item: MovimientoHistorialItem) => setDetalleModal(item);
  const cerrarDetalle = () => setDetalleModal(null);

  const formatearFecha = (fechaStr: string) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return (
    <div>
      {/* Filter card (same design as product filters) */}
      <div className="bg-app-surface rounded-[1.5rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-8 mb-10 border border-app-border">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-8 items-end">
          <div className="lg:col-span-2 relative" ref={areaRef}>
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
              Área de almacén
            </label>
            <div
              onClick={() => setIsAreaFocused(prev => !prev)}
              className={`relative cursor-pointer ${idArea ? 'bg-app-accent text-app-accent-fg' : 'bg-app-input text-app-text'} rounded-xl py-3 px-4 flex items-center justify-between transition-all`}
            >
              <span className="text-sm font-bold truncate">
                {areas.find(a => a.idUbicacionArea === idArea)?.area
                  ?? (idArea ? '' : 'Todas las áreas')}
              </span>
              {idArea ? (
                <MaterialIcon
                  icon="close"
                  className="w-4 h-4 cursor-pointer hover:text-gray-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIdArea(undefined);
                  }}
                />
              ) : (
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
            {isAreaFocused && (
              <div className="absolute z-20 w-full mt-2 bg-app-surface border border-app-border rounded-xl shadow-xl max-h-60 overflow-y-auto p-2 animate-fadeIn">
                <button
                  onClick={() => { setIdArea(undefined); setIsAreaFocused(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-app-hover-overlay text-app-text rounded-lg transition-colors font-medium"
                >
                  Todas las áreas
                </button>
                {areas.map(a => (
                  <button
                    key={a.idUbicacionArea}
                    onClick={() => { setIdArea(a.idUbicacionArea); setIsAreaFocused(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-app-hover-overlay text-app-text rounded-lg transition-colors font-medium"
                  >
                    {a.area ?? a.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
              Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              min={primerDiaMes}
              max={fechaHasta || ultimoDiaMes}
              className="w-full py-3 px-4 bg-app-input border-transparent rounded-xl text-sm focus:bg-app-surface focus:ring-2 focus:ring-app-ring transition-all font-bold"
            />
          </div>

          <div className="lg:col-span-1">
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
              Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              min={fechaDesde || primerDiaMes}
              max={ultimoDiaMes}
              className="w-full py-3 px-4 bg-app-input border-transparent rounded-xl text-sm focus:bg-app-surface focus:ring-2 focus:ring-app-ring transition-all font-bold"
            />
          </div>

          <div className="lg:col-span-2 flex flex-col justify-end h-full">
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-app-surface rounded-[1.5rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-app-border overflow-hidden">
        {/* Header */}
        <div className="px-8 py-4 border-b border-app-border flex items-center justify-between bg-app-surface">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
            Movimientos de <span className="text-app-text">{meses[mes - 1]} {anio}</span>
          </h3>

          {totalPages > 1 && (
            <div className="flex items-center gap-1 bg-app-bg-muted p-1 rounded-xl border border-app-border scale-90 origin-right">
              <button onClick={handlePaginaAnterior} disabled={page === 0}
                className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest text-app-text-muted hover:text-app-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Atrás
              </button>
              <div className="px-4 py-1.5 text-[10px] font-mono font-bold text-app-text border-x border-app-border">
                {page + 1} / {totalPages}
              </div>
              <button onClick={handlePaginaSiguiente} disabled={page >= totalPages - 1}
                className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest text-app-text-muted hover:text-app-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                Sig.
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse table-zebra">
            <thead>
              <tr className="bg-app-surface border-b border-app-border">
                <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Usuario</th>
                <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Origen</th>
                <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Destino</th>
                <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Producto</th>
                <th className="px-8 py-6 text-center text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Cantidad</th>
                <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Fecha</th>
                <th className="px-8 py-6 text-right text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {loading ? (
                Array.from({ length: 6 }, (_, row) => (
                  <tr key={`sk-${row}`}>
                    {Array.from({ length: 7 }, (_, col) => (
                      <td key={col} className="px-8 py-6">
                        <div className="h-4 bg-app-bg-muted rounded animate-pulse" style={{ width: col === 1 || col === 2 ? '140px' : col === 3 ? '200px' : col === 5 ? '120px' : col === 6 ? '80px' : '100px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-app-bg-muted flex items-center justify-center">
                        <MaterialIcon icon="history" className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                        No hay movimientos este mes
                      </p>
                      <p className="text-xs text-gray-400">
                        Los traslados de inventario aparecerán aquí automáticamente.
                      </p>
                      {(idArea || fechaDesde || fechaHasta) && (
                        <button
                          onClick={limpiarFiltros}
                          className="inline-flex items-center gap-2 rounded-xl border border-app-border bg-app-surface px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-app-text shadow-sm transition-all hover:bg-app-hover-overlay active:scale-[0.98]"
                        >
                          Limpiar filtros y recargar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.idGrupo} className="hover:bg-app-hover-overlay transition-colors">
                    <td className="px-8 py-5">
                      <span className="text-sm font-bold text-app-text">{item.usuarioNombre}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-bold text-app-text">{item.origenNombre}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-bold text-app-text">{item.destinoNombre}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-bold text-app-text">{item.productoNombre}</span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className="inline-flex items-center justify-center min-w-[3rem] px-3 py-1 bg-app-accent/10 text-app-accent text-xs font-black rounded-full">
                        {item.cantidadTotal}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-bold text-app-text-muted">{formatearFecha(item.fecha)}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button onClick={() => abrirDetalle(item)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-app-bg-muted hover:bg-app-hover-overlay text-app-text rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                      >
                        <MaterialIcon icon="visibility" className="w-3.5 h-3.5" />
                        Ver
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom pagination */}
        {totalPages > 0 && (
          <div className="px-8 py-6 bg-app-bg-muted flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-app-border">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Página <span className="text-app-text">{page + 1}</span> de <span className="text-app-text">{totalPages}</span> ({totalElements} totales)
            </p>
            <div className="flex items-center gap-1 bg-app-surface p-1 rounded-[14px] shadow-sm border border-app-border">
              <button onClick={handlePaginaAnterior} disabled={page === 0}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-app-text-muted hover:text-app-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <div className="px-4 py-2 text-[12px] font-bold text-app-text border-x border-app-border">
                Pág. {page + 1}
              </div>
              <button onClick={handlePaginaSiguiente} disabled={page >= totalPages - 1}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-app-text-muted hover:text-app-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {detalleModal && (
        <DetalleMovimientoModal item={detalleModal} onClose={cerrarDetalle} />
      )}
    </div>
  );
};

/* ─── Modal de detalle ─── */
const DetalleMovimientoModal: React.FC<{
  item: MovimientoHistorialItem;
  onClose: () => void;
}> = ({ item, onClose }) => {
  const { overlayClass, panelClass, requestClose } = useModalMotion({ open: true });
  useModalBodyScrollLock(true);

  const handleCerrar = () => {
    requestClose(onClose);
  };

  return (
    <ModalPortal>
      <ModalMotionOverlay
        overlayClass={overlayClass}
        onClick={handleCerrar}
        className="app-modal-overlay"
        scrimClassName="bg-black/50"
      >
        <div
          className={`relative z-10 bg-app-surface rounded-[2.5rem] shadow-xl w-full max-w-2xl overflow-hidden border border-app-border ${panelClass}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-[24px] font-black tracking-tighter text-app-text uppercase">
                  Detalle de movimiento
                </h2>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-2">
                  {item.productoNombre}
                </p>
              </div>
              <button
                onClick={handleCerrar}
                className="p-3 bg-app-bg-muted hover:bg-app-hover-overlay rounded-2xl transition-colors text-app-text-muted"
              >
                <MaterialIcon icon="add" className="w-6 h-6 rotate-45" />
              </button>
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-app-bg-muted rounded-2xl p-5">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Usuario</p>
                <p className="text-sm font-bold text-app-text">{item.usuarioNombre}</p>
              </div>
              <div className="bg-app-bg-muted rounded-2xl p-5">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Cantidad total</p>
                <p className="text-sm font-bold text-app-text">{item.cantidadTotal} unidades</p>
              </div>
              <div className="bg-app-bg-muted rounded-2xl p-5">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Origen</p>
                <p className="text-sm font-bold text-app-text">{item.origenNombre}</p>
              </div>
              <div className="bg-app-bg-muted rounded-2xl p-5">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Destino</p>
                <p className="text-sm font-bold text-app-text">{item.destinoNombre}</p>
              </div>
            </div>

            {/* Tabla de variantes */}
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                Variantes movidas ({item.detalles.length})
              </p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-app-border">
                      <th className="py-3 pr-4 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">Color</th>
                      <th className="py-3 pr-4 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">Talla</th>
                      <th className="py-3 pr-4 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">SKU</th>
                      <th className="py-3 text-right text-[9px] font-bold text-gray-400 uppercase tracking-widest">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {item.detalles.map((d: MovimientoDetalle) => (
                      <tr key={d.idVariante} className="hover:bg-app-hover-overlay transition-colors">
                        <td className="py-3 pr-4">
                          <span className="text-sm font-bold text-app-text">{d.color}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-sm text-app-text-muted">{d.talla}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <code className="text-xs text-gray-400 font-mono">{d.sku}</code>
                        </td>
                        <td className="py-3 text-right">
                          <span className="inline-flex items-center justify-center min-w-[2.5rem] px-3 py-1 bg-app-accent/10 text-app-accent text-xs font-black rounded-full">
                            {d.cantidad}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-app-border">
                      <td colSpan={3} className="py-4 pr-4 text-right text-xs font-black text-app-text uppercase tracking-wider">
                        Total
                      </td>
                      <td className="py-4 text-right">
                        <span className="inline-flex items-center justify-center min-w-[2.5rem] px-3 py-1 bg-app-accent/10 text-app-accent text-xs font-black rounded-full">
                          {item.cantidadTotal}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      </ModalMotionOverlay>
    </ModalPortal>
  );
};

export default HistorialMovimientos;

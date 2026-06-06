import React, { useState, useEffect } from 'react';
import { MaterialIcon, SectionHeader, TableSkeleton } from '@/shared/ui';
import { DashboardPanel } from '@/shared/ui/dashboard/DashboardPanel';
import { ProductoService } from '@/services/ProductoService';
import type { Producto } from '@/types/Producto';

const PrediccionVentas: React.FC = () => {
  const [subTabActiva, setSubTabActiva] = useState<'stock' | 'demanda'>('stock');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargandoStock, setCargandoStock] = useState(false);
  const [errorStock, setErrorStock] = useState<string | null>(null);

  useEffect(() => {
    if (subTabActiva === 'stock') {
      const fetchProductos = async () => {
        try {
          setCargandoStock(true);
          setErrorStock(null);
          const data = await ProductoService.getAllProductos();
          // Ordenar de mayor a menor stock (cantidad)
          const sorted = [...data].sort((a, b) => b.cantidad - a.cantidad);
          setProductos(sorted.slice(0, 10));
        } catch (err: any) {
          console.error('Error al obtener productos:', err);
          setErrorStock('No se pudieron cargar los datos de inventario.');
        } finally {
          setCargandoStock(false);
        }
      };
      fetchProductos();
    }
  }, [subTabActiva]);

  // Función para obtener la insignia del rank de forma visual
  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return (
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black text-xs shadow-sm">
            1
          </span>
        );
      case 1:
        return (
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-black text-xs shadow-sm">
            2
          </span>
        );
      case 2:
        return (
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-600 text-amber-50 font-black text-xs shadow-sm">
            3
          </span>
        );
      default:
        return (
          <span className="flex items-center justify-center w-6 h-6 text-[var(--app-text-muted)] font-bold text-xs">
            {index + 1}
          </span>
        );
    }
  };

  const maxStockVal = productos[0]?.cantidad || 1;

  return (
    <div className="space-y-6 w-full animate-in">
      {/* Header Panel */}
      <DashboardPanel className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="h-11 w-11 rounded-2xl bg-[color-mix(in_srgb,var(--app-accent)_12%,transparent)] flex items-center justify-center shrink-0">
            <MaterialIcon icon="insights" className="h-5 w-5 text-[var(--app-accent)]" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--app-accent)]">Módulo de Reportes</p>
            <h2 className="text-2xl font-black app-heading">INVENTARIO Y DEMANDA</h2>
            <p className="text-sm app-text-muted mt-1">
              Monitoreo del stock físico de productos y predicción de demanda de productos mediante Inteligencia Artificial.
            </p>
          </div>
        </div>
      </DashboardPanel>

      {/* Sub-tab selector */}
      <div className="flex gap-2 p-1.5 bg-[var(--app-bg-muted)] border border-[var(--app-border)] rounded-2xl">
        <button
          type="button"
          onClick={() => setSubTabActiva('stock')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
            subTabActiva === 'stock'
              ? 'bg-[var(--app-accent)] text-white shadow-md font-bold'
              : 'app-text-muted hover:bg-[var(--app-bg-hover)]'
          }`}
        >
          <MaterialIcon icon="inventory_2" className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-wider">1. Stock General</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTabActiva('demanda')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
            subTabActiva === 'demanda'
              ? 'bg-[var(--app-accent)] text-white shadow-md font-bold'
              : 'app-text-muted hover:bg-[var(--app-bg-hover)]'
          }`}
        >
          <MaterialIcon icon="psychology" className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-wider">2. Predicción de Demanda</span>
        </button>
      </div>

      {/* Tab Content */}
      {subTabActiva === 'stock' ? (
        <DashboardPanel className="p-5 sm:p-6">
          <SectionHeader
            title="Productos con Mayor Existencia"
            subtitle="Top 10 de productos con los niveles de stock más altos en el catálogo general"
          />

          {cargandoStock ? (
            <div className="py-12">
              <TableSkeleton rows={10} columns={6} />
            </div>
          ) : errorStock ? (
            <div className="py-8 text-center text-red-500 font-medium">
              {errorStock}
            </div>
          ) : productos.length === 0 ? (
            <div className="py-8 text-center app-text-muted">
              No hay productos registrados en el sistema.
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-2xl border border-[var(--app-border)]">
              <table className="min-w-full divide-y divide-[var(--app-border)]">
                <thead className="bg-[var(--app-bg-muted)]">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider w-16">Rank</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Producto</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Código</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Categoría</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Precio Unit.</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Stock Físico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--app-border)] bg-[var(--app-bg)]">
                  {productos.map((prod, index) => {
                    const percentage = Math.min(100, Math.max(0, (prod.cantidad / maxStockVal) * 100));
                    return (
                      <tr
                        key={prod.idProducto || index}
                        className="hover:bg-[color-mix(in_srgb,var(--app-accent)_4%,transparent)] transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getRankBadge(index)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold app-heading text-sm">{prod.nombre}</div>
                          <div className="text-[11px] app-text-muted">{prod.tipoPublico}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono app-text-muted">
                          {prod.codigoIdentificacion}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--app-bg-muted)] app-text-muted border border-[var(--app-border)]">
                            {prod.categoriaPadre?.nombre || prod.subCategoria2?.nombre || 'General'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold app-heading tabular-nums">
                          {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(prod.precioUnitario)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <span className="font-black app-heading text-sm tabular-nums w-12 text-right">
                              {prod.cantidad}
                            </span>
                            <div className="w-24 bg-[var(--app-bg-muted)] h-2 rounded-full overflow-hidden border border-[var(--app-border)]">
                              <div
                                className="bg-[var(--app-accent)] h-full rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DashboardPanel>
      ) : (
        <DashboardPanel className="p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
          <span className="h-16 w-16 rounded-3xl bg-[var(--app-bg-muted)] flex items-center justify-center mb-4 text-[var(--app-text-muted)]">
            <MaterialIcon icon="psychology" className="h-8 w-8" />
          </span>
          <h3 className="text-lg font-bold app-heading">Predicción de Demanda de Productos</h3>
          <p className="text-sm app-text-muted max-w-md mt-2">
            Este apartado se encuentra en preparación y se habilitará próximamente para la estimación de compras e inventario futuro.
          </p>
        </DashboardPanel>
      )}
    </div>
  );
};

export default PrediccionVentas;

import React, { useState, useEffect } from 'react';
import { MaterialIcon, SectionHeader, TableSkeleton } from '@/shared/ui';
import { DashboardPanel } from '@/shared/ui/dashboard/DashboardPanel';
import { ProductoService } from '@/services/ProductoService';
import { ProductoVarianteService } from '@/services/ProductoVarianteService';
import { ReporteService } from '@/services/ReporteService';
import { useAuth } from '@/context/AuthContext';
import type { Producto } from '@/types/Producto';
import type { ProductoVariante } from '@/types/ProductoVariante';
import type { PrediccionIARequest } from '@/types/ReporteVentas';
import * as XLSX from 'xlsx';

const PrediccionVentas: React.FC = () => {
  const { usuario } = useAuth();
  const rolPrincipal = usuario?.roles?.[0]?.nombreRol || '';

  const [subTabActiva, setSubTabActiva] = useState<'stock' | 'demanda'>('stock');

  // Sección 1: Stock General
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargandoStock, setCargandoStock] = useState(false);
  const [errorStock, setErrorStock] = useState<string | null>(null);

  // Sección 2: Predicción de Demanda
  const [variantes, setVariantes] = useState<ProductoVariante[]>([]);
  const [cargandoVariantes, setCargandoVariantes] = useState(false);
  const [errorVariantes, setErrorVariantes] = useState<string | null>(null);
  const [stockSeguridad, setStockSeguridad] = useState<number>(0);
  const [predicciones, setPredicciones] = useState<Record<string, number>>({});
  const [statusIA, setStatusIA] = useState<string>('Esperando IA');
  const [procesandoIA, setProcesandoIA] = useState<boolean>(false);

  // Cargar datos según la pestaña activa
  useEffect(() => {
    if (subTabActiva === 'stock') {
      const fetchProductos = async () => {
        try {
          setCargandoStock(true);
          setErrorStock(null);
          const data = await ProductoService.getAllProductos(rolPrincipal);
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
    } else {
      const fetchVariantes = async () => {
        try {
          setCargandoVariantes(true);
          setErrorVariantes(null);
          const data = await ProductoVarianteService.obtenerTodasLasVariantes(rolPrincipal, true);
          // Mostrar máximo 7 productos (variantes)
          setVariantes(data.slice(0, 7));
        } catch (err: any) {
          console.error('Error al obtener variantes:', err);
          setErrorVariantes('No se pudieron cargar las variantes de los productos.');
        } finally {
          setCargandoVariantes(false);
        }
      };
      fetchVariantes();
    }
  }, [subTabActiva, rolPrincipal]);

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

  // Generar sugerencias llamando al microservicio de IA por lote
  const handleGenerarSugerencias = async () => {
    try {
      setProcesandoIA(true);
      setStatusIA('Procesando...');
      setPredicciones({});

      // Construir la lista de solicitudes a enviar a la IA
      const requests: PrediccionIARequest[] = variantes.map((v, i) => ({
        id_producto: v.producto?.idProducto || 1,
        color: v.color?.nombre || 'BLANCO',
        talla: v.talla?.nombreTalla || 'M',
        semana_ano: 11, // semana de año según el caso de uso
        es_campana: 1,  // valor campana según el caso de uso
        ventas_semana_pasada: Math.max(5, v.cantidad + 12 - i), // valor dinámico simulado sobre su stock
      }));

      const response = await ReporteService.predecirLote(requests);

      if (response && response.resultados) {
        const nuevasPredicciones: Record<string, number> = {};
        response.resultados.forEach((res) => {
          // Buscar la variante correspondiente por idProducto e identificación de variante
          const variant = variantes.find(
            (v) =>
              v.producto?.idProducto === res.id_producto &&
              `${v.color.nombre}-${v.talla.nombreTalla}` === res.variante
          );
          if (variant) {
            const key = variant.idProductoVariante ?? variant.idVariante ?? 0;
            nuevasPredicciones[key] = res.prediccion_ventas;
          }
        });
        setPredicciones(nuevasPredicciones);
        setStatusIA('success');
      } else {
        setStatusIA('Error en la predicción');
      }
    } catch (err: any) {
      console.error('Error al consultar lote en la IA:', err);
      setStatusIA('Error de Conexión');
    } finally {
      setProcesandoIA(false);
    }
  };

  // Exportar la tabla de predicciones a Excel
  const handleExportarExcel = () => {
    if (variantes.length === 0) return;

    const dataToExport = variantes.map((v, index) => {
      const key = v.idProductoVariante ?? v.idVariante ?? index;
      const pred = predicciones[key];
      const aComprar = pred !== undefined ? Math.max(0, pred + stockSeguridad - v.cantidad) : '---';

      return {
        Producto: v.producto?.nombre || 'Desconocido',
        Variante: `${v.color?.nombre || 'N/A'}-${v.talla?.nombreTalla || 'N/A'}`,
        'Stock Actual': v.cantidad,
        'Predicción IA': pred !== undefined ? pred : '---',
        'Stock Seguridad': stockSeguridad,
        'Cantidad a Comprar': aComprar,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Proyecciones de Compra');
    XLSX.writeFile(workbook, 'Proyecciones_Demanda_IA.xlsx');
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
        <DashboardPanel className="p-5 sm:p-6">
          <SectionHeader
            title="Predicción de Demanda y Planificación de Compras"
            subtitle="Cálculo dinámico de stock de seguridad y generación de compras sugeridas con Inteligencia Artificial"
          />

          {cargandoVariantes ? (
            <div className="py-12">
              <TableSkeleton rows={7} columns={6} />
            </div>
          ) : errorVariantes ? (
            <div className="py-8 text-center text-red-500 font-medium">
              {errorVariantes}
            </div>
          ) : variantes.length === 0 ? (
            <div className="py-8 text-center app-text-muted">
              No hay variantes de productos registradas.
            </div>
          ) : (
            <div className="mt-5">
              <div className="overflow-x-auto rounded-2xl border border-[var(--app-border)]">
                <table className="min-w-full divide-y divide-[var(--app-border)]">
                  <thead className="bg-[var(--app-bg-muted)]">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Producto</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Variante</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Stock Actual</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Predicción IA</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Stock Seg.</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">A Comprar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--app-border)] bg-[var(--app-bg)]">
                    {variantes.map((v, index) => {
                      const key = v.idProductoVariante ?? v.idVariante ?? index;
                      const pred = predicciones[key];
                      const aComprar = pred !== undefined ? Math.max(0, pred + stockSeguridad - v.cantidad) : null;

                      return (
                        <tr
                          key={key}
                          className="hover:bg-[color-mix(in_srgb,var(--app-accent)_4%,transparent)] transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-bold app-heading text-sm">{v.producto?.nombre || 'Desconocido'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono app-heading">
                            {v.color?.nombre || 'N/A'}-{v.talla?.nombreTalla || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm app-text-muted font-bold tabular-nums">
                            {v.cantidad}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[var(--app-accent)] tabular-nums">
                            {pred !== undefined ? pred : '---'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm app-text-muted font-bold tabular-nums">
                            {stockSeguridad}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {aComprar !== null ? aComprar : '---'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Status and Controls Section */}
              <div className="mt-8 border-t border-[var(--app-border)] pt-6">
                <div className="text-center mb-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)]">Status</p>
                  <p className="text-lg font-mono font-bold mt-1 text-[var(--app-accent)]">{statusIA}</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className="text-xs font-black uppercase tracking-wider text-[var(--app-text-muted)] whitespace-nowrap">
                      Ajuste Stock Seguridad
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={stockSeguridad}
                      onChange={(e) => setStockSeguridad(Number(e.target.value))}
                      className="w-32 sm:w-48 accent-[var(--app-accent)]"
                    />
                    <span className="flex items-center justify-center bg-[color-mix(in_srgb,var(--app-accent)_8%,transparent)] text-xs font-black w-8 h-8 rounded-lg text-[var(--app-accent)]">
                      {stockSeguridad}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerarSugerencias}
                    disabled={procesandoIA || variantes.length === 0}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[var(--app-accent)] hover:bg-[color-mix(in_srgb,var(--app-accent)_85%,black)] text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-[color-mix(in_srgb,var(--app-accent)_20%,transparent)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <MaterialIcon icon="psychology" className="w-4 h-4" />
                    {procesandoIA ? 'Generando...' : 'Generar Sugerencias IA'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleExportarExcel}
                  disabled={variantes.length === 0}
                  className="w-full mt-4 py-3 rounded-2xl bg-[var(--app-bg-muted)] border border-[var(--app-border)] hover:bg-[var(--app-bg-hover)] text-[var(--app-text)] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <MaterialIcon icon="download" className="w-4 h-4" />
                  Exportar a Excel
                </button>
              </div>
            </div>
          )}
        </DashboardPanel>
      )}
    </div>
  );
};

export default PrediccionVentas;

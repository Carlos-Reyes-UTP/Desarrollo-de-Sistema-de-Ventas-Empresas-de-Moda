import { useRef, useEffect } from 'react';
import {
  CubeIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { ProductoMasVendido, TallaProducto, VariantesPorColor } from '@/types/ReporteVentas';
import {
  CustomPieLabel,
  CustomTooltipVariantes,
} from '@/components/reportes/productos-mas-vendidos/chartRenderers';
import { formatProductoCategoria } from '@/utils/reportProductRank';

interface ProductIndividualModeProps {
  busqueda: string;
  onBusqueda: (v: string) => void;
  productos: ProductoMasVendido[];
  onSelectProducto: (producto: ProductoMasVendido) => void;
  productoSeleccionado: ProductoMasVendido | null;
  tallasProducto: TallaProducto[];
  tallaSeleccionada: string | null;
  onSelectTalla: (nombreTalla: string) => void;
  variantesPorColor: VariantesPorColor[];
  loadingTallas: boolean;
  loadingVariantes: boolean;
  tipoGraficoVariantes: 'barras' | 'torta';
  onTipoGraficoVariantes: (v: 'barras' | 'torta') => void;
  onCerrarDetalle: () => void;
  mostrarDetalle: boolean;
  isClosing: boolean;
}

export function ProductIndividualMode({
  busqueda,
  onBusqueda,
  productos,
  onSelectProducto,
  productoSeleccionado,
  tallasProducto,
  tallaSeleccionada,
  onSelectTalla,
  variantesPorColor,
  loadingTallas,
  loadingVariantes,
  tipoGraficoVariantes,
  onTipoGraficoVariantes,
  onCerrarDetalle,
  mostrarDetalle,
  isClosing,
}: ProductIndividualModeProps) {
  const detalleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mostrarDetalle && detalleRef.current && !isClosing) {
      const t = window.setTimeout(() => {
        detalleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      return () => window.clearTimeout(t);
    }
  }, [mostrarDetalle, isClosing, productoSeleccionado?.idProducto]);

  return (
    <div className="product-report-individual product-report-crossfade">
      <section className="product-report-table-wrap">
        <header className="product-report-table-wrap__head product-report-individual__search-head">
          <div>
            <h3 className="product-report-table-wrap__title">Análisis individual</h3>
            <p className="product-report-table-wrap__sub">Busca un producto y revisa tallas y colores</p>
          </div>
          <div className="product-report-individual__search">
            <MagnifyingGlassIcon className="product-report-individual__search-icon" />
            <input
              type="search"
              placeholder="Nombre o categoría…"
              value={busqueda}
              onChange={(e) => onBusqueda(e.target.value)}
              className="product-report-controls__input pl-10"
            />
          </div>
        </header>

        <div className="product-report-table-scroll">
          <table className="product-report-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th className="text-right">Unidades</th>
                <th className="text-right">Ingresos</th>
                <th className="text-center"> </th>
              </tr>
            </thead>
            <tbody>
              {productos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="product-report-table__empty">
                    No hay resultados
                  </td>
                </tr>
              ) : (
                productos.map((producto) => (
                  <tr key={producto.idProducto}>
                    <td className="product-report-table__name">{producto.nombreProducto}</td>
                    <td>
                      <span className="product-report-table__cat">{formatProductoCategoria(producto)}</span>
                    </td>
                    <td className="text-right tabular-nums font-bold">
                      {producto.cantidadVendida.toLocaleString('es-PE')}
                    </td>
                    <td className="text-right tabular-nums">
                      S/ {producto.ingresosTotales.toLocaleString('es-PE')}
                    </td>
                    <td className="text-center">
                      <button
                        type="button"
                        className="product-report-table__ver"
                        onClick={() => onSelectProducto(producto)}
                      >
                        Analizar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {mostrarDetalle && productoSeleccionado ? (
        <div
          ref={detalleRef}
          className={`product-report-detail ${isClosing ? 'product-report-detail--closing' : ''}`}
        >
          <header className="product-report-detail__head">
            <h3 className="product-report-detail__title">
              Detalle · <span>{productoSeleccionado.nombreProducto}</span>
            </h3>
            <button type="button" className="product-report-detail__close" onClick={onCerrarDetalle} aria-label="Cerrar">
              ✕
            </button>
          </header>

          <div className="product-report-detail__body">
            <h4 className="product-report-controls__label">Tallas</h4>
            {loadingTallas ? (
              <p className="app-text-muted text-sm font-bold py-4">Cargando tallas…</p>
            ) : tallasProducto.length > 0 ? (
              <div className="product-report-talla-grid">
                {tallasProducto.map((talla, index) => (
                  <button
                    key={`${talla.nombreTalla}-${index}`}
                    type="button"
                    onClick={() => onSelectTalla(talla.nombreTalla)}
                    className={`product-report-talla ${
                      tallaSeleccionada === talla.nombreTalla ? 'product-report-talla--active' : ''
                    }`}
                  >
                    <span>{talla.nombreTalla}</span>
                    <span className="product-report-talla__meta">{talla.cantidadVariantes} var.</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="product-report-rank-panel__empty">
                <CubeIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>No se encontraron tallas</p>
              </div>
            )}

            {tallaSeleccionada ? (
              <div className="product-report-variantes mt-6">
                <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
                  <h4 className="text-sm font-black uppercase tracking-wider app-heading">
                    Variantes · Talla {tallaSeleccionada}
                  </h4>
                  <div className="reports-analytics__segmented">
                    <button
                      type="button"
                      className={`report-segmented-tab ${tipoGraficoVariantes === 'barras' ? 'report-segmented-tab--active' : ''}`}
                      onClick={() => onTipoGraficoVariantes('barras')}
                    >
                      Barras
                    </button>
                    <button
                      type="button"
                      className={`report-segmented-tab ${tipoGraficoVariantes === 'torta' ? 'report-segmented-tab--active' : ''}`}
                      onClick={() => onTipoGraficoVariantes('torta')}
                    >
                      Torta
                    </button>
                  </div>
                </div>

                <div className="relative min-h-[280px]">
                  {loadingVariantes ? (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-[color-mix(in_srgb,var(--app-panel)_80%,transparent)]">
                      <span className="app-text-muted text-sm font-bold">Cargando variantes…</span>
                    </div>
                  ) : null}

                  {variantesPorColor.length > 0 ? (
                    <div className="space-y-4">
                      <div className="product-report-rank-panel__chart product-report-rank-panel__chart--tall">
                        <ResponsiveContainer width="100%" height="100%">
                          {tipoGraficoVariantes === 'barras' ? (
                            <BarChart
                              data={variantesPorColor.filter((v) => v.cantidadVendida > 0)}
                              margin={{ top: 12, right: 16, left: 8, bottom: 4 }}
                            >
                              <CartesianGrid stroke="var(--app-border)" strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="nombreColor" tickLine={false} axisLine={false} tick={{ fill: 'var(--app-text-muted)', fontSize: 11 }} />
                              <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--app-text-muted)', fontSize: 11 }} />
                              <Tooltip content={<CustomTooltipVariantes />} />
                              <Bar dataKey="cantidadVendida" fill="var(--app-accent)" name="Cantidad" radius={[4, 4, 0, 0]} maxBarSize={36} />
                            </BarChart>
                          ) : (
                            <PieChart>
                              <Pie
                                data={variantesPorColor.filter((v) => v.cantidadVendida > 0)}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={CustomPieLabel}
                                innerRadius={48}
                                outerRadius={72}
                                paddingAngle={3}
                                dataKey="cantidadVendida"
                                stroke="var(--app-panel)"
                                strokeWidth={1.5}
                              >
                                {variantesPorColor
                                  .filter((v) => v.cantidadVendida > 0)
                                  .map((entry, index) => (
                                    <Cell
                                      key={`color-${entry.nombreColor}-${index}`}
                                      fill={entry.hexColor || `hsl(0, 0%, ${35 + index * 8}%)`}
                                    />
                                  ))}
                              </Pie>
                              <Tooltip content={<CustomTooltipVariantes />} />
                            </PieChart>
                          )}
                        </ResponsiveContainer>
                      </div>

                      <div className="product-report-table-scroll">
                        <table className="product-report-table">
                          <thead>
                            <tr>
                              <th>Color</th>
                              <th className="text-center">Cantidad</th>
                              <th className="text-right">Ingresos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {variantesPorColor.map((variante, idx) => (
                              <tr key={`${variante.nombreColor}-${idx}`}>
                                <td>{variante.nombreColor}</td>
                                <td className="text-center tabular-nums font-bold">{variante.cantidadVendida}</td>
                                <td className="text-right tabular-nums">
                                  S/ {Number(variante.ingresosTotales).toLocaleString('es-PE')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : !loadingVariantes ? (
                    <div className="product-report-rank-panel__empty">
                      <p>No hay variantes para esta talla</p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

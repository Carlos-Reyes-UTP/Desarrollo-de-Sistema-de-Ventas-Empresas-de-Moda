import { useEffect, useMemo, useState } from 'react';
import type { VarianteMasVendida } from '@/types/ReporteVentas';
import { formatVarianteCategoria, formatVarianteLabel } from '@/utils/reportProductRank';
import { MaterialIcon } from '@/shared/ui';

const PAGE_SIZE = 10;

interface ProductRankTableProps {
  variantes: VarianteMasVendida[];
  onVer: (variante: VarianteMasVendida) => void;
}

export function ProductRankTable({ variantes, onVer }: ProductRankTableProps) {
  const [pagina, setPagina] = useState(1);

  const totalPaginas = Math.max(1, Math.ceil(variantes.length / PAGE_SIZE));

  useEffect(() => {
    setPagina(1);
  }, [variantes]);

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  const pageRows = useMemo(() => {
    const start = (pagina - 1) * PAGE_SIZE;
    return variantes.slice(start, start + PAGE_SIZE);
  }, [variantes, pagina]);

  const from = variantes.length === 0 ? 0 : (pagina - 1) * PAGE_SIZE + 1;
  const to = Math.min(pagina * PAGE_SIZE, variantes.length);

  return (
    <section className="product-report-table-wrap" aria-label="Ranking completo de variantes">
      <header className="product-report-table-wrap__head">
        <h3 className="product-report-table-wrap__title">Ranking completo · Variantes</h3>
        <p className="product-report-table-wrap__sub">Ordenado por unidades vendidas (producto · color · talla)</p>
      </header>
      <div className="product-report-table-scroll">
        <table className="product-report-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Variante</th>
              <th>Categoría</th>
              <th className="text-right">Unidades</th>
              <th className="text-right">Ingresos</th>
              <th className="text-right">Precio prom.</th>
              <th>Código</th>
              <th className="text-center"> </th>
            </tr>
          </thead>
          <tbody>
            {variantes.length === 0 ? (
              <tr>
                <td colSpan={8} className="product-report-table__empty">
                  No hay variantes para el filtro actual
                </td>
              </tr>
            ) : (
              pageRows.map((variante, index) => {
                const rank = (pagina - 1) * PAGE_SIZE + index + 1;
                return (
                  <tr key={variante.idProductoVariante}>
                    <td>
                      <span className="product-report-table__rank">{rank}</span>
                    </td>
                    <td className="product-report-table__name">
                      <span title={formatVarianteLabel(variante)}>{formatVarianteLabel(variante)}</span>
                      <span className="product-report-table__meta">
                        {variante.color} · {variante.talla}
                      </span>
                    </td>
                    <td>
                      <span className="product-report-table__cat">{formatVarianteCategoria(variante)}</span>
                    </td>
                    <td className="text-right tabular-nums font-bold">
                      {variante.cantidadVendida.toLocaleString('es-PE')}
                    </td>
                    <td className="text-right tabular-nums">
                      S/ {Number(variante.ingresosTotales).toLocaleString('es-PE')}
                    </td>
                    <td className="text-right tabular-nums">
                      S/ {Number(variante.precioPromedio).toLocaleString('es-PE')}
                    </td>
                    <td className="tabular-nums app-text-muted text-sm">{variante.codigoIdentificacion}</td>
                    <td className="text-center">
                      <button type="button" className="product-report-table__ver" onClick={() => onVer(variante)}>
                        Ver
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {variantes.length > PAGE_SIZE ? (
        <div className="report-pagination-bar product-report-table__pager">
          <div className="flex sm:hidden items-center justify-between px-3 py-2">
            <button
              type="button"
              className="report-pagination-btn"
              disabled={pagina === 1}
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
            >
              <MaterialIcon icon="chevron_left" className="h-4 w-4 mr-1" />
              Anterior
            </button>
            <span className="text-sm font-medium app-heading tabular-nums">
              {pagina} / {totalPaginas}
            </span>
            <button
              type="button"
              className="report-pagination-btn"
              disabled={pagina === totalPaginas}
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            >
              Siguiente
              <MaterialIcon icon="chevron_right" className="h-4 w-4 ml-1" />
            </button>
          </div>

          <div className="hidden sm:flex items-center justify-between px-4 py-3 sm:px-5">
            <p className="text-sm app-text-muted tabular-nums">
              {from}–{to} de {variantes.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="report-pagination-btn"
                disabled={pagina === 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                aria-label="Página anterior"
              >
                <MaterialIcon icon="chevron_left" className="h-4 w-4" />
              </button>
              <span className="text-sm font-bold tabular-nums app-heading px-2">
                {pagina} / {totalPaginas}
              </span>
              <button
                type="button"
                className="report-pagination-btn"
                disabled={pagina === totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                aria-label="Página siguiente"
              >
                <MaterialIcon icon="chevron_right" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

import { useRef, useEffect, useState } from 'react';
import type { Categoria } from '@/types/Categoria';
import { DatePickerPopover } from '@/components/reportes/shared/DatePickerPopover';

export type ProductAnalysisMode = 'ranking' | 'individual';

interface ProductReportControlsProps {
  categorias: Categoria[];
  categoriaPadre: string;
  onCategoriaPadre: (id: string) => void;
  onClearCategoria: () => void;
  fechaInicio: string;
  fechaFin: string;
  onFechaInicio: (v: string) => void;
  onFechaFin: (v: string) => void;
  onQuickFilter: (tipo: 'hoy' | 'semana' | 'mes') => void;
  onClearFilters: () => void;
  mode: ProductAnalysisMode;
  onMode: (mode: ProductAnalysisMode) => void;
}

export function ProductReportControls({
  categorias,
  categoriaPadre,
  onCategoriaPadre,
  onClearCategoria,
  fechaInicio,
  fechaFin,
  onFechaInicio,
  onFechaFin,
  onQuickFilter,
  onClearFilters,
  mode,
  onMode,
}: ProductReportControlsProps) {
  const [searchCategoria, setSearchCategoria] = useState('');
  const [isCategoriaFocused, setIsCategoriaFocused] = useState(false);
  const categoriaRef = useRef<HTMLDivElement>(null);

  const categoriasFiltradas = categorias.filter(
    (c) =>
      searchCategoria === '' || c.nombre.toLowerCase().includes(searchCategoria.toLowerCase())
  );

  const categoriaNombre =
    categorias.find((c) => c.idCategoria?.toString() === categoriaPadre)?.nombre ?? '';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoriaRef.current && !categoriaRef.current.contains(event.target as Node)) {
        setSearchCategoria('');
        setIsCategoriaFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <section className="product-report-controls" aria-label="Filtros de productos">
      <div className="product-report-controls__top">
        <div className="reports-analytics__segmented product-report-controls__segment" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'ranking'}
            className={`report-segmented-tab ${mode === 'ranking' ? 'report-segmented-tab--active' : ''}`}
            onClick={() => onMode('ranking')}
          >
            Ranking
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'individual'}
            className={`report-segmented-tab ${mode === 'individual' ? 'report-segmented-tab--active' : ''}`}
            onClick={() => onMode('individual')}
          >
            Individual
          </button>
        </div>
      </div>

      <div className="product-report-controls__grid">
        <div className="relative" ref={categoriaRef}>
          <label className="product-report-controls__label">Categoría principal</label>
          <div className="relative">
            <input
              type="text"
              placeholder={categoriaPadre ? 'Categoría seleccionada' : 'Buscar categoría…'}
              value={searchCategoria}
              onChange={(e) => setSearchCategoria(e.target.value)}
              onFocus={() => setIsCategoriaFocused(true)}
              disabled={!!categoriaPadre}
              className="product-report-controls__input"
            />
            {categoriaPadre ? (
              <div className="product-report-controls__chip-selected">
                <span className="truncate">{categoriaNombre}</span>
                <button type="button" onClick={onClearCategoria} aria-label="Quitar categoría">
                  ✕
                </button>
              </div>
            ) : null}
          </div>
          {(isCategoriaFocused || searchCategoria) && !categoriaPadre ? (
            <div className="product-report-controls__dropdown">
              {categoriasFiltradas.length > 0 ? (
                categoriasFiltradas.map((categoria) => (
                  <button
                    key={categoria.idCategoria}
                    type="button"
                    className="product-report-controls__dropdown-item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onCategoriaPadre(categoria.idCategoria?.toString() || '');
                      setSearchCategoria('');
                      setIsCategoriaFocused(false);
                    }}
                  >
                    {categoria.nombre}
                  </button>
                ))
              ) : (
                <p className="product-report-controls__empty">Sin categorías</p>
              )}
            </div>
          ) : null}
        </div>

        <DatePickerPopover label="Fecha inicio" value={fechaInicio} onChange={onFechaInicio} />
        <DatePickerPopover label="Fecha fin" value={fechaFin} onChange={onFechaFin} min={fechaInicio} />

        <div className="product-report-controls__clear-wrap">
          <label className="product-report-controls__label product-report-controls__label--ghost">_</label>
          <button type="button" className="product-report-controls__clear" onClick={onClearFilters}>
            Limpiar
          </button>
        </div>
      </div>

      <div className="product-report-controls__chips">
        <span className="product-report-controls__label">Rápido</span>
        <button type="button" className="product-report-chip" onClick={() => onQuickFilter('hoy')}>
          Hoy
        </button>
        <button type="button" className="product-report-chip" onClick={() => onQuickFilter('semana')}>
          Últimos 7 días
        </button>
        <button type="button" className="product-report-chip" onClick={() => onQuickFilter('mes')}>
          Últimos 30 días
        </button>
      </div>
    </section>
  );
}

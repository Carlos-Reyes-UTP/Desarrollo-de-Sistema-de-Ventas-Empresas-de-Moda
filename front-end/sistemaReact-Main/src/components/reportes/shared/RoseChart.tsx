import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface RoseChartProps {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  onSectorClick?: (item: unknown) => void;
  valueFormatter?: (value: number) => string;
  height?: number;
  title?: string;
  colorPalette?: string[];
}

export const RoseChart: React.FC<RoseChartProps> = ({
  data,
  labelKey,
  valueKey,
  onSectorClick,
  valueFormatter,
  height = 400,
  title,
  colorPalette
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 400 });
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    label: string;
    value: string | number;
    percent: string;
    color: string;
  } | null>(null);

  // Monitor de tamaño responsivo
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      setDimensions({ width, height: height || 400 });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [height]);

  // Colores por defecto sumamente elegantes y coordinados
  const defaultColors = colorPalette || [
    '#4F46E5', // Indigo
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#F97316', // Orange
    '#14B8A6', // Teal
    '#EF4444'  // Red
  ];

  useEffect(() => {
    if (
      !containerRef.current ||
      !svgRef.current ||
      dimensions.width === 0 ||
      dimensions.height === 0 ||
      !data ||
      data.length === 0
    ) {
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Limpieza previa

    const margin = { top: 40, right: 60, bottom: 40, left: 60 };
    const width = dimensions.width;
    const chartHeight = dimensions.height;
    
    // El radio máximo será el menor de ancho/alto disponible menos márgenes
    const outerRadius = Math.min(width - margin.left - margin.right, chartHeight - margin.top - margin.bottom) / 2;
    const innerRadius = 30; // Agujero central para estética de roseta (donut polar)

    // Centro del gráfico
    const centerX = width / 2;
    const centerY = chartHeight / 2;

    const mainG = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    // Valores
    const values = data.map(d => Number(d[valueKey]) || 0);
    const maxVal = d3.max(values) || 1;
    const totalValue = d3.sum(values) || 1;

    // Escala del radio: Usamos scaleSqrt (raíz cuadrada) para que el ÁREA de cada pétalo sea 
    // directamente proporcional a su valor, lo cual es la definición matemática de un Rose Chart
    const radiusScale = d3.scaleSqrt()
      .domain([0, maxVal])
      .range([innerRadius, outerRadius]);

    const N = data.length;
    const angleSlice = (2 * Math.PI) / N;

    // Configuración de Gradientes SVG
    const defs = svg.append('defs');
    data.forEach((_, i) => {
      const gradient = defs.append('linearGradient')
        .attr('id', `rose-grad-${i}`)
        .attr('x1', '0%')
        .attr('y1', '100%')
        .attr('x2', '100%')
        .attr('y2', '0%');

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', defaultColors[i % defaultColors.length])
        .attr('stop-opacity', 0.85);

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', defaultColors[i % defaultColors.length])
        .attr('stop-opacity', 1.0);
    });

    // 1. Dibujar líneas de guía concéntricas (Grid circular)
    const tickValues = [0.25, 0.5, 0.75, 1.0].map(p => maxVal * p);
    const gridGroup = mainG.append('g').attr('class', 'grid-lines');

    tickValues.forEach((tickVal) => {
      const r = radiusScale(tickVal);
      
      // Círculo
      gridGroup.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', r)
        .attr('fill', 'none')
        .attr('stroke', '#f1f5f9')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3');

      // Etiqueta del valor de la escala
      gridGroup.append('text')
        .attr('x', 4)
        .attr('y', -r - 2)
        .attr('fill', '#cbd5e1')
        .attr('font-size', '9px')
        .attr('font-weight', '500')
        .text(valueFormatter ? valueFormatter(tickVal) : Math.round(tickVal).toLocaleString());
    });

    // 2. Dibujar divisiones de radios (Líneas Spokes)
    const spokesGroup = mainG.append('g').attr('class', 'spokes');
    data.forEach((_, i) => {
      const angle = i * angleSlice - Math.PI / 2; // Ajustado para iniciar desde arriba (-90 grados)
      
      spokesGroup.append('line')
        .attr('x1', innerRadius * Math.cos(angle))
        .attr('y1', innerRadius * Math.sin(angle))
        .attr('x2', (outerRadius * 1.05) * Math.cos(angle))
        .attr('y2', (outerRadius * 1.05) * Math.sin(angle))
        .attr('stroke', '#f8fafc')
        .attr('stroke-width', 1);
    });

    // 3. Renderizado de Pétalos / Sectores
    const sectorsGroup = mainG.append('g').attr('class', 'sectors');

    const paths = sectorsGroup.selectAll('path')
      .data(data)
      .enter()
      .append('path')
      .attr('d', (_, i) => {
        // Estado inicial de animación (cero tamaño)
        const initArc = d3.arc<unknown>()
          .innerRadius(innerRadius)
          .outerRadius(innerRadius)
          .startAngle(i * angleSlice - Math.PI / 2)
          .endAngle((i + 1) * angleSlice - Math.PI / 2)
          .padAngle(0.015)
          .cornerRadius(5);
        return initArc(null);
      })
      .attr('fill', (_, i) => `url(#rose-grad-${i})`)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .style('transition', 'filter 0.2s ease, opacity 0.2s ease');

    // Animación fluida de apertura (efecto elástico)
    paths.transition()
      .duration(1100)
      .delay((_, i) => i * 40)
      .ease(d3.easeElasticOut.amplitude(1.0).period(0.6))
      .attrTween('d', function(d, i) {
        const targetRadius = radiusScale(Number(d[valueKey]) || 0);
        const interpolator = d3.interpolate(innerRadius, targetRadius);
        return function(t) {
          const currentArc = d3.arc<unknown>()
            .innerRadius(innerRadius)
            .outerRadius(interpolator(t))
            .startAngle(i * angleSlice - Math.PI / 2)
            .endAngle((i + 1) * angleSlice - Math.PI / 2)
            .padAngle(0.015)
            .cornerRadius(5);
          return currentArc(null) || '';
        };
      });

    // Interacciones de ratón
    paths.on('mouseenter', function(event, d) {
      const i = data.indexOf(d);
      const val = Number(d[valueKey]) || 0;
      
      // Resaltar y agrandar el arco hovered
      d3.select(this)
        .attr('filter', 'brightness(1.05) drop-shadow(0px 8px 16px rgba(0,0,0,0.12))')
        .transition()
        .duration(200)
        .attr('d', () => {
          const hoveredArc = d3.arc<unknown>()
            .innerRadius(innerRadius)
            .outerRadius(radiusScale(val) + 8) // Crecimiento en 8px para feedback dinámico
            .startAngle(i * angleSlice - Math.PI / 2)
            .endAngle((i + 1) * angleSlice - Math.PI / 2)
            .padAngle(0.015)
            .cornerRadius(5);
          return hoveredArc(null);
        });

      // Opacar los demás pétalos
      paths.filter((_, idx) => idx !== i)
        .style('opacity', 0.45);

      const percent = ((val / totalValue) * 100).toFixed(1) + '%';
      const [mx, my] = d3.pointer(event, containerRef.current);

      setTooltip({
        visible: true,
        x: mx + 15,
        y: my - 50,
        label: String(d[labelKey]),
        value: valueFormatter ? valueFormatter(val) : val.toLocaleString(),
        percent,
        color: defaultColors[i % defaultColors.length]
      });
    })
    .on('mousemove', function(event) {
      const [mx, my] = d3.pointer(event, containerRef.current);
      setTooltip(prev => prev ? { ...prev, x: mx + 15, y: my - 50 } : null);
    })
    .on('mouseleave', function(_, d) {
      const i = data.indexOf(d);
      
      // Restaurar tamaño y filtros
      d3.select(this)
        .attr('filter', null)
        .transition()
        .duration(200)
        .attr('d', () => {
          const normalArc = d3.arc<unknown>()
            .innerRadius(innerRadius)
            .outerRadius(radiusScale(Number(d[valueKey]) || 0))
            .startAngle(i * angleSlice - Math.PI / 2)
            .endAngle((i + 1) * angleSlice - Math.PI / 2)
            .padAngle(0.015)
            .cornerRadius(5);
          return normalArc(null);
        });

      // Restaurar opacidad de todos
      paths.style('opacity', 1.0);
      setTooltip(null);
    })
    .on('click', function(_, d) {
      if (onSectorClick) {
        onSectorClick(d);
      }
    });

    // 4. Dibujar etiquetas de texto en el exterior de los pétalos
    const labelsGroup = mainG.append('g').attr('class', 'labels');

    data.forEach((d, i) => {
      const val = Number(d[valueKey]) || 0;
      if (val <= 0) return;

      const angle = i * angleSlice + angleSlice / 2 - Math.PI / 2; // Ángulo medio del pétalo
      const r = radiusScale(val) + 16; // Posicionada a 16px fuera del borde

      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);

      // En listas grandes, omitimos etiquetas de rebanadas muy pequeñas para evitar ruido visual
      if (N > 12 && val < maxVal * 0.05) return;

      const isRightSide = Math.cos(angle) >= 0;

      labelsGroup.append('text')
        .attr('x', x)
        .attr('y', y + 3)
        .attr('fill', '#4b5563')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('text-anchor', isRightSide ? 'start' : 'end')
        .style('pointer-events', 'none')
        .text(String(d[labelKey]).length > 13 ? String(d[labelKey]).substring(0, 11) + '...' : String(d[labelKey]));
    });

  }, [data, dimensions, labelKey, valueKey, defaultColors, valueFormatter, onSectorClick]);

  return (
    <div 
      className="relative w-full rounded-2xl app-panel border p-4 transition-all duration-300" 
      ref={containerRef}
      style={{ minHeight: `${height}px` }}
    >
      {title && (
        <h4 className="text-sm font-semibold text-gray-700 mb-2 px-2 text-center uppercase tracking-wider opacity-85">
          {title}
        </h4>
      )}
      
      <svg 
        ref={svgRef} 
        width={dimensions.width} 
        height={dimensions.height}
        className="overflow-visible select-none max-w-full mx-auto"
      />

      {/* Tooltip interactivo premium con Glassmorphism */}
      {tooltip && tooltip.visible && (
        <div
          className="absolute z-50 pointer-events-none app-chart-tooltip backdrop-blur-md p-3 shadow-xl transition-all duration-100 ease-out flex flex-col gap-1 text-xs"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="flex items-center gap-2 border-b border-[var(--app-border)] pb-1 mb-1 font-bold app-heading">
            <span 
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0" 
              style={{ backgroundColor: tooltip.color }}
            />
            <span className="truncate max-w-[150px]">{tooltip.label}</span>
          </div>
          <div className="flex justify-between gap-4 text-gray-600 dark:text-gray-300">
            <span className="font-medium">Valor:</span>
            <span className="font-extrabold text-gray-900 dark:text-white">{tooltip.value}</span>
          </div>
          <div className="flex justify-between gap-4 text-gray-500 dark:text-gray-400">
            <span>Porcentaje:</span>
            <span className="font-semibold text-[var(--app-accent)]">{tooltip.percent}</span>
          </div>
        </div>
      )}
    </div>
  );
};

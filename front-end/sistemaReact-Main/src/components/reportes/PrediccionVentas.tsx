import React, { useState, useEffect } from 'react';
import { MaterialIcon, SectionHeader, TableSkeleton } from '@/shared/ui';
import { DashboardPanel } from '@/shared/ui/dashboard/DashboardPanel';
import { ProductoVarianteService } from '@/services/ProductoVarianteService';
import { ReporteService } from '@/services/ReporteService';
import { useAuth } from '@/context/AuthContext';
import type { ProductoVariante } from '@/types/ProductoVariante';
import type { PrediccionIARequest, StockProducto, StockVariante } from '@/types/ReporteVentas';
import * as XLSX from 'xlsx';
import AppModal from '@/shared/ui/AppModal';
import { useReportPageActions } from '@/components/reportes/context/ReportPageActionsContext';

const PrediccionVentas: React.FC = () => {
  const { usuario } = useAuth();
  const rolPrincipal = usuario?.roles?.[0]?.nombreRol || '';
  const { setActions } = useReportPageActions();

  useEffect(() => {
    setActions(null);
    return () => setActions(null);
  }, [setActions]);

  const [subTabActiva, setSubTabActiva] = useState<'stock' | 'demanda'>('stock');

  // Sección 1: Stock General
  const [productos, setProductos] = useState<StockProducto[]>([]);
  const [cargandoStock, setCargandoStock] = useState(false);
  const [errorStock, setErrorStock] = useState<string | null>(null);
  const [filtroStock, setFiltroStock] = useState<'todos' | 'sobreestock' | 'normal' | 'bajo'>('todos');
  const [paginaActual, setPaginaActual] = useState<number>(1);

  // Sección 2: Predicción de Demanda
  const [variantes, setVariantes] = useState<ProductoVariante[]>([]);
  const [todasLasVariantes, setTodasLasVariantes] = useState<ProductoVariante[]>([]);
  const [cargandoVariantes, setCargandoVariantes] = useState(false);
  const [errorVariantes, setErrorVariantes] = useState<string | null>(null);
  const [stockSeguridad, setStockSeguridad] = useState<number>(0);
  const [predicciones, setPredicciones] = useState<Record<string, number>>({});
  const [statusIA, setStatusIA] = useState<string>('Esperando IA');
  const [procesandoIA, setProcesandoIA] = useState<boolean>(false);
  const [paginaIA, setPaginaIA] = useState<number>(1);
  const [ordenDemanda, setOrdenDemanda] = useState<'mayor_demanda' | 'menor_demanda' | 'producto' | 'stock'>('mayor_demanda');


  const { tieneRol } = useAuth();
  const esAdmin = tieneRol('ROLE_ADMIN');

  // Métricas del modelo de IA (Reales)
  const [mae, setMae] = useState<number>(0.0);
  const [rmse, setRmse] = useState<number>(0.0);
  const [cargandoMetricas, setCargandoMetricas] = useState<boolean>(false);
  const [reentrenando, setReentrenando] = useState<boolean>(false);
  const [modalReentrenarOpen, setModalReentrenarOpen] = useState<boolean>(false);
  const [progresoEntrenamiento, setProgresoEntrenamiento] = useState<number>(0);
  const [pasoEntrenamiento, setPasoEntrenamiento] = useState<number>(0);
  const [errorMetricas, setErrorMetricas] = useState<string | null>(null);
  const [modoTrabajoIA, setModoTrabajoIA] = useState<'entrenar' | 'optimizar'>('entrenar');
  const [modalConfirmarOptimizacionOpen, setModalConfirmarOptimizacionOpen] = useState<boolean>(false);

  // Estados para desglose de variantes en modal
  const [selectedProduct, setSelectedProduct] = useState<StockProducto | null>(null);
  const [modalVariantesOpen, setModalVariantesOpen] = useState<boolean>(false);
  const [variantesDelProducto, setVariantesDelProducto] = useState<StockVariante[]>([]);
  const [cargandoVariantesProducto, setCargandoVariantesProducto] = useState(false);

  // Configuración de Exportación a Excel
  const [modalExportarAbierto, setModalExportarAbierto] = useState<boolean>(false);
  const [exportConfig, setExportConfig] = useState({
    altoStock: false,
    stockNormal: false,
    bajoStock: true,
    prediccionDemanda: true,
    incluirStockSeguridad: true,
  });

  // Generar sugerencias llamando al microservicio de IA por lote
  const handleGenerarSugerencias = async () => {
    try {
      setProcesandoIA(true);
      setStatusIA('Procesando...');
      setPredicciones({});

      const mesActual = new Date().getMonth() + 1; // 1 a 12

      // Construir la lista de solicitudes a enviar a la IA (usando todas las variantes del catálogo)
      const requests: PrediccionIARequest[] = todasLasVariantes.map((v, i) => ({
        id_producto: v.producto?.idProducto || 1,
        color: v.color?.nombre || 'BLANCO',
        talla: v.talla?.nombreTalla || 'M',
        mes: mesActual,
        es_campana: [2, 3, 7, 12].includes(mesActual) ? 1 : 0,  // Campañas conocidas en Feb, Mar, Jul, Dic
        ventas_mes_pasado: Math.max(15, v.cantidad * 2 + 10 - i), // Simulado dinámicamente para escala mensual
      }));

      const response = await ReporteService.predecirLote(requests);

      if (response && response.resultados) {
        const nuevasPredicciones: Record<string, number> = {};
        response.resultados.forEach((res) => {
          // Buscar la variante correspondiente en todasLasVariantes por idProducto e identificación de variante (color-talla)
          const variant = todasLasVariantes.find(
            (v) => {
              const resVariante = (res.variante || '').trim().toLowerCase();
              const colorNombre = (v.color?.nombre || '').trim().toLowerCase();
              const tallaNombre = (v.talla?.nombreTalla || '').trim().toLowerCase();
              return v.producto?.idProducto === res.id_producto &&
                `${colorNombre}-${tallaNombre}` === resVariante;
            }
          );
          if (variant) {
            const key = variant.idProductoVariante ?? variant.idVariante ?? 0;
            nuevasPredicciones[key] = res.prediccion_ventas;
          }
        });
        setPredicciones(nuevasPredicciones);
        setStatusIA('success');

        // Ordenar todas las variantes por mayor predicción (demanda) descendente
        const variantesOrdenadas = [...todasLasVariantes].sort((a, b) => {
          const keyA = a.idProductoVariante ?? a.idVariante ?? 0;
          const keyB = b.idProductoVariante ?? b.idVariante ?? 0;
          const predA = nuevasPredicciones[keyA] ?? 0;
          const predB = nuevasPredicciones[keyB] ?? 0;
          return predB - predA;
        });

        // Limitar la tabla a mostrar los 20 registros con mayor predicción de demanda
        setVariantes(variantesOrdenadas.slice(0, 20));
        setPaginaIA(1);
        setOrdenDemanda('mayor_demanda');
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

  // Ejecutar predicción automática al entrar a la tab de demanda si hay variantes y no se ha predicho aún
  useEffect(() => {
    if (subTabActiva === 'demanda' && todasLasVariantes.length > 0 && Object.keys(predicciones).length === 0 && !procesandoIA) {
      handleGenerarSugerencias();
    }
  }, [subTabActiva, todasLasVariantes, predicciones, procesandoIA]);

  // Cargar métricas del modelo al activar la subpestaña de demanda
  useEffect(() => {
    if (subTabActiva === 'demanda') {
      const fetchMetricas = async () => {
        try {
          setCargandoMetricas(true);
          setErrorMetricas(null);
          const response = await ReporteService.getMetricasModelo();
          if (response && response.status === 'success') {
            setMae(response.mae);
            setRmse(response.rmse);
            setStockSeguridad(Math.round(response.mae));
          } else {
            setErrorMetricas('No se recibieron métricas válidas.');
          }
        } catch (err: any) {
          console.error('Error al cargar métricas del modelo:', err);
          setErrorMetricas('No se pudieron obtener las métricas de precisión de la IA.');
        } finally {
          setCargandoMetricas(false);
        }
      };
      fetchMetricas();
    }
  }, [subTabActiva]);

  // Simular el progreso en pasos del reentrenamiento del modelo
  useEffect(() => {
    let interval: any;
    if (reentrenando) {
      const ms = modoTrabajoIA === 'optimizar' ? 850 : 500;
      interval = setInterval(() => {
        setProgresoEntrenamiento((prev) => {
          if (prev >= 95) {
            return 95; // No pasar del 95% hasta que la API termine de responder
          }
          const nuevoProgreso = prev + (prev < 30 ? 4 : prev < 70 ? 2 : 1);

          // Actualizar pasos estimados en base al porcentaje de progreso
          if (nuevoProgreso >= 80) {
            setPasoEntrenamiento(4);
          } else if (nuevoProgreso >= 45) {
            setPasoEntrenamiento(3);
          } else if (nuevoProgreso >= 15) {
            setPasoEntrenamiento(2);
          }

          return nuevoProgreso;
        });
      }, ms);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [reentrenando, modoTrabajoIA]);

  const handleReentrenarIA = async () => {
    setModoTrabajoIA('entrenar');
    setModalReentrenarOpen(true);
    try {
      setReentrenando(true);
      setStatusIA('Ejecutando pipeline de reentrenamiento...');
      setProgresoEntrenamiento(0);
      setPasoEntrenamiento(1);

      const response = await ReporteService.entrenarModelo();
      if (response && response.status === 'success') {
        setMae(response.mae);
        setRmse(response.rmse);
        setStockSeguridad(Math.round(response.mae));
        setStatusIA('Modelo reentrenado con éxito');

        // Completar el progreso
        setPasoEntrenamiento(4);
        setProgresoEntrenamiento(100);

        // Disparar predicción automáticamente al terminar de entrenar
        setTimeout(() => {
          handleGenerarSugerencias();
        }, 800);
      } else {
        setStatusIA('Error al reentrenar el modelo');
        setProgresoEntrenamiento(0);
        setPasoEntrenamiento(0);
      }
    } catch (err: any) {
      console.error('Error al reentrenar modelo de IA:', err);
      setStatusIA('Error de Conexión / Permisos');
      setProgresoEntrenamiento(0);
      setPasoEntrenamiento(0);
    } finally {
      setReentrenando(false);
    }
  };

  const handleOptimizarIA = async () => {
    setModoTrabajoIA('optimizar');
    setModalReentrenarOpen(true);
    try {
      setReentrenando(true);
      setStatusIA('Ejecutando pipeline de optimización...');
      setProgresoEntrenamiento(0);
      setPasoEntrenamiento(1);

      const response = await ReporteService.optimizarModelo();
      if (response && response.status === 'success') {
        setMae(response.mae);
        setRmse(response.rmse);
        setStockSeguridad(Math.round(response.mae));
        setStatusIA('Modelo optimizado con éxito');

        // Completar el progreso
        setPasoEntrenamiento(4);
        setProgresoEntrenamiento(100);

        // Disparar predicción automáticamente al terminar de optimizar
        setTimeout(() => {
          handleGenerarSugerencias();
        }, 800);
      } else {
        setStatusIA('Error al optimizar el modelo');
        setProgresoEntrenamiento(0);
        setPasoEntrenamiento(0);
      }
    } catch (err: any) {
      console.error('Error al optimizar modelo de IA:', err);
      setStatusIA('Error de Conexión / Permisos');
      setProgresoEntrenamiento(0);
      setPasoEntrenamiento(0);
    } finally {
      setReentrenando(false);
    }
  };

  // Cargar datos de stock general y variantes
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargandoStock(true);
        setCargandoVariantes(true);
        setErrorStock(null);
        setErrorVariantes(null);

        // Cargar stock general desde el endpoint exclusivo de ADMIN/GERENTE
        const [stockData, variantesData] = await Promise.all([
          ReporteService.getStockGeneral(),
          ProductoVarianteService.obtenerTodasLasVariantes(rolPrincipal, true),
        ]);

        // Guardar stock general (ordenado por nombre)
        const sorted = [...stockData].sort((a, b) => a.nombre.localeCompare(b.nombre));
        setProductos(sorted);

        // Guardar todas las variantes para exportación y predicción
        setTodasLasVariantes(variantesData);
        setVariantes(variantesData.slice(0, 20));

        setPaginaActual(1);
        setPaginaIA(1);
      } catch (err: any) {
        console.error('Error al cargar datos de stock:', err);
        setErrorStock('No se pudieron cargar los datos de inventario.');
        setErrorVariantes('No se pudieron cargar las variantes de los productos.');
      } finally {
        setCargandoStock(false);
        setCargandoVariantes(false);
      }
    };
    cargarDatos();
  }, [rolPrincipal]);





  // Ejecutar exportación de Excel configurada
  const ejecutarExportarExcel = () => {
    const workbook = XLSX.utils.book_new();
    let sheetsAdded = 0;

    // 1. Alto Stock (sobreestock >180)
    if (exportConfig.altoStock && productos.length > 0) {
      const filtered = productos.filter((p) => p.stockTotal > 180);
      const data = filtered.map((p) => ({
        'ID Producto': p.idProducto || 'N/A',
        Producto: p.nombre || 'Desconocido',
        'Código': p.codigoIdentificacion || 'N/A',
        'Categoría': p.categoria || 'General',
        'Stock Total': p.stockTotal,
        'En Almacén': p.stockAlmacen,
        'En Pisos': p.stockPisos,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, ws, 'Alto Stock (>180)');
      sheetsAdded++;
    }

    // 3. Stock Normal (30 - 180)
    if (exportConfig.stockNormal && productos.length > 0) {
      const filtered = productos.filter((p) => p.stockTotal >= 30 && p.stockTotal <= 180);
      const data = filtered.map((p) => ({
        'ID Producto': p.idProducto || 'N/A',
        Producto: p.nombre || 'Desconocido',
        'Código': p.codigoIdentificacion || 'N/A',
        'Categoría': p.categoria || 'General',
        'Stock Total': p.stockTotal,
        'En Almacén': p.stockAlmacen,
        'En Pisos': p.stockPisos,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, ws, 'Stock Normal (30-180)');
      sheetsAdded++;
    }

    // 4. Bajo Stock (<30)
    if (exportConfig.bajoStock && productos.length > 0) {
      const filtered = productos.filter((p) => p.stockTotal < 30);
      const data = filtered.map((p) => ({
        'ID Producto': p.idProducto || 'N/A',
        Producto: p.nombre || 'Desconocido',
        'Código': p.codigoIdentificacion || 'N/A',
        'Categoría': p.categoria || 'General',
        'Stock Total': p.stockTotal,
        'En Almacén': p.stockAlmacen,
        'En Pisos': p.stockPisos,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, ws, 'Bajo Stock (<30)');
      sheetsAdded++;
    }

    // 5. Predicción y Demanda (Variantes)
    if (exportConfig.prediccionDemanda && todasLasVariantes.length > 0) {
      // Ordenar por predicción descendente para que el Excel muestre de mayor a menor demanda
      const variantesOrdenadasExport = [...todasLasVariantes].sort((a, b) => {
        const keyA = a.idProductoVariante ?? a.idVariante ?? 0;
        const keyB = b.idProductoVariante ?? b.idVariante ?? 0;
        const predA = predicciones[keyA] ?? 0;
        const predB = predicciones[keyB] ?? 0;
        return predB - predA;
      });

      const data = variantesOrdenadasExport.map((v, index) => {
        const key = v.idProductoVariante ?? v.idVariante ?? index;
        const pred = predicciones[key];
        const tienePrediccion = pred !== undefined;

        const row: Record<string, any> = {
          Producto: v.producto?.nombre || 'Desconocido',
          Color: v.color?.nombre || 'N/A',
          Talla: v.talla?.nombreTalla || 'N/A',
          'Stock Actual': v.cantidad,
          'Predicción de Venta': tienePrediccion ? pred : '---',
        };

        if (tienePrediccion) {
          row['Stock a Pedir'] = exportConfig.incluirStockSeguridad
            ? Math.max(0, pred + stockSeguridad - v.cantidad)
            : Math.max(0, pred - v.cantidad);
        } else {
          row['Stock a Pedir'] = '---';
        }

        return row;
      });
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, ws, 'Predicción de Demanda');
      sheetsAdded++;
    }

    if (sheetsAdded === 0) {
      alert('Por favor selecciona al menos una opción para exportar.');
      return;
    }

    XLSX.writeFile(workbook, 'Reporte_Inventario_Demanda_IA.xlsx');
    setModalExportarAbierto(false);
  };

  // Preparar datos filtrados y paginados
  const countTodos = productos.length;
  const countSobreestock = productos.filter(p => p.stockTotal > 180).length;
  const countNormal = productos.filter(p => p.stockTotal >= 30 && p.stockTotal <= 180).length;
  const countBajo = productos.filter(p => p.stockTotal < 30).length;

  const productosFiltrados = productos.filter((p) => {
    if (filtroStock === 'sobreestock') return p.stockTotal > 180;
    if (filtroStock === 'normal') return p.stockTotal >= 30 && p.stockTotal <= 180;
    if (filtroStock === 'bajo') return p.stockTotal < 30;
    return true;
  });

  const elementosPorPagina = 8;
  const totalPaginas = Math.ceil(productosFiltrados.length / elementosPorPagina);
  const indexInicio = (paginaActual - 1) * elementosPorPagina;
  const productosPaginados = productosFiltrados.slice(indexInicio, indexInicio + elementosPorPagina);

  // Preparar datos de variantes de la IA ordenados y paginados (máximo 20 registros totales)
  const obtenerVariantesOrdenadasYFiltradas = () => {
    const sorted = [...variantes];
    if (ordenDemanda === 'mayor_demanda') {
      sorted.sort((a, b) => {
        const keyA = a.idProductoVariante ?? a.idVariante ?? 0;
        const keyB = b.idProductoVariante ?? b.idVariante ?? 0;
        const predA = predicciones[keyA] ?? 0;
        const predB = predicciones[keyB] ?? 0;
        return predB - predA;
      });
    } else if (ordenDemanda === 'menor_demanda') {
      sorted.sort((a, b) => {
        const keyA = a.idProductoVariante ?? a.idVariante ?? 0;
        const keyB = b.idProductoVariante ?? b.idVariante ?? 0;
        const predA = predicciones[keyA] ?? 0;
        const predB = predicciones[keyB] ?? 0;
        return predA - predB;
      });
    } else if (ordenDemanda === 'producto') {
      sorted.sort((a, b) => {
        const nameA = a.producto?.nombre || '';
        const nameB = b.producto?.nombre || '';
        return nameA.localeCompare(nameB);
      });
    } else if (ordenDemanda === 'stock') {
      sorted.sort((a, b) => b.cantidad - a.cantidad);
    }
    return sorted;
  };

  const variantesOrdenadas = obtenerVariantesOrdenadasYFiltradas();
  const elementosPorPaginaIA = 10;
  const totalPaginasIA = Math.ceil(variantesOrdenadas.length / elementosPorPaginaIA);
  const indexInicioIA = (paginaIA - 1) * elementosPorPaginaIA;
  const variantesPaginadasIA = variantesOrdenadas.slice(indexInicioIA, indexInicioIA + elementosPorPaginaIA);

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
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${subTabActiva === 'stock'
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
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${subTabActiva === 'demanda'
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
            title="Stock General de Productos"
            subtitle="Niveles de stock consolidado para todos los productos base en el catálogo general"
          />

          {/* Barra de Filtros */}
          <div className="flex flex-wrap gap-2 mb-6 mt-4">
            <button
              type="button"
              onClick={() => {
                setFiltroStock('todos');
                setPaginaActual(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border ${filtroStock === 'todos'
                  ? 'bg-[var(--app-accent)] text-white border-transparent shadow-sm'
                  : 'bg-[var(--app-bg-muted)] text-[var(--app-text-muted)] border-[var(--app-border)] hover:bg-[var(--app-bg-hover)]'
                }`}
            >
              Todos
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${filtroStock === 'todos' ? 'bg-white/20 text-white' : 'bg-[var(--app-border)] text-[var(--app-text-muted)]'
                }`}>
                {countTodos}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFiltroStock('sobreestock');
                setPaginaActual(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border ${filtroStock === 'sobreestock'
                  ? 'bg-emerald-600 text-white border-transparent shadow-sm'
                  : 'bg-[var(--app-bg-muted)] text-[var(--app-text-muted)] border-[var(--app-border)] hover:bg-[var(--app-bg-hover)]'
                }`}
            >
              Sobreestock ({'>'}180)
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${filtroStock === 'sobreestock' ? 'bg-white/20 text-white' : 'bg-[var(--app-border)] text-[var(--app-text-muted)]'
                }`}>
                {countSobreestock}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFiltroStock('normal');
                setPaginaActual(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border ${filtroStock === 'normal'
                  ? 'bg-blue-600 text-white border-transparent shadow-sm'
                  : 'bg-[var(--app-bg-muted)] text-[var(--app-text-muted)] border-[var(--app-border)] hover:bg-[var(--app-bg-hover)]'
                }`}
            >
              Stock Normal (30-180)
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${filtroStock === 'normal' ? 'bg-white/20 text-white' : 'bg-[var(--app-border)] text-[var(--app-text-muted)]'
                }`}>
                {countNormal}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFiltroStock('bajo');
                setPaginaActual(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border ${filtroStock === 'bajo'
                  ? 'bg-red-600 text-white border-transparent shadow-sm'
                  : 'bg-[var(--app-bg-muted)] text-[var(--app-text-muted)] border-[var(--app-border)] hover:bg-[var(--app-bg-hover)]'
                }`}
            >
              Bajo Stock ({'<'}30)
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${filtroStock === 'bajo' ? 'bg-white/20 text-white' : 'bg-[var(--app-border)] text-[var(--app-text-muted)]'
                }`}>
                {countBajo}
              </span>
            </button>
          </div>

          {cargandoStock ? (
            <div className="py-12">
              <TableSkeleton rows={8} columns={5} />
            </div>
          ) : errorStock ? (
            <div className="py-8 text-center text-red-500 font-medium">
              {errorStock}
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="py-8 text-center app-text-muted">
              No se encontraron productos que coincidan con el filtro.
            </div>
          ) : (
            <>
              <div className="mt-5 overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)]">
                <table className="min-w-full divide-y divide-[var(--app-border)]">
                  <thead className="bg-[var(--app-bg-muted)]">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Producto</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black app-text-faint uppercase tracking-wider w-40">Stock Total</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black app-text-faint uppercase tracking-wider w-40">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--app-border)]">
                    {productosPaginados.map((prod, index) => {
                      let stockBadgeBgClass = "bg-emerald-500 text-white";
                      if (prod.stockTotal === 0) {
                        stockBadgeBgClass = "bg-gray-500 text-white";
                      } else if (prod.stockTotal > 180) {
                        stockBadgeBgClass = "bg-blue-500 text-white";
                      } else if (prod.stockTotal < 30) {
                        stockBadgeBgClass = "bg-red-500 text-white";
                      }

                      return (
                        <tr
                          key={prod.idProducto || index}
                          className="hover:bg-[color-mix(in_srgb,var(--app-accent)_4%,transparent)] transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[var(--app-text)]">{prod.nombre}</span>
                              <span className="text-xs text-[var(--app-text-muted)] font-bold uppercase tracking-wider">
                                ({prod.codigoIdentificacion})
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-bold ${stockBadgeBgClass}`}>
                              {prod.stockTotal}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              type="button"
                              onClick={async () => {
                                setSelectedProduct(prod);
                                setModalVariantesOpen(true);
                                setCargandoVariantesProducto(true);
                                try {
                                  const data = await ReporteService.getStockVariantesPorProducto(prod.idProducto);
                                  setVariantesDelProducto(data);
                                } catch (err) {
                                  console.error('Error al cargar variantes del producto:', err);
                                  setVariantesDelProducto([]);
                                } finally {
                                  setCargandoVariantesProducto(false);
                                }
                              }}
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[var(--app-accent)] hover:bg-[color-mix(in_srgb,var(--app-accent)_85%,black)] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-transparent shadow-sm shrink-0"
                            >
                              Ver Variantes
                              <MaterialIcon icon="visibility" className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalPaginas > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--app-border)] pt-4">
                  <p className="text-xs app-text-muted">
                    Mostrando <span className="font-bold text-[var(--app-text)]">{indexInicio + 1}</span> a{' '}
                    <span className="font-bold text-[var(--app-text)]">
                      {Math.min(indexInicio + elementosPorPagina, productosFiltrados.length)}
                    </span>{' '}
                    de <span className="font-bold text-[var(--app-text)]">{productosFiltrados.length}</span> productos
                  </p>

                  <div className="flex items-center gap-1 bg-[var(--app-bg-muted)] p-1 rounded-xl border border-[var(--app-border)]">
                    <button
                      type="button"
                      onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
                      disabled={paginaActual === 1}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)] hover:text-[var(--app-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      <MaterialIcon icon="chevron_left" className="w-4 h-4" />
                      Ant.
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pag) => {
                        const shouldShow =
                          totalPaginas <= 7 ||
                          pag === 1 ||
                          pag === totalPaginas ||
                          Math.abs(pag - paginaActual) <= 1;

                        if (!shouldShow) {
                          const showEllipsis =
                            (pag === 2 && paginaActual > 3) ||
                            (pag === totalPaginas - 1 && paginaActual < totalPaginas - 2);
                          return showEllipsis ? (
                            <span key={`el-${pag}`} className="px-2 text-xs font-mono text-[var(--app-text-muted)]">
                              ...
                            </span>
                          ) : null;
                        }

                        return (
                          <button
                            key={pag}
                            type="button"
                            onClick={() => setPaginaActual(pag)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${paginaActual === pag
                                ? 'bg-[var(--app-accent)] text-white'
                                : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-hover)]'
                              }`}
                          >
                            {pag}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setPaginaActual(prev => Math.min(totalPaginas, prev + 1))}
                      disabled={paginaActual === totalPaginas}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)] hover:text-[var(--app-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      Sig.
                      <MaterialIcon icon="chevron_right" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </DashboardPanel>
      ) : (
        <DashboardPanel className="p-5 sm:p-6">
          <SectionHeader
            title="Predicción de Demanda y Planificación de Compras"
            subtitle="Cálculo dinámico de stock de seguridad y generación de compras sugeridas con Inteligencia Artificial"
          />

          {/* Panel de Métricas de Precisión de la IA (Reales) */}
          {errorMetricas && (
            <div className="p-3 mb-4 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2">
              <MaterialIcon icon="warning" className="w-4 h-4 text-red-500" />
              <span>{errorMetricas}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 mt-6">
            <div className="relative overflow-hidden p-5 rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-muted)] hover:border-[var(--app-accent)] transition-all duration-300 group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full pointer-events-none" />
              <div className="flex items-start gap-4">
                <span className="h-12 w-12 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                  <MaterialIcon icon="center_focus_strong" className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </span>
                <div className="w-full">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[var(--app-text-muted)]">Error Absoluto Medio (MAE)</p>
                  <h3 className="text-3xl font-black mt-1.5 app-heading tracking-tight text-blue-600 dark:text-blue-400">
                    {cargandoMetricas ? (
                      <span className="inline-block animate-pulse w-16 h-8 bg-gray-300 dark:bg-gray-700 rounded" />
                    ) : (
                      <>
                        {mae.toFixed(2)} <span className="text-xs font-normal text-[var(--app-text-muted)]">unidades</span>
                      </>
                    )}
                  </h3>
                  <p className="text-[11px] text-[var(--app-text-muted)] mt-1.5 leading-relaxed">
                    Indica que las predicciones del modelo se desvían, en promedio, {mae.toFixed(2)} unidades del valor real de ventas.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden p-5 rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-muted)] hover:border-[var(--app-accent)] transition-all duration-300 group flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[var(--app-accent)]/10 to-transparent rounded-bl-full pointer-events-none" />
              <div className="flex items-start gap-4">
                <span className="h-12 w-12 rounded-xl bg-[color-mix(in_srgb,var(--app-accent)_12%,transparent)] flex items-center justify-center shrink-0">
                  <MaterialIcon icon="psychology" className="h-6 w-6 text-[var(--app-accent)]" />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[var(--app-text-muted)]">Calibración y Aprendizaje</p>
                  <p className="text-[11px] text-[var(--app-text-muted)] mt-1.5 leading-relaxed">
                    Reajusta las ramas de árboles de decisión en XGBoost utilizando el histórico completo de ventas.
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={handleReentrenarIA}
                  disabled={reentrenando || !esAdmin}
                  className="w-full py-2.5 px-4 rounded-xl bg-[var(--app-accent)] hover:bg-[color-mix(in_srgb,var(--app-accent)_85%,black)] disabled:bg-gray-400 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  <MaterialIcon icon="sync" className={`w-4 h-4 ${reentrenando && modoTrabajoIA === 'entrenar' ? 'animate-spin' : ''}`} />
                  {reentrenando && modoTrabajoIA === 'entrenar' ? 'Entrenando Cerebro...' : 'Reentrenar IA'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalConfirmarOptimizacionOpen(true)}
                  disabled={reentrenando || !esAdmin}
                  className="w-full py-2.5 px-4 rounded-xl border border-[var(--app-accent)] text-[var(--app-accent)] hover:bg-[color-mix(in_srgb,var(--app-accent)_8%,transparent)] disabled:border-gray-400 disabled:text-gray-400 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  <MaterialIcon icon="tune" className={`w-4 h-4 ${reentrenando && modoTrabajoIA === 'optimizar' ? 'animate-spin' : ''}`} />
                  {reentrenando && modoTrabajoIA === 'optimizar' ? 'Optimizando...' : 'Optimización Avanzada'}
                </button>
                {reentrenando && !modalReentrenarOpen && (
                  <button
                    type="button"
                    onClick={() => setModalReentrenarOpen(true)}
                    className="w-full py-2 px-4 rounded-xl border border-[var(--app-accent)] text-[var(--app-accent)] hover:bg-[color-mix(in_srgb,var(--app-accent)_8%,transparent)] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 animate-pulse"
                  >
                    <MaterialIcon icon="visibility" className="w-4 h-4" />
                    Ver Progreso
                  </button>
                )}
                {!esAdmin && (
                  <p className="text-[9px] text-red-500 dark:text-red-400 mt-1.5 text-center font-bold uppercase tracking-wider">
                    * Solo administradores pueden configurar la IA
                  </p>
                )}
              </div>
            </div>
          </div>

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
              {/* Barra de Herramientas y Acciones de la IA */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 p-4 bg-[var(--app-bg-muted)] border border-[var(--app-border)] rounded-2xl">

                {/* Ajuste de Stock de Seguridad */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--app-text-muted)]">
                      Ajuste Stock Seguridad (0 - 30)
                    </span>
                    <div className="flex items-center gap-3 mt-1.5">
                      <input
                        type="range"
                        min="0"
                        max="30"
                        value={stockSeguridad}
                        onChange={(e) => setStockSeguridad(Number(e.target.value))}
                        className="w-36 sm:w-48 accent-[var(--app-accent)]"
                      />
                      <span className="flex items-center justify-center bg-[color-mix(in_srgb,var(--app-accent)_8%,transparent)] text-xs font-black w-8 h-8 rounded-lg text-[var(--app-accent)] shrink-0">
                        {stockSeguridad}
                      </span>
                    </div>
                  </div>

                  {/* Separador vertical visible en MD+ */}
                  <div className="hidden md:block h-8 w-px bg-[var(--app-border)] mx-2" />

                  {/* Estado del Microservicio / IA */}
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--app-text-muted)]">
                      Estado IA
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${statusIA.toLowerCase().includes('success') || statusIA.toLowerCase().includes('éxito')
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : statusIA.toLowerCase().includes('error') || statusIA.toLowerCase().includes('conexión') || statusIA.toLowerCase().includes('permisos')
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : statusIA.toLowerCase().includes('procesando') || statusIA.toLowerCase().includes('entrenando') || statusIA.toLowerCase().includes('ejecutando')
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusIA.toLowerCase().includes('success') || statusIA.toLowerCase().includes('éxito')
                            ? 'bg-emerald-500'
                            : statusIA.toLowerCase().includes('error') || statusIA.toLowerCase().includes('conexión') || statusIA.toLowerCase().includes('permisos')
                              ? 'bg-red-500'
                              : statusIA.toLowerCase().includes('procesando') || statusIA.toLowerCase().includes('entrenando') || statusIA.toLowerCase().includes('ejecutando')
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                          }`} />
                        {statusIA === 'success' || statusIA === 'Esperando IA' ? 'Modelo Listo' : statusIA}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones principales: Exportar y Predicción */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setModalExportarAbierto(true)}
                    disabled={variantes.length === 0}
                    className="px-4 py-2.5 rounded-xl border border-[var(--app-border)] hover:bg-[var(--app-bg-hover)] text-[var(--app-text)] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                  >
                    <MaterialIcon icon="download" className="w-4 h-4 text-[var(--app-text-muted)]" />
                    Exportar Excel
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerarSugerencias}
                    disabled={procesandoIA || variantes.length === 0}
                    className="px-5 py-2.5 rounded-xl bg-[var(--app-accent)] hover:bg-[color-mix(in_srgb,var(--app-accent)_85%,black)] text-white font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-[color-mix(in_srgb,var(--app-accent)_15%,transparent)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <MaterialIcon icon="psychology" className="w-4 h-4" />
                    {procesandoIA ? 'Calculando...' : 'Realizar Predicción IA'}
                  </button>
                </div>
              </div>

              {/* Filtro de Ordenamiento e Información de la Tabla */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 mt-2">
                {/* Selector de ordenamiento */}
                <div className="flex items-center gap-2">
                  <label htmlFor="ordenDemanda" className="text-xs font-bold text-[var(--app-text-muted)] uppercase shrink-0">
                    Ordenar por:
                  </label>
                  <select
                    id="ordenDemanda"
                    value={ordenDemanda}
                    onChange={(e) => {
                      setOrdenDemanda(e.target.value as any);
                      setPaginaIA(1);
                    }}
                    className="bg-[var(--app-bg-muted)] border border-[var(--app-border)] text-xs text-[var(--app-text)] font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--app-accent)] cursor-pointer hover:bg-[var(--app-bg-hover)] transition-all"
                  >
                    <option value="mayor_demanda">Mayor Demanda (IA)</option>
                    <option value="menor_demanda">Menor Demanda (IA)</option>
                    <option value="producto">Nombre del Producto</option>
                    <option value="stock">Stock Actual</option>
                  </select>
                </div>

                {/* Mensaje Informativo */}
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl text-[11px] text-blue-700 dark:text-blue-400 font-bold max-w-xl">
                  <MaterialIcon icon="info" className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Se muestran solo los 20 registros de mayor demanda. Si desea ver más, descargue el Excel.</span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[var(--app-border)]">
                <table className="min-w-full divide-y divide-[var(--app-border)]">
                  <thead className="bg-[var(--app-bg-muted)]">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Producto</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Variante</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Stock Actual</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">
                        <div className="flex items-center gap-1.5 reports-tooltip-trigger">
                          <span>Predicción IA</span>
                          <MaterialIcon icon="help_outline" className="w-3.5 h-3.5 text-gray-400 hover:text-[var(--app-accent)]" />
                          <span className="reports-tooltip-content">
                            Es la predicción de ventas para el siguiente mes y lo que se recomienda comprar.
                          </span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">
                        <div className="flex items-center gap-1.5 reports-tooltip-trigger">
                          <span>Stock Seg.</span>
                          <MaterialIcon icon="help_outline" className="w-3.5 h-3.5 text-gray-400 hover:text-[var(--app-accent)]" />
                          <span className="reports-tooltip-content">
                            Este stock sirve para subsanar o mitigar el posible margen de error del modelo de predicción.
                          </span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">
                        <div className="flex items-center gap-1.5 reports-tooltip-trigger">
                          <span>A Comprar</span>
                          <MaterialIcon icon="help_outline" className="w-3.5 h-3.5 text-gray-400 hover:text-[var(--app-accent)]" />
                          <span className="reports-tooltip-content reports-tooltip-content--right">
                            Es el total que se recomienda comprar considerando el stock actual, más la predicción IA y el stock de seguridad.
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--app-border)] bg-[var(--app-bg)]">
                    {variantesPaginadasIA.map((v, index) => {
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
                            {pred !== undefined ? `${pred} ± ${Math.round(mae)}` : '---'}
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

              {/* Paginación IA */}
              {totalPaginasIA > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--app-border)] pt-4">
                  <p className="text-xs app-text-muted">
                    Mostrando <span className="font-bold text-[var(--app-text)]">{indexInicioIA + 1}</span> a{' '}
                    <span className="font-bold text-[var(--app-text)]">
                      {Math.min(indexInicioIA + elementosPorPaginaIA, variantesOrdenadas.length)}
                    </span>{' '}
                    de <span className="font-bold text-[var(--app-text)]">{variantesOrdenadas.length}</span> variantes
                  </p>

                  <div className="flex items-center gap-1 bg-[var(--app-bg-muted)] p-1 rounded-xl border border-[var(--app-border)]">
                    <button
                      type="button"
                      onClick={() => setPaginaIA(prev => Math.max(1, prev - 1))}
                      disabled={paginaIA === 1}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)] hover:text-[var(--app-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      <MaterialIcon icon="chevron_left" className="w-4 h-4" />
                      Ant.
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPaginasIA }, (_, i) => i + 1).map((pag) => {
                        const shouldShow =
                          totalPaginasIA <= 7 ||
                          pag === 1 ||
                          pag === totalPaginasIA ||
                          Math.abs(pag - paginaIA) <= 1;

                        if (!shouldShow) {
                          const showEllipsis =
                            (pag === 2 && paginaIA > 3) ||
                            (pag === totalPaginasIA - 1 && paginaIA < totalPaginasIA - 2);
                          return showEllipsis ? (
                            <span key={`el-${pag}`} className="px-2 text-xs font-mono text-[var(--app-text-muted)]">
                              ...
                            </span>
                          ) : null;
                        }

                        return (
                          <button
                            key={pag}
                            type="button"
                            onClick={() => setPaginaIA(pag)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${paginaIA === pag
                                ? 'bg-[var(--app-accent)] text-white'
                                : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-hover)]'
                              }`}
                          >
                            {pag}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setPaginaIA(prev => Math.min(totalPaginasIA, prev + 1))}
                      disabled={paginaIA === totalPaginasIA}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)] hover:text-[var(--app-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      Sig.
                      <MaterialIcon icon="chevron_right" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DashboardPanel>
      )}

      {/* Modal de Configuración de Exportación */}
      <AppModal
        open={modalExportarAbierto}
        onClose={() => setModalExportarAbierto(false)}
        title="Configuración de Exportación a Excel"
        subtitle="Selecciona las hojas de datos que deseas incluir en el archivo excel"
        icon={<MaterialIcon icon="download" />}
        maxWidth="2xl"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalExportarAbierto(false)}
              className="px-4 py-2.5 rounded-xl border border-[var(--app-border)] hover:bg-[var(--app-bg-hover)] text-[var(--app-text)] font-bold text-xs uppercase tracking-wider transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={ejecutarExportarExcel}
              className="px-5 py-2.5 rounded-xl bg-[var(--app-accent)] hover:bg-[color-mix(in_srgb,var(--app-accent)_85%,black)] text-white font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-[color-mix(in_srgb,var(--app-accent)_15%,transparent)]"
            >
              Exportar Excel
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Opciones de Selección */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--app-text-muted)] mb-3">
              Seleccionar Hojas de Datos
            </h4>

            {/* Alto Stock */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-[var(--app-border)] hover:bg-[var(--app-bg-hover)] cursor-pointer transition-all select-none">
              <input
                type="checkbox"
                checked={exportConfig.altoStock}
                onChange={(e) => setExportConfig(prev => ({ ...prev, altoStock: e.target.checked }))}
                className="mt-1 accent-[var(--app-accent)] h-4 w-4"
              />
              <div>
                <span className="text-sm font-bold text-[var(--app-text)] block text-left">Alto Stock (Sobrestock)</span>
                <span className="text-xs text-[var(--app-text-muted)] block mt-0.5 leading-relaxed text-left">
                  Exporta productos base con stock mayor a 180 unidades (excluye variantes).
                </span>
              </div>
            </label>

            {/* Stock Normal */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-[var(--app-border)] hover:bg-[var(--app-bg-hover)] cursor-pointer transition-all select-none">
              <input
                type="checkbox"
                checked={exportConfig.stockNormal}
                onChange={(e) => setExportConfig(prev => ({ ...prev, stockNormal: e.target.checked }))}
                className="mt-1 accent-[var(--app-accent)] h-4 w-4"
              />
              <div>
                <span className="text-sm font-bold text-[var(--app-text)] block text-left">Stock Normal (Adecuado)</span>
                <span className="text-xs text-[var(--app-text-muted)] block mt-0.5 leading-relaxed text-left">
                  Exporta productos base con stock entre 30 y 180 unidades.
                </span>
              </div>
            </label>

            {/* Bajo Stock */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-[var(--app-border)] hover:bg-[var(--app-bg-hover)] cursor-pointer transition-all select-none">
              <input
                type="checkbox"
                checked={exportConfig.bajoStock}
                onChange={(e) => setExportConfig(prev => ({ ...prev, bajoStock: e.target.checked }))}
                className="mt-1 accent-[var(--app-accent)] h-4 w-4"
              />
              <div>
                <span className="text-sm font-bold text-[var(--app-text)] block text-left">Bajo Stock (Crítico)</span>
                <span className="text-xs text-[var(--app-text-muted)] block mt-0.5 leading-relaxed text-left">
                  Exporta productos base con stock menor a 30 unidades.
                </span>
              </div>
            </label>

            {/* Predicción y Demanda */}
            <div className="p-3 rounded-xl border border-[var(--app-border)] space-y-3">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={exportConfig.prediccionDemanda}
                  onChange={(e) => setExportConfig(prev => ({ ...prev, prediccionDemanda: e.target.checked }))}
                  className="mt-1 accent-[var(--app-accent)] h-4 w-4"
                />
                <div>
                  <span className="text-sm font-bold text-[var(--app-text)] block text-left">Predicción de Demanda e IA</span>
                  <span className="text-xs text-[var(--app-text-muted)] block mt-0.5 leading-relaxed text-left">
                    Exporta las variantes de productos con sus predicciones de IA y recomendaciones de compra.
                  </span>
                </div>
              </label>

              {exportConfig.prediccionDemanda && (
                <div className="ml-7 pt-2.5 border-t border-[var(--app-border)]">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={exportConfig.incluirStockSeguridad}
                      onChange={(e) => setExportConfig(prev => ({ ...prev, incluirStockSeguridad: e.target.checked }))}
                      className="accent-[var(--app-accent)] h-3.5 w-3.5"
                    />
                    <span className="text-xs font-semibold text-[var(--app-text)] text-left">
                      Incluir Stock de Seguridad en el cálculo
                    </span>
                  </label>
                  <p className="text-[10px] text-[var(--app-text-muted)] mt-1 text-left">
                    Si se desmarca, la sugerencia de compra se basará únicamente en la predicción directa de la IA.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Vista Previa de Estructura de Excel */}
          <div className="flex flex-col justify-between p-5 rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-muted)]">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-[var(--app-accent)] mb-3 flex items-center gap-1.5">
                <MaterialIcon icon="visibility" className="w-4.5 h-4.5" />
                Estructura del Archivo Generado
              </h4>
              <p className="text-xs text-[var(--app-text-muted)] mb-4 leading-relaxed text-left">
                A continuación se muestra el esquema de las pestañas que se inyectarán en tu libro de Excel según tu selección activa:
              </p>

              <div className="space-y-2.5">
                {exportConfig.altoStock && (
                  <div className="flex items-center justify-between text-xs p-2.5 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl">
                    <span className="flex items-center gap-2 text-[var(--app-text)] font-semibold">
                      <MaterialIcon icon="table_chart" className="w-4 h-4 text-emerald-500" />
                      Pestaña: Alto Stock
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[color-mix(in_srgb,var(--app-accent)_8%,transparent)] text-[var(--app-accent)] font-mono text-[10px] font-bold">
                      {productos.filter(p => p.stockTotal > 180).length} productos
                    </span>
                  </div>
                )}

                {exportConfig.stockNormal && (
                  <div className="flex items-center justify-between text-xs p-2.5 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl">
                    <span className="flex items-center gap-2 text-[var(--app-text)] font-semibold">
                      <MaterialIcon icon="table_chart" className="w-4 h-4 text-indigo-500" />
                      Pestaña: Stock Normal
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[color-mix(in_srgb,var(--app-accent)_8%,transparent)] text-[var(--app-accent)] font-mono text-[10px] font-bold">
                      {productos.filter(p => p.stockTotal >= 30 && p.stockTotal <= 180).length} productos
                    </span>
                  </div>
                )}

                {exportConfig.bajoStock && (
                  <div className="flex items-center justify-between text-xs p-2.5 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl">
                    <span className="flex items-center gap-2 text-[var(--app-text)] font-semibold">
                      <MaterialIcon icon="table_chart" className="w-4 h-4 text-red-500" />
                      Pestaña: Bajo Stock
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[color-mix(in_srgb,var(--app-accent)_8%,transparent)] text-[var(--app-accent)] font-mono text-[10px] font-bold">
                      {productos.filter(p => p.stockTotal < 30).length} productos
                    </span>
                  </div>
                )}

                {exportConfig.prediccionDemanda && (
                  <div className="flex items-center justify-between text-xs p-2.5 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl">
                    <span className="flex items-center gap-2 text-[var(--app-text)] font-semibold">
                      <MaterialIcon icon="table_chart" className="w-4 h-4 text-amber-500" />
                      Pestaña: Predicción de Demanda
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[color-mix(in_srgb,var(--app-accent)_8%,transparent)] text-[var(--app-accent)] font-mono text-[10px] font-bold">
                      {todasLasVariantes.length} variantes
                    </span>
                  </div>
                )}

                {!exportConfig.altoStock &&
                  !exportConfig.stockNormal &&
                  !exportConfig.bajoStock &&
                  !exportConfig.prediccionDemanda && (
                    <div className="p-4 rounded-xl border border-dashed border-red-300 bg-red-50/50 dark:bg-red-950/10 text-center text-xs text-red-500 font-semibold italic">
                      Debes seleccionar al menos una hoja para poder generar el Excel.
                    </div>
                  )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--app-border)] text-[10px] text-[var(--app-text-muted)] leading-relaxed flex items-start gap-1.5 text-left">
              <MaterialIcon icon="info" className="w-3.5 h-3.5 shrink-0 text-[var(--app-accent)]" />
              <span>
                El formato de archivo generado será `xlsx` compatible con Microsoft Excel, Google Sheets y Numbers. Las columnas se formatean automáticamente para mejor legibilidad.
              </span>
            </div>
          </div>

        </div>
      </AppModal>

      {/* Modal de Detalle de Variantes de un Producto */}
      <AppModal
        open={modalVariantesOpen}
        onClose={() => setModalVariantesOpen(false)}
        title="VARIANTES DEL PRODUCTO"
        subtitle={selectedProduct?.nombre || ''}
        icon={<MaterialIcon icon="visibility" />}
        maxWidth="3xl"
        belowHeader={
          <div className="px-8 pb-3 pt-2 flex items-center justify-between border-b border-[var(--app-border)]">
            <span className="text-xs text-[var(--app-text-muted)] font-medium">Desglose de stock por color y talla</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--app-bg-muted)] text-[var(--app-text)] font-black text-[10px] uppercase tracking-wider border border-[var(--app-border)]">
              <MaterialIcon icon="local_mall" className="w-3.5 h-3.5 text-[var(--app-accent)]" />
              STOCK TOTAL: {selectedProduct?.stockTotal || 0}
            </span>
          </div>
        }
      >
        <div className="p-4">
          <div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)]">
            <table className="min-w-full divide-y divide-[var(--app-border)]">
              <thead className="bg-[var(--app-bg-muted)]">
                <tr>
                  <th className="px-10 py-5 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Color</th>
                  <th className="px-10 py-5 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Talla</th>
                  <th className="px-10 py-5 text-right text-[10px] font-black app-text-faint uppercase tracking-wider">Stock Total</th>
                  <th className="px-10 py-5 text-right text-[10px] font-black app-text-faint uppercase tracking-wider">En Almacén</th>
                  <th className="px-10 py-5 text-right text-[10px] font-black app-text-faint uppercase tracking-wider">En Pisos de Venta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--app-border)]">
                {cargandoVariantesProducto ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-8 text-center app-text-muted">
                      <div className="flex items-center justify-center gap-2">
                        <MaterialIcon icon="hourglass_top" className="w-4 h-4 animate-spin" />
                        Cargando variantes...
                      </div>
                    </td>
                  </tr>
                ) : variantesDelProducto.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-8 text-center app-text-muted">
                      No se encontraron variantes para este producto.
                    </td>
                  </tr>
                ) : (
                  variantesDelProducto.map((v, idx) => (
                    <tr key={v.idVariante ?? idx} className="hover:bg-[color-mix(in_srgb,var(--app-accent)_4%,transparent)] transition-colors">
                      <td className="px-10 py-5 whitespace-nowrap text-sm font-bold text-[var(--app-text)]">{v.color || 'N/A'}</td>
                      <td className="px-10 py-5 whitespace-nowrap text-sm font-semibold text-[var(--app-text-muted)]">{v.talla || 'N/A'}</td>
                      <td className="px-10 py-5 whitespace-nowrap text-right text-sm font-bold text-[var(--app-text)]">
                        {v.stockTotal}
                      </td>
                      <td className="px-10 py-5 whitespace-nowrap text-right text-sm font-semibold text-[var(--app-text)]">
                        {v.stockAlmacen}
                      </td>
                      <td className="px-10 py-5 whitespace-nowrap text-right text-sm font-semibold text-[var(--app-text)]">
                        {v.stockPisos}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AppModal>

      {/* Modal de Confirmación de Optimización Avanzada */}
      <AppModal
        open={modalConfirmarOptimizacionOpen}
        onClose={() => setModalConfirmarOptimizacionOpen(false)}
        title="¿CONFIRMAR OPTIMIZACIÓN AVANZADA?"
        subtitle="Esta es una operación de alta carga para el servidor de IA"
        icon={<MaterialIcon icon="warning" className="text-amber-500 animate-bounce" />}
        maxWidth="2xl"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalConfirmarOptimizacionOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-[var(--app-border)] hover:bg-[var(--app-bg-hover)] text-[var(--app-text)] font-bold text-xs uppercase tracking-wider transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                setModalConfirmarOptimizacionOpen(false);
                handleOptimizarIA();
              }}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-widest transition-all shadow-md"
            >
              Iniciar Optimización
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-left">
          <p className="text-sm text-[var(--app-text)] leading-relaxed">
            La búsqueda avanzada de hiperparámetros evalúa decenas de configuraciones del algoritmo XGBoost para encontrar la combinación que minimice el error de predicción.
          </p>

          <div className="p-4 rounded-2xl bg-[color-mix(in_srgb,var(--app-accent)_6%,transparent)] border border-[color-mix(in_srgb,var(--app-accent)_20%,transparent)] space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--app-accent)] flex items-center gap-1.5">
              <MaterialIcon icon="info" className="w-4.5 h-4.5" />
              Recomendaciones de MLOps:
            </h4>
            <ul className="list-disc pl-5 text-xs text-[var(--app-text-muted)] space-y-2 leading-relaxed">
              <li>
                <strong>Frecuencia recomendada:</strong> Ejecutar esta operación únicamente cada cierto tiempo (ej: cada 3 a 6 meses) o cuando notes que el error promedio (MAE) de las predicciones suba demasiado.
              </li>
              <li>
                <strong>Consumo de recursos:</strong> Este proceso realiza validación cruzada y entrena la IA decenas de veces consecutivas, elevando significativamente el uso del procesador (CPU) del servidor.
              </li>
              <li>
                <strong>Horario sugerido:</strong> Se recomienda encarecidamente ejecutarlo durante horas de baja demanda del sistema o fuera del horario comercial para no ralentizar otras operaciones críticas de venta.
              </li>
            </ul>
          </div>
        </div>
      </AppModal>

      {/* Modal de Progreso del Reentrenamiento o Optimización */}
      <AppModal
        open={modalReentrenarOpen}
        onClose={() => {
          setModalReentrenarOpen(false);
          if (!reentrenando) {
            setProgresoEntrenamiento(0);
            setPasoEntrenamiento(0);
          }
        }}
        title={modoTrabajoIA === 'optimizar' ? "OPTIMIZACIÓN DE IA (HIPERPARÁMETROS)" : "REENTRENAMIENTO DEL MODELO IA"}
        subtitle={modoTrabajoIA === 'optimizar' ? "Buscando la configuración óptima para minimizar el error de predicción" : "Procesando el histórico de ventas y calibrando el cerebro predictivo"}
        icon={<MaterialIcon icon={modoTrabajoIA === 'optimizar' ? "tune" : "psychology"} className="animate-pulse text-[var(--app-accent)]" />}
        maxWidth="md"
        disableAnimation
        zIndex={1000}
      >
        <div className="p-6 space-y-6 text-center">
          {/* Círculo con porcentaje */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="relative flex items-center justify-center w-24 h-24 rounded-full border-4 border-[var(--app-border)] bg-[var(--app-bg-muted)] overflow-hidden">
              <span className="text-2xl font-black text-[var(--app-text)] tabular-nums">
                {progresoEntrenamiento}%
              </span>
              <div
                className="absolute bottom-0 left-0 right-0 bg-[var(--app-accent)] opacity-10 transition-all duration-500"
                style={{ height: `${progresoEntrenamiento}%` }}
              />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--app-accent)] animate-pulse">
              {reentrenando ? (modoTrabajoIA === 'optimizar' ? 'Buscando parámetros...' : 'Analizando datos...') : '¡Completado!'}
            </p>
          </div>

          {/* Barra de progreso horizontal */}
          <div className="w-full bg-[var(--app-border)] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[var(--app-accent)] h-full transition-all duration-500 rounded-full"
              style={{ width: `${progresoEntrenamiento}%` }}
            />
          </div>

          {/* Stepper / Lista de pasos */}
          <div className="text-left space-y-3.5 bg-[var(--app-bg-muted)] p-4 rounded-2xl border border-[var(--app-border)]">
            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--app-text-muted)] mb-1">
              Pasos del Pipeline MLOps
            </h4>

            {/* Paso 1 */}
            <div className="flex items-center gap-3 text-xs">
              <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold ${pasoEntrenamiento > 1 || progresoEntrenamiento === 100
                  ? 'bg-emerald-500 text-white'
                  : pasoEntrenamiento === 1
                    ? 'bg-[var(--app-accent)] text-white animate-pulse'
                    : 'bg-[var(--app-border)] text-[var(--app-text-muted)]'
                }`}>
                {pasoEntrenamiento > 1 || progresoEntrenamiento === 100 ? (
                  <MaterialIcon icon="check" className="w-4 h-4" />
                ) : '1'}
              </span>
              <span className={pasoEntrenamiento >= 1 ? 'font-bold text-[var(--app-text)]' : 'text-[var(--app-text-muted)]'}>
                Exportando histórico de ventas (Generando CSV)
              </span>
            </div>

            {/* Paso 2 */}
            <div className="flex items-center gap-3 text-xs">
              <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold ${pasoEntrenamiento > 2 || progresoEntrenamiento === 100
                  ? 'bg-emerald-500 text-white'
                  : pasoEntrenamiento === 2
                    ? 'bg-[var(--app-accent)] text-white animate-pulse'
                    : 'bg-[var(--app-border)] text-[var(--app-text-muted)]'
                }`}>
                {pasoEntrenamiento > 2 || progresoEntrenamiento === 100 ? (
                  <MaterialIcon icon="check" className="w-4 h-4" />
                ) : '2'}
              </span>
              <span className={pasoEntrenamiento >= 2 ? 'font-bold text-[var(--app-text)]' : 'text-[var(--app-text-muted)]'}>
                {modoTrabajoIA === 'optimizar'
                  ? 'Preparación de datos y búsqueda óptima (RandomizedSearchCV - 20s)'
                  : 'Preparación de datos e inyección de campañas comerciales'}
              </span>
            </div>

            {/* Paso 3 */}
            <div className="flex items-center gap-3 text-xs">
              <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold ${pasoEntrenamiento > 3 || progresoEntrenamiento === 100
                  ? 'bg-emerald-500 text-white'
                  : pasoEntrenamiento === 3
                    ? 'bg-[var(--app-accent)] text-white animate-pulse'
                    : 'bg-[var(--app-border)] text-[var(--app-text-muted)]'
                }`}>
                {pasoEntrenamiento > 3 || progresoEntrenamiento === 100 ? (
                  <MaterialIcon icon="check" className="w-4 h-4" />
                ) : '3'}
              </span>
              <span className={pasoEntrenamiento >= 3 ? 'font-bold text-[var(--app-text)]' : 'text-[var(--app-text-muted)]'}>
                {modoTrabajoIA === 'optimizar'
                  ? 'Entrenamiento del modelo final con parámetros óptimos'
                  : 'Entrenamiento del modelo XGBoost (300 estimadores)'}
              </span>
            </div>

            {/* Paso 4 */}
            <div className="flex items-center gap-3 text-xs">
              <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold ${progresoEntrenamiento === 100
                  ? 'bg-emerald-500 text-white'
                  : pasoEntrenamiento === 4
                    ? 'bg-[var(--app-accent)] text-white animate-pulse'
                    : 'bg-[var(--app-border)] text-[var(--app-text-muted)]'
                }`}>
                {progresoEntrenamiento === 100 ? (
                  <MaterialIcon icon="check" className="w-4 h-4" />
                ) : '4'}
              </span>
              <span className={pasoEntrenamiento >= 4 ? 'font-bold text-[var(--app-text)]' : 'text-[var(--app-text-muted)]'}>
                {modoTrabajoIA === 'optimizar'
                  ? 'Guardado de mejores parámetros, métricas y recarga en RAM activa'
                  : 'Guardado de métricas y recarga en RAM activa'}
              </span>
            </div>
          </div>

          {/* Banner Informativo */}
          <div className="p-3 text-left bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-2xl flex gap-2.5 items-start">
            <MaterialIcon icon="info" className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-blue-700 dark:text-blue-400 leading-normal">
              <strong>Nota:</strong> El proceso se ejecuta en segundo plano. Puede cerrar esta ventana y seguir navegando por el sistema.
            </p>
          </div>

          {/* Botón de Cierre (solo cuando no está entrenando) */}
          {!reentrenando && (
            <button
              type="button"
              onClick={() => {
                setModalReentrenarOpen(false);
                setProgresoEntrenamiento(0);
                setPasoEntrenamiento(0);
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md"
            >
              Entendido y Cerrar
            </button>
          )}
        </div>
      </AppModal>
    </div>
  );
};

export default PrediccionVentas;

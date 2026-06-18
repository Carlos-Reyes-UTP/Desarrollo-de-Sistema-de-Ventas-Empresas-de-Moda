import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlmacenService } from "@/services/AlmacenService";
import type { UbicacionArea, StockUbicacion } from "@/types/Almacen";
import { useAccesoAreaAlmacen } from "@/hooks/useAccesoAreaAlmacen";
import MoverMercaderiaModal from "./MoverMercaderiaModal";
import { ListItemSkeleton, TableSkeleton, PageHeader, PageActionButton, PageActionGroup, SectionHeader, MaterialIcon, ModalPortal } from "@/shared/ui";

interface AreaConStock {
  ubicacion: UbicacionArea;
  totalUnidades: number;
  totalVariantes: number;
  stock: StockUbicacion[];
}

interface GestionPisosProps {
  embedded?: boolean;
  /** Si false, solo consulta pisos/áreas/stock (sin traslados). */
  puedeTrasladar?: boolean;
  variant?: "almacen" | "gerente";
  /** Incrementar para recargar datos (p. ej. tras evento WebSocket). */
  refreshKey?: number;
}

type DotEstado = {
  colorClass: string;
  label: string;
  badgeClass: string;
};

const obtenerDotEstado = (areaName: string | null, ubiName: string, units: number): DotEstado => {
  const areaLower = (areaName || "").toLowerCase();
  const ubiLower = (ubiName || "").toLowerCase();

  const esPisoVenta =
    areaLower.includes("venta") ||
    areaLower.includes("damas") ||
    areaLower.includes("caballeros") ||
    areaLower.includes("exhibi") ||
    areaLower.includes("showroom") ||
    areaLower.includes("piso") ||
    ubiLower.includes("venta") ||
    ubiLower.includes("damas") ||
    ubiLower.includes("caballeros") ||
    ubiLower.includes("exhibi") ||
    ubiLower.includes("showroom") ||
    ubiLower.includes("piso");

  if (esPisoVenta) {
    return {
      colorClass: "bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]",
      label: "Exhibición / Venta",
      badgeClass: "bg-violet-50 text-violet-700",
    };
  }
  if (units >= 150) {
    return {
      colorClass: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse",
      label: "Lleno",
      badgeClass: "bg-amber-50 text-amber-700",
    };
  }
  return {
    colorClass: "bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.5)]",
    label: "Óptimo",
    badgeClass: "bg-[var(--app-bg-muted)] text-[var(--app-text-muted)]",
  };
};

const AreaOperativaCard = ({
  ubicacion,
  totalUnidades,
  totalVariantes,
  dot,
  onVer,
  puedeTrasladar = true,
  etiquetasGerente = false,
  index = 0,
}: {
  ubicacion: UbicacionArea;
  totalUnidades: number;
  totalVariantes: number;
  dot: DotEstado;
  onVer: () => void;
  puedeTrasladar?: boolean;
  etiquetasGerente?: boolean;
  index?: number;
}) => (
  <button
    type="button"
    onClick={onVer}
    className="animate-stagger-item w-full text-left rounded-2xl border app-card bg-[var(--app-surface)] p-4 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200 touch-manipulation"
    style={{ animationDelay: `${index * 60}ms` }}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold app-heading truncate">
          {etiquetasGerente
            ? `Sector: ${ubicacion.area ?? "—"}`
            : (ubicacion.area ?? "Sin área específica")}
        </p>
        <p className="text-xs app-text-muted mt-0.5 font-medium truncate">
          {etiquetasGerente ? `Piso: ${ubicacion.nombre}` : ubicacion.nombre}
        </p>
      </div>
      <span
        className={`inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${dot.badgeClass}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dot.colorClass}`} />
        {dot.label}
      </span>
    </div>
    <div className="mt-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest app-text-faint">Capacidad</p>
        <p className="text-sm font-semibold app-heading mt-0.5">
          {totalUnidades}{" "}
          <span className="text-[10px] app-text-faint uppercase">/ {totalVariantes} vars.</span>
        </p>
      </div>
      <span className={`inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
        puedeTrasladar
          ? "bg-[var(--app-accent)] text-[var(--app-accent-fg)]"
          : "bg-[var(--app-bg-muted)] app-text-muted"
      }`}>
        Ver detalles
        <MaterialIcon icon="arrow_forward" className="h-3.5 w-3.5" />
      </span>
    </div>
  </button>
);

const GestionPisos = ({
  embedded = false,
  puedeTrasladar = true,
  variant = "almacen",
  refreshKey = 0,
}: GestionPisosProps) => {
  const etiquetasGerente = variant === "gerente";
  const { acceso: accesoAreaAlmacen } = useAccesoAreaAlmacen(true);
  const esAlmaceneroRestringido = Boolean(accesoAreaAlmacen?.restriccionTrasladoMismaAreaCatalogo);
  const nombreAreaAsignada = useMemo(() => {
    if (!esAlmaceneroRestringido || !accesoAreaAlmacen?.destinosTraslado?.length) {
      return null;
    }
    const conArea = accesoAreaAlmacen.destinosTraslado.find((u) => u.area);
    return conArea?.area ?? null;
  }, [esAlmaceneroRestringido, accesoAreaAlmacen?.destinosTraslado]);

  const [pisos, setPisos] = useState<string[]>([]);
  const [pisoSeleccionado, setPisoSeleccionado] = useState<string | null>(null);
  const [areas, setAreas] = useState<AreaConStock[]>([]);
  const [cargandoPisos, setCargandoPisos] = useState(false);
  const [cargandoAreas, setCargandoAreas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Nuevos estados para el detalle del área
  const [areaDetalle, setAreaDetalle] = useState<UbicacionArea | null>(null);
  const [stockDetalle, setStockDetalle] = useState<StockUbicacion[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [productoModal, setProductoModal] = useState<{ nombre: string; variantes: StockUbicacion[] } | null>(null);

  /** Fila "Mover mercadería": el listado de productos es solo el stock de esta ubicación. */
  const [origenAreaModal, setOrigenAreaModal] = useState<UbicacionArea | null>(null);
  const [trasladoGlobalAbierto, setTrasladoGlobalAbierto] = useState(false);
  const modalAbiertoRef = useRef(false);
  modalAbiertoRef.current = trasladoGlobalAbierto || origenAreaModal !== null;

  const filtrarAreasPorSector = useCallback(
    (items: AreaConStock[]) => {
      if (!esAlmaceneroRestringido || !nombreAreaAsignada) {
        return items;
      }
      return items.filter(
        (a) => a.ubicacion.area?.toLowerCase() === nombreAreaAsignada.toLowerCase()
      );
    },
    [esAlmaceneroRestringido, nombreAreaAsignada]
  );

  const cargarPisos = useCallback(async () => {
    setCargandoPisos(true);
    setError(null);
    try {
      const data = await AlmacenService.listarPisos();
      setPisos(data);
      if (data.length === 0) {
        setPisoSeleccionado(null);
        setAreas([]);
      } else {
        setPisoSeleccionado((prev) => {
          if (prev && data.includes(prev)) return prev;
          return data[0];
        });
      }
    } catch (err) {
      console.error("Error cargando pisos:", err);
      setError("No se pudieron cargar los pisos. Intente nuevamente.");
    } finally {
      setCargandoPisos(false);
    }
  }, []);

  useEffect(() => {
    void cargarPisos();
  }, [cargarPisos, refreshKey]);

  const cargarAreasDePiso = useCallback(async (piso: string, opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setCargandoAreas(true);
    if (!silent) setError(null);
    try {
      const resumen = await AlmacenService.resumenStockAreasDePiso(piso);
      const mapeadas: AreaConStock[] = resumen.map((r) => ({
        ubicacion: {
          idUbicacionArea: r.idUbicacionArea,
          nombre: r.nombre,
          area: r.area,
          descripcion: r.descripcion,
        },
        stock: [],
        totalUnidades: Number(r.totalUnidades ?? 0),
        totalVariantes: Number(r.totalVariantesConStock ?? 0),
      }));
      setAreas(filtrarAreasPorSector(mapeadas));
    } catch (err) {
      console.error("Error cargando áreas:", err);
      if (!silent) {
        setError("No se pudieron cargar las áreas del piso seleccionado.");
        setAreas([]);
      }
    } finally {
      if (!silent) setCargandoAreas(false);
    }
  }, [filtrarAreasPorSector]);

  useEffect(() => {
    if (pisoSeleccionado) {
      setAreaDetalle(null); // Resetear detalle si se cambia de piso
      cargarAreasDePiso(pisoSeleccionado);
    }
  }, [pisoSeleccionado, cargarAreasDePiso, refreshKey]);

  const cargarDetalleArea = async (ubicacion: UbicacionArea) => {
    setAreaDetalle(ubicacion);
    setCargandoDetalle(true);
    try {
      const data = await AlmacenService.stockPorUbicacionArea(ubicacion.idUbicacionArea);
      setStockDetalle(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando detalle de stock:", err);
      setError("No se pudo cargar el detalle del área.");
    } finally {
      setCargandoDetalle(false);
    }
  };

  const refrescar = async () => {
    await cargarPisos();
    if (pisoSeleccionado) {
      if (areaDetalle) {
        await cargarDetalleArea(areaDetalle);
      } else {
        await cargarAreasDePiso(pisoSeleccionado);
      }
    }
  };

  const totalStockPiso = useMemo(() => areas.reduce((acc, a) => acc + a.totalUnidades, 0), [areas]);

  const productosEnDetalle = useMemo(() => {
    const map = new Map<number, { nombre: string; codigo: string; stockTotal: number; variantes: StockUbicacion[] }>();
    stockDetalle.forEach(item => {
      if (item.idProducto == null) return;
      const existing = map.get(item.idProducto);
      if (existing) {
        existing.stockTotal += item.stockActual;
        existing.variantes.push(item);
      } else {
        map.set(item.idProducto, {
          nombre: item.nombreProducto ?? 'Producto',
          codigo: item.codigoIdentificacion ?? '',
          stockTotal: item.stockActual,
          variantes: [item],
        });
      }
    });
    return Array.from(map.values());
  }, [stockDetalle]);

  return (
    <div className={embedded ? "w-full min-w-0" : "p-3 sm:p-4 md:p-6 lg:p-8 w-full max-w-7xl mx-auto"}>
      {!embedded && (
        <PageHeader
          variant="almacen"
          surface="elevated"
          eyebrow="Almacén · Distribución"
          icon="corporate_fare"
          title="Distribución por pisos"
          actions={
            <PageActionGroup>
              {puedeTrasladar && (
                <PageActionButton
                  grouped
                  onClick={() => {
                    setOrigenAreaModal(null);
                    setTrasladoGlobalAbierto(true);
                  }}
                >
                  Mover Mercadería
                </PageActionButton>
              )}
            </PageActionGroup>
          }
        />
      )}

      {successMsg && (
        <div className="mb-4 sm:mb-6 bg-green-50 border border-green-100 rounded-xl sm:rounded-2xl text-green-700 text-sm font-semibold px-4 py-3 sm:px-6 sm:py-4 flex items-center gap-3">
          <MaterialIcon icon="check_circle" className="w-5 h-5 shrink-0" />
          <span className="min-w-0">{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="mb-4 sm:mb-6 bg-rose-50 border border-rose-100 rounded-xl sm:rounded-2xl text-rose-600 text-sm font-semibold px-4 py-3 sm:px-6 sm:py-4 flex items-start gap-3">
          <span className="flex-shrink-0">⚠️</span>
          <span className="min-w-0">{error}</span>
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-[minmax(0,240px)_1fr] gap-4 sm:gap-6 lg:gap-8 min-w-0">
        {/* Pisos: chips horizontales en móvil, menú vertical en desktop */}
        <aside className="min-w-0 md:sticky md:top-4 md:self-start md:max-h-[calc(100vh-10rem)] md:overflow-y-auto md:pr-2">
          <div className="flex flex-col gap-2 sm:gap-4">
            <h2 className="text-xs font-bold app-text-faint uppercase tracking-widest flex items-center gap-2 px-1">
              <MaterialIcon icon="grid_view" className="h-4 w-4 shrink-0" />
              Pisos
            </h2>
            <nav
              className="flex md:flex-col gap-2 md:gap-2.5 overflow-x-auto pb-1 md:pb-0 md:overflow-visible snap-x snap-mandatory custom-scrollbar -mx-1 px-1 md:mx-0 md:px-0"
              aria-label="Seleccionar piso"
            >
              {cargandoPisos ? (
                <div className="flex md:flex-col gap-2 min-w-full">
                  <ListItemSkeleton count={4} showAvatar={false} />
                </div>
              ) : pisos.length === 0 ? (
                <p className="text-xs app-text-muted font-medium px-2 py-4 text-center w-full">
                  {esAlmaceneroRestringido ? "No hay pisos asignados." : "No hay pisos registrados."}
                </p>
              ) : (
                pisos.map((piso) => {
                  const isSelected = piso === pisoSeleccionado;
                  return (
                    <button
                      key={piso}
                      type="button"
                      onClick={() => setPisoSeleccionado(piso)}
                      className={`
                        shrink-0 snap-start md:shrink md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3
                        min-h-11 px-4 md:px-5 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl text-sm font-bold text-left
                        transition-all duration-300 active:scale-[0.96] touch-manipulation
                        ${
                          isSelected
                            ? "bg-[var(--app-accent)] text-[var(--app-accent-fg)] shadow-lg border border-[var(--app-accent)]"
                            : "app-text-muted bg-[var(--app-surface)] md:bg-transparent border border-[var(--app-border)] md:border-transparent hover:bg-[var(--app-bg-muted)] hover:app-heading"
                        }
                      `}
                    >
                      {piso}
                    </button>
                  );
                })
              )}
            </nav>
          </div>
        </aside>

        {/* Panel Contenido */}
        <div className="min-w-0 w-full md:max-h-[calc(100vh-10rem)] md:overflow-y-auto">
          {pisoSeleccionado ? (
            areaDetalle ? (
              <div className="animate-fadeIn p-4 sm:p-6 lg:p-8 bg-[var(--app-surface-glass)] backdrop-blur-md rounded-2xl sm:rounded-3xl border border-[var(--app-border)] shadow-sm min-w-0">
                <div className="flex flex-col gap-4 mb-6 sm:mb-8">
                  <button
                    type="button"
                    onClick={() => setAreaDetalle(null)}
                    className="group inline-flex min-h-11 items-center gap-3 app-text-muted hover:app-heading text-sm font-bold transition-all duration-200 touch-manipulation self-start"
                  >
                    <span className="w-9 h-9 rounded-full bg-[var(--app-accent)] text-[var(--app-accent-fg)] flex items-center justify-center shadow-md group-active:scale-95 transition-transform">
                      <MaterialIcon icon="arrow_back" className="h-4 w-4" />
                    </span>
                    Volver a {pisoSeleccionado}
                  </button>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between min-w-0">
                    <h3 className="text-xl sm:text-2xl font-bold app-heading break-words">
                      Detalle: {areaDetalle.area ?? "Sin área específica"}
                    </h3>
                    {puedeTrasladar && (
                      <button
                        type="button"
                        onClick={() => setOrigenAreaModal(areaDetalle)}
                        className="inline-flex min-h-11 w-full sm:w-auto shrink-0 items-center justify-center gap-2 px-5 py-2.5 rounded-xl sm:rounded-full bg-[var(--app-accent)] text-[var(--app-accent-fg)] text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all shadow-sm touch-manipulation"
                      >
                        Mover desde aquí
                      </button>
                    )}
                  </div>
                </div>

                {cargandoDetalle ? (
                  <>
                    <div className="md:hidden space-y-3">
                      <ListItemSkeleton count={4} showAvatar={false} />
                    </div>
                    <div className="hidden md:block">
                      <TableSkeleton rows={5} columns={3} />
                    </div>
                  </>
                ) : productosEnDetalle.length === 0 ? (
                  <div className="py-12 sm:py-16 text-center text-sm app-text-faint font-medium px-4">
                    No hay stock registrado en esta ubicación.
                  </div>
                ) : (
                  <>
                    <div className="md:hidden flex flex-col gap-3">
                      {productosEnDetalle.map((prod, idx) => (
                        <div
                          key={`prod-${idx}`}
                          className="animate-stagger-item rounded-2xl border bg-[var(--app-surface)] border-[var(--app-border)] p-4 shadow-sm hover:shadow-md transition-all duration-200"
                          style={{ animationDelay: `${idx * 40}ms` }}
                        >
                          <p className="font-semibold app-heading text-sm leading-snug">{prod.nombre}</p>
                          {prod.codigo && (
                            <p className="text-[11px] app-text-faint font-mono font-bold mt-1">{prod.codigo}</p>
                          )}
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-sm font-bold app-heading">{prod.stockTotal} uds.</span>
                            <button
                              type="button"
                              onClick={() => setProductoModal({ nombre: prod.nombre, variantes: prod.variantes })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-[var(--app-accent)] text-[var(--app-accent-fg)] hover:opacity-90 transition-all"
                            >
                              Ver variantes
                              <MaterialIcon icon="visibility" className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="hidden md:block overflow-x-auto rounded-2xl border border-[var(--app-border)]">
                      <table className="min-w-full divide-y divide-[var(--app-border)] table-zebra">
                        <thead className="bg-[var(--app-bg-muted)]">
                          <tr>
                            <th className="px-5 py-4 text-left text-[11px] font-bold tracking-widest app-text-faint uppercase">
                              Producto
                            </th>
                            <th className="px-5 py-4 text-right text-[11px] font-bold tracking-widest app-text-faint uppercase">
                              Stock Total
                            </th>
                            <th className="px-5 py-4 text-right text-[11px] font-bold tracking-widest app-text-faint uppercase">
                              Acción
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-[var(--app-surface)] divide-y divide-[var(--app-border)]">
                          {productosEnDetalle.map((prod, idx) => (
                            <tr
                              key={`prod-${idx}`}
                              className="animate-stagger-item hover:bg-[var(--app-hover-overlay)] transition-colors duration-150"
                              style={{ animationDelay: `${idx * 30}ms` }}
                            >
                              <td className="px-5 py-4">
                                <span className="font-semibold app-heading text-sm">{prod.nombre}</span>
                                <span className="ml-2 text-[11px] app-text-faint font-mono font-bold">
                                  ({prod.codigo})
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-bold font-mono bg-[var(--app-input)] app-heading">
                                  {prod.stockTotal}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => setProductoModal({ nombre: prod.nombre, variantes: prod.variantes })}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-[var(--app-accent)] text-[var(--app-accent-fg)] hover:opacity-90 transition-all"
                                >
                                  Ver variantes
                                  <MaterialIcon icon="visibility" className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="animate-fadeIn min-w-0">
                <PageHeader
                  variant={embedded ? "embedded" : "almacen"}
                  surface={embedded ? "flat" : "elevated"}
                  title={pisoSeleccionado}
                  className={embedded ? undefined : "mb-4 sm:mb-5"}
                  actions={
                    embedded ? (
                      <PageActionGroup>
                        {puedeTrasladar && (
                          <PageActionButton
                            grouped
                            onClick={() => {
                              setOrigenAreaModal(null);
                              setTrasladoGlobalAbierto(true);
                            }}
                          >
                            Mover Mercadería
                          </PageActionButton>
                        )}
                      </PageActionGroup>
                    ) : undefined
                  }
                />

                <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(0,305px)] gap-4 sm:gap-6 lg:gap-8 items-start min-w-0">
                  {/* Resumen compacto primero en móvil */}
                  <div className="order-1 xl:order-2 app-metric-card rounded-2xl sm:rounded-[20px] border p-5 sm:p-8 shadow-xl flex flex-row xl:flex-col items-center xl:items-stretch justify-between gap-4 xl:gap-0 xl:min-h-[360px] min-w-0 animate-fadeIn">
                    <div className="min-w-0 xl:mb-0">
                      <h3 className="text-base sm:text-xl font-bold app-metric-value mb-0.5 sm:mb-1">Total Productos</h3>
                      <p className="text-xs sm:text-sm app-metric-label truncate">Stock global · {pisoSeleccionado}</p>
                    </div>
                    <div className="flex flex-col items-end xl:items-stretch xl:flex-1 xl:justify-center xl:py-6 shrink-0">
                      <div className="text-4xl sm:text-6xl xl:text-7xl font-black tracking-tight leading-none app-metric-value animate-countUp">
                        {totalStockPiso}
                      </div>
                      <div className="text-xs sm:text-sm app-metric-label font-medium mt-0.5 sm:mt-2 text-right xl:text-left">
                        Unidades físicas
                      </div>
                    </div>
                  </div>

                  {/* Áreas Operativas */}
                  <div className="order-2 xl:order-1 bg-[var(--app-surface-glass)] backdrop-blur-md rounded-2xl sm:rounded-[20px] border border-[var(--app-border)] shadow-sm p-4 sm:p-6 lg:p-8 min-w-0 animate-slideUpFade">
                    <SectionHeader title={`Áreas operativas · ${pisoSeleccionado}`} />

                    {cargandoAreas ? (
                      <div className="py-10 flex justify-center">
                        <MaterialIcon icon="sync" className="h-6 w-6 animate-spin app-text-faint" />
                      </div>
                    ) : areas.length === 0 ? (
                      <p className="py-10 text-center text-sm app-text-faint font-medium px-2">
                        {esAlmaceneroRestringido
                          ? `Este piso no tiene el sector ${nombreAreaAsignada ?? "asignado"} configurado.`
                          : "Este piso aún no tiene áreas registradas."}
                      </p>
                    ) : (
                      <>
                        <div className="md:hidden flex flex-col gap-3">
                          {areas.map(({ ubicacion, totalUnidades, totalVariantes }, idx) => (
                            <AreaOperativaCard
                              key={ubicacion.idUbicacionArea}
                              ubicacion={ubicacion}
                              totalUnidades={totalUnidades}
                              totalVariantes={totalVariantes}
                              dot={obtenerDotEstado(ubicacion.area, ubicacion.nombre, totalUnidades)}
                              onVer={() => cargarDetalleArea(ubicacion)}
                              puedeTrasladar={puedeTrasladar}
                              etiquetasGerente={etiquetasGerente}
                              index={idx}
                            />
                          ))}
                        </div>
                        <div className="hidden md:block overflow-x-auto -mx-1 px-1">
                          <table className="w-full min-w-[520px] text-left border-collapse">
                            <thead className="border-b border-[var(--app-border)]">
                              <tr>
                                <th className="pb-4 px-2 text-[10px] font-bold tracking-widest app-text-faint uppercase">
                                  Sector
                                </th>
                                <th className="pb-4 px-2 text-[10px] font-bold tracking-widest app-text-faint uppercase text-center">
                                  Capacidad
                                </th>
                                <th className="pb-4 px-2 text-[10px] font-bold tracking-widest app-text-faint uppercase text-center">
                                  Estado
                                </th>
                                <th className="pb-4 px-2 text-[10px] font-bold tracking-widest app-text-faint uppercase text-right">
                                  Acción
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--app-border)]">
                              {areas.map(({ ubicacion, totalUnidades, totalVariantes }, idx) => {
                                const dot = obtenerDotEstado(
                                  ubicacion.area,
                                  ubicacion.nombre,
                                  totalUnidades
                                );
                                return (
                                  <tr
                                    key={ubicacion.idUbicacionArea}
                                    className="animate-stagger-item group hover:bg-[var(--app-hover-overlay)] transition-colors duration-200 cursor-pointer"
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                    onClick={() => cargarDetalleArea(ubicacion)}
                                  >
                                    <td className="py-5 px-2">
                                      <div className="text-sm app-heading font-bold">
                                        {ubicacion.area ?? (
                                          <span className="app-text-faint font-normal">Sin área específica</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-5 px-2 text-center">
                                      <div className="text-sm app-text-muted font-semibold">
                                        {totalUnidades}{" "}
                                        <span className="text-[10px] app-text-faint uppercase">
                                          / {totalVariantes} Vars.
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-5 px-2 text-center">
                                      <span
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${dot.badgeClass}`}
                                      >
                                        <span className={`w-1.5 h-1.5 rounded-full ${dot.colorClass}`} />
                                        {dot.label}
                                      </span>
                                    </td>
                                    <td className="py-5 px-2 text-right">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          cargarDetalleArea(ubicacion);
                                        }}
                                        className="inline-flex min-h-10 items-center justify-center gap-2 px-4 py-2 rounded-full bg-[var(--app-accent)] text-[var(--app-accent-fg)] text-[10px] font-bold uppercase tracking-wider shadow hover:opacity-90 active:scale-[0.98] transition-all touch-manipulation"
                                        title="Ver detalles del área"
                                      >
                                        Ver detalles
                                        <MaterialIcon icon="arrow_forward" className="h-3.5 w-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          ) : (
             <div className="min-h-[12rem] sm:h-64 flex flex-col items-center justify-center border-2 border-dashed border-[var(--app-border-strong)] rounded-2xl sm:rounded-3xl app-text-faint px-4 text-center">
               <MaterialIcon icon="corporate_fare" className="h-8 w-8 mb-3 opacity-50" />
               <p className="font-medium text-sm sm:text-base">Seleccione un piso para ver sus detalles</p>
             </div>
          )}
        </div>
      </section>

      {productoModal && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl border border-gray-200">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-bold text-gray-900 break-words pr-4">{productoModal.nombre}</h3>
                <button
                  type="button"
                  onClick={() => setProductoModal(null)}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <MaterialIcon icon="close" className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-bold tracking-widest text-gray-500 uppercase">Color</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold tracking-widest text-gray-500 uppercase">Talla</th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold tracking-widest text-gray-500 uppercase">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {productoModal.variantes.map((v) => (
                      <tr key={v.idVariante} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-700 font-medium">{v.color ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-bold font-mono">{v.talla ?? '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-bold font-mono bg-blue-50 text-blue-700">
                            {v.stockActual}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {productoModal.variantes.length === 0 && (
                <p className="text-center text-sm text-gray-500 py-8">No hay variantes registradas.</p>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

      {puedeTrasladar && (
        <MoverMercaderiaModal
          abierto={trasladoGlobalAbierto || origenAreaModal !== null}
          modoDestinoLibre={trasladoGlobalAbierto}
          ubicacionOrigenStock={origenAreaModal}
          onCerrar={() => {
            setOrigenAreaModal(null);
            setTrasladoGlobalAbierto(false);
          }}
          onExito={() => {
            setSuccessMsg("Mercadería trasladada exitosamente");
            refrescar();
          }}
        />
      )}
    </div>
  );
};

export default GestionPisos;


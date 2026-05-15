import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, LayoutGrid, MoveRight, RefreshCw } from "lucide-react";
import { AlmacenService } from "@/services/AlmacenService";
import type { StockUbicacion, Ubicacion } from "@/types/Almacen";
import MoverMercaderiaModal from "./MoverMercaderiaModal";

interface AreaConStock {
  ubicacion: Ubicacion;
  totalUnidades: number;
  totalVariantes: number;
  stock: StockUbicacion[];
}

interface GestionPisosProps {
  embedded?: boolean;
}

/** Actualización en segundo plano del resumen del piso (solo pestaña visible; sin modal abierto). */
const POLL_AREAS_MS = 45_000;

const GestionPisos = ({ embedded = false }: GestionPisosProps) => {
  const [pisos, setPisos] = useState<string[]>([]);
  const [pisoSeleccionado, setPisoSeleccionado] = useState<string | null>(null);
  const [areas, setAreas] = useState<AreaConStock[]>([]);
  const [cargandoPisos, setCargandoPisos] = useState(false);
  const [cargandoAreas, setCargandoAreas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Fila "Mover mercadería": el listado de productos es solo el stock de esta ubicación. */
  const [origenAreaModal, setOrigenAreaModal] = useState<Ubicacion | null>(null);
  const [trasladoGlobalAbierto, setTrasladoGlobalAbierto] = useState(false);
  const modalAbiertoRef = useRef(false);
  modalAbiertoRef.current = trasladoGlobalAbierto || origenAreaModal !== null;

  useEffect(() => {
    let isMounted = true;
    const fetchPisos = async () => {
      setCargandoPisos(true);
      setError(null);
      try {
        const data = await AlmacenService.listarPisos();
        if (!isMounted) return;
        setPisos(data);
        setPisoSeleccionado((prev) => {
          if (data.length === 0) return null;
          if (prev == null) return data[0];
          return data.includes(prev) ? prev : data[0];
        });
        if (data.length === 0) setAreas([]);
      } catch (err) {
        if (isMounted) {
          console.error("Error cargando pisos:", err);
          setError("No se pudieron cargar los pisos. Intente nuevamente.");
        }
      } finally {
        if (isMounted) setCargandoPisos(false);
      }
    };
    void fetchPisos();
    return () => {
      isMounted = false;
    };
  }, []);

  const cargarAreasDePiso = useCallback(async (piso: string, opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setCargandoAreas(true);
    if (!silent) setError(null);
    try {
      const resumen = await AlmacenService.resumenStockAreasDePiso(piso);
      setAreas(
        resumen.map((r) => ({
          ubicacion: {
            idUbicacion: r.idUbicacion,
            nombre: r.nombre,
            area: r.area,
            descripcion: r.descripcion,
          },
          stock: [],
          totalUnidades: Number(r.totalUnidades ?? 0),
          totalVariantes: Number(r.totalVariantesConStock ?? 0),
        }))
      );
    } catch (err) {
      console.error("Error cargando áreas:", err);
      if (!silent) {
        setError("No se pudieron cargar las áreas del piso seleccionado.");
        setAreas([]);
      }
    } finally {
      if (!silent) setCargandoAreas(false);
    }
  }, []);

  useEffect(() => {
    if (pisoSeleccionado) {
      cargarAreasDePiso(pisoSeleccionado);
    }
  }, [pisoSeleccionado, cargarAreasDePiso]);

  const refrescar = () => {
    if (pisoSeleccionado) void cargarAreasDePiso(pisoSeleccionado);
  };

  useEffect(() => {
    if (!pisoSeleccionado) return;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      if (modalAbiertoRef.current) return;
      void cargarAreasDePiso(pisoSeleccionado, { silent: true });
    };

    const id = window.setInterval(tick, POLL_AREAS_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pisoSeleccionado, cargarAreasDePiso]);

  return (
    <div className={embedded ? "" : "p-4 md:p-6 max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100"}>
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div className="pl-1">
          <div className="flex items-center gap-2">
            {!embedded && <Building2 className="h-6 w-6 text-gray-900" />}
            <h2 className={embedded ? "text-xl font-bold text-gray-900" : "text-2xl font-bold text-gray-900"}>
              Distribución por pisos
            </h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Visualiza el stock disponible por área y mueve mercadería desde el almacén a cada piso. El resumen se
            actualiza solo cada 45 s con la pestaña visible (y al cerrar traslados).
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 md:gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => {
              setOrigenAreaModal(null);
              setTrasladoGlobalAbierto(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-gray-800 shadow-sm transition-all duration-200 active:scale-[0.98] order-first md:order-none"
          >
            <MoveRight className="h-4 w-4" />
            Mover mercadería
          </button>
          <button
            type="button"
            onClick={refrescar}
            disabled={cargandoAreas}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-50 shadow-sm transition-all duration-200 disabled:opacity-50 active:scale-[0.98]"
          >
            <RefreshCw className={`h-4 w-4 transition-transform duration-200 ${cargandoAreas ? "animate-spin" : ""}`} />
            Refrescar
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        <aside className="bg-white rounded-[1.5rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <LayoutGrid className="h-4 w-4 text-gray-400" />
            <h3 className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">Pisos</h3>
          </div>
          {cargandoPisos ? (
            <p className="text-sm text-gray-500">Cargando…</p>
          ) : pisos.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay pisos registrados. Agrega filas en <code>ubicacion</code> con un nombre distinto
              de <strong>Principal</strong> y <strong>Almacén</strong>.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {pisos.map((piso) => (
                <li key={piso}>
                  <button
                    onClick={() => setPisoSeleccionado(piso)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-200 font-medium active:scale-[0.99] ${
                      piso === pisoSeleccionado
                        ? "bg-black text-white shadow-md"
                        : "text-gray-600 bg-[#f8f8f8] hover:bg-gray-100"
                    }`}
                  >
                    {piso}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="bg-white rounded-[1.5rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-50 overflow-hidden">
          {error && (
            <div className="bg-red-50 border-b border-red-100 text-red-600 text-sm font-medium px-6 py-4 flex items-center gap-3">
              <span className="flex-shrink-0">⚠️</span>
              {error}
            </div>
          )}

          {pisoSeleccionado ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 table-zebra">
                <thead className="bg-[#fafafa]">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">
                      Área
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">
                      Variantes con stock
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">
                      Unidades totales
                    </th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {cargandoAreas ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500 font-medium">
                        Cargando áreas…
                      </td>
                    </tr>
                  ) : areas.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500 font-medium">
                        Este piso aún no tiene áreas registradas.
                      </td>
                    </tr>
                  ) : (
                    areas.map(({ ubicacion, totalUnidades, totalVariantes }) => (
                      <tr key={ubicacion.idUbicacion} className="hover:bg-slate-100/50 transition-colors duration-150">
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 font-bold">
                            {ubicacion.area ?? <span className="text-gray-400 font-medium">Sin área específica</span>}
                          </div>
                          {ubicacion.descripcion && (
                            <div className="text-xs text-gray-500 mt-1">
                              {ubicacion.descripcion}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-medium">{totalVariantes}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                            {totalUnidades}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setTrasladoGlobalAbierto(false);
                              setOrigenAreaModal(ubicacion);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-all duration-200 shadow-sm active:scale-[0.98]"
                          >
                            <MoveRight className="h-4 w-4" />
                            Mover mercadería
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center">
              <Building2 className="h-12 w-12 text-gray-200 mx-auto mb-4" />
              <p className="text-sm text-gray-500 font-medium">Selecciona un piso para ver sus áreas y stock.</p>
            </div>
          )}
        </div>
      </section>

      <MoverMercaderiaModal
        abierto={trasladoGlobalAbierto || origenAreaModal !== null}
        modoDestinoLibre={trasladoGlobalAbierto}
        ubicacionOrigenStock={origenAreaModal}
        onCerrar={() => {
          setOrigenAreaModal(null);
          setTrasladoGlobalAbierto(false);
        }}
        onExito={refrescar}
      />
    </div>
  );
};

export default GestionPisos;

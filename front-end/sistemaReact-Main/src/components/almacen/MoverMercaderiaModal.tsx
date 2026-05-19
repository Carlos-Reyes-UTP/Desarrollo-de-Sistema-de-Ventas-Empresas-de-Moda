import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, Loader2, PackageSearch, X } from "lucide-react";
import axios from "axios";
import { AlmacenService } from "@/services/AlmacenService";
import { useAccesoAreaAlmacen } from "@/hooks/useAccesoAreaAlmacen";
import type { StockUbicacion, UbicacionArea } from "@/types/Almacen";

interface MoverMercaderiaModalProps {
  abierto: boolean;
  /** Primero elige destino; luego sugerencias con stock en Almacen. */
  modoDestinoLibre?: boolean;
  /** Listado de variantes solo con stock en esta ubicación (botón en fila de área); el destino del traslado se elige en el paso 1. */
  ubicacionOrigenStock?: UbicacionArea | null;
  onCerrar: () => void;
  onExito: () => void;
}

const formatoUbicacion = (u: Pick<UbicacionArea, "nombre" | "area">) =>
  u.area ? `${u.nombre} · ${u.area}` : u.nombre;

const origenEtiqueta = (v: StockUbicacion) =>
  v.areaUbicacion ? `${v.nombreUbicacion} · ${v.areaUbicacion}` : v.nombreUbicacion;

const etiquetaProducto = (v: StockUbicacion) =>
  `${v.nombreProducto ?? "Producto"} · ${v.color ?? "-"} / ${v.talla ?? "-"}`;

const MoverMercaderiaModal = ({
  abierto,
  modoDestinoLibre = false,
  ubicacionOrigenStock = null,
  onCerrar,
  onExito,
}: MoverMercaderiaModalProps) => {
  const [destinoEfectivo, setDestinoEfectivo] = useState<UbicacionArea | null>(null);
  const [destinosDisponibles, setDestinosDisponibles] = useState<UbicacionArea[]>([]);
  const [idDestinoPaso1, setIdDestinoPaso1] = useState<number | "">("");
  const [cargandoDestinos, setCargandoDestinos] = useState(false);

  const [stockAreaCompleto, setStockAreaCompleto] = useState<StockUbicacion[]>([]);
  const [cargandoStockArea, setCargandoStockArea] = useState(false);

  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [sugerencias, setSugerencias] = useState<StockUbicacion[]>([]);
  const [filaSeleccionada, setFilaSeleccionada] = useState<StockUbicacion | null>(null);
  const [listaAbierta, setListaAbierta] = useState(false);
  const [indiceResaltado, setIndiceResaltado] = useState(0);
  const [cargandoSugerencias, setCargandoSugerencias] = useState(false);
  const [cantidad, setCantidad] = useState<number>(1);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const { acceso: accesoAreaAlmacen } = useAccesoAreaAlmacen(abierto);

  const requierePasoDestino = modoDestinoLibre || !!ubicacionOrigenStock;

  const resetFormularioTraslado = useCallback(() => {
    setError(null);
    setTextoBusqueda("");
    setSugerencias([]);
    setFilaSeleccionada(null);
    setListaAbierta(false);
    setIndiceResaltado(0);
    setCantidad(1);
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  useEffect(() => {
    if (!abierto) {
      setDestinoEfectivo(null);
      setDestinosDisponibles([]);
      setIdDestinoPaso1("");
      setStockAreaCompleto([]);
      resetFormularioTraslado();
      return;
    }

    resetFormularioTraslado();

    if (ubicacionOrigenStock) {
      setDestinoEfectivo(null);
      setCargandoDestinos(true);
      if (accesoAreaAlmacen?.restriccionTrasladoMismaAreaCatalogo) {
        const lista = accesoAreaAlmacen.destinosTraslado.filter(
          (u) => u.idUbicacionArea !== ubicacionOrigenStock.idUbicacionArea
        );
        setDestinosDisponibles(lista);
        setCargandoDestinos(false);
        return;
      }
      Promise.all([
        AlmacenService.listarPisos().then((pisos) =>
          Promise.all(pisos.map((p) => AlmacenService.listarAreasDePiso(p).catch(() => [] as UbicacionArea[])))
        ),
        AlmacenService.stockDesdeAlmacen().catch(() => null),
      ])
        .then(([chunks, stockAlm]) => {
          let lista: UbicacionArea[] = chunks.flat();
          if (stockAlm) {
            const etiqueta = stockAlm.etiquetaAlmacen ?? "Almacen";
            const partes = etiqueta.split(" · ");
            const uAlm: UbicacionArea = {
              idUbicacionArea: stockAlm.idUbicacionAreaOrigen,
              nombre: partes[0]?.trim() || "Almacen",
              area: partes.length > 1 ? partes.slice(1).join(" · ").trim() || null : null,
              descripcion: null,
            };
            const ids = new Set(lista.map((u) => u.idUbicacionArea));
            if (!ids.has(uAlm.idUbicacionArea)) lista = [uAlm, ...lista];
          }
          lista = lista.filter((u) => u.idUbicacionArea !== ubicacionOrigenStock.idUbicacionArea);
          setDestinosDisponibles(lista);
        })
        .catch((err) => {
          console.error("Error cargando destinos:", err);
          setError("No se pudieron cargar las ubicaciones de destino.");
          setDestinosDisponibles([]);
        })
        .finally(() => setCargandoDestinos(false));
      return;
    }

    if (modoDestinoLibre) {
      setDestinoEfectivo(null);
      setCargandoDestinos(true);
      if (accesoAreaAlmacen?.esAlmaceneroGeneral || accesoAreaAlmacen?.restriccionTrasladoMismaAreaCatalogo) {
        setDestinosDisponibles(accesoAreaAlmacen.destinosTraslado);
        setCargandoDestinos(false);
        return;
      }
      AlmacenService.listarPisos()
        .then((pisos) =>
          Promise.all(
            pisos.map((p) =>
              AlmacenService.listarAreasDePiso(p).catch(() => [] as UbicacionArea[])
            )
          )
        )
        .then((chunks) => {
          setDestinosDisponibles(chunks.flat());
        })
        .catch((err) => {
          console.error("Error cargando áreas destino:", err);
          setError("No se pudieron cargar las áreas de venta.");
          setDestinosDisponibles([]);
        })
        .finally(() => setCargandoDestinos(false));
    }
  }, [abierto, modoDestinoLibre, ubicacionOrigenStock, resetFormularioTraslado, accesoAreaAlmacen]);

  useEffect(() => {
    if (!abierto || !ubicacionOrigenStock) {
      if (!abierto) setStockAreaCompleto([]);
      return;
    }
    let cancelled = false;
    setCargandoStockArea(true);
    AlmacenService.stockPorUbicacionArea(ubicacionOrigenStock.idUbicacionArea)
      .then((data) => {
        if (!cancelled) setStockAreaCompleto(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Error cargando stock del área:", err);
        if (!cancelled) {
          setStockAreaCompleto([]);
          setError("No se pudo cargar el stock de esta área.");
        }
      })
      .finally(() => {
        if (!cancelled) setCargandoStockArea(false);
      });
    return () => {
      cancelled = true;
    };
  }, [abierto, ubicacionOrigenStock?.idUbicacionArea]);

  useEffect(() => {
    if (!abierto || !destinoEfectivo || ubicacionOrigenStock) {
      return;
    }

    const delayMs = textoBusqueda.trim() === "" ? 0 : 300;
    const t = window.setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setCargandoSugerencias(true);
      setError(null);
      const sectorBusqueda = accesoAreaAlmacen?.restriccionTrasladoMismaAreaCatalogo
        ? accesoAreaAlmacen.sectoresVisibles[0]
        : destinoEfectivo?.area ?? undefined;
      AlmacenService.buscarStockOrigenTraslado(
        textoBusqueda,
        30,
        ctrl.signal,
        true,
        sectorBusqueda
      )
        .then((data) => {
          setSugerencias(Array.isArray(data) ? data : []);
          setIndiceResaltado(0);
          setListaAbierta(true);
        })
        .catch((err: unknown) => {
          if (axios.isCancel(err)) return;
          console.error("Error en búsqueda de stock:", err);
          setError("No se pudo cargar el inventario para el traslado.");
          setSugerencias([]);
        })
        .finally(() => {
          if (!ctrl.signal.aborted) {
            setCargandoSugerencias(false);
          }
        });
    }, delayMs);

    return () => {
      window.clearTimeout(t);
      abortRef.current?.abort();
    };
  }, [abierto, destinoEfectivo?.idUbicacionArea, ubicacionOrigenStock, textoBusqueda, accesoAreaAlmacen]);

  useEffect(() => {
    if (!abierto || !destinoEfectivo || !ubicacionOrigenStock) {
      return;
    }

    const delayMs = textoBusqueda.trim() === "" ? 0 : 120;
    const t = window.setTimeout(() => {
      setCargandoSugerencias(true);
      const q = textoBusqueda.trim().toLowerCase();
      const filtered = stockAreaCompleto
        .filter((fila) => {
          if (!q) return true;
          const fields = [fila.nombreProducto, fila.codigoIdentificacion, fila.sku, fila.color, fila.talla].map((x) =>
            (x ?? "").toLowerCase()
          );
          return fields.some((f) => f.includes(q));
        })
        .slice(0, 30);
      setSugerencias(filtered);
      setIndiceResaltado(0);
      setListaAbierta(true);
      setCargandoSugerencias(false);
    }, delayMs);

    return () => window.clearTimeout(t);
  }, [abierto, destinoEfectivo?.idUbicacionArea, ubicacionOrigenStock, textoBusqueda, stockAreaCompleto]);

  useEffect(() => {
    if (textoBusqueda !== (filaSeleccionada ? etiquetaProducto(filaSeleccionada) : "")) {
      setFilaSeleccionada(null);
    }
  }, [textoBusqueda, filaSeleccionada]);

  const stockMaximo = filaSeleccionada?.stockActual ?? 0;

  const puedeEnviar =
    !!destinoEfectivo &&
    !!filaSeleccionada?.idUbicacionArea &&
    !!filaSeleccionada.idVariante &&
    cantidad > 0 &&
    cantidad <= stockMaximo &&
    !enviando;

  const puedeContinuarPaso1 =
    requierePasoDestino && idDestinoPaso1 !== "" && !cargandoDestinos && !enviando;

  const confirmarDestinoPaso1 = () => {
    if (idDestinoPaso1 === "") return;
    const elegido = destinosDisponibles.find((u) => u.idUbicacionArea === idDestinoPaso1);
    if (!elegido) return;
    setDestinoEfectivo(elegido);
    resetFormularioTraslado();
  };

  const volverAElegirDestino = () => {
    setDestinoEfectivo(null);
    setIdDestinoPaso1("");
    resetFormularioTraslado();
  };

  const elegirSugerencia = (fila: StockUbicacion) => {
    setFilaSeleccionada(fila);
    setTextoBusqueda(etiquetaProducto(fila));
    setListaAbierta(false);
    setCantidad(1);
  };

  const confirmar = async () => {
    if (!puedeEnviar || !destinoEfectivo || !filaSeleccionada) return;
    setEnviando(true);
    setError(null);
    try {
      await AlmacenService.moverMercaderia({
        idVariante: filaSeleccionada.idVariante,
        idUbicacionAreaOrigen: filaSeleccionada.idUbicacionArea,
        idUbicacionAreaDestino: destinoEfectivo.idUbicacionArea,
        cantidad,
      });
      onExito();
      onCerrar();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo registrar el traslado. Revise los valores e intente de nuevo.";
      setError(message);
    } finally {
      setEnviando(false);
    }
  };

  const onKeyDownBusqueda = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!listaAbierta || sugerencias.length === 0) {
      if (e.key === "ArrowDown" && sugerencias.length > 0) {
        setListaAbierta(true);
        setIndiceResaltado(0);
        e.preventDefault();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceResaltado((i) => Math.min(i + 1, sugerencias.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceResaltado((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const fila = sugerencias[indiceResaltado];
      if (fila) elegirSugerencia(fila);
    } else if (e.key === "Escape") {
      setListaAbierta(false);
    }
  };

  const mostrarPasoDestino = requierePasoDestino && !destinoEfectivo;

  const headerDestino = useMemo(() => {
    if (!destinoEfectivo) return null;
    return formatoUbicacion(destinoEfectivo);
  }, [destinoEfectivo]);

  const tituloOrigenArea = ubicacionOrigenStock ? formatoUbicacion(ubicacionOrigenStock) : null;

  const mensajeSinStock = ubicacionOrigenStock
    ? "No hay stock disponible en esta área para mover."
    : "No hay stock disponible en Almacen para mover.";

  if (!abierto) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full border border-gray-100 animate-scaleIn ${
          mostrarPasoDestino ? "max-w-lg" : "max-w-2xl"
        }`}
      >
        <header className="flex items-start justify-between px-8 py-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Mover mercadería</h2>
            {mostrarPasoDestino ? (
              <p className="text-sm text-gray-500 mt-1 font-medium">
                {ubicacionOrigenStock ? (
                  <>
                    Origen del stock: <span className="font-bold text-gray-900">{tituloOrigenArea}</span>. Elige a
                    dónde trasladar las unidades; luego verás solo variantes con stock en esa área.
                  </>
                ) : (
                  <>
                    Elige el piso o área de destino. Las sugerencias incluyen stock en{" "}
                    <span className="font-bold text-gray-900">Almacen</span>; por variante se prioriza
                    Almacen y cada línea indica el origen (Damas, Caballeros, Niños).
                  </>
                )}
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-500 mt-1 font-medium">
                  Destino del traslado:{" "}
                  <span className="font-bold text-gray-900">{headerDestino}</span>
                </p>
                <p className="text-xs text-gray-500 mt-2 font-medium">
                  {ubicacionOrigenStock ? (
                    <>
                      Origen por línea: stock en{" "}
                      <span className="font-bold text-gray-900">{tituloOrigenArea}</span>.
                    </>
                  ) : (
                    <>
                      Origen por línea:{" "}
                      <span className="font-bold text-gray-900">Almacen</span> (según la sugerencia
                      elegida; se muestra en cada fila).
                    </>
                  )}
                </p>
                {requierePasoDestino && (
                  <button
                    type="button"
                    onClick={volverAElegirDestino}
                    className="mt-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-black transition-colors duration-200"
                  >
                    Cambiar destino
                  </button>
                )}
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="p-2 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100 transition-colors duration-200"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="px-8 py-6 space-y-6">
          {mostrarPasoDestino ? (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-3">
                Destino del traslado
              </label>
              {cargandoDestinos ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-3 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando ubicaciones…
                </div>
              ) : destinosDisponibles.length === 0 ? (
                <p className="text-sm text-gray-500 font-medium">No hay ubicaciones de destino disponibles.</p>
              ) : (
                <select
                  value={idDestinoPaso1 === "" ? "" : String(idDestinoPaso1)}
                  onChange={(e) =>
                    setIdDestinoPaso1(e.target.value ? Number(e.target.value) : "")
                  }
                  className="w-full rounded-xl border-transparent bg-[#f8f8f8] px-4 py-3 text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all duration-200"
                >
                  <option value="">Seleccione un destino</option>
                  {destinosDisponibles.map((u) => (
                    <option key={u.idUbicacionArea} value={u.idUbicacionArea}>
                      {formatoUbicacion(u)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <>
              <div className="relative">
                <label
                  htmlFor="busqueda-traslado-producto"
                  className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-3"
                >
                  Buscar producto / variante
                </label>
                <input
                  id="busqueda-traslado-producto"
                  type="text"
                  autoComplete="off"
                  value={textoBusqueda}
                  onChange={(e) => {
                    setTextoBusqueda(e.target.value);
                    setListaAbierta(true);
                  }}
                  onFocus={() => setListaAbierta(true)}
                  onBlur={() => {
                    window.setTimeout(() => setListaAbierta(false), 180);
                  }}
                  onKeyDown={onKeyDownBusqueda}
                  placeholder="Nombre, código, SKU, color o talla…"
                  disabled={ubicacionOrigenStock ? cargandoStockArea : false}
                  className="w-full rounded-xl border border-gray-200 bg-[#f8f8f8] px-4 py-3 text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all duration-200 disabled:opacity-50"
                />
                {(cargandoSugerencias || (ubicacionOrigenStock && cargandoStockArea)) && (
                  <div className="absolute right-3 top-11 flex items-center pointer-events-none">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                )}
                {listaAbierta && sugerencias.length > 0 && (
                  <ul
                    role="listbox"
                    className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
                  >
                    {sugerencias.map((fila, idx) => (
                      <li key={`${fila.idVariante}-${fila.idUbicacionArea}`} role="option" aria-selected={idx === indiceResaltado}>
                        <button
                          type="button"
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 ${
                            idx === indiceResaltado ? "bg-gray-100" : "hover:bg-gray-50"
                          }`}
                          onMouseEnter={() => setIndiceResaltado(idx)}
                          onMouseDown={(ev) => {
                            ev.preventDefault();
                            elegirSugerencia(fila);
                          }}
                        >
                          <div className="font-semibold text-gray-900">{etiquetaProducto(fila)}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {origenEtiqueta(fila)} — stock {fila.stockActual}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {!cargandoSugerencias &&
                  !(ubicacionOrigenStock && cargandoStockArea) &&
                  listaAbierta &&
                  textoBusqueda.trim() !== "" &&
                  sugerencias.length === 0 && (
                  <p className="mt-2 text-sm text-gray-500 font-medium">Sin coincidencias.</p>
                )}
                {!cargandoSugerencias &&
                  !(ubicacionOrigenStock && cargandoStockArea) &&
                  sugerencias.length === 0 &&
                  textoBusqueda.trim() === "" && (
                  <p className="mt-2 text-xs text-gray-500 font-medium">
                    {ubicacionOrigenStock
                      ? "Escribe para filtrar o elige entre las primeras variantes con stock en el área."
                      : "Escribe para filtrar o elige entre las primeras sugerencias de Almacen."}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-3">
                  Cantidad a mover
                </label>
                <input
                  type="number"
                  min={1}
                  max={stockMaximo > 0 ? stockMaximo : undefined}
                  value={cantidad}
                  onChange={(e) => setCantidad(Math.max(0, Number(e.target.value || 0)))}
                  disabled={!filaSeleccionada}
                  className="w-full rounded-xl border-transparent bg-[#f8f8f8] px-4 py-3 text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all duration-200 disabled:opacity-50"
                />
                {filaSeleccionada && (
                  <p className="text-xs text-gray-500 mt-2 font-medium">
                    Disponible en <span className="font-bold text-gray-900">{origenEtiqueta(filaSeleccionada)}</span>:{" "}
                    <span className="font-bold text-gray-900">{stockMaximo}</span>
                  </p>
                )}
                {!filaSeleccionada && sugerencias.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2 font-medium">
                    Selecciona una sugerencia de la lista (clic o teclado).
                  </p>
                )}
                {!filaSeleccionada &&
                  !cargandoSugerencias &&
                  !(ubicacionOrigenStock && cargandoStockArea) &&
                  sugerencias.length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-2 font-medium">
                    <PackageSearch className="h-4 w-4" />
                    {mensajeSinStock}
                  </div>
                )}
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="flex-shrink-0">⚠️</span>
              {error}
            </div>
          )}
        </div>

        <footer className="px-8 py-5 border-t border-gray-100 flex justify-end gap-3 bg-[#fafafa] rounded-b-2xl">
          <button
            type="button"
            onClick={onCerrar}
            disabled={enviando}
            className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-black transition-colors duration-200"
          >
            Cancelar
          </button>

          {mostrarPasoDestino ? (
            <button
              type="button"
              onClick={confirmarDestinoPaso1}
              disabled={!puedeContinuarPaso1}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-black rounded-xl hover:bg-gray-800 transition-all duration-200 shadow-sm disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              <ArrowRight className="h-4 w-4" />
              Continuar
            </button>
          ) : (
            <button
              type="button"
              onClick={confirmar}
              disabled={!puedeEnviar}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-black rounded-xl hover:bg-gray-800 transition-all duration-200 shadow-sm disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {enviando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              Confirmar traslado
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};

export default MoverMercaderiaModal;

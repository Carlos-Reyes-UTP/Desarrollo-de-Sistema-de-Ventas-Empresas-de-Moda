import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { MaterialIcon, ModalPortal, useModalBodyScrollLock } from "@/shared/ui";
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

/** Evita cargar o listar todo el inventario al abrir el modal. */
const MIN_CARACTERES_BUSQUEDA = 2;
const DEBOUNCE_BUSQUEDA_MS = 350;
const LIMITE_SUGERENCIAS = 30;

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
  const [comboAbierto, setComboAbierto] = useState(false);

  const botonDestinoRef = useRef<HTMLButtonElement>(null);
  const inputSugerenciasRef = useRef<HTMLInputElement>(null);

  const [stockAreaCompleto, setStockAreaCompleto] = useState<StockUbicacion[]>([]);
  const [cargandoStockArea, setCargandoStockArea] = useState(false);

  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [sugerencias, setSugerencias] = useState<StockUbicacion[]>([]);
  const [filaSeleccionada, setFilaSeleccionada] = useState<StockUbicacion | null>(null);
  const [listaAbierta, setListaAbierta] = useState(false);
  const [indiceResaltado, setIndiceResaltado] = useState(0);
  const [cargandoSugerencias, setCargandoSugerencias] = useState(false);
  const [cantidad, setCantidad] = useState<number | "">("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const { acceso: accesoAreaAlmacen } = useAccesoAreaAlmacen(abierto);

  /** Destino elegido en el combo (se confirma al seleccionar en la lista). */
  const destinoActivo = useMemo(() => {
    if (destinoEfectivo) return destinoEfectivo;
    if (idDestinoPaso1 === "") return null;
    return destinosDisponibles.find((u) => u.idUbicacionArea === idDestinoPaso1) ?? null;
  }, [destinoEfectivo, idDestinoPaso1, destinosDisponibles]);

  const terminoBusqueda = textoBusqueda.trim();
  const productoYaSeleccionado =
    filaSeleccionada != null && textoBusqueda === etiquetaProducto(filaSeleccionada);
  const debeBuscarProductos =
    terminoBusqueda.length >= MIN_CARACTERES_BUSQUEDA && !productoYaSeleccionado;

  const resetFormularioTraslado = useCallback(() => {
    setError(null);
    setTextoBusqueda("");
    setSugerencias([]);
    setFilaSeleccionada(null);
    setListaAbierta(false);
    setIndiceResaltado(0);
    setCantidad("");
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  // Bloqueo de scroll en móviles cuando está activo el autocompletado
  useEffect(() => {
    if (listaAbierta && sugerencias.length > 0 && window.innerWidth < 640) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [listaAbierta, sugerencias.length]);

  useEffect(() => {
    if (!abierto) {
      setDestinoEfectivo(null);
      setDestinosDisponibles([]);
      setIdDestinoPaso1("");
      setStockAreaCompleto([]);
      setComboAbierto(false);
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
      if (accesoAreaAlmacen?.restriccionTrasladoMismaAreaCatalogo) {
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
    if (!abierto || !ubicacionOrigenStock || !destinoActivo) {
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
  }, [abierto, ubicacionOrigenStock?.idUbicacionArea, destinoActivo?.idUbicacionArea]);

  useEffect(() => {
    if (!abierto || !destinoActivo || ubicacionOrigenStock) {
      return;
    }

    if (!debeBuscarProductos) {
      abortRef.current?.abort();
      abortRef.current = null;
      setCargandoSugerencias(false);
      setSugerencias([]);
      setListaAbierta(false);
      return;
    }

    const t = window.setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setCargandoSugerencias(true);
      setError(null);
      const sectorBusqueda = accesoAreaAlmacen?.restriccionTrasladoMismaAreaCatalogo
        ? accesoAreaAlmacen.sectoresVisibles[0]
        : undefined;
      AlmacenService.buscarStockOrigenTraslado(
        terminoBusqueda,
        LIMITE_SUGERENCIAS,
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
          setListaAbierta(false);
        })
        .finally(() => {
          if (!ctrl.signal.aborted) {
            setCargandoSugerencias(false);
          }
        });
    }, DEBOUNCE_BUSQUEDA_MS);

    return () => {
      window.clearTimeout(t);
      abortRef.current?.abort();
    };
  }, [
    abierto,
    destinoActivo,
    ubicacionOrigenStock,
    terminoBusqueda,
    debeBuscarProductos,
    accesoAreaAlmacen,
  ]);

  useEffect(() => {
    if (!abierto || !destinoActivo || !ubicacionOrigenStock) {
      return;
    }

    if (!debeBuscarProductos) {
      setCargandoSugerencias(false);
      setSugerencias([]);
      setListaAbierta(false);
      return;
    }

    const t = window.setTimeout(() => {
      setCargandoSugerencias(true);
      const q = terminoBusqueda.toLowerCase();
      const filtered = stockAreaCompleto
        .filter((fila) => {
          const fields = [fila.nombreProducto, fila.codigoIdentificacion, fila.sku, fila.color, fila.talla].map((x) =>
            (x ?? "").toLowerCase()
          );
          return fields.some((f) => f.includes(q));
        })
        .slice(0, LIMITE_SUGERENCIAS);
      setSugerencias(filtered);
      setIndiceResaltado(0);
      setListaAbierta(true);
      setCargandoSugerencias(false);
    }, DEBOUNCE_BUSQUEDA_MS);

    return () => window.clearTimeout(t);
  }, [
    abierto,
    destinoActivo?.idUbicacionArea,
    ubicacionOrigenStock,
    terminoBusqueda,
    debeBuscarProductos,
    stockAreaCompleto,
  ]);

  useEffect(() => {
    if (textoBusqueda !== (filaSeleccionada ? etiquetaProducto(filaSeleccionada) : "")) {
      setFilaSeleccionada(null);
    }
  }, [textoBusqueda, filaSeleccionada]);

  const stockMaximo = filaSeleccionada?.stockActual ?? 0;
  const numCantidad = Number(cantidad) || 0;

  const puedeEnviar =
    !!destinoActivo &&
    !!filaSeleccionada?.idUbicacionArea &&
    !!filaSeleccionada.idVariante &&
    numCantidad > 0 &&
    numCantidad <= stockMaximo &&
    !enviando;

  const aplicarDestinoSeleccionado = (u: UbicacionArea) => {
    setIdDestinoPaso1(u.idUbicacionArea);
    setDestinoEfectivo(u);
    setComboAbierto(false);
    setStockAreaCompleto([]);
    resetFormularioTraslado();
  };

  const elegirSugerencia = (fila: StockUbicacion) => {
    setFilaSeleccionada(fila);
    setTextoBusqueda(etiquetaProducto(fila));
    setListaAbierta(false);
    setCantidad("");
  };

  const confirmar = async () => {
    if (!puedeEnviar || !destinoActivo || !filaSeleccionada) return;
    setEnviando(true);
    setError(null);
    try {
      await AlmacenService.moverMercaderia({
        idVariante: filaSeleccionada.idVariante,
        idUbicacionAreaOrigen: filaSeleccionada.idUbicacionArea,
        idUbicacionAreaDestino: destinoActivo.idUbicacionArea,
        cantidad: numCantidad,
      });
      onExito();
      onCerrar();
    } catch (err: any) {
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

  const tituloOrigenArea = ubicacionOrigenStock ? formatoUbicacion(ubicacionOrigenStock) : "Almacén Principal";

  const destinoDisplay = destinoActivo
    ? formatoUbicacion(destinoActivo)
    : "Seleccionar Destino";

  useModalBodyScrollLock(abierto);

  if (!abierto) {
    return null;
  }

  return (
    <ModalPortal>
    <div className="app-modal-overlay fixed inset-0 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
      {/* Backdrop de cierre */}
      <div className="absolute inset-0 -z-10" onClick={onCerrar} />

      <div
        className="app-modal-panel w-full border border-transparent dark:border-gray-800/40 shadow-2xl transition-all duration-300 ease-out rounded-t-3xl sm:rounded-3xl max-h-[94dvh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-scaleIn max-w-lg sm:mx-auto"
      >
        <header className="flex items-start justify-between gap-3 px-4 pt-6 pb-2 sm:px-8 sm:pt-8 sm:pb-3 shrink-0 bg-[var(--app-surface)]">
          <div className="min-w-0 pr-2">
            <h2 className="text-xl sm:text-2xl font-bold app-heading">Transferir Stock</h2>
            <p className="text-xs sm:text-sm app-text-muted mt-1 font-medium">
              Traslado de mercadería entre ubicaciones internas.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="p-2 rounded-full app-text-faint hover:app-heading hover:bg-[var(--app-hover-overlay)] transition-colors"
            aria-label="Cerrar"
          >
            <MaterialIcon icon="close" className="h-5 w-5" />
          </button>
        </header>

        <div 
          className="p-4 sm:p-8 space-y-5 sm:space-y-6 overflow-y-auto flex-1 overscroll-contain"
          onScroll={() => {
            if (comboAbierto) setComboAbierto(false);
            if (listaAbierta) setListaAbierta(false);
          }}
        >
          {/* Fila de Origen y Destino */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold app-heading mb-2">
                Origen
              </label>
              <div className="w-full flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-input)] px-4 py-3 text-sm font-medium app-text-muted">
                <span className="truncate">
                  {tituloOrigenArea}
                </span>
                <MaterialIcon icon="arrow_drop_down" className="h-4 w-4 app-text-faint" />
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs font-bold app-heading mb-2">
                Destino
              </label>
              <>
                <button
                  ref={botonDestinoRef}
                  type="button"
                  onClick={() => {
                    if (!comboAbierto) {
                      setComboAbierto(true);
                    } else {
                      setComboAbierto(false);
                    }
                  }}
                  disabled={cargandoDestinos}
                  className="w-full flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm font-medium app-heading hover:border-[var(--app-border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--app-ring)] transition-all duration-200"
                >
                  <span className="truncate">
                    {cargandoDestinos ? "Cargando..." : destinoDisplay}
                  </span>
                  <MaterialIcon icon="arrow_drop_down" className="h-4 w-4 app-text-faint" />
                </button>
                {comboAbierto && !cargandoDestinos && (
                  <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] py-1 shadow-lg animate-fadeIn">
                    {destinosDisponibles.map((u) => (
                        <li key={u.idUbicacionArea}>
                          <button
                            type="button"
                            onClick={() => aplicarDestinoSeleccionado(u)}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 ${
                              destinoActivo?.idUbicacionArea === u.idUbicacionArea
                                ? "bg-[var(--app-surface-elevated)] app-heading font-bold"
                                : "hover:bg-[var(--app-hover-overlay)] app-text-muted font-medium"
                            }`}
                          >
                            {formatoUbicacion(u)}
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </>
            </div>
          </div>

          <div className="pt-4">
            <label
              htmlFor="busqueda-traslado-producto"
              className="block text-xs font-bold app-heading mb-2"
            >
              Producto
            </label>
            <div className="relative">
              <MaterialIcon icon="search" className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 app-text-faint" />
              <input
                ref={inputSugerenciasRef}
                id="busqueda-traslado-producto"
                type="text"
                autoComplete="off"
                value={textoBusqueda}
                onChange={(e) => {
                  setTextoBusqueda(e.target.value);
                  if (e.target.value.trim().length < MIN_CARACTERES_BUSQUEDA) {
                    setListaAbierta(false);
                    setSugerencias([]);
                  }
                }}
                onFocus={() => {
                  if (debeBuscarProductos && sugerencias.length > 0) {
                    setListaAbierta(true);
                  }
                }}
                onBlur={() => {
                  window.setTimeout(() => setListaAbierta(false), 200);
                }}
                onKeyDown={onKeyDownBusqueda}
                placeholder={`Escriba al menos ${MIN_CARACTERES_BUSQUEDA} caracteres (SKU, código o nombre)`}
                disabled={(ubicacionOrigenStock ? cargandoStockArea : false) || !destinoActivo}
                className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-input)] pl-11 pr-4 py-3 text-sm font-medium app-heading placeholder:text-[var(--app-text-faint)] focus:border-[var(--app-border-strong)] focus:ring-0 transition-all duration-200 disabled:opacity-50 disabled:bg-[var(--app-bg-muted)]"
              />
              {(cargandoSugerencias || (ubicacionOrigenStock && cargandoStockArea)) && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                  <MaterialIcon icon="progress_activity" className="h-4 w-4 animate-spin app-text-faint" />
                </div>
              )}

              {listaAbierta &&
                destinoActivo &&
                debeBuscarProductos &&
                !cargandoSugerencias &&
                !(ubicacionOrigenStock && cargandoStockArea) &&
                sugerencias.length === 0 && (
                  <p className="absolute z-20 mt-1 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm app-text-muted shadow-lg">
                    No hay productos con stock que coincidan con la búsqueda.
                  </p>
                )}

              {listaAbierta && sugerencias.length > 0 && (
                <ul
                  role="listbox"
                  className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] py-1 shadow-xl animate-fadeIn"
                >
                  {sugerencias.map((fila, idx) => (
                    <li key={`${fila.idVariante}-${fila.idUbicacionArea}`} role="option" aria-selected={idx === indiceResaltado}>
                      <button
                        type="button"
                        className={`w-full text-left px-5 py-3 text-sm transition-colors duration-150 flex flex-col justify-center min-h-[48px] ${
                          idx === indiceResaltado ? "bg-[var(--app-surface-elevated)] app-heading" : "hover:bg-[var(--app-hover-overlay)] app-text-muted"
                        }`}
                        onMouseEnter={() => setIndiceResaltado(idx)}
                        onMouseDown={(ev) => {
                          ev.preventDefault();
                          elegirSugerencia(fila);
                        }}
                      >
                        <div className="font-semibold app-heading leading-tight">{etiquetaProducto(fila)}</div>
                        <div className="text-xs app-text-faint mt-1 font-medium">
                          {origenEtiqueta(fila)} — stock <span className="font-mono font-bold app-heading">{fila.stockActual}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                  </ul>
              )}
            </div>
            {!destinoActivo && (
              <p className="mt-2 text-xs app-text-faint font-medium">Seleccione primero un destino.</p>
            )}
            {destinoActivo && !productoYaSeleccionado && terminoBusqueda.length < MIN_CARACTERES_BUSQUEDA && (
              <p className="mt-2 text-xs app-text-faint font-medium">
                Escriba al menos {MIN_CARACTERES_BUSQUEDA} caracteres para buscar en el inventario (máx.{" "}
                {LIMITE_SUGERENCIAS} resultados).
              </p>
            )}
            {destinoActivo && productoYaSeleccionado && (
              <p className="mt-2 text-xs app-text-faint font-medium">
                Borre el texto del producto para buscar otro artículo.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold app-heading mb-2">
              Cantidad a Transferir
            </label>
            <div className="relative w-full sm:w-1/2">
              <input
                type="number"
                min={1}
                max={stockMaximo > 0 ? stockMaximo : undefined}
                value={cantidad}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") setCantidad("");
                  else setCantidad(Math.max(0, Number(val)));
                }}
                disabled={!filaSeleccionada}
                className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-input)] px-4 py-3 text-sm font-semibold app-heading text-center focus:border-[var(--app-border-strong)] focus:ring-0 transition-all duration-200 disabled:opacity-50 disabled:bg-[var(--app-bg-muted)] pr-12"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold app-text-muted">
                Uds.
              </span>
            </div>
            {filaSeleccionada && (
              <p className="text-xs app-text-muted mt-2 font-medium">
                Stock disponible: <span className="font-mono font-bold app-heading">{stockMaximo}</span>
              </p>
            )}
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="flex-shrink-0">⚠️</span>
              {error}
            </div>
          )}
        </div>

        <footer className="px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8 sm:pb-8 flex flex-col-reverse sm:flex-row justify-stretch sm:justify-end items-stretch sm:items-center gap-2 sm:gap-4 bg-[var(--app-surface)] shrink-0">
          <button
            type="button"
            onClick={onCerrar}
            disabled={enviando}
            className="min-h-11 w-full sm:w-auto px-6 py-2.5 text-sm font-bold app-text-muted hover:app-heading transition-colors touch-manipulation"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={confirmar}
            disabled={!puedeEnviar || !destinoActivo}
            className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 px-8 py-2.5 text-sm font-bold text-[var(--app-accent-fg)] bg-[var(--app-accent)] rounded-xl hover:opacity-90 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] touch-manipulation"
          >
            {enviando && <MaterialIcon icon="progress_activity" className="h-4 w-4 animate-spin" />}
            Confirmar Traslado
          </button>
        </footer>
      </div>
    </div>
    </ModalPortal>
  );
};

export default MoverMercaderiaModal;

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { MaterialIcon, ModalPortal, useModalBodyScrollLock } from "@/shared/ui";
import axios from "axios";
import { AlmacenService } from "@/services/AlmacenService";
import { useAccesoAreaAlmacen } from "@/hooks/useAccesoAreaAlmacen";
import type { StockUbicacion, UbicacionArea } from "@/types/Almacen";

interface MoverMercaderiaModalProps {
  abierto: boolean;
  modoDestinoLibre?: boolean;
  ubicacionOrigenStock?: UbicacionArea | null;
  onCerrar: () => void;
  onExito: () => void;
}

interface ItemCarrito {
  variante: StockUbicacion;
  cantidad: number;
  error?: 'sin_stock' | 'stock_insuficiente' | null;
}

const formatoUbicacion = (u: Pick<UbicacionArea, "nombre" | "area">) =>
  u.area ? `${u.nombre} · ${u.area}` : u.nombre;

const origenEtiqueta = (v: StockUbicacion) =>
  v.areaUbicacion ? `${v.nombreUbicacion} · ${v.areaUbicacion}` : v.nombreUbicacion;

const etiquetaProducto = (v: StockUbicacion) =>
  `${v.nombreProducto ?? "Producto"} · ${v.color ?? "-"} / ${v.talla ?? "-"}`;

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
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [itemsTraslado, setItemsTraslado] = useState<ItemCarrito[]>([]);
  const [errorAgregar, setErrorAgregar] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const { acceso: accesoAreaAlmacen } = useAccesoAreaAlmacen(abierto);

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
    setErrorAgregar(null);
    setTextoBusqueda("");
    setSugerencias([]);
    setFilaSeleccionada(null);
    setListaAbierta(false);
    setIndiceResaltado(0);
    setCantidad("");
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

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
      setItemsTraslado([]);
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
      setErrorAgregar(null);
    }
  }, [textoBusqueda, filaSeleccionada]);

  const stockMaximo = filaSeleccionada?.stockActual ?? 0;
  const numCantidad = Number(cantidad) || 0;

  const puedeAgregar =
    !!destinoActivo &&
    !!filaSeleccionada?.idUbicacionArea &&
    !!filaSeleccionada.idVariante &&
    numCantidad > 0 &&
    numCantidad <= stockMaximo &&
    stockMaximo > 0 &&
    !enviando;

  const puedeEnviarMasivo =
    !!destinoActivo &&
    itemsTraslado.length > 0 &&
    itemsTraslado.every((i) => !i.error) &&
    !enviando;

  const aplicarDestinoSeleccionado = (u: UbicacionArea) => {
    setIdDestinoPaso1(u.idUbicacionArea);
    setDestinoEfectivo(u);
    setComboAbierto(false);
    setStockAreaCompleto([]);
    setItemsTraslado([]);
    resetFormularioTraslado();
  };

  const elegirSugerencia = (fila: StockUbicacion) => {
    setFilaSeleccionada(fila);
    setTextoBusqueda(etiquetaProducto(fila));
    setListaAbierta(false);
    setCantidad("");
    setErrorAgregar(null);
  };

  const handleAgregarItem = () => {
    if (!puedeAgregar || !filaSeleccionada) return;

    if (stockMaximo <= 0) {
      setErrorAgregar("No hay existencias de este producto.");
      return;
    }
    if (numCantidad > stockMaximo) {
      setErrorAgregar(`Stock insuficiente. Disponible: ${stockMaximo} uds.`);
      return;
    }

    const existe = itemsTraslado.some(
      (i) => i.variante.idVariante === filaSeleccionada.idVariante
    );
    if (existe) {
      setErrorAgregar("Este producto ya está en la lista. Quítelo primero si desea cambiar la cantidad.");
      return;
    }

    setItemsTraslado((prev) => [
      ...prev,
      { variante: filaSeleccionada, cantidad: numCantidad, error: null },
    ]);

    setErrorAgregar(null);
    setFilaSeleccionada(null);
    setTextoBusqueda("");
    setCantidad("");
    inputSugerenciasRef.current?.focus();
  };

  const handleQuitarItem = (idx: number) => {
    setItemsTraslado((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEditarCantidad = (idx: number, nuevaCantidad: number, skipClamp?: boolean) => {
    setItemsTraslado((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const stock = item.variante.stockActual;
        const cantidadFinal = skipClamp ? nuevaCantidad : Math.min(nuevaCantidad, stock);
        if (cantidadFinal > stock) {
          return { ...item, cantidad: cantidadFinal, error: 'stock_insuficiente' };
        }
        return { ...item, cantidad: cantidadFinal, error: null };
      })
    );
  };

  const confirmar = () => {
    if (!puedeEnviarMasivo || !destinoActivo || itemsTraslado.length === 0) return;
    setConfirmando(true);
  };

  const ejecutar = async () => {
    if (!destinoActivo || itemsTraslado.length === 0) return;

    setEnviando(true);
    setError(null);

    try {
      const origenId = itemsTraslado[0].variante.idUbicacionArea;
      const stockFrescoTotal = await AlmacenService.stockPorUbicacionArea(origenId).then(
        (data) => {
          const arr = Array.isArray(data) ? data : [];
          const map = new Map<number, number>();
          arr.forEach((s) => map.set(s.idVariante, s.stockActual));
          return map;
        },
        () => null
      );

      const itemsActualizados = itemsTraslado.map((item) => {
        const stockFresco = stockFrescoTotal?.get(item.variante.idVariante) ?? item.variante.stockActual;
        if (stockFresco <= 0) return { ...item, error: 'sin_stock' as const };
        if (item.cantidad > stockFresco) return { ...item, error: 'stock_insuficiente' as const };
        return item;
      });

      const hayError = itemsActualizados.some((i) => i.error);
      if (hayError) {
        setItemsTraslado(itemsActualizados);
        setError("Corrija los productos marcados antes de confirmar.");
        setConfirmando(false);
        setEnviando(false);
        return;
      }

      await AlmacenService.moverMercaderiaMasiva({
        idUbicacionAreaOrigen: origenId,
        idUbicacionAreaDestino: destinoActivo.idUbicacionArea,
        items: itemsTraslado.map((i) => ({
          idVariante: i.variante.idVariante,
          cantidad: i.cantidad,
        })),
      });

      onExito();
      onCerrar();
    } catch (err: any) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudieron registrar los traslados. Revise los valores e intente de nuevo.";
      setError(message);
      setConfirmando(false);
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

  useEffect(() => {
    if (itemsTraslado.length === 0) {
      setConfirmando(false);
    }
  }, [itemsTraslado]);

  useEffect(() => {
    if (!abierto) {
      setConfirmando(false);
      setError(null);
    }
  }, [abierto]);

  if (!abierto) {
    return null;
  }

  return (
    <ModalPortal>
    <div className="app-modal-overlay fixed inset-0 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
      <div className="absolute inset-0 -z-10" onClick={onCerrar} />

      <div
        className="app-modal-panel w-full border border-transparent dark:border-gray-800/40 shadow-2xl transition-all duration-300 ease-out rounded-t-3xl sm:rounded-3xl max-h-[94dvh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-scaleIn max-w-xl sm:mx-auto"
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
          {/* Origen y Destino */}
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
                  onClick={() => setComboAbierto((v) => !v)}
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

          {/* Buscador y cantidad */}
          <div>
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
                  if (e.target.value.trim() === "") {
                    setCantidad("");
                  }
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
                        <div className="text-xs app-text-faint mt-1 font-medium flex items-center gap-2">
                          <span>{origenEtiqueta(fila)}</span>
                          <span className="font-mono font-bold app-heading">
                            stock {fila.stockActual}
                          </span>
                          {fila.stockActual <= 0 && (
                            <span className="text-rose-600 font-bold">⛔ Sin stock</span>
                          )}
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
          </div>

          {/* Cantidad + botón Agregar */}
          <label className="block text-xs font-bold app-heading mb-2">
            Cantidad a Transferir
          </label>
          <div className="flex gap-3 items-stretch">
            <div className="relative flex-1">
              <input
                type="number"
                min={1}
                max={stockMaximo > 0 ? stockMaximo : undefined}
                value={cantidad}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") setCantidad("");
                  else setCantidad(Math.max(0, Number(val)));
                  setErrorAgregar(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAgregarItem();
                  }
                }}
                disabled={!filaSeleccionada}
                className="w-full h-full rounded-xl border border-[var(--app-border)] bg-[var(--app-input)] px-4 py-3 text-sm font-semibold app-heading text-center focus:border-[var(--app-border-strong)] focus:ring-0 transition-all duration-200 disabled:opacity-50 disabled:bg-[var(--app-bg-muted)] pr-12"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold app-text-muted">
                Uds.
              </span>
            </div>
            <button
              type="button"
              onClick={handleAgregarItem}
              disabled={!puedeAgregar}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 px-5 text-sm font-bold text-[var(--app-accent-fg)] bg-[var(--app-accent)] rounded-xl hover:opacity-90 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              title="Agregar producto a la lista de traslado"
            >
              <MaterialIcon icon="add" className="h-4 w-4" />
              Agregar
            </button>
          </div>
          <div className="h-5">
            {filaSeleccionada && (
              <p className="text-xs app-text-muted font-medium leading-5">
                Stock disponible: <span className="font-mono font-bold app-heading">{stockMaximo}</span>
              </p>
            )}
            {filaSeleccionada && numCantidad > stockMaximo && (
              <p className="text-xs text-rose-600 font-semibold leading-5">
                Stock insuficiente. Máximo disponible: {stockMaximo} uds.
              </p>
            )}
          </div>
          {errorAgregar && (
            <p className="text-xs text-rose-600 font-semibold mt-1">{errorAgregar}</p>
          )}

          {filaSeleccionada && stockMaximo <= 0 && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold rounded-xl px-4 py-3">
              Este producto no tiene existencias disponibles para trasladar.
            </div>
          )}

          {/* Carrito: Lista de productos a trasladar */}
          {itemsTraslado.length > 0 && (
            <div className="border border-[var(--app-border)] rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider app-text-muted flex items-center justify-between">
                <span>Productos a trasladar ({itemsTraslado.length})</span>
                <span className="text-[10px] font-mono app-text-faint">
                  {itemsTraslado.reduce((s, i) => s + i.cantidad, 0)} uds. totales
                </span>
              </h4>
              <div className="divide-y divide-[var(--app-border)] max-h-52 overflow-y-auto">
                {itemsTraslado.map((item, idx) => (
                  <div
                    key={`${item.variante.idVariante}-${idx}`}
                    className={`flex items-center gap-3 py-2.5 ${
                      item.error ? 'bg-rose-50/50 -mx-2 px-2 rounded-lg' : ''
                    }`}
                  >
                    <span className="text-xs font-mono app-text-faint w-5 shrink-0 text-center">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold app-heading truncate">
                        {etiquetaProducto(item.variante)}
                      </p>
                      <p className="text-xs app-text-muted">
                        Stock: {item.variante.stockActual} uds.
                      </p>
                    </div>
                    <div className="shrink-0">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={item.cantidad}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === "" || /^\d+$/.test(raw)) {
                            handleEditarCantidad(idx, raw === "" ? 0 : parseInt(raw, 10), true);
                          }
                        }}
                        onBlur={() => {
                          handleEditarCantidad(idx, Math.max(1, Math.min(item.cantidad, item.variante.stockActual)));
                        }}
                        className="w-16 text-center text-sm font-bold font-mono app-heading rounded-lg border border-[var(--app-border)] bg-[var(--app-input)] px-2 py-1"
                      />
                      <span className="text-xs app-text-faint ml-1">uds.</span>
                    </div>
                    {item.error === 'sin_stock' && (
                      <span className="text-xs text-rose-600 font-semibold whitespace-nowrap">
                        ⛔ Sin stock
                      </span>
                    )}
                    {item.error === 'stock_insuficiente' && (
                      <span className="text-xs text-rose-600 font-semibold whitespace-nowrap">
                        ⚠️ Stock insuf.
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleQuitarItem(idx)}
                      className="p-1.5 rounded-full hover:bg-rose-100 text-rose-400 hover:text-rose-600 transition-colors shrink-0"
                      aria-label="Quitar producto"
                    >
                      <MaterialIcon icon="close" className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold rounded-xl px-4 py-3">
              {error}
            </div>
          )}
        </div>

        <footer className="px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8 sm:pb-8 flex flex-col-reverse sm:flex-row justify-stretch sm:justify-end items-stretch sm:items-center gap-2 sm:gap-4 bg-[var(--app-surface)] shrink-0">
          {confirmando ? (
            <>
              <p className="flex-1 text-xs sm:text-sm app-text-muted text-center sm:text-left min-w-0">
                ¿Está seguro de realizar esta operación?
              </p>
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                disabled={enviando}
                className="min-h-11 w-full sm:w-auto px-6 py-2.5 text-sm font-bold app-text-muted hover:app-heading transition-colors touch-manipulation"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={ejecutar}
                disabled={enviando}
                className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 px-8 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl hover:opacity-90 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] touch-manipulation"
              >
                {enviando && <MaterialIcon icon="progress_activity" className="h-4 w-4 animate-spin" />}
                Sí, realizar traslado
              </button>
            </>
          ) : (
            <>
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
                disabled={!puedeEnviarMasivo}
                className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 px-8 py-2.5 text-sm font-bold text-[var(--app-accent-fg)] bg-[var(--app-accent)] rounded-xl hover:opacity-90 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] touch-manipulation"
              >
                {enviando && <MaterialIcon icon="progress_activity" className="h-4 w-4 animate-spin" />}
                Confirmar Traslado
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
    </ModalPortal>
  );
};

export default MoverMercaderiaModal;

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { useBandeja } from "../../context/BandejaSolicitudContext";
import { VendedorService } from "../../services/VendedorService";
import type {
  VendedorCatalogoPorCodigo,
  VendedorSolicitudResumen,
  VendedorUbicacion,
  VendedorVarianteCoincidencia,
  VendedorVarianteStock,
} from "../../types/Vendedor";
import { BarcodeScannerModal } from "../../components/vendedor-piso/BarcodeScannerModal";
import { BandejaSolicitudSheet } from "../../components/vendedor-piso/BandejaSolicitudSheet";
import { BandejaFAB } from "../../components/vendedor-piso/BandejaFAB";
import {
  VendedorPisoPedidosDock,
  type VendedorAlmacenActualizacion,
} from "../../components/vendedor-piso/VendedorPisoPedidosDock";
import {
  VendedorToastStack,
  type VendedorToastInfo,
} from "../../components/vendedor-piso/VendedorToastStack";
import { SearchResultSkeleton, MaterialIcon } from "@/shared/ui";
import { BorderBeam } from "border-beam";
import {
  esPeticionCancelada,
  mensajeErrorBusquedaCatalogo,
} from "@/utils/apiErrors";

function stockDisponibleVariante(v: VendedorVarianteStock): number {
  if (typeof v.stockDisponible === "number") {
    return Math.max(0, v.stockDisponible);
  }
  return Math.max(0, v.stockAlmacen - (v.stockReservado ?? 0));
}

function elegirVarianteInicial(data: VendedorCatalogoPorCodigo): number | null {
  const pre = data.idVariantePreseleccionada;
  if (pre != null) {
    const v = data.variantes.find((x) => x.idProductoVariante === pre);
    if (v && stockDisponibleVariante(v) > 0) {
      return pre;
    }
  }
  const primera = data.variantes.find((x) => stockDisponibleVariante(x) > 0);
  return primera?.idProductoVariante ?? null;
}

const VendedorPisoVentasPage = () => {
  const { usuario } = useAuth();
  const { agregar, items: bandejaItems } = useBandeja();
  const [codigo, setCodigo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [catalogo, setCatalogo] = useState<VendedorCatalogoPorCodigo | null>(
    null
  );
  const [coincidencias, setCoincidencias] = useState<VendedorVarianteCoincidencia[]>(
    []
  );
  const [idVariante, setIdVariante] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [toasts, setToasts] = useState<VendedorToastInfo[]>([]);

  const agregarToast = useCallback((toast: Omit<VendedorToastInfo, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const eliminarToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setErrorToast = useCallback((msg: string | null) => {
    if (msg) {
      agregarToast({
        tipo: "error",
        titulo: "Atención",
        mensaje: msg,
        autoDismissMs: 5000,
      });
    }
  }, [agregarToast]);

  const [scannerAbierto, setScannerAbierto] = useState(false);
  const [sheetAbierto, setSheetAbierto] = useState(false);
  const [pedidos, setPedidos] = useState<VendedorSolicitudResumen[]>([]);
  const [pedidosRefrescandoManual, setPedidosRefrescandoManual] = useState(false);
  const [cancelandoSolicitudId, setCancelandoSolicitudId] = useState<number | null>(null);
  const [estaEnfocado, setEstaEnfocado] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // --- Área destino: se auto-detecta desde la variante seleccionada ---
  const [ubicaciones, setUbicaciones] = useState<VendedorUbicacion[]>([]);
  const [idUbicacionAreaDestino, setIdUbicacionAreaDestino] = useState<number | null>(null);
  const [nombreUbicacionDestino, setNombreUbicacionDestino] = useState<string | null>(null);

  const topRef = useRef<HTMLDivElement>(null);
  const variantesRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    const main = document.querySelector('main');
    if (main) {
      main.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const scrollToVariantes = useCallback(() => {
    // Solo auto-scroll en móviles (donde el detalle está debajo)
    if (window.innerWidth >= 768) return;

    setTimeout(() => {
      variantesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  useEffect(() => {
    if (!topRef.current) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Si el buscador NO es visible, mostramos el botón de subir
        setShowScrollTop(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(topRef.current);
    return () => observer.disconnect();
  }, []);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busquedaSeqRef = useRef(0);

  const varianteSeleccionada: VendedorVarianteStock | null = useMemo(() => {
    if (!catalogo || idVariante == null) return null;
    return (
      catalogo.variantes.find((v) => v.idProductoVariante === idVariante) ??
      null
    );
  }, [catalogo, idVariante]);

  const enBandejaVariante = useMemo(() => {
    if (idVariante == null || idUbicacionAreaDestino == null) return 0;
    const key = `${idVariante}-${idUbicacionAreaDestino}`;
    return bandejaItems.find((i) => i.key === key)?.cantidad ?? 0;
  }, [bandejaItems, idVariante, idUbicacionAreaDestino]);

  const stockDisponible = useMemo(() => {
    const base = varianteSeleccionada ? stockDisponibleVariante(varianteSeleccionada) : 0;
    return Math.max(0, base - enBandejaVariante);
  }, [varianteSeleccionada, enBandejaVariante]);

  const stockReservado = varianteSeleccionada?.stockReservado ?? 0;
  const stockFisico = varianteSeleccionada?.stockAlmacen ?? 0;

  const cargarPedidos = useCallback(async (opts?: { manual?: boolean }) => {
    if (opts?.manual) {
      setPedidosRefrescandoManual(true);
    }
    try {
      const lista = await VendedorService.misSolicitudesHoy();
      setPedidos(lista);
    } catch {
      /* silencioso */
    } finally {
      if (opts?.manual) {
        setPedidosRefrescandoManual(false);
      }
    }
  }, []);

  useEffect(() => {
    void cargarPedidos();
    const t = window.setInterval(() => void cargarPedidos(), 15000);
    return () => window.clearInterval(t);
  }, [cargarPedidos]);

  // Cargar ubicaciones disponibles (para el selector fallback de productos nuevos)
  useEffect(() => {
    const ac = new AbortController();
    VendedorService.listarUbicaciones(ac.signal)
      .then((lista) => setUbicaciones(lista))
      .catch(() => {/* silencioso */});
    return () => ac.abort();
  }, []);

  const limpiarAreaDestino = useCallback(() => {
    setIdUbicacionAreaDestino(null);
    setNombreUbicacionDestino(null);
  }, []);

  const aplicarAreaDesdeVariante = useCallback((v: VendedorVarianteStock | null | undefined) => {
    if (v?.idUbicacionAreaDestino != null) {
      setIdUbicacionAreaDestino(v.idUbicacionAreaDestino);
      setNombreUbicacionDestino(v.nombreUbicacion);
    } else {
      limpiarAreaDestino();
    }
  }, [limpiarAreaDestino]);

  const aplicarCatalogo = useCallback((data: VendedorCatalogoPorCodigo) => {
    setCatalogo(data);
    const inicial = elegirVarianteInicial(data);
    setIdVariante(inicial);
    setCantidad(1);
    const varianteInicial =
      inicial != null
        ? data.variantes.find((x) => x.idProductoVariante === inicial) ?? null
        : null;
    aplicarAreaDesdeVariante(varianteInicial);
    scrollToVariantes();
  }, [aplicarAreaDesdeVariante, scrollToVariantes]);

  const ejecutarBusqueda = useCallback(
    async (termino: string) => {
      const t = termino.trim();
      if (!t) {
        setCatalogo(null);
        setCoincidencias([]);
        setIdVariante(null);
        limpiarAreaDestino();
        return;
      }
      const seq = ++busquedaSeqRef.current;
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setBuscando(true);
      setErrorToast(null);
      try {
        const res = await VendedorService.buscarCatalogo(t, ac.signal);
        if (seq !== busquedaSeqRef.current) {
          return;
        }
        if (res.multiresultado && res.opciones.length > 0) {
          setCoincidencias(res.opciones);
          setCatalogo(null);
          setIdVariante(null);
          limpiarAreaDestino();
          return;
        }
        setCoincidencias([]);
        if (res.catalogo) {
          aplicarCatalogo(res.catalogo);
        } else {
          setCatalogo(null);
          setIdVariante(null);
          limpiarAreaDestino();
          setErrorToast("No se encontró el producto");
        }
      } catch (e) {
        if (esPeticionCancelada(e)) {
          return;
        }
        if (seq !== busquedaSeqRef.current) {
          return;
        }
        setCatalogo(null);
        setCoincidencias([]);
        setIdVariante(null);
        limpiarAreaDestino();
        setErrorToast(mensajeErrorBusquedaCatalogo(e));
      } finally {
        if (seq === busquedaSeqRef.current) {
          setBuscando(false);
        }
      }
    },
    [aplicarCatalogo, limpiarAreaDestino, setErrorToast]
  );

  const cancelarPedido = useCallback(
    async (idSolicitud: number) => {
      setCancelandoSolicitudId(idSolicitud);
      try {
        await VendedorService.cancelarSolicitud(idSolicitud);
        await cargarPedidos();
        agregarToast({
          tipo: "success",
          titulo: "Pedido cancelado",
          mensaje: "La reserva se liberó. Vuelve a buscar el producto para ver el stock actualizado en almacén.",
          autoDismissMs: 5000,
        });
        if (codigo.trim().length >= 2) {
          void ejecutarBusqueda(codigo);
        }
      } catch {
        setErrorToast("No se pudo cancelar el pedido. Intenta de nuevo.");
      } finally {
        setCancelandoSolicitudId(null);
      }
    },
    [agregarToast, cargarPedidos, codigo, ejecutarBusqueda, setErrorToast]
  );

  const onNuevaRespuestaAlmacen = useCallback((items: VendedorAlmacenActualizacion[]) => {
    const huboCancelacion = items.some((item) => item.estado === "CANCELADO");
    items.forEach((item) => {
      agregarToast({
        tipo: item.estado === "ATENDIDO" ? "success" : "error",
        titulo: item.estado === "ATENDIDO" ? "Pedido Listo en Almacén" : "Pedido Rechazado",
        mensaje: item.estado === "ATENDIDO"
          ? "El almacén preparó el producto y ya está disponible para retirar en el piso."
          : "La reserva de ese pedido se liberó. Si el almacén ya había despachado antes, el stock puede estar en el piso y no en almacén.",
        producto: item.nombreProducto,
        color: item.color,
        talla: item.talla,
        cantidad: item.cantidad,
        autoDismissMs: 8000,
      });
    });
    if (huboCancelacion && codigo.trim().length >= 2) {
      void ejecutarBusqueda(codigo);
    }
  }, [agregarToast, codigo, ejecutarBusqueda]);

  const seleccionarVarianteLista = useCallback(
    async (idVariante: number) => {
      const seq = ++busquedaSeqRef.current;
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setBuscando(true);
      setErrorToast(null);
      try {
        const data = await VendedorService.catalogoPorVariante(
          idVariante,
          ac.signal
        );
        if (seq !== busquedaSeqRef.current) {
          return;
        }
        setCoincidencias([]);
        aplicarCatalogo(data);
      } catch (e) {
        if (esPeticionCancelada(e)) {
          return;
        }
        if (seq !== busquedaSeqRef.current) {
          return;
        }
        setErrorToast(mensajeErrorBusquedaCatalogo(e));
      } finally {
        if (seq === busquedaSeqRef.current) {
          setBuscando(false);
        }
      }
    },
    [aplicarCatalogo, setErrorToast]
  );

  useEffect(() => {
    const t = codigo.trim();
    if (t.length === 0) {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
      setCatalogo(null);
      setCoincidencias([]);
      setIdVariante(null);
      limpiarAreaDestino();
      return undefined;
    }
    if (t.length < 2) {
      return undefined;
    }
    debounceRef.current = window.setTimeout(() => {
      void ejecutarBusqueda(codigo);
    }, 450);
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [codigo, ejecutarBusqueda, limpiarAreaDestino]);

  useEffect(() => {
    if (stockDisponible > 0 && cantidad > stockDisponible) {
      setCantidad(stockDisponible);
    }
    if (stockDisponible === 0 && cantidad !== 1) {
      setCantidad(1);
    }
  }, [stockDisponible, cantidad]);

  /** Sincroniza chip de área cuando el catálogo ya trae destino (sin depender de un clic). */
  useEffect(() => {
    if (!varianteSeleccionada?.idUbicacionAreaDestino) {
      return;
    }
    setIdUbicacionAreaDestino(varianteSeleccionada.idUbicacionAreaDestino);
    setNombreUbicacionDestino(varianteSeleccionada.nombreUbicacion);
  }, [varianteSeleccionada]);

  /** Selecciona una variante y auto-detecta su área destino desde el catálogo. */
  const handleSeleccionarVariante = useCallback((v: VendedorVarianteStock) => {
    setIdVariante(v.idProductoVariante);
    setCantidad(1);
    aplicarAreaDesdeVariante(v);
  }, [aplicarAreaDesdeVariante]);

  const onEscanear = useCallback(
    (text: string) => {
      setCodigo(text);
      void ejecutarBusqueda(text);
    },
    [ejecutarBusqueda]
  );

  /** Agrega el ítem actual a la bandeja en memoria (no llama a la API). */
  const agregarALista = () => {
    if (!idVariante || !catalogo || !idUbicacionAreaDestino || !nombreUbicacionDestino) return;
    if (stockDisponible <= 0) {
      setErrorToast("Este producto no tiene stock disponible en almacén.");
      return;
    }
    const variante = catalogo.variantes.find((v) => v.idProductoVariante === idVariante);
    agregar({
      idVariante,
      cantidad: Math.min(cantidad, stockDisponible),
      idUbicacionAreaDestino,
      nombreProducto: catalogo.producto.nombre,
      talla: variante?.talla ?? "",
      color: variante?.color ?? "",
      nombreUbicacion: nombreUbicacionDestino,
    });
    // Toast de éxito
    agregarToast({
      tipo: "success",
      titulo: "Agregado a la Lista",
      mensaje: "El producto se añadió a la bandeja de envíos pendientes.",
      producto: catalogo.producto.nombre,
      color: variante?.color ?? "",
      talla: variante?.talla ?? "",
      cantidad: Math.min(cantidad, stockDisponible),
      autoDismissMs: 4000,
    });
    
    // Solo reseteamos la variante y cantidad para permitir elegir otra del MISMO producto
    setIdVariante(null);
    setCantidad(1);
    setIdUbicacionAreaDestino(null);
    setNombreUbicacionDestino(null);
    
    // NO limpiamos catalogo, coincidencias ni codigo para que el producto siga en pantalla
  };

  const precioTxt = catalogo
    ? `S/${Number(catalogo.producto.precioUnitario).toFixed(2)}`
    : "";

  return (
    <div className="relative min-h-[calc(100dvh-8.5rem)] bg-[#f8f9fa] pb-36 pt-2">
      <VendedorToastStack toasts={toasts} onDismiss={eliminarToast} />

      <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
        <div className="flex flex-col md:flex-row md:items-start gap-8 lg:gap-16">
          
          {/* Columna Izquierda: Control y Búsqueda */}
          <div ref={topRef} className="flex-1 w-full md:max-w-[420px] space-y-8">
            <header className="pt-2 animate-fadeIn">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Sesión Activa: {usuario?.usuario ?? "Vendedor"}
              </div>
              <h1 className="text-3xl font-black tracking-tight text-black sm:text-4xl">
                ¡Hola{usuario?.usuario ? `, ${usuario.usuario}` : ""}!
              </h1>
              <p className="mt-2 text-base font-medium text-gray-500 leading-relaxed">
                Busca un producto por SKU o escanea el código para solicitarlo al almacén.
              </p>
            </header>

            <section className="space-y-4">
              <div className="relative group animate-fadeIn" style={{ animationDelay: '150ms' }}>
                <BorderBeam
                  size="md"
                  colorVariant="colorful"
                  duration={1.96}
                  className="rounded-[2.5rem]"
                >
                  <div className={`relative overflow-hidden rounded-[2.5rem] bg-white transition-all duration-500 ${estaEnfocado || buscando ? 'shadow-[0_20px_50px_rgba(0,0,0,0.1)] scale-[1.02]' : 'shadow-[0_8px_30px_rgba(0,0,0,0.04)]'}`}>
                    <input
                      type="search"
                      inputMode="search"
                      autoComplete="off"
                      placeholder="SKU, barras, nombre..."
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      onFocus={() => setEstaEnfocado(true)}
                      onBlur={() => setEstaEnfocado(false)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void ejecutarBusqueda(codigo);
                        }
                      }}
                      className="w-full bg-transparent py-7 pl-9 pr-20 text-lg font-bold text-black placeholder:text-gray-300 focus:outline-none placeholder:font-semibold tracking-tight"
                    />
                    <button
                      type="button"
                      onClick={() => setScannerAbierto(true)}
                      className={`absolute right-4 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-[1.8rem] text-white shadow-lg transition-all hover:scale-105 active:scale-95 ${estaEnfocado || buscando ? 'bg-black' : 'bg-black/90'}`}
                      aria-label="Escanear código"
                    >
                      <MaterialIcon icon="qr_code_scanner" className="h-6 w-6" />
                    </button>
                  </div>
                </BorderBeam>
              </div>
              
              <div className="flex gap-3 animate-fadeIn" style={{ animationDelay: '250ms' }}>
                <button
                  type="button"
                  onClick={() => void ejecutarBusqueda(codigo)}
                  className="flex-1 rounded-3xl bg-white py-5 text-xs font-black uppercase tracking-[0.25em] text-black shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all hover:bg-black hover:text-white hover:shadow-[0_15px_30px_rgba(0,0,0,0.12)] active:scale-[0.97]"
                >
                  Buscar Producto
                </button>
              </div>

              {/* Área Destino — chip automático o selector de fallback */}
              {idVariante != null && (
                idUbicacionAreaDestino != null ? (
                  /* Área auto-detectada desde el catálogo */
                  <div className="animate-fadeIn flex items-center gap-2" style={{ animationDelay: '300ms' }}>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Área destino</p>
                    <span className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-1.5 text-xs font-bold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      {nombreUbicacionDestino ?? "Área asignada"}
                    </span>
                  </div>
                ) : (
                  /* Producto nuevo: selector obligatorio */
                  <div className="animate-fadeIn space-y-2" style={{ animationDelay: '300ms' }}>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Área destino</p>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-600">
                        Selecciona piso de destino
                      </span>
                    </div>
                    {ubicaciones.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {ubicaciones.map((u) => {
                          const sel = idUbicacionAreaDestino === u.idUbicacionArea;
                          const etiqueta = u.area ? `${u.nombre} — ${u.area}` : u.nombre;
                          return (
                            <button
                              key={u.idUbicacionArea}
                              type="button"
                              onClick={() => {
                                setIdUbicacionAreaDestino(u.idUbicacionArea);
                                setNombreUbicacionDestino(etiqueta);
                              }}
                              className={`rounded-2xl border px-4 py-2 text-xs font-bold transition-all ${
                                sel
                                  ? "border-black bg-black text-white shadow-md"
                                  : "border-gray-200 bg-white text-gray-700 hover:border-black/30 hover:bg-gray-50"
                              }`}
                            >
                              {etiqueta}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400">Cargando áreas...</p>
                    )}
                    <p className="text-[11px] font-semibold text-amber-500">
                      Indica a qué piso o área debe enviar almacén este pedido.
                    </p>
                  </div>
                )
              )}

              {buscando && <SearchResultSkeleton />}

              {coincidencias.length > 0 && !buscando && (
                <div className="rounded-[2.5rem] bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-gray-100 animate-fadeInUp">
                  <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    Resultados encontrados ({coincidencias.length})
                  </p>
                  <ul className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                    {coincidencias.map((row) => (
                      <li key={row.idProductoVariante}>
                        <button
                          type="button"
                          onClick={() => void seleccionarVarianteLista(row.idProductoVariante)}
                          className="flex w-full items-center justify-between rounded-3xl bg-gray-50/50 px-5 py-4 text-left transition-all hover:bg-black hover:text-white group"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-sm block group-hover:text-white">{row.nombreProducto}</span>
                            <span className="mt-1 block text-xs font-medium text-gray-500 group-hover:text-white/70">
                              {row.color} · {row.talla}
                            </span>
                          </div>
                          <div className="ml-4 flex flex-col items-end gap-1">
                             <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${row.stockAlmacen > 0 ? 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-gray-200 text-gray-500 group-hover:bg-gray-700'}`}>
                              {row.stockAlmacen > 0 ? `${row.stockAlmacen} STOCK` : "SIN STOCK"}
                            </span>
                            <span className="text-[11px] font-bold text-gray-400 group-hover:text-white/60">S/{Number(row.precioUnitario).toFixed(2)}</span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>

          {/* Columna Derecha: Detalle y Selección */}
          <div className="flex-1 w-full min-h-[400px]">
            {catalogo && !buscando ? (
              <section className="space-y-6 rounded-[3rem] bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.06)] border border-gray-50 animate-fadeInRight">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-gray-100">
                  <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-[2rem] bg-black text-white shadow-xl">
                    <MaterialIcon icon="inventory_2" className="h-10 w-10" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest">Producto</span>
                       <span className="text-[10px] font-bold text-gray-400">ID: {catalogo.producto.idProducto}</span>
                    </div>
                    <h2 className="text-3xl font-black leading-tight text-black">
                      {catalogo.producto.nombre}
                    </h2>
                    <p className="mt-2 text-2xl font-bold text-black/90">
                      {precioTxt}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p ref={variantesRef} className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    Variantes Disponibles
                  </p>
                  {catalogo.variantes.length === 0 ? (
                    <div className="rounded-3xl border-2 border-dashed border-gray-100 p-8 text-center">
                      <p className="text-sm font-semibold text-gray-500">
                        No hay variantes registradas para este producto.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {catalogo.variantes.map((v) => {
                        const disp = stockDisponibleVariante(v);
                        const disabled = disp <= 0;
                        const sel = idVariante === v.idProductoVariante;
                        return (
                          <button
                            key={v.idProductoVariante}
                            type="button"
                            disabled={disabled}
                            onClick={() => handleSeleccionarVariante(v)}
                            className={`flex flex-col items-start gap-1 overflow-hidden rounded-[1.5rem] border-2 p-4 text-left transition-all ${disabled
                                ? "cursor-not-allowed border-gray-50 bg-gray-50/50 opacity-50"
                                : sel
                                  ? "border-black bg-black text-white shadow-xl"
                                  : "border-gray-100 bg-white hover:border-black/20 hover:bg-gray-50"
                              }`}
                          >
                            <span className={`text-[10px] font-black uppercase tracking-widest ${sel ? "text-white/60" : "text-gray-400"}`}>
                              {v.talla}
                            </span>
                            <span className="text-sm font-bold truncate w-full">
                              {v.color}
                            </span>
                            <span className={`mt-2 text-[10px] font-black tabular-nums ${disabled ? "text-gray-400" : sel ? "text-white" : "text-emerald-600"}`}>
                              {disp > 0 ? `${disp} DISPONIBLE` : "AGOTADO"}
                            </span>
                            {v.stockReservado > 0 && disp > 0 ? (
                              <span className={`text-[9px] font-semibold ${sel ? "text-white/50" : "text-amber-600"}`}>
                                {v.stockReservado} en pedidos
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {idVariante != null && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                        Cantidad a Solicitar
                      </p>
                      {stockDisponible > 0 ? (
                        <>
                        <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-[2rem]">
                          <button
                            type="button"
                            onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                            className="flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-white text-xl font-black shadow-sm transition-all hover:bg-gray-100 active:scale-95"
                          >
                            <MaterialIcon icon="remove" className="h-6 w-6" />
                          </button>
                          <span className="flex-1 text-center text-3xl font-black tabular-nums text-black">
                            {cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCantidad((c) => Math.min(stockDisponible, c + 1))
                            }
                            disabled={cantidad >= stockDisponible}
                            className="flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-white text-xl font-black shadow-sm transition-all hover:bg-gray-100 active:scale-95 disabled:opacity-30"
                          >
                            <MaterialIcon icon="add" className="h-6 w-6" />
                          </button>
                        </div>
                        {(stockReservado > 0 || enBandejaVariante > 0) && (
                          <p className="text-[10px] font-semibold text-gray-500 px-1">
                            {stockFisico} físico
                            {stockReservado > 0 ? ` · ${stockReservado} en pedidos` : ""}
                            {enBandejaVariante > 0 ? ` · ${enBandejaVariante} en tu lista` : ""}
                          </p>
                        )}
                        </>
                      ) : (
                        <div className="rounded-[1.5rem] bg-red-50 p-4">
                          <p className="text-xs font-bold text-red-600">Sin stock disponible en almacén.</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col justify-end gap-3">
                       <div className="flex items-center justify-between px-2 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Sugerido</span>
                          <span className="text-sm font-black text-black">S/{(Number(catalogo.producto.precioUnitario) * cantidad).toFixed(2)}</span>
                       </div>
                       <button
                        type="button"
                        disabled={stockDisponible <= 0 || !idUbicacionAreaDestino}
                        onClick={agregarALista}
                        className="flex w-full items-center justify-center gap-2 rounded-[1.8rem] bg-black py-5 text-sm font-black uppercase tracking-widest text-white shadow-2xl transition-all hover:bg-gray-900 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <MaterialIcon icon="add" className="h-4 w-4" />
                        Agregar a la lista
                      </button>
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <div className="hidden md:flex h-full min-h-[500px] flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-black/5 bg-black/[0.01] p-12 text-center animate-fadeIn">
                <div className="mb-6 rounded-[2rem] bg-black/5 p-8">
                  <MaterialIcon icon="inventory_2" className="h-16 w-16 text-black/10" />
                </div>
                <h3 className="text-xl font-black text-black/40">Esperando Selección</h3>
                <p className="mt-3 max-w-[280px] text-sm font-medium text-gray-400 leading-relaxed">
                  Busca un producto a la izquierda para ver sus detalles y stock aquí.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <VendedorPisoPedidosDock
        pedidos={pedidos}
        onRefresh={() => void cargarPedidos({ manual: true })}
        refrescando={pedidosRefrescandoManual}
        onNuevaRespuestaAlmacen={onNuevaRespuestaAlmacen}
        onCancelarPedido={cancelarPedido}
        cancelandoSolicitudId={cancelandoSolicitudId}
      />

      <BandejaSolicitudSheet
        open={sheetAbierto}
        onClose={() => setSheetAbierto(false)}
        onEnvioCompleto={() => {
          void cargarPedidos();
          agregarToast({
            tipo: "success",
            titulo: "Solicitudes Enviadas",
            mensaje: "Todos los pedidos pendientes fueron enviados al almacén con éxito.",
            autoDismissMs: 4500,
          });
        }}
      />

      <BandejaFAB onClick={() => setSheetAbierto(true)} />

      <BarcodeScannerModal
        open={scannerAbierto}
        onClose={() => setScannerAbierto(false)}
        onDecoded={onEscanear}
      />

      {/* Botón flotante para subir (Solo visible en móviles al bajar) */}
      <button
        type="button"
        onClick={scrollToTop}
        className={`fixed bottom-24 left-8 z-[110] md:hidden flex h-12 w-12 items-center justify-center rounded-full bg-black text-white shadow-xl border border-white/20 transition-all duration-300 ${
          showScrollTop ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
        }`}
        aria-label="Subir"
      >
        <MaterialIcon icon="arrow_upward" className="h-5 w-5" />
      </button>
    </div>
  );
};

export default VendedorPisoVentasPage;

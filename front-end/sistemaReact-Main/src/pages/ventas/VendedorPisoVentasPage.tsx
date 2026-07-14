import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAutoSync } from "@/hooks/useAutoSync";
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
    setToasts((prev) => {
      const next = [...prev, { ...toast, id }];
      // Evita apilar demasiadas alertas sobre la UI de piso.
      return next.slice(-3);
    });
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
        autoDismissMs: 3200,
      });
    }
  }, [agregarToast]);

  const [scannerAbierto, setScannerAbierto] = useState(false);
  const [sheetAbierto, setSheetAbierto] = useState(false);
  const [pedidos, setPedidos] = useState<VendedorSolicitudResumen[]>([]);
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

  const cargarPedidos = useCallback(async () => {
    try {
      const lista = await VendedorService.misSolicitudesHoy();
      setPedidos(lista);
    } catch {
      /* silencioso */
    }
  }, []);

  useAutoSync(cargarPedidos, ['SOLICITUD_ATENDIDA', 'SOLICITUD_RECHAZADA', 'SOLICITUD_CREADA'], 800);

  useEffect(() => {
    void cargarPedidos();
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
          mensaje: "La reserva se liberó en almacén.",
          autoDismissMs: 2800,
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
    if (items.length === 0) return;

    const huboCancelacion = items.some((item) => item.estado === "CANCELADO");
    const listos = items.filter((item) => item.estado === "ATENDIDO");
    const rechazados = items.filter((item) => item.estado === "CANCELADO");

    // Una sola notificación compacta por lote (menos invasivo en móvil).
    if (listos.length === 1 && rechazados.length === 0) {
      const item = listos[0];
      agregarToast({
        tipo: "success",
        titulo: "Listo en almacén",
        mensaje: "Ya puedes retirar el pedido.",
        producto: item.nombreProducto,
        color: item.color,
        talla: item.talla,
        cantidad: item.cantidad,
        autoDismissMs: 3500,
      });
    } else if (rechazados.length === 1 && listos.length === 0) {
      const item = rechazados[0];
      agregarToast({
        tipo: "error",
        titulo: "Pedido rechazado",
        mensaje: "La reserva se liberó.",
        producto: item.nombreProducto,
        color: item.color,
        talla: item.talla,
        cantidad: item.cantidad,
        autoDismissMs: 3500,
      });
    } else {
      const partes: string[] = [];
      if (listos.length) partes.push(`${listos.length} listo${listos.length > 1 ? "s" : ""}`);
      if (rechazados.length) {
        partes.push(`${rechazados.length} rechazado${rechazados.length > 1 ? "s" : ""}`);
      }
      agregarToast({
        tipo: rechazados.length && !listos.length ? "error" : listos.length && !rechazados.length ? "success" : "info",
        titulo: "Actualización de almacén",
        mensaje: partes.join(" · "),
        autoDismissMs: 3500,
      });
    }

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
      titulo: "Agregado a la lista",
      mensaje: "Listo para enviar al almacén.",
      producto: catalogo.producto.nombre,
      color: variante?.color ?? "",
      talla: variante?.talla ?? "",
      cantidad: Math.min(cantidad, stockDisponible),
      autoDismissMs: 2500,
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
    <div className="relative min-h-[calc(100dvh-8.5rem)] app-page pb-36 pt-2">
      <VendedorToastStack toasts={toasts} onDismiss={eliminarToast} />

      <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
        <div className="flex flex-col md:flex-row md:items-start gap-8 lg:gap-16">
          
          {/* Columna Izquierda: Control y Búsqueda */}
          <div ref={topRef} className="flex-1 w-full md:max-w-[420px] space-y-8">
            <header className="pt-2 animate-fadeIn">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--app-bg-muted)] border border-[var(--app-border-strong)] text-[10px] font-black uppercase tracking-wider text-[var(--app-text-muted)] mb-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Sesión Activa: {usuario?.usuario ?? "Vendedor"}
              </div>
              <h1 className="text-3xl font-black tracking-tight app-heading sm:text-4xl">
                ¡Hola{usuario?.usuario ? `, ${usuario.usuario}` : ""}!
              </h1>
              <p className="mt-2 text-base font-medium app-text-muted leading-relaxed">
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
                  <div className={`relative overflow-hidden rounded-[2.5rem] bg-[var(--app-surface)] border border-[var(--app-border-strong)] backdrop-blur-md transition-all duration-500 ${estaEnfocado || buscando ? 'shadow-[0_20px_50px_rgba(0,0,0,0.18)] scale-[1.02]' : 'shadow-[0_8px_30px_rgba(0,0,0,0.06)]'}`}>
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
                      className="w-full bg-transparent py-7 pl-9 pr-20 text-lg font-bold text-[var(--app-text)] placeholder:text-[var(--app-text-faint)] focus:outline-none placeholder:font-semibold tracking-tight"
                    />
                    <button
                      type="button"
                      onClick={() => setScannerAbierto(true)}
                      className="absolute right-4 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-[1.8rem] bg-[var(--app-accent)] text-[var(--app-accent-fg)] shadow-lg transition-all hover:scale-105 active:scale-95"
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
                  className="flex-1 rounded-3xl app-btn-primary border border-transparent py-5 text-xs font-black uppercase tracking-[0.25em] shadow-md transition-all hover:shadow-xl active:scale-[0.97]"
                >
                  Buscar Producto
                </button>
              </div>

              {/* Área Destino — chip automático o selector de fallback */}
              {idVariante != null && (
                idUbicacionAreaDestino != null ? (
                  /* Área auto-detectada desde el catálogo */
                  <div className="animate-fadeIn flex items-center gap-2" style={{ animationDelay: '300ms' }}>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--app-text-muted)]">Área destino</p>
                    <span className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-xs font-bold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      {nombreUbicacionDestino ?? "Área asignada"}
                    </span>
                  </div>
                ) : (
                  /* Producto nuevo: selector obligatorio */
                  <div className="animate-fadeIn space-y-2" style={{ animationDelay: '300ms' }}>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--app-text-muted)]">Área destino</p>
                      <span className="rounded-full bg-amber-500/15 border border-amber-500/25 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-amber-400">
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
                                  ? "border-[var(--app-accent)] bg-[var(--app-accent)] text-[var(--app-accent-fg)] shadow-md font-black"
                                  : "border-[var(--app-border-strong)] bg-[var(--app-bg-muted)] text-[var(--app-text)] hover:border-[var(--app-border-strong)] hover:bg-[var(--app-hover-overlay)]"
                              }`}
                            >
                              {etiqueta}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-[var(--app-text-muted)]">Cargando áreas...</p>
                    )}
                    <p className="text-[11px] font-bold text-amber-400/90">
                      Indica a qué piso o área debe enviar almacén este pedido.
                    </p>
                  </div>
                )
              )}

              {buscando && <SearchResultSkeleton />}

              {coincidencias.length > 0 && !buscando && (
                <div className="rounded-[2.5rem] border border-[var(--app-border-strong)] bg-[var(--app-surface-glass)]/90 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl animate-fadeInUp">
                  <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--app-text-muted)]">
                    Resultados encontrados ({coincidencias.length})
                  </p>
                  <ul className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                    {coincidencias.map((row) => (
                      <li key={row.idProductoVariante}>
                        <button
                          type="button"
                          onClick={() => void seleccionarVarianteLista(row.idProductoVariante)}
                          className="flex w-full items-center justify-between rounded-3xl bg-[var(--app-bg-muted)] border border-[var(--app-border)] px-5 py-4 text-left transition-all hover:bg-[var(--app-accent)] hover:text-[var(--app-accent-fg)] group"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-sm block text-[var(--app-text)] group-hover:text-[var(--app-accent-fg)]">{row.nombreProducto}</span>
                            <span className="mt-1 block text-xs font-bold text-[var(--app-text-muted)] group-hover:text-[var(--app-accent-fg)]/70">
                              {row.color} · {row.talla}
                            </span>
                          </div>
                          <div className="ml-4 flex flex-col items-end gap-1">
                             <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${row.stockAlmacen > 0 ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-transparent' : 'bg-[var(--app-bg-muted)] text-[var(--app-text-faint)] border border-[var(--app-border)]'}`}>
                              {row.stockAlmacen > 0 ? `${row.stockAlmacen} STOCK` : "SIN STOCK"}
                            </span>
                            <span className="text-[11px] font-bold text-[var(--app-text-muted)] group-hover:text-[var(--app-accent-fg)]/60">S/{Number(row.precioUnitario).toFixed(2)}</span>
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
              <section className="space-y-6 rounded-[3rem] border border-[var(--app-border-strong)] bg-[var(--app-surface-glass)]/90 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl animate-fadeInRight">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-[var(--app-border)]">
                  <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-[2rem] bg-[var(--app-bg-muted)] text-[var(--app-text)] border border-[var(--app-border-strong)] shadow-2xl">
                    <MaterialIcon icon="inventory_2" className="h-10 w-10" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest">Producto</span>
                       <span className="text-[10px] font-bold text-[var(--app-text-faint)]">ID: {catalogo.producto.idProducto}</span>
                    </div>
                    <h2 className="text-3xl font-black leading-tight text-[var(--app-text)]">
                      {catalogo.producto.nombre}
                    </h2>
                    <p className="mt-2 text-2xl font-black text-[var(--app-text)] opacity-90">
                      {precioTxt}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p ref={variantesRef} className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--app-text-muted)]">
                    Variantes Disponibles
                  </p>
                  {catalogo.variantes.length === 0 ? (
                    <div className="rounded-3xl border-2 border-dashed border-[var(--app-border)] p-8 text-center bg-[var(--app-bg-muted)]/40">
                      <p className="text-sm font-bold text-[var(--app-text-muted)]">
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
                                ? "cursor-not-allowed border-[var(--app-border)] bg-[var(--app-bg-muted)]/50 opacity-40 text-[var(--app-text-faint)]"
                                : sel
                                  ? "border-[var(--app-accent)] bg-[var(--app-accent)] text-[var(--app-accent-fg)] shadow-xl"
                                  : "border-[var(--app-border-strong)] bg-[var(--app-bg-muted)] text-[var(--app-text)] hover:border-[var(--app-accent)]/40 hover:bg-[var(--app-hover-overlay)]"
                              }`}
                          >
                            <span
                              className={`inline-flex rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
                                sel
                                  ? "bg-[var(--app-accent-fg)]/15 text-[var(--app-accent-fg)]"
                                  : "bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border-strong)]"
                              }`}
                            >
                              Talla {v.talla}
                            </span>
                            <span className="text-sm font-black truncate w-full">
                              {v.color}
                            </span>
                            <span className={`mt-2 text-[10px] font-black tabular-nums ${disabled ? "text-[var(--app-text-faint)]" : sel ? "text-[var(--app-accent-fg)]" : "text-emerald-400 font-black"}`}>
                              {disp > 0 ? `${disp} DISPONIBLE` : "AGOTADO"}
                            </span>
                            {v.stockReservado > 0 && disp > 0 ? (
                              <span className={`text-[9px] font-bold ${sel ? "text-[var(--app-accent-fg)]/70" : "text-amber-400"}`}>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-[var(--app-border)]">
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--app-text-muted)]">
                        Cantidad a Solicitar
                      </p>
                      {stockDisponible > 0 ? (
                        <>
                        <div className="flex items-center gap-4 bg-[var(--app-bg-muted)] border border-[var(--app-border-strong)] p-2 rounded-[2rem]">
                          <button
                            type="button"
                            onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                            className="flex h-14 w-14 items-center justify-center rounded-[1.5rem] app-btn-secondary shadow-sm transition-all active:scale-95"
                          >
                            <MaterialIcon icon="remove" className="h-6 w-6" />
                          </button>
                          <span className="flex-1 text-center text-3xl font-black tabular-nums text-[var(--app-text)]">
                            {cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCantidad((c) => Math.min(stockDisponible, c + 1))
                            }
                            disabled={cantidad >= stockDisponible}
                            className="flex h-14 w-14 items-center justify-center rounded-[1.5rem] app-btn-secondary shadow-sm transition-all active:scale-95 disabled:opacity-30"
                          >
                            <MaterialIcon icon="add" className="h-6 w-6" />
                          </button>
                        </div>
                        {(stockReservado > 0 || enBandejaVariante > 0) && (
                          <p className="text-[10px] font-bold text-[var(--app-text-muted)] px-1">
                            {stockFisico} físico
                            {stockReservado > 0 ? ` · ${stockReservado} en pedidos` : ""}
                            {enBandejaVariante > 0 ? ` · ${enBandejaVariante} en tu lista` : ""}
                          </p>
                        )}
                        </>
                      ) : (
                        <div className="rounded-[1.5rem] bg-red-500/10 border border-red-500/20 p-4">
                          <p className="text-xs font-black text-red-400">Sin stock disponible en almacén.</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col justify-end gap-3">
                       <div className="flex items-center justify-between px-2 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">Total Sugerido</span>
                          <span className="text-sm font-black text-[var(--app-text)]">S/{(Number(catalogo.producto.precioUnitario) * cantidad).toFixed(2)}</span>
                       </div>
                       <button
                        type="button"
                        disabled={stockDisponible <= 0 || !idUbicacionAreaDestino}
                        onClick={agregarALista}
                        className="flex w-full items-center justify-center gap-2 rounded-[1.8rem] app-btn-primary py-4 sm:py-5 text-xs sm:text-sm font-black uppercase tracking-wider sm:tracking-widest shadow-2xl transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <MaterialIcon icon="add" className="h-4 w-4" />
                        Agregar a la lista
                      </button>
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <div className="hidden md:flex h-full min-h-[500px] flex-col items-center justify-center rounded-[3rem] border border-[var(--app-border-strong)] bg-[var(--app-surface-glass)]/50 p-12 text-center backdrop-blur-xl animate-fadeIn">
                <div className="mb-6 rounded-[2rem] bg-[var(--app-bg-muted)] p-8">
                  <MaterialIcon icon="inventory_2" className="h-16 w-16 text-[var(--app-text-faint)]/50" />
                </div>
                <h3 className="text-xl font-black app-heading opacity-60">Esperando Selección</h3>
                <p className="mt-3 max-w-[280px] text-sm font-medium app-text-muted leading-relaxed">
                  Busca un producto a la izquierda para ver sus detalles y stock aquí.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <VendedorPisoPedidosDock
        pedidos={pedidos}
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
            titulo: "Solicitudes enviadas",
            mensaje: "El almacén ya recibió tus pedidos.",
            autoDismissMs: 2800,
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
        className={`fixed bottom-24 left-8 z-[110] md:hidden flex h-12 w-12 items-center justify-center rounded-full app-btn-primary shadow-xl border border-transparent transition-all duration-300 ${
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

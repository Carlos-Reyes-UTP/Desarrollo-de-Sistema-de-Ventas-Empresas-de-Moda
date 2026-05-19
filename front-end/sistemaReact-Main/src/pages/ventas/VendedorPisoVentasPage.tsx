import { ArrowUp, Minus, Package, Plus, ScanLine } from "lucide-react";
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
import { NotificationToast } from "../../components/cajero/ventas-panel/NotificationToast";
import { BarcodeScannerModal } from "../../components/vendedor-piso/BarcodeScannerModal";
import { BandejaSolicitudSheet } from "../../components/vendedor-piso/BandejaSolicitudSheet";
import { BandejaFAB } from "../../components/vendedor-piso/BandejaFAB";
import {
  VendedorPisoPedidosDock,
  type VendedorAlmacenActualizacion,
} from "../../components/vendedor-piso/VendedorPisoPedidosDock";
import { SearchResultSkeleton } from "@/shared/ui";
import { BorderBeam } from "border-beam";
import { esPeticionCancelada, mensajeErrorApi } from "@/utils/apiErrors";

function elegirVarianteInicial(data: VendedorCatalogoPorCodigo): number | null {
  const pre = data.idVariantePreseleccionada;
  if (pre != null) {
    const v = data.variantes.find((x) => x.idProductoVariante === pre);
    if (v && v.stockAlmacen > 0) {
      return pre;
    }
  }
  const primera = data.variantes.find((x) => x.stockAlmacen > 0);
  return primera?.idProductoVariante ?? null;
}

const VendedorPisoVentasPage = () => {
  const { usuario } = useAuth();
  const { agregar } = useBandeja();
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
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [exitoToast, setExitoToast] = useState(false);
  const [scannerAbierto, setScannerAbierto] = useState(false);
  const [sheetAbierto, setSheetAbierto] = useState(false);
  const [pedidos, setPedidos] = useState<VendedorSolicitudResumen[]>([]);
  const [pedidosRefrescandoManual, setPedidosRefrescandoManual] = useState(false);
  const [infoAlmacen, setInfoAlmacen] = useState<string | null>(null);
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

  const stockAlmacen = varianteSeleccionada?.stockAlmacen ?? 0;

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

  const onNuevaRespuestaAlmacen = useCallback((items: VendedorAlmacenActualizacion[]) => {
    if (items.length === 0) return;
    if (items.length === 1) {
      const [x] = items;
      setInfoAlmacen(
        x.estado === "ATENDIDO"
          ? `Tu pedido está listo: ${x.nombreProducto}.`
          : `Sin entrega para: ${x.nombreProducto}. Revisa el motivo en el panel.`
      );
      return;
    }
    const listos = items.filter((i) => i.estado === "ATENDIDO").length;
    setInfoAlmacen(
      `${items.length} solicitudes con novedad (${listos} listas, ${items.length - listos} rechazadas). Abre el panel inferior para ver el detalle.`
    );
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

  const aplicarCatalogo = useCallback((data: VendedorCatalogoPorCodigo) => {
    setCatalogo(data);
    const inicial = elegirVarianteInicial(data);
    setIdVariante(inicial);
    setCantidad(1);
    scrollToVariantes();
  }, [scrollToVariantes]);

  const ejecutarBusqueda = useCallback(
    async (termino: string) => {
      const t = termino.trim();
      if (!t) {
        setCatalogo(null);
        setCoincidencias([]);
        setIdVariante(null);
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
          return;
        }
        setCoincidencias([]);
        if (res.catalogo) {
          aplicarCatalogo(res.catalogo);
        } else {
          setCatalogo(null);
          setIdVariante(null);
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
        setErrorToast(mensajeErrorApi(e));
      } finally {
        if (seq === busquedaSeqRef.current) {
          setBuscando(false);
        }
      }
    },
    [aplicarCatalogo]
  );

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
        setErrorToast(mensajeErrorApi(e));
      } finally {
        if (seq === busquedaSeqRef.current) {
          setBuscando(false);
        }
      }
    },
    [aplicarCatalogo]
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
  }, [codigo, ejecutarBusqueda]);

  useEffect(() => {
    if (stockAlmacen > 0 && cantidad > stockAlmacen) {
      setCantidad(stockAlmacen);
    }
    if (stockAlmacen === 0 && cantidad !== 1) {
      setCantidad(1);
    }
  }, [stockAlmacen, cantidad]);

  /** Selecciona una variante y auto-detecta su área destino desde el cat\u00e1logo. */
  const handleSeleccionarVariante = useCallback((v: VendedorVarianteStock) => {
    setIdVariante(v.idProductoVariante);
    setCantidad(1);
    if (v.idUbicacionAreaDestino != null) {
      setIdUbicacionAreaDestino(v.idUbicacionAreaDestino);
      setNombreUbicacionDestino(v.nombreUbicacion);
    } else {
      setIdUbicacionAreaDestino(null);
      setNombreUbicacionDestino(null);
    }
  }, []);

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
    if (stockAlmacen <= 0) {
      setErrorToast("Este producto no tiene stock disponible en almacén.");
      return;
    }
    const variante = catalogo.variantes.find((v) => v.idProductoVariante === idVariante);
    agregar({
      idVariante,
      cantidad: Math.min(cantidad, stockAlmacen),
      idUbicacionAreaDestino,
      nombreProducto: catalogo.producto.nombre,
      talla: variante?.talla ?? "",
      color: variante?.color ?? "",
      nombreUbicacion: nombreUbicacionDestino,
    });
    // Toast de éxito
    setExitoToast(true);
    
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
      {infoAlmacen && (
        <NotificationToast
          title="Respuesta de almacén"
          message={infoAlmacen}
          variant="info"
          topClassName="top-16"
          autoDismissMs={7500}
          onClose={() => setInfoAlmacen(null)}
        />
      )}
      {errorToast && (
        <NotificationToast
          title="Atención"
          message={errorToast}
          variant="error"
          topClassName="top-16"
          onClose={() => setErrorToast(null)}
        />
      )}
      {exitoToast && (
        <NotificationToast
          title="Agregado"
          message="Producto añadido a la lista. Puedes seguir buscando."
          variant="success"
          topClassName="top-16"
          autoDismissMs={2500}
          onClose={() => setExitoToast(false)}
        />
      )}

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
                      <ScanLine className="h-6 w-6" strokeWidth={2.5} />
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
                        Nuevo producto — elige área
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
                      Esta es la primera vez que se solicita este producto. El área elegida quedará registrada.
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
                    <Package className="h-10 w-10" strokeWidth={1.5} />
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
                        const disabled = v.stockAlmacen <= 0;
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
                              {v.stockAlmacen > 0 ? `${v.stockAlmacen} DISP. ALMACÉN` : "AGOTADO"}
                            </span>
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
                      {stockAlmacen > 0 ? (
                        <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-[2rem]">
                          <button
                            type="button"
                            onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                            className="flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-white text-xl font-black shadow-sm transition-all hover:bg-gray-100 active:scale-95"
                          >
                            <Minus className="h-6 w-6" strokeWidth={3} />
                          </button>
                          <span className="flex-1 text-center text-3xl font-black tabular-nums text-black">
                            {cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCantidad((c) => Math.min(stockAlmacen, c + 1))
                            }
                            disabled={cantidad >= stockAlmacen}
                            className="flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-white text-xl font-black shadow-sm transition-all hover:bg-gray-100 active:scale-95 disabled:opacity-30"
                          >
                            <Plus className="h-6 w-6" strokeWidth={3} />
                          </button>
                        </div>
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
                        disabled={stockAlmacen <= 0 || !idUbicacionAreaDestino}
                        onClick={agregarALista}
                        className="flex w-full items-center justify-center gap-2 rounded-[1.8rem] bg-black py-5 text-sm font-black uppercase tracking-widest text-white shadow-2xl transition-all hover:bg-gray-900 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-4 w-4" strokeWidth={3} />
                        Agregar a la lista
                      </button>
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <div className="hidden md:flex h-full min-h-[500px] flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-black/5 bg-black/[0.01] p-12 text-center animate-fadeIn">
                <div className="mb-6 rounded-[2rem] bg-black/5 p-8">
                  <Package className="h-16 w-16 text-black/10" strokeWidth={1} />
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
      />

      <BandejaSolicitudSheet
        open={sheetAbierto}
        onClose={() => setSheetAbierto(false)}
        onEnvioCompleto={() => {
          void cargarPedidos();
          setExitoToast(false);
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
        <ArrowUp className="h-5 w-5" strokeWidth={3} />
      </button>
    </div>
  );
};

export default VendedorPisoVentasPage;

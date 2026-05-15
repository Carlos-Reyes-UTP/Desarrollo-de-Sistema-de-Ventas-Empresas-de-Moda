import axios from "axios";
import { Minus, Package, Plus, ScanLine } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../../context/AuthContext";
import { VendedorApiService } from "../../services/VendedorApiService";
import type {
  VendedorCatalogoPorCodigo,
  VendedorSolicitudResumen,
  VendedorVarianteCoincidencia,
  VendedorVarianteStock,
} from "../../types/Vendedor";
import { NotificationToast } from "../../components/cajero/ventas-panel/NotificationToast";
import { BarcodeScannerModal } from "../../components/vendedor-piso/BarcodeScannerModal";
import {
  VendedorPisoPedidosDock,
  type VendedorAlmacenActualizacion,
} from "../../components/vendedor-piso/VendedorPisoPedidosDock";

function esPeticionCancelada(error: unknown): boolean {
  if (axios.isCancel(error)) return true;
  if (axios.isAxiosError(error) && error.code === "ERR_CANCELED") return true;
  if (error instanceof Error && error.name === "CanceledError") return true;
  return false;
}

function mensajeErrorApi(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const d = error.response?.data as { message?: string } | string | undefined;
    if (d && typeof d === "object" && typeof d.message === "string") {
      return d.message;
    }
    if (typeof d === "string" && d.length > 0) {
      return d;
    }
    if (error.response?.status === 404) {
      return "No se encontró el producto";
    }
  }
  return "Ocurrió un error. Intenta de nuevo.";
}

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
  const [enviando, setEnviando] = useState(false);
  const [pedidos, setPedidos] = useState<VendedorSolicitudResumen[]>([]);
  const [pedidosRefrescandoManual, setPedidosRefrescandoManual] = useState(false);
  const [infoAlmacen, setInfoAlmacen] = useState<string | null>(null);

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
      const lista = await VendedorApiService.misSolicitudesHoy();
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
    const t = window.setInterval(() => void cargarPedidos(), 25000);
    return () => window.clearInterval(t);
  }, [cargarPedidos]);

  const aplicarCatalogo = useCallback((data: VendedorCatalogoPorCodigo) => {
    setCatalogo(data);
    const inicial = elegirVarianteInicial(data);
    setIdVariante(inicial);
    setCantidad(1);
  }, []);

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
        const res = await VendedorApiService.buscarCatalogo(t, ac.signal);
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
        const data = await VendedorApiService.catalogoPorVariante(
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

  const onEscanear = useCallback(
    (text: string) => {
      setCodigo(text);
      void ejecutarBusqueda(text);
    },
    [ejecutarBusqueda]
  );

  const solicitar = async () => {
    if (!idVariante || stockAlmacen <= 0) return;
    setEnviando(true);
    setErrorToast(null);
    try {
      await VendedorApiService.crearSolicitud({
        idVariante,
        cantidad: Math.min(cantidad, stockAlmacen),
        tipoSolicitud: "VENTA",
      });
      setExitoToast(true);
      setCatalogo(null);
      setCoincidencias([]);
      setIdVariante(null);
      setCodigo("");
      void cargarPedidos();
    } catch (e) {
      setErrorToast(mensajeErrorApi(e));
    } finally {
      setEnviando(false);
    }
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
          title="Listo"
          message="Solicitud enviada al almacén."
          variant="success"
          topClassName="top-16"
          autoDismissMs={4000}
          onClose={() => setExitoToast(false)}
        />
      )}

      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4">
        <header className="pt-1">
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Hola{usuario?.usuario ? `, ${usuario.usuario}` : ""}
          </h1>
          <p className="mt-1 text-sm text-gray-500">Busca un producto y solicítalo al almacén.</p>
        </header>

        <section className="space-y-4">
          <div className="relative overflow-hidden rounded-[2rem] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 transition-all focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.08)] focus-within:border-gray-200">
            <input
              type="search"
              inputMode="search"
              autoComplete="off"
              placeholder="SKU, código de barras, nombre, talla o color"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void ejecutarBusqueda(codigo);
                }
              }}
              className="w-full bg-transparent py-5 pl-6 pr-16 text-base text-black placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10 rounded-[2rem]"
            />
            <button
              type="button"
              onClick={() => setScannerAbierto(true)}
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[1.25rem] bg-black text-white shadow-md transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              aria-label="Escanear código"
            >
              <ScanLine className="h-[22px] w-[22px]" strokeWidth={2} />
            </button>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void ejecutarBusqueda(codigo)}
              className="flex-1 rounded-[1.5rem] border border-gray-200 bg-white py-4 text-sm font-bold text-black shadow-sm transition-all hover:bg-gray-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-2"
            >
              Buscar Producto
            </button>
          </div>
          {buscando && (
            <div className="space-y-2 rounded-3xl border border-gray-100 bg-white/80 p-4 shadow-sm backdrop-blur-md">
              <div className="h-4 w-[60%] max-w-xs animate-pulse rounded-lg bg-gray-200" />
              <div className="h-4 w-[40%] max-w-[10rem] animate-pulse rounded-lg bg-gray-100" />
              <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
            </div>
          )}
        </section>

        {coincidencias.length > 0 && !buscando && (
          <section className="rounded-3xl border border-gray-200 bg-white/80 p-4 shadow-sm backdrop-blur-md">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-500">
              Varias variantes coinciden — elige una
            </p>
            <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
              {coincidencias.map((row) => (
                <li key={row.idProductoVariante}>
                  <button
                    type="button"
                    onClick={() => void seleccionarVarianteLista(row.idProductoVariante)}
                    className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-[#fafafa] px-4 py-3 text-left transition-all hover:border-gray-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-black">{row.nombreProducto}</span>
                      <span className="mt-0.5 block text-sm text-gray-700">
                        {row.color} · {row.talla}
                        {row.sku ? (
                          <span className="text-gray-500"> · {row.sku}</span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block font-mono text-[11px] text-gray-500">
                        #{row.idProductoVariante}
                        {row.codigoBarras ? ` · ${row.codigoBarras}` : ""}
                        {" · "}
                        S/{Number(row.precioUnitario).toFixed(2)}
                      </span>
                    </div>
                    <span
                      className={
                        "ml-3 shrink-0 rounded-full px-3 py-1 text-xs font-bold " +
                        (row.stockAlmacen > 0
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-400")
                      }
                    >
                      {row.stockAlmacen > 0 ? `${row.stockAlmacen} uds` : "Sin stock"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {catalogo && !buscando && (
          <section className="space-y-6 rounded-[2.5rem] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[1.5rem] bg-indigo-50 text-indigo-600">
                <Package className="h-8 w-8" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold leading-tight text-black">
                  {catalogo.producto.nombre}
                </h2>
                <p className="mt-1 text-sm font-semibold text-gray-700">
                  {precioTxt}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">
                Variante (talla / color)
              </p>
              {catalogo.variantes.length === 0 ? (
                <p className="rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
                  Este producto no tiene variantes registradas. Revisa el
                  inventario en administración.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {catalogo.variantes.map((v) => {
                    const disabled = v.stockAlmacen <= 0;
                    const sel = idVariante === v.idProductoVariante;
                    return (
                      <button
                        key={v.idProductoVariante}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setIdVariante(v.idProductoVariante);
                          setCantidad(1);
                        }}
                        className={`flex items-center justify-between overflow-hidden rounded-[1.25rem] border py-2.5 pl-4 pr-3 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${disabled
                            ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-60"
                            : sel
                              ? "border-black bg-black text-white shadow-md focus-visible:ring-black"
                              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 focus-visible:ring-black/25"
                          }`}
                      >
                        <span className={`font-semibold ${sel ? "text-white" : "text-black"}`}>
                          {v.color} · {v.talla}
                        </span>
                        <span
                          className={
                            " ml-2 text-xs font-bold tabular-nums " +
                            (disabled ? "text-gray-400" : sel ? "text-white/90" : "text-emerald-700")
                          }
                        >
                          {v.stockAlmacen > 0 ? `${v.stockAlmacen} uds` : "0 uds"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {idVariante != null && (
              <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/50 px-5 py-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-900/60">
                  Stock disponible (sistema)
                </p>
                <p className="mt-1 flex items-baseline gap-1 text-2xl font-black tabular-nums text-emerald-950">
                  {stockAlmacen}
                  <span className="text-sm font-bold text-emerald-900/60">uds</span>
                </p>
              </div>
            )}

            {idVariante != null && stockAlmacen > 0 && (
              <div className="space-y-4 border-t border-gray-100 pt-4">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                  Cantidad para la venta
                </p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white text-xl font-bold transition-all hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <span className="min-w-[3rem] text-center text-2xl font-bold tabular-nums text-black">
                    {cantidad}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCantidad((c) => Math.min(stockAlmacen, c + 1))
                    }
                    disabled={cantidad >= stockAlmacen}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white text-xl font-bold transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
            {idVariante != null && stockAlmacen > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => void solicitar()}
                  className="flex w-full items-center justify-center rounded-[1.5rem] bg-black py-4 text-[17px] font-bold tracking-wide text-white shadow-[0_8px_20px_rgb(0,0,0,0.15)] transition-all hover:bg-gray-800 hover:shadow-[0_8px_25px_rgb(0,0,0,0.2)] active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                >
                  {enviando ? "Enviando…" : "Solicitar al Almacén"}
                </button>
              </div>
            )}
          </section>
        )}
      </div>

      <VendedorPisoPedidosDock
        pedidos={pedidos}
        onRefresh={() => void cargarPedidos({ manual: true })}
        refrescando={pedidosRefrescandoManual}
        onNuevaRespuestaAlmacen={onNuevaRespuestaAlmacen}
      />

      <BarcodeScannerModal
        open={scannerAbierto}
        onClose={() => setScannerAbierto(false)}
        onDecoded={onEscanear}
      />
    </div>
  );
};

export default VendedorPisoVentasPage;

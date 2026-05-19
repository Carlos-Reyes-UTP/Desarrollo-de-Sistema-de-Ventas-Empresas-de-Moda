import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Inbox, Volume2, VolumeX, RefreshCw, Settings, ChevronLeft } from "lucide-react";
import { AlmacenColaLateral } from "../../components/almacen-tablero/AlmacenColaLateral";
import { AlmacenPickingList } from "../../components/almacen-tablero/AlmacenPickingList";
import { RechazoPedidoModal } from "../../components/almacen-tablero/RechazoPedidoModal";
import {
  playKioskChime,
  setSilence15Min,
} from "../../components/almacen-tablero/almacenTableroSound";
import {
  idsSolicitudEnMismoGrupo,
  primeraPrioridad,
} from "../../components/almacen-tablero/almacenTableroUtils";
import { AlmacenSolicitudesApi } from "../../services/AlmacenSolicitudesService";
import type { AlmacenSolicitud, AlmacenTicketConsolidado, MotivoRechazoApi } from "../../types/AlmacenSolicitudes";
import { mensajeErrorApi } from "../../utils/apiErrors";

const POLL_MS = 3000;
const PULSE_MS = 8000;

function esVenta(c: AlmacenSolicitud): boolean {
  return c.tipoSolicitud === "VENTA";
}

export default function AlmacenTableroPedidosPage() {
  const [cards, setCards] = useState<AlmacenSolicitud[]>([]);
  const [seleccionId, setSeleccionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pulsando, setPulsando] = useState<Set<number>>(new Set());
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [rechazoCard, setRechazoCard] = useState<AlmacenSolicitud | null>(null);
  const [rechazoCargando, setRechazoCargando] = useState(false);
  const [activeTab, setActiveTab] = useState<"ventas" | "repos">("ventas");
  const [showSettings, setShowSettings] = useState(false);

  const prevVentaIdsRef = useRef<Set<number>>(new Set());
  const inicializadoRef = useRef(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const despachoLockRef = useRef(false);

  const aplicarNuevasVentas = useCallback((lista: AlmacenSolicitud[]) => {
    const ventaIds = new Set<number>();
    for (const c of lista) {
      if (esVenta(c)) {
        ventaIds.add(c.idSolicitud);
      }
    }
    const prev = prevVentaIdsRef.current;
    if (inicializadoRef.current) {
      const nuevos = [...ventaIds].filter((id) => !prev.has(id));
      if (nuevos.length > 0) {
        void playKioskChime();
        setPulsando((old) => {
          const next = new Set(old);
          nuevos.forEach((id) => next.add(id));
          return next;
        });
        window.setTimeout(() => {
          setPulsando((old) => {
            const next = new Set(old);
            nuevos.forEach((id) => next.delete(id));
            return next;
          });
        }, PULSE_MS);
      }
    } else {
      inicializadoRef.current = true;
    }
    prevVentaIdsRef.current = ventaIds;
  }, []);

  const cargar = useCallback(async () => {
    try {
      const data = await AlmacenSolicitudesApi.cola();
      setError(null);
      aplicarNuevasVentas(data);
      setCards(data);
    } catch (e: unknown) {
      setError(mensajeErrorApi(e));
    }
  }, [aplicarNuevasVentas]);

  useEffect(() => {
    void cargar();
    const id = window.setInterval(() => void cargar(), POLL_MS);
    return () => window.clearInterval(id);
  }, [cargar]);

  useEffect(() => {
    if (!showSettings) return;
    const onPointerDown = (ev: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(ev.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [showSettings]);

  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    if (isMobile) return;

    setSeleccionId((prev) => {
      const ids = new Set(cards.map((c) => c.idSolicitud));
      if (prev != null && ids.has(prev)) return prev;
      return primeraPrioridad(cards);
    });
  }, [cards]);

  const ventas = useMemo(() => cards.filter(esVenta), [cards]);
  const repos = useMemo(() => cards.filter((c) => !esVenta(c)), [cards]);

  const seleccionada = useMemo(
    () => cards.find((c) => c.idSolicitud === seleccionId) ?? null,
    [cards, seleccionId]
  );

  const ticketConsolidado = useMemo((): AlmacenTicketConsolidado | null => {
    if (!seleccionada) return null;
    if (!seleccionada.codigoLote) return seleccionada;
    const loteItems = cards.filter(
      (c) =>
        c.codigoLote === seleccionada.codigoLote &&
        c.idUsuario === seleccionada.idUsuario
    );
    return {
      ...seleccionada,
      lineas: loteItems.flatMap((c) => c.lineas),
      idsEnLote: loteItems.map((c) => c.idSolicitud),
    };
  }, [cards, seleccionada]);

  const onConfirmarTodo = async () => {
    if (!ticketConsolidado || despachoLockRef.current) return;
    const ids = [
      ...new Set(
        ticketConsolidado.idsEnLote?.length
          ? ticketConsolidado.idsEnLote
          : [ticketConsolidado.idSolicitud]
      ),
    ];
    despachoLockRef.current = true;
    setProcesandoId(seleccionId);
    try {
      await AlmacenSolicitudesApi.atenderLote(ids);
      setError(null);
      await cargar();
      setSeleccionId(null);
    } catch (e: unknown) {
      setError(mensajeErrorApi(e));
    } finally {
      despachoLockRef.current = false;
      setProcesandoId(null);
    }
  };

  const onRechazarConfirmar = async (motivo: MotivoRechazoApi) => {
    if (!rechazoCard) return;
    const ids = idsSolicitudEnMismoGrupo(cards, rechazoCard);
    setRechazoCargando(true);
    setProcesandoId(rechazoCard.idSolicitud);
    try {
      for (const id of ids) {
        await AlmacenSolicitudesApi.rechazar(id, motivo);
      }
      setError(null);
      setRechazoCard(null);
      await cargar();
      setSeleccionId(null);
    } catch (e: unknown) {
      setError(mensajeErrorApi(e));
    } finally {
      setRechazoCargando(false);
      setProcesandoId(null);
    }
  };

  return (
    <div className="bg-[#fafafa] text-left flex flex-col h-full min-h-0 overflow-hidden animate-fadeIn">
      <header className="flex justify-between items-center px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          {seleccionId && (
            <button
              type="button"
              onClick={() => setSeleccionId(null)}
              className="lg:hidden p-2 -ml-2 rounded-full hover:bg-gray-100 text-black active:scale-95 transition-all"
              aria-label="Volver a la cola"
            >
              <ChevronLeft className="w-6 h-6" strokeWidth={3} />
            </button>
          )}
          <div>
            <h1 className="text-xl font-black tracking-tight text-black leading-none uppercase">
              {seleccionId ? "Picking" : "Tickets"}
            </h1>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">
              Dakani Warehouse
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void cargar()}
            className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 transition-all active:rotate-180 duration-500"
            title="Actualizar"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <div ref={settingsRef} className="relative">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2.5 rounded-xl transition-all ${
                showSettings ? "bg-black text-white" : "hover:bg-gray-100 text-gray-400"
              }`}
              aria-expanded={showSettings}
              aria-haspopup="menu"
            >
              <Settings className="w-5 h-5" />
            </button>

            {showSettings && (
              <div
                className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[100] p-2 animate-fadeIn"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setSilence15Min();
                    setShowSettings(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-xs font-bold text-gray-600 transition-all"
                >
                  <VolumeX className="w-4 h-4" />
                  Silencio 15 min
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void playKioskChime();
                    setShowSettings(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-xs font-bold text-gray-600 transition-all"
                >
                  <Volume2 className="w-4 h-4" />
                  Probar sonido
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-6 mt-4 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start justify-between gap-3 shrink-0 animate-fadeIn">
          <p className="text-red-700 text-[10px] font-black uppercase tracking-widest leading-relaxed flex-1">
            {error}
          </p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-[10px] font-black text-red-500 uppercase tracking-widest shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        <aside
          className={`
          absolute inset-0 z-10 bg-[#fafafa] flex flex-col transition-transform duration-300
          lg:relative lg:translate-x-0 lg:w-[22rem] xl:w-[26rem] lg:border-r lg:border-gray-100
          ${seleccionId ? "-translate-x-full lg:translate-x-0" : "translate-x-0"}
        `}
        >
          <AlmacenColaLateral
            ventas={ventas}
            repos={repos}
            seleccionId={seleccionId}
            pulsando={pulsando}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onSelect={setSeleccionId}
          />
        </aside>

        <main
          className={`
          absolute inset-0 bg-[#fafafa] flex flex-col transition-transform duration-300
          lg:relative lg:flex-1 lg:translate-x-0
          ${seleccionId ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        `}
        >
          {ticketConsolidado ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 min-h-0">
              <AlmacenPickingList
                ticket={ticketConsolidado}
                procesando={procesandoId != null}
                onConfirmarTodo={() => void onConfirmarTodo()}
                onRechazar={() => seleccionada && setRechazoCard(seleccionada)}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="h-20 w-20 rounded-[2rem] bg-white border border-gray-100 shadow-sm flex items-center justify-center mb-6">
                <Inbox className="w-10 h-10 text-gray-200" strokeWidth={1} />
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] max-w-[200px]">
                Selecciona un ticket para comenzar el picking
              </p>
            </div>
          )}
        </main>
      </div>

      <RechazoPedidoModal
        abierto={rechazoCard !== null}
        nombreVendedor={rechazoCard?.nombreVendedor ?? ""}
        cargando={rechazoCargando}
        onCerrar={() => !rechazoCargando && setRechazoCard(null)}
        onElegirMotivo={(m) => void onRechazarConfirmar(m)}
      />
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Inbox, PanelRightClose, PanelRightOpen, Volume2, VolumeX, X } from "lucide-react";
import { AlmacenColaLateral } from "../../components/almacen-tablero/AlmacenColaLateral";
import { AlmacenPedidoCard } from "../../components/almacen-tablero/AlmacenPedidoCard";
import { RechazoPedidoModal } from "../../components/almacen-tablero/RechazoPedidoModal";
import {
  playKioskChime,
  setSilence15Min,
} from "../../components/almacen-tablero/almacenTableroSound";
import { AlmacenSolicitudesApi } from "../../services/almacenSolicitudesService";
import type { AlmacenSolicitudCard, MotivoRechazoApi } from "../../types/AlmacenCola";

const POLL_MS = 3000;
const PULSE_MS = 8000;

function esVenta(c: AlmacenSolicitudCard): boolean {
  return c.tipoSolicitud === "VENTA";
}

function primeraPrioridad(cards: AlmacenSolicitudCard[]): number | null {
  const ventas = cards.filter(esVenta);
  if (ventas.length > 0) return ventas[0].idSolicitud;
  const repos = cards.filter((c) => !esVenta(c));
  if (repos.length > 0) return repos[0].idSolicitud;
  return null;
}

export default function AlmacenTableroPedidosPage() {
  const [cards, setCards] = useState<AlmacenSolicitudCard[]>([]);
  const [seleccionId, setSeleccionId] = useState<number | null>(null);
  const [panelColaAbierto, setPanelColaAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulsando, setPulsando] = useState<Set<number>>(new Set());
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [rechazoCard, setRechazoCard] = useState<AlmacenSolicitudCard | null>(null);
  const prevVentaIdsRef = useRef<Set<number>>(new Set());
  const inicializadoRef = useRef(false);

  const aplicarNuevasVentas = useCallback((lista: AlmacenSolicitudCard[]) => {
    const ventaIds = new Set(
      lista.filter(esVenta).map((c) => c.idSolicitud)
    );
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
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown }).message)
          : "No se pudo cargar la cola";
      setError(msg);
    }
  }, [aplicarNuevasVentas]);

  useEffect(() => {
    void cargar();
    const id = window.setInterval(() => void cargar(), POLL_MS);
    return () => window.clearInterval(id);
  }, [cargar]);

  useEffect(() => {
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

  const totalCola = cards.length;

  const onConfirmar = async (id: number) => {
    setProcesandoId(id);
    try {
      await AlmacenSolicitudesApi.atender(id);
      await cargar();
    } finally {
      setProcesandoId(null);
    }
  };

  const onRechazarConfirmar = async (motivo: MotivoRechazoApi) => {
    if (!rechazoCard) return;
    const idSolicitud = rechazoCard.idSolicitud;
    setRechazoCard(null);
    setProcesandoId(idSolicitud);
    try {
      await AlmacenSolicitudesApi.rechazar(idSolicitud, motivo);
      setError(null);
      await cargar();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown }).message)
          : "No se pudo rechazar la solicitud";
      setError(msg);
    } finally {
      setProcesandoId(null);
    }
  };

  const contenidoCola = (
    <AlmacenColaLateral
      ventas={ventas}
      repos={repos}
      seleccionId={seleccionId}
      pulsando={pulsando}
      onSelect={(id) => {
        setSeleccionId(id);
        setPanelColaAbierto(false);
      }}
    />
  );

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto bg-[#fafafa] min-h-screen animate-fadeIn text-left flex flex-col">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-[2.5rem] font-bold tracking-tight text-black leading-none mb-2">
            Pedidos al almacén
          </h1>
          <p className="text-gray-500 text-sm max-w-md font-medium">
            Tablero de comando para gestión y atención de solicitudes de piso y vitrina.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void cargar()}
            className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all font-bold text-xs uppercase tracking-wider"
          >
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => setSilence15Min()}
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all font-bold text-xs uppercase tracking-wider"
            title="Silenciar alertas 15 minutos"
          >
            <VolumeX className="w-4 h-4" strokeWidth={2} />
            <span className="hidden sm:inline">Silencio 15 min</span>
          </button>
          <button
            type="button"
            onClick={() => void playKioskChime()}
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all font-bold text-xs uppercase tracking-wider"
            title="Probar tono de alerta"
          >
            <Volume2 className="w-4 h-4" strokeWidth={2} />
            <span className="hidden sm:inline">Probar sonido</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-8 p-5 rounded-[1.5rem] border flex items-center justify-between shadow-sm animate-fadeIn bg-red-50 border-red-100 text-red-700">
          <span className="text-[10px] font-bold uppercase tracking-widest">{error}</span>
        </div>
      )}

      <div className="flex flex-1 flex-col lg:flex-row gap-8 items-start min-h-0">
        <main className="relative flex w-full flex-1 flex-col justify-start lg:max-w-[calc(100%-22rem)] xl:max-w-[calc(100%-26rem)]">
          {seleccionada ? (
            <div className="w-full">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Pedido activo
              </p>
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-6 md:p-8">
                <AlmacenPedidoCard
                  card={seleccionada}
                  modoVenta={esVenta(seleccionada)}
                  resaltar={pulsando.has(seleccionada.idSolicitud)}
                  procesando={procesandoId === seleccionada.idSolicitud}
                  onConfirmar={() => void onConfirmar(seleccionada.idSolicitud)}
                  onRechazar={() => setRechazoCard(seleccionada)}
                />
              </div>
            </div>
          ) : (
            <div className="mx-auto flex w-full flex-col items-center justify-center rounded-[2.5rem] bg-white border border-gray-100 p-16 text-center shadow-sm min-h-[400px]">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gray-50 mb-6">
                <Inbox className="h-10 w-10 text-gray-400" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-bold text-black mb-3">
                Cola en pausa
              </h2>
              <p className="text-gray-500 font-medium max-w-sm mx-auto">
                No hay solicitudes pendientes en este momento. Las nuevas solicitudes aparecerán aquí y en el panel lateral automáticamente.
              </p>
            </div>
          )}
        </main>

        <aside className="hidden w-full lg:block lg:w-[22rem] xl:w-[26rem] shrink-0">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-14rem)] min-h-[400px]">
            <div className="shrink-0 border-b border-gray-50 px-8 py-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                Panel de Colas
              </p>
              <p className="text-sm font-bold text-black">
                {totalCola} pendiente{totalCola === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
              {contenidoCola}
            </div>
          </div>
        </aside>
      </div>

      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setPanelColaAbierto(true)}
          className="fixed bottom-6 right-4 z-[80] flex items-center gap-2 rounded-2xl border border-gray-200 bg-black px-5 py-4 text-xs font-bold uppercase tracking-wider text-white shadow-xl transition-all hover:bg-gray-800 active:scale-[0.98]"
        >
          <PanelRightOpen className="h-5 w-5 shrink-0" strokeWidth={2} />
          Colas
          {totalCola > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-black">
              {totalCola > 99 ? "99+" : totalCola}
            </span>
          )}
        </button>

        {panelColaAbierto && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-[140] bg-black/40 backdrop-blur-sm transition-all"
              aria-label="Cerrar panel de colas"
              onClick={() => setPanelColaAbierto(false)}
            />
            <div className="fixed inset-y-0 right-0 z-[150] flex w-[min(100%,24rem)] flex-col border-l border-gray-200 bg-[#fafafa] shadow-2xl">
              <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-5">
                <div className="flex items-center gap-3">
                  <PanelRightClose className="h-5 w-5 text-gray-400" />
                  <span className="font-bold text-black uppercase tracking-widest text-xs">Colas de Almacén</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPanelColaAbierto(false)}
                  className="rounded-xl bg-gray-50 p-2.5 text-gray-400 transition-all hover:bg-gray-100 hover:text-black"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
                {contenidoCola}
              </div>
            </div>
          </>
        )}
      </div>

      <RechazoPedidoModal
        abierto={rechazoCard !== null}
        nombreVendedor={rechazoCard?.nombreVendedor ?? ""}
        cargando={rechazoCard !== null && procesandoId === rechazoCard.idSolicitud}
        onCerrar={() => setRechazoCard(null)}
        onElegirMotivo={(m) => void onRechazarConfirmar(m)}
      />
    </div>
  );
}

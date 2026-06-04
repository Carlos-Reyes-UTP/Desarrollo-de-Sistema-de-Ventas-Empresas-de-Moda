import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAutoSync } from "@/hooks/useAutoSync";
import { useAccesoAreaAlmacen } from "@/hooks/useAccesoAreaAlmacen";
import { MaterialIcon } from "@/shared/ui";
import { AlmacenColaLateral } from "../../components/almacen-tablero/AlmacenColaLateral";
import { AlmacenPickingList } from "../../components/almacen-tablero/AlmacenPickingList";
import { RechazoPedidoModal } from "../../components/almacen-tablero/RechazoPedidoModal";
import {
  playKioskChime,
  setSilence15Min,
  getSoundTheme,
  setSoundTheme,
  playSoundByTheme,
  type SoundTheme,
} from "../../components/almacen-tablero/almacenTableroSound";
import {
  combinarReposConAlertas,
  esReposicion,
  esTicketDesdeAlerta,
  esVenta,
  idPrimeraVenta,
  idPrincipalDeCard,
  idsSolicitudEnMismoGrupo,
  primeraPrioridad,
  ventasOrdenadas,
} from "../../components/almacen-tablero/almacenTableroUtils";
import { AlmacenSolicitudesApi } from "../../services/AlmacenSolicitudesService";
import { DashboardService } from "../../services/DashboardService";
import type { AlmacenSolicitud, AlmacenTicketConsolidado, MotivoRechazoApi } from "../../types/AlmacenSolicitudes";
import type { AlertaReposicion } from "../../types/DashboardStats";
import { mensajeErrorApi } from "../../utils/apiErrors";
import { destinosUnicosEnLote } from "../../utils/solicitudUbicacion";

const PULSE_MS = 8000;
const MANUAL_OVERRIDE_MS = 30_000;

export default function AlmacenTableroPedidosPage() {
  const { acceso: accesoAreaAlmacen } = useAccesoAreaAlmacen(true);
  const [cards, setCards] = useState<AlmacenSolicitud[]>([]);
  const [alertasReposicion, setAlertasReposicion] = useState<AlertaReposicion[]>([]);
  const [seleccionId, setSeleccionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pulsando, setPulsando] = useState<Set<number>>(new Set());
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [rechazoCard, setRechazoCard] = useState<AlmacenSolicitud | null>(null);
  const [rechazoCargando, setRechazoCargando] = useState(false);
  const [activeTab, setActiveTab] = useState<"ventas" | "repos">("ventas");
  const [showSettings, setShowSettings] = useState(false);
  const [temaSonido, setTemaSonido] = useState<SoundTheme>(() => getSoundTheme("almacen"));

  const sectorParaCola = undefined;

  const prevVentaIdsRef = useRef<Set<number>>(new Set());
  const prevRepoIdsRef = useRef<Set<number>>(new Set());
  const inicializadoRef = useRef(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const despachoLockRef = useRef(false);
  const seleccionManualUntilRef = useRef(0);
  const syncColaRef = useRef<{ nuevosVentas: number[]; nuevosRepos: number[] }>({
    nuevosVentas: [],
    nuevosRepos: [],
  });

  const puedeAutoPriorizarVentas = () => Date.now() >= seleccionManualUntilRef.current;

  const marcarSeleccionManual = useCallback(() => {
    seleccionManualUntilRef.current = Date.now() + MANUAL_OVERRIDE_MS;
  }, []);

  const limpiarSeleccionManual = useCallback(() => {
    seleccionManualUntilRef.current = 0;
  }, []);

  const agregarPulso = useCallback((ids: number[]) => {
    if (ids.length === 0) return;
    setPulsando((old) => {
      const next = new Set(old);
      ids.forEach((id) => next.add(id));
      return next;
    });
    window.setTimeout(() => {
      setPulsando((old) => {
        const next = new Set(old);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }, PULSE_MS);
  }, []);

  const detectarCambiosCola = useCallback((lista: AlmacenSolicitud[]) => {
    const ventaIds = new Set<number>();
    const repoIds = new Set<number>();
    for (const c of lista) {
      if (esVenta(c)) {
        ventaIds.add(c.idSolicitud);
      } else if (!esTicketDesdeAlerta(c)) {
        repoIds.add(c.idSolicitud);
      }
    }

    const prevVentas = prevVentaIdsRef.current;
    const prevRepos = prevRepoIdsRef.current;
    let nuevosVentas: number[] = [];
    let nuevosRepos: number[] = [];

    if (inicializadoRef.current) {
      nuevosVentas = [...ventaIds].filter((id) => !prevVentas.has(id));
      nuevosRepos = [...repoIds].filter((id) => !prevRepos.has(id));
      if (nuevosVentas.length > 0) {
        void playKioskChime();
        agregarPulso(nuevosVentas);
      }
    } else {
      inicializadoRef.current = true;
    }

    prevVentaIdsRef.current = ventaIds;
    prevRepoIdsRef.current = repoIds;
    syncColaRef.current = { nuevosVentas, nuevosRepos };
  }, [agregarPulso]);

  const cargar = useCallback(async () => {
    try {
      const [data, alertas] = await Promise.all([
        AlmacenSolicitudesApi.cola(sectorParaCola),
        DashboardService.obtenerAlertasReposicion().catch(() => [] as AlertaReposicion[]),
      ]);
      setError(null);
      detectarCambiosCola(data);
      setCards(data);
      setAlertasReposicion(alertas);
    } catch (e: any) {
      setError(mensajeErrorApi(e));
    }
  }, [detectarCambiosCola, sectorParaCola]);

  useAutoSync(cargar, [
    'SOLICITUD_CREADA',
    'SOLICITUD_ATENDIDA',
    'SOLICITUD_RECHAZADA',
    'NUEVA_VENTA',
    'REPOSICION_AUTOMATICA',
  ], 800);

  useEffect(() => {
    void cargar();
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

  const ventas = useMemo(() => cards.filter(esVenta), [cards]);
  const repos = useMemo(
    () => combinarReposConAlertas(cards, alertasReposicion),
    [cards, alertasReposicion]
  );

  const primerVentaId = useMemo(() => idPrimeraVenta(cards), [cards]);

  const ticketsCola = useMemo(
    () => [...ventas, ...repos],
    [ventas, repos]
  );

  useEffect(() => {
    const { nuevosVentas, nuevosRepos } = syncColaRef.current;
    syncColaRef.current = { nuevosVentas: [], nuevosRepos: [] };

    const idsValidos = new Set(ticketsCola.map((c) => c.idSolicitud));
    const hayVentas = ventas.length > 0;

    if (nuevosRepos.length > 0 && !hayVentas) {
      const idsPulso = nuevosRepos.flatMap((id) => {
        const card = cards.find((c) => c.idSolicitud === id);
        if (!card) return [id];
        return idsSolicitudEnMismoGrupo(cards, card);
      });
      agregarPulso(idsPulso);
    }

    if (nuevosVentas.length > 0) {
      limpiarSeleccionManual();
      setActiveTab("ventas");
      const ordenadas = ventasOrdenadas(cards);
      const objetivo =
        ordenadas.find((c) => nuevosVentas.includes(c.idSolicitud)) ?? ordenadas[0];
      if (objetivo) {
        setSeleccionId(idPrincipalDeCard(cards, objetivo));
      }
      return;
    }

    const isMobile = window.innerWidth < 1024;
    let forzarTabVentas = false;

    setSeleccionId((prev) => {
      if (prev != null && !idsValidos.has(prev)) {
        return primeraPrioridad(ticketsCola);
      }

      if (
        !isMobile &&
        hayVentas &&
        prev != null &&
        puedeAutoPriorizarVentas()
      ) {
        const sel = ticketsCola.find((c) => c.idSolicitud === prev);
        if (sel && esReposicion(sel)) {
          forzarTabVentas = true;
          return idPrimeraVenta(cards);
        }
      }

      if (prev != null && idsValidos.has(prev)) {
        return prev;
      }

      if (isMobile) return prev;

      return primeraPrioridad(ticketsCola);
    });

    if (forzarTabVentas) {
      setActiveTab("ventas");
    }
  }, [
    cards,
    ventas.length,
    ticketsCola,
    alertasReposicion,
    agregarPulso,
    limpiarSeleccionManual,
  ]);

  const handleTabChange = useCallback(
    (tab: "ventas" | "repos") => {
      if (tab === "repos") {
        marcarSeleccionManual();
      }
      setActiveTab(tab);
    },
    [marcarSeleccionManual]
  );

  const handleSelect = useCallback(
    (id: number) => {
      const card = ticketsCola.find((c) => c.idSolicitud === id);
      if (card && esReposicion(card)) {
        marcarSeleccionManual();
      }
      setSeleccionId(id);
    },
    [ticketsCola, marcarSeleccionManual]
  );

  const handleIrAVentas = useCallback(() => {
    limpiarSeleccionManual();
  }, [limpiarSeleccionManual]);

  const seleccionada = useMemo(() => {
    const todos = [...ventas, ...repos];
    return todos.find((c) => c.idSolicitud === seleccionId) ?? null;
  }, [ventas, repos, seleccionId]);

  const ticketConsolidado = useMemo((): AlmacenTicketConsolidado | null => {
    if (!seleccionada) return null;
    if (!seleccionada.codigoLote) return seleccionada;
    const loteItems = cards.filter(
      (c) =>
        c.codigoLote === seleccionada.codigoLote &&
        c.idUsuario === seleccionada.idUsuario
    );
    const destinos = destinosUnicosEnLote(loteItems);
    const [primario, ...restoDestinos] = destinos;
    return {
      ...seleccionada,
      pisoDestino: primario?.piso ?? seleccionada.pisoDestino,
      sectorDestino: primario?.area ?? seleccionada.sectorDestino,
      etiquetaDestino: primario?.etiqueta ?? seleccionada.etiquetaDestino,
      lineas: loteItems.flatMap((c) => c.lineas),
      idsEnLote: loteItems.map((c) => c.idSolicitud),
      destinosEnLote: restoDestinos.length > 0 ? restoDestinos : undefined,
    };
  }, [cards, seleccionada]);

  const onConfirmarTodo = async (cantidadEnvio?: number) => {
    if (!ticketConsolidado || despachoLockRef.current) return;

    if (esTicketDesdeAlerta(ticketConsolidado)) {
      const idVariante = ticketConsolidado.idVarianteAlerta;
      const idUa = ticketConsolidado.idUbicacionAreaAlerta;
      if (idVariante == null || idUa == null) return;
      despachoLockRef.current = true;
      setProcesandoId(seleccionId);
      try {
        await DashboardService.reponerAlerta(idVariante, idUa, cantidadEnvio);
        const data = await AlmacenSolicitudesApi.cola(sectorParaCola);
        setCards(data);
        const creada = data.find(
          (c) =>
            !esVenta(c) &&
            c.idUbicacionAreaDestino === idUa &&
            c.lineas.some((l) => l.idVariante === idVariante)
        );
        if (creada) {
          await AlmacenSolicitudesApi.atender(creada.idSolicitud);
        }
        setError(null);
        await cargar();
        limpiarSeleccionManual();
        setSeleccionId(null);
      } catch (e: unknown) {
        setError(mensajeErrorApi(e));
      } finally {
        despachoLockRef.current = false;
        setProcesandoId(null);
      }
      return;
    }

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
      const resultado = await AlmacenSolicitudesApi.atenderLote(ids);
      if (resultado.rechazados.length > 0 && resultado.atendidos.length > 0) {
        setError(
          `${resultado.atendidos.length} despachado(s), ${resultado.rechazados.length} rechazado(s) por falta de stock`
        );
      } else if (resultado.rechazados.length > 0 && resultado.atendidos.length === 0) {
        setError("Rechazado por falta de stock físico");
      } else {
        setError(null);
      }
      await cargar();
      limpiarSeleccionManual();
      setSeleccionId(null);
    } catch (e: any) {
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
      limpiarSeleccionManual();
      setSeleccionId(null);
    } catch (e: any) {
      setError(mensajeErrorApi(e));
    } finally {
      setRechazoCargando(false);
      setProcesandoId(null);
    }
  };

  return (
    <div className="bg-[var(--app-bg)] text-left flex flex-col h-full min-h-0 overflow-hidden animate-fadeIn">
      <header className="flex justify-between items-center px-6 py-4 bg-[var(--app-surface)] border-b border-[var(--app-border)] shrink-0">
        <div className="flex items-center gap-3">
          {seleccionId && (
            <button
              type="button"
              onClick={() => setSeleccionId(null)}
              className="lg:hidden p-2 -ml-2 rounded-full hover:bg-[var(--app-hover-overlay)] app-heading active:scale-95 transition-all"
              aria-label="Volver a la cola"
            >
              <MaterialIcon icon="chevron_left" className="w-6 h-6" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-black tracking-tight app-heading leading-none uppercase">
              {seleccionId ? "Picking" : "Tickets"}
            </h1>
            <p className="text-[9px] font-black app-text-faint uppercase tracking-widest leading-none mt-1">
              Dakani Warehouse
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div ref={settingsRef} className="relative">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2.5 rounded-xl transition-all ${
                showSettings ? "bg-[var(--app-accent)] text-[var(--app-accent-fg)]" : "hover:bg-[var(--app-hover-overlay)] app-text-faint"
              }`}
              aria-expanded={showSettings}
              aria-haspopup="menu"
            >
              <MaterialIcon icon="settings" className="w-5 h-5" />
            </button>

            {showSettings && (
              <div
                className="absolute right-0 mt-2 w-72 bg-[var(--app-surface-glass)] backdrop-blur-md rounded-3xl shadow-2xl border border-[var(--app-border)] z-[100] p-4 animate-slideUpFade"
                role="menu"
              >
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--app-border)]">
                  <span className="text-[10px] font-black uppercase tracking-widest app-heading">
                    Configuración de Alertas
                  </span>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    setSilence15Min();
                    setShowSettings(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 mb-4 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-bold text-amber-900 transition-all active:scale-[0.98]"
                >
                  <MaterialIcon icon="volume_off" className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Silenciar por 15 Minutos</span>
                </button>

                <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest app-text-faint block px-1 mb-1">
                    Tema del Timbre
                  </span>
                  
                  {([
                    { id: "boutique", label: "Boutique Chime", desc: "Acorde elegante y suave" },
                    { id: "crystal", label: "Crystal Ping", desc: "Tono cristalino agudo" },
                    { id: "double", label: "Doble Beep", desc: "Dos tonos rápidos y limpios" },
                    { id: "kiosk", label: "Kiosk Clásico", desc: "Tres tonos clásicos de Dakani" },
                    { id: "mute", label: "Silenciado", desc: "Sin alertas de sonido" }
                  ] as { id: SoundTheme; label: string; desc: string }[]).map((theme) => {
                    const active = temaSonido === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => {
                          setSoundTheme("almacen", theme.id);
                          setTemaSonido(theme.id);
                          void playSoundByTheme(theme.id);
                        }}
                        className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-xl border text-xs transition-all active:scale-[0.99] ${
                          active
                            ? "bg-[var(--app-accent)] border-[var(--app-accent)] text-[var(--app-accent-fg)] shadow-md font-bold"
                            : "bg-[var(--app-bg-muted)] hover:bg-[var(--app-surface-elevated)] border-[var(--app-border)] app-text-muted"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className={`font-semibold ${active ? "text-[var(--app-accent-fg)]" : "app-heading"}`}>{theme.label}</p>
                          <p className={`text-[10px] mt-0.5 ${active ? "opacity-70" : "app-text-faint"}`}>{theme.desc}</p>
                        </div>
                        {active && (
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
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
          absolute inset-0 z-10 bg-[var(--app-bg)] flex flex-col transition-transform duration-300
          lg:relative lg:translate-x-0 lg:w-[22rem] xl:w-[26rem] lg:border-r lg:border-[var(--app-border)]
          ${seleccionId ? "-translate-x-full lg:translate-x-0" : "translate-x-0"}
        `}
        >
          <AlmacenColaLateral
            ventas={ventas}
            repos={repos}
            seleccionId={seleccionId}
            pulsando={pulsando}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onSelect={handleSelect}
            primerVentaId={primerVentaId}
            onIrAVentas={handleIrAVentas}
            encabezadoExtra={
              accesoAreaAlmacen?.etiquetaAreaAsignada ? (
                <div className="px-4 py-3 border-b border-[var(--app-border)] shrink-0">
                  <p className="text-[9px] font-black app-text-faint uppercase tracking-widest">
                    Cola · {accesoAreaAlmacen.etiquetaAreaAsignada}
                  </p>
                </div>
              ) : null
            }
          />
        </aside>

        <main
          className={`
          absolute inset-0 bg-[var(--app-bg)] flex flex-col transition-transform duration-300
          lg:relative lg:flex-1 lg:translate-x-0
          ${seleccionId ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        `}
        >
          {ticketConsolidado ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 min-h-0">
              <AlmacenPickingList
                ticket={ticketConsolidado}
                procesando={procesandoId != null}
                esDesdeAlerta={esTicketDesdeAlerta(ticketConsolidado)}
                onConfirmarTodo={(cantidad) => void onConfirmarTodo(cantidad)}
                onRechazar={() =>
                  seleccionada && !esTicketDesdeAlerta(seleccionada) && setRechazoCard(seleccionada)
                }
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="h-20 w-20 rounded-[2rem] bg-[var(--app-surface)] border border-[var(--app-border)] shadow-sm flex items-center justify-center mb-6">
                <MaterialIcon icon="inbox" className="w-10 h-10 app-text-faint" />
              </div>
              <p className="text-[10px] font-black app-text-faint uppercase tracking-[0.2em] max-w-[200px]">
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

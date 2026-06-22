import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAutoSync } from "@/hooks/useAutoSync";
import { useAccesoAreaAlmacen } from "@/hooks/useAccesoAreaAlmacen";
import { MaterialIcon, PageHeader } from "@/shared/ui";
import { AlmacenColaLateral } from "../../components/almacen-tablero/AlmacenColaLateral";
import { AlmacenPickingList } from "../../components/almacen-tablero/AlmacenPickingList";
import { SupervisorTicketView } from "../../components/almacen-tablero/SupervisorTicketView";
import { SupervisorHistorialView } from "../../components/almacen-tablero/SupervisorHistorialView";
import { SupervisorHistorialDetailView } from "../../components/almacen-tablero/SupervisorHistorialDetailView";
import { RechazoPedidoModal } from "../../components/almacen-tablero/RechazoPedidoModal";
import { DatePickerPopover } from "../../components/reportes/shared/DatePickerPopover";
import { useAuth } from "@/context/AuthContext";
import {
  playKioskChime,
  setSilence15Min,
  getSoundTheme,
  setSoundTheme,
  playSoundByTheme,
  type SoundTheme,
} from "../../components/almacen-tablero/almacenTableroSound";
import {
  esReposicion,
  esVenta,
  idPrimeraVenta,
  idPrincipalDeCard,
  idsSolicitudEnMismoGrupo,
  primeraPrioridad,
  ventasOrdenadas,
} from "../../components/almacen-tablero/almacenTableroUtils";
import { AlmacenSolicitudesApi, SupervisorSolicitudesApi } from "../../services/almacenSolicitudesService";
import type { AlmacenSolicitud, AlmacenTicketConsolidado, RechazoBody, SupervisorHistorialSolicitudItem } from "../../types/AlmacenSolicitudes";
import { mensajeErrorApi } from "../../utils/apiErrors";
import { destinosUnicosEnLote } from "../../utils/solicitudUbicacion";
import type { AreaCatalogo } from "../../types/EstructuraAlmacen";

const PULSE_MS = 8000;
const MANUAL_OVERRIDE_MS = 30_000;

export default function AlmacenTableroPedidosPage() {
  const { acceso: accesoAreaAlmacen } = useAccesoAreaAlmacen(true);
  const { tieneRol } = useAuth();
  const esSupervisor = tieneRol('ROLE_SUPERVISOR_ALMACEN');
  const [cards, setCards] = useState<AlmacenSolicitud[]>([]);
  const [seleccionId, setSeleccionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pulsando, setPulsando] = useState<Set<number>>(new Set());
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [rechazoCard, setRechazoCard] = useState<AlmacenSolicitud | null>(null);
  const [rechazoCargando, setRechazoCargando] = useState(false);
  const [activeTab, setActiveTab] = useState<"ventas" | "repos">("ventas");
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [temaSonido, setTemaSonido] = useState<SoundTheme>(() => getSoundTheme("almacen"));

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const [historialItems, setHistorialItems] = useState<SupervisorHistorialSolicitudItem[]>([]);
  const [historialCargando, setHistorialCargando] = useState(false);
  const [historialSeleccionId, setHistorialSeleccionId] = useState<number | null>(null);
  const [fechaHistorial, setFechaHistorial] = useState(() => new Date().toISOString().slice(0, 10));
  const [areaHistorialId, setAreaHistorialId] = useState<number | undefined>(undefined);
  const [tipoHistorial, setTipoHistorial] = useState("");
  const [estadoHistorial, setEstadoHistorial] = useState("");
  const [isTipoOpen, setIsTipoOpen] = useState(false);
  const [isAreaOpen, setIsAreaOpen] = useState(false);
  const [isEstadoOpen, setIsEstadoOpen] = useState(false);
  const [areasDisponibles, setAreasDisponibles] = useState<AreaCatalogo[]>([]);

  const sectorParaCola = undefined;

  const prevVentaIdsRef = useRef<Set<number>>(new Set());
  const prevRepoIdsRef = useRef<Set<number>>(new Set());
  const inicializadoRef = useRef(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const tipoRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const estadoRef = useRef<HTMLDivElement>(null);
  const despachoLockRef = useRef(false);
  const seleccionManualUntilRef = useRef(0);
  const syncColaRef = useRef<{ nuevosVentas: number[]; nuevosRepos: number[] }>({
    nuevosVentas: [],
    nuevosRepos: [],
  });
  const targetSelectionRef = useRef<number | null>(null);
  const navParamsRef = useRef<{ idVariante: number; idUbicacionArea: number } | null>(null);
  const [searchParams] = useSearchParams();

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
      } else {
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
      const data = await AlmacenSolicitudesApi.cola(sectorParaCola);
      setError(null);
      detectarCambiosCola(data);
      setCards(data);
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

  useEffect(() => {
    SupervisorSolicitudesApi.listarAreas().then(setAreasDisponibles).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tipoRef.current && !tipoRef.current.contains(e.target as Node)) {
        setIsTipoOpen(false);
      }
      if (areaRef.current && !areaRef.current.contains(e.target as Node)) {
        setIsAreaOpen(false);
      }
      if (estadoRef.current && !estadoRef.current.contains(e.target as Node)) {
        setIsEstadoOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    let dirty = false;

    const solicitudId = searchParams.get('solicitudId');
    if (solicitudId) {
      targetSelectionRef.current = parseInt(solicitudId);
      url.searchParams.delete('solicitudId');
      dirty = true;
    }

    const vi = searchParams.get('varianteId');
    const ua = searchParams.get('ubicacionAreaId');
    if (vi && ua) {
      navParamsRef.current = { idVariante: parseInt(vi), idUbicacionArea: parseInt(ua) };
      url.searchParams.delete('varianteId');
      url.searchParams.delete('ubicacionAreaId');
      dirty = true;
    }

    if (dirty) {
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const ventas = useMemo(() => cards.filter(esVenta), [cards]);
  const repos = useMemo(
    () => cards.filter(c => !esVenta(c)),
    [cards]
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

    const targetId = targetSelectionRef.current;
    if (targetId != null) {
      targetSelectionRef.current = null;
      setActiveTab("repos");
      setSeleccionId(targetId);
      return;
    }

    const navTarget = navParamsRef.current;
    if (navTarget != null && cards.length > 0) {
      navParamsRef.current = null;
      const match = cards.find(
        c => !esVenta(c) &&
          c.idUbicacionAreaDestino === navTarget.idUbicacionArea &&
          c.lineas.some(l => l.idVariante === navTarget.idVariante)
      );
      if (match) {
        setActiveTab("repos");
        setSeleccionId(match.idSolicitud);
        return;
      }
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

    if (!hayVentas && repos.length > 0) {
      setActiveTab("repos");
    }

    if (hayVentas && puedeAutoPriorizarVentas()) {
      setActiveTab((prev) => prev === "repos" ? "ventas" : prev);
    }
  }, [
    cards,
    ventas.length,
    ticketsCola,
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

  const cargarHistorial = useCallback(async () => {
    setHistorialCargando(true);
    try {
      const data = await SupervisorSolicitudesApi.historial(fechaHistorial, areaHistorialId, tipoHistorial || undefined);
      setHistorialItems(data);
      if (data.length > 0 && !historialSeleccionId) {
        setHistorialSeleccionId(data[0].idSolicitud);
      } else if (data.length === 0) {
        setHistorialSeleccionId(null);
      }
      setError(null);
    } catch (e: any) {
      setError(mensajeErrorApi(e));
    } finally {
      setHistorialCargando(false);
    }
  }, [fechaHistorial, areaHistorialId, tipoHistorial]);

  useEffect(() => {
    if (mostrarHistorial) {
      void cargarHistorial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarHistorial]);

  useEffect(() => {
    if (!mostrarHistorial) return;
    const timer = setTimeout(() => {
      setHistorialSeleccionId(null);
      void cargarHistorial();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaHistorial, areaHistorialId, tipoHistorial]);

  const historialFiltrados = useMemo(() => {
    if (!estadoHistorial) return historialItems;
    return historialItems.filter(i => i.estado === estadoHistorial);
  }, [historialItems, estadoHistorial]);

  const historialSeleccionado = useMemo(() => {
    return historialFiltrados.find(i => i.idSolicitud === historialSeleccionId) ?? null;
  }, [historialFiltrados, historialSeleccionId]);

  const onConfirmarTodo = async (cantidadEnvio?: number) => {
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
      const resultado = await AlmacenSolicitudesApi.atenderLote(ids);
      if (resultado.rechazados.length > 0 && resultado.atendidos.length > 0) {
        setError(
          `${resultado.atendidos.length} despachado(s), ${resultado.rechazados.length} rechazado(s) por falta de stock`
        );
      } else if (resultado.rechazados.length > 0 && resultado.atendidos.length === 0) {
        setError("Rechazado por falta de stock físico");
      } else {
        setError(null);
        setSuccessMsg("Pedido completado exitosamente");
        await new Promise((r) => setTimeout(r, 800));
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

  const onRechazarConfirmar = async (body: RechazoBody) => {
    if (!rechazoCard) return;
    const ids = idsSolicitudEnMismoGrupo(cards, rechazoCard);
    setRechazoCargando(true);
    setProcesandoId(rechazoCard.idSolicitud);
    try {
      for (const id of ids) {
        await AlmacenSolicitudesApi.rechazar(id, body);
      }
      setError(null);
      setSuccessMsg("Pedido rechazado");
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

  const toolbarPills = esSupervisor ? (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => { setMostrarHistorial(false); setSeleccionId(null); }}
        className={`shrink-0 snap-start min-h-10 px-4 py-2 text-xs sm:text-sm font-bold tracking-wide uppercase transition-all rounded-lg touch-manipulation whitespace-nowrap ${
          !mostrarHistorial
            ? 'app-btn-primary shadow-sm'
            : 'app-text-muted hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]'
        }`}
      >
        Solicitudes Pendientes
      </button>
      <button
        type="button"
        onClick={() => { setMostrarHistorial(true); setSeleccionId(null); setHistorialSeleccionId(null); }}
        className={`shrink-0 snap-start min-h-10 px-4 py-2 text-xs sm:text-sm font-bold tracking-wide uppercase transition-all rounded-lg touch-manipulation whitespace-nowrap ${
          mostrarHistorial
            ? 'app-btn-primary shadow-sm'
            : 'app-text-muted hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]'
        }`}
      >
        Historial
      </button>
    </div>
  ) : null;

  const toolbarFiltrosHistorial = null;

  return (
    <div className="app-page p-2 sm:p-3 mx-auto h-full flex flex-col min-h-0 font-sans">
      <PageHeader
        className="relative z-30"
        surface="elevated"
        variant="almacen"
        title={seleccionId || historialSeleccionId ? "Gestión de Tickets" : "Tickets"}
        subtitle="Gestión de Solicitudes de Venta y Reposición de Mercadería"
        toolbar={
          <div className="flex flex-col gap-3 min-w-0">
            {toolbarPills}
          </div>
        }
        actions={
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
        }
      />

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start justify-between gap-3 shrink-0 animate-fadeIn">
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

      {successMsg && (
        <div className="mb-4 bg-green-50 border border-green-100 rounded-xl sm:rounded-2xl text-green-700 text-sm font-semibold px-4 py-3 sm:px-6 sm:py-4 flex items-center gap-3 shrink-0">
          <MaterialIcon icon="check_circle" className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {mostrarHistorial && (
        <div className="bg-app-surface rounded-[1.5rem] border border-[var(--app-border)] p-5 sm:p-6 mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] shrink-0">
          <h3 className="text-base font-black app-heading mb-4">Filtros de Búsqueda</h3>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[160px]">
              <DatePickerPopover
                label="Fecha"
                value={fechaHistorial}
                onChange={setFechaHistorial}
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
                Tipo
              </label>
              <div className="relative" ref={tipoRef}>
                <div
                  onClick={() => setIsTipoOpen(!isTipoOpen)}
                  className="w-full bg-app-input text-app-text rounded-xl py-3 px-4 text-sm font-bold border border-[var(--app-border)] flex items-center justify-between cursor-pointer"
                >
                  <span className="truncate">
                    {tipoHistorial === "VENTA" ? "Venta" : tipoHistorial === "REPOSICION" ? "Reposición" : "Todos"}
                  </span>
                  <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isTipoOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {isTipoOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-app-surface border border-app-border rounded-xl shadow-xl overflow-y-auto p-2 animate-fadeIn">
                    {[
                      { value: "", label: "Todos" },
                      { value: "VENTA", label: "Venta" },
                      { value: "REPOSICION", label: "Reposición" },
                    ].map((op) => (
                      <button
                        key={op.value}
                        type="button"
                        onClick={() => { setTipoHistorial(op.value); setIsTipoOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors font-medium ${
                          tipoHistorial === op.value
                            ? "bg-app-accent text-app-accent-fg"
                            : "hover:bg-app-hover-overlay text-app-text"
                        }`}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
                Estado
              </label>
              <div className="relative" ref={estadoRef}>
                <div
                  onClick={() => setIsEstadoOpen(!isEstadoOpen)}
                  className="w-full bg-app-input text-app-text rounded-xl py-3 px-4 text-sm font-bold border border-[var(--app-border)] flex items-center justify-between cursor-pointer"
                >
                  <span className="truncate">
                    {estadoHistorial === "ATENDIDO" ? "Atendido" : estadoHistorial === "CANCELADO" ? "Cancelado" : "Todos"}
                  </span>
                  <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isEstadoOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {isEstadoOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-app-surface border border-app-border rounded-xl shadow-xl overflow-y-auto p-2 animate-fadeIn">
                    {[
                      { value: "", label: "Todos" },
                      { value: "ATENDIDO", label: "Atendido" },
                      { value: "CANCELADO", label: "Cancelado" },
                    ].map((op) => (
                      <button
                        key={op.value}
                        type="button"
                        onClick={() => { setEstadoHistorial(op.value); setIsEstadoOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors font-medium ${
                          estadoHistorial === op.value
                            ? "bg-app-accent text-app-accent-fg"
                            : "hover:bg-app-hover-overlay text-app-text"
                        }`}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
                Área
              </label>
              <div className="relative" ref={areaRef}>
                <div
                  onClick={() => setIsAreaOpen(!isAreaOpen)}
                  className="w-full bg-app-input text-app-text rounded-xl py-3 px-4 text-sm font-bold border border-[var(--app-border)] flex items-center justify-between cursor-pointer"
                >
                  <span className="truncate">
                    {areaHistorialId != null
                      ? areasDisponibles.find(a => a.idArea === areaHistorialId)?.nombre ?? "Todas"
                      : "Todas"}
                  </span>
                  <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isAreaOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {isAreaOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-app-surface border border-app-border rounded-xl shadow-xl overflow-y-auto p-2 animate-fadeIn">
                    {[
                      { value: undefined as number | undefined, label: "Todas" },
                      ...areasDisponibles.map(a => ({ value: a.idArea, label: a.nombre })),
                    ].map((op) => (
                      <button
                        key={String(op.value ?? "")}
                        type="button"
                        onClick={() => { setAreaHistorialId(op.value); setIsAreaOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors font-medium ${
                          areaHistorialId === op.value
                            ? "bg-app-accent text-app-accent-fg"
                            : "hover:bg-app-hover-overlay text-app-text"
                        }`}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => void cargarHistorial()}
                className="min-h-[48px] px-6 py-3.5 rounded-xl bg-[var(--app-accent)] text-[var(--app-accent-fg)] text-sm font-black uppercase tracking-widest"
              >
                Buscar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {mostrarHistorial ? (
          <>
            <aside
              className={`
              absolute inset-0 z-10 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl overflow-hidden flex flex-col transition-transform duration-300
              lg:relative lg:translate-x-0 lg:w-[26rem] xl:w-[30rem] lg:border-r lg:border-[var(--app-border)]
              ${historialSeleccionId ? "-translate-x-full lg:translate-x-0" : "translate-x-0"}
            `}
            >
              <div className="px-4 py-3 border-b border-[var(--app-border)] shrink-0">
                <p className="text-[9px] font-black app-text-faint uppercase tracking-widest">
                  Historial · {fechaHistorial}
                </p>
              </div>
              <SupervisorHistorialView
                items={historialFiltrados}
                seleccionId={historialSeleccionId}
                cargando={historialCargando}
                onSelect={setHistorialSeleccionId}
                onRefresh={() => void cargarHistorial()}
              />
            </aside>

            <main
              className={`
              absolute inset-0 bg-[var(--app-bg)] flex flex-col transition-transform duration-300
              lg:relative lg:flex-1 lg:translate-x-0
              ${historialSeleccionId ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
            `}
            >
              {historialSeleccionado ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 lg:p-5 min-h-0">
                  <SupervisorHistorialDetailView item={historialSeleccionado} />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="h-20 w-20 rounded-[2rem] bg-[var(--app-surface)] border border-[var(--app-border)] shadow-sm flex items-center justify-center mb-6">
                    <MaterialIcon icon="history" className="w-10 h-10 app-text-faint" />
                  </div>
                  <p className="text-[10px] font-black app-text-faint uppercase tracking-[0.2em] max-w-[200px]">
                    Selecciona un registro para ver el detalle
                  </p>
                </div>
              )}
            </main>
          </>
        ) : (
          <>
            <aside
              className={`
              absolute inset-0 z-10 bg-[var(--app-bg)] flex flex-col transition-transform duration-300
              lg:relative lg:translate-x-0 lg:w-[26rem] xl:w-[30rem] lg:border-r lg:border-[var(--app-border)]
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
                esSupervisor={esSupervisor}
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
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 lg:p-5 min-h-0">
                  {esSupervisor ? (
                    <SupervisorTicketView ticket={ticketConsolidado} />
                  ) : (
                    <AlmacenPickingList
                      ticket={ticketConsolidado}
                      procesando={procesandoId != null}
                      esDesdeAlerta={false}
                      onConfirmarTodo={(cantidad) => void onConfirmarTodo(cantidad)}
                      onRechazar={() =>
                        seleccionada && setRechazoCard(seleccionada)
                      }
                    />
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="h-20 w-20 rounded-[2rem] bg-[var(--app-surface)] border border-[var(--app-border)] shadow-sm flex items-center justify-center mb-6">
                    <MaterialIcon icon="inbox" className="w-10 h-10 app-text-faint" />
                  </div>
                  <p className="text-[10px] font-black app-text-faint uppercase tracking-[0.2em] max-w-[200px]">
                    {esSupervisor
                      ? "Selecciona un ticket para ver el detalle"
                      : "Selecciona un ticket para comenzar el picking"}
                  </p>
                </div>
              )}
            </main>
          </>
        )}
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

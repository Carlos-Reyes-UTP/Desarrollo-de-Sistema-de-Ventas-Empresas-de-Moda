import { MaterialIcon } from "@/shared/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BorderBeam } from "border-beam";
import type { VendedorSolicitudResumen } from "../../types/Vendedor";
import {
  getSoundTheme,
  setSoundTheme,
  playSoundByTheme,
  type SoundTheme,
} from "../almacen-tablero/almacenTableroSound";

export interface VendedorAlmacenActualizacion {
  idSolicitud: number;
  nombreProducto: string;
  estado: "ATENDIDO" | "CANCELADO";
  color?: string;
  talla?: string;
  cantidad?: number;
}

interface VendedorPisoPedidosDockProps {
  pedidos: VendedorSolicitudResumen[];
  onNuevaRespuestaAlmacen?: (items: VendedorAlmacenActualizacion[]) => void;
  onCancelarPedido?: (idSolicitud: number) => void | Promise<void>;
  cancelandoSolicitudId?: number | null;
}

const etiquetaEstado = (estado: string): { label: string; dot: string } => {
  switch (estado) {
    case "PENDIENTE":
      return { label: "Pendiente", dot: "bg-amber-400 animate-pulse" };
    case "ATENDIDO":
      return { label: "Listo", dot: "bg-emerald-500" };
    case "CANCELADO":
      return { label: "Rechazado", dot: "bg-red-500" };
    default:
      return { label: estado, dot: "bg-gray-400" };
  }
};

const etiquetaTipo = (tipo: string): string => {
  if (tipo === "VENTA") return "Piso de ventas";
  if (tipo === "REPOSICION") return "Reposición auto";
  return tipo;
};

function formatearHora(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export const VendedorPisoPedidosDock = ({
  pedidos,
  onNuevaRespuestaAlmacen,
  onCancelarPedido,
  cancelandoSolicitudId = null,
}: VendedorPisoPedidosDockProps) => {
  const [abierto, setAbierto] = useState(false);
  const [hasNewResponse, setHasNewResponse] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [temaSonido, setTemaSonido] = useState<SoundTheme>(() => getSoundTheme("vendedor"));

  const prevPedidosRef = useRef(pedidos);
  const abiertoRef = useRef(abierto);
  const panelRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);

  abiertoRef.current = abierto;

  useEffect(() => {
    const prevPedidos = prevPedidosRef.current;
    const updates: VendedorAlmacenActualizacion[] = [];

    const isFirstLoad = prevPedidos.length === 0 && pedidos.length > 0;

    if (!isFirstLoad) {
      pedidos.forEach((pedido) => {
        const prev = prevPedidos.find((p) => p.idSolicitud === pedido.idSolicitud);
        if (
          prev &&
          prev.estado === "PENDIENTE" &&
          (pedido.estado === "ATENDIDO" || pedido.estado === "CANCELADO")
        ) {
          updates.push({
            idSolicitud: pedido.idSolicitud,
            nombreProducto: pedido.nombreProducto,
            estado: pedido.estado as "ATENDIDO" | "CANCELADO",
            color: pedido.color,
            talla: pedido.talla,
            cantidad: pedido.cantidad,
          });
        }
      });
    }

    prevPedidosRef.current = pedidos;

    if (updates.length === 0) {
      return undefined;
    }

    // Play synthesis chime according to the seller's active theme
    const activeTheme = getSoundTheme("vendedor");
    void playSoundByTheme(activeTheme);

    // Bubble enriched update objects to parent stack
    onNuevaRespuestaAlmacen?.(updates);

    if (!abiertoRef.current) {
      setHasNewResponse(true);
    }

    const timer = setTimeout(() => {
      setHasNewResponse(false);
    }, 8000);

    return () => clearTimeout(timer);
  }, [pedidos, onNuevaRespuestaAlmacen]);

  useEffect(() => {
    if (abierto) {
      setHasNewResponse(false);
    }
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return undefined;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setAbierto(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return undefined;

    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (botonRef.current?.contains(target)) return;
      setAbierto(false);
    };

    const t = window.setTimeout(() => {
      document.addEventListener("mousedown", onPointer);
      document.addEventListener("touchstart", onPointer, { passive: true });
    }, 0);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [abierto]);

  const ordenados = useMemo(
    () =>
      pedidos.toSorted(
        (a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
      ),
    [pedidos]
  );

  const pendientes = useMemo(
    () => ordenados.filter((p) => p.estado === "PENDIENTE").length,
    [ordenados]
  );

  const cerrar = useCallback(() => {
    setAbierto(false);
    setShowConfig(false);
  }, []);

  const toggle = useCallback(() => {
    setAbierto((v) => !v);
    if (abierto) {
      setShowConfig(false);
    }
  }, [abierto]);

  const panelContent = (
    <div
      ref={panelRef}
      id="vendedor-pedidos-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="vendedor-pedidos-titulo"
      className="relative max-h-[48vh] w-full max-w-sm md:max-w-md overflow-hidden rounded-3xl border border-[var(--app-border-strong)] bg-[var(--app-surface-glass)]/95 shadow-2xl backdrop-blur-xl animate-slideUpFade flex flex-col"
    >
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-2 border-b border-[var(--app-border)] bg-[var(--app-surface)]/20 px-3 py-2.5 backdrop-blur-sm sm:px-4">
        <div className="min-w-0 flex-1">
          <span id="vendedor-pedidos-titulo" className="text-xs font-black uppercase tracking-widest text-[var(--app-text)]">
            Pedidos de hoy
          </span>
          {ordenados.length > 0 && (
            <p className="mt-0.5 truncate text-[11px] font-bold text-[var(--app-text-muted)]">
              {pendientes > 0 ? `${pendientes} en espera` : "Nada pendiente"} · {ordenados.length} total
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {/* BOTÓN CONFIGURACIÓN SONIDO */}
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className={`rounded-xl p-2 transition-all active:scale-95 ${
              showConfig ? "bg-white text-black font-bold shadow-md" : "text-[var(--app-text-muted)] hover:bg-white/10 hover:text-white"
            }`}
            aria-label="Configuración de sonido de notificaciones"
          >
            <MaterialIcon icon="settings" className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={cerrar}
            className="rounded-xl p-2 text-[var(--app-text-muted)] transition-all hover:bg-white/10 hover:text-white"
            aria-label="Cerrar panel de pedidos"
          >
            <MaterialIcon icon="close" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* PANEL DE AUDIO GLASSMORPHIC */}
      {showConfig && (
        <div className="relative z-10 shrink-0 border-b border-[var(--app-border)] bg-white/[0.02] p-3.5 animate-fadeIn">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-faint)]">
              Tema de Sonido
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {([
              { id: "boutique", label: "Boutique", icon: <MaterialIcon icon="volume_up" className="h-3.5 w-3.5" /> },
              { id: "crystal", label: "Crystal", icon: <MaterialIcon icon="volume_up" className="h-3.5 w-3.5" /> },
              { id: "double", label: "Doble Beep", icon: <MaterialIcon icon="volume_up" className="h-3.5 w-3.5" /> },
              { id: "kiosk", label: "Clásico", icon: <MaterialIcon icon="volume_up" className="h-3.5 w-3.5" /> },
              { id: "mute", label: "Silencio", icon: <MaterialIcon icon="volume_off" className="h-3.5 w-3.5" /> }
            ] as { id: SoundTheme; label: string; icon: React.ReactNode }[]).map((theme) => {
              const active = temaSonido === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    setSoundTheme("vendedor", theme.id);
                    setTemaSonido(theme.id);
                    void playSoundByTheme(theme.id);
                  }}
                  className={`flex items-center gap-1.5 justify-center px-2 py-2 rounded-xl border text-[11px] font-bold transition-all active:scale-[0.98] ${
                    active
                      ? "bg-white border-white text-black shadow-md font-black"
                      : "bg-white/[0.04] border-white/[0.08] text-[var(--app-text-muted)] hover:bg-white/[0.1] hover:text-white"
                  }`}
                >
                  {theme.icon}
                  <span>{theme.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="relative z-10 flex-1 overflow-y-auto px-2 py-2">
        {ordenados.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-[var(--app-text-muted)] font-medium">
            Aún no hay solicitudes hoy. Cuando envíes una, aparecerá aquí.
          </p>
        ) : (
          <ul className="space-y-2">
            {ordenados.map((p, idx) => {
              const { label, dot } = etiquetaEstado(p.estado);
              const hora = formatearHora(p.fechaCreacion);
              const esNovedad = p.estado === "ATENDIDO" || p.estado === "CANCELADO";
              
              return (
                <li
                  key={p.idSolicitud}
                  style={{ animationDelay: `${Math.min(idx, 8) * 35}ms` }}
                  className={`rounded-2xl border px-3 py-3 backdrop-blur-sm transition-all duration-300 animate-fadeIn ${
                    esNovedad 
                      ? p.estado === "ATENDIDO" 
                        ? "border-emerald-500/30 bg-emerald-500/10 shadow-[0_4px_15px_rgba(16,185,129,0.08)]" 
                        : "border-red-500/30 bg-red-500/10 shadow-[0_4px_15px_rgba(239,68,68,0.08)]"
                      : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${dot}`}
                      title={label}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[var(--app-text)]">{p.nombreProducto}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--app-text-muted)] font-medium">
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                            p.tipoSolicitud === "VENTA"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-white/10 text-white/80 border border-white/5"
                          }`}
                        >
                          {etiquetaTipo(p.tipoSolicitud)}
                        </span>
                        <span className="text-white/70">
                          {p.color} · Talla {p.talla} · Cant. {p.cantidad}
                        </span>
                        {hora ? (
                          <span className="text-[10px] font-bold text-[var(--app-text-faint)] tabular-nums">{hora}</span>
                        ) : null}
                      </p>
                      <p
                        className={`mt-1 text-[11px] font-black uppercase tracking-wide ${
                          p.estado === "ATENDIDO"
                            ? "text-emerald-400"
                            : p.estado === "CANCELADO"
                              ? "text-red-400"
                              : "text-[var(--app-text-muted)]"
                        }`}
                      >
                        {label}
                      </p>
                      {p.estado === "PENDIENTE" && onCancelarPedido ? (
                        <button
                          type="button"
                          onClick={() => void onCancelarPedido(p.idSolicitud)}
                          disabled={cancelandoSolicitudId === p.idSolicitud}
                          className="mt-2 rounded-xl border border-white/10 bg-white/5 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white/80 transition-all active:scale-[0.97] disabled:opacity-50"
                        >
                          {cancelandoSolicitudId === p.idSolicitud ? "Cancelando…" : "Cancelar pedido"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );

  const fab = (
    <button
      ref={botonRef}
      type="button"
      onClick={toggle}
      aria-expanded={abierto}
      aria-controls="vendedor-pedidos-panel"
      aria-label={
        abierto
          ? "Cerrar panel de solicitudes a almacén"
          : "Abrir panel de solicitudes a almacén"
      }
      className={`relative flex h-14 min-w-14 items-center justify-center gap-1 rounded-2xl border px-3 text-white shadow-lg transition-all hover:bg-neutral-800 active:scale-[0.98] ${
        abierto ? "border-white/20 bg-neutral-800" : "border-white/10 bg-neutral-950"
      } ${hasNewResponse ? "ring-2 ring-offset-2 ring-emerald-400/90 ring-offset-neutral-900" : ""}`}
    >
      <div className="relative z-10 flex items-center gap-1">
        <MaterialIcon icon="notifications" className="h-6 w-6 shrink-0" />
        {abierto ? <MaterialIcon icon="expand_more" className="h-4 w-4 shrink-0 opacity-80" aria-hidden /> : null}
        {ordenados.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-black animate-bounce-in">
            {pendientes > 0 ? (pendientes > 9 ? "9+" : pendientes) : ordenados.length > 9 ? "9+" : ordenados.length}
          </span>
        )}
      </div>
    </button>
  );

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-[90] flex justify-end p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto flex max-w-full flex-col items-end gap-2">
        {abierto &&
          (hasNewResponse ? (
            <BorderBeam size="line" colorVariant="colorful" duration={8} strength={0.83}>
              {panelContent}
            </BorderBeam>
          ) : (
            panelContent
          ))}

        <div className="relative">
          {hasNewResponse && !abierto ? (
            <BorderBeam size="line" colorVariant="colorful" duration={3} strength={0.9}>
              {fab}
            </BorderBeam>
          ) : (
            fab
          )}
        </div>
      </div>
    </div>
  );
};

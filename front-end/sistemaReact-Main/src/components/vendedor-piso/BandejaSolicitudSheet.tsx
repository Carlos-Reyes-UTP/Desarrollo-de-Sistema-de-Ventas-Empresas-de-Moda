import { useCallback, useEffect, useRef, useState } from "react";
import { MaterialIcon } from "@/shared/ui";
import { useBandeja, type ItemBandeja } from "../../context/BandejaSolicitudContext";
import { VendedorService } from "../../services/VendedorService";
import { mensajeErrorApi } from "@/utils/apiErrors";

// ─── Types ────────────────────────────────────────────────────────────────────

type EstadoItem = "pendiente" | "enviando" | "ok" | "error";

interface EstadoEnvio {
  [key: string]: { estado: EstadoItem; mensaje?: string };
}

interface Props {
  open: boolean;
  onClose: () => void;
  onEnvioCompleto: () => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function BandejaSolicitudSheet({ open, onClose, onEnvioCompleto }: Props) {
  const { items, quitar, limpiar } = useBandeja();
  const [enviando, setEnviando] = useState(false);
  const [estados, setEstados] = useState<EstadoEnvio>({});
  const [visible, setVisible] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const envioLockRef = useRef(false);

  // Animate in/out
  useEffect(() => {
    if (open) {
      setVisible(true);
    } else {
      const t = setTimeout(() => setVisible(false), 350);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const setEstadoItem = (key: string, estado: EstadoItem, mensaje?: string) => {
    setEstados((prev) => ({ ...prev, [key]: { estado, mensaje } }));
  };

  const enviarSecuencial = useCallback(async () => {
    if (envioLockRef.current || enviando || items.length === 0) return;
    envioLockRef.current = true;
    setEnviando(true);

    const estadosIniciales: EstadoEnvio = {};
    items.forEach((item) => {
      estadosIniciales[item.key] = { estado: "enviando" };
    });
    setEstados(estadosIniciales);

    const codigoLote = `LOT-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    try {
      await VendedorService.crearSolicitudLote({
        codigoLote,
        items: items.map((item) => ({
          idVariante: item.idVariante,
          cantidad: item.cantidad,
          idUbicacionAreaDestino: item.idUbicacionAreaDestino,
        })),
      });
      items.forEach((item) => setEstadoItem(item.key, "ok"));
      await new Promise((r) => setTimeout(r, 1200));
      limpiar();
      setEstados({});
      onEnvioCompleto();
      onClose();
    } catch (e) {
      items.forEach((item) =>
        setEstadoItem(item.key, "error", mensajeErrorApi(e))
      );
    } finally {
      envioLockRef.current = false;
      setEnviando(false);
    }
  }, [enviando, items, limpiar, onClose, onEnvioCompleto]);

  if (!visible) return null;

  const okCount = Object.values(estados).filter((e) => e.estado === "ok").length;
  const errCount = Object.values(estados).filter((e) => e.estado === "error").length;
  const hayEstados = Object.keys(estados).length > 0;

  return (
    <div
      className={`fixed inset-0 z-[200] transition-all duration-350 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!enviando ? onClose : undefined}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`absolute bottom-0 left-0 right-0 mx-auto max-w-xl rounded-t-[2.5rem] border-t border-[var(--app-border-strong)] bg-[var(--app-surface-glass)]/98 backdrop-blur-xl shadow-2xl transition-transform duration-350 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "88dvh", display: "flex", flexDirection: "column" }}
      >
        {/* Handle + Header */}
        <div className="flex-shrink-0 px-6 pt-5 pb-4">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/10" />
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight text-white">Resumen del Pedido</h2>
              <p className="text-[11px] font-semibold text-[var(--app-text-muted)] mt-0.5">
                {items.length} {items.length === 1 ? "producto" : "productos"} en la lista
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={enviando}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[var(--app-text-muted)] transition hover:bg-white/20 hover:text-white disabled:opacity-40"
              aria-label="Cerrar"
            >
              <MaterialIcon icon="close" className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--app-border)] flex-shrink-0" />

        {/* Lista de ítems — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MaterialIcon icon="inventory_2" className="h-12 w-12 text-white/10 mb-4" />
              <p className="text-sm font-semibold text-[var(--app-text-muted)]">La lista está vacía</p>
            </div>
          ) : (
            items.map((item) => {
              const est = estados[item.key];
              return (
                <ItemRow
                  key={item.key}
                  item={item}
                  estado={est?.estado ?? "pendiente"}
                  mensajeError={est?.mensaje}
                  onQuitar={quitar}
                  disabled={enviando}
                />
              );
            })
          )}

          {/* Resumen de progreso mientras envía */}
          {hayEstados && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 mt-2">
              <p className="text-[11px] font-bold text-[var(--app-text-muted)] uppercase tracking-widest">
                Progreso: {okCount}/{items.length} enviados
                {errCount > 0 && (
                  <span className="ml-2 text-red-400">· {errCount} con error</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Footer con botón */}
        <div className="flex-shrink-0 px-4 pb-6 pt-4 border-t border-[var(--app-border)]">
          {errCount > 0 && !enviando && (
            <p className="mb-3 text-xs font-semibold text-red-400 text-center">
              Algunos ítems fallaron. Puedes quitarlos e intentar de nuevo.
            </p>
          )}
          <button
            type="button"
            onClick={() => void enviarSecuencial()}
            disabled={enviando || items.length === 0}
            className="flex w-full items-center justify-center gap-3 rounded-[1.8rem] bg-white py-5 text-sm font-black uppercase tracking-widest text-black shadow-2xl transition-all hover:bg-neutral-100 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enviando ? (
              <>
                <MaterialIcon icon="sync" className="h-5 w-5 animate-spin" />
                <span>Enviando {okCount + errCount}/{items.length}...</span>
              </>
            ) : (
              "Enviar Solicitud al Almacén"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  estado,
  mensajeError,
  onQuitar,
  disabled,
}: {
  item: ItemBandeja;
  estado: EstadoItem;
  mensajeError?: string;
  onQuitar: (key: string) => void;
  disabled: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 transition-all ${
        estado === "ok"
          ? "border-emerald-500/20 bg-emerald-500/10 text-white"
          : estado === "error"
          ? "border-red-500/20 bg-red-500/10 text-white"
          : estado === "enviando"
          ? "border-white/10 bg-white/5 opacity-80"
          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
      }`}
    >
      {/* Ícono de estado */}
      <div className="mt-0.5 flex-shrink-0">
        {estado === "ok" && <MaterialIcon icon="check_circle" className="h-5 w-5 text-emerald-400" />}
        {estado === "error" && <MaterialIcon icon="cancel" className="h-5 w-5 text-red-400" />}
        {estado === "enviando" && <MaterialIcon icon="sync" className="h-5 w-5 animate-spin text-white/50" />}
        {estado === "pendiente" && (
          <div className="h-5 w-5 rounded-full border-2 border-white/20" />
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white leading-snug truncate">
          {item.nombreProducto}
        </p>
        <p className="text-[11px] font-bold text-[var(--app-text-muted)] mt-0.5">
          {item.talla} · {item.color} · ×{item.cantidad}
        </p>
        <p className="text-[10px] font-bold text-[var(--app-text-faint)] mt-0.5 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
          {item.nombreUbicacion}
        </p>
        {estado === "error" && mensajeError && (
          <p className="text-[11px] text-red-400 font-bold mt-1">{mensajeError}</p>
        )}
      </div>

      {/* Botón quitar */}
      {estado !== "ok" && (
        <button
          type="button"
          onClick={() => onQuitar(item.key)}
          disabled={disabled}
          className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-xl text-white/40 transition hover:bg-red-500/20 hover:text-red-400 disabled:opacity-30"
          aria-label="Quitar"
        >
          <MaterialIcon icon="delete" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

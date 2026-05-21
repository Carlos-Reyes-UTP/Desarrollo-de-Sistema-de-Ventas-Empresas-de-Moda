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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={!enviando ? onClose : undefined}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`absolute bottom-0 left-0 right-0 mx-auto max-w-xl rounded-t-[2.5rem] bg-white shadow-2xl transition-transform duration-350 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "88dvh", display: "flex", flexDirection: "column" }}
      >
        {/* Handle + Header */}
        <div className="flex-shrink-0 px-6 pt-5 pb-4">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight text-black">Resumen del Pedido</h2>
              <p className="text-[11px] font-semibold text-gray-400 mt-0.5">
                {items.length} {items.length === 1 ? "producto" : "productos"} en la lista
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={enviando}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 disabled:opacity-40"
              aria-label="Cerrar"
            >
              <MaterialIcon icon="close" className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 flex-shrink-0" />

        {/* Lista de ítems — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MaterialIcon icon="inventory_2" className="h-12 w-12 text-gray-200 mb-4" />
              <p className="text-sm font-semibold text-gray-400">La lista está vacía</p>
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
            <div className="rounded-2xl bg-gray-50 px-4 py-3 mt-2">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                Progreso: {okCount}/{items.length} enviados
                {errCount > 0 && (
                  <span className="ml-2 text-red-500">· {errCount} con error</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Footer con botón */}
        <div className="flex-shrink-0 px-4 pb-6 pt-4 border-t border-gray-100">
          {errCount > 0 && !enviando && (
            <p className="mb-3 text-xs font-semibold text-red-500 text-center">
              Algunos ítems fallaron. Puedes quitarlos e intentar de nuevo.
            </p>
          )}
          <button
            type="button"
            onClick={() => void enviarSecuencial()}
            disabled={enviando || items.length === 0}
            className="flex w-full items-center justify-center gap-3 rounded-[1.8rem] bg-black py-5 text-sm font-black uppercase tracking-widest text-white shadow-2xl transition-all hover:bg-gray-900 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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
          ? "border-emerald-200 bg-emerald-50"
          : estado === "error"
          ? "border-red-200 bg-red-50"
          : estado === "enviando"
          ? "border-gray-200 bg-gray-50 opacity-80"
          : "border-gray-100 bg-white"
      }`}
    >
      {/* Ícono de estado */}
      <div className="mt-0.5 flex-shrink-0">
        {estado === "ok" && <MaterialIcon icon="check_circle" className="h-5 w-5 text-emerald-500" />}
        {estado === "error" && <MaterialIcon icon="cancel" className="h-5 w-5 text-red-500" />}
        {estado === "enviando" && <MaterialIcon icon="sync" className="h-5 w-5 animate-spin text-gray-400" />}
        {estado === "pendiente" && (
          <div className="h-5 w-5 rounded-full border-2 border-gray-200" />
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-black leading-snug truncate">
          {item.nombreProducto}
        </p>
        <p className="text-[11px] font-semibold text-gray-500 mt-0.5">
          {item.talla} · {item.color} · ×{item.cantidad}
        </p>
        <p className="text-[10px] font-bold text-gray-400 mt-0.5 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
          {item.nombreUbicacion}
        </p>
        {estado === "error" && mensajeError && (
          <p className="text-[11px] text-red-500 font-semibold mt-1">{mensajeError}</p>
        )}
      </div>

      {/* Botón quitar */}
      {estado !== "ok" && (
        <button
          type="button"
          onClick={() => onQuitar(item.key)}
          disabled={disabled}
          className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
          aria-label="Quitar"
        >
          <MaterialIcon icon="delete" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

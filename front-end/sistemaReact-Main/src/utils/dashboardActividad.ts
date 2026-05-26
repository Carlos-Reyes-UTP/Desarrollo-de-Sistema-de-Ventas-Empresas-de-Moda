import type { AlmacenSolicitud } from '@/types/AlmacenSolicitudes';
import type { Venta } from '@/types/Venta';
import {
  etiquetaPeriodo,
  filtrarVentasPorPeriodo,
  type PeriodoDashboard,
} from '@/utils/dashboardPeriodo';

export type TipoActividadDashboard =
  | 'resumen_ventas'
  | 'ultima_venta'
  | 'cola_almacen'
  | 'solicitud_pendiente'
  | 'evento_live';

export interface ActividadItem {
  id: string;
  tipo: TipoActividadDashboard;
  titulo: string;
  detalle: string;
  icono: string;
  fecha?: Date;
  monto?: number;
}

export interface WebSocketActividadPayload {
  type?: string;
  message?: string;
  idVenta?: number;
  idSolicitud?: number;
  tipoSolicitud?: string;
}

const MAX_ITEMS = 6;
const MAX_SOLICITUDES_URGENTES = 3;
const MAX_EVENTOS_LIVE = 4;

function formatearHora(fecha: Date): string {
  return fecha.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function tiempoRelativo(fecha: Date): string {
  const diffMs = Date.now() - fecha.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `hace ${dias} d`;
}

function itemColaAlmacen(cola: AlmacenSolicitud[]): ActividadItem | null {
  if (cola.length === 0) return null;
  const ventas = cola.filter((s) => s.tipoSolicitud === 'VENTA').length;
  const repos = cola.filter((s) => s.tipoSolicitud !== 'VENTA').length;
  const partes: string[] = [];
  if (ventas > 0) partes.push(`${ventas} venta${ventas > 1 ? 's' : ''}`);
  if (repos > 0) partes.push(`${repos} reposición${repos > 1 ? 'es' : ''}`);
  return {
    id: 'cola-almacen',
    tipo: 'cola_almacen',
    titulo: `${cola.length} solicitud${cola.length > 1 ? 'es' : ''} pendiente${cola.length > 1 ? 's' : ''}`,
    detalle: partes.length > 0 ? partes.join(' · ') : 'En cola de almacén',
    icono: 'inventory_2',
    fecha: new Date(),
  };
}

function itemsSolicitudesUrgentes(cola: AlmacenSolicitud[]): ActividadItem[] {
  return cola.slice(0, MAX_SOLICITUDES_URGENTES).map((s) => ({
    id: `sol-${s.idSolicitud}`,
    tipo: 'solicitud_pendiente' as const,
    titulo:
      s.tipoSolicitud === 'VENTA'
        ? `Pedido de venta #${s.idSolicitud}`
        : `Reposición #${s.idSolicitud}`,
    detalle: [
      s.nombreVendedor || 'Sin vendedor',
      s.etiquetaDestino || s.sectorDestino || s.pisoDestino,
      `${s.lineas?.length ?? 0} línea(s)`,
    ]
      .filter(Boolean)
      .join(' · '),
    icono: s.tipoSolicitud === 'VENTA' ? 'local_shipping' : 'swap_horiz',
    fecha: s.fechaCreacion ? new Date(s.fechaCreacion) : new Date(),
  }));
}

function itemResumenVentas(ventas: Venta[], periodo: PeriodoDashboard): ActividadItem | null {
  const enPeriodo = filtrarVentasPorPeriodo(ventas, periodo);
  if (enPeriodo.length === 0) return null;
  const total = enPeriodo.reduce((s, v) => s + (v.totalVentas ?? 0), 0);
  const etiqueta = etiquetaPeriodo(periodo).toLowerCase();
  return {
    id: `resumen-ventas-${periodo}`,
    tipo: 'resumen_ventas',
    titulo: `${enPeriodo.length} venta${enPeriodo.length > 1 ? 's' : ''} (${etiqueta})`,
    detalle: `Total acumulado en ${etiqueta}`,
    icono: 'insights',
    monto: total,
    fecha: new Date(),
  };
}

function itemUltimaVenta(ventas: Venta[], periodo: PeriodoDashboard): ActividadItem | null {
  const enPeriodo = filtrarVentasPorPeriodo(ventas, periodo);
  const ordenadas = [...enPeriodo].toSorted(
    (a, b) => new Date(b.fechaVenta).getTime() - new Date(a.fechaVenta).getTime()
  );
  const ultima = ordenadas[0];
  if (!ultima) return null;
  const fecha = new Date(ultima.fechaVenta);
  return {
    id: `ultima-venta-${ultima.idVenta ?? 0}`,
    tipo: 'ultima_venta',
    titulo: `Última venta #${ultima.idVenta ?? '—'}`,
    detalle: `${ultima.cliente?.nombreCliente ?? 'Cliente'} · ${formatearHora(fecha)}`,
    icono: 'receipt_long',
    monto: ultima.totalVentas ?? 0,
    fecha,
  };
}

export function mensajeEventoLive(payload: WebSocketActividadPayload): { titulo: string; detalle: string; icono: string } {
  const tipo = payload.type ?? '';
  if (payload.message && tipo === 'NUEVA_VENTA') {
    return { titulo: 'Nueva venta registrada', detalle: payload.message, icono: 'point_of_sale' };
  }
  switch (tipo) {
    case 'NUEVA_VENTA':
      return {
        titulo: 'Nueva venta',
        detalle: payload.idVenta ? `Venta #${payload.idVenta}` : 'Registrada en el sistema',
        icono: 'point_of_sale',
      };
    case 'SOLICITUD_CREADA':
      return {
        titulo: 'Nueva solicitud a almacén',
        detalle: [
          payload.idSolicitud ? `#${payload.idSolicitud}` : null,
          payload.tipoSolicitud,
        ]
          .filter(Boolean)
          .join(' · ') || 'Pendiente de atención',
        icono: 'add_shopping_cart',
      };
    case 'SOLICITUD_ATENDIDA':
      return {
        titulo: 'Solicitud atendida',
        detalle: payload.idSolicitud ? `Pedido #${payload.idSolicitud} completado` : 'Almacén atendió el pedido',
        icono: 'check_circle',
      };
    case 'SOLICITUD_RECHAZADA':
      return {
        titulo: 'Solicitud rechazada',
        detalle: payload.idSolicitud ? `Pedido #${payload.idSolicitud} cancelado` : 'Solicitud no procesada',
        icono: 'cancel',
      };
    case 'ESTRUCTURA_ALMACEN_ACTUALIZADA':
      return {
        titulo: 'Estructura de almacén actualizada',
        detalle: payload.message ?? 'Pisos, áreas o ubicaciones modificados',
        icono: 'corporate_fare',
      };
    case 'INVENTARIO_TRASLADO':
      return {
        titulo: 'Traslado de inventario',
        detalle: payload.message ?? 'Stock movido entre ubicaciones',
        icono: 'swap_horiz',
      };
    default:
      return {
        titulo: 'Actividad del sistema',
        detalle: payload.message ?? (tipo || 'Evento recibido'),
        icono: 'notifications',
      };
  }
}

export function eventoLiveDesdeWebSocket(
  payload: WebSocketActividadPayload,
  index: number
): ActividadItem | null {
  const tipo = payload.type;
  if (
    !tipo ||
    !['NUEVA_VENTA', 'SOLICITUD_CREADA', 'SOLICITUD_ATENDIDA', 'SOLICITUD_RECHAZADA'].includes(tipo)
  ) {
    return null;
  }
  const { titulo, detalle, icono } = mensajeEventoLive(payload);
  const idKey =
    tipo === 'NUEVA_VENTA'
      ? `venta-${payload.idVenta ?? index}`
      : `sol-${payload.idSolicitud ?? index}-${tipo}`;
  return {
    id: `live-${idKey}`,
    tipo: 'evento_live',
    titulo,
    detalle,
    icono,
    fecha: new Date(),
  };
}

export function construirActividadDashboard(
  ventas: Venta[],
  colaAlmacen: AlmacenSolicitud[],
  periodo: PeriodoDashboard = '7d'
): ActividadItem[] {
  const items: ActividadItem[] = [];

  const cola = itemColaAlmacen(colaAlmacen);
  if (cola) items.push(cola);

  items.push(...itemsSolicitudesUrgentes(colaAlmacen));

  const resumen = itemResumenVentas(ventas, periodo);
  if (resumen) items.push(resumen);

  const ultima = itemUltimaVenta(ventas, periodo);
  if (ultima) items.push(ultima);

  return items.slice(0, MAX_ITEMS);
}

export function mergeActividadConEventosLive(
  base: ActividadItem[],
  mensajesWs: unknown[]
): ActividadItem[] {
  const eventos: ActividadItem[] = [];
  const vistos = new Set<string>();

  const recientes = mensajesWs.slice(-20).reverse();
  for (let i = 0; i < recientes.length && eventos.length < MAX_EVENTOS_LIVE; i++) {
    const msg = recientes[i];
    if (!msg || typeof msg !== 'object') continue;
    const payload = msg as WebSocketActividadPayload;
    const item = eventoLiveDesdeWebSocket(payload, i);
    if (!item || vistos.has(item.id)) continue;
    vistos.add(item.id);
    const detalleConTiempo = item.fecha
      ? `${item.detalle} · ${tiempoRelativo(item.fecha)}`
      : item.detalle;
    eventos.push({ ...item, detalle: detalleConTiempo });
  }

  const sinLive = base.filter((b) => b.tipo !== 'evento_live');
  const merged = [...eventos, ...sinLive];
  return merged.slice(0, MAX_ITEMS);
}

export { tiempoRelativo };

import type { CajaDTO } from '../services/CajaService';

/** Datos que se persisten en localStorage durante la apertura de caja. */
export interface DatosAperturaCaja {
  usuario?: string;
  fechaHoraApertura?: string;
  timestampApertura?: string;
  montoApertura?: number;
  numeroOperacionApertura?: string;
  idCaja?: number;
  fechaApertura?: string;
  horaApertura?: string;
}

const STORAGE_KEY = 'datosAperturaCaja:v1';

const formatearFechaHora = (isoString: string): string => {
  const fecha = new Date(isoString);
  const dia = fecha.getDate().toString().padStart(2, '0');
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const año = fecha.getFullYear();
  const horas = fecha.getHours().toString().padStart(2, '0');
  const minutos = fecha.getMinutes().toString().padStart(2, '0');
  const segundos = fecha.getSeconds().toString().padStart(2, '0');
  return `${dia}/${mes}/${año} — ${horas}:${minutos}:${segundos}`;
};

/** Construye el objeto de apertura a partir del DTO del backend. */
export const datosAperturaDesdeCajaDTO = (
  caja: CajaDTO,
  usuarioFallback?: string
): DatosAperturaCaja => {
  const fechaIso = caja.fechaApertura;
  const fecha = new Date(fechaIso);
  return {
    usuario: caja.usuario ?? usuarioFallback,
    fechaHoraApertura: formatearFechaHora(fechaIso),
    timestampApertura: fechaIso,
    montoApertura: caja.montoApertura,
    numeroOperacionApertura: caja.numeroOperacion,
    idCaja: caja.idCaja,
    fechaApertura: fecha.toLocaleDateString('es-ES'),
    horaApertura: fecha.toLocaleTimeString('es-ES'),
  };
};

/** Migra claves legacy (monto, fechaHora) al esquema actual. */
const normalizarDatosLegacy = (raw: Record<string, unknown>): DatosAperturaCaja => {
  const montoApertura =
    typeof raw.montoApertura === 'number'
      ? raw.montoApertura
      : typeof raw.monto === 'number'
        ? raw.monto
        : undefined;

  const fechaHoraApertura =
    typeof raw.fechaHoraApertura === 'string'
      ? raw.fechaHoraApertura
      : typeof raw.fechaHora === 'string'
        ? raw.fechaHora
        : undefined;

  const numeroOperacionApertura =
    typeof raw.numeroOperacionApertura === 'string'
      ? raw.numeroOperacionApertura
      : typeof raw.numeroOperacion === 'string'
        ? raw.numeroOperacion
        : undefined;

  const timestampApertura =
    typeof raw.timestampApertura === 'string'
      ? raw.timestampApertura
      : typeof raw.timestamp === 'string'
        ? raw.timestamp
        : undefined;

  return {
    usuario: typeof raw.usuario === 'string' ? raw.usuario : undefined,
    fechaHoraApertura,
    timestampApertura,
    montoApertura,
    numeroOperacionApertura,
    idCaja: typeof raw.idCaja === 'number' ? raw.idCaja : undefined,
    fechaApertura: typeof raw.fechaApertura === 'string' ? raw.fechaApertura : undefined,
    horaApertura: typeof raw.horaApertura === 'string' ? raw.horaApertura : undefined,
  };
};

export const guardarDatosApertura = (datos: DatosAperturaCaja) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
};

export const obtenerDatosApertura = (): DatosAperturaCaja | null => {
  const datos = localStorage.getItem(STORAGE_KEY);
  if (!datos) return null;
  try {
    const parsed = JSON.parse(datos) as Record<string, unknown>;
    return normalizarDatosLegacy(parsed);
  } catch {
    return null;
  }
};

export const limpiarDatosApertura = () => {
  localStorage.removeItem(STORAGE_KEY);
};

/** Persiste en localStorage a partir del DTO de caja abierta del API. */
export const persistirAperturaDesdeCajaDTO = (
  caja: CajaDTO,
  usuarioFallback?: string
): DatosAperturaCaja => {
  const datos = datosAperturaDesdeCajaDTO(caja, usuarioFallback);
  guardarDatosApertura(datos);
  return datos;
};

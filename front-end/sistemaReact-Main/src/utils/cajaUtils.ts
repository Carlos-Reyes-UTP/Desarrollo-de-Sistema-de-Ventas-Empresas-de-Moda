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

// Función utilitaria para guardar datos de apertura
export const guardarDatosApertura = (datos: DatosAperturaCaja) => {
  localStorage.setItem('datosAperturaCaja:v1', JSON.stringify(datos));
};

// Función utilitaria para obtener datos de apertura guardados
export const obtenerDatosApertura = (): DatosAperturaCaja | null => {
  const datos = localStorage.getItem('datosAperturaCaja:v1');
  if (!datos) return null;
  try {
    return JSON.parse(datos) as DatosAperturaCaja;
  } catch {
    return null;
  }
};

// Función utilitaria para limpiar datos de apertura después del cierre
export const limpiarDatosApertura = () => {
  localStorage.removeItem('datosAperturaCaja:v1');
};

import { API_BASE_URL } from '../config/apiConfig';
import apiClient from '../config/apiClient';

export const RUTAS_CAJA = {
  BASE: `${API_BASE_URL}/api/caja`,
  ABRIR: `${API_BASE_URL}/api/caja/abrir`,
  CERRAR: (id: number) => `${API_BASE_URL}/api/caja/cerrar/${id}`,
  ABIERTA: `${API_BASE_URL}/api/caja/abierta`,
  POR_ID: (id: number) => `${API_BASE_URL}/api/caja/${id}`,
  HISTORIAL: `${API_BASE_URL}/api/caja/historial`,
  TODOS: `${API_BASE_URL}/api/caja/todos`,
  MOVIMIENTOS: (id: number) => `${API_BASE_URL}/api/caja/movimientos/${id}`,
};

export interface CajaDTO {
  idCaja: number;
  usuario: string;
  idUsuario: number;
  fechaApertura: string;
  montoApertura: number;
  fechaCierre: string | null;
  montoCierre: number | null;
  montoVentasEfectivo: number;
  montoVentasTarjeta: number;
  montoVentasYape: number;
  montoEsperado: number | null;
  discrepancia: number | null;
  observaciones: string | null;
  estado: string;
  numeroOperacion: string;
  movimientos: MovimientoCajaDTO[];
  totalVentas: number;
  efectivoEsperado: number;
}

export interface MovimientoCajaDTO {
  idMovimiento: number;
  idCaja: number;
  tipoMovimiento: string;
  monto: number;
  metodoPago: string;
  descripcion: string;
  fechaMovimiento: string;
  referenciaId: number | null;
}

export interface AperturaCajaRequest {
  montoApertura: number;
}

export interface CierreCajaRequest {
  efectivoContado: number;
  tarjetaContado: number;
  yapeContado: number;
  observaciones?: string;
}

export const CajaService = {
  abrirCaja: async (montoApertura: number): Promise<CajaDTO> => {
    const response = await apiClient.post<CajaDTO>(RUTAS_CAJA.ABRIR, {
      montoApertura,
    });
    return response.data;
  },

  cerrarCaja: async (idCaja: number, datos: CierreCajaRequest): Promise<CajaDTO> => {
    const response = await apiClient.post<CajaDTO>(
      RUTAS_CAJA.CERRAR(idCaja),
      datos
    );
    return response.data;
  },

  obtenerCajaAbierta: async (): Promise<CajaDTO | null> => {
    const response = await apiClient.get<CajaDTO>(RUTAS_CAJA.ABIERTA, {
      validateStatus: (status) => status === 200 || status === 204 || status === 404,
    });
    if (response.status === 204 || response.status === 404) return null;
    return response.data ?? null;
  },

  obtenerCajaPorId: async (idCaja: number): Promise<CajaDTO | null> => {
    try {
      const response = await apiClient.get<CajaDTO>(RUTAS_CAJA.POR_ID(idCaja));
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },

  obtenerHistorial: async (): Promise<CajaDTO[]> => {
    const response = await apiClient.get<CajaDTO[]>(RUTAS_CAJA.HISTORIAL);
    return response.data;
  },

  obtenerTodasCajas: async (): Promise<CajaDTO[]> => {
    const response = await apiClient.get<CajaDTO[]>(RUTAS_CAJA.TODOS);
    return response.data;
  },

  obtenerMovimientos: async (idCaja: number): Promise<MovimientoCajaDTO[]> => {
    const response = await apiClient.get<MovimientoCajaDTO[]>(
      RUTAS_CAJA.MOVIMIENTOS(idCaja)
    );
    return response.data;
  },
};
import axios from 'axios';
import apiClient from '../config/apiClient';
import { RUTAS_CODIGOS_BARRAS } from '../config/apiConfig';
import type { CodigoBarras, CodigoBarrasConDetallesDTO, GenerarCodigoRequest, AsignarCodigoRequest } from '../types/CodigoBarras';
import { throwAuthErrorShort } from '../utils/handleApiError';
import { logger } from '../utils/logger';

export const CodigoBarrasService = {
  
  // ===== MÉTODOS OPTIMIZADOS (ANTI N+1) =====
  
  /**
   * MÉTODO OPTIMIZADO: Obtener todos los códigos de barras con detalles completos
   * Evita el problema N+1 haciendo una sola llamada al backend que usa JOINs
   */
  async obtenerTodosConDetalles(): Promise<CodigoBarrasConDetallesDTO[]> {
    try {
      logger.debug('Obteniendo todos los codigos de barras con detalles (metodo optimizado)');
      const response = await apiClient.get(RUTAS_CODIGOS_BARRAS.OBTENER_TODOS_CON_DETALLES);
      logger.debug(`Obtenidos ${response.data.length} codigos de barras con detalles completos`);
      return response.data;
    } catch (error: any) {
      logger.error('Error al obtener codigos con detalles:', error);
      throwAuthErrorShort(error, 'acceder a esta informacion');
    }
  },

  /**
   * Obtener códigos de barras de un producto específico
   */
  async obtenerCodigosProducto(idProducto: number): Promise<CodigoBarras[]> {
    try {
      logger.debug(`Obteniendo codigos de producto ID: ${idProducto}`);
      const response = await apiClient.get(RUTAS_CODIGOS_BARRAS.OBTENER_CODIGOS_PRODUCTO(idProducto));
      logger.debug(`Obtenidos ${response.data.length} codigos para producto ${idProducto}`);
      return response.data;
    } catch (error: any) {
      logger.error(`Error al obtener codigos del producto ${idProducto}:`, error);
      if ((axios.isAxiosError(error) ? error.response?.status : undefined) === 404) {
        throw new Error(`No se encontro el producto con ID: ${idProducto}`);
      }
      throwAuthErrorShort(error, 'acceder a esta informacion');
    }
  },

  /**
   * Obtener códigos de barras de una variante específica
   */
  async obtenerCodigosVariante(idVariante: number): Promise<CodigoBarras[]> {
    try {
      logger.debug(`Obteniendo codigos de variante ID: ${idVariante}`);
      const response = await apiClient.get(RUTAS_CODIGOS_BARRAS.OBTENER_CODIGOS_VARIANTE(idVariante));
      logger.debug(`Obtenidos ${response.data.length} codigos para variante ${idVariante}`);
      return response.data;
    } catch (error: any) {
      logger.error(`Error al obtener codigos de variante ${idVariante}:`, error);
      if ((axios.isAxiosError(error) ? error.response?.status : undefined) === 404) {
        throw new Error(`No se encontro la variante con ID: ${idVariante}`);
      }
      throwAuthErrorShort(error, 'acceder a esta informacion');
    }
  },

  // ===== MÉTODOS EXISTENTES =====

  /**
   * Generar imagen de código de barras para un producto
   */  async generarImagenProducto(idProducto: number, ancho?: number, alto?: number): Promise<Blob> {
    try {
      logger.debug(`Generando codigo de barras para producto ID: ${idProducto}`);
      const response = await apiClient.get(RUTAS_CODIGOS_BARRAS.GENERAR_PRODUCTO(idProducto, ancho, alto), {
        responseType: 'blob',
        headers: { 'Accept': 'image/png, image/*, */*' }
      });
      logger.debug(`Codigo de barras generado exitosamente para producto ID: ${idProducto}`);
      return response.data;
    } catch (error: any) {
      logger.error(`Error al generar codigo de barras para producto ID ${idProducto}:`, error);
      if ((axios.isAxiosError(error) ? error.response?.status : undefined) === 404) {
        throw new Error(`No se encontro el producto con ID: ${idProducto}. Verifica que el producto existe.`);
      } else if ((axios.isAxiosError(error) ? error.response?.status : undefined) === 400) {
        throw new Error('Datos invalidos para generar el codigo de barras. Verifica que el ID del producto sea correcto.');
      }
      throwAuthErrorShort(error, 'generar codigos de barras');
    }
  },
  /**
   * Generar imagen de código de barras para una variante
   */  async generarImagenVariante(idVariante: number, ancho?: number, alto?: number): Promise<Blob> {
    try {
      logger.debug(`Generando codigo de barras para variante ID: ${idVariante}`);
      const response = await apiClient.get(RUTAS_CODIGOS_BARRAS.GENERAR_VARIANTE(idVariante, ancho, alto), {
        responseType: 'blob',
        headers: { 'Accept': 'image/png, image/*, */*' }
      });
      logger.debug(`Codigo de barras generado exitosamente para variante ID: ${idVariante}`);
      return response.data;
    } catch (error: any) {
      logger.error(`Error al generar codigo de barras para variante ID ${idVariante}:`, error);
      if ((axios.isAxiosError(error) ? error.response?.status : undefined) === 404) {
        throw new Error(`No se encontro la variante con ID: ${idVariante}. Verifica que la variante existe.`);
      } else if ((axios.isAxiosError(error) ? error.response?.status : undefined) === 400) {
        throw new Error('Datos invalidos para generar el codigo de barras. Verifica que el ID de la variante sea correcto.');
      }
      throwAuthErrorShort(error, 'generar codigos de barras');
    }
  },

  /**
   * Asignar un código de barras personalizado a un producto
   */
  async asignarCodigoProducto(idProducto: number, codigoBarrasDTO: Partial<CodigoBarras>): Promise<CodigoBarras> {
    const response = await apiClient.post(RUTAS_CODIGOS_BARRAS.ASIGNAR_PRODUCTO(idProducto), codigoBarrasDTO);
    return response.data;
  },

  /**
   * Asignar un código de barras personalizado a una variante
   */
  async asignarCodigoVariante(idVariante: number, codigoBarrasDTO: Partial<CodigoBarras>): Promise<CodigoBarras> {
    const response = await apiClient.post(RUTAS_CODIGOS_BARRAS.ASIGNAR_VARIANTE(idVariante), codigoBarrasDTO);
    return response.data;
  },

  /**
   * Generar código de barras para producto o variante
   */
  async generarCodigo(request: GenerarCodigoRequest): Promise<CodigoBarras> {
    try {
      logger.debug(`Generando codigo ${request.formato || 'EAN8'} para ${request.tipo} ID: ${request.entidadId}`);
      const response = await apiClient.post(`${RUTAS_CODIGOS_BARRAS.BASE}/generar`, request);
      logger.debug(`Codigo generado exitosamente: ${response.data.codigo}`);
      return response.data;
    } catch (error: any) {
      logger.error('Error al generar codigo:', error);
      if ((axios.isAxiosError(error) ? error.response?.status : undefined) === 404) {
        throw new Error(`No se encontro la entidad con ID: ${request.entidadId}`);
      }
      throwAuthErrorShort(error, 'generar codigos de barras');
    }
  },

  async asignarCodigo(request: AsignarCodigoRequest): Promise<CodigoBarras> {
    try {
      logger.debug(`Asignando codigo ${request.codigo} a ${request.tipo} ID: ${request.entidadId}`);
      const response = await apiClient.post(`${RUTAS_CODIGOS_BARRAS.BASE}/asignar`, request);
      logger.debug(`Codigo asignado exitosamente: ${response.data.codigo}`);
      return response.data;
    } catch (error: any) {
      logger.error('Error al asignar codigo:', error);
      if ((axios.isAxiosError(error) ? error.response?.status : undefined) === 409) {
        throw new Error('El codigo ya esta en uso. Elige un codigo diferente.');
      }
      throwAuthErrorShort(error, 'asignar codigos de barras');
    }
  },

  async eliminarCodigo(codigoId: number): Promise<void> {
    try {
      logger.debug(`Eliminando codigo de barras ID: ${codigoId}`);
      await apiClient.delete(`${RUTAS_CODIGOS_BARRAS.BASE}/${codigoId}`);
      logger.debug(`Codigo de barras eliminado exitosamente`);
    } catch (error: any) {
      logger.error('Error al eliminar codigo:', error);
      if ((axios.isAxiosError(error) ? error.response?.status : undefined) === 404) {
        throw new Error('No se encontro el codigo de barras a eliminar.');
      }
      throwAuthErrorShort(error, 'eliminar codigos de barras');
    }
  },

  async buscarPorCodigo(codigo: string): Promise<import('../types/CodigoBarras').BuscarPorCodigoResponse> {
    try {
      logger.debug(`Buscando por codigo: ${codigo}`);
      const response = await apiClient.get(`${RUTAS_CODIGOS_BARRAS.BASE}/buscar/${encodeURIComponent(codigo)}`);
      logger.debug(`Busqueda completada`);
      return response.data;
    } catch (error: any) {
      logger.error('Error al buscar por codigo:', error);
      if ((axios.isAxiosError(error) ? error.response?.status : undefined) === 404) {
        throw new Error('No se encontro ningun producto o variante con ese codigo de barras.');
      }
      throwAuthErrorShort(error, 'buscar codigos de barras');
    }
  },

  /**
   * Validar código de barras
   */
  async validarCodigo(codigo: string): Promise<{ valido: boolean }> {
    const response = await apiClient.get(RUTAS_CODIGOS_BARRAS.VALIDAR(codigo));
    return response.data;
  },

  /**
   * Validar formato de código de barras
   */
  validarFormato(codigo: string, formato: 'EAN8' | 'EAN13' | 'CODE128'): boolean {
    switch (formato) {
      case 'EAN8':
        return /^\d{8}$/.test(codigo);
      case 'EAN13':
        return /^\d{13}$/.test(codigo);
      case 'CODE128':
        return codigo.length >= 1 && codigo.length <= 48;
      default:
        return false;
    }
  },

  /**
   * Generar código EAN-8 con checksum
   */
  generarEAN8(): string {
    // Generar 7 dígitos aleatorios
    let codigo = '';
    for (let i = 0; i < 7; i++) {
      codigo += Math.floor(Math.random() * 10);
    }
    
    // Calcular dígito de verificación
    let suma = 0;
    for (let i = 0; i < 7; i++) {
      const digit = parseInt(codigo[i]);
      suma += i % 2 === 0 ? digit * 3 : digit;
    }
    
    const checksum = (10 - (suma % 10)) % 10;
    return codigo + checksum;
  },

  /**
   * Verificar si un código EAN-8 es válido
   */
  verificarEAN8(codigo: string): boolean {
    if (!/^\d{8}$/.test(codigo)) return false;
    
    let suma = 0;
    for (let i = 0; i < 7; i++) {
      const digit = parseInt(codigo[i]);
      suma += i % 2 === 0 ? digit * 3 : digit;
    }
    
    const checksumCalculado = (10 - (suma % 10)) % 10;
    const checksumProvisto = parseInt(codigo[7]);
    
    return checksumCalculado === checksumProvisto;
  }
};

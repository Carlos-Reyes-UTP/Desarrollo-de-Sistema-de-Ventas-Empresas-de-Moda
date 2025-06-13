import apiClient from '../config/apiClient';
import { RUTAS_CODIGOS_BARRAS } from '../config/apiConfig';
import type { 
  CodigoBarras, 
  GenerarCodigoRequest, 
  AsignarCodigoRequest, 
  BuscarPorCodigoResponse 
} from '../interfaces/CodigoBarras';

export const CodigoBarrasService = {
  /**
   * Generar un código de barras automáticamente
   */  async generarCodigo(request: GenerarCodigoRequest): Promise<CodigoBarras> {
    const response = await apiClient.post(RUTAS_CODIGOS_BARRAS.GENERAR, request);
    return response.data;
  },

  /**
   * Asignar un código de barras manualmente
   */  async asignarCodigo(request: AsignarCodigoRequest): Promise<CodigoBarras> {
    const response = await apiClient.post(RUTAS_CODIGOS_BARRAS.ASIGNAR, request);
    return response.data;
  },

  /**
   * Buscar producto o variante por código de barras
   */  async buscarPorCodigo(codigo: string): Promise<BuscarPorCodigoResponse> {
    const response = await apiClient.get(RUTAS_CODIGOS_BARRAS.BUSCAR(codigo));
    return response.data;
  },

  /**
   * Obtener códigos de barras de un producto
   */  async obtenerCodigosProducto(productoId: number): Promise<CodigoBarras[]> {
    const response = await apiClient.get(RUTAS_CODIGOS_BARRAS.POR_PRODUCTO(productoId));
    return response.data;
  },

  /**
   * Obtener códigos de barras de una variante
   */  async obtenerCodigosVariante(varianteId: number): Promise<CodigoBarras[]> {
    const response = await apiClient.get(RUTAS_CODIGOS_BARRAS.POR_VARIANTE(varianteId));
    return response.data;
  },

  /**
   * Eliminar un código de barras
   */  async eliminarCodigo(codigoId: number): Promise<void> {
    await apiClient.delete(RUTAS_CODIGOS_BARRAS.POR_ID(codigoId));
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

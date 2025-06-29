import apiClient from '../config/apiClient';
import { RUTAS_CODIGOS_BARRAS } from '../config/apiConfig';
import type { CodigoBarras, CodigoBarrasConDetallesDTO, GenerarCodigoRequest, AsignarCodigoRequest } from '../interfaces/CodigoBarras';

export const CodigoBarrasService = {
  
  // ===== MÉTODOS OPTIMIZADOS (ANTI N+1) =====
  
  /**
   * MÉTODO OPTIMIZADO: Obtener todos los códigos de barras con detalles completos
   * Evita el problema N+1 haciendo una sola llamada al backend que usa JOINs
   */
  async obtenerTodosConDetalles(): Promise<CodigoBarrasConDetallesDTO[]> {
    try {
      console.log('🚀 Obteniendo todos los códigos de barras con detalles (método optimizado)');
      const response = await apiClient.get(RUTAS_CODIGOS_BARRAS.OBTENER_TODOS_CON_DETALLES);
      console.log(`✅ Obtenidos ${response.data.length} códigos de barras con detalles completos`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al obtener códigos con detalles:', error);
      
      if (error.response?.status === 401) {
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      } else if (error.response?.status === 403) {
        throw new Error('No tienes permisos para acceder a esta información.');
      }
      
      throw new Error(`Error al cargar códigos de barras: ${error.message || 'Error desconocido'}`);
    }
  },

  /**
   * Obtener códigos de barras de un producto específico
   */
  async obtenerCodigosProducto(idProducto: number): Promise<CodigoBarras[]> {
    try {
      console.log(`📦 Obteniendo códigos de producto ID: ${idProducto}`);
      const response = await apiClient.get(RUTAS_CODIGOS_BARRAS.OBTENER_CODIGOS_PRODUCTO(idProducto));
      console.log(`✅ Obtenidos ${response.data.length} códigos para producto ${idProducto}`);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Error al obtener códigos del producto ${idProducto}:`, error);
      
      if (error.response?.status === 404) {
        throw new Error(`No se encontró el producto con ID: ${idProducto}`);
      } else if (error.response?.status === 401) {
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      } else if (error.response?.status === 403) {
        throw new Error('No tienes permisos para acceder a esta información.');
      }
      
      throw new Error(`Error al obtener códigos del producto: ${error.message || 'Error desconocido'}`);
    }
  },

  /**
   * Obtener códigos de barras de una variante específica
   */
  async obtenerCodigosVariante(idVariante: number): Promise<CodigoBarras[]> {
    try {
      console.log(`🎨 Obteniendo códigos de variante ID: ${idVariante}`);
      const response = await apiClient.get(RUTAS_CODIGOS_BARRAS.OBTENER_CODIGOS_VARIANTE(idVariante));
      console.log(`✅ Obtenidos ${response.data.length} códigos para variante ${idVariante}`);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Error al obtener códigos de variante ${idVariante}:`, error);
      
      if (error.response?.status === 404) {
        throw new Error(`No se encontró la variante con ID: ${idVariante}`);
      } else if (error.response?.status === 401) {
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      } else if (error.response?.status === 403) {
        throw new Error('No tienes permisos para acceder a esta información.');
      }
      
      throw new Error(`Error al obtener códigos de la variante: ${error.message || 'Error desconocido'}`);
    }
  },

  // ===== MÉTODOS EXISTENTES =====

  /**
   * Generar imagen de código de barras para un producto
   */  async generarImagenProducto(idProducto: number, ancho?: number, alto?: number): Promise<Blob> {
    try {
      console.log(`🏷️ Generando código de barras para producto ID: ${idProducto}`);
      const response = await apiClient.get(RUTAS_CODIGOS_BARRAS.GENERAR_PRODUCTO(idProducto, ancho, alto), {
        responseType: 'blob',
        headers: {
          'Accept': 'image/png, image/*, */*'
        }
      });
      console.log(`✅ Código de barras generado exitosamente para producto ID: ${idProducto}`);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Error al generar código de barras para producto ID ${idProducto}:`, error);
      
      // Manejo específico de errores de autenticación
      if (error.response?.status === 401) {
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente para generar códigos de barras.');
      } else if (error.response?.status === 403) {
        throw new Error('No tienes permisos para generar códigos de barras. Se requiere rol de Almacenero o Administrador.');
      } else if (error.response?.status === 404) {
        throw new Error(`No se encontró el producto con ID: ${idProducto}. Verifica que el producto existe.`);
      } else if (error.response?.status === 400) {
        throw new Error('Datos inválidos para generar el código de barras. Verifica que el ID del producto sea correcto.');
      }
      
      // Error genérico
      throw new Error(`Error al generar código de barras: ${error.message || 'Error desconocido'}`);
    }
  },
  /**
   * Generar imagen de código de barras para una variante
   */  async generarImagenVariante(idVariante: number, ancho?: number, alto?: number): Promise<Blob> {
    try {
      console.log(`🏷️ Generando código de barras para variante ID: ${idVariante}`);
      const response = await apiClient.get(RUTAS_CODIGOS_BARRAS.GENERAR_VARIANTE(idVariante, ancho, alto), {
        responseType: 'blob',
        headers: {
          'Accept': 'image/png, image/*, */*'
        }
      });
      console.log(`✅ Código de barras generado exitosamente para variante ID: ${idVariante}`);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Error al generar código de barras para variante ID ${idVariante}:`, error);
      
      // Manejo específico de errores de autenticación
      if (error.response?.status === 401) {
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente para generar códigos de barras.');
      } else if (error.response?.status === 403) {
        throw new Error('No tienes permisos para generar códigos de barras. Se requiere rol de Almacenero o Administrador.');
      } else if (error.response?.status === 404) {
        throw new Error(`No se encontró la variante con ID: ${idVariante}. Verifica que la variante existe.`);
      } else if (error.response?.status === 400) {
        throw new Error('Datos inválidos para generar el código de barras. Verifica que el ID de la variante sea correcto.');
      }
      
      // Error genérico
      throw new Error(`Error al generar código de barras: ${error.message || 'Error desconocido'}`);
    }
  },

  /**
   * Asignar un código de barras personalizado a un producto
   */
  async asignarCodigoProducto(idProducto: number, codigoBarrasDTO: any): Promise<any> {
    const response = await apiClient.post(RUTAS_CODIGOS_BARRAS.ASIGNAR_PRODUCTO(idProducto), codigoBarrasDTO);
    return response.data;
  },

  /**
   * Asignar un código de barras personalizado a una variante
   */
  async asignarCodigoVariante(idVariante: number, codigoBarrasDTO: any): Promise<any> {
    const response = await apiClient.post(RUTAS_CODIGOS_BARRAS.ASIGNAR_VARIANTE(idVariante), codigoBarrasDTO);
    return response.data;
  },

  /**
   * Generar código de barras para producto o variante
   */
  async generarCodigo(request: GenerarCodigoRequest): Promise<CodigoBarras> {
    try {
      console.log(`🏷️ Generando código ${request.formato || 'EAN8'} para ${request.tipo} ID: ${request.entidadId}`);
      const response = await apiClient.post(`${RUTAS_CODIGOS_BARRAS.BASE}/generar`, request);
      console.log(`✅ Código generado exitosamente: ${response.data.codigo}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al generar código:', error);
      
      if (error.response?.status === 401) {
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      } else if (error.response?.status === 403) {
        throw new Error('No tienes permisos para generar códigos de barras.');
      } else if (error.response?.status === 404) {
        throw new Error(`No se encontró la entidad con ID: ${request.entidadId}`);
      }
      
      throw new Error(`Error al generar código: ${error.message || 'Error desconocido'}`);
    }
  },

  /**
   * Asignar código de barras personalizado
   */
  async asignarCodigo(request: AsignarCodigoRequest): Promise<CodigoBarras> {
    try {
      console.log(`🏷️ Asignando código ${request.codigo} a ${request.tipo} ID: ${request.entidadId}`);
      const response = await apiClient.post(`${RUTAS_CODIGOS_BARRAS.BASE}/asignar`, request);
      console.log(`✅ Código asignado exitosamente: ${response.data.codigo}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al asignar código:', error);
      
      if (error.response?.status === 401) {
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      } else if (error.response?.status === 403) {
        throw new Error('No tienes permisos para asignar códigos de barras.');
      } else if (error.response?.status === 409) {
        throw new Error('El código ya está en uso. Elige un código diferente.');
      }
      
      throw new Error(`Error al asignar código: ${error.message || 'Error desconocido'}`);
    }
  },

  /**
   * Eliminar código de barras
   */
  async eliminarCodigo(codigoId: number): Promise<void> {
    try {
      console.log(`🗑️ Eliminando código de barras ID: ${codigoId}`);
      await apiClient.delete(`${RUTAS_CODIGOS_BARRAS.BASE}/${codigoId}`);
      console.log(`✅ Código de barras eliminado exitosamente`);
    } catch (error: any) {
      console.error('❌ Error al eliminar código:', error);
      
      if (error.response?.status === 401) {
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      } else if (error.response?.status === 403) {
        throw new Error('No tienes permisos para eliminar códigos de barras.');
      } else if (error.response?.status === 404) {
        throw new Error('No se encontró el código de barras a eliminar.');
      }
      
      throw new Error(`Error al eliminar código: ${error.message || 'Error desconocido'}`);
    }
  },

  /**
   * Buscar por código de barras
   */
  async buscarPorCodigo(codigo: string): Promise<any> {
    try {
      console.log(`🔍 Buscando por código: ${codigo}`);
      const response = await apiClient.get(`${RUTAS_CODIGOS_BARRAS.BASE}/buscar/${encodeURIComponent(codigo)}`);
      console.log(`✅ Búsqueda completada`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al buscar por código:', error);
      
      if (error.response?.status === 404) {
        throw new Error('No se encontró ningún producto o variante con ese código de barras.');
      } else if (error.response?.status === 401) {
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      } else if (error.response?.status === 403) {
        throw new Error('No tienes permisos para buscar códigos de barras.');
      }
      
      throw new Error(`Error al buscar código: ${error.message || 'Error desconocido'}`);
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

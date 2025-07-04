import { RUTAS_MAYORISTAS, RUTAS_CLIENTES } from '../config/apiConfig';
import apiClient from '../config/apiClient';
import type { MayoristaDTO, CrearMayoristaCompletoDTO } from '../interfaces/MayoristaDTO';

export const MayoristaService = {
  /**
   * 📋 Obtiene lista completa de todos los mayoristas
   * GET /api/admin/mayoristas
   */
  obtenerTodosMayoristas: async (): Promise<MayoristaDTO[]> => {
    const response = await apiClient.get<MayoristaDTO[]>(RUTAS_MAYORISTAS.BASE);
    return response.data;
  },

  /**
   * 🔍 Busca un mayorista específico por su ID interno
   * GET /api/admin/mayoristas/{id}
   */
  obtenerMayoristaPorId: async (id: number): Promise<MayoristaDTO | null> => {
    try {
      const response = await apiClient.get<MayoristaDTO>(RUTAS_MAYORISTAS.POR_ID(id));
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 404) return null;
      throw error;
    }
  },

  /**
   * 🏷️ Busca un mayorista por su código único (ej: "CAR-12345")
   * GET /api/admin/mayoristas/codigo/{codigo}
   */
  obtenerMayoristaPorCodigo: async (codigo: string): Promise<MayoristaDTO | null> => {
    try {
      const response = await apiClient.get<MayoristaDTO>(RUTAS_MAYORISTAS.POR_CODIGO(codigo));
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 404) return null;
      throw error;
    }
  },

  /**
   * 📄 Busca un mayorista por el número de documento del cliente
   * GET /api/admin/mayoristas/documento/{numeroDocumento}
   */
  obtenerMayoristaPorDocumento: async (numeroDocumento: string, userRole?: string): Promise<MayoristaDTO | null> => {
    try {
      console.log('🔍 obtenerMayoristaPorDocumento called with:', { numeroDocumento, userRole });
      
      let endpoint: string;
      
      // Determinar qué endpoint usar según el rol
      if (userRole === 'ROLE_CAJERO') {
        // Para cajeros, usar el nuevo endpoint específico que solo verifica si es mayorista
        endpoint = RUTAS_CLIENTES.VERIFICAR_MAYORISTA(numeroDocumento);
        console.log('👤 Usuario cajero detectado, usando endpoint de verificación:', endpoint);
        
        const response = await apiClient.get<{
          numeroDocumento: string;
          esMayorista: boolean;
          nombreCliente?: string;
          tipoCliente?: string;
          clienteEncontrado?: boolean;
        }>(endpoint);
        
        // Si es mayorista, crear un MayoristaDTO simplificado
        if (response.data.esMayorista) {
          return {
            numeroDocumento: response.data.numeroDocumento,
            nombreCliente: response.data.nombreCliente || '',
            tipoCliente: response.data.tipoCliente || '',
            codigoMayorista: 'CAJERO_ACCESS', // Placeholder ya que el cajero no tiene acceso al código
            idCliente: 0 // Placeholder
          };
        } else {
          return null; // No es mayorista
        }
      } else {
        // Para administradores y almaceneros, usar el endpoint completo
        endpoint = RUTAS_MAYORISTAS.POR_DOCUMENTO(numeroDocumento);
        console.log('� Usuario admin/almacenero detectado, usando endpoint completo:', endpoint);
        
        const response = await apiClient.get<MayoristaDTO>(endpoint);
        return response.data;
      }
    } catch (error: any) {
      console.log('⚠️ Error en obtenerMayoristaPorDocumento:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.response?.status === 404) {
        console.log('ℹ️ Mayorista no encontrado para documento:', numeroDocumento);
        return null;
      } else if (error.response?.status === 403) {
        console.warn('⚠️ Error 403: Sin permisos para verificar mayorista');
        // Si es error 403, asumir que es cliente regular
        return null;
      }
      
      throw error;
    }
  },

  /**
   * ⬆️ CONVIERTE un cliente existente en mayorista
   * POST /api/admin/mayoristas/cliente/{idCliente}
   * 
   * Caso de uso: Cliente regular que quieres promocionar a mayorista
   * Requisito: El cliente ya debe existir en la base de datos
   */
  crearMayoristaDeClienteExistente: async (idCliente: number): Promise<MayoristaDTO> => {
    const response = await apiClient.post<MayoristaDTO>(RUTAS_MAYORISTAS.CREAR_DE_CLIENTE(idCliente));
    return response.data;
  },

  /**
   * ➕ CREA un mayorista completo desde cero (cliente + mayorista)
   * POST /api/admin/mayoristas
   * 
   * Caso de uso: Nuevo cliente que directamente será mayorista
   * Proceso: Crea primero el cliente, luego el mayorista
   */
  crearMayoristaCompleto: async (datosMayorista: CrearMayoristaCompletoDTO): Promise<MayoristaDTO> => {
    const response = await apiClient.post<MayoristaDTO>(RUTAS_MAYORISTAS.BASE, datosMayorista);
    return response.data;
  },

  /**
   * 🔄 Actualiza datos de un mayorista existente
   * PUT /api/admin/mayoristas/{id}
   */
  actualizarMayorista: async (id: number, datosMayorista: Partial<MayoristaDTO>): Promise<MayoristaDTO> => {
    const response = await apiClient.put<MayoristaDTO>(RUTAS_MAYORISTAS.POR_ID(id), datosMayorista);
    return response.data;
  },

  /**
   * 🗑️ Elimina un mayorista (posiblemente mantiene el cliente)
   * DELETE /api/admin/mayoristas/{id}
   * 
   * Caso de uso: Quitar privilegios de mayorista pero conservar como cliente regular
   */
  eliminarMayorista: async (id: number): Promise<boolean> => {
    try {
      await apiClient.delete(RUTAS_MAYORISTAS.POR_ID(id));
      return true;
    } catch (error: any) {
      if (error.response && error.response.status === 404) return false;
      throw error;
    }
  },

  // 🎯 MÉTODOS DE UTILIDAD

  /**
   * ✅ Verifica si un cliente es mayorista por su documento
   */
  esMayorista: async (numeroDocumento: string, userRole?: string): Promise<boolean> => {
    try {
      console.log('🔎 Buscando mayorista con documento:', numeroDocumento);
      console.log('👤 Rol del usuario para verificación:', userRole);
      
      const mayorista = await MayoristaService.obtenerMayoristaPorDocumento(numeroDocumento, userRole);
      console.log('🎯 Mayorista encontrado:', mayorista);
      const resultado = mayorista !== null;
      console.log('✅ Es mayorista:', resultado);
      return resultado;
    } catch (error: any) {
      // Si hay un error y es 403 con cajero, ya fue manejado en obtenerMayoristaPorDocumento
      // Para otros errores (como 404), significa que no es mayorista
      console.warn(`❌ Error al verificar mayorista para documento ${numeroDocumento}:`, error);
      return false;
    }
  },

  /**
   * 🔍 Busca mayoristas por término general (código o documento)
   */
  buscarMayoristas: async (termino: string): Promise<MayoristaDTO[]> => {
    // Primero intenta buscar por código
    const porCodigo = await MayoristaService.obtenerMayoristaPorCodigo(termino);
    if (porCodigo) return [porCodigo];

    // Luego intenta buscar por documento
    const porDocumento = await MayoristaService.obtenerMayoristaPorDocumento(termino);
    if (porDocumento) return [porDocumento];

    // Si no encuentra nada, retorna array vacío
    return [];
  },

  /**
   * 📊 Obtiene estadísticas rápidas de mayoristas
   */
  obtenerEstadisticas: async (): Promise<{ total: number }> => {
    const mayoristas = await MayoristaService.obtenerTodosMayoristas();
    return {
      total: mayoristas.length
    };
  }
};

export default MayoristaService;

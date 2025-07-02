import { RUTAS_MAYORISTAS } from '../config/apiConfig';
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
  obtenerMayoristaPorDocumento: async (numeroDocumento: string): Promise<MayoristaDTO | null> => {
    try {
      console.log('🌐 Realizando petición GET a:', RUTAS_MAYORISTAS.POR_DOCUMENTO(numeroDocumento));
      const response = await apiClient.get<MayoristaDTO>(RUTAS_MAYORISTAS.POR_DOCUMENTO(numeroDocumento));
      console.log('📦 Respuesta del servidor:', response.data);
      return response.data;
    } catch (error: any) {
      console.log('⚠️ Error en obtenerMayoristaPorDocumento:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      if (error.response && error.response.status === 404) return null;
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
  esMayorista: async (numeroDocumento: string): Promise<boolean> => {
    try {
      console.log('🔎 Buscando mayorista con documento:', numeroDocumento);
      const mayorista = await MayoristaService.obtenerMayoristaPorDocumento(numeroDocumento);
      console.log('🎯 Mayorista encontrado:', mayorista);
      const resultado = mayorista !== null;
      console.log('✅ Es mayorista:', resultado);
      return resultado;
    } catch (error) {
      // Si hay un error (como 404), significa que no es mayorista
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

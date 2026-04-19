import apiClient from '../config/apiClient';
import { AxiosError } from 'axios';
import type { ProductoVariante } from '../interfaces/ProductoVariante';
import type { Color } from '../interfaces/Color';
import type { Talla } from '../interfaces/Talla';
import { RUTAS_VARIANTES, RUTAS_PRODUCTOS } from '../config/apiConfig';

export const ProductoVarianteService = {    // Crear nueva variante
  crearVariante: async (variante: Omit<ProductoVariante, 'idVariante'>): Promise<ProductoVariante> => {
    try {
      console.log("Creando nueva variante con datos:", variante);
      const response = await apiClient.post<ProductoVariante>(RUTAS_VARIANTES.BASE, variante);
      
      // Normalizar los IDs: asegurar que idVariante refleje el ID real de BD
      const varianteCreada = response.data;
      if (varianteCreada.idProductoVariante && !varianteCreada.idVariante) {
        varianteCreada.idVariante = varianteCreada.idProductoVariante;
      }
      
      return varianteCreada;
    } catch (error: any) {
      console.error("Error al crear variante:", error);
      if (error.response?.status === 401) {
        throw new Error('Error de autorización: Tu sesión ha expirado o no tienes permisos para crear variantes. Inicia sesión como Almacenero o Administrador.');
      } else if (error.response?.status === 403) {
        throw new Error('Error de permisos: No tienes autorización para crear variantes. Esta acción requiere rol de Almacenero o Administrador.');
      }
      throw error;
    }
  },  // Actualizar variante completa
  actualizarVariante: async (id: number, variante: ProductoVariante): Promise<ProductoVariante> => {
    try {
      if (!id || isNaN(id) || id <= 0) {
        throw new Error('ID de variante inválido o indefinido');
      }
      
      console.log(`Actualizando variante ID: ${id} con datos:`, variante);
      
      // Asegurar que el ID correcto esté en el payload
      const varianteConId = {
        ...variante,
        idProductoVariante: id // El backend espera idProductoVariante como ID principal
      };
      
      const response = await apiClient.put<ProductoVariante>(RUTAS_VARIANTES.POR_ID(id), varianteConId);
      
      // Normalizar la respuesta
      const varianteActualizada = response.data;
      if (varianteActualizada.idProductoVariante && !varianteActualizada.idVariante) {
        varianteActualizada.idVariante = varianteActualizada.idProductoVariante;
      }
      
      return varianteActualizada;
    } catch (error: any) {
      // Si es error 401/403, personalizar mensaje
      if (error.response?.status === 401) {
        throw new Error('Error de autorización: Tu sesión ha expirado o no tienes permisos para actualizar variantes. Inicia sesión como Almacenero o Administrador.');
      } else if (error.response?.status === 403) {
        throw new Error('Error de permisos: No tienes autorización para actualizar variantes. Esta acción requiere rol de Almacenero o Administrador.');
      } else if (error.response?.status === 404) {
        throw new Error(`No se encontró la variante con ID: ${id}. Es posible que haya sido eliminada.`);
      }
      // Devolver error original si no es un error conocido
      throw error;
    }
  },
  // Obtener variante por ID
  obtenerVariantePorId: async (id: number): Promise<ProductoVariante | null> => {
    try {
      console.log(`Obteniendo variante con ID: ${id}`);
      const response = await apiClient.get<ProductoVariante>(RUTAS_VARIANTES.POR_ID(id));
      
      // Normalizar IDs para consistencia
      const variante = response.data;
      if (variante.idProductoVariante && !variante.idVariante) {
        variante.idVariante = variante.idProductoVariante;
      }
      
      return variante;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        console.log(`No se encontró la variante con ID: ${id}`);
        return null;
      }
      console.error(`Error al obtener variante ${id}:`, error);
      throw error;
    }
  },  // Obtener todas las variantes de un producto
  obtenerVariantesPorProducto: async (idProducto: number): Promise<ProductoVariante[]> => {
    try {
      console.log(`Obteniendo variantes para producto ID: ${idProducto}`);
      const response = await apiClient.get<ProductoVariante[]>(RUTAS_VARIANTES.POR_PRODUCTO(idProducto));
      
      // Imprimir la estructura de las primeras variantes recibidas para diagnóstico
      if (response.data.length > 0) {
        const primerVariante = response.data[0];
        console.log(`Estructura de la primera variante para producto ${idProducto}:`, {
          idVariante: primerVariante.idVariante,
          idProductoVariante: primerVariante.idProductoVariante,
          tieneProducto: !!primerVariante.producto,
          tieneTalla: !!primerVariante.talla,
          tieneColor: !!primerVariante.color,
          propiedadesCompletas: Object.keys(primerVariante)
        });
      }
      
      // Normalizar IDs y eliminar duplicados
      const variantesMapeadas = response.data.map(variante => {
        // Priorizar idProductoVariante como ID principal, sincronizar con idVariante
        if (variante.idProductoVariante && !variante.idVariante) {
          return {
            ...variante,
            idVariante: variante.idProductoVariante
          };
        }
        return variante;
      });
      
      // Eliminar duplicados basándose en idProductoVariante (ID real de BD)
      const variantesUnicas = Array.from(
        new Map(variantesMapeadas.map(v => [v.idProductoVariante || v.idVariante, v])).values()
      );
      
      console.log(`Variantes obtenidas: ${variantesUnicas.length}`);
      return variantesUnicas;
    } catch (error: any) {
      console.error(`Error al obtener variantes para producto ${idProducto}:`, error);
      
      if (error.response?.status === 401) {
        throw new Error('Error de autorización: Tu sesión ha expirado o no tienes permisos para ver las variantes.');
      } else if (error.response?.status === 403) {
        throw new Error('Error de permisos: No tienes autorización para ver las variantes.');
      } else if (error.response?.status === 404) {
        // Si no se encuentran variantes, devolver un array vacío en lugar de error
        console.log(`No se encontraron variantes para el producto ${idProducto}`);
        return [];
      }
      throw error;
    }
  },

  // Obtener variantes por producto y talla
  obtenerVariantesPorProductoYTalla: async (idProducto: number, idTalla: number): Promise<ProductoVariante[]> => {
    const response = await apiClient.get<ProductoVariante[]>(
      RUTAS_VARIANTES.POR_PRODUCTO_Y_TALLA(idProducto, idTalla)
    );
    return response.data;
  },

  // Obtener variantes por producto y color
  obtenerVariantesPorProductoYColor: async (idProducto: number, idColor: number): Promise<ProductoVariante[]> => {
    const response = await apiClient.get<ProductoVariante[]>(
      RUTAS_VARIANTES.POR_PRODUCTO_Y_COLOR(idProducto, idColor)
    );
    return response.data;
  },

  // Obtener variante específica por producto, talla y color
  obtenerVariantePorProductoTallaColor: async (
    idProducto: number, 
    idTalla: number, 
    idColor: number
  ): Promise<ProductoVariante | null> => {
    try {
      const response = await apiClient.get<ProductoVariante>(
        RUTAS_VARIANTES.POR_PRODUCTO_TALLA_COLOR(idProducto, idTalla, idColor)
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
  // Actualizar solo la cantidad de una variante
  actualizarCantidad: async (id: number, cantidad: number): Promise<ProductoVariante> => {
    if (cantidad < 0) {
      throw new Error('La cantidad no puede ser negativa');
    }
    
    try {
      const response = await apiClient.patch<ProductoVariante>(
        RUTAS_VARIANTES.ACTUALIZAR_CANTIDAD(id),
        null,
        { params: { cantidad } }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Error de autorización: Tu sesión ha expirado o no tienes permisos para actualizar la cantidad. Inicia sesión como Almacenero o Administrador.');
      } else if (error.response?.status === 403) {
        throw new Error('Error de permisos: No tienes autorización para actualizar la cantidad. Esta acción requiere rol de Almacenero o Administrador.');
      }
      throw error;
    }
  },
  // Eliminar variante
  eliminarVariante: async (id: number): Promise<void> => {
    try {
      console.log(`Eliminando variante con ID: ${id}`);
      await apiClient.delete(RUTAS_VARIANTES.POR_ID(id));
      console.log(`Variante eliminada correctamente`);
    } catch (error: any) {
      console.error(`Error al eliminar variante ${id}:`, error);
      if (error.response?.status === 401) {
        throw new Error('Error de autorización: Tu sesión ha expirado o no tienes permisos para eliminar variantes. Inicia sesión como Almacenero o Administrador.');
      } else if (error.response?.status === 403) {
        throw new Error('Error de permisos: No tienes autorización para eliminar variantes. Esta acción requiere rol de Almacenero o Administrador.');
      } else if (error.response?.status === 404) {
        throw new Error(`No se encontró la variante con ID: ${id}. Es posible que ya haya sido eliminada.`);
      }
      throw error;
    }
  },

  // Obtener cantidad total de un producto (suma de todas sus variantes)
  obtenerCantidadTotalProducto: async (idProducto: number): Promise<number> => {
    const response = await apiClient.get<number>(RUTAS_VARIANTES.CANTIDAD_TOTAL_PRODUCTO(idProducto));
    return response.data;
  },

  // Migrar producto existente a sistema de variantes
  migrarProductoAVariantes: async (
    idProducto: number,
    tallas: Talla[],
    colores: Color[],    distribucionPorcentual: boolean = false
  ): Promise<ProductoVariante[]> => {
    try {
      const payload = {
        tallas,
        colores
      };
      const response = await apiClient.post<ProductoVariante[]>(
        RUTAS_VARIANTES.MIGRAR_PRODUCTO(idProducto),
        payload,
        { params: { distribucionPorcentual } }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Error de autorización: Tu sesión ha expirado o no tienes permisos para migrar el producto. Inicia sesión como Almacenero o Administrador.');
      } else if (error.response?.status === 403) {
        throw new Error('Error de permisos: No tienes autorización para migrar el producto. Esta acción requiere rol de Almacenero o Administrador.');
      }
      throw error;
    }
  },

  // Obtener todas las variantes (optimizado por rol y contexto)
  obtenerTodasLasVariantes: async (userRole?: string, forSales?: boolean): Promise<ProductoVariante[]> => {
    try {
      console.log("DEBUG: obtenerTodasLasVariantes called with userRole:", userRole, "forSales:", forSales);
      
      // Decidir qué endpoint usar según el contexto y rol del usuario
      let endpoint: string;
      let isAlmaceneroEndpoint = false;
      
      // Normalizar el rol para la comparación
      const normalizedRole = userRole?.toUpperCase();
      console.log("DEBUG: normalized role:", normalizedRole);
      
      // Si es para ventas o el usuario es cajero, usar endpoint de cajero
      if (forSales || normalizedRole === 'ROLE_CAJERO' || normalizedRole === 'CAJERO') {
        // Para ventas (cualquier rol) o cajeros específicamente
        endpoint = RUTAS_PRODUCTOS.CAJERO.VARIANTES;
        console.log("DEBUG: Usando endpoint del cajero para ventas:", endpoint);
      } else {
        // Para gestión de almacén (almaceneros y admins)
        endpoint = RUTAS_VARIANTES.BASE;
        isAlmaceneroEndpoint = true;
        console.log("DEBUG: Usuario almacenero/admin detectado (rol:", userRole, "), usando endpoint completo:", endpoint);
      }
      
      try {
        const response = await apiClient.get<ProductoVariante[]>(endpoint);
        console.log(`DEBUG: Se obtuvieron ${response.data.length} variantes desde ${isAlmaceneroEndpoint ? 'almacenero' : 'cajero'}`);
        
        // Normalizar IDs para consistencia
        const variantes = response.data.map(variante => {
          if (variante.idProductoVariante && !variante.idVariante) {
            variante.idVariante = variante.idProductoVariante;
          }
          return variante;
        });
        
        // Log de la primera variante para verificar estructura
        if (variantes.length > 0) {
          const primerVariante = variantes[0];
          console.log("DEBUG: Primera variante obtenida:", {
            producto: primerVariante.producto ? primerVariante.producto.nombre : 'NO HAY PRODUCTO',
            endpoint_usado: isAlmaceneroEndpoint ? 'almacenero' : 'cajero'
          });
        }
        
        return variantes;
      } catch (primaryError: any) {
        console.log("DEBUG: Error con endpoint primario:", primaryError.response?.status);
        
        // Si es un error 403 y estábamos usando el endpoint de almacenero, intentar con cajero
        if (primaryError.response?.status === 403 && isAlmaceneroEndpoint) {
          console.log("DEBUG: Error 403 con endpoint de almacenero, intentando con cajero como fallback");
          console.log("DEBUG: Usando endpoint de cajero como fallback:", RUTAS_PRODUCTOS.CAJERO.VARIANTES);
          
          const fallbackResponse = await apiClient.get<ProductoVariante[]>(RUTAS_PRODUCTOS.CAJERO.VARIANTES);
          
          // Normalizar IDs para consistencia
          const variantes = fallbackResponse.data.map(variante => {
            if (variante.idProductoVariante && !variante.idVariante) {
              variante.idVariante = variante.idProductoVariante;
            }
            return variante;
          });
          
          console.log(`DEBUG: Se obtuvieron ${variantes.length} variantes desde endpoint del cajero (fallback)`);
          console.warn("⚠️ ADVERTENCIA: Los precios de volumen pueden no estar disponibles con el endpoint del cajero");
          
          return variantes;
        }
        
        // Si no es un error 403 o no podemos hacer fallback, relanzar el error
        throw primaryError;
      }
    } catch (error) {
      console.error("DEBUG: Error al obtener todas las variantes:", error);
      throw error;
    }
  },

  // Disminuir cantidad de variante (para ventas del cajero)
  disminuirCantidadVariante: async (id: number, cantidad: number): Promise<ProductoVariante> => {
    try {
      console.log(`Disminuyendo ${cantidad} unidades de la variante ID: ${id}`);
      
      // Siempre usar el endpoint del cajero para disminuir, ya que es el diseñado para esta operación
      const response = await apiClient.patch<ProductoVariante>(
        RUTAS_PRODUCTOS.CAJERO.DISMINUIR_VARIANTE(id),
        null,
        { params: { cantidad } }
      );
      
      console.log(`✅ Stock de variante ${id} reducido exitosamente en ${cantidad} unidades`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error('Stock insuficiente para realizar la venta');
      } else if (error.response?.status === 404) {
        throw new Error(`No se encontró la variante con ID: ${id}`);
      }
      console.error(`❌ Error al disminuir cantidad de variante ${id}:`, error);
      throw error;
    }
  },

  // NUEVO: Obtener variantes paginadas con búsqueda server-side (para el cajero)
  obtenerVariantesPaginadas: async (
    page: number = 0, 
    size: number = 30, 
    busqueda?: string
  ): Promise<{
    content: ProductoVariante[];
    totalElements: number;
    totalPages: number;
    pageNumber: number;
    pageSize: number;
  }> => {
    try {
      const params: Record<string, string | number> = { page, size };
      if (busqueda && busqueda.trim()) {
        params.busqueda = busqueda.trim();
      }
      
      const response = await apiClient.get(RUTAS_PRODUCTOS.CAJERO.VARIANTES_PAGINADAS, { params });
      
      // Normalizar IDs en el contenido
      const content = (response.data.content || []).map((variante: any) => {
        if (variante.idProductoVariante && !variante.idVariante) {
          variante.idVariante = variante.idProductoVariante;
        }
        return variante;
      });
      
      return {
        content,
        totalElements: response.data.totalElements,
        totalPages: response.data.totalPages,
        pageNumber: response.data.pageNumber,
        pageSize: response.data.pageSize,
      };
    } catch (error) {
      console.error("Error al obtener variantes paginadas:", error);
      throw error;
    }
  },
};

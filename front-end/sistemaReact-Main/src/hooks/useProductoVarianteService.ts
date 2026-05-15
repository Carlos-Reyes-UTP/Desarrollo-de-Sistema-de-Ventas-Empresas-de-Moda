import { useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProductoVarianteService } from '../services/ProductoVarianteService';
import type { Rol } from '../types/Usuario';

/** Prioriza inventario sobre cajero cuando el JWT trae varios roles. */
export function resolveInventarioUserRole(roles: Rol[] | undefined): string | undefined {
  const nombres = (roles ?? []).map((r) => r.nombreRol);
  if (nombres.length === 0) return undefined;
  if (nombres.includes('ROLE_ADMIN')) return 'ROLE_ADMIN';
  if (nombres.includes('ROLE_ALMACENERO')) return 'ROLE_ALMACENERO';
  if (nombres.includes('ROLE_VENDEDOR')) return 'ROLE_VENDEDOR';
  if (nombres.includes('ROLE_CAJERO')) return 'ROLE_CAJERO';
  return nombres[0];
}

export const useProductoVarianteService = () => {
  const { usuario } = useAuth();

  /** Nombres de rol del token (puede haber varios). */
  const nombresRoles = useMemo(
    () => (usuario?.roles ?? []).map((r) => r.nombreRol),
    [usuario?.roles]
  );

  /**
   * Rol preferido para lógica de API: el de mayor privilegio para inventario,
   * no el primero del array (orden del JWT podía dejar CAJERO delante de ALMACENERO).
   */
  const userRole = useMemo((): string | undefined => resolveInventarioUserRole(usuario?.roles), [usuario?.roles]);

  // Memoize the functions to prevent unnecessary re-renders
  const obtenerVariantesPorProducto = useCallback(
    (idProducto: number) => ProductoVarianteService.obtenerVariantesPorProducto(idProducto), 
    []
  );

  const obtenerVariantePorId = useCallback(
    (id: number) => ProductoVarianteService.obtenerVariantePorId(id), 
    []
  );

  // NUEVO: Método para búsqueda paginada y optimizada en servidor
  const getVariantesPaginadas = useCallback(async (page: number = 0, size: number = 30, busqueda?: string) => {
    try {
      return await ProductoVarianteService.obtenerVariantesPaginadas(page, size, busqueda);
    } catch (error) {
      console.error("Error al obtener variantes paginadas:", error);
      throw error;
    }
  }, []);

  return useMemo(() => ({
    // Read operations (memoized)
    obtenerVariantesPorProducto,
    obtenerVariantePorId,
    getVariantesPaginadas,
    
    // Write operations
    crearVariante: ProductoVarianteService.crearVariante,
    actualizarVariante: ProductoVarianteService.actualizarVariante,
    disminuirCantidadVariante: (id: number, cantidad: number) => 
      ProductoVarianteService.disminuirCantidadVariante(id, cantidad),
    
    // User info
    userRole,
    canWrite: nombresRoles.some(
      (r) => r === 'ROLE_ADMIN' || r === 'ROLE_ALMACENERO' || r === 'ROLE_VENDEDOR'
    ),
    canRead: nombresRoles.length > 0,
    isAdmin: nombresRoles.includes('ROLE_ADMIN'),
    isCajero: nombresRoles.includes('ROLE_CAJERO'),
    isAlmacenero: nombresRoles.includes('ROLE_ALMACENERO'),
  }), [
    obtenerVariantesPorProducto,
    obtenerVariantePorId,
    getVariantesPaginadas,
    userRole,
    nombresRoles,
  ]);
};

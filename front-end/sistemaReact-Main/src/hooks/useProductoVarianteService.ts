import { useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProductoVarianteService } from '../services/ProductoVarianteService';

export const useProductoVarianteService = (forSales: boolean = false) => {
  const { usuario } = useAuth();
  
  // Get the user's primary role
  const getUserRole = useCallback((): string | undefined => {
    console.log("DEBUG: getUserRole called. usuario:", usuario);
    console.log("DEBUG: usuario?.roles:", usuario?.roles);
    
    if (!usuario?.roles?.length) {
      console.log("DEBUG: No roles found");
      return undefined;
    }
    // Return the first role (could be enhanced to handle multiple roles)
    const role = usuario.roles[0].nombreRol;
    console.log("DEBUG: Found role:", role);
    return role;
  }, [usuario]);

  const userRole = useMemo(() => {
    const role = getUserRole();
    console.log("DEBUG: userRole computed as:", role);
    return role;
  }, [getUserRole]);

  // Memoize the functions to prevent unnecessary re-renders
  const obtenerVariantesPorProducto = useCallback(
    (idProducto: number) => ProductoVarianteService.obtenerVariantesPorProducto(idProducto), 
    []
  );

  const obtenerVariantePorId = useCallback(
    (id: number) => ProductoVarianteService.obtenerVariantePorId(id), 
    []
  );

  // Método personalizado para obtener todas las variantes disponibles
  const getAllVariantes = useCallback(async () => {
    try {
      console.log("DEBUG: getAllVariantes called. Current userRole:", userRole, "forSales:", forSales);
      console.log("DEBUG: Usuario actual:", usuario);
      
      // Usar el nuevo método optimizado del servicio
      const variantes = await ProductoVarianteService.obtenerTodasLasVariantes(userRole, forSales);
      console.log("DEBUG: getAllVariantes success. Variantes count:", variantes.length);
      return variantes;
    } catch (error) {
      console.error("Error al obtener todas las variantes:", error);
      throw error;
    }
  }, [userRole, usuario, forSales]);

  return useMemo(() => ({
    // Read operations (memoized)
    obtenerVariantesPorProducto,
    obtenerVariantePorId,
    getAllVariantes,
    
    // Write operations
    crearVariante: ProductoVarianteService.crearVariante,
    actualizarVariante: ProductoVarianteService.actualizarVariante,
    disminuirCantidadVariante: (id: number, cantidad: number) => 
      ProductoVarianteService.disminuirCantidadVariante(id, cantidad),
    
    // User info
    userRole,
    canWrite: userRole === 'ROLE_ADMIN' || userRole === 'ROLE_ALMACENERO',
    canRead: !!userRole, // Any authenticated user can read
    isAdmin: userRole === 'ROLE_ADMIN',
    isCajero: userRole === 'ROLE_CAJERO',
    isAlmacenero: userRole === 'ROLE_ALMACENERO',
  }), [
    obtenerVariantesPorProducto,
    obtenerVariantePorId,
    getAllVariantes,
    userRole,
    forSales
  ]);
};

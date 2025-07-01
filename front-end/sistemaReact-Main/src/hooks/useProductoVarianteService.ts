import { useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProductoVarianteService } from '../services/ProductoVarianteService';
import { ProductoService } from '../services/ProductoServices';
import type { Producto } from '../interfaces/Producto';

export const useProductoVarianteService = () => {
  const { usuario } = useAuth();
  
  // Get the user's primary role
  const getUserRole = useCallback((): string | undefined => {
    if (!usuario?.roles?.length) {
      return undefined;
    }
    // Return the first role (could be enhanced to handle multiple roles)
    return usuario.roles[0].nombreRol;
  }, [usuario]);

  const userRole = useMemo(() => getUserRole(), [getUserRole]);

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
      // Primero, obtenemos todos los productos
      const productos = await ProductoService.getAllProductos(userRole);
      
      if (!productos || productos.length === 0) {
        console.warn("No se encontraron productos para obtener variantes");
        return [];
      }
      
      // Luego obtenemos las variantes para cada producto
      const variantesPromises = productos.map((producto: { idProducto?: number }) => {
        if (!producto?.idProducto) {
          console.warn("Producto sin ID encontrado:", producto);
          return Promise.resolve([]);
        }
        
        return ProductoVarianteService.obtenerVariantesPorProducto(producto.idProducto)
          .catch(err => {
            console.warn(`Error al obtener variantes para producto ID=${producto.idProducto}:`, err);
            return [];
          });
      });
      
      // Esperamos todas las promesas y aplanamos el array resultante
      const variantesArrays = await Promise.all(variantesPromises);
      const todasVariantes = variantesArrays.flat();
      
      // Inspeccionar las primeras variantes para diagnóstico
      console.log("Inspeccionando primeras variantes:", todasVariantes.slice(0, 2));
      
      // En lugar de filtrar o modificar las variantes, vamos a ser más permisivos
      // y simplemente aceptar todas las variantes que tengan un ID, ignorando validaciones complejas
      const todasLasVariantes = todasVariantes.filter(variante => 
        variante && (variante.idProductoVariante || variante.idVariante)
      );
      
      console.log(`Se obtuvieron ${todasLasVariantes.length} variantes válidas de ${todasVariantes.length} totales`);
      return todasLasVariantes;
    } catch (error) {
      console.error("Error al obtener todas las variantes:", error);
      throw error;
    }
  }, [userRole]);

  return useMemo(() => ({
    // Read operations (memoized)
    obtenerVariantesPorProducto,
    obtenerVariantePorId,
    getAllVariantes,
    
    // Write operations
    crearVariante: ProductoVarianteService.crearVariante,
    actualizarVariante: ProductoVarianteService.actualizarVariante,
    
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
    userRole
  ]);
};

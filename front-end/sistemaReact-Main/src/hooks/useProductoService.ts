import { useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProductoService } from '../services/ProductoServices';

export const useProductoService = () => {
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
  const getAllProductos = useCallback(() => ProductoService.getAllProductos(userRole), [userRole]);
  const getProductoById = useCallback((id: number) => ProductoService.getProductoById(id, userRole), [userRole]);
  const getProductosByCodigo = useCallback((codigo: string) => ProductoService.getProductosByCodigo(codigo, userRole), [userRole]);
  const getProductosByNombre = useCallback((nombre: string) => ProductoService.getProductosByNombre(nombre, userRole), [userRole]);
  const buscarProductos = useCallback((termino: string) => ProductoService.buscarProductos(termino, userRole), [userRole]);
  const buscarProductosCompleto = useCallback((termino: string) => ProductoService.buscarProductosCompleto(termino, userRole), [userRole]);
  const disminuirCantidadProducto = useCallback((id: number, cantidad: number) => ProductoService.disminuirCantidadProducto(id, cantidad, userRole), [userRole]);

  return useMemo(() => ({
    // Role-aware read operations (memoized)
    getAllProductos,
    getProductoById,
    getProductosByCodigo,
    getProductosByNombre,
    buscarProductos,
    buscarProductosCompleto,

    // Write operations (only for authorized roles)
    createProducto: ProductoService.createProducto,
    updateProducto: ProductoService.updateProducto,
    deleteProducto: ProductoService.deleteProducto,

    // Stock operations
    disminuirCantidadProducto,

    // Legacy operations (maintain backward compatibility)
    getProductosByCategoria: ProductoService.getProductosByCategoria,
    getProductosByProveedor: ProductoService.getProductosByProveedor,

    // User info
    userRole,
    canWrite: userRole === 'ROLE_ADMIN' || userRole === 'ROLE_ALMACENERO',
    canRead: !!userRole, // Any authenticated user can read
    isAdmin: userRole === 'ROLE_ADMIN',
    isCajero: userRole === 'ROLE_CAJERO',
    isAlmacenero: userRole === 'ROLE_ALMACENERO',
  }), [
    getAllProductos,
    getProductoById,
    getProductosByCodigo,
    getProductosByNombre,
    buscarProductos,
    buscarProductosCompleto,
    disminuirCantidadProducto,
    userRole
  ]);
};

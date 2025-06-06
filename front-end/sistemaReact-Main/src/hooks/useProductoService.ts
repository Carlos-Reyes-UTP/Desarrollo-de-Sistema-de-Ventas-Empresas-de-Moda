import { useAuth } from '../context/AuthContext';
import { ProductoService } from '../services/ProductoServices';

export const useProductoService = () => {
  const { usuario } = useAuth();
  
  // Get the user's primary role
  const getUserRole = (): string | undefined => {
    if (!usuario || !usuario.roles || usuario.roles.length === 0) {
      return undefined;
    }
    // Return the first role (could be enhanced to handle multiple roles)
    return usuario.roles[0].nombreRol;
  };

  const userRole = getUserRole();

  return {
    // Role-aware read operations
    getAllProductos: () => ProductoService.getAllProductos(userRole),
    getProductoById: (id: number) => ProductoService.getProductoById(id, userRole),
    getProductosByCodigo: (codigo: string) => ProductoService.getProductosByCodigo(codigo, userRole),    getProductosByNombre: (nombre: string) => ProductoService.getProductosByNombre(nombre, userRole),
    buscarProductos: (termino: string) => ProductoService.buscarProductos(termino, userRole),
    buscarProductosCompleto: (termino: string) => ProductoService.buscarProductosCompleto(termino, userRole),
    
    // Write operations (only for authorized roles)
    createProducto: ProductoService.createProducto,
    updateProducto: ProductoService.updateProducto,
    deleteProducto: ProductoService.deleteProducto,
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
  };
};
